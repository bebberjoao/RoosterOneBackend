import { Module } from '@nestjs/common';
import { PrismaModule } from '../roster-hub/shared/prisma.module';
import { UsuariosModule } from '../roster-hub/usuarios/usuarios.module';
import { PermissionGuard } from '../auth/permission.guard';
import { RoosterAcademyModule } from '../rooster-academy/rooster-academy.module';
import { LearnController } from './learn.controller';
import { LearnService } from './learn.service';

@Module({
  imports: [PrismaModule, UsuariosModule, RoosterAcademyModule],
  controllers: [LearnController],
  providers: [LearnService, PermissionGuard],
})
export class RoosterLearnModule {}
