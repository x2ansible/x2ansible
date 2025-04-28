FROM registry.access.redhat.com/ubi9/python-311

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY . .

# Don't try chmod here — already executable via Git
COPY entrypoint.sh /app/entrypoint.sh

# Runtime config
EXPOSE 8080

ENV STREAMLIT_SERVER_PORT=8080
ENV STREAMLIT_SERVER_ADDRESS=0.0.0.0
ENV STREAMLIT_SERVER_HEADLESS=true
ENV STREAMLIT_SERVER_ENABLECORS=false

USER 1001

ENTRYPOINT ["/app/entrypoint.sh"]
