import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PIIRedactionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Redact PII from text using pattern matching
   * In production, use a proper PII detection service (e.g., AWS Comprehend, Azure Text Analytics)
   */
  async redactPII(text: string): Promise<{ redactedText: string; piiTypes: string[] }> {
    const piiTypes: string[] = [];
    let redactedText = text;

    // Email patterns
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    if (emailRegex.test(redactedText)) {
      piiTypes.push('email');
      redactedText = redactedText.replace(emailRegex, '[EMAIL_REDACTED]');
    }

    // Phone numbers (US format)
    const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
    if (phoneRegex.test(redactedText)) {
      piiTypes.push('phone');
      redactedText = redactedText.replace(phoneRegex, '[PHONE_REDACTED]');
    }

    // SSN pattern
    const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
    if (ssnRegex.test(redactedText)) {
      piiTypes.push('ssn');
      redactedText = redactedText.replace(ssnRegex, '[SSN_REDACTED]');
    }

    // Credit card pattern
    const ccRegex = /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g;
    if (ccRegex.test(redactedText)) {
      piiTypes.push('credit_card');
      redactedText = redactedText.replace(ccRegex, '[CC_REDACTED]');
    }

    return { redactedText, piiTypes };
  }

  async saveRedaction(
    callSessionId: string,
    originalText: string,
    redactedText: string,
    piiTypes: string[],
  ) {
    return this.prisma.pIIRedaction.create({
      data: {
        callSessionId,
        originalText,
        redactedText,
        piiTypes,
      },
    });
  }
}
