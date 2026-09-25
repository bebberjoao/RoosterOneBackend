import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateUsuarioDto } from '../roster-hub/usuarios/dto/create-usuario.dto';
import { LoginDto } from '../roster-hub/usuarios/dto/login.dto';
import { RedefinirSenhaDto } from '../roster-hub/usuarios/dto/redefinir-senha.dto';
import { RefreshTokenDto } from '../roster-hub/usuarios/dto/refresh-token.dto';
import { CreateReservaDto } from '../rooster-rooms/dto/create-reserva.dto';
import { FindReservasQueryDto } from '../rooster-rooms/dto/find-reservas-query.dto';
import { CreateTicketDto } from '../rooster-desk/dto/rooster-desk.dto';
import { PaginacaoQueryDto } from './pagination';

/**
 * Suíte dedicada à validação de entrada.
 *
 * Antes, cada restrição de DTO era exercitada apenas de forma indireta, por
 * algum caso e2e que mandava dado inválido — o que deixava a maioria das
 * regras sem cobertura explícita. Aqui as regras são verificadas uma a uma,
 * sem subir a aplicação: `plainToInstance` + `validateSync` reproduzem
 * exatamente o que o `ValidationPipe` global faz (`transform`, e depois as
 * regras do class-validator).
 *
 * `whitelist`/`forbidNonWhitelisted` — a rejeição de campo desconhecido — são
 * comportamento do pipe, não do DTO, e continuam cobertos pelo e2e.
 */

/** Campos que falharam na validação do DTO. */
function camposInvalidos<T extends object>(cls: new () => T, payload: Record<string, unknown>): string[] {
  const instancia = plainToInstance(cls, payload, { enableImplicitConversion: false });
  return validateSync(instancia as object, { whitelist: false }).map((e) => e.property);
}

const usuarioValido = {
  nome: 'João Silva',
  email: 'joao.silva@example.com',
  senhaHash: 'SenhaSegura123',
};

describe('CreateUsuarioDto', () => {
  it('aceita um payload mínimo válido', () => {
    expect(camposInvalidos(CreateUsuarioDto, usuarioValido)).toEqual([]);
  });

  it('exige nome, email e senha', () => {
    const invalidos = camposInvalidos(CreateUsuarioDto, {});
    expect(invalidos).toEqual(expect.arrayContaining(['nome', 'email', 'senhaHash']));
  });

  it('recusa e-mail malformado', () => {
    expect(camposInvalidos(CreateUsuarioDto, { ...usuarioValido, email: 'joao.silva' })).toContain('email');
    expect(camposInvalidos(CreateUsuarioDto, { ...usuarioValido, email: 'joao@' })).toContain('email');
  });

  it('exige senha de pelo menos 8 caracteres', () => {
    expect(camposInvalidos(CreateUsuarioDto, { ...usuarioValido, senhaHash: '1234567' })).toContain('senhaHash');
    expect(camposInvalidos(CreateUsuarioDto, { ...usuarioValido, senhaHash: '12345678' })).not.toContain('senhaHash');
  });

  it('recusa nome curto demais', () => {
    expect(camposInvalidos(CreateUsuarioDto, { ...usuarioValido, nome: 'J' })).toContain('nome');
  });

  it('aceita CPF só com 11 dígitos, sem pontuação', () => {
    expect(camposInvalidos(CreateUsuarioDto, { ...usuarioValido, cpf: '12345678901' })).not.toContain('cpf');
    expect(camposInvalidos(CreateUsuarioDto, { ...usuarioValido, cpf: '123.456.789-01' })).toContain('cpf');
    expect(camposInvalidos(CreateUsuarioDto, { ...usuarioValido, cpf: '123456789' })).toContain('cpf');
  });

  it('converte "true"/"false" de formulário em booleano', () => {
    // O @Transform existe porque `ativo` chega como string quando o cliente
    // manda multipart/query em vez de JSON.
    const instancia = plainToInstance(CreateUsuarioDto, { ...usuarioValido, ativo: 'true' });
    expect(instancia.ativo).toBe(true);
    expect(camposInvalidos(CreateUsuarioDto, { ...usuarioValido, ativo: 'true' })).not.toContain('ativo');
  });
});

describe('Senha mínima é a mesma em todo fluxo que define senha', () => {
  it('redefinição de senha exige os mesmos 8 caracteres da criação', () => {
    // Regressão: `RedefinirSenhaDto` aceitava 6, então dava para contornar o
    // mínimo de 8 da criação usando o fluxo de "esqueci minha senha".
    const base = { token: 'token-valido' };
    expect(camposInvalidos(RedefinirSenhaDto, { ...base, novaSenha: '1234567' })).toContain('novaSenha');
    expect(camposInvalidos(RedefinirSenhaDto, { ...base, novaSenha: '12345678' })).not.toContain('novaSenha');
  });

  it('exige o token de redefinição', () => {
    expect(camposInvalidos(RedefinirSenhaDto, { novaSenha: 'SenhaSegura123' })).toContain('token');
    expect(camposInvalidos(RedefinirSenhaDto, { token: '', novaSenha: 'SenhaSegura123' })).toContain('token');
  });
});

describe('LoginDto', () => {
  it('aceita credencial bem formada', () => {
    expect(camposInvalidos(LoginDto, { email: 'a@b.com', senha: 'qualquer' })).toEqual([]);
  });

  it('não impõe tamanho mínimo à senha de login', () => {
    // Senha curta aqui é credencial errada (401), não requisição malformada
    // (400) — e recusar por tamanho vazaria a política de senha.
    expect(camposInvalidos(LoginDto, { email: 'a@b.com', senha: 'x' })).not.toContain('senha');
  });

  it('recusa e-mail malformado', () => {
    expect(camposInvalidos(LoginDto, { email: 'nao-e-email', senha: 'qualquer' })).toContain('email');
  });
});

