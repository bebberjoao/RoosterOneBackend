import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma.module';
import { AdministradoresService } from './administradores.service';

@Module({
  imports: [PrismaModule],
  providers: [AdministradoresService],
  exports: [AdministradoresService],
})
export class AdministradoresModule {}
