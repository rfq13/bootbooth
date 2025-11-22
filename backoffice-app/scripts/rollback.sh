#!/bin/bash

# Rollback Script for Backoffice App - PijarRupa.com
# Usage: ./rollback.sh [environment] [backup-tag]
# Example: ./rollback.sh production 20231201_143022

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Default values
ENVIRONMENT=${1:-"production"}
BACKUP_TAG=${2:-""}
APP_DIR="/home/deploy/backoffice-app"
BACKUP_DIR="/home/deploy/backups"

if [ "$ENVIRONMENT" = "staging" ]; then
    APP_DIR="/home/deploy/backoffice-app-staging"
fi

print_header "Backoffice App Rollback Script - PijarRupa.com"
echo "Environment: $ENVIRONMENT"
echo "App Directory: $APP_DIR"
echo "Backup Tag: $BACKUP_TAG"
echo ""
echo "🌐 Domain Configuration:"
if [ "$ENVIRONMENT" = "production" ]; then
    echo "  - Frontend: pijarrupa.com"
    echo "  - Backend API: api.pijarrupa.com"
else
    echo "  - Frontend: staging.pijarrupa.com"
    echo "  - Backend API: staging-api.pijarrupa.com"
fi
echo ""

# Check if running as deploy user
if [ "$(whoami)" != "deploy" ] && [ "$(whoami)" != "root" ]; then
    print_error "This script should be run as deploy user or root"
    exit 1
fi

