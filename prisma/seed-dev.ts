import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import PDFDocument from 'pdfkit';
import { escreverDocumentoEncriptadoComNome } from '../src/common/file-encryption.util';
import { PASTAS } from '../src/common/storage.config';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

/** PDF de demonstração, gerado em memória (mesma biblioteca usada por certificado e nota fiscal). */
function pdfDemonstracao(titulo: string, descricao: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 56 });
    const partes: Buffer[] = [];
    doc.on('data', (parte: Buffer) => partes.push(parte));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);
    doc.fontSize(18).text(titulo);
    doc.moveDown().fontSize(11).text(descricao);
    doc.moveDown().fontSize(9).fillColor('#666666').text('Documento de demonstração gerado pelo seed de desenvolvimento do Rooster One.');
    doc.end();
  });
}

/**
 * Grava um documento de demonstração cifrado, com o mesmo formato dos arquivos enviados pela
 * aplicação, para que o download dos registros semeados funcione. O nome é determinístico
 * (`seed-<chave>.pdf`): reexecutar o seed sobrescreve o arquivo em vez de acumular cópias.
 */
async function arquivoDemonstracao(pasta: string, chave: string, titulo: string, descricao: string) {
  const pdf = await pdfDemonstracao(titulo, descricao);
  const caminho = `seed-${chave}.pdf`;
  escreverDocumentoEncriptadoComNome(pasta, caminho, pdf);
  return { caminho, tamanho: BigInt(pdf.length) };
}

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
    financeiro: '10000000-0000-4000-8000-000000000011',
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
  academyModule: '40000000-0000-4000-8000-000000000005',
  learnModule: '40000000-0000-4000-8000-000000000006',
  studentModule: '40000000-0000-4000-8000-000000000007',
  boostModule: '40000000-0000-4000-8000-000000000008',
  financeModule: '40000000-0000-4000-8000-000000000009',
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
    aulaAlgoritmos: '83000000-0000-4000-8000-000000000006',
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
  academyUsers: {
    coordenador: '11000000-0000-4000-8000-000000000001',
    professorLima: '11000000-0000-4000-8000-000000000002',
    professorCosta: '11000000-0000-4000-8000-000000000003',
    alunoJoao: '11000000-0000-4000-8000-000000000004',
    alunoMaria: '11000000-0000-4000-8000-000000000005',
    alunoPedro: '11000000-0000-4000-8000-000000000006',
  },
  cursos: {
    engenhariaSoftware: '12000000-0000-4000-8000-000000000001',
    administracao: '12000000-0000-4000-8000-000000000002',
  },
  periodosLetivos: {
    atual: '13000000-0000-4000-8000-000000000001',
  },
  disciplinas: {
    algoritmos: '14000000-0000-4000-8000-000000000001',
    bancoDados: '14000000-0000-4000-8000-000000000002',
    poo: '14000000-0000-4000-8000-000000000003',
  },
  professores: {
    lima: '15000000-0000-4000-8000-000000000001',
    costa: '15000000-0000-4000-8000-000000000002',
    admin: '15000000-0000-4000-8000-000000000003',
  },
  alunos: {
    joao: '16000000-0000-4000-8000-000000000001',
    maria: '16000000-0000-4000-8000-000000000002',
    admin: '16000000-0000-4000-8000-000000000003',
    pedro: '16000000-0000-4000-8000-000000000004',
  },
  turmas: {
    algoritmosA: '17000000-0000-4000-8000-000000000001',
    bancoDadosA: '17000000-0000-4000-8000-000000000002',
    pooA: '17000000-0000-4000-8000-000000000003',
  },
  itensAvaliativos: {
    provaAlgoritmos: '18000000-0000-4000-8000-000000000001',
    provaBancoDados: '18000000-0000-4000-8000-000000000002',
    provaPoo: '18000000-0000-4000-8000-000000000003',
  },
  atividades: {
    listaAlgoritmos: '19000000-0000-4000-8000-000000000001',
    trabalhoPoo: '19000000-0000-4000-8000-000000000002',
  },
  documentosAcademicos: {
    planoAlgoritmos: '24000000-0000-4000-8000-000000000001',
    ementaBancoDados: '24000000-0000-4000-8000-000000000002',
    regulamento: '24000000-0000-4000-8000-000000000003',
  },
  produtos: {
    apostila: '20000000-0000-4000-8000-000000000001',
    uniforme: '20000000-0000-4000-8000-000000000002',
  },
  servicos: {
    mensalidadeGraduacao: '21000000-0000-4000-8000-000000000001',
    segundaVia: '21000000-0000-4000-8000-000000000002',
  },
  descontos: {
    bolsaMerito: '22000000-0000-4000-8000-000000000001',
  },
  politicas: {
    mensalidade: '23000000-0000-4000-8000-000000000001',
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
function permissionDefinitions(
  hubModulo: { id: string },
  deskModulo: { id: string },
  roomsModulo: { id: string },
  assetsModulo: { id: string },
  academyModulo: { id: string },
  learnModulo: { id: string },
  studentModulo: { id: string },
  boostModulo: { id: string },
  financeModulo: { id: string },
) {
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
    ['hub.acessos.relatorio-auditoria', 'Ver relatório de auditoria', hubModulo, '/hub/acessos', 'relatorio-auditoria'],
    ['hub.acessos.relatorio-erros', 'Ver relatório de erros', hubModulo, '/hub/acessos', 'relatorio-erros'],
    ['hub.acessos.conceder', 'Conceder permissões a usuário', hubModulo, '/hub/acessos', 'conceder'],
    ['hub.acessos.revogar', 'Revogar permissões de usuário', hubModulo, '/hub/acessos', 'revogar'],
    ['hub.configuracoes.acessar', 'Acessar Configurações do sistema', hubModulo, '/hub/configuracoes', 'acessar'],
    ['hub.dashboard.acessar', 'Acessar Rooster Hub', hubModulo, '/hub', 'acessar'],

    // Rooster Desk
    ['desk.dashboard.acessar', 'Acessar Rooster Desk', deskModulo, '/desk', 'acessar'],
    ['desk.tickets.acessar', 'Acessar Chamados', deskModulo, '/desk/tickets', 'acessar'],
    ['desk.tickets.criar', 'Abrir chamado', deskModulo, '/desk/tickets', 'criar'],
    ['desk.tickets.editar', 'Editar chamado', deskModulo, '/desk/tickets', 'editar'],
    ['desk.tickets.encerrar', 'Encerrar chamado', deskModulo, '/desk/tickets', 'encerrar'],
    ['desk.tickets.reabrir', 'Reabrir chamado', deskModulo, '/desk/tickets', 'reabrir'],
    ['desk.tickets.transferir', 'Transferir chamado', deskModulo, '/desk/tickets', 'transferir'],
    ['desk.tickets.anexar', 'Anexar arquivo', deskModulo, '/desk/tickets', 'anexar'],
    ['desk.tickets.nota-interna', 'Registrar nota interna', deskModulo, '/desk/tickets', 'nota-interna'],
    ['desk.tickets.ver-sla', 'Visualizar SLA', deskModulo, '/desk/tickets', 'ver-sla'],
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
    ['rooms.book.solicitar-recorrente', 'Solicitar reserva recorrente', roomsModulo, '/rooms/book', 'solicitar-recorrente'],
    ['rooms.book.prazo-estendido', 'Reservar com prazo estendido (sem limite de 15 dias)', roomsModulo, '/rooms/book', 'prazo-estendido'],
    ['rooms.manage.aprovar', 'Aprovar reserva', roomsModulo, '/rooms/manage', 'aprovar'],
    ['rooms.manage.responder', 'Responder solicitante (equipe)', roomsModulo, '/rooms/manage', 'responder'],
    ['rooms.manage.alterar-horario', 'Alterar horário (equipe)', roomsModulo, '/rooms/manage', 'alterar-horario'],
    ['rooms.manage.cancelar', 'Cancelar com motivo (equipe)', roomsModulo, '/rooms/manage', 'cancelar'],
    ['rooms.reservations.mensagem', 'Enviar mensagem na reserva própria', roomsModulo, '/rooms/reservations', 'mensagem'],
    ['rooms.reservations.alterar-horario', 'Solicitar alteração de horário', roomsModulo, '/rooms/reservations', 'alterar-horario'],
    ['rooms.reservations.cancelar', 'Cancelar reserva própria', roomsModulo, '/rooms/reservations', 'cancelar'],

    // Rooster Assets
    ['assets.dashboard.acessar', 'Acessar Rooster Assets', assetsModulo, '/assets', 'acessar'],
    ['assets.inventory.criar', 'Criar patrimônio', assetsModulo, '/assets/inventory', 'criar'],
    ['assets.inventory.editar', 'Editar patrimônio', assetsModulo, '/assets/inventory', 'editar'],
    ['assets.inventory.excluir', 'Excluir patrimônio', assetsModulo, '/assets/inventory', 'excluir'],
    ['assets.inventory.gerenciar-categorias', 'Gerenciar categorias de patrimônio', assetsModulo, '/assets/inventory', 'gerenciar-categorias'],
    ['assets.inventory.movimentar', 'Registrar movimentação', assetsModulo, '/assets/inventory', 'movimentar'],

    // Rooster Academy
    ['academy.dashboard.acessar', 'Acessar Rooster Academy', academyModulo, '/academy', 'acessar'],
    ['academy.manage.acessar', 'Acessar gestão acadêmica', academyModulo, '/academy/manage', 'acessar'],
    ['academy.manage.gerenciar-cursos', 'Gerenciar cursos', academyModulo, '/academy/manage', 'gerenciar-cursos'],
    ['academy.manage.gerenciar-disciplinas', 'Gerenciar disciplinas', academyModulo, '/academy/manage', 'gerenciar-disciplinas'],
    ['academy.manage.gerenciar-turmas', 'Gerenciar turmas', academyModulo, '/academy/manage', 'gerenciar-turmas'],
    ['academy.manage.gerenciar-professores', 'Gerenciar professores', academyModulo, '/academy/manage', 'gerenciar-professores'],
    ['academy.manage.gerenciar-alunos', 'Gerenciar alunos', academyModulo, '/academy/manage', 'gerenciar-alunos'],
    ['academy.manage.gerenciar-calendario', 'Gerenciar calendário acadêmico', academyModulo, '/academy/manage', 'gerenciar-calendario'],
    ['academy.manage.matricular', 'Matricular aluno', academyModulo, '/academy/manage', 'matricular'],
    ['academy.attendance.acessar', 'Acessar frequência', academyModulo, '/academy/attendance', 'acessar'],
    ['academy.attendance.registrar-chamada', 'Registrar chamada', academyModulo, '/academy/attendance', 'registrar-chamada'],
    ['academy.attendance.editar-chamada', 'Editar chamada anterior', academyModulo, '/academy/attendance', 'editar-chamada'],
    ['academy.grades.acessar', 'Acessar notas e conteúdos', academyModulo, '/academy/grades', 'acessar'],
    ['academy.grades.lancar-notas', 'Lançar notas', academyModulo, '/academy/grades', 'lancar-notas'],
    ['academy.grades.configurar-pesos', 'Configurar componentes e pesos', academyModulo, '/academy/grades', 'configurar-pesos'],

    // Rooster Learn
    ['learn.dashboard.acessar', 'Acessar Rooster Learn', learnModulo, '/learn', 'acessar'],
    ['learn.classes.acessar', 'Acessar turmas e atividades', learnModulo, '/learn/classes', 'acessar'],
    ['learn.classes.criar-atividade', 'Criar atividade', learnModulo, '/learn/classes', 'criar-atividade'],
    ['learn.classes.editar-questoes', 'Editar questões', learnModulo, '/learn/classes', 'editar-questoes'],
    ['learn.classes.corrigir', 'Corrigir entregas', learnModulo, '/learn/classes', 'corrigir'],
    ['learn.classes.duplicar', 'Duplicar atividade', learnModulo, '/learn/classes', 'duplicar'],
    ['learn.classes.excluir', 'Excluir atividade', learnModulo, '/learn/classes', 'excluir'],
    ['learn.classes.gerenciar-turmas', 'Gerenciar turmas (coordenação)', learnModulo, '/learn/classes', 'gerenciar-turmas'],
    ['learn.student.acessar', 'Acessar minhas atividades', learnModulo, '/learn/student', 'acessar'],
    ['learn.student.responder', 'Responder atividade', learnModulo, '/learn/student', 'responder'],
    ['learn.student.anexar', 'Anexar arquivo', learnModulo, '/learn/student', 'anexar'],
    ['learn.student.ver-correcao', 'Ver correção do professor', learnModulo, '/learn/student', 'ver-correcao'],

    // Rooster Student
    ['student.dashboard.acessar', 'Acessar Rooster Student', studentModulo, '/student', 'acessar'],
    ['student.profile.acessar', 'Acessar perfil acadêmico', studentModulo, '/student/profile', 'acessar'],
    ['student.disciplines.acessar', 'Acessar disciplinas', studentModulo, '/student/disciplines', 'acessar'],
    ['student.activities.acessar', 'Acessar atividades', studentModulo, '/student/activities', 'acessar'],
    ['student.activities.entregar', 'Realizar entrega', studentModulo, '/student/activities', 'entregar'],
    ['student.grades.acessar', 'Acessar notas e desempenho', studentModulo, '/student/grades', 'acessar'],
    ['student.attendance.acessar', 'Acessar frequência', studentModulo, '/student/attendance', 'acessar'],
    ['student.history.acessar', 'Acessar histórico', studentModulo, '/student/history', 'acessar'],
    ['student.history.baixar', 'Baixar histórico', studentModulo, '/student/history', 'baixar'],
    ['student.calendar.acessar', 'Acessar calendário', studentModulo, '/student/calendar', 'acessar'],
    ['student.documents.acessar', 'Acessar documentos', studentModulo, '/student/documents', 'acessar'],
    ['student.documents.enviar', 'Enviar documento', studentModulo, '/student/documents', 'enviar'],
    ['student.documents.baixar', 'Baixar documento', studentModulo, '/student/documents', 'baixar'],
    ['student.notifications.acessar', 'Acessar notificações', studentModulo, '/student/notifications', 'acessar'],
    ['student.notifications.marcar-lida', 'Marcar como lida', studentModulo, '/student/notifications', 'marcar-lida'],
    ['student.finance.acessar', 'Acessar financeiro do aluno', studentModulo, '/student/finance', 'acessar'],
    ['student.finance.baixar-boleto', 'Baixar boleto (portal do aluno)', studentModulo, '/student/finance', 'baixar-boleto'],

    // Rooster Boost (lado instrutor — o aluno do Boost usa login próprio, fora deste catálogo)
    ['boost.dashboard.acessar', 'Acessar Rooster Boost', boostModulo, '/boost', 'acessar'],
    ['boost.manage.acessar', 'Acessar gestão de cursos Boost', boostModulo, '/boost/manage', 'acessar'],
    ['boost.manage.gerenciar-cursos', 'Gerenciar cursos Boost', boostModulo, '/boost/manage', 'gerenciar-cursos'],
    ['boost.manage.gerenciar-conteudo', 'Gerenciar módulos, aulas e materiais', boostModulo, '/boost/manage', 'gerenciar-conteudo'],
    ['boost.manage.ver-progresso', 'Ver progresso dos alunos', boostModulo, '/boost/manage', 'ver-progresso'],
    ['boost.manage.certificado', 'Configurar certificado do curso', boostModulo, '/boost/manage', 'certificado'],
    ['boost.manage.vincular-orientadores', 'Vincular orientadores ao curso', boostModulo, '/boost/manage', 'vincular-orientadores'],
    ['boost.manage.matricular', 'Matricular e cancelar matrícula de alunos', boostModulo, '/boost/manage', 'matricular'],
    // Conversa aluno ↔ orientador: o professor vinculado a um curso só conversa (não gere o curso).
    ['boost.conversas.acessar', 'Acessar conversas com alunos', boostModulo, '/boost/conversas', 'acessar'],
    ['boost.conversas.responder', 'Responder alunos', boostModulo, '/boost/conversas', 'responder'],
    // Contas externas (BoostUsuario) — gestão entre cursos, por isso tela própria.
    ['boost.students.acessar', 'Ver contas externas do Boost', boostModulo, '/boost/students', 'acessar'],
    ['boost.students.gerenciar', 'Cadastrar, editar, ativar/desativar, excluir e redefinir senha de conta externa', boostModulo, '/boost/students', 'gerenciar'],

    // Rooster Finance
    ['finance.dashboard.acessar', 'Acessar Rooster Finance', financeModulo, '/finance', 'acessar'],
    ['finance.charges.acessar', 'Acessar Cobranças', financeModulo, '/finance/charges', 'acessar'],
    ['finance.charges.criar', 'Nova cobrança', financeModulo, '/finance/charges', 'criar'],
    ['finance.charges.marcar-pago', 'Marcar cobrança como paga', financeModulo, '/finance/charges', 'marcar-pago'],
    ['finance.charges.negociar', 'Negociar cobrança', financeModulo, '/finance/charges', 'negociar'],
    ['finance.charges.cancelar', 'Cancelar cobrança', financeModulo, '/finance/charges', 'cancelar'],
    ['finance.charges.exportar', 'Exportar cobranças', financeModulo, '/finance/charges', 'exportar'],
    ['finance.tuitions.acessar', 'Acessar Mensalidades', financeModulo, '/finance/tuitions', 'acessar'],
    ['finance.tuitions.gerar-lote', 'Gerar mensalidades em lote', financeModulo, '/finance/tuitions', 'gerar-lote'],
    ['finance.tuitions.editar', 'Editar mensalidade', financeModulo, '/finance/tuitions', 'editar'],
    ['finance.boletos.acessar', 'Acessar Boletos', financeModulo, '/finance/boletos', 'acessar'],
    ['finance.boletos.emitir', 'Emitir boleto', financeModulo, '/finance/boletos', 'emitir'],
    ['finance.boletos.baixar', 'Baixar boleto', financeModulo, '/finance/boletos', 'baixar'],
    ['finance.products.acessar', 'Acessar Produtos', financeModulo, '/finance/products', 'acessar'],
    ['finance.products.criar', 'Criar produto', financeModulo, '/finance/products', 'criar'],
    ['finance.products.editar', 'Editar produto', financeModulo, '/finance/products', 'editar'],
    ['finance.products.excluir', 'Excluir produto', financeModulo, '/finance/products', 'excluir'],
    ['finance.services.acessar', 'Acessar Serviços', financeModulo, '/finance/services', 'acessar'],
    ['finance.services.criar', 'Criar serviço', financeModulo, '/finance/services', 'criar'],
    ['finance.services.editar', 'Editar serviço', financeModulo, '/finance/services', 'editar'],
    ['finance.services.excluir', 'Excluir serviço', financeModulo, '/finance/services', 'excluir'],
    ['finance.nfe.acessar', 'Acessar Notas Fiscais', financeModulo, '/finance/nfe', 'acessar'],
    ['finance.nfe.emitir', 'Emitir nota fiscal', financeModulo, '/finance/nfe', 'emitir'],
    ['finance.nfe.exportar-xml', 'Exportar XML da nota fiscal', financeModulo, '/finance/nfe', 'exportar-xml'],
    ['finance.reports.acessar', 'Acessar Relatórios', financeModulo, '/finance/reports', 'acessar'],
    ['finance.reports.exportar', 'Exportar relatório', financeModulo, '/finance/reports', 'exportar'],
    ['finance.discounts.acessar', 'Acessar Descontos', financeModulo, '/finance/discounts', 'acessar'],
    ['finance.discounts.criar', 'Criar desconto', financeModulo, '/finance/discounts', 'criar'],
    ['finance.discounts.editar', 'Editar desconto', financeModulo, '/finance/discounts', 'editar'],
    ['finance.discounts.excluir', 'Excluir desconto', financeModulo, '/finance/discounts', 'excluir'],
    // Regra de multa/juros por atraso, criada pelo próprio financeiro (RN043) — não é fixa no código.
    ['finance.policies.acessar', 'Acessar Políticas de multa/juros', financeModulo, '/finance/policies', 'acessar'],
    ['finance.policies.criar', 'Criar política de multa/juros', financeModulo, '/finance/policies', 'criar'],
    ['finance.policies.editar', 'Editar política de multa/juros', financeModulo, '/finance/policies', 'editar'],
    ['finance.policies.excluir', 'Excluir política de multa/juros', financeModulo, '/finance/policies', 'excluir'],
  ] as const;
}

