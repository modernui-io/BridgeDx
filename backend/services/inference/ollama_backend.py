import httpx
from config import settings
from services.inference.base import InferenceBackend

class OllamaBackend(InferenceBackend):
    """
    Calls Ollama REST API at OLLAMA_BASE_URL.
    """
    
    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL
        self.model_4b = settings.OLLAMA_4B_MODEL
        self.model_27b = settings.OLLAMA_27B_MODEL
    
    async def generate(self, system_prompt: str, user_prompt: str, temperature: float = 0.1,
                      max_tokens: int = 2048, image_base64: str | None = None, image_mime: str | None = None,
                      mode: str = "standard") -> str:
                      
        model = self.model_27b if mode == "rare" and not image_base64 else self.model_4b
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        if image_base64 and model == self.model_4b:
            messages[-1]["images"] = [image_base64]
        
        # Reduce context for 27B to avoid OOM on 24GB systems
        num_ctx = 1024 if mode == "rare" else 4096
        num_predict = min(max_tokens, 1024 if mode == "rare" else max_tokens)

        async with httpx.AsyncClient(timeout=120.0) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/api/chat",
                    json={
                        "model": model,
                        "messages": messages,
                        "stream": False,
                        "options": {
                            "temperature": temperature,
                            "num_predict": num_predict,
                            "num_ctx": num_ctx,
                        }
                    }
                )
                response.raise_for_status()
                return response.json()["message"]["content"]
            except httpx.HTTPStatusError as e:
                # If image input caused a server error, retry without images
                if image_base64:
                    retry_messages = [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ]
                    retry = await client.post(
                        f"{self.base_url}/api/chat",
                        json={
                            "model": model,
                            "messages": retry_messages,
                            "stream": False,
                            "options": {
                                "temperature": temperature,
                                "num_predict": num_predict,
                                "num_ctx": num_ctx,
                            }
                        }
                    )
                    retry.raise_for_status()
                    return retry.json()["message"]["content"]
                raise e
            
    async def health_check(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                return res.status_code == 200
        except Exception:
            return False
