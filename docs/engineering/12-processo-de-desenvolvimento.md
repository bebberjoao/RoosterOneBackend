# Processo de Desenvolvimento — Rooster One

Padrões de commit, branch, pull request e revisão de código dos dois repositórios (`RoosterOneBackend-main` e `RoosterOneFrontEnd-main`).

Este documento formaliza o que antes era prática implícita. Ele vale para os dois repositórios — quando houver diferença entre eles, está explicitada.

## Por que formalizar num projeto de autor único

O sistema foi desenvolvido por uma pessoa, o que torna dispensável boa parte da cerimônia de processo (não há revisor, não há disputa de branch, não há coordenação de release). Formalizar mesmo assim tem três razões concretas:

1. **O histórico já seguia um padrão pela metade.** Antes desta formalização, 18 dos 28 commits dos dois repositórios (64%) já usavam Conventional Commits — os outros 10 eram mensagens como `v1 - final` (repetida duas vezes no backend, para commits diferentes), `Atualizacao Rooms` ou `first commit`. Padrão seguido em parte é pior que padrão nenhum: dá a impressão de rastreabilidade que o histórico não entrega.
2. **O projeto acumulou defeitos com padrão repetido.** A seção de revisão de código abaixo não é uma lista genérica de boas práticas: é derivada do registro de dívida técnica deste sistema (`08-divida-tecnica.md`), item a item. Cada linha do checklist existe porque aquele erro **já aconteceu aqui**.
3. **É pré-requisito de qualquer automação.** Validar mensagem de commit, exigir revisão ou bloquear merge sem teste depende de existir um padrão escrito antes. Ver "Automação" ao final.

## Commits

### Formato

