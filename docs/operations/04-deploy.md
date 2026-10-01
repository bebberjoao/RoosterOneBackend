# Implantação

Situação em 30/09/2026: o **procedimento oficial de implantação é a instalação nativa em Windows Server**, com
PostgreSQL dedicado ao sistema. A conteinerização existe e funciona, mas é destinada a desenvolvimento e
avaliação (ver "Instalação nativa em vez de container", ao final).

O ambiente ainda não foi provisionado: as máquinas de teste foram definidas, sem instalação realizada.

## Pré-requisitos no servidor

O dimensionamento de CPU, memória e disco, fundamentado em medição, está em
`docs/operations/08-requisitos-de-hardware.md`.

| Item | Observação |
|---|---|
| Windows Server | Ambiente-alvo definido para os locais de teste. |
| PostgreSQL para Windows (16 ou superior) | **Dedicado ao sistema**, não compartilhado com outras aplicações. |
| Node.js 22 LTS | Necessário para o backend e para o servidor do frontend. |
| NSSM ou `node-windows` | Execução como serviço, com reinício automático após falha ou reinicialização da máquina (ver "Execução como serviço"). |

A pasta `bin` do PostgreSQL deve constar do `PATH` (por exemplo, `C:\Program Files\PostgreSQL\16\bin`), para que
os scripts de backup localizem `pg_dump` e `pg_restore`.

## Instalação do backend

```powershell
# 1. Código no servidor (cópia ou git clone) e dependências de produção
npm ci --omit=dev

# 2. Cliente do Prisma e esquema do banco
npx prisma generate
npx prisma migrate deploy

# 3. Compilação
npm run build

# 4. Dados iniciais — somente na primeira instalação
npm run db:seed:dev
```

O seed cria contas de demonstração com senhas conhecidas e **apaga o conteúdo existente do banco** antes de
populá-lo. Deve ser executado apenas na primeira instalação; em ambiente com usuários reais, as senhas das contas
de demonstração devem ser alteradas ou as contas, desativadas.

### Variáveis de ambiente

No Windows, há duas formas de definição:

- **`.env` na raiz da aplicação**: simples e também lido pelos scripts de backup. Adequado aos ambientes de
  teste.
- **Variáveis de sistema** (`[Environment]::SetEnvironmentVariable(..., 'Machine')`): preferível quando a
  aplicação é executada como serviço, por não depender do diretório de trabalho.

Obrigatórias: `DATABASE_URL`, `JWT_SECRET` e `FILE_ENCRYPTION_KEY` — a aplicação não inicia sem as duas últimas.
Para produção, devem ser definidas também `NODE_ENV=production` e `FRONTEND_URL` com o endereço público do
frontend (ou `CORS_ORIGINS`), pois em produção o CORS aceita apenas as origens configuradas. Geração dos
segredos:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"   # JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"      # FILE_ENCRYPTION_KEY
```

A `FILE_ENCRYPTION_KEY` deve ser guardada em local seguro, separado do servidor: sem ela, os arquivos enviados
não podem ser decifrados (ver `06-backup-e-recuperacao.md`). A lista completa de variáveis está em
`01-configuracao.md`.

## Execução como serviço

`npm run start:prod`, isoladamente, **não se recupera de falhas nem retorna após a reinicialização da máquina**.
Há duas opções:

### NSSM (recomendado)

```powershell
nssm install RoosterOneAPI "C:\Program Files\nodejs\node.exe" "C:\rooster\backend\dist\src\main.js"
nssm set RoosterOneAPI AppDirectory C:\rooster\backend
nssm set RoosterOneAPI AppEnvironmentExtra NODE_ENV=production DATABASE_URL=postgresql://... JWT_SECRET=... FILE_ENCRYPTION_KEY=... FRONTEND_URL=https://...
nssm set RoosterOneAPI Start SERVICE_AUTO_START
nssm start RoosterOneAPI
```

`AppDirectory` é obrigatório: as pastas de arquivos são resolvidas a partir do diretório de trabalho quando não
há caminho absoluto configurado; sem essa definição, os arquivos seriam gravados em local indevido.

### node-windows

Alternativa em JavaScript, útil quando se prefere versionar a configuração do serviço junto ao código, sem
depender de executável externo.

## Frontend

O frontend utiliza renderização no servidor (TanStack Start com Nitro) e **não pode ser publicado apenas como
arquivos estáticos**: o build não gera `index.html`. O build padrão (`npm run build`) produz um Worker para a
Cloudflare (preset `cloudflare-module`), cujo pacote não inicia servidor ao ser executado pelo Node.js. Para o
servidor Windows, o build deve ser gerado com o preset `node-server`:

```powershell
npm ci
$env:NITRO_PRESET = "node-server"
$env:VITE_API_URL = "https://api.instituicao.edu.br"
npm run build
$env:PORT = "8080"; node .output/server/index.mjs
```

O servidor do frontend também deve ser registrado como serviço (NSSM), com `PORT` definido e `AppDirectory`
apontando para a pasta do frontend: **são dois serviços**, API e frontend. Verificado em 30/09/2026: com o
preset `node-server`, o processo atende as páginas com HTTP 200 e consome cerca de 46 MB de memória em repouso.

Observações sobre `VITE_API_URL`:

- Recebe **somente o endereço, sem `/v1`**: o prefixo de versão é acrescentado pelo cliente HTTP, e o mesmo
  endereço é usado pelos WebSockets, que não são versionados.
- É variável de **compilação**: a alteração do endereço da API exige nova compilação, e não apenas reinício.

Alternativamente, o frontend pode ser publicado na Cloudflare (`npx wrangler deploy`, com o build padrão), sem
servidor próprio para ele; essa opção depende de conta na Cloudflare.

O IIS pode atuar como proxy reverso para os dois processos Node.js, provendo HTTPS e as portas 80 e 443 — o que
também resolve a pendência de HTTPS.

## Ordem da implantação com mudança de esquema

A migration é sempre aplicada **antes** da inicialização da nova versão:

```powershell
# 1. Backup — antes de qualquer migration (ver 06-backup-e-recuperacao.md)
.\scripts\backup.ps1

# 2. Interrupção do serviço
nssm stop RoosterOneAPI

# 3. Atualização de código, dependências e esquema
npm ci --omit=dev
npx prisma migrate deploy
npm run build

# 4. Inicialização e verificação
nssm start RoosterOneAPI
curl http://localhost:3000/health
```

A ordem é necessária porque, embora a maioria das migrations do projeto seja aditiva, nem todas o são: código
novo executado contra esquema antigo falha imediatamente. Ver o procedimento de mudança de esquema em
`docs/engineering/13-governanca.md`.

## Reversão (rollback)

Da aplicação: retorno do código à versão anterior, seguido de `npm ci --omit=dev`, `npm run build` e reinício do
serviço.

**Do banco de dados, o caso é mais restrito**: o Prisma não gera migration de reversão. Desfazer uma mudança de
esquema implica restaurar o backup realizado antes dela (`06-backup-e-recuperacao.md`), com perda de tudo o que
foi gravado depois. Por esse motivo, o backup é a primeira etapa da implantação.

A estratégia segura é preferir migrations aditivas (coluna nova opcional, tabela nova) e postergar remoções para
uma implantação posterior, quando a versão anterior não estiver mais em uso.

## Instalação nativa em vez de container

O `Dockerfile` e o `docker-compose.yml` permanecem no repositório e funcionam; são úteis para iniciar o sistema
completo em uma máquina de desenvolvimento com um único comando, conforme `05-cicd.md`.

Para os servidores de teste, optou-se pela instalação nativa, por razões operacionais:

- **Docker Desktop em Windows Server acarreta dificuldades adicionais** (WSL2 e licenciamento comercial) sem
  benefício correspondente neste caso.
- **O PostgreSQL é dedicado ao sistema**, o que torna desnecessário o banco embutido no compose, criado para
  evitar conflito com bancos de terceiros.
- A administração de serviços registrados tende a ser mais segura, para equipes de servidores Windows, do que a
  operação de containers.

Se o cenário mudar (servidor Linux, ou vários ambientes mantidos em paralelo), o caminho por container está
pronto e validado no CI.

## Pendências para a operação rotineira

- Provisionamento das máquinas e instalação dos pré-requisitos.
- HTTPS (IIS como proxy reverso, ou certificado configurado diretamente no Node.js).
- Cofre de segredos em substituição ao `.env` e às variáveis de máquina.
- Agendamento do backup (Agendador de Tarefas executando `backup.ps1`) e **teste de restauração** antes do
  primeiro uso real.

Todas constam do Índice de Pendências.
