import { Module } from '@nestjs/common';
import { PrismaModule } from '../shared/prisma.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { PermissionGuard } from '../../auth/permission.guard';
import { UsuariosPerfisController } from './usuarios-perfis.controller';
import { UsuariosPerfisService } from './usuarios-perfis.service';

@Module({
  imports: [PrismaModule, UsuariosModule],
  controllers: [UsuariosPerfisController],
  providers: [UsuariosPerfisService, PermissionGuard],
})
export class UsuariosPerfisModule {}
