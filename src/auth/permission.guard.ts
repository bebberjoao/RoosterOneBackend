import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsuariosService } from '../roster-hub/usuarios/usuarios.service';
import { PERMISSION_KEY, RequiredPermission } from './require-permission.decorator';

/**
 * Roda depois do `JwtAuthGuard` global (que já populou `request.user`).
 * Sem `@RequirePermission` na rota, deixa passar — o guard só bloqueia o
 * que foi explicitamente marcado. Administrador sempre passa.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usuariosService: UsuariosService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<RequiredPermission | undefined>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const request = context.switchToHttp().getRequest<{ user?: { id: string } }>();
    const usuarioId = request.user?.id;
    if (!usuarioId) throw new UnauthorizedException('Usuário não autenticado.');

    if (await this.usuariosService.isAdmin(usuarioId)) return true;

    const permitido = await this.usuariosService.hasPermission(usuarioId, required.modulo, required.recurso, required.acao);
    if (!permitido) {
      throw new ForbiddenException(`Sem permissão para ${required.acao} em ${required.recurso}.`);
    }
    return true;
  }
}
