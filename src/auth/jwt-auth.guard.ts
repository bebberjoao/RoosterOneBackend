import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../roster-hub/shared/prisma.service';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string }; user?: unknown }>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token JWT não informado.');
    }

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(authorization.slice(7));
      const user = await this.prisma.usuario.findUnique({ where: { id: payload.sub } });
      if (!user?.ativo) throw new UnauthorizedException('Usuário inválido ou inativo.');
      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Token JWT inválido ou expirado.');
    }
  }
}
