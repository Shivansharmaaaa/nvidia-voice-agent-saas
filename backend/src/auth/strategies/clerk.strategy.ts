import { Injectable } from '@nestjs/common';
// Clerk strategy - placeholder since passport-clerk package not available
// In production, use actual Clerk SDK for authentication
@Injectable()
export class ClerkStrategy {
  // Placeholder implementation
  // Replace with actual Clerk authentication when passport-clerk is available
  async validate(payload: any) {
    return {
      id: payload.sub,
      email: payload.email,
      authId: payload.sub,
    };
  }
}
