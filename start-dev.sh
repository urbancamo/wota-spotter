#!/bin/bash

# WOTA Spotter Development Startup Script
# This script starts the API server, frontend, and ngrok routing

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
NGROK_PID_FILE=".ngrok.pid"

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

  if [ -f "$NGROK_PID_FILE" ]; then
    NGROK_PID=$(cat "$NGROK_PID_FILE")
    if kill -0 "$NGROK_PID" 2>/dev/null; then
      echo -e "${BLUE}Stopping ngrok (PID: $NGROK_PID)${NC}"
      kill "$NGROK_PID"
    fi
    rm "$NGROK_PID_FILE"
  fi

  echo -e "${GREEN}All services stopped${NC}"
}

# Set up trap to call cleanup on script exit
trap cleanup EXIT INT TERM

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
  echo -e "${RED}Error: ngrok is not installed${NC}"
  echo "Please install ngrok from https://ngrok.com/download"
  exit 1
fi

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

# Start ngrok
echo -e "${BLUE}Starting ngrok tunnel to port 3000...${NC}"
ngrok http 3000 > ngrok.log 2>&1 &
NGROK_PID=$!
echo $NGROK_PID > "$NGROK_PID_FILE"
echo -e "${GREEN}✓ ngrok started (PID: $NGROK_PID)${NC}"
sleep 2

# Get ngrok URL
echo -e "\n${GREEN}All services are running!${NC}\n"
echo -e "${BLUE}Local URLs:${NC}"
echo -e "  Frontend: http://localhost:3000"
echo -e "  API:      http://localhost:3001"
echo ""

# Try to get ngrok URL from API
if command -v curl &> /dev/null; then
  sleep 2
  NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | grep -o 'https://[^"]*' | head -1)
  if [ ! -z "$NGROK_URL" ]; then
    echo -e "${GREEN}ngrok URL: $NGROK_URL${NC}"
  else
    echo -e "${YELLOW}ngrok URL: Check http://localhost:4040 for the tunnel URL${NC}"
  fi
else
  echo -e "${YELLOW}ngrok URL: Check http://localhost:4040 for the tunnel URL${NC}"
fi

echo ""
echo -e "${YELLOW}Logs are being written to:${NC}"
echo -e "  API:      api.log"
echo -e "  Frontend: frontend.log"
echo -e "  ngrok:    ngrok.log"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Keep script running and tail logs
tail -f api.log frontend.log ngrok.log 2>/dev/null