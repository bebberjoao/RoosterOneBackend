# Estratégia de Testes e Matriz de Cobertura

Status: setembro/2026. Descreve o que existe de fato — comandos, camadas, o que cada uma cobre e, no fim, a matriz que liga teste a requisito/regra de negócio.

## Camadas

| Camada | Onde | Comando | Quantidade |
|---|---|---|---|
| e2e de API (backend) | `test/*.e2e-spec.ts` | `npm run test:e2e` | 70 testes, 2 arquivos |
| Unitário (backend) | `src/**/*.spec.ts` | `npm test` | 69 testes, 7 arquivos |
| Unitário + componente (frontend) | `src/**/*.test.{ts,tsx}` | `npm test` (no repo do frontend) | 70 testes, 6 arquivos |
| Acessibilidade (frontend) | `src/components/shared/acessibilidade.test.tsx` | incluída no `npm test` | 12 dos 70 acima |

Total: **209 testes**. No backend, `npm run test:all` roda unitários e e2e em sequência.

### e2e de API — a camada principal

Sobe a aplicação NestJS inteira (`AppModule`) contra um **SQLite isolado** (`prisma/dev-test.db`, schema `prisma/schema.test.prisma`), sem depender do PostgreSQL de desenvolvimento. Usa `configurarApp()` — a mesma função do `main.ts` —, então `ValidationPipe`, versionamento e filtro de exceção do Prisma valem igual em teste e em produção. Antes dessa extração os testes rodavam sem o `ValidationPipe`, e nenhuma regra de DTO era de fato exercitada.

É a camada onde a **autorização** é verificada, e é por isso que ela é a principal: quase toda regra crítica do sistema é uma regra de acesso, e regra de acesso só se prova de ponta a ponta (guard + controller + service + banco). Vários testes existem exatamente para provar o caminho negativo — 401 sem token, 403 fora do escopo, 404 que não revela existência.

### Unitário (backend)

`jest-unit.json`, isolado da suíte e2e (`roots: ["<rootDir>/src"]`, `testRegex: \.spec\.ts$`). Cobre lógica pura e decisões que não precisam de banco: os helpers de paginação, o mascaramento de segredo em log, a regra do último administrador (com Prisma substituído por dublê, verificando a decisão e o formato da consulta) e a **suíte dedicada de validação de entrada**.

#### Validação de entrada (`src/common/validacao-dtos.spec.ts`)

Antes, cada restrição de DTO era exercitada só de forma indireta, por algum caso e2e que mandava dado inválido — a maioria das regras não tinha cobertura explícita. Agora as regras são verificadas uma a uma com `plainToInstance` + `validateSync`, que reproduzem exatamente o que o `ValidationPipe` global faz, sem precisar subir a aplicação.

Cobre, entre outros: obrigatoriedade e formato de e-mail, CPF só com 11 dígitos, conversão de `"true"` de formulário em booleano, `participantes` obrigatório na reserva, id de prioridade de chamado não restrito aos quatro do seed, conversão de número vindo como texto na query de paginação e o teto de 200 registros por página.

Um achado real saiu daí: **a senha mínima era inconsistente** — criação de usuário e cadastro do Boost exigiam 8 caracteres, mas `RedefinirSenhaDto` aceitava 6. Não era só divergência de documentação: dava para contornar o mínimo de 8 usando o fluxo de "esqueci minha senha". Unificado em 8, com teste que trava a regressão.

`whitelist`/`forbidNonWhitelisted` (a rejeição de campo desconhecido) são comportamento do pipe, não do DTO, e continuam cobertos pelo e2e.

### Frontend

Vitest + Testing Library + jsdom (`vitest.config.ts`, separado do `vite.config.ts` do app, que é montado pelo preset do Lovable e não deve receber plugins manualmente). Cobre a lógica pura da agenda de reservas, o contrato do cliente HTTP (incluindo o prefixo `/v1` e a renovação de sessão) e o componente de tabela usado por praticamente toda tela de gestão.

