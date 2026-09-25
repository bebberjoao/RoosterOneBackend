# Configuração — Variáveis de Ambiente

## `.env.example` (setembro/2026)

Os dois repositórios têm um `.env.example` versionado, com placeholders e nenhum valor real de segredo — ele é a referência prática; as tabelas abaixo continuam sendo a explicação detalhada de cada variável.

Antes disso, a única forma de descobrir quais variáveis existiam era ler o código-fonte (foi assim que as tabelas abaixo foram montadas). O `.gitignore` do backend já previa a exceção `!.env.example`, mas o arquivo nunca tinha sido criado. Na mesma correção, o `.gitignore` do **frontend** passou a ignorar `.env` — antes não ignorava nada de ambiente, então um `.env` criado ali seria versionado junto com o código.

---

## Backend (`RoosterOneBackend-main/.env`)

Lido via `dotenv/config`, importado no topo de `src/main.ts` — sem esse import, nenhuma variável do `.env` seria carregada no processo. Isso confirma que o backend depende do arquivo `.env` estar presente na raiz do repositório ao subir.

| Variável | Obrigatória | Controla | Valor de exemplo |
|---|---|---|---|
| `DATABASE_URL` | Sim | String de conexão PostgreSQL usada pelo Prisma (`prisma/schema.prisma`, `datasource db { provider = "postgresql" }`). Sem ela, o Prisma Client não consegue conectar ao banco. | `DATABASE_URL=postgresql://usuario:senha@localhost:5432/rooster_one` |
| `JWT_SECRET` | **Sim, sem fallback** | Segredo usado para assinar/validar os JWTs de sessão (`src/auth/jwt-config.ts`). Se ausente, a aplicação lança erro explícito na inicialização e não sobe (ver `docs/operations/07-troubleshooting.md`). | `JWT_SECRET=<JWT_SECRET>` |
| `PORT` | Não (default `3000`) | Porta HTTP em que o Nest escuta (`src/main.ts`, `app.listen(process.env.PORT ?? 3000)`). | `PORT=3000` |
| `FRONTEND_URL` | Não (default `http://localhost:8080`) | Base usada para montar o link de redefinição de senha enviado por e-mail (`src/roster-hub/usuarios/usuarios.service.ts`): `${FRONTEND_URL}/redefinir-senha?token=...`. | `FRONTEND_URL=http://localhost:8080` |
| `SMTP_HOST` | Não | Host do servidor SMTP. Se **ausente**, o `MailService` (`src/mail/mail.service.ts`) entra em modo de log: nenhum e-mail é enviado de verdade, o conteúdo (incluindo o link de redefinição de senha) é apenas gravado no log da aplicação. | `SMTP_HOST=<SMTP_HOST>` |
| `SMTP_PORT` | Não (default `587`) | Porta do servidor SMTP. Só tem efeito se `SMTP_HOST` estiver definido. | `SMTP_PORT=587` |
| `SMTP_SECURE` | Não (default `false`) | Se a string for exatamente `"true"`, ativa TLS implícito na conexão SMTP (`secure: process.env.SMTP_SECURE === 'true'`). Qualquer outro valor (inclusive ausente) resulta em `false`. | `SMTP_SECURE=false` |
| `SMTP_USER` | Não | Usuário de autenticação SMTP. Se ausente, a conexão é feita sem `auth`. | `SMTP_USER=<SMTP_USER>` |
| `SMTP_PASS` | Não | Senha de autenticação SMTP. Só é usada se `SMTP_USER` estiver definido. | `SMTP_PASS=<SMTP_PASS>` |
| `MAIL_FROM` | Não (default `Rooster One <no-reply@rooster.local>`) | Remetente usado nos e-mails enviados via SMTP. | `MAIL_FROM=Rooster One <no-reply@rooster.local>` |

### Pastas de arquivos enviados (`src/common/storage.config.ts`)

