/**
 * Catálogo de módulos e permissões do Rooster One — fonte única usada pelo seed de demonstração
 * (`prisma/seed-dev.ts`), pela preparação de uma instalação nova (`scripts/preparar-base.ts`) e pela
 * concessão automática das permissões de professor e de aluno (`AcademyService`).
 *
 * Cada permissão é `[chave, descrição, módulo, recurso, ação]`: `recurso` é a rota da tela no frontend e `acao`
 * o id da ação, iguais ao catálogo em `src/components/rooster/hub/permission-catalog.ts` do frontend — é o que
 * cada `@RequirePermission(modulo, recurso, acao)` compara. A `chave` é gravada em `permissoes.nome` e é por
 * ela que o frontend deduz o perfil de interface.
 */
export type DefinicaoModulo = { nome: string; rota: string; icone: string };
export type DefinicaoPermissao = readonly [chave: string, descricao: string, modulo: string, recurso: string, acao: string];

export const MODULOS: readonly DefinicaoModulo[] = [
  { nome: 'Rooster Hub', rota: '/hub', icone: 'ShieldCheck' },
  { nome: 'Rooster Desk', rota: '/desk', icone: 'Ticket' },
  { nome: 'Rooster Rooms', rota: '/rooms', icone: 'CalendarRange' },
  { nome: 'Rooster Assets', rota: '/assets', icone: 'Package' },
  { nome: 'Rooster Academy', rota: '/academy', icone: 'GraduationCap' },
  { nome: 'Rooster Learn', rota: '/learn', icone: 'BookOpen' },
  { nome: 'Rooster Student', rota: '/student', icone: 'GraduationCap' },
  { nome: 'Rooster Boost', rota: '/boost', icone: 'Rocket' },
  { nome: 'Rooster Finance', rota: '/finance', icone: 'Wallet' },
];

