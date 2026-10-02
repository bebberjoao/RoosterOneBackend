# Configuração — Variáveis de Ambiente

## Arquivo `.env.example`

Os dois repositórios possuem um `.env.example` versionado, com valores ilustrativos e nenhum segredo real.
Ele é a referência prática para a criação do `.env`; as tabelas abaixo detalham cada variável. O `.gitignore`
dos dois repositórios exclui o `.env` do controle de versão.

---

## Backend (`RoosterOneBackend-main/.env`)

As variáveis são carregadas por `dotenv/config`, importado no início de `src/main.ts`. Variáveis já definidas
no ambiente do processo têm precedência sobre as do arquivo.

| Variável | Obrigatória | Função | Valor de exemplo |
|---|---|---|---|
| `DATABASE_URL` | Sim | Cadeia de conexão do PostgreSQL utilizada pelo Prisma (`prisma/schema.prisma`). | `DATABASE_URL=postgresql://usuario:senha@localhost:5432/rooster_one` |
| `JWT_SECRET` | **Sim, sem valor padrão** | Segredo de assinatura e validação dos JWTs de sessão (`src/auth/jwt-config.ts`). Na ausência, a aplicação é encerrada na inicialização (ver `docs/operations/07-troubleshooting.md`). | `JWT_SECRET=<JWT_SECRET>` |
| `FILE_ENCRYPTION_KEY` | **Sim, sem valor padrão** | Chave mestra (32 bytes em base64, AES-256) da criptografia em repouso de todo arquivo gravado em disco (`src/common/file-encryption.util.ts`). Validada em `main.ts` antes da inicialização do servidor; ausente ou com tamanho incorreto, a aplicação não inicia. **A perda desta chave torna ilegível todo arquivo já gravado**; exige o mesmo cuidado de backup do banco (ver `docs/operations/06-backup-e-recuperacao.md`). | `FILE_ENCRYPTION_KEY=<FILE_ENCRYPTION_KEY>` |
| `NODE_ENV` | Não | Em `production`, ativa: log estruturado em JSON; CORS restrito às origens configuradas; Swagger desabilitado (salvo `SWAGGER_ENABLED=true`); Content-Security-Policy; tratamento da ausência de SMTP como erro de configuração. O valor `test` é definido automaticamente pelo Jest e flexibiliza os limites de requisição; não deve ser usado fora dos testes. | `NODE_ENV=production` |
| `PORT` | Não (padrão `3000`) | Porta HTTP do servidor (`app.listen(process.env.PORT ?? 3000)`). | `PORT=3000` |
| `FRONTEND_URL` | Não (padrão `http://localhost:8080`) | Endereço do frontend, utilizado para compor o link de redefinição de senha (`${FRONTEND_URL}/redefinir-senha?token=...`). A origem deste endereço também é aceita pelo CORS. | `FRONTEND_URL=https://rooster.instituicao.edu.br` |
| `CORS_ORIGINS` | Não | Origens adicionais aceitas pelo CORS, separadas por vírgula (`src/common/cors.ts`). Em produção, apenas estas origens e a de `FRONTEND_URL` são aceitas; fora de produção, `localhost` e `127.0.0.1` em qualquer porta também são aceitos. Em produção sem nenhuma origem configurada, a inicialização registra um aviso. | `CORS_ORIGINS=https://admin.instituicao.edu.br` |
| `SWAGGER_ENABLED` | Não | Com o valor `true`, mantém a documentação interativa (`/api/docs`) em produção. Fora de produção, a documentação está sempre disponível. | `SWAGGER_ENABLED=true` |
| `SMTP_HOST` | Não | Servidor SMTP. Na **ausência**, o `MailService` (`src/mail/mail.service.ts`) não envia e-mails: fora de produção, registra o conteúdo no log (com o token mascarado); em produção, registra apenas a falha de configuração. | `SMTP_HOST=<SMTP_HOST>` |
| `SMTP_PORT` | Não (padrão `587`) | Porta do servidor SMTP; efetiva apenas com `SMTP_HOST` definido. | `SMTP_PORT=587` |
| `SMTP_SECURE` | Não (padrão `false`) | O valor exato `"true"` ativa TLS implícito na conexão SMTP; qualquer outro valor, inclusive a ausência, resulta em `false`. | `SMTP_SECURE=false` |
| `SMTP_USER` | Não | Usuário de autenticação SMTP; na ausência, a conexão é feita sem autenticação. | `SMTP_USER=<SMTP_USER>` |
| `SMTP_PASS` | Não | Senha de autenticação SMTP; utilizada apenas com `SMTP_USER` definido. | `SMTP_PASS=<SMTP_PASS>` |
| `MAIL_FROM` | Não (padrão `Rooster One <no-reply@rooster.local>`) | Remetente dos e-mails enviados. | `MAIL_FROM=Rooster One <no-reply@rooster.local>` |

