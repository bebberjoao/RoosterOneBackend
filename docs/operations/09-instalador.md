# Instalador para Windows

O instalador automatiza a implantação do Rooster One em um computador Windows, em modo de produção e sem
dependência de Docker: instala os pré-requisitos, cria o banco, gera a configuração, compila os dois projetos e
registra a API e o site para iniciarem automaticamente com o Windows. Destina-se a computadores de avaliação,
laboratório ou servidor local; a implantação em servidor Linux continua descrita em `04-deploy.md`.

Arquivos (repositório do backend):

| Arquivo | Função |
|---|---|
| `scripts/instalador/INSTALAR.bat` | Ponto de entrada: solicita a elevação de administrador e abre o menu |
| `scripts/instalador/instalador.ps1` | Menu e todas as operações (Windows PowerShell 5.1 ou superior) |
| `scripts/instalador/instaladores/` | Opcional: instaladores do Node.js (`node-*.msi`) e do PostgreSQL da EDB (`postgresql-*.exe`) para uso sem internet |
| `.rooster/` (gerada) | Configuração da instalação, lançador dos serviços, logs e senha protegida do superusuário do PostgreSQL |

## Pré-requisitos

- Windows 10 ou 11 (ou Windows Server 2019+), 64 bits, com conta de administrador.
- Os dois repositórios lado a lado na mesma pasta (por exemplo, `TCC\RoosterOneBackend-main` e
  `TCC\RoosterOneFrontEnd-main`). O instalador localiza o frontend pela pasta cujo nome começa com
  `RoosterOneFront`; caso não o encontre, solicita o caminho.
- Internet, para a instalação do Node.js e do PostgreSQL pelo `winget`, **ou** os instaladores colocados em
  `scripts/instalador/instaladores` (ver `LEIAME.txt` na pasta).
- Cerca de 5 GB livres em disco e as portas 3000 (API) e 8080 (site) livres; o instalador verifica as portas e,
  se ocupadas por outro programa, solicita portas alternativas.

## Instalação sem internet (PostgreSQL e Node.js locais)

Para que a instalação dispense a internet, basta baixar o instalador do PostgreSQL para Windows da EDB
(`postgresql-<versão>-windows-x64.exe`) e, se necessário, o do Node.js LTS (`node-<versão>-x64.msi`), e colocá-los,
sem renomear, em `scripts/instalador/instaladores`. Também são aceitos na pasta `scripts/instalador`, na raiz do
backend ou na pasta que contém os dois repositórios; havendo mais de um, é utilizado o de versão mais recente. Os
arquivos têm prioridade sobre o `winget` e são ignorados quando o programa já está instalado. O PostgreSQL é
instalado em modo silencioso (`--mode unattended --unattendedmodeui none`), sem nenhuma interação, na porta 5432 e
com senha aleatória para o superusuário. A opção 5 do menu informa qual arquivo será utilizado. Os executáveis não
são versionados no Git.

## Uso

Duplo clique em `scripts\instalador\INSTALAR.bat` e confirmação da elevação de administrador. O menu oferece:

| Opção | Ação |
|---|---|
| 1. Instalação completa | Executa todas as etapas descritas a seguir |
| 2. Iniciar o sistema | Inicia as tarefas da API e do site, aguarda a resposta de ambos e abre o navegador |
| 3. Parar o sistema | Encerra as tarefas e os processos do Node.js do Rooster One |
| 4. Ver situação | Exibe Node.js, PostgreSQL, `.env`, tarefas de início automático e a resposta da API e do site |
| 5. Verificar pré-requisitos | Igual à situação, acrescida de `winget`, portas e espaço em disco; não altera nada |
| 6. Fazer backup | Executa `scripts/backup.ps1` (banco e arquivos) para a pasta `backups` |
| 7. Restaurar dados de demonstração | Apaga todos os dados e carrega o seed de demonstração (exige digitar `APAGAR`) |
| 8. Desinstalar | Remove o início automático e o atalho; opcionalmente exclui o banco |

As mesmas ações podem ser executadas sem o menu, em PowerShell como administrador:
`.\scripts\instalador\instalador.ps1 -Acao Instalar` (ações: `Instalar`, `Iniciar`, `Parar`, `Status`,
`Verificar`, `Backup`, `Demonstracao` e `Desinstalar`).

## Etapas da instalação completa

1. **Portas**: verifica se 3000 e 8080 estão livres; porta ocupada pelo próprio Rooster One (por exemplo, o
   servidor de desenvolvimento) é liberada adiante, e porta ocupada por outro programa exige porta alternativa.
2. **Node.js**: mantém a versão instalada, se for a 20 ou superior; caso contrário, instala a versão LTS (pasta
   `instaladores` ou `winget install OpenJS.NodeJS.LTS`).
3. **PostgreSQL**: mantém a instalação existente (`C:\Program Files\PostgreSQL\<versão>`); caso não exista,
   instala o PostgreSQL 16 em modo silencioso, com senha aleatória para o superusuário `postgres`, guardada em
   `.rooster\postgres-superusuario.xml`, protegida pelo Windows (DPAPI: legível apenas pelo usuário que instalou).
   O serviço é configurado para início automático.