describe('RefreshTokenDto', () => {
  const token = 'a'.repeat(64);

  it('aceita exatamente 64 caracteres', () => {
    expect(camposInvalidos(RefreshTokenDto, { refreshToken: token })).toEqual([]);
  });

  it('recusa tamanho diferente de 64', () => {
    expect(camposInvalidos(RefreshTokenDto, { refreshToken: 'a'.repeat(63) })).toContain('refreshToken');
    expect(camposInvalidos(RefreshTokenDto, { refreshToken: 'a'.repeat(65) })).toContain('refreshToken');
  });
});

describe('CreateReservaDto', () => {
  const reservaValida = {
    codigo: 'RES-0001',
    ambienteId: '30000000-0000-4000-8000-000000000003',
    responsavel: 'Ana Solicitante',
    evento: 'Defesa de TCC',
    data: '2026-10-15',
    horarioInicio: '19:00',
    horarioFim: '21:00',
    participantes: 30,
  };

  it('aceita um payload válido', () => {
    expect(camposInvalidos(CreateReservaDto, reservaValida)).toEqual([]);
  });

  it('exige participantes, e pelo menos 1', () => {
    // Campo obrigatório sem `@IsOptional` — foi justamente o que quebrou
    // quando a suíte e2e passou a rodar com o ValidationPipe ativo.
    expect(camposInvalidos(CreateReservaDto, { ...reservaValida, participantes: undefined })).toContain('participantes');
    expect(camposInvalidos(CreateReservaDto, { ...reservaValida, participantes: 0 })).toContain('participantes');
    expect(camposInvalidos(CreateReservaDto, { ...reservaValida, participantes: 1.5 })).toContain('participantes');
  });

  it('exige ambienteId em formato UUID', () => {
    expect(camposInvalidos(CreateReservaDto, { ...reservaValida, ambienteId: 'sala-1' })).toContain('ambienteId');
  });

  it('exige data em formato de data', () => {
    expect(camposInvalidos(CreateReservaDto, { ...reservaValida, data: '15/10/2026' })).toContain('data');
  });
});

describe('Queries de listagem', () => {
  it('PaginacaoQueryDto recusa página e limite fora da faixa', () => {
    expect(camposInvalidos(PaginacaoQueryDto, { pagina: 0 })).toContain('pagina');
    expect(camposInvalidos(PaginacaoQueryDto, { limite: 0 })).toContain('limite');
    expect(camposInvalidos(PaginacaoQueryDto, { limite: 201 })).toContain('limite');
    expect(camposInvalidos(PaginacaoQueryDto, { pagina: 1, limite: 200 })).toEqual([]);
  });

  it('PaginacaoQueryDto converte número vindo como string na query', () => {
    // Query string sempre chega como texto; sem o @Type(() => Number) o
    // @IsInt reprovaria toda requisição paginada.
    const instancia = plainToInstance(PaginacaoQueryDto, { pagina: '2', limite: '10' });
    expect(instancia.pagina).toBe(2);
    expect(instancia.limite).toBe(10);
    expect(camposInvalidos(PaginacaoQueryDto, { pagina: '2', limite: '10' })).toEqual([]);
  });

  it('FindReservasQueryDto valida filtros e herda a paginação', () => {
    expect(camposInvalidos(FindReservasQueryDto, {})).toEqual([]);
    expect(camposInvalidos(FindReservasQueryDto, { status: 'inexistente' })).toContain('status');
    expect(camposInvalidos(FindReservasQueryDto, { status: 'analise' })).toEqual([]);
    expect(camposInvalidos(FindReservasQueryDto, { ambienteId: 'não-uuid' })).toContain('ambienteId');
    expect(camposInvalidos(FindReservasQueryDto, { dataInicio: '01-10-2026' })).toContain('dataInicio');
    expect(camposInvalidos(FindReservasQueryDto, { limite: 500 })).toContain('limite');
  });
});

describe('CreateTicketDto', () => {
  const ticketValido = { titulo: 'Não consigo acessar o portal', descricao: 'A senha não é aceita.' };

  it('aceita um payload mínimo válido', () => {
    expect(camposInvalidos(CreateTicketDto, ticketValido)).toEqual([]);
  });

  it('exige título e descrição', () => {
    expect(camposInvalidos(CreateTicketDto, {})).toEqual(expect.arrayContaining(['titulo', 'descricao']));
    expect(camposInvalidos(CreateTicketDto, { ...ticketValido, titulo: 'x' })).toContain('titulo');
  });

  it('aceita qualquer id de prioridade existente, não só os quatro do seed', () => {
    // Regressão: `@IsIn(['1','2','3','4'])` travava a criação de chamado com
    // qualquer prioridade criada depois do seed.
    expect(camposInvalidos(CreateTicketDto, { ...ticketValido, prioridadeId: '3' })).not.toContain('prioridadeId');
    expect(
      camposInvalidos(CreateTicketDto, { ...ticketValido, prioridadeId: '7f3b1c90-2e4d-4a6b-8c1d-9e0f1a2b3c4d' }),
    ).not.toContain('prioridadeId');
  });

  it('recusa tags que não sejam lista de texto', () => {
    expect(camposInvalidos(CreateTicketDto, { ...ticketValido, tags: 'wifi' })).toContain('tags');
    expect(camposInvalidos(CreateTicketDto, { ...ticketValido, tags: [1, 2] })).toContain('tags');
    expect(camposInvalidos(CreateTicketDto, { ...ticketValido, tags: ['wifi'] })).not.toContain('tags');
  });
});
