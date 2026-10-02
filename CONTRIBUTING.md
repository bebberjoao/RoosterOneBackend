# Contribuição — Rooster One (backend)

Orientações práticas de contribuição. O processo completo está descrito em
[`docs/engineering/12-processo-de-desenvolvimento.md`](docs/engineering/12-processo-de-desenvolvimento.md).

## Preparação do ambiente

```bash
npm install
cp .env.example .env          # preencher as variáveis obrigatórias
npx prisma migrate dev        # aplica as migrations
npm run db:seed:dev           # dados de demonstração (APAGA o banco antes)
npm run start:dev             # http://localhost:3000, Swagger em /api/docs
git config commit.template .gitmessage
```

O arquivo `.env.example` relaciona todas as variáveis, com instruções de geração dos segredos. São obrigatórias
`DATABASE_URL`, `JWT_SECRET` e `FILE_ENCRYPTION_KEY`; na ausência de `JWT_SECRET` ou de `FILE_ENCRYPTION_KEY`
válida, a aplicação **não é iniciada**, por decisão de projeto (ver `docs/operations/01-configuracao.md`).

## Ciclo de uma alteração

1. **Compreensão prévia.** A documentação em `docs/` é mantida junto ao código e descreve o sistema vigente.
2. **Alteração do código.**
3. **Atualização da documentação impactada no mesmo commit**, conforme o mapa de impacto do processo de
   desenvolvimento, em registro técnico-formal. A etapa é obrigatória.
4. **Verificação:**
   ```bash
   rm -f dist/tsconfig.tsbuildinfo   # o cache incremental já ocultou erro real
   npx tsc --noEmit
   npm test
   npm run test:e2e
   ```
5. **Commit** no padrão Conventional Commits.

## Commit

```
<tipo>(<escopo>): <assunto no imperativo, em minusculas, sem acento, ate 72 caracteres>

<corpo: a motivacao da mudanca, pois o diff ja mostra o que mudou>
```

Tipos: `feat`, `fix`, `docs`, `refactor`, `test`, `perf`, `chore`, `build` e `ci`.
Escopos: `hub`, `desk`, `rooms`, `assets`, `academy`, `learn`, `student`, `finance`, `boost`, `rbac`, `auth`, `db`,
`api` e `deps`.

O assunto é redigido **sem acentuação** (convenção do histórico do projeto); o corpo admite acentuação.

## Verificações antes do pull request: falhas recorrentes do projeto

Cada item abaixo já originou defeito no projeto; a relação completa, com o caso de origem, consta da lista de
verificação de revisão.

- Rota nova **sem** `@RequirePermission` não é restringida pelo `PermissionGuard`.
- Relação de `Usuario` em resposta exige `select` explícito; `include` sem seleção expõe `senhaHash`.
- Campo `BigInt` exige conversão explícita antes da serialização (`JSON.stringify` não serializa `BigInt`).
- Gravação em mais de uma tabela deve ocorrer em transação.
- Operações de banco em `try/catch` devem delegar ao `handleError` do service (que utiliza `traduzirErroPrisma`),
  para que violações de restrição não sejam apresentadas como erro interno.
- Alteração em `schema.prisma` deve ser reproduzida em `schema.test.prisma`; o espelho SQLite não é gerado
  automaticamente.
- Na remoção de dependência considerada sem uso, deve-se verificar se ela fornece **extensão global de tipos** (foi
  assim que `request.user` deixou de ser tipado em sete controllers).
- Rota de upload deve declarar a permissão no guard, verificar a assinatura binária e gravar o arquivo cifrado.
- A alteração pode invalidar afirmação de ausência na documentação ("não existe", "não implementado"), que é o erro
  de documentação mais frequente do projeto.

## Testes

```bash
npm test            # 137 testes unitários em 12 arquivos
npm run test:e2e    # 86 testes e2e em 2 arquivos, sobre SQLite isolado
```

Os testes e2e não acessam o PostgreSQL de desenvolvimento.

**Instabilidade conhecida no Windows:** a primeira execução após a regeneração do cliente Prisma pode falhar com
`PrismaClientConstructorValidationError`, em razão da interferência do antivírus no binário recém-gravado. A nova
execução resolve a ocorrência, antes de qualquer investigação.

Toda regra de autorização nova exige teste do **caso negativo**: o usuário sem permissão não deve obter acesso.

## Localização dos assuntos

| Assunto | Documento |
|---|---|
| Processo completo (commit, branch, pull request e revisão) | `docs/engineering/12-processo-de-desenvolvimento.md` |
| Incidentes, problemas, mudanças e riscos | `docs/engineering/13-governanca.md` |
| Dívida técnica (pendente e histórica) | `docs/engineering/08-divida-tecnica.md` |
| Estratégia de testes | `docs/engineering/14-estrategia-de-testes.md` |
| Arquitetura do backend | `docs/backend/01-arquitetura.md` |
| Modelo de autorização | `docs/security/03-rbac.md` |
| Banco de dados | `docs/database/` |
| Endpoints | `docs/api/02-endpoints.md` |
| Diagramas | `docs/diagramas/README.md` |
