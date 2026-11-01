import { Module } from '@nestjs/common';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CostModule } from '../cost/cost.module';

@Module({
  imports: [PrismaModule, CostModule],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
