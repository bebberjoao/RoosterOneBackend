import { Module } from '@nestjs/common';
import { PrismaModule } from '../shared/prisma.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { PermissionGuard } from '../../auth/permission.guard';
import { ModulosController } from './modulos.controller';
import { ModulosService } from './modulos.service';

@Module({
  imports: [PrismaModule, UsuariosModule],
  controllers: [ModulosController],
  providers: [ModulosService, PermissionGuard],
})
export class ModulosModule {}
