# Instalação — Do Zero

Passo a passo para colocar os dois repositórios (`RoosterOneBackend-main` e `RoosterOneFrontEnd-main`) rodando localmente pela primeira vez.

## Pré-requisitos

- **Node.js**: versão não fixada no código de nenhum dos dois repositórios (não há `.nvmrc` nem campo `engines` no `package.json`). O backend usa `@types/node@^24.0.0` e o frontend `@types/node@^22.16.5` como pistas de compatibilidade — na prática, use uma versão LTS atual do Node (18+ recomendado como mínimo prático; idealmente 20 ou 22).
- **npm**: usado como gerenciador de pacotes em ambos os repositórios (não há `yarn.lock` nem `pnpm-lock.yaml` — só `package-lock.json`, se presente).
- **PostgreSQL**: exigido pelo backend (`prisma/schema.prisma` declara `provider = "postgresql"`). A versão mínima não está fixada no código; o Prisma 6 (`"@prisma/client": "^6.0.0"`, `"prisma": "^6.0.0"`) suporta PostgreSQL 9.6 em diante — use uma versão atual e suportada (ex.: 14+) por segurança e compatibilidade, ainda que isso não seja uma exigência documentada no repositório.
- Um servidor PostgreSQL acessível (local ou remoto), com um banco de dados vazio criado para o projeto.
- (Opcional, só para redefinição de senha por e-mail real) Credenciais de um servidor SMTP. Sem isso, o backend funciona normalmente em modo de log (ver `01-configuracao.md`).

## 1. Clonar os repositórios

```bash
git clone <url-do-backend> RoosterOneBackend-main
git clone <url-do-frontend> RoosterOneFrontEnd-main
```

(Os dois projetos são repositórios independentes, sem monorepo — não há dependência de build entre eles.)

## 2. Backend

### 2.1. Instalar dependências

```bash
cd RoosterOneBackend-main
npm install
```

### 2.2. Configurar o `.env`

Não existe `.env.example` no repositório (ver gap documentado em `01-configuracao.md`). Crie manualmente um arquivo `.env` na raiz do backend com, no mínimo, as duas variáveis obrigatórias:

```bash
DATABASE_URL=postgresql://usuario:senha@localhost:5432/rooster_one
JWT_SECRET=<gere-um-segredo-forte-aleatorio>
```

Adicione as demais variáveis opcionais (`PORT`, `FRONTEND_URL`, `SMTP_*`, `MAIL_FROM`) conforme necessário — ver tabela completa em `01-configuracao.md`.

### 2.3. Gerar o Prisma Client

```bash
npm run prisma:generate
```

### 2.4. Aplicar as migrations

Em ambiente de desenvolvimento (cria/atualiza o banco e mantém o histórico de migrations sincronizado):

```bash
npm run prisma:migrate
```

Esse comando executa `prisma migrate dev`, que pede confirmação interativa caso detecte drift de schema — rode em um terminal interativo na primeira vez.

### 2.5. Popular dados de exemplo (seed)

```bash
npm run db:seed:dev
```

Executa `prisma/seed-dev.ts` via `ts-node`. Esse script cria os dados de exemplo (setores, usuários, permissões) usados para testar o sistema localmente — consulte o próprio arquivo para saber quais credenciais de login ele cria.

### 2.6. Subir o backend

```bash
npm run start:dev
```

Ver detalhes de execução (porta, logs) em `03-execucao.md`.

## 3. Frontend

### 3.1. Instalar dependências

```bash
cd RoosterOneFrontEnd-main
npm install
```

### 3.2. Configurar a URL da API (opcional)

O frontend já assume `http://localhost:3000` como padrão para `VITE_API_URL` (ver `src/services/hub/client.ts`). Se o backend estiver rodando em outra porta/host, crie um `.env` (ou `.env.local`) na raiz do frontend:

```bash
VITE_API_URL=http://localhost:3000
```

### 3.3. Subir o frontend

```bash
npm run dev
```

Ver detalhes de porta em `03-execucao.md`.

## Resumo dos comandos (backend)

Todos confirmados em `package.json` — não use nomes de script diferentes destes:

| Objetivo | Comando |
|---|---|
| Instalar dependências | `npm install` |
| Gerar Prisma Client | `npm run prisma:generate` |
| Aplicar migrations (dev) | `npm run prisma:migrate` |
| Aplicar migrations (produção) | `npm run prisma:deploy` |
| Popular dados de exemplo | `npm run db:seed:dev` |
| Rodar em desenvolvimento | `npm run start:dev` |
| Build de produção | `npm run build` |
| Rodar build de produção | `npm run start:prod` |
| Testes end-to-end | `npm run test:e2e` |

## Resumo dos comandos (frontend)

| Objetivo | Comando |
|---|---|
| Instalar dependências | `npm install` |
| Rodar em desenvolvimento | `npm run dev` |
| Build de produção | `npm run build` |
| Servir o build localmente | `npm run preview` |
| Lint | `npm run lint` |
| Formatar código | `npm run format` |
