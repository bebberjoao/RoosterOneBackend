# Processo de Desenvolvimento — Rooster One

Padrões de commit, branch, pull request e revisão de código dos dois repositórios (`RoosterOneBackend-main` e
`RoosterOneFrontEnd-main`). O documento formaliza práticas anteriormente implícitas e aplica-se aos dois
repositórios; as diferenças entre eles são indicadas explicitamente.

## Fundamentação da formalização em projeto de autor único

O sistema foi desenvolvido por um único autor, circunstância que dispensa parte do processo usual (não há revisor,
disputa de branch nem coordenação de versões). A formalização justifica-se, ainda assim, por três razões:

1. **O histórico seguia o padrão apenas parcialmente.** Antes desta formalização, 18 dos 28 commits dos dois
   repositórios (64%) utilizavam Conventional Commits; os demais continham mensagens como `v1 - final` (repetida
   em dois commits distintos do backend), `Atualizacao Rooms` ou `first commit`. Um padrão seguido parcialmente
   transmite uma rastreabilidade que o histórico não oferece.
2. **O projeto acumulou defeitos de padrão recorrente.** A lista de verificação de revisão apresentada adiante
   deriva, item a item, do registro de dívida técnica do sistema (`08-divida-tecnica.md`); cada item corresponde a
   erro efetivamente ocorrido no projeto.
3. **A formalização é pré-requisito da automação.** A validação de mensagens de commit, a exigência de revisão e o
   bloqueio de integração sem teste dependem de padrão previamente definido (ver "Automação").

## Commits

### Formato

