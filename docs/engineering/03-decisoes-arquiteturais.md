# Decisões Arquiteturais — Rooster One

Registro das decisões técnicas relevantes, no formato Decisão / Contexto / Implementação / Consequências /
Evidência. Quando a motivação histórica de uma escolha não pôde ser confirmada (em comentário de código ou em
registro disponível), essa circunstância é declarada explicitamente.

## ADR-001 — RBAC direto por usuário, sem entidade Perfil/Role

**Decisão**: a permissão é um vínculo direto `usuário ↔ permissão` (`UsuarioPermissao`). Não há tabela de perfil
ou papel nem herança de permissão por grupo.

**Contexto**: o sistema possuía, em versão anterior, RBAC por perfil (`Usuário → Perfil → Permissão`), que foi
deliberadamente removido e substituído pela concessão direta, de modo a alinhar o backend ao catálogo de
permissões do frontend (`permission-catalog.ts`), organizado por módulo, tela e ação, sem o conceito de perfil.

**Implementação**: tabela `UsuarioPermissao`; verificação em `UsuariosService.hasPermission`; o administrador não
é identificado por atributo, e sim pela permissão `Rooster Hub / /hub/acessos / gerenciar-permissoes`.

**Consequências**:
- Positiva: correspondência exata entre a permissão consultada pelo frontend para exibir um recurso e a exigida
  pelo backend para autorizá-lo, com vocabulário único (`módulo/recurso/ação`).
- Negativa: sem perfil, a concessão da mesma combinação de permissões a vários usuários exige repetição usuário a
  usuário; não há atualização centralizada propagada a um grupo.

**Evidência**: `prisma/schema.prisma` (ausência de modelo `Perfil`),
`src/roster-hub/usuarios/usuarios.service.ts` (`isAdmin` e `hasPermission`), `docs/system/04-regras-de-negocio.md`
(RN001 e RN002).

## ADR-002 — bcryptjs em vez de bcrypt nativo

**Decisão**: o hash de senha utiliza a biblioteca `bcryptjs` (implementação em JavaScript), e não o pacote
`bcrypt` (binário nativo compilado).

**Contexto**: o `bcrypt` nativo depende de compilação C++ por `node-gyp` na instalação; em ambiente Windows sem
ferramentas de compilação configuradas, a instalação falhava.

**Implementação**: `bcryptjs` em `package.json`, utilizado em `usuarios.service.ts` (hash e comparação) e no portal
do Boost, com `SALT_ROUNDS = 10`.

**Consequências**:
- Positiva: instalação em qualquer ambiente, sem dependência de compilador nativo.
- Negativa: desempenho inferior ao do `bcrypt` nativo, irrelevante no volume atual de usuários e potencialmente
  significativo em escala maior.

**Evidência**: `package.json` (dependência `bcryptjs` e ausência de `bcrypt`).

## ADR-003 — Segredos obrigatórios, sem valor padrão

**Decisão**: a aplicação recusa-se a iniciar quando `JWT_SECRET` ou `FILE_ENCRYPTION_KEY` não estão definidas (ou,
no caso da chave de cifragem, não possuem 32 bytes em base64); não há segredo padrão no código.

**Contexto**: impedir que a aplicação seja iniciada inadvertidamente com segredo conhecido, o que permitiria forjar
tokens ou decifrar arquivos.

**Implementação**: `src/auth/jwt-config.ts` (`jwtModuleOptions` lança `Error` quando `JWT_SECRET` está vazia) e
`src/common/file-encryption.util.ts` (`chaveMestraDeArquivos`, invocada antecipadamente em `main.ts`).

**Consequências**:
- Positiva: a omissão da configuração em novo ambiente é detectada de imediato, pois o processo não é iniciado.
- Negativa: todos os ambientes (desenvolvimento, teste e produção) devem definir as variáveis explicitamente; o
  `.env.example` relaciona-as, com instruções de geração.

**Evidência**: `src/auth/jwt-config.ts`, `src/common/file-encryption.util.ts`, `.env.example`.

## ADR-004 — Guard de autenticação global, com exceção explícita por `@Public()`

