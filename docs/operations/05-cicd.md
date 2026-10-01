# CI/CD

Situação em 30/09/2026: há **integração contínua** nos dois repositórios, em execução no GitHub Actions. **Não**
há entrega contínua, pelos motivos expostos ao final deste documento.

## Integração contínua (GitHub Actions)

Cada repositório possui `.github/workflows/ci.yml`, disparado por envio (`push`) para `main` e por todo pull
request. O workflow executa as mesmas verificações exigidas pelo `CONTRIBUTING.md` antes da integração, na
mesma ordem, para que a aprovação local e a aprovação no CI tenham o mesmo significado.

### Backend

| Job | Etapas |
|---|---|
| `verificar` | `npm ci` → `prisma generate` → `tsc --noEmit` → `npm test` (unitários) → `npm run test:e2e` → `npm run build` |
| `auditoria` | `npm run audit` (varredura das dependências de produção) |
| `imagem` | `docker build` da imagem do backend |

Dois cuidados evitam falhas conhecidas:

- **`prisma generate` antes do `tsc`**: a compilação importa os tipos gerados pelo cliente do Prisma; sem essa
  etapa, o job falha por módulo inexistente, sem relação com o código.
- **`DATABASE_URL` ilustrativa nessa etapa**: `generate` apenas lê o esquema, sem conexão. O CI não requer banco
  de dados: a suíte e2e é autocontida, com SQLite (`schema.test.prisma`) criado pelo próprio `test:e2e`.

O job de auditoria utiliza `continue-on-error`, deliberadamente. As vulnerabilidades exploráveis por requisição
HTTP foram eliminadas em 30/09/2026 (`multer` 2.4.0 e `qs` 6.16.0); permanecem dois avisos classificados como
risco aceito, sem correção compatível disponível (`deepmerge-ts`, via CLI do Prisma, e `js-yaml`, fixado pelo
`@nestjs/swagger`; justificativa em `docs/security/05-analise-de-seguranca.md`). O job mantém o estado visível a
cada pull request; quando os dois avisos forem eliminados pelas dependências de origem, a remoção dessa linha o
converterá em etapa bloqueante.

### Frontend

| Job | Etapas |
|---|---|
| `verificar` | `npm ci` → `tsc --noEmit` → `npm test` (Vitest, inclusive acessibilidade) → `npm run build` |
| `auditoria` | `npm run audit` |

O `build` não é redundante em relação ao `tsc`: é ele que gera a árvore de rotas do TanStack Router e detecta
erros de importação e de rota que a verificação de tipos, isoladamente, não identifica.

### Execuções registradas

Os workflows foram executados com sucesso após a publicação dos repositórios no GitHub:

| Repositório | Commit | Execução | Resultado |
|---|---|---|---|
| Backend | `9d182e03` (29/09/2026) | 36626943327 | Sucesso |
| Frontend | `2dfd712e` (29/09/2026) | 36626974119 | Sucesso |
| Backend | `eb39f4f4` (30/09/2026) | 36753778831 | Sucesso |

## Conteinerização

`Dockerfile` e `docker-compose.yml` no backend. O frontend não possui imagem própria; seu servidor de
renderização é implantado conforme `04-deploy.md`.

O `Dockerfile` é multiestágio: o primeiro estágio instala todas as dependências e compila; o segundo leva apenas
as dependências de produção, `dist/` e `prisma/`. Pontos relevantes, comentados no próprio arquivo:

- **`openssl` no Alpine**: requerido pelo motor do Prisma; sua ausência produz erro de biblioteca ausente que
  não menciona o Prisma.
- **`prisma generate` antes da compilação**: mesma razão do CI.
- **`VOLUME /app/uploads`**: os arquivos enviados residem em disco, e o banco armazena apenas o nome de cada
  arquivo; sem volume, uma nova implantação eliminaria os arquivos e deixaria registros sem arquivo
  correspondente.
- **Execução com o usuário `node`**, sem privilégios de administrador.
- **`HEALTHCHECK` direcionado a `/health`**, que verifica o acesso ao banco, e não a `/`, que apenas indica que
  o processo responde.
- **`NODE_ENV=production`** na imagem, o que ativa os comportamentos de produção descritos em
  `docs/operations/01-configuracao.md`.

O `docker-compose.yml` inicia PostgreSQL e API já conectados, com `depends_on: condition: service_healthy`;
sem essa condição, a API iniciaria antes de o banco aceitar conexões e falharia na primeira consulta.
`JWT_SECRET` e `FILE_ENCRYPTION_KEY` são obrigatórias e **não possuem valor padrão**, para que nenhum valor de
exemplo se torne segredo de produção por descuido. Por se tratar de ambiente de avaliação, o compose mantém o
Swagger habilitado (`SWAGGER_ENABLED=true`) e repassa `CORS_ORIGINS`.

```bash
cp .env.example .env          # definir JWT_SECRET e FILE_ENCRYPTION_KEY
docker compose up --build
docker compose exec api npx prisma migrate deploy
docker compose exec api npm run db:seed:dev
```

Trata-se de ambiente de desenvolvimento e avaliação, **não de produção**: faltam HTTPS, segredos provenientes de
cofre e backup do volume.

## Ausência de entrega contínua

A implantação automatizada requer um destino, e não existe ambiente de produção nem de homologação (ver
`04-deploy.md` e o Índice de Pendências). A publicação da imagem exigiria ainda registro e credencial. Por isso,
o job `imagem` **apenas constrói** a imagem, validando o `Dockerfile` a cada pull request sem depender de
infraestrutura ainda não definida.

Quando houver ambiente, o caminho está preparado: acrescentar ao mesmo workflow um job de publicação da imagem e
um de `prisma migrate deploy` contra o banco de destino, nessa ordem — migration antes da inicialização da nova
versão, conforme o procedimento de mudança de esquema em `docs/engineering/13-governanca.md`.
