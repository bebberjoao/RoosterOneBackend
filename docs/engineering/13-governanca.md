# Governança — Rooster One

Gestão de incidentes, problemas, mudanças e riscos.

## Escopo e honestidade de contexto

Três dos quatro processos deste documento pressupõem um sistema **em operação**, com usuários reais dependendo dele. O Rooster One não está nesse estágio: não existe ambiente de produção (ver Parte de Infraestrutura da documentação consolidada, itens 610-636). Isso tem duas consequências que precisam ficar registradas em vez de mascaradas:

- **Gestão de incidentes não tem, hoje, o que gerir.** Sem produção, não há indisponibilidade, perda de dado de usuário ou vazamento a tratar. O processo abaixo é definido para o momento em que houver — e é pré-requisito do deploy, não posterior a ele.
- **Gestão de problemas, mudanças e riscos já opera de fato**, ainda que informalmente, e este documento formaliza a prática existente em vez de inventar uma nova.

A distinção entre **incidente** e **problema**, usada aqui, é a clássica: incidente é a ocorrência (o sistema caiu, o dado vazou); problema é a causa subjacente que produz incidentes (a ausência de backup, a permissão que não é checada).

---

## 1. Gestão de incidentes

**Estado: processo definido, sem aplicação — depende de produção existir.**

### Classificação

| Severidade | Critério | Prazo de resposta |
|---|---|---|
| **S1 — Crítica** | Sistema indisponível; perda ou exposição de dado pessoal; acesso indevido confirmado | Imediato, com tudo mais suspenso |
| **S2 — Alta** | Módulo inteiro inoperante; dado incorreto sendo gravado; falha que impede operação acadêmica ou financeira no prazo | Mesmo dia |
| **S3 — Média** | Funcionalidade degradada com contorno disponível | Próximo ciclo de trabalho |
| **S4 — Baixa** | Defeito cosmético ou de conveniência | Backlog |

### Fluxo

1. **Registrar** — abrir issue com o template de incidente (`.github/ISSUE_TEMPLATE/incidente.md`), com sintoma, horário, quem foi afetado e severidade inicial.
2. **Conter** — priorizar restaurar o serviço sobre entender a causa. Para incidente de segurança, conter significa **primeiro revogar o acesso** (desativar o usuário comprometido, o que zera o acesso efetivo na requisição seguinte) e só depois investigar.
3. **Investigar** — o insumo disponível é o log de auditoria (`LogAuditoria`), que registra login, CRUD de usuário, concessão/revogação de permissão e redefinição de senha, com autor e data. **Limitação conhecida e relevante aqui: o log não registra leitura de dado** — numa suspeita de acesso indevido a dado acadêmico ou financeiro, não há trilha de quem consultou o quê (ver item 380 da documentação consolidada).
4. **Corrigir** — seguindo o processo de mudança da seção 3.
5. **Registrar o aprendizado** — todo incidente S1 ou S2 gera entrada em `08-divida-tecnica.md` com o padrão do erro, não só a correção pontual. O objetivo é permitir procurar o mesmo padrão em código semelhante ainda não revisado.

### Pré-requisitos ainda não atendidos

Para que este processo funcione de fato, faltam: monitoramento e alerta (itens 641-650), backup e restauração testados (itens 634-635) e trilha de auditoria de leitura (item 380). Registrados como riscos R-02, R-03 e R-07 na seção 4.

---

## 2. Gestão de problemas

**Estado: em operação informal desde o início; formalizado aqui.**

A prática que já existe no projeto é a de, ao encontrar um defeito, investigar até a causa raiz e registrar **o padrão do erro** — não apenas a correção. O registro fica em `08-divida-tecnica.md`, deliberadamente dividido em duas seções: dívida em aberto e dívida já paga (mantida como histórico).

### Por que manter o histórico da dívida já corrigida

Porque o padrão de um defeito corrigido costuma se repetir em código semelhante ainda não revisado. Exemplos reais deste projeto:

