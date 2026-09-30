import { origemPermitida, origensConfiguradas, validarOrigemCors } from './cors';

describe('critério de origem do CORS', () => {
  const ambienteOriginal = { ...process.env };

  beforeEach(() => {
    delete process.env.CORS_ORIGINS;
    delete process.env.FRONTEND_URL;
    process.env.NODE_ENV = 'development';
  });

  afterAll(() => {
    process.env = { ...ambienteOriginal };
  });

  it('aceita requisição sem cabeçalho Origin', () => {
    expect(origemPermitida(undefined)).toBe(true);
  });

  it('fora de produção, aceita localhost e 127.0.0.1 em qualquer porta', () => {
    expect(origemPermitida('http://localhost:8080')).toBe(true);
    expect(origemPermitida('http://127.0.0.1:5173')).toBe(true);
  });

  it('recusa domínio que apenas contém "localhost" no nome', () => {
    expect(origemPermitida('http://localhost.atacante.com:8080')).toBe(false);
    expect(origemPermitida('https://atacante.com/http://localhost:8080')).toBe(false);
  });

  it('em produção, recusa localhost quando não configurado explicitamente', () => {
    process.env.NODE_ENV = 'production';
    expect(origemPermitida('http://localhost:8080')).toBe(false);
  });

  it('em produção, aceita apenas as origens de CORS_ORIGINS e de FRONTEND_URL', () => {
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGINS = 'https://rooster.instituicao.edu.br, https://admin.instituicao.edu.br/';
    process.env.FRONTEND_URL = 'https://portal.instituicao.edu.br';

    expect(origemPermitida('https://rooster.instituicao.edu.br')).toBe(true);
    expect(origemPermitida('https://admin.instituicao.edu.br')).toBe(true);
    expect(origemPermitida('https://portal.instituicao.edu.br')).toBe(true);
    expect(origemPermitida('https://outra.instituicao.edu.br')).toBe(false);
    expect(origemPermitida('http://rooster.instituicao.edu.br')).toBe(false);
  });

  it('normaliza as origens configuradas e ignora valores inválidos', () => {
    process.env.CORS_ORIGINS = 'https://a.edu.br/, valor-invalido, ,https://a.edu.br';
    process.env.FRONTEND_URL = 'https://b.edu.br/app';
    expect(origensConfiguradas()).toEqual(['https://a.edu.br', 'https://b.edu.br']);
  });

  it('o callback recusa a origem sem sinalizar erro (evita HTTP 500 na pré-verificação)', () => {
    process.env.NODE_ENV = 'production';
    const callback = jest.fn();
    validarOrigemCors('https://atacante.com', callback);
    expect(callback).toHaveBeenCalledWith(null, false);
  });
});
