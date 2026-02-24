from sentence_transformers import CrossEncoder
from config import settings

_LEISHMANIA_KEYWORDS = ("leishman", "kala-azar", "kala azar", "visceral leishmaniasis")

# Known parent chunk IDs for VL in the MSF corpus
_VL_PARENT_IDS = [
    "msf_msf_clinical_guidelines_2021_visceral_leishmaniasis",
    "msf_kala_azar_factsheet",
]

class MedicalReranker:
    """
    Uses BAAI/bge-reranker-v2-m3 to rescore query-chunk pairs.
    """
    
    def __init__(self):
        self.model = None

    def initialize(self):
        if not self.model:
            self.model = CrossEncoder(
                settings.RERANKER_MODEL,
                max_length=512,
                device="cpu"  # fast enough for ~15 candidates
            )

    def rerank(self, query: str, candidates: list[dict], top_k: int = settings.RAG_RERANK_TOP_K) -> list[dict]:
        """
        Score each (query, chunk_text) pair.
        Return top_k chunks sorted by reranker score.
        """
        if not candidates:
            return []
            
        self.initialize()
        
        pairs = [(query, c["text"]) for c in candidates]
        scores = self.model.predict(pairs)
        
        for i, candidate in enumerate(candidates):
            candidate["rerank_score"] = float(scores[i])
        
        reranked = sorted(candidates, key=lambda x: x["rerank_score"], reverse=True)
        return reranked[:top_k]

    def ensure_source_coverage(
        self,
        reranked: list[dict],
        candidates: list[dict],
        required_sources: list[str],
        max_total: int
    ) -> list[dict]:
        """
        Ensure at least one chunk per required source (if available), then fill
        remaining slots by rerank order.
        """
        if not reranked:
            return []

        by_id = {c["id"]: c for c in candidates}
        selected = []
        selected_ids = set()

        def best_for_source(source: str) -> dict | None:
            # Prefer reranked list; fallback to any candidate with highest score
            for c in reranked:
                if c.get("metadata", {}).get("source") == source:
                    return c
            pool = [c for c in candidates if c.get("metadata", {}).get("source") == source]
            if not pool:
                return None
            # Use rerank_score if present, else retrieval score
            pool.sort(key=lambda x: x.get("rerank_score", x.get("score", 0)), reverse=True)
            return pool[0]

        for source in required_sources:
            hit = best_for_source(source)
            if hit and hit["id"] not in selected_ids:
                selected.append(hit)
                selected_ids.add(hit["id"])

        # Fill remaining with reranked order
        for c in reranked:
            if len(selected) >= max_total:
                break
            if c["id"] in selected_ids:
                continue
            selected.append(c)
            selected_ids.add(c["id"])

        # Preserve input ordering of selected where possible
        return selected

    def ensure_leishmaniasis_context(
        self,
        query: str,
        selected: list[dict],
        candidates: list[dict],
        max_total: int
    ) -> list[dict]:
        """
        If the query suggests leishmaniasis, ensure an MSF chunk mentioning it is included.
        Falls back to loading known VL parent chunks from the parent store if no
        matching child chunk was retrieved.
        """
        if not any(k in query.lower() for k in _LEISHMANIA_KEYWORDS):
            return selected

        def is_leishman(c: dict) -> bool:
            meta = c.get("metadata", {})
            text = c.get("text", "").lower()
            disease = (meta.get("disease_name") or "").lower()
            aliases = (meta.get("disease_aliases") or "").lower()
            return (
                meta.get("source") == "MSF" and
                ("leishman" in text or "leishman" in disease or "leishman" in aliases or "kala-azar" in text)
            )

        if any(is_leishman(c) for c in selected):
            return selected

        # Try candidates first
        pool = [c for c in candidates if is_leishman(c)]

        # Fallback: load known VL parent chunks directly from the parent store
        if not pool:
            from services.rag.parent_store import parent_store
            for pid in _VL_PARENT_IDS:
                parent = parent_store.get_parent(pid)
                if parent and is_leishman(parent):
                    pool.append(parent)

        if not pool:
            return selected

        pool.sort(key=lambda x: x.get("rerank_score", x.get("score", 0)), reverse=True)
        best = pool[0]
        if best["id"] in {c["id"] for c in selected}:
            return selected

        # Insert at front and allow one extra slot (max_total + 1) so VL
        # evidence doesn't evict another useful context chunk
        updated = [best] + selected
        return updated[:max_total + 1]

reranker = MedicalReranker()

