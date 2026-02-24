from pydantic import BaseModel, Field
from typing import List, Optional, Literal

class AssessmentRequest(BaseModel):
    age_group: str = Field(..., description="e.g. 'child', 'adult', 'infant'")
    sex: str = Field(..., description="biological sex")
    region_district: Optional[str] = None
    complaint: str = Field(..., description="raw chief complaint from CHW")
    mode: Literal["standard", "rare"] = "standard"
    temperature_c: Optional[float] = None
    heart_rate_bpm: Optional[int] = None
    resp_rate: Optional[int] = None
    image_file_key: Optional[str] = None
    image_mime_type: Optional[str] = None

class DiagnosticFlag(BaseModel):
    label: str
    source_ref: str
    excerpt: str

class Condition(BaseModel):
    name: str
    confidence_pct: int
    flags: List[DiagnosticFlag]

class AssessmentResponse(BaseModel):
    assessment_id: str
    processing_ms: int
    model_used: str
    differential: List[Condition]
    triage_level: Literal["local", "refer", "emergency"]
    triage_detail: str
    triage_protocol: str
    low_confidence: bool = False
    ood_warning: bool = False
    inference_error: Optional[str] = None
    model_reasoning: Optional[str] = None
    emergency_triggered: bool = False
    emergency_reasons: Optional[List[str]] = None

class UploadURLRequest(BaseModel):
    file_extension: str = Field(..., pattern=r"^(jpg|jpeg|png|pdf)$")

class TranscribeRequest(BaseModel):
    audio_base64: str
    mime_type: str
    model: Optional[Literal["medasr", "whisper"]] = "medasr"
    language: Optional[str] = None

class CaseSubmissionRequest(BaseModel):
    assessment_id: str
    impression: str
    notes: Optional[str] = None
