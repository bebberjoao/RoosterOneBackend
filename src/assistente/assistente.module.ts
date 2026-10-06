import { Module } from '@nestjs/common';
import { PrismaModule } from '../roster-hub/shared/prisma.module';
import { AssistenteController } from './assistente.controller';
import { AssistenteService } from './assistente.service';

@Module({
  imports: [PrismaModule],
  controllers: [AssistenteController],
  providers: [AssistenteService],
})
export class AssistenteModule {}
