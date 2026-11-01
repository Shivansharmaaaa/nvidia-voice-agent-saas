import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';
import { UsageService } from './usage.service';

@Injectable()
export class BillingService {
  constructor(
    private prisma: PrismaService,
    private stripe: StripeService,
    private usage: UsageService,
  ) {}

  async getSubscription(organizationId: string) {
    const subscription = await this.prisma.billingSubscription.findUnique({
      where: { organizationId },
      include: {
        plan: true,
      },
    });

    if (!subscription) {
      // Create default free plan subscription
      return this.createDefaultSubscription(organizationId);
    }

    return subscription;
  }

  async createDefaultSubscription(organizationId: string) {
    const freePlan = await this.prisma.billingPlan.findUnique({
      where: { name: 'free' },
    });

    if (!freePlan) {
      throw new NotFoundException('Free plan not found');
    }

    const subscription = await this.prisma.billingSubscription.create({
      data: {
        organizationId,
        planId: freePlan.id,
        status: 'active',
      },
      include: {
        plan: true,
      },
    });

    // Create usage limit
    await this.prisma.usageLimit.create({
      data: {
        organizationId,
        planId: freePlan.id,
        hardCallMinutes: 100, // 100 minutes/month for free plan
        hardAgents: 1,
        resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    return subscription;
  }

  async upgradePlan(
    organizationId: string,
    planName: string,
    stripePaymentMethodId?: string,
  ) {
    const plan = await this.prisma.billingPlan.findUnique({
      where: { name: planName },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const currentSubscription = await this.prisma.billingSubscription.findUnique({
      where: { organizationId },
      include: { plan: true },
    });

    if (!currentSubscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Create or update Stripe subscription
    let stripeSubscriptionId = currentSubscription.stripeSubscriptionId;
    let stripeCustomerId = currentSubscription.stripeCustomerId;

    if (!stripeCustomerId) {
      const org = await this.prisma.organization.findUnique({
        where: { id: organizationId },
      });
      stripeCustomerId = await this.stripe.createCustomer(org.name, org.id);
    }

    if (plan.stripePriceId) {
      if (stripeSubscriptionId) {
        // Update existing subscription
        stripeSubscriptionId = await this.stripe.updateSubscription(
          stripeSubscriptionId,
          plan.stripePriceId,
        );
      } else {
        // Create new subscription
        stripeSubscriptionId = await this.stripe.createSubscription(
          stripeCustomerId,
          plan.stripePriceId,
          stripePaymentMethodId,
        );
      }
    }

    // Update subscription in database
    const updated = await this.prisma.billingSubscription.update({
      where: { organizationId },
      data: {
        planId: plan.id,
        stripeCustomerId,
        stripeSubscriptionId,
        status: 'active',
      },
      include: {
        plan: true,
      },
    });

    // Update usage limits
    await this.updateUsageLimits(organizationId, plan.id);

    return updated;
  }

  async cancelSubscription(organizationId: string, cancelAtPeriodEnd: boolean = true) {
    const subscription = await this.prisma.billingSubscription.findUnique({
      where: { organizationId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.stripeSubscriptionId) {
      await this.stripe.cancelSubscription(
        subscription.stripeSubscriptionId,
        cancelAtPeriodEnd,
      );
    }

    return this.prisma.billingSubscription.update({
      where: { organizationId },
      data: {
        cancelAtPeriodEnd,
        status: cancelAtPeriodEnd ? 'active' : 'canceled',
      },
    });
  }

  async checkUsageLimits(organizationId: string) {
    const limit = await this.prisma.usageLimit.findUnique({
      where: { organizationId },
    });

    if (!limit) {
      return { canProceed: true, reason: 'no_limits' };
    }

    // Check if reset needed
    if (new Date() >= limit.resetAt) {
      await this.resetUsageLimits(organizationId);
      return { canProceed: true, reason: 'reset_complete' };
    }

    const warnings: string[] = [];
    const errors: string[] = [];

    // Check soft limits
    if (limit.softCallMinutes && limit.currentCallMinutes >= limit.softCallMinutes) {
      warnings.push('Call minutes soft limit reached');
    }
    if (limit.softAgents && limit.currentAgents >= limit.softAgents) {
      warnings.push('Agent count soft limit reached');
    }

    // Check hard limits
    if (limit.hardCallMinutes && limit.currentCallMinutes >= limit.hardCallMinutes) {
      errors.push('Call minutes hard limit reached');
    }
    if (limit.hardAgents && limit.currentAgents >= limit.hardAgents) {
      errors.push('Agent count hard limit reached');
    }

    return {
      canProceed: errors.length === 0,
      warnings,
      errors,
      limits: limit,
    };
  }

  private async updateUsageLimits(organizationId: string, planId: string) {
    const plan = await this.prisma.billingPlan.findUnique({
      where: { id: planId },
    });

    await this.prisma.usageLimit.upsert({
      where: { organizationId },
      create: {
        organizationId,
        planId,
        hardCallMinutes: plan.callMinutes,
        hardAgents: plan.agents,
        resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      update: {
        planId,
        hardCallMinutes: plan.callMinutes,
        hardAgents: plan.agents,
      },
    });
  }

  private async resetUsageLimits(organizationId: string) {
    const limit = await this.prisma.usageLimit.findUnique({
      where: { organizationId },
    });

    if (!limit) {
      return;
    }

    await this.prisma.usageLimit.update({
      where: { organizationId },
      data: {
        currentCallMinutes: 0,
        currentAgents: 0,
        resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }
}
