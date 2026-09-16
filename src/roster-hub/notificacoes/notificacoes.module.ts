import { Module } from '@nestjs/common';
import { PrismaModule } from '../shared/prisma.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { PermissionGuard } from '../../auth/permission.guard';
import { NotificacoesController } from './notificacoes.controller';
import { NotificacoesService } from './notificacoes.service';

@Module({
  imports: [PrismaModule, UsuariosModule],
  controllers: [NotificacoesController],
  providers: [NotificacoesService, PermissionGuard],
})
export class NotificacoesModule {}
