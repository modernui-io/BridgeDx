import json
import sqlite3
from pathlib import Path
from config import settings

class ParentStore:
    """
    After reranking selects the best child chunks, we swap each child
    for its full parent chunk to provide complete context.
    """
    
    def __init__(self):
        self.store_path = Path(settings.PARENT_STORE_PATH)
        self.store_path.mkdir(parents=True, exist_ok=True)
        self.db_path = self.store_path / "parents.db"
        self._init_db()
        
    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("CREATE TABLE IF NOT EXISTS parents (id TEXT PRIMARY KEY, data TEXT)")
    
    def save_parent(self, parent: dict):
        """Save a parent chunk dict to disk."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("INSERT OR REPLACE INTO parents (id, data) VALUES (?, ?)", 
                         (parent['id'], json.dumps(parent)))
                         
    def save_parents_batch(self, parents: list[dict]):
        with sqlite3.connect(self.db_path) as conn:
            conn.executemany("INSERT OR REPLACE INTO parents (id, data) VALUES (?, ?)",
                             [(p['id'], json.dumps(p)) for p in parents])
    
    def get_parent(self, parent_id: str) -> dict | None:
        """Load the full parent chunk by ID from disk."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("SELECT data FROM parents WHERE id = ?", (parent_id,))
            row = cursor.fetchone()
            if row:
                return json.loads(row[0])
        return None
    
    def expand_to_parents(self, child_chunks: list[dict]) -> list[dict]:
        """
        Replace child chunks with their parent chunks.
        Deduplicate: if two children share a parent, include the parent only once.
        Always fall back to the child text if parent is missing.
        """
        seen_parents = set()
        parent_chunks = []
        
        for child in child_chunks:
            # Safely handle different metadata shapes
            child_meta = child.get("metadata", {})
            parent_id = child_meta.get("parent_id") if isinstance(child_meta, dict) else None
            
            if parent_id and parent_id not in seen_parents:
                parent = self.get_parent(parent_id)
                if parent:
                    seen_parents.add(parent_id)
                    parent_chunks.append({
                        **parent,
                        "rerank_score": child.get("rerank_score", 0),
                        "matched_via_child": child["id"]
                    })
                    continue
            
            # Fallback: use child text directly
            if child["id"] not in seen_parents:
                seen_parents.add(child["id"])
                parent_chunks.append(child)
        
        return parent_chunks

parent_store = ParentStore()
