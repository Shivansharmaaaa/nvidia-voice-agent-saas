#!/bin/bash

# Voice Agent SaaS Platform Setup Script

set -e

echo "🚀 Setting up Voice Agent SaaS Platform..."

# Check prerequisites
echo "📋 Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed. Aborting." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed. Aborting." >&2; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "❌ Python 3 is required but not installed. Aborting." >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "⚠️  Docker is not installed. Docker Compose setup will be skipped." >&2; }

echo "✅ Prerequisites check passed"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Setup backend
echo "🔧 Setting up backend..."
cd backend
if [ ! -f .env ]; then
  echo "📝 Creating backend .env file..."
  cp .env.example .env
  echo "⚠️  Please update backend/.env with your configuration"
fi

npm install
echo "🗄️  Setting up database..."
npx prisma generate
echo "⚠️  Run 'npx prisma migrate dev' to create database schema"
cd ..

# Setup frontend
echo "🎨 Setting up frontend..."
cd frontend
if [ ! -f .env.local ]; then
  echo "📝 Creating frontend .env.local file..."
  cp .env.example .env.local
  echo "⚠️  Please update frontend/.env.local with your Clerk keys"
fi
npm install
cd ..

# Setup AI service
echo "🤖 Setting up AI service..."
cd ai-service
if [ ! -f .env ]; then
  echo "📝 Creating AI service .env file..."
  cp .env.example .env
  echo "⚠️  Please update ai-service/.env with your configuration"
fi

if [ -d "venv" ]; then
  echo "📦 Virtual environment already exists"
else
  echo "📦 Creating Python virtual environment..."
  python3 -m venv venv
fi

echo "📦 Installing Python dependencies..."
source venv/bin/activate
pip install -r requirements.txt
deactivate
cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Update environment files with your configuration:"
echo "   - backend/.env"
echo "   - frontend/.env.local"
echo "   - ai-service/.env"
echo ""
echo "2. Set up database:"
echo "   cd backend && npx prisma migrate dev"
echo ""
echo "3. Start services:"
echo "   Option A: Docker Compose"
echo "   docker-compose up"
echo ""
echo "   Option B: Manual"
echo "   Terminal 1: cd backend && npm run start:dev"
echo "   Terminal 2: cd frontend && npm run dev"
echo "   Terminal 3: cd ai-service && source venv/bin/activate && python main.py"
echo ""
