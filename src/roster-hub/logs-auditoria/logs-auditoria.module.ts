import { Module } from '@nestjs/common';
import { PrismaModule } from '../shared/prisma.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { PermissionGuard } from '../../auth/permission.guard';
import { LogsAuditoriaController } from './logs-auditoria.controller';
import { LogsAuditoriaService } from './logs-auditoria.service';

@Module({
  imports: [PrismaModule, UsuariosModule],
  controllers: [LogsAuditoriaController],
  providers: [LogsAuditoriaService, PermissionGuard],
})
export class LogsAuditoriaModule {}
