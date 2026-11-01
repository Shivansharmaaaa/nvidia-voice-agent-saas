import { Module } from '@nestjs/common';
import { CustomerSuccessController } from './customer-success.controller';
import { CustomerSuccessService } from './customer-success.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BillingModule } from '../billing/billing.module';
import { CostModule } from '../cost/cost.module';

@Module({
  imports: [PrismaModule, BillingModule, CostModule],
  controllers: [CustomerSuccessController],
  providers: [CustomerSuccessService],
})
export class CustomerSuccessModule {}
