import time
import uuid
import json
import base64
import re
from fastapi import APIRouter, HTTPException
from models.schemas import AssessmentRequest, AssessmentResponse
from services.safety import run_safety_check
from services.storage.minio_client import minio_client
from services.rag.query_expander import expand_query
from services.rag.hybrid_retriever import hybrid_retriever
from services.rag.reranker import reranker
from services.rag.parent_store import parent_store
from services.rag.pipeline import assemble_context, build_system_prompt, build_user_prompt
from services.inference.router import inference_router
from services.rag.faithfulness import check_excerpt_faithfulness, remove_unfaithful_flags
from config import settings

router = APIRouter()

# In-memory store for pending assessments (awaiting CHW confirm)
pending_store = {}


def parse_and_validate(raw_text: str) -> dict:
    """Extracts JSON from markdown block and parses it. Handles truncated output."""
    # Find JSON block if wrapped in markdown
    match = re.search(r'```(?:json)?\s*(.*?)\s*```', raw_text, re.DOTALL)
    if match:
        raw_text = match.group(1)
        
    # Strip any leading/trailing whitespace
    raw_text = raw_text.strip()
    
    # Try direct parse first
    try:
        parsed = json.loads(raw_text)
        return parsed
    except json.JSONDecodeError:
        pass
    
    # Attempt JSON repair for truncated responses
    repaired = raw_text
    # Count open vs close brackets/braces
    opens = repaired.count('{') + repaired.count('[')
    closes = repaired.count('}') + repaired.count(']')
    
    if opens > closes:
        # Remove trailing partial string (e.g. truncated mid-value)
        # Find the last complete key-value pair
        last_complete = max(
            repaired.rfind('}'),
            repaired.rfind(']'),
            repaired.rfind('"'),
        )
        if last_complete > 0:
            repaired = repaired[:last_complete + 1]
        
        # Close any remaining open brackets
        for _ in range(repaired.count('[') - repaired.count(']')):
            repaired += ']'
        for _ in range(repaired.count('{') - repaired.count('}')):
            repaired += '}'
        
        try:
            parsed = json.loads(repaired)
            print(f"Successfully repaired truncated JSON")
            return parsed
        except json.JSONDecodeError:
            pass
    
    # Final fallback: try to find ANY valid JSON object in the text
    for start in range(len(raw_text)):
        if raw_text[start] == '{':
            for end in range(len(raw_text), start, -1):
                try:
                    parsed = json.loads(raw_text[start:end])
                    print(f"Extracted partial JSON from positions {start}:{end}")
                    return parsed
                except json.JSONDecodeError:
                    continue
    
    print(f"Failed to parse LLM JSON.\nRaw text (first 500 chars): {raw_text[:500]}")
    return {
        "differential": [],
        "triage_level": "refer",
        "triage_detail": "Failed to parse model output.",
        "triage_protocol": "System fallback",
        "low_confidence": True
    }

def apply_confidence_gating(response: dict) -> dict:
    """
    Modifies the response based on overall confidence level.
    """
    differential = response.get("differential", [])
    if not differential:
        response["low_confidence"] = True
        response["ood_warning"] = True
        response["triage_level"] = "refer"
        return response
        
    top_confidence = max([c.get("confidence_pct", 0) for c in differential])
    
    if top_confidence < (settings.CONFIDENCE_LOW_THRESHOLD * 100):
        response["ood_warning"] = True
        response["triage_level"] = "refer"
        # Redact differential to prevent unsafe guidance
        response["differential"] = []
        response["triage_detail"] = "Low confidence presentation, refer for clinical assessment"
    
    elif top_confidence < (settings.CONFIDENCE_HIGH_THRESHOLD * 100):
        response["low_confidence"] = True
        if response.get("triage_level") == "local":
            response["triage_level"] = "refer"
            
    # Cap displayed confidence at 85% to prevent overconfidence
    for condition in response.get("differential", []):
        condition["confidence_pct"] = min(condition.get("confidence_pct", 0), 85)
        
    return response

