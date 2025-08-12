#!/bin/bash

# BMAD MCP Server Setup Script for AI Daily Assistant
# This script helps set up and configure the BMAD MCP Server integration

set -e

echo "🚀 AI Daily Assistant - BMAD MCP Server Setup"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        echo "Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        echo "Visit: https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    print_status "Docker and Docker Compose are installed"
}

# Check if BMAD MCP repository exists
check_bmad_repo() {
    if [ ! -d "bmap_mcp" ]; then
        print_warning "BMAD MCP repository not found. Cloning..."
        git clone https://github.com/fuchsst/bmap_mcp.git
        print_status "BMAD MCP repository cloned"
    else
        print_status "BMAD MCP repository found"
    fi
}

# Setup environment variables
setup_environment() {
    print_info "Setting up environment configuration..."
    
    if [ ! -f "bmap_mcp/.env" ]; then
        cp bmap_mcp/.env.example bmap_mcp/.env
        print_status "Environment file created from example"
    else
        print_warning "Environment file already exists"
    fi
    
    echo ""
    echo "🔧 Environment Configuration"
    echo "============================"
    echo ""
    echo "Please configure your API keys in bmap_mcp/.env:"
    echo ""
    echo "Required (at least one):"
    echo "  - OPENAI_API_KEY=your_openai_api_key_here"
    echo "  - ANTHROPIC_API_KEY=your_anthropic_api_key_here"
    echo "  - GEMINI_API_KEY=your_google_gemini_key_here"
    echo ""
    echo "Optional (for AWS Bedrock):"
    echo "  - AWS_ACCESS_KEY_ID=your_aws_access_key_here"
    echo "  - AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here"
    echo "  - AWS_DEFAULT_REGION=us-west-1"
    echo ""
    
    read -p "Press Enter to continue after configuring your API keys..."
}

# Build and start services
start_services() {
    print_info "Building and starting BMAD MCP Server..."
    
    # Build the BMAD MCP server
    cd bmap_mcp
    docker-compose build bmad-mcp-server
    cd ..
    
    print_status "BMAD MCP Server built successfully"
    
    # Start the server
    print_info "Starting BMAD MCP Server in SSE mode..."
    cd bmap_mcp
    docker-compose up -d bmad-mcp-server
    cd ..
    
    print_status "BMAD MCP Server started"
    
    # Wait for server to be ready
    print_info "Waiting for server to be ready..."
    sleep 10
    
    # Check server health
    if curl -f http://localhost:8000/health &> /dev/null; then
        print_status "BMAD MCP Server is healthy and ready"
    else
        print_warning "Server may still be starting up. Check logs with: docker-compose -f bmap_mcp/docker-compose.yml logs bmad-mcp-server"
    fi
}

# Test the integration
test_integration() {
    print_info "Testing BMAD MCP Server integration..."
    
    # Test health endpoint
    if curl -f http://localhost:8000/health &> /dev/null; then
        print_status "Health check passed"
    else
        print_error "Health check failed"
        return 1
    fi
    
    # Test tools endpoint
    if curl -f http://localhost:8000/tools &> /dev/null; then
        print_status "Tools endpoint accessible"
    else
        print_error "Tools endpoint failed"
        return 1
    fi
    
    print_status "Integration test completed successfully"
}

# Main setup process
main() {
    echo "Starting BMAD MCP Server setup process..."
    echo ""
    
    # Step 1: Check prerequisites
    print_info "Step 1: Checking prerequisites..."
    check_docker
    echo ""
    
    # Step 2: Setup BMAD repository
    print_info "Step 2: Setting up BMAD MCP repository..."
    check_bmad_repo
    echo ""
    
    # Step 3: Configure environment
    print_info "Step 3: Configuring environment..."
    setup_environment
    echo ""
    
    # Step 4: Start services
    print_info "Step 4: Starting services..."
    start_services
    echo ""
    
    # Step 5: Test integration
    print_info "Step 5: Testing integration..."
    if test_integration; then
        echo ""
        print_status "🎉 BMAD MCP Server setup completed successfully!"
        echo ""
        echo "Next steps:"
        echo "1. Start your AI Daily Assistant: npm run dev"
        echo "2. Navigate to the dashboard to see BMAD integration"
        echo "3. The BMAD MCP Server is running at: http://localhost:8000"
        echo ""
        echo "Useful commands:"
        echo "  - View logs: docker-compose -f bmap_mcp/docker-compose.yml logs bmad-mcp-server"
        echo "  - Stop server: docker-compose -f bmap_mcp/docker-compose.yml down"
        echo "  - Restart server: docker-compose -f bmap_mcp/docker-compose.yml restart bmad-mcp-server"
        echo ""
    else
        print_error "Setup completed with errors. Please check the logs."
        exit 1
    fi
}

# Handle script interruption
trap 'echo ""; print_warning "Setup interrupted by user"; exit 1' INT

# Run main function
main
