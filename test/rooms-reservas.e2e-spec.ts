import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
const request = require('supertest');
import { AppModule } from '../src/app.module';
import { configurarApp } from '../src/app-config';
import { PrismaService } from '../src/roster-hub/shared/prisma.service';
import { PrismaTestService } from '../src/roster-hub/shared/prisma-test.service';

/**
 * Cobre os endpoints consumidos pela tela de agenda de reservas
 * (frontend: src/routes/rooms.agenda.tsx):
 *   GET   /campus, /ambientes, /reservas   -> carga da tela
 *   POST  /reservas                        -> "Nova reserva"
 *   PATCH /reservas/:id/status             -> Aprovar / Recusar
 */
describe('Rooster Rooms — reservas (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaTestService;
  let token: string;

  // Uma quarta-feira, para cair dentro de diasFuncionamento de seg–sex.
  const DATA = '2026-10-14';

  let campusId: string;
  let blocoId: string;
  let ambienteId: string;
  /** Ambiente pequeno, usado nos testes de capacidade. */
  let ambientePequenoId: string;

  const auth = () => ({ Authorization: `Bearer ${token}` });

  const novaReserva = (over: Record<string, unknown> = {}) => ({
    codigo: `RES-${Math.random().toString(36).slice(2, 10)}`,
    ambienteId,
    responsavel: 'Marina Ribeiro',
    setor: 'Direção',
    evento: 'Treinamento interno',
    data: DATA,
    horarioInicio: '09:00',
    horarioFim: '11:00',
    participantes: 10,
    ...over,
  });

  const criarReserva = (over: Record<string, unknown> = {}) =>
    request(app.getHttpServer()).post('/v1/reservas').set(auth()).send(novaReserva(over));

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useClass(PrismaTestService)
      .compile();

    app = moduleRef.createNestApplication();
    configurarApp(app);
    await app.init();

    prisma = moduleRef.get(PrismaService) as PrismaTestService;

    // RBAC é achatado (usuário -> permissão direta, sem Perfil intermediário — ver
    // docs/security/03-rbac.md) — concede aqui exatamente as chaves que os endpoints
    // exercitados neste arquivo exigem, igual ao padrão de test/app.e2e-spec.ts.
    const usuario = await prisma.usuario.create({
      data: {
        nome: 'E2E Admin',
        email: `e2e.rooms.${Date.now()}@example.com`,
        senhaHash: 'nao-usado-o-token-e-assinado-direto',
        ativo: true,
      },
    });
    // findFirst ?? create: a ordem em que o Jest executa os arquivos *.e2e-spec.ts
    // não é garantida (não é alfabética por padrão), e app.e2e-spec.ts também
    // semeia um Modulo 'Rooster Rooms' sem limpá-lo no afterAll (de propósito —
    // ver o comentário lá, a limpeza fica só no globalTeardown). Um `create`
    // incondicional aqui falha por unicidade sempre que este arquivo roda depois
    // do outro. Mesmo padrão já usado em app.e2e-spec.ts:178.
    const modulo =
      (await prisma.modulo.findFirst({ where: { nome: 'Rooster Rooms' } })) ??
      (await prisma.modulo.create({ data: { nome: 'Rooster Rooms', ativo: true } }));
    const chaves: Array<[recurso: string, acao: string]> = [
      ['/rooms', 'acessar'],
      ['/rooms/structure', 'criar'],
      ['/rooms/book', 'solicitar'],
      ['/rooms/book', 'solicitar-recorrente'],
      ['/rooms/book', 'prazo-estendido'],
      ['/rooms/manage', 'aprovar'],
    ];
    for (const [recurso, acao] of chaves) {
      const permissao = await prisma.permissao.create({
        data: { moduloId: modulo.id, nome: `Rooster Rooms:${recurso}:${acao}`, recurso, acao },
      });
      await prisma.usuarioPermissao.create({ data: { usuarioId: usuario.id, permissaoId: permissao.id } });
    }

    token = moduleRef.get(JwtService).sign({ sub: usuario.id });
  });

  beforeEach(async () => {
    // Estrutura física recriada a cada teste para isolar os conflitos de horário.
    await prisma.reserva.deleteMany();
    await prisma.ambiente.deleteMany();
    await prisma.bloco.deleteMany();
    await prisma.campus.deleteMany();

    const campus = await prisma.campus.create({
      data: { nome: 'Campus Central', codigo: `CEN-${Date.now()}`, ativo: true },
    });
    campusId = campus.id;

    const bloco = await prisma.bloco.create({
      data: { campusId, nome: 'Bloco A', codigo: 'A', andares: 3, ativo: true },
    });
    blocoId = bloco.id;

    const ambiente = await prisma.ambiente.create({
      data: {
        campusId,
        blocoId,
        nome: 'Sala 101',
        codigo: `A-101-${Date.now()}`,
        andar: 1,
        tipo: 'sala',
        capacidade: 40,
        status: 'disponivel',
        horarioAbertura: '07:00-22:00',
      },
    });
    ambienteId = ambiente.id;

    const pequeno = await prisma.ambiente.create({
      data: {
        campusId,
        blocoId,
        nome: 'Sala de Reunião',
        codigo: `A-REU-${Date.now()}`,
        andar: 1,
        tipo: 'reuniao',
        capacidade: 6,
        status: 'disponivel',
        horarioAbertura: '07:00-22:00',
      },
    });
    ambientePequenoId = pequeno.id;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  describe('autenticação', () => {
    it('recusa a listagem de reservas sem token', async () => {
      await request(app.getHttpServer()).get('/v1/reservas').expect(401);
    });

    it('recusa a criação de reserva sem token', async () => {
      await request(app.getHttpServer()).post('/v1/reservas').send(novaReserva()).expect(401);
    });
  });

  describe('carga da tela', () => {
    it('lista campus, ambientes e reservas', async () => {
      const [campi, ambientes, reservas] = await Promise.all([
        request(app.getHttpServer()).get('/v1/campus').set(auth()).expect(200),
        request(app.getHttpServer()).get('/v1/ambientes').set(auth()).expect(200),
        request(app.getHttpServer()).get('/v1/reservas').set(auth()).expect(200),
      ]);

      expect(campi.body.some((c: any) => c.id === campusId)).toBe(true);
      expect(ambientes.body.some((a: any) => a.id === ambienteId)).toBe(true);
      expect(Array.isArray(reservas.body)).toBe(true);
    });

    it('traz o ambiente embutido em cada reserva', async () => {
      await criarReserva().expect(201);

      const res = await request(app.getHttpServer()).get('/v1/reservas').set(auth()).expect(200);
      expect(res.body[0].ambiente).toBeDefined();
      expect(res.body[0].ambiente.id).toBe(ambienteId);
    });

    it('filtra reservas por status', async () => {
      const criada = await criarReserva().expect(201);
      await request(app.getHttpServer())
        .patch(`/v1/reservas/${criada.body.id}/status`)
        .set(auth())
        .send({ status: 'confirmada' })
        .expect(200);
      await criarReserva({ horarioInicio: '14:00', horarioFim: '15:00' }).expect(201);

      const res = await request(app.getHttpServer())
        .get('/v1/reservas?status=analise')
        .set(auth())
        .expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].status).toBe('analise');
    });
  });

  describe('POST /reservas — Nova reserva', () => {
    it('cria a reserva em análise por padrão', async () => {
      const res = await criarReserva().expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.status).toBe('analise');
      expect(res.body.recorrencia).toBe('unica');
      expect(res.body.ambienteId).toBe(ambienteId);
      expect(res.body.horarioInicio).toBe('09:00');
    });

    it('recusa horário de término menor ou igual ao de início', async () => {
      const res = await criarReserva({ horarioInicio: '11:00', horarioFim: '09:00' }).expect(400);
      expect(res.body.message).toMatch(/término deve ser maior/i);
    });

    it('recusa quantidade de participantes acima da capacidade', async () => {
      const res = await criarReserva({ ambienteId: ambientePequenoId, participantes: 30 }).expect(400);
      expect(res.body.message).toMatch(/capacidade máxima/i);
    });

    it('recusa horário fora da janela de funcionamento do ambiente', async () => {
      const res = await criarReserva({ horarioInicio: '05:00', horarioFim: '06:00' }).expect(400);
      expect(res.body.message).toMatch(/fora da janela de funcionamento/i);
    });

    it('recusa horário inválido', async () => {
      await criarReserva({ horarioInicio: '25:00' }).expect(400);
    });

    it('recusa sobreposição com uma reserva ativa do mesmo ambiente', async () => {
      await criarReserva({ horarioInicio: '09:00', horarioFim: '11:00' }).expect(201);

      const res = await criarReserva({ horarioInicio: '10:00', horarioFim: '12:00' }).expect(409);
      expect(res.body.message).toMatch(/conflito de horário/i);
    });

    it('aceita horários encostados sem sobreposição', async () => {
      await criarReserva({ horarioInicio: '09:00', horarioFim: '11:00' }).expect(201);
      await criarReserva({ horarioInicio: '11:00', horarioFim: '12:00' }).expect(201);
    });

    it('não considera conflito entre ambientes diferentes', async () => {
      await criarReserva({ horarioInicio: '09:00', horarioFim: '11:00' }).expect(201);
      await criarReserva({ ambienteId: ambientePequenoId, participantes: 4 }).expect(201);
    });

    it('libera o horário de uma reserva cancelada', async () => {
      const criada = await criarReserva().expect(201);
      await request(app.getHttpServer())
        .patch(`/v1/reservas/${criada.body.id}/status`)
        .set(auth())
        .send({ status: 'cancelada' })
        .expect(200);

      await criarReserva({ horarioInicio: '09:00', horarioFim: '11:00' }).expect(201);
    });
  });

  describe('PATCH /reservas/:id/status — Aprovar e Recusar', () => {
    it('aprova a reserva e registra a decisão', async () => {
      const criada = await criarReserva().expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/v1/reservas/${criada.body.id}/status`)
        .set(auth())
        .send({ status: 'confirmada' })
        .expect(200);

      expect(res.body.status).toBe('confirmada');
      expect(res.body.decididoEm).not.toBeNull();
      expect(res.body.decididoPor).toBeTruthy();
    });

    it('recusa (cancela) a reserva', async () => {
      const criada = await criarReserva().expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/v1/reservas/${criada.body.id}/status`)
        .set(auth())
        .send({ status: 'cancelada' })
        .expect(200);

      expect(res.body.status).toBe('cancelada');
      expect(res.body.decididoEm).not.toBeNull();
    });

    it('rejeita status inválido', async () => {
      const criada = await criarReserva().expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/v1/reservas/${criada.body.id}/status`)
        .set(auth())
        .send({ status: 'aprovadissima' })
        .expect(400);
      expect(res.body.message).toMatch(/status inválido/i);
    });

    it('responde 404 para reserva inexistente', async () => {
      await request(app.getHttpServer())
        .patch('/v1/reservas/00000000-0000-0000-0000-000000000000/status')
        .set(auth())
        .send({ status: 'confirmada' })
        .expect(404);
    });

    it('revalida o conflito ao confirmar: duas em análise, só a primeira confirma', async () => {
      // As duas entram em análise porque "analise" bloqueia o horário apenas
      // para novas criações sobrepostas — aqui elas não se sobrepõem na criação.
      const primeira = await criarReserva({ horarioInicio: '09:00', horarioFim: '11:00' }).expect(201);
      const segunda = await criarReserva({ horarioInicio: '11:00', horarioFim: '13:00' }).expect(201);

      await request(app.getHttpServer())
        .patch(`/v1/reservas/${primeira.body.id}/status`)
        .set(auth())
        .send({ status: 'confirmada' })
        .expect(200);

      // Estende a segunda para invadir o horário da primeira e tenta confirmar.
      await prisma.reserva.update({
        where: { id: segunda.body.id },
        data: { horarioInicio: '10:00' },
      });

      const res = await request(app.getHttpServer())
        .patch(`/v1/reservas/${segunda.body.id}/status`)
        .set(auth())
        .send({ status: 'confirmada' })
        .expect(409);
      expect(res.body.message).toMatch(/conflito de horário/i);
    });
  });
});
