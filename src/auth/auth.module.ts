import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../roster-hub/shared/prisma.module';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  imports: [PrismaModule, JwtModule.register({ secret: process.env.JWT_SECRET ?? 'rooster-dev-secret-change-me' })],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AuthModule {}
