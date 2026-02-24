import base64
import io
import librosa
import numpy as np
import soundfile as sf
import torch
from transformers import AutoProcessor, AutoModelForSpeechSeq2Seq
from config import settings


class WhisperASR:
    """
    Offline Whisper inference (multilingual).
    """

    def __init__(self):
        self._processor = None
        self._model = None
        self._device = "cuda" if torch.cuda.is_available() else "cpu"
        self._dtype = torch.float16 if self._device == "cuda" else torch.float32

    def _load(self):
        if self._processor and self._model:
            return
        self._processor = AutoProcessor.from_pretrained(settings.WHISPER_MODEL_ID)
        self._model = AutoModelForSpeechSeq2Seq.from_pretrained(
            settings.WHISPER_MODEL_ID, torch_dtype=self._dtype
        )
        self._model.to(self._device)
        self._model.eval()

    def _decode_audio(self, audio_base64: str) -> tuple[np.ndarray, int]:
        raw_bytes = base64.b64decode(audio_base64)
        data, sr = sf.read(io.BytesIO(raw_bytes))
        if isinstance(data, np.ndarray) and data.ndim > 1:
            data = np.mean(data, axis=1)
        return data, sr

    async def transcribe(self, audio_base64: str, mime_type: str, language: str | None = None) -> str:
        self._load()

        audio, sr = self._decode_audio(audio_base64)
        if sr != settings.MEDASR_SAMPLE_RATE:
            audio = librosa.resample(audio, orig_sr=sr, target_sr=settings.MEDASR_SAMPLE_RATE)
            sr = settings.MEDASR_SAMPLE_RATE

        inputs = self._processor(audio, sampling_rate=sr, return_tensors="pt")
        input_features = inputs.input_features.to(self._device, dtype=self._dtype)

        gen_kwargs = {}
        if language:
            try:
                forced_ids = self._processor.get_decoder_prompt_ids(language=language, task="transcribe")
                gen_kwargs["forced_decoder_ids"] = forced_ids
            except Exception:
                pass

        with torch.no_grad():
            predicted_ids = self._model.generate(input_features, **gen_kwargs)

        transcript = self._processor.batch_decode(predicted_ids, skip_special_tokens=True)[0]
        # extra cleanup if any special markers leak through
        transcript = transcript.replace("</s>", "").replace("<s>", "").strip()
        return transcript


whisper_asr = WhisperASR()
