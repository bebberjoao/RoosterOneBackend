# Dívida Técnica — Rooster One

Itens reais, confirmados no código — inclui achados de correções feitas ao longo do desenvolvimento (a dívida já corrigida é citada como "corrigido" com a mudança que resolveu, para efeito de histórico) e o que ainda está pendente.

## Pendente

### Tabela `Sessao` sem uso pelo fluxo real de login

Existe CRUD completo de sessões (`/sessoes`), incluindo campo `refreshToken`, mas `POST /auth/login` nunca cria uma sessão nem usa esse campo. JWT não tem renovação — expira em 8h e força novo login.

**Impacto**: tabela e endpoints mantidos sem função real no fluxo principal; qualquer um lendo o schema pode presumir, incorretamente, que existe renovação de sessão.

**Evidência**: `usuarios.service.ts::login` (não referencia `Sessao`); `sessoes.controller.ts`.

### Cabeçalho `x-user-id` ainda liberado no CORS

`src/main.ts` inclui `x-user-id` em `allowedHeaders` do CORS. Esse cabeçalho pertencia a um esquema de autenticação anterior (por id de usuário no header, sem JWT), que não é mais usado — a autenticação real hoje é 100% `Authorization: Bearer`.

**Impacto**: baixo (não é usado por nenhuma rota), mas é sinal de configuração não revisada após a migração de esquema de autenticação.

**Evidência**: `src/main.ts`.

### Ausência de `.env.example`

Nenhum dos dois repositórios tem um arquivo de exemplo de variáveis de ambiente — quem clona o projeto do zero precisa descobrir as variáveis obrigatórias lendo o código (`JWT_SECRET`, `DATABASE_URL`, `VITE_API_URL`...).

**Impacto**: fricção de onboarding; risco de subir sem `JWT_SECRET` e só descobrir no erro de boot.

**Evidência**: ausência confirmada nos dois repositórios.

### Sem testes de frontend

Nenhum framework de teste (unitário, integração ou e2e) está instalado no `package.json` do frontend. Toda verificação de UI feita durante o desenvolvimento foi manual/pontual.

**Impacto**: mudança de frontend não tem rede de segurança automatizada — regressão só é percebida manualmente.

**Evidência**: `RoosterOneFrontEnd-main/package.json` (sem Jest/Vitest/Playwright/Testing Library).

### Sem testes unitários no backend

Só existe suíte e2e (`test/app.e2e-spec.ts`) rodando contra SQLite. Não há teste isolado de service/controller com mocks.

**Impacto**: um bug de lógica interna a um método pode não ser pego se o cenário e2e específico não existir.

**Evidência**: único arquivo `*.spec.ts`/`*.e2e-spec.ts` do repositório é `test/app.e2e-spec.ts`.

### Upload de anexo em disco local, sem armazenamento externo

Arquivos de anexo de chamado ficam em `uploads/anexos-tickets/` no próprio servidor. Sem volume persistente configurado, um redeploy apaga os arquivos.

**Impacto**: risco de perda de anexo em ambiente sem disco persistente.

**Evidência**: `src/rooster-desk/rooster-desk.controller.ts` (`diskStorage`).

## Corrigida durante o desenvolvimento (histórico)

Itens que eram dívida/bug real e foram corrigidos ao longo da implementação das funcionalidades mais recentes — citados aqui porque o padrão do bug pode se repetir em código semelhante ainda não revisado.

- **Serialização de `BigInt` quebrava a resposta de chamados com anexo real**: `AnexoTicket.tamanho` é `BigInt` no schema (Postgres `Int` não é seguro para tamanho de arquivo em bytes), e `JSON.stringify` não serializa `BigInt` por padrão — qualquer chamado com um anexo de tamanho real retornava erro 500 em `GET /chamados/:id`. Corrigido com serialização explícita (`Number(tamanho)`) antes de responder. Ponto de atenção: qualquer novo campo `BigInt` no schema precisa do mesmo cuidado.
- **Resposta de `POST /patrimonio-movimentacoes` não era o formato que o frontend esperava**: o endpoint é transacional e devolve `{ movimentacao, patrimonio }`, mas o service genérico de frontend (`mapResource`) tratava a resposta como se fosse a movimentação "achatada" — todo registro de movimentação aparecia com campos `undefined` na tela, mesmo gravando certo no banco. Corrigido com um caminho de leitura dedicado que desembrulha a resposta antes de traduzir os campos.
- **`encerradoEm` do chamado dependia do cliente mandar a data certa**: o DTO aceitava `encerradoEm` no corpo, mas nada no frontend real enviava esse campo — na prática, chamados fechados nunca tinham data de encerramento registrada. Corrigido: o valor passou a ser derivado automaticamente da transição de status.
- **Acoplamento entre o seletor de "Visão" (demo) e a resolução de permissão real no frontend**: `hub/permission-context.tsx` resolvia a permissão efetiva comparando o **nome da persona escolhida no RoleSwitcher** (`role-context.tsx`) contra usuários reais do Hub, em vez de usar a sessão de fato autenticada — a UI podia mostrar/esconder elemento com base numa persona de demonstração, não necessariamente alinhada com quem estava logado de verdade. Corrigido: `PermissionProvider` passou a ler `session.permissoes` diretamente (a sessão real), com a Visão de demonstração virando uma camada adicional (E lógico, nunca substituindo). Efeito colateral do mesmo achado, corrigido em seguida: várias telas (`academy.attendance.tsx`, `academy.grades.tsx`, `academy.index.tsx`, `learn.classes.tsx`, `learn.index.tsx`) ainda usavam a Visão (não a permissão real) pra decidir *o que buscar* da API (`{minhas:true}` vs. lista completa), não só *o que mostrar* — um professor de verdade cuja Visão estivesse em "admin" (valor padrão) tomava 403 do backend. Corrigido pra usar `useCan("/academy/manage", "acessar")` nessas cinco telas. Ver `docs/frontend/08-autorizacao.md` (repo frontend) pro detalhamento completo dos três sistemas de "quem eu sou" que coexistem hoje.
