#!/bin/bash

# AI Daily Assistant Development Server Manager
# ============================================
# 
# Concurrently runs all development services:
# - Frontend (React/Vite) on port 5174
# - Backend (Twilio-OpenRouter) on port 3005
# - Chatterbox TTS Server on port 8000 (optional)
# 
# Usage: ./start-dev.sh [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Process IDs
FRONTEND_PID=""
BACKEND_PID=""
CHATTERBOX_PID=""

# Options
NO_TTS=false
FRONTEND_ONLY=false
BACKEND_ONLY=false
SHOW_HELP=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --no-tts)
      NO_TTS=true
      shift
      ;;
    --frontend)
      FRONTEND_ONLY=true
      shift
      ;;
    --backend)
      BACKEND_ONLY=true
      shift
      ;;
    --help)
      SHOW_HELP=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Help message
if [ "$SHOW_HELP" = true ]; then
  echo -e "${WHITE}AI Daily Assistant Development Server Manager${NC}"
  echo ""
  echo -e "${YELLOW}Usage:${NC}"
  echo "  ./start-dev.sh [options]"
  echo ""
  echo -e "${YELLOW}Options:${NC}"
  echo "  --no-tts     Skip starting Chatterbox TTS server"
  echo "  --frontend   Start only frontend service"
  echo "  --backend    Start only backend service"
  echo "  --help       Show this help message"
  echo ""
  echo -e "${YELLOW}Services:${NC}"
  echo -e "  ${CYAN}Frontend${NC}     React/Vite development server (port 5174)"
  echo -e "  ${GREEN}Backend${NC}      Twilio-OpenRouter voice service (port 3005)"
  echo -e "  ${MAGENTA}Chatterbox${NC}   TTS server for voice synthesis (port 8000)"
  echo ""
  echo -e "${YELLOW}Examples:${NC}"
  echo "  ./start-dev.sh                    # Start all services"
  echo "  ./start-dev.sh --no-tts          # Start without TTS server"
  echo "  ./start-dev.sh --frontend        # Start only frontend"
  echo "  ./start-dev.sh --backend         # Start only backend"
  exit 0
fi

# Utility functions
log() {
  local service=$1
  local message=$2
  local color=$3
  local timestamp=$(date '+%H:%M:%S')
  
  echo -e "${WHITE}[${timestamp}]${NC} ${color}[${service}]${NC} ${message}"
}

check_command() {
  if ! command -v $1 &> /dev/null; then
    echo -e "${RED}Error: $1 is not installed or not in PATH${NC}"
    return 1
  fi
  return 0
}

check_directory() {
  if [ ! -d "$1" ]; then
    echo -e "${RED}Error: Directory $1 does not exist${NC}"
    return 1
  fi
  return 0
}

check_file() {
  if [ ! -f "$1" ]; then
    echo -e "${RED}Error: File $1 does not exist${NC}"
    return 1
  fi
  return 0
}

