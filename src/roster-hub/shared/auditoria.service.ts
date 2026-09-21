import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

type RegistrarParams = {
  usuarioId?: string | null;
  modulo: string;
  acao: string;
  entidade?: string;
  entidadeId?: string | null;
  ip?: string | null;
  navegador?: string | null;
};

/**
 * Grava eventos de segurança/acesso em `LogAuditoria` (login, permissão
 * concedida/revogada, usuário criado/editado/excluído, redefinição de
 * senha). Fica em `shared/` — não em `logs-auditoria/` — porque esse módulo
 * já importa `UsuariosModule`; se o registro morasse lá, qualquer serviço
 * de usuários que precisasse chamá-lo criaria dependência circular.
 * Histórico de entidade de negócio (chamado, reserva) continua em
 * HistoricoTicket/ReservaHistorico — este serviço é só para eventos de
 * acesso/segurança.
 */
@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async registrar(params: RegistrarParams) {
    try {
      await this.prisma.logAuditoria.create({
        data: {
          modulo: params.modulo,
          acao: params.acao,
          entidade: params.entidade,
          entidadeId: params.entidadeId ?? undefined,
          ip: params.ip ?? undefined,
          navegador: params.navegador ?? undefined,
          criadoEm: new Date(),
          ...(params.usuarioId ? { usuario: { connect: { id: params.usuarioId } } } : {}),
        },
      });
    } catch (error) {
      // Falha ao auditar não pode derrubar a operação principal.
      this.logger.error(`Falha ao registrar auditoria (${params.modulo}/${params.acao}): ${String(error)}`);
    }
  }
}
