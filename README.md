# Voice Agent SaaS Platform

A multi-tenant SaaS platform for creating, configuring, deploying, and managing custom voice call agents using NVIDIA open-source voice agent models.

## 🏗️ Architecture

- **Frontend**: Next.js 14 + Tailwind CSS + Clerk Auth
- **Backend**: NestJS + PostgreSQL (Prisma) + Redis
- **AI Service**: Python + FastAPI + Pipecat + NVIDIA Models
- **Telephony**: Twilio Voice API
- **Real-time**: WebSockets for audio streaming

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+
- Twilio Account (for telephony)

### Local Development

1. **Clone and install dependencies:**

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install

# Install AI service dependencies
cd ../ai-service && pip install -r requirements.txt
```

2. **Set up environment variables:**

Create `.env` files in each service:

**backend/.env:**
```env
DATABASE_URL=postgresql://voiceagent:voiceagent123@localhost:5432/voiceagent
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:3001
WS_URL=ws://localhost:3002
```

**frontend/.env.local:**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-key
CLERK_SECRET_KEY=your-clerk-secret
```

**ai-service/.env:**
```env
DATABASE_URL=postgresql://voiceagent:voiceagent123@localhost:5432/voiceagent
REDIS_URL=redis://localhost:6379
BACKEND_API_URL=http://localhost:3001/api
NEMOTRON_SPEECH_URL=http://localhost:8001
NEMOTRON_LLM_URL=http://localhost:8002
MAGPIE_TTS_URL=http://localhost:8003
```

3. **Set up database:**

```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

4. **Start services:**

```bash
# Using Docker Compose (recommended)
docker-compose up

# Or manually:
# Terminal 1: Backend
cd backend && npm run start:dev

# Terminal 2: Frontend
cd frontend && npm run dev

# Terminal 3: AI Service
cd ai-service && python main.py
```

5. **Access the application:**

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Docs: http://localhost:3001/api/docs
- AI Service: http://localhost:3002

## 📦 Deployment

### Docker Compose

```bash
docker-compose up -d
```

### Kubernetes

1. **Create secrets:**

```bash
kubectl create secret generic app-secrets \
  --from-literal=database-url=postgresql://... \
  --from-literal=jwt-secret=your-secret \
  -n voice-agent

kubectl create secret generic postgres-secret \
  --from-literal=password=your-password \
  -n voice-agent
```

2. **Deploy:**

```bash
kubectl apply -f k8s/
```

## 🎯 Features

### Multi-Tenant Architecture
- Organizations and users with role-based access
- Isolated agent configurations per organization
- Usage tracking and billing per tenant

### Agent Creation Wizard
1. **Persona**: Business name, industry, personality
2. **Knowledge Base**: FAQs, scripts, system prompts
3. **Voice Settings**: Language, speed, pitch
4. **Dialogue Rules**: Escalation, timeouts, human takeover
5. **Review & Deploy**: Assign phone number and activate

### Real-Time Voice Pipeline
- **ASR**: NVIDIA Nemotron Speech for streaming transcription
- **LLM**: NVIDIA Nemotron 3 Nano for dialogue generation
- **TTS**: NVIDIA Magpie for natural voice synthesis
- **Optimized**: <500ms end-to-end latency target

### Dashboard & Analytics
- Call logs with transcripts
- Real-time metrics (latency, duration, escalations)
- Usage analytics and trends
- Agent health monitoring

### Security & Compliance
- PII redaction in transcripts
- Role-based access control (RBAC)
- Audit logging
- GDPR/CCPA compliance ready

## 📚 API Documentation

API documentation is available at `/api/docs` when the backend is running.

### Key Endpoints

- `POST /api/organizations` - Create organization
- `GET /api/organizations/:id/agents` - List agents
- `POST /api/organizations/:id/agents` - Create agent
- `POST /api/organizations/:id/agents/:agentId/deploy` - Deploy agent
- `GET /api/organizations/:id/calls` - List calls
- `GET /api/organizations/:id/analytics` - Get analytics

## 🔧 Configuration

### NVIDIA Models Setup

The platform supports both cloud APIs and self-hosted models:

1. **Cloud APIs**: Set `NVIDIA_API_KEY` in environment
2. **Self-hosted**: Configure model URLs in `.env`

For local development, the services include mock implementations.

### Twilio Configuration

1. Create a Twilio account
2. Get Account SID and Auth Token
3. Configure webhooks in Twilio console to point to your backend

## 🧪 Testing

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

## 📝 License

MIT License

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a PR.

## 📧 Support

For questions or support, please open an issue on GitHub.