const deskTicketOperationKeys = [
  'desk.dashboard.acessar',
  'desk.tickets.acessar', 'desk.tickets.criar', 'desk.tickets.editar', 'desk.tickets.encerrar',
  'desk.tickets.reabrir', 'desk.tickets.transferir', 'desk.tickets.anexar', 'desk.tickets.nota-interna',
];
const deskManagementKeys = [
  'desk.categories.criar', 'desk.categories.editar', 'desk.categories.excluir',
  'desk.categories.subcategorias', 'desk.team.vincular-categoria',
];
// SLA não entra em deskTicketOperationKeys de propósito: o solicitante parte de "não vê SLA"
// (a permissão existe justamente para liberar/retirar isso), a equipe recebe por padrão.
const deskSlaKeys = ['desk.tickets.ver-sla'];
const roomsViewKeys = ['rooms.dashboard.acessar'];
const roomsSelfServiceKeys = ['rooms.book.solicitar', 'rooms.reservations.mensagem', 'rooms.reservations.alterar-horario', 'rooms.reservations.cancelar'];
const roomsManagementKeys = [
  'rooms.structure.criar', 'rooms.structure.editar', 'rooms.structure.excluir',
  'rooms.manage.aprovar', 'rooms.manage.responder', 'rooms.manage.alterar-horario', 'rooms.manage.cancelar',
  // Prazo estendido / recorrência não são "gestão de sala" propriamente, mas ficam aqui (não em
  // roomsSelfServiceKeys) de propósito: só quem já tem perfil de coordenação recebe essas duas
  // por padrão — um solicitante comum fica limitado a 15 dias e sem recorrência.
  'rooms.book.solicitar-recorrente', 'rooms.book.prazo-estendido',
];
const assetsViewKeys = ['assets.dashboard.acessar'];
const assetsOperationalKeys = ['assets.inventory.criar', 'assets.inventory.editar', 'assets.inventory.movimentar'];
const assetsManagementKeys = ['assets.inventory.excluir', 'assets.inventory.gerenciar-categorias'];

