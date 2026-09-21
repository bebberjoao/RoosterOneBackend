import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from '../roster-hub/shared/prisma.module';
import { JwtAuthGuard } from './jwt-auth.guard';
import { jwtModuleOptions } from './jwt-config';
import { GLOBAL_THROTTLE_LIMIT } from './throttle.util';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register(jwtModuleOptions()),
    // Limite global de requisições por IP; rotas sensíveis (login, esqueci-senha)
    // usam @Throttle() com um limite mais rígido — ver auth.controller/usuarios.controller.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: GLOBAL_THROTTLE_LIMIT }]),
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AuthModule {}
