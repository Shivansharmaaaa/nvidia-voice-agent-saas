import { Injectable, ForbiddenException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TwilioService } from '../twilio/twilio.service';
import { BillingService } from '../billing/billing.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

@Injectable()
export class AgentsService {
  constructor(
    private prisma: PrismaService,
    private twilioService: TwilioService,
    @Inject(forwardRef(() => BillingService))
    private billingService: BillingService,
  ) {}

  async create(userId: string, organizationId: string, createDto: CreateAgentDto) {
    try {
      // Verify user has access to organization
      await this.ensureAccess(userId, organizationId);
    } catch (error) {
      // In development mode with dev user, skip access check if database not available
      if (userId === 'dev-user-id') {
        console.warn('Skipping access check for dev user');
      } else {
        throw error;
      }
    }

    try {
      // Check usage limits (may fail if database not available)
      const limits = await this.billingService.checkUsageLimits(organizationId);
      if (!limits.canProceed && limits.errors.some(e => e.includes('Agent'))) {
        throw new ForbiddenException('Agent limit reached. Please upgrade your plan.');
      }
    } catch (error) {
      // In development, skip usage limit check if database not available
      if (userId === 'dev-user-id') {
        console.warn('Skipping usage limit check for dev user');
      } else {
        throw error;
      }
    }

    try {
      const agent = await this.prisma.agent.create({
        data: {
          organizationId,
          ...createDto,
        },
        include: {
          organization: true,
          promptTemplates: true,
        },
      });

      // Update agent count (may fail if database not available)
      try {
        await this.prisma.usageLimit.updateMany({
          where: { organizationId },
          data: {
            currentAgents: { increment: 1 },
          },
        });
      } catch (error) {
        console.warn('Could not update usage limits:', error);
      }

      return agent;
    } catch (error) {
      // If database is not available, return a mock agent for development
      if (userId === 'dev-user-id') {
        console.warn('Database not available, returning mock agent for development');
        return {
          id: `dev-agent-${Date.now()}`,
          organizationId,
          ...createDto,
          status: 'draft',
          createdAt: new Date(),
          updatedAt: new Date(),
          organization: null,
          promptTemplates: [],
        };
      }
      throw error;
    }
  }

  async findAll(userId: string, organizationId: string) {
    await this.ensureAccess(userId, organizationId);
    return this.prisma.agent.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: {
            callSessions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, organizationId: string, id: string) {
    await this.ensureAccess(userId, organizationId);
    const agent = await this.prisma.agent.findFirst({
      where: { id, organizationId },
      include: {
        promptTemplates: true,
        organization: true,
      },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    return agent;
  }

  async update(
    userId: string,
    organizationId: string,
    id: string,
    updateDto: UpdateAgentDto,
  ) {
    await this.ensureAccess(userId, organizationId);
    return this.prisma.agent.update({
      where: { id },
      data: updateDto,
    });
  }

  async deploy(userId: string, organizationId: string, id: string) {
    await this.ensureAccess(userId, organizationId);
    const agent = await this.findOne(userId, organizationId, id);

    if (agent.status !== 'draft') {
      throw new ForbiddenException('Agent must be in draft status to deploy');
    }

    // Purchase and configure Twilio phone number
    let phoneNumber = agent.phoneNumber;
    let twilioSid = agent.twilioSid;

    if (!phoneNumber) {
      const twilioConfig = await this.twilioService.purchasePhoneNumber();
      phoneNumber = twilioConfig.phoneNumber;
      twilioSid = twilioConfig.sid;
    }

    // Configure Twilio webhook
    await this.twilioService.configureWebhook(twilioSid, {
      voiceUrl: `${process.env.API_URL}/webhooks/twilio/voice`,
      statusCallback: `${process.env.API_URL}/webhooks/twilio/status`,
    });

    // Update agent status
    const updated = await this.prisma.agent.update({
      where: { id },
      data: {
        status: 'active',
        phoneNumber,
        twilioSid,
        deployedAt: new Date(),
      },
    });

    return updated;
  }

  async pause(userId: string, organizationId: string, id: string) {
    await this.ensureAccess(userId, organizationId);
    return this.prisma.agent.update({
      where: { id },
      data: { status: 'paused' },
    });
  }

  async clone(userId: string, organizationId: string, id: string, name: string) {
    await this.ensureAccess(userId, organizationId);
    
    const sourceAgent = await this.findOne(userId, organizationId, id);
    
    // Check usage limits
    const limits = await this.billingService.checkUsageLimits(organizationId);
    if (!limits.canProceed && limits.errors.some(e => e.includes('Agent'))) {
      throw new ForbiddenException('Agent limit reached. Please upgrade your plan.');
    }

    const cloned = await this.prisma.agent.create({
      data: {
        organizationId,
        name,
        description: sourceAgent.description,
        businessName: sourceAgent.businessName,
        industry: sourceAgent.industry,
        persona: sourceAgent.persona,
        voiceModel: sourceAgent.voiceModel,
        voiceSettings: sourceAgent.voiceSettings,
        language: sourceAgent.language,
        llmModel: sourceAgent.llmModel,
        temperature: sourceAgent.temperature,
        maxTokens: sourceAgent.maxTokens,
        systemPrompt: sourceAgent.systemPrompt,
        knowledgeBase: sourceAgent.knowledgeBase,
        dialogueRules: sourceAgent.dialogueRules,
        escalationEmail: sourceAgent.escalationEmail,
        status: 'draft', // Cloned agents start as draft
      },
    });

    // Clone prompt templates
    if (sourceAgent.promptTemplates && sourceAgent.promptTemplates.length > 0) {
      await this.prisma.promptTemplate.createMany({
        data: sourceAgent.promptTemplates.map(template => ({
          agentId: cloned.id,
          name: template.name,
          description: template.description,
          template: template.template,
          variables: template.variables,
          category: template.category,
          isActive: template.isActive,
        })),
      });
    }

    // Update agent count
    await this.prisma.usageLimit.updateMany({
      where: { organizationId },
      data: {
        currentAgents: { increment: 1 },
      },
    });

    return cloned;
  }

  async remove(userId: string, organizationId: string, id: string) {
    await this.ensureAccess(userId, organizationId);
    
    const agent = await this.findOne(userId, organizationId, id);
    
    await this.prisma.agent.delete({
      where: { id },
    });

    // Update agent count
    await this.prisma.usageLimit.updateMany({
      where: { organizationId },
      data: {
        currentAgents: { decrement: 1 },
      },
    });

    return agent;
  }

  private async ensureAccess(userId: string, organizationId: string) {
    // In development mode with dev user, skip database check if not available
    if (userId === 'dev-user-id') {
      try {
        const membership = await this.prisma.organizationMember.findUnique({
          where: {
            userId_organizationId: {
              userId,
              organizationId,
            },
          },
        });
        if (membership) {
          return; // Access granted
        }
        // If no membership found but database is available, create one for dev user
        await this.prisma.organizationMember.create({
          data: {
            userId,
            organizationId,
            role: 'owner',
          },
        });
        return;
      } catch (error: any) {
        // Database not available or error, allow access for dev user
        console.warn('Database not available, allowing access for dev user:', error?.message || error);
        return;
      }
    }
    
    // For non-dev users, perform normal access check
    try {
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
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      // If database error, rethrow
      throw error;
    }
  }
}
