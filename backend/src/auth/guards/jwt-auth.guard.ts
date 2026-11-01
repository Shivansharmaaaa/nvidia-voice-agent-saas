import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly configService?: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Development mode: Allow requests with dev token
    const nodeEnv = this.configService?.get('NODE_ENV') || process.env.NODE_ENV || 'development';
    
    if (nodeEnv === 'development') {
      const request = context.switchToHttp().getRequest();
      const authHeader = request.headers.authorization;
      
      if (authHeader && authHeader.includes('dev-token')) {
        // Create a mock user object for development
        request.user = {
          id: 'dev-user-id',
          email: 'dev@example.com',
          name: 'Dev User',
        };
        return true;
      }
    }
    
    return super.canActivate(context);
  }
}
