#!/bin/bash

# WOTA Spotter Development Stop Script
# This script stops all running services

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# PID file locations
API_PID_FILE=".api.pid"
FRONTEND_PID_FILE=".frontend.pid"

echo -e "${YELLOW}Stopping WOTA Spotter development services...${NC}\n"

STOPPED_COUNT=0

# Stop API server
if [ -f "$API_PID_FILE" ]; then
  API_PID=$(cat "$API_PID_FILE")
  if kill -0 "$API_PID" 2>/dev/null; then
    echo -e "${BLUE}Stopping API server (PID: $API_PID)${NC}"
    kill "$API_PID"
    ((STOPPED_COUNT++))
  else
    echo -e "${YELLOW}API server is not running${NC}"
  fi
  rm "$API_PID_FILE"
else
  echo -e "${YELLOW}No API server PID file found${NC}"
fi

# Stop frontend
if [ -f "$FRONTEND_PID_FILE" ]; then
  FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
  if kill -0 "$FRONTEND_PID" 2>/dev/null; then
    echo -e "${BLUE}Stopping frontend (PID: $FRONTEND_PID)${NC}"
    kill "$FRONTEND_PID"
    ((STOPPED_COUNT++))
  else
    echo -e "${YELLOW}Frontend is not running${NC}"
  fi
  rm "$FRONTEND_PID_FILE"
else
  echo -e "${YELLOW}No frontend PID file found${NC}"
fi

echo ""
if [ $STOPPED_COUNT -eq 0 ]; then
  echo -e "${YELLOW}No services were running${NC}"
else
  echo -e "${GREEN}Stopped $STOPPED_COUNT service(s)${NC}"
fi