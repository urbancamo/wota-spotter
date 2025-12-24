#!/bin/bash

# WOTA Spotter Development Startup Script
# This script starts the API server and frontend

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# PID file locations
API_PID_FILE=".api.pid"
FRONTEND_PID_FILE=".frontend.pid"

# Function to cleanup on exit
cleanup() {
  echo -e "\n${YELLOW}Shutting down services...${NC}"

  if [ -f "$API_PID_FILE" ]; then
    API_PID=$(cat "$API_PID_FILE")
    if kill -0 "$API_PID" 2>/dev/null; then
      echo -e "${BLUE}Stopping API server (PID: $API_PID)${NC}"
      kill "$API_PID"
    fi
    rm "$API_PID_FILE"
  fi

  if [ -f "$FRONTEND_PID_FILE" ]; then
    FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
    if kill -0 "$FRONTEND_PID" 2>/dev/null; then
      echo -e "${BLUE}Stopping frontend (PID: $FRONTEND_PID)${NC}"
      kill "$FRONTEND_PID"
    fi
    rm "$FRONTEND_PID_FILE"
  fi

  echo -e "${GREEN}All services stopped${NC}"
}

# Set up trap to call cleanup on script exit
trap cleanup EXIT INT TERM

echo -e "${GREEN}Starting WOTA Spotter development environment...${NC}\n"

# Start API server
echo -e "${BLUE}Starting API server on port 3001...${NC}"
npm run api > api.log 2>&1 &
API_PID=$!
echo $API_PID > "$API_PID_FILE"
echo -e "${GREEN}✓ API server started (PID: $API_PID)${NC}"
sleep 2

# Start frontend dev server
echo -e "${BLUE}Starting frontend dev server on port 3000...${NC}"
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$FRONTEND_PID_FILE"
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
sleep 3

echo -e "\n${GREEN}All services are running!${NC}\n"
echo -e "${BLUE}Local URLs:${NC}"
echo -e "  Frontend: http://localhost:3000"
echo -e "  API:      http://localhost:3001"
echo ""
echo -e "${YELLOW}Logs are being written to:${NC}"
echo -e "  API:      api.log"
echo -e "  Frontend: frontend.log"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Keep script running and tail logs
tail -f api.log frontend.log 2>/dev/null