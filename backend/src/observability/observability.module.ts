import { Module, Global } from '@nestjs/common';
import { TracingService } from './tracing.service';
import { MetricsService } from './metrics.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [TracingService, MetricsService],
  exports: [TracingService, MetricsService],
})
export class ObservabilityModule {}