#### Acessibilidade (`acessibilidade.test.tsx`)

Auditoria automatizada com **axe-core** (`vitest-axe`) sobre os componentes compartilhados — são eles que se repetem em praticamente toda tela, então um problema ali se multiplica pelo sistema inteiro. Verifica campo sem rótulo associado, botão sem nome acessível, papel ARIA inválido e tabela mal estruturada, tanto em componentes isolados quanto num formulário montado como aparece numa tela real.

A regra `color-contrast` fica **desligada de propósito**: ela precisa de canvas e da folha de estilo aplicada para medir cor, e o jsdom não tem nem uma coisa nem outra — mantê-la ligada só produziria ruído e um resultado sem significado. Contraste, ordem de foco, navegação por teclado e comportamento de leitor de tela continuam sendo verificação manual.

## Varredura de dependência

`npm run audit` (`npm audit --omit=dev`) nos dois repositórios. Não é um portão de pipeline — não há CI —, é um comando a rodar antes de mudança estrutural e antes de qualquer deploy.

Estado atual: o **frontend está limpo**; o **backend tem 8 avisos** vindos de `multer` (via `@nestjs/platform-express`) e `qs`. Confirmado por `npm audit fix --dry-run` que **não há correção não-quebrante**: resolver exige subir `@nestjs/platform-express` para a major seguinte, decisão que precisa de avaliação de impacto própria e está registrada como recomendação em `docs/security/05-analise-de-seguranca.md`.

## O que NÃO é testado automaticamente

Registrado aqui para não ser lido como esquecimento:

- **Teste de carga/desempenho**: nenhum. Sem ambiente de produção e sem volume real, um número medido na máquina de desenvolvimento não significaria nada. O que existe hoje é a análise de consulta em `09-performance.md`.
- **Teste de recuperação de desastre**: depende de uma rotina de backup, que ainda não existe (ver Índice de Pendências).
- **Teste de interface ponta a ponta (navegador)**: não há Playwright/Cypress. O fluxo de tela é verificado manualmente; o que os testes de frontend cobrem é lógica, componente isolado e acessibilidade da árvore renderizada — não a jornada completa nem a navegação real por teclado.
- **Teste de responsividade**: não automatizado. O jsdom não faz layout, então não há o que medir; a verificação é manual, em diferentes larguras de viewport.
- **Teste de penetração e fuzzing**: não realizados. O que existe é a análise de segurança em `docs/security/05-analise-de-seguranca.md`, verificada contra o código, mais a varredura de dependência acima.

## Matriz de cobertura — teste ↔ requisito

Liga cada regra de negócio numerada (`docs/system/04-regras-de-negocio.md`) ao teste que a exercita. Regras sem teste automatizado aparecem explicitamente, com o motivo.

