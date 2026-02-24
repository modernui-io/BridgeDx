from rank_bm25 import BM25Okapi
import chromadb
from sentence_transformers import SentenceTransformer
import pickle
import numpy as np
from pathlib import Path
from config import settings

class HybridRetriever:
    """
    Combines BM25 keyword search and dense vector search using
    Reciprocal Rank Fusion (RRF). Both search the CHILD chunk index.
    """

    def __init__(self):
        self.embedding_model = None
        self.chroma_client = None
        self.collection = None
        self.bm25 = None
        self.bm25_ids = None
        self.initialized = False

    def initialize(self):
        if self.initialized:
            return
            
        self.embedding_model = SentenceTransformer(settings.EMBEDDING_MODEL)
        
        # Ensure Chroma DB path exists
        Path(settings.CHROMA_PATH).mkdir(parents=True, exist_ok=True)
        self.chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PATH)
        self.collection = self.chroma_client.get_or_create_collection("bridgedx_chunks")
        
        bm25_path = Path(settings.BM25_PATH)
        if bm25_path.exists():
            with open(bm25_path, "rb") as f:
                bm25_data = pickle.load(f)
            self.bm25 = bm25_data["index"]
            self.bm25_ids = bm25_data["ids"]
        else:
            self.bm25 = None
            self.bm25_ids = []
            
        self.initialized = True

    def search(self, query: str, mode: str, k: int = settings.RAG_VECTOR_TOP_K) -> list[dict]:
        """Returns top-k child chunks using RRF fusion of BM25 and vector search."""
        self.initialize()
        
        if not self.collection.count() or not self.bm25:
            # Index is empty
            return []

        # 1. BM25 search
        tokenized_query = query.lower().split()
        bm25_scores = self.bm25.get_scores(tokenized_query)
        bm25_top_idx = np.argsort(bm25_scores)[::-1][:k * 2]  # over-retrieve
        bm25_results_raw = {self.bm25_ids[i]: 1 / (j + 60)  # RRF score
                       for j, i in enumerate(bm25_top_idx)}

        # Filter BM25 results by source to match mode (same filter as vector)
        allowed_sources = None
        if mode == "rare":
            allowed_sources = {"ORPHANET", "WHO IMCI", "MSF"}
        elif mode == "standard":
            allowed_sources = {"WHO IMCI", "MSF"}

        if allowed_sources and bm25_results_raw:
            bm25_ids_to_check = list(bm25_results_raw.keys())
            try:
                meta_resp = self.collection.get(ids=bm25_ids_to_check, include=["metadatas"])
                bm25_results = {}
                for doc_id, meta in zip(meta_resp["ids"], meta_resp["metadatas"]):
                    src = (meta or {}).get("source", "")
                    if src in allowed_sources:
                        bm25_results[doc_id] = bm25_results_raw[doc_id]
            except Exception:
                bm25_results = bm25_results_raw  # graceful fallback
        else:
            bm25_results = bm25_results_raw

        # 2. Vector search
        query_embedding = self.embedding_model.encode(query).tolist()
        
        # Filter by source for mode-specific retrieval
        where_filter = None
        if mode == "rare":
            where_filter = {"source": {"$in": ["ORPHANET", "WHO IMCI", "MSF"]}}
        elif mode == "standard":
            # Standard triage should not pull rare disease profiles
            where_filter = {"source": {"$in": ["WHO IMCI", "MSF"]}}
        
        vector_response = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=k * 2,
            where=where_filter,
            include=["documents", "metadatas", "distances"]
        )
        
        vector_results = {}
        if vector_response["ids"] and len(vector_response["ids"]) > 0:
            for j, doc_id in enumerate(vector_response["ids"][0]):
                vector_results[doc_id] = 1 / (j + 60)  # RRF score

        # 3. RRF fusion
        alpha = settings.RAG_HYBRID_ALPHA  # 0.5 balanced
        all_ids = set(bm25_results.keys()) | set(vector_results.keys())
        combined = {}
        for doc_id in all_ids:
            combined[doc_id] = (
                alpha * vector_results.get(doc_id, 0) +
                (1 - alpha) * bm25_results.get(doc_id, 0)
            )

        # 4. Sort by combined score, return top-k with metadata
        top_ids = sorted(combined, key=combined.get, reverse=True)[:k]
        
        results = []
        for doc_id in top_ids:
            meta = self.collection.get(ids=[doc_id], include=["documents", "metadatas"])
            if meta["documents"] and len(meta["documents"]) > 0:
                results.append({
                    "id": doc_id,
                    "text": meta["documents"][0],
                    "metadata": meta["metadatas"][0] if meta["metadatas"] else {},
                    "score": combined[doc_id],
                    "parent_id": meta["metadatas"][0].get("parent_id") if meta["metadatas"] else None
                })
        return results

hybrid_retriever = HybridRetriever()
