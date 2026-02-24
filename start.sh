#!/usr/bin/env bash
set -euo pipefail

ROOT="/Users/bibekpoudel/Work/MedGemmaHackathon"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
LOGDIR="$ROOT/logs"
PIDDIR="$ROOT/.pids"

mkdir -p "$LOGDIR" "$PIDDIR"

BACKEND_URL="http://127.0.0.1:8000"
FRONTEND_URL="http://127.0.0.1:5173"
MINIO_URL="http://127.0.0.1:9000"
OLLAMA_URL="http://127.0.0.1:11434"
HF_CACHE="$HOME/.cache/huggingface/hub"
WHISPER_CACHE_DIR="$HF_CACHE/models--openai--whisper-small"

# Start MinIO (Docker)
if command -v docker >/dev/null 2>&1; then
  if ! docker info >/dev/null 2>&1; then
    echo "Docker daemon not running. Start Docker Desktop first." >&2
  else
    (cd "$BACKEND" && docker compose -f docker-compose.yml up -d minio minio-init) >/dev/null 2>&1 || true
  fi
else
  echo "Docker not found; skipping MinIO startup." >&2
fi

# Start backend (uvicorn)
if [[ -f "$BACKEND/.venv/bin/activate" ]]; then
  if ! lsof -iTCP:8000 -sTCP:LISTEN >/dev/null 2>&1; then
    (cd "$BACKEND" && \
      source .venv/bin/activate && \
      nohup python -m uvicorn main:app --port 8000 --log-level info > "$LOGDIR/backend.log" 2>&1 & echo $! > "$PIDDIR/backend.pid")
  else
    echo "Backend already running on port 8000." >&2
  fi
else
  echo "Backend venv not found at $BACKEND/.venv. Skipping backend start." >&2
fi

# Start frontend (Vite)
if [[ -f "$FRONTEND/package.json" ]]; then
  if ! lsof -iTCP:5173 -sTCP:LISTEN >/dev/null 2>&1; then
    (cd "$FRONTEND" && \
      nohup npm run dev -- --host 0.0.0.0 --port 5173 > "$LOGDIR/frontend.log" 2>&1 & echo $! > "$PIDDIR/frontend.pid")
  else
    echo "Frontend already running on port 5173." >&2
  fi
else
  echo "Frontend not found at $FRONTEND." >&2
fi

# Wait for services
wait_for() {
  local name="$1"; shift
  local url="$1"; shift
  local timeout="$1"; shift
  local start
  start=$(date +%s)
  while true; do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "[OK] $name: $url"
      return 0
    fi
    if (( $(date +%s) - start > timeout )); then
      echo "[WARN] $name not ready after ${timeout}s: $url" >&2
      return 1
    fi
    sleep 1
  done
}

echo "Waiting for services..."
wait_for "Backend" "$BACKEND_URL/api/health" 90 || true
wait_for "Frontend" "$FRONTEND_URL" 60 || true
wait_for "MinIO" "$MINIO_URL/minio/health/live" 60 || true
wait_for "Ollama" "$OLLAMA_URL/api/tags" 30 || true

# Verify Whisper cache (download if missing)
if [[ -d "$BACKEND/.venv" ]]; then
  if [[ ! -d "$WHISPER_CACHE_DIR" ]]; then
    echo "Whisper model not found in cache. Downloading openai/whisper-small..."
    (cd "$BACKEND" && \
      source .venv/bin/activate && \
      nohup python - <<'PY' > "$LOGDIR/whisper_download.log" 2>&1 &
from transformers import AutoProcessor, AutoModelForSpeechSeq2Seq
model_id = "openai/whisper-small"
AutoProcessor.from_pretrained(model_id)
AutoModelForSpeechSeq2Seq.from_pretrained(model_id)
print("Whisper download complete")
PY
    )
    echo "Whisper download started in background. Logs: $LOGDIR/whisper_download.log"
  else
    echo "Whisper model cache found."
  fi
else
  echo "Backend venv not found; skipping Whisper cache check." >&2
fi

# Print system status
if curl -fsS "$BACKEND_URL/api/health" >/dev/null 2>&1; then
  echo ""
  echo "System status:"
  HEALTH_JSON=$(curl -s "$BACKEND_URL/api/health" || true)
  echo "$HEALTH_JSON" | python3 -c 'import sys,json; 
import traceback
try:
    data=json.load(sys.stdin)
    print(json.dumps(data, indent=2))
except Exception:
    print("(unable to parse /api/health)")'
else
  echo ""
  echo "System status: backend not reachable."
fi

echo ""
echo "URLs:"
if curl -fsS "$FRONTEND_URL" >/dev/null 2>&1; then
  echo "- Frontend: $FRONTEND_URL"
else
  echo "- Frontend: $FRONTEND_URL (not reachable)"
fi
if curl -fsS "$BACKEND_URL/api/health" >/dev/null 2>&1; then
  echo "- Backend:  $BACKEND_URL"
else
  echo "- Backend:  $BACKEND_URL (not reachable)"
fi
if curl -fsS "$MINIO_URL/minio/health/live" >/dev/null 2>&1; then
  echo "- MinIO:    $MINIO_URL"
else
  echo "- MinIO:    $MINIO_URL (not reachable)"
fi
if curl -fsS "$OLLAMA_URL/api/tags" >/dev/null 2>&1; then
  echo "- Ollama:   $OLLAMA_URL"
else
  echo "- Ollama:   $OLLAMA_URL (not reachable)"
fi
