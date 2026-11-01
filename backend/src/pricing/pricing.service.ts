import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CostCalculatorService } from '../cost/cost-calculator.service';

/**
 * Pricing Service
 * Manages pricing tiers, overages, and unit economics
 */

@Injectable()
export class PricingService {
  // Target gross margins per tier
  private readonly TARGET_MARGINS = {
    starter: 0.65, // 65% margin
    growth: 0.70, // 70% margin
    enterprise: 0.75, // 75% margin
  };

  // Average cost per minute (from cost calculator)
  private readonly AVG_COST_PER_MINUTE = 0.05;

  constructor(
    private prisma: PrismaService,
    private costCalculator: CostCalculatorService,
  ) {}

  /**
   * Calculate overage charges
   */
  async calculateOverage(
    organizationId: string,
    periodStart: Date,
    periodEnd: Date,
  ) {
    const subscription = await this.prisma.billingSubscription.findUnique({
      where: { organizationId },
      include: { plan: true },
    });

    if (!subscription) {
      return { overageMinutes: 0, overageCost: 0 };
    }

    const usageRecords = await this.prisma.usageRecord.findMany({
      where: {
        organizationId,
        date: { gte: periodStart, lte: periodEnd },
      },
    });

    const totalMinutes = usageRecords.reduce(
      (sum, r) => sum + r.callMinutes,
      0,
    );

    const includedMinutes =
      (subscription.plan.features as any)?.includedMinutes || 0;

    if (includedMinutes === null || totalMinutes <= includedMinutes) {
      return { overageMinutes: 0, overageCost: 0 };
    }

    const overageMinutes = totalMinutes - includedMinutes;
    const overagePerMinute =
      (subscription.plan.features as any)?.overagePerMinute || 0.15;
    const overageCost = overageMinutes * overagePerMinute;

    return {
      overageMinutes,
      overageCost,
      totalMinutes,
      includedMinutes,
    };
  }

  /**
   * Get pricing recommendation based on usage
   */
  async getPricingRecommendation(organizationId: string) {
    const usageRecords = await this.prisma.usageRecord.findMany({
      where: {
        organizationId,
        date: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    const totalMinutes = usageRecords.reduce(
      (sum, r) => sum + r.callMinutes,
      0,
    );
    const agentCount = await this.prisma.agent.count({
      where: { organizationId },
    });

    const plans = await this.prisma.billingPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });

    const recommendations = plans.map((plan) => {
      const includedMinutes = (plan.features as any)?.includedMinutes || 0;
      const maxAgents = (plan.features as any)?.maxAgents || 0;
      const overagePerMinute =
        (plan.features as any)?.overagePerMinute || 0.15;

      let monthlyCost = plan.price;
      if (includedMinutes && totalMinutes > includedMinutes) {
        monthlyCost += (totalMinutes - includedMinutes) * overagePerMinute;
      }

      const fitsAgents = !maxAgents || agentCount <= maxAgents;
      const fitsMinutes = !includedMinutes || totalMinutes <= includedMinutes * 1.2; // 20% buffer

      return {
        plan: {
          id: plan.id,
          name: plan.name,
          displayName: plan.displayName,
          price: plan.price,
        },
        estimatedMonthlyCost: monthlyCost,
        fitsAgents,
        fitsMinutes,
        savings: 0, // Would calculate vs current plan
      };
    });

    // Find best fit
    const bestFit = recommendations.find(
      (r) => r.fitsAgents && r.fitsMinutes,
    ) || recommendations[recommendations.length - 1];

    return {
      currentUsage: {
        monthlyMinutes: totalMinutes,
        agentCount,
      },
      recommendations,
      recommended: bestFit,
    };
  }

  /**
   * Calculate unit economics for a plan
   */
  calculateUnitEconomics(planName: string) {
    const plan = this.getPlanDefaults(planName);
    const margin = this.TARGET_MARGINS[planName] || 0.70;

    // Revenue per customer
    const baseRevenue = plan.price;
    const avgOverage = plan.avgOverageMinutes * plan.overagePerMinute;
    const totalRevenue = baseRevenue + avgOverage;

    // Cost per customer (based on included + avg overage)
    const totalMinutes = plan.includedMinutes + plan.avgOverageMinutes;
    const totalCost = totalMinutes * this.AVG_COST_PER_MINUTE;

    // Gross margin
    const grossProfit = totalRevenue - totalCost;
    const actualMargin = totalRevenue > 0 ? grossProfit / totalRevenue : 0;

    return {
      plan: planName,
      revenue: {
        base: baseRevenue,
        overage: avgOverage,
        total: totalRevenue,
      },
      cost: {
        perMinute: this.AVG_COST_PER_MINUTE,
        totalMinutes,
        total: totalCost,
      },
      margin: {
        target: margin,
        actual: actualMargin,
        grossProfit,
      },
      ltv: {
        monthly: grossProfit,
        annual: grossProfit * 12,
        // Assuming 3-year average customer lifetime
        lifetime: grossProfit * 36,
      },
    };
  }

  private getPlanDefaults(planName: string) {
    const defaults = {
      starter: {
        price: 99,
        includedMinutes: 500,
        avgOverageMinutes: 100,
        overagePerMinute: 0.15,
      },
      growth: {
        price: 299,
        includedMinutes: 2000,
        avgOverageMinutes: 500,
        overagePerMinute: 0.12,
      },
      enterprise: {
        price: 2000, // Estimated average
        includedMinutes: 10000,
        avgOverageMinutes: 2000,
        overagePerMinute: 0.10,
      },
    };

    return defaults[planName] || defaults.starter;
  }
}
