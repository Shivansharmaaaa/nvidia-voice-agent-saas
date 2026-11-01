import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CostModule } from '../cost/cost.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [PrismaModule, CostModule, BillingModule],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
