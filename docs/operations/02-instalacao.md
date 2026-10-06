# Instalação em ambiente de desenvolvimento

Procedimento para a primeira execução local dos dois repositórios (`RoosterOneBackend-main` e
`RoosterOneFrontEnd-main`). A instalação em servidor está em `04-deploy.md`, e a instalação automatizada em
computador Windows (pré-requisitos, banco, compilação e início automático), em `09-instalador.md`.

## Pré-requisitos

- **Node.js**: a versão não é fixada em nenhum dos repositórios (não há `.nvmrc` nem campo `engines`). O CI
  utiliza a versão 22, recomendada; o mínimo prático é a versão 18.
- **npm**: gerenciador de pacotes dos dois repositórios (há apenas `package-lock.json`).
- **PostgreSQL**: exigido pelo backend (`provider = "postgresql"` em `prisma/schema.prisma`). A versão mínima
  não é fixada; recomenda-se versão atual e suportada (14 ou superior). O desenvolvimento e o CI utilizam as
  versões 16 a 18.
- Servidor PostgreSQL acessível, local ou remoto, com um banco de dados vazio criado para o projeto.
- Opcionalmente, credenciais de um servidor SMTP, necessárias apenas para o envio real do e-mail de redefinição
  de senha. Sem elas, o backend opera normalmente em modo de registro (ver `01-configuracao.md`).

## 1. Obtenção dos repositórios

```bash
git clone https://github.com/bebberjoao/RoosterOneBackend.git RoosterOneBackend-main
git clone https://github.com/bebberjoao/RoosterOneFrontEnd.git RoosterOneFrontEnd-main
```

Os dois projetos são repositórios independentes, sem dependência de compilação entre si.

## 2. Backend

### 2.1. Instalação das dependências

```bash
cd RoosterOneBackend-main
npm install
```

### 2.2. Configuração do `.env`

Copie o arquivo de exemplo e preencha as três variáveis obrigatórias:

```bash
cp .env.example .env
```

```bash
DATABASE_URL=postgresql://usuario:senha@localhost:5432/rooster_one?schema=public
JWT_SECRET=<segredo-aleatorio-longo>
FILE_ENCRYPTION_KEY=<32-bytes-aleatorios-em-base64>
```

Os comandos de geração dos segredos constam do próprio `.env.example`. As variáveis opcionais estão descritas
em `01-configuracao.md`.

### 2.3. Geração do cliente do Prisma

```bash
npm run prisma:generate
```

### 2.4. Aplicação das migrations

Em desenvolvimento, o comando abaixo cria ou atualiza o banco e mantém o histórico de migrations sincronizado:

```bash
npm run prisma:migrate
```

O comando executa `prisma migrate dev`, que solicita confirmação caso detecte divergência entre o esquema e o
banco; na primeira execução, deve ser utilizado em terminal interativo.

### 2.5. Dados de demonstração (seed)

```bash
npm run db:seed:dev
```

Executa `prisma/seed-dev.ts`, que **apaga o conteúdo do banco** e cria dados de demonstração de todos os módulos:
setores, usuários com permissões, chamados, reservas, patrimônio, cursos, turmas, notas, cobranças, cursos do
Boost e arquivos de demonstração cifrados. As credenciais das contas criadas são exibidas ao final da execução.

### 2.6. Inicialização do backend

```bash
npm run start:dev
```

Detalhes de execução (porta e registros) em `03-execucao.md`.

## 3. Frontend

### 3.1. Instalação das dependências

```bash
cd RoosterOneFrontEnd-main
npm install
```

### 3.2. Endereço da API (opcional)

O frontend adota `http://localhost:3000` como valor padrão de `VITE_API_URL` (`src/services/hub/client.ts`).
Se o backend estiver em outro endereço, crie um `.env` (ou `.env.local`) na raiz do frontend:

```bash
VITE_API_URL=http://localhost:3000
```

### 3.3. Inicialização do frontend

```bash
npm run dev
```

Detalhes de porta em `03-execucao.md`.

## Resumo dos comandos (backend)

Todos os comandos abaixo constam do `package.json`:

| Finalidade | Comando |
|---|---|
| Instalar dependências | `npm install` |
| Gerar o cliente do Prisma | `npm run prisma:generate` |
| Aplicar migrations (desenvolvimento) | `npm run prisma:migrate` |
| Aplicar migrations (produção) | `npm run prisma:deploy` |
| Popular dados de demonstração | `npm run db:seed:dev` |
| Executar em desenvolvimento | `npm run start:dev` |
| Compilar para produção | `npm run build` |
| Executar a compilação de produção | `npm run start:prod` |
| Testes unitários | `npm test` |
| Testes end-to-end | `npm run test:e2e` |
| Todos os testes | `npm run test:all` |
| Auditoria de dependências de produção | `npm run audit` |
| Teste de carga (detecção de regressão) | `npm run load-test` |

## Resumo dos comandos (frontend)

| Finalidade | Comando |
|---|---|
| Instalar dependências | `npm install` |
| Executar em desenvolvimento | `npm run dev` |
| Compilar (alvo padrão: Cloudflare Workers) | `npm run build` |
| Compilar para servidor Node.js | `NITRO_PRESET=node-server npm run build` (no PowerShell: `$env:NITRO_PRESET="node-server"; npm run build`) |
| Servir a compilação localmente | `npm run preview` |
| Testes | `npm test` |
| Verificação de estilo | `npm run lint` |
| Formatação do código | `npm run format` |
| Auditoria de dependências de produção | `npm run audit` |