# Cleanup function
cleanup() {
  echo -e "\n${YELLOW}Shutting down all services...${NC}"
  
  if [ ! -z "$FRONTEND_PID" ]; then
    log "FRONTEND" "Stopping..." "$CYAN"
    kill $FRONTEND_PID 2>/dev/null || true
  fi
  
  if [ ! -z "$BACKEND_PID" ]; then
    log "BACKEND" "Stopping..." "$GREEN"
    kill $BACKEND_PID 2>/dev/null || true
  fi
  
  if [ ! -z "$CHATTERBOX_PID" ]; then
    log "CHATTERBOX" "Stopping..." "$MAGENTA"
    kill $CHATTERBOX_PID 2>/dev/null || true
  fi
  
  # Wait a moment for graceful shutdown
  sleep 2
  
  # Force kill if still running
  if [ ! -z "$FRONTEND_PID" ]; then
    kill -9 $FRONTEND_PID 2>/dev/null || true
  fi
  
  if [ ! -z "$BACKEND_PID" ]; then
    kill -9 $BACKEND_PID 2>/dev/null || true
  fi
  
  if [ ! -z "$CHATTERBOX_PID" ]; then
    kill -9 $CHATTERBOX_PID 2>/dev/null || true
  fi
  
  echo -e "${GREEN}All services stopped. Goodbye!${NC}"
  exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start frontend service
start_frontend() {
  log "FRONTEND" "Checking prerequisites..." "$CYAN"
  
  if ! check_command "npm"; then
    return 1
  fi
  
  if ! check_file "package.json"; then
    return 1
  fi
  
  log "FRONTEND" "Starting React/Vite development server on port 5174..." "$CYAN"
  
  PORT=5174 npm run dev > >(while read line; do log "FRONTEND" "$line" "$CYAN"; done) 2>&1 &
  FRONTEND_PID=$!
  
  log "FRONTEND" "Started with PID $FRONTEND_PID" "$CYAN"
  return 0
}

# Start backend service
start_backend() {
  log "BACKEND" "Checking prerequisites..." "$GREEN"
  
  if ! check_command "npm"; then
    return 1
  fi
  
  if ! check_directory "twilio-openrouter-voice"; then
    return 1
  fi
  
  if ! check_file "twilio-openrouter-voice/package.json"; then
    return 1
  fi
  
  log "BACKEND" "Starting Twilio-OpenRouter voice service on port 3005..." "$GREEN"
  
  cd twilio-openrouter-voice
  PORT=3005 npm start > >(while read line; do log "BACKEND" "$line" "$GREEN"; done) 2>&1 &
  BACKEND_PID=$!
  cd ..
  
  log "BACKEND" "Started with PID $BACKEND_PID" "$GREEN"
  return 0
}

# Start Chatterbox TTS service
start_chatterbox() {
  log "CHATTERBOX" "Checking prerequisites..." "$MAGENTA"
  
  if ! check_command "python"; then
    log "CHATTERBOX" "Python not found, trying python3..." "$MAGENTA"
    if ! check_command "python3"; then
      log "CHATTERBOX" "Python not available, skipping TTS server" "$MAGENTA"
      return 1
    fi
    PYTHON_CMD="python3"
  else
    PYTHON_CMD="python"
  fi
  
  local chatterbox_dir="src/features/chatterbox/server"
  
  if ! check_directory "$chatterbox_dir"; then
    log "CHATTERBOX" "Chatterbox server directory not found, skipping" "$MAGENTA"
    return 1
  fi
  
  if ! check_file "$chatterbox_dir/main.py"; then
    log "CHATTERBOX" "main.py not found, skipping TTS server" "$MAGENTA"
    return 1
  fi
  
  log "CHATTERBOX" "Starting TTS server on port 8000..." "$MAGENTA"
  
  cd "$chatterbox_dir"
  $PYTHON_CMD -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload > >(while read line; do log "CHATTERBOX" "$line" "$MAGENTA"; done) 2>&1 &
  CHATTERBOX_PID=$!
  cd - > /dev/null
  
  log "CHATTERBOX" "Started with PID $CHATTERBOX_PID" "$MAGENTA"
  return 0
}

# Main execution
main() {
  echo -e "${WHITE}🚀 AI Daily Assistant Development Server Manager${NC}\n"
  
  # Determine which services to start
  if [ "$FRONTEND_ONLY" = true ]; then
    start_frontend || exit 1
  elif [ "$BACKEND_ONLY" = true ]; then
    start_backend || exit 1
  else
    # Start all services
    start_frontend || exit 1
    start_backend || exit 1
    
    if [ "$NO_TTS" = false ]; then
      start_chatterbox || log "CHATTERBOX" "Failed to start TTS server (optional)" "$MAGENTA"
    fi
  fi
  
  echo -e "\n${GREEN}Services started! Press Ctrl+C to stop all services.${NC}\n"
  
  # Wait for all background processes
  wait
}

# Make sure we're in the right directory
if [ ! -f "package.json" ]; then
  echo -e "${RED}Error: This script must be run from the project root directory${NC}"
  exit 1
fi

# Run the main function
main