/** Coordenação acadêmica: gestão ampla do Academy + Learn (bypass de dono em turma alheia). */
const academyCoordenadorKeys = [
  'academy.dashboard.acessar', 'academy.manage.acessar', 'academy.manage.gerenciar-cursos',
  'academy.manage.gerenciar-disciplinas', 'academy.manage.gerenciar-turmas', 'academy.manage.gerenciar-professores',
  'academy.manage.gerenciar-alunos', 'academy.manage.gerenciar-calendario', 'academy.manage.matricular',
  'academy.attendance.acessar', 'academy.attendance.registrar-chamada', 'academy.attendance.editar-chamada',
  'academy.grades.acessar', 'academy.grades.lancar-notas', 'academy.grades.configurar-pesos',
  'learn.dashboard.acessar', 'learn.classes.acessar', 'learn.classes.gerenciar-turmas', 'learn.classes.criar-atividade',
  'learn.classes.editar-questoes', 'learn.classes.corrigir', 'learn.classes.duplicar', 'learn.classes.excluir',
  // Cadastro de alunos/professores vincula a um Usuario do Hub já existente — a tela de
  // Gestão acadêmica precisa poder LER o diretório de usuários para buscar/selecionar
  // (nunca criar/editar/excluir usuário a partir do Academy).
  'hub.usuarios.acessar',
];
/** Professor: só o que precisa para lecionar as próprias turmas — a checagem de "é dono da turma" acontece no backend. */
const academyProfessorKeys = [
  'academy.dashboard.acessar',
  'academy.attendance.acessar', 'academy.attendance.registrar-chamada', 'academy.attendance.editar-chamada',
  'academy.grades.acessar', 'academy.grades.lancar-notas', 'academy.grades.configurar-pesos',
  'learn.dashboard.acessar', 'learn.classes.acessar', 'learn.classes.criar-atividade', 'learn.classes.corrigir', 'learn.classes.excluir',
  'student.documents.acessar',
  // Orientador do Boost = Professor do Academy vinculado a um curso: SÓ conversa com os alunos
  // dele. Gerir curso (criar, editar, tirar do ar, certificado) é permissão de gestão, abaixo.
  'boost.conversas.acessar', 'boost.conversas.responder',
];
/** Gestão do Boost: age sobre TODOS os cursos (não existe mais "dono"). */
const boostGestaoKeys = [
  'boost.dashboard.acessar', 'boost.manage.acessar', 'boost.manage.gerenciar-cursos',
  'boost.manage.gerenciar-conteudo', 'boost.manage.ver-progresso',
  'boost.manage.certificado', 'boost.manage.vincular-orientadores', 'boost.manage.matricular',
];
/** Aluno: portal do Rooster Student + as ações do Rooster Learn como respondente. */
const alunoKeys = [
  'student.dashboard.acessar', 'student.profile.acessar', 'student.disciplines.acessar',
  'student.activities.acessar', 'student.activities.entregar', 'student.grades.acessar', 'student.attendance.acessar',
  'student.history.acessar', 'student.history.baixar', 'student.calendar.acessar',
  'student.documents.acessar', 'student.documents.enviar', 'student.documents.baixar',
  'student.notifications.acessar', 'student.notifications.marcar-lida',
  'student.finance.acessar', 'student.finance.baixar-boleto',
  'learn.dashboard.acessar', 'learn.student.acessar', 'learn.student.responder', 'learn.student.anexar', 'learn.student.ver-correcao',
];
/** Financeiro: gestão completa do Rooster Finance (cobranças, produtos, serviços, descontos, NF, relatórios). */
const financeStaffKeys = [
  'finance.dashboard.acessar',
  'finance.charges.acessar', 'finance.charges.criar', 'finance.charges.marcar-pago', 'finance.charges.negociar', 'finance.charges.cancelar', 'finance.charges.exportar',
  'finance.tuitions.acessar', 'finance.tuitions.gerar-lote', 'finance.tuitions.editar',
  'finance.boletos.acessar', 'finance.boletos.emitir', 'finance.boletos.baixar',
  'finance.products.acessar', 'finance.products.criar', 'finance.products.editar', 'finance.products.excluir',
  'finance.services.acessar', 'finance.services.criar', 'finance.services.editar', 'finance.services.excluir',
  'finance.nfe.acessar', 'finance.nfe.emitir', 'finance.nfe.exportar-xml',
  'finance.reports.acessar', 'finance.reports.exportar',
  'finance.discounts.acessar', 'finance.discounts.criar', 'finance.discounts.editar', 'finance.discounts.excluir',
  'finance.policies.acessar', 'finance.policies.criar', 'finance.policies.editar', 'finance.policies.excluir',
];

