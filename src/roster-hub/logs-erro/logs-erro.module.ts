import { Module } from '@nestjs/common';
import { PrismaModule } from '../shared/prisma.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { PermissionGuard } from '../../auth/permission.guard';
import { LogsErroController } from './logs-erro.controller';
import { LogsErroService } from './logs-erro.service';

@Module({
  imports: [PrismaModule, UsuariosModule],
  controllers: [LogsErroController],
  providers: [LogsErroService, PermissionGuard],
  exports: [LogsErroService],
})
export class LogsErroModule {}
