import { Module } from '@nestjs/common';
import { PrismaModule } from '../shared/prisma.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { PermissionGuard } from '../../auth/permission.guard';
import { UsuariosSetoresController } from './usuarios-setores.controller';
import { UsuariosSetoresService } from './usuarios-setores.service';

@Module({
  imports: [PrismaModule, UsuariosModule],
  controllers: [UsuariosSetoresController],
  providers: [UsuariosSetoresService, PermissionGuard],
})
export class UsuariosSetoresModule {}
