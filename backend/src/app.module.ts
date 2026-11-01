import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { AgentsModule } from './agents/agents.module';
import { CallsModule } from './calls/calls.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { WebSocketModule } from './websocket/websocket.module';
import { BillingModule } from './billing/billing.module';
import { ObservabilityModule } from './observability/observability.module';
import { CostModule } from './cost/cost.module';
import { DemoModule } from './demo/demo.module';
import { SalesModule } from './sales/sales.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { EnterpriseModule } from './enterprise/enterprise.module';
import { CustomerSuccessModule } from './customer-success/customer-success.module';
import { PricingModule } from './pricing/pricing.module';
import { BenchmarkingService } from './benchmarking/benchmarking.service';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    AuthModule,
    OrganizationsModule,
    AgentsModule,
    CallsModule,
    AnalyticsModule,
    WebhooksModule,
    WebSocketModule,
    BillingModule,
    ObservabilityModule,
    CostModule,
    DemoModule,
    SalesModule,
    OnboardingModule,
    EnterpriseModule,
    CustomerSuccessModule,
    PricingModule,
  ],
  controllers: [HealthController],
  providers: [BenchmarkingService],
  exports: [BenchmarkingService],
})
export class AppModule {}
