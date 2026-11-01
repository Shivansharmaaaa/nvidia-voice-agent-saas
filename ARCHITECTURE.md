# Architecture Documentation

## System Overview

The Voice Agent SaaS Platform is a multi-tenant system that enables companies to create, configure, deploy, and manage custom voice call agents using NVIDIA's open-source voice models.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                   │
│  - Agent Creation Wizard                                    │
│  - Dashboard & Analytics                                    │
│  - Call Logs & Transcripts                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/REST
┌──────────────────────▼──────────────────────────────────────┐
│                   Backend API (NestJS)                      │
│  - Authentication (Clerk/JWT)                                │
│  - Multi-tenant Middleware                                  │
│  - Agent Management                                         │
│  - Call Session Management                                  │
│  - Analytics & Reporting                                     │
└──────┬──────────────────┬──────────────────┬───────────────┘
       │                  │                  │
       │                  │                  │
┌──────▼──────┐  ┌────────▼────────┐  ┌──────▼──────────┐
│ PostgreSQL │  │     Redis       │  │  WebSocket      │
│  (Prisma)  │  │  (Sessions)     │  │  (Real-time)    │
└────────────┘  └─────────────────┘  └─────────────────┘
                                        
┌─────────────────────────────────────────────────────────────┐
│              AI Service (Python + FastAPI)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Nemotron ASR │→ │ Nemotron LLM  │→ │ Magpie TTS    │    │
│  │ (Speech-to-  │  │ (Dialogue)    │  │ (Text-to-     │    │
│  │   Text)      │  │               │  │  Speech)      │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
                       │
                       │ WebSocket
┌──────────────────────▼──────────────────────────────────────┐
│                   Twilio Voice API                          │
│  - Incoming Calls                                            │
│  - Audio Streaming                                           │
│  - Webhooks                                                  │
└─────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Frontend (Next.js)

**Location**: `frontend/`

**Key Features**:
- Multi-tenant organization management
- Agent creation wizard (5-step process)
- Real-time dashboard with analytics
- Call logs and transcript viewer
- Responsive UI with Tailwind CSS

**Tech Stack**:
- Next.js 14 (App Router)
- React Query for data fetching
- Clerk for authentication
- Recharts for analytics visualization

### 2. Backend API (NestJS)

**Location**: `backend/`

**Key Modules**:
- **Auth**: JWT-based authentication with Clerk integration
- **Organizations**: Multi-tenant organization management
- **Agents**: Voice agent configuration and deployment
- **Calls**: Call session and transcript management
- **Analytics**: Metrics and reporting
- **Webhooks**: Twilio webhook handlers
- **WebSocket**: Real-time audio streaming gateway

**Database Schema** (Prisma):
- User, Organization, OrganizationMember
- Agent, PromptTemplate
- CallSession, Transcript
- Analytics, AuditLog, PIIRedaction

### 3. AI Service (Python)

**Location**: `ai-service/`

**Pipeline Flow**:
1. **Audio Input** → Twilio WebSocket → Base64 mu-law PCM
2. **ASR Stage** → Nemotron Speech → Transcribed text
3. **Context Assembly** → Conversation history + agent config
4. **Prompt Injection** → System prompt + user input
5. **RAG (Optional)** → Knowledge base retrieval
6. **LLM Inference** → Nemotron 3 Nano → Response text
7. **Safety Checks** → PII detection, response validation
8. **TTS Stage** → Magpie TTS → Audio output
9. **Audio Output** → Base64 mu-law PCM → Twilio

**Services**:
- `VoicePipeline`: Main orchestration
- `NemotronASRService`: Speech-to-text
- `NemotronLLMService`: Dialogue generation
- `MagpieTTSService`: Text-to-speech
- `AgentProcessor`: Session management

### 4. Real-Time Audio Streaming

**Flow**:
1. Twilio receives call → Webhook to backend
2. Backend creates call session → Routes to AI service via WebSocket
3. Twilio streams audio chunks → Backend → AI service
4. AI service processes audio → Generates response audio
5. Response audio → Backend → Twilio → Caller

**Optimization**:
- Audio buffering (320ms chunks)
- Streaming ASR for low latency
- Parallel processing where possible
- Target: <500ms end-to-end latency

## Data Flow

### Agent Creation Flow

```
User → Frontend Wizard
  → Step 1: Persona (business name, industry)
  → Step 2: Knowledge Base (FAQs, system prompt)
  → Step 3: Voice Settings (language, speed, pitch)
  → Step 4: Dialogue Rules (escalation, timeouts)
  → Step 5: Review & Deploy
    → Backend API: Create agent config
    → Twilio: Purchase phone number
    → Backend: Configure webhooks
    → Agent Status: Active
```

### Call Flow

```
Incoming Call → Twilio
  → Webhook: POST /webhooks/twilio/voice
  → Backend: Create CallSession
  → TwiML: Start WebSocket stream
  → WebSocket: /stream/{callSessionId}
    → AI Service: Initialize pipeline
    → Loop:
      → Receive audio chunk
      → ASR → Text
      → LLM → Response
      → TTS → Audio
      → Send audio back
  → Call End: Update metrics, save transcripts
```

## Security & Compliance

### PII Redaction
- Pattern-based detection (email, phone, SSN, credit card)
- Redacted text stored separately
- Original text encrypted (optional)

### RBAC (Role-Based Access Control)
- Roles: owner, admin, member, viewer
- Organization-level permissions
- Agent-level access control

### Audit Logging
- All actions logged with user, timestamp, IP
- Resource-level tracking
- Compliance-ready format

## Deployment

### Docker Compose (Development)
- Single command: `docker-compose up`
- All services containerized
- Volume mounts for hot reload

### Kubernetes (Production)
- Namespace: `voice-agent`
- Services: Backend (3 replicas), AI Service (2 replicas), Frontend (2 replicas)
- Auto-scaling based on CPU/memory
- Health checks and readiness probes

## Performance Targets

- **ASR Latency**: <200ms
- **LLM Latency**: <300ms
- **TTS Latency**: <100ms
- **End-to-End**: <500ms
- **Concurrent Calls**: 100+ per AI service instance

## Monitoring & Observability

- Health check endpoints
- Metrics collection (latency, duration, escalations)
- Log aggregation (structured logging)
- Error tracking and alerting

## Future Enhancements

- Vector database for RAG (Pinecone, Weaviate)
- Advanced PII detection (AWS Comprehend)
- Multi-language support expansion
- Voice cloning/custom voices
- Real-time agent monitoring dashboard
- A/B testing for agent configurations
