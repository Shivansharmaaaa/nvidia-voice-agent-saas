import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Record call metrics
   */
  async recordCallMetrics(data: {
    organizationId: string;
    agentId: string;
    callSessionId: string;
    duration: number;
    latency: any;
    interruptions: number;
    escalations: number;
  }) {
    // Update analytics
    await this.prisma.analytics.upsert({
      where: { callSessionId: data.callSessionId },
      create: {
        organizationId: data.organizationId,
        agentId: data.agentId,
        callSessionId: data.callSessionId,
        totalCalls: 1,
        totalDuration: data.duration,
        avgLatency: data.latency?.avg_asr_latency_ms || null,
        avgDuration: data.duration,
        escalationRate: data.escalations > 0 ? 1.0 : 0.0,
      },
      update: {
        totalCalls: { increment: 1 },
        totalDuration: { increment: data.duration },
        avgLatency: data.latency?.avg_asr_latency_ms || undefined,
        escalationRate: data.escalations > 0 ? 1.0 : 0.0,
      },
    });

    this.logger.log({
      type: 'call_metrics',
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get system health metrics
   */
  async getSystemHealth() {
    const [totalCalls, activeAgents, recentErrors] = await Promise.all([
      this.prisma.callSession.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
      this.prisma.agent.count({
        where: { status: 'active' },
      }),
      this.prisma.callSession.count({
        where: {
          status: 'failed',
          createdAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
          },
        },
      }),
    ]);

    return {
      totalCalls24h: totalCalls,
      activeAgents,
      recentErrors,
      errorRate: totalCalls > 0 ? recentErrors / totalCalls : 0,
      timestamp: new Date().toISOString(),
    };
  }
}
