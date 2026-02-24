import json
from services.inference.ollama_backend import OllamaBackend

class InferenceRouter:
    """
    Offline-only routing:
    - STANDARD mode: local Ollama
    - RARE mode: local Ollama (same model, deeper prompts handled upstream)
    """
    
    def __init__(self):
        self.local = OllamaBackend()

    async def generate(self, **kwargs) -> str:
        # Offline-only local Ollama (standard + rare)
        try:
            return await self.local.generate(**kwargs)
        except Exception as e:
            print(f"Local Ollama failed: {e}")
        return self._safe_failure_response("Local inference unavailable.")
    
    async def get_health(self) -> dict:
        local_ok = await self.local.health_check()
        return {"local": local_ok}
            
    def _safe_failure_response(self, error: str) -> str:
        """
        When inference fails completely, return a valid JSON response
        that tells the CHW to refer the patient.
        """
        return json.dumps({
            "differential": [],
            "triage_level": "refer",
            "triage_detail": "AI inference unavailable. Refer patient to nearest clinic for clinical assessment.",
            "triage_protocol": "System fallback — no AI assessment available",
            "low_confidence": True,
            "ood_warning": True,
            "inference_error": error,
            "model_reasoning": "Inference backend unavailable."
        })


inference_router = InferenceRouter()
