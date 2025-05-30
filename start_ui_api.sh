#!/bin/bash
set -e

# Ensure writable config and folders (OpenShift SCC safe)
chmod 777 /opt/app/config.yaml 2>/dev/null || true
chmod -R 777 /opt/app/uploads /opt/app/logs 2>/dev/null || true

# Optional: fail fast if config is not mounted
if [ ! -f /opt/app/config.yaml ]; then
  echo " config.yaml not found at /opt/app/config.yaml"
  exit 1
fi

echo " Starting FastAPI backend (Uvicorn)..."
nohup python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 &

echo " Starting React UI (static build) on :3000..."
npx serve -s ./ui -l 3000 &

wait -n
