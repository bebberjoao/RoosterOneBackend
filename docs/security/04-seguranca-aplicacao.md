# Segurança da Aplicação — Rooster One

Controles de segurança transversais do backend (revisão de 01/10/2026). A análise consolidada, com a situação de
cada controle, está em `05-analise-de-seguranca.md`, e os resultados do teste de intrusão interno, em
`06-pentest-2026-09.md`.

## CORS

Critério único definido em `src/common/cors.ts` e aplicado à API REST (`src/main.ts`) e aos gateways WebSocket do
Desk e do Boost:

- as origens configuradas em `CORS_ORIGINS` (lista separada por vírgula) e a origem de `FRONTEND_URL` são aceitas em
  qualquer ambiente;
- `http://localhost:<porta>` e `http://127.0.0.1:<porta>` são aceitas **somente fora de produção**;
- requisições sem cabeçalho `Origin` são aceitas, pois o CORS é restrição aplicada pelos navegadores;
- origem recusada recebe resposta sem `Access-Control-Allow-Origin` (e não erro interno), e o navegador bloqueia a
  requisição.

Métodos permitidos: `GET`, `POST`, `PATCH`, `DELETE` e `OPTIONS`; cabeçalhos permitidos: `Content-Type` e
`Authorization`; `credentials: true`. Em produção sem origem configurada, a aplicação emite aviso no log na
inicialização. O cabeçalho `x-user-id`, remanescente de esquema de autenticação anterior, foi removido em 30/09/2026.

## Limitação de requisições

`@nestjs/throttler` (`ThrottlerGuard`), registrado como guard global em `src/auth/auth.module.ts`, com limite de 120
requisições por minuto por endereço IP (`GLOBAL_THROTTLE_LIMIT`). As rotas sensíveis possuem limite mais
restritivo, por `@Throttle()`, com os valores definidos em `src/auth/throttle.util.ts`:

| Rota | Limite por minuto |
|---|---|
| `POST /auth/login` | 8 |
| `POST /auth/esqueci-senha` | 8 |
| `POST /auth/redefinir-senha` | 8 |
| `POST /auth/refresh` | 8 |
| `POST /boost/login` | 8 |
| `POST /boost/cadastro` | 5 |
| `GET /certificados-boost/verificar/:codigo` | 20 |

Os limites são ampliados para valor efetivamente ilimitado quando `process.env.NODE_ENV === 'test'` (definido
automaticamente pelo Jest), pois a suíte e2e realiza dezenas de logins no mesmo minuto, a partir do mesmo endereço
local, e, de outro modo, apresentaria falhas por `429 Too Many Requests` sem relação com defeito.

## Cabeçalhos de segurança HTTP

`helmet()` é aplicado em `src/main.ts`, antes de qualquer rota, com os cabeçalhos `Strict-Transport-Security`,
`X-Content-Type-Options`, `X-Frame-Options`, `X-DNS-Prefetch-Control`, `Cross-Origin-Opener-Policy`,
`Cross-Origin-Resource-Policy`, `Origin-Agent-Cluster` e `Referrer-Policy`. A **Content-Security-Policy** padrão do
Helmet é aplicada sempre que o Swagger não está exposto (em produção, por padrão); quando o Swagger está habilitado,
a política é desativada, pois a interface do Swagger depende de scripts e estilos embutidos.

## Documentação interativa (Swagger)

Disponível em `/api/docs` fora de produção. Em produção (`NODE_ENV=production`), permanece desabilitada, salvo
`SWAGGER_ENABLED=true`, por expor a estrutura completa de rotas e DTOs (achado do teste de intrusão interno).

## Validação de entrada

`ValidationPipe` global, registrado por `configurarApp()` (`src/app-config.ts`), com `whitelist: true`,
`forbidNonWhitelisted: true` e `transform: true`: todo campo não declarado no DTO é recusado, e não apenas ignorado,
e o corpo é convertido ao tipo declarado antes da chegada ao controller. Cada DTO aplica `class-validator` por
campo. A suíte `src/common/validacao-dtos.spec.ts` cobre os limites e formatos críticos.

## Upload de arquivos

