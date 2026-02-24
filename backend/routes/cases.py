from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
import uuid
import json
from models.schemas import CaseSubmissionRequest
from models.database import get_session, CaseRecord
from services.deidentify import deidentify_case_data
# Import from assess to get pending store
from routes.assess import pending_store

router = APIRouter()

@router.post("/api/cases")
async def log_case(request: CaseSubmissionRequest, session: Session = Depends(get_session)):
    """
    Called by CHW to confirm assessment and log to DB.
    Reads pending request/response context, de-identifies, and writes.
    """
    if request.assessment_id not in pending_store:
        raise HTTPException(status_code=404, detail="Assessment not found or expired")
        
    assessment_data = pending_store[request.assessment_id]
    original_req = assessment_data["request"]
    ai_resp = assessment_data["response"]
    
    # Scrub PII
    safe_data = deidentify_case_data(original_req)
    
    case_id = f"BDX-{str(uuid.uuid4())[:8].upper()}"
    
    # Check if confidence is high
    diff = ai_resp.get("differential", [])
    confidence_high = any(c.get("confidence_pct", 0) > 70 for c in diff)
    
    record = CaseRecord(
        case_id=case_id,
        assessment_id=request.assessment_id,
        age_group=safe_data["age_group"],
        sex=safe_data["sex"],
        region_district=safe_data["region_district"],
        mode=safe_data["mode"],
        has_image=safe_data["has_image"],
        temperature_c=safe_data["temperature_c"],
        triage_level=ai_resp.get("triage_level", "refer"),
        triage_detail=ai_resp.get("triage_detail", ""),
        triage_protocol=ai_resp.get("triage_protocol", ""),
        confidence_high=confidence_high,
        emergency_triggered=ai_resp.get("emergency_triggered", False),
        chw_impression=request.impression,
        notes=request.notes,
        differential_json=json.dumps(diff)
    )
    
    session.add(record)
    session.commit()
    
    # Clean up pending store
    del pending_store[request.assessment_id]
    
    return {"case_id": case_id, "logged": True}

@router.get("/api/cases")
async def get_cases(filter: str = "all", limit: int = 50, session: Session = Depends(get_session)):
    statement = select(CaseRecord).order_by(CaseRecord.timestamp.desc()).limit(limit)
    results = session.exec(statement).all()
    payload = []
    for r in results:
        try:
            diff_raw = json.loads(r.differential_json) if r.differential_json else []
        except Exception:
            diff_raw = []

        # Map to frontend-friendly shape
        differential = [
            {
                "condition": c.get("name"),
                "confidence": c.get("confidence_pct"),
                "flags": c.get("flags", [])
            }
            for c in diff_raw
        ]
        payload.append({
            "id": r.id,
            "case_id": r.case_id,
            "assessment_id": r.assessment_id,
            "age_group": r.age_group,
            "sex": r.sex,
            "region_district": r.region_district,
            "mode": r.mode,
            "has_image": r.has_image,
            "temperature_c": r.temperature_c,
            "triage_level": r.triage_level,
            "triage_detail": r.triage_detail,
            "triage_protocol": r.triage_protocol,
            "confidence_high": r.confidence_high,
            "emergency_triggered": r.emergency_triggered,
            "impression": r.chw_impression,
            "notes": r.notes,
            "differential": differential,
            "timestamp": r.timestamp.isoformat()
        })
    return payload

@router.get("/api/cases/{case_id}")
async def get_case(case_id: str, session: Session = Depends(get_session)):
    statement = select(CaseRecord).where(CaseRecord.case_id == case_id)
    result = session.exec(statement).first()
    if not result:
        raise HTTPException(status_code=404, detail="Case not found")
    return result