export const PERMISSOES: readonly DefinicaoPermissao[] = [
  // Rooster Hub
  ['hub.usuarios.acessar', 'Acessar Usuários', 'Rooster Hub', '/hub/usuarios', 'acessar'],
  ['hub.usuarios.criar', 'Criar usuário', 'Rooster Hub', '/hub/usuarios', 'criar'],
  ['hub.usuarios.editar', 'Editar usuário', 'Rooster Hub', '/hub/usuarios', 'editar'],
  ['hub.usuarios.excluir', 'Excluir usuário', 'Rooster Hub', '/hub/usuarios', 'excluir'],
  ['hub.setores.acessar', 'Acessar Setores', 'Rooster Hub', '/hub/setores', 'acessar'],
  ['hub.setores.criar', 'Criar setor', 'Rooster Hub', '/hub/setores', 'criar'],
  ['hub.setores.editar', 'Editar setor', 'Rooster Hub', '/hub/setores', 'editar'],
  ['hub.setores.excluir', 'Excluir setor', 'Rooster Hub', '/hub/setores', 'excluir'],
  ['hub.setores.gerenciar-usuarios', 'Gerenciar usuários do setor', 'Rooster Hub', '/hub/setores', 'gerenciar-usuarios'],
  ['hub.acessos.acessar', 'Acessar Acessos e permissões', 'Rooster Hub', '/hub/acessos', 'acessar'],
  ['hub.acessos.gerenciar-permissoes', 'Gerenciar permissões', 'Rooster Hub', '/hub/acessos', 'gerenciar-permissoes'],
  ['hub.acessos.relatorio-auditoria', 'Ver relatório de auditoria', 'Rooster Hub', '/hub/acessos', 'relatorio-auditoria'],
  ['hub.acessos.relatorio-erros', 'Ver relatório de erros', 'Rooster Hub', '/hub/acessos', 'relatorio-erros'],
  ['hub.acessos.conceder', 'Conceder permissões a usuário', 'Rooster Hub', '/hub/acessos', 'conceder'],
  ['hub.acessos.revogar', 'Revogar permissões de usuário', 'Rooster Hub', '/hub/acessos', 'revogar'],
  ['hub.configuracoes.acessar', 'Acessar Configurações do sistema', 'Rooster Hub', '/hub/configuracoes', 'acessar'],
  ['hub.dashboard.acessar', 'Acessar Rooster Hub', 'Rooster Hub', '/hub', 'acessar'],

  // Rooster Desk
  ['desk.dashboard.acessar', 'Acessar Rooster Desk', 'Rooster Desk', '/desk', 'acessar'],
  ['desk.tickets.acessar', 'Acessar Chamados', 'Rooster Desk', '/desk/tickets', 'acessar'],
  ['desk.tickets.criar', 'Abrir chamado', 'Rooster Desk', '/desk/tickets', 'criar'],
  ['desk.tickets.editar', 'Editar chamado', 'Rooster Desk', '/desk/tickets', 'editar'],
  ['desk.tickets.encerrar', 'Encerrar chamado', 'Rooster Desk', '/desk/tickets', 'encerrar'],
  ['desk.tickets.reabrir', 'Reabrir chamado', 'Rooster Desk', '/desk/tickets', 'reabrir'],
  ['desk.tickets.transferir', 'Transferir chamado', 'Rooster Desk', '/desk/tickets', 'transferir'],
  ['desk.tickets.anexar', 'Anexar arquivo', 'Rooster Desk', '/desk/tickets', 'anexar'],
  ['desk.tickets.nota-interna', 'Registrar nota interna', 'Rooster Desk', '/desk/tickets', 'nota-interna'],
  ['desk.tickets.ver-sla', 'Visualizar SLA', 'Rooster Desk', '/desk/tickets', 'ver-sla'],
  ['desk.categories.acessar', 'Acessar categorias', 'Rooster Desk', '/desk/categories', 'acessar'],
  ['desk.categories.criar', 'Criar categoria', 'Rooster Desk', '/desk/categories', 'criar'],
  ['desk.categories.editar', 'Editar categoria', 'Rooster Desk', '/desk/categories', 'editar'],
  ['desk.categories.excluir', 'Excluir categoria', 'Rooster Desk', '/desk/categories', 'excluir'],
  ['desk.categories.subcategorias', 'Gerenciar subcategorias', 'Rooster Desk', '/desk/categories', 'subcategorias'],
  ['desk.team.acessar', 'Acessar atendentes', 'Rooster Desk', '/desk/team', 'acessar'],
  ['desk.team.vincular-categoria', 'Vincular atendente a categoria', 'Rooster Desk', '/desk/team', 'vincular-categoria'],

  // Rooster Rooms
  ['rooms.dashboard.acessar', 'Acessar Rooster Rooms', 'Rooster Rooms', '/rooms', 'acessar'],
  ['rooms.structure.acessar', 'Acessar estrutura física', 'Rooster Rooms', '/rooms/structure', 'acessar'],
  ['rooms.structure.criar', 'Criar estrutura física', 'Rooster Rooms', '/rooms/structure', 'criar'],
  ['rooms.structure.editar', 'Editar estrutura física', 'Rooster Rooms', '/rooms/structure', 'editar'],
  ['rooms.structure.excluir', 'Excluir estrutura física', 'Rooster Rooms', '/rooms/structure', 'excluir'],
  ['rooms.book.acessar', 'Acessar reserva de ambientes', 'Rooster Rooms', '/rooms/book', 'acessar'],
  ['rooms.book.solicitar', 'Solicitar reserva', 'Rooster Rooms', '/rooms/book', 'solicitar'],
  ['rooms.book.solicitar-recorrente', 'Solicitar reserva recorrente', 'Rooster Rooms', '/rooms/book', 'solicitar-recorrente'],
  ['rooms.book.prazo-estendido', 'Reservar com prazo estendido (sem limite de 15 dias)', 'Rooster Rooms', '/rooms/book', 'prazo-estendido'],
  ['rooms.manage.acessar', 'Acessar gestão de reservas', 'Rooster Rooms', '/rooms/manage', 'acessar'],
  ['rooms.manage.aprovar', 'Aprovar reserva', 'Rooster Rooms', '/rooms/manage', 'aprovar'],
  ['rooms.manage.responder', 'Responder solicitante (equipe)', 'Rooster Rooms', '/rooms/manage', 'responder'],
  ['rooms.manage.alterar-horario', 'Alterar horário (equipe)', 'Rooster Rooms', '/rooms/manage', 'alterar-horario'],
  ['rooms.manage.cancelar', 'Cancelar com motivo (equipe)', 'Rooster Rooms', '/rooms/manage', 'cancelar'],
  ['rooms.reservations.acessar', 'Acessar minhas reservas', 'Rooster Rooms', '/rooms/reservations', 'acessar'],
  ['rooms.reservations.mensagem', 'Enviar mensagem na reserva própria', 'Rooster Rooms', '/rooms/reservations', 'mensagem'],
  ['rooms.reservations.alterar-horario', 'Solicitar alteração de horário', 'Rooster Rooms', '/rooms/reservations', 'alterar-horario'],
  ['rooms.reservations.cancelar', 'Cancelar reserva própria', 'Rooster Rooms', '/rooms/reservations', 'cancelar'],

  // Rooster Assets
  ['assets.dashboard.acessar', 'Acessar Rooster Assets', 'Rooster Assets', '/assets', 'acessar'],
  ['assets.inventory.acessar', 'Acessar patrimônio', 'Rooster Assets', '/assets/inventory', 'acessar'],
  ['assets.inventory.criar', 'Criar patrimônio', 'Rooster Assets', '/assets/inventory', 'criar'],
  ['assets.inventory.editar', 'Editar patrimônio', 'Rooster Assets', '/assets/inventory', 'editar'],
  ['assets.inventory.excluir', 'Excluir patrimônio', 'Rooster Assets', '/assets/inventory', 'excluir'],
  ['assets.inventory.gerenciar-categorias', 'Gerenciar categorias de patrimônio', 'Rooster Assets', '/assets/inventory', 'gerenciar-categorias'],
  ['assets.inventory.movimentar', 'Registrar movimentação', 'Rooster Assets', '/assets/inventory', 'movimentar'],

  // Rooster Academy
  ['academy.dashboard.acessar', 'Acessar Rooster Academy', 'Rooster Academy', '/academy', 'acessar'],
  ['academy.manage.acessar', 'Acessar gestão acadêmica', 'Rooster Academy', '/academy/manage', 'acessar'],
  ['academy.manage.gerenciar-cursos', 'Gerenciar cursos', 'Rooster Academy', '/academy/manage', 'gerenciar-cursos'],
  ['academy.manage.gerenciar-disciplinas', 'Gerenciar disciplinas', 'Rooster Academy', '/academy/manage', 'gerenciar-disciplinas'],
  ['academy.manage.gerenciar-turmas', 'Gerenciar turmas', 'Rooster Academy', '/academy/manage', 'gerenciar-turmas'],
  ['academy.manage.gerenciar-professores', 'Gerenciar professores', 'Rooster Academy', '/academy/manage', 'gerenciar-professores'],
  ['academy.manage.gerenciar-alunos', 'Gerenciar alunos', 'Rooster Academy', '/academy/manage', 'gerenciar-alunos'],
  ['academy.manage.gerenciar-calendario', 'Gerenciar calendário acadêmico', 'Rooster Academy', '/academy/manage', 'gerenciar-calendario'],
  ['academy.manage.matricular', 'Matricular aluno', 'Rooster Academy', '/academy/manage', 'matricular'],
  ['academy.attendance.acessar', 'Acessar frequência', 'Rooster Academy', '/academy/attendance', 'acessar'],
  ['academy.attendance.registrar-chamada', 'Registrar chamada', 'Rooster Academy', '/academy/attendance', 'registrar-chamada'],
  ['academy.attendance.editar-chamada', 'Editar chamada anterior', 'Rooster Academy', '/academy/attendance', 'editar-chamada'],
  ['academy.grades.acessar', 'Acessar notas e conteúdos', 'Rooster Academy', '/academy/grades', 'acessar'],
  ['academy.grades.lancar-notas', 'Lançar notas', 'Rooster Academy', '/academy/grades', 'lancar-notas'],
  ['academy.grades.configurar-pesos', 'Configurar componentes e pesos', 'Rooster Academy', '/academy/grades', 'configurar-pesos'],

  // Rooster Learn
  ['learn.dashboard.acessar', 'Acessar Rooster Learn', 'Rooster Learn', '/learn', 'acessar'],
  ['learn.classes.acessar', 'Acessar turmas e atividades', 'Rooster Learn', '/learn/classes', 'acessar'],
  ['learn.classes.criar-atividade', 'Criar atividade', 'Rooster Learn', '/learn/classes', 'criar-atividade'],
  ['learn.classes.editar-questoes', 'Editar questões', 'Rooster Learn', '/learn/classes', 'editar-questoes'],
  ['learn.classes.corrigir', 'Corrigir entregas', 'Rooster Learn', '/learn/classes', 'corrigir'],
  ['learn.classes.duplicar', 'Duplicar atividade', 'Rooster Learn', '/learn/classes', 'duplicar'],
  ['learn.classes.excluir', 'Excluir atividade', 'Rooster Learn', '/learn/classes', 'excluir'],
  ['learn.classes.gerenciar-turmas', 'Gerenciar turmas (coordenação)', 'Rooster Learn', '/learn/classes', 'gerenciar-turmas'],
  ['learn.student.acessar', 'Acessar minhas atividades', 'Rooster Learn', '/learn/student', 'acessar'],
  ['learn.student.responder', 'Responder atividade', 'Rooster Learn', '/learn/student', 'responder'],
  ['learn.student.anexar', 'Anexar arquivo', 'Rooster Learn', '/learn/student', 'anexar'],
  ['learn.student.ver-correcao', 'Ver correção do professor', 'Rooster Learn', '/learn/student', 'ver-correcao'],

  // Rooster Student
  ['student.dashboard.acessar', 'Acessar Rooster Student', 'Rooster Student', '/student', 'acessar'],
  ['student.profile.acessar', 'Acessar perfil acadêmico', 'Rooster Student', '/student/profile', 'acessar'],
  ['student.disciplines.acessar', 'Acessar disciplinas', 'Rooster Student', '/student/disciplines', 'acessar'],
  ['student.activities.acessar', 'Acessar atividades', 'Rooster Student', '/student/activities', 'acessar'],
  ['student.activities.entregar', 'Realizar entrega', 'Rooster Student', '/student/activities', 'entregar'],
  ['student.grades.acessar', 'Acessar notas e desempenho', 'Rooster Student', '/student/grades', 'acessar'],
  ['student.attendance.acessar', 'Acessar frequência', 'Rooster Student', '/student/attendance', 'acessar'],
  ['student.history.acessar', 'Acessar histórico', 'Rooster Student', '/student/history', 'acessar'],
  ['student.history.baixar', 'Baixar histórico', 'Rooster Student', '/student/history', 'baixar'],
  ['student.calendar.acessar', 'Acessar calendário', 'Rooster Student', '/student/calendar', 'acessar'],
  ['student.documents.acessar', 'Acessar documentos', 'Rooster Student', '/student/documents', 'acessar'],
  ['student.documents.enviar', 'Enviar documento', 'Rooster Student', '/student/documents', 'enviar'],
  ['student.documents.baixar', 'Baixar documento', 'Rooster Student', '/student/documents', 'baixar'],
  ['student.notifications.acessar', 'Acessar notificações', 'Rooster Student', '/student/notifications', 'acessar'],
  ['student.notifications.marcar-lida', 'Marcar como lida', 'Rooster Student', '/student/notifications', 'marcar-lida'],
  ['student.finance.acessar', 'Acessar financeiro do aluno', 'Rooster Student', '/student/finance', 'acessar'],
  ['student.finance.baixar-boleto', 'Baixar boleto (portal do aluno)', 'Rooster Student', '/student/finance', 'baixar-boleto'],

  // Rooster Boost (lado instrutor — o aluno do Boost usa login próprio, fora deste catálogo)
  ['boost.dashboard.acessar', 'Acessar Rooster Boost', 'Rooster Boost', '/boost', 'acessar'],
  ['boost.manage.acessar', 'Acessar gestão de cursos Boost', 'Rooster Boost', '/boost/manage', 'acessar'],
  ['boost.manage.gerenciar-cursos', 'Gerenciar cursos Boost', 'Rooster Boost', '/boost/manage', 'gerenciar-cursos'],
  ['boost.manage.gerenciar-conteudo', 'Gerenciar módulos, aulas e materiais', 'Rooster Boost', '/boost/manage', 'gerenciar-conteudo'],
  ['boost.manage.ver-progresso', 'Ver progresso dos alunos', 'Rooster Boost', '/boost/manage', 'ver-progresso'],
  ['boost.manage.certificado', 'Configurar certificado do curso', 'Rooster Boost', '/boost/manage', 'certificado'],
  ['boost.manage.vincular-orientadores', 'Vincular orientadores ao curso', 'Rooster Boost', '/boost/manage', 'vincular-orientadores'],
  ['boost.manage.matricular', 'Matricular e cancelar matrícula de alunos', 'Rooster Boost', '/boost/manage', 'matricular'],
  // Conversa aluno ↔ orientador: o professor vinculado a um curso só conversa (não gere o curso).
  ['boost.conversas.acessar', 'Acessar conversas com alunos', 'Rooster Boost', '/boost/conversas', 'acessar'],
  ['boost.conversas.responder', 'Responder alunos', 'Rooster Boost', '/boost/conversas', 'responder'],
  // Contas externas (BoostUsuario) — gestão entre cursos, por isso tela própria.
  ['boost.students.acessar', 'Ver contas externas do Boost', 'Rooster Boost', '/boost/students', 'acessar'],
  ['boost.students.gerenciar', 'Cadastrar, editar, ativar/desativar, excluir e redefinir senha de conta externa', 'Rooster Boost', '/boost/students', 'gerenciar'],

  // Rooster Finance
  ['finance.dashboard.acessar', 'Acessar Rooster Finance', 'Rooster Finance', '/finance', 'acessar'],
  ['finance.charges.acessar', 'Acessar Cobranças', 'Rooster Finance', '/finance/charges', 'acessar'],
  ['finance.charges.criar', 'Nova cobrança', 'Rooster Finance', '/finance/charges', 'criar'],
  ['finance.charges.marcar-pago', 'Marcar cobrança como paga', 'Rooster Finance', '/finance/charges', 'marcar-pago'],
  ['finance.charges.negociar', 'Negociar cobrança', 'Rooster Finance', '/finance/charges', 'negociar'],
  ['finance.charges.cancelar', 'Cancelar cobrança', 'Rooster Finance', '/finance/charges', 'cancelar'],
  ['finance.charges.exportar', 'Exportar cobranças', 'Rooster Finance', '/finance/charges', 'exportar'],
  ['finance.tuitions.acessar', 'Acessar Mensalidades', 'Rooster Finance', '/finance/tuitions', 'acessar'],
  ['finance.tuitions.gerar-lote', 'Gerar mensalidades em lote', 'Rooster Finance', '/finance/tuitions', 'gerar-lote'],
  ['finance.tuitions.editar', 'Editar mensalidade', 'Rooster Finance', '/finance/tuitions', 'editar'],
  ['finance.boletos.acessar', 'Acessar Boletos', 'Rooster Finance', '/finance/boletos', 'acessar'],
  ['finance.boletos.emitir', 'Emitir boleto', 'Rooster Finance', '/finance/boletos', 'emitir'],
  ['finance.boletos.baixar', 'Baixar boleto', 'Rooster Finance', '/finance/boletos', 'baixar'],
  ['finance.products.acessar', 'Acessar Produtos', 'Rooster Finance', '/finance/products', 'acessar'],
  ['finance.products.criar', 'Criar produto', 'Rooster Finance', '/finance/products', 'criar'],
  ['finance.products.editar', 'Editar produto', 'Rooster Finance', '/finance/products', 'editar'],
  ['finance.products.excluir', 'Excluir produto', 'Rooster Finance', '/finance/products', 'excluir'],
  ['finance.services.acessar', 'Acessar Serviços', 'Rooster Finance', '/finance/services', 'acessar'],
  ['finance.services.criar', 'Criar serviço', 'Rooster Finance', '/finance/services', 'criar'],
  ['finance.services.editar', 'Editar serviço', 'Rooster Finance', '/finance/services', 'editar'],
  ['finance.services.excluir', 'Excluir serviço', 'Rooster Finance', '/finance/services', 'excluir'],
  ['finance.nfe.acessar', 'Acessar Notas Fiscais', 'Rooster Finance', '/finance/nfe', 'acessar'],
  ['finance.nfe.emitir', 'Emitir nota fiscal', 'Rooster Finance', '/finance/nfe', 'emitir'],
  ['finance.nfe.exportar-xml', 'Exportar XML da nota fiscal', 'Rooster Finance', '/finance/nfe', 'exportar-xml'],
  ['finance.reports.acessar', 'Acessar Relatórios', 'Rooster Finance', '/finance/reports', 'acessar'],
  ['finance.reports.exportar', 'Exportar relatório', 'Rooster Finance', '/finance/reports', 'exportar'],
  ['finance.discounts.acessar', 'Acessar Descontos', 'Rooster Finance', '/finance/discounts', 'acessar'],
  ['finance.discounts.criar', 'Criar desconto', 'Rooster Finance', '/finance/discounts', 'criar'],
  ['finance.discounts.editar', 'Editar desconto', 'Rooster Finance', '/finance/discounts', 'editar'],
  ['finance.discounts.excluir', 'Excluir desconto', 'Rooster Finance', '/finance/discounts', 'excluir'],
  // Regra de multa/juros por atraso, criada pelo próprio financeiro (RN043) — não é fixa no código.
  ['finance.policies.acessar', 'Acessar Políticas de multa/juros', 'Rooster Finance', '/finance/policies', 'acessar'],
  ['finance.policies.criar', 'Criar política de multa/juros', 'Rooster Finance', '/finance/policies', 'criar'],
  ['finance.policies.editar', 'Editar política de multa/juros', 'Rooster Finance', '/finance/policies', 'editar'],
  ['finance.policies.excluir', 'Excluir política de multa/juros', 'Rooster Finance', '/finance/policies', 'excluir'],
];

