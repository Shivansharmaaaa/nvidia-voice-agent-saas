#!/bin/bash

# Production Deployment Checklist
# Run this before deploying to production

set -e

echo "🔍 Production Deployment Checklist"
echo "=================================="
echo ""

# Check environment variables
echo "1. Checking environment variables..."
required_vars=(
  "DATABASE_URL"
  "JWT_SECRET"
  "STRIPE_SECRET_KEY"
  "TWILIO_ACCOUNT_SID"
  "TWILIO_AUTH_TOKEN"
)

missing_vars=()
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    missing_vars+=("$var")
  fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
  echo "❌ Missing required environment variables:"
  printf '   - %s\n' "${missing_vars[@]}"
  exit 1
fi
echo "✅ All required environment variables set"
echo ""

# Check database connection
echo "2. Testing database connection..."
if ! psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
  echo "❌ Database connection failed"
  exit 1
fi
echo "✅ Database connection successful"
echo ""

# Check Redis connection
echo "3. Testing Redis connection..."
if ! redis-cli -u "$REDIS_URL" ping > /dev/null 2>&1; then
  echo "❌ Redis connection failed"
  exit 1
fi
echo "✅ Redis connection successful"
echo ""

# Run migrations
echo "4. Running database migrations..."
cd backend
npx prisma migrate deploy
echo "✅ Migrations complete"
echo ""

# Seed billing plans
echo "5. Seeding billing plans..."
npx prisma db seed || echo "⚠️  Seed may have failed (check if plans exist)"
echo ""

# Build services
echo "6. Building services..."
echo "   Building backend..."
npm run build
echo "   ✅ Backend built"
echo ""

# Run tests (if available)
echo "7. Running tests..."
if npm test -- --passWithNoTests 2>/dev/null; then
  echo "✅ Tests passed"
else
  echo "⚠️  Tests skipped or failed (non-blocking)"
fi
echo ""

# Check health endpoints
echo "8. Checking service health..."
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
  echo "✅ Backend health check passed"
else
  echo "⚠️  Backend not running (expected if not started yet)"
fi
echo ""

# Security checks
echo "9. Security checklist:"
echo "   - [ ] JWT_SECRET is strong and unique"
echo "   - [ ] Database credentials are secure"
echo "   - [ ] Stripe keys are production keys"
echo "   - [ ] Twilio credentials are production"
echo "   - [ ] CORS is configured correctly"
echo "   - [ ] Rate limiting is enabled"
echo "   - [ ] PII redaction is enabled"
echo ""

# Performance checks
echo "10. Performance checklist:"
echo "    - [ ] Circuit breakers configured"
echo "    - [ ] Retry logic implemented"
echo "    - [ ] Graceful degradation enabled"
echo "    - [ ] Monitoring and alerting set up"
echo ""

echo "✅ Pre-deployment checks complete!"
echo ""
echo "Next steps:"
echo "1. Review security checklist above"
echo "2. Deploy to staging environment first"
echo "3. Run load tests"
echo "4. Monitor for 24 hours"
echo "5. Deploy to production"
echo ""
