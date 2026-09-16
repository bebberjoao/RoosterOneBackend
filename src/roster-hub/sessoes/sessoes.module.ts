import { Module } from '@nestjs/common';
import { PrismaModule } from '../shared/prisma.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { PermissionGuard } from '../../auth/permission.guard';
import { SessoesController } from './sessoes.controller';
import { SessoesService } from './sessoes.service';

@Module({
  imports: [PrismaModule, UsuariosModule],
  controllers: [SessoesController],
  providers: [SessoesService, PermissionGuard],
})
export class SessoesModule {}
