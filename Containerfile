FROM registry.access.redhat.com/ubi9/python-311

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy all source code and entrypoint
COPY . .
COPY entrypoint.sh /app/entrypoint.sh

# Set required environment variables for Streamlit
ENV STREAMLIT_SERVER_PORT=8080
ENV STREAMLIT_SERVER_ADDRESS=0.0.0.0
ENV STREAMLIT_SERVER_HEADLESS=true
ENV STREAMLIT_SERVER_ENABLECORS=false

# Expose Streamlit port
EXPOSE 8080

# Run as non-root OpenShift-compatible user
USER 1001

ENTRYPOINT ["/app/entrypoint.sh"]
