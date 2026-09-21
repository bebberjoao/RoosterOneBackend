import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import * as bcrypt from 'bcryptjs';
const request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/roster-hub/shared/prisma.service';
import { PrismaTestService } from '../src/roster-hub/shared/prisma-test.service';
import { MailService } from '../src/mail/mail.service';

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
  ['Rooster Rooms', '/rooms/manage', 'responder'],
  ['Rooster Rooms', '/rooms/manage', 'alterar-horario'],
  ['Rooster Rooms', '/rooms/manage', 'cancelar'],
  ['Rooster Rooms', '/rooms/reservations', 'mensagem'],
  ['Rooster Assets', '/assets', 'acessar'],
  ['Rooster Assets', '/assets/inventory', 'criar'],
  ['Rooster Assets', '/assets/inventory', 'editar'],
  ['Rooster Assets', '/assets/inventory', 'excluir'],
  ['Rooster Assets', '/assets/inventory', 'gerenciar-categorias'],
  ['Rooster Assets', '/assets/inventory', 'movimentar'],
  ['Rooster Academy', '/academy', 'acessar'],
  ['Rooster Academy', '/academy/manage', 'acessar'],
  ['Rooster Academy', '/academy/manage', 'gerenciar-cursos'],
  ['Rooster Academy', '/academy/manage', 'gerenciar-disciplinas'],
  ['Rooster Academy', '/academy/manage', 'gerenciar-turmas'],
  ['Rooster Academy', '/academy/manage', 'gerenciar-professores'],
  ['Rooster Academy', '/academy/manage', 'gerenciar-alunos'],
  ['Rooster Academy', '/academy/manage', 'gerenciar-calendario'],
  ['Rooster Academy', '/academy/manage', 'matricular'],
  ['Rooster Academy', '/academy/attendance', 'acessar'],
  ['Rooster Academy', '/academy/attendance', 'registrar-chamada'],
  ['Rooster Academy', '/academy/attendance', 'editar-chamada'],
  ['Rooster Academy', '/academy/grades', 'acessar'],
  ['Rooster Academy', '/academy/grades', 'lancar-notas'],
  ['Rooster Academy', '/academy/grades', 'configurar-pesos'],
  ['Rooster Learn', '/learn', 'acessar'],
  ['Rooster Learn', '/learn/classes', 'acessar'],
  ['Rooster Learn', '/learn/classes', 'criar-atividade'],
  ['Rooster Learn', '/learn/classes', 'corrigir'],
  ['Rooster Learn', '/learn/classes', 'excluir'],
  ['Rooster Learn', '/learn/classes', 'gerenciar-turmas'],
  ['Rooster Learn', '/learn/student', 'acessar'],
  ['Rooster Learn', '/learn/student', 'responder'],
  ['Rooster Learn', '/learn/student', 'anexar'],
  ['Rooster Student', '/student', 'acessar'],
  ['Rooster Student', '/student/disciplines', 'acessar'],
  ['Rooster Student', '/student/attendance', 'acessar'],
  ['Rooster Student', '/student/grades', 'acessar'],
  ['Rooster Student', '/student/history', 'acessar'],
  ['Rooster Student', '/student/documents', 'acessar'],
  ['Rooster Student', '/student/documents', 'enviar'],
  ['Rooster Student', '/student/finance', 'acessar'],
  ['Rooster Student', '/student/finance', 'baixar-boleto'],
  ['Rooster Finance', '/finance', 'acessar'],
  ['Rooster Finance', '/finance/charges', 'acessar'],
  ['Rooster Finance', '/finance/charges', 'criar'],
  ['Rooster Finance', '/finance/charges', 'marcar-pago'],
  ['Rooster Finance', '/finance/charges', 'negociar'],
  ['Rooster Finance', '/finance/charges', 'cancelar'],
  ['Rooster Finance', '/finance/charges', 'exportar'],
  ['Rooster Finance', '/finance/tuitions', 'acessar'],
  ['Rooster Finance', '/finance/tuitions', 'gerar-lote'],
  ['Rooster Finance', '/finance/tuitions', 'editar'],
  ['Rooster Finance', '/finance/boletos', 'acessar'],
  ['Rooster Finance', '/finance/boletos', 'emitir'],
  ['Rooster Finance', '/finance/boletos', 'baixar'],
  ['Rooster Finance', '/finance/products', 'acessar'],
  ['Rooster Finance', '/finance/products', 'criar'],
  ['Rooster Finance', '/finance/products', 'editar'],
  ['Rooster Finance', '/finance/products', 'excluir'],
  ['Rooster Finance', '/finance/services', 'acessar'],
  ['Rooster Finance', '/finance/services', 'criar'],
  ['Rooster Finance', '/finance/services', 'editar'],
  ['Rooster Finance', '/finance/services', 'excluir'],
  ['Rooster Finance', '/finance/nfe', 'acessar'],
  ['Rooster Finance', '/finance/nfe', 'emitir'],
  ['Rooster Finance', '/finance/nfe', 'exportar-xml'],
  ['Rooster Finance', '/finance/reports', 'acessar'],
  ['Rooster Finance', '/finance/reports', 'exportar'],
  ['Rooster Finance', '/finance/discounts', 'acessar'],
  ['Rooster Finance', '/finance/discounts', 'criar'],
  ['Rooster Finance', '/finance/discounts', 'editar'],
  ['Rooster Finance', '/finance/discounts', 'excluir'],
  ['Rooster Boost', '/boost', 'acessar'],
  ['Rooster Boost', '/boost/manage', 'acessar'],
  ['Rooster Boost', '/boost/manage', 'gerenciar-cursos'],
  ['Rooster Boost', '/boost/manage', 'gerenciar-conteudo'],
  ['Rooster Boost', '/boost/manage', 'ver-progresso'],
  ['Rooster Boost', '/boost/manage', 'mensagem'],
];

