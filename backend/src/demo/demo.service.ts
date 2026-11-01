import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AgentsService } from '../agents/agents.service';

@Injectable()
export class DemoService {
  constructor(
    private prisma: PrismaService,
    private agentsService: AgentsService,
  ) {}

  /**
   * Create demo organization with sample agent
   */
  async createDemoOrganization(userId: string) {
    // Create demo organization
    const org = await this.prisma.organization.create({
      data: {
        name: 'Demo Organization',
        slug: `demo-${Date.now()}`,
        plan: 'demo',
        settings: {
          demo: true,
          demoExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
        members: {
          create: {
            userId,
            role: 'owner',
          },
        },
      },
    });

    // Create demo billing subscription (fake)
    await this.prisma.billingSubscription.create({
      data: {
        organizationId: org.id,
        planId: (await this.prisma.billingPlan.findUnique({ where: { name: 'free' } }))!.id,
        status: 'active',
      },
    });

    // Create usage limit (demo: 30 minutes)
    await this.prisma.usageLimit.create({
      data: {
        organizationId: org.id,
        planId: (await this.prisma.billingPlan.findUnique({ where: { name: 'free' } }))!.id,
        hardCallMinutes: 30,
        hardAgents: 1,
        resetAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Create sample agent
    const sampleAgent = await this.agentsService.create(userId, org.id, {
      name: 'Demo Support Agent',
      description: 'A pre-configured demo agent for customer support',
      businessName: 'Demo Company',
      industry: 'technology',
      systemPrompt: `You are a helpful customer support agent for Demo Company.
You assist customers with product questions, troubleshooting, and general inquiries.
Be friendly, professional, and concise.`,
      knowledgeBase: {
        faqs: [
          'Q: What are your business hours?\nA: We are open Monday-Friday, 9am-5pm EST.',
          'Q: How do I reset my password?\nA: Visit our website and click "Forgot Password" on the login page.',
          'Q: Do you offer refunds?\nA: Yes, we offer a 30-day money-back guarantee.',
        ],
      },
      dialogueRules: {
        escalationEmail: 'support@demo.com',
        maxDuration: 300,
      },
    });

    return {
      organization: org,
      agent: sampleAgent,
      demoInfo: {
        expiresAt: org.settings['demoExpiresAt'],
        callMinutesRemaining: 30,
        agentsRemaining: 1,
      },
    };
  }

  /**
   * Reset demo organization
   */
  async resetDemo(organizationId: string) {
    // Delete all call sessions
    await this.prisma.callSession.deleteMany({
      where: { organizationId },
    });

    // Reset usage limits
    await this.prisma.usageLimit.updateMany({
      where: { organizationId },
      data: {
        currentCallMinutes: 0,
        currentAgents: 0,
      },
    });

    // Reset usage records
    await this.prisma.usageRecord.updateMany({
      where: { organizationId },
      data: {
        isBilled: false,
      },
    });

    return { message: 'Demo reset successfully' };
  }

  /**
   * Check if organization is demo
   */
  async isDemoOrganization(organizationId: string): Promise<boolean> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    return org?.settings?.['demo'] === true;
  }
}