| Regra | O que garante | Onde é testada |
|---|---|---|
| RN001, RN002 | Administrador é permissão, concedida direto ao usuário | e2e: "Rejects a protected route with a valid token but without the required permission"; "Usuarios-setores and usuarios-permissoes flows" |
| RN003 | E-mail de usuário é único | e2e: "Users endpoints should create, read, update and delete a user" |
| RN004 | Redefinição de senha não revela se o e-mail existe; token de uso único | e2e: "Password reset via email: request, consume token, old password stops working, token cannot be reused" |
| RN005, RN006, RN009 | Transição de status de chamado, `encerradoEm` derivado, histórico só em troca real | e2e: "Rooster Desk should create, read, update and delete a ticket flow" |
| RN007, RN008 | Visibilidade de chamado por setor; nota interna invisível ao solicitante | e2e: "Rooster Desk should create, read, update and delete a ticket flow" |
| RN010 | Reserva valida capacidade, dia, janela e conflito | e2e (rooms): "recusa horário de término menor…", "recusa quantidade de participantes acima da capacidade", "recusa horário fora da janela", "recusa sobreposição", "aceita horários encostados", "não considera conflito entre ambientes diferentes", "libera o horário de uma reserva cancelada", "revalida o conflito ao confirmar". Frontend: `labels.test.ts` (`findConflicts`) |
| RN011 | Série recorrente é atômica | e2e: "Rooster Rooms recurring series: generates occurrences, rejects on conflict atomically, cancels in bulk" |
| RN012 | Cancelamento grava o motivo | e2e (rooms): "recusa (cancela) a reserva" |
| RN013, RN014 | Patrimônio baixado não movimenta; movimentação exige destino | e2e: "Rooster Assets should register an asset and a movement" |
| RN015 | Empréstimo: prazo, atraso e devolução | e2e: "Asset loans: overdue tracking and return flow" |
| RN016 | Eventos de segurança geram auditoria automaticamente | e2e: "Security-relevant events are written automatically to LogAuditoria" |
| RN017, RN018 | Horizonte de antecedência e permissão própria de recorrência | e2e: "Rooster Rooms recurring series…" |
| RN019 | Professor/Aluno são vínculos de usuário existente | e2e: "Coordenação constrói a hierarquia completa…" |
| RN020 | Matrícula respeita a capacidade da turma | e2e: "Coordenação constrói a hierarquia completa…" |
| RN021 | Posse de turma é obrigatória além da permissão | e2e: "Professor só acessa/gerencia a própria turma — 403 na turma de outro professor"; "Aluno só vê os próprios dados via /me" |
| RN022, RN023 | Validação de nota e frequência sem reprovação automática | e2e: "Coordenação constrói a hierarquia completa…" |
| RN024 | Não existe fechamento de período | **Sem teste** — é a ausência de uma funcionalidade; não há comportamento a exercitar |
| RN025, RN026 | Publicação idempotente e atomicidade correção↔nota | e2e: "Rooster Learn: publicar atividade gera item avaliativo; correção propaga nota para o Academy" |
| RN027 | Prazo pelo servidor; aluno de outra turma não entrega | e2e: "Rooster Learn: … aluno de outra turma não pode entregar" |
| RN028 | Cobrança sempre ligada a Aluno real | e2e: "Portal do aluno: só vê/baixa as próprias cobranças" |
| RN029 | Lote de mensalidade idempotente, com desconto vigente | e2e: "Gerar mensalidades em lote é idempotente por competência e aplica desconto ativo automaticamente" |
| RN030 | "Vencido" derivado, nunca persistido | e2e: "Cobrança: criar, marcar como paga, negociar e cancelar mudam o status corretamente" |
| RN031 | Pagamento parcial aceito | e2e: "Cobrança: criar, marcar como paga…" |
| RN032 | Conclusão e certificado automáticos e atômicos | e2e: "Fluxo completo: professor publica curso, aluno externo matricula, conclui todas as aulas e recebe certificado automaticamente" |
| RN033 | Acesso ao Boost por matrícula, não por RBAC | e2e: "Professor só gerencia o próprio curso Boost"; "Material de apoio: aluno matriculado baixa; não matriculado recebe 403"; "Chat do curso…" |
| RN034 | Token do Hub e do Boost não se aceitam | e2e: "Cadastro/login público do Boost são independentes do login do Hub" |
| RN036 | Vídeo hospedado servido por token de 5 min, escopado a uma aula | e2e: "Vídeo hospedado: instrutor envia, recusa mimetype errado, e o player consegue arrastar a barra (Range)" (token sem/inválido → 403, Range → 206). Unitário: `video-stream.util.spec.ts` (200/206/416) |
| RN037 | Progresso de vídeo real: nunca regride, completa a partir de 90% | e2e: "Progresso real de vídeo: retoma posição, completa automaticamente perto do fim e emite certificado na última aula" |
| RN038 | Contas externas: admin lista, desativa e redefine senha; professor recebe 403 | e2e: "Contas externas (painel admin): lista, desativa e redefine senha; professor sem a permissão recebe 403" |
| RN040 | Boost sem dono: gestão por permissão; professor é orientador; tirar do ar preserva matriculados | e2e: "Gestão por permissão: quem tem a permissão gere QUALQUER curso; professor orientador (sem permissão de gestão) recebe 403" e "Tirar do ar: some do catálogo e bloqueia nova matrícula, mas o aluno já matriculado continua com acesso e com a conversa" |
| RN041 | Conversa por aluno; orientador só vê os cursos a que está vinculado | e2e: "Orientadores: o gestor vincula professores; só orientador vinculado enxerga e responde as conversas do curso" (caixa vazia e 404 para não vinculado, não lidas, aluno só na própria conversa, 400 sem orientador) |
| RN042 | Certificado por curso: pode não existir; texto do gestor | e2e: "Certificado: desligado, o curso conclui sem emitir (material de apoio); ligado, usa o texto configurado". Unitário: `certificado-boost.service.spec.ts` (`aplicarModelo`) |
| RN039 | Notificação: cada usuário só lê/marca as próprias; emissão não derruba a operação | e2e: "Caixa de entrada: cada usuário lê e marca só as próprias notificações (sem exigir permissão)" (401 sem token, 404 em notificação alheia) e "Cobrança criada e paga gera notificação para o aluno na caixa de entrada dele — e só dele". Front: `role-context.test.ts` cobre `deriveRole` (perfil deduzido, nunca admin por omissão) e `tempoRelativo` |
| RN035 | Instituição nunca fica sem administrador | e2e: "Proteção do último administrador: não dá para revogar, excluir nem desativar o único admin ativo". Unitário: `administradores.service.spec.ts` |

