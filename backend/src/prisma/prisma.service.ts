import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      console.warn('Database connection failed. Some features may not work:', error.message);
      // Continue without database for development
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
