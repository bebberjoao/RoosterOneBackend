# Governança — Rooster One

Gestão de incidentes, problemas, mudanças e riscos.

## Escopo e contexto

Três dos quatro processos deste documento pressupõem sistema **em operação**, com usuários dependentes dele. O
Rooster One não se encontra nesse estágio, pois não há ambiente de produção (ver `docs/operations/04-deploy.md`).
Decorrem daí duas consequências, registradas explicitamente:

- **A gestão de incidentes não possui, atualmente, objeto.** Sem produção, não há indisponibilidade, perda de dados
  de usuários ou vazamento a tratar. O processo está definido para quando houver, e constitui pré-requisito da
  implantação, e não etapa posterior a ela.
- **As gestões de problemas, de mudanças e de riscos já são praticadas**, ainda que informalmente; este documento
  formaliza a prática existente.

Adota-se a distinção clássica entre **incidente** e **problema**: incidente é a ocorrência (indisponibilidade,
vazamento de dados); problema é a causa subjacente que produz incidentes (ausência de cópia de segurança,
permissão não verificada).

---

## 1. Gestão de incidentes

**Situação: processo definido, sem aplicação até a existência de ambiente de produção.**

### Classificação

| Severidade | Critério | Prazo de resposta |
|---|---|---|
| **S1 — Crítica** | Sistema indisponível; perda ou exposição de dado pessoal; acesso indevido confirmado | Imediato, com suspensão das demais atividades |
| **S2 — Alta** | Módulo inteiro inoperante; gravação de dado incorreto; falha que impede a operação acadêmica ou financeira no prazo | No mesmo dia |
| **S3 — Média** | Funcionalidade degradada, com alternativa disponível | No ciclo de trabalho seguinte |
| **S4 — Baixa** | Defeito estético ou de conveniência | Lista de pendências |

### Fluxo

1. **Registro**: abertura de issue com o modelo de incidente (`.github/ISSUE_TEMPLATE/incidente.md`), com sintoma,
   horário, usuários afetados e severidade inicial.
2. **Contenção**: prioridade à restauração do serviço sobre a identificação da causa. Em incidente de segurança, a
   contenção consiste **primeiramente na revogação do acesso** (desativação do usuário comprometido, que elimina o
   acesso efetivo na requisição seguinte e impede a renovação da sessão), e somente depois na investigação.
3. **Investigação**: os insumos disponíveis são o log de auditoria (`LogAuditoria`), que registra login, renovação
   de sessão, operações sobre usuários e permissões, redefinição de senha e operações acadêmicas e financeiras
   sensíveis, com autor e data, e o rastreamento de erros (`LogErro`). **Limitação relevante: o log não registra a
   leitura de dados**; em suspeita de acesso indevido a dado acadêmico ou financeiro, não há trilha das consultas
   realizadas.
4. **Correção**: conforme o processo de mudança da seção 3.
5. **Registro do aprendizado**: todo incidente S1 ou S2 gera entrada em `08-divida-tecnica.md` com o padrão do
   erro, e não apenas a correção pontual, para permitir a busca do mesmo padrão em código semelhante ainda não
   revisado.

### Pré-requisitos ainda não atendidos

O processo exige, para funcionar plenamente: monitoramento e alertas externos, agendamento das cópias de segurança
no ambiente de produção e trilha de auditoria de leitura. Esses itens correspondem aos riscos R-02, R-07 e R-11 da
seção 4.

---

## 2. Gestão de problemas

**Situação: praticada informalmente desde o início do projeto; formalizada neste documento.**

A prática vigente consiste em, diante de um defeito, investigar até a causa raiz e registrar **o padrão do erro**, e
não apenas a correção. O registro é mantido em `08-divida-tecnica.md`, dividido deliberadamente em dívida pendente e
dívida corrigida (mantida como histórico).

### Fundamentação da manutenção do histórico

O padrão de um defeito corrigido tende a repetir-se em código semelhante ainda não revisado. Exemplos do projeto:

- a serialização de `BigInt`, que causava falha nos chamados com anexo, caracterizou classe de erro que reaparece
  em **qualquer** campo `BigInt` novo;
- a exposição de `senhaHash` por `include` sem `select` caracterizou classe que reaparece em **qualquer** relação de
  usuário incluída em resposta;
