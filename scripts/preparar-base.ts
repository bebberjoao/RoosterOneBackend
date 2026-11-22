// Prepara uma instalação do Rooster One para o primeiro uso, sem dados de demonstração:
//   1. garante o catálogo de módulos e permissões (src/common/catalogo-permissoes.ts);
//   2. garante os status de chamado do Rooster Desk;
//   3. cria (ou reativa) o usuário administrador, com todas as permissões.
//
// É idempotente: pode ser executado a cada instalação ou atualização. Nada é apagado, e a senha de um
// administrador que já existe nunca é alterada.
//
// Uso (o instalador para Windows executa este script; ver docs/operations/09-instalador.md):
//   npx ts-node scripts/preparar-base.ts
// Variáveis de ambiente do administrador (todas opcionais; sem ROOSTER_ADMIN_EMAIL, só o catálogo é garantido):
//   ROOSTER_ADMIN_EMAIL, ROOSTER_ADMIN_NOME
//   ROOSTER_ADMIN_SENHA   senha escolhida; ausente, uma senha é gerada
//   ROOSTER_ADMIN_SAIDA   arquivo em que a senha GERADA é gravada (nunca é escrita no terminal)
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { writeFileSync } from 'fs';
import { MODULOS, PERMISSOES } from '../src/common/catalogo-permissoes';

const prisma = new PrismaClient();

const STATUS_CHAMADO = [
  { nome: 'Aberto', ordem: 1, encerrado: false },
  { nome: 'Em atendimento', ordem: 2, encerrado: false },
  { nome: 'Resolvido', ordem: 3, encerrado: false },
  { nome: 'Encerrado', ordem: 4, encerrado: true },
];

async function garantirCatalogo() {
  const agora = new Date();
  const modulos = new Map<string, string>();
  for (const m of MODULOS) {
    const modulo = await prisma.modulo.upsert({
      where: { nome: m.nome },
      update: {},
      create: { nome: m.nome, rota: m.rota, icone: m.icone, ativo: true, criadoEm: agora },
    });
    modulos.set(m.nome, modulo.id);
  }

  const existentes = await prisma.permissao.findMany({ select: { id: true, nome: true, moduloId: true, recurso: true, acao: true } });
  let criadas = 0;
  for (const [chave, descricao, modulo, recurso, acao] of PERMISSOES) {
    const moduloId = modulos.get(modulo)!;
    // Uma permissão pode já existir com a mesma chave ou com o mesmo trio módulo/recurso/ação (criada por uma
    // migration de dados ou sob demanda pela tela de Acessos); nesse caso é mantida como está.
    const jaExiste = existentes.some((p) => p.nome === chave || (p.moduloId === moduloId && p.recurso === recurso && p.acao === acao));
    if (jaExiste) continue;
    await prisma.permissao.create({ data: { moduloId, nome: chave, descricao, recurso, acao, criadoEm: agora } });
    criadas++;
  }

  let statusCriados = 0;
  for (const status of STATUS_CHAMADO) {
    if (await prisma.statusTicket.findFirst({ where: { nome: status.nome } })) continue;
    await prisma.statusTicket.create({ data: { ...status, criadoEm: agora } });
    statusCriados++;
  }
  console.log(`Catálogo: ${MODULOS.length} módulos e ${PERMISSOES.length} permissões conferidos (${criadas} permissões criadas, ${statusCriados} status de chamado criados).`);
}

async function garantirAdministrador() {
  const email = (process.env.ROOSTER_ADMIN_EMAIL ?? '').trim().toLowerCase();
  if (!email) {
    const admins = await prisma.usuarioPermissao.count({
      where: { usuario: { ativo: true }, permissao: { recurso: '/hub/acessos', acao: 'gerenciar-permissoes' } },
    });
    if (admins === 0) console.log('AVISO: não há administrador ativo. Informe ROOSTER_ADMIN_EMAIL para criar um.');
    return;
  }
  const nome = (process.env.ROOSTER_ADMIN_NOME ?? '').trim() || 'Administrador';
  const agora = new Date();

  let usuario = await prisma.usuario.findUnique({ where: { email } });
  if (usuario) {
    if (!usuario.ativo) usuario = await prisma.usuario.update({ where: { id: usuario.id }, data: { ativo: true, atualizadoEm: agora } });
    console.log(`Administrador ${email} já existia: a senha foi mantida.`);
  } else {
    const informada = process.env.ROOSTER_ADMIN_SENHA ?? '';
    if (informada && informada.length < 8) throw new Error('A senha do administrador deve ter pelo menos 8 caracteres.');
    const senha = informada || `Rooster-${randomBytes(6).toString('base64url')}1!`;
    usuario = await prisma.usuario.create({
      data: { nome, email, senhaHash: await bcrypt.hash(senha, 10), ativo: true, criadoEm: agora, atualizadoEm: agora },
    });
    if (!informada) {
      const saida = process.env.ROOSTER_ADMIN_SAIDA;
      if (!saida) throw new Error('Sem ROOSTER_ADMIN_SENHA, informe ROOSTER_ADMIN_SAIDA (arquivo que receberá a senha gerada).');
      writeFileSync(saida, `Rooster One — primeiro acesso\r\nLogin: ${email}\r\nSenha: ${senha}\r\nTroque a senha depois do primeiro login e apague este arquivo.\r\n`);
      console.log(`Administrador ${email} criado; a senha gerada foi gravada em ${saida}.`);
    } else {
      console.log(`Administrador ${email} criado com a senha informada.`);
    }
  }

  const permissoes = await prisma.permissao.findMany({ select: { id: true } });
  const jaTem = new Set((await prisma.usuarioPermissao.findMany({ where: { usuarioId: usuario.id }, select: { permissaoId: true } })).map((v) => v.permissaoId));
  const faltam = permissoes.filter((p) => !jaTem.has(p.id));
  if (faltam.length) {
    await prisma.usuarioPermissao.createMany({ data: faltam.map((p) => ({ usuarioId: usuario!.id, permissaoId: p.id, criadoEm: agora })) });
  }
  console.log(`Administrador com ${permissoes.length} permissões (${faltam.length} concedidas agora).`);
}

async function main() {
  await garantirCatalogo();
  await garantirAdministrador();
}

main()
  .catch((erro) => {
    console.error(`ERRO: ${erro instanceof Error ? erro.message : String(erro)}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
