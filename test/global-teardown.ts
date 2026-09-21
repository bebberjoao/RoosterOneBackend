import { rm } from 'node:fs/promises';
import path from 'node:path';

/**
 * Remove o SQLite de teste uma única vez, depois que TODAS as suítes rodaram.
 * Antes cada suíte apagava o arquivo no próprio afterAll, o que derrubava a
 * suíte seguinte — o banco é compartilhado entre elas.
 */
export default async function globalTeardown(): Promise<void> {
  await rm(path.join(process.cwd(), 'prisma', 'dev-test.db'), { force: true });
}
