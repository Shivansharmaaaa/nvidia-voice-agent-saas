import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as twilio from 'twilio';

@Injectable()
export class TwilioService {
  private client: twilio.Twilio;

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');

    if (accountSid && authToken) {
      this.client = twilio(accountSid, authToken);
    }
  }

  async purchasePhoneNumber(areaCode?: string) {
    if (!this.client) {
      throw new Error('Twilio not configured');
    }

    const params: any = { limit: 1 };
    if (areaCode) {
      params.areaCode = areaCode;
    }
    const availableNumbers = await this.client.availablePhoneNumbers('US')
      .local.list(params);

    if (availableNumbers.length === 0) {
      throw new Error('No available phone numbers');
    }

    const phoneNumber = availableNumbers[0].phoneNumber;
    const incomingPhoneNumber = await this.client.incomingPhoneNumbers.create({
      phoneNumber,
    });

    return {
      phoneNumber,
      sid: incomingPhoneNumber.sid,
    };
  }

  async configureWebhook(phoneNumberSid: string, webhooks: {
    voiceUrl: string;
    statusCallback: string;
  }) {
    if (!this.client) {
      throw new Error('Twilio not configured');
    }

    return this.client.incomingPhoneNumbers(phoneNumberSid).update({
      voiceUrl: webhooks.voiceUrl,
      statusCallback: webhooks.statusCallback,
      statusCallbackMethod: 'POST',
    });
  }

  async createCall(to: string, from: string, url: string) {
    if (!this.client) {
      throw new Error('Twilio not configured');
    }

    return this.client.calls.create({
      to,
      from,
      url,
    });
  }
}
