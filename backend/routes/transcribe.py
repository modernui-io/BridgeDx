from fastapi import APIRouter
from models.schemas import TranscribeRequest
from services.medasr import medasr
from services.whisper_asr import whisper_asr

router = APIRouter()

@router.post("/api/transcribe")
async def transcribe_audio(request: TranscribeRequest):
    try:
        if request.model == "whisper":
            transcript = await whisper_asr.transcribe(
                request.audio_base64, request.mime_type, request.language
            )
        else:
            transcript = await medasr.transcribe(request.audio_base64, request.mime_type)
        return {"transcript": transcript}
    except Exception as e:
        return {"transcript": "", "error": f"Transcription failed: {e}"}
