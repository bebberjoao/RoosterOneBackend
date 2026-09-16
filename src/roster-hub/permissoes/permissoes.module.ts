import { Module } from '@nestjs/common';
import { PrismaModule } from '../shared/prisma.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { PermissionGuard } from '../../auth/permission.guard';
import { PermissoesController } from './permissoes.controller';
import { PermissoesService } from './permissoes.service';

@Module({
  imports: [PrismaModule, UsuariosModule],
  controllers: [PermissoesController],
  providers: [PermissoesService, PermissionGuard],
})
export class PermissoesModule {}