- A permissão da rota é verificada pelo guard **antes** do recebimento do arquivo.
- Limites de tamanho por tipo: 10 MB (anexo de chamado), 15 MB (documento acadêmico e anexo de entrega), 25 MB
  (material de apoio) e 2 GB (vídeo do Boost); acima do limite, `413 Payload Too Large`.
- Lista de mimetypes aceitos (`MIMETYPES_DOCUMENTO` e `MIMETYPES_VIDEO`, `src/common/storage.config.ts`).
- **Verificação da assinatura binária** do conteúdo contra o mimetype declarado (`src/common/assinatura-arquivo.ts`):
  documentos são verificados em memória, antes da gravação; o vídeo, nos primeiros bytes recebidos, com remoção do
  arquivo parcial em caso de incompatibilidade. Conteúdo incompatível resulta em `400`.
- Gravação **cifrada em repouso** (AES-256-GCM para documentos e AES-256-CTR para vídeo, `FILE_ENCRYPTION_KEY`).
- Nome em disco sempre gerado no servidor (`randomUUID()` e extensão original), e nunca o nome enviado pelo
  usuário, o que impede travessia de diretório e colisão de nomes. O nome original é decodificado em UTF-8
  (`OPCOES_UPLOAD`) e devolvido no download em `Content-Disposition` conforme a RFC 6266.
- `multer` atualizado para a versão 2.4.0 (30/09/2026), que corrige os avisos de negação de serviço e de contorno do
  limite de tamanho publicados para as versões anteriores.

## Injeção de SQL

Não há uso de `$queryRawUnsafe`, `$executeRawUnsafe` nem de SQL bruto construído a partir de entrada em `src/`; a
única consulta bruta é `SELECT 1`, estática, na verificação de saúde. Todo acesso a dados é realizado pelo Prisma
Client, que parametriza as consultas.

## XSS

O backend não realiza sanitização de HTML, mas responde exclusivamente JSON (API REST consumida por aplicação
React) e não renderiza HTML ao navegador, o que restringe a superfície desse ataque no servidor. O escape do
conteúdo na exibição é responsabilidade do frontend: o React escapa o conteúdo inserido em JSX por padrão, e o único
uso de `dangerouslySetInnerHTML` (`src/components/ui/chart.tsx`) injeta estilos gerados a partir da configuração
do gráfico, e não de dados fornecidos por usuários.

## Segredos e configuração

`JWT_SECRET`, `FILE_ENCRYPTION_KEY` e `DATABASE_URL` são lidos exclusivamente de variáveis de ambiente, sem valor
padrão no código; a aplicação não é iniciada sem `JWT_SECRET` e sem `FILE_ENCRYPTION_KEY` válida (ver
`docs/engineering/03-decisoes-arquiteturais.md`, ADR-003). O arquivo `.env` é excluído do controle de versão, e não
há segredo versionado no código-fonte. No modo de desenvolvimento sem SMTP, o `MailService` registra o e-mail em
log com os parâmetros sensíveis de URL (`token`, `senha` etc.) mascarados (`mascararSegredosNaUrl`); em produção sem
SMTP, o conteúdo não é registrado, e apenas a falha de configuração é informada.

## Dependências (`npm audit --omit=dev`)

Situação em 01/10/2026:

- **Backend**: as vulnerabilidades exploráveis por requisição HTTP foram corrigidas por atualização dentro das faixas
  declaradas (`@nestjs/*` 11.2.7, `multer` 2.4.0 e `qs` 6.16.0). Permanecem cinco avisos (três altos e dois
  moderados), todos decorrentes de duas bibliotecas classificadas como risco aceito, por processarem apenas entrada
  confiável: `deepmerge-ts` (por meio de `@prisma/config`, utilizado pela CLI do Prisma na leitura da configuração
  local) e `js-yaml` (fixado pelo `@nestjs/swagger`, utilizado na serialização do próprio esquema da API, com o
  Swagger desabilitado em produção). A correção automática rebaixaria a CLI do Prisma para versão incompatível com
  o cliente e, por isso, não foi aplicada.
- **Frontend**: nenhum aviso.

A varredura é executada pelo pipeline de integração contínua (job `auditoria`, não bloqueante).
