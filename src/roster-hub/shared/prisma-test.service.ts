import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

// Prisma client generated specifically for tests using sqlite.
const { PrismaClient } = require('../../../prisma-test-client');

@Injectable()
export class PrismaTestService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
