#!/bin/bash
set -e

echo "🚀 Starting X2Ansible Application..."

# Function to check if a service is running
check_service() {
    local port=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    echo "Checking if $service_name is running on port $port..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:$port/ > /dev/null 2>&1; then
            echo "✅ $service_name is running on port $port"
            return 0
        fi
        echo "⏳ Attempt $attempt/$max_attempts: $service_name not ready yet..."
        sleep 2
        ((attempt++))
    done
    
    echo "❌ $service_name failed to start on port $port"
    return 1
}

# Function to start API server
start_api() {
    echo "📡 Starting FastAPI server..."
    
    # Check if main.py exists and is the correct entry point
    if [ -f "/opt/app/main.py" ]; then
        echo "Using main.py as entry point"
        cd /opt/app
        exec python -m uvicorn main:app --host 0.0.0.0 --port 8000 --log-level info &
    elif [ -f "/opt/app/app.py" ]; then
        echo "Using app.py as entry point"
        cd /opt/app
        exec python -m uvicorn app:app --host 0.0.0.0 --port 8000 --log-level info &
    elif [ -f "/opt/app/__main__.py" ]; then
        echo "Using __main__.py as entry point"
        cd /opt/app
        exec python . &
    else
        echo "❌ No valid entry point found (main.py, app.py, or __main__.py)"
        exit 1
    fi
    
    API_PID=$!
    echo "📡 API server started with PID: $API_PID"
}

# Function to start UI server (if Streamlit is being used)
start_ui() {
    # Check if this is a Streamlit app
    if [ -f "/opt/app/entrypoint.sh" ]; then
        echo "🎨 Starting Streamlit UI server..."
        cd /opt/app
        exec streamlit run app.py --server.port=3000 --server.address=0.0.0.0 &
        UI_PID=$!
        echo "🎨 UI server started with PID: $UI_PID"
    elif [ -d "/opt/app/ui" ] && [ "$(ls -A /opt/app/ui)" ]; then
        echo "🎨 Serving static UI files..."
        cd /opt/app/ui
        exec python -m http.server 3000 &
        UI_PID=$!
        echo "🎨 Static UI server started with PID: $UI_PID"
    else
        echo "ℹ️  No UI component found, API-only mode"
        UI_PID=""
    fi
}

# Function to handle shutdown
cleanup() {
    echo "🛑 Shutting down services..."
    if [ ! -z "$API_PID" ]; then
        kill $API_PID 2>/dev/null || true
    fi
    if [ ! -z "$UI_PID" ]; then
        kill $UI_PID 2>/dev/null || true
    fi
    echo "👋 Cleanup complete"
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Print environment info
echo "🔧 Environment:"
echo "   PYTHONPATH: ${PYTHONPATH:-not set}"
echo "   X2ANSIBLE_PROFILE: ${X2ANSIBLE_PROFILE:-not set}"
echo "   Working Directory: $(pwd)"
echo "   User: $(whoami)"

# Check if config file exists
if [ ! -f "/opt/app/config.yaml" ]; then
    echo "⚠️  Warning: config.yaml not found at /opt/app/config.yaml"
    echo "   Application may not function correctly"
fi

# Start services
start_api
start_ui

# Wait a moment for services to start
sleep 5

# Check if services are running
if ! check_service 8000 "API"; then
    echo "❌ Failed to start API service"
    cleanup
    exit 1
fi

if [ ! -z "$UI_PID" ]; then
    if ! check_service 3000 "UI"; then
        echo "⚠️  UI service failed to start, continuing with API only"
    fi
fi

echo "🎉 X2Ansible application is ready!"
echo "   📡 API: http://localhost:8000"
if [ ! -z "$UI_PID" ]; then
    echo "   🎨 UI:  http://localhost:3000"
fi

# Keep the script running and wait for child processes
wait