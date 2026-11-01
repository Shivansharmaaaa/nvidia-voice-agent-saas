import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private redis: Redis | null = null;

  constructor() {
    // Initialize Redis connection if available
    try {
      this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });
      this.redis.on('error', () => {
        this.redis = null; // Disable rate limiting if Redis fails
      });
    } catch (error) {
      // Rate limiting disabled if Redis unavailable
      this.redis = null;
    }
  }

  async use(req: Request, res: Response, next: NextFunction) {
    // Skip rate limiting if Redis not available
    if (!this.redis) {
      return next();
    }

    // Skip rate limiting for health checks
    if (req.path === '/api/health' || req.path === '/health') {
      return next();
    }

    try {
      const key = this.getRateLimitKey(req);
      const limit = this.getRateLimit(req);
      const window = 60; // 60 second window

      const current = await this.redis.incr(key);
      
      if (current === 1) {
        await this.redis.expire(key, window);
      }

      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - current));
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + window * 1000).toISOString());

      if (current > limit) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: window,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    } catch (error) {
      // If Redis fails, allow request through (fail open)
      if (error instanceof HttpException) {
        throw error;
      }
      // Otherwise, continue without rate limiting
    }

    next();
  }

  private getRateLimitKey(req: Request): string {
    const userId = (req as any).user?.id || req.ip;
    const path = req.path;
    return `rate_limit:${userId}:${path}`;
  }

  private getRateLimit(req: Request): number {
    // Different limits for different endpoints
    if (req.path.includes('/webhooks/')) {
      return 1000; // Higher limit for webhooks
    }
    if (req.path.includes('/calls')) {
      return 100; // Moderate limit for calls
    }
    return 60; // Default limit
  }
}
