import vertexai
from vertexai.generative_models import GenerativeModel, Part, GenerationConfig
from config import settings
from services.inference.base import InferenceBackend

class VertexBackend(InferenceBackend):
    """
    Calls Google Vertex AI Model Garden for MedGemma inference.
    """
    
    def __init__(self):
        try:
            vertexai.init(
                project=settings.GOOGLE_CLOUD_PROJECT,
                location=settings.GOOGLE_CLOUD_REGION
            )
            self.model_4b = GenerativeModel(settings.MEDGEMMA_4B_MODEL)
            self.model_27b = GenerativeModel(settings.MEDGEMMA_27B_MODEL)
            self.initialized = True
        except Exception as e:
            print(f"Warning: Failed to initialize VertexAI. Is GCP ADCs configured? {e}")
            self.initialized = False
    
    async def generate(self, system_prompt: str, user_prompt: str, temperature: float = 0.1,
                      max_tokens: int = 2048, image_base64: str | None = None, image_mime: str | None = None,
                      mode: str = "standard") -> str:
        
        if not self.initialized:
            raise RuntimeError("VertexBackend not correctly initialized with GCP credentials.")
            
        model = self.model_27b if mode == "rare" and not image_base64 else self.model_4b
        
        config = GenerationConfig(
            temperature=temperature,
            max_output_tokens=max_tokens,
            top_p=0.8,
            response_mime_type="application/json"
        )
        
        content = [f"{system_prompt}\n\n{user_prompt}"]
        
        if image_base64:
            import base64
            # Vertex expects raw bytes in from_data data parameter sometimes depending on sdk version, 
            # but string works for Part.from_data usually if it's b64 parsed.
            try:
                raw_bytes = base64.b64decode(image_base64)
                content.insert(0, Part.from_data(
                    data=raw_bytes,
                    mime_type=image_mime or "image/jpeg"
                ))
            except Exception:
                pass
        
        response = await model.generate_content_async(content, generation_config=config)
        return response.text
        
    async def health_check(self) -> bool:
        # Complex to health check Vertex without making a real call, rely on init status
        return self.initialized
