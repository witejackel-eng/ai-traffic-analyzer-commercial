#!/bin/bash
# Auto-restart wrapper for the vision worker.
# The ONNX runtime can occasionally crash under memory pressure; this wrapper
# ensures the worker comes back automatically.
cd "$(dirname "$0")"
export PYTHONUNBUFFERED=1
while true; do
  echo "=== starting vision worker ==="
  python3 -m uvicorn app:app --host 0.0.0.0 --port 8001 --log-level info
  EXIT=$?
  echo "=== worker exited ($EXIT) — restarting in 2s ==="
  sleep 2
done