**Decisão**: o `JwtAuthGuard` é registrado uma única vez, globalmente (`APP_GUARD`), e não rota a rota. As rotas
que dispensam token utilizam o decorator `@Public()`.

**Contexto**: modelo seguro por padrão: uma nova rota somente permanece sem autenticação se assim for declarado
explicitamente, e a omissão não a expõe.

**Implementação**: `src/auth/auth.module.ts` (`{ provide: APP_GUARD, useClass: JwtAuthGuard }`) e
`src/auth/public.decorator.ts`.

**Consequências**:
- Positiva: reduz o risco de rota exposta por omissão.
- Negativa: toda rota efetivamente pública exige o decorator. Atualmente, utilizam-no as rotas de verificação de
  saúde (`GET /` e `GET /health`), as cinco rotas de autenticação (`/auth/login`, `/auth/esqueci-senha`,
  `/auth/redefinir-senha`, `/auth/refresh` e `/auth/logout`), a transmissão de vídeo com token de curta duração e o
  `BoostPortalController`, protegido por guard próprio.

**Evidência**: `src/auth/auth.module.ts`, `src/roster-hub/usuarios/usuarios.controller.ts`,
`src/app.controller.ts`, `src/rooster-boost-portal/boost-portal.controller.ts`.

## ADR-005 — Envio de e-mail com modo de desenvolvimento sem SMTP

**Decisão**: o `MailService` não exige SMTP configurado. Na ausência de `SMTP_HOST`, fora de produção, registra o
conteúdo do e-mail no log da aplicação, com os tokens dos links mascarados, em vez de falhar; em produção, registra
apenas a falha de configuração, sem o conteúdo.

**Contexto**: o fluxo de redefinição de senha por e-mail precisava ser testável integralmente em ambiente local,
sem dependência de conta de e-mail ou servidor SMTP.

**Implementação**: `src/mail/mail.service.ts`: o `transporter` permanece `null` sem `SMTP_HOST`; nesse caso, o
e-mail é registrado em log e armazenado em `outbox`, utilizado pelos testes e2e para obter o link.

**Consequências**:
- Positiva: o fluxo completo (geração do token, montagem do link e envio) é testável sem infraestrutura externa.
- Negativa: em ambiente sem `SMTP_HOST`, inclusive por omissão, nenhum e-mail é entregue, e a ocorrência consta
  apenas do log. A tela de configurações (`GET /configuracoes/email`) exibe o estado do SMTP e permite o envio de
  teste, o que torna a situação verificável.

**Evidência**: `src/mail/mail.service.ts`, `src/roster-hub/configuracoes/configuracoes.controller.ts`.

## ADR-006 — Reserva recorrente como conjunto de registros individuais vinculados por `serieId`

**Decisão**: a reserva recorrente não é um modelo separado com regra de repetição, e sim N registros comuns de
`Reserva`, cada qual com data própria, que compartilham `serieId` e `serieTotal`.

**Contexto**: cada ocorrência deve poder ser aprovada, recusada ou cancelada individualmente, com o mesmo fluxo de
aprovação, histórico e conversa da reserva única, sem duplicação dessa lógica.

**Implementação**: `Reserva.serieId` e `Reserva.serieTotal` (opcionais); `rooms.service.ts::createReservaSerie`
valida todas as datas antes de criar qualquer registro (operação atômica) e gera um registro por ocorrência;
`cancelarSerie` aplica a cada ocorrência o mesmo cancelamento individual.

**Consequências**:
- Positiva: nenhuma duplicação da lógica de aprovação, cancelamento e histórico entre reserva única e série.
- Negativa: a alteração da recorrência após a criação (por exemplo, mudança de horário de todas as ocorrências
  futuras) não possui endpoint dedicado e deve ser realizada ocorrência a ocorrência.

**Evidência**: `prisma/schema.prisma` (`Reserva.serieId`), `src/rooster-rooms/rooms.service.ts`
(`createReservaSerie` e `cancelarSerie`).

## ADR-007 — Cifragem de arquivos em repouso com chave mestra única

**Decisão**: todo arquivo gravado pelo sistema é cifrado em repouso: documentos (anexos, documentos acadêmicos,
materiais, certificados e notas fiscais) com AES-256-GCM e vídeos do Boost com AES-256-CTR, sob uma chave mestra
(`FILE_ENCRYPTION_KEY`) e vetor de inicialização aleatório por arquivo.

