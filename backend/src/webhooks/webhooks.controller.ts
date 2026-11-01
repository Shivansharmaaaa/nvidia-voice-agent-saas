import { Controller, Post, Body, Headers, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('twilio/voice')
  @ApiOperation({ summary: 'Twilio voice webhook' })
  async twilioVoice(@Body() body: any, @Query() query: any) {
    return this.webhooksService.handleTwilioVoice(body, query);
  }

  @Post('twilio/status')
  @ApiOperation({ summary: 'Twilio call status callback' })
  async twilioStatus(@Body() body: any) {
    return this.webhooksService.handleTwilioStatus(body);
  }

  @Post('twilio/stream')
  @ApiOperation({ summary: 'Twilio media stream webhook' })
  async twilioStream(@Body() body: any, @Headers() headers: any) {
    return this.webhooksService.handleTwilioStream(body, headers);
  }
}
