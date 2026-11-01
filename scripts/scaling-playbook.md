# Scaling Playbook

## Horizontal Scaling Policies

### Backend API Scaling

**Triggers:**
- CPU utilization > 70% for 2 minutes
- Memory utilization > 80%
- Request latency (p95) > 500ms
- Error rate > 1%

**Scaling Actions:**
```bash
# Auto-scaling (via HPA)
kubectl autoscale deployment backend --min=3 --max=10 --cpu-percent=70 -n voice-agent

# Manual scaling
kubectl scale deployment backend --replicas=5 -n voice-agent
```

**Expected Capacity:**
- 1 replica: ~100 req/s
- 3 replicas: ~300 req/s
- 5 replicas: ~500 req/s

### AI Service Scaling

**Triggers:**
- GPU utilization > 85%
- Queue depth > 10 calls
- Call wait time > 5 seconds
- Error rate > 5%

**Scaling Actions:**
```bash
# Scale AI service (each pod = 1 GPU)
kubectl scale deployment ai-service --replicas=3 -n voice-agent

# Check GPU allocation
kubectl describe node | grep nvidia.com/gpu
```

**GPU Requirements:**
- 1 GPU per AI service pod
- Each GPU handles ~10 concurrent calls
- Scale based on peak concurrent calls

### Database Scaling

**Triggers:**
- Connection pool exhaustion
- Query latency > 100ms (p95)
- CPU > 80%
- Replication lag > 1 second

**Scaling Actions:**
```bash
# Vertical scaling (increase resources)
kubectl patch deployment postgres -n voice-agent -p '{"spec":{"template":{"spec":{"containers":[{"name":"postgres","resources":{"limits":{"cpu":"2","memory":"4Gi"}}}]}}}}'

# Read replica (for read-heavy workloads)
# Add read replica in database config
```

## Vertical Scaling

### When to Scale Vertically

- Single-threaded bottlenecks
- Memory-intensive workloads
- GPU memory constraints

### Resource Limits

**Backend:**
- CPU: 1-2 cores per pod
- Memory: 1-2 Gi per pod

**AI Service:**
- CPU: 2-4 cores per pod
- Memory: 4-8 Gi per pod
- GPU: 1 per pod (required)

**Database:**
- CPU: 2-4 cores
- Memory: 4-16 Gi
- Storage: 100 Gi - 1 Ti (SSD)

## Multi-Region Preparation

### Region-Aware Routing

1. **Latency-Based Routing:**
   - Route calls to nearest AI service region
   - Use DNS-based routing (Route53, Cloudflare)
   - Measure latency to each region

2. **Data Residency:**
   - Store call data in customer's region
   - Replicate critical data globally
   - Comply with GDPR/regional requirements

3. **Failover Strategy:**
   - Primary region: US-East
   - Secondary region: EU-West
   - Automatic failover on region outage

### Multi-Region Setup

```yaml
# Example: AI Service in multiple regions
apiVersion: v1
kind: Service
metadata:
  name: ai-service-global
spec:
  type: ExternalName
  externalName: ai-service.us-east.example.com
  # Use DNS to route to nearest region
```

## Cost Optimization at Scale

### GPU Pooling Strategy

1. **Shared GPU Pools:**
   - Multiple AI service pods share GPU cluster
   - Queue-based call assignment
   - Priority routing for enterprise

2. **Idle GPU Downscaling:**
   - Scale down during low-traffic hours
   - Use spot instances for non-critical workloads
   - Auto-scale based on queue depth

3. **Model Optimization:**
   - Use smaller models for simple queries
   - Cache common responses
   - Batch processing when possible

### Cost Monitoring

```sql
-- Daily cost per organization
SELECT 
  "organizationId",
  SUM("cost") as daily_cost,
  COUNT(*) as calls
FROM "UsageRecord"
WHERE "date" = CURRENT_DATE
GROUP BY "organizationId"
ORDER BY daily_cost DESC;
```

## Performance Targets

### Latency Targets

- ASR: < 200ms (p95)
- LLM: < 300ms (p95)
- TTS: < 100ms (p95)
- End-to-end: < 500ms (p95)

### Throughput Targets

- Calls per minute: 100+ per GPU
- Concurrent calls: 10 per GPU
- API requests: 500+ req/s per backend pod

## Capacity Planning

### Growth Projections

**Month 1-3:**
- 1,000 calls/day
- 2 backend pods
- 1 AI service pod (1 GPU)

**Month 4-6:**
- 10,000 calls/day
- 5 backend pods
- 3 AI service pods (3 GPUs)

**Month 7-12:**
- 50,000 calls/day
- 10 backend pods
- 10 AI service pods (10 GPUs)

### Scaling Checklist

- [ ] Monitor key metrics daily
- [ ] Set up alerts for scaling triggers
- [ ] Test scaling procedures monthly
- [ ] Review capacity quarterly
- [ ] Plan for 2x growth headroom
