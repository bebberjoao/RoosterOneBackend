import { ConflictException } from '@nestjs/common';
import { AdministradoresService, PERMISSAO_ADMIN } from './administradores.service';
import type { PrismaService } from './prisma.service';

/**
 * Regra RN035 — a instituição nunca pode ficar sem administrador.
 *
 * Testado com Prisma falso de propósito: o que precisa ser verificado aqui é
 * a *decisão* (quando bloquear, quando deixar passar) e o *formato da
 * consulta* (contar só administrador ativo, e excluir o próprio usuário da
 * contagem de "outros"). O caminho real contra o banco já é coberto pelo e2e.
 */

type PrismaFalso = {
  usuario: { count: jest.Mock };
  permissao: { findUnique: jest.Mock };
};

function criarServico() {
  const prisma: PrismaFalso = {
    usuario: { count: jest.fn() },
    permissao: { findUnique: jest.fn() },
  };
  const service = new AdministradoresService(prisma as unknown as PrismaService);
  return { service, prisma };
}

describe('contarAtivos', () => {
  it('conta somente usuário ativo que tem a permissão de administrador', async () => {
    const { service, prisma } = criarServico();
    prisma.usuario.count.mockResolvedValue(2);

    await service.contarAtivos();

    const where = prisma.usuario.count.mock.calls[0][0].where;
    expect(where.ativo).toBe(true);
    expect(where.permissoes.some.permissao).toMatchObject({
      recurso: PERMISSAO_ADMIN.recurso,
      acao: PERMISSAO_ADMIN.acao,
      modulo: { nome: PERMISSAO_ADMIN.modulo },
    });
  });

  it('exclui o usuário informado da contagem', async () => {
    const { service, prisma } = criarServico();
    prisma.usuario.count.mockResolvedValue(0);

    await service.contarAtivos('u1');

    expect(prisma.usuario.count.mock.calls[0][0].where.id).toEqual({ not: 'u1' });
  });

  it('não filtra por id quando nenhum usuário é excluído', async () => {
    const { service, prisma } = criarServico();
    prisma.usuario.count.mockResolvedValue(1);

    await service.contarAtivos();

    expect(prisma.usuario.count.mock.calls[0][0].where.id).toBeUndefined();
  });
});

describe('permissaoEhDeAdmin', () => {
  it('reconhece a tupla exata que define administrador', async () => {
    const { service, prisma } = criarServico();
    prisma.permissao.findUnique.mockResolvedValue({
      recurso: PERMISSAO_ADMIN.recurso,
      acao: PERMISSAO_ADMIN.acao,
      modulo: { nome: PERMISSAO_ADMIN.modulo },
    });

    await expect(service.permissaoEhDeAdmin('p1')).resolves.toBe(true);
  });

  it('rejeita permissão parecida mas de outro módulo, recurso ou ação', async () => {
    const { service, prisma } = criarServico();

    prisma.permissao.findUnique.mockResolvedValue({
      recurso: PERMISSAO_ADMIN.recurso,
      acao: PERMISSAO_ADMIN.acao,
      modulo: { nome: 'Rooster Desk' },
    });
    await expect(service.permissaoEhDeAdmin('p1')).resolves.toBe(false);

    prisma.permissao.findUnique.mockResolvedValue({
      recurso: '/hub/usuarios',
      acao: PERMISSAO_ADMIN.acao,
      modulo: { nome: PERMISSAO_ADMIN.modulo },
    });
    await expect(service.permissaoEhDeAdmin('p1')).resolves.toBe(false);

    prisma.permissao.findUnique.mockResolvedValue({
      recurso: PERMISSAO_ADMIN.recurso,
      acao: 'acessar',
      modulo: { nome: PERMISSAO_ADMIN.modulo },
    });
    await expect(service.permissaoEhDeAdmin('p1')).resolves.toBe(false);
  });

  it('é falso quando a permissão não existe', async () => {
    const { service, prisma } = criarServico();
    prisma.permissao.findUnique.mockResolvedValue(null);
    await expect(service.permissaoEhDeAdmin('inexistente')).resolves.toBe(false);
  });
});

describe('assertNaoEhUltimoAdministrador', () => {
  it('não bloqueia quem não é administrador ativo', async () => {
    const { service, prisma } = criarServico();
    prisma.usuario.count.mockResolvedValueOnce(0); // ehAdministradorAtivo -> false

    await expect(service.assertNaoEhUltimoAdministrador('u1', 'excluir')).resolves.toBeUndefined();
    // Nem chega a contar os outros: sai antes.
    expect(prisma.usuario.count).toHaveBeenCalledTimes(1);
  });

  it('não bloqueia quando existe outro administrador ativo', async () => {
    const { service, prisma } = criarServico();
    prisma.usuario.count
      .mockResolvedValueOnce(1) // é administrador ativo
      .mockResolvedValueOnce(1); // ainda sobra outro

    await expect(service.assertNaoEhUltimoAdministrador('u1', 'excluir')).resolves.toBeUndefined();
  });

  it('bloqueia quando é o último administrador ativo', async () => {
    const { service, prisma } = criarServico();
    prisma.usuario.count
      .mockResolvedValueOnce(1) // é administrador ativo
      .mockResolvedValueOnce(0); // não sobra mais ninguém

    await expect(service.assertNaoEhUltimoAdministrador('u1', 'excluir este usuário')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('inclui a ação recusada na mensagem, para o erro chegar legível na tela', async () => {
    const { service, prisma } = criarServico();
    prisma.usuario.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

    await expect(
      service.assertNaoEhUltimoAdministrador('u1', 'revogar a permissão de administrador deste usuário'),
    ).rejects.toThrow(/revogar a permissão de administrador deste usuário/);
  });
});
