# Execução em Desenvolvimento

## Backend

```bash
cd RoosterOneBackend-main
npm run start:dev
```

- Executa `nest start --watch`, que recompila e reinicia a aplicação a cada alteração salva.
- Utiliza a porta definida por `PORT` no `.env`, ou **3000** por padrão.
- Requer o `.env` com `DATABASE_URL`, `JWT_SECRET` e `FILE_ENCRYPTION_KEY` (ver `01-configuracao.md`); na
  ausência de `JWT_SECRET` ou `FILE_ENCRYPTION_KEY`, o processo é encerrado na inicialização (ver
  `07-troubleshooting.md`).
- Requer o PostgreSQL indicado por `DATABASE_URL` acessível.
- Disponibiliza a documentação interativa em `/api/docs` (por exemplo, `http://localhost:3000/api/docs`). Em
  produção, a documentação permanece desabilitada, salvo `SWAGGER_ENABLED=true`.
- Fora de produção, o CORS aceita qualquer origem `http://localhost:<porta>` ou `http://127.0.0.1:<porta>`, pois
  o servidor de desenvolvimento do frontend pode utilizar portas diferentes conforme a disponibilidade.

## Frontend

```bash
cd RoosterOneFrontEnd-main
npm run dev
```

- Executa `vite dev`.
- **Porta**: não é fixa no código. O Vite utiliza a porta padrão (8080 neste projeto) ou a primeira livre a partir
  dela; já foram observadas as portas 5173, 8080 e 8081. A porta efetiva é a exibida no terminal.
- Requer `VITE_API_URL` apontando para o backend em execução; na ausência da variável, adota
  `http://localhost:3000` (`src/services/hub/client.ts`).
- Se o backend estiver inacessível, os recursos genéricos do Hub passam a operar com armazenamento temporário
  em memória, e a interface exibe aviso de modo sem conexão. Trata-se de comportamento deliberado do cliente
  HTTP, e não de falha silenciosa.

## Ordem recomendada para a execução conjunta

1. Iniciar o PostgreSQL e confirmar que o `DATABASE_URL` do backend aponta para ele.
2. Iniciar o backend (`npm run start:dev` em `RoosterOneBackend-main`) e confirmar a porta no registro de
   inicialização (padrão 3000).
3. Conferir `VITE_API_URL` no `.env` do frontend.
4. Iniciar o frontend (`npm run dev` em `RoosterOneFrontEnd-main`) e acessar a porta exibida no terminal.

## Outros comandos de desenvolvimento

| Repositório | Comando | Efeito |
|---|---|---|
| Backend | `npm test` | Executa a suíte de testes unitários. |
| Backend | `npm run manual [arquivo de saída]` | Gera o Manual do Usuário em Word a partir de `docs/manual-usuario/manual.json` (padrão: `docs/manual-usuario/Rooster-One-Manual-do-Usuario.docx`, não versionado); o sumário é atualizado ao abrir o documento no Word. |
| Backend | `npm run assistente:base` | Regenera a base de conhecimento do assistente de dúvidas (`src/assistente/base-conhecimento.ts`) a partir do manual e dos guias; executar após alterar `manual.json` ou `docs/user-guides/`. |
| Backend | `node docs/manual-usuario/capturar-telas.mjs [telas]` | Recaptura as telas do manual com o sistema em execução sobre o banco de demonstração; requer `npm install --no-save playwright` e `npx playwright install chromium`. |
| Backend | `npm run test:e2e` | Executa a suíte end-to-end contra um banco SQLite isolado (`prisma/dev-test.db`), com `DATABASE_URL`, `JWT_SECRET` e `FILE_ENCRYPTION_KEY` redefinidos por `cross-env`; não utiliza o PostgreSQL de desenvolvimento. |
| Frontend | `npm test` | Executa a suíte de testes do frontend (Vitest). |
| Frontend | `npm run lint` | Executa o ESLint sobre o projeto. |
| Frontend | `npm run format` | Formata o código com Prettier (`--write`, altera os arquivos). |
| Frontend | `npm run preview` | Serve localmente o resultado de `npm run build`, para validação antes da publicação. |

### Instabilidades conhecidas da suíte e2e

- **Primeira execução após regenerar o cliente de teste (Windows).** A primeira execução logo após a
  regeneração de `prisma/prisma-test-client` (feita pelo próprio `test:e2e`, via `prisma:db:push:test`) pode falhar
  com `PrismaClientConstructorValidationError` na suíte executada por último. O sintoma é compatível com a
  verificação, pelo antivírus, do binário recém-gerado do motor de consultas (`query_engine-windows.dll.node`) no
  momento do carregamento. Uma nova execução resolve a ocorrência, que foi observada apenas na primeira execução
  após a regeneração. Não se trata de falha de teste; recomenda-se repetir a execução antes de qualquer
  investigação.
- **Violação de unicidade em `Modulo` no `beforeAll` (setembro/2026).** A ordem de execução dos arquivos de teste
  pelo Jest não é determinística, e `app.e2e-spec.ts` deliberadamente não limpa o banco em seu `afterAll` (a
  limpeza é centralizada no `globalTeardown`). Um arquivo executado depois, cujo `beforeAll` crie
  incondicionalmente um `Modulo` com nome já existente, provoca `Unique constraint failed on the fields: (nome)`.
  Corrigido com `beforeAll` idempotentes (`findFirst ?? create`). Novos arquivos de teste devem seguir o mesmo
  padrão.