**Contexto**: os arquivos permaneciam legíveis por quem tivesse acesso ao disco, a cópias de segurança ou a servidor
de arquivos estáticos mal configurado.

**Implementação**: `src/common/file-encryption.util.ts`. Os documentos, de até 25 MB, são lidos integralmente, e o
GCM garante confidencialidade e integridade. O vídeo, de até 2 GB e transmitido com `Range`, utiliza CTR, que
permite decifrar apenas o trecho solicitado.

**Consequências**:
- Positiva: o conteúdo cru dos arquivos não é legível sem a chave.
- Negativa: a perda da chave implica a perda permanente de todos os arquivos, razão pela qual a chave integra o
  procedimento de cópia de segurança; o CTR não detecta adulteração do vídeo por quem possua acesso de escrita ao
  disco, risco aceito e documentado em `docs/security/05-analise-de-seguranca.md`.

**Evidência**: `src/common/file-encryption.util.ts`, `src/common/video-stream.util.ts`,
`docs/operations/06-backup-e-recuperacao.md`.

## ADR-008 — Assistente de dúvidas com motor de linguagem local, sem modelo neural nem serviço externo

**Decisão**: o assistente classifica a pergunta por processamento de linguagem clássico, implementado no próprio
backend (`src/assistente/motor-linguagem.ts`): normalização, palavras vazias, radicais, sinônimos do domínio,
correção de digitação (distância de Damerau-Levenshtein) e similaridade TF-IDF com as entradas do Manual do Usuário e
com frases de exemplo de cada tarefa. A resposta é sempre um trecho do manual, e nunca texto gerado.

**Contexto**: o requisito definiu um assistente "local e extremamente leve", destinado exclusivamente a dúvidas de
uso. As alternativas avaliadas foram um modelo de linguagem hospedado (dependência de serviço externo, custo por
requisição, envio das perguntas a terceiros e risco de respostas inventadas) e um modelo neural local de
`embeddings` (Transformers.js com ONNX Runtime): o pacote do runtime nativo, de cerca de 300 MB, não pôde sequer ser
obtido de forma confiável no ambiente de desenvolvimento, e o modelo aumentaria o consumo de memória e o tempo de
inicialização do servidor, sem ganho proporcional para um domínio fechado de cerca de 130 assuntos.

**Implementação**: base de conhecimento gerada do manual (`npm run assistente:base`), índice montado em memória na
inicialização e classificação em 1 a 2 ms por pergunta. A precisão é verificada por três conjuntos de perguntas em
`assistente.service.spec.ts`: calibração (100%, utilizada nos ajustes), validação (mínimo de 95%) e teste cego,
escrito após os ajustes (mínimo de 80%; 88% na medição de 06/10/2026).

**Consequências**:
- Positivas: nenhuma dependência nova em execução, nenhuma pergunta enviada para fora do servidor, resposta
  determinística e restrita ao conteúdo revisado do manual (RN051).
- Negativas: a compreensão depende do vocabulário da documentação e das frases de exemplo; formulações muito
  diferentes podem não ser reconhecidas, caso em que o assistente informa não ter encontrado o assunto e sugere
  tarefas. A base precisa ser regenerada a cada alteração do manual (`docs/engineering/08-divida-tecnica.md`).

**Evidência**: `src/assistente/`, `scripts/assistente/gerar-base.js` e `src/assistente/assistente.service.spec.ts`.

## Decisões sem motivação histórica confirmada

As escolhas abaixo estão confirmadas no código, mas a motivação original **não foi localizada** em comentário de
código ou documentação, razão pela qual não é apresentada:

- **NestJS como framework do backend.**
- **Prisma como ORM.**
- **Organização modular por domínio de negócio** (Hub, Desk, Rooms, Assets, Academy, Learn, Boost e Finance como
  módulos NestJS separados), observada como padrão consistente em todo o backend.
- **Ausência de camada de repositório** (acesso a dados pelo `PrismaService` no service), observada como padrão
  consistente.
- **TanStack Start no frontend** (em vez de Next.js ou Remix).
