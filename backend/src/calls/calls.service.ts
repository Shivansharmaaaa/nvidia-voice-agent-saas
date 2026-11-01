import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PIIRedactionService } from '../security/pii-redaction.service';
import { UsageService } from '../billing/usage.service';
import { TracingService } from '../observability/tracing.service';
import { MetricsService } from '../observability/metrics.service';

@Injectable()
export class CallsService {
  constructor(
    private prisma: PrismaService,
    private piiRedaction: PIIRedactionService,
    private usageService: UsageService,
    private tracing: TracingService,
    private metrics: MetricsService,
  ) {}

  async findAll(userId: string, organizationId: string, agentId?: string) {
    await this.ensureAccess(userId, organizationId);

    return this.prisma.callSession.findMany({
      where: {
        organizationId,
        ...(agentId && { agentId }),
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
        transcripts: {
          orderBy: { timestamp: 'asc' },
        },
        _count: {
          select: {
            transcripts: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
      take: 100,
    });
  }

  async findOne(userId: string, organizationId: string, id: string) {
    await this.ensureAccess(userId, organizationId);

    return this.prisma.callSession.findFirst({
      where: { id, organizationId },
      include: {
        agent: true,
        transcripts: {
          orderBy: { timestamp: 'asc' },
        },
        analytics: true,
      },
    });
  }

  async createCallSession(data: {
    organizationId: string;
    agentId: string;
    twilioCallSid: string;
    phoneNumber: string;
    direction: string;
  }) {
    return this.prisma.callSession.create({
      data,
    });
  }

  async updateCallSession(
    twilioCallSid: string,
    updates: {
      status?: string;
      duration?: number;
      endTime?: Date;
      latency?: any;
      interruptions?: number;
      escalations?: number;
      humanTakeover?: boolean;
      asrSeconds?: number;
      llmTokens?: number;
      ttsSeconds?: number;
    },
  ) {
    const session = await this.prisma.callSession.findUnique({
      where: { twilioCallSid },
      include: {
        organization: {
          include: {
            subscription: true,
          },
        },
        agent: true,
      },
    });

    if (!session) {
      throw new Error('Call session not found');
    }

    // Record usage if call completed
    if (updates.status === 'completed' && session.organization.subscription) {
      const callMinutes = (updates.duration || 0) / 60;
      await this.usageService.recordCallUsage({
        organizationId: session.organizationId,
        subscriptionId: session.organization.subscription.id,
        callSessionId: session.id,
        agentId: session.agentId,
        callMinutes,
        asrSeconds: updates.asrSeconds || 0,
        llmTokens: updates.llmTokens || 0,
        ttsSeconds: updates.ttsSeconds || 0,
      });
    }

    // Record metrics
    if (updates.status === 'completed') {
      await this.metrics.recordCallMetrics({
        organizationId: session.organizationId,
        agentId: session.agentId,
        callSessionId: session.id,
        duration: updates.duration || 0,
        latency: updates.latency,
        interruptions: updates.interruptions || 0,
        escalations: updates.escalations || 0,
      });
    }

    return this.prisma.callSession.update({
      where: { twilioCallSid },
      data: updates,
    });
  }

  async addTranscript(data: {
    callSessionId: string;
    speaker: string;
    text: string;
    confidence?: number;
    latency?: number;
  }) {
    // Redact PII before saving
    const { redactedText, piiTypes } = await this.piiRedaction.redactPII(data.text);

    // Save redaction record if PII was found
    if (piiTypes.length > 0) {
      await this.piiRedaction.saveRedaction(
        data.callSessionId,
        data.text,
        redactedText,
        piiTypes,
      );
    }

    // Save transcript with redacted text
    return this.prisma.transcript.create({
      data: {
        ...data,
        text: redactedText,
      },
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
