#!/bin/bash

# Service Status Checker

echo "🔍 Voice Agent Platform - Service Status"
echo "=========================================="
echo ""

# Backend
echo "📡 Backend API (http://localhost:3001)"
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
  echo "  ✅ Running"
  curl -s http://localhost:3001/api/health | python3 -m json.tool 2>/dev/null || echo "  Response received"
else
  echo "  ❌ Not responding"
  echo "  Check: cd backend && npm run start:dev"
fi
echo ""

# Frontend
echo "🎨 Frontend (http://localhost:3000)"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null | grep -q "200\|301\|302"; then
  echo "  ✅ Running"
else
  echo "  ❌ Not responding"
  echo "  Check: cd frontend && npm run dev"
fi
echo ""

# AI Service
echo "🤖 AI Service (http://localhost:3002)"
if curl -s http://localhost:3002/health > /dev/null 2>&1; then
  echo "  ✅ Running"
  curl -s http://localhost:3002/health | python3 -m json.tool 2>/dev/null || echo "  Response received"
else
  echo "  ❌ Not responding"
  echo "  Check: cd ai-service && python3 main.py"
fi
echo ""

# Database
echo "🗄️  Database (PostgreSQL)"
if command -v psql > /dev/null 2>&1; then
  if psql -h localhost -U voiceagent -d voiceagent -c "SELECT 1" > /dev/null 2>&1; then
    echo "  ✅ Connected"
  else
    echo "  ⚠️  Not connected (check DATABASE_URL in backend/.env)"
  fi
else
  echo "  ⚠️  psql not found (install PostgreSQL or use Docker)"
fi
echo ""

# Redis
echo "📦 Redis"
if command -v redis-cli > /dev/null 2>&1; then
  if redis-cli -h localhost ping > /dev/null 2>&1; then
    echo "  ✅ Connected"
  else
    echo "  ⚠️  Not connected (check REDIS_URL in backend/.env)"
  fi
else
  echo "  ⚠️  redis-cli not found (install Redis or use Docker)"
fi
echo ""

echo "📚 Quick Links:"
echo "  - Frontend: http://localhost:3000"
echo "  - Backend API: http://localhost:3001"
echo "  - API Docs: http://localhost:3001/api/docs"
echo "  - AI Service: http://localhost:3002"
echo ""
