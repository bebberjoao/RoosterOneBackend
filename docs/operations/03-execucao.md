# Execução em Desenvolvimento

## Backend

```bash
cd RoosterOneBackend-main
npm run start:dev
```

- Executa `nest start --watch` (recompila e reinicia automaticamente a cada alteração salva).
- Escuta na porta definida por `PORT` no `.env`, ou **3000** por padrão (`src/main.ts`, `app.listen(process.env.PORT ?? 3000)`).
- Depende do `.env` estar presente e conter no mínimo `DATABASE_URL` e `JWT_SECRET` (ver `01-configuracao.md`) — sem `JWT_SECRET`, o processo lança erro e encerra na inicialização (ver `07-troubleshooting.md`).
- Depende do PostgreSQL apontado por `DATABASE_URL` estar acessível.
- Expõe a documentação Swagger em `/api/docs` (ex.: `http://localhost:3000/api/docs`), montada em `src/main.ts` via `SwaggerModule`.
- CORS liberado, em desenvolvimento, para qualquer origem `http://localhost:<qualquer porta>` ou `http://127.0.0.1:<qualquer porta>` (ver comentário em `src/main.ts`) — cobre o fato de o Vite escolher portas diferentes conforme disponibilidade.

## Frontend

```bash
cd RoosterOneFrontEnd-main
npm run dev
```

- Executa `vite dev`.
- **Porta**: não é fixa no código. O Vite tenta a porta padrão (8080, conforme o comentário em `src/main.ts` do backend e em `src/services/hub/client.ts`/CORS do backend, que menciona explicitamente 5173, 8080, 8081 como portas já observadas) e sobe na primeira porta livre a partir daí. Não trate nenhuma dessas portas como garantida — sempre confira a porta impressa no terminal ao rodar `npm run dev`.
- Depende de `VITE_API_URL` apontar para o backend ativo. Se a variável não estiver definida, o frontend assume `http://localhost:3000` como padrão (`src/services/hub/client.ts`).
- Se o backend não estiver acessível no endereço configurado, partes da interface caem automaticamente em um modo offline com dados em memória (mesmo contrato de API, sem persistência real) e a UI exibe um aviso de "modo offline" — isso é um comportamento deliberado do cliente HTTP (`src/services/hub/client.ts`), não uma falha silenciosa a ser confundida com erro de configuração.

## Ordem recomendada para rodar os dois juntos

1. Subir o PostgreSQL e confirmar que `DATABASE_URL` do backend aponta para ele.
2. Subir o backend (`npm run start:dev` em `RoosterOneBackend-main`) e confirmar a porta no log (padrão 3000).
3. Conferir/ajustar `VITE_API_URL` no `.env` do frontend para apontar para essa porta.
4. Subir o frontend (`npm run dev` em `RoosterOneFrontEnd-main`) e abrir a porta impressa no terminal.

## Outros comandos úteis em desenvolvimento

| Repositório | Comando | Efeito |
|---|---|---|
| Backend | `npm run test:e2e` | Roda a suíte de testes end-to-end contra um banco SQLite isolado (`prisma/dev-test.db`), com `DATABASE_URL` e `JWT_SECRET` sobrescritos via `cross-env` — não usa o PostgreSQL de desenvolvimento. |

**Instabilidade conhecida no Windows**: a primeira execução logo após `prisma/prisma-test-client` ser regenerado (o próprio `test:e2e` faz isso via `prisma:db:push:test`) às vezes falha com `PrismaClientConstructorValidationError` na suíte que roda por último — sintoma consistente de antivírus/Windows Defender escaneando o binário novo do query engine (`query_engine-windows.dll.node`) no instante em que o Node tenta carregá-lo. Rodar `npm run test:e2e` de novo sempre resolve (confirmado repetidas vezes: falha só na primeira execução após regenerar, nunca na segunda). Não é uma falha de teste real — se acontecer, rode de novo antes de investigar qualquer outra coisa.

**Outro modo de falha, diferente da instabilidade acima (setembro/2026)**: `Unique constraint failed on the fields: (nome)` ao criar um `Modulo` no `beforeAll` de um arquivo de teste. Causa: a ordem de execução dos arquivos de teste pelo Jest **não é determinística**, e `app.e2e-spec.ts` deliberadamente não limpa o banco no seu `afterAll` (a limpeza fica centralizada no `globalTeardown`) — então, se outro arquivo (ex.: `rooms-reservas.e2e-spec.ts`) rodar depois e seu `beforeAll` fizer um `create` incondicional de um `Modulo` com o mesmo `nome` que já ficou no banco, colide. Corrigido tornando esses `beforeAll` idempotentes (`findFirst ?? create`, o mesmo padrão já usado em `app.e2e-spec.ts`). Se esse erro aparecer de novo ao adicionar um teste novo, o `beforeAll` dele provavelmente precisa do mesmo tratamento.
| Frontend | `npm run lint` | Roda o ESLint sobre o projeto. |
| Frontend | `npm run format` | Formata o código com Prettier (`--write`, altera os arquivos). |
| Frontend | `npm run preview` | Serve localmente o resultado de `npm run build` (útil para validar o build de produção antes de publicar). |
