import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import * as bcrypt from 'bcryptjs';
const request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/roster-hub/shared/prisma.service';
import { PrismaTestService } from '../src/roster-hub/shared/prisma-test.service';

/**
 * Todo endpoint protegido exige `Authorization: Bearer <token>` (JwtAuthGuard
 * global) e, quando marcado com @RequirePermission, a permissão correspondente
 * em usuarios_permissoes. Este arquivo cria um usuário administrador com todas
 * as permissões do catálogo (mesma fonte de verdade usada no seed de
 * desenvolvimento) e usa o token dele nas chamadas autenticadas.
 */
const PERMISSION_CATALOG: Array<[modulo: string, recurso: string, acao: string]> = [
  ['Rooster Hub', '/hub', 'acessar'],
  ['Rooster Hub', '/hub/usuarios', 'acessar'],
  ['Rooster Hub', '/hub/usuarios', 'criar'],
  ['Rooster Hub', '/hub/usuarios', 'editar'],
  ['Rooster Hub', '/hub/usuarios', 'excluir'],
  ['Rooster Hub', '/hub/setores', 'acessar'],
  ['Rooster Hub', '/hub/setores', 'criar'],
  ['Rooster Hub', '/hub/setores', 'editar'],
  ['Rooster Hub', '/hub/setores', 'excluir'],
  ['Rooster Hub', '/hub/setores', 'gerenciar-usuarios'],
  ['Rooster Hub', '/hub/acessos', 'acessar'],
  ['Rooster Hub', '/hub/acessos', 'gerenciar-permissoes'],
  ['Rooster Hub', '/hub/acessos', 'conceder'],
  ['Rooster Hub', '/hub/acessos', 'revogar'],
  ['Rooster Desk', '/desk/tickets', 'acessar'],
  ['Rooster Desk', '/desk/tickets', 'criar'],
  ['Rooster Desk', '/desk/tickets', 'editar'],
  ['Rooster Desk', '/desk/tickets', 'encerrar'],
  ['Rooster Desk', '/desk/tickets', 'reabrir'],
  ['Rooster Desk', '/desk/tickets', 'transferir'],
  ['Rooster Desk', '/desk/tickets', 'anexar'],
  ['Rooster Desk', '/desk/tickets', 'nota-interna'],
  ['Rooster Desk', '/desk/categories', 'criar'],
  ['Rooster Desk', '/desk/categories', 'editar'],
  ['Rooster Desk', '/desk/categories', 'excluir'],
  ['Rooster Desk', '/desk/categories', 'subcategorias'],
  ['Rooster Desk', '/desk/team', 'vincular-categoria'],
  ['Rooster Rooms', '/rooms', 'acessar'],
  ['Rooster Rooms', '/rooms/structure', 'criar'],
  ['Rooster Rooms', '/rooms/structure', 'editar'],
  ['Rooster Rooms', '/rooms/structure', 'excluir'],
  ['Rooster Rooms', '/rooms/book', 'solicitar'],
  ['Rooster Rooms', '/rooms/manage', 'aprovar'],
  ['Rooster Rooms', '/rooms/manage', 'alterar-horario'],
  ['Rooster Rooms', '/rooms/manage', 'cancelar'],
  ['Rooster Assets', '/assets', 'acessar'],
  ['Rooster Assets', '/assets/inventory', 'criar'],
  ['Rooster Assets', '/assets/inventory', 'editar'],
  ['Rooster Assets', '/assets/inventory', 'excluir'],
  ['Rooster Assets', '/assets/inventory', 'gerenciar-categorias'],
  ['Rooster Assets', '/assets/inventory', 'movimentar'],
];