describe('Full API e2e tests', () => {
  let app: INestApplication;
  let prisma: PrismaTestService;
  let mail: MailService;
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

  /** Cria um usuário com um subconjunto específico de permissões (para testar escopo, não admin). */
  async function criarUsuarioComPermissoes(nome: string, email: string, keys: Array<[modulo: string, recurso: string, acao: string]>) {
    const usuario = await prisma.usuario.create({
      data: { nome, email, senhaHash: await bcrypt.hash('Senha123!', 10), ativo: true },
    });
    for (const [modulo, recurso, acao] of keys) {
      const moduloRow = (await prisma.modulo.findFirst({ where: { nome: modulo } })) ?? (await prisma.modulo.create({ data: { nome: modulo, ativo: true } }));
      const permissao = await prisma.permissao.create({
        data: { moduloId: moduloRow.id, nome: `${modulo}:${recurso}:${acao}:${usuario.id}`, recurso, acao },
      });
      await prisma.usuarioPermissao.create({ data: { usuarioId: usuario.id, permissaoId: permissao.id } });
    }
    const loginRes = await request(app.getHttpServer()).post('/auth/login').send({ email, senha: 'Senha123!' }).expect(201);
    return { usuario, header: `Bearer ${loginRes.body.accessToken}` };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useClass(PrismaTestService)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    prisma = moduleRef.get(PrismaService) as PrismaTestService;
    mail = moduleRef.get(MailService);
  });

  beforeEach(async () => {
    await prisma.$transaction([
      prisma.notaFiscal.deleteMany(),
      prisma.cobranca.deleteMany(),
      prisma.descontoAluno.deleteMany(),
      prisma.desconto.deleteMany(),
      prisma.servico.deleteMany(),
      prisma.produto.deleteMany(),
      prisma.certificadoBoost.deleteMany(),
      prisma.progressoAula.deleteMany(),
      prisma.mensagemBoost.deleteMany(),
      prisma.matriculaBoost.deleteMany(),
      prisma.materialApoio.deleteMany(),
      prisma.aulaBoost.deleteMany(),
      prisma.moduloBoost.deleteMany(),
      prisma.cursoBoost.deleteMany(),
      prisma.boostUsuario.deleteMany(),
      prisma.anexoEntrega.deleteMany(),
      prisma.entrega.deleteMany(),
      prisma.atividade.deleteMany(),
      prisma.nota.deleteMany(),
      prisma.itemAvaliativo.deleteMany(),
      prisma.registroFrequencia.deleteMany(),
      prisma.matricula.deleteMany(),
      prisma.documentoAcademico.deleteMany(),
      prisma.eventoCalendarioAcademico.deleteMany(),
      prisma.turma.deleteMany(),
      prisma.disciplina.deleteMany(),
      prisma.professor.deleteMany(),
      prisma.aluno.deleteMany(),
      prisma.periodoLetivo.deleteMany(),
      prisma.curso.deleteMany(),
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
    mail.outbox.length = 0;
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

    const anexoRes = await request(app.getHttpServer())
      .post(`/chamados/${ticketId}/anexos`)
      .set('Authorization', authHeader)
      .attach('arquivo', Buffer.from('conteúdo de teste'), 'evidencia.txt')
      .expect(201);
    expect(anexoRes.body.nomeArquivo).toBe('evidencia.txt');
    expect(typeof anexoRes.body.tamanho).toBe('number'); // BigInt no schema — precisa vir serializado como number

    const anexosListRes = await request(app.getHttpServer())
      .get(`/chamados/${ticketId}/anexos`)
      .set('Authorization', authHeader)
      .expect(200);
    expect(anexosListRes.body.some((a: any) => a.id === anexoRes.body.id)).toBe(true);

    const downloadRes = await request(app.getHttpServer())
      .get(`/chamados/${ticketId}/anexos/${anexoRes.body.id}/arquivo`)
      .set('Authorization', authHeader)
      .expect(200);
    expect(downloadRes.text).toBe('conteúdo de teste');

    const ticketComAnexoRes = await request(app.getHttpServer())
      .get(`/chamados/${ticketId}`)
      .set('Authorization', authHeader)
      .expect(200);
    expect(ticketComAnexoRes.body.anexos.some((a: any) => a.id === anexoRes.body.id)).toBe(true);

    const statusEncerradoRes = await request(app.getHttpServer())
      .post('/status-tickets')
      .set('Authorization', authHeader)
      .send({ nome: 'Encerrado', ordem: 2, encerrado: true })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/chamados/${ticketId}/status`)
      .set('Authorization', authHeader)
      .send({ statusId: statusEncerradoRes.body.id })
      .expect(200);

    const ticketDetalheRes = await request(app.getHttpServer())
      .get(`/chamados/${ticketId}`)
      .set('Authorization', authHeader)
      .expect(200);
    expect(ticketDetalheRes.body.historico.some((h: any) => h.campo === 'status' && h.valorNovo === 'Encerrado')).toBe(true);
    // encerradoEm é derivado da transição de status, não depende do cliente mandar a data
    expect(ticketDetalheRes.body.encerradoEm).not.toBeNull();

    const statusReabertoRes = await request(app.getHttpServer())
      .post('/status-tickets')
      .set('Authorization', authHeader)
      .send({ nome: 'Em atendimento (reaberto)', ordem: 3, encerrado: false })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/chamados/${ticketId}/status`)
      .set('Authorization', authHeader)
      .send({ statusId: statusReabertoRes.body.id })
      .expect(200);
    const ticketReabertoRes = await request(app.getHttpServer())
      .get(`/chamados/${ticketId}`)
      .set('Authorization', authHeader)
      .expect(200);
    expect(ticketReabertoRes.body.encerradoEm).toBeNull();

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

    const mensagemRes = await request(app.getHttpServer())
      .post(`/reservas/${reservaRes.body.id}/mensagens`)
      .set('Authorization', authHeader)
      .send({ mensagem: 'Sala liberada para o evento.' })
      .expect(201);
    expect(mensagemRes.body.mensagem).toBe('Sala liberada para o evento.');

    const mensagensListRes = await request(app.getHttpServer())
      .get(`/reservas/${reservaRes.body.id}/mensagens`)
      .set('Authorization', authHeader)
      .expect(200);
    expect(mensagensListRes.body.length).toBe(1);

    const canceladaRes = await request(app.getHttpServer())
      .patch(`/reservas/${reservaRes.body.id}/status`)
      .set('Authorization', authHeader)
      .send({ status: 'cancelada', motivo: 'Evento adiado' })
      .expect(200);
    expect(canceladaRes.body.motivoCancelamento).toBe('Evento adiado');

    const reservaDetalheRes = await request(app.getHttpServer())
      .get(`/reservas/${reservaRes.body.id}`)
      .set('Authorization', authHeader)
      .expect(200);
    expect(reservaDetalheRes.body.historico.some((h: any) => h.campo === 'status' && h.valorNovo === 'cancelada')).toBe(true);
  });

  it('Rooster Rooms recurring series: generates occurrences, rejects on conflict atomically, cancels in bulk', async () => {
    const campusRes = await request(app.getHttpServer())
      .post('/campus')
      .set('Authorization', authHeader)
      .send({ nome: 'Campus Série E2E', codigo: 'SER' })
      .expect(201);
    const blocoRes = await request(app.getHttpServer())
      .post('/blocos')
      .set('Authorization', authHeader)
      .send({ campusId: campusRes.body.id, nome: 'Bloco Série E2E', codigo: 'B1' })
      .expect(201);
    const ambienteRes = await request(app.getHttpServer())
      .post('/ambientes')
      .set('Authorization', authHeader)
      .send({ campusId: campusRes.body.id, blocoId: blocoRes.body.id, nome: 'Sala Série E2E', codigo: 'S-SER', andar: 1, tipo: 'sala', capacidade: 10 })
      .expect(201);

    const primeiraData = new Date(Date.now() + 7 * 86400000);
    const repetirAte = new Date(primeiraData.getTime() + 21 * 86400000); // +3 semanas = 4 ocorrências

    const serieRes = await request(app.getHttpServer())
      .post('/reservas/serie')
      .set('Authorization', authHeader)
      .send({
        codigo: 'RES-SERIE-E2E',
        ambienteId: ambienteRes.body.id,
        responsavel: 'Solicitante Série E2E',
        evento: 'Aula recorrente E2E',
        data: primeiraData.toISOString().slice(0, 10),
        horarioInicio: '10:00',
        horarioFim: '11:00',
        recorrencia: 'semanal',
        repetirAte: repetirAte.toISOString().slice(0, 10),
      })
      .expect(201);
    expect(serieRes.body.reservas.length).toBe(4);
    expect(serieRes.body.reservas.every((r: any) => r.serieId === serieRes.body.serieId)).toBe(true);
    const serieId = serieRes.body.serieId;

    // colide com a 2ª ocorrência (mesmo horário, mesma sala) -> a série inteira deve ser rejeitada, nada criado
    await request(app.getHttpServer())
      .post('/reservas/serie')
      .set('Authorization', authHeader)
      .send({
        codigo: 'RES-SERIE-CONFLITO-E2E',
        ambienteId: ambienteRes.body.id,
        responsavel: 'Conflito E2E',
        evento: 'Colide',
        data: primeiraData.toISOString().slice(0, 10),
        horarioInicio: '10:30',
        horarioFim: '11:30',
        recorrencia: 'semanal',
        repetirAte: repetirAte.toISOString().slice(0, 10),
      })
      .expect(409);

    const listaRes = await request(app.getHttpServer())
      .get(`/reservas/serie/${serieId}`)
      .set('Authorization', authHeader)
      .expect(200);
    expect(listaRes.body.length).toBe(4);
    expect(listaRes.body.some((r: any) => r.codigo === 'RES-SERIE-CONFLITO-E2E')).toBe(false);

    const cancelRes = await request(app.getHttpServer())
      .patch(`/reservas/serie/${serieId}/cancelar`)
      .set('Authorization', authHeader)
      .send({ motivo: 'Cancelamento em massa E2E' })
      .expect(200);
    expect(cancelRes.body.canceladas).toBe(4);

    const listaCanceladaRes = await request(app.getHttpServer())
      .get(`/reservas/serie/${serieId}`)
      .set('Authorization', authHeader)
      .expect(200);
    expect(listaCanceladaRes.body.every((r: any) => r.status === 'cancelada')).toBe(true);
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

  it('Asset loans: overdue tracking and return flow', async () => {
    const categoriaRes = await request(app.getHttpServer())
      .post('/patrimonio-categorias')
      .set('Authorization', authHeader)
      .send({ nome: 'Categoria Empréstimo E2E' })
      .expect(201);
    const assetRes = await request(app.getHttpServer())
      .post('/patrimonio')
      .set('Authorization', authHeader)
      .send({ nome: 'Projetor E2E', tag: 'PAT-E2E-EMP', categoriaId: categoriaRes.body.id })
      .expect(201);

    const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const emprestimoRes = await request(app.getHttpServer())
      .post('/patrimonio-movimentacoes')
      .set('Authorization', authHeader)
      .send({ patrimonioId: assetRes.body.id, tipo: 'emprestimo', destino: 'Prof. E2E', usuario: 'Admin Teste', dataDevolucaoPrevista: ontem })
      .expect(201);
    expect(emprestimoRes.body.patrimonio.status).toBe('emprestado');
    const movimentoId = emprestimoRes.body.movimentacao.id;

    const atrasadosRes = await request(app.getHttpServer())
      .get('/patrimonio-emprestimos-atrasados')
      .set('Authorization', authHeader)
      .expect(200);
    expect(atrasadosRes.body.some((m: any) => m.id === movimentoId)).toBe(true);

    const devolverRes = await request(app.getHttpServer())
      .patch(`/patrimonio-movimentacoes/${movimentoId}/devolver`)
      .set('Authorization', authHeader)
      .send({ usuario: 'Admin Teste' })
      .expect(200);
    expect(devolverRes.body.status).toBe('disponivel');

    const atrasadosDepoisRes = await request(app.getHttpServer())
      .get('/patrimonio-emprestimos-atrasados')
      .set('Authorization', authHeader)
      .expect(200);
    expect(atrasadosDepoisRes.body.some((m: any) => m.id === movimentoId)).toBe(false);

    await request(app.getHttpServer())
      .patch(`/patrimonio-movimentacoes/${movimentoId}/devolver`)
      .set('Authorization', authHeader)
      .send({ usuario: 'Admin Teste' })
      .expect(400);
  });

  it('Password reset via email: request, consume token, old password stops working, token cannot be reused', async () => {
    // e-mail inexistente: mesma resposta genérica, sem 404 e sem enviar e-mail
    await request(app.getHttpServer())
      .post('/auth/esqueci-senha')
      .send({ email: 'nao.existe@example.com' })
      .expect(201);
    expect(mail.outbox.length).toBe(0);

    await request(app.getHttpServer())
      .post('/auth/esqueci-senha')
      .send({ email: 'admin.teste@example.com' })
      .expect(201);
    expect(mail.outbox.length).toBe(1);

    const link = mail.outbox[0].html.match(/href="([^"]+)"/)?.[1];
    expect(link).toBeDefined();
    const token = new URL(link!).searchParams.get('token');
    expect(token).toBeTruthy();

    await request(app.getHttpServer())
      .post('/auth/redefinir-senha')
      .send({ token: 'token-invalido', novaSenha: 'NovaSenha789' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/auth/redefinir-senha')
      .send({ token, novaSenha: 'NovaSenha789' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin.teste@example.com', senha: 'Senha123!' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin.teste@example.com', senha: 'NovaSenha789' })
      .expect(201);

    // token já usado não pode ser reaproveitado
    await request(app.getHttpServer())
      .post('/auth/redefinir-senha')
      .send({ token, novaSenha: 'OutraSenha999' })
      .expect(400);
  });

  it('Security-relevant events are written automatically to LogAuditoria', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin.teste@example.com', senha: 'senha-errada' })
      .expect(401);

    const logsRes = await request(app.getHttpServer()).get('/logs-auditoria').set('Authorization', authHeader).expect(200);
    const acoes = logsRes.body.map((log: any) => log.acao);
    expect(acoes).toContain('login_sucesso'); // do beforeEach (seedAdminAndLogin)
    expect(acoes).toContain('login_falhou');
  });

  describe('Rooster Academy + Rooster Learn', () => {
    const ACADEMY_COORDENADOR_KEYS: Array<[string, string, string]> = [
      ['Rooster Academy', '/academy', 'acessar'],
      ['Rooster Academy', '/academy/manage', 'acessar'],
      ['Rooster Academy', '/academy/manage', 'gerenciar-cursos'],
      ['Rooster Academy', '/academy/manage', 'gerenciar-disciplinas'],
      ['Rooster Academy', '/academy/manage', 'gerenciar-turmas'],
      ['Rooster Academy', '/academy/manage', 'gerenciar-professores'],
      ['Rooster Academy', '/academy/manage', 'gerenciar-alunos'],
      ['Rooster Academy', '/academy/manage', 'matricular'],
    ];
    const ACADEMY_PROFESSOR_KEYS: Array<[string, string, string]> = [
      ['Rooster Academy', '/academy', 'acessar'],
      ['Rooster Academy', '/academy/attendance', 'acessar'],
      ['Rooster Academy', '/academy/attendance', 'registrar-chamada'],
      ['Rooster Academy', '/academy/grades', 'acessar'],
      ['Rooster Academy', '/academy/grades', 'lancar-notas'],
      ['Rooster Academy', '/academy/grades', 'configurar-pesos'],
      ['Rooster Learn', '/learn/classes', 'acessar'],
      ['Rooster Learn', '/learn/classes', 'criar-atividade'],
      ['Rooster Learn', '/learn/classes', 'corrigir'],
    ];
    const ALUNO_KEYS: Array<[string, string, string]> = [
      ['Rooster Student', '/student', 'acessar'],
      ['Rooster Student', '/student/disciplines', 'acessar'],
      ['Rooster Student', '/student/attendance', 'acessar'],
      ['Rooster Student', '/student/grades', 'acessar'],
      ['Rooster Learn', '/learn/student', 'acessar'],
      ['Rooster Learn', '/learn/student', 'responder'],
      ['Rooster Learn', '/learn/student', 'anexar'],
    ];

    /** Monta curso + período + disciplina + 2 turmas (cada uma com seu professor) + 2 alunos, cada um matriculado em uma turma diferente. */
    async function montarCenarioAcademico() {
      const coordenador = await criarUsuarioComPermissoes('Coordenadora Teste', 'coordenacao.teste@example.com', ACADEMY_COORDENADOR_KEYS);
      const profLimaUsuario = await criarUsuarioComPermissoes('Prof. Lima Teste', 'lima.teste@example.com', ACADEMY_PROFESSOR_KEYS);
      const profCostaUsuario = await criarUsuarioComPermissoes('Profa. Costa Teste', 'costa.teste@example.com', ACADEMY_PROFESSOR_KEYS);
      const alunoJoaoUsuario = await criarUsuarioComPermissoes('João Teste', 'joao.teste@example.com', ALUNO_KEYS);
      const alunoMariaUsuario = await criarUsuarioComPermissoes('Maria Teste', 'maria.teste@example.com', ALUNO_KEYS);

      const curso = await prisma.curso.create({ data: { nome: 'Engenharia de Software', codigo: 'ENGSOFT-T', grau: 'Graduação', ativo: true } });
      const periodo = await prisma.periodoLetivo.create({ data: { nome: '2026.2-T', dataInicio: new Date('2026-08-01'), dataFim: new Date('2026-12-01'), ativo: true } });
      const disciplinaAlg = await prisma.disciplina.create({ data: { codigo: 'ALG-T', nome: 'Algoritmos', cursoId: curso.id, cargaHoraria: 80 } });
      const disciplinaBd = await prisma.disciplina.create({ data: { codigo: 'BD-T', nome: 'Banco de Dados', cursoId: curso.id, cargaHoraria: 60 } });

      const professorLima = await prisma.professor.create({ data: { usuarioId: profLimaUsuario.usuario.id } });
      const professorCosta = await prisma.professor.create({ data: { usuarioId: profCostaUsuario.usuario.id } });
      const alunoJoao = await prisma.aluno.create({ data: { usuarioId: alunoJoaoUsuario.usuario.id, ra: 'T0001', cursoId: curso.id } });
      const alunoMaria = await prisma.aluno.create({ data: { usuarioId: alunoMariaUsuario.usuario.id, ra: 'T0002', cursoId: curso.id } });

      const turmaAlg = await prisma.turma.create({ data: { codigo: 'ALG-T-A', disciplinaId: disciplinaAlg.id, periodoLetivoId: periodo.id, professorId: professorLima.id, capacidade: 30 } });
      const turmaBd = await prisma.turma.create({ data: { codigo: 'BD-T-A', disciplinaId: disciplinaBd.id, periodoLetivoId: periodo.id, professorId: professorCosta.id, capacidade: 30 } });

      await prisma.matricula.create({ data: { alunoId: alunoJoao.id, turmaId: turmaAlg.id, status: 'ativa' } });
      await prisma.matricula.create({ data: { alunoId: alunoMaria.id, turmaId: turmaBd.id, status: 'ativa' } });

      return { coordenador, profLima: profLimaUsuario, profCosta: profCostaUsuario, alunoJoao: alunoJoaoUsuario, alunoMaria: alunoMariaUsuario, curso, periodo, disciplinaAlg, disciplinaBd, professorLima, professorCosta, alunoJoaoAcademico: alunoJoao, alunoMariaAcademico: alunoMaria, turmaAlg, turmaBd };
    }

    it('Coordenação constrói a hierarquia completa (curso, período, disciplina, professor, aluno, turma, matrícula)', async () => {
      const cenario = await montarCenarioAcademico();

      const turmaDetalhe = await request(app.getHttpServer())
        .get(`/turmas/${cenario.turmaAlg.id}`)
        .set('Authorization', cenario.coordenador.header)
        .expect(200);
      expect(turmaDetalhe.body.disciplina.nome).toBe('Algoritmos');
      expect(turmaDetalhe.body.matriculas).toHaveLength(1);

      const matriculasRes = await request(app.getHttpServer())
        .get(`/turmas/${cenario.turmaAlg.id}/matriculas`)
        .set('Authorization', cenario.coordenador.header)
        .expect(200);
      expect(matriculasRes.body[0].aluno.usuario.nome).toBe('João Teste');
    });

    it('Documento acadêmico: upload, listagem, download e remoção respondem com o tamanho (BigInt) serializado corretamente', async () => {
      const cenario = await montarCenarioAcademico();

      const uploadRes = await request(app.getHttpServer())
        .post('/documentos-academicos')
        .set('Authorization', cenario.coordenador.header)
        .field('tipo', 'plano-de-ensino')
        .field('disciplinaId', cenario.disciplinaAlg.id)
        .attach('arquivo', Buffer.from('conteúdo de teste'), 'plano.txt')
        .expect(201);
      expect(uploadRes.body.nome).toBe('plano.txt');
      expect(typeof uploadRes.body.tamanho).toBe('number');

      const listRes = await request(app.getHttpServer())
        .get(`/documentos-academicos?disciplinaId=${cenario.disciplinaAlg.id}`)
        .set('Authorization', cenario.coordenador.header)
        .expect(200);
      expect(listRes.body.some((d: any) => d.id === uploadRes.body.id)).toBe(true);

      const downloadRes = await request(app.getHttpServer())
        .get(`/documentos-academicos/${uploadRes.body.id}/arquivo`)
        .set('Authorization', cenario.coordenador.header)
        .expect(200);
      expect(downloadRes.text).toBe('conteúdo de teste');

      await request(app.getHttpServer())
        .delete(`/documentos-academicos/${uploadRes.body.id}`)
        .set('Authorization', cenario.coordenador.header)
        .expect(200);
    });

    it('Professor só acessa/gerencia a própria turma — 403 na turma de outro professor', async () => {
      const cenario = await montarCenarioAcademico();

      // dono: acessa e registra chamada normalmente
      await request(app.getHttpServer()).get(`/turmas/${cenario.turmaAlg.id}`).set('Authorization', cenario.profLima.header).expect(200);
      await request(app.getHttpServer())
        .post(`/turmas/${cenario.turmaAlg.id}/frequencia`)
        .set('Authorization', cenario.profLima.header)
        .send({ data: '2026-09-17', registros: [{ alunoId: cenario.alunoJoaoAcademico.id, data: '2026-09-17', presenca: 'presente' }] })
        .expect(201);

      // turma alheia: 403 tanto para leitura quanto para escrita
      await request(app.getHttpServer()).get(`/turmas/${cenario.turmaBd.id}`).set('Authorization', cenario.profLima.header).expect(403);
      await request(app.getHttpServer())
        .post(`/turmas/${cenario.turmaBd.id}/frequencia`)
        .set('Authorization', cenario.profLima.header)
        .send({ data: '2026-09-17', registros: [] })
        .expect(403);
      await request(app.getHttpServer())
        .post('/atividades')
        .set('Authorization', cenario.profLima.header)
        .send({ titulo: 'Atividade indevida', tipo: 'lista', turmaId: cenario.turmaBd.id })
        .expect(403);

      // GET /turmas/:id/notas (boletim da turma inteira, usado pela tela de notas do professor):
      // dono acessa, outro professor não, e o próprio aluno matriculado também não (ele só vê /me/notas).
      const item = await request(app.getHttpServer())
        .post(`/turmas/${cenario.turmaAlg.id}/itens-avaliativos`)
        .set('Authorization', cenario.profLima.header)
        .send({ nome: 'Prova 1', peso: 1, notaMaxima: 10 })
        .expect(201);
      await request(app.getHttpServer())
        .patch(`/itens-avaliativos/${item.body.id}/notas`)
        .set('Authorization', cenario.profLima.header)
        .send({ alunoId: cenario.alunoJoaoAcademico.id, valor: 7.5 })
        .expect(200);

      const boletimRes = await request(app.getHttpServer())
        .get(`/turmas/${cenario.turmaAlg.id}/notas`)
        .set('Authorization', cenario.profLima.header)
        .expect(200);
      expect(boletimRes.body[0].notas[0].valor).toBe('7.5');

      await request(app.getHttpServer()).get(`/turmas/${cenario.turmaBd.id}/notas`).set('Authorization', cenario.profLima.header).expect(403);
      await request(app.getHttpServer()).get(`/turmas/${cenario.turmaAlg.id}/notas`).set('Authorization', cenario.alunoJoao.header).expect(403);
    });

    it('Aluno só vê os próprios dados via /me — 401 sem token, 403 fora do escopo', async () => {
      const cenario = await montarCenarioAcademico();

      await request(app.getHttpServer()).get('/me/turmas').expect(401);

      const minhasTurmasRes = await request(app.getHttpServer())
        .get('/me/turmas')
        .set('Authorization', cenario.alunoJoao.header)
        .expect(200);
      expect(minhasTurmasRes.body).toHaveLength(1);
      expect(minhasTurmasRes.body[0].turma.codigo).toBe('ALG-T-A');

      // João não está matriculado na turma de Banco de Dados
      await request(app.getHttpServer()).get(`/turmas/${cenario.turmaBd.id}`).set('Authorization', cenario.alunoJoao.header).expect(403);

      // aluno autenticado mas sem a ação de gestão -> 403 (não 500/401)
      await request(app.getHttpServer())
        .post(`/turmas/${cenario.turmaAlg.id}/frequencia`)
        .set('Authorization', cenario.alunoJoao.header)
        .send({ data: '2026-09-17', registros: [] })
        .expect(403);
    });

    it('Rooster Learn: publicar atividade gera item avaliativo; correção propaga nota para o Academy; aluno de outra turma não pode entregar', async () => {
      const cenario = await montarCenarioAcademico();

      const atividadeRes = await request(app.getHttpServer())
        .post('/atividades')
        .set('Authorization', cenario.profLima.header)
        .send({ titulo: 'Lista 1', tipo: 'lista', turmaId: cenario.turmaAlg.id, peso: 0.5, notaMaxima: 10 })
        .expect(201);
      const atividadeId = atividadeRes.body.id;

      const publicarRes = await request(app.getHttpServer())
        .patch(`/atividades/${atividadeId}/publicar`)
        .set('Authorization', cenario.profLima.header)
        .expect(200);
      expect(publicarRes.body.status).toBe('publicada');

      const itensRes = await request(app.getHttpServer())
        .get(`/turmas/${cenario.turmaAlg.id}/itens-avaliativos`)
        .set('Authorization', cenario.profLima.header)
        .expect(200);
      expect(itensRes.body.some((item: any) => item.origem === 'learn' && item.atividadeId === atividadeId)).toBe(true);

      // Maria não está matriculada na turma de Algoritmos -> não pode entregar
      await request(app.getHttpServer())
        .post(`/atividades/${atividadeId}/entregas`)
        .set('Authorization', cenario.alunoMaria.header)
        .send({ texto: 'tentativa indevida' })
        .expect(400);

      const entregaRes = await request(app.getHttpServer())
        .post(`/atividades/${atividadeId}/entregas`)
        .set('Authorization', cenario.alunoJoao.header)
        .send({ texto: 'Minha resposta' })
        .expect(201);
      expect(entregaRes.body.status).toBe('enviada');

      // Anexo na entrega — tamanho (BigInt no schema) precisa vir serializado como number
      // em toda rota que devolve entregas com anexos incluídos (não só no upload em si).
      const anexoRes = await request(app.getHttpServer())
        .post(`/entregas/${entregaRes.body.id}/anexos`)
        .set('Authorization', cenario.alunoJoao.header)
        .attach('arquivo', Buffer.from('conteúdo da lista'), 'lista1.txt')
        .expect(201);
      expect(typeof anexoRes.body.tamanho).toBe('number');

      const entregasDaAtividadeRes = await request(app.getHttpServer())
        .get(`/atividades/${atividadeId}/entregas`)
        .set('Authorization', cenario.profLima.header)
        .expect(200);
      const entregaComAnexo = entregasDaAtividadeRes.body.find((e: any) => e.id === entregaRes.body.id);
      expect(typeof entregaComAnexo.anexos[0].tamanho).toBe('number');

      const minhasEntregasRes = await request(app.getHttpServer())
        .get('/me/entregas')
        .set('Authorization', cenario.alunoJoao.header)
        .expect(200);
      expect(typeof minhasEntregasRes.body[0].anexos[0].tamanho).toBe('number');

      // Profa. Costa (outra turma) não pode corrigir a entrega de Lima
      await request(app.getHttpServer())
        .patch(`/entregas/${entregaRes.body.id}/corrigir`)
        .set('Authorization', cenario.profCosta.header)
        .send({ nota: 10 })
        .expect(403);

      await request(app.getHttpServer())
        .patch(`/entregas/${entregaRes.body.id}/corrigir`)
        .set('Authorization', cenario.profLima.header)
        .send({ nota: 9, feedback: 'Muito bom!' })
        .expect(200);

      const minhasNotasRes = await request(app.getHttpServer())
        .get('/me/notas')
        .set('Authorization', cenario.alunoJoao.header)
        .expect(200);
      const itemLearn = minhasNotasRes.body[0].itens.find((item: any) => item.origem === 'learn');
      expect(itemLearn.nota).toBe('9');
    });
  });

  describe('Rooster Boost', () => {
    const BOOST_PROFESSOR_KEYS: Array<[string, string, string]> = [
      ['Rooster Boost', '/boost', 'acessar'],
      ['Rooster Boost', '/boost/manage', 'gerenciar-cursos'],
      ['Rooster Boost', '/boost/manage', 'gerenciar-conteudo'],
      ['Rooster Boost', '/boost/manage', 'ver-progresso'],
      ['Rooster Boost', '/boost/manage', 'mensagem'],
    ];

    /** Professor (login do Hub) apto a lecionar no Boost + um curso publicado dele, com 1 módulo/1 aula/1 material. */
    async function montarCenarioBoost() {
      const profUsuario = await criarUsuarioComPermissoes('Prof. Boost Teste', 'prof.boost.teste@example.com', BOOST_PROFESSOR_KEYS);
      const profOutroUsuario = await criarUsuarioComPermissoes('Prof. Boost Outro', 'prof.boost.outro@example.com', BOOST_PROFESSOR_KEYS);
      const professor = await prisma.professor.create({ data: { usuarioId: profUsuario.usuario.id } });
      const professorOutro = await prisma.professor.create({ data: { usuarioId: profOutroUsuario.usuario.id } });

      const curso = await prisma.cursoBoost.create({
        data: { titulo: 'Curso Teste Boost', slug: `curso-teste-boost-${Date.now()}`, cargaHoraria: 10, status: 'publicado', professorId: professor.id },
      });
      const modulo = await prisma.moduloBoost.create({ data: { cursoId: curso.id, titulo: 'Módulo 1', ordem: 1 } });
      const aula = await prisma.aulaBoost.create({ data: { moduloId: modulo.id, titulo: 'Aula 1', ordem: 1, tipo: 'texto', conteudoTexto: 'Conteúdo de teste.' } });

      return { professor: profUsuario, professorOutro: profOutroUsuario, curso, modulo, aula };
    }

    it('Cadastro/login público do Boost são independentes do login do Hub; catálogo é navegável sem login', async () => {
      const cenario = await montarCenarioBoost();

      // catálogo público — sem token nenhum
      const catalogoRes = await request(app.getHttpServer()).get('/cursos-boost-publicos').expect(200);
      expect(catalogoRes.body.some((c: any) => c.id === cenario.curso.id)).toBe(true);

      const cadastroRes = await request(app.getHttpServer())
        .post('/boost/cadastro')
        .send({ nome: 'Aluno Externo Teste', email: 'aluno.externo.teste@example.com', senha: 'SenhaExterna123' })
        .expect(201);
      expect(cadastroRes.body.accessToken).toBeDefined();
      expect(cadastroRes.body.usuario.email).toBe('aluno.externo.teste@example.com');

      // e-mail duplicado -> 409
      await request(app.getHttpServer())
        .post('/boost/cadastro')
        .send({ nome: 'Duplicado', email: 'aluno.externo.teste@example.com', senha: 'OutraSenha123' })
        .expect(409);

      const loginRes = await request(app.getHttpServer())
        .post('/boost/login')
        .send({ email: 'aluno.externo.teste@example.com', senha: 'SenhaExterna123' })
        .expect(201);
      const boostToken = `Bearer ${loginRes.body.accessToken}`;

      // token do Hub não autentica no portal Boost, e vice-versa
      await request(app.getHttpServer()).get('/boost/me/matriculas').set('Authorization', cenario.professor.header).expect(401);
      await request(app.getHttpServer()).get('/turmas').set('Authorization', boostToken).expect(401);
      await request(app.getHttpServer()).get('/boost/me/matriculas').expect(401);
    });

    it('Fluxo completo: professor publica curso, aluno externo matricula, conclui todas as aulas e recebe certificado automaticamente', async () => {
      const cenario = await montarCenarioBoost();
      const aula2 = await prisma.aulaBoost.create({ data: { moduloId: cenario.modulo.id, titulo: 'Aula 2', ordem: 2, tipo: 'texto', conteudoTexto: 'Conteúdo 2.' } });

      const { body: sessao } = await request(app.getHttpServer())
        .post('/boost/cadastro')
        .send({ nome: 'Aluna Concluinte', email: 'aluna.concluinte@example.com', senha: 'SenhaConcluinte123' })
        .expect(201);
      const alunoHeader = `Bearer ${sessao.accessToken}`;

      const matriculaRes = await request(app.getHttpServer())
        .post(`/cursos-boost/${cenario.curso.id}/matricular`)
        .set('Authorization', alunoHeader)
        .expect(201);
      expect(matriculaRes.body.status).toBe('ativa');
      const matriculaId = matriculaRes.body.id;

      // matricular de novo é idempotente (mesma matrícula, não duplica)
      const matriculaRepetidaRes = await request(app.getHttpServer())
        .post(`/cursos-boost/${cenario.curso.id}/matricular`)
        .set('Authorization', alunoHeader)
        .expect(201);
      expect(matriculaRepetidaRes.body.id).toBe(matriculaId);

      await request(app.getHttpServer()).patch(`/boost/aulas/${cenario.aula.id}/concluir`).set('Authorization', alunoHeader).expect(200);
      const meioRes = await request(app.getHttpServer()).patch(`/boost/aulas/${cenario.aula.id}/concluir`).set('Authorization', alunoHeader).expect(200);
      expect(meioRes.body.progressoPct).toBe(50); // reenviar a mesma aula não conta duas vezes (upsert)

      const finalRes = await request(app.getHttpServer()).patch(`/boost/aulas/${aula2.id}/concluir`).set('Authorization', alunoHeader).expect(200);
      expect(finalRes.body.progressoPct).toBe(100);
      expect(finalRes.body.status).toBe('concluida');

      const detalheRes = await request(app.getHttpServer()).get(`/boost/me/matriculas/${matriculaId}`).set('Authorization', alunoHeader).expect(200);
      expect(detalheRes.body.certificado).toBeDefined();
      expect(detalheRes.body.certificado.codigo).toMatch(/^RB-/);

      const downloadRes = await request(app.getHttpServer())
        .get(`/boost/certificados/${detalheRes.body.certificado.id}/arquivo`)
        .set('Authorization', alunoHeader)
        .expect(200);
      expect(downloadRes.headers['content-type']).toBe('application/pdf');
      expect(Buffer.isBuffer(downloadRes.body) ? downloadRes.body.length : downloadRes.text.length).toBeGreaterThan(500);

      // outro aluno (não dono) não pode baixar o certificado
      const { body: sessaoOutra } = await request(app.getHttpServer())
        .post('/boost/cadastro')
        .send({ nome: 'Outra Aluna', email: 'outra.aluna@example.com', senha: 'SenhaOutra123' })
        .expect(201);
      await request(app.getHttpServer())
        .get(`/boost/certificados/${detalheRes.body.certificado.id}/arquivo`)
        .set('Authorization', `Bearer ${sessaoOutra.accessToken}`)
        .expect(404);
    });

    it('Professor só gerencia o próprio curso Boost — 403 em curso alheio; aluno não matriculado não vê progresso/chat', async () => {
      const cenario = await montarCenarioBoost();

      await request(app.getHttpServer()).get(`/cursos-boost/${cenario.curso.id}`).set('Authorization', cenario.professor.header).expect(200);
      await request(app.getHttpServer()).get(`/cursos-boost/${cenario.curso.id}`).set('Authorization', cenario.professorOutro.header).expect(403);
      await request(app.getHttpServer())
        .post(`/cursos-boost/${cenario.curso.id}/modulos`)
        .set('Authorization', cenario.professorOutro.header)
        .send({ titulo: 'Módulo indevido' })
        .expect(403);
      await request(app.getHttpServer()).get(`/cursos-boost/${cenario.curso.id}/alunos`).set('Authorization', cenario.professorOutro.header).expect(403);

      const { body: sessao } = await request(app.getHttpServer())
        .post('/boost/cadastro')
        .send({ nome: 'Aluno Não Matriculado', email: 'nao.matriculado@example.com', senha: 'SenhaNaoMat123' })
        .expect(201);
      const alunoHeader = `Bearer ${sessao.accessToken}`;

      await request(app.getHttpServer()).patch(`/boost/aulas/${cenario.aula.id}/concluir`).set('Authorization', alunoHeader).expect(403);
      await request(app.getHttpServer()).get(`/boost/cursos/${cenario.curso.id}/mensagens`).set('Authorization', alunoHeader).expect(403);
    });

    it('Material de apoio: aluno matriculado baixa; aluno não matriculado recebe 403', async () => {
      const cenario = await montarCenarioBoost();
      const material = await prisma.materialApoio.create({
        data: { aulaId: cenario.aula.id, nome: 'slides.txt', caminho: 'inexistente.txt', tipo: 'text/plain', tamanho: BigInt(10) },
      });

      const { body: matriculado } = await request(app.getHttpServer())
        .post('/boost/cadastro')
        .send({ nome: 'Aluno Com Material', email: 'aluno.com.material@example.com', senha: 'SenhaMaterial123' })
        .expect(201);
      const matriculadoHeader = `Bearer ${matriculado.accessToken}`;
      await request(app.getHttpServer()).post(`/cursos-boost/${cenario.curso.id}/matricular`).set('Authorization', matriculadoHeader).expect(201);

      // matriculado passa pela checagem de posse (404 aqui é só o arquivo de teste não existir em disco — não é 403)
      const okRes = await request(app.getHttpServer())
        .get(`/boost/materiais/${material.id}/arquivo`)
        .set('Authorization', matriculadoHeader);
      expect(okRes.status).not.toBe(403);

      const { body: naoMatriculado } = await request(app.getHttpServer())
        .post('/boost/cadastro')
        .send({ nome: 'Aluno Sem Material', email: 'aluno.sem.material@example.com', senha: 'SenhaSemMaterial123' })
        .expect(201);
      await request(app.getHttpServer())
        .get(`/boost/materiais/${material.id}/arquivo`)
        .set('Authorization', `Bearer ${naoMatriculado.accessToken}`)
        .expect(403);
    });

    it('Chat do curso: aluno matriculado e professor dono trocam mensagens; instrutor alheio não acessa', async () => {
      const cenario = await montarCenarioBoost();
      const { body: sessao } = await request(app.getHttpServer())
        .post('/boost/cadastro')
        .send({ nome: 'Aluno Chat', email: 'aluno.chat@example.com', senha: 'SenhaChat123' })
        .expect(201);
      const alunoHeader = `Bearer ${sessao.accessToken}`;
      await request(app.getHttpServer()).post(`/cursos-boost/${cenario.curso.id}/matricular`).set('Authorization', alunoHeader).expect(201);

      await request(app.getHttpServer())
        .post(`/boost/cursos/${cenario.curso.id}/mensagens`)
        .set('Authorization', alunoHeader)
        .send({ mensagem: 'Dúvida sobre a aula 1' })
        .expect(201);

      const mensagensRes = await request(app.getHttpServer())
        .get(`/cursos-boost/${cenario.curso.id}/mensagens`)
        .set('Authorization', cenario.professor.header)
        .expect(200);
      expect(mensagensRes.body).toHaveLength(1);
      expect(mensagensRes.body[0].mensagem).toBe('Dúvida sobre a aula 1');

      await request(app.getHttpServer())
        .post(`/cursos-boost/${cenario.curso.id}/mensagens`)
        .set('Authorization', cenario.professor.header)
        .send({ mensagem: 'Resposta do professor' })
        .expect(201);

      await request(app.getHttpServer()).get(`/cursos-boost/${cenario.curso.id}/mensagens`).set('Authorization', cenario.professorOutro.header).expect(403);
    });
  });

  describe('Rooster Finance', () => {
    const FINANCE_STAFF_KEYS: Array<[string, string, string]> = [
      ['Rooster Finance', '/finance', 'acessar'],
      ['Rooster Finance', '/finance/charges', 'acessar'],
      ['Rooster Finance', '/finance/charges', 'criar'],
      ['Rooster Finance', '/finance/charges', 'marcar-pago'],
      ['Rooster Finance', '/finance/charges', 'negociar'],
      ['Rooster Finance', '/finance/charges', 'cancelar'],
      ['Rooster Finance', '/finance/charges', 'exportar'],
      ['Rooster Finance', '/finance/tuitions', 'acessar'],
      ['Rooster Finance', '/finance/tuitions', 'gerar-lote'],
      ['Rooster Finance', '/finance/tuitions', 'editar'],
      ['Rooster Finance', '/finance/boletos', 'acessar'],
      ['Rooster Finance', '/finance/boletos', 'emitir'],
      ['Rooster Finance', '/finance/boletos', 'baixar'],
      ['Rooster Finance', '/finance/products', 'acessar'],
      ['Rooster Finance', '/finance/products', 'criar'],
      ['Rooster Finance', '/finance/products', 'editar'],
      ['Rooster Finance', '/finance/products', 'excluir'],
      ['Rooster Finance', '/finance/services', 'acessar'],
      ['Rooster Finance', '/finance/services', 'criar'],
      ['Rooster Finance', '/finance/nfe', 'acessar'],
      ['Rooster Finance', '/finance/nfe', 'emitir'],
      ['Rooster Finance', '/finance/nfe', 'exportar-xml'],
      ['Rooster Finance', '/finance/reports', 'acessar'],
      ['Rooster Finance', '/finance/discounts', 'acessar'],
      ['Rooster Finance', '/finance/discounts', 'criar'],
    ];
    const ALUNO_FINANCE_KEYS: Array<[string, string, string]> = [
      ['Rooster Student', '/student/finance', 'acessar'],
      ['Rooster Student', '/student/finance', 'baixar-boleto'],
    ];

    /** Aluno real do Academy (com matrícula ativa) + usuário financeiro com acesso total ao módulo. */
    async function montarCenarioFinanceiro() {
      const financeiro = await criarUsuarioComPermissoes('Financeiro Teste', 'financeiro.teste@example.com', FINANCE_STAFF_KEYS);
      const alunoUsuario = await criarUsuarioComPermissoes('Aluno Financeiro Teste', 'aluno.financeiro.teste@example.com', ALUNO_FINANCE_KEYS);
      const outroAlunoUsuario = await criarUsuarioComPermissoes('Outro Aluno Teste', 'outro.aluno.financeiro.teste@example.com', ALUNO_FINANCE_KEYS);

      const curso = await prisma.curso.create({ data: { nome: 'Administração-T', codigo: 'ADM-FIN-T', grau: 'Graduação', ativo: true } });
      const aluno = await prisma.aluno.create({ data: { usuarioId: alunoUsuario.usuario.id, ra: 'FIN0001', cursoId: curso.id } });
      const outroAluno = await prisma.aluno.create({ data: { usuarioId: outroAlunoUsuario.usuario.id, ra: 'FIN0002', cursoId: curso.id } });

      const periodo = await prisma.periodoLetivo.create({ data: { nome: '2026.2-FIN-T', dataInicio: new Date('2026-08-01'), dataFim: new Date('2026-12-01'), ativo: true } });
      const disciplina = await prisma.disciplina.create({ data: { codigo: 'FIN-DISC-T', nome: 'Disciplina Financeira', cursoId: curso.id, cargaHoraria: 40 } });
      const turma = await prisma.turma.create({ data: { codigo: 'FIN-TUR-T', disciplinaId: disciplina.id, periodoLetivoId: periodo.id, capacidade: 30 } });
      await prisma.matricula.create({ data: { alunoId: aluno.id, turmaId: turma.id, status: 'ativa' } });
      await prisma.matricula.create({ data: { alunoId: outroAluno.id, turmaId: turma.id, status: 'ativa' } });

      const servico = await prisma.servico.create({ data: { nome: 'Mensalidade Teste', preco: 1000, frequencia: 'mensal', ativo: true } });
      const produto = await prisma.produto.create({ data: { codigo: 'PRD-T-001', nome: 'Produto Teste', preco: 50, estoque: 10, estoqueMinimo: 2, ativo: true } });

      return { financeiro, alunoUsuario, outroAlunoUsuario, aluno, outroAluno, curso, turma, servico, produto };
    }

    it('CRUD de produtos e descontos; beneficiários do desconto são sempre calculados', async () => {
      const { financeiro } = await montarCenarioFinanceiro();

      const produtoRes = await request(app.getHttpServer())
        .post('/produtos-financeiros')
        .set('Authorization', financeiro.header)
        .send({ codigo: 'PRD-CRUD', nome: 'Caderno', preco: 20, estoque: 5, estoqueMinimo: 1 })
        .expect(201);
      await request(app.getHttpServer())
        .patch(`/produtos-financeiros/${produtoRes.body.id}`)
        .set('Authorization', financeiro.header)
        .send({ preco: 25 })
        .expect(200);
      await request(app.getHttpServer())
        .delete(`/produtos-financeiros/${produtoRes.body.id}`)
        .set('Authorization', financeiro.header)
        .expect(200);

      const descontoRes = await request(app.getHttpServer())
        .post('/descontos')
        .set('Authorization', financeiro.header)
        .send({ nome: 'Bolsa Teste', tipo: 'bolsa-parcial', valor: 30, unidade: 'percent' })
        .expect(201);

      const listaRes = await request(app.getHttpServer())
        .get('/descontos')
        .set('Authorization', financeiro.header)
        .expect(200);
      expect(listaRes.body.find((d: any) => d.id === descontoRes.body.id).beneficiarios).toBe(0);
    });

    it('Cobrança: criar, marcar como paga, negociar e cancelar mudam o status corretamente', async () => {
      const cenario = await montarCenarioFinanceiro();

      const cobrancaRes = await request(app.getHttpServer())
        .post('/cobrancas')
        .set('Authorization', cenario.financeiro.header)
        .send({ alunoId: cenario.aluno.id, tipo: 'taxa', descricao: 'Taxa de teste', valorOriginal: 100, vencimento: '2026-09-01' })
        .expect(201);
      expect(cobrancaRes.body.status).toBe('aberto');

      const pagaRes = await request(app.getHttpServer())
        .post(`/cobrancas/${cobrancaRes.body.id}/marcar-pago`)
        .set('Authorization', cenario.financeiro.header)
        .send({})
        .expect(201);
      expect(pagaRes.body.status).toBe('pago');
      expect(Number(pagaRes.body.valorPago)).toBe(100);

      // já paga: não pode cancelar
      await request(app.getHttpServer())
        .post(`/cobrancas/${cobrancaRes.body.id}/cancelar`)
        .set('Authorization', cenario.financeiro.header)
        .send({ motivo: 'teste' })
        .expect(400);

      const cobranca2 = await request(app.getHttpServer())
        .post('/cobrancas')
        .set('Authorization', cenario.financeiro.header)
        .send({ alunoId: cenario.aluno.id, tipo: 'taxa', descricao: 'Outra taxa', valorOriginal: 200, vencimento: '2026-09-01' })
        .expect(201);

      const negociadaRes = await request(app.getHttpServer())
        .post(`/cobrancas/${cobranca2.body.id}/negociar`)
        .set('Authorization', cenario.financeiro.header)
        .send({ motivo: 'prazo estendido', novoVencimento: '2026-10-01' })
        .expect(201);
      expect(negociadaRes.body.status).toBe('negociado');

      const canceladaRes = await request(app.getHttpServer())
        .post(`/cobrancas/${cobranca2.body.id}/cancelar`)
        .set('Authorization', cenario.financeiro.header)
        .send({ motivo: 'aluno desistiu' })
        .expect(201);
      expect(canceladaRes.body.status).toBe('cancelado');
    });

    it('Gerar mensalidades em lote é idempotente por competência e aplica desconto ativo automaticamente', async () => {
      const cenario = await montarCenarioFinanceiro();
      const desconto = await prisma.desconto.create({ data: { nome: 'Bolsa Lote', tipo: 'bolsa-parcial', valor: 50, unidade: 'percent', ativo: true } });
      await prisma.descontoAluno.create({ data: { alunoId: cenario.aluno.id, descontoId: desconto.id } });

      const primeiraRes = await request(app.getHttpServer())
        .post('/cobrancas/gerar-lote')
        .set('Authorization', cenario.financeiro.header)
        .send({ competencia: '2026-09', servicoId: cenario.servico.id, vencimento: '2026-09-10', turmaId: cenario.turma.id })
        .expect(201);
      expect(primeiraRes.body.geradas).toBe(2);
      const cobrancaComDesconto = primeiraRes.body.cobrancas.find((c: any) => c.alunoId === cenario.aluno.id);
      expect(Number(cobrancaComDesconto.valorDesconto)).toBe(500);

      const segundaRes = await request(app.getHttpServer())
        .post('/cobrancas/gerar-lote')
        .set('Authorization', cenario.financeiro.header)
        .send({ competencia: '2026-09', servicoId: cenario.servico.id, vencimento: '2026-09-10', turmaId: cenario.turma.id })
        .expect(201);
      expect(segundaRes.body.geradas).toBe(0);
      expect(segundaRes.body.ignoradas).toBe(2);
    });

    it('Boleto interno: emitir gera nosso número/linha digitável (47 posições) e o PDF pode ser baixado', async () => {
      const cenario = await montarCenarioFinanceiro();
      const cobrancaRes = await request(app.getHttpServer())
        .post('/cobrancas')
        .set('Authorization', cenario.financeiro.header)
        .send({ alunoId: cenario.aluno.id, tipo: 'taxa', descricao: 'Taxa boleto', valorOriginal: 150, vencimento: '2026-09-01' })
        .expect(201);

      const boletoRes = await request(app.getHttpServer())
        .post(`/cobrancas/${cobrancaRes.body.id}/emitir-boleto`)
        .set('Authorization', cenario.financeiro.header)
        .expect(201);
      expect(boletoRes.body.linhaDigitavel).toHaveLength(47);
      expect(boletoRes.body.nossoNumero).toBeDefined();

      const pdfRes = await request(app.getHttpServer())
        .get(`/cobrancas/${cobrancaRes.body.id}/boleto`)
        .set('Authorization', cenario.financeiro.header)
        .expect(200);
      expect(pdfRes.headers['content-type']).toContain('application/pdf');
    });

    it('Nota fiscal interna: emitir gera documento e recusa uma segunda emissão para a mesma cobrança', async () => {
      const cenario = await montarCenarioFinanceiro();
      const cobrancaRes = await request(app.getHttpServer())
        .post('/cobrancas')
        .set('Authorization', cenario.financeiro.header)
        .send({ alunoId: cenario.aluno.id, tipo: 'produto', descricao: 'Venda produto', produtoId: cenario.produto.id, valorOriginal: 50, vencimento: '2026-09-01' })
        .expect(201);

      const nfRes = await request(app.getHttpServer())
        .post(`/cobrancas/${cobrancaRes.body.id}/nota-fiscal`)
        .set('Authorization', cenario.financeiro.header)
        .expect(201);
      expect(nfRes.body.numero).toMatch(/^NFP-/);

      await request(app.getHttpServer())
        .post(`/cobrancas/${cobrancaRes.body.id}/nota-fiscal`)
        .set('Authorization', cenario.financeiro.header)
        .expect(409);

      const listaRes = await request(app.getHttpServer())
        .get('/notas-fiscais')
        .set('Authorization', cenario.financeiro.header)
        .expect(200);
      expect(listaRes.body.some((n: any) => n.id === nfRes.body.id)).toBe(true);
    });

    it('Portal do aluno: só vê/baixa as próprias cobranças — 403 ao tentar acessar cobrança de outro aluno', async () => {
      const cenario = await montarCenarioFinanceiro();
      const cobrancaRes = await request(app.getHttpServer())
        .post('/cobrancas')
        .set('Authorization', cenario.financeiro.header)
        .send({ alunoId: cenario.aluno.id, tipo: 'taxa', descricao: 'Taxa do aluno', valorOriginal: 80, vencimento: '2026-09-01' })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/cobrancas/${cobrancaRes.body.id}/emitir-boleto`)
        .set('Authorization', cenario.financeiro.header)
        .expect(201);

      const meRes = await request(app.getHttpServer())
        .get('/financeiro/me/cobrancas')
        .set('Authorization', cenario.alunoUsuario.header)
        .expect(200);
      expect(meRes.body.some((c: any) => c.id === cobrancaRes.body.id)).toBe(true);

      await request(app.getHttpServer())
        .get(`/financeiro/me/cobrancas/${cobrancaRes.body.id}/boleto`)
        .set('Authorization', cenario.alunoUsuario.header)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/financeiro/me/cobrancas/${cobrancaRes.body.id}/boleto`)
        .set('Authorization', cenario.outroAlunoUsuario.header)
        .expect(403);
    });

    it('Usuário sem nenhuma permissão de Finance recebe 403 ao listar cobranças', async () => {
      await montarCenarioFinanceiro();
      const semPermissao = await criarUsuarioComPermissoes('Sem Permissao Finance', 'sem.permissao.finance@example.com', []);
      await request(app.getHttpServer())
        .get('/cobrancas')
        .set('Authorization', semPermissao.header)
        .expect(403);
    });
  });
});
