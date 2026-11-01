# Production Runbook

## Incident Response Playbooks

### GPU Exhaustion

**Symptoms:**
- High latency on ASR/LLM/TTS calls
- 503 errors from AI service
- Queue buildup in call processing

**Immediate Actions:**
1. Check GPU utilization: `kubectl top nodes` or monitoring dashboard
2. Scale AI service: `kubectl scale deployment ai-service --replicas=5`
3. Enable queue mode: Set `ENABLE_QUEUE_MODE=true` in AI service
4. Route new calls to queue: Calls wait instead of failing

**Long-term:**
- Review GPU allocation per pod
- Consider GPU autoscaling
- Implement call prioritization (enterprise first)

### Twilio Outage

**Symptoms:**
- No incoming calls
- Webhook timeouts
- Call status updates failing

**Immediate Actions:**
1. Check Twilio status: https://status.twilio.com
2. Enable fallback provider (if configured)
3. Queue incoming webhooks: Store in Redis for retry
4. Notify customers: Update status page

**Recovery:**
1. Monitor Twilio status page
2. When restored, process queued webhooks
3. Verify call routing working

### Model Failure

**Symptoms:**
- Circuit breakers opening
- High error rates in LLM/ASR/TTS
- Fallback responses being used

**Immediate Actions:**
1. Check model service health: `/health` endpoints
2. Verify model versions: Check model registry
3. Rollback to previous version: Use model manager rollback
4. Enable graceful degradation: Already active

**Recovery:**
1. Investigate model logs
2. Test new version in staging
3. Deploy fix or rollback

### Database Connection Issues

**Symptoms:**
- API timeouts
- Prisma connection errors
- High database connection count

**Immediate Actions:**
1. Check PostgreSQL health: `kubectl get pods -n voice-agent | grep postgres`
2. Check connection pool: Review connection pool settings
3. Restart backend pods: `kubectl rollout restart deployment backend`
4. Scale database if needed: Increase connection limit

## Scaling Thresholds

### Auto-scaling Triggers

**Backend API:**
- CPU > 70% for 2 minutes → Scale up
- CPU < 30% for 5 minutes → Scale down
- Memory > 80% → Scale up

**AI Service:**
- Queue depth > 10 → Scale up
- GPU utilization > 85% → Scale up
- Error rate > 5% → Scale up (may indicate overload)

**Frontend:**
- CPU > 60% for 2 minutes → Scale up
- Request latency > 500ms → Scale up

### Manual Scaling Commands

```bash
# Scale backend
kubectl scale deployment backend --replicas=5 -n voice-agent

# Scale AI service
kubectl scale deployment ai-service --replicas=3 -n voice-agent

# Scale frontend
kubectl scale deployment frontend --replicas=3 -n voice-agent
```

## Health Checks

### Service Health Endpoints

- Backend: `GET /api/health`
- AI Service: `GET /health`
- Frontend: `GET /health` (if implemented)

### Monitoring Queries

```sql
-- Check recent call failures
SELECT COUNT(*) FROM "CallSession" 
WHERE status = 'failed' 
AND "createdAt" > NOW() - INTERVAL '1 hour';

-- Check usage limits approaching
SELECT "organizationId", "currentCallMinutes", "hardCallMinutes"
FROM "UsageLimit"
WHERE "currentCallMinutes" > "hardCallMinutes" * 0.9;

-- Check billing issues
SELECT COUNT(*) FROM "BillingSubscription"
WHERE status = 'past_due';
```

## Rollback Procedures

### Application Rollback

```bash
# Rollback backend
kubectl rollout undo deployment/backend -n voice-agent

# Rollback AI service
kubectl rollout undo deployment/ai-service -n voice-agent

# Rollback frontend
kubectl rollout undo deployment/frontend -n voice-agent
```

### Database Migration Rollback

```bash
cd backend
npx prisma migrate resolve --rolled-back <migration_name>
npx prisma migrate deploy
```

### Model Version Rollback

```python
# Via API or Python script
from services.model_manager import ModelManager
manager = ModelManager()
manager.rollback("nemotron-3-nano", "v1.0.0")
```

## Emergency Contacts

- On-call Engineer: [Phone/Email]
- CTO: [Phone/Email]
- Twilio Support: [Support Ticket URL]
- Cloud Provider Support: [Ticket URL]

## Post-Incident

1. Document incident in incident log
2. Root cause analysis
3. Update runbook with lessons learned
4. Schedule post-mortem if severity > P2
