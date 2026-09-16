import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'requiredPermission';

export type RequiredPermission = { modulo: string; recurso: string; acao: string };

/**
 * Marca uma rota como exigindo uma permissão específica (módulo/recurso/ação),
 * checada pelo `PermissionGuard` contra o que o perfil do usuário concede.
 * Administrador sempre passa, independente da permissão pedida.
 */
export const RequirePermission = (modulo: string, recurso: string, acao: string) =>
  SetMetadata(PERMISSION_KEY, { modulo, recurso, acao } satisfies RequiredPermission);
