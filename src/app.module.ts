import { Module } from '@nestjs/common';
import { RoosterHubModule } from './roster-hub/roster-hub.module';
import { RoosterDeskModule } from './rooster-desk/rooster-desk.module';
import { RoosterRoomsModule } from './rooster-rooms/rooster-rooms.module';
import { RoosterAssetsModule } from './rooster-assets/rooster-assets.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';

/**
 * Módulo raiz da aplicação Rooster One.
 * Registra os módulos de negócio independentes da plataforma.
 */
@Module({
  imports: [AuthModule, RoosterHubModule, RoosterDeskModule, RoosterRoomsModule, RoosterAssetsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
