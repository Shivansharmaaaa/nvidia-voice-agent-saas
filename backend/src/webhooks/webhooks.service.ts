import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CallsService } from '../calls/calls.service';
import { WebSocketGateway } from '../websocket/websocket.gateway';
import { BillingService } from '../billing/billing.service';

@Injectable()
export class WebhooksService {
  constructor(
    private prisma: PrismaService,
    private callsService: CallsService,
    private wsGateway: WebSocketGateway,
    private billingService: BillingService,
  ) {}

  async handleTwilioVoice(body: any, query: any) {
    // Find agent by phone number
    const agent = await this.prisma.agent.findUnique({
      where: { phoneNumber: body.To || query.To },
      include: {
        organization: true,
      },
    });

    if (!agent || agent.status !== 'active') {
      return this.generateTwimlResponse('Sorry, this number is not available.');
    }

    // Check usage limits before accepting call
    const limits = await this.billingService.checkUsageLimits(agent.organizationId);
    if (!limits.canProceed && limits.errors.some(e => e.includes('Call minutes'))) {
      return this.generateTwimlResponse(
        'Sorry, we have reached our call limit. Please contact support or upgrade your plan.',
      );
    }

    // Create call session
    const callSession = await this.callsService.createCallSession({
      organizationId: agent.organizationId,
      agentId: agent.id,
      twilioCallSid: body.CallSid,
      phoneNumber: body.From,
      direction: 'inbound',
    });

    // Generate TwiML for streaming
    const wsUrl = `${process.env.WS_URL || 'ws://localhost:3002'}/stream/${callSession.id}`;
    
    return this.generateStreamingTwiML(wsUrl);
  }

  async handleTwilioStatus(body: any) {
    const { CallSid, CallStatus, CallDuration } = body;

    const callSession = await this.prisma.callSession.findUnique({
      where: { twilioCallSid: CallSid },
    });

    if (!callSession) {
      return { received: true };
    }

    const updates: any = {
      status: CallStatus === 'completed' ? 'completed' : CallStatus,
    };

    if (CallStatus === 'completed' && CallDuration) {
      updates.duration = parseInt(CallDuration);
      updates.endTime = new Date();
    }

    await this.callsService.updateCallSession(CallSid, updates);

    return { received: true };
  }

  async handleTwilioStream(body: any, headers: any) {
    // Handle media stream from Twilio
    // This will forward audio chunks to the voice service via WebSocket
    const callSessionId = headers['x-call-session-id'];
    
    if (callSessionId && body.event === 'media') {
      // Forward audio payload to voice service
      this.wsGateway.forwardAudioToVoiceService(callSessionId, body.media.payload);
    }

    return { received: true };
  }

  private generateTwimlResponse(message: string) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>${message}</Say>
  <Hangup/>
</Response>`;
  }

  private generateStreamingTwiML(wsUrl: string) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Start>
    <Stream url="${wsUrl}" />
  </Start>
  <Say>Connecting you to our AI assistant.</Say>
  <Pause length="30"/>
</Response>`;
  }
}
