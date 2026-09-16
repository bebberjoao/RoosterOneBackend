import { Module } from '@nestjs/common';
import { UsuariosModule } from './usuarios/usuarios.module';
import { SetoresModule } from './setores/setores.module';
import { PerfisModule } from './perfis/perfis.module';
import { ModulosModule } from './modulos/modulos.module';
import { PermissoesModule } from './permissoes/permissoes.module';
import { UsuariosPerfisModule } from './usuarios-perfis/usuarios-perfis.module';
import { UsuariosSetoresModule } from './usuarios-setores/usuarios-setores.module';
import { PerfisPermissoesModule } from './perfis-permissoes/perfis-permissoes.module';
import { NotificacoesModule } from './notificacoes/notificacoes.module';
import { SessoesModule } from './sessoes/sessoes.module';
import { LogsAuditoriaModule } from './logs-auditoria/logs-auditoria.module';

/**
 * Módulo principal do Rooster Hub.
 * Reúne todos os submódulos do núcleo administrativo da plataforma.
 */
@Module({
  imports: [
    UsuariosModule,
    SetoresModule,
    PerfisModule,
    ModulosModule,
    PermissoesModule,
    UsuariosPerfisModule,
    UsuariosSetoresModule,
    PerfisPermissoesModule,
    NotificacoesModule,
    SessoesModule,
    LogsAuditoriaModule,
  ],
})
export class RoosterHubModule {}
