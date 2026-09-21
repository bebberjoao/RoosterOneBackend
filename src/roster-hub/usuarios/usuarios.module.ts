import { Module } from '@nestjs/common';
import { PrismaModule } from '../shared/prisma.module';
import { AuditoriaModule } from '../shared/auditoria.module';
import { AuthController, UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';
import { PermissionGuard } from '../../auth/permission.guard';
import { JwtModule } from '@nestjs/jwt';
import { jwtModuleOptions } from '../../auth/jwt-config';
import { MailModule } from '../../mail/mail.module';

@Module({
  imports: [PrismaModule, AuditoriaModule, MailModule, JwtModule.register(jwtModuleOptions())],
  controllers: [AuthController, UsuariosController],
  providers: [UsuariosService, PermissionGuard],
  exports: [UsuariosService],
})
export class UsuariosModule {}
