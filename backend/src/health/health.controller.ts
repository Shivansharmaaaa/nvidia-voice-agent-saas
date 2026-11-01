import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from '../observability/metrics.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private metrics: MetricsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check' })
  async health() {
    try {
      // Check database connection
      await this.prisma.$queryRaw`SELECT 1`;

      // Get system metrics
      const systemHealth = await this.metrics.getSystemHealth();

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'connected',
        },
        metrics: systemHealth,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }
}
