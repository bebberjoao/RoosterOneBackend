import { Module } from '@nestjs/common';
import { RoosterHubModule } from './roster-hub/roster-hub.module';
import { RoosterDeskModule } from './rooster-desk/rooster-desk.module';
import { RoosterRoomsModule } from './rooster-rooms/rooster-rooms.module';
import { RoosterAssetsModule } from './rooster-assets/rooster-assets.module';
import { RoosterAcademyModule } from './rooster-academy/rooster-academy.module';
import { RoosterLearnModule } from './rooster-learn/rooster-learn.module';
import { RoosterBoostModule } from './rooster-boost/rooster-boost.module';
import { RoosterBoostPortalModule } from './rooster-boost-portal/rooster-boost-portal.module';
import { RoosterFinanceModule } from './rooster-finance/rooster-finance.module';
import { AssistenteModule } from './assistente/assistente.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './roster-hub/shared/prisma.module';

/**
 * Módulo raiz da aplicação Rooster One.
 * Registra os módulos de negócio independentes da plataforma.
 */
@Module({
  imports: [
    AuthModule,
    PrismaModule,
    RoosterHubModule,
    RoosterDeskModule,
    RoosterRoomsModule,
    RoosterAssetsModule,
    RoosterAcademyModule,
    RoosterLearnModule,
    RoosterBoostModule,
    RoosterBoostPortalModule,
    RoosterFinanceModule,
    AssistenteModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
