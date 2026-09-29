import { Module } from '@nestjs/common';
import { PrismaModule } from '../roster-hub/shared/prisma.module';
import { UsuariosModule } from '../roster-hub/usuarios/usuarios.module';
import { NotificacoesModule } from '../roster-hub/notificacoes/notificacoes.module';
import { RoosterAcademyModule } from '../rooster-academy/rooster-academy.module';
import { PermissionGuard } from '../auth/permission.guard';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';

@Module({
  imports: [PrismaModule, UsuariosModule, NotificacoesModule, RoosterAcademyModule],
  controllers: [RoomsController],
  providers: [RoomsService, PermissionGuard],
})
export class RoosterRoomsModule {}
