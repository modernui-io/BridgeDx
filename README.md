# BridgeDx: Clinical Decision Support for Frontline Health Workers

> **MedGemma Impact Challenge 2026 Submission**  
> Bringing evidence-based diagnosis to the last mile — powered by MedGemma.

[![MedGemma](https://img.shields.io/badge/Model-MedGemma%204B%20%2B%2027B-blue)]()
[![HAI-DEF](https://img.shields.io/badge/HAI--DEF-Health%20AI%20Foundations-green)]()
[![License](https://img.shields.io/badge/License-Apache%202.0-orange)]()

## What is BridgeDx?

BridgeDx is a **mobile-first clinical decision support tool** for community health workers (CHWs) in low-resource settings. It combines MedGemma's medical reasoning with retrieval-augmented generation (RAG) grounded in WHO, MSF, and Orphanet clinical protocols to deliver:

- **Evidence-grounded differential diagnosis** — every flag cites a specific protocol
- **Voice-first intake** — CHWs speak observations, Whisper transcribes
- **Rare disease detection** — 9,000+ Orphanet conditions via MedGemma 27B
- **Offline-capable** — MedGemma 4B runs locally via Ollama, no internet needed
- **Safety-first** — emergency detection, confidence gating, faithfulness verification

## HAI-DEF Models Used

| Model | Purpose |
|-------|---------|
| **MedGemma 4B-IT** | Standard triage, multimodal dermatological input (via Ollama locally) |
| **MedGemma 27B-IT** | Rare/complex disease differential (via Ollama or Vertex AI) |
| **Whisper-small** | Voice-to-text clinical intake |

## Quick Start

```bash
# Prerequisites: Python 3.11+, Node.js 18+, Ollama, Docker (optional, for MinIO)

# 1. Clone
git clone https://github.com/bibekpdl/BridgeDx.git
cd MedGemmaHackathon

# 2. Backend setup
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 3. Pull MedGemma models
ollama pull MedAIBase/MedGemma1.5:4b

# 4. Build RAG index (WHO IMCI + MSF + Orphanet)
python scripts/build_rag.py

# 5. Frontend setup
cd ../frontend && npm install

# 6. Start everything
cd .. && bash start.sh
```

Open **http://localhost:5173** in your browser.

## Project Structure

```
MedGemmaHackathon/
├── backend/
│   ├── main.py                    # FastAPI app entry point
│   ├── config.py                  # Configuration (models, paths, RAG params)
│   ├── routes/
│   │   ├── assess.py              # POST /api/assess — main assessment endpoint
│   │   ├── debug_context.py       # POST /api/debug/context — RAG inspection
│   │   └── health.py              # GET /api/health — system status
│   ├── services/
│   │   ├── inference/
│   │   │   ├── base.py           # Abstract inference backend
│   │   │   ├── ollama_backend.py # Local MedGemma via Ollama
│   │   │   └── vertex_backend.py # Cloud MedGemma via Vertex AI
│   │   ├── rag/
│   │   │   ├── pipeline.py       # RAG orchestration + context assembly
│   │   │   ├── hybrid_retriever.py # BM25 + vector hybrid search
│   │   │   ├── reranker.py       # Cross-encoder reranking
│   │   │   ├── query_expander.py # Clinical synonym expansion
│   │   │   ├── parent_store.py   # Parent chunk storage (SQLite)
│   │   │   └── chunker.py        # Document chunking strategies
│   │   ├── safety.py             # Input safety gate
│   │   └── medasr.py             # Whisper voice transcription
│   ├── scripts/
│   │   ├── build_rag.py          # Build RAG index from parsed sources
│   │   └── validate_rag.py       # RAG quality validation
│   └── data/
│       ├── parsed/               # Parsed WHO IMCI + MSF JSON
│       └── parents/              # Parent chunks DB + Orphanet data
├── frontend/                     # React + Vite UI
│   └── src/pages/
│       ├── IntakePage.jsx        # Patient intake form
│       ├── ReviewPage.jsx        # CHW review before submit
│       ├── ResultsPage.jsx       # Differential diagnosis display
│       └── HistoryPage.jsx       # Case history
├── tests/
│   └── test_scenario_a.py        # Automated validation tests
├── start.sh                      # One-command startup
└── stop.sh                       # Graceful shutdown
```

## Validated Scenarios

| Scenario | Expected | Result |
|----------|----------|--------|
| Prolonged fever, Nepal (VL) | Visceral Leishmaniasis | VL 75% — MSF evidence |
| Acute respiratory, Kenya | Severe Pneumonia | Pneumonia 70% — WHO IMCI |
| Chronic organomegaly, Bihar | Gaucher Disease | Gaucher 50% — Orphanet |
| GI fever, Nepal | Typhoid Fever | Typhoid 70% — MSF evidence |

## License

Apache 2.0
