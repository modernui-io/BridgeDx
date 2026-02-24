#!/usr/bin/env bash
set -euo pipefail

ROOT="/Users/bibekpoudel/Work/MedGemmaHackathon"
PIDDIR="$ROOT/.pids"
BACKEND="$ROOT/backend"

# Stop frontend
if [[ -f "$PIDDIR/frontend.pid" ]]; then
  PID=$(cat "$PIDDIR/frontend.pid")
  if kill -0 "$PID" >/dev/null 2>&1; then
    kill "$PID" || true
  fi
  rm -f "$PIDDIR/frontend.pid"
fi

# Stop backend
if [[ -f "$PIDDIR/backend.pid" ]]; then
  PID=$(cat "$PIDDIR/backend.pid")
  if kill -0 "$PID" >/dev/null 2>&1; then
    kill "$PID" || true
  fi
  rm -f "$PIDDIR/backend.pid"
fi

# Stop MinIO (Docker)
if command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    (cd "$BACKEND" && docker compose -f docker-compose.yml stop minio minio-init) >/dev/null 2>&1 || true
  fi
fi

echo "Stopped."
