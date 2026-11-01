import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Cost Calculator Service
 * Calculates true cost per call and per minute
 * Tracks GPU time, inference costs, networking, etc.
 */

export interface CostBreakdown {
  asrCost: number;
  llmCost: number;
  ttsCost: number;
  networkingCost: number;
  infrastructureCost: number;
  totalCost: number;
  costPerMinute: number;
}

export interface CostMetrics {
  callMinutes: number;
  asrSeconds: number;
  llmTokens: number;
  ttsSeconds: number;
  networkBytes: number;
}

@Injectable()
export class CostCalculatorService {
  // Cost per unit (in USD)
  private readonly COSTS = {
    // GPU costs (per second of GPU time)
    ASR_GPU_COST_PER_SECOND: 0.0001, // $0.0001/sec = $0.36/hour for GPU
    LLM_GPU_COST_PER_SECOND: 0.0002, // $0.0002/sec = $0.72/hour for LLM GPU
    TTS_GPU_COST_PER_SECOND: 0.00005, // $0.00005/sec = $0.18/hour for TTS GPU

    // Token costs (for cloud APIs)
    LLM_COST_PER_1K_TOKENS: 0.002, // $0.002 per 1k tokens

    // Networking (per GB)
    NETWORK_COST_PER_GB: 0.01, // $0.01 per GB

    // Infrastructure overhead (per minute)
    INFRASTRUCTURE_COST_PER_MINUTE: 0.001, // $0.001 per minute (compute, storage, etc.)
  };

  constructor(private prisma: PrismaService) {}

  /**
   * Calculate cost breakdown for a call
   */
  calculateCallCost(metrics: CostMetrics): CostBreakdown {
    const callMinutes = metrics.callMinutes || 0.01; // Minimum 0.01 minutes

    // ASR cost (GPU time)
    const asrCost = metrics.asrSeconds * this.COSTS.ASR_GPU_COST_PER_SECOND;

    // LLM cost (tokens or GPU time)
    // Use token-based if available, otherwise estimate GPU time
    const llmCost = metrics.llmTokens > 0
      ? (metrics.llmTokens / 1000) * this.COSTS.LLM_COST_PER_1K_TOKENS
      : (metrics.asrSeconds * 0.5) * this.COSTS.LLM_GPU_COST_PER_SECOND; // Estimate LLM time

    // TTS cost (GPU time)
    const ttsCost = metrics.ttsSeconds * this.COSTS.TTS_GPU_COST_PER_SECOND;

    // Networking cost (estimate: ~64kbps audio = ~480KB per minute)
    const networkBytes = metrics.networkBytes || (callMinutes * 480 * 1024);
    const networkingCost = (networkBytes / (1024 * 1024 * 1024)) * this.COSTS.NETWORK_COST_PER_GB;

    // Infrastructure overhead
    const infrastructureCost = callMinutes * this.COSTS.INFRASTRUCTURE_COST_PER_MINUTE;

    const totalCost = asrCost + llmCost + ttsCost + networkingCost + infrastructureCost;
    const costPerMinute = totalCost / callMinutes;

    return {
      asrCost,
      llmCost,
      ttsCost,
      networkingCost,
      infrastructureCost,
      totalCost,
      costPerMinute,
    };
  }

  /**
   * Get cost breakdown for a call session
   */
  async getCallCostBreakdown(callSessionId: string): Promise<CostBreakdown> {
    const session = await this.prisma.callSession.findUnique({
      where: { id: callSessionId },
      include: {
        usageRecord: true,
      },
    });

    if (!session) {
      throw new Error('Call session not found');
    }

    const metrics: CostMetrics = {
      callMinutes: (session.duration || 0) / 60,
      asrSeconds: (session.usageRecord?.asrSeconds as number) || 0,
      llmTokens: session.usageRecord?.llmTokens || 0,
      ttsSeconds: (session.usageRecord?.ttsSeconds as number) || 0,
      networkBytes: 0, // Would need to track this
    };

    return this.calculateCallCost(metrics);
  }

  /**
   * Get cost analysis for organization
   */
  async getOrganizationCostAnalysis(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const usageRecords = await this.prisma.usageRecord.findMany({
      where: {
        organizationId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalMetrics: CostMetrics = usageRecords.reduce(
      (acc, record) => ({
        callMinutes: acc.callMinutes + record.callMinutes,
        asrSeconds: acc.asrSeconds + record.asrSeconds,
        llmTokens: acc.llmTokens + record.llmTokens,
        ttsSeconds: acc.ttsSeconds + record.ttsSeconds,
        networkBytes: acc.networkBytes,
      }),
      {
        callMinutes: 0,
        asrSeconds: 0,
        llmTokens: 0,
        ttsSeconds: 0,
        networkBytes: 0,
      },
    );

    const breakdown = this.calculateCallCost(totalMetrics);

    // Cost drivers analysis
    const costDrivers = [
      { component: 'ASR', cost: breakdown.asrCost, percentage: (breakdown.asrCost / breakdown.totalCost) * 100 },
      { component: 'LLM', cost: breakdown.llmCost, percentage: (breakdown.llmCost / breakdown.totalCost) * 100 },
      { component: 'TTS', cost: breakdown.ttsCost, percentage: (breakdown.ttsCost / breakdown.totalCost) * 100 },
      { component: 'Networking', cost: breakdown.networkingCost, percentage: (breakdown.networkingCost / breakdown.totalCost) * 100 },
      { component: 'Infrastructure', cost: breakdown.infrastructureCost, percentage: (breakdown.infrastructureCost / breakdown.totalCost) * 100 },
    ].sort((a, b) => b.cost - a.cost);

    return {
      period: { startDate, endDate },
      totalCalls: usageRecords.length,
      totalMetrics,
      breakdown,
      costDrivers,
      averageCostPerCall: breakdown.totalCost / (usageRecords.length || 1),
      averageCostPerMinute: breakdown.costPerMinute,
    };
  }

  /**
   * Calculate margin for a call
   */
  calculateMargin(callCost: number, revenue: number): {
    margin: number;
    marginPercentage: number;
    profit: number;
  } {
    const profit = revenue - callCost;
    const marginPercentage = revenue > 0 ? (profit / revenue) * 100 : 0;

    return {
      margin: profit,
      marginPercentage,
      profit,
    };
  }

  /**
   * Get recommended pricing based on costs
   */
  getRecommendedPricing(targetMargin: number = 70): {
    pricePerMinute: number;
    breakEvenPrice: number;
    recommendedPrice: number;
  } {
    // Average cost per minute (from typical usage)
    const avgCostPerMinute = 0.05; // $0.05 per minute average

    const breakEvenPrice = avgCostPerMinute;
    const recommendedPrice = avgCostPerMinute / (1 - targetMargin / 100);

    return {
      pricePerMinute: recommendedPrice,
      breakEvenPrice,
      recommendedPrice,
    };
  }
}
