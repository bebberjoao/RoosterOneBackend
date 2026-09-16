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
import { UsuariosService } from '../roster-hub/usuarios/usuarios.service';
import { RoosterDeskService } from './rooster-desk.service';

/**
 * Camada de push da conversa do Desk. O REST (`/chamados/:id/mensagens`)
 * continua sendo a fonte da verdade — persistência, autorização e regras
 * de negócio. Este gateway só avisa quem está com o chamado aberto que uma
 * mensagem nova chegou, para a tela atualizar sem precisar recarregar.
 */
@Injectable()
@WebSocketGateway({
  namespace: '/desk',
  cors: {
    // Mesmo critério do CORS REST (main.ts): qualquer porta local, dev only.
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
export class MensagensGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MensagensGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly usuariosService: UsuariosService,
    private readonly deskService: RoosterDeskService,
  ) {}

  /**
   * Verifica o JWT (o mesmo do REST, mandado em `handshake.auth.token`) e
   * guarda o usuário em `client.data`. Chamada tanto na conexão quanto no
   * início de cada handler — `handleConnection` é assíncrono e o cliente
   * pode emitir o próximo evento antes dele terminar, então cada handler
   * garante a própria autenticação em vez de confiar numa corrida.
   */
  private async autenticar(client: Socket): Promise<string | null> {
    if (client.data.usuarioId) return client.data.usuarioId as string;

    const token = client.handshake.auth?.token as string | undefined;
    if (!token) return null;

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
      const usuario = await this.prisma.usuario.findUnique({ where: { id: payload.sub } });
      if (!usuario?.ativo) return null;
      client.data.usuarioId = usuario.id;
      return usuario.id;
    } catch {
      return null;
    }
  }

  async handleConnection(client: Socket) {
    const usuarioId = await this.autenticar(client);
    if (!usuarioId) client.disconnect(true);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`socket desconectado: ${client.id}`);
  }

  /** Entra na sala do chamado — só se o socket tiver acesso à conversa (mesma regra do REST). */
  @SubscribeMessage('chamado:entrar')
  async entrarNoChamado(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId?: string },
  ): Promise<{ ok: boolean; erro?: string }> {
    const usuarioId = await this.autenticar(client);
    if (!usuarioId) return { ok: false, erro: 'Não autenticado.' };
    if (!data?.ticketId) return { ok: false, erro: 'Informe o chamado.' };

    try {
      const isAdmin = await this.usuariosService.isAdmin(usuarioId);
      const podeAcessar = await this.deskService.podeAcessarChamado(data.ticketId, usuarioId, isAdmin);
      if (!podeAcessar) return { ok: false, erro: 'Sem acesso a este chamado.' };
    } catch {
      return { ok: false, erro: 'Chamado não encontrado.' };
    }

    await client.join(this.sala(data.ticketId));
    return { ok: true };
  }

  @SubscribeMessage('chamado:sair')
  sairDoChamado(@ConnectedSocket() client: Socket, @MessageBody() data: { ticketId?: string }) {
    if (data?.ticketId) client.leave(this.sala(data.ticketId));
  }

  /** Chamado pelo controller depois que a mensagem foi commitada no banco. */
  emitirNovaMensagem(ticketId: string, mensagem: unknown) {
    this.server?.to(this.sala(ticketId)).emit('mensagem:nova', mensagem);
  }

  private sala(ticketId: string) {
    return `ticket:${ticketId}`;
  }
}