# Function to list available backups
list_backups() {
    print_header "Available Backups"
    if [ -d "$BACKUP_DIR" ]; then
        ls -la "$BACKUP_DIR"/*.yml 2>/dev/null | grep -E "docker-compose-(prod|staging)-" | awk '{print $9}' | sed 's/.*docker-compose-\(.*\)-\(.*\)\.yml/\1 \2/' | while read env tag; do
            echo "  $env: $tag"
        done
    else
        print_warning "No backup directory found"
    fi
}

# Function to rollback to specific backup
rollback_to_backup() {
    local backup_file="$BACKUP_DIR/docker-compose-$ENVIRONMENT-$BACKUP_TAG.yml"
    
    if [ ! -f "$backup_file" ]; then
        print_error "Backup file not found: $backup_file"
        list_backups
        exit 1
    fi
    
    print_status "Rolling back to backup: $BACKUP_TAG"
    
    # Navigate to app directory
    cd "$APP_DIR"
    
    # Create current backup before rollback
    CURRENT_TAG=$(date +%Y%m%d_%H%M%S)
    print_status "Creating current backup as: $CURRENT_TAG"
    cp docker-compose.yml "$BACKUP_DIR/docker-compose-$ENVIRONMENT-$CURRENT_TAG.yml"
    
    # Stop current containers
    print_status "Stopping current containers..."
    docker compose down
    
    # Restore backup compose file
    print_status "Restoring backup compose file..."
    cp "$backup_file" docker-compose.yml
    
    # Pull images (in case they were pruned)
    print_status "Pulling Docker images..."
    docker compose pull
    
    # Start containers
    print_status "Starting containers..."
    docker compose up -d
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 30
    
    # Check health
    print_status "Checking service health..."
    if [ "$ENVIRONMENT" = "production" ]; then
        BACKEND_PORT=3002
        FRONTEND_PORT=5210
    else
        BACKEND_PORT=3003
        FRONTEND_PORT=5211
    fi
    
    # Check backend health
    if curl -f -s "http://localhost:$BACKEND_PORT/healthz" > /dev/null; then
        print_status "✅ Backend is healthy"
    else
        print_error "❌ Backend health check failed"
        docker compose logs backend
        exit 1
    fi
    
    # Check frontend health
    if curl -f -s "http://localhost:$FRONTEND_PORT" > /dev/null; then
        print_status "✅ Frontend is healthy"
    else
        print_error "❌ Frontend health check failed"
        docker compose logs frontend
        exit 1
    fi
    
    print_status "🎉 Rollback completed successfully!"
    print_status "Current backup tag: $CURRENT_TAG"
}

# Function to rollback to previous image tag
rollback_to_previous_image() {
    print_status "Rolling back to previous image tag..."
    
    cd "$APP_DIR"
    
    # Get current image tags
    print_status "Current images:"
    docker compose images
    
    # Get previous tags from Docker registry (requires docker login)
    print_warning "This requires access to Docker registry"
    print_status "Available tags (last 10):"
    
    # Extract image names from current compose
    BACKEND_IMAGE=$(grep -A 10 'backend:' docker-compose.yml | grep 'image:' | awk '{print $2}' | cut -d':' -f1)
    FRONTEND_IMAGE=$(grep -A 10 'frontend:' docker-compose.yml | grep 'image:' | awk '{print $2}' | cut -d':' -f1)
    
    if [ -n "$BACKEND_IMAGE" ]; then
        echo "Backend images:"
        docker pull $BACKEND_IMAGE:latest 2>/dev/null || true
        docker images $BACKEND_IMAGE --format "table {{.Repository}}:{{.Tag}}\t{{.CreatedAt}}\t{{.Size}}" | head -11
    fi
    
    if [ -n "$FRONTEND_IMAGE" ]; then
        echo "Frontend images:"
        docker pull $FRONTEND_IMAGE:latest 2>/dev/null || true
        docker images $FRONTEND_IMAGE --format "table {{.Repository}}:{{.Tag}}\t{{.CreatedAt}}\t{{.Size}}" | head -11
    fi
    
    echo ""
    print_warning "Please manually update docker-compose.yml with the desired image tags"
    print_warning "Then run: docker compose down && docker compose pull && docker compose up -d"
}

# Function to emergency rollback
emergency_rollback() {
    print_header "Emergency Rollback"
    print_warning "This will stop all services and run minimal setup"
    
    cd "$APP_DIR"
    
    # Stop all containers
    print_status "Stopping all containers..."
    docker compose down --remove-orphans
    
    # Clean up
    print_status "Cleaning up..."
    docker system prune -f
    
    # Start with minimal configuration
    print_status "Starting minimal services..."
    
    # Create minimal compose file
    cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  backend:
    image: ghcr.io/your-repo/backend:stable
    container_name: backoffice-backend-emergency
    ports:
      - "3002:3002"
    environment:
      BACKOFFICE_ADDR: ":3002"
      FRONTEND_ORIGIN: "http://localhost:5210"
    restart: unless-stopped
    
  frontend:
    image: ghcr.io/your-repo/frontend:stable
    container_name: backoffice-frontend-emergency
    ports:
      - "5210:5210"
    environment:
      NODE_ENV: production
      PORT: 5210
    restart: unless-stopped
EOF
    
    print_status "Starting emergency containers..."
    docker compose up -d
    
    print_status "Emergency rollback completed"
    print_warning "Please review logs and fix the issue"
}

# Function to show status
show_status() {
    print_header "Current Status"
    
    cd "$APP_DIR"
    
    echo "📊 Container Status:"
    docker compose ps
    
    echo ""
    echo "📋 Recent Logs:"
    echo "Backend (last 20 lines):"
    docker compose logs --tail=20 backend 2>/dev/null || echo "No backend logs"
    
    echo ""
    echo "Frontend (last 20 lines):"
    docker compose logs --tail=20 frontend 2>/dev/null || echo "No frontend logs"
    
    echo ""
    echo "🔍 Health Checks:"
    if [ "$ENVIRONMENT" = "production" ]; then
        BACKEND_PORT=3002
        FRONTEND_PORT=5210
    else
        BACKEND_PORT=3003
        FRONTEND_PORT=5211
    fi
    
    echo "Backend health (port $BACKEND_PORT):"
    if curl -f -s "http://localhost:$BACKEND_PORT/healthz" > /dev/null; then
        echo "✅ Healthy"
    else
        echo "❌ Unhealthy"
    fi
    
    echo "Frontend health (port $FRONTEND_PORT):"
    if curl -f -s "http://localhost:$FRONTEND_PORT" > /dev/null; then
        echo "✅ Healthy"
    else
        echo "❌ Unhealthy"
    fi
}

# Main script logic
case "${1:-}" in
    "list"|"ls")
        list_backups
        ;;
    "status"|"st")
        show_status
        ;;
    "emergency"|"em")
        emergency_rollback
        ;;
    "image"|"img")
        rollback_to_previous_image
        ;;
    "")
        if [ -z "$BACKUP_TAG" ]; then
            print_error "Please specify a backup tag or use 'list' to see available backups"
            echo ""
            echo "Usage: $0 [list|status|emergency|image] [backup-tag]"
            echo "Examples:"
            echo "  $0 list                    # List available backups"
            echo "  $0 status                  # Show current status"
            echo "  $0 production 20231201_143022  # Rollback to specific backup"
            echo "  $0 emergency               # Emergency rollback"
            echo "  $0 image                   # Rollback to previous image"
            exit 1
        fi
        rollback_to_backup
        ;;
    *)
        if [ -n "$BACKUP_TAG" ]; then
            rollback_to_backup
        else
            print_error "Invalid command: $1"
            echo ""
            echo "Usage: $0 [list|status|emergency|image] [backup-tag]"
            exit 1
        fi
        ;;
esac