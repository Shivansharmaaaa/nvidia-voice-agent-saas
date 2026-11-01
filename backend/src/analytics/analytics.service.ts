import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getOrganizationAnalytics(userId: string, organizationId: string, dateRange?: {
    start: Date;
    end: Date;
  }) {
    await this.ensureAccess(userId, organizationId);

    const where: any = { organizationId };
    if (dateRange) {
      where.date = {
        gte: dateRange.start,
        lte: dateRange.end,
      };
    }

    const analytics = await this.prisma.analytics.findMany({
      where,
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    // Aggregate metrics
    const aggregated = analytics.reduce(
      (acc, curr) => {
        acc.totalCalls += curr.totalCalls;
        acc.totalDuration += curr.totalDuration;
        acc.totalEscalations += (curr.escalationRate || 0) * curr.totalCalls;
        return acc;
      },
      { totalCalls: 0, totalDuration: 0, totalEscalations: 0 },
    );

    return {
      analytics,
      aggregated: {
        ...aggregated,
        avgDuration: aggregated.totalCalls > 0 ? aggregated.totalDuration / aggregated.totalCalls : 0,
        escalationRate: aggregated.totalCalls > 0 ? aggregated.totalEscalations / aggregated.totalCalls : 0,
      },
    };
  }

  async getAgentAnalytics(userId: string, organizationId: string, agentId: string) {
    await this.ensureAccess(userId, organizationId);

    return this.prisma.analytics.findMany({
      where: {
        organizationId,
        agentId,
      },
      orderBy: { date: 'desc' },
      take: 30, // Last 30 days
    });
  }

  private async ensureAccess(userId: string, organizationId: string) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('No access to this organization');
    }
  }
}
