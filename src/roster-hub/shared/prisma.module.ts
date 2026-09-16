import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Módulo compartilhado responsável por disponibilizar o PrismaService.
 */
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
