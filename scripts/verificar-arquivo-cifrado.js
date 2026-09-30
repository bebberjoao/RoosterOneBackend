#!/usr/bin/env node
// Confere se um documento gravado pelo Rooster One (anexo, documento acadêmico, material,
// certificado, nota fiscal) é decifrável com a FILE_ENCRYPTION_KEY do ambiente atual.
// Usado por scripts/recovery-drill.ps1 para provar que um backup restaurado é legível com a
// chave configurada — um backup íntegro com a chave errada é, na prática, irrecuperável.
//
// Usa a implementação real de decifragem (dist/src/common/file-encryption.util.js), e não
// uma cópia da lógica, para que o simulado verifique exatamente o que a aplicação executa.
// O conteúdo decifrado nunca é exibido.
//
// Uso: node scripts/verificar-arquivo-cifrado.js <caminho-do-arquivo>
// Saída: código 0 se decifrou; 1 se a decifragem falhou; 2 para erro de uso ou ambiente.

const { existsSync } = require('fs');
const { join, resolve } = require('path');

const caminho = process.argv[2];
if (!caminho || !existsSync(caminho)) {
  console.error(`Arquivo não encontrado: ${caminho ?? '(nenhum caminho informado)'}`);
  process.exit(2);
}

const modulo = join(__dirname, '..', 'dist', 'src', 'common', 'file-encryption.util.js');
if (!existsSync(modulo)) {
  console.error('Build da aplicação não encontrado em dist/. Execute "npm run build" antes do simulado.');
  process.exit(2);
}

const { chaveMestraDeArquivos, lerDocumentoDescriptografado } = require(modulo);

try {
  chaveMestraDeArquivos();
} catch (erro) {
  console.error(erro.message);
  process.exit(2);
}

try {
  const conteudo = lerDocumentoDescriptografado(resolve(caminho));
  console.log(`Decifrado com sucesso (${conteudo.length} bytes de conteúdo original).`);
  process.exit(0);
} catch {
  console.error(
    'A chave configurada não decifra este arquivo. Causas possíveis: FILE_ENCRYPTION_KEY diferente da usada na gravação, ' +
      'arquivo adulterado ou arquivo gravado antes da adoção da criptografia em repouso.',
  );
  process.exit(1);
}
