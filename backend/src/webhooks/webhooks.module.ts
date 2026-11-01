import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CallsModule } from '../calls/calls.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [PrismaModule, CallsModule, WebSocketModule, BillingModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
