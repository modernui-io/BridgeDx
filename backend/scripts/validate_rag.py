import sys
import os

# Add backend to path so we can import modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from services.rag.hybrid_retriever import hybrid_retriever
from services.rag.query_expander import expand_query
from services.rag.reranker import reranker

def test_query(query: str, mode: str):
    print(f"\n{'='*50}")
    print(f"TEST QUERY: '{query}' (Mode: {mode})")
    
    expanded = expand_query(query)
    print(f"EXPANDED: '{expanded}'\n")
    
    # Hybrid Retrieval
    children = hybrid_retriever.search(expanded, mode=mode, k=5)
    print(f"Top 5 Hybrid Chunks:")
    for i, c in enumerate(children):
        print(f"  {i+1}. [Score: {c['score']:.3f}] Source: {c.get('metadata', {}).get('source', 'Unknown')} - ID: {c['id']}")
    
    if not children:
        print("No chunks found! Index might be empty.")
        return
        
    # Reranking
    reranked = reranker.rerank(expanded, children, top_k=3)
    print(f"\nTop 3 Reranked Chunks:")
    for i, c in enumerate(reranked):
        print(f"  {i+1}. [R_Score: {c.get('rerank_score', 0):.3f}] Source: {c.get('metadata', {}).get('source', 'Unknown')}")
        snippet = c['text'][:100].replace('\n', ' ') + '...'
        print(f"     \"{snippet}\"")

def main():
    print("Validating RAG Retrieval Quality...")
    
    queries = [
        ("child fever 16 days weight loss swollen belly", "standard"),
        ("4 year old progressive abdominal swelling developmental regression", "rare"),
        ("convulsions unconscious infant", "standard"),
        ("yellow eyes and fatigue", "rare"),
    ]
    
    for q, mode in queries:
        test_query(q, mode)
        
if __name__ == "__main__":
    main()
