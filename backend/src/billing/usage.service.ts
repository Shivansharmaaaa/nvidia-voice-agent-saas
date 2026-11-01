import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsageService {
  constructor(private prisma: PrismaService) {}

  async recordCallUsage(data: {
    organizationId: string;
    subscriptionId: string;
    callSessionId: string;
    agentId: string;
    callMinutes: number;
    asrSeconds: number;
    llmTokens: number;
    ttsSeconds: number;
  }) {
    // Calculate cost (example pricing)
    const cost = this.calculateCost(data);

    // Create usage record
    const usageRecord = await this.prisma.usageRecord.create({
      data: {
        organizationId: data.organizationId,
        subscriptionId: data.subscriptionId,
        callSessionId: data.callSessionId,
        agentId: data.agentId,
        callMinutes: data.callMinutes,
        asrSeconds: data.asrSeconds,
        llmTokens: data.llmTokens,
        ttsSeconds: data.ttsSeconds,
        cost,
      },
    });

    // Update usage limits
    await this.updateUsageLimits(data.organizationId, data.callMinutes);

    return usageRecord;
  }

  async getUsageSummary(organizationId: string, startDate: Date, endDate: Date) {
    const records = await this.prisma.usageRecord.findMany({
      where: {
        organizationId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        isBilled: false,
      },
    });

    const summary = records.reduce(
      (acc, record) => {
        acc.totalCallMinutes += record.callMinutes;
        acc.totalAsrSeconds += record.asrSeconds;
        acc.totalLlmTokens += record.llmTokens;
        acc.totalTtsSeconds += record.ttsSeconds;
        acc.totalCost += record.cost;
        acc.recordCount += 1;
        return acc;
      },
      {
        totalCallMinutes: 0,
        totalAsrSeconds: 0,
        totalLlmTokens: 0,
        totalTtsSeconds: 0,
        totalCost: 0,
        recordCount: 0,
      },
    );

    return summary;
  }

  private calculateCost(data: {
    callMinutes: number;
    asrSeconds: number;
    llmTokens: number;
    ttsSeconds: number;
  }): number {
    // Example pricing model
    const callCostPerMinute = 0.05; // $0.05 per minute
    const asrCostPerSecond = 0.001; // $0.001 per second
    const llmCostPer1kTokens = 0.002; // $0.002 per 1k tokens
    const ttsCostPerSecond = 0.001; // $0.001 per second

    const callCost = data.callMinutes * callCostPerMinute;
    const asrCost = data.asrSeconds * asrCostPerSecond;
    const llmCost = (data.llmTokens / 1000) * llmCostPer1kTokens;
    const ttsCost = data.ttsSeconds * ttsCostPerSecond;

    return callCost + asrCost + llmCost + ttsCost;
  }

  private async updateUsageLimits(organizationId: string, callMinutes: number) {
    await this.prisma.usageLimit.updateMany({
      where: { organizationId },
      data: {
        currentCallMinutes: {
          increment: callMinutes,
        },
      },
    });
  }
}
