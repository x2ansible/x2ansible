#!/bin/bash
set -e

# Optional: fail fast if config is not mounted
if [ ! -f /app/config.yaml ]; then
  echo "❌ config.yaml not found at /app/config.yaml"
  exit 1
fi

echo "✅ Launching Streamlit app..."
exec streamlit run app.py --server.port=8080 --server.address=0.0.0.0
