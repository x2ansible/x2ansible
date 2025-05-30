# ---- Build the React UI ----
FROM registry.access.redhat.com/ubi9/nodejs-20 AS ui-build

WORKDIR /build
COPY x2ansible-ui ./x2ansible-ui

WORKDIR /build/x2ansible-ui

# Run as root for npm install/build permissions
USER 0

RUN npm install --legacy-peer-deps && npm run build

# ---- Runtime: Python (FastAPI) + Static UI ----
FROM registry.access.redhat.com/ubi9/python-311:latest

WORKDIR /opt/app

COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY main.py app.py config.yaml ./
COPY agents ./agents
COPY routes ./routes
COPY tools ./tools
COPY utils ./utils
COPY models ./models
COPY ai_modules ./ai_modules
COPY infra ./infra
COPY uploads ./uploads
COPY config ./config
COPY lssapi.json ./
COPY __main__.py ./

# Copy static UI build
COPY --from=ui-build /build/x2ansible-ui/out ./ui

# Install static file server for UI
RUN pip install --no-cache-dir uvicorn fastapi python-multipart httpx pyyaml jinja2 && \
    pip install --no-cache-dir serve

# Ensure config.yaml and folders are writable for any UID (SCC safe)
RUN chmod 0777 /opt/app/config.yaml || true && \
    chmod -R 0777 /opt/app/uploads /opt/app/logs || true

USER 1001

EXPOSE 8000
EXPOSE 3000

COPY start_ui_api.sh /opt/app/start_ui_api.sh
RUN chmod +x /opt/app/start_ui_api.sh

ENTRYPOINT ["/opt/app/start_ui_api.sh"]
