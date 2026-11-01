import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CostCalculatorService } from '../cost/cost-calculator.service';

export interface HealthScore {
  overall: number; // 0-100
  usage: number;
  engagement: number;
  support: number;
  technical: number;
  risks: string[];
  recommendations: string[];
}

@Injectable()
export class CustomerSuccessService {
  constructor(
    private prisma: PrismaService,
    private costCalculator: CostCalculatorService,
  ) {}

  /**
   * Calculate customer health score
   */
  async calculateHealthScore(organizationId: string): Promise<HealthScore> {
    const [org, agents, calls, usage, supportTickets] = await Promise.all([
      this.prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          subscription: { include: { plan: true } },
        },
      }),
      this.prisma.agent.findMany({ where: { organizationId } }),
      this.prisma.callSession.findMany({
        where: {
          organizationId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.usageRecord.findMany({
        where: {
          organizationId,
          date: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.auditLog.findMany({
        where: {
          organizationId,
          action: 'support_ticket',
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    // Usage score (0-25 points)
    const totalMinutes = usage.reduce((sum, r) => sum + r.callMinutes, 0);
    const includedMinutes =
      (org?.subscription?.plan?.features as any)?.includedMinutes || 0;
    const usagePercentage = includedMinutes > 0 ? (totalMinutes / includedMinutes) * 100 : 0;
    const usageScore = Math.min(25, (usagePercentage / 100) * 25);

    // Engagement score (0-25 points)
    const activeAgents = agents.filter((a) => a.status === 'active').length;
    const totalCalls = calls.length;
    const engagementScore = Math.min(25, (activeAgents * 5) + Math.min(15, totalCalls / 10));

    // Support score (0-25 points)
    const supportScore = Math.max(0, 25 - supportTickets.length * 5);

    // Technical score (0-25 points)
    const completedCalls = calls.filter((c) => c.status === 'completed').length;
    const completionRate = calls.length > 0 ? (completedCalls / calls.length) * 100 : 0;
    const avgEscalations = calls.reduce((sum, c) => sum + c.escalations, 0) / (calls.length || 1);
    const technicalScore = Math.min(25, (completionRate / 100) * 15 + (10 - avgEscalations * 2));

    const overall = usageScore + engagementScore + supportScore + technicalScore;

    // Identify risks
    const risks: string[] = [];
    if (usagePercentage < 20) {
      risks.push('Low usage - customer may not be seeing value');
    }
    if (activeAgents === 0) {
      risks.push('No active agents - account may be dormant');
    }
    if (supportTickets.length > 3) {
      risks.push('High support ticket volume - potential issues');
    }
    if (completionRate < 70) {
      risks.push('Low call completion rate - technical issues');
    }
    if (avgEscalations > 5) {
      risks.push('High escalation rate - agent configuration may need tuning');
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (usagePercentage < 50) {
      recommendations.push('Increase usage to maximize ROI - consider expanding use cases');
    }
    if (activeAgents < 2) {
      recommendations.push('Create additional agents for different use cases');
    }
    if (completionRate < 80) {
      recommendations.push('Review agent configuration to improve completion rates');
    }
    if (avgEscalations > 3) {
      recommendations.push('Optimize agent prompts and knowledge base to reduce escalations');
    }

    return {
      overall: Math.round(overall),
      usage: Math.round(usageScore),
      engagement: Math.round(engagementScore),
      support: Math.round(supportScore),
      technical: Math.round(technicalScore),
      risks,
      recommendations,
    };
  }

  /**
   * Get onboarding checklist
   */
  async getOnboardingChecklist(organizationId: string) {
    const [org, agents, calls, subscription] = await Promise.all([
      this.prisma.organization.findUnique({ where: { id: organizationId } }),
      this.prisma.agent.findMany({ where: { organizationId } }),
      this.prisma.callSession.count({ where: { organizationId } }),
      this.prisma.billingSubscription.findUnique({
        where: { organizationId },
      }),
    ]);

    return {
      steps: [
        {
          id: 'account_setup',
          completed: !!org,
          title: 'Account Setup',
          description: 'Create organization and configure settings',
        },
        {
          id: 'create_agent',
          completed: agents.length > 0,
          title: 'Create First Agent',
          description: 'Set up your first voice agent',
        },
        {
          id: 'configure_agent',
          completed: agents.some((a) => a.status !== 'draft'),
          title: 'Configure Agent',
          description: 'Customize agent settings and knowledge base',
        },
        {
          id: 'test_call',
          completed: calls > 0,
          title: 'Test Call',
          description: 'Make a test call to verify agent works',
        },
        {
          id: 'billing_setup',
          completed: !!subscription,
          title: 'Billing Setup',
          description: 'Configure payment method',
        },
        {
          id: 'integrations',
          completed: false, // Would check actual integrations
          title: 'Set Up Integrations',
          description: 'Connect to your existing tools',
        },
      ],
      progress: {
        completed: 0,
        total: 6,
        percentage: 0,
      },
    };
  }

  /**
   * Get 30-60-90 day success plan
   */
  getSuccessPlan(organizationId: string) {
    return {
      '30-days': {
        goals: [
          'Complete onboarding checklist',
          'Make first 10 successful calls',
          'Achieve 80%+ call completion rate',
          'Set up basic analytics',
        ],
        metrics: {
          targetCalls: 10,
          targetCompletionRate: 0.8,
          targetAgents: 1,
        },
      },
      '60-days': {
        goals: [
          'Scale to 100+ calls per week',
          'Optimize agent based on call data',
          'Reduce escalation rate below 5%',
          'Set up integrations',
        ],
        metrics: {
          targetCalls: 400,
          targetCompletionRate: 0.85,
          targetEscalationRate: 0.05,
        },
      },
      '90-days': {
        goals: [
          'Achieve 1000+ calls per month',
          'Expand to multiple agents/use cases',
          'Demonstrate clear ROI',
          'Consider plan upgrade',
        ],
        metrics: {
          targetCalls: 1000,
          targetCompletionRate: 0.9,
          targetROI: 0.6, // 60% cost savings
        },
      },
    };
  }

  /**
   * Identify churn risk
   */
  async identifyChurnRisk(organizationId: string) {
    const healthScore = await this.calculateHealthScore(organizationId);
    const [recentCalls, subscription] = await Promise.all([
      this.prisma.callSession.count({
        where: {
          organizationId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.billingSubscription.findUnique({
        where: { organizationId },
      }),
    ]);

    const riskFactors: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    if (healthScore.overall < 40) {
      riskLevel = 'high';
      riskFactors.push('Low health score (<40)');
    } else if (healthScore.overall < 60) {
      riskLevel = 'medium';
      riskFactors.push('Moderate health score (<60)');
    }

    if (recentCalls === 0) {
      riskLevel = riskLevel === 'low' ? 'medium' : 'high';
      riskFactors.push('No calls in last 7 days');
    }

    if (subscription?.cancelAtPeriodEnd) {
      riskLevel = 'high';
      riskFactors.push('Subscription set to cancel');
    }

    if (healthScore.risks.length > 3) {
      riskLevel = riskLevel === 'low' ? 'medium' : 'high';
      riskFactors.push('Multiple health risks identified');
    }

    return {
      riskLevel,
      riskFactors,
      healthScore: healthScore.overall,
      recommendations: healthScore.recommendations,
      nextActions: this.getNextActions(riskLevel),
    };
  }

  private getNextActions(riskLevel: string): string[] {
    if (riskLevel === 'high') {
      return [
        'Schedule immediate check-in call',
        'Review account usage and identify blockers',
        'Offer personalized onboarding assistance',
        'Consider discount or trial extension',
      ];
    } else if (riskLevel === 'medium') {
      return [
        'Send proactive check-in email',
        'Share best practices and use cases',
        'Offer optimization consultation',
      ];
    } else {
      return [
        'Continue regular check-ins',
        'Share advanced features and tips',
        'Discuss expansion opportunities',
      ];
    }
  }
}