- a permissão não herdada por método delegado caracterizou classe que reaparece em **qualquer** rota sem
  `@RequirePermission`;
- a conversão de violação de unicidade em erro interno, replicada em doze services, caracterizou classe que
  reaparece em **qualquer** tratamento de erro implementado por cópia, e motivou a centralização em
  `traduzirErroPrisma`.

Por essa razão, a lista de verificação de revisão (`12-processo-de-desenvolvimento.md`) deriva desse registro: cada
problema resolvido torna-se pergunta permanente de revisão.

### Fluxo

1. Defeito observado → investigação até a causa, e não apenas até o desaparecimento do sintoma.
2. Correção da causa.
3. Identificação de **outros pontos em que o mesmo padrão pode existir**, com busca ativa.
4. Registro em `08-divida-tecnica.md`: a ocorrência, sua causa, a solução e o padrão a evitar.
5. Inclusão de pergunta na lista de verificação, se o padrão for detectável por revisão.

---

## 3. Gestão de mudanças

**Situação: praticada; formalizada em `12-processo-de-desenvolvimento.md`.**

Toda mudança segue o processo de desenvolvimento: commit padronizado, verificação (`tsc`, testes unitários e e2e,
build), documentação atualizada no mesmo commit e, quando houver equipe, pull request com revisão. O pipeline de
integração contínua executa as verificações a cada envio.

### Classificação por risco

| Classe | Exemplos | Exigência adicional |
|---|---|---|
| **Baixo risco** | Texto de interface, documentação, ajuste visual | Verificação padrão |
| **Médio risco** | Endpoint novo, tela nova, dependência incluída | Verificação padrão e teste do caso negativo de autorização |
| **Alto risco** | Migration, alteração em guard ou autorização, remoção de dependência, alteração em transação ou em tratamento de erro compartilhado | Verificação padrão, `tsc` com cache removido, testes e2e e revisão explícita da lista de segurança |

A classe de alto risco recebe esse tratamento porque **as categorias listadas já causaram regressão no projeto**:
migrations exigiram replicação manual no schema de teste, a remoção de dependência aparentemente sem uso invalidou
89 pontos de tipagem e o cache incremental do TypeScript ocultou código sem uso por meses.

### Procedimento específico para alteração de schema

1. Alterar `prisma/schema.prisma`.
2. **Reproduzir a mesma alteração em `prisma/schema.test.prisma`**; o espelho SQLite não é gerado automaticamente, e
   a omissão desse passo compromete a suíte e2e de forma de difícil diagnóstico.
3. Executar `npx prisma migrate dev --name <nome-descritivo>` com o backend parado.
4. Regenerar os dois clientes.
5. Atualizar o seed, se a alteração exigir novos dados.
6. Atualizar a documentação de banco e o diagrama ER correspondente.
7. Executar a suíte e2e.

---

## 4. Gestão de riscos

**Situação: riscos identificados e registrados; sem revisão periódica formal.**

### Registro de riscos

Probabilidade e impacto em escala baixa, média e alta; a severidade combina os dois. O gatilho é o sinal de
materialização do risco.

