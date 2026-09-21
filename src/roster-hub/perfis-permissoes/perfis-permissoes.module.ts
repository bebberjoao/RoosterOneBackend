import { Module } from '@nestjs/common';
import { PrismaModule } from '../shared/prisma.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { PermissionGuard } from '../../auth/permission.guard';
import { PerfisPermissoesController } from './perfis-permissoes.controller';
import { PerfisPermissoesService } from './perfis-permissoes.service';

@Module({
  imports: [PrismaModule, UsuariosModule],
  controllers: [PerfisPermissoesController],
  providers: [PerfisPermissoesService, PermissionGuard],
})
export class PerfisPermissoesModule {}
