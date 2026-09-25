import { mascararSegredosNaUrl } from './mail.service';

/**
 * O link de redefinição de senha carrega um token que vale por 1 hora e dá
 * acesso à conta. Ele não pode aparecer em log — nem em dev, onde o log é
 * conveniente, nem (principalmente) em produção, se o SMTP não estiver
 * configurado por engano.
 */
describe('mascararSegredosNaUrl', () => {
  it('mascara o token de redefinição preservando o resto do link', () => {
    expect(mascararSegredosNaUrl('http://localhost:8080/redefinir-senha?token=abc123def')).toBe(
      'http://localhost:8080/redefinir-senha?token=***',
    );
  });

  it('mascara o token quando ele não é o primeiro parâmetro', () => {
    expect(mascararSegredosNaUrl('https://app/x?origem=email&token=segredo')).toBe(
      'https://app/x?origem=email&token=***',
    );
  });

  it('preserva os parâmetros seguintes ao token', () => {
    expect(mascararSegredosNaUrl('https://app/x?token=segredo&origem=email')).toBe(
      'https://app/x?token=***&origem=email',
    );
  });

  it('mascara outros nomes de parâmetro sensíveis, sem diferenciar maiúsculas', () => {
    expect(mascararSegredosNaUrl('https://app?senha=123&SECRET=xyz&Key=k')).toBe(
      'https://app?senha=***&SECRET=***&Key=***',
    );
  });

  it('mascara todas as ocorrências, não só a primeira', () => {
    expect(mascararSegredosNaUrl('a?token=um b?token=dois')).toBe('a?token=*** b?token=***');
  });

  it('não altera texto sem parâmetro sensível', () => {
    const texto = 'Acesse http://localhost:8080/painel?aba=reservas para continuar.';
    expect(mascararSegredosNaUrl(texto)).toBe(texto);
  });

  it('não confunde parâmetro cujo nome apenas contém "token"', () => {
    // `csrftoken=` não casa: a regex exige o nome exato depois de ? ou &.
    const texto = 'https://app?csrftoken=abc';
    expect(mascararSegredosNaUrl(texto)).toBe(texto);
  });
});
