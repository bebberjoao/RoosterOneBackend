import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../roster-hub/shared/prisma.service';

/**
 * Equivalente ao `JwtAuthGuard` global, mas para o login PRÓPRIO e público do
 * Rooster Boost (`BoostUsuario`) — nunca ligado à tabela `usuarios` do Hub.
 * Aplicado só nas rotas do portal do aluno (`BoostPortalController`), que são
 * marcadas `@Public()` para o guard global nem rodar nelas (mesmo mecanismo
 * de `POST /auth/login`). O claim `tipo: 'boost'` no payload é checado
 * explicitamente — defesa extra pra um token do Hub nunca ser aceito aqui,
 * mesmo que por coincidência um id de Usuario e de BoostUsuario colidissem.
 */
@Injectable()
export class BoostJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string }; user?: unknown }>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token do portal Boost não informado.');
    }

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; tipo?: string }>(authorization.slice(7));
      if (payload.tipo !== 'boost') throw new UnauthorizedException('Token inválido para o portal Boost.');
      const boostUsuario = await this.prisma.boostUsuario.findUnique({
        where: { id: payload.sub },
        include: { usuario: { select: { ativo: true } } },
      });
      if (!boostUsuario?.ativo) throw new UnauthorizedException('Usuário inválido ou inativo.');
      // Conta vinculada acompanha a conta institucional: usuário desativado no Hub perde o portal.
      if (boostUsuario.usuarioId && !boostUsuario.usuario?.ativo) {
        throw new UnauthorizedException('Usuário inválido ou inativo.');
      }
      request.user = boostUsuario;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Token do portal Boost inválido ou expirado.');
    }
  }
}
