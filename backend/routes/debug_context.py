"""Debug endpoint to inspect the assembled context without calling the LLM."""
from fastapi import APIRouter
from pydantic import BaseModel
from services.rag.query_expander import expand_query
from services.rag.hybrid_retriever import hybrid_retriever
from services.rag.reranker import reranker
from services.rag.parent_store import parent_store
from services.rag.pipeline import assemble_context
from config import settings

router = APIRouter()


class DebugContextRequest(BaseModel):
    complaint: str
    mode: str = "standard"
    age_group: str | None = None
    sex: str | None = None
    region_district: str | None = None
    temperature_c: float | None = None
    heart_rate_bpm: int | None = None
    resp_rate: int | None = None


class DebugContextResponse(BaseModel):
    expanded_query: str
    child_chunks: list[dict]
    reranked_children: list[dict]
    parent_chunks: list[dict]
    assembled_context: str


@router.post("/api/debug/context", response_model=DebugContextResponse)
async def debug_context(request: DebugContextRequest):
    """Runs Steps 3-7 of the assess pipeline and returns intermediate data."""

    # Step 3: Query expansion
    expanded_query = expand_query(request.complaint, request.mode)

    # Step 4: Hybrid retrieval
    try:
        child_chunks = hybrid_retriever.search(
            query=expanded_query,
            mode=request.mode,
            k=settings.RAG_VECTOR_TOP_K,
        )
    except Exception as e:
        print(f"Retrieval error: {e}")
        child_chunks = []

    # Step 5: Reranking
    try:
        reranked_children = reranker.rerank(
            query=expanded_query,
            candidates=child_chunks,
            top_k=settings.RAG_RERANK_TOP_K,
        )
    except Exception as e:
        print(f"Reranking error: {e}")
        reranked_children = child_chunks[: settings.RAG_RERANK_TOP_K]

    # Source coverage + leishmaniasis forced inclusion
    if request.mode == "standard":
        required_sources = ["WHO IMCI", "MSF"]
    else:
        required_sources = ["ORPHANET", "MSF"]
    reranked_children = reranker.ensure_source_coverage(
        reranked=reranked_children,
        candidates=child_chunks,
        required_sources=required_sources,
        max_total=settings.RAG_RERANK_TOP_K,
    )
    reranked_children = reranker.ensure_leishmaniasis_context(
        query=expanded_query,
        selected=reranked_children,
        candidates=child_chunks,
        max_total=settings.RAG_RERANK_TOP_K,
    )

    # Step 6: Parent expansion
    parent_chunks = parent_store.expand_to_parents(reranked_children)

    # Step 7: Context assembly
    context_block = assemble_context(parent_chunks, expanded_query)

    return DebugContextResponse(
        expanded_query=expanded_query,
        child_chunks=[
            {"id": c["id"], "score": c.get("score", 0),
             "source": c.get("metadata", {}).get("source", ""),
             "text_preview": c.get("text", "")[:200]}
            for c in child_chunks[:10]
        ],
        reranked_children=[
            {"id": c["id"], "rerank_score": c.get("rerank_score", 0),
             "source": c.get("metadata", {}).get("source", ""),
             "disease_name": c.get("metadata", {}).get("disease_name", ""),
             "text_preview": c.get("text", "")[:200]}
            for c in reranked_children
        ],
        parent_chunks=[
            {"id": c["id"],
             "source": c.get("metadata", {}).get("source", ""),
             "disease_name": c.get("metadata", {}).get("disease_name", ""),
             "text_preview": c.get("text", "")[:300]}
            for c in parent_chunks
        ],
        assembled_context=context_block,
    )
