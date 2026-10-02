import { existsSync, mkdirSync } from 'fs';
import { isAbsolute, join } from 'path';
import type { Request } from 'express';

/**
 * Onde cada tipo de arquivo enviado é gravado.
 *
 * Antes, cada módulo montava o próprio caminho com
 * `join(process.cwd(), 'uploads', '<sub>')` — fixo, relativo ao diretório de
 * trabalho do processo. Isso tem dois problemas num servidor real:
 *
 * 1. **Depende do diretório de trabalho.** Rodando como serviço no Windows,
 *    se `AppDirectory` não for configurado, os arquivos vão parar em outro
 *    lugar (System32, tipicamente) sem ninguém perceber até faltar um anexo.
 * 2. **Prende tudo ao disco da aplicação.** Vídeo de curso é o caso extremo:
 *    ocupa ordens de grandeza mais espaço que o resto e normalmente pertence
 *    a um disco de dados, não ao disco onde a aplicação está instalada.
 *
 * Agora cada pasta pode ser apontada por variável de ambiente, e vídeo tem
 * variável própria justamente por causa do tamanho.
 */

/** Raiz padrão de todo upload, se nada for configurado. */
function raizUploads(): string {
  const configurada = process.env.UPLOADS_DIR?.trim();
  if (configurada) {
    // Caminho relativo é resolvido a partir do diretório de trabalho, para o
    // comportamento continuar previsível em desenvolvimento.
    return isAbsolute(configurada) ? configurada : join(process.cwd(), configurada);
  }
  return join(process.cwd(), 'uploads');
}

/**
 * Resolve a pasta de um tipo de arquivo e garante que ela exista.
 *
 * @param subpasta nome usado sob a raiz quando não há variável específica
 * @param variavel variável de ambiente que, se definida, substitui o caminho inteiro
 */
export function resolverPastaUpload(subpasta: string, variavel?: string): string {
  const especifica = variavel ? process.env[variavel]?.trim() : undefined;
  const caminho = especifica
    ? isAbsolute(especifica)
      ? especifica
      : join(process.cwd(), especifica)
    : join(raizUploads(), subpasta);

  // `recursive: true` também cobre o caso de a raiz configurada ainda não
  // existir — comum numa instalação nova apontando para outro disco.
  if (!existsSync(caminho)) mkdirSync(caminho, { recursive: true });
  return caminho;
}

/**
 * Pastas de cada tipo de arquivo. Resolvidas na carga do módulo, uma vez:
 * mudar a variável de ambiente exige reiniciar a aplicação, o que é o
 * comportamento esperado para configuração de infraestrutura.
 */
/**
 * Documentos genéricos aceitos em anexo de chamado, documento acadêmico, entrega do Learn e
 * material de apoio do Boost — pdf/office/imagem/texto/zip. Antes desses quatro pontos, só o
 * tamanho era limitado; qualquer mimetype passava (achado registrado em
 * docs/security/05-analise-de-seguranca.md).
 */
export const MIMETYPES_DOCUMENTO = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

/** Imagens aceitas como apoio de questão do Learn. */
export const MIMETYPES_IMAGEM = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/**
 * Opções comuns a todo `FileInterceptor`. `defParamCharset: 'utf8'` faz o busboy decodificar o
 * nome do arquivo multipart como UTF-8; o padrão (`latin1`) gravava nomes acentuados — comuns
 * em português — corrompidos no banco (ex.: "Relatório.pdf" como "RelatÃ³rio.pdf").
 */
export const OPCOES_UPLOAD = { defParamCharset: 'utf8' } as const;

/** Fábrica de `fileFilter` do multer a partir de uma lista de mimetypes aceitos. */
export function criarFiltroMimetype(permitidos: readonly string[]) {
  return (_req: Request, file: Express.Multer.File, cb: (error: Error | null, aceitar: boolean) => void) => {
    cb(null, permitidos.includes(file.mimetype));
  };
}

export const PASTAS = {
  /** Vídeos de aula do Boost. Variável própria — são os arquivos maiores do sistema. */
  videosBoost: () => resolverPastaUpload('videos-boost', 'BOOST_VIDEOS_DIR'),
  materiaisBoost: () => resolverPastaUpload('materiais-boost', 'BOOST_MATERIAIS_DIR'),
  certificadosBoost: () => resolverPastaUpload('certificados-boost', 'BOOST_CERTIFICADOS_DIR'),
  anexosTickets: () => resolverPastaUpload('anexos-tickets', 'DESK_ANEXOS_DIR'),
  anexosEntregas: () => resolverPastaUpload('anexos-entregas', 'LEARN_ANEXOS_DIR'),
  /** Imagens de apoio das questões das atividades do Learn. */
  imagensQuestoes: () => resolverPastaUpload('imagens-questoes', 'LEARN_IMAGENS_DIR'),
  documentosAcademicos: () => resolverPastaUpload('documentos-academicos', 'ACADEMY_DOCUMENTOS_DIR'),
  notasFiscais: () => resolverPastaUpload('notas-fiscais', 'FINANCE_NOTAS_DIR'),
} as const;
