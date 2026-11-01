#!/bin/bash

# Quick Start Script for Voice Agent Platform

set -e

echo "🚀 Starting Voice Agent Platform Setup..."
echo ""

# Check if .env exists
if [ ! -f backend/.env ]; then
  echo "📝 Creating backend/.env from template..."
  cat > backend/.env << EOF
DATABASE_URL=postgresql://voiceagent:voiceagent123@localhost:5432/voiceagent
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-change-in-production-$(openssl rand -hex 32)
PORT=3001
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:3001
WS_URL=ws://localhost:3002
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
EOF
  echo "✅ Created backend/.env - Please update with your credentials"
fi

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
cd backend
npx prisma generate

# Create migration (if database is available)
echo "🗄️  Creating database migration..."
if npx prisma migrate dev --name init --create-only 2>/dev/null; then
  echo "✅ Migration created"
else
  echo "⚠️  Could not create migration (database may not be available)"
  echo "   Run: npx prisma migrate dev (after database is set up)"
fi

# Seed database (if available)
echo "🌱 Seeding database..."
if npm run prisma:seed 2>/dev/null; then
  echo "✅ Database seeded"
else
  echo "⚠️  Could not seed database (database may not be available)"
  echo "   Run: npm run prisma:seed (after database is set up)"
fi

cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Set up PostgreSQL and Redis (or use Docker Compose)"
echo "2. Update backend/.env with your database URL and API keys"
echo "3. Run database migration: cd backend && npx prisma migrate dev"
echo "4. Seed database: cd backend && npm run prisma:seed"
echo "5. Start backend: cd backend && npm run start:dev"
echo "6. Start frontend: cd frontend && npm run dev"
echo "7. Start AI service: cd ai-service && python main.py"
echo ""
echo "Or use Docker Compose: docker compose up"
echo ""
