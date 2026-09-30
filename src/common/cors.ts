/**
 * Critério único de origem permitida para CORS, compartilhado pela API REST (`main.ts`) e
 * pelos gateways WebSocket do Desk e do Boost — antes, cada um mantinha uma cópia própria da
 * mesma expressão regular.
 *
 * - Origens explicitamente autorizadas: `CORS_ORIGINS` (lista separada por vírgula) e a origem
 *   de `FRONTEND_URL`, que já identifica o endereço do frontend para o link de redefinição de
 *   senha. Valem em qualquer ambiente.
 * - `localhost`/`127.0.0.1` em qualquer porta: aceitos apenas fora de produção, porque o
 *   servidor de desenvolvimento do frontend muda de porta conforme a disponibilidade.
 * - Requisição sem cabeçalho `Origin` (mesma origem, clientes de linha de comando, chamadas
 *   entre servidores): aceita, pois CORS é uma restrição aplicada apenas por navegadores.
 */

const ORIGEM_LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/;

function normalizarOrigem(valor: string): string | null {
  try {
    return new URL(valor.trim()).origin;
  } catch {
    return null;
  }
}

/** Origens autorizadas por configuração, independentemente do ambiente. */
export function origensConfiguradas(): string[] {
  const candidatas = [...(process.env.CORS_ORIGINS ?? '').split(','), process.env.FRONTEND_URL ?? ''];
  return [...new Set(candidatas.filter((c) => c.trim()).map(normalizarOrigem).filter((o): o is string => o !== null))];
}

export function origemPermitida(origin: string | undefined): boolean {
  if (!origin) return true;
  if (origensConfiguradas().includes(origin)) return true;
  if (process.env.NODE_ENV === 'production') return false;
  return ORIGEM_LOCAL.test(origin);
}

/**
 * Callback no formato esperado por `enableCors` e pela opção `cors` de `@WebSocketGateway`.
 * Origem recusada é sinalizada com `false`, sem erro: o middleware apenas omite o cabeçalho
 * `Access-Control-Allow-Origin` e o navegador bloqueia a resposta. Repassar um `Error` faria a
 * requisição de pré-verificação terminar em HTTP 500, como se fosse falha do servidor.
 */
export function validarOrigemCors(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void): void {
  callback(null, origemPermitida(origin));
}
