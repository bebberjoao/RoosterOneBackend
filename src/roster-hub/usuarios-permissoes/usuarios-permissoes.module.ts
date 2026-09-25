import { Module } from '@nestjs/common';
import { PrismaModule } from '../shared/prisma.module';
import { AuditoriaModule } from '../shared/auditoria.module';
import { AdministradoresModule } from '../shared/administradores.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { PermissionGuard } from '../../auth/permission.guard';
import { UsuariosPermissoesController } from './usuarios-permissoes.controller';
import { UsuariosPermissoesService } from './usuarios-permissoes.service';

@Module({
  imports: [PrismaModule, AuditoriaModule, AdministradoresModule, UsuariosModule],
  controllers: [UsuariosPermissoesController],
  providers: [UsuariosPermissoesService, PermissionGuard],
})
export class UsuariosPermissoesModule {}