- A serialização de `BigInt` que derrubava chamados com anexo apontou para uma classe de erro que reaparece em **qualquer** campo `BigInt` novo.
- O vazamento de `senhaHash` por `include` sem `select` apontou para uma classe que reaparece em **qualquer** relação de usuário incluída numa resposta.
- A permissão não herdada por método delegado apontou para uma classe que reaparece em **qualquer** rota sem `@RequirePermission`.

É por isso que o checklist de revisão de código (`12-processo-de-desenvolvimento.md`) é derivado desse registro: cada problema resolvido vira uma pergunta permanente de revisão.

### Fluxo

1. Defeito observado → investigar até a causa, não até o sintoma sumir.
2. Corrigir a causa.
3. Perguntar: **onde mais esse mesmo padrão pode existir?** Procurar ativamente.
4. Registrar em `08-divida-tecnica.md`: o que era, por que aconteceu, o que resolveu, e o padrão a evitar.
5. Se o padrão for detectável por revisão, acrescentar a pergunta ao checklist.

---

## 3. Gestão de mudanças

**Estado: em operação; formalizado por `12-processo-de-desenvolvimento.md`.**

Toda mudança segue o processo de desenvolvimento: commit padronizado, verificação (`tsc`, e2e, build), documentação atualizada no mesmo commit, e — quando houver equipe — PR com revisão.

### Classificação por risco da mudança

| Classe | Exemplos | Exigência adicional |
|---|---|---|
| **Baixo risco** | Texto de interface, documentação, ajuste visual | Verificação padrão |
| **Médio risco** | Endpoint novo, tela nova, dependência acrescentada | Verificação padrão + teste do caso negativo de autorização |
| **Alto risco** | Migration, mudança em guard/autorização, remoção de dependência, mudança em transação | Verificação padrão + `tsc` com cache limpo + e2e + revisão explícita do checklist de segurança |

A classe "alto risco" tem esse tratamento porque **as três categorias listadas já causaram regressão real neste projeto**: migrations exigiram réplica manual no schema de teste, a remoção de uma dependência sem uso aparente quebrou 89 pontos de tipagem, e o cache incremental do TypeScript mascarou código morto por meses.

### Mudança em schema — procedimento específico

1. Alterar `prisma/schema.prisma`.
2. **Replicar o mesmo diff em `prisma/schema.test.prisma`** — o espelho SQLite não é gerado automaticamente; esquecer esse passo quebra a suíte e2e de forma confusa.
3. `npx prisma migrate dev --name <nome-descritivo>` com o backend parado.
4. Regenerar os dois clients.
5. Atualizar seed, se a mudança exigir dado novo.
6. Atualizar a documentação de banco e o ERD correspondente.
7. Rodar a suíte e2e.

---

## 4. Gestão de riscos

**Estado: riscos identificados e registrados; sem revisão periódica formal.**

### Registro de riscos

Probabilidade e impacto em escala baixa/média/alta. Severidade = combinação dos dois. "Gatilho" é o sinal de que o risco está se materializando.

