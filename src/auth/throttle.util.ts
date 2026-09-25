/**
 * Limites de taxa por minuto. Em teste (Jest define `NODE_ENV=test`
 * automaticamente), o e2e faz dezenas de logins na mesma "janela" de um
 * minuto vindo do mesmo IP — usar o limite real de produção aqui deixaria a
 * suíte flaky por 429, não por bug. Fora de teste, os limites protegem de
 * força bruta de verdade.
 */
const isTest = process.env.NODE_ENV === 'test';

export const GLOBAL_THROTTLE_LIMIT = isTest ? 10_000 : 120;
export const LOGIN_THROTTLE_LIMIT = isTest ? 10_000 : 8;
export const SIGNUP_THROTTLE_LIMIT = isTest ? 10_000 : 5;

/**
 * Conferência pública de certificado. Consulta legítima é pontual — alguém
 * digita o código impresso num certificado que recebeu. Um limite baixo
 * impede varrer o espaço de códigos para descobrir quem concluiu o quê.
 */
export const VERIFICACAO_THROTTLE_LIMIT = isTest ? 10_000 : 20;