/** Professor: só o que precisa para lecionar as próprias turmas — a checagem de "é dono da turma" acontece no backend. */
export const CHAVES_PROFESSOR: readonly string[] = [
  'academy.dashboard.acessar',
  'academy.attendance.acessar', 'academy.attendance.registrar-chamada', 'academy.attendance.editar-chamada',
  'academy.grades.acessar', 'academy.grades.lancar-notas', 'academy.grades.configurar-pesos',
  'learn.dashboard.acessar', 'learn.classes.acessar', 'learn.classes.criar-atividade', 'learn.classes.editar-questoes', 'learn.classes.corrigir', 'learn.classes.excluir',
  'student.documents.acessar',
  // Orientador do Boost = Professor do Academy vinculado a um curso: SÓ conversa com os alunos
  // dele. Gerir curso (criar, editar, tirar do ar, certificado) é permissão de gestão.
  'boost.conversas.acessar', 'boost.conversas.responder',
];

/** Aluno: portal do Rooster Student + as ações do Rooster Learn como respondente. */
export const CHAVES_ALUNO: readonly string[] = [
  'student.dashboard.acessar', 'student.profile.acessar', 'student.disciplines.acessar',
  'student.activities.acessar', 'student.activities.entregar', 'student.grades.acessar', 'student.attendance.acessar',
  'student.history.acessar', 'student.history.baixar', 'student.calendar.acessar',
  'student.documents.acessar', 'student.documents.enviar', 'student.documents.baixar',
  'student.notifications.acessar', 'student.notifications.marcar-lida',
  'student.finance.acessar', 'student.finance.baixar-boleto',
  'learn.dashboard.acessar', 'learn.student.acessar', 'learn.student.responder', 'learn.student.anexar', 'learn.student.ver-correcao',
];

/** Definições do catálogo correspondentes às chaves informadas (chave desconhecida é ignorada). */
export function definicoesDasChaves(chaves: readonly string[]): DefinicaoPermissao[] {
  const alvo = new Set(chaves);
  return PERMISSOES.filter(([chave]) => alvo.has(chave));
}
