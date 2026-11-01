import { Module } from '@nestjs/common';
import { CostCalculatorService } from './cost-calculator.service';
import { CostController } from './cost.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CostController],
  providers: [CostCalculatorService],
  exports: [CostCalculatorService],
})
export class CostModule {}
