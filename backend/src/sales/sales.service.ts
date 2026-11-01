import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CostCalculatorService } from '../cost/cost-calculator.service';

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private costCalculator: CostCalculatorService,
  ) {}

  /**
   * Calculate ROI vs human agents
   */
  async calculateROI(organizationId: string, periodDays: number = 30) {
    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    // Get usage data
    const usageRecords = await this.prisma.usageRecord.findMany({
      where: {
        organizationId,
        date: { gte: startDate, lte: endDate },
      },
    });

    const totalCallMinutes = usageRecords.reduce((sum, r) => sum + r.callMinutes, 0);
    const totalCost = usageRecords.reduce((sum, r) => sum + r.cost, 0);

    // Human agent costs (assumptions)
    const HUMAN_AGENT_COST_PER_HOUR = 25; // $25/hour average
    const HUMAN_AGENT_COST_PER_MINUTE = HUMAN_AGENT_COST_PER_HOUR / 60;
    const humanAgentCost = totalCallMinutes * HUMAN_AGENT_COST_PER_MINUTE;

    // Savings
    const savings = humanAgentCost - totalCost;
    const savingsPercentage = humanAgentCost > 0 ? (savings / humanAgentCost) * 100 : 0;

    // Efficiency metrics
    const callsHandled = usageRecords.length;
    const avgCallDuration = totalCallMinutes / (callsHandled || 1);

    return {
      period: { startDate, endDate, days: periodDays },
      aiAgent: {
        totalCalls: callsHandled,
        totalMinutes: totalCallMinutes,
        totalCost,
        costPerMinute: totalCost / (totalCallMinutes || 1),
        costPerCall: totalCost / (callsHandled || 1),
      },
      humanAgent: {
        estimatedCost: humanAgentCost,
        costPerMinute: HUMAN_AGENT_COST_PER_MINUTE,
        costPerCall: HUMAN_AGENT_COST_PER_MINUTE * avgCallDuration,
      },
      savings: {
        total: savings,
        percentage: savingsPercentage,
        perCall: savings / (callsHandled || 1),
        perMinute: savings / (totalCallMinutes || 1),
      },
      efficiency: {
        callsPerDollar: callsHandled / (totalCost || 1),
        minutesPerDollar: totalCallMinutes / (totalCost || 1),
      },
    };
  }

  /**
   * Get conversion metrics
   */
  async getConversionMetrics(organizationId: string, periodDays: number = 30) {
    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    const [calls, completedCalls, escalatedCalls] = await Promise.all([
      this.prisma.callSession.count({
        where: {
          organizationId,
          startTime: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.callSession.count({
        where: {
          organizationId,
          status: 'completed',
          startTime: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.callSession.count({
        where: {
          organizationId,
          escalations: { gt: 0 },
          startTime: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    return {
      period: { startDate, endDate, days: periodDays },
      totalCalls: calls,
      completedCalls,
      escalatedCalls,
      completionRate: calls > 0 ? (completedCalls / calls) * 100 : 0,
      escalationRate: calls > 0 ? (escalatedCalls / calls) * 100 : 0,
      resolutionRate: calls > 0 ? ((completedCalls - escalatedCalls) / calls) * 100 : 0,
    };
  }

  /**
   * Generate sales report
   */
  async generateSalesReport(organizationId: string, format: 'json' | 'csv' = 'json') {
    const roi = await this.calculateROI(organizationId);
    const conversions = await this.getConversionMetrics(organizationId);
    const costAnalysis = await this.costCalculator.getOrganizationCostAnalysis(
      organizationId,
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      new Date(),
    );

    if (format === 'csv') {
      return this.formatAsCSV(roi, conversions, costAnalysis);
    }

    return {
      generatedAt: new Date().toISOString(),
      organizationId,
      roi,
      conversions,
      costAnalysis,
    };
  }

  private formatAsCSV(roi: any, conversions: any, costAnalysis: any): string {
    const lines = [
      'Sales Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      'ROI Analysis',
      `Total Savings,${roi.savings.total.toFixed(2)}`,
      `Savings Percentage,${roi.savings.percentage.toFixed(2)}%`,
      `AI Cost Per Minute,$${roi.aiAgent.costPerMinute.toFixed(4)}`,
      `Human Cost Per Minute,$${roi.humanAgent.costPerMinute.toFixed(2)}`,
      '',
      'Conversion Metrics',
      `Total Calls,${conversions.totalCalls}`,
      `Completion Rate,${conversions.completionRate.toFixed(2)}%`,
      `Resolution Rate,${conversions.resolutionRate.toFixed(2)}%`,
      '',
      'Cost Breakdown',
      `ASR Cost,$${costAnalysis.breakdown.asrCost.toFixed(4)}`,
      `LLM Cost,$${costAnalysis.breakdown.llmCost.toFixed(4)}`,
      `TTS Cost,$${costAnalysis.breakdown.ttsCost.toFixed(4)}`,
    ];

    return lines.join('\n');
  }
}
