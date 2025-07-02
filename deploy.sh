#!/bin/bash

# Srh Deployment Script
# Usage: ./deploy.sh [environment]

set -e

ENVIRONMENT=${1:-production}
PROJECT_NAME="srh"

echo "🚀 Starting Srh deployment for environment: $ENVIRONMENT"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are available"
}

# Check if .env file exists
check_env() {
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from .env.example..."
        if [ -f .env.example ]; then
            cp .env.example .env
            print_warning "Please edit .env file with your configuration before continuing."
            read -p "Press Enter when you've configured .env file..."
        else
            print_error ".env.example file not found. Cannot create .env."
            exit 1
        fi
    fi
    print_success ".env file found"
}

# Generate SSL certificates for development
generate_ssl() {
    if [ "$ENVIRONMENT" = "development" ] && [ ! -d "ssl" ]; then
        print_status "Generating self-signed SSL certificates for development..."
        mkdir -p ssl
        openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem \
            -days 365 -nodes -subj "/C=DE/ST=State/L=City/O=Organization/CN=localhost"
        print_success "SSL certificates generated"
    fi
}

# Build and start services
deploy() {
    print_status "Building Docker images..."
    docker-compose build --no-cache
    
    print_status "Starting services..."
    docker-compose up -d
    
    print_status "Waiting for services to be ready..."
    sleep 10
    
    # Health check
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s http://localhost:3000/api/health > /dev/null; then
            print_success "Srh is running and healthy!"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            print_error "Health check failed after $max_attempts attempts"
            docker-compose logs srh
            exit 1
        fi
        
        print_status "Attempt $attempt/$max_attempts - waiting for Srh to be ready..."
        sleep 5
        ((attempt++))
    done
}

# Show status
show_status() {
    print_status "Service Status:"
    docker-compose ps
    
    echo
    print_status "Available URLs:"
    echo "🌐 Frontend: http://localhost:3000"
    echo "🔌 API: http://localhost:3000/api"
    echo "❤️ Health: http://localhost:3000/api/health"
    
    if [ "$ENVIRONMENT" = "production" ]; then
        echo "🔒 HTTPS: https://localhost (requires valid SSL certificates)"
    fi
    
    echo
    print_status "Logs:"
    echo "📝 View logs: docker-compose logs -f"
    echo "🔍 App logs: docker-compose logs -f srh"
    echo "🌐 Nginx logs: docker-compose logs -f nginx"
    echo "📊 Redis logs: docker-compose logs -f redis"
}

# Cleanup function
cleanup() {
    print_status "Stopping services..."
    docker-compose down
    print_success "Services stopped"
}

# Main deployment flow
main() {
    print_status "Srh Deployment Script v1.0"
    echo "Environment: $ENVIRONMENT"
    echo "========================================"
    
    check_docker
    check_env
    generate_ssl
    deploy
    show_status
    
    echo
    print_success "🎉 Deployment completed successfully!"
    print_status "To stop services: docker-compose down"
    print_status "To view logs: docker-compose logs -f"
    print_status "To update: git pull && ./deploy.sh"
}

# Handle script interruption
trap cleanup EXIT

# Parse command line arguments
case "$1" in
    "stop")
        cleanup
        exit 0
        ;;
    "logs")
        docker-compose logs -f
        exit 0
        ;;
    "status")
        docker-compose ps
        exit 0
        ;;
    "update")
        print_status "Updating Srh..."
        git pull
        docker-compose down
        docker-compose build --no-cache
        docker-compose up -d
        print_success "Update completed!"
        exit 0
        ;;
    *)
        main
        ;;
esac