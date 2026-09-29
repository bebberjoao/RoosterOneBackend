# Deploy

Status: setembro/2026. O **caminho oficial de implantação é instalação nativa em Windows Server**, com PostgreSQL dedicado ao sistema. O container existe e funciona, mas está posicionado como ambiente de desenvolvimento e avaliação — ver "Por que não container" no fim.

O que ainda não existe é o ambiente provisionado: as máquinas de teste foram definidas, mas nenhuma instalação foi feita.

## Pré-requisitos no servidor

Dimensionamento de CPU/RAM/disco (medido, não chutado) em `docs/operations/08-requisitos-de-hardware.md`.

| Item | Observação |
|---|---|
| Windows Server | Ambiente alvo definido para os locais de teste |
| PostgreSQL para Windows (16+) | **Dedicado ao sistema** — não compartilhado com outra aplicação |
| Node.js 22 LTS | Necessário para rodar o backend (e o frontend, se ele for servido pela mesma máquina) |
| NSSM ou `node-windows` | Para manter o processo vivo e subir após reboot — ver "Rodando como serviço" |

A pasta `bin` do PostgreSQL precisa estar no `PATH` (normalmente `C:\Program Files\PostgreSQL\16\bin`), senão `pg_dump`/`pg_restore` não são encontrados pelos scripts de backup.

## Instalação do backend

```powershell
# 1. Código no servidor (cópia ou git clone), e dependências de produção
npm ci --omit=dev

# 2. Client do Prisma e schema do banco
npx prisma generate
npx prisma migrate deploy

# 3. Build
npm run build

# 4. Dados iniciais — só na primeira instalação
npm run db:seed:dev
```

### Variáveis de ambiente

Em Windows, há duas formas, e a escolha importa:

- **`.env` na raiz da aplicação** — simples, e é o que os scripts de backup também leem. Aceitável para os ambientes de teste.
- **Variáveis de sistema** (`[Environment]::SetEnvironmentVariable(..., 'Machine')`) — preferível quando a aplicação roda como serviço, porque o serviço não depende do diretório de trabalho.

Obrigatórias: `DATABASE_URL` e `JWT_SECRET`. A aplicação **se recusa a subir sem `JWT_SECRET`**, de propósito. Gere um valor longo e aleatório:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Ver `01-configuracao.md` para a lista completa.

## Rodando como serviço

`npm run start:prod` sozinho **não se recupera de falha nem volta depois de reiniciar a máquina** — esse é o ponto que mais frequentemente falta numa instalação Windows. Duas opções:

### NSSM (recomendado)

```powershell
nssm install RoosterOneAPI "C:\Program Files\nodejs\node.exe" "C:\rooster\backend\dist\src\main.js"
nssm set RoosterOneAPI AppDirectory C:\rooster\backend
nssm set RoosterOneAPI AppEnvironmentExtra DATABASE_URL=postgresql://... JWT_SECRET=...
nssm set RoosterOneAPI Start SERVICE_AUTO_START
nssm start RoosterOneAPI
```

`AppDirectory` é obrigatório: a aplicação grava em `uploads/` por caminho relativo ao diretório de trabalho, e sem isso os arquivos vão parar no lugar errado.

### node-windows

Alternativa em JavaScript, útil se preferir versionar a configuração do serviço junto do código, em vez de depender de um executável externo.

## Frontend

Se o frontend for servido pela **mesma máquina**, ele também precisa de Node — o build usa Nitro e não é estático puro:

```powershell
npm ci
$env:VITE_API_URL="http://servidor:3000"; npm run build
node .output/server/index.mjs
```

E, como o backend, precisa de um serviço próprio para sobreviver a reboot — **são dois serviços, não um**.

Duas observações sobre `VITE_API_URL`:

- Leva **só o host, sem `/v1`** — o prefixo de versão é acrescentado pelo cliente HTTP, e a mesma base é usada pelos WebSockets, que não são versionados.
- É variável de **build**: mudar o endereço da API exige **reconstruir**, não apenas reiniciar.

Se preferir IIS na frente (para HTTPS e porta 80/443), ele atua como proxy reverso para os dois processos Node — o que também resolve o item de HTTPS, hoje em aberto.

## Ordem do deploy, quando há mudança de schema

Migration **antes** da nova versão subir, sempre:

```powershell
# 1. backup — antes de qualquer migration (ver 06-backup-e-recuperacao.md)
.\scripts\backup.ps1

# 2. parar o serviço
nssm stop RoosterOneAPI

# 3. atualizar código, dependências e schema
npm ci --omit=dev
npx prisma migrate deploy
npm run build

# 4. subir e conferir
nssm start RoosterOneAPI
curl http://localhost:3000/health
```

A ordem importa porque as migrations deste projeto são aditivas na maior parte, mas nem todas: subir código novo contra schema antigo quebra imediatamente. Ver o procedimento de mudança de schema em `docs/engineering/13-governanca.md`.

## Rollback

Da aplicação: voltar o código à versão anterior, `npm ci --omit=dev`, `npm run build`, reiniciar o serviço.

**Do banco é o caso difícil, e precisa ser dito com clareza**: o Prisma não gera migration de reversão. Desfazer uma mudança de schema significa restaurar o backup tomado antes dela (`06-backup-e-recuperacao.md`) — e tudo que foi gravado depois se perde. É exatamente por isso que o passo 1 do deploy é o backup.

Na prática, a estratégia segura é preferir migration aditiva (coluna nova opcional, tabela nova) e deixar a remoção para um deploy seguinte, quando a versão anterior já não estiver em uso.

## Por que não container

O `Dockerfile` e o `docker-compose.yml` continuam no repositório e funcionam — são úteis para subir o sistema inteiro numa máquina de desenvolvimento com um comando, e é assim que estão documentados em `05-cicd.md`.

Para os servidores de teste, porém, a escolha foi instalação nativa, por razões operacionais:

- **Windows Server + Docker Desktop traz atrito real** (WSL2, e a questão de licenciamento comercial do Desktop) que não agrega nada aqui.
- **O PostgreSQL é dedicado ao sistema**, então o Postgres embutido no compose — que existia justamente para não conflitar com banco de terceiros — deixa de ter propósito.
- Quem administra um servidor Windows tende a operar com mais segurança um serviço registrado do que containers.

Se o cenário mudar (servidor Linux, ou vários ambientes a manter em paralelo), o caminho do container já está pronto e testado no CI.

## O que falta para isto virar rotina

- Provisionar as máquinas e instalar os pré-requisitos.
- HTTPS (via IIS como proxy reverso, ou certificado direto no Node).
- Cofre de segredos em lugar de `.env`/variável de máquina.
- Agendar o backup (Agendador de Tarefas chamando `backup.ps1`) e **testar a restauração** antes do primeiro uso real.

Todos no Índice de Pendências.