4. **Configuração**: cria o `.env` do backend a partir do `.env.example`, se ausente, e gera `JWT_SECRET` e
   `FILE_ENCRYPTION_KEY` aleatórios quando ausentes ou com o valor de exemplo. **Segredos existentes nunca são
   substituídos**: a troca da `FILE_ENCRYPTION_KEY` tornaria ilegíveis os arquivos já enviados. Define `PORT` e
   `FRONTEND_URL` no backend e `VITE_API_URL` no frontend, conforme as portas escolhidas.
5. **Banco**: se o `DATABASE_URL` do `.env` já conecta, o banco é mantido. Caso contrário, cria (ou redefine a
   senha de) o usuário `rooster` e o banco `rooster_one`, com senha aleatória gravada no `DATABASE_URL`. Nessa
   situação, a senha do superusuário `postgres` é solicitada, salvo quando o PostgreSQL foi instalado pelo próprio
   instalador.
6. **Compilação**: `npm ci`, `prisma generate` e `npm run build` no backend; `npm ci` e `npm run build` no frontend
   com `NITRO_PRESET=node-server`. Sem esse ajuste, o build do frontend gera pacote para Cloudflare Workers (padrão
   do template), que não executa no Node.js local; com ele, gera servidor Node em `.output/server/index.mjs`.
7. **Migrations**: `prisma migrate deploy`.
8. **Dados de demonstração**: oferecidos apenas quando o banco está vazio (sem usuários), mediante confirmação.
9. **Início automático**: gera `.rooster\iniciar-servico.ps1` e registra no Agendador de Tarefas as tarefas
   **Rooster One - API** e **Rooster One - Site**, executadas como `SYSTEM` na inicialização do Windows, sem limite
   de tempo. O lançador executa o Node.js em laço: em caso de queda, o processo é reiniciado em 5 segundos. A API
   roda com `NODE_ENV=production` (CORS restrito a `FRONTEND_URL` e Swagger desativado, salvo
   `SWAGGER_ENABLED=true`). Os logs ficam em `.rooster\logs\api.log` e `site.log`, alternados ao passar de 10 MB.
10. **Atalho**: cria **Rooster One** na área de trabalho pública, apontando para `http://localhost:8080`.
11. **Início**: inicia as duas tarefas, aguarda a resposta de `GET /health` e da tela de login e abre o navegador.

A instalação pode ser repetida sobre uma instalação existente (por exemplo, após atualizar o código): dados,
segredos e banco são preservados, e somente a compilação e as migrations são refeitas.

## Atualização do sistema

1. Opção 3 (parar).
2. Atualização do código dos dois repositórios (`git pull` ou substituição das pastas, preservando o `.env` do
   backend e a pasta `uploads`).
3. Opção 1 (instalação completa), que recompila, aplica as novas migrations e reinicia o sistema.

## Desinstalação

A opção 8 remove as tarefas de início automático e o atalho e, mediante confirmação, exclui o banco configurado no
`DATABASE_URL` (e o respectivo usuário, exceto `postgres`). Código-fonte, `.env`, `uploads` e `backups` são
mantidos. Node.js e PostgreSQL permanecem instalados e podem ser removidos em "Aplicativos instalados" do Windows.

## Limitações

- O site é servido em `http://localhost`; o acesso por outros computadores da rede exige ajustar `VITE_API_URL`
  (frontend) e `FRONTEND_URL`/`CORS_ORIGINS` (backend) para o endereço da máquina, recompilar o frontend e liberar
  as portas no firewall do Windows.
- Não há HTTPS: o instalador destina-se a uso local ou em rede interna confiável (ver `04-deploy.md`).
- O backup não é agendado automaticamente; utilize a opção 6 periodicamente ou agende `scripts/backup.ps1`.
- A cópia do `.env` do backend deve acompanhar os backups: sem a `FILE_ENCRYPTION_KEY`, os arquivos enviados não
  podem ser lidos (ver `06-backup-e-recuperacao.md`).

## Solução de problemas

| Sintoma | Verificação |
|---|---|
| A API não responde após iniciar | `.rooster\logs\api.log`; causas comuns: banco parado (serviço `postgresql-x64-*`) ou `.env` incompleto |
| O site não responde | `.rooster\logs\site.log`; confirme que a compilação gerou `.output\server\index.mjs` no frontend |
| "Acesso negado" ao executar `.ps1` diretamente | Utilize `INSTALAR.bat`, que aplica `-ExecutionPolicy Bypass` e solicita elevação |
| Senha do `postgres` desconhecida (PostgreSQL instalado anteriormente) | Redefina-a pelo pgAdmin ou informe um `DATABASE_URL` válido no `.env` antes de instalar |
| Porta ocupada | A opção 5 identifica o programa; a instalação permite escolher outra porta |
