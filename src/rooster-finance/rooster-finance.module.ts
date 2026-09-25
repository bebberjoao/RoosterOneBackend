import { Module } from '@nestjs/common';
import { PrismaModule } from '../roster-hub/shared/prisma.module';
import { UsuariosModule } from '../roster-hub/usuarios/usuarios.module';
import { NotificacoesModule } from '../roster-hub/notificacoes/notificacoes.module';
import { PermissionGuard } from '../auth/permission.guard';
import { RoosterAcademyModule } from '../rooster-academy/rooster-academy.module';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { NotaFiscalService } from './notafiscal.service';
import { BoletoService } from './boleto.service';

@Module({
  imports: [PrismaModule, UsuariosModule, RoosterAcademyModule, NotificacoesModule],
  controllers: [FinanceController],
  providers: [FinanceService, NotaFiscalService, BoletoService, PermissionGuard],
  exports: [FinanceService],
})
export class RoosterFinanceModule {}
