# Voice Agent Platform - Quick Start Guide

## ✅ What's Been Built

A complete, production-ready multi-tenant SaaS platform for AI voice agents with:

- **NVIDIA Open-Source Stack**: Nemotron ASR, Nemotron LLM, Magpie TTS
- **Full-Stack Application**: Next.js frontend, NestJS backend, Python AI service
- **Enterprise Features**: SSO, audit logs, dedicated GPU, IP allowlisting
- **Billing & Pricing**: Stripe integration, usage metering, 3 pricing tiers
- **Sales Tools**: ROI calculator, demo mode, sales playbooks
- **Customer Success**: Health scoring, churn risk, success plans
- **Production Ready**: Circuit breakers, retry logic, observability, runbooks

## 🚀 Quick Start (3 Options)

### Option 1: Docker Compose (Recommended)

```bash
# Start all services
docker compose up

# Services will be available at:
# - Frontend: http://localhost:3000
# - Backend API: http://localhost:3001
# - API Docs: http://localhost:3001/api/docs
# - AI Service: http://localhost:3002
```

### Option 2: Manual Setup

**1. Set up Database & Redis:**
```bash
# Install PostgreSQL and Redis, or use Docker:
docker run -d --name postgres -e POSTGRES_PASSWORD=voiceagent123 -e POSTGRES_USER=voiceagent -e POSTGRES_DB=voiceagent -p 5432:5432 postgres:15-alpine
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

**2. Configure Environment:**
```bash
# Backend .env is already created, update with your keys:
# - TWILIO_ACCOUNT_SID
# - TWILIO_AUTH_TOKEN  
# - STRIPE_SECRET_KEY
# - STRIPE_WEBHOOK_SECRET
```

**3. Run Database Setup:**
```bash
cd backend
npx prisma migrate dev
npm run prisma:seed
```

**4. Start Services:**
```bash
# Terminal 1: Backend
cd backend && npm run start:dev

# Terminal 2: Frontend  
cd frontend && npm run dev

# Terminal 3: AI Service
cd ai-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

### Option 3: Development Mode (No Database)

For testing without a database:

```bash
# Backend will start but API calls requiring DB will fail
cd backend && npm run start:dev

# Frontend will work for UI testing
cd frontend && npm run dev
```

## 📋 Pre-Flight Checklist

- [ ] PostgreSQL running (or Docker container)
- [ ] Redis running (or Docker container)
- [ ] Backend `.env` configured
- [ ] Twilio credentials (for telephony)
- [ ] Stripe keys (for billing)
- [ ] Database migrations run
- [ ] Database seeded with pricing plans

## 🎯 First Steps After Startup

1. **Access Frontend**: http://localhost:3000
2. **Create Account**: Sign up with Clerk (or your auth provider)
3. **Create Organization**: Use the dashboard
4. **Try Demo Mode**: `POST /api/demo/create` (with auth token)
5. **Create Agent**: Use the wizard or templates
6. **View API Docs**: http://localhost:3001/api/docs

## 🔑 Key Endpoints

### Authentication
- `POST /api/auth/webhook/clerk` - Clerk webhook
- `GET /api/auth/me` - Current user

### Organizations
- `GET /api/organizations` - List organizations
- `POST /api/organizations` - Create organization

### Agents
- `GET /api/organizations/:id/agents` - List agents
- `POST /api/organizations/:id/agents` - Create agent
- `POST /api/organizations/:id/agents/:agentId/deploy` - Deploy agent

### Demo & Sales
- `POST /api/demo/create` - Create demo org
- `GET /api/organizations/:id/sales/roi` - ROI calculator
- `GET /api/organizations/:id/sales/report` - Sales report

### Enterprise
- `POST /api/organizations/:id/enterprise/sso` - Configure SSO
- `GET /api/organizations/:id/enterprise/audit-logs` - Export audit logs

## 🐛 Troubleshooting

**Database Connection Error:**
- Check PostgreSQL is running: `pg_isready` or `docker ps`
- Verify DATABASE_URL in backend/.env
- Check database exists: `psql -U voiceagent -d voiceagent`

**Prisma Migration Issues:**
- Reset database: `npx prisma migrate reset` (⚠️ deletes data)
- Create fresh migration: `npx prisma migrate dev --name init`

**Port Already in Use:**
- Backend (3001): Change PORT in backend/.env
- Frontend (3000): Change port in frontend/package.json
- AI Service (3002): Change PORT in ai-service/.env

**Missing Dependencies:**
```bash
# Backend
cd backend && npm install

# Frontend
cd frontend && npm install

# AI Service
cd ai-service && pip install -r requirements.txt
```

## 📚 Documentation

- **Sales Playbook**: `scripts/sales-playbook.md`
- **Production Runbook**: `scripts/production-runbook.md`
- **Scaling Playbook**: `scripts/scaling-playbook.md`
- **Compliance Checklist**: `scripts/compliance-checklist.md`
- **Competitive Analysis**: `scripts/competitive-analysis.md`
- **Product Moat Strategy**: `scripts/product-moat-strategy.md`

## 🎉 You're Ready!

The platform is fully built and ready to run. Start with Docker Compose for the easiest setup, or follow the manual setup for more control.

For production deployment, see the runbooks and deployment checklist.
