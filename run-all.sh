#!/bin/bash

# Run All Services Script
# Starts backend, frontend, and AI service

set -e

echo "🚀 Starting Voice Agent Platform..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if services are already running
check_port() {
  lsof -ti:$1 > /dev/null 2>&1
}

if check_port 3001; then
  echo -e "${YELLOW}⚠️  Backend already running on port 3001${NC}"
else
  echo "📡 Starting Backend API..."
  cd backend
  npm run start:dev > ../logs/backend.log 2>&1 &
  BACKEND_PID=$!
  echo "  Backend PID: $BACKEND_PID"
  cd ..
fi

if check_port 3000; then
  echo -e "${YELLOW}⚠️  Frontend already running on port 3000${NC}"
else
  echo "🎨 Starting Frontend..."
  cd frontend
  npm run dev > ../logs/frontend.log 2>&1 &
  FRONTEND_PID=$!
  echo "  Frontend PID: $FRONTEND_PID"
  cd ..
fi

if check_port 3002; then
  echo -e "${YELLOW}⚠️  AI Service already running on port 3002${NC}"
else
  echo "🤖 Starting AI Service..."
  cd ai-service
  
  # Check if virtual environment exists
  if [ ! -d "venv" ]; then
    echo "  Creating Python virtual environment..."
    python3 -m venv venv
  fi
  
  source venv/bin/activate
  pip install -q -r requirements.txt 2>/dev/null || echo "  Installing dependencies..."
  
  python main.py > ../logs/ai-service.log 2>&1 &
  AI_PID=$!
  echo "  AI Service PID: $AI_PID"
  cd ..
fi

# Create logs directory
mkdir -p logs

echo ""
echo -e "${GREEN}✅ All services starting!${NC}"
echo ""
echo "📋 Service URLs:"
echo "  - Frontend:    http://localhost:3000"
echo "  - Backend API: http://localhost:3001"
echo "  - API Docs:    http://localhost:3001/api/docs"
echo "  - AI Service:  http://localhost:3002"
echo ""
echo "📝 Logs:"
echo "  - Backend:    logs/backend.log"
echo "  - Frontend:   logs/frontend.log"
echo "  - AI Service: logs/ai-service.log"
echo ""
echo "⏳ Waiting for services to start..."
sleep 5

# Check status
echo ""
echo "🔍 Service Status:"
for port in 3000 3001 3002; do
  if check_port $port; then
    echo -e "  ✅ Port $port: ${GREEN}Running${NC}"
  else
    echo -e "  ⏳ Port $port: ${YELLOW}Starting...${NC}"
  fi
done

echo ""
echo "💡 Tip: Run './scripts/check-status.sh' to check detailed status"
echo "💡 Tip: Check logs/ directory for service output"
echo ""