@router.post("/api/assess", response_model=AssessmentResponse)
async def assess_patient(request: AssessmentRequest):
    start_ms = time.time()
    
    # ── STEP 1: Safety pre-check (fast, synchronous) ──────────────────
    emergency, emergency_reasons = run_safety_check(
        complaint=request.complaint,
        vitals=request.model_dump()
    )
    
    # ── STEP 2: Download image from MinIO if file_key provided ─────────
    image_b64 = None
    if request.image_file_key and request.image_mime_type and request.image_mime_type.startswith("image/"):
        try:
            image_bytes = minio_client.download_to_bytes(request.image_file_key)
            minio_client.schedule_deletion(request.image_file_key)
            image_b64 = base64.b64encode(image_bytes).decode()
        except Exception as e:
            print(f"Warning: Failed to download image from MinIO: {e}")
    elif request.image_file_key:
        # Non-image uploads are not passed to the model; delete immediately.
        minio_client.schedule_deletion(request.image_file_key)
    
    # ── STEP 3: Query expansion ────────────────────────────────────────
    expanded_query = expand_query(request.complaint, request.mode)
    
    # ── STEP 4: Hybrid RAG retrieval ──────────────────────────────────
    try:
        child_chunks = hybrid_retriever.search(
            query=expanded_query,
            mode=request.mode,
            k=settings.RAG_VECTOR_TOP_K
        )
    except Exception as e:
        print(f"Retrieval error: {e}")
        child_chunks = []
    
    # ── STEP 5: Cross-encoder reranking ───────────────────────────────
    try:
        reranked_children = reranker.rerank(
            query=expanded_query,
            candidates=child_chunks,
            top_k=settings.RAG_RERANK_TOP_K
        )
    except Exception as e:
        print(f"Reranking error: {e}")
        reranked_children = child_chunks[:settings.RAG_RERANK_TOP_K]

    # Ensure protocol source coverage for better evidence grounding
    if request.mode == "standard":
        required_sources = ["WHO IMCI", "MSF"]
    else:
        required_sources = ["ORPHANET", "MSF"]
    reranked_children = reranker.ensure_source_coverage(
        reranked=reranked_children,
        candidates=child_chunks,
        required_sources=required_sources,
        max_total=settings.RAG_RERANK_TOP_K
    )
    reranked_children = reranker.ensure_leishmaniasis_context(
        query=expanded_query,
        selected=reranked_children,
        candidates=child_chunks,
        max_total=settings.RAG_RERANK_TOP_K
    )
    
    # ── STEP 6: Parent expansion ──────────────────────────────────────
    parent_chunks = parent_store.expand_to_parents(reranked_children)
    
    # ── STEP 7: Context assembly ──────────────────────────────────────
    context_block = assemble_context(parent_chunks, expanded_query)
    
    # ── STEP 8: Build prompts ─────────────────────────────────────────
    system_prompt = build_system_prompt()
    user_prompt = build_user_prompt(
        complaint=request.complaint,
        vitals=request.model_dump(),
        context=context_block,
        mode=request.mode
    )
    
    # ── STEP 9: MedGemma inference ────────────────────────────────────
    raw_response = await inference_router.generate(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        temperature=0.1,
        max_tokens=800,
        image_base64=image_b64,
        image_mime=request.image_mime_type,
        mode=request.mode
    )
    
    # ── STEP 10: Parse and validate JSON ──────────────────────────────
    parsed = parse_and_validate(raw_response)
    
    # ── STEP 11: Faithfulness check (anti-hallucination) ─────────────
    is_faithful, violations = check_excerpt_faithfulness(
        response=parsed,
        context_chunks=parent_chunks
    )
    if violations:
        print(f"Hallucination violations detected: {len(violations)}")
        parsed = remove_unfaithful_flags(parsed, violations)
        parsed["low_confidence"] = True

    # No fallback evidence injection: only show flags returned by model
    
    # ── STEP 12: Confidence gating ────────────────────────────────────
    parsed = apply_confidence_gating(parsed)
    
    # ── STEP 13: Emergency override ───────────────────────────────────
    if emergency:
        parsed["emergency_triggered"] = True
        parsed["emergency_reasons"] = emergency_reasons
        parsed["triage_level"] = "emergency"  # override
    
    # ── STEP 14: Store pending (not yet logged — await CHW confirm) ───
    assessment_id = str(uuid.uuid4())
    pending_store[assessment_id] = {
        "request": request.model_dump(),
        "response": parsed,
        "context_chunk_refs": [c.get("metadata", {}).get("section_ref") for c in parent_chunks],
        "timestamp": time.time()
    }
    
    # Fallback missing keys
    if "differential" not in parsed:
        parsed["differential"] = []
    if "triage_level" not in parsed:
        parsed["triage_level"] = "refer"
    if "triage_detail" not in parsed:
        parsed["triage_detail"] = ""
    if "triage_protocol" not in parsed:
        parsed["triage_protocol"] = ""
        
    return AssessmentResponse(
        assessment_id=assessment_id,
        processing_ms=int((time.time() - start_ms) * 1000),
        model_used=f"{settings.INFERENCE_BACKEND}:{request.mode}",
        **parsed
    )
