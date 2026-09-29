import { Module } from '@nestjs/common';
import { UsuariosModule } from './usuarios/usuarios.module';
import { SetoresModule } from './setores/setores.module';
import { ModulosModule } from './modulos/modulos.module';
import { PermissoesModule } from './permissoes/permissoes.module';
import { UsuariosPermissoesModule } from './usuarios-permissoes/usuarios-permissoes.module';
import { UsuariosSetoresModule } from './usuarios-setores/usuarios-setores.module';
import { NotificacoesModule } from './notificacoes/notificacoes.module';
import { SessoesModule } from './sessoes/sessoes.module';
import { LogsAuditoriaModule } from './logs-auditoria/logs-auditoria.module';
import { LogsErroModule } from './logs-erro/logs-erro.module';
import { ConfiguracoesModule } from './configuracoes/configuracoes.module';

/**
 * Módulo principal do Rooster Hub.
 * Reúne todos os submódulos do núcleo administrativo da plataforma.
 */
@Module({
  imports: [
    UsuariosModule,
    SetoresModule,
    ModulosModule,
    PermissoesModule,
    UsuariosPermissoesModule,
    UsuariosSetoresModule,
    NotificacoesModule,
    SessoesModule,
    LogsAuditoriaModule,
    LogsErroModule,
    ConfiguracoesModule,
  ],
})
export class RoosterHubModule {}
