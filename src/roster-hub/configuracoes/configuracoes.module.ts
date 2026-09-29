import { Module } from '@nestjs/common';
import { MailModule } from '../../mail/mail.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { PermissionGuard } from '../../auth/permission.guard';
import { ConfiguracoesController } from './configuracoes.controller';

@Module({
  imports: [MailModule, UsuariosModule],
  controllers: [ConfiguracoesController],
  providers: [PermissionGuard],
})
export class ConfiguracoesModule {}
