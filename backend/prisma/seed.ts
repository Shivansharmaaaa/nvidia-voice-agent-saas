import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create billing plans
  // Starter Plan - $99/month
  const starterPlan = await prisma.billingPlan.upsert({
    where: { name: 'starter' },
    update: {},
    create: {
      name: 'starter',
      displayName: 'Starter',
      description: 'Perfect for small teams getting started',
      price: 99,
      callMinutes: 500,
      agents: 3,
      stripePriceId: process.env.STRIPE_STARTER_PRICE_ID,
      features: {
        includedMinutes: 500,
        overagePerMinute: 0.15,
        maxAgents: 3,
        features: [
          '500 call minutes/month included',
          '3 agents',
          'Basic analytics dashboard',
          'Email support (48h response)',
          'Standard SLA (99.5% uptime)',
          'Basic integrations',
        ],
        supportLevel: 'email',
        slaTier: 'standard',
      },
    },
  });

  // Growth Plan - $299/month
  const growthPlan = await prisma.billingPlan.upsert({
    where: { name: 'growth' },
    update: {},
    create: {
      name: 'growth',
      displayName: 'Growth',
      description: 'For scaling businesses',
      price: 299,
      callMinutes: 2000,
      agents: 10,
      stripePriceId: process.env.STRIPE_GROWTH_PRICE_ID,
      features: {
        includedMinutes: 2000,
        overagePerMinute: 0.12,
        maxAgents: 10,
        features: [
          '2,000 call minutes/month included',
          '10 agents',
          'Advanced analytics & reporting',
          'Priority support (24h response)',
          'Enhanced SLA (99.9% uptime)',
          'API access',
          'Custom integrations',
          'Agent templates library',
          'Export reports (CSV/PDF)',
        ],
        supportLevel: 'priority',
        slaTier: 'enhanced',
      },
    },
  });

  // Enterprise Plan - Custom pricing
  const enterprisePlan = await prisma.billingPlan.upsert({
    where: { name: 'enterprise' },
    update: {},
    create: {
      name: 'enterprise',
      displayName: 'Enterprise',
      description: 'For large organizations with custom needs',
      price: 0, // Custom pricing
      callMinutes: null, // Unlimited
      agents: null, // Unlimited
      stripePriceId: null, // Custom billing
      features: {
        includedMinutes: null, // Unlimited
        overagePerMinute: 0.10, // Volume discount
        maxAgents: null, // Unlimited
        features: [
          'Unlimited call minutes',
          'Unlimited agents',
          'Enterprise analytics & BI',
          '24/7 dedicated support',
          'Premium SLA (99.99% uptime)',
          'SSO (SAML/SCIM)',
          'Dedicated GPU pools',
          'Custom data retention',
          'IP allowlisting',
          'Account-level audit exports',
          'Custom SLAs',
          'Dedicated account manager',
          'On-site training',
          'Custom integrations',
        ],
        supportLevel: 'dedicated',
        slaTier: 'premium',
      },
    },
  });

  // Legacy free plan (for existing users)
  const freePlan = await prisma.billingPlan.upsert({
    where: { name: 'free' },
    update: {},
    create: {
      name: 'free',
      displayName: 'Free Trial',
      description: '14-day free trial',
      price: 0,
      callMinutes: 100,
      agents: 1,
      features: {
        includedMinutes: 100,
        overagePerMinute: 0,
        maxAgents: 1,
        features: [
          '100 call minutes (trial)',
          '1 agent',
          'Basic features',
          'Community support',
        ],
        supportLevel: 'community',
        slaTier: 'best-effort',
      },
    },
  });

  console.log('✅ Billing plans created:', {
    free: freePlan.id,
    starter: starterPlan.id,
    growth: growthPlan.id,
    enterprise: enterprisePlan.id,
  });

  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
