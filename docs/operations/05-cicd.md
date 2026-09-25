# CI/CD

Status: setembro/2026. Há **integração contínua** nos dois repositórios. **Não** há entrega contínua — e a razão está no fim deste documento.

## Integração contínua (GitHub Actions)

`.github/workflows/ci.yml` em cada repositório, disparado em push para `main` e em todo pull request.

O princípio é que "passou na minha máquina" e "passou no CI" signifiquem a mesma coisa: o workflow roda exatamente as verificações que o `CONTRIBUTING.md` exige antes de integrar, na mesma ordem.

### Backend

| Job | O que roda |
|---|---|
| `verificar` | `npm ci` → `prisma generate` → `tsc --noEmit` → `npm test` (unitários) → `npm run test:e2e` → `npm run build` |
| `auditoria` | `npm run audit` (varredura de dependência de produção) |
| `imagem` | `docker build` da imagem do backend |

Dois detalhes que evitam armadilha conhecida:

- **`prisma generate` antes do `tsc`**: a compilação importa os tipos gerados pelo client; sem essa etapa, o job falha com erro de módulo inexistente que não tem relação com o código.
- **`DATABASE_URL` de placeholder nesse passo**: `generate` só lê o schema, não conecta. A URL existe apenas para satisfazer o parser, e o CI não precisa de banco algum — a suíte e2e é auto-contida, usando SQLite (`schema.test.prisma`) criado pelo próprio `test:e2e`.

O job de auditoria usa `continue-on-error`. É deliberado: existem avisos conhecidos e **sem correção não-quebrante** (`multer`, via `@nestjs/platform-express` — ver `docs/security/05-analise-de-seguranca.md`). O job serve para manter o estado visível a cada PR, não para travar o trabalho por uma decisão que já foi tomada e registrada. No dia em que a atualização for feita, basta remover essa linha para o job virar portão.

### Frontend

| Job | O que roda |
|---|---|
| `verificar` | `npm ci` → `tsc --noEmit` → `npm test` (Vitest, inclui acessibilidade) → `npm run build` |
| `auditoria` | `npm run audit` |

O `build` não é redundante com o `tsc`: é ele que gera o route tree do TanStack Router e pega erro de importação e de rota que a checagem de tipos sozinha não enxerga.

## Containerização

`Dockerfile` + `docker-compose.yml` no backend (o frontend é build estático servido por nitro, e não tem imagem própria).

O Dockerfile é multi-stage: o primeiro estágio instala tudo e compila; o segundo leva só `node_modules` de produção, `dist/` e `prisma/`. Pontos que não são óbvios e estão comentados no próprio arquivo:

- **`openssl` no Alpine**: o engine do Prisma depende dele, e a falta produz um erro sobre biblioteca ausente que não menciona o Prisma.
- **`prisma generate` antes de compilar**: mesma razão do CI.
- **`VOLUME /app/uploads`**: anexo, certificado e nota fiscal são arquivos em disco, e o banco guarda só o caminho. Sem volume, um redeploy apaga tudo isso e deixa registro apontando para arquivo inexistente.
- **Usuário `node`**, não root.
- **`HEALTHCHECK` aponta para `/health`**, que verifica o banco de verdade — não para `/`, que só diz que o processo respondeu.

O `docker-compose.yml` sobe PostgreSQL e API já conectados, com `depends_on: condition: service_healthy` — sem isso a API sobe antes de o banco aceitar conexão e morre na primeira consulta. `JWT_SECRET` é obrigatório e **não tem valor padrão**: embutir um viraria segredo de produção por acidente.

```bash
cp .env.example .env          # e definir JWT_SECRET
docker compose up --build
docker compose exec api npx prisma migrate deploy
docker compose exec api npm run db:seed:dev
```

Isto é ambiente de desenvolvimento e avaliação, **não de produção**: faltam HTTPS, segredo vindo de cofre e backup do volume.

## Por que não há entrega contínua

Deploy automatizado precisa de um destino, e não existe ambiente de produção nem de staging — ver `04-deploy.md` e o Índice de Pendências. Publicar a imagem também exigiria registro e credencial. Por isso o job `imagem` **constrói e para por aí**: valida que o Dockerfile funciona a cada PR, sem depender de infraestrutura que ainda não foi decidida.

Quando houver ambiente, o caminho já está preparado: acrescentar ao mesmo workflow um job de publicação da imagem e um de `prisma migrate deploy` contra o banco alvo, nessa ordem — migration antes da nova versão subir, conforme o procedimento de mudança de schema em `docs/engineering/13-governanca.md`.

## Limitação conhecida

Os workflows **nunca foram executados**: o repositório não está hospedado no GitHub com Actions habilitado. A sintaxe foi verificada e os comandos são os mesmos rodados localmente com sucesso, mas "passa no CI" é, por enquanto, uma expectativa fundamentada — não um fato observado.