### Pastas de arquivos enviados (`src/common/storage.config.ts`)

Todas opcionais. O padrão é `<pasta do projeto>/uploads/<tipo>`; as variáveis permitem alocar os arquivos em
outro disco, sendo o vídeo o caso típico (até 2 GB por aula). A pasta é criada caso não exista; caminho
relativo é resolvido a partir do diretório de trabalho do processo. Em serviço Windows sem diretório de
trabalho definido, recomenda-se **caminho absoluto**.

| Variável | Padrão | Conteúdo |
|---|---|---|
| `UPLOADS_DIR` | `<projeto>/uploads` | Raiz das pastas abaixo que não forem redefinidas. |
| `BOOST_VIDEOS_DIR` | `<UPLOADS_DIR>/videos-boost` | Vídeos das aulas do Boost (RN036). |
| `BOOST_MATERIAIS_DIR` | `<UPLOADS_DIR>/materiais-boost` | Materiais de apoio das aulas. |
| `BOOST_CERTIFICADOS_DIR` | `<UPLOADS_DIR>/certificados-boost` | Certificados em PDF. |
| `DESK_ANEXOS_DIR` | `<UPLOADS_DIR>/anexos-tickets` | Anexos de chamado. |
| `LEARN_ANEXOS_DIR` | `<UPLOADS_DIR>/anexos-entregas` | Anexos de entrega do Learn. |
| `LEARN_IMAGENS_DIR` | `<UPLOADS_DIR>/imagens-questoes` | Imagens de apoio das questões das atividades do Learn. |
| `ACADEMY_DOCUMENTOS_DIR` | `<UPLOADS_DIR>/documentos-academicos` | Documentos acadêmicos. |
| `FINANCE_NOTAS_DIR` | `<UPLOADS_DIR>/notas-fiscais` | Notas fiscais (PDF e XML). |

Os scripts de backup e restauração resolvem essas pastas pela mesma regra e incluem as pastas redirecionadas
para outro disco (ver `docs/operations/06-backup-e-recuperacao.md`).

### Observações

- Sem `SMTP_HOST`, as variáveis `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER` e `SMTP_PASS` não têm efeito.
- O administrador pode verificar a configuração de e-mail sem acesso ao servidor, na seção "E-mail" de
  `/settings` (frontend), que também envia um e-mail de teste (`GET /configuracoes/email` e
  `POST /configuracoes/email/teste`, em `docs/api/02-endpoints.md`). A tela é somente de leitura: a alteração
  do servidor SMTP exige editar o `.env` e reiniciar a aplicação, para que nenhum segredo seja armazenado no
  banco.
- O script `test:e2e` do `package.json` redefine `DATABASE_URL` (arquivo SQLite local,
  `file:./prisma/dev-test.db`), `JWT_SECRET` e `FILE_ENCRYPTION_KEY` (valores exclusivos de teste) por meio de
  `cross-env`, isolando os testes end-to-end do `.env` de desenvolvimento.
- A imagem Docker define `NODE_ENV=production`. O `docker-compose.yml`, destinado a desenvolvimento e
  avaliação, repassa `CORS_ORIGINS` e define `SWAGGER_ENABLED=true` por padrão.

## Frontend (`RoosterOneFrontEnd-main`)

A única variável consumida pelo código é lida por `import.meta.env` (padrão do Vite).

| Variável | Obrigatória | Função | Valor de exemplo |
|---|---|---|---|
| `VITE_API_URL` | Não (padrão `http://localhost:3000`) | Endereço base da API, utilizado por todo o cliente HTTP (`src/services/hub/client.ts`). Quando a API está inacessível, os recursos genéricos do Hub operam com armazenamento temporário em memória e a interface sinaliza a indisponibilidade. | `VITE_API_URL=http://localhost:3000` |

> **Informe apenas o endereço, sem `/v1`.** A API é versionada por URI, mas o prefixo é acrescentado pelo
> próprio cliente HTTP (`API_VERSION_PREFIX`), pois o mesmo endereço é usado pelos gateways WebSocket
> (`io(\`${API_URL}/desk\`)`), que não são versionados. A inclusão de `/v1` em `VITE_API_URL` interromperia as
> conversas em tempo real e geraria caminhos `/v1/v1/...` nas requisições REST.

> **Toda variável iniciada por `VITE_` é incorporada ao pacote distribuído** e torna-se visível a qualquer visitante.
> Apenas valores públicos devem ser definidos dessa forma; segredos pertencem ao backend.

Para definir `VITE_API_URL`, crie um arquivo `.env` (ou `.env.local`) na raiz do frontend; pelo padrão do Vite,
variáveis com prefixo `VITE_` são injetadas em `import.meta.env` na compilação e no servidor de desenvolvimento.
