import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TracingService {
  private readonly logger = new Logger(TracingService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Generate trace ID for distributed tracing
   */
  generateTraceId(): string {
    return `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log call-level trace
   */
  async logCallTrace(
    callSessionId: string,
    traceId: string,
    span: string,
    data: any,
  ) {
    this.logger.log({
      traceId,
      callSessionId,
      span,
      timestamp: new Date().toISOString(),
      ...data,
    });

    // Store in database for querying
    await this.prisma.callSession.update({
      where: { id: callSessionId },
      data: {
        metadata: {
          traceId,
          spans: {
            [span]: {
              ...data,
              timestamp: new Date().toISOString(),
            },
          },
        },
      },
    });
  }

  /**
   * Log latency metrics
   */
  async logLatency(
    callSessionId: string,
    stage: 'asr' | 'llm' | 'tts' | 'e2e',
    latencyMs: number,
  ) {
    this.logger.log({
      type: 'latency',
      callSessionId,
      stage,
      latencyMs,
      timestamp: new Date().toISOString(),
    });
  }
}
