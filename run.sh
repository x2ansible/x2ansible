#!/bin/bash
# X2Ansible Management Script - Production Ready

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Check if podman-compose is available
check_compose() {
    if command -v podman-compose &> /dev/null; then
        COMPOSE_CMD="podman-compose"
        log "Using podman-compose ✅"
    elif command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
        warn "Using docker-compose (podman-compose preferred)"
    else
        error "Neither podman-compose nor docker-compose found"
        info "Install podman-compose with: pip install podman-compose"
        exit 1
    fi
}

# Ensure required files exist
check_files() {
    local missing=0
    
    if [ ! -f "docker-compose.yml" ]; then
        error "docker-compose.yml not found"
        missing=1
    fi
    
    if [ ! -f "Dockerfile" ]; then
        error "Dockerfile not found"
        missing=1
    fi
    
    if [ ! -f "config.yaml" ]; then
        error "config.yaml not found"
        missing=1
    fi
    
    if [ ! -f "requirements.txt" ]; then
        error "requirements.txt not found"
        missing=1
    fi
    
    if [ $missing -eq 1 ]; then
        error "Missing required files. Ensure you're in the project root directory."
        exit 1
    fi
    
    log "All required files found"
}

# Show usage
usage() {
    echo "X2Ansible Management Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  up      - Start all services"
    echo "  down    - Stop all services"
    echo "  build   - Build containers"
    echo "  logs    - Show logs (use -f to follow)"
    echo "  status  - Show service status"
    echo "  clean   - Remove all containers, volumes, and images"
    echo "  shell   - Access application shell"
    echo ""
    echo "Examples:"
    echo "  $0 up           # Start everything"
    echo "  $0 logs -f      # Follow logs"
    echo "  $0 shell        # Access container"
}

# Start services
start() {
    log "Starting X2Ansible services..."
    $COMPOSE_CMD up -d
    
    # Wait for health check
    log "Waiting for services to be healthy..."
    local attempts=0
    local max_attempts=30
    
    while [ $attempts -lt $max_attempts ]; do
        if curl -s http://localhost:8000/health >/dev/null 2>&1 || curl -s http://localhost:8000/ >/dev/null 2>&1; then
            log "✅ API is ready at http://localhost:8000"
            break
        fi
        
        attempts=$((attempts + 1))
        echo -n "."
        sleep 2
    done
    
    if [ $attempts -eq $max_attempts ]; then
        warn "API health check timeout - check logs"
    fi
    
    log "🎉 X2Ansible is running!"
    info "📍 API: http://localhost:8000"
    info "📍 UI:  http://localhost:3000"
    info "📋 View logs: $0 logs -f"
}

# Stop services
stop() {
    log "Stopping X2Ansible services..."
    $COMPOSE_CMD down
    log "✅ Services stopped"
}

# Build containers
build() {
    log "Building X2Ansible containers..."
    $COMPOSE_CMD build --no-cache
    log "✅ Build complete"
}

# Show logs
show_logs() {
    if [ "$1" = "-f" ] || [ "$1" = "--follow" ]; then
        $COMPOSE_CMD logs -f
    else
        $COMPOSE_CMD logs --tail=50
    fi
}

# Show status
status() {
    log "X2Ansible Service Status:"
    echo ""
    
    # Container status
    $COMPOSE_CMD ps
    echo ""
    
    # Service health
    info "Health Checks:"
    if curl -s http://localhost:8000/health >/dev/null 2>&1; then
        echo "✅ API Health: OK"
    elif curl -s http://localhost:8000/ >/dev/null 2>&1; then
        echo "⚠️  API: Responding (no health endpoint)"
    else
        echo "❌ API: Not responding"
    fi
    
    if curl -s http://localhost:3000/ >/dev/null 2>&1; then
        echo "✅ UI: OK"
    else
        echo "⚠️  UI: Not responding"
    fi
    
    if curl -s http://localhost:8321/health >/dev/null 2>&1; then
        echo "✅ LlamaStack: OK"
    else
        echo "⚠️  LlamaStack: Not responding"
    fi
    
    echo ""
    info "Volume Usage:"
    podman volume ls --filter label=app=x2ansible --format "table {{.Name}}\t{{.Driver}}\t{{.Scope}}" 2>/dev/null || echo "No volumes found"
}

# Clean everything
clean() {
    warn "This will remove ALL containers, volumes, and images"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log "Cleaning up..."
        $COMPOSE_CMD down -v --rmi all 2>/dev/null || true
        
        # Clean any remaining x2ansible resources
        podman rm -f $(podman ps -aq --filter label=app=x2ansible) 2>/dev/null || true
        podman volume rm $(podman volume ls -q --filter label=app=x2ansible) 2>/dev/null || true
        podman rmi $(podman images -q x2ansible) 2>/dev/null || true
        
        log "✅ Cleanup complete"
    else
        log "Cleanup cancelled"
    fi
}

# Access shell
shell() {
    local container_name="x2ansible"
    
    if ! $COMPOSE_CMD ps | grep -q "$container_name.*Up"; then
        error "Container $container_name is not running"
        info "Start it with: $0 up"
        exit 1
    fi
    
    log "Accessing $container_name shell..."
    $COMPOSE_CMD exec x2ansible /bin/bash
}

# Main execution
main() {
    check_compose
    check_files
    
    case "${1:-}" in
        "up"|"start")
            start
            ;;
        "down"|"stop")
            stop
            ;;
        "build")
            build
            ;;
        "logs")
            show_logs "$2"
            ;;
        "status")
            status
            ;;
        "clean")
            clean
            ;;
        "shell"|"exec")
            shell
            ;;
        "")
            usage
            ;;
        *)
            error "Unknown command: $1"
            usage
            exit 1
            ;;
    esac
}

main "$@"