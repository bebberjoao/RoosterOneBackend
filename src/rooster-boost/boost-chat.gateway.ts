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
import { BoostService } from './boost.service';

type Principal = { tipo: 'hub'; usuarioId: string } | { tipo: 'boost'; boostUsuarioId: string };

/**
 * Camada de push do chat do Boost. O REST (`/cursos-boost/:id/mensagens`)
 * continua sendo a fonte da verdade — este gateway só avisa quem está com o
 * curso aberto que uma mensagem nova chegou. Autentica os DOIS tipos de
 * token que existem no sistema (JWT do Hub, usado pelo professor/instrutor;
 * JWT do Boost, usado pelo aluno público) — o claim `tipo` no payload diz
 * qual tabela consultar (mesmo padrão do `BoostJwtAuthGuard` do REST).
 */
@Injectable()
@WebSocketGateway({
  namespace: '/boost',
  cors: {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Origem não permitida pelo CORS.'));
      }
    },
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

  /** Entra na sala do curso — só se o socket for o instrutor dono ou um aluno matriculado. */
  @SubscribeMessage('curso:entrar')
  async entrarNoCurso(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { cursoId?: string },
  ): Promise<{ ok: boolean; erro?: string }> {
    const principal = await this.autenticar(client);
    if (!principal) return { ok: false, erro: 'Não autenticado.' };
    if (!data?.cursoId) return { ok: false, erro: 'Informe o curso.' };

    const podeAcessar = await this.podeAcessarCurso(principal, data.cursoId);
    if (!podeAcessar) return { ok: false, erro: 'Sem acesso a este curso.' };

    await client.join(this.sala(data.cursoId));
    return { ok: true };
  }

  @SubscribeMessage('curso:sair')
  sairDoCurso(@ConnectedSocket() client: Socket, @MessageBody() data: { cursoId?: string }) {
    if (data?.cursoId) client.leave(this.sala(data.cursoId));
  }

  /** Chamado pelos controllers depois que a mensagem foi commitada no banco. */
  emitirNovaMensagem(cursoId: string, mensagem: unknown) {
    this.server?.to(this.sala(cursoId)).emit('mensagem:nova', mensagem);
  }

  private async podeAcessarCurso(principal: Principal, cursoId: string): Promise<boolean> {
    if (principal.tipo === 'hub') {
      const professor = await this.academyService.findProfessorByUsuarioId(principal.usuarioId);
      return Boolean(professor && (await this.boostService.isCursoDoProfessor(cursoId, professor.id)));
    }
    const matricula = await this.prisma.matriculaBoost.findUnique({
      where: { boostUsuarioId_cursoId: { boostUsuarioId: principal.boostUsuarioId, cursoId } },
    });
    return Boolean(matricula);
  }

  private sala(cursoId: string) {
    return `curso-boost:${cursoId}`;
  }
}
