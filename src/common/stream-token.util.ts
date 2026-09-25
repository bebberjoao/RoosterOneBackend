import { JwtService } from '@nestjs/jwt';

/**
 * Token de vida curta para autenticar o `<video src>` do player de vídeo
 * hospedado do Boost.
 *
 * O sistema inteiro autentica por cabeçalho `Authorization: Bearer <jwt>`,
 * mas a tag `<video>` não anexa cabeçalho customizado na requisição que ela
 * mesma dispara — não dá pra simplesmente reaproveitar o guard normal na
 * rota de streaming. Duas alternativas piores foram descartadas: baixar o
 * vídeo inteiro como Blob autenticado (inviável para até 2GB, perde a
 * capacidade de arrastar a barra sem terminar o download) e aceitar o token
 * de sessão inteiro via query string (um token de 8h vazando em log de
 * acesso é um problema sério; um destes, de 5 minutos e escopado a uma
 * única aula, quase não é).
 *
 * Por isso o fluxo é: o player pede este token por um endpoint autenticado
 * normalmente (cabeçalho), e só ELE vai na URL do vídeo como `?token=`.
 */

const FINALIDADE = 'stream-boost-video';
const VALIDADE = '5m';

export type PayloadTokenDeStream = {
  sub: string;
  aulaId: string;
  tipo: 'usuario' | 'boost';
  finalidade: typeof FINALIDADE;
};

/** Emite o token, escopado a um `subjectId` (quem pediu) e uma `aulaId` (o que pode assistir). */
export async function emitirTokenDeStream(
  jwt: JwtService,
  params: { subjectId: string; aulaId: string; tipo: 'usuario' | 'boost' },
): Promise<string> {
  const payload: PayloadTokenDeStream = {
    sub: params.subjectId,
    aulaId: params.aulaId,
    tipo: params.tipo,
    finalidade: FINALIDADE,
  };
  return jwt.signAsync(payload, { expiresIn: VALIDADE });
}

/**
 * Valida o token contra a `aulaId` pedida na URL — um token emitido para uma
 * aula não serve para pedir o vídeo de outra, mesmo dentro da validade.
 * Devolve o payload decodificado, ou `null` se inválido/expirado/aula errada.
 */
export async function validarTokenDeStream(
  jwt: JwtService,
  token: string,
  aulaIdEsperada: string,
): Promise<PayloadTokenDeStream | null> {
  try {
    const payload = await jwt.verifyAsync<PayloadTokenDeStream>(token);
    if (payload.finalidade !== FINALIDADE || payload.aulaId !== aulaIdEsperada) return null;
    return payload;
  } catch {
    return null;
  }
}
