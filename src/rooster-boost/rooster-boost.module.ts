import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../roster-hub/shared/prisma.module';
import { UsuariosModule } from '../roster-hub/usuarios/usuarios.module';
import { PermissionGuard } from '../auth/permission.guard';
import { jwtModuleOptions } from '../auth/jwt-config';
import { RoosterAcademyModule } from '../rooster-academy/rooster-academy.module';
import { BoostController } from './boost.controller';
import { BoostService } from './boost.service';
import { CertificadoBoostService } from './certificado-boost.service';
import { BoostChatGateway } from './boost-chat.gateway';

@Module({
  imports: [PrismaModule, UsuariosModule, RoosterAcademyModule, JwtModule.register(jwtModuleOptions())],
  controllers: [BoostController],
  providers: [BoostService, CertificadoBoostService, BoostChatGateway, PermissionGuard],
  exports: [BoostService, CertificadoBoostService, BoostChatGateway],
})
export class RoosterBoostModule {}
