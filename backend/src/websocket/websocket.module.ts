import { Module, Optional } from '@nestjs/common';
import { WebSocketGateway } from './websocket.gateway';

@Module({
  providers: [
    {
      provide: WebSocketGateway,
      useFactory: () => {
        try {
          return new WebSocketGateway();
        } catch (error) {
          // WebSocket not available, return mock
          return {
            forwardAudioToVoiceService: () => {},
            sendAudioToClient: () => {},
          };
        }
      },
    },
  ],
  exports: [WebSocketGateway],
})
export class WebSocketModule {}