### Requisitos não funcionais e de contrato

| Requisito | Onde é testado |
|---|---|
| Versionamento da API (`/v1` obrigatório) | e2e: "Rota de negócio sem o prefixo /v1 não existe"; "Health check responde em / (fora do versionamento)". Frontend: `client.test.ts` ("prefixo de versão") |
| Health check verifica o banco | e2e: "GET /health verifica o banco de verdade" |
| Paginação opcional e retrocompatível | e2e: "Paginação opcional: sem `pagina`/`limite` devolve array…". Unitário: `pagination.spec.ts` |
| Refresh token com rotação e revogação | e2e: os três testes "Refresh token: …". Frontend: `client.test.ts` ("renovação automática de sessão") |
| Mascaramento de segredo em log | Unitário: `mail.service.spec.ts` |
| Autenticação obrigatória por padrão | e2e: "Rejects a protected route without a token"; e2e (rooms): "recusa a listagem de reservas sem token" |
| Serialização de `BigInt` em anexo/documento | e2e: "Documento acadêmico: upload, listagem, download e remoção respondem com o tamanho (BigInt) serializado corretamente" |
| Contrato de erro do cliente HTTP (`ApiError` × `ApiUnavailableError`, 401 limpa sessão) | Frontend: `client.test.ts` |
| Ordenação/paginação da tabela de listagem | Frontend: `data-table.test.tsx` |
| Validação de entrada, regra a regra (DTOs) | Unitário: `validacao-dtos.spec.ts` |
| Senha mínima igual em todo fluxo que define senha (8 caracteres) | Unitário: `validacao-dtos.spec.ts` ("Senha mínima é a mesma em todo fluxo que define senha") |
| Acessibilidade dos componentes compartilhados | Frontend: `acessibilidade.test.tsx` (axe-core) |

## Como rodar

```bash
# backend
npm test           # unitários (rápido, sem banco)
npm run test:e2e   # e2e completo (sobe a app contra SQLite isolado)
npm run test:all   # os dois, em sequência
npm run audit      # varredura de dependência de produção

# frontend
npm test           # Vitest, uma execução (inclui os testes de acessibilidade)
npm run test:watch
npm run audit
```

Instabilidades conhecidas do e2e no Windows e o modo de falha por ordem de execução dos arquivos estão em `docs/operations/03-execucao.md`.
