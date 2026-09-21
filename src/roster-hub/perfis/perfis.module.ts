import { Module } from '@nestjs/common';
import { PrismaModule } from '../shared/prisma.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { PermissionGuard } from '../../auth/permission.guard';
import { PerfisController } from './perfis.controller';
import { PerfisService } from './perfis.service';

@Module({
  imports: [PrismaModule, UsuariosModule],
  controllers: [PerfisController],
  providers: [PerfisService, PermissionGuard],
})
export class PerfisModule {}
