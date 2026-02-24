from abc import ABC, abstractmethod

class InferenceBackend(ABC):
    @abstractmethod
    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.1,
        max_tokens: int = 2048,
        image_base64: str | None = None,
        image_mime: str | None = None,
        mode: str = "standard"
    ) -> str:
        """Returns raw response string (expected to be JSON format)."""
        pass
    
    @abstractmethod
    async def health_check(self) -> bool:
        pass
