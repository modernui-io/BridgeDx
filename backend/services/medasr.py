import base64
import io
import librosa
import numpy as np
import soundfile as sf
import torch
from transformers import AutoProcessor, AutoModelForCTC
from config import settings


class MedicalASR:
    """
    Offline MedASR inference using Hugging Face transformers.
    Requires the model weights to be available locally (HF cache).
    """

    def __init__(self):
        self._processor = None
        self._model = None
        self._device = "cuda" if torch.cuda.is_available() else "cpu"

    def _load(self):
        if self._processor and self._model:
            return
        # Transformers (dev) may call torch.is_autocast_enabled(device_type).
        # Older torch versions only accept zero args; shim to keep compatibility.
        try:
            _orig = torch.is_autocast_enabled
            try:
                _orig("cpu")
                needs_shim = False
            except TypeError:
                needs_shim = True
            if needs_shim:
                def _shim(*args, **kwargs):
                    return _orig()
                torch.is_autocast_enabled = _shim
        except Exception:
            pass
        self._processor = AutoProcessor.from_pretrained(settings.MEDASR_MODEL_ID)
        self._model = AutoModelForCTC.from_pretrained(settings.MEDASR_MODEL_ID)
        self._model.to(self._device)
        self._model.eval()

    def _decode_audio(self, audio_base64: str) -> tuple[np.ndarray, int]:
        raw_bytes = base64.b64decode(audio_base64)
        data, sr = sf.read(io.BytesIO(raw_bytes))
        # Convert to mono if needed
        if isinstance(data, np.ndarray) and data.ndim > 1:
            data = np.mean(data, axis=1)
        return data, sr

    async def transcribe(self, audio_base64: str, mime_type: str) -> str:
        self._load()

        audio, sr = self._decode_audio(audio_base64)
        if sr != settings.MEDASR_SAMPLE_RATE:
            audio = librosa.resample(audio, orig_sr=sr, target_sr=settings.MEDASR_SAMPLE_RATE)
            sr = settings.MEDASR_SAMPLE_RATE

        inputs = self._processor(audio, sampling_rate=sr, return_tensors="pt", padding=True)
        inputs = {k: v.to(self._device) for k, v in inputs.items()}

        with torch.no_grad():
            logits = self._model(**inputs).logits
            pred_ids = torch.argmax(logits, dim=-1)

        transcript = self._processor.batch_decode(pred_ids, skip_special_tokens=True)[0]
        return transcript.strip()


medasr = MedicalASR()
