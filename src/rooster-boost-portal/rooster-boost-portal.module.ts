import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../roster-hub/shared/prisma.module';
import { jwtModuleOptions } from '../auth/jwt-config';
import { RoosterBoostModule } from '../rooster-boost/rooster-boost.module';
import { MailModule } from '../mail/mail.module';
import { AuditoriaModule } from '../roster-hub/shared/auditoria.module';
import { BoostPortalController } from './boost-portal.controller';
import { BoostPortalService } from './boost-portal.service';
import { BoostJwtAuthGuard } from './boost-jwt-auth.guard';

@Module({
  imports: [PrismaModule, JwtModule.register(jwtModuleOptions()), RoosterBoostModule, MailModule, AuditoriaModule],
  controllers: [BoostPortalController],
  providers: [BoostPortalService, BoostJwtAuthGuard],
})
export class RoosterBoostPortalModule {}
