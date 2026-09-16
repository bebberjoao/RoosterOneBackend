import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../roster-hub/shared/prisma.module';
import { RoosterDeskController } from './rooster-desk.controller';
import { RoosterDeskService } from './rooster-desk.service';
import { MensagensGateway } from './mensagens.gateway';
import { UsuariosModule } from '../roster-hub/usuarios/usuarios.module';
import { jwtModuleOptions } from '../auth/jwt-config';
import { PermissionGuard } from '../auth/permission.guard';

@Module({
  imports: [
    PrismaModule,
    UsuariosModule,
    JwtModule.register(jwtModuleOptions()),
  ],
  controllers: [RoosterDeskController],
  providers: [RoosterDeskService, MensagensGateway, PermissionGuard],
})
export class RoosterDeskModule {}
