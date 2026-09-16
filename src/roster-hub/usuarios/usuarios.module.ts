import { Module } from '@nestjs/common';
import { PrismaModule } from '../shared/prisma.module';
import { AuthController, UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';
import { PermissionGuard } from '../../auth/permission.guard';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [PrismaModule, JwtModule.register({ secret: process.env.JWT_SECRET ?? 'rooster-dev-secret-change-me' })],
  controllers: [AuthController, UsuariosController],
  providers: [UsuariosService, PermissionGuard],
  exports: [UsuariosService],
})
export class UsuariosModule {}