async function clearDatabase() {
  await prisma.$transaction([
    prisma.notaFiscal.deleteMany(),
    prisma.cobranca.deleteMany(),
    prisma.descontoAluno.deleteMany(),
    prisma.desconto.deleteMany(),
    prisma.servico.deleteMany(),
    prisma.politicaMultaJuros.deleteMany(),
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
}

async function main() {
  await clearDatabase();

  const modulo = await prisma.modulo.create({
    data: { id: ids.module, nome: 'Rooster Desk', rota: '/desk', icone: 'Ticket', ativo: true },
  });
  const roomsModulo = await prisma.modulo.create({ data: { id: ids.roomsModule, nome: 'Rooster Rooms', rota: '/rooms', icone: 'CalendarRange', ativo: true } });
  const assetsModulo = await prisma.modulo.create({ data: { id: ids.assetsModule, nome: 'Rooster Assets', rota: '/assets', icone: 'Package', ativo: true } });
  const hubModulo = await prisma.modulo.create({ data: { id: ids.hubModule, nome: 'Rooster Hub', rota: '/hub', icone: 'ShieldCheck', ativo: true } });
  const academyModulo = await prisma.modulo.create({ data: { id: ids.academyModule, nome: 'Rooster Academy', rota: '/academy', icone: 'GraduationCap', ativo: true } });
  const learnModulo = await prisma.modulo.create({ data: { id: ids.learnModule, nome: 'Rooster Learn', rota: '/learn', icone: 'BookOpen', ativo: true } });
  const studentModulo = await prisma.modulo.create({ data: { id: ids.studentModule, nome: 'Rooster Student', rota: '/student', icone: 'GraduationCap', ativo: true } });
  const boostModulo = await prisma.modulo.create({ data: { id: ids.boostModule, nome: 'Rooster Boost', rota: '/boost', icone: 'Rocket', ativo: true } });
  const financeModulo = await prisma.modulo.create({ data: { id: ids.financeModule, nome: 'Rooster Finance', rota: '/finance', icone: 'Wallet', ativo: true } });

  const permissions = new Map<string, { id: string }>();
  for (const [key, nome, moduloAlvo, recurso, acao] of permissionDefinitions(hubModulo, modulo, roomsModulo, assetsModulo, academyModulo, learnModulo, studentModulo, boostModulo, financeModulo)) {
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
  const atendentePermissions = [...deskTicketOperationKeys, ...deskSlaKeys, ...roomsViewKeys, ...assetsViewKeys, ...assetsOperationalKeys];
  const visualizadorPermissions = ['desk.dashboard.acessar', 'desk.tickets.acessar', ...roomsViewKeys, ...assetsViewKeys];
  const coordenadorPermissions = [
    ...deskTicketOperationKeys, ...deskSlaKeys, ...deskManagementKeys,
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

  await prisma.usuario.create({ data: { id: ids.users.financeiro, nome: 'Marcos Financeiro', email: 'financeiro@rooster.local', senhaHash: await senha('Financeiro123!'), ativo: true } });
  await grant(ids.users.financeiro, financeStaffKeys);

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

  // Quarto chamado, já encerrado e avaliado — cobre o ciclo completo (histórico de
  // status, anexo, mensagens interna/pública e avaliação) que os 3 primeiros não exercitam.
  const ticketEncerrado = await prisma.ticket.create({
    data: {
      protocolo: 'TCK-0004', titulo: 'Solicitação de segunda via de crachá', descricao: 'Perdi meu crachá de acesso e preciso de uma segunda via com urgência.',
      usuarioId: ids.users.solicitante, tecnicoId: ids.users.atendente, categoriaId: ids.categories.acesso, subcategoriaId: ids.subcategories.senha,
      prioridadeId: '4', statusId: ids.statuses.encerrado,
      criadoEm: new Date(Date.now() - 10 * 86400000), atualizadoEm: new Date(Date.now() - 8 * 86400000), encerradoEm: new Date(Date.now() - 8 * 86400000),
    },
  });
  await prisma.historicoTicket.createMany({
    data: [
      { ticketId: ticketEncerrado.id, usuarioId: ids.users.atendente, campo: 'statusId', valorAntigo: ids.statuses.aberto, valorNovo: ids.statuses.atendimento, criadoEm: new Date(Date.now() - 9 * 86400000) },
      { ticketId: ticketEncerrado.id, usuarioId: ids.users.atendente, campo: 'statusId', valorAntigo: ids.statuses.atendimento, valorNovo: ids.statuses.encerrado, criadoEm: new Date(Date.now() - 8 * 86400000) },
    ],
  });
  await prisma.mensagemTicket.createMany({
    data: [
      { ticketId: ticketEncerrado.id, usuarioId: ids.users.solicitante, mensagem: 'Preciso muito disso hoje, é possível agilizar?', criadoEm: new Date(Date.now() - 9 * 86400000) },
      { ticketId: ticketEncerrado.id, usuarioId: ids.users.atendente, mensagem: 'Já registrei o boletim de ocorrência do solicitante como anexo.', interno: true, criadoEm: new Date(Date.now() - 9 * 86400000) },
      { ticketId: ticketEncerrado.id, usuarioId: ids.users.atendente, mensagem: 'Segunda via liberada, já pode retirar na secretaria.', criadoEm: new Date(Date.now() - 8 * 86400000) },
    ],
  });
  const arquivoAnexoTicket = await arquivoDemonstracao(PASTAS.anexosTickets(), 'anexo-tck-0004', 'Boletim de ocorrência', 'Comprovante anexado ao chamado TCK-0004 (segunda via de crachá).');
  await prisma.anexoTicket.create({
    data: { ticketId: ticketEncerrado.id, usuarioId: ids.users.solicitante, nomeArquivo: 'comprovante-bo.pdf', caminho: arquivoAnexoTicket.caminho, tipo: 'application/pdf', tamanho: arquivoAnexoTicket.tamanho, criadoEm: new Date(Date.now() - 9 * 86400000) },
  });
  await prisma.avaliacaoTicket.create({
    data: { ticketId: ticketEncerrado.id, usuarioId: ids.users.solicitante, nota: 5, comentario: 'Atendimento rápido, resolveu no mesmo dia.', criadoEm: new Date(Date.now() - 8 * 86400000) },
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

  // =====================================================
  // Rooster Academy / Learn / Student — usuários e dados de exemplo
  // =====================================================
  await prisma.usuario.create({ data: { id: ids.academyUsers.coordenador, nome: 'Coordenadora Julia Prado', email: 'coordenacao.academica@rooster.local', senhaHash: await senha('Coordenador123!'), ativo: true } });
  await grant(ids.academyUsers.coordenador, [...academyCoordenadorKeys, ...boostGestaoKeys]);

  await prisma.usuario.create({ data: { id: ids.academyUsers.professorLima, nome: 'Prof. Ricardo Lima', email: 'ricardo.lima@rooster.local', senhaHash: await senha('Professor123!'), ativo: true } });
  await grant(ids.academyUsers.professorLima, academyProfessorKeys);
  await prisma.usuario.create({ data: { id: ids.academyUsers.professorCosta, nome: 'Profa. Fernanda Costa', email: 'fernanda.costa@rooster.local', senhaHash: await senha('Professor123!'), ativo: true } });
  await grant(ids.academyUsers.professorCosta, academyProfessorKeys);

  await prisma.usuario.create({ data: { id: ids.academyUsers.alunoJoao, nome: 'João Pereira', email: 'joao.pereira@rooster.local', senhaHash: await senha('Aluno123!'), ativo: true } });
  await grant(ids.academyUsers.alunoJoao, alunoKeys);
  await prisma.usuario.create({ data: { id: ids.academyUsers.alunoMaria, nome: 'Maria Santos', email: 'maria.santos@rooster.local', senhaHash: await senha('Aluno123!'), ativo: true } });
  await grant(ids.academyUsers.alunoMaria, alunoKeys);
  await prisma.usuario.create({ data: { id: ids.academyUsers.alunoPedro, nome: 'Pedro Alves', email: 'pedro.alves@rooster.local', senhaHash: await senha('Aluno123!'), ativo: true } });
  await grant(ids.academyUsers.alunoPedro, alunoKeys);

  await prisma.curso.createMany({
    data: [
      { id: ids.cursos.engenhariaSoftware, nome: 'Engenharia de Software', codigo: 'ENGSOFT', grau: 'Graduação', ativo: true, criadoEm: new Date(), atualizadoEm: new Date() },
      { id: ids.cursos.administracao, nome: 'Administração', codigo: 'ADM', grau: 'Graduação', ativo: true, criadoEm: new Date(), atualizadoEm: new Date() },
    ],
  });

  await prisma.periodoLetivo.create({
    data: { id: ids.periodosLetivos.atual, nome: '2026.2', dataInicio: new Date('2026-08-03'), dataFim: new Date('2026-12-18'), ativo: true, criadoEm: new Date() },
  });

  await prisma.disciplina.createMany({
    data: [
      { id: ids.disciplinas.algoritmos, codigo: 'ALG101', nome: 'Algoritmos e Estruturas de Dados', cursoId: ids.cursos.engenhariaSoftware, cargaHoraria: 80, status: 'ativa', criadoEm: new Date(), atualizadoEm: new Date() },
      { id: ids.disciplinas.bancoDados, codigo: 'BD101', nome: 'Banco de Dados', cursoId: ids.cursos.engenhariaSoftware, cargaHoraria: 60, status: 'ativa', criadoEm: new Date(), atualizadoEm: new Date() },
      { id: ids.disciplinas.poo, codigo: 'POO101', nome: 'Programação Orientada a Objetos', cursoId: ids.cursos.engenhariaSoftware, cargaHoraria: 80, status: 'ativa', criadoEm: new Date(), atualizadoEm: new Date() },
    ],
  });

  await prisma.professor.createMany({
    data: [
      { id: ids.professores.lima, usuarioId: ids.academyUsers.professorLima, titulacao: 'Prof. Dr.', departamento: 'Ciência da Computação', cargaHorariaSemanal: 20, status: 'ativo', criadoEm: new Date(), atualizadoEm: new Date() },
      { id: ids.professores.costa, usuarioId: ids.academyUsers.professorCosta, titulacao: 'Profa. Ma.', departamento: 'Ciência da Computação', cargaHorariaSemanal: 16, status: 'ativo', criadoEm: new Date(), atualizadoEm: new Date() },
      // Admin também como professor de verdade (cadastro em Professor + turma própria abaixo) —
      // pedido explícito para poder testar a experiência de professor logado como admin.
      { id: ids.professores.admin, usuarioId: ids.users.admin, titulacao: 'Prof. Dr.', departamento: 'Ciência da Computação', cargaHorariaSemanal: 8, status: 'ativo', criadoEm: new Date(), atualizadoEm: new Date() },
    ],
  });

  await prisma.aluno.createMany({
    data: [
      { id: ids.alunos.joao, usuarioId: ids.academyUsers.alunoJoao, ra: '2026001', cursoId: ids.cursos.engenhariaSoftware, semestre: 3, situacao: 'ativo', criadoEm: new Date(), atualizadoEm: new Date() },
      { id: ids.alunos.maria, usuarioId: ids.academyUsers.alunoMaria, ra: '2026002', cursoId: ids.cursos.engenhariaSoftware, semestre: 3, situacao: 'ativo', criadoEm: new Date(), atualizadoEm: new Date() },
      { id: ids.alunos.pedro, usuarioId: ids.academyUsers.alunoPedro, ra: '2026003', cursoId: ids.cursos.engenhariaSoftware, semestre: 3, situacao: 'ativo', criadoEm: new Date(), atualizadoEm: new Date() },
      // Admin também como aluno de verdade (cadastro em Aluno + matrícula em turmas de outros
      // professores abaixo) — pedido explícito para poder testar a experiência de aluno logado
      // como admin, sem depender de nenhuma outra conta.
      { id: ids.alunos.admin, usuarioId: ids.users.admin, ra: '2026004', cursoId: ids.cursos.engenhariaSoftware, semestre: 3, situacao: 'ativo', criadoEm: new Date(), atualizadoEm: new Date() },
    ],
  });

  await prisma.turma.createMany({
    data: [
      { id: ids.turmas.algoritmosA, codigo: 'ALG101-A', disciplinaId: ids.disciplinas.algoritmos, periodoLetivoId: ids.periodosLetivos.atual, professorId: ids.professores.lima, turno: 'Noturno', capacidade: 40, sala: 'Sala 101', horario: 'Seg/Qua 19:00-20:40', status: 'em-andamento', criadoEm: new Date(), atualizadoEm: new Date() },
      { id: ids.turmas.bancoDadosA, codigo: 'BD101-A', disciplinaId: ids.disciplinas.bancoDados, periodoLetivoId: ids.periodosLetivos.atual, professorId: ids.professores.costa, turno: 'Noturno', capacidade: 35, sala: 'Sala 102', horario: 'Ter/Qui 19:00-20:40', status: 'em-andamento', criadoEm: new Date(), atualizadoEm: new Date() },
      { id: ids.turmas.pooA, codigo: 'POO101-A', disciplinaId: ids.disciplinas.poo, periodoLetivoId: ids.periodosLetivos.atual, professorId: ids.professores.admin, turno: 'Noturno', capacidade: 30, sala: 'Sala 102', horario: 'Sex 19:00-22:30', status: 'em-andamento', criadoEm: new Date(), atualizadoEm: new Date() },
    ],
  });

  // Vínculo Rooms <-> Academy: o professor reservou a sala PARA a própria turma (criado só
  // depois da turma existir — Rooms roda antes de Academy neste script).
  await prisma.reserva.create({
    data: {
      id: ids.reservations.aulaAlgoritmos, codigo: 'RES-0006', ambienteId: ids.rooms.sala101,
      responsavelId: ids.academyUsers.professorLima, responsavel: 'Prof. Ricardo Lima', setor: 'Coordenação Acadêmica',
      evento: 'Aula de reposição — Algoritmos (ALG101-A)', finalidade: 'aula',
      turmaId: ids.turmas.algoritmosA,
      data: diaFuturo(5), horarioInicio: '19:00', horarioFim: '20:40', participantes: 40,
      status: 'confirmada', recorrencia: 'unica',
      decididoPor: ids.users.admin, decididoEm: new Date(),
      criadoEm: new Date(), atualizadoEm: new Date(),
    },
  });

  // João só está matriculado em Algoritmos (turma do Prof. Lima); Maria só em Banco de Dados
  // (turma da Profa. Costa) — de propósito, para exercitar os casos negativos de escopo
  // (aluno/professor de uma turma não pode ver dado da outra). Pedro segue o mesmo padrão,
  // isolado só na turma do admin (POO). O admin-aluno é o único caso que atravessa turmas de
  // propósito, para poder testar a experiência de aluno em turmas de professores DE VERDADE.
  await prisma.matricula.createMany({
    data: [
      { alunoId: ids.alunos.joao, turmaId: ids.turmas.algoritmosA, status: 'ativa', criadoEm: new Date(), atualizadoEm: new Date() },
      { alunoId: ids.alunos.maria, turmaId: ids.turmas.bancoDadosA, status: 'ativa', criadoEm: new Date(), atualizadoEm: new Date() },
      { alunoId: ids.alunos.pedro, turmaId: ids.turmas.pooA, status: 'ativa', criadoEm: new Date(), atualizadoEm: new Date() },
      { alunoId: ids.alunos.admin, turmaId: ids.turmas.algoritmosA, status: 'ativa', criadoEm: new Date(), atualizadoEm: new Date() },
      { alunoId: ids.alunos.admin, turmaId: ids.turmas.bancoDadosA, status: 'ativa', criadoEm: new Date(), atualizadoEm: new Date() },
    ],
  });

  // Cobre as 4 presenças possíveis (presente | falta | atraso | justificado), espalhadas
  // pelas 3 turmas.
  await prisma.registroFrequencia.createMany({
    data: [
      { turmaId: ids.turmas.algoritmosA, alunoId: ids.alunos.joao, data: new Date(Date.now() - 7 * 86400000), presenca: 'presente', registradoPorId: ids.academyUsers.professorLima, criadoEm: new Date() },
      { turmaId: ids.turmas.algoritmosA, alunoId: ids.alunos.joao, data: new Date(Date.now() - 2 * 86400000), presenca: 'falta', registradoPorId: ids.academyUsers.professorLima, criadoEm: new Date() },
      { turmaId: ids.turmas.algoritmosA, alunoId: ids.alunos.admin, data: new Date(Date.now() - 7 * 86400000), presenca: 'justificado', registradoPorId: ids.academyUsers.professorLima, criadoEm: new Date() },
      { turmaId: ids.turmas.bancoDadosA, alunoId: ids.alunos.maria, data: new Date(Date.now() - 7 * 86400000), presenca: 'presente', registradoPorId: ids.academyUsers.professorCosta, criadoEm: new Date() },
      { turmaId: ids.turmas.bancoDadosA, alunoId: ids.alunos.admin, data: new Date(Date.now() - 7 * 86400000), presenca: 'atraso', registradoPorId: ids.academyUsers.professorCosta, criadoEm: new Date() },
      { turmaId: ids.turmas.pooA, alunoId: ids.alunos.pedro, data: new Date(Date.now() - 3 * 86400000), presenca: 'presente', registradoPorId: ids.users.admin, criadoEm: new Date() },
    ],
  });

  await prisma.itemAvaliativo.create({
    data: { id: ids.itensAvaliativos.provaAlgoritmos, turmaId: ids.turmas.algoritmosA, nome: 'Prova 1', peso: 0.6, notaMaxima: 10, origem: 'manual', criadoEm: new Date() },
  });
  await prisma.nota.createMany({
    data: [
      { itemAvaliativoId: ids.itensAvaliativos.provaAlgoritmos, alunoId: ids.alunos.joao, valor: 8.5, lancadoPorId: ids.academyUsers.professorLima, atualizadoEm: new Date() },
      { itemAvaliativoId: ids.itensAvaliativos.provaAlgoritmos, alunoId: ids.alunos.admin, valor: 10, lancadoPorId: ids.academyUsers.professorLima, atualizadoEm: new Date() },
    ],
  });

  await prisma.itemAvaliativo.create({
    data: { id: ids.itensAvaliativos.provaBancoDados, turmaId: ids.turmas.bancoDadosA, nome: 'Prova 1', peso: 1, notaMaxima: 10, origem: 'manual', criadoEm: new Date() },
  });
  await prisma.nota.createMany({
    data: [
      { itemAvaliativoId: ids.itensAvaliativos.provaBancoDados, alunoId: ids.alunos.maria, valor: 9.0, lancadoPorId: ids.academyUsers.professorCosta, atualizadoEm: new Date() },
      { itemAvaliativoId: ids.itensAvaliativos.provaBancoDados, alunoId: ids.alunos.admin, valor: 7.5, lancadoPorId: ids.academyUsers.professorCosta, atualizadoEm: new Date() },
    ],
  });

  // Turma do admin como professor (POO): 1 item manual (Pedro sem nota ainda — pendência
  // proposital, pra testar a tela "faltam lançar notas") + a atividade do Learn abaixo.
  await prisma.itemAvaliativo.create({
    data: { id: ids.itensAvaliativos.provaPoo, turmaId: ids.turmas.pooA, nome: 'Prova 1', peso: 0.5, notaMaxima: 10, origem: 'manual', criadoEm: new Date() },
  });

  // Atividade do Learn já publicada, com item avaliativo gerado (origem "learn") — mostra a
  // integração Learn -> Academy sem duplicar dado (mesma turma, mesmo aluno matriculado).
  await prisma.atividade.create({
    data: {
      id: ids.atividades.listaAlgoritmos, codigo: 'ALG101-L1', titulo: 'Lista 1 — Complexidade de algoritmos',
      tipo: 'lista', turmaId: ids.turmas.algoritmosA, professorId: ids.professores.lima,
      status: 'publicada', peso: 0.4, notaMaxima: 10,
      prazoEm: new Date(Date.now() + 5 * 86400000), permiteAtraso: true,
      criadoEm: new Date(), publicadoEm: new Date(),
    },
  });
  await prisma.itemAvaliativo.create({
    data: { turmaId: ids.turmas.algoritmosA, nome: 'Lista 1 — Complexidade de algoritmos', peso: 0.4, notaMaxima: 10, origem: 'learn', atividadeId: ids.atividades.listaAlgoritmos, criadoEm: new Date() },
  });

  // Entrega de João já corrigida (mostra o ciclo completo de correção do Learn) e do
  // admin-aluno ainda pendente de correção (mostra a fila de correção do professor).
  const entregaJoaoLista = await prisma.entrega.create({
    data: {
      atividadeId: ids.atividades.listaAlgoritmos, alunoId: ids.alunos.joao, status: 'corrigida',
      texto: 'Segue em anexo a resolução dos 5 exercícios de complexidade assintótica.',
      enviadoEm: new Date(Date.now() - 3 * 86400000), nota: 9.0, feedback: 'Muito bem, só a questão 4 poderia ter justificado melhor o Big-O.',
      corrigidoPorId: ids.academyUsers.professorLima, corrigidoEm: new Date(Date.now() - 1 * 86400000),
    },
  });
  const arquivoListaJoao = await arquivoDemonstracao(PASTAS.anexosEntregas(), 'entrega-lista1-joao', 'Lista 1 — Complexidade de algoritmos', 'Entrega de João Pereira na turma ALG101-A.');
  await prisma.anexoEntrega.create({
    data: { entregaId: entregaJoaoLista.id, nomeArquivo: 'lista1-joao.pdf', caminho: arquivoListaJoao.caminho, tipo: 'application/pdf', tamanho: arquivoListaJoao.tamanho, criadoEm: new Date(Date.now() - 3 * 86400000) },
  });
  const entregaAdminLista = await prisma.entrega.create({
    data: {
      atividadeId: ids.atividades.listaAlgoritmos, alunoId: ids.alunos.admin, status: 'enviada',
      texto: 'Resolução da lista 1, exercícios 1 a 5.',
      enviadoEm: new Date(Date.now() - 6 * 3600000),
    },
  });
  const arquivoListaAdmin = await arquivoDemonstracao(PASTAS.anexosEntregas(), 'entrega-lista1-admin', 'Lista 1 — Complexidade de algoritmos', 'Entrega do Administrador (cadastro de aluno) na turma ALG101-A.');
  await prisma.anexoEntrega.create({
    data: { entregaId: entregaAdminLista.id, nomeArquivo: 'lista1-admin.pdf', caminho: arquivoListaAdmin.caminho, tipo: 'application/pdf', tamanho: arquivoListaAdmin.tamanho, criadoEm: new Date(Date.now() - 6 * 3600000) },
  });

  // Turma do admin como professor (POO): atividade do Learn com uma entrega corrigida (Pedro)
  // e uma atrasada/sem envio (mostra o status "atrasada", que nenhuma outra turma exercita).
  await prisma.atividade.create({
    data: {
      id: ids.atividades.trabalhoPoo, codigo: 'POO101-T1', titulo: 'Trabalho — Herança e Polimorfismo',
      tipo: 'trabalho', turmaId: ids.turmas.pooA, professorId: ids.professores.admin,
      status: 'publicada', peso: 0.5, notaMaxima: 10,
      prazoEm: new Date(Date.now() - 1 * 86400000), permiteAtraso: false,
      criadoEm: new Date(Date.now() - 10 * 86400000), publicadoEm: new Date(Date.now() - 10 * 86400000),
    },
  });
  await prisma.itemAvaliativo.create({
    data: { turmaId: ids.turmas.pooA, nome: 'Trabalho — Herança e Polimorfismo', peso: 0.5, notaMaxima: 10, origem: 'learn', atividadeId: ids.atividades.trabalhoPoo, criadoEm: new Date() },
  });
  const entregaPedroPoo = await prisma.entrega.create({
    data: {
      atividadeId: ids.atividades.trabalhoPoo, alunoId: ids.alunos.pedro, status: 'corrigida',
      texto: 'Modelagem de classes com herança para o sistema de biblioteca proposto.',
      enviadoEm: new Date(Date.now() - 3 * 86400000), nota: 8.0, feedback: 'Boa modelagem; faltou aplicar polimorfismo no método de empréstimo.',
      corrigidoPorId: ids.users.admin, corrigidoEm: new Date(Date.now() - 2 * 86400000),
    },
  });
  const arquivoTrabalhoPedro = await arquivoDemonstracao(PASTAS.anexosEntregas(), 'entrega-poo-pedro', 'Trabalho — Herança e Polimorfismo', 'Entrega de Pedro Alves na turma POO101-A.');
  await prisma.anexoEntrega.create({
    data: { entregaId: entregaPedroPoo.id, nomeArquivo: 'trabalho-poo-pedro.pdf', caminho: arquivoTrabalhoPedro.caminho, tipo: 'application/pdf', tamanho: arquivoTrabalhoPedro.tamanho, criadoEm: new Date(Date.now() - 3 * 86400000) },
  });
  await prisma.entrega.create({
    data: { atividadeId: ids.atividades.trabalhoPoo, alunoId: ids.alunos.admin, status: 'atrasada' },
  });

  const pastaDocumentos = PASTAS.documentosAcademicos();
  const arquivoPlano = await arquivoDemonstracao(pastaDocumentos, 'documento-plano-alg101', 'Plano de Ensino — Algoritmos e Estruturas de Dados', 'Disciplina ALG101, período letivo 2026.2.');
  const arquivoEmenta = await arquivoDemonstracao(pastaDocumentos, 'documento-ementa-bd101', 'Ementa — Banco de Dados', 'Disciplina BD101, período letivo 2026.2.');
  const arquivoRegulamento = await arquivoDemonstracao(pastaDocumentos, 'documento-regulamento-2026', 'Regulamento Acadêmico 2026', 'Documento institucional, válido para todos os cursos.');
  // `nome` é o nome original do arquivo enviado e `autorId` o id de usuário (Usuario), como na
  // gravação feita pela aplicação.
  await prisma.documentoAcademico.createMany({
    data: [
      { id: ids.documentosAcademicos.planoAlgoritmos, nome: 'Plano de Ensino — Algoritmos e Estruturas de Dados.pdf', tipo: 'plano-de-ensino', disciplinaId: ids.disciplinas.algoritmos, autorId: ids.academyUsers.professorLima, caminho: arquivoPlano.caminho, tamanho: arquivoPlano.tamanho, criadoEm: new Date(), atualizadoEm: new Date() },
      { id: ids.documentosAcademicos.ementaBancoDados, nome: 'Ementa — Banco de Dados.pdf', tipo: 'ementa', disciplinaId: ids.disciplinas.bancoDados, autorId: ids.academyUsers.professorCosta, caminho: arquivoEmenta.caminho, tamanho: arquivoEmenta.tamanho, criadoEm: new Date(), atualizadoEm: new Date() },
      { id: ids.documentosAcademicos.regulamento, nome: 'Regulamento Acadêmico 2026.pdf', tipo: 'institucional', autorId: ids.academyUsers.coordenador, caminho: arquivoRegulamento.caminho, tamanho: arquivoRegulamento.tamanho, criadoEm: new Date(), atualizadoEm: new Date() },
    ],
  });

  await prisma.notificacao.createMany({
    data: [
      { usuarioId: ids.users.admin, titulo: 'Entrega pendente de correção', mensagem: 'Pedro Alves enviou o Trabalho — Herança e Polimorfismo.', rota: '/learn/classes', lida: false, criadoEm: new Date(Date.now() - 2 * 86400000) },
      { usuarioId: ids.users.admin, titulo: 'Chamado encerrado', mensagem: 'TCK-0004 foi encerrado e avaliado com nota 5.', rota: '/desk/tickets', lida: true, criadoEm: new Date(Date.now() - 8 * 86400000) },
      { usuarioId: ids.academyUsers.alunoJoao, titulo: 'Sua entrega foi corrigida', mensagem: 'Lista 1 — Complexidade de algoritmos: nota 9.0.', rota: '/learn/student', lida: false, criadoEm: new Date(Date.now() - 1 * 86400000) },
      { usuarioId: ids.academyUsers.alunoPedro, titulo: 'Seu trabalho foi corrigido', mensagem: 'Trabalho — Herança e Polimorfismo: nota 8.0.', rota: '/learn/student', lida: false, criadoEm: new Date(Date.now() - 2 * 86400000) },
      { usuarioId: ids.users.solicitante, titulo: 'Chamado atualizado', mensagem: 'Seu chamado TCK-0004 foi encerrado.', rota: '/desk/tickets', lida: true, criadoEm: new Date(Date.now() - 8 * 86400000) },
    ],
  });

  await prisma.eventoCalendarioAcademico.create({
    data: { titulo: 'Início do semestre 2026.2', data: new Date('2026-08-03'), tipo: 'semestre', publico: 'Todos', criadoEm: new Date() },
  });

  // =====================================================
  // Rooster Finance — cobranças ligadas a alunos reais do Academy
  // (sem financeStudents fictício: alunoId sempre aponta para `Aluno`)
  // =====================================================
  await prisma.produto.createMany({
    data: [
      { id: ids.produtos.apostila, codigo: 'LIV-001', nome: 'Apostila de Algoritmos', categoria: 'Livros', descricao: 'Material didático oficial da disciplina.', preco: 89.9, estoque: 4, estoqueMinimo: 10, unidade: 'un', ativo: true, criadoEm: new Date(), atualizadoEm: new Date() },
      { id: ids.produtos.uniforme, codigo: 'UNI-014', nome: 'Uniforme oficial — Camiseta', categoria: 'Uniformes', descricao: 'Malha piquê com bordado institucional.', preco: 79.0, estoque: 128, estoqueMinimo: 40, unidade: 'un', ativo: true, criadoEm: new Date(), atualizadoEm: new Date() },
    ],
  });
  await prisma.politicaMultaJuros.create({
    data: {
      id: ids.politicas.mensalidade, nome: 'Mensalidade — padrão institucional',
      descricao: 'Multa de 2% + 0,033%/dia (~1%/mês), com 3 dias de carência.',
      percentualMulta: 2, percentualJurosDia: 0.033, diasCarencia: 3, ativo: true,
      criadoPorId: ids.users.financeiro, criadoEm: new Date(), atualizadoEm: new Date(),
    },
  });
  await prisma.servico.createMany({
    data: [
      { id: ids.servicos.mensalidadeGraduacao, nome: 'Mensalidade — Graduação', descricao: 'Mensalidade padrão dos cursos de graduação.', preco: 1250.0, categoria: 'Mensalidade', frequencia: 'mensal', ativo: true, politicaMultaJurosId: ids.politicas.mensalidade, criadoEm: new Date(), atualizadoEm: new Date() },
      { id: ids.servicos.segundaVia, nome: '2ª via de documento', descricao: 'Emissão de segunda via de documentos.', preco: 45.0, categoria: 'Taxa', frequencia: 'unico', ativo: true, criadoEm: new Date(), atualizadoEm: new Date() },
    ],
  });
  await prisma.desconto.create({
    data: {
      id: ids.descontos.bolsaMerito, nome: 'Bolsa Mérito 50%', tipo: 'bolsa-parcial', valor: 50, unidade: 'percent',
      motivo: 'Alto desempenho acadêmico', responsavel: 'Coordenação Acadêmica',
      vigenciaInicio: new Date('2026-01-01'), vigenciaFim: new Date('2026-12-31'), ativo: true,
      criadoEm: new Date(), atualizadoEm: new Date(),
    },
  });
  await prisma.descontoAluno.create({
    data: { alunoId: ids.alunos.maria, descontoId: ids.descontos.bolsaMerito, atribuidoEm: new Date() },
  });

  // João: mensalidade paga (jul), vencida/em aberto (ago) com boleto já emitido, e futura (out).
  await prisma.cobranca.create({
    data: {
      alunoId: ids.alunos.joao, tipo: 'mensalidade', descricao: 'Mensalidade — Graduação — 2026-07', competencia: '2026-07',
      servicoId: ids.servicos.mensalidadeGraduacao, valorOriginal: 1250, valorDesconto: 0,
      vencimento: new Date('2026-07-10'), status: 'pago', valorPago: 1250, formaPagamento: 'pix',
      pagoEm: new Date('2026-07-09'), criadoEm: new Date('2026-07-01'), atualizadoEm: new Date('2026-07-09'),
    },
  });
  await prisma.cobranca.create({
    data: {
      alunoId: ids.alunos.joao, tipo: 'mensalidade', descricao: 'Mensalidade — Graduação — 2026-08', competencia: '2026-08',
      servicoId: ids.servicos.mensalidadeGraduacao, valorOriginal: 1250, valorDesconto: 0,
      vencimento: new Date('2026-08-10'), status: 'aberto',
      nossoNumero: '17293004651', linhaDigitavel: '341917293004651000012500000000000000000000000'.slice(0, 47),
      pixCopiaECola: '00020126360014BR.GOV.BCB.PIX0114ROOSTERONEfinance152040000530398654061250.005802BR6009ROOSTERONE',
      emitidoEm: new Date('2026-08-01'),
      criadoEm: new Date('2026-08-01'), atualizadoEm: new Date('2026-08-01'),
    },
  });
  await prisma.cobranca.create({
    data: {
      alunoId: ids.alunos.joao, tipo: 'mensalidade', descricao: 'Mensalidade — Graduação — 2026-10', competencia: '2026-10',
      servicoId: ids.servicos.mensalidadeGraduacao, valorOriginal: 1250, valorDesconto: 0,
      vencimento: new Date('2026-10-10'), status: 'aberto', criadoEm: new Date('2026-09-01'), atualizadoEm: new Date('2026-09-01'),
    },
  });

  // Maria: bolsista (50% de desconto aplicado automaticamente).
  await prisma.cobranca.create({
    data: {
      alunoId: ids.alunos.maria, tipo: 'mensalidade', descricao: 'Mensalidade — Graduação — 2026-08', competencia: '2026-08',
      servicoId: ids.servicos.mensalidadeGraduacao, descontoId: ids.descontos.bolsaMerito, valorOriginal: 1250, valorDesconto: 625,
      vencimento: new Date('2026-08-10'), status: 'pago', valorPago: 625, formaPagamento: 'boleto',
      pagoEm: new Date('2026-08-08'), criadoEm: new Date('2026-08-01'), atualizadoEm: new Date('2026-08-08'),
    },
  });
  await prisma.cobranca.create({
    data: {
      alunoId: ids.alunos.maria, tipo: 'mensalidade', descricao: 'Mensalidade — Graduação — 2026-10', competencia: '2026-10',
      servicoId: ids.servicos.mensalidadeGraduacao, descontoId: ids.descontos.bolsaMerito, valorOriginal: 1250, valorDesconto: 625,
      vencimento: new Date('2026-10-10'), status: 'aberto', criadoEm: new Date('2026-09-01'), atualizadoEm: new Date('2026-09-01'),
    },
  });

  // Admin-aluno: cobre os 3 status ainda não exercitados por João/Maria (vencido, negociado,
  // cancelado) — junto com "aberto"/"pago" acima, fecha todos os status possíveis de Cobranca.
  await prisma.cobranca.create({
    data: {
      alunoId: ids.alunos.admin, tipo: 'mensalidade', descricao: 'Mensalidade — Graduação — 2026-06', competencia: '2026-06',
      servicoId: ids.servicos.mensalidadeGraduacao, valorOriginal: 1250, valorDesconto: 0, multa: 25, juros: 12.5,
      vencimento: new Date('2026-06-10'), status: 'vencido', criadoEm: new Date('2026-06-01'), atualizadoEm: new Date(),
    },
  });
  await prisma.cobranca.create({
    data: {
      alunoId: ids.alunos.admin, tipo: 'mensalidade', descricao: 'Mensalidade — Graduação — 2026-05', competencia: '2026-05',
      servicoId: ids.servicos.mensalidadeGraduacao, valorOriginal: 1250, valorDesconto: 0,
      vencimento: new Date('2026-05-10'), status: 'negociado', negociadoEm: new Date('2026-05-15'),
      criadoEm: new Date('2026-05-01'), atualizadoEm: new Date('2026-05-15'),
    },
  });
  await prisma.cobranca.create({
    data: {
      alunoId: ids.alunos.admin, tipo: 'taxa', descricao: '2ª via de documento', servicoId: ids.servicos.segundaVia,
      valorOriginal: 45, valorDesconto: 0, vencimento: new Date('2026-08-20'), status: 'cancelado',
      motivoCancelamento: 'Solicitação duplicada.', criadoEm: new Date('2026-08-15'), atualizadoEm: new Date('2026-08-16'),
    },
  });

  // Compra de produto por João, já paga e com nota fiscal interna emitida.
  const cobrancaProduto = await prisma.cobranca.create({
    data: {
      alunoId: ids.alunos.joao, tipo: 'produto', descricao: 'Apostila de Algoritmos', produtoId: ids.produtos.apostila,
      valorOriginal: 89.9, valorDesconto: 0, vencimento: new Date('2026-07-12'), status: 'pago', valorPago: 89.9,
      formaPagamento: 'pix', pagoEm: new Date('2026-07-12'), criadoEm: new Date('2026-07-12'), atualizadoEm: new Date('2026-07-12'),
    },
  });
  // PDF e XML compartilham a mesma base de nome: o download do XML deriva o nome a partir do PDF.
  const pastaNotas = PASTAS.notasFiscais();
  const arquivoNota = await arquivoDemonstracao(pastaNotas, 'nfp-2026-0001', 'Nota Fiscal NFP-2026-0001', 'Apostila de Algoritmos — R$ 89,90 — João Pereira.');
  escreverDocumentoEncriptadoComNome(
    pastaNotas,
    arquivoNota.caminho.replace(/\.pdf$/, '.xml'),
    Buffer.from('<?xml version="1.0" encoding="UTF-8"?>\n<notaFiscal numero="NFP-2026-0001" tipo="produto"><valor>89.90</valor><tomador>João Pereira</tomador></notaFiscal>\n', 'utf-8'),
  );
  await prisma.notaFiscal.create({
    data: {
      numero: 'NFP-2026-0001', tipo: 'produto', cobrancaId: cobrancaProduto.id,
      caminhoPdf: arquivoNota.caminho, status: 'emitida', emitidoEm: new Date('2026-07-12'),
    },
  });

  // =====================================================
  // Rooster Boost — curso público de exemplo (login próprio, fora do Hub)
  // =====================================================
  const boostAluno = await prisma.boostUsuario.create({
    data: { nome: 'Camila Nogueira', email: 'camila.externa@example.com', senhaHash: await senha('Boost123!'), criadoEm: new Date() },
  });

  const cursoBoost = await prisma.cursoBoost.create({
    data: {
      titulo: 'Fundamentos de Lógica de Programação', slug: 'fundamentos-logica-programacao',
      descricao: 'Introdução a variáveis, estruturas de decisão, laços e lógica algorítmica, com exercícios práticos.',
      categoria: 'Tecnologia', nivel: 'iniciante', cargaHoraria: 20, status: 'publicado', emiteCertificado: true,
      criadoEm: new Date(), atualizadoEm: new Date(),
    },
  });
  await prisma.cursoOrientadorBoost.create({ data: { cursoId: cursoBoost.id, professorId: ids.professores.lima, criadoEm: new Date() } });
  // Admin também como orientador do curso Boost — pra testar a tela de conversas como admin.
  await prisma.cursoOrientadorBoost.create({ data: { cursoId: cursoBoost.id, professorId: ids.professores.admin, criadoEm: new Date() } });
  const moduloBoost1 = await prisma.moduloBoost.create({ data: { cursoId: cursoBoost.id, titulo: 'Primeiros passos', ordem: 1 } });
  const moduloBoost2 = await prisma.moduloBoost.create({ data: { cursoId: cursoBoost.id, titulo: 'Estruturas de controle', ordem: 2 } });
  const aulaBoost1 = await prisma.aulaBoost.create({ data: { moduloId: moduloBoost1.id, titulo: 'O que é lógica de programação', ordem: 1, tipo: 'texto', conteudoTexto: 'Lógica de programação é a técnica de encadear pensamentos para atingir um objetivo definido.', duracaoMin: 15 } });
  const aulaBoost2 = await prisma.aulaBoost.create({ data: { moduloId: moduloBoost1.id, titulo: 'Variáveis e tipos de dados', ordem: 2, tipo: 'video', conteudoUrl: 'https://www.youtube.com/watch?v=exemplo1', duracaoMin: 20 } });
  const aulaBoost3 = await prisma.aulaBoost.create({ data: { moduloId: moduloBoost2.id, titulo: 'Estruturas condicionais', ordem: 1, tipo: 'video', conteudoUrl: 'https://www.youtube.com/watch?v=exemplo2', duracaoMin: 25 } });
  const aulaBoost4 = await prisma.aulaBoost.create({ data: { moduloId: moduloBoost2.id, titulo: 'Laços de repetição', ordem: 2, tipo: 'texto', conteudoTexto: 'Laços permitem repetir um bloco de instruções enquanto uma condição for verdadeira.', duracaoMin: 20 } });
  const arquivoMaterial = await arquivoDemonstracao(PASTAS.materiaisBoost(), 'material-slides-introducao', 'Slides — O que é lógica de programação', 'Material de apoio da aula 1 do curso Fundamentos de Lógica de Programação.');
  await prisma.materialApoio.create({ data: { aulaId: aulaBoost1.id, nome: 'slides-introducao.pdf', caminho: arquivoMaterial.caminho, tipo: 'application/pdf', tamanho: arquivoMaterial.tamanho, criadoEm: new Date() } });

  const matriculaBoost = await prisma.matriculaBoost.create({
    data: { boostUsuarioId: boostAluno.id, cursoId: cursoBoost.id, status: 'ativa', progressoPct: 50, matriculadoEm: new Date() },
  });
  await prisma.progressoAula.createMany({
    data: [
      { matriculaId: matriculaBoost.id, aulaId: aulaBoost1.id, concluidoEm: new Date() },
      { matriculaId: matriculaBoost.id, aulaId: aulaBoost2.id, concluidoEm: new Date() },
    ],
  });
  const conversaBoost = await prisma.conversaBoost.create({
    data: { cursoId: cursoBoost.id, boostUsuarioId: boostAluno.id, criadoEm: new Date(), ultimaMensagemEm: new Date() },
  });
  await prisma.mensagemBoost.create({
    data: { conversaId: conversaBoost.id, boostUsuarioId: boostAluno.id, mensagem: 'Professor, qual a diferença entre laço "para" e "enquanto"?', lidaEm: new Date(), criadoEm: new Date() },
  });
  await prisma.mensagemBoost.create({
    data: { conversaId: conversaBoost.id, professorId: ids.professores.lima, mensagem: 'Boa pergunta! Veremos isso em detalhes na próxima aula.', criadoEm: new Date() },
  });

  // Segundo aluno externo: concluiu o curso (100%, com certificado) — cobre o status
  // "concluida" e a emissão de certificado, que Camila (acima, "ativa" a 50%) não exercita.
  const boostAluno2 = await prisma.boostUsuario.create({
    data: { nome: 'Rafael Torres', email: 'rafael.torres@example.com', senhaHash: await senha('Boost123!'), criadoEm: new Date(Date.now() - 25 * 86400000) },
  });
  const matriculaBoost2 = await prisma.matriculaBoost.create({
    data: { boostUsuarioId: boostAluno2.id, cursoId: cursoBoost.id, status: 'concluida', progressoPct: 100, matriculadoEm: new Date(Date.now() - 20 * 86400000), concluidoEm: new Date(Date.now() - 2 * 86400000) },
  });
  await prisma.progressoAula.createMany({
    data: [
      { matriculaId: matriculaBoost2.id, aulaId: aulaBoost1.id, concluidoEm: new Date(Date.now() - 19 * 86400000) },
      { matriculaId: matriculaBoost2.id, aulaId: aulaBoost2.id, concluidoEm: new Date(Date.now() - 15 * 86400000) },
      { matriculaId: matriculaBoost2.id, aulaId: aulaBoost3.id, concluidoEm: new Date(Date.now() - 10 * 86400000) },
      { matriculaId: matriculaBoost2.id, aulaId: aulaBoost4.id, concluidoEm: new Date(Date.now() - 2 * 86400000) },
    ],
  });
  const arquivoCertificado = await arquivoDemonstracao(PASTAS.certificadosBoost(), 'certificado-cert-2026-0001', 'Certificado de conclusão', 'Rafael Torres concluiu o curso Fundamentos de Lógica de Programação (20 horas). Código de verificação: CERT-2026-0001.');
  await prisma.certificadoBoost.create({
    data: { matriculaId: matriculaBoost2.id, codigo: 'CERT-2026-0001', caminhoPdf: arquivoCertificado.caminho, emitidoEm: new Date(Date.now() - 2 * 86400000) },
  });

  // Terceiro aluno externo: matrícula cancelada — cobre o último status possível de MatriculaBoost.
  const boostAluno3 = await prisma.boostUsuario.create({
    data: { nome: 'Bianca Alves', email: 'bianca.alves@example.com', senhaHash: await senha('Boost123!'), criadoEm: new Date(Date.now() - 15 * 86400000) },
  });
  await prisma.matriculaBoost.create({
    data: { boostUsuarioId: boostAluno3.id, cursoId: cursoBoost.id, status: 'cancelada', progressoPct: 0, matriculadoEm: new Date(Date.now() - 15 * 86400000) },
  });

  // Aluno interno (João, do Academy) matriculado pela gestão: conta do portal vinculada à conta
  // institucional, sem senha própria — o acesso ao portal é feito pelo login institucional.
  const boostJoao = await prisma.boostUsuario.create({
    data: {
      nome: 'João Pereira', email: 'joao.pereira@rooster.local', usuarioId: ids.academyUsers.alunoJoao,
      senhaHash: await senha(randomBytes(32).toString('hex')), criadoEm: new Date(Date.now() - 5 * 86400000),
    },
  });
  await prisma.matriculaBoost.create({
    data: { boostUsuarioId: boostJoao.id, cursoId: cursoBoost.id, status: 'ativa', progressoPct: 0, matriculadoEm: new Date(Date.now() - 5 * 86400000) },
  });

  // Conversa do admin (orientador) com Rafael — pra ter conversa em mais de um orientador.
  const conversaBoostAdmin = await prisma.conversaBoost.create({
    data: { cursoId: cursoBoost.id, boostUsuarioId: boostAluno2.id, criadoEm: new Date(Date.now() - 18 * 86400000), ultimaMensagemEm: new Date(Date.now() - 18 * 86400000) },
  });
  await prisma.mensagemBoost.create({
    data: { conversaId: conversaBoostAdmin.id, boostUsuarioId: boostAluno2.id, mensagem: 'Obrigado pelo curso, já terminei todos os módulos!', criadoEm: new Date(Date.now() - 18 * 86400000) },
  });

  console.log('Banco de desenvolvimento limpo e populado.');
  console.log('Usuários: ana.solicitante@rooster.local, bruno.atendente@rooster.local, carla.visualizadora@rooster.local');
  console.log('Senha de todos: Senha123');
  console.log('Administrador: admin@rooster.local / Admin123!');
  console.log('Coordenadores: coordenador.secretaria@rooster.local, coordenador.suporte@rooster.local, coordenador.coordenacao@rooster.local / Coordenador123!');
  console.log('Rooms: 1 campus, 2 blocos, 5 ambientes e 6 reservas (2 em análise; 1 vinculada à turma ALG101-A).');
  console.log('Assets: 3 categorias, 3 setores, 6 patrimônios e 4 movimentações.');
  console.log('Academy/Learn/Student: coordenacao.academica@rooster.local / Coordenador123!');
  console.log('  Professores: ricardo.lima@rooster.local, fernanda.costa@rooster.local / Professor123!');
  console.log('  Alunos: joao.pereira@rooster.local (turma ALG101-A), maria.santos@rooster.local (turma BD101-A), pedro.alves@rooster.local (turma POO101-A) / Aluno123!');
  console.log('  Admin também é Professor (turma POO101-A, POO101-T1 com entrega corrigida de Pedro) E Aluno (matriculado em ALG101-A e BD101-A, com notas/frequência/cobranças variadas) — admin@rooster.local / Admin123!');
  console.log('Rooster Boost: orientadores ricardo.lima@rooster.local e admin (curso "Fundamentos de Lógica de Programação"); gestão: coordenacao.academica@rooster.local e admin.');
  console.log('  Alunos externos (login próprio, fora do Hub) / Boost123!: camila.externa@example.com (ativa, 50%), rafael.torres@example.com (concluída, com certificado), bianca.alves@example.com (cancelada).');
  console.log('  Aluno interno no Boost: joao.pereira@rooster.local, matriculado pela gestão; acessa o portal pelo login institucional (Aluno123!).');
  console.log('Rooster Finance: financeiro@rooster.local / Financeiro123!');
  console.log('  João (sem desconto): paga, vencida com boleto emitido e futura. Maria (bolsa 50%): paga e futura.');
  console.log('  Admin (aluno): vencida (com multa/juros), negociada e cancelada — cobre todos os status de Cobranca.');
  console.log('Desk: 4 chamados (aberto, em atendimento, resolvido, encerrado com histórico/anexo/mensagens/avaliação).');
}

main()
  .catch((error) => {
    console.error('Falha ao popular o banco:', error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
