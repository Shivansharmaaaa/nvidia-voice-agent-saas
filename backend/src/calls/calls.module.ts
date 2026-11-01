import { Module } from '@nestjs/common';
import { CallsController } from './calls.controller';
import { CallsService } from './calls.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PIIRedactionService } from '../security/pii-redaction.service';
import { BillingModule } from '../billing/billing.module';
import { ObservabilityModule } from '../observability/observability.module';

@Module({
  imports: [PrismaModule, BillingModule, ObservabilityModule],
  controllers: [CallsController],
  providers: [CallsService, PIIRedactionService],
  exports: [CallsService],
})
export class CallsModule {}
