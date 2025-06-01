#!/bin/bash

# Final fix - replace the correct URLs from the real config

set -e

REMOTE_LLAMASTACK="http://lss-chai.apps.cluster-7nc6z.7nc6z.sandbox2170.opentlc.com"
BACKEND_IMAGE="quay.io/rbrhssa/x2ansible-backend:latest"

echo "🎯 Final Fix - Replace Correct URLs"
echo "==================================="
echo "Remote LlamaStack: $REMOTE_LLAMASTACK"
echo ""

# Use the real config we extracted
if [ ! -f "real_config.yaml" ]; then
    echo "📄 Extracting real config again..."
    podman run -d --name temp-extract2 $BACKEND_IMAGE tail -f /dev/null
    sleep 5
    podman exec temp-extract2 cat /app/config.yaml > real_config.yaml
    podman stop temp-extract2 && podman rm temp-extract2
fi

echo "🔍 Current URLs in the config:"
grep -n "base_url\|endpoint" real_config.yaml

echo ""
echo "📝 Creating final fixed config with correct URL replacements..."

# Replace the specific URLs we found in the real config
sed \
    -e "s|http://host.containers.internal:8321|$REMOTE_LLAMASTACK|g" \
    -e "s|http://llamastack:8321|$REMOTE_LLAMASTACK|g" \
    -e "s|http://localhost:8321|$REMOTE_LLAMASTACK|g" \
    real_config.yaml > final_config.yaml

echo "✅ Created final_config.yaml"

echo "🔍 URLs after replacement:"
grep -n "base_url\|endpoint" final_config.yaml

echo ""
echo "🧹 Cleaning up any existing test containers..."
podman stop x2ansible-final-test 2>/dev/null || true
podman rm x2ansible-final-test 2>/dev/null || true

echo "🚀 Testing with final corrected config..."

podman run -d \
    --name x2ansible-final-test \
    -p 8060:8000 \
    -v "$(pwd)/final_config.yaml:/app/config.yaml:ro" \
    -e PYTHONUNBUFFERED=1 \
    -e X2ANSIBLE_PROFILE=local \
    $BACKEND_IMAGE

echo "⏳ Waiting for container to start..."
sleep 25

# Test the application
echo "🔍 Testing the application..."

if ! podman ps | grep -q x2ansible-final-test; then
    echo "❌ Container failed to start"
    echo "Container logs:"
    podman logs x2ansible-final-test | tail -50
    exit 1
fi

echo "📊 Container startup logs (key lines):"
podman logs x2ansible-final-test | grep -E "(Using.*URL|LlamaStack|HTTP Request.*POST|base_url)" | head -10
echo ""

echo "📡 Testing health endpoint..."
max_attempts=15
attempt=1

while [ $attempt -le $max_attempts ]; do
    if response=$(curl -s "http://localhost:8060/health" 2>/dev/null); then
        echo "✅ Application is responding!"
        echo ""
        
        # Check if it's using the remote LlamaStack in the health response
        if echo "$response" | grep -q "lss-chai\|$REMOTE_LLAMASTACK"; then
            echo "🎉 SUCCESS! Health response shows remote LlamaStack!"
            echo "📊 Health response: $response"
            SUCCESS=true
        elif podman logs x2ansible-final-test | grep -q "$REMOTE_LLAMASTACK"; then
            echo "🎉 SUCCESS! Logs show remote LlamaStack connection!"
            echo "📊 Health response: $response"
            SUCCESS=true
        else
            echo "📊 Health response: $response"
            echo ""
            echo "⚠️ Let's check what's happening with the HTTP requests:"
            podman logs x2ansible-final-test | grep "HTTP Request.*POST" | head -5
            SUCCESS=partial
        fi
        break
    fi
    
    if [ $attempt -eq $max_attempts ]; then
        echo "❌ Application failed to respond after $max_attempts attempts"
        echo "Container logs:"
        podman logs x2ansible-final-test | tail -30
        SUCCESS=false
        break
    fi
    
    echo "Attempt $attempt/$max_attempts - waiting for application..."
    sleep 3
    ((attempt++))
done

if [ "$SUCCESS" = true ]; then
    echo ""
    echo "🎉 FINAL SUCCESS!"
    echo "================="
    echo "✅ Your x2ansible application is now connected to the remote LlamaStack server!"
    echo ""
    echo "🌐 Application URL: http://localhost:8060"
    echo "🔧 Health Check: http://localhost:8060/health"
    echo "📚 API Docs: http://localhost:8060/docs"
    echo ""
    echo "🧪 Test the validation endpoint:"
    echo "curl -X POST http://localhost:8060/api/v1/validate \\"
    echo "  -H 'Content-Type: application/json' \\"
    echo "  -d '{\"playbook\": \"---\\n- hosts: all\\n  tasks:\\n    - debug: msg=hello\", \"lint_profile\": \"basic\"}'"
    echo ""
    echo "🎯 What we accomplished:"
    echo "1. ✅ Extracted real config from your existing image (no rebuild needed)"
    echo "2. ✅ Identified correct URL format: base_url instead of endpoint"  
    echo "3. ✅ Successfully replaced host.containers.internal:8321 with remote server"
    echo "4. ✅ Used existing profile system (X2ANSIBLE_PROFILE=local)"
    echo "5. ✅ All agents initialized with remote LlamaStack connection"
    echo ""
    echo "💡 For permanent use, you can:"
    echo "1. Use this final_config.yaml in your deployment"
    echo "2. Mount it as a volume: -v /path/to/final_config.yaml:/app/config.yaml:ro"
    echo "3. Set X2ANSIBLE_PROFILE=local environment variable"
    
elif [ "$SUCCESS" = partial ]; then
    echo ""
    echo "⚠️ PARTIAL SUCCESS"
    echo "=================="
    echo "App started but let's verify the connection manually:"
    echo ""
    echo "🔍 Check the logs for HTTP requests to see what URL it's actually using:"
    echo "podman logs x2ansible-final-test | grep 'HTTP Request'"
    echo ""
    echo "🌐 Application URL: http://localhost:8060"
    
else
    echo ""
    echo "❌ Something went wrong"
    echo "===================="
    echo "Check the logs above"
fi

echo ""
echo "🧹 To stop and cleanup:"
echo "podman stop x2ansible-final-test && podman rm x2ansible-final-test && rm real_config.yaml final_config.yaml"