import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

const ids = {
  users: {
    solicitante: '10000000-0000-0000-0000-000000000001',
    atendente: '10000000-0000-0000-0000-000000000002',
    visualizador: '10000000-0000-0000-0000-000000000003',
    admin: '10000000-0000-4000-8000-000000000004',
    atendenteSecretaria: '10000000-0000-4000-8000-000000000005',
    atendenteSuporte: '10000000-0000-4000-8000-000000000006',
    atendenteCoordenacao: '10000000-0000-4000-8000-000000000007',
    coordenadorSecretaria: '10000000-0000-4000-8000-000000000008',
    coordenadorSuporte: '10000000-0000-4000-8000-000000000009',
    coordenadorCoordenacao: '10000000-0000-4000-8000-000000000010',
  },
  sectors: {
    secretaria: '30000000-0000-0000-0000-000000000001',
    suporte: '30000000-0000-0000-0000-000000000002',
    coordenacao: '30000000-0000-0000-0000-000000000003',
  },
  module: '40000000-0000-0000-0000-000000000001',
  roomsModule: '40000000-0000-4000-8000-000000000002',
  assetsModule: '40000000-0000-4000-8000-000000000003',
  hubModule: '40000000-0000-4000-8000-000000000004',
  categories: {
    acesso: '50000000-0000-0000-0000-000000000001',
    sistemas: '50000000-0000-0000-0000-000000000002',
    infraestrutura: '50000000-0000-0000-0000-000000000003',
  },
  subcategories: {
    senha: '60000000-0000-0000-0000-000000000001',
    matricula: '60000000-0000-0000-0000-000000000002',
    erro: '60000000-0000-0000-0000-000000000003',
    rede: '60000000-0000-0000-0000-000000000004',
  },
  statuses: {
    aberto: '70000000-0000-0000-0000-000000000001',
    atendimento: '70000000-0000-0000-0000-000000000002',
    resolvido: '70000000-0000-0000-0000-000000000003',
    encerrado: '70000000-0000-0000-0000-000000000004',
  },
  campus: '80000000-0000-4000-8000-000000000001',
  blocks: {
    central: '81000000-0000-4000-8000-000000000001',
    laboratorios: '81000000-0000-4000-8000-000000000002',
  },
  rooms: {
    auditorio: '82000000-0000-4000-8000-000000000001',
    sala101: '82000000-0000-4000-8000-000000000002',
    sala102: '82000000-0000-4000-8000-000000000003',
    labInfo: '82000000-0000-4000-8000-000000000004',
    reuniao: '82000000-0000-4000-8000-000000000005',
  },
  reservations: {
    analiseDefesa: '83000000-0000-4000-8000-000000000001',
    analiseReuniao: '83000000-0000-4000-8000-000000000002',
    confirmadaAula: '83000000-0000-4000-8000-000000000003',
    confirmadaWorkshop: '83000000-0000-4000-8000-000000000004',
    canceladaEvento: '83000000-0000-4000-8000-000000000005',
  },
  assetCategories: {
    informatica: '90000000-0000-4000-8000-000000000001',
    mobiliario: '90000000-0000-4000-8000-000000000002',
    audiovisual: '90000000-0000-4000-8000-000000000003',
  },
  assetSectors: {
    ti: '91000000-0000-4000-8000-000000000001',
    biblioteca: '91000000-0000-4000-8000-000000000002',
    laboratorios: '91000000-0000-4000-8000-000000000003',
  },
  assets: {
    notebook1: '92000000-0000-4000-8000-000000000001',
    notebook2: '92000000-0000-4000-8000-000000000002',
    projetor: '92000000-0000-4000-8000-000000000003',
    cadeira: '92000000-0000-4000-8000-000000000004',
    switch: '92000000-0000-4000-8000-000000000005',
    monitor: '92000000-0000-4000-8000-000000000006',
  },
};

/** Data futura (só dia, sem hora) N dias à frente, empurrada para fora do fim de semana. */
function diaFuturo(diasAdiante: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + diasAdiante);
  if (d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 2);
  if (d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

/**
 * Catálogo de permissões: usuário -> permissão direta (sem Perfil
 * intermediário). `recurso` é sempre a rota da tela no frontend e `acao` o
 * id da ação, igual ao catálogo em
 * src/components/rooster/hub/permission-catalog.ts do frontend — é o que
 * cada @RequirePermission(modulo, recurso, acao) do backend compara.
 */
function permissionDefinitions(hubModulo: { id: string }, deskModulo: { id: string }, roomsModulo: { id: string }, assetsModulo: { id: string }) {
  return [
    // Rooster Hub
    ['hub.usuarios.acessar', 'Acessar Usuários', hubModulo, '/hub/usuarios', 'acessar'],
    ['hub.usuarios.criar', 'Criar usuário', hubModulo, '/hub/usuarios', 'criar'],
    ['hub.usuarios.editar', 'Editar usuário', hubModulo, '/hub/usuarios', 'editar'],
    ['hub.usuarios.excluir', 'Excluir usuário', hubModulo, '/hub/usuarios', 'excluir'],
    ['hub.setores.acessar', 'Acessar Setores', hubModulo, '/hub/setores', 'acessar'],
    ['hub.setores.criar', 'Criar setor', hubModulo, '/hub/setores', 'criar'],
    ['hub.setores.editar', 'Editar setor', hubModulo, '/hub/setores', 'editar'],
    ['hub.setores.excluir', 'Excluir setor', hubModulo, '/hub/setores', 'excluir'],
    ['hub.setores.gerenciar-usuarios', 'Gerenciar usuários do setor', hubModulo, '/hub/setores', 'gerenciar-usuarios'],
    ['hub.acessos.acessar', 'Acessar Acessos e permissões', hubModulo, '/hub/acessos', 'acessar'],
    ['hub.acessos.gerenciar-permissoes', 'Gerenciar permissões', hubModulo, '/hub/acessos', 'gerenciar-permissoes'],
    ['hub.acessos.conceder', 'Conceder permissões a usuário', hubModulo, '/hub/acessos', 'conceder'],
    ['hub.acessos.revogar', 'Revogar permissões de usuário', hubModulo, '/hub/acessos', 'revogar'],
    ['hub.dashboard.acessar', 'Acessar Rooster Hub', hubModulo, '/hub', 'acessar'],

    // Rooster Desk
    ['desk.tickets.acessar', 'Acessar Chamados', deskModulo, '/desk/tickets', 'acessar'],
    ['desk.tickets.criar', 'Abrir chamado', deskModulo, '/desk/tickets', 'criar'],
    ['desk.tickets.editar', 'Editar chamado', deskModulo, '/desk/tickets', 'editar'],
    ['desk.tickets.encerrar', 'Encerrar chamado', deskModulo, '/desk/tickets', 'encerrar'],
    ['desk.tickets.reabrir', 'Reabrir chamado', deskModulo, '/desk/tickets', 'reabrir'],
    ['desk.tickets.transferir', 'Transferir chamado', deskModulo, '/desk/tickets', 'transferir'],
    ['desk.tickets.anexar', 'Anexar arquivo', deskModulo, '/desk/tickets', 'anexar'],
    ['desk.tickets.nota-interna', 'Registrar nota interna', deskModulo, '/desk/tickets', 'nota-interna'],
    ['desk.categories.criar', 'Criar categoria', deskModulo, '/desk/categories', 'criar'],
    ['desk.categories.editar', 'Editar categoria', deskModulo, '/desk/categories', 'editar'],
    ['desk.categories.excluir', 'Excluir categoria', deskModulo, '/desk/categories', 'excluir'],
    ['desk.categories.subcategorias', 'Gerenciar subcategorias', deskModulo, '/desk/categories', 'subcategorias'],
    ['desk.team.vincular-categoria', 'Vincular atendente a categoria', deskModulo, '/desk/team', 'vincular-categoria'],

    // Rooster Rooms
    ['rooms.dashboard.acessar', 'Acessar Rooster Rooms', roomsModulo, '/rooms', 'acessar'],
    ['rooms.structure.criar', 'Criar estrutura física', roomsModulo, '/rooms/structure', 'criar'],
    ['rooms.structure.editar', 'Editar estrutura física', roomsModulo, '/rooms/structure', 'editar'],
    ['rooms.structure.excluir', 'Excluir estrutura física', roomsModulo, '/rooms/structure', 'excluir'],
    ['rooms.book.solicitar', 'Solicitar reserva', roomsModulo, '/rooms/book', 'solicitar'],
    ['rooms.manage.aprovar', 'Aprovar reserva', roomsModulo, '/rooms/manage', 'aprovar'],
    ['rooms.manage.alterar-horario', 'Alterar horário (equipe)', roomsModulo, '/rooms/manage', 'alterar-horario'],
    ['rooms.manage.cancelar', 'Cancelar com motivo (equipe)', roomsModulo, '/rooms/manage', 'cancelar'],
    ['rooms.reservations.alterar-horario', 'Solicitar alteração de horário', roomsModulo, '/rooms/reservations', 'alterar-horario'],
    ['rooms.reservations.cancelar', 'Cancelar reserva própria', roomsModulo, '/rooms/reservations', 'cancelar'],

    // Rooster Assets
    ['assets.dashboard.acessar', 'Acessar Rooster Assets', assetsModulo, '/assets', 'acessar'],
    ['assets.inventory.criar', 'Criar patrimônio', assetsModulo, '/assets/inventory', 'criar'],
    ['assets.inventory.editar', 'Editar patrimônio', assetsModulo, '/assets/inventory', 'editar'],
    ['assets.inventory.excluir', 'Excluir patrimônio', assetsModulo, '/assets/inventory', 'excluir'],
    ['assets.inventory.gerenciar-categorias', 'Gerenciar categorias de patrimônio', assetsModulo, '/assets/inventory', 'gerenciar-categorias'],
    ['assets.inventory.movimentar', 'Registrar movimentação', assetsModulo, '/assets/inventory', 'movimentar'],
  ] as const;
}

const deskTicketOperationKeys = [
  'desk.tickets.acessar', 'desk.tickets.criar', 'desk.tickets.editar', 'desk.tickets.encerrar',
  'desk.tickets.reabrir', 'desk.tickets.transferir', 'desk.tickets.anexar', 'desk.tickets.nota-interna',
];
const deskManagementKeys = [
  'desk.categories.criar', 'desk.categories.editar', 'desk.categories.excluir',
  'desk.categories.subcategorias', 'desk.team.vincular-categoria',
];
const roomsViewKeys = ['rooms.dashboard.acessar'];
const roomsSelfServiceKeys = ['rooms.book.solicitar', 'rooms.reservations.alterar-horario', 'rooms.reservations.cancelar'];
const roomsManagementKeys = [
  'rooms.structure.criar', 'rooms.structure.editar', 'rooms.structure.excluir',
  'rooms.manage.aprovar', 'rooms.manage.alterar-horario', 'rooms.manage.cancelar',
];
const assetsViewKeys = ['assets.dashboard.acessar'];
const assetsOperationalKeys = ['assets.inventory.criar', 'assets.inventory.editar', 'assets.inventory.movimentar'];
const assetsManagementKeys = ['assets.inventory.excluir', 'assets.inventory.gerenciar-categorias'];

async function clearDatabase() {
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
}

async function main() {
  await clearDatabase();

  const modulo = await prisma.modulo.create({
    data: { id: ids.module, nome: 'Rooster Desk', rota: '/desk', icone: 'Ticket', ativo: true },
  });
  const roomsModulo = await prisma.modulo.create({ data: { id: ids.roomsModule, nome: 'Rooster Rooms', rota: '/rooms', icone: 'CalendarRange', ativo: true } });
  const assetsModulo = await prisma.modulo.create({ data: { id: ids.assetsModule, nome: 'Rooster Assets', rota: '/assets', icone: 'Package', ativo: true } });
  const hubModulo = await prisma.modulo.create({ data: { id: ids.hubModule, nome: 'Rooster Hub', rota: '/hub', icone: 'ShieldCheck', ativo: true } });

  const permissions = new Map<string, { id: string }>();
  for (const [key, nome, moduloAlvo, recurso, acao] of permissionDefinitions(hubModulo, modulo, roomsModulo, assetsModulo)) {
    const permission = await prisma.permissao.create({
      data: { moduloId: moduloAlvo.id, nome: key, descricao: nome, recurso, acao },
      select: { id: true },
    });
    permissions.set(key, permission);
  }

  const senha = (raw: string) => bcrypt.hash(raw, SALT_ROUNDS);

  /** Concede ao usuário exatamente as chaves de permissão informadas (sem Perfil intermediário). */
  async function grant(usuarioId: string, keys: string[]) {
    await prisma.usuarioPermissao.createMany({
      data: keys.map((key) => ({ usuarioId, permissaoId: permissions.get(key)!.id })),
      skipDuplicates: true,
    });
  }

  await prisma.setor.createMany({
    data: [
      { id: ids.sectors.secretaria, nome: 'Secretaria Acadêmica', descricao: 'Atendimento acadêmico e administrativo.', ativo: true },
      { id: ids.sectors.suporte, nome: 'Suporte de TI', descricao: 'Atendimento técnico e infraestrutura.', ativo: true },
      { id: ids.sectors.coordenacao, nome: 'Coordenação', descricao: 'Acompanhamento e gestão dos chamados.', ativo: true },
    ],
  });

  // Administrador: acesso total, concedido explicitamente (sem bypass mágico) —
  // ele é admin porque tem hub.acessos.gerenciar-permissoes, igual a qualquer usuário.
  await prisma.usuario.create({
    data: { id: ids.users.admin, nome: 'Administrador Rooster', email: 'admin@rooster.local', senhaHash: await senha('Admin123!'), ativo: true },
  });
  await grant(ids.users.admin, [...permissions.keys()]);

  const solicitantePermissions = [...deskTicketOperationKeys.filter((k) => k !== 'desk.tickets.encerrar' && k !== 'desk.tickets.reabrir' && k !== 'desk.tickets.transferir'), ...roomsViewKeys, ...roomsSelfServiceKeys];
  const atendentePermissions = [...deskTicketOperationKeys, ...roomsViewKeys, ...assetsViewKeys, ...assetsOperationalKeys];
  const visualizadorPermissions = ['desk.tickets.acessar', ...roomsViewKeys, ...assetsViewKeys];
  const coordenadorPermissions = [
    ...deskTicketOperationKeys, ...deskManagementKeys,
    ...roomsViewKeys, ...roomsSelfServiceKeys, ...roomsManagementKeys,
    ...assetsViewKeys, ...assetsOperationalKeys, ...assetsManagementKeys,
  ];

  const attendantSeeds = [
    { id: ids.users.atendenteSecretaria, name: 'Atendente Secretaria', email: 'atendente.secretaria@rooster.local', sectorId: ids.sectors.secretaria },
    { id: ids.users.atendenteSuporte, name: 'Atendente Suporte', email: 'atendente.suporte@rooster.local', sectorId: ids.sectors.suporte },
    { id: ids.users.atendenteCoordenacao, name: 'Atendente Coordenação', email: 'atendente.coordenacao@rooster.local', sectorId: ids.sectors.coordenacao },
  ];
  for (const attendant of attendantSeeds) {
    await prisma.usuario.create({ data: { id: attendant.id, nome: attendant.name, email: attendant.email, senhaHash: await senha('Atendente123!'), ativo: true } });
    await grant(attendant.id, atendentePermissions);
    await prisma.usuarioSetor.create({ data: { usuarioId: attendant.id, setorId: attendant.sectorId } });
  }

  const coordinatorSeeds = [
    { id: ids.users.coordenadorSecretaria, name: 'Coordenador Secretaria', email: 'coordenador.secretaria@rooster.local', sectorId: ids.sectors.secretaria },
    { id: ids.users.coordenadorSuporte, name: 'Coordenador Suporte', email: 'coordenador.suporte@rooster.local', sectorId: ids.sectors.suporte },
    { id: ids.users.coordenadorCoordenacao, name: 'Coordenador Coordenação', email: 'coordenador.coordenacao@rooster.local', sectorId: ids.sectors.coordenacao },
  ];
  for (const coordinator of coordinatorSeeds) {
    await prisma.usuario.create({ data: { id: coordinator.id, nome: coordinator.name, email: coordinator.email, senhaHash: await senha('Coordenador123!'), ativo: true } });
    await grant(coordinator.id, coordenadorPermissions);
    await prisma.usuarioSetor.create({ data: { usuarioId: coordinator.id, setorId: coordinator.sectorId } });
  }

  const users = await Promise.all([
    prisma.usuario.create({ data: { id: ids.users.solicitante, nome: 'Ana Solicitante', email: 'ana.solicitante@rooster.local', senhaHash: await senha('Senha123'), ativo: true } }),
    prisma.usuario.create({ data: { id: ids.users.atendente, nome: 'Bruno Atendente', email: 'bruno.atendente@rooster.local', senhaHash: await senha('Senha123'), ativo: true } }),
    prisma.usuario.create({ data: { id: ids.users.visualizador, nome: 'Carla Visualizadora', email: 'carla.visualizadora@rooster.local', senhaHash: await senha('Senha123'), ativo: true } }),
  ]);
  await grant(users[0].id, solicitantePermissions);
  await grant(users[1].id, atendentePermissions);
  await grant(users[2].id, visualizadorPermissions);

  await prisma.usuarioSetor.createMany({
    data: [
      { usuarioId: users[0].id, setorId: ids.sectors.secretaria },
      { usuarioId: users[1].id, setorId: ids.sectors.suporte },
      { usuarioId: users[2].id, setorId: ids.sectors.coordenacao },
    ],
  });

  await prisma.categoriaTicket.createMany({
    data: [
      { id: ids.categories.acesso, nome: 'Acesso e Contas', descricao: 'Login, senha e permissões.', slaHoras: 8, setorId: ids.sectors.secretaria, ativo: true },
      { id: ids.categories.sistemas, nome: 'Sistemas Acadêmicos', descricao: 'Portal, matrícula e sistemas institucionais.', slaHoras: 24, setorId: ids.sectors.coordenacao, ativo: true },
      { id: ids.categories.infraestrutura, nome: 'Infraestrutura', descricao: 'Rede, equipamentos e salas.', slaHoras: 12, setorId: ids.sectors.suporte, ativo: true },
    ],
  });
  await prisma.subcategoriaTicket.createMany({
    data: [
      { id: ids.subcategories.senha, categoriaId: ids.categories.acesso, nome: 'Redefinição de senha', slaHoras: 4, ativo: true },
      { id: ids.subcategories.matricula, categoriaId: ids.categories.sistemas, nome: 'Matrícula', slaHoras: 24, ativo: true },
      { id: ids.subcategories.erro, categoriaId: ids.categories.sistemas, nome: 'Erro no sistema', slaHoras: 8, ativo: true },
      { id: ids.subcategories.rede, categoriaId: ids.categories.infraestrutura, nome: 'Rede e Wi-Fi', slaHoras: 8, ativo: true },
    ],
  });
  await prisma.prioridadeTicket.createMany({
    data: [
      { id: '1', nome: 'baixa', cor: 'oklch(0.72 0.1 200)' },
      { id: '2', nome: 'media', cor: 'oklch(0.72 0.14 90)' },
      { id: '3', nome: 'alta', cor: 'oklch(0.68 0.18 40)' },
      { id: '4', nome: 'urgente', cor: 'oklch(0.6 0.22 25)' },
    ],
  });
  await prisma.statusTicket.createMany({
    data: [
      { id: ids.statuses.aberto, nome: 'Aberto', ordem: 1, encerrado: false },
      { id: ids.statuses.atendimento, nome: 'Em atendimento', ordem: 2, encerrado: false },
      { id: ids.statuses.resolvido, nome: 'Resolvido', ordem: 3, encerrado: false },
      { id: ids.statuses.encerrado, nome: 'Encerrado', ordem: 4, encerrado: true },
    ],
  });

  await prisma.ticket.createMany({
    data: [
      { protocolo: 'TCK-0001', titulo: 'Não consigo acessar o portal', descricao: 'A senha não é aceita no portal acadêmico.', usuarioId: ids.users.solicitante, categoriaId: ids.categories.acesso, subcategoriaId: ids.subcategories.senha, prioridadeId: '2', statusId: ids.statuses.aberto, criadoEm: new Date(), atualizadoEm: new Date() },
      { protocolo: 'TCK-0002', titulo: 'Erro ao consultar matrícula', descricao: 'A tela de matrícula apresenta erro ao carregar.', usuarioId: ids.users.visualizador, tecnicoId: ids.users.atendente, categoriaId: ids.categories.sistemas, subcategoriaId: ids.subcategories.matricula, prioridadeId: '3', statusId: ids.statuses.atendimento, criadoEm: new Date(), atualizadoEm: new Date() },
      { protocolo: 'TCK-0003', titulo: 'Wi-Fi instável na biblioteca', descricao: 'A conexão cai repetidamente durante o uso.', usuarioId: ids.users.solicitante, tecnicoId: ids.users.atendente, categoriaId: ids.categories.infraestrutura, subcategoriaId: ids.subcategories.rede, prioridadeId: '1', statusId: ids.statuses.resolvido, criadoEm: new Date(), atualizadoEm: new Date(), encerradoEm: new Date() },
    ],
  });

  // =====================================================
  // Rooster Rooms — estrutura física e reservas de exemplo
  // =====================================================
  await prisma.campus.create({
    data: {
      id: ids.campus,
      nome: 'Campus Central',
      codigo: 'CEN',
      endereco: 'Av. das Torres, 1000',
      cidade: 'Cascavel',
      estado: 'PR',
      cep: '85806-095',
      responsavel: 'Diretoria de Infraestrutura',
      cor: 'oklch(0.62 0.14 250)',
      ativo: true,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    },
  });

  await prisma.bloco.createMany({
    data: [
      { id: ids.blocks.central, campusId: ids.campus, nome: 'Bloco A', codigo: 'A', andares: 3, responsavel: 'Portaria A', ativo: true, criadoEm: new Date(), atualizadoEm: new Date() },
      { id: ids.blocks.laboratorios, campusId: ids.campus, nome: 'Bloco de Laboratórios', codigo: 'LAB', andares: 2, responsavel: 'Coordenação de Laboratórios', ativo: true, criadoEm: new Date(), atualizadoEm: new Date() },
    ],
  });

  const diasUteis = ['seg', 'ter', 'qua', 'qui', 'sex'];
  await prisma.ambiente.createMany({
    data: [
      { id: ids.rooms.auditorio, campusId: ids.campus, blocoId: ids.blocks.central, nome: 'Auditório Principal', codigo: 'A-AUD', andar: 0, tipo: 'auditorio', capacidade: 120, descricao: 'Palco, projetor e sistema de som.', status: 'disponivel', horarioAbertura: '07:00-22:00', diasFuncionamento: [...diasUteis, 'sab'], duracaoMinutos: 60, criadoEm: new Date(), atualizadoEm: new Date() },
      { id: ids.rooms.sala101, campusId: ids.campus, blocoId: ids.blocks.central, nome: 'Sala 101', codigo: 'A-101', andar: 1, numero: '101', tipo: 'sala', capacidade: 40, descricao: 'Sala de aula com quadro branco e projetor.', status: 'disponivel', horarioAbertura: '07:00-22:00', diasFuncionamento: diasUteis, duracaoMinutos: 50, criadoEm: new Date(), atualizadoEm: new Date() },
      { id: ids.rooms.sala102, campusId: ids.campus, blocoId: ids.blocks.central, nome: 'Sala 102', codigo: 'A-102', andar: 1, numero: '102', tipo: 'sala', capacidade: 35, status: 'disponivel', horarioAbertura: '07:00-22:00', diasFuncionamento: diasUteis, duracaoMinutos: 50, criadoEm: new Date(), atualizadoEm: new Date() },
      { id: ids.rooms.labInfo, campusId: ids.campus, blocoId: ids.blocks.laboratorios, nome: 'Laboratório de Informática 1', codigo: 'LAB-INFO-1', andar: 1, tipo: 'lab-info', capacidade: 30, descricao: '30 estações de trabalho.', status: 'disponivel', horarioAbertura: '07:30-21:30', diasFuncionamento: diasUteis, duracaoMinutos: 60, criadoEm: new Date(), atualizadoEm: new Date() },
      { id: ids.rooms.reuniao, campusId: ids.campus, blocoId: ids.blocks.laboratorios, nome: 'Sala de Reuniões', codigo: 'LAB-REU', andar: 2, tipo: 'reuniao', capacidade: 12, descricao: 'Mesa oval, TV e videoconferência.', status: 'disponivel', horarioAbertura: '08:00-19:00', diasFuncionamento: diasUteis, duracaoMinutos: 30, criadoEm: new Date(), atualizadoEm: new Date() },
    ],
  });

  await prisma.reserva.createMany({
    data: [
      {
        id: ids.reservations.analiseDefesa, codigo: 'RES-0001', ambienteId: ids.rooms.auditorio,
        responsavelId: ids.users.solicitante, responsavel: 'Ana Solicitante', setor: 'Coordenação de TCC',
        evento: 'Defesa de TCC — Engenharia de Software', finalidade: 'evento',
        data: diaFuturo(3), horarioInicio: '14:00', horarioFim: '16:00', participantes: 40,
        status: 'analise', recorrencia: 'unica', observacoes: 'Necessita projetor e microfone sem fio.',
        criadoEm: new Date(), atualizadoEm: new Date(),
      },
      {
        id: ids.reservations.analiseReuniao, codigo: 'RES-0002', ambienteId: ids.rooms.reuniao,
        responsavelId: ids.users.visualizador, responsavel: 'Carla Visualizadora', setor: 'Coordenação',
        evento: 'Reunião de colegiado', finalidade: 'reuniao',
        data: diaFuturo(4), horarioInicio: '09:00', horarioFim: '10:30', participantes: 10,
        status: 'analise', recorrencia: 'unica',
        criadoEm: new Date(), atualizadoEm: new Date(),
      },
      {
        id: ids.reservations.confirmadaAula, codigo: 'RES-0003', ambienteId: ids.rooms.sala101,
        responsavelId: ids.users.atendente, responsavel: 'Bruno Atendente', setor: 'Suporte de TI',
        evento: 'Aula prática de Redes', finalidade: 'aula',
        data: diaFuturo(2), horarioInicio: '19:00', horarioFim: '20:40', participantes: 32,
        status: 'confirmada', recorrencia: 'semanal',
        decididoPor: ids.users.admin, decididoEm: new Date(),
        criadoEm: new Date(), atualizadoEm: new Date(),
      },
      {
        id: ids.reservations.confirmadaWorkshop, codigo: 'RES-0004', ambienteId: ids.rooms.labInfo,
        responsavelId: ids.users.solicitante, responsavel: 'Ana Solicitante', setor: 'Extensão',
        evento: 'Workshop de Git e GitHub', finalidade: 'evento',
        data: diaFuturo(6), horarioInicio: '08:00', horarioFim: '12:00', participantes: 28,
        status: 'confirmada', recorrencia: 'unica',
        decididoPor: ids.users.admin, decididoEm: new Date(),
        criadoEm: new Date(), atualizadoEm: new Date(),
      },
      {
        id: ids.reservations.canceladaEvento, codigo: 'RES-0005', ambienteId: ids.rooms.auditorio,
        responsavelId: ids.users.visualizador, responsavel: 'Carla Visualizadora', setor: 'Diretório Acadêmico',
        evento: 'Palestra externa (adiada)', finalidade: 'evento',
        data: diaFuturo(8), horarioInicio: '19:00', horarioFim: '21:00', participantes: 90,
        status: 'cancelada', recorrencia: 'unica', observacoes: 'Palestrante cancelou; reagendar.',
        decididoPor: ids.users.admin, decididoEm: new Date(),
        criadoEm: new Date(), atualizadoEm: new Date(),
      },
    ],
  });

  // =====================================================
  // Rooster Assets — patrimônio e movimentações de exemplo
  // =====================================================
  await prisma.patrimonioCategoria.createMany({
    data: [
      { id: ids.assetCategories.informatica, nome: 'Informática', descricao: 'Computadores, notebooks e periféricos.', tom: 'oklch(0.55 0.19 265)', sistema: false, criadoEm: new Date(), atualizadoEm: new Date() },
      { id: ids.assetCategories.mobiliario, nome: 'Mobiliário', descricao: 'Cadeiras, mesas e armários.', tom: 'oklch(0.68 0.15 195)', sistema: false, criadoEm: new Date(), atualizadoEm: new Date() },
      { id: ids.assetCategories.audiovisual, nome: 'Audiovisual', descricao: 'Projetores, telas e equipamentos de som.', tom: 'oklch(0.72 0.16 90)', sistema: false, criadoEm: new Date(), atualizadoEm: new Date() },
    ],
  });

  await prisma.patrimonioSetor.createMany({
    data: [
      { id: ids.assetSectors.ti, nome: 'Setor de TI', descricao: 'Equipamentos sob guarda da TI.', responsavel: 'Bruno Atendente', criadoEm: new Date(), atualizadoEm: new Date() },
      { id: ids.assetSectors.biblioteca, nome: 'Biblioteca', descricao: 'Patrimônio da biblioteca central.', responsavel: 'Carla Visualizadora', criadoEm: new Date(), atualizadoEm: new Date() },
      { id: ids.assetSectors.laboratorios, nome: 'Laboratórios', descricao: 'Equipamentos dos laboratórios de ensino.', responsavel: 'Ana Solicitante', criadoEm: new Date(), atualizadoEm: new Date() },
    ],
  });

  await prisma.patrimonio.createMany({
    data: [
      { id: ids.assets.notebook1, nome: 'Notebook Dell Latitude 5440', tag: 'PAT-0001', categoriaId: ids.assetCategories.informatica, marca: 'Dell', modelo: 'Latitude 5440', serial: 'DL5440-001', localizacao: 'Sala de TI', setorId: ids.assetSectors.ti, setor: 'Setor de TI', responsavel: 'Bruno Atendente', status: 'em-uso', condicao: 'bom', adquiridoEm: new Date('2024-03-12'), valor: 4800, criadoEm: new Date(), atualizadoEm: new Date() },
      { id: ids.assets.notebook2, nome: 'Notebook Lenovo ThinkPad E14', tag: 'PAT-0002', categoriaId: ids.assetCategories.informatica, marca: 'Lenovo', modelo: 'ThinkPad E14', serial: 'LN-E14-002', localizacao: 'Almoxarifado de TI', setorId: ids.assetSectors.ti, setor: 'Setor de TI', status: 'disponivel', condicao: 'novo', adquiridoEm: new Date('2025-01-20'), valor: 5200, criadoEm: new Date(), atualizadoEm: new Date() },
      { id: ids.assets.projetor, nome: 'Projetor Epson PowerLite', tag: 'PAT-0003', categoriaId: ids.assetCategories.audiovisual, marca: 'Epson', modelo: 'PowerLite E20', localizacao: 'Auditório Principal', setorId: ids.assetSectors.laboratorios, setor: 'Laboratórios', status: 'em-uso', condicao: 'bom', adquiridoEm: new Date('2023-08-05'), valor: 3100, criadoEm: new Date(), atualizadoEm: new Date() },
      { id: ids.assets.cadeira, nome: 'Cadeira de Escritório Presidente', tag: 'PAT-0004', categoriaId: ids.assetCategories.mobiliario, marca: 'Flexform', localizacao: 'Sala 101', setorId: ids.assetSectors.laboratorios, setor: 'Laboratórios', status: 'em-uso', condicao: 'regular', adquiridoEm: new Date('2021-11-30'), valor: 890, criadoEm: new Date(), atualizadoEm: new Date() },
      { id: ids.assets.switch, nome: 'Switch Gerenciável 24 portas', tag: 'PAT-0005', categoriaId: ids.assetCategories.informatica, marca: 'TP-Link', modelo: 'TL-SG3428', serial: 'TP-SG-005', localizacao: 'Rack do Bloco A', setorId: ids.assetSectors.ti, setor: 'Setor de TI', status: 'manutencao', condicao: 'ruim', adquiridoEm: new Date('2020-06-15'), valor: 1750, observacoes: 'Porta 12 sem link; aguardando avaliação.', criadoEm: new Date(), atualizadoEm: new Date() },
      { id: ids.assets.monitor, nome: 'Monitor LG UltraWide 29"', tag: 'PAT-0006', categoriaId: ids.assetCategories.informatica, marca: 'LG', modelo: '29WP60G', serial: 'LG-29-006', localizacao: 'Biblioteca — balcão', setorId: ids.assetSectors.biblioteca, setor: 'Biblioteca', responsavel: 'Carla Visualizadora', status: 'emprestado', condicao: 'bom', adquiridoEm: new Date('2024-09-01'), valor: 1450, criadoEm: new Date(), atualizadoEm: new Date() },
    ],
  });

  await prisma.patrimonioMovimento.createMany({
    data: [
      { patrimonioId: ids.assets.notebook1, tipo: 'setor', origem: 'Laboratórios', destino: 'Setor de TI', usuario: 'Administrador Rooster', observacoes: 'Realocado para a equipe de suporte.', criadoEm: new Date(Date.now() - 30 * 86400000) },
      { patrimonioId: ids.assets.projetor, tipo: 'sala', origem: 'Depósito', destino: 'Auditório Principal', usuario: 'Bruno Atendente', criadoEm: new Date(Date.now() - 14 * 86400000) },
      { patrimonioId: ids.assets.switch, tipo: 'manutencao', origem: 'Rack do Bloco A', destino: 'Rack do Bloco A', usuario: 'Bruno Atendente', observacoes: 'Falha na porta 12.', criadoEm: new Date(Date.now() - 5 * 86400000) },
      { patrimonioId: ids.assets.monitor, tipo: 'emprestimo', origem: null, destino: 'Carla Visualizadora', usuario: 'Administrador Rooster', observacoes: 'Empréstimo para o balcão da biblioteca.', criadoEm: new Date(Date.now() - 2 * 86400000) },
    ],
  });

  console.log('Banco de desenvolvimento limpo e populado.');
  console.log('Usuários: ana.solicitante@rooster.local, bruno.atendente@rooster.local, carla.visualizadora@rooster.local');
  console.log('Senha de todos: Senha123');
  console.log('Administrador: admin@rooster.local / Admin123!');
  console.log('Coordenadores: coordenador.secretaria@rooster.local, coordenador.suporte@rooster.local, coordenador.coordenacao@rooster.local / Coordenador123!');
  console.log('Rooms: 1 campus, 2 blocos, 5 ambientes e 5 reservas (2 em análise para aprovar/recusar).');
  console.log('Assets: 3 categorias, 3 setores, 6 patrimônios e 4 movimentações.');
}

main()
  .catch((error) => {
    console.error('Falha ao popular o banco:', error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