| ID | Risco | Prob. | Impacto | Sev. | Mitigação vigente | Gatilho |
|---|---|---|---|---|---|---|
| **R-01** | A permissão `hub.acessos.gerenciar-permissoes` é ponto único de comprometimento: o detentor possui acesso irrestrito, inclusive para concedê-la a terceiros | Baixa | Alta | **Alta** | Controle de acesso e auditoria de concessão e revogação, com registro do administrador que executou a ação; desde setembro de 2026, o sistema impede a ausência de administrador (RN035), o que cobre a perda acidental, mas não o comprometimento de conta | Concessão dessa permissão fora de procedimento de admissão conhecido |
| **R-02** | Perda de dados sem cópia de segurança recente | Média | Alta | **Média** | Reduzido em setembro de 2026: scripts de backup, restauração e simulado de recuperação, com verificação de decifragem dos arquivos (`docs/operations/06-backup-e-recuperacao.md`). Pendente: agendamento e armazenamento externo no ambiente de produção | Operação destrutiva sem cópia prévia; primeira implantação |
| **R-03** | Arquivos em disco local perdidos em nova implantação sem volume persistente | Média | Alta | **Média** | Reduzido: o `docker-compose.yml` declara volume persistente para `uploads/`, e as pastas são incluídas no backup. Permanece a dependência de disco local | Implantação em plataforma sem volume persistente |
| ~~**R-04**~~ | ~~A revogação da permissão de administrador do último usuário que a possui deixa a instituição sem acesso administrativo~~ — **encerrado (setembro de 2026)** | — | — | **Encerrado** | A revogação, a exclusão ou a desativação do último administrador ativo resulta em `409` (`AdministradoresService`, RN035), com os três caminhos cobertos por teste e2e | — |
| ~~**R-05**~~ | ~~Ausência de limitação de requisições expõe o login a tentativas por força bruta~~ — **encerrado (setembro de 2026)** | — | — | **Encerrado** | `ThrottlerGuard` global (120 requisições por minuto por IP) e `@Throttle()` de 8 por minuto nas rotas de autenticação e de 5 por minuto no cadastro do Boost. Ver `docs/security/04-seguranca-aplicacao.md` | — |
| **R-06** | Regressão de **jornada de interface** dependente de verificação manual | Média | Média | **Média** | Reduzido em setembro de 2026: suíte de frontend (Vitest e Testing Library, 70 testes) para lógica, componentes isolados e acessibilidade, além de `tsc --noEmit` e build no pipeline. Permanece sem cobertura automatizada o fluxo completo de telas, que exigiria Playwright ou Cypress | Crescimento do número de telas ou ingresso de outro integrante no projeto |
| **R-07** | O log de auditoria não registra a leitura de dados pessoais, o que impede a investigação de suspeita de acesso indevido | Média | Alta | **Alta** | O escopo obrigatório pelo JWT limita o acesso por construção, mas não produz trilha | Questionamento de titular sobre acesso a seus dados |
| ~~**R-08**~~ | ~~Listagens sem paginação podem degradar com o crescimento do volume de dados~~ — **encerrado (setembro de 2026)** | — | — | **Encerrado** | Paginação opcional por deslocamento nas nove listagens de crescimento contínuo, com limite de 200 registros por página; conversas paginadas por cursor. Ver `docs/api/01-visao-geral.md` | — |
| **R-09** | Divergência entre documentação e código em fase de desenvolvimento acelerado | Alta | Média | **Média** | Regra de documentação obrigatória por alteração e auditoria periódica (a mais recente em 01/10/2026, `11-auditoria-documentacao.md`) | Ciclo de alterações estruturais |
| **R-10** | Conhecimento concentrado em um único integrante (continuidade) | Alta | Alta | **Alta** | Documentação extensa e verificável contra o código, como principal mitigação | Necessidade de transferência do projeto |
| **R-11** | Ausência de monitoramento e alertas externos: falhas em produção seriam percebidas apenas pelos usuários | Média | Média | **Média** | Verificação de saúde (`GET /health`), log em JSON e registro persistido de erros (`LogErro`); a integração com serviço externo depende do ambiente de produção | Primeira implantação |

### Revisão

Os riscos devem ser revistos em dois momentos: **antes de cada implantação** (vários deles materializam-se na
passagem para produção, como R-02, R-03 e R-11) e **a cada mudança estrutural** que possa criar ou eliminar algum
deles. Não há cadência periódica formal, em coerência com o estágio do projeto; com a operação efetiva, a revisão
passará a ser mensal.

### Relação com as pendências

Os riscos R-02, R-03, R-06, R-07 e R-11 decorrem diretamente de pendências registradas (agendamento de backup,
armazenamento externo de arquivos, testes de jornada, auditoria de leitura e monitoramento externo). A resolução da
pendência encerra o risco, razão pela qual o Índice de Pendências da Documentação Geral e este registro devem ser
lidos em conjunto. Os riscos R-04, R-05 e R-08 demonstram essa relação: foram encerrados com a resolução das
pendências correspondentes (proteção do último administrador, limitação de requisições e paginação).

---

## Referências

- `12-processo-de-desenvolvimento.md`: commits, branches, pull requests e revisão.
- `08-divida-tecnica.md`: registro de problemas, pendentes e históricos.
- `10-melhorias-futuras.md`: pendências funcionais.
- `CONTRIBUTING.md` (raiz de cada repositório): orientações práticas de contribuição.