Adota-se o padrão [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>(<escopo opcional>): <assunto no imperativo, em minúsculas, sem ponto final>

<corpo opcional: a motivação da mudança, e não a sua descrição>

<rodapé opcional: BREAKING CHANGE, referências>
```

### Tipos aceitos

| Tipo | Aplicação |
|---|---|
| `feat` | Funcionalidade nova perceptível por algum usuário do sistema |
| `fix` | Correção de defeito em comportamento existente |
| `docs` | Exclusivamente documentação (inclui `docs/`, README e comentários explicativos) |
| `refactor` | Alteração de estrutura sem mudança de comportamento observável |
| `test` | Inclusão ou correção de testes |
| `perf` | Alteração com objetivo de desempenho |
| `chore` | Manutenção não enquadrada nos tipos anteriores (dependências, scripts, configuração) |
| `build` | Alteração no processo de build ou em dependência de build |
| `ci` | Alteração no pipeline de integração contínua |

### Escopos

O escopo corresponde ao módulo de negócio afetado, com os mesmos nomes utilizados no código e no catálogo de
permissões: `hub`, `desk`, `rooms`, `assets`, `academy`, `learn`, `student`, `finance` e `boost`; ou a um tema
transversal: `rbac`, `auth`, `db`, `api`, `deps` e `docs`.

O escopo é opcional, mas recomendado quando a mudança afeta um único módulo. Para mudança que abrange vários
módulos, utiliza-se o tema transversal (por exemplo, `rbac`) ou omite-se o escopo.

### Convenções específicas do projeto

- **Assunto sem acentuação.** O histórico dos dois repositórios segue essa convenção de forma consistente
  (`documentacao`, `seguranca`, `historico`), mantida por uniformidade e para evitar problemas de codificação entre
  ambientes. **O corpo do commit admite acentuação**; a restrição aplica-se apenas à linha de assunto.
- **Assunto em português**, como os demais elementos do projeto (rotas, documentação e mensagens de erro).
- **Limite de 72 caracteres** na linha de assunto.
- **O corpo apresenta a motivação.** O diff evidencia o que foi alterado; o corpo registra o que o diff não
  informa: a decisão, a restrição e o efeito colateral aceito. Commits de correção devem descrever o sintoma.

### Exemplos do histórico

Adequados:

```
feat(rbac): permissao direta por usuario, seguranca de auth e RBAC completo em Hub/Desk/Rooms/Assets
fix: inclui autor (nome) no historico de reserva e de chamado
docs: atualiza documentacao do backend para o RBAC direto por usuario
```

Inadequados (e motivo da elaboração deste documento):

```
v1 - final          <- não informa o conteúdo e foi utilizada em dois commits distintos
Atualizacao Rooms   <- sem tipo nem escopo; "atualização" não descreve a mudança
first commit        <- sem tipo
```

### Modelo de mensagem

O arquivo `.gitmessage`, na raiz de cada repositório, contém o formato em comentário. Para ativá-lo:

```bash
git config commit.template .gitmessage
```

A partir de então, `git commit` (sem `-m`) abre o editor com o lembrete do formato.

## Branches

### Situação atual

Os dois repositórios operam em **desenvolvimento baseado em tronco**: uma única branch (`main`), com commits
diretos, sem branches de funcionalidade. O modelo é adequado a autor único sem revisão paralela e está registrado
como estado vigente, e não como recomendação para equipe.

### Padrão para equipe com mais de um integrante

```
<tipo>/<descricao-curta-com-hifen>
```

Com os mesmos tipos dos commits:

```
feat/reserva-recorrente
fix/anexo-bigint-500
docs/processo-desenvolvimento
chore/remove-passport
```

Regras:

- a branch parte de `main` atualizada e retorna a `main`;
- a branch deve ter **curta duração**: após poucos dias, o custo de integração supera o benefício do isolamento;
- `main` deve permanecer sempre funcional, com `tsc --noEmit` sem erros e testes aprovados;
- não há branches de longa duração (`develop`, `release`), pois o projeto não possui múltiplos ambientes que as
  justifiquem (ver `docs/operations/`).

## Pull requests

### Situação atual

Não há pull requests: o autor realiza commits diretamente em `main`. O modelo abaixo destina-se a mudança futura
desse cenário e reúne as verificações que devem ser realizadas em toda alteração, com ou sem revisor.

### Modelo

`.github/PULL_REQUEST_TEMPLATE.md`, em cada repositório, com quatro seções:

1. **Alteração e motivação**: o problema, e não apenas a solução.
2. **Verificação realizada**: comandos executados e testes manuais, com descrição do que foi verificado.
3. **Impacto na documentação**: lista de verificação explícita, por ser o ponto em que o projeto apresentou falhas
   recorrentes (ver adiante).
4. **Riscos e pontos de atenção**: aspectos que exigem análise mais cuidadosa do revisor.

### Regra de documentação obrigatória

**Nenhuma alteração de comportamento é integrada sem a atualização da documentação correspondente no mesmo commit
ou pull request.**

A regra responde a problema mensurado no projeto. Uma auditoria de setembro de 2026 confrontou a árvore `docs/` com
o código dos dois repositórios e identificou divergências acumuladas em ambos: documentos que afirmavam a
inexistência de backend em módulos já implementados, contagens de entidades desatualizadas (27, 45 e 54, quando
eram 60), menções a rotas e arquivos removidos e um documento que negava a existência de um módulo existente
(`src/mail/`). A revisão de 30/09 a 01/10/2026 identificou o mesmo padrão (ver `11-auditoria-documentacao.md`).

O padrão predominante do erro é a **afirmação de ausência redigida quando verdadeira e não revisada após deixar de
sê-lo**; por isso, a lista de verificação contém item específico sobre esse aspecto.

Mapa de impacto (documentos a revisar conforme a alteração):

| Alteração | Revisão obrigatória |
|---|---|
| Schema ou migration | `database/02-entidades.md`, `database/03-relacionamentos.md`, `database/04-migrations.md`, `database/05-indices-e-constraints.md`, `engineering/07-rastreabilidade.md` e diagramas em `diagramas/` |
| Endpoint (novo, alterado ou removido) | `api/02-endpoints.md`, `backend/04-controllers.md` e a seção de API do módulo na Documentação Geral |
| Permissão ou RBAC | `security/03-rbac.md`, `backend/10-autorizacao-rbac.md`, `database/06-seeds.md` (contagem) e `permission-catalog.ts` no frontend |
| Regra de negócio | `system/04-regras-de-negocio.md` (com o arquivo e o método que a implementam) |
| Tela ou rota do frontend | `frontend/03-paginas-e-rotas.md`, `frontend/02-estrutura.md` e o Manual do Usuário |
| Dependência incluída ou removida | `backend/01-arquitetura.md` ou `frontend/01-arquitetura.md`, com **verificação de extensão global de tipos** (ver a lista de verificação) |
| Módulo novo | Todos os itens anteriores, além de `system/02-escopo.md`, `system/03-funcionalidades.md` e `backend/03-modulos.md` |

## Revisão de código

### Lista de verificação

A lista deriva do registro de dívida técnica do sistema. **Cada item corresponde a erro efetivamente ocorrido no
projeto**, indicado entre parênteses.

**Segurança e autorização**

- [ ] Toda rota nova declara `@RequirePermission`? O handler sem o decorator não é restringido pelo
      `PermissionGuard` (situação que deixou as rotas alternativas do Desk acessíveis sem verificação de permissão).
- [ ] Nenhuma resposta HTTP inclui o objeto `Usuario` completo? Relação de usuário em resposta exige `select`
      explícito (padrão `USUARIO_SAFE_SELECT`); um endpoint já expôs `senhaHash` por utilizar `include` sem `select`.
- [ ] A identidade é obtida do token, e nunca de parâmetro de rota ou do corpo? As rotas `/me/*` identificam o aluno
      pelo JWT justamente para eliminar o caminho de consulta a dados de terceiros.
- [ ] Se a regra depende de vínculo (turma, reserva, setor), a verificação ocorre no servidor, e não apenas pela
      ocultação do botão na interface?
- [ ] Rota de upload declara a permissão no guard e verifica a assinatura binária antes da gravação cifrada?

**Integridade de dados**

- [ ] Operação que grava em mais de uma tabela é executada em transação? A correção de entrega do Learn propaga a
      nota ao Academy na mesma transação para impedir o estado "corrigido sem nota".
- [ ] Campo novo do tipo `BigInt` possui conversão explícita antes da serialização? `JSON.stringify` não serializa
      `BigInt`; todo chamado com anexo retornava `500` por essa razão.
- [ ] Valor monetário utiliza `Decimal`, e nunca ponto flutuante?
- [ ] Status derivável (como "vencido") é **calculado na leitura**, e não persistido?
- [ ] Violação de restrição do banco é convertida pelo `handleError` do service (por meio de `traduzirErroPrisma`),
      e não apresentada como erro interno? Doze services respondiam `500` a violações de unicidade.

**Dependências e tipos**

- [ ] Na remoção de dependência considerada sem uso, verificou-se que ela não fornece **extensão global de tipos**?
      A remoção de `@types/passport-jwt` invalidou `request.user` em sete controllers (89 erros), pois a extensão de
      `Express.Request` provinha dela.
- [ ] `tsc --noEmit` foi executado com o cache incremental removido (`dist/tsconfig.tsbuildinfo`)? O cache já ocultou
      erro real: três pastas sem uso permaneceram compilando por meses porque a verificação não era invalidada.

**Código sem uso**

- [ ] O que a alteração torna obsoleto foi removido no mesmo commit? O projeto acumulou cerca de 30 arquivos órfãos e
      uma árvore de documentação inteira sem referências.
- [ ] Antes da remoção de artefato "sem importador", a busca considerou **importação relativa** (`./mock-data`), e
      não apenas o caminho absoluto? Duas remoções quase comprometeram o build por essa razão, o que o `tsc`
      identificou antes da regressão.

**Documentação**

- [ ] A documentação impactada foi atualizada, conforme o mapa da seção anterior?
- [ ] A alteração **invalidou alguma afirmação de ausência** existente na documentação ("não existe", "não
      implementado", "não identificado")? É o padrão de erro mais frequente do projeto.
- [ ] As contagens citadas na documentação (módulos, tabelas, permissões, testes e endpoints) permanecem corretas?
- [ ] O texto está redigido em registro técnico-formal, em terceira pessoa e sem coloquialismos?

**Testes**

- [ ] Regra de autorização nova possui teste do **caso negativo** (o usuário sem permissão não obtém acesso)? É o
      aspecto mais bem coberto pela suíte e2e e o mais relevante para o sistema.
- [ ] Os testes unitários e e2e são aprovados? No Windows, a primeira execução após a regeneração do cliente Prisma
      pode falhar por interferência do antivírus; a nova execução resolve a ocorrência (ver
      `operations/03-execucao.md`).

### Critérios de aprovação

A alteração somente é aprovada com:

1. `npx tsc --noEmit` sem erros nos repositórios afetados;
2. `npm test` e `npm run test:e2e` aprovados (backend), quando a alteração afeta o backend;
3. `npm test` aprovado e `npm run build` concluído (frontend), quando a alteração afeta o frontend;
4. lista de verificação de documentação atendida;
5. nenhum item da lista de segurança pendente sem justificativa registrada.

## Automação

O pipeline de integração contínua (`.github/workflows/ci.yml`, GitHub Actions) foi implementado nos dois
repositórios e executado com sucesso (ver `docs/operations/05-cicd.md`). A cada envio para `main` e a cada pull
request, executa a verificação de tipos, os testes e o build (backend: testes unitários e e2e e build da imagem
Docker; frontend: testes e build), além da varredura de dependências, não bloqueante.

Permanecem pendentes, conforme o estágio do projeto:

1. validação da mensagem de commit segundo Conventional Commits (`commitlint`) no pipeline;
2. bloqueio de integração em `main` sem pull request aprovado (proteção de branch).

A não instalação de `husky` e `commitlint` como verificação local é deliberada: em projeto de autor único, o hook
local pode ser contornado com `--no-verify` e produz falsa sensação de garantia. A validação é adequada ao pipeline,
no qual não pode ser contornada.
