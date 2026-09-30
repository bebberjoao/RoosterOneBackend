import { Injectable, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../roster-hub/shared/prisma.service';
import { AcademyService } from '../rooster-academy/academy.service';
import { UsuariosService } from '../roster-hub/usuarios/usuarios.service';
import { BoostService } from './boost.service';
import { validarOrigemCors } from '../common/cors';

type Principal = { tipo: 'hub'; usuarioId: string } | { tipo: 'boost'; boostUsuarioId: string };

const MODULO = 'Rooster Boost';

/**
 * Camada de push da conversa aluno ↔ orientador. O REST (`/boost-conversas` e
 * `/boost/cursos/:id/conversa`) continua sendo a fonte da verdade — este gateway só avisa quem
 * está com a conversa aberta que chegou mensagem nova. Autentica os DOIS tipos de token do
 * sistema (JWT do Hub, do orientador; JWT do Boost, do aluno) — o claim `tipo` diz qual tabela
 * consultar (mesmo padrão do `BoostJwtAuthGuard` do REST).
 *
 * Salas: `conversa:<id>` (o aluno dono + orientadores do curso) e `orientadores:<cursoId>`
 * (aviso de que a caixa de entrada mudou, para o orientador atualizar contadores).
 */
@Injectable()
@WebSocketGateway({
  namespace: '/boost',
  cors: {
    // Mesmo critério do CORS REST (main.ts), definido em um único lugar.
    origin: validarOrigemCors,
    credentials: true,
  },
})
export class BoostChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(BoostChatGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly academyService: AcademyService,
    private readonly boostService: BoostService,
    private readonly usuariosService: UsuariosService,
  ) {}

  private async autenticar(client: Socket): Promise<Principal | null> {
    if (client.data.principal) return client.data.principal as Principal;

    const token = client.handshake.auth?.token as string | undefined;
    if (!token) return null;

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; tipo?: string }>(token);
      if (payload.tipo === 'boost') {
        const aluno = await this.prisma.boostUsuario.findUnique({ where: { id: payload.sub } });
        if (!aluno?.ativo) return null;
        const principal: Principal = { tipo: 'boost', boostUsuarioId: aluno.id };
        client.data.principal = principal;
        return principal;
      }
      const usuario = await this.prisma.usuario.findUnique({ where: { id: payload.sub } });
      if (!usuario?.ativo) return null;
      const principal: Principal = { tipo: 'hub', usuarioId: usuario.id };
      client.data.principal = principal;
      return principal;
    } catch {
      return null;
    }
  }

  async handleConnection(client: Socket) {
    const principal = await this.autenticar(client);
    if (!principal) client.disconnect(true);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`socket desconectado: ${client.id}`);
  }

  /** Entra na conversa — só o aluno dono dela ou um orientador (com permissão) vinculado ao curso. */
  @SubscribeMessage('conversa:entrar')
  async entrarNaConversa(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversaId?: string },
  ): Promise<{ ok: boolean; erro?: string }> {
    const principal = await this.autenticar(client);
    if (!principal) return { ok: false, erro: 'Não autenticado.' };
    if (!data?.conversaId) return { ok: false, erro: 'Informe a conversa.' };
    if (!(await this.podeAcessarConversa(principal, data.conversaId))) return { ok: false, erro: 'Sem acesso a esta conversa.' };
    await client.join(this.salaConversa(data.conversaId));
    return { ok: true };
  }

  @SubscribeMessage('conversa:sair')
  sairDaConversa(@ConnectedSocket() client: Socket, @MessageBody() data: { conversaId?: string }) {
    if (data?.conversaId) client.leave(this.salaConversa(data.conversaId));
  }

  /** Orientador: passa a receber o aviso de mensagem nova de aluno em todos os cursos que orienta. */
  @SubscribeMessage('caixa:entrar')
  async entrarNaCaixa(@ConnectedSocket() client: Socket): Promise<{ ok: boolean; erro?: string }> {
    const principal = await this.autenticar(client);
    if (!principal || principal.tipo !== 'hub') return { ok: false, erro: 'Não autenticado.' };
    if (!(await this.usuariosService.hasPermission(principal.usuarioId, MODULO, '/boost/conversas', 'acessar'))) {
      return { ok: false, erro: 'Sem permissão.' };
    }
    const professor = await this.academyService.findProfessorByUsuarioId(principal.usuarioId);
    if (!professor) return { ok: false, erro: 'Sem vínculo de professor.' };
    const vinculos = await this.prisma.cursoOrientadorBoost.findMany({ where: { professorId: professor.id }, select: { cursoId: true } });
    await Promise.all(vinculos.map((v) => client.join(this.salaOrientadores(v.cursoId))));
    return { ok: true };
  }

  /**
   * Chamado pelos controllers depois que a mensagem foi gravada. Quem está na conversa recebe a
   * mensagem; se veio do aluno, os orientadores do curso recebem também o aviso da caixa de entrada.
   */
  emitirNovaMensagem(conversaId: string, cursoId: string, mensagem: unknown, origem: 'aluno' | 'orientador') {
    this.server?.to(this.salaConversa(conversaId)).emit('mensagem:nova', { conversaId, mensagem });
    if (origem === 'aluno') this.server?.to(this.salaOrientadores(cursoId)).emit('caixa:atualizar', { conversaId, cursoId });
  }

  private async podeAcessarConversa(principal: Principal, conversaId: string): Promise<boolean> {
    const conversa = await this.prisma.conversaBoost.findUnique({ where: { id: conversaId }, select: { cursoId: true, boostUsuarioId: true } });
    if (!conversa) return false;
    if (principal.tipo === 'boost') return conversa.boostUsuarioId === principal.boostUsuarioId;
    if (!(await this.usuariosService.hasPermission(principal.usuarioId, MODULO, '/boost/conversas', 'acessar'))) return false;
    const professor = await this.academyService.findProfessorByUsuarioId(principal.usuarioId);
    return Boolean(professor && (await this.boostService.professorOrientaCurso(professor.id, conversa.cursoId)));
  }

  private salaConversa(conversaId: string) {
    return `conversa-boost:${conversaId}`;
  }

  private salaOrientadores(cursoId: string) {
    return `orientadores-boost:${cursoId}`;
  }
}
