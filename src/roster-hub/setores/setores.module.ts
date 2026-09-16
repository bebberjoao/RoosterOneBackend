import { Module } from '@nestjs/common';
import { PrismaModule } from '../shared/prisma.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { PermissionGuard } from '../../auth/permission.guard';
import { SetoresController } from './setores.controller';
import { SetoresService } from './setores.service';

@Module({
  imports: [PrismaModule, UsuariosModule],
  controllers: [SetoresController],
  providers: [SetoresService, PermissionGuard],
})
export class SetoresModule {}