Segue [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>(<escopo opcional>): <assunto no imperativo, minúsculo, sem ponto final>

<corpo opcional: o porquê da mudança, não o que ela faz>

<rodapé opcional: BREAKING CHANGE, referências>
```

### Tipos aceitos

| Tipo | Quando usar |
|---|---|
| `feat` | Funcionalidade nova visível para algum usuário do sistema |
| `fix` | Correção de defeito em comportamento existente |
| `docs` | Só documentação (inclui `docs/`, README e comentário explicativo) |
| `refactor` | Mudança de estrutura sem alterar comportamento observável |
| `test` | Acréscimo ou correção de teste |
| `perf` | Mudança cujo objetivo é desempenho |
| `chore` | Manutenção que não é nenhuma das anteriores (dependência, script, configuração) |
| `build` | Mudança no processo de build ou em dependência de build |
| `ci` | Mudança em pipeline (quando houver — ver `10-melhorias-futuras.md`) |

### Escopos

O escopo é o módulo de negócio afetado — os mesmos nomes usados no código e no catálogo de permissões:

`hub`, `desk`, `rooms`, `assets`, `academy`, `learn`, `student`, `finance`, `boost`

Ou um tema transversal: `rbac`, `auth`, `db`, `api`, `deps`, `docs`.

Escopo é opcional, mas recomendado sempre que a mudança for de um módulo só. Para mudança que atravessa módulos, ou se usa o tema transversal (`rbac`), ou se omite o escopo.

### Convenções específicas deste projeto

- **Assunto sem acentuação.** O histórico inteiro dos dois repositórios segue isso de forma consistente (`documentacao`, `seguranca`, `historico`). Mantido por consistência e para evitar problema de codificação entre ambientes. **O corpo do commit pode ter acento normalmente** — a restrição é só para a linha de assunto.
- **Assunto em português**, como todo o resto do projeto (rotas, documentação, mensagens de erro).
- **Limite de 72 caracteres** na linha de assunto.
- **O corpo explica o porquê.** O diff já mostra o que mudou; o corpo serve para o que o diff não conta — a decisão, a restrição, o efeito colateral aceito. Commits de correção devem dizer qual era o sintoma.

### Exemplos reais do repositório

Bons (já no histórico):

```
feat(rbac): permissao direta por usuario, seguranca de auth e RBAC completo em Hub/Desk/Rooms/Assets
fix: inclui autor (nome) no historico de reserva e de chamado
docs: atualiza documentacao do backend para o RBAC direto por usuario
```

Ruins (também no histórico, e o motivo de este documento existir):

```
v1 - final          <- não diz nada, e foi usada em dois commits diferentes
Atualizacao Rooms   <- sem tipo, sem escopo, e "atualização" não informa nada
first commit        <- sem tipo
```

### Template de mensagem

O arquivo `.gitmessage` na raiz de cada repositório traz o formato como comentário. Para ativá-lo:

```bash
git config commit.template .gitmessage
```

A partir daí, `git commit` (sem `-m`) abre o editor já com o lembrete do formato.

## Branches

### Situação atual

Os dois repositórios trabalham hoje em **trunk-based puro**: uma única branch (`main`), commits direto nela, sem branch de funcionalidade. Isso é adequado a um autor único sem necessidade de revisão paralela, e está registrado aqui como o estado real — não como recomendação para uma equipe.

### Padrão para quando houver mais de uma pessoa

```
<tipo>/<descricao-curta-com-hifen>
```

Usando os mesmos tipos dos commits:

```
feat/reserva-recorrente
fix/anexo-bigint-500
docs/processo-desenvolvimento
chore/remove-passport
```

Regras:

- Branch sai sempre de `main` atualizada e volta para `main`.
- Branch é **curta**: se passar de poucos dias, o custo de integração começa a superar o benefício do isolamento.
- `main` deve estar sempre em estado funcional — `tsc --noEmit` limpo e suíte e2e passando.
- Sem branch de longa duração (`develop`, `release`): o projeto não tem ambientes múltiplos que justifiquem isso (ver `docs/operations/` e a Parte de Infraestrutura da documentação consolidada).

## Pull Requests

### Situação atual

Não há PRs: o autor único faz commit direto em `main`. O template abaixo existe para quando isso mudar, e porque ele codifica as perguntas que **já deveriam ser feitas a cada mudança**, com ou sem revisor.

### Template

`.github/PULL_REQUEST_TEMPLATE.md` em cada repositório. Cobre quatro blocos:

1. **O que muda e por quê** — o problema, não só a solução.
2. **Como foi verificado** — quais comandos rodaram e o que foi testado manualmente. Não basta "testei": diga o quê.
3. **Impacto na documentação** — checklist explícito, porque é aqui que este projeto historicamente falhou (ver abaixo).
4. **Riscos e pontos de atenção** — o que o revisor deve olhar com mais cuidado.

### Regra de documentação obrigatória

**Nenhuma mudança de comportamento entra sem a documentação correspondente atualizada no mesmo commit ou PR.**

Essa regra não é preferência de estilo: é resposta direta a um problema medido neste projeto. Uma auditoria de setembro/2026 comparou a árvore `docs/` contra o código dos dois repositórios e encontrou divergências acumuladas em ambos — documentos afirmando que módulos não tinham backend quando já tinham, contagens de entidades desatualizadas (27/45/54 onde eram 60), menções a rotas e arquivos já removidos, e um documento que negava a existência de um módulo que existe (`src/mail/`).

O padrão dominante do erro foi sempre o mesmo: **afirmações de ausência escritas quando eram verdadeiras e nunca revisadas depois que deixaram de ser**. Por isso o checklist de revisão tem uma pergunta específica sobre isso.

Mapa de impacto — o que revisar conforme o que mudou:

| Mudou | Revisar obrigatoriamente |
|---|---|
| Schema / migration | `database/02-entidades.md`, `database/03-relacionamentos.md`, `database/05-indices-e-constraints.md`, `engineering/07-rastreabilidade.md`, ERD em `diagramas/` |
| Endpoint (novo, alterado ou removido) | `api/02-endpoints.md`, `backend/04-controllers.md`, a seção "API do módulo" na documentação consolidada |
| Permissão / RBAC | `security/03-rbac.md`, `backend/10-autorizacao-rbac.md`, `database/06-seeds.md` (contagem), `permission-catalog.ts` no frontend |
| Regra de negócio | `system/04-regras-de-negocio.md` (com o arquivo e método que a implementa) |
| Tela ou rota do frontend | `frontend/03-paginas-e-rotas.md`, `frontend/02-estrutura.md` |
| Dependência adicionada ou removida | `backend/01-arquitetura.md` ou `frontend/01-arquitetura.md`, e **verificar augmentação de tipo global** (ver checklist) |
| Módulo novo | Tudo acima, mais `system/02-escopo.md`, `system/03-funcionalidades.md` e `backend/03-modulos.md` |

## Revisão de código

### Checklist

Este checklist é derivado do registro de dívida técnica deste sistema. **Cada item existe porque o erro correspondente já ocorreu aqui** — a referência entre parênteses aponta o caso real.

**Segurança e autorização**

- [ ] Toda rota nova declara `@RequirePermission`? Handler sem o decorator passa livre pelo `PermissionGuard` — foi assim que as rotas alias do Desk ficaram acessíveis sem checagem de permissão.
- [ ] Nenhuma resposta HTTP inclui o objeto `Usuario` cru? Relação de usuário em resposta exige `select` explícito (padrão `USUARIO_SAFE_SELECT`) — um endpoint já vazou `senhaHash` por usar `include` sem `select`.
- [ ] A identidade vem do token, nunca de parâmetro de rota ou do corpo? Rotas `/me/*` resolvem o aluno pelo JWT justamente para que não exista o caminho de pedir dado de outra pessoa.
- [ ] Se a regra depende de posse (turma, reserva, setor), a checagem está no servidor e não apenas escondendo o botão na interface?

**Integridade de dados**

- [ ] Operação que escreve em mais de uma tabela está dentro de transação? A correção de entrega do Learn propaga nota ao Academy na mesma transação exatamente para não existir o estado "corrigido sem nota".
- [ ] Campo novo do tipo `BigInt` tem conversão explícita antes de serializar? `JSON.stringify` não serializa `BigInt` — todo chamado com anexo retornava 500 por causa disso.
- [ ] Valor monetário usa `Decimal`, nunca ponto flutuante?
- [ ] Status derivável (como "vencido") está sendo **calculado na leitura** em vez de persistido?

**Dependências e tipos**

- [ ] Ao remover uma dependência "sem uso", foi verificado se ela não fornece **augmentação de tipo global**? Remover `@types/passport-jwt` quebrou `request.user` em 7 controllers (89 erros), porque a augmentação de `Express.Request` vinha dela.
- [ ] `tsc --noEmit` rodou com o cache incremental apagado (`dist/tsconfig.tsbuildinfo`)? O cache já mascarou erro real — três pastas mortas permaneceram compilando por meses porque a checagem nunca era invalidada.

**Código morto**

- [ ] O que esta mudança torna obsoleto foi removido no mesmo commit? O projeto acumulou ~30 arquivos órfãos e uma árvore de documentação inteira que ninguém referenciava.
- [ ] Antes de apagar algo por "não ter importador", a busca considerou **import relativo** (`./mock-data`) e não só caminho absoluto? Duas remoções quase quebraram o build por causa disso — `tsc` pegou antes de virar regressão.

**Documentação**

- [ ] A documentação impactada foi atualizada, conforme o mapa da seção anterior?
- [ ] A mudança **invalidou alguma afirmação de ausência** já escrita na documentação ("não existe", "não implementado", "não identificado")? Esse é o padrão de erro mais frequente deste projeto.
- [ ] Contagens citadas na documentação (número de módulos, tabelas, permissões, testes, endpoints) continuam corretas?

**Testes**

- [ ] Regra de autorização nova tem teste do **caso negativo** (quem não pode, não consegue)? É o que a suíte e2e cobre melhor e o que mais importa neste sistema.
- [ ] A suíte e2e passa? Lembrando da instabilidade conhecida no Windows: a primeira execução logo após regenerar o client Prisma pode falhar por interferência de antivírus — rodar de novo resolve (ver `operations/03-execucao.md`).

### Critérios de aprovação

Um PR só é aprovado com:

1. `npx tsc --noEmit` limpo nos repositórios afetados.
2. `npm run test:e2e` passando (backend), quando a mudança toca o backend.
3. `npm run build` concluindo (frontend), quando a mudança toca o frontend.
4. Checklist de documentação atendido.
5. Nenhum item do checklist de segurança em aberto sem justificativa escrita.

## Automação

Hoje toda a verificação é manual, porque não existe pipeline (ver a Parte de Infraestrutura da documentação consolidada, itens 629-632).

Quando o CI for implementado, estes padrões viram verificação automática, nesta ordem de prioridade:

1. `tsc --noEmit` e suíte e2e em cada push — o que hoje depende de lembrar de rodar.
2. Validação da mensagem de commit contra Conventional Commits (`commitlint`).
3. Bloqueio de merge em `main` sem PR aprovado.
4. Verificação de build do frontend.

A decisão de **não** instalar `husky`/`commitlint` agora é deliberada: hook local em projeto de autor único é contornável com `--no-verify` e dá falsa sensação de garantia. A validação faz sentido no CI, onde não há como pular — por isso está listada como parte da pendência de pipeline, não como item separado.
