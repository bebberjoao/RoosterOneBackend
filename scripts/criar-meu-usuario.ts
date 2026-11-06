// Cria (ou reativa) um usuário administrador com todas as permissões existentes.
// Uso: npx ts-node scripts/criar-meu-usuario.ts "<nome>" "<email>" "<arquivo de saída da senha>"
// A senha é gerada aqui e gravada só no arquivo de saída, nunca no terminal.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { writeFileSync } from 'fs';

const [nome, email, saida] = process.argv.slice(2);
if (!nome || !email || !saida) {
  console.error('Uso: criar-meu-usuario.ts "<nome>" "<email>" "<arquivo de saída>"');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const senha = `Rooster-${randomBytes(6).toString('base64url')}1!`;
  const senhaHash = await bcrypt.hash(senha, 10);
  const agora = new Date();
  const usuario = await prisma.usuario.upsert({
    where: { email },
    update: { nome, senhaHash, ativo: true, atualizadoEm: agora },
    create: { nome, email, senhaHash, ativo: true, criadoEm: agora, atualizadoEm: agora },
  });
  const permissoes = await prisma.permissao.findMany({ select: { id: true } });
  await prisma.usuarioPermissao.createMany({
    data: permissoes.map((p) => ({ usuarioId: usuario.id, permissaoId: p.id })),
    skipDuplicates: true,
  });
  writeFileSync(saida, `Rooster One — acesso local\nLogin: ${email}\nSenha: ${senha}\nTroque a senha depois do primeiro login.\n`);
  console.log(`Usuário ${email} pronto, com ${permissoes.length} permissões. Senha gravada em ${saida}`);
}

main().finally(() => prisma.$disconnect());
