import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { rm } from 'node:fs/promises';
import path from 'node:path';
const request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/roster-hub/shared/prisma.service';
import { PrismaTestService } from '../src/roster-hub/shared/prisma-test.service';

describe('Full API e2e tests', () => {
  let app: INestApplication;
  let prisma: PrismaTestService;

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
      prisma.perfilPermissao.deleteMany(),
      prisma.usuarioSetor.deleteMany(),
      prisma.usuarioPerfil.deleteMany(),
      prisma.permissao.deleteMany(),
      prisma.modulo.deleteMany(),
      prisma.perfil.deleteMany(),
      prisma.setor.deleteMany(),
      prisma.usuario.deleteMany(),
    ]);
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
    await rm(path.join(process.cwd(), 'prisma', 'dev-test.db'), { force: true });
  });

  it('Root route should respond with 200', () => {
    return request(app.getHttpServer()).get('/').expect(200);
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
      .send(createUser)
      .expect(201);
    expect(createRes.body.id).toBeDefined();
    expect(createRes.body.email).toBe(createUser.email);

    const userId = createRes.body.id;

    const listRes = await request(app.getHttpServer()).get('/usuarios').expect(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.some((item: any) => item.id === userId)).toBe(true);

    const getRes = await request(app.getHttpServer()).get(`/usuarios/${userId}`).expect(200);
    expect(getRes.body.email).toBe(createUser.email);

    const patchRes = await request(app.getHttpServer())
      .patch(`/usuarios/${userId}`)
      .send({ nome: 'Usuário Atualizado' })
      .expect(200);
    expect(patchRes.body.nome).toBe('Usuário Atualizado');

    const deleteRes = await request(app.getHttpServer()).delete(`/usuarios/${userId}`).expect(200);
    expect(deleteRes.body.id).toBe(userId);
  });

  it('Setores endpoints should create, read, update and delete a setor', async () => {
    const createSetor = { nome: 'Setor Teste', descricao: 'Setor de teste', ativo: true };
    const createRes = await request(app.getHttpServer()).post('/setores').send(createSetor).expect(201);
    expect(createRes.body.id).toBeDefined();
    const setorId = createRes.body.id;

    await request(app.getHttpServer()).get('/setores').expect(200);
    await request(app.getHttpServer()).get(`/setores/${setorId}`).expect(200);
    const patchRes = await request(app.getHttpServer()).patch(`/setores/${setorId}`).send({ nome: 'Setor Alterado' }).expect(200);
    expect(patchRes.body.nome).toBe('Setor Alterado');
    await request(app.getHttpServer()).delete(`/setores/${setorId}`).expect(200);
  });

  it('Perfis endpoints should create, read, update and delete a perfil', async () => {
    const createPerfil = { nome: 'Perfil Teste', descricao: 'Perfil de teste', ativo: true };
    const createRes = await request(app.getHttpServer()).post('/perfis').send(createPerfil).expect(201);
    expect(createRes.body.id).toBeDefined();
    const perfilId = createRes.body.id;

    await request(app.getHttpServer()).get('/perfis').expect(200);
    await request(app.getHttpServer()).get(`/perfis/${perfilId}`).expect(200);
    const patchRes = await request(app.getHttpServer()).patch(`/perfis/${perfilId}`).send({ nome: 'Perfil Alterado' }).expect(200);
    expect(patchRes.body.nome).toBe('Perfil Alterado');
    await request(app.getHttpServer()).delete(`/perfis/${perfilId}`).expect(200);
  });

  it('Modulos endpoints should create, read, update and delete a modulo', async () => {
    const createModulo = { nome: 'Modulo Teste', rota: '/teste', icone: 'icon-test', ativo: true };
    const createRes = await request(app.getHttpServer()).post('/modulos').send(createModulo).expect(201);
    expect(createRes.body.id).toBeDefined();
    const moduloId = createRes.body.id;

    await request(app.getHttpServer()).get('/modulos').expect(200);
    await request(app.getHttpServer()).get(`/modulos/${moduloId}`).expect(200);
    const patchRes = await request(app.getHttpServer()).patch(`/modulos/${moduloId}`).send({ nome: 'Modulo Alterado' }).expect(200);
    expect(patchRes.body.nome).toBe('Modulo Alterado');
    await request(app.getHttpServer()).delete(`/modulos/${moduloId}`).expect(200);
  });

  it('Permissoes endpoints should create, read, update and delete a permissao', async () => {
    const createResModulo = await request(app.getHttpServer())
      .post('/modulos')
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
    const createRes = await request(app.getHttpServer()).post('/permissoes').send(createPermissao).expect(201);
    expect(createRes.body.id).toBeDefined();
    const permissaoId = createRes.body.id;

    await request(app.getHttpServer()).get('/permissoes').expect(200);
    await request(app.getHttpServer()).get(`/permissoes/${permissaoId}`).expect(200);
    const patchRes = await request(app.getHttpServer()).patch(`/permissoes/${permissaoId}`).send({ nome: 'Permissao Alterada' }).expect(200);
    expect(patchRes.body.nome).toBe('Permissao Alterada');
    await request(app.getHttpServer()).delete(`/permissoes/${permissaoId}`).expect(200);
  });

  it('Notificacoes endpoints should create, read, update and delete a notificacao', async () => {
    const createResUser = await request(app.getHttpServer())
      .post('/usuarios')
      .send({ nome: 'Notificacao User', email: 'notificacao@example.com', senhaHash: 'SenhaSegura123' })
      .expect(201);
    const usuarioId = createResUser.body.id;

    const createNotificacao = {
      usuarioId,
      titulo: 'Nova Notificacao',
      mensagem: 'Mensagem de teste',
      lida: false,
    };
    const createRes = await request(app.getHttpServer()).post('/notificacoes').send(createNotificacao).expect(201);
    expect(createRes.body.id).toBeDefined();
    const notificacaoId = createRes.body.id;

    await request(app.getHttpServer()).get('/notificacoes').expect(200);
    await request(app.getHttpServer()).get(`/notificacoes/${notificacaoId}`).expect(200);
    const patchRes = await request(app.getHttpServer()).patch(`/notificacoes/${notificacaoId}`).send({ lida: true }).expect(200);
    expect(patchRes.body.lida).toBe(true);
    await request(app.getHttpServer()).delete(`/notificacoes/${notificacaoId}`).expect(200);
  });

  it('Sessoes endpoints should create, read, update and delete a sessao', async () => {
    const createResUser = await request(app.getHttpServer())
      .post('/usuarios')
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
    const createRes = await request(app.getHttpServer()).post('/sessoes').send(createSessao).expect(201);
    expect(createRes.body.id).toBeDefined();
    const sessaoId = createRes.body.id;

    await request(app.getHttpServer()).get('/sessoes').expect(200);
    await request(app.getHttpServer()).get(`/sessoes/${sessaoId}`).expect(200);
    const patchRes = await request(app.getHttpServer()).patch(`/sessoes/${sessaoId}`).send({ revogada: true }).expect(200);
    expect(patchRes.body.revogada).toBe(true);
    await request(app.getHttpServer()).delete(`/sessoes/${sessaoId}`).expect(200);
  });

  it('Logs auditoria endpoints should create, read, update and delete a log', async () => {
    const createLog = { modulo: 'Auth', acao: 'login', entidade: 'Usuario', entidadeId: '123', ip: '127.0.0.1', navegador: 'Chrome' };
    const createRes = await request(app.getHttpServer()).post('/logs-auditoria').send(createLog).expect(201);
    expect(createRes.body.id).toBeDefined();
    const logId = createRes.body.id;

    await request(app.getHttpServer()).get('/logs-auditoria').expect(200);
    await request(app.getHttpServer()).get(`/logs-auditoria/${logId}`).expect(200);
    const patchRes = await request(app.getHttpServer()).patch(`/logs-auditoria/${logId}`).send({ acao: 'logout' }).expect(200);
    expect(patchRes.body.acao).toBe('logout');
    await request(app.getHttpServer()).delete(`/logs-auditoria/${logId}`).expect(200);
  });

  it('Usuario-perfis and usuario-setores flow should create, read and delete association entities', async () => {
    const userRes = await request(app.getHttpServer())
      .post('/usuarios')
      .send({ nome: 'Assoc User', email: 'assoc.user@example.com', senhaHash: 'SenhaSegura123' })
      .expect(201);
    const perfilRes = await request(app.getHttpServer())
      .post('/perfis')
      .send({ nome: 'Assoc Perfil' })
      .expect(201);
    const setorRes = await request(app.getHttpServer())
      .post('/setores')
      .send({ nome: 'Assoc Setor' })
      .expect(201);

    const usuarioPerfilRes = await request(app.getHttpServer())
      .post('/usuarios-perfis')
      .send({ usuarioId: userRes.body.id, perfilId: perfilRes.body.id })
      .expect(201);
    expect(usuarioPerfilRes.body.id).toBeDefined();
    await request(app.getHttpServer()).get('/usuarios-perfis').expect(200);
    await request(app.getHttpServer()).get(`/usuarios-perfis/${usuarioPerfilRes.body.id}`).expect(200);
    await request(app.getHttpServer()).delete(`/usuarios-perfis/${usuarioPerfilRes.body.id}`).expect(200);

    const usuarioSetorRes = await request(app.getHttpServer())
      .post('/usuarios-setores')
      .send({ usuarioId: userRes.body.id, setorId: setorRes.body.id })
      .expect(201);
    expect(usuarioSetorRes.body.id).toBeDefined();
    await request(app.getHttpServer()).get('/usuarios-setores').expect(200);
    await request(app.getHttpServer()).get(`/usuarios-setores/${usuarioSetorRes.body.id}`).expect(200);
    await request(app.getHttpServer()).delete(`/usuarios-setores/${usuarioSetorRes.body.id}`).expect(200);
  });

  it('Perfil-permissoes flow should create, read and delete a perfil-permissao association', async () => {
    const perfilRes = await request(app.getHttpServer()).post('/perfis').send({ nome: 'PerfilPerm' }).expect(201);
    const moduloRes = await request(app.getHttpServer()).post('/modulos').send({ nome: 'ModuloPerm', ativo: true }).expect(201);
    const permissaoRes = await request(app.getHttpServer()).post('/permissoes').send({ nome: 'PermPerm', moduloId: moduloRes.body.id }).expect(201);

    const perfilPermissaoRes = await request(app.getHttpServer())
      .post('/perfis-permissoes')
      .send({ perfilId: perfilRes.body.id, permissaoId: permissaoRes.body.id })
      .expect(201);
    expect(perfilPermissaoRes.body.id).toBeDefined();
    await request(app.getHttpServer()).get('/perfis-permissoes').expect(200);
    await request(app.getHttpServer()).get(`/perfis-permissoes/${perfilPermissaoRes.body.id}`).expect(200);
    await request(app.getHttpServer()).delete(`/perfis-permissoes/${perfilPermissaoRes.body.id}`).expect(200);
  });

  it('Rooster Desk should create, read, update and delete a ticket flow', async () => {
    const userRes = await request(app.getHttpServer())
      .post('/usuarios')
      .send({ nome: 'Desk User', email: 'desk.user@example.com', senhaHash: 'SenhaSegura123' })
      .expect(201);
    const categoriaRes = await request(app.getHttpServer())
      .post('/categorias-tickets')
      .send({ nome: 'Suporte', descricao: 'Solicitações de suporte' })
      .expect(201);
    const prioridadeRes = await request(app.getHttpServer())
      .post('/prioridades-tickets')
      .send({ nome: 'Alta', cor: '#ef4444' })
      .expect(201);
    const statusRes = await request(app.getHttpServer())
      .post('/status-tickets')
      .send({ nome: 'Aberto', ordem: 1 })
      .expect(201);
    const deskModuleRes = await request(app.getHttpServer())
      .post('/modulos')
      .send({ nome: 'Rooster Desk', rota: '/desk', ativo: true })
      .expect(201);
    const deskPermissionRes = await request(app.getHttpServer())
      .post('/permissoes')
      .send({ nome: 'ticket.view', moduloId: deskModuleRes.body.id, recurso: 'ticket', acao: 'view' })
      .expect(201);
    const deskCreatePermissionRes = await request(app.getHttpServer())
      .post('/permissoes')
      .send({ nome: 'ticket.create', moduloId: deskModuleRes.body.id, recurso: 'ticket', acao: 'create' })
      .expect(201);
    const deskUpdatePermissionRes = await request(app.getHttpServer())
      .post('/permissoes')
      .send({ nome: 'ticket.update', moduloId: deskModuleRes.body.id, recurso: 'ticket', acao: 'update' })
      .expect(201);
    const deskProfileRes = await request(app.getHttpServer())
      .post('/perfis')
      .send({ nome: 'Desk User Profile', ativo: true })
      .expect(201);
    await request(app.getHttpServer())
      .post('/usuarios-perfis')
      .send({ usuarioId: userRes.body.id, perfilId: deskProfileRes.body.id })
      .expect(201);
    for (const permissaoId of [deskPermissionRes.body.id, deskCreatePermissionRes.body.id, deskUpdatePermissionRes.body.id]) {
      await request(app.getHttpServer())
        .post('/perfis-permissoes')
        .send({ perfilId: deskProfileRes.body.id, permissaoId })
        .expect(201);
    }

    const ticketRes = await request(app.getHttpServer())
      .post('/tickets')
      .set('x-user-id', userRes.body.id)
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

    await request(app.getHttpServer()).get('/tickets').set('x-user-id', userRes.body.id).expect(200);
    await request(app.getHttpServer()).get(`/tickets/${ticketId}`).set('x-user-id', userRes.body.id).expect(200);
    const patchRes = await request(app.getHttpServer())
      .patch(`/tickets/${ticketId}`)
      .set('x-user-id', userRes.body.id)
      .send({ titulo: 'Acesso atualizado' })
      .expect(200);
    expect(patchRes.body.titulo).toBe('Acesso atualizado');

    const mensagemRes = await request(app.getHttpServer())
      .post('/mensagens-tickets')
      .send({ ticketId, usuarioId: userRes.body.id, mensagem: 'Estou acompanhando o caso.' })
      .expect(201);
    expect(mensagemRes.body.id).toBeDefined();

    const avaliacaoRes = await request(app.getHttpServer())
      .post('/avaliacoes-tickets')
      .send({ ticketId, usuarioId: userRes.body.id, nota: 5, comentario: 'Atendimento resolvido.' })
      .expect(201);
    expect(avaliacaoRes.body.nota).toBe(5);

    await request(app.getHttpServer()).delete(`/tickets/${ticketId}`).set('x-user-id', userRes.body.id).expect(200);
  });
});
