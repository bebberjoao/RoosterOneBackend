import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../roster-hub/shared/prisma.module';
import { RoosterDeskController } from './rooster-desk.controller';
import { RoosterDeskService } from './rooster-desk.service';
import { MensagensGateway } from './mensagens.gateway';
import { UsuariosModule } from '../roster-hub/usuarios/usuarios.module';

@Module({
  imports: [
    PrismaModule,
    UsuariosModule,
    JwtModule.register({ secret: process.env.JWT_SECRET ?? 'rooster-dev-secret-change-me' }),
  ],
  controllers: [RoosterDeskController],
  providers: [RoosterDeskService, MensagensGateway],
})
export class RoosterDeskModule {}