Todas opcionais. O padrão é `<pasta do projeto>/uploads/<tipo>`; as variáveis existem para levar os arquivos para outro disco (o vídeo é o caso típico: um arquivo de até 2 GB por aula ocupa espaço de verdade). A pasta é criada se não existir e caminho relativo é resolvido a partir da pasta de trabalho do processo — num serviço Windows sem diretório de trabalho definido, prefira **caminho absoluto**.

| Variável | Padrão | Guarda |
|---|---|---|
| `UPLOADS_DIR` | `<projeto>/uploads` | Raiz de todas as pastas abaixo que não forem sobrescritas. |
| `BOOST_VIDEOS_DIR` | `<UPLOADS_DIR>/videos-boost` | Vídeos das aulas do Boost (RN036). |
| `BOOST_MATERIAIS_DIR` | `<UPLOADS_DIR>/materiais-boost` | Material de apoio das aulas. |
| `BOOST_CERTIFICADOS_DIR` | `<UPLOADS_DIR>/certificados-boost` | PDFs de certificado. |
| `DESK_ANEXOS_DIR` | `<UPLOADS_DIR>/anexos-tickets` | Anexos de chamado. |
| `LEARN_ANEXOS_DIR` | `<UPLOADS_DIR>/anexos-entregas` | Anexos de entrega do Learn. |
| `ACADEMY_DOCUMENTOS_DIR` | `<UPLOADS_DIR>/documentos-academicos` | Documentos acadêmicos. |
| `FINANCE_NOTAS_DIR` | `<UPLOADS_DIR>/notas-fiscais` | PDFs de nota fiscal. |

**Atenção ao backup:** `scripts/backup.*` arquiva apenas `<projeto>/uploads`. Qualquer pasta redirecionada por variável para fora dele (inclusive `UPLOADS_DIR` e `BOOST_VIDEOS_DIR`) **não entra no backup** e precisa de rotina própria até o script passar a ler essas variáveis.

Notas:
- Sem `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER` e `SMTP_PASS` não fazem nada — são todos subordinados a `SMTP_HOST` estar definido.
- O comando `test:e2e` do `package.json` sobrescreve `DATABASE_URL` (para um arquivo SQLite local, `file:./prisma/dev-test.db`) e `JWT_SECRET` (`rooster-e2e-test-secret`) via `cross-env`, isolando os testes end-to-end do `.env` de desenvolvimento. Isso é específico do schema de teste (`prisma/schema.test.prisma`) e não deve ser confundido com a configuração de desenvolvimento/produção documentada acima.

## Frontend (`RoosterOneFrontEnd-main`)

A única variável de ambiente consumida pelo código é lida via `import.meta.env` (padrão Vite).

| Variável | Obrigatória | Controla | Valor de exemplo |
|---|---|---|---|
| `VITE_API_URL` | Não (default `http://localhost:3000`) | URL base da API do backend, usada por todo o cliente HTTP (`src/services/hub/client.ts`, `export const API_URL = import.meta.env["VITE_API_URL"] ?? "http://localhost:3000"`). Quando a API não está acessível nesse endereço, partes da interface caem em um modo offline com armazenamento em memória (ver comentário no próprio arquivo). | `VITE_API_URL=http://localhost:3000` |

> **Informe apenas o host, sem `/v1`.** A API é versionada por URI, mas o prefixo é acrescentado pelo próprio cliente HTTP (`API_VERSION_PREFIX`), e **não** faz parte de `API_URL` — porque a mesma base é usada para abrir os gateways WebSocket (`io(\`${API_URL}/desk\`)`), que não são versionados. Colocar `/v1` em `VITE_API_URL` quebraria o chat e geraria caminhos `/v1/v1/...` no REST.

> **Tudo que começa com `VITE_` vai para o bundle** e é visível para qualquer pessoa que abrir o site. Só cabe aí valor que pode ser público; segredo de verdade pertence ao backend.

Para definir `VITE_API_URL`, crie um arquivo `.env` (ou `.env.local`) na raiz do frontend — por convenção do Vite, qualquer variável prefixada com `VITE_` nesse arquivo é injetada em `import.meta.env` automaticamente no build/dev server.