| ID | Risco | Prob. | Impacto | Sev. | Mitigação atual | Gatilho |
|---|---|---|---|---|---|---|
| **R-01** | A permissão `hub.acessos.gerenciar-permissoes` é ponto único de comprometimento: quem a obtém tem bypass total, inclusive para concedê-la a outros | Baixa | Alta | **Alta** | Controle de acesso e auditoria de concessão/revogação; desde setembro/2026, o sistema também impede ficar sem nenhum administrador (RN035) — o que cobre a perda acidental, não o comprometimento de uma conta | Concessão dessa permissão fora de um processo de onboarding conhecido |
| **R-02** | Ausência de backup torna qualquer perda de dado irreversível | Média | Alta | **Alta** | Nenhuma. Recomendação operacional provisória: `pg_dump` manual periódico + cópia de `uploads/` | Qualquer operação destrutiva sem cópia prévia; primeiro deploy |
| **R-03** | Arquivos em disco local não sobrevivem a redeploy sem volume persistente | Alta | Alta | **Alta** | Nenhuma; limitação estrutural documentada | Preparação de qualquer deploy |
| ~~**R-04**~~ | ~~Revogar a permissão de administrador do último usuário que a tem deixa a instituição sem acesso administrativo pela interface~~ — **fechado (setembro/2026)** | — | — | **Fechado** | Revogar, excluir ou desativar o último administrador ativo responde `409` (`AdministradoresService`, RN035). Os três caminhos estão cobertos por teste e2e | — |
| ~~**R-05**~~ | ~~Ausência de rate limiting expõe o login a tentativa por força bruta~~ — **fechado (setembro/2026)** | — | — | **Fechado** | `ThrottlerGuard` global (120 req/min por IP) + `@Throttle()` de 8/min nas rotas de autenticação e 5/min no cadastro do Boost. Ver `docs/security/04-seguranca-aplicacao.md` | — |
| **R-06** | Regressão de **jornada de interface** ainda depende de verificação manual | Média | Média | **Média** | Reduzido em setembro/2026: passou a existir suíte de frontend (Vitest + Testing Library, 48 testes) cobrindo lógica e componente isolado, além de `tsc --noEmit` e build. O que continua sem rede automatizada é o fluxo completo de tela, que exigiria Playwright/Cypress | Crescimento do número de telas ou entrada de outra pessoa no projeto |
| **R-07** | Log de auditoria não registra leitura de dado pessoal — suspeita de acesso indevido não é investigável | Média | Alta | **Alta** | Escopo obrigatório por JWT limita o acesso por construção, mas não produz trilha | Qualquer questionamento de titular sobre acesso aos seus dados |
| ~~**R-08**~~ | ~~Listagens sem paginação podem degradar conforme o volume de dados cresce~~ — **fechado (setembro/2026)** | — | — | **Fechado** | Paginação opcional por offset nas 9 listagens que crescem sem limite (usuários, chamados, logs, reservas, cobranças, patrimônio, movimentações, alunos, turmas), com teto de 200 registros por página; conversas seguem por cursor. Ver `docs/api/01-visao-geral.md` | — |
| **R-09** | Documentação diverge do código em fase de desenvolvimento rápido | Alta | Média | **Média** | Regra de documentação obrigatória por mudança + auditoria periódica comparando documento e código | Qualquer sprint de mudança estrutural |
| **R-10** | Conhecimento concentrado em uma única pessoa (continuidade) | Alta | Alta | **Alta** | Documentação extensa e verificável contra o código é justamente a mitigação principal | Necessidade de transferir o projeto |

### Revisão

Os riscos devem ser revistos em dois momentos: **antes de qualquer deploy** (vários deles se materializam exatamente na passagem para produção — R-02, R-03) e **a cada mudança estrutural** que possa criar ou eliminar um deles.

Não há hoje uma cadência de revisão periódica formal, coerente com o estágio do projeto. Quando houver operação real, a revisão passa a ser mensal.

### Relação com as pendências

Os riscos R-02, R-03, R-06 e R-07 são consequência direta de pendências já registradas (backup, volume persistente, testes de frontend, auditoria de leitura). Resolver a pendência fecha o risco — por isso o Índice de Pendências da documentação consolidada e este registro devem ser lidos juntos. R-04, R-05 e R-08 são a demonstração prática disso: fecharam exatamente quando as pendências correspondentes (proteção do último administrador, rate limiting e paginação) foram resolvidas.

---

## Referências

- `12-processo-de-desenvolvimento.md` — commits, branches, PR e revisão
- `08-divida-tecnica.md` — registro de problemas, aberto e histórico
- `10-melhorias-futuras.md` — backlog funcional
- `CONTRIBUTING.md` (raiz de cada repositório) — porta de entrada prática