describe('Full API e2e tests', () => {
  let app: INestApplication;
  let prisma: PrismaTestService;
  let authHeader: string;

  async function seedAdminAndLogin() {
    const modulos = new Map<string, { id: string }>();
    for (const [modulo] of PERMISSION_CATALOG) {
      if (!modulos.has(modulo)) {
        modulos.set(modulo, await prisma.modulo.create({ data: { nome: modulo, ativo: true } }));
      }
    }

    const usuario = await prisma.usuario.create({
      data: {
        nome: 'Admin Teste',
        email: 'admin.teste@example.com',
        senhaHash: await bcrypt.hash('Senha123!', 10),
        ativo: true,
      },
    });

    for (const [modulo, recurso, acao] of PERMISSION_CATALOG) {
      const permissao = await prisma.permissao.create({
        data: { moduloId: modulos.get(modulo)!.id, nome: `${modulo}:${recurso}:${acao}`, recurso, acao },
      });
      await prisma.usuarioPermissao.create({ data: { usuarioId: usuario.id, permissaoId: permissao.id } });
    }

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin.teste@example.com', senha: 'Senha123!' })
      .expect(201);
    authHeader = `Bearer ${loginRes.body.accessToken}`;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useClass(PrismaTestService)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    prisma = moduleRef.get(PrismaService) as PrismaTestService;
  });

  beforeEach(async () => {
    await prisma.$transaction([
      prisma.patrimonioMovimento.deleteMany(),
      prisma.patrimonio.deleteMany(),
      prisma.patrimonioCategoria.deleteMany(),
      prisma.patrimonioSetor.deleteMany(),
      prisma.reserva.deleteMany(),
      prisma.ambiente.deleteMany(),
      prisma.bloco.deleteMany(),
      prisma.campus.deleteMany(),
      prisma.avaliacaoTicket.deleteMany(),
      prisma.historicoTicket.deleteMany(),
      prisma.anexoTicket.deleteMany(),
      prisma.mensagemTicket.deleteMany(),
      prisma.ticket.deleteMany(),
      prisma.statusTicket.deleteMany(),
      prisma.prioridadeTicket.deleteMany(),
      prisma.subcategoriaTicket.deleteMany(),
      prisma.categoriaTicket.deleteMany(),
      prisma.logAuditoria.deleteMany(),
      prisma.sessao.deleteMany(),
      prisma.notificacao.deleteMany(),
      prisma.usuarioPermissao.deleteMany(),
      prisma.usuarioSetor.deleteMany(),
      prisma.permissao.deleteMany(),
      prisma.modulo.deleteMany(),
      prisma.setor.deleteMany(),
      prisma.usuario.deleteMany(),
    ]);
    await seedAdminAndLogin();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
    await rm(path.join(process.cwd(), 'prisma', 'dev-test.db'), { force: true });
  });

  it('Root route should respond with 200', () => {
    return request(app.getHttpServer()).get('/').expect(200);
  });

  it('Rejects a protected route without a token', () => {
    return request(app.getHttpServer()).get('/usuarios').expect(401);
  });

  it('Rejects a protected route with a valid token but without the required permission', async () => {
    const semPermissao = await prisma.usuario.create({
      data: { nome: 'Sem Permissao', email: 'sem.permissao@example.com', senhaHash: await bcrypt.hash('Senha123!', 10), ativo: true },
    });
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: semPermissao.email, senha: 'Senha123!' })
      .expect(201);

    await request(app.getHttpServer())
      .get('/usuarios')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
      .expect(403);
  });

  it('Users endpoints should create, read, update and delete a user', async () => {
    const createUser = {
      nome: 'Teste Usuário',
      email: 'teste.usuario@example.com',
      senhaHash: 'SenhaSegura123',
      cpf: '12345678901',
      telefone: '11999999999',
      ativo: true,
    };

    const createRes = await request(app.getHttpServer())
      .post('/usuarios')
      .set('Authorization', authHeader)
      .send(createUser)
      .expect(201);
    expect(createRes.body.id).toBeDefined();
    expect(createRes.body.email).toBe(createUser.email);
    // a senha nunca volta em texto puro
    expect(createRes.body.senhaHash).not.toBe(createUser.senhaHash);

    const userId = createRes.body.id;

    const listRes = await request(app.getHttpServer()).get('/usuarios').set('Authorization', authHeader).expect(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.some((item: any) => item.id === userId)).toBe(true);

    const getRes = await request(app.getHttpServer()).get(`/usuarios/${userId}`).set('Authorization', authHeader).expect(200);
    expect(getRes.body.email).toBe(createUser.email);

    const patchRes = await request(app.getHttpServer())
      .patch(`/usuarios/${userId}`)
      .set('Authorization', authHeader)
      .send({ nome: 'Usuário Atualizado' })
      .expect(200);
    expect(patchRes.body.nome).toBe('Usuário Atualizado');

    // login com a senha original continua funcionando após o hash
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: createUser.email, senha: createUser.senhaHash })
      .expect(201);

    const deleteRes = await request(app.getHttpServer()).delete(`/usuarios/${userId}`).set('Authorization', authHeader).expect(200);
    expect(deleteRes.body.id).toBe(userId);
  });

  it('Setores endpoints should create, read, update and delete a setor', async () => {
    const createSetor = { nome: 'Setor Teste', descricao: 'Setor de teste', ativo: true };
    const createRes = await request(app.getHttpServer()).post('/setores').set('Authorization', authHeader).send(createSetor).expect(201);
    expect(createRes.body.id).toBeDefined();
    const setorId = createRes.body.id;

    await request(app.getHttpServer()).get('/setores').set('Authorization', authHeader).expect(200);
    await request(app.getHttpServer()).get(`/setores/${setorId}`).set('Authorization', authHeader).expect(200);
    const patchRes = await request(app.getHttpServer()).patch(`/setores/${setorId}`).set('Authorization', authHeader).send({ nome: 'Setor Alterado' }).expect(200);
    expect(patchRes.body.nome).toBe('Setor Alterado');
    await request(app.getHttpServer()).delete(`/setores/${setorId}`).set('Authorization', authHeader).expect(200);
  });

  it('Modulos endpoints should create, read, update and delete a modulo', async () => {
    const createModulo = { nome: 'Modulo Teste', rota: '/teste', icone: 'icon-test', ativo: true };
    const createRes = await request(app.getHttpServer()).post('/modulos').set('Authorization', authHeader).send(createModulo).expect(201);
    expect(createRes.body.id).toBeDefined();
    const moduloId = createRes.body.id;

    await request(app.getHttpServer()).get('/modulos').set('Authorization', authHeader).expect(200);
    await request(app.getHttpServer()).get(`/modulos/${moduloId}`).set('Authorization', authHeader).expect(200);
    const patchRes = await request(app.getHttpServer()).patch(`/modulos/${moduloId}`).set('Authorization', authHeader).send({ nome: 'Modulo Alterado' }).expect(200);
    expect(patchRes.body.nome).toBe('Modulo Alterado');
    await request(app.getHttpServer()).delete(`/modulos/${moduloId}`).set('Authorization', authHeader).expect(200);
  });

  it('Permissoes endpoints should create, read, update and delete a permissao', async () => {
    const createResModulo = await request(app.getHttpServer())
      .post('/modulos')
      .set('Authorization', authHeader)
      .send({ nome: 'Modulo Permissao', ativo: true })
      .expect(201);
    const moduloId = createResModulo.body.id;

    const createPermissao = {
      moduloId,
      nome: 'Permissao Teste',
      descricao: 'Descrição',
      recurso: '/recurso',
      acao: 'acao',
    };
    const createRes = await request(app.getHttpServer()).post('/permissoes').set('Authorization', authHeader).send(createPermissao).expect(201);
    expect(createRes.body.id).toBeDefined();
    const permissaoId = createRes.body.id;

    await request(app.getHttpServer()).get('/permissoes').set('Authorization', authHeader).expect(200);
    await request(app.getHttpServer()).get(`/permissoes/${permissaoId}`).set('Authorization', authHeader).expect(200);
    const patchRes = await request(app.getHttpServer()).patch(`/permissoes/${permissaoId}`).set('Authorization', authHeader).send({ nome: 'Permissao Alterada' }).expect(200);
    expect(patchRes.body.nome).toBe('Permissao Alterada');
    await request(app.getHttpServer()).delete(`/permissoes/${permissaoId}`).set('Authorization', authHeader).expect(200);
  });

  it('Notificacoes endpoints should create, read, update and delete a notificacao', async () => {
    const createResUser = await request(app.getHttpServer())
      .post('/usuarios')
      .set('Authorization', authHeader)
      .send({ nome: 'Notificacao User', email: 'notificacao@example.com', senhaHash: 'SenhaSegura123' })
      .expect(201);
    const usuarioId = createResUser.body.id;

    const createNotificacao = { usuarioId, titulo: 'Nova Notificacao', mensagem: 'Mensagem de teste', lida: false };
    const createRes = await request(app.getHttpServer()).post('/notificacoes').set('Authorization', authHeader).send(createNotificacao).expect(201);
    expect(createRes.body.id).toBeDefined();
    const notificacaoId = createRes.body.id;

    await request(app.getHttpServer()).get('/notificacoes').set('Authorization', authHeader).expect(200);
    await request(app.getHttpServer()).get(`/notificacoes/${notificacaoId}`).set('Authorization', authHeader).expect(200);
    const patchRes = await request(app.getHttpServer()).patch(`/notificacoes/${notificacaoId}`).set('Authorization', authHeader).send({ lida: true }).expect(200);
    expect(patchRes.body.lida).toBe(true);
    await request(app.getHttpServer()).delete(`/notificacoes/${notificacaoId}`).set('Authorization', authHeader).expect(200);
  });

  it('Sessoes endpoints should create, read, update and delete a sessao', async () => {
    const createResUser = await request(app.getHttpServer())
      .post('/usuarios')
      .set('Authorization', authHeader)
      .send({ nome: 'Sessao User', email: 'sessao@example.com', senhaHash: 'SenhaSegura123' })
      .expect(201);
    const usuarioId = createResUser.body.id;

    const createSessao = {
      usuarioId,
      refreshToken: 'token123',
      ip: '127.0.0.1',
      navegador: 'Chrome',
      expiraEm: new Date(Date.now() + 3600000).toISOString(),
      revogada: false,
    };
    const createRes = await request(app.getHttpServer()).post('/sessoes').set('Authorization', authHeader).send(createSessao).expect(201);
    expect(createRes.body.id).toBeDefined();
    const sessaoId = createRes.body.id;

    await request(app.getHttpServer()).get('/sessoes').set('Authorization', authHeader).expect(200);
    await request(app.getHttpServer()).get(`/sessoes/${sessaoId}`).set('Authorization', authHeader).expect(200);
    const patchRes = await request(app.getHttpServer()).patch(`/sessoes/${sessaoId}`).set('Authorization', authHeader).send({ revogada: true }).expect(200);
    expect(patchRes.body.revogada).toBe(true);
    await request(app.getHttpServer()).delete(`/sessoes/${sessaoId}`).set('Authorization', authHeader).expect(200);
  });

  it('Logs auditoria endpoints should create, read, update and delete a log', async () => {
    const createLog = { modulo: 'Auth', acao: 'login', entidade: 'Usuario', entidadeId: '123', ip: '127.0.0.1', navegador: 'Chrome' };
    const createRes = await request(app.getHttpServer()).post('/logs-auditoria').set('Authorization', authHeader).send(createLog).expect(201);
    expect(createRes.body.id).toBeDefined();
    const logId = createRes.body.id;

    await request(app.getHttpServer()).get('/logs-auditoria').set('Authorization', authHeader).expect(200);
    await request(app.getHttpServer()).get(`/logs-auditoria/${logId}`).set('Authorization', authHeader).expect(200);
    const patchRes = await request(app.getHttpServer()).patch(`/logs-auditoria/${logId}`).set('Authorization', authHeader).send({ acao: 'logout' }).expect(200);
    expect(patchRes.body.acao).toBe('logout');
    await request(app.getHttpServer()).delete(`/logs-auditoria/${logId}`).set('Authorization', authHeader).expect(200);
  });

  it('Usuarios-setores and usuarios-permissoes flows should create, read and delete association entities', async () => {
    const userRes = await request(app.getHttpServer())
      .post('/usuarios')
      .set('Authorization', authHeader)
      .send({ nome: 'Assoc User', email: 'assoc.user@example.com', senhaHash: 'SenhaSegura123' })
      .expect(201);
    const setorRes = await request(app.getHttpServer()).post('/setores').set('Authorization', authHeader).send({ nome: 'Assoc Setor' }).expect(201);
    const moduloRes = await request(app.getHttpServer()).post('/modulos').set('Authorization', authHeader).send({ nome: 'Assoc Modulo', ativo: true }).expect(201);
    const permissaoRes = await request(app.getHttpServer())
      .post('/permissoes')
      .set('Authorization', authHeader)
      .send({ nome: 'assoc.permissao', moduloId: moduloRes.body.id, recurso: '/assoc', acao: 'acessar' })
      .expect(201);

    const usuarioSetorRes = await request(app.getHttpServer())
      .post('/usuarios-setores')
      .set('Authorization', authHeader)
      .send({ usuarioId: userRes.body.id, setorId: setorRes.body.id })
      .expect(201);
    expect(usuarioSetorRes.body.id).toBeDefined();
    await request(app.getHttpServer()).get('/usuarios-setores').set('Authorization', authHeader).expect(200);
    await request(app.getHttpServer()).get(`/usuarios-setores/${usuarioSetorRes.body.id}`).set('Authorization', authHeader).expect(200);
    await request(app.getHttpServer()).delete(`/usuarios-setores/${usuarioSetorRes.body.id}`).set('Authorization', authHeader).expect(200);

    const usuarioPermissaoRes = await request(app.getHttpServer())
      .post('/usuarios-permissoes')
      .set('Authorization', authHeader)
      .send({ usuarioId: userRes.body.id, permissaoId: permissaoRes.body.id })
      .expect(201);
    expect(usuarioPermissaoRes.body.id).toBeDefined();
    await request(app.getHttpServer()).get('/usuarios-permissoes').set('Authorization', authHeader).expect(200);
    await request(app.getHttpServer()).get(`/usuarios-permissoes/${usuarioPermissaoRes.body.id}`).set('Authorization', authHeader).expect(200);
    await request(app.getHttpServer()).delete(`/usuarios-permissoes/${usuarioPermissaoRes.body.id}`).set('Authorization', authHeader).expect(200);
  });

  it('Rooster Desk should create, read, update and delete a ticket flow', async () => {
    const userRes = await request(app.getHttpServer())
      .post('/usuarios')
      .set('Authorization', authHeader)
      .send({ nome: 'Desk User', email: 'desk.user@example.com', senhaHash: 'SenhaSegura123' })
      .expect(201);
    const setorRes = await request(app.getHttpServer())
      .post('/setores')
      .set('Authorization', authHeader)
      .send({ nome: 'Setor Desk E2E' })
      .expect(201);
    const categoriaRes = await request(app.getHttpServer())
      .post('/categorias-tickets')
      .set('Authorization', authHeader)
      .send({ nome: 'Suporte', descricao: 'Solicitações de suporte', setorId: setorRes.body.id })
      .expect(201);
    const prioridadeRes = await request(app.getHttpServer())
      .post('/prioridades-tickets')
      .set('Authorization', authHeader)
      .send({ nome: 'Alta', cor: '#ef4444' })
      .expect(201);
    const statusRes = await request(app.getHttpServer())
      .post('/status-tickets')
      .set('Authorization', authHeader)
      .send({ nome: 'Aberto', ordem: 1 })
      .expect(201);

    const ticketRes = await request(app.getHttpServer())
      .post('/tickets')
      .set('Authorization', authHeader)
      .send({
        protocolo: 'TCK-000001',
        titulo: 'Não consigo acessar o sistema',
        descricao: 'O acesso retorna erro ao entrar.',
        usuarioId: userRes.body.id,
        categoriaId: categoriaRes.body.id,
        prioridadeId: prioridadeRes.body.id,
        statusId: statusRes.body.id,
      })
      .expect(201);
    const ticketId = ticketRes.body.id;
    expect(ticketRes.body.protocolo).toBe('TCK-000001');

    await request(app.getHttpServer()).get('/tickets').set('Authorization', authHeader).expect(200);
    await request(app.getHttpServer()).get(`/tickets/${ticketId}`).set('Authorization', authHeader).expect(200);
    const patchRes = await request(app.getHttpServer())
      .patch(`/tickets/${ticketId}`)
      .set('Authorization', authHeader)
      .send({ titulo: 'Acesso atualizado' })
      .expect(200);
    expect(patchRes.body.titulo).toBe('Acesso atualizado');

    const mensagemRes = await request(app.getHttpServer())
      .post(`/chamados/${ticketId}/mensagens`)
      .set('Authorization', authHeader)
      .send({ mensagem: 'Estou acompanhando o caso.' })
      .expect(201);
    expect(mensagemRes.body.id).toBeDefined();

    const avaliacaoRes = await request(app.getHttpServer())
      .post('/avaliacoes-tickets')
      .set('Authorization', authHeader)
      .send({ ticketId, usuarioId: userRes.body.id, nota: 5, comentario: 'Atendimento resolvido.' })
      .expect(201);
    expect(avaliacaoRes.body.nota).toBe(5);

    await request(app.getHttpServer()).delete(`/tickets/${ticketId}`).set('Authorization', authHeader).expect(200);
  });

  it('Rooster Rooms should create structure, request and approve a reservation', async () => {
    const campusRes = await request(app.getHttpServer())
      .post('/campus')
      .set('Authorization', authHeader)
      .send({ nome: 'Campus E2E', codigo: 'E2E' })
      .expect(201);
    const blocoRes = await request(app.getHttpServer())
      .post('/blocos')
      .set('Authorization', authHeader)
      .send({ campusId: campusRes.body.id, nome: 'Bloco E2E', codigo: 'B1' })
      .expect(201);
    const ambienteRes = await request(app.getHttpServer())
      .post('/ambientes')
      .set('Authorization', authHeader)
      .send({ campusId: campusRes.body.id, blocoId: blocoRes.body.id, nome: 'Sala E2E', codigo: 'S-E2E', andar: 1, tipo: 'sala', capacidade: 10 })
      .expect(201);

    const reservaRes = await request(app.getHttpServer())
      .post('/reservas')
      .set('Authorization', authHeader)
      .send({
        codigo: 'RES-E2E-0001',
        ambienteId: ambienteRes.body.id,
        responsavel: 'Solicitante E2E',
        evento: 'Reunião de teste',
        data: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        horarioInicio: '10:00',
        horarioFim: '11:00',
      })
      .expect(201);
    expect(reservaRes.body.status).toBe('analise');

    const statusRes = await request(app.getHttpServer())
      .patch(`/reservas/${reservaRes.body.id}/status`)
      .set('Authorization', authHeader)
      .send({ status: 'confirmada' })
      .expect(200);
    expect(statusRes.body.status).toBe('confirmada');
  });

  it('Rooster Assets should register an asset and a movement', async () => {
    const categoriaRes = await request(app.getHttpServer())
      .post('/patrimonio-categorias')
      .set('Authorization', authHeader)
      .send({ nome: 'Categoria E2E' })
      .expect(201);
    const setorRes = await request(app.getHttpServer())
      .post('/patrimonio-setores')
      .set('Authorization', authHeader)
      .send({ nome: 'Setor Patrimonio E2E' })
      .expect(201);
    const assetRes = await request(app.getHttpServer())
      .post('/patrimonio')
      .set('Authorization', authHeader)
      .send({ nome: 'Notebook E2E', tag: 'PAT-E2E-0001', categoriaId: categoriaRes.body.id, setorId: setorRes.body.id })
      .expect(201);

    const movimentoRes = await request(app.getHttpServer())
      .post('/patrimonio-movimentacoes')
      .set('Authorization', authHeader)
      .send({ patrimonioId: assetRes.body.id, tipo: 'setor', destino: 'Outro setor', usuario: 'Admin Teste' })
      .expect(201);
    expect(movimentoRes.body.movimentacao.id).toBeDefined();

    await request(app.getHttpServer()).get('/patrimonio').set('Authorization', authHeader).expect(200);
  });
});
