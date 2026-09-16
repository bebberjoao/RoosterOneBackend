import { Module } from '@nestjs/common';
import { PrismaModule } from '../shared/prisma.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { PermissionGuard } from '../../auth/permission.guard';
import { UsuariosPermissoesController } from './usuarios-permissoes.controller';
import { UsuariosPermissoesService } from './usuarios-permissoes.service';

@Module({
  imports: [PrismaModule, UsuariosModule],
  controllers: [UsuariosPermissoesController],
  providers: [UsuariosPermissoesService, PermissionGuard],
})
export class UsuariosPermissoesModule {}
