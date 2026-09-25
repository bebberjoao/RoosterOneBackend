# Contribuindo — Rooster One (backend)

Porta de entrada prática. O processo completo está em [`docs/engineering/12-processo-de-desenvolvimento.md`](docs/engineering/12-processo-de-desenvolvimento.md).

## Preparar o ambiente

```bash
npm install
npx prisma migrate dev        # aplica as migrations
npm run db:seed:dev           # popula dados de demonstração (APAGA o banco antes)
npm run start:dev             # sobe em http://localhost:3000, Swagger em /api/docs
git config commit.template .gitmessage
```

Antes do primeiro `migrate`, crie um `.env` na raiz com, no mínimo:

```
DATABASE_URL=postgresql://usuario:senha@localhost:5432/rooster_one?schema=public
JWT_SECRET=<qualquer segredo forte>
```

Sem `JWT_SECRET` definido, a aplicação **não inicia** — é proposital. Não existe ainda um `.env.example` versionado; está registrado como pendência (ver `docs/engineering/13-governanca.md` e o Índice de Pendências da documentação consolidada).

## Ciclo de uma mudança

1. **Entender antes de mudar.** A documentação em `docs/` é mantida junto ao código e descreve o sistema como ele é de fato.
2. **Mudar o código.**
3. **Atualizar a documentação impactada no mesmo commit** — ver o mapa de impacto no processo de desenvolvimento. Isso não é opcional.
4. **Verificar:**
   ```bash
   rm -f dist/tsconfig.tsbuildinfo   # o cache incremental já mascarou erro real
   npx tsc --noEmit
   npm run test:e2e
   ```
5. **Commitar** no padrão Conventional Commits.

## Commit

```
<tipo>(<escopo>): <assunto no imperativo, minusculo, sem acento, ate 72 caracteres>

<corpo: o porque da mudanca — o diff ja mostra o que mudou>
```

Tipos: `feat`, `fix`, `docs`, `refactor`, `test`, `perf`, `chore`, `build`, `ci`.
Escopos: `hub`, `desk`, `rooms`, `assets`, `academy`, `learn`, `student`, `finance`, `boost`, `rbac`, `auth`, `db`, `api`, `deps`.

Assunto **sem acento** (convenção do histórico do projeto); corpo pode ter acento normalmente.

## Antes de abrir PR — armadilhas conhecidas deste código

Cada item abaixo já causou um defeito real aqui. A lista completa, com o caso de origem, está no checklist de revisão.

- Rota nova **sem** `@RequirePermission` passa livre pelo `PermissionGuard`.
- Relação de `Usuario` numa resposta exige `select` explícito — `include` cru vaza `senhaHash`.
- Campo `BigInt` precisa de conversão explícita antes de serializar (`JSON.stringify` não serializa `BigInt`).
- Escrita em mais de uma tabela vai dentro de transação.
- Mudou `schema.prisma`? Replique o diff em `schema.test.prisma` — o espelho SQLite não é gerado automaticamente.
- Removeu dependência "sem uso"? Verifique se ela não fornecia **augmentação de tipo global** (foi assim que `request.user` quebrou em 7 controllers).
- Sua mudança invalidou alguma afirmação de ausência na documentação ("não existe", "não implementado")? Esse é o erro de documentação mais frequente do projeto.

## Testes

```bash
npm run test:e2e
```

54 testes em 2 arquivos, contra um SQLite isolado — nunca tocam o PostgreSQL de desenvolvimento.

**Instabilidade conhecida no Windows:** a primeira execução logo após regenerar o client Prisma pode falhar com `PrismaClientConstructorValidationError`. É interferência de antivírus no binário recém-escrito. Rode de novo antes de investigar.

Toda regra de autorização nova precisa de teste do **caso negativo** — quem não pode, não consegue.

## Onde fica o quê

| Assunto | Documento |
|---|---|
| Processo completo (commit, branch, PR, revisão) | `docs/engineering/12-processo-de-desenvolvimento.md` |
| Incidentes, problemas, mudanças e riscos | `docs/engineering/13-governanca.md` |
| Dívida técnica (aberta e histórica) | `docs/engineering/08-divida-tecnica.md` |
| Arquitetura do backend | `docs/backend/01-arquitetura.md` |
| Modelo de autorização | `docs/security/03-rbac.md` |
| Banco de dados | `docs/database/` |
| Endpoints | `docs/api/02-endpoints.md` |
| Diagramas | `docs/diagramas/README.md` |
