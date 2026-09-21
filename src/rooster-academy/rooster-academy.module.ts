import { Module } from '@nestjs/common';
import { PrismaModule } from '../roster-hub/shared/prisma.module';
import { UsuariosModule } from '../roster-hub/usuarios/usuarios.module';
import { PermissionGuard } from '../auth/permission.guard';
import { AcademyController } from './academy.controller';
import { AcademyService } from './academy.service';

@Module({
  imports: [PrismaModule, UsuariosModule],
  controllers: [AcademyController],
  providers: [AcademyService, PermissionGuard],
  exports: [AcademyService],
})
export class RoosterAcademyModule {}
