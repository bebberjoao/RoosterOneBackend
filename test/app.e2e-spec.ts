import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
const request = require('supertest');
import { AppModule } from '../src/app.module';
import { configurarApp } from '../src/app-config';
import { PrismaService } from '../src/roster-hub/shared/prisma.service';
import { PrismaTestService } from '../src/roster-hub/shared/prisma-test.service';
import { MailService } from '../src/mail/mail.service';
import { PASTAS } from '../src/common/storage.config';

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
  ['Rooster Rooms', '/rooms/book', 'solicitar-recorrente'],
  ['Rooster Rooms', '/rooms/book', 'prazo-estendido'],
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
  ['Rooster Boost', '/boost/manage', 'certificado'],
  ['Rooster Boost', '/boost/manage', 'vincular-orientadores'],
  ['Rooster Boost', '/boost/conversas', 'acessar'],
  ['Rooster Boost', '/boost/conversas', 'responder'],
  ['Rooster Boost', '/boost/students', 'acessar'],
  ['Rooster Boost', '/boost/students', 'gerenciar'],
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
      .post('/v1/auth/login')
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
    const loginRes = await request(app.getHttpServer()).post('/v1/auth/login').send({ email, senha: 'Senha123!' }).expect(201);
    return { usuario, header: `Bearer ${loginRes.body.accessToken}` };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useClass(PrismaTestService)
      .compile();

    app = moduleRef.createNestApplication();
    configurarApp(app);
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
      prisma.conversaBoost.deleteMany(),
      prisma.matriculaBoost.deleteMany(),
      prisma.materialApoio.deleteMany(),
      prisma.aulaBoost.deleteMany(),
      prisma.moduloBoost.deleteMany(),
      prisma.cursoOrientadorBoost.deleteMany(),
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
    // Não apaga dev-test.db aqui: o arquivo é compartilhado com outras suítes
    // e2e (ex. rooms-reservas.e2e-spec.ts) — apagar cedo demais derruba a
    // suíte seguinte. Limpeza única em test/global-teardown.ts, depois que
    // TODAS as suítes terminam (ver jest-e2e.json -> globalTeardown).
  });

  // O health check é VERSION_NEUTRAL de propósito: quem monitora precisa de um
  // endereço estável, que não mude quando a API ganhar uma v2.
  it('Health check responde em / (fora do versionamento)', () => {
    return request(app.getHttpServer()).get('/').expect(200);
  });

  it('Rota de negócio sem o prefixo /v1 não existe (o versionamento não é opcional)', async () => {
    // `defaultVersion: '1'` registra as rotas SOB /v1 — não significa que a
    // URL sem versão continua valendo. Qualquer cliente precisa mandar /v1.
    await request(app.getHttpServer()).get('/usuarios').set('Authorization', authHeader).expect(404);
  });

  it('GET /health verifica o banco de verdade, não só se o processo responde', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.banco).toBe('ok');
    expect(typeof res.body.uptimeSegundos).toBe('number');
  });

  it('Rejects a protected route without a token', () => {
    return request(app.getHttpServer()).get('/v1/usuarios').expect(401);
  });

  it('Rejects a protected route with a valid token but without the required permission', async () => {
    const semPermissao = await prisma.usuario.create({
      data: { nome: 'Sem Permissao', email: 'sem.permissao@example.com', senhaHash: await bcrypt.hash('Senha123!', 10), ativo: true },
    });
    const loginRes = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: semPermissao.email, senha: 'Senha123!' })
      .expect(201);

    await request(app.getHttpServer())
      .get('/v1/usuarios')
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
      .post('/v1/usuarios')
      .set('Authorization', authHeader)
      .send(createUser)
      .expect(201);
    expect(createRes.body.id).toBeDefined();
    expect(createRes.body.email).toBe(createUser.email);
    // a senha nunca volta em texto puro
    expect(createRes.body.senhaHash).not.toBe(createUser.senhaHash);

    const userId = createRes.body.id;

    // E-mail duplicado é conflito de dado de entrada (409), e não falha interna: não gera registro em logs_erro.
    const errosAntes = await prisma.logErro.count();
    const duplicadoRes = await request(app.getHttpServer())
      .post('/v1/usuarios')
      .set('Authorization', authHeader)
      .send({ ...createUser, cpf: '10987654321' })
      .expect(409);
    expect(duplicadoRes.body.message).toContain('já existe um registro');
    expect(await prisma.logErro.count()).toBe(errosAntes);

    const listRes = await request(app.getHttpServer()).get('/v1/usuarios').set('Authorization', authHeader).expect(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.some((item: any) => item.id === userId)).toBe(true);

    const getRes = await request(app.getHttpServer()).get(`/v1/usuarios/${userId}`).set('Authorization', authHeader).expect(200);
    expect(getRes.body.email).toBe(createUser.email);

    const patchRes = await request(app.getHttpServer())
      .patch(`/v1/usuarios/${userId}`)
      .set('Authorization', authHeader)
      .send({ nome: 'Usuário Atualizado' })
      .expect(200);
    expect(patchRes.body.nome).toBe('Usuário Atualizado');

    // login com a senha original continua funcionando após o hash
    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: createUser.email, senha: createUser.senhaHash })
      .expect(201);

    const deleteRes = await request(app.getHttpServer()).delete(`/v1/usuarios/${userId}`).set('Authorization', authHeader).expect(200);
    expect(deleteRes.body.id).toBe(userId);
  });

  it('Setores endpoints should create, read, update and delete a setor', async () => {
    const createSetor = { nome: 'Setor Teste', descricao: 'Setor de teste', ativo: true };
    const createRes = await request(app.getHttpServer()).post('/v1/setores').set('Authorization', authHeader).send(createSetor).expect(201);
    expect(createRes.body.id).toBeDefined();
    const setorId = createRes.body.id;

    await request(app.getHttpServer()).get('/v1/setores').set('Authorization', authHeader).expect(200);
    await request(app.getHttpServer()).get(`/v1/setores/${setorId}`).set('Authorization', authHeader).expect(200);
    const patchRes = await request(app.getHttpServer()).patch(`/v1/setores/${setorId}`).set('Authorization', authHeader).send({ nome: 'Setor Alterado' }).expect(200);
    expect(patchRes.body.nome).toBe('Setor Alterado');
    await request(app.getHttpServer()).delete(`/v1/setores/${setorId}`).set('Authorization', authHeader).expect(200);
  });

  it('Modulos endpoints should create, read, update and delete a modulo', async () => {
    const createModulo = { nome: 'Modulo Teste', rota: '/teste', icone: 'icon-test', ativo: true };
    const createRes = await request(app.getHttpServer()).post('/v1/modulos').set('Authorization', authHeader).send(createModulo).expect(201);
    expect(createRes.body.id).toBeDefined();
    const moduloId = createRes.body.id;

    await request(app.getHttpServer()).get('/v1/modulos').set('Authorization', authHeader).expect(200);
    await request(app.getHttpServer()).get(`/v1/modulos/${moduloId}`).set('Authorization', authHeader).expect(200);
    const patchRes = await request(app.getHttpServer()).patch(`/v1/modulos/${moduloId}`).set('Authorization', authHeader).send({ nome: 'Modulo Alterado' }).expect(200);
    expect(patchRes.body.nome).toBe('Modulo Alterado');
    await request(app.getHttpServer()).delete(`/v1/modulos/${moduloId}`).set('Authorization', authHeader).expect(200);
  });

  it('Permissoes endpoints should create, read, update and delete a permissao', async () => {
    const createResModulo = await request(app.getHttpServer())
      .post('/v1/modulos')
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
    const createRes = await request(app.getHttpServer()).post('/v1/permissoes').set('Authorization', authHeader).send(createPermissao).expect(201);
    expect(createRes.body.id).toBeDefined();
    const permissaoId = createRes.body.id;

    await request(app.getHttpServer()).get('/v1/permissoes').set('Authorization', authHeader).expect(200);
    await request(app.getHttpServer()).get(`/v1/permissoes/${permissaoId}`).set('Authorization', authHeader).expect(200);
    const patchRes = await request(app.getHttpServer()).patch(`/v1/permissoes/${permissaoId}`).set('Authorization', authHeader).send({ nome: 'Permissao Alterada' }).expect(200);
    expect(patchRes.body.nome).toBe('Permissao Alterada');
    await request(app.getHttpServer()).delete(`/v1/permissoes/${permissaoId}`).set('Authorization', authHeader).expect(200);
  });

  it('Notificacoes endpoints should create, read, update and delete a notificacao', async () => {
    const createResUser = await request(app.getHttpServer())
      .post('/v1/usuarios')
      .set('Authorization', authHeader)
      .send({ nome: 'Notificacao User', email: 'notificacao@example.com', senhaHash: 'SenhaSegura123' })
      .expect(201);
    const usuarioId = createResUser.body.id;

    const createNotificacao = { usuarioId, titulo: 'Nova Notificacao', mensagem: 'Mensagem de teste', lida: false };
    const createRes = await request(app.getHttpServer()).post('/v1/notificacoes').set('Authorization', authHeader).send(createNotificacao).expect(201);
    expect(createRes.body.id).toBeDefined();
    const notificacaoId = createRes.body.id;

    await request(app.getHttpServer()).get('/v1/notificacoes').set('Authorization', authHeader).expect(200);
    await request(app.getHttpServer()).get(`/v1/notificacoes/${notificacaoId}`).set('Authorization', authHeader).expect(200);
    const patchRes = await request(app.getHttpServer()).patch(`/v1/notificacoes/${notificacaoId}`).set('Authorization', authHeader).send({ lida: true }).expect(200);
    expect(patchRes.body.lida).toBe(true);
    await request(app.getHttpServer()).delete(`/v1/notificacoes/${notificacaoId}`).set('Authorization', authHeader).expect(200);
  });

  it('Caixa de entrada: cada usuário lê e marca só as próprias notificações (sem exigir permissão)', async () => {
    const dono = await criarUsuarioComPermissoes('Dono Notif', 'dono.notif@example.com', []);
    const outro = await criarUsuarioComPermissoes('Outro Notif', 'outro.notif@example.com', []);
    const nova = async (usuarioId: string, titulo: string) =>
      (await request(app.getHttpServer()).post('/v1/notificacoes').set('Authorization', authHeader).send({ usuarioId, titulo, mensagem: 'x' }).expect(201)).body.id as string;
    const n1 = await nova(dono.usuario.id, 'Primeira');
    await nova(dono.usuario.id, 'Segunda');
    const alheia = await nova(outro.usuario.id, 'Do outro');

    await request(app.getHttpServer()).get('/v1/notificacoes/minhas').expect(401);

    const caixa = await request(app.getHttpServer()).get('/v1/notificacoes/minhas').set('Authorization', dono.header).expect(200);
    expect(caixa.body.itens).toHaveLength(2);
    expect(caixa.body.naoLidas).toBe(2);

    await request(app.getHttpServer()).patch(`/v1/notificacoes/minhas/${alheia}/lida`).set('Authorization', dono.header).expect(404);
    await request(app.getHttpServer()).patch(`/v1/notificacoes/minhas/${n1}/lida`).set('Authorization', dono.header).expect(200);
    const depois = await request(app.getHttpServer()).get('/v1/notificacoes/minhas').set('Authorization', dono.header).expect(200);
    expect(depois.body.naoLidas).toBe(1);

    const todas = await request(app.getHttpServer()).post('/v1/notificacoes/minhas/marcar-todas-lidas').set('Authorization', dono.header).expect(201);
    expect(todas.body.atualizadas).toBe(1);
    const doOutro = await request(app.getHttpServer()).get('/v1/notificacoes/minhas').set('Authorization', outro.header).expect(200);
    expect(doOutro.body.naoLidas).toBe(1);
  });

  it('Sessoes endpoints should create, read, update and delete a sessao', async () => {
    const createResUser = await request(app.getHttpServer())
      .post('/v1/usuarios')
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
    const createRes = await request(app.getHttpServer()).post('/v1/sessoes').set('Authorization', authHeader).send(createSessao).expect(201);
    expect(createRes.body.id).toBeDefined();
    const sessaoId = createRes.body.id;

    await request(app.getHttpServer()).get('/v1/sessoes').set('Authorization', authHeader).expect(200);
    await request(app.getHttpServer()).get(`/v1/sessoes/${sessaoId}`).set('Authorization', authHeader).expect(200);
    const patchRes = await request(app.getHttpServer()).patch(`/v1/sessoes/${sessaoId}`).set('Authorization', authHeader).send({ revogada: true }).expect(200);
    expect(patchRes.body.revogada).toBe(true);
    await request(app.getHttpServer()).delete(`/v1/sessoes/${sessaoId}`).set('Authorization', authHeader).expect(200);
  });

  it('Logs auditoria endpoints should create, read, update and delete a log', async () => {
    const createLog = { modulo: 'Auth', acao: 'login', entidade: 'Usuario', entidadeId: '123', ip: '127.0.0.1', navegador: 'Chrome' };
    const createRes = await request(app.getHttpServer()).post('/v1/logs-auditoria').set('Authorization', authHeader).send(createLog).expect(201);
    expect(createRes.body.id).toBeDefined();
    const logId = createRes.body.id;

    await request(app.getHttpServer()).get('/v1/logs-auditoria').set('Authorization', authHeader).expect(200);
    await request(app.getHttpServer()).get(`/v1/logs-auditoria/${logId}`).set('Authorization', authHeader).expect(200);
    const patchRes = await request(app.getHttpServer()).patch(`/v1/logs-auditoria/${logId}`).set('Authorization', authHeader).send({ acao: 'logout' }).expect(200);
    expect(patchRes.body.acao).toBe('logout');
    await request(app.getHttpServer()).delete(`/v1/logs-auditoria/${logId}`).set('Authorization', authHeader).expect(200);
  });

  it('Paginação opcional: sem `pagina`/`limite` devolve array; com eles devolve envelope com metadados', async () => {
    // Contrato deliberadamente retrocompatível (`src/common/pagination.ts`): as telas do
    // frontend consomem array direto, então omitir os parâmetros tem que continuar devolvendo
    // exatamente o que sempre devolveu. O envelope só aparece quando é pedido.
    const semPaginacao = await request(app.getHttpServer()).get('/v1/usuarios').set('Authorization', authHeader).expect(200);
    expect(Array.isArray(semPaginacao.body)).toBe(true);

    const comPaginacao = await request(app.getHttpServer())
      .get('/v1/usuarios?pagina=1&limite=2')
      .set('Authorization', authHeader)
      .expect(200);
    expect(Array.isArray(comPaginacao.body.dados)).toBe(true);
    expect(comPaginacao.body.dados.length).toBeLessThanOrEqual(2);
    expect(comPaginacao.body.paginacao).toEqual({
      pagina: 1,
      limite: 2,
      total: semPaginacao.body.length,
      totalPaginas: Math.ceil(semPaginacao.body.length / 2),
    });

    // `limite` acima do teto (200) é recusado, para uma query não conseguir arrastar a tabela inteira.
    await request(app.getHttpServer()).get('/v1/usuarios?limite=500').set('Authorization', authHeader).expect(400);
    await request(app.getHttpServer()).get('/v1/usuarios?pagina=0').set('Authorization', authHeader).expect(400);
  });

  it('Usuarios-setores and usuarios-permissoes flows should create, read and delete association entities', async () => {
    const userRes = await request(app.getHttpServer())
      .post('/v1/usuarios')
      .set('Authorization', authHeader)
      .send({ nome: 'Assoc User', email: 'assoc.user@example.com', senhaHash: 'SenhaSegura123' })
      .expect(201);
    const setorRes = await request(app.getHttpServer()).post('/v1/setores').set('Authorization', authHeader).send({ nome: 'Assoc Setor' }).expect(201);
    const moduloRes = await request(app.getHttpServer()).post('/v1/modulos').set('Authorization', authHeader).send({ nome: 'Assoc Modulo', ativo: true }).expect(201);
    const permissaoRes = await request(app.getHttpServer())
      .post('/v1/permissoes')
      .set('Authorization', authHeader)
      .send({ nome: 'assoc.permissao', moduloId: moduloRes.body.id, recurso: '/assoc', acao: 'acessar' })
      .expect(201);

    const usuarioSetorRes = await request(app.getHttpServer())
      .post('/v1/usuarios-setores')
      .set('Authorization', authHeader)
      .send({ usuarioId: userRes.body.id, setorId: setorRes.body.id })
      .expect(201);
    expect(usuarioSetorRes.body.id).toBeDefined();
    await request(app.getHttpServer()).get('/v1/usuarios-setores').set('Authorization', authHeader).expect(200);
    await request(app.getHttpServer()).get(`/v1/usuarios-setores/${usuarioSetorRes.body.id}`).set('Authorization', authHeader).expect(200);
    await request(app.getHttpServer()).delete(`/v1/usuarios-setores/${usuarioSetorRes.body.id}`).set('Authorization', authHeader).expect(200);

    const usuarioPermissaoRes = await request(app.getHttpServer())
      .post('/v1/usuarios-permissoes')
      .set('Authorization', authHeader)
      .send({ usuarioId: userRes.body.id, permissaoId: permissaoRes.body.id })
      .expect(201);
    expect(usuarioPermissaoRes.body.id).toBeDefined();
    await request(app.getHttpServer()).get('/v1/usuarios-permissoes').set('Authorization', authHeader).expect(200);
    await request(app.getHttpServer()).get(`/v1/usuarios-permissoes/${usuarioPermissaoRes.body.id}`).set('Authorization', authHeader).expect(200);
    await request(app.getHttpServer()).delete(`/v1/usuarios-permissoes/${usuarioPermissaoRes.body.id}`).set('Authorization', authHeader).expect(200);
  });

  it('Proteção do último administrador: não dá para revogar, excluir nem desativar o único admin ativo', async () => {
    // Perder o último administrador é irreversível PELA INTERFACE: ninguém sobra
    // para conceder a permissão de volta. Os três caminhos que levam a isso
    // (revogar / excluir / desativar) precisam estar fechados.
    const admin = await prisma.usuario.findFirst({ where: { email: 'admin.teste@example.com' } });
    expect(admin).toBeTruthy();
    const vinculoAdmin = await prisma.usuarioPermissao.findFirst({
      where: {
        usuarioId: admin!.id,
        permissao: { recurso: '/hub/acessos', acao: 'gerenciar-permissoes', modulo: { nome: 'Rooster Hub' } },
      },
    });
    expect(vinculoAdmin).toBeTruthy();

    // Sendo o único admin, os três caminhos são bloqueados com 409.
    await request(app.getHttpServer()).delete(`/v1/usuarios-permissoes/${vinculoAdmin!.id}`).set('Authorization', authHeader).expect(409);
    await request(app.getHttpServer()).delete(`/v1/usuarios/${admin!.id}`).set('Authorization', authHeader).expect(409);
    await request(app.getHttpServer()).patch(`/v1/usuarios/${admin!.id}`).set('Authorization', authHeader).send({ ativo: false }).expect(409);

    // Com um segundo administrador ativo, a trava sai do caminho.
    const segundoAdmin = await criarUsuarioComPermissoes('Segundo Admin', 'segundo.admin@example.com', [
      ['Rooster Hub', '/hub/acessos', 'gerenciar-permissoes'],
    ]);
    await request(app.getHttpServer()).delete(`/v1/usuarios-permissoes/${vinculoAdmin!.id}`).set('Authorization', authHeader).expect(200);

    // E agora o segundo admin passou a ser o último: a trava acompanha quem é o último, não um id fixo.
    const vinculoSegundo = await prisma.usuarioPermissao.findFirst({ where: { usuarioId: segundoAdmin.usuario.id } });
    await request(app.getHttpServer())
      .delete(`/v1/usuarios-permissoes/${vinculoSegundo!.id}`)
      .set('Authorization', segundoAdmin.header)
      .expect(409);
  });

  it('Rooster Desk should create, read, update and delete a ticket flow', async () => {
    const userRes = await request(app.getHttpServer())
      .post('/v1/usuarios')
      .set('Authorization', authHeader)
      .send({ nome: 'Desk User', email: 'desk.user@example.com', senhaHash: 'SenhaSegura123' })
      .expect(201);
    const setorRes = await request(app.getHttpServer())
      .post('/v1/setores')
      .set('Authorization', authHeader)
      .send({ nome: 'Setor Desk E2E' })
      .expect(201);
    const categoriaRes = await request(app.getHttpServer())
      .post('/v1/chamados-categorias')
      .set('Authorization', authHeader)
      .send({ nome: 'Suporte', descricao: 'Solicitações de suporte', setorId: setorRes.body.id })
      .expect(201);
    const prioridadeRes = await request(app.getHttpServer())
      .post('/v1/chamados-prioridades')
      .set('Authorization', authHeader)
      // CreatePrioridadeTicketDto restringe `nome` a um enum fechado e minúsculo
      // (@IsIn(['baixa','media','alta','urgente'])), igual ao seed real — ver
      // prisma/seed-dev.ts. Esse @IsIn só passou a ser exercitado de verdade
      // quando a suíte e2e ganhou o mesmo ValidationPipe da aplicação real
      // (src/app-config.ts); antes disso o teste "passava" sem validar nada.
      .send({ nome: 'alta', cor: '#ef4444' })
      .expect(201);
    // Regressão dupla: PrioridadeTicket.id não tinha @default(uuid()) em
    // schema.prisma (só em schema.test.prisma) — criar prioridade quebraria em
    // produção; e CreateTicketDto.prioridadeId era @IsIn(['1','2','3','4']),
    // que rejeitaria qualquer id gerado (não-literal) como este. A asserção
    // abaixo garante que o teste está de fato exercitando um id gerado, não um
    // dos quatro literais do seed — sem ela, a regressão passaria por acaso se
    // alguém reintroduzisse ids fixos.
    expect(['1', '2', '3', '4']).not.toContain(prioridadeRes.body.id);
    const statusRes = await request(app.getHttpServer())
      .post('/v1/chamados-status')
      .set('Authorization', authHeader)
      .send({ nome: 'Aberto', ordem: 1 })
      .expect(201);

    const ticketRes = await request(app.getHttpServer())
      .post('/v1/chamados')
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

    await request(app.getHttpServer()).get('/v1/chamados').set('Authorization', authHeader).expect(200);
    await request(app.getHttpServer()).get(`/v1/chamados/${ticketId}`).set('Authorization', authHeader).expect(200);
    const patchRes = await request(app.getHttpServer())
      .patch(`/v1/chamados/${ticketId}`)
      .set('Authorization', authHeader)
      .send({ titulo: 'Acesso atualizado' })
      .expect(200);
    expect(patchRes.body.titulo).toBe('Acesso atualizado');

    // Atribuição: quem atribui e o técnico precisam pertencer ao setor do chamado
    // (`RoosterDeskService.canManageTicket`); o técnico atribuído recebe notificação.
    const adminDesk = await prisma.usuario.findFirst({ where: { email: 'admin.teste@example.com' } });
    for (const usuarioId of [adminDesk!.id, userRes.body.id]) {
      await request(app.getHttpServer())
        .post('/v1/usuarios-setores')
        .set('Authorization', authHeader)
        .send({ usuarioId, setorId: setorRes.body.id })
        .expect(201);
    }
    await request(app.getHttpServer())
      .patch(`/v1/chamados/${ticketId}/atribuir`)
      .set('Authorization', authHeader)
      .send({ tecnicoId: userRes.body.id })
      .expect(200);
    const avisoAtribuicao = await prisma.notificacao.findFirst({
      where: { usuarioId: userRes.body.id, titulo: 'Chamado atribuído a você' },
    });
    expect(avisoAtribuicao).not.toBeNull();
    expect(avisoAtribuicao!.rota).toBe(`/desk/tickets/${ticketId}`);
    expect(avisoAtribuicao!.mensagem).toContain('TCK-000001');

    const mensagemRes = await request(app.getHttpServer())
      .post(`/v1/chamados/${ticketId}/mensagens`)
      .set('Authorization', authHeader)
      .send({ mensagem: 'Estou acompanhando o caso.' })
      .expect(201);
    expect(mensagemRes.body.id).toBeDefined();

    const anexoRes = await request(app.getHttpServer())
      .post(`/v1/chamados/${ticketId}/anexos`)
      .set('Authorization', authHeader)
      .attach('arquivo', Buffer.from('conteúdo de teste'), 'evidencia.txt')
      .expect(201);
    expect(anexoRes.body.nomeArquivo).toBe('evidencia.txt');
    expect(typeof anexoRes.body.tamanho).toBe('number'); // BigInt no schema — precisa vir serializado como number

    // Mimetype fora da lista permitida (ex.: executável) é recusado antes de chegar ao handler — 400.
    await request(app.getHttpServer())
      .post(`/v1/chamados/${ticketId}/anexos`)
      .set('Authorization', authHeader)
      .attach('arquivo', Buffer.from('MZ...'), { filename: 'suspeito.exe', contentType: 'application/x-msdownload' })
      .expect(400);

    // Mimetype permitido, mas conteúdo incompatível (executável declarado como PNG — cenário do
    // pentest interno): recusado pela verificação de assinatura binária, também com 400.
    const executavelDisfarcado = await request(app.getHttpServer())
      .post(`/v1/chamados/${ticketId}/anexos`)
      .set('Authorization', authHeader)
      .attach('arquivo', Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]), { filename: 'imagem.png', contentType: 'image/png' })
      .expect(400);
    expect(executavelDisfarcado.body.message).toMatch(/não corresponde ao tipo declarado/);

    const anexosListRes = await request(app.getHttpServer())
      .get(`/v1/chamados/${ticketId}/anexos`)
      .set('Authorization', authHeader)
      .expect(200);
    expect(anexosListRes.body.some((a: any) => a.id === anexoRes.body.id)).toBe(true);

    const downloadRes = await request(app.getHttpServer())
      .get(`/v1/chamados/${ticketId}/anexos/${anexoRes.body.id}/arquivo`)
      .set('Authorization', authHeader)
      .expect(200);
    expect(downloadRes.text).toBe('conteúdo de teste');

    // Nome de arquivo com caracteres fora do ASCII/Latin-1 (travessão, acento): o cabeçalho
    // Content-Disposition precisa usar a codificação da RFC 6266 (filename*=UTF-8''...), senão
    // o Node recusa o cabeçalho e o download termina em HTTP 500.
    const anexoNaoAscii = await request(app.getHttpServer())
      .post(`/v1/chamados/${ticketId}/anexos`)
      .set('Authorization', authHeader)
      .attach('arquivo', Buffer.from('relatório'), { filename: 'Relatório — final.txt', contentType: 'text/plain' })
      .expect(201);
    // Nome gravado íntegro (o busboy decodificava o nome multipart como Latin-1 por padrão).
    expect(anexoNaoAscii.body.nomeArquivo).toBe('Relatório — final.txt');
    const downloadNaoAscii = await request(app.getHttpServer())
      .get(`/v1/chamados/${ticketId}/anexos/${anexoNaoAscii.body.id}/arquivo`)
      .set('Authorization', authHeader)
      .expect(200);
    expect(downloadNaoAscii.headers['content-disposition']).toContain("filename*=UTF-8''Relat%C3%B3rio%20%E2%80%94%20final.txt");

    // Prova de que o arquivo está cifrado em repouso, não só que a API continua funcionando:
    // lê o arquivo cru direto do disco (nunca pela API) e confere que o texto original não
    // aparece nos bytes gravados.
    const anexoNoBanco = await prisma.anexoTicket.findUnique({ where: { id: anexoRes.body.id } });
    const bytesNoDisco = readFileSync(join(PASTAS.anexosTickets(), anexoNoBanco!.caminho!));
    expect(bytesNoDisco.includes('conteúdo de teste')).toBe(false);

    const ticketComAnexoRes = await request(app.getHttpServer())
      .get(`/v1/chamados/${ticketId}`)
      .set('Authorization', authHeader)
      .expect(200);
    expect(ticketComAnexoRes.body.anexos.some((a: any) => a.id === anexoRes.body.id)).toBe(true);

    const statusEncerradoRes = await request(app.getHttpServer())
      .post('/v1/chamados-status')
      .set('Authorization', authHeader)
      .send({ nome: 'Encerrado', ordem: 2, encerrado: true })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/v1/chamados/${ticketId}/status`)
      .set('Authorization', authHeader)
      .send({ statusId: statusEncerradoRes.body.id })
      .expect(200);

    const ticketDetalheRes = await request(app.getHttpServer())
      .get(`/v1/chamados/${ticketId}`)
      .set('Authorization', authHeader)
      .expect(200);
    expect(ticketDetalheRes.body.historico.some((h: any) => h.campo === 'status' && h.valorNovo === 'Encerrado')).toBe(true);
    // encerradoEm é derivado da transição de status, não depende do cliente mandar a data
    expect(ticketDetalheRes.body.encerradoEm).not.toBeNull();

    const statusReabertoRes = await request(app.getHttpServer())
      .post('/v1/chamados-status')
      .set('Authorization', authHeader)
      .send({ nome: 'Em atendimento (reaberto)', ordem: 3, encerrado: false })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/v1/chamados/${ticketId}/status`)
      .set('Authorization', authHeader)
      .send({ statusId: statusReabertoRes.body.id })
      .expect(200);
    const ticketReabertoRes = await request(app.getHttpServer())
      .get(`/v1/chamados/${ticketId}`)
      .set('Authorization', authHeader)
      .expect(200);
    expect(ticketReabertoRes.body.encerradoEm).toBeNull();

    const avaliacaoRes = await request(app.getHttpServer())
      .post('/v1/avaliacoes-tickets')
      .set('Authorization', authHeader)
      .send({ ticketId, usuarioId: userRes.body.id, nota: 5, comentario: 'Atendimento resolvido.' })
      .expect(201);
    expect(avaliacaoRes.body.nota).toBe(5);

    await request(app.getHttpServer()).delete(`/v1/chamados/${ticketId}`).set('Authorization', authHeader).expect(200);
  });

  // Regressão: um usuário com só `desk.tickets.criar` (ex.: um solicitante que
  // só abre chamado, nunca navega para a fila) ficava com o formulário de novo
  // chamado sem opção nenhuma — GET categorias/subcategorias/prioridades/status
  // exigiam `acessar`, que esse perfil não tem. Achado real em teste manual.
  it('Rooster Desk: quem só tem `criar` (sem `acessar`) ainda consegue ler a taxonomia do formulário de novo chamado', async () => {
    const soCriar = await criarUsuarioComPermissoes('So Cria Chamado', 'so.criar.chamado@example.com', [
      ['Rooster Desk', '/desk/tickets', 'criar'],
    ]);
    await request(app.getHttpServer()).get('/v1/chamados-categorias').set('Authorization', soCriar.header).expect(200);
    await request(app.getHttpServer()).get('/v1/chamados-subcategorias').set('Authorization', soCriar.header).expect(200);
    await request(app.getHttpServer()).get('/v1/chamados-prioridades').set('Authorization', soCriar.header).expect(200);
    await request(app.getHttpServer()).get('/v1/chamados-status').set('Authorization', soCriar.header).expect(200);

    const semPermissaoDesk = await criarUsuarioComPermissoes('Sem Permissao Desk', 'sem.permissao.desk@example.com', []);
    await request(app.getHttpServer()).get('/v1/chamados-categorias').set('Authorization', semPermissaoDesk.header).expect(403);
  });

  // Regressão: o teste acima só checava o status 200 — e um solicitante SEM setor (o caso comum)
  // recebia 200 com a lista VAZIA, porque a listagem de gestão filtra pelo setor do usuário.
  // O formulário de novo chamado ficava sem categoria, subcategoria e prioridade.
  it('Rooster Desk: o formulário de novo chamado recebe as categorias de todos os setores, mesmo de quem não tem setor', async () => {
    const setor = await request(app.getHttpServer()).post('/v1/setores').set('Authorization', authHeader).send({ nome: 'Setor Abertura E2E' }).expect(201);
    const categoria = await request(app.getHttpServer())
      .post('/v1/chamados-categorias').set('Authorization', authHeader)
      .send({ nome: 'Categoria Abertura E2E', descricao: 'x', setorId: setor.body.id }).expect(201);
    await request(app.getHttpServer())
      .post('/v1/chamados-subcategorias').set('Authorization', authHeader)
      .send({ nome: 'Sub Abertura E2E', categoriaId: categoria.body.id }).expect(201);

    const semSetor = await criarUsuarioComPermissoes('Solicitante Sem Setor', 'solicitante.sem.setor@example.com', [
      ['Rooster Desk', '/desk/tickets', 'criar'],
    ]);

    const gestao = await request(app.getHttpServer()).get('/v1/chamados-categorias').set('Authorization', semSetor.header).expect(200);
    expect(gestao.body.some((c: any) => c.id === categoria.body.id)).toBe(false);

    const abertura = await request(app.getHttpServer()).get('/v1/chamados-categorias?escopo=abertura').set('Authorization', semSetor.header).expect(200);
    const achada = abertura.body.find((c: any) => c.id === categoria.body.id);
    expect(achada).toBeDefined();
    expect(achada.subcategorias.map((sub: any) => sub.nome)).toContain('Sub Abertura E2E');
    expect(achada.subcategorias.every((sub: any) => sub.atendentes === undefined)).toBe(true);

    const semPermissaoDesk = await criarUsuarioComPermissoes('Sem Desk Abertura', 'sem.desk.abertura@example.com', []);
    await request(app.getHttpServer()).get('/v1/chamados-categorias?escopo=abertura').set('Authorization', semPermissaoDesk.header).expect(403);
  });

  it('Rooster Rooms should create structure, request and approve a reservation', async () => {
    const campusRes = await request(app.getHttpServer())
      .post('/v1/campus')
      .set('Authorization', authHeader)
      .send({ nome: 'Campus E2E', codigo: 'E2E' })
      .expect(201);
    const blocoRes = await request(app.getHttpServer())
      .post('/v1/blocos')
      .set('Authorization', authHeader)
      .send({ campusId: campusRes.body.id, nome: 'Bloco E2E', codigo: 'B1' })
      .expect(201);
    const ambienteRes = await request(app.getHttpServer())
      .post('/v1/ambientes')
      .set('Authorization', authHeader)
      .send({ campusId: campusRes.body.id, blocoId: blocoRes.body.id, nome: 'Sala E2E', codigo: 'S-E2E', andar: 1, tipo: 'sala', capacidade: 10 })
      .expect(201);

    const reservaRes = await request(app.getHttpServer())
      .post('/v1/reservas')
      .set('Authorization', authHeader)
      .send({
        codigo: 'RES-E2E-0001',
        ambienteId: ambienteRes.body.id,
        responsavel: 'Solicitante E2E',
        evento: 'Reunião de teste',
        data: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        horarioInicio: '10:00',
        horarioFim: '11:00',
        // participantes é obrigatório no CreateReservaDto (@IsInt @Min(1), sem
        // @IsOptional) — só passou a ser exercitado quando a suíte ganhou o
        // mesmo ValidationPipe da aplicação real (src/app-config.ts).
        participantes: 8,
      })
      .expect(201);
    expect(reservaRes.body.status).toBe('analise');

    const statusRes = await request(app.getHttpServer())
      .patch(`/v1/reservas/${reservaRes.body.id}/status`)
      .set('Authorization', authHeader)
      .send({ status: 'confirmada' })
      .expect(200);
    expect(statusRes.body.status).toBe('confirmada');

    const mensagemRes = await request(app.getHttpServer())
      .post(`/v1/reservas/${reservaRes.body.id}/mensagens`)
      .set('Authorization', authHeader)
      .send({ mensagem: 'Sala liberada para o evento.' })
      .expect(201);
    expect(mensagemRes.body.mensagem).toBe('Sala liberada para o evento.');

    const mensagensListRes = await request(app.getHttpServer())
      .get(`/v1/reservas/${reservaRes.body.id}/mensagens`)
      .set('Authorization', authHeader)
      .expect(200);
    expect(mensagensListRes.body.length).toBe(1);

    const canceladaRes = await request(app.getHttpServer())
      .patch(`/v1/reservas/${reservaRes.body.id}/status`)
      .set('Authorization', authHeader)
      .send({ status: 'cancelada', motivo: 'Evento adiado' })
      .expect(200);
    expect(canceladaRes.body.motivoCancelamento).toBe('Evento adiado');

    const reservaDetalheRes = await request(app.getHttpServer())
      .get(`/v1/reservas/${reservaRes.body.id}`)
      .set('Authorization', authHeader)
      .expect(200);
    expect(reservaDetalheRes.body.historico.some((h: any) => h.campo === 'status' && h.valorNovo === 'cancelada')).toBe(true);
  });

  it('Rooster Rooms recurring series: generates occurrences, rejects on conflict atomically, cancels in bulk', async () => {
    const campusRes = await request(app.getHttpServer())
      .post('/v1/campus')
      .set('Authorization', authHeader)
      .send({ nome: 'Campus Série E2E', codigo: 'SER' })
      .expect(201);
    const blocoRes = await request(app.getHttpServer())
      .post('/v1/blocos')
      .set('Authorization', authHeader)
      .send({ campusId: campusRes.body.id, nome: 'Bloco Série E2E', codigo: 'B1' })
      .expect(201);
    const ambienteRes = await request(app.getHttpServer())
      .post('/v1/ambientes')
      .set('Authorization', authHeader)
      .send({ campusId: campusRes.body.id, blocoId: blocoRes.body.id, nome: 'Sala Série E2E', codigo: 'S-SER', andar: 1, tipo: 'sala', capacidade: 10 })
      .expect(201);

    const primeiraData = new Date(Date.now() + 7 * 86400000);
    const repetirAte = new Date(primeiraData.getTime() + 21 * 86400000); // +3 semanas = 4 ocorrências

    const serieRes = await request(app.getHttpServer())
      .post('/v1/reservas/serie')
      .set('Authorization', authHeader)
      .send({
        codigo: 'RES-SERIE-E2E',
        ambienteId: ambienteRes.body.id,
        responsavel: 'Solicitante Série E2E',
        evento: 'Aula recorrente E2E',
        data: primeiraData.toISOString().slice(0, 10),
        horarioInicio: '10:00',
        horarioFim: '11:00',
        participantes: 8,
        recorrencia: 'semanal',
        repetirAte: repetirAte.toISOString().slice(0, 10),
      })
      .expect(201);
    expect(serieRes.body.reservas.length).toBe(4);
    expect(serieRes.body.reservas.every((r: any) => r.serieId === serieRes.body.serieId)).toBe(true);
    const serieId = serieRes.body.serieId;

    // colide com a 2ª ocorrência (mesmo horário, mesma sala) -> a série inteira deve ser rejeitada, nada criado
    await request(app.getHttpServer())
      .post('/v1/reservas/serie')
      .set('Authorization', authHeader)
      .send({
        codigo: 'RES-SERIE-CONFLITO-E2E',
        ambienteId: ambienteRes.body.id,
        responsavel: 'Conflito E2E',
        evento: 'Colide',
        data: primeiraData.toISOString().slice(0, 10),
        horarioInicio: '10:30',
        horarioFim: '11:30',
        participantes: 8,
        recorrencia: 'semanal',
        repetirAte: repetirAte.toISOString().slice(0, 10),
      })
      .expect(409);

    const listaRes = await request(app.getHttpServer())
      .get(`/v1/reservas/serie/${serieId}`)
      .set('Authorization', authHeader)
      .expect(200);
    expect(listaRes.body.length).toBe(4);
    expect(listaRes.body.some((r: any) => r.codigo === 'RES-SERIE-CONFLITO-E2E')).toBe(false);

    const cancelRes = await request(app.getHttpServer())
      .patch(`/v1/reservas/serie/${serieId}/cancelar`)
      .set('Authorization', authHeader)
      .send({ motivo: 'Cancelamento em massa E2E' })
      .expect(200);
    expect(cancelRes.body.canceladas).toBe(4);

    const listaCanceladaRes = await request(app.getHttpServer())
      .get(`/v1/reservas/serie/${serieId}`)
      .set('Authorization', authHeader)
      .expect(200);
    expect(listaCanceladaRes.body.every((r: any) => r.status === 'cancelada')).toBe(true);
  });

  it('Rooster Assets should register an asset and a movement', async () => {
    const categoriaRes = await request(app.getHttpServer())
      .post('/v1/patrimonio-categorias')
      .set('Authorization', authHeader)
      .send({ nome: 'Categoria E2E' })
      .expect(201);
    const setorRes = await request(app.getHttpServer())
      .post('/v1/patrimonio-setores')
      .set('Authorization', authHeader)
      .send({ nome: 'Setor Patrimonio E2E' })
      .expect(201);
    const assetRes = await request(app.getHttpServer())
      .post('/v1/patrimonio')
      .set('Authorization', authHeader)
      // adquiridoEm/valor são obrigatórios no CreateAssetDto (@IsDateString/@IsNumber,
      // sem @IsOptional) — o formulário real sempre os envia (padrão: hoje / 0).
      // Só passou a ser exercitado quando a suíte ganhou o mesmo ValidationPipe
      // da aplicação real (src/app-config.ts).
      .send({ nome: 'Notebook E2E', tag: 'PAT-E2E-0001', categoriaId: categoriaRes.body.id, setorId: setorRes.body.id, adquiridoEm: '2026-01-15', valor: 4500 })
      .expect(201);

    const movimentoRes = await request(app.getHttpServer())
      .post('/v1/patrimonio-movimentacoes')
      .set('Authorization', authHeader)
      .send({ patrimonioId: assetRes.body.id, tipo: 'setor', destino: 'Outro setor', usuario: 'Admin Teste' })
      .expect(201);
    expect(movimentoRes.body.movimentacao.id).toBeDefined();

    await request(app.getHttpServer()).get('/v1/patrimonio').set('Authorization', authHeader).expect(200);
  });

  it('Asset loans: overdue tracking and return flow', async () => {
    const categoriaRes = await request(app.getHttpServer())
      .post('/v1/patrimonio-categorias')
      .set('Authorization', authHeader)
      .send({ nome: 'Categoria Empréstimo E2E' })
      .expect(201);
    const assetRes = await request(app.getHttpServer())
      .post('/v1/patrimonio')
      .set('Authorization', authHeader)
      .send({ nome: 'Projetor E2E', tag: 'PAT-E2E-EMP', categoriaId: categoriaRes.body.id, adquiridoEm: '2026-01-15', valor: 3200 })
      .expect(201);

    const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const emprestimoRes = await request(app.getHttpServer())
      .post('/v1/patrimonio-movimentacoes')
      .set('Authorization', authHeader)
      .send({ patrimonioId: assetRes.body.id, tipo: 'emprestimo', destino: 'Prof. E2E', usuario: 'Admin Teste', dataDevolucaoPrevista: ontem })
      .expect(201);
    expect(emprestimoRes.body.patrimonio.status).toBe('emprestado');
    const movimentoId = emprestimoRes.body.movimentacao.id;

    const atrasadosRes = await request(app.getHttpServer())
      .get('/v1/patrimonio-emprestimos-atrasados')
      .set('Authorization', authHeader)
      .expect(200);
    expect(atrasadosRes.body.some((m: any) => m.id === movimentoId)).toBe(true);

    const devolverRes = await request(app.getHttpServer())
      .patch(`/v1/patrimonio-movimentacoes/${movimentoId}/devolver`)
      .set('Authorization', authHeader)
      .send({ usuario: 'Admin Teste' })
      .expect(200);
    expect(devolverRes.body.status).toBe('disponivel');

    const atrasadosDepoisRes = await request(app.getHttpServer())
      .get('/v1/patrimonio-emprestimos-atrasados')
      .set('Authorization', authHeader)
      .expect(200);
    expect(atrasadosDepoisRes.body.some((m: any) => m.id === movimentoId)).toBe(false);

    await request(app.getHttpServer())
      .patch(`/v1/patrimonio-movimentacoes/${movimentoId}/devolver`)
      .set('Authorization', authHeader)
      .send({ usuario: 'Admin Teste' })
      .expect(400);
  });

  it('Refresh token: login devolve o par, renova com rotação, e o token antigo deixa de valer', async () => {
    const usuario = await criarUsuarioComPermissoes('Refresh User', 'refresh.user@example.com', []);

    const login = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: 'refresh.user@example.com', senha: 'Senha123!' })
      .expect(201);
    expect(typeof login.body.refreshToken).toBe('string');
    expect(login.body.refreshToken).toHaveLength(64);

    // O banco nunca guarda o refresh token em texto puro — só o hash SHA-256.
    // (Localizar a sessão pelo hash, e não pelo usuário: `criarUsuarioComPermissoes`
    // já faz um login, então este usuário tem mais de uma sessão aberta.)
    const hashDoToken = createHash('sha256').update(login.body.refreshToken as string).digest('hex');
    const sessaoCrua = await prisma.sessao.findFirst({ where: { refreshToken: hashDoToken } });
    expect(sessaoCrua).toBeTruthy();
    expect(sessaoCrua!.refreshToken).not.toBe(login.body.refreshToken);

    // Renovar devolve um par novo e um access token utilizável.
    const renovado = await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refreshToken: login.body.refreshToken })
      .expect(201);
    expect(renovado.body.refreshToken).not.toBe(login.body.refreshToken);
    await request(app.getHttpServer())
      .get('/v1/me/perfil')
      .set('Authorization', `Bearer ${renovado.body.accessToken}`)
      .expect((res) => {
        // 200 ou 403/404 conforme o vínculo do usuário — o que importa é não ser 401.
        expect(res.status).not.toBe(401);
      });

    // Rotação: o refresh token usado não serve mais.
    await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refreshToken: login.body.refreshToken })
      .expect(401);

    // Logout revoga o token atual...
    await request(app.getHttpServer()).post('/v1/auth/logout').send({ refreshToken: renovado.body.refreshToken }).expect(201);
    await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refreshToken: renovado.body.refreshToken })
      .expect(401);

    // ...e repetir o logout continua respondendo igual (idempotente, e não revela se o token existia).
    await request(app.getHttpServer()).post('/v1/auth/logout').send({ refreshToken: renovado.body.refreshToken }).expect(201);
  });

  it('Refresh token: desativar o usuário derruba a renovação na hora', async () => {
    // O access token só expira em 8h; sem esta checagem, desativar alguém não
    // teria efeito prático até lá, e a sessão ainda poderia se renovar sozinha.
    const usuario = await criarUsuarioComPermissoes('Refresh Inativo', 'refresh.inativo@example.com', []);
    const login = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: 'refresh.inativo@example.com', senha: 'Senha123!' })
      .expect(201);

    await prisma.usuario.update({ where: { id: usuario.usuario.id }, data: { ativo: false } });

    await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refreshToken: login.body.refreshToken })
      .expect(401);
  });

  it('Refresh token: sessão expirada não renova e fica revogada', async () => {
    await criarUsuarioComPermissoes('Refresh Expirado', 'refresh.expirado@example.com', []);
    const login = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: 'refresh.expirado@example.com', senha: 'Senha123!' })
      .expect(201);

    // Localiza pelo hash do token, e não pelo usuário: `criarUsuarioComPermissoes`
    // já abriu uma sessão antes desta, e expirar a errada não testaria nada.
    const hashDoToken = createHash('sha256').update(login.body.refreshToken as string).digest('hex');
    const sessao = await prisma.sessao.findFirst({ where: { refreshToken: hashDoToken } });
    await prisma.sessao.update({ where: { id: sessao!.id }, data: { expiraEm: new Date(Date.now() - 1000) } });

    await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refreshToken: login.body.refreshToken })
      .expect(401);

    const depois = await prisma.sessao.findUnique({ where: { id: sessao!.id } });
    expect(depois!.revogada).toBe(true);
  });

  it('Password reset via email: request, consume token, old password stops working, token cannot be reused', async () => {
    // e-mail inexistente: mesma resposta genérica, sem 404 e sem enviar e-mail
    await request(app.getHttpServer())
      .post('/v1/auth/esqueci-senha')
      .send({ email: 'nao.existe@example.com' })
      .expect(201);
    expect(mail.outbox.length).toBe(0);

    await request(app.getHttpServer())
      .post('/v1/auth/esqueci-senha')
      .send({ email: 'admin.teste@example.com' })
      .expect(201);
    expect(mail.outbox.length).toBe(1);

    const link = mail.outbox[0].html.match(/href="([^"]+)"/)?.[1];
    expect(link).toBeDefined();
    const token = new URL(link!).searchParams.get('token');
    expect(token).toBeTruthy();

    await request(app.getHttpServer())
      .post('/v1/auth/redefinir-senha')
      .send({ token: 'token-invalido', novaSenha: 'NovaSenha789' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/v1/auth/redefinir-senha')
      .send({ token, novaSenha: 'NovaSenha789' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: 'admin.teste@example.com', senha: 'Senha123!' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: 'admin.teste@example.com', senha: 'NovaSenha789' })
      .expect(201);

    // token já usado não pode ser reaproveitado
    await request(app.getHttpServer())
      .post('/v1/auth/redefinir-senha')
      .send({ token, novaSenha: 'OutraSenha999' })
      .expect(400);
  });

  it('Security-relevant events are written automatically to LogAuditoria', async () => {
    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: 'admin.teste@example.com', senha: 'senha-errada' })
      .expect(401);

    const logsRes = await request(app.getHttpServer()).get('/v1/logs-auditoria').set('Authorization', authHeader).expect(200);
    const acoes = logsRes.body.map((log: any) => log.acao);
    expect(acoes).toContain('login_sucesso'); // do beforeEach (seedAdminAndLogin)
    expect(acoes).toContain('login_falhou');
  });

  it('Rastreamento de erros: relatório e exportação exigem permissão própria; recusas esperadas (403/404) nunca aparecem, só erros de verdade', async () => {
    // A captura automática (status >= 500 -> logs_erro) é coberta em unidade
    // (src/common/all-exceptions.filter.spec.ts) — aqui a semente vai direto
    // no banco, do mesmo jeito que os outros testes de relatório já fazem.
    await prisma.logErro.deleteMany();
    await prisma.logErro.create({
      data: {
        metodo: 'GET', rota: '/v1/exemplo/quebrado', statusCode: 500,
        mensagem: 'Falha simulada para o teste de relatório.', stack: 'Error: simulado\n  at teste',
        criadoEm: new Date(),
      },
    });

    const semPermissao = await criarUsuarioComPermissoes('Sem Permissao Erros', 'sem.permissao.erros@example.com', [
      ['Rooster Hub', '/hub/acessos', 'acessar'],
    ]);
    await request(app.getHttpServer()).get('/v1/logs-erro/relatorio').set('Authorization', semPermissao.header).expect(403);
    await request(app.getHttpServer()).get('/v1/logs-erro/exportar').set('Authorization', semPermissao.header).expect(403);

    const relatorioRes = await request(app.getHttpServer()).get('/v1/logs-erro/relatorio').set('Authorization', authHeader).expect(200);
    expect(relatorioRes.body.total).toBeGreaterThanOrEqual(1);
    expect(relatorioRes.body.recentes[0].statusCode).toBe(500);
    expect(relatorioRes.body.porStatus.some((r: any) => r.statusCode === 500)).toBe(true);

    const csvRes = await request(app.getHttpServer()).get('/v1/logs-erro/exportar').set('Authorization', authHeader).expect(200);
    expect(csvRes.text).toContain('Falha simulada para o teste de relatório.');
  });

  it('Segurança: POST /anexos-tickets não aceita caminho/tipo/tamanho do cliente (achado de pentest, setembro/2026)', async () => {
    // Antes desta correção, qualquer usuário com a permissão `anexar` podia criar um
    // AnexoTicket com `caminho` livre, apontando para o arquivo de outro anexo (de um
    // ticket ao qual não tinha acesso) e baixá-lo através de um ticket próprio — IDOR via
    // path traversal armazenado. O único jeito legítimo de um anexo apontar para um
    // arquivo é `POST /chamados/:id/anexos` (multipart), que sempre gera o nome no servidor.
    // `ticketId` não precisa existir de verdade: o `ValidationPipe` (whitelist) recusa os
    // campos antes de qualquer lógica do controller rodar.
    const ticketIdQualquer = '99999999-9999-4999-8999-999999999999';

    await request(app.getHttpServer())
      .post('/v1/anexos-tickets')
      .set('Authorization', authHeader)
      .send({ ticketId: ticketIdQualquer, nomeArquivo: 'x.txt', caminho: '../../../../.env', tipo: 'text/plain', tamanho: 10 })
      .expect(400);

    await request(app.getHttpServer())
      .post('/v1/anexos-tickets')
      .set('Authorization', authHeader)
      .send({ ticketId: ticketIdQualquer, nomeArquivo: 'x.txt', tamanho: 10 })
      .expect(400);
  });

  describe('Rooster Hub — Configurações (status/teste de e-mail)', () => {
    it('GET /configuracoes/email exige permissão (403 para quem não é admin)', async () => {
      const { header } = await criarUsuarioComPermissoes('Sem Acesso Config', 'sem-acesso-config@example.com', [
        ['Rooster Desk', '/desk/tickets', 'acessar'],
      ]);
      await request(app.getHttpServer())
        .get('/v1/configuracoes/email')
        .set('Authorization', header)
        .expect(403);
    });

    it('GET /configuracoes/email devolve o status sem expor usuário/senha do SMTP', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/configuracoes/email')
        .set('Authorization', authHeader)
        .expect(200);
      // Sem SMTP_HOST no ambiente de teste (ver package.json:test:e2e), o e2e roda sempre
      // em modo dev — é exatamente o cenário "não configurado" que a tela precisa mostrar certo.
      expect(res.body).toEqual({
        configurado: false, host: null, porta: null, seguro: false,
        remetente: expect.any(String), modoDev: true,
      });
      expect(JSON.stringify(res.body)).not.toMatch(/senha|pass/i);
    });

    it('POST /configuracoes/email/teste responde com erro claro quando SMTP não está configurado', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/configuracoes/email/teste')
        .set('Authorization', authHeader)
        .send({})
        .expect(502);
      expect(res.body.message).toMatch(/SMTP não configurado/);
    });

    it('POST /configuracoes/email/teste também exige permissão', async () => {
      const { header } = await criarUsuarioComPermissoes('Sem Acesso Config 2', 'sem-acesso-config-2@example.com', [
        ['Rooster Desk', '/desk/tickets', 'acessar'],
      ]);
      await request(app.getHttpServer())
        .post('/v1/configuracoes/email/teste')
        .set('Authorization', header)
        .send({})
        .expect(403);
    });
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
        .get(`/v1/turmas/${cenario.turmaAlg.id}`)
        .set('Authorization', cenario.coordenador.header)
        .expect(200);
      expect(turmaDetalhe.body.disciplina.nome).toBe('Algoritmos');
      expect(turmaDetalhe.body.matriculas).toHaveLength(1);

      const matriculasRes = await request(app.getHttpServer())
        .get(`/v1/turmas/${cenario.turmaAlg.id}/matriculas`)
        .set('Authorization', cenario.coordenador.header)
        .expect(200);
      expect(matriculasRes.body[0].aluno.usuario.nome).toBe('João Teste');
    });

    it('Rooms ↔ Academy: ao criar a reserva de uma aula, só o professor dono da turma pode vinculá-la', async () => {
      const cenario = await montarCenarioAcademico();

      // profLima/profCosta só têm permissões de Academy/Learn — concede também `/rooms/book solicitar`.
      async function concederSolicitarReserva(usuarioId: string) {
        const modulo = (await prisma.modulo.findFirst({ where: { nome: 'Rooster Rooms' } })) ?? (await prisma.modulo.create({ data: { nome: 'Rooster Rooms', ativo: true } }));
        const permissao = await prisma.permissao.create({ data: { moduloId: modulo.id, nome: `Rooster Rooms:/rooms/book:solicitar:${usuarioId}`, recurso: '/rooms/book', acao: 'solicitar' } });
        await prisma.usuarioPermissao.create({ data: { usuarioId, permissaoId: permissao.id } });
      }
      async function concederAcessarRooms(usuarioId: string) {
        const modulo = (await prisma.modulo.findFirst({ where: { nome: 'Rooster Rooms' } })) ?? (await prisma.modulo.create({ data: { nome: 'Rooster Rooms', ativo: true } }));
        const permissao = await prisma.permissao.create({ data: { moduloId: modulo.id, nome: `Rooster Rooms:/rooms:acessar:${usuarioId}`, recurso: '/rooms', acao: 'acessar' } });
        await prisma.usuarioPermissao.create({ data: { usuarioId, permissaoId: permissao.id } });
      }
      await concederSolicitarReserva(cenario.profLima.usuario.id);
      await concederSolicitarReserva(cenario.profCosta.usuario.id);
      await concederSolicitarReserva(cenario.coordenador.usuario.id);
      await concederAcessarRooms(cenario.coordenador.usuario.id);

      const campus = await prisma.campus.create({ data: { nome: 'Campus Rooms-Turma Teste', codigo: `RT-CAMPUS-${Date.now()}` } });
      const bloco = await prisma.bloco.create({ data: { campusId: campus.id, nome: 'Bloco Único', codigo: `RT-BLOCO-${Date.now()}`, andares: 1 } });
      const ambiente = await prisma.ambiente.create({
        data: {
          campusId: campus.id, blocoId: bloco.id, nome: 'Sala Rooms-Turma Teste', codigo: `RT-SALA-${Date.now()}`,
          tipo: 'sala', capacidade: 50, status: 'disponivel', horarioAbertura: '00:00-23:59',
          diasFuncionamento: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'], duracaoMinutos: 60,
        },
      });
      const data = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
      const corpoBase = {
        codigo: `RT-RES-${Date.now()}`, ambienteId: ambiente.id, responsavel: 'Prof. Lima Teste',
        evento: 'Aula de reposição', finalidade: 'aula', data, horarioInicio: '10:00', horarioFim: '11:00', participantes: 10,
        turmaId: cenario.turmaAlg.id,
      };

      // O professor dono da turma consegue vincular.
      const reservaRes = await request(app.getHttpServer())
        .post('/v1/reservas')
        .set('Authorization', cenario.profLima.header)
        .send(corpoBase)
        .expect(201);
      expect(reservaRes.body.turmaId ?? reservaRes.body.turma?.id).toBeTruthy();

      const reservaDetalhe = await request(app.getHttpServer())
        .get(`/v1/reservas/${reservaRes.body.id}`)
        .set('Authorization', cenario.coordenador.header)
        .expect(200);
      expect(reservaDetalhe.body.turma?.codigo).toBe(cenario.turmaAlg.codigo);

      // Outro professor (não dono da turma) não consegue vincular a mesma turma.
      await request(app.getHttpServer())
        .post('/v1/reservas')
        .set('Authorization', cenario.profCosta.header)
        .send({ ...corpoBase, codigo: `RT-RES-OUTRO-${Date.now()}` })
        .expect(403);

      // Coordenação (gestão ampla do Academy) pode vincular qualquer turma, mesmo não sendo a dona.
      // Horário diferente do de profLima — mesmo ambiente/data já está ocupado naquele slot.
      await request(app.getHttpServer())
        .post('/v1/reservas')
        .set('Authorization', cenario.coordenador.header)
        .send({ ...corpoBase, codigo: `RT-RES-COORD-${Date.now()}`, responsavel: 'Coordenadora Teste', horarioInicio: '14:00', horarioFim: '15:00' })
        .expect(201);
    });

    it('Documento acadêmico: upload, listagem, download e remoção respondem com o tamanho (BigInt) serializado corretamente', async () => {
      const cenario = await montarCenarioAcademico();

      const uploadRes = await request(app.getHttpServer())
        .post('/v1/documentos-academicos')
        .set('Authorization', cenario.coordenador.header)
        .field('tipo', 'plano-de-ensino')
        .field('disciplinaId', cenario.disciplinaAlg.id)
        .attach('arquivo', Buffer.from('conteúdo de teste'), 'plano.txt')
        .expect(201);
      expect(uploadRes.body.nome).toBe('plano.txt');
      expect(typeof uploadRes.body.tamanho).toBe('number');

      const listRes = await request(app.getHttpServer())
        .get(`/v1/documentos-academicos?disciplinaId=${cenario.disciplinaAlg.id}`)
        .set('Authorization', cenario.coordenador.header)
        .expect(200);
      expect(listRes.body.some((d: any) => d.id === uploadRes.body.id)).toBe(true);

      const downloadRes = await request(app.getHttpServer())
        .get(`/v1/documentos-academicos/${uploadRes.body.id}/arquivo`)
        .set('Authorization', cenario.coordenador.header)
        .expect(200);
      expect(downloadRes.text).toBe('conteúdo de teste');

      await request(app.getHttpServer())
        .delete(`/v1/documentos-academicos/${uploadRes.body.id}`)
        .set('Authorization', cenario.coordenador.header)
        .expect(200);
    });

    it('Professor só acessa/gerencia a própria turma — 403 na turma de outro professor', async () => {
      const cenario = await montarCenarioAcademico();

      // dono: acessa e registra chamada normalmente
      await request(app.getHttpServer()).get(`/v1/turmas/${cenario.turmaAlg.id}`).set('Authorization', cenario.profLima.header).expect(200);
      await request(app.getHttpServer())
        .post(`/v1/turmas/${cenario.turmaAlg.id}/frequencia`)
        .set('Authorization', cenario.profLima.header)
        .send({ data: '2026-09-17', registros: [{ alunoId: cenario.alunoJoaoAcademico.id, data: '2026-09-17', presenca: 'presente' }] })
        .expect(201);

      // turma alheia: 403 tanto para leitura quanto para escrita
      await request(app.getHttpServer()).get(`/v1/turmas/${cenario.turmaBd.id}`).set('Authorization', cenario.profLima.header).expect(403);
      await request(app.getHttpServer())
        .post(`/v1/turmas/${cenario.turmaBd.id}/frequencia`)
        .set('Authorization', cenario.profLima.header)
        .send({ data: '2026-09-17', registros: [] })
        .expect(403);
      await request(app.getHttpServer())
        .post('/v1/atividades')
        .set('Authorization', cenario.profLima.header)
        .send({ titulo: 'Atividade indevida', tipo: 'lista', turmaId: cenario.turmaBd.id })
        .expect(403);

      // GET /turmas/:id/notas (boletim da turma inteira, usado pela tela de notas do professor):
      // dono acessa, outro professor não, e o próprio aluno matriculado também não (ele só vê /me/notas).
      const item = await request(app.getHttpServer())
        .post(`/v1/turmas/${cenario.turmaAlg.id}/itens-avaliativos`)
        .set('Authorization', cenario.profLima.header)
        .send({ nome: 'Prova 1', peso: 1, notaMaxima: 10 })
        .expect(201);
      await request(app.getHttpServer())
        .patch(`/v1/itens-avaliativos/${item.body.id}/notas`)
        .set('Authorization', cenario.profLima.header)
        .send({ alunoId: cenario.alunoJoaoAcademico.id, valor: 7.5 })
        .expect(200);

      const boletimRes = await request(app.getHttpServer())
        .get(`/v1/turmas/${cenario.turmaAlg.id}/notas`)
        .set('Authorization', cenario.profLima.header)
        .expect(200);
      expect(boletimRes.body[0].notas[0].valor).toBe('7.5');

      await request(app.getHttpServer()).get(`/v1/turmas/${cenario.turmaBd.id}/notas`).set('Authorization', cenario.profLima.header).expect(403);
      await request(app.getHttpServer()).get(`/v1/turmas/${cenario.turmaAlg.id}/notas`).set('Authorization', cenario.alunoJoao.header).expect(403);
    });

    it('Aluno só vê os próprios dados via /me — 401 sem token, 403 fora do escopo', async () => {
      const cenario = await montarCenarioAcademico();

      await request(app.getHttpServer()).get('/v1/me/turmas').expect(401);

      const minhasTurmasRes = await request(app.getHttpServer())
        .get('/v1/me/turmas')
        .set('Authorization', cenario.alunoJoao.header)
        .expect(200);
      expect(minhasTurmasRes.body).toHaveLength(1);
      expect(minhasTurmasRes.body[0].turma.codigo).toBe('ALG-T-A');

      // João não está matriculado na turma de Banco de Dados
      await request(app.getHttpServer()).get(`/v1/turmas/${cenario.turmaBd.id}`).set('Authorization', cenario.alunoJoao.header).expect(403);

      // aluno autenticado mas sem a ação de gestão -> 403 (não 500/401)
      await request(app.getHttpServer())
        .post(`/v1/turmas/${cenario.turmaAlg.id}/frequencia`)
        .set('Authorization', cenario.alunoJoao.header)
        .send({ data: '2026-09-17', registros: [] })
        .expect(403);
    });

    it('Rooster Learn: publicar atividade gera item avaliativo; correção propaga nota para o Academy; aluno de outra turma não pode entregar', async () => {
      const cenario = await montarCenarioAcademico();

      const atividadeRes = await request(app.getHttpServer())
        .post('/v1/atividades')
        .set('Authorization', cenario.profLima.header)
        .send({ titulo: 'Lista 1', tipo: 'lista', turmaId: cenario.turmaAlg.id, peso: 0.5, notaMaxima: 10 })
        .expect(201);
      const atividadeId = atividadeRes.body.id;

      const publicarRes = await request(app.getHttpServer())
        .patch(`/v1/atividades/${atividadeId}/publicar`)
        .set('Authorization', cenario.profLima.header)
        .expect(200);
      expect(publicarRes.body.status).toBe('publicada');

      const itensRes = await request(app.getHttpServer())
        .get(`/v1/turmas/${cenario.turmaAlg.id}/itens-avaliativos`)
        .set('Authorization', cenario.profLima.header)
        .expect(200);
      expect(itensRes.body.some((item: any) => item.origem === 'learn' && item.atividadeId === atividadeId)).toBe(true);

      // Maria não está matriculada na turma de Algoritmos -> não pode entregar
      await request(app.getHttpServer())
        .post(`/v1/atividades/${atividadeId}/entregas`)
        .set('Authorization', cenario.alunoMaria.header)
        .send({ texto: 'tentativa indevida' })
        .expect(400);

      const entregaRes = await request(app.getHttpServer())
        .post(`/v1/atividades/${atividadeId}/entregas`)
        .set('Authorization', cenario.alunoJoao.header)
        .send({ texto: 'Minha resposta' })
        .expect(201);
      expect(entregaRes.body.status).toBe('enviada');

      // Anexo na entrega — tamanho (BigInt no schema) precisa vir serializado como number
      // em toda rota que devolve entregas com anexos incluídos (não só no upload em si).
      const anexoRes = await request(app.getHttpServer())
        .post(`/v1/entregas/${entregaRes.body.id}/anexos`)
        .set('Authorization', cenario.alunoJoao.header)
        .attach('arquivo', Buffer.from('conteúdo da lista'), 'lista1.txt')
        .expect(201);
      expect(typeof anexoRes.body.tamanho).toBe('number');

      const entregasDaAtividadeRes = await request(app.getHttpServer())
        .get(`/v1/atividades/${atividadeId}/entregas`)
        .set('Authorization', cenario.profLima.header)
        .expect(200);
      const entregaComAnexo = entregasDaAtividadeRes.body.find((e: any) => e.id === entregaRes.body.id);
      expect(typeof entregaComAnexo.anexos[0].tamanho).toBe('number');

      const minhasEntregasRes = await request(app.getHttpServer())
        .get('/v1/me/entregas')
        .set('Authorization', cenario.alunoJoao.header)
        .expect(200);
      expect(typeof minhasEntregasRes.body[0].anexos[0].tamanho).toBe('number');

      // Profa. Costa (outra turma) não pode corrigir a entrega de Lima
      await request(app.getHttpServer())
        .patch(`/v1/entregas/${entregaRes.body.id}/corrigir`)
        .set('Authorization', cenario.profCosta.header)
        .send({ nota: 10 })
        .expect(403);

      await request(app.getHttpServer())
        .patch(`/v1/entregas/${entregaRes.body.id}/corrigir`)
        .set('Authorization', cenario.profLima.header)
        .send({ nota: 9, feedback: 'Muito bom!' })
        .expect(200);

      const minhasNotasRes = await request(app.getHttpServer())
        .get('/v1/me/notas')
        .set('Authorization', cenario.alunoJoao.header)
        .expect(200);
      const itemLearn = minhasNotasRes.body[0].itens.find((item: any) => item.origem === 'learn');
      expect(itemLearn.nota).toBe('9');
    });
  });

  describe('Rooster Boost', () => {
    // Gestão por permissão: vale para TODOS os cursos, sem "dono".
    const BOOST_GESTOR_KEYS: Array<[string, string, string]> = [
      ['Rooster Boost', '/boost', 'acessar'],
      ['Rooster Boost', '/boost/manage', 'acessar'],
      ['Rooster Boost', '/boost/manage', 'gerenciar-cursos'],
      ['Rooster Boost', '/boost/manage', 'gerenciar-conteudo'],
      ['Rooster Boost', '/boost/manage', 'ver-progresso'],
      ['Rooster Boost', '/boost/manage', 'certificado'],
      ['Rooster Boost', '/boost/manage', 'vincular-orientadores'],
    ];
    // Orientador: professor que só conversa com os alunos dos cursos a que foi vinculado.
    const BOOST_ORIENTADOR_KEYS: Array<[string, string, string]> = [
      ['Rooster Boost', '/boost/conversas', 'acessar'],
      ['Rooster Boost', '/boost/conversas', 'responder'],
    ];

    /** Gestor + um orientador VINCULADO ao curso + outro professor NÃO vinculado; curso publicado com 1 módulo/1 aula. */
    async function montarCenarioBoost() {
      const gestor = await criarUsuarioComPermissoes('Gestor Boost Teste', 'gestor.boost.teste@example.com', BOOST_GESTOR_KEYS);
      const orientador = await criarUsuarioComPermissoes('Prof. Orientador Teste', 'prof.orientador.teste@example.com', BOOST_ORIENTADOR_KEYS);
      const orientadorOutro = await criarUsuarioComPermissoes('Prof. Orientador Outro', 'prof.orientador.outro@example.com', BOOST_ORIENTADOR_KEYS);
      const professor = await prisma.professor.create({ data: { usuarioId: orientador.usuario.id } });
      const professorOutro = await prisma.professor.create({ data: { usuarioId: orientadorOutro.usuario.id } });

      const curso = await prisma.cursoBoost.create({
        data: { titulo: 'Curso Teste Boost', slug: `curso-teste-boost-${Date.now()}`, cargaHoraria: 10, status: 'publicado' },
      });
      await prisma.cursoOrientadorBoost.create({ data: { cursoId: curso.id, professorId: professor.id } });
      const modulo = await prisma.moduloBoost.create({ data: { cursoId: curso.id, titulo: 'Módulo 1', ordem: 1 } });
      const aula = await prisma.aulaBoost.create({ data: { moduloId: modulo.id, titulo: 'Aula 1', ordem: 1, tipo: 'texto', conteudoTexto: 'Conteúdo de teste.' } });

      return { gestor, orientador, orientadorOutro, professor, professorOutro, curso, modulo, aula };
    }

    it('Cadastro/login público do Boost são independentes do login do Hub; catálogo é navegável sem login', async () => {
      const cenario = await montarCenarioBoost();

      // catálogo público — sem token nenhum
      const catalogoRes = await request(app.getHttpServer()).get('/v1/cursos-boost-publicos').expect(200);
      expect(catalogoRes.body.some((c: any) => c.id === cenario.curso.id)).toBe(true);

      const cadastroRes = await request(app.getHttpServer())
        .post('/v1/boost/cadastro')
        .send({ nome: 'Aluno Externo Teste', email: 'aluno.externo.teste@example.com', senha: 'SenhaExterna123' })
        .expect(201);
      expect(cadastroRes.body.accessToken).toBeDefined();
      expect(cadastroRes.body.usuario.email).toBe('aluno.externo.teste@example.com');

      // e-mail duplicado -> 409
      await request(app.getHttpServer())
        .post('/v1/boost/cadastro')
        .send({ nome: 'Duplicado', email: 'aluno.externo.teste@example.com', senha: 'OutraSenha123' })
        .expect(409);

      const loginRes = await request(app.getHttpServer())
        .post('/v1/boost/login')
        .send({ email: 'aluno.externo.teste@example.com', senha: 'SenhaExterna123' })
        .expect(201);
      const boostToken = `Bearer ${loginRes.body.accessToken}`;

      // token do Hub não autentica no portal Boost, e vice-versa
      await request(app.getHttpServer()).get('/v1/boost/me/matriculas').set('Authorization', cenario.gestor.header).expect(401);
      await request(app.getHttpServer()).get('/v1/turmas').set('Authorization', boostToken).expect(401);
      await request(app.getHttpServer()).get('/v1/boost/me/matriculas').expect(401);
    });

    it('Fluxo completo: professor publica curso, aluno externo matricula, conclui todas as aulas e recebe certificado automaticamente', async () => {
      const cenario = await montarCenarioBoost();
      const aula2 = await prisma.aulaBoost.create({ data: { moduloId: cenario.modulo.id, titulo: 'Aula 2', ordem: 2, tipo: 'texto', conteudoTexto: 'Conteúdo 2.' } });

      const { body: sessao } = await request(app.getHttpServer())
        .post('/v1/boost/cadastro')
        .send({ nome: 'Aluna Concluinte', email: 'aluna.concluinte@example.com', senha: 'SenhaConcluinte123' })
        .expect(201);
      const alunoHeader = `Bearer ${sessao.accessToken}`;

      const matriculaRes = await request(app.getHttpServer())
        .post(`/v1/cursos-boost/${cenario.curso.id}/matricular`)
        .set('Authorization', alunoHeader)
        .expect(201);
      expect(matriculaRes.body.status).toBe('ativa');
      const matriculaId = matriculaRes.body.id;

      // matricular de novo é idempotente (mesma matrícula, não duplica)
      const matriculaRepetidaRes = await request(app.getHttpServer())
        .post(`/v1/cursos-boost/${cenario.curso.id}/matricular`)
        .set('Authorization', alunoHeader)
        .expect(201);
      expect(matriculaRepetidaRes.body.id).toBe(matriculaId);

      await request(app.getHttpServer()).patch(`/v1/boost/aulas/${cenario.aula.id}/concluir`).set('Authorization', alunoHeader).expect(200);
      const meioRes = await request(app.getHttpServer()).patch(`/v1/boost/aulas/${cenario.aula.id}/concluir`).set('Authorization', alunoHeader).expect(200);
      expect(meioRes.body.progressoPct).toBe(50); // reenviar a mesma aula não conta duas vezes (upsert)

      const finalRes = await request(app.getHttpServer()).patch(`/v1/boost/aulas/${aula2.id}/concluir`).set('Authorization', alunoHeader).expect(200);
      expect(finalRes.body.progressoPct).toBe(100);
      expect(finalRes.body.status).toBe('concluida');

      const detalheRes = await request(app.getHttpServer()).get(`/v1/boost/me/matriculas/${matriculaId}`).set('Authorization', alunoHeader).expect(200);
      expect(detalheRes.body.certificado).toBeDefined();
      expect(detalheRes.body.certificado.codigo).toMatch(/^RB-/);

      const downloadRes = await request(app.getHttpServer())
        .get(`/v1/boost/certificados/${detalheRes.body.certificado.id}/arquivo`)
        .set('Authorization', alunoHeader)
        .expect(200);
      expect(downloadRes.headers['content-type']).toBe('application/pdf');
      expect(Buffer.isBuffer(downloadRes.body) ? downloadRes.body.length : downloadRes.text.length).toBeGreaterThan(500);

      // outro aluno (não dono) não pode baixar o certificado
      const { body: sessaoOutra } = await request(app.getHttpServer())
        .post('/v1/boost/cadastro')
        .send({ nome: 'Outra Aluna', email: 'outra.aluna@example.com', senha: 'SenhaOutra123' })
        .expect(201);
      await request(app.getHttpServer())
        .get(`/v1/boost/certificados/${detalheRes.body.certificado.id}/arquivo`)
        .set('Authorization', `Bearer ${sessaoOutra.accessToken}`)
        .expect(404);

      // Conferência pública: quem recebe o certificado valida o código SEM login.
      const codigo = detalheRes.body.certificado.codigo as string;
      const verificacao = await request(app.getHttpServer())
        .get(`/v1/certificados-boost/verificar/${codigo}`)
        .expect(200);
      expect(verificacao.body.valido).toBe(true);
      expect(verificacao.body.codigo).toBe(codigo);
      expect(verificacao.body.curso).toBeDefined();
      expect(verificacao.body.aluno).toBeDefined();

      // Devolve só o que já está impresso no certificado — nada de e-mail ou id interno.
      expect(Object.keys(verificacao.body).sort()).toEqual(
        ['aluno', 'cargaHoraria', 'codigo', 'curso', 'emitidoEm', 'valido'].sort(),
      );

      // Código aceito sem diferenciar caixa nem espaço em volta (é digitado à mão).
      await request(app.getHttpServer())
        .get(`/v1/certificados-boost/verificar/${encodeURIComponent(`  ${codigo.toLowerCase()}  `)}`)
        .expect(200);

      // Código inexistente não é confirmado.
      await request(app.getHttpServer()).get('/v1/certificados-boost/verificar/RB-2026-INVALIDO').expect(404);
    });

    it('Gestão por permissão: quem tem a permissão gere QUALQUER curso; professor orientador (sem permissão de gestão) recebe 403', async () => {
      const cenario = await montarCenarioBoost();

      // o gestor não é dono nem orientador de nada — e mesmo assim gerencia
      await request(app.getHttpServer()).get(`/v1/cursos-boost/${cenario.curso.id}`).set('Authorization', cenario.gestor.header).expect(200);
      await request(app.getHttpServer())
        .post(`/v1/cursos-boost/${cenario.curso.id}/modulos`)
        .set('Authorization', cenario.gestor.header)
        .send({ titulo: 'Módulo do gestor' })
        .expect(201);
      const criadoRes = await request(app.getHttpServer())
        .post('/v1/cursos-boost')
        .set('Authorization', cenario.gestor.header)
        .send({ titulo: 'Curso criado pelo gestor', cargaHoraria: 5 })
        .expect(201);
      expect(criadoRes.body.professorId).toBeUndefined();

      // o orientador VINCULADO ao curso continua sem poder de gestão
      const orientadorH = cenario.orientador.header;
      await request(app.getHttpServer()).get(`/v1/cursos-boost/${cenario.curso.id}`).set('Authorization', orientadorH).expect(403);
      await request(app.getHttpServer()).get('/v1/cursos-boost').set('Authorization', orientadorH).expect(403);
      await request(app.getHttpServer()).post('/v1/cursos-boost').set('Authorization', orientadorH).send({ titulo: 'Indevido', cargaHoraria: 1 }).expect(403);
      await request(app.getHttpServer()).patch(`/v1/cursos-boost/${cenario.curso.id}`).set('Authorization', orientadorH).send({ status: 'arquivado' }).expect(403);
      await request(app.getHttpServer()).post(`/v1/cursos-boost/${cenario.curso.id}/modulos`).set('Authorization', orientadorH).send({ titulo: 'Módulo indevido' }).expect(403);
      await request(app.getHttpServer()).get(`/v1/cursos-boost/${cenario.curso.id}/alunos`).set('Authorization', orientadorH).expect(403);
      await request(app.getHttpServer()).patch(`/v1/cursos-boost/${cenario.curso.id}/certificado`).set('Authorization', orientadorH).send({ emiteCertificado: false }).expect(403);
      await request(app.getHttpServer()).put(`/v1/cursos-boost/${cenario.curso.id}/orientadores`).set('Authorization', orientadorH).send({ professorIds: [] }).expect(403);

      const { body: sessao } = await request(app.getHttpServer())
        .post('/v1/boost/cadastro')
        .send({ nome: 'Aluno Não Matriculado', email: 'nao.matriculado@example.com', senha: 'SenhaNaoMat123' })
        .expect(201);
      const alunoHeader = `Bearer ${sessao.accessToken}`;

      await request(app.getHttpServer()).patch(`/v1/boost/aulas/${cenario.aula.id}/concluir`).set('Authorization', alunoHeader).expect(403);
      await request(app.getHttpServer()).get(`/v1/boost/cursos/${cenario.curso.id}/conversa`).set('Authorization', alunoHeader).expect(403);
    });

    it('Tirar do ar: some do catálogo e bloqueia nova matrícula, mas o aluno já matriculado continua com acesso e com a conversa', async () => {
      const cenario = await montarCenarioBoost();
      const cadastrar = async (nome: string, email: string) => {
        const { body } = await request(app.getHttpServer()).post('/v1/boost/cadastro').send({ nome, email, senha: 'SenhaTiraDoAr123' }).expect(201);
        return `Bearer ${body.accessToken}`;
      };
      const matriculado = await cadastrar('Aluno Já Matriculado', 'ja.matriculado@example.com');
      const novato = await cadastrar('Aluno Novato', 'novato.tira.do.ar@example.com');
      await request(app.getHttpServer()).post(`/v1/cursos-boost/${cenario.curso.id}/matricular`).set('Authorization', matriculado).expect(201);

      // só quem tem gerenciar-cursos tira do ar
      await request(app.getHttpServer()).patch(`/v1/cursos-boost/${cenario.curso.id}`).set('Authorization', cenario.gestor.header).send({ status: 'arquivado' }).expect(200);

      const catalogo = await request(app.getHttpServer()).get('/v1/cursos-boost-publicos').expect(200);
      expect(catalogo.body.some((c: any) => c.id === cenario.curso.id)).toBe(false);
      await request(app.getHttpServer()).post(`/v1/cursos-boost/${cenario.curso.id}/matricular`).set('Authorization', novato).expect(404);

      // quem já estava dentro continua estudando e conversando
      const minhas = await request(app.getHttpServer()).get('/v1/boost/me/matriculas').set('Authorization', matriculado).expect(200);
      expect(minhas.body).toHaveLength(1);
      await request(app.getHttpServer()).get(`/v1/boost/me/matriculas/${minhas.body[0].id}`).set('Authorization', matriculado).expect(200);
      await request(app.getHttpServer()).get(`/v1/boost/cursos/${cenario.curso.id}/conversa`).set('Authorization', matriculado).expect(200);

      // republicar devolve ao catálogo
      await request(app.getHttpServer()).patch(`/v1/cursos-boost/${cenario.curso.id}`).set('Authorization', cenario.gestor.header).send({ status: 'publicado' }).expect(200);
      const depois = await request(app.getHttpServer()).get('/v1/cursos-boost-publicos').expect(200);
      expect(depois.body.some((c: any) => c.id === cenario.curso.id)).toBe(true);
    });

    it('Certificado: desligado, o curso conclui sem emitir (material de apoio); ligado, usa o texto configurado', async () => {
      const cenario = await montarCenarioBoost();
      const semCert = await request(app.getHttpServer())
        .patch(`/v1/cursos-boost/${cenario.curso.id}/certificado`)
        .set('Authorization', cenario.gestor.header)
        .send({ emiteCertificado: false })
        .expect(200);
      expect(semCert.body.emiteCertificado).toBe(false);

      const { body: sessao } = await request(app.getHttpServer())
        .post('/v1/boost/cadastro')
        .send({ nome: 'Aluno Sem Certificado', email: 'aluno.sem.certificado@example.com', senha: 'SenhaSemCert123' })
        .expect(201);
      const alunoHeader = `Bearer ${sessao.accessToken}`;
      await request(app.getHttpServer()).post(`/v1/cursos-boost/${cenario.curso.id}/matricular`).set('Authorization', alunoHeader).expect(201);
      await request(app.getHttpServer()).patch(`/v1/boost/aulas/${cenario.aula.id}/concluir`).set('Authorization', alunoHeader).expect(200);

      const minhas = await request(app.getHttpServer()).get('/v1/boost/me/matriculas').set('Authorization', alunoHeader).expect(200);
      expect(minhas.body[0].status).toBe('concluida');
      expect(minhas.body[0].certificado).toBeNull();

      // religa com texto próprio e confere que a configuração fica gravada (o PDF em si é coberto no teste de conclusão)
      const comTexto = await request(app.getHttpServer())
        .patch(`/v1/cursos-boost/${cenario.curso.id}/certificado`)
        .set('Authorization', cenario.gestor.header)
        .send({ emiteCertificado: true, certificadoTexto: 'Certificamos que {aluno} concluiu {curso} ({cargaHoraria}h).', cargaHoraria: 12 })
        .expect(200);
      expect(comTexto.body.emiteCertificado).toBe(true);
      expect(comTexto.body.certificadoTexto).toContain('{aluno}');
      expect(comTexto.body.cargaHoraria).toBe(12);
    });

    it('Orientadores: o gestor vincula professores; só orientador vinculado enxerga e responde as conversas do curso', async () => {
      const cenario = await montarCenarioBoost();
      const professoresRes = await request(app.getHttpServer()).get('/v1/boost-professores').set('Authorization', cenario.gestor.header).expect(200);
      expect(professoresRes.body.some((pr: any) => pr.id === cenario.professor.id)).toBe(true);

      const { body: sessao } = await request(app.getHttpServer())
        .post('/v1/boost/cadastro')
        .send({ nome: 'Aluno Conversa', email: 'aluno.conversa@example.com', senha: 'SenhaConversa123' })
        .expect(201);
      const alunoHeader = `Bearer ${sessao.accessToken}`;
      await request(app.getHttpServer()).post(`/v1/cursos-boost/${cenario.curso.id}/matricular`).set('Authorization', alunoHeader).expect(201);

      const abrir = await request(app.getHttpServer()).get(`/v1/boost/cursos/${cenario.curso.id}/conversa`).set('Authorization', alunoHeader).expect(200);
      expect(abrir.body.orientadores.map((o: any) => o.id)).toEqual([cenario.professor.id]);
      expect(abrir.body.mensagens).toHaveLength(0);

      await request(app.getHttpServer())
        .post(`/v1/boost/cursos/${cenario.curso.id}/conversa/mensagens`)
        .set('Authorization', alunoHeader)
        .send({ mensagem: 'Dúvida sobre a aula 1' })
        .expect(201);

      // caixa de entrada do orientador vinculado: 1 conversa com 1 não lida
      const caixa = await request(app.getHttpServer()).get('/v1/boost-conversas').set('Authorization', cenario.orientador.header).expect(200);
      expect(caixa.body).toHaveLength(1);
      expect(caixa.body[0].naoLidas).toBe(1);
      expect(caixa.body[0].ultimaMensagem).toBe('Dúvida sobre a aula 1');
      const conversaId = caixa.body[0].id;

      // professor NÃO vinculado: caixa vazia e 404 (não revela que a conversa existe)
      const caixaOutro = await request(app.getHttpServer()).get('/v1/boost-conversas').set('Authorization', cenario.orientadorOutro.header).expect(200);
      expect(caixaOutro.body).toHaveLength(0);
      await request(app.getHttpServer()).get(`/v1/boost-conversas/${conversaId}/mensagens`).set('Authorization', cenario.orientadorOutro.header).expect(404);
      await request(app.getHttpServer()).post(`/v1/boost-conversas/${conversaId}/mensagens`).set('Authorization', cenario.orientadorOutro.header).send({ mensagem: 'intruso' }).expect(404);

      // o orientador responde; o aluno vê a resposta e ela conta como não lida para ele
      await request(app.getHttpServer()).get(`/v1/boost-conversas/${conversaId}/mensagens`).set('Authorization', cenario.orientador.header).expect(200);
      await request(app.getHttpServer()).patch(`/v1/boost-conversas/${conversaId}/lida`).set('Authorization', cenario.orientador.header).expect(200);
      await request(app.getHttpServer())
        .post(`/v1/boost-conversas/${conversaId}/mensagens`)
        .set('Authorization', cenario.orientador.header)
        .send({ mensagem: 'Resposta do orientador' })
        .expect(201);
      const caixaLida = await request(app.getHttpServer()).get('/v1/boost-conversas').set('Authorization', cenario.orientador.header).expect(200);
      expect(caixaLida.body[0].naoLidas).toBe(0);

      const doAluno = await request(app.getHttpServer()).get(`/v1/boost/cursos/${cenario.curso.id}/conversa`).set('Authorization', alunoHeader).expect(200);
      expect(doAluno.body.mensagens.map((m: any) => m.mensagem)).toEqual(['Dúvida sobre a aula 1', 'Resposta do orientador']);

      // outro aluno não enxerga a conversa dele: recebe a PRÓPRIA conversa, vazia
      const { body: outraSessao } = await request(app.getHttpServer())
        .post('/v1/boost/cadastro')
        .send({ nome: 'Outro Aluno', email: 'outro.aluno.conversa@example.com', senha: 'SenhaOutroAluno123' })
        .expect(201);
      const outroHeader = `Bearer ${outraSessao.accessToken}`;
      await request(app.getHttpServer()).post(`/v1/cursos-boost/${cenario.curso.id}/matricular`).set('Authorization', outroHeader).expect(201);
      const dele = await request(app.getHttpServer()).get(`/v1/boost/cursos/${cenario.curso.id}/conversa`).set('Authorization', outroHeader).expect(200);
      expect(dele.body.mensagens).toHaveLength(0);
      expect(dele.body.conversaId).not.toBe(conversaId);

      // gestor troca a lista: sem orientador, o aluno recebe aviso claro em vez de mandar para o vazio
      await request(app.getHttpServer()).put(`/v1/cursos-boost/${cenario.curso.id}/orientadores`).set('Authorization', cenario.gestor.header).send({ professorIds: [] }).expect(200);
      await request(app.getHttpServer())
        .post(`/v1/boost/cursos/${cenario.curso.id}/conversa/mensagens`)
        .set('Authorization', alunoHeader)
        .send({ mensagem: 'Alguém aí?' })
        .expect(400);
      await request(app.getHttpServer()).get('/v1/boost-conversas').set('Authorization', cenario.orientador.header).expect(200).expect((r) => expect(r.body).toHaveLength(0));

      // e um professor inexistente é recusado
      await request(app.getHttpServer())
        .put(`/v1/cursos-boost/${cenario.curso.id}/orientadores`)
        .set('Authorization', cenario.gestor.header)
        .send({ professorIds: ['00000000-0000-4000-8000-000000000000'] })
        .expect(400);
    });

    it('Material de apoio: aluno matriculado baixa; aluno não matriculado recebe 403', async () => {
      const cenario = await montarCenarioBoost();
      const material = await prisma.materialApoio.create({
        data: { aulaId: cenario.aula.id, nome: 'slides.txt', caminho: 'inexistente.txt', tipo: 'text/plain', tamanho: BigInt(10) },
      });

      const { body: matriculado } = await request(app.getHttpServer())
        .post('/v1/boost/cadastro')
        .send({ nome: 'Aluno Com Material', email: 'aluno.com.material@example.com', senha: 'SenhaMaterial123' })
        .expect(201);
      const matriculadoHeader = `Bearer ${matriculado.accessToken}`;
      await request(app.getHttpServer()).post(`/v1/cursos-boost/${cenario.curso.id}/matricular`).set('Authorization', matriculadoHeader).expect(201);

      // matriculado passa pela checagem de posse (404 aqui é só o arquivo de teste não existir em disco — não é 403)
      const okRes = await request(app.getHttpServer())
        .get(`/v1/boost/materiais/${material.id}/arquivo`)
        .set('Authorization', matriculadoHeader);
      expect(okRes.status).not.toBe(403);

      const { body: naoMatriculado } = await request(app.getHttpServer())
        .post('/v1/boost/cadastro')
        .send({ nome: 'Aluno Sem Material', email: 'aluno.sem.material@example.com', senha: 'SenhaSemMaterial123' })
        .expect(201);
      await request(app.getHttpServer())
        .get(`/v1/boost/materiais/${material.id}/arquivo`)
        .set('Authorization', `Bearer ${naoMatriculado.accessToken}`)
        .expect(403);
    });

    it('Vídeo hospedado: instrutor envia, recusa mimetype errado, e o player consegue arrastar a barra (Range)', async () => {
      const cenario = await montarCenarioBoost();

      // formato aceito — o conteúdo precisa ter a assinatura binária de MP4 (caixa `ftyp`)
      const videoMp4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypmp42'), Buffer.from('conteudo-de-video'.repeat(10))]);
      const uploadRes = await request(app.getHttpServer())
        .post(`/v1/aulas-boost/${cenario.aula.id}/video`)
        .set('Authorization', cenario.gestor.header)
        .attach('arquivo', videoMp4, 'aula.mp4')
        .expect(201);
      expect(uploadRes.body.tipo).toBe('video');
      expect(uploadRes.body.videoArquivo).toBeTruthy();
      expect(uploadRes.body.videoTamanho).toBeGreaterThan(0);

      // formato recusado — nenhum arquivo chega ao handler, então é 400 (mesma resposta de "não mandou nada")
      await request(app.getHttpServer())
        .post(`/v1/aulas-boost/${cenario.aula.id}/video`)
        .set('Authorization', cenario.gestor.header)
        .attach('arquivo', Buffer.from('não é vídeo'), 'notas.txt')
        .expect(400);

      // mimetype de vídeo declarado, mas conteúdo sem assinatura de vídeo — recusado durante o upload
      await request(app.getHttpServer())
        .post(`/v1/aulas-boost/${cenario.aula.id}/video`)
        .set('Authorization', cenario.gestor.header)
        .attach('arquivo', Buffer.from('conteudo-fake-de-video'.repeat(10)), 'falso.mp4')
        .expect(400);

      // professor de outro curso não pode enviar vídeo aqui
      await request(app.getHttpServer())
        .post(`/v1/aulas-boost/${cenario.aula.id}/video`)
        .set('Authorization', cenario.orientador.header)
        .attach('arquivo', Buffer.from('outro'), 'aula.mp4')
        .expect(403);

      // token de stream + streaming com Range (a prova de que dá pra arrastar a barra sem baixar tudo)
      const tokenRes = await request(app.getHttpServer())
        .get(`/v1/aulas-boost/${cenario.aula.id}/stream-token`)
        .set('Authorization', cenario.gestor.header)
        .expect(200);
      expect(tokenRes.body.token).toBeTruthy();

      const streamRes = await request(app.getHttpServer())
        .get(`/v1/aulas-boost/${cenario.aula.id}/video?token=${tokenRes.body.token}`)
        .set('Range', 'bytes=0-9')
        .expect(206);
      expect(streamRes.headers['content-range']).toMatch(/^bytes 0-9\//);
      expect(streamRes.headers['accept-ranges']).toBe('bytes');

      // sem token, ou com token de outra aula, a rota (pública de propósito) recusa
      await request(app.getHttpServer()).get(`/v1/aulas-boost/${cenario.aula.id}/video`).expect(403);
      await request(app.getHttpServer()).get(`/v1/aulas-boost/${cenario.aula.id}/video?token=token-invalido`).expect(403);

      // remover o vídeo limpa os três campos
      const removeRes = await request(app.getHttpServer())
        .delete(`/v1/aulas-boost/${cenario.aula.id}/video`)
        .set('Authorization', cenario.gestor.header)
        .expect(200);
      expect(removeRes.body.videoArquivo).toBeNull();
    });

    it('Progresso real de vídeo: retoma posição, completa automaticamente perto do fim e emite certificado na última aula', async () => {
      const cenario = await montarCenarioBoost(); // 1 aula só, tipo texto por padrão
      await prisma.aulaBoost.update({ where: { id: cenario.aula.id }, data: { tipo: 'video' } });

      const { body: sessao } = await request(app.getHttpServer())
        .post('/v1/boost/cadastro')
        .send({ nome: 'Aluna Progresso Video', email: 'aluna.progresso.video@example.com', senha: 'SenhaProgresso123' })
        .expect(201);
      const alunoHeader = `Bearer ${sessao.accessToken}`;

      await request(app.getHttpServer()).post(`/v1/cursos-boost/${cenario.curso.id}/matricular`).set('Authorization', alunoHeader).expect(201);

      // aluno não matriculado em NENHUM curso não recebe token de stream desta aula
      const { body: sessaoOutra } = await request(app.getHttpServer())
        .post('/v1/boost/cadastro')
        .send({ nome: 'Aluna Sem Matricula', email: 'aluna.sem.matricula.video@example.com', senha: 'SenhaSemMatricula123' })
        .expect(201);
      await request(app.getHttpServer())
        .get(`/v1/boost/aulas/${cenario.aula.id}/stream-token`)
        .set('Authorization', `Bearer ${sessaoOutra.accessToken}`)
        .expect(403);

      // abaixo do limiar: posição salva, mas ainda não concluída
      const parcialRes = await request(app.getHttpServer())
        .patch(`/v1/boost/aulas/${cenario.aula.id}/progresso`)
        .set('Authorization', alunoHeader)
        .send({ posicaoSeg: 30, percentualAssistido: 40 })
        .expect(200);
      expect(parcialRes.body.concluida).toBe(false);

      const matriculaMeio = await request(app.getHttpServer()).get('/v1/boost/me/matriculas').set('Authorization', alunoHeader).expect(200);
      expect(matriculaMeio.body[0].status).not.toBe('concluida');

      // reportar um percentual MENOR depois não faz o maior já visto regredir
      await request(app.getHttpServer())
        .patch(`/v1/boost/aulas/${cenario.aula.id}/progresso`)
        .set('Authorization', alunoHeader)
        .send({ posicaoSeg: 5, percentualAssistido: 10 })
        .expect(200);

      // cruzando o limiar (90%): completa sozinho, sem precisar do botão manual
      const finalRes = await request(app.getHttpServer())
        .patch(`/v1/boost/aulas/${cenario.aula.id}/progresso`)
        .set('Authorization', alunoHeader)
        .send({ posicaoSeg: 118, percentualAssistido: 95 })
        .expect(200);
      expect(finalRes.body.concluida).toBe(true);

      const matriculaFinalRes = await request(app.getHttpServer()).get('/v1/boost/me/matriculas').set('Authorization', alunoHeader).expect(200);
      const matriculaFinal = matriculaFinalRes.body[0];
      expect(matriculaFinal.status).toBe('concluida');
      expect(matriculaFinal.progressoPct).toBe(100);
      expect(matriculaFinal.certificado).toBeDefined();
      expect(matriculaFinal.certificado.codigo).toMatch(/^RB-/);
    });

    it('Contas externas (painel admin): lista, desativa e redefine senha; professor sem a permissão recebe 403', async () => {
      const cenario = await montarCenarioBoost();
      await request(app.getHttpServer())
        .post('/v1/boost/cadastro')
        .send({ nome: 'Aluna Painel Admin', email: 'aluna.painel.admin@example.com', senha: 'SenhaPainelAdmin123' })
        .expect(201);

      // professor (mesmo apto a lecionar no Boost) não tem `boost.students.*` — gestão entre cursos, fora do modelo de posse
      await request(app.getHttpServer()).get('/v1/boost-alunos-externos').set('Authorization', cenario.orientador.header).expect(403);

      const listaRes = await request(app.getHttpServer()).get('/v1/boost-alunos-externos').set('Authorization', authHeader).expect(200);
      const contaCriada = listaRes.body.find((c: any) => c.email === 'aluna.painel.admin@example.com');
      expect(contaCriada).toBeDefined();
      expect(contaCriada.ativo).toBe(true);

      const desativarRes = await request(app.getHttpServer())
        .patch(`/v1/boost-alunos-externos/${contaCriada.id}`)
        .set('Authorization', authHeader)
        .send({ ativo: false })
        .expect(200);
      expect(desativarRes.body.ativo).toBe(false);

      // conta desativada não consegue mais logar
      await request(app.getHttpServer())
        .post('/v1/boost/login')
        .send({ email: 'aluna.painel.admin@example.com', senha: 'SenhaPainelAdmin123' })
        .expect(401);

      const resetRes = await request(app.getHttpServer())
        .post(`/v1/boost-alunos-externos/${contaCriada.id}/redefinir-senha`)
        .set('Authorization', authHeader)
        .expect(201);
      expect(resetRes.body.senhaTemporaria).toBeTruthy();
      expect(resetRes.body.senhaTemporaria.length).toBeGreaterThanOrEqual(8);

      // reativa e confirma que a senha temporária devolvida funciona de verdade
      await request(app.getHttpServer()).patch(`/v1/boost-alunos-externos/${contaCriada.id}`).set('Authorization', authHeader).send({ ativo: true }).expect(200);
      await request(app.getHttpServer())
        .post('/v1/boost/login')
        .send({ email: 'aluna.painel.admin@example.com', senha: resetRes.body.senhaTemporaria })
        .expect(201);
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
      ['Rooster Finance', '/finance/policies', 'acessar'],
      ['Rooster Finance', '/finance/policies', 'criar'],
      ['Rooster Finance', '/finance/policies', 'editar'],
      ['Rooster Finance', '/finance/policies', 'excluir'],
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

    it('Política de multa/juros: o financeiro cria a própria regra; ela calcula dinamicamente, mas valor manual sempre vence', async () => {
      const { financeiro, aluno } = await montarCenarioFinanceiro();

      const semPermissao = await criarUsuarioComPermissoes('Sem Permissao Politica', 'sem.permissao.politica@example.com', []);
      await request(app.getHttpServer()).get('/v1/politicas-multa-juros').set('Authorization', semPermissao.header).expect(403);

      const politicaRes = await request(app.getHttpServer())
        .post('/v1/politicas-multa-juros')
        .set('Authorization', financeiro.header)
        .send({ nome: 'Atraso padrão — teste', percentualMulta: 2, percentualJurosDia: 1, diasCarencia: 3 })
        .expect(201);
      expect(politicaRes.body.id).toBeDefined();

      // 10 dias de atraso, 3 de carência -> 7 dias efetivos. base 200: multa 2% = 4; juros 1%/dia * 7 = 14.
      const vencidaHaDezDias = new Date(Date.now() - 10 * 86_400_000).toISOString().slice(0, 10);
      const cobrancaRes = await request(app.getHttpServer())
        .post('/v1/cobrancas')
        .set('Authorization', financeiro.header)
        .send({
          alunoId: aluno.id, tipo: 'taxa', descricao: 'Taxa com política de atraso', valorOriginal: 200,
          vencimento: vencidaHaDezDias, politicaMultaJurosId: politicaRes.body.id,
        })
        .expect(201);
      expect(cobrancaRes.body.politicaMultaJurosId).toBe(politicaRes.body.id);

      const pagaComPolitica = await request(app.getHttpServer())
        .post(`/v1/cobrancas/${cobrancaRes.body.id}/marcar-pago`)
        .set('Authorization', financeiro.header)
        .send({})
        .expect(201);
      expect(Number(pagaComPolitica.body.valorPago)).toBeCloseTo(218, 1);

      // Outra cobrança, mesma política — mas com multa/juros MANUAIS: o manual sempre vence.
      const cobranca2Res = await request(app.getHttpServer())
        .post('/v1/cobrancas')
        .set('Authorization', financeiro.header)
        .send({
          alunoId: aluno.id, tipo: 'taxa', descricao: 'Taxa com override manual', valorOriginal: 200,
          vencimento: vencidaHaDezDias, politicaMultaJurosId: politicaRes.body.id,
        })
        .expect(201);
      await request(app.getHttpServer())
        .patch(`/v1/cobrancas/${cobranca2Res.body.id}`)
        .set('Authorization', financeiro.header)
        .send({ multa: 1, juros: 1 })
        .expect(200);
      const pagaManual = await request(app.getHttpServer())
        .post(`/v1/cobrancas/${cobranca2Res.body.id}/marcar-pago`)
        .set('Authorization', financeiro.header)
        .send({})
        .expect(201);
      expect(Number(pagaManual.body.valorPago)).toBeCloseTo(202, 1);

      // Política em uso (vinculada às duas cobranças acima) não pode ser excluída.
      await request(app.getHttpServer()).delete(`/v1/politicas-multa-juros/${politicaRes.body.id}`).set('Authorization', financeiro.header).expect(400);

      // A confirmação de pagamento acima precisa aparecer no relatório de auditoria (Finance passou
      // a ser auditado nesta rodada — antes só o Hub gerava LogAuditoria).
      const semPermissaoRelatorio = await criarUsuarioComPermissoes('Sem Permissao Relatorio', 'sem.permissao.relatorio@example.com', []);
      await request(app.getHttpServer()).get('/v1/logs-auditoria/relatorio').set('Authorization', semPermissaoRelatorio.header).expect(403);

      const relatorioRes = await request(app.getHttpServer()).get('/v1/logs-auditoria/relatorio').set('Authorization', authHeader).expect(200);
      expect(relatorioRes.body.total).toBeGreaterThan(0);
      expect(relatorioRes.body.porAcao.some((a: any) => a.acao === 'cobranca_marcada_paga')).toBe(true);
      expect(relatorioRes.body.porModulo.some((m: any) => m.modulo === 'Rooster Finance')).toBe(true);

      const csvRes = await request(app.getHttpServer()).get('/v1/logs-auditoria/exportar').set('Authorization', authHeader).expect(200);
      expect(csvRes.text.split('\n')[0]).toBe('data,modulo,acao,entidade,entidadeId,usuario,ip');
      expect(csvRes.text).toContain('cobranca_marcada_paga');
    });

    it('CRUD de produtos e descontos; beneficiários do desconto são sempre calculados', async () => {
      const { financeiro } = await montarCenarioFinanceiro();

      const produtoRes = await request(app.getHttpServer())
        .post('/v1/produtos-financeiros')
        .set('Authorization', financeiro.header)
        .send({ codigo: 'PRD-CRUD', nome: 'Caderno', preco: 20, estoque: 5, estoqueMinimo: 1 })
        .expect(201);
      await request(app.getHttpServer())
        .patch(`/v1/produtos-financeiros/${produtoRes.body.id}`)
        .set('Authorization', financeiro.header)
        .send({ preco: 25 })
        .expect(200);
      await request(app.getHttpServer())
        .delete(`/v1/produtos-financeiros/${produtoRes.body.id}`)
        .set('Authorization', financeiro.header)
        .expect(200);

      const descontoRes = await request(app.getHttpServer())
        .post('/v1/descontos')
        .set('Authorization', financeiro.header)
        .send({ nome: 'Bolsa Teste', tipo: 'bolsa-parcial', valor: 30, unidade: 'percent' })
        .expect(201);

      const listaRes = await request(app.getHttpServer())
        .get('/v1/descontos')
        .set('Authorization', financeiro.header)
        .expect(200);
      expect(listaRes.body.find((d: any) => d.id === descontoRes.body.id).beneficiarios).toBe(0);
    });

    it('Cobrança: criar, marcar como paga, negociar e cancelar mudam o status corretamente', async () => {
      const cenario = await montarCenarioFinanceiro();

      const cobrancaRes = await request(app.getHttpServer())
        .post('/v1/cobrancas')
        .set('Authorization', cenario.financeiro.header)
        .send({ alunoId: cenario.aluno.id, tipo: 'taxa', descricao: 'Taxa de teste', valorOriginal: 100, vencimento: '2026-09-01' })
        .expect(201);
      expect(cobrancaRes.body.status).toBe('aberto');

      const pagaRes = await request(app.getHttpServer())
        .post(`/v1/cobrancas/${cobrancaRes.body.id}/marcar-pago`)
        .set('Authorization', cenario.financeiro.header)
        .send({})
        .expect(201);
      expect(pagaRes.body.status).toBe('pago');
      expect(Number(pagaRes.body.valorPago)).toBe(100);

      // já paga: não pode cancelar
      await request(app.getHttpServer())
        .post(`/v1/cobrancas/${cobrancaRes.body.id}/cancelar`)
        .set('Authorization', cenario.financeiro.header)
        .send({ motivo: 'teste' })
        .expect(400);

      const cobranca2 = await request(app.getHttpServer())
        .post('/v1/cobrancas')
        .set('Authorization', cenario.financeiro.header)
        .send({ alunoId: cenario.aluno.id, tipo: 'taxa', descricao: 'Outra taxa', valorOriginal: 200, vencimento: '2026-09-01' })
        .expect(201);

      const negociadaRes = await request(app.getHttpServer())
        .post(`/v1/cobrancas/${cobranca2.body.id}/negociar`)
        .set('Authorization', cenario.financeiro.header)
        .send({ motivo: 'prazo estendido', novoVencimento: '2026-10-01' })
        .expect(201);
      expect(negociadaRes.body.status).toBe('negociado');

      const canceladaRes = await request(app.getHttpServer())
        .post(`/v1/cobrancas/${cobranca2.body.id}/cancelar`)
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
        .post('/v1/cobrancas/gerar-lote')
        .set('Authorization', cenario.financeiro.header)
        .send({ competencia: '2026-09', servicoId: cenario.servico.id, vencimento: '2026-09-10', turmaId: cenario.turma.id })
        .expect(201);
      expect(primeiraRes.body.geradas).toBe(2);
      const cobrancaComDesconto = primeiraRes.body.cobrancas.find((c: any) => c.alunoId === cenario.aluno.id);
      expect(Number(cobrancaComDesconto.valorDesconto)).toBe(500);

      const segundaRes = await request(app.getHttpServer())
        .post('/v1/cobrancas/gerar-lote')
        .set('Authorization', cenario.financeiro.header)
        .send({ competencia: '2026-09', servicoId: cenario.servico.id, vencimento: '2026-09-10', turmaId: cenario.turma.id })
        .expect(201);
      expect(segundaRes.body.geradas).toBe(0);
      expect(segundaRes.body.ignoradas).toBe(2);
    });

    it('Boleto interno: emitir gera nosso número/linha digitável (47 posições) e o PDF pode ser baixado', async () => {
      const cenario = await montarCenarioFinanceiro();
      const cobrancaRes = await request(app.getHttpServer())
        .post('/v1/cobrancas')
        .set('Authorization', cenario.financeiro.header)
        .send({ alunoId: cenario.aluno.id, tipo: 'taxa', descricao: 'Taxa boleto', valorOriginal: 150, vencimento: '2026-09-01' })
        .expect(201);

      const boletoRes = await request(app.getHttpServer())
        .post(`/v1/cobrancas/${cobrancaRes.body.id}/emitir-boleto`)
        .set('Authorization', cenario.financeiro.header)
        .expect(201);
      expect(boletoRes.body.linhaDigitavel).toHaveLength(47);
      expect(boletoRes.body.nossoNumero).toBeDefined();

      const pdfRes = await request(app.getHttpServer())
        .get(`/v1/cobrancas/${cobrancaRes.body.id}/boleto`)
        .set('Authorization', cenario.financeiro.header)
        .expect(200);
      expect(pdfRes.headers['content-type']).toContain('application/pdf');
    });

    it('Nota fiscal interna: emitir gera documento e recusa uma segunda emissão para a mesma cobrança', async () => {
      const cenario = await montarCenarioFinanceiro();
      const cobrancaRes = await request(app.getHttpServer())
        .post('/v1/cobrancas')
        .set('Authorization', cenario.financeiro.header)
        .send({ alunoId: cenario.aluno.id, tipo: 'produto', descricao: 'Venda produto', produtoId: cenario.produto.id, valorOriginal: 50, vencimento: '2026-09-01' })
        .expect(201);

      const nfRes = await request(app.getHttpServer())
        .post(`/v1/cobrancas/${cobrancaRes.body.id}/nota-fiscal`)
        .set('Authorization', cenario.financeiro.header)
        .expect(201);
      expect(nfRes.body.numero).toMatch(/^NFP-/);

      await request(app.getHttpServer())
        .post(`/v1/cobrancas/${cobrancaRes.body.id}/nota-fiscal`)
        .set('Authorization', cenario.financeiro.header)
        .expect(409);

      const listaRes = await request(app.getHttpServer())
        .get('/v1/notas-fiscais')
        .set('Authorization', cenario.financeiro.header)
        .expect(200);
      expect(listaRes.body.some((n: any) => n.id === nfRes.body.id)).toBe(true);
    });

    it('Portal do aluno: só vê/baixa as próprias cobranças — 403 ao tentar acessar cobrança de outro aluno', async () => {
      const cenario = await montarCenarioFinanceiro();
      const cobrancaRes = await request(app.getHttpServer())
        .post('/v1/cobrancas')
        .set('Authorization', cenario.financeiro.header)
        .send({ alunoId: cenario.aluno.id, tipo: 'taxa', descricao: 'Taxa do aluno', valorOriginal: 80, vencimento: '2026-09-01' })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/v1/cobrancas/${cobrancaRes.body.id}/emitir-boleto`)
        .set('Authorization', cenario.financeiro.header)
        .expect(201);

      const meRes = await request(app.getHttpServer())
        .get('/v1/financeiro/me/cobrancas')
        .set('Authorization', cenario.alunoUsuario.header)
        .expect(200);
      expect(meRes.body.some((c: any) => c.id === cobrancaRes.body.id)).toBe(true);

      await request(app.getHttpServer())
        .get(`/v1/financeiro/me/cobrancas/${cobrancaRes.body.id}/boleto`)
        .set('Authorization', cenario.alunoUsuario.header)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/v1/financeiro/me/cobrancas/${cobrancaRes.body.id}/boleto`)
        .set('Authorization', cenario.outroAlunoUsuario.header)
        .expect(403);
    });

    it('Cobrança criada e paga gera notificação para o aluno na caixa de entrada dele — e só dele', async () => {
      const cenario = await montarCenarioFinanceiro();
      const cobrancaRes = await request(app.getHttpServer())
        .post('/v1/cobrancas')
        .set('Authorization', cenario.financeiro.header)
        .send({ alunoId: cenario.aluno.id, tipo: 'taxa', descricao: 'Taxa de notificação', valorOriginal: 55, vencimento: '2026-10-01' })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/v1/cobrancas/${cobrancaRes.body.id}/marcar-pago`)
        .set('Authorization', cenario.financeiro.header)
        .send({})
        .expect(201);

      const caixa = await request(app.getHttpServer())
        .get('/v1/notificacoes/minhas')
        .set('Authorization', cenario.alunoUsuario.header)
        .expect(200);
      const titulos = caixa.body.itens.map((n: any) => n.titulo);
      expect(titulos).toEqual(expect.arrayContaining(['Nova cobrança', 'Pagamento confirmado']));
      expect(caixa.body.naoLidas).toBeGreaterThanOrEqual(2);

      const outra = await request(app.getHttpServer())
        .get('/v1/notificacoes/minhas')
        .set('Authorization', cenario.outroAlunoUsuario.header)
        .expect(200);
      expect(outra.body.itens.some((n: any) => n.mensagem?.includes('Taxa de notificação'))).toBe(false);
    });

    it('Usuário sem nenhuma permissão de Finance recebe 403 ao listar cobranças', async () => {
      await montarCenarioFinanceiro();
      const semPermissao = await criarUsuarioComPermissoes('Sem Permissao Finance', 'sem.permissao.finance@example.com', []);
      await request(app.getHttpServer())
        .get('/v1/cobrancas')
        .set('Authorization', semPermissao.header)
        .expect(403);
    });
  });
});
