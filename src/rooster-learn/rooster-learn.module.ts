import { Module } from '@nestjs/common';
import { PrismaModule } from '../roster-hub/shared/prisma.module';
import { UsuariosModule } from '../roster-hub/usuarios/usuarios.module';
import { PermissionGuard } from '../auth/permission.guard';
import { RoosterAcademyModule } from '../rooster-academy/rooster-academy.module';
import { NotificacoesModule } from '../roster-hub/notificacoes/notificacoes.module';
import { LearnController } from './learn.controller';
import { LearnService } from './learn.service';
import { QuestoesService } from './questoes.service';

@Module({
  imports: [PrismaModule, UsuariosModule, RoosterAcademyModule, NotificacoesModule],
  controllers: [LearnController],
  providers: [LearnService, QuestoesService, PermissionGuard],
})
export class RoosterLearnModule {}
