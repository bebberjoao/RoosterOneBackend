import type { JwtModuleOptions } from '@nestjs/jwt';

/**
 * Opções compartilhadas do JwtModule. `JWT_SECRET` é obrigatório — sem
 * fallback hardcoded — para que a aplicação nunca suba em produção
 * assinando tokens com um segredo público conhecido.
 */
export function jwtModuleOptions(): JwtModuleOptions {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'JWT_SECRET não definido. Configure a variável de ambiente antes de iniciar a aplicação.',
    );
  }

  return {
    secret,
    signOptions: { expiresIn: '8h' },
  };
}
