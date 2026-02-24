import sys
import os
import json
import pickle
import numpy as np
import uuid
import chromadb
from pathlib import Path
from sentence_transformers import SentenceTransformer
from rank_bm25 import BM25Okapi

# Add backend to path so we can import modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from config import settings
from services.rag.chunker import DocumentChunker
from services.rag.parent_store import parent_store

def build_mock_data():
    # --- WHO IMCI ---
    who_path = os.path.join(os.path.dirname(__file__), "..", "data", "parsed", "parsed_who_imci.json")
    if os.path.exists(who_path):
        print("Using full parsed WHO IMCI data from JSON!")
        with open(who_path, "r") as f:
            who_entries = json.load(f)
        mock_who = [
            (e["section_code"], e["section_title"], e["text"], e["condition_tags"])
            for e in who_entries
        ]
    else:
        print("No parsed WHO IMCI data found — using minimal fallback.")
        mock_who = [
            ("4.1", "Fever — Assessment", "In a child aged 2-59 months presenting with fever for ≥7 days in a malaria-endemic region, assess for signs of severe disease. If fever has persisted ≥14 days AND hepatosplenomegaly is present AND weight loss is documented, classify as SEVERE FEBRILE ILLNESS and refer urgently. Look for jaundice (yellow skin or scleral icterus), stiff neck, or bulging fontanelle.", ["fever", "malaria", "leishmaniasis"]),
            ("4.2", "Fever — Treatment", "For uncomplicated fever with positive malaria test, provide first-line ACT. For fever >14 days with negative test, refer to hospital for broader investigation including typhoid and kala-azar.", ["fever", "malaria"])
        ]

    # --- Orphanet ---
    orphanet_path = os.path.join(os.path.dirname(__file__), "..", "data", "parents", "parsed_orphanet.json")
    if os.path.exists(orphanet_path):
        print("Using full parsed Orphanet database from JSON!")
        with open(orphanet_path, "r") as f:
            mock_orphanet = json.load(f)
    else:
        mock_orphanet = [
            {
                "name": "Gaucher Disease Type 3",
                "orpha_code": "ORPHA:77261",
                "synonyms": ["neuronopathic Gaucher", "type 3 Gaucher"],
                "prevalence": "1-9 / 100,000",
                "clinical_signs": "Hepatosplenomegaly is present in >95% of confirmed cases. Progressive neurological involvement including oculomotor apraxia, ataxia, and seizures. Chronic fatigue, anemia, and thrombocytopenia leading to easy bruising.",
                "diagnostic_criteria": "Deficient glucocerebrosidase enzyme activity in leukocytes. Biallelic pathogenic variants in the GBA1 gene. Distinctive Gaucher cells in bone marrow.",
                "differential_dx": "Niemann-Pick disease type C, Wolman disease, visceral leishmaniasis (in endemic regions)."
            }
        ]

    # --- MSF ---
    msf_path = os.path.join(os.path.dirname(__file__), "..", "data", "parsed", "parsed_msf.json")
    msf_entries = []
    if os.path.exists(msf_path):
        print("Using parsed MSF guidelines data from JSON!")
        with open(msf_path, "r") as f:
            msf_entries = json.load(f)
    else:
        print("No parsed MSF data found — skipping MSF ingestion. Run scripts/parse_msf_pdfs.py first.")

    parents = []
    children = []

    for code, title, text, tags in mock_who:
        p, c = DocumentChunker.chunk_who_imci(code, title, text, tags)
        parents.append(p)
        children.extend(c)

    for entry in mock_orphanet:
        p, c = DocumentChunker.chunk_orphanet(entry)
        parents.append(p)
        children.extend(c)

    for entry in msf_entries:
        p, c = DocumentChunker.chunk_msf(entry)
        parents.append(p)
        children.extend(c)

    return parents, children

def main():
    print("Building RAG Index...")
    
    # 1. Generate data
    parents, children = build_mock_data()
    print(f"Generated {len(parents)} parent chunks and {len(children)} child chunks.")
    
    # 2. Store parents
    parent_store.save_parents_batch(parents)
    print("Saved parent chunks to SQLite database.")
    
    # 3. Setup Chroma
    Path(settings.CHROMA_PATH).mkdir(parents=True, exist_ok=True)
    chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PATH)
    
    # Delete old collection if exists
    try:
        chroma_client.delete_collection("bridgedx_chunks")
    except ValueError:
        pass
        
    collection = chroma_client.create_collection("bridgedx_chunks")
    
    # 4. Embed and store children in Chroma
    print(f"Loading embedding model: {settings.EMBEDDING_MODEL} (this may take a moment downlading weights on first run)...")
    model = SentenceTransformer(settings.EMBEDDING_MODEL)
    
    child_texts = [c["text"] for c in children]
    child_ids = [c["id"] for c in children]
    child_metas = [c["metadata"] for c in children]
    
    print("Generating embeddings...")
    embeddings = model.encode(child_texts).tolist()
    
    collection.add(
        ids=child_ids,
        documents=child_texts,
        metadatas=child_metas,
        embeddings=embeddings
    )
    print("Stored dense vectors in ChromaDB.")
    
    # 5. Build BM25
    print("Building BM25 index...")
    tokenized_corpus = [doc.lower().split() for doc in child_texts]
    bm25 = BM25Okapi(tokenized_corpus)
    
    bm25_data = {
        "index": bm25,
        "ids": child_ids
    }
    
    Path(settings.BM25_PATH).parent.mkdir(parents=True, exist_ok=True)
    with open(settings.BM25_PATH, "wb") as f:
        pickle.dump(bm25_data, f)
    print("Saved BM25 sparse index.")
    
    print("\n✅ RAG Index build complete!")

if __name__ == "__main__":
    main()
