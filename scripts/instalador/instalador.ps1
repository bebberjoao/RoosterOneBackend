<#
  Instalador do Rooster One para Windows — motor da instalação e menu de console.

  Instala os pré-requisitos (Node.js LTS e PostgreSQL), cria o banco sem pedir nenhuma senha, gera a configuração
  (.env) com segredos aleatórios, compila o backend e o frontend, aplica as migrations, prepara os dados iniciais
  (catálogo de permissões e administrador; opcionalmente, os dados de demonstração) e registra a API e o site para
  iniciarem automaticamente com o Windows (Agendador de Tarefas).

  Uso: execute INSTALAR.bat (pede elevação de administrador e abre a tela do instalador, instalador-tela.ps1) ou,
  no PowerShell como administrador:
    .\scripts\instalador\instalador.ps1                 # menu de console
    .\scripts\instalador\instalador.ps1 -Acao Status    # ações: Instalar, Iniciar, Parar, Status, Verificar,
                                                         #        Backup, Demonstracao, Desinstalar

  A tela (instalador-tela.ps1) carrega este arquivo com ". .\instalador.ps1" e executa os mesmos passos, recebendo
  o andamento por $global:RoosterRelator.

  Estrutura esperada: o repositório do frontend na mesma pasta que o do backend (por exemplo,
  TCC\RoosterOneBackend-main e TCC\RoosterOneFrontEnd-main). Documentação: docs/operations/09-instalador.md.
#>
[CmdletBinding()]
param(
    [ValidateSet('', 'Instalar', 'Iniciar', 'Parar', 'Status', 'Verificar', 'Backup', 'Demonstracao', 'Desinstalar')]
    [string]$Acao = ''
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

# ---------------------------------------------------------------------------------------------------------------
# Caminhos e configuração persistida
# ---------------------------------------------------------------------------------------------------------------
$Back = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Dados = Join-Path $Back '.rooster'
$Logs = Join-Path $Dados 'logs'
$ArqConfig = Join-Path $Dados 'instalacao.json'
$ArqCredPg = Join-Path $Dados 'postgres-superusuario.xml'
$ArqPrimeiroAcesso = Join-Path $Dados 'primeiro-acesso.txt'
$Instaladores = Join-Path $PSScriptRoot 'instaladores'

# O banco criado pelo instalador fica fora da pasta do código: substituir ou apagar o repositório em uma
# atualização não pode levar os dados junto.
$PastaComum = Join-Path $env:ProgramData 'RoosterOne'
$PastaCluster = Join-Path $PastaComum 'pgdata'
$ArqSuperCluster = Join-Path $PastaComum 'superusuario.bin'
$ArqBancoComum = Join-Path $PastaComum 'banco.json'
$ServicoBanco = 'RoosterOnePostgres'

$TarefaApi = 'Rooster One - API'
$TarefaSite = 'Rooster One - Site'
$TarefaBanco = 'Rooster One - Banco'
$Atalho = Join-Path ([Environment]::GetFolderPath('CommonDesktopDirectory')) 'Rooster One.url'
# Documentação gerada na instalação: fica ao lado dos repositórios (na raiz do pacote de instalação).
$PastaDocumentacao = Join-Path (Split-Path $Back -Parent) 'documentacao'
$AtalhoDocumentacao = Join-Path ([Environment]::GetFolderPath('CommonDesktopDirectory')) 'Rooster One - Documentação.lnk'

function Ler-Config {
    $padrao = [ordered]@{ PortaApi = 3000; PortaSite = 8080; Frontend = ''; Node = ''; Banco = $null }
    if (Test-Path $ArqConfig) {
        $salvo = Get-Content $ArqConfig -Raw | ConvertFrom-Json
        foreach ($p in $salvo.PSObject.Properties) { $padrao[$p.Name] = $p.Value }
    }
    # O registro do banco próprio também fica em ProgramData: uma cópia nova do repositório o reencontra.
    if (-not $padrao.Banco -and (Test-Path $ArqBancoComum)) { $padrao.Banco = Get-Content $ArqBancoComum -Raw | ConvertFrom-Json }
    return $padrao
}
function Salvar-Config($cfg) {
    New-Item -ItemType Directory -Force $Dados | Out-Null
    ($cfg | ConvertTo-Json -Depth 4) | Set-Content -Path $ArqConfig -Encoding UTF8
    if ($cfg.Banco -and $cfg.Banco.Tipo -eq 'proprio') {
        New-Item -ItemType Directory -Force $PastaComum | Out-Null
        ($cfg.Banco | ConvertTo-Json) | Set-Content -Path $ArqBancoComum -Encoding UTF8
    }
}

# ---------------------------------------------------------------------------------------------------------------
# Saída: console ou tela
# ---------------------------------------------------------------------------------------------------------------
# Com $global:RoosterRelator definido (tela do instalador), todo o andamento é entregue a ele em vez de ser
# escrito no console: { param($tipo, $texto, $dados) ... }. Tipos: titulo, ok, info, aviso, erro, log,
# passo-inicio, passo-fim e resultado.
function Emitir($tipo, $texto, $dados) {
    if ($tipo -eq 'aviso') { $global:RoosterAvisoNoPasso = $true }
    if ($global:RoosterRelator) { & $global:RoosterRelator $tipo $texto $dados; return }
    switch ($tipo) {
        'titulo' { Write-Host ''; Write-Host "== $texto ==" -ForegroundColor Cyan }
        'ok' { Write-Host "  [OK] $texto" -ForegroundColor Green }
        'info' { Write-Host "  ... $texto" }
        'aviso' { Write-Host "  [!] $texto" -ForegroundColor Yellow }
        'erro' { Write-Host "  [ERRO] $texto" -ForegroundColor Red }
        'log' { Write-Host "      $texto" -ForegroundColor DarkGray }
    }
}
function Titulo($t) { Emitir 'titulo' $t }
function Ok($t) { Emitir 'ok' $t }
function Info($t) { Emitir 'info' $t }
function Aviso($t) { Emitir 'aviso' $t }
function Falha($t) { Emitir 'erro' $t }

function Confirmar($pergunta) {
    $r = Read-Host "  $pergunta (s/n)"
    return ($r -match '^(s|sim|y|yes)$')
}

function E-Admin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    return (New-Object Security.Principal.WindowsPrincipal $id).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}
function Exigir-Admin {
    if (-not (E-Admin)) { throw 'Esta operação exige o PowerShell executado como administrador (use INSTALAR.bat).' }
}

function Atualizar-Path {
    $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
}

function Gerar-Segredo([int]$bytes) {
    $b = New-Object byte[] $bytes
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
    return [Convert]::ToBase64String($b)
}
function Gerar-Senha([int]$tamanho = 24) {
    # Apenas letras e dígitos: a senha entra na URL de conexão do Prisma sem precisar de codificação.
    $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'.ToCharArray()
    $b = New-Object byte[] $tamanho
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
    return -join ($b | ForEach-Object { $chars[$_ % $chars.Length] })
}

# Segredo protegido pelo Windows (DPAPI) no escopo da máquina: legível por qualquer administrador deste
# computador, e por ninguém fora dele. Usado para a senha do superusuário do banco próprio, que precisa
# continuar acessível mesmo que a instalação seja refeita por outro usuário.
function Proteger-Segredo($texto, $arquivo) {
    Add-Type -AssemblyName System.Security
    $bytes = [Security.Cryptography.ProtectedData]::Protect([Text.Encoding]::UTF8.GetBytes($texto), $null, 'LocalMachine')
    New-Item -ItemType Directory -Force (Split-Path $arquivo -Parent) | Out-Null
    [IO.File]::WriteAllBytes($arquivo, $bytes)
}
function Ler-Segredo($arquivo) {
    Add-Type -AssemblyName System.Security
    $bytes = [Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($arquivo), $null, 'LocalMachine')
    return [Text.Encoding]::UTF8.GetString($bytes)
}

# Executa um programa de linha de comando, repassa cada linha da saída ao andamento e falha se o código de
# saída não for zero.
function Executar($exe, [string[]]$argumentos, $pasta) {
    # Avisos que programas externos escrevem no canal de erro não devem interromper o instalador (no PowerShell 5.1,
    # com saída redirecionada, eles viram exceção); o critério de falha é apenas o código de saída.
    $ErrorActionPreference = 'Continue'
    $anteriores = @{}
    foreach ($v in 'NO_COLOR', 'FORCE_COLOR', 'npm_config_progress', 'npm_config_update_notifier', 'PRISMA_HIDE_UPDATE_MESSAGE') { $anteriores[$v] = [Environment]::GetEnvironmentVariable($v) }
    $env:NO_COLOR = '1'; $env:FORCE_COLOR = '0'; $env:npm_config_progress = 'false'; $env:npm_config_update_notifier = 'false'; $env:PRISMA_HIDE_UPDATE_MESSAGE = '1'
    Push-Location $pasta
    try {
        & $exe @argumentos 2>&1 | ForEach-Object {
            $linha = ("$_" -replace "\x1b\[[0-9;?]*[ -/]*[@-~]", '').TrimEnd()
            if ($linha.Trim()) { Emitir 'log' $linha }
        }
        if ($LASTEXITCODE -ne 0) { throw "Falha ao executar: $(Split-Path $exe -Leaf) $($argumentos -join ' ') (código $LASTEXITCODE)" }
    } finally {
        Pop-Location
        foreach ($v in $anteriores.Keys) { [Environment]::SetEnvironmentVariable($v, $anteriores[$v]) }
    }
}

# ---------------------------------------------------------------------------------------------------------------
# Instaladores locais (uso sem internet)
# ---------------------------------------------------------------------------------------------------------------
# Procura o instalador baixado em vários lugares, para que baste colocá-lo em qualquer um deles: a pasta
# "instaladores", a própria pasta do instalador, a raiz do backend, a pasta que contém os dois repositórios ou a
# subpasta "pacotes" dela (estrutura do pacote de instalação gerado por montar-pacote.ps1).
# Havendo mais de um, usa o de versão mais recente.
function Procurar-Instalador($padrao) {
    $pastas = @($Instaladores, $PSScriptRoot, $Back, (Split-Path $Back -Parent), (Join-Path (Split-Path $Back -Parent) 'pacotes')) | Select-Object -Unique
    $achados = foreach ($p in $pastas) { Get-ChildItem $p -Filter $padrao -File -ErrorAction SilentlyContinue }
    if (-not $achados) { return $null }
    return $achados | Sort-Object { [regex]::Matches($_.Name, '\d+') | ForEach-Object { $_.Value.PadLeft(6, '0') } | Out-String } -Descending |
        Select-Object -First 1
}

# ---------------------------------------------------------------------------------------------------------------
# Localização do frontend
# ---------------------------------------------------------------------------------------------------------------
function Localizar-Frontend($cfg) {
    if ($cfg.Frontend -and (Test-Path (Join-Path $cfg.Frontend 'package.json'))) { return $cfg.Frontend }
    $pai = Split-Path $Back -Parent
    $candidato = Get-ChildItem $pai -Directory | Where-Object { $_.Name -like 'RoosterOneFront*' -and (Test-Path (Join-Path $_.FullName 'package.json')) } | Select-Object -First 1
    if ($candidato) { return $candidato.FullName }
    return $null
}

# ---------------------------------------------------------------------------------------------------------------
# .env
# ---------------------------------------------------------------------------------------------------------------
function Ler-Env($arquivo) {
    $mapa = [ordered]@{}
    if (Test-Path $arquivo) {
        foreach ($linha in Get-Content $arquivo) {
            if ($linha -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') { $mapa[$Matches[1]] = $Matches[2].Trim().Trim('"') }
        }
    }
    return $mapa
}

# Define (ou acrescenta) uma variável no .env, preservando as demais linhas e os comentários.
function Definir-Env($arquivo, $chave, $valor) {
    $linhas = @()
    if (Test-Path $arquivo) { $linhas = @(Get-Content $arquivo) }
    $nova = "$chave=`"$valor`""
    $achou = $false
    for ($i = 0; $i -lt $linhas.Count; $i++) {
        if ($linhas[$i] -match "^\s*$chave\s*=") { $linhas[$i] = $nova; $achou = $true }
    }
    if (-not $achou) { $linhas += $nova }
    [IO.File]::WriteAllLines($arquivo, [string[]]$linhas, (New-Object Text.UTF8Encoding $false))
}

# ---------------------------------------------------------------------------------------------------------------
# Node.js
# ---------------------------------------------------------------------------------------------------------------
function Versao-Node {
    $ErrorActionPreference = 'Continue'
    $cmd = Get-Command node -ErrorAction SilentlyContinue
    if (-not $cmd) { return $null }
    $v = (& $cmd.Source -v) -replace '^v', ''
    return @{ Caminho = $cmd.Source; Versao = $v; Maior = [int]($v.Split('.')[0]) }
}

function Garantir-Node($cfg) {
    $ErrorActionPreference = 'Continue'
    Atualizar-Path
    $n = Versao-Node
    if ($n -and $n.Maior -ge 20) { Ok "Node.js $($n.Versao) encontrado ($($n.Caminho))"; $cfg.Node = $n.Caminho; return }
    if ($n) { Aviso "Node.js $($n.Versao) é anterior à versão 20; será instalada a versão LTS." }
    $msi = Procurar-Instalador 'node-*.msi'
    if ($msi) {
        Info "Instalando $($msi.Name) ($($msi.DirectoryName))..."
        $p = Start-Process msiexec.exe -ArgumentList "/i `"$($msi.FullName)`" /qn /norestart" -Wait -PassThru
        if ($p.ExitCode -ne 0) { throw "O instalador do Node.js terminou com código $($p.ExitCode)." }
    } elseif (Get-Command winget -ErrorAction SilentlyContinue) {
        Info 'Instalando Node.js LTS pelo winget (requer internet)...'
        & winget install --id OpenJS.NodeJS.LTS -e --silent --accept-package-agreements --accept-source-agreements --scope machine 2>&1 |
            ForEach-Object { if ("$_".Trim().Length -gt 3) { Emitir 'log' "$_".Trim() } }
    } else {
        throw 'Node.js não encontrado, sem winget e sem instalador node-*.msi (coloque-o em scripts\instalador\instaladores).'
    }
    Atualizar-Path
    $n = Versao-Node
    if (-not $n) {
        $padrao = 'C:\Program Files\nodejs\node.exe'
        if (Test-Path $padrao) { $env:Path = "C:\Program Files\nodejs;$env:Path"; $n = Versao-Node }
    }
    if (-not $n) { throw 'O Node.js foi instalado, mas não foi localizado. Feche e abra novamente o instalador.' }
    Ok "Node.js $($n.Versao) instalado"
    $cfg.Node = $n.Caminho
}

# ---------------------------------------------------------------------------------------------------------------
# PostgreSQL: programa
# ---------------------------------------------------------------------------------------------------------------
function Localizar-Postgres {
    $bins = Get-ChildItem 'C:\Program Files\PostgreSQL' -Directory -ErrorAction SilentlyContinue |
        Where-Object { Test-Path (Join-Path $_.FullName 'bin\psql.exe') } |
        Sort-Object { [int]($_.Name -replace '\D', '') } -Descending
    if (-not $bins) { return $null }
    $dir = $bins[0]
    $servico = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Where-Object { $_.Name -match $dir.Name } | Select-Object -First 1
    if (-not $servico) { $servico = Get-Service -Name 'postgresql*' -ErrorAction SilentlyContinue | Select-Object -First 1 }
    return @{ Bin = (Join-Path $dir.FullName 'bin'); Versao = $dir.Name; Servico = $servico }
}

function Garantir-Postgres {
    $ErrorActionPreference = 'Continue'
    $pg = Localizar-Postgres
    if (-not $pg) {
        $senha = Gerar-Senha 20
        $argsPg = "--mode unattended --unattendedmodeui none --superpassword $senha --serverport 5432"
        $exe = Procurar-Instalador 'postgresql-*.exe'
        if ($exe) {
            Info "Instalando $($exe.Name) em modo silencioso ($($exe.DirectoryName)); leva de 3 a 10 minutos..."
            $p = Start-Process $exe.FullName -ArgumentList $argsPg -Wait -PassThru
            if ($p.ExitCode -ne 0) { throw "O instalador do PostgreSQL terminou com código $($p.ExitCode)." }
        } elseif (Get-Command winget -ErrorAction SilentlyContinue) {
            Info 'Instalando PostgreSQL 16 pelo winget (requer internet; leva alguns minutos)...'
            & winget install --id PostgreSQL.PostgreSQL.16 -e --silent --accept-package-agreements --accept-source-agreements --override $argsPg 2>&1 |
                ForEach-Object { if ("$_".Trim().Length -gt 3) { Emitir 'log' "$_".Trim() } }
        } else {
            throw 'PostgreSQL não encontrado, sem winget e sem instalador postgresql-*.exe (coloque-o em scripts\instalador\instaladores).'
        }
        $pg = Localizar-Postgres
        if (-not $pg) { throw 'O PostgreSQL foi instalado, mas não foi localizado em C:\Program Files\PostgreSQL.' }
        # A senha do superusuário fica protegida pelo Windows (DPAPI): só o usuário que instalou consegue lê-la.
        New-Item -ItemType Directory -Force $Dados | Out-Null
        New-Object Management.Automation.PSCredential('postgres', (ConvertTo-SecureString $senha -AsPlainText -Force)) | Export-Clixml $ArqCredPg
        if ($pg.Servico) {
            if ($pg.Servico.Status -ne 'Running') { Start-Service $pg.Servico.Name -ErrorAction Stop }
            Set-Service $pg.Servico.Name -StartupType Automatic -ErrorAction Stop
        }
        Ok "PostgreSQL $($pg.Versao) instalado (senha do superusuário 'postgres' guardada de forma protegida em .rooster)"
    } else {
        Ok "PostgreSQL $($pg.Versao) encontrado ($($pg.Bin))"
    }
    $env:Path = "$($pg.Bin);$env:Path"
    return $pg
}

# ---------------------------------------------------------------------------------------------------------------
# PostgreSQL: banco do Rooster One
# ---------------------------------------------------------------------------------------------------------------
function Url-Libpq($url) { return ($url -replace '\?.*$', '') }

function Testar-Conexao($pg, $url) {
    $ErrorActionPreference = 'Continue'
    if (-not $url) { return $false }
    $env:PGCONNECT_TIMEOUT = '5'
    try {
        & (Join-Path $pg.Bin 'psql.exe') (Url-Libpq $url) -tAc 'select 1' 2>$null | Out-Null
        return ($LASTEXITCODE -eq 0)
    } finally { Remove-Item Env:PGCONNECT_TIMEOUT -ErrorAction SilentlyContinue }
}

# Executa SQL como superusuário "postgres" em localhost, na porta informada.
function Psql-Super($pg, $senha, $sql, [int]$porta = 5432) {
    $ErrorActionPreference = 'Continue'
    $env:PGPASSWORD = $senha
    $env:PGCONNECT_TIMEOUT = '10'
    try {
        $saida = & (Join-Path $pg.Bin 'psql.exe') -h localhost -p $porta -U postgres -d postgres -w -tAc $sql 2>$null
        if ($LASTEXITCODE -ne 0) { throw "Não foi possível executar o comando no PostgreSQL como `"postgres`" (porta $porta)." }
        return $saida
    } finally {
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
        Remove-Item Env:PGCONNECT_TIMEOUT -ErrorAction SilentlyContinue
    }
}

function Porta-Em-Uso([int]$porta) {
    return [bool](Get-NetTCPConnection -LocalPort $porta -State Listen -ErrorAction SilentlyContinue)
}
function Porta-Livre([int]$inicio) {
    for ($p = $inicio; $p -lt $inicio + 50; $p++) { if (-not (Porta-Em-Uso $p)) { return $p } }
    throw "Nenhuma porta livre entre $inicio e $($inicio + 49)."
}

function Aguardar-Banco($pg, [int]$porta, [int]$segundos) {
    $ErrorActionPreference = 'Continue'
    $fim = (Get-Date).AddSeconds($segundos)
    do {
        & (Join-Path $pg.Bin 'pg_isready.exe') -h localhost -p $porta -q 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { return $true }
        Start-Sleep -Milliseconds 700
    } while ((Get-Date) -lt $fim)
    return $false
}

# Cria um cluster PostgreSQL novo, exclusivo do Rooster One, na pasta e na porta informadas. Não depende de
# nenhuma senha preexistente: o superusuário deste cluster recebe uma senha gerada aqui.
function Criar-Cluster($pg, $pasta, [int]$porta, $senhaSuper) {
    New-Item -ItemType Directory -Force (Split-Path $pasta -Parent) | Out-Null
    $arqSenha = [IO.Path]::GetTempFileName()
    [IO.File]::WriteAllText($arqSenha, $senhaSuper, (New-Object Text.UTF8Encoding $false))
    $initdb = Join-Path $pg.Bin 'initdb.exe'
    $base = @('-D', $pasta, '-U', 'postgres', '-A', 'scram-sha-256', '-E', 'UTF8', "--pwfile=$arqSenha")
    try {
        try { Executar $initdb $base $pg.Bin }
        catch {
            # Em alguns Windows o nome da localidade do sistema não é aceito pelo initdb; a localidade C sempre é.
            Aviso 'A criação do banco com a localidade do sistema falhou; nova tentativa com a localidade padrão (C).'
            if (Test-Path $pasta) { Remove-Item $pasta -Recurse -Force }
            Executar $initdb ($base + '--locale=C') $pg.Bin
        }
    } finally { Remove-Item $arqSenha -Force -ErrorAction SilentlyContinue }
    $conf = "`r`n# Rooster One (instalador)`r`nport = $porta`r`nlisten_addresses = 'localhost'`r`n"
    [IO.File]::AppendAllText((Join-Path $pasta 'postgresql.conf'), $conf, (New-Object Text.UTF8Encoding $false))
}

# Coloca o cluster em execução e o registra para iniciar com o Windows: como serviço (pg_ctl register) ou, se o
# serviço não puder ser criado, como tarefa agendada na inicialização.
function Iniciar-Cluster($pg, $pasta, [int]$porta) {
    $ErrorActionPreference = 'Continue'
    if (Aguardar-Banco $pg $porta 1) { return }
    $pgctl = Join-Path $pg.Bin 'pg_ctl.exe'
    $servico = Get-Service -Name $ServicoBanco -ErrorAction SilentlyContinue
    if (-not $servico -and (E-Admin)) {
        # A porta vai também na linha de comando: um cluster adotado pode não tê-la no postgresql.conf.
        & $pgctl register -N $ServicoBanco -D $pasta -S auto -w -o "-p $porta" 2>&1 | ForEach-Object { Emitir 'log' "$_" }
        $servico = Get-Service -Name $ServicoBanco -ErrorAction SilentlyContinue
        if ($servico) { Info "Serviço do Windows '$ServicoBanco' registrado (início automático)" }
    }
    if ($servico) {
        try { Start-Service $ServicoBanco -ErrorAction Stop } catch { Aviso "O serviço '$ServicoBanco' não iniciou: $($_.Exception.Message)" }
        if (Aguardar-Banco $pg $porta 60) { return }
        Aviso "O serviço '$ServicoBanco' não respondeu; o banco será iniciado por tarefa agendada."
        & $pgctl unregister -N $ServicoBanco 2>&1 | Out-Null
    }
    # Sem serviço: inicia diretamente e, com privilégio de administrador, agenda o início com o Windows.
    $log = Join-Path $pasta 'postgres.log'
    # Sem capturar a saída: o servidor iniciado pelo pg_ctl herdaria o canal de saída, e a leitura nunca terminaria.
    $inicio = Start-Process $pgctl -ArgumentList "start -D `"$pasta`" -l `"$log`" -w -t 60 -o `"-p $porta`"" -WindowStyle Hidden -PassThru
    if (-not $inicio.WaitForExit(90000)) { Aviso 'O pg_ctl não confirmou o início do banco em 90 segundos.' }
    if (E-Admin) {
        $acao = New-ScheduledTaskAction -Execute $pgctl -Argument "start -D `"$pasta`" -l `"$log`" -w -o `"-p $porta`""
        $principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
        Register-ScheduledTask -TaskName $TarefaBanco -Action $acao -Trigger (New-ScheduledTaskTrigger -AtStartup) -Principal $principal `
            -Description 'Rooster One: inicia o banco de dados com o Windows (registrado pelo instalador).' -Force | Out-Null
        Info "Tarefa '$TarefaBanco' registrada (início automático)"
    }
    if (-not (Aguardar-Banco $pg $porta 60)) { throw "O banco de dados não iniciou; consulte $log." }
}

function Garantir-Usuario-E-Banco($pg, $senhaSuper, [int]$porta) {
    $senha = Gerar-Senha 24
    if (Psql-Super $pg $senhaSuper "select 1 from pg_roles where rolname = 'rooster'" $porta) {
        Psql-Super $pg $senhaSuper "alter role rooster with login password '$senha'" $porta | Out-Null
        Info 'Usuário "rooster" já existia; a senha foi redefinida.'
    } else {
        Psql-Super $pg $senhaSuper "create role rooster with login password '$senha'" $porta | Out-Null
        Ok 'Usuário "rooster" criado'
    }
    if (-not (Psql-Super $pg $senhaSuper "select 1 from pg_database where datname = 'rooster_one'" $porta)) {
        Psql-Super $pg $senhaSuper 'create database rooster_one owner rooster' $porta | Out-Null
        Ok 'Banco "rooster_one" criado'
    } else {
        Psql-Super $pg $senhaSuper 'alter database rooster_one owner to rooster' $porta | Out-Null
        Info 'Banco "rooster_one" já existia e foi mantido.'
    }
    return "postgresql://rooster:$senha@localhost:$porta/rooster_one?schema=public"
}

# Deixa o banco pronto e o DATABASE_URL gravado, sem pedir nada ao usuário. Ordem de decisão:
#   1. a conexão do .env já funciona (iniciando antes o banco gerenciado pelo instalador, se houver): mantém;
#   2. existe a pasta "banco-local" ao lado dos repositórios, usada no desenvolvimento, e o .env aponta para
#      ela: passa a iniciá-la com o Windows e a mantém;
#   3. o PostgreSQL foi instalado pelo próprio instalador (senha do superusuário guardada): cria usuário e banco
#      no servidor principal;
#   4. caso geral: cria um banco próprio do Rooster One (cluster exclusivo em ProgramData, em porta livre).
function Configurar-Banco($pg, $cfg, $envBack) {
    $url = (Ler-Env $envBack)['DATABASE_URL']
    if ($cfg.Banco) {
        Info "Iniciando o banco gerenciado pelo instalador ($($cfg.Banco.Pasta), porta $($cfg.Banco.Porta))..."
        try { Iniciar-Cluster $pg $cfg.Banco.Pasta ([int]$cfg.Banco.Porta) } catch { Aviso $_.Exception.Message }
    }
    if (Testar-Conexao $pg $url) { Ok 'A conexão configurada no .env funciona; o banco existente foi mantido.'; return }

    $local = Join-Path (Split-Path $Back -Parent) 'banco-local'
    if (-not $cfg.Banco -and (Test-Path (Join-Path $local 'PG_VERSION')) -and $url -match '@(localhost|127\.0\.0\.1):(\d+)/' -and -not (Porta-Em-Uso ([int]$Matches[2]))) {
        $portaLocal = [int]$Matches[2]
        $versaoLocal = (Get-Content (Join-Path $local 'PG_VERSION') -TotalCount 1).Trim()
        if ($versaoLocal -eq ($pg.Versao -replace '\D', '')) {
            Info "Banco local de desenvolvimento encontrado em $local (porta $portaLocal); será iniciado e mantido."
            try {
                Iniciar-Cluster $pg $local $portaLocal
                if (Testar-Conexao $pg $url) {
                    $cfg.Banco = @{ Tipo = 'adotado'; Pasta = $local; Porta = $portaLocal }
                    Ok 'Banco local em execução, com início automático; os dados existentes foram mantidos.'
                    return
                }
            } catch { Aviso $_.Exception.Message }
            Aviso 'O banco local não aceitou a conexão do .env; será criado um banco novo, e a pasta banco-local não é alterada.'
        } else {
            Aviso "A pasta banco-local é do PostgreSQL $versaoLocal, e o instalado é o $($pg.Versao); será criado um banco novo."
        }
    }

    if (Test-Path $ArqCredPg) {
        $senhaSuper = (Import-Clixml $ArqCredPg).GetNetworkCredential().Password
        Definir-Env $envBack 'DATABASE_URL' (Garantir-Usuario-E-Banco $pg $senhaSuper 5432)
        Ok 'DATABASE_URL gravada no .env'
        return
    }

    if ((Test-Path (Join-Path $PastaCluster 'PG_VERSION')) -and (Test-Path $ArqSuperCluster) -and (Test-Path $ArqBancoComum)) {
        $porta = [int](Get-Content $ArqBancoComum -Raw | ConvertFrom-Json).Porta
        Info "Banco do Rooster One já existente em $PastaCluster (porta $porta); os dados foram mantidos."
    } else {
        if (Test-Path $PastaCluster) {
            # Pasta incompleta de uma tentativa anterior: é preservada com outro nome, nunca apagada.
            $antiga = "$PastaCluster.antigo-$(Get-Date -Format yyyyMMdd-HHmmss)"
            Move-Item $PastaCluster $antiga
            Aviso "Havia uma pasta de banco incompleta; foi preservada em $antiga."
        }
        $porta = Porta-Livre 5433
        $senhaSuper = Gerar-Senha 24
        Info "Criando o banco de dados próprio do Rooster One em $PastaCluster (porta $porta)..."
        Criar-Cluster $pg $PastaCluster $porta $senhaSuper
        Proteger-Segredo $senhaSuper $ArqSuperCluster
        Ok 'Servidor de banco de dados criado'
    }
    $cfg.Banco = @{ Tipo = 'proprio'; Pasta = $PastaCluster; Porta = $porta }
    Salvar-Config $cfg
    Iniciar-Cluster $pg $PastaCluster $porta
    Ok "Banco de dados em execução na porta $porta"
    Definir-Env $envBack 'DATABASE_URL' (Garantir-Usuario-E-Banco $pg (Ler-Segredo $ArqSuperCluster) $porta)
    Ok 'DATABASE_URL gravada no .env'
}

# ---------------------------------------------------------------------------------------------------------------
# Configuração (.env) do backend e do frontend
# ---------------------------------------------------------------------------------------------------------------
function Configurar-Env($cfg, $front) {
    $envBack = Join-Path $Back '.env'
    if (-not (Test-Path $envBack)) {
        Copy-Item (Join-Path $Back '.env.example') $envBack
        Info '.env do backend criado a partir do .env.example'
    }
    $atual = Ler-Env $envBack
    if (-not $atual['JWT_SECRET'] -or $atual['JWT_SECRET'] -like 'troque-*') {
        Definir-Env $envBack 'JWT_SECRET' (Gerar-Segredo 48); Ok 'JWT_SECRET gerado'
    }
    # A chave de arquivos NUNCA é substituída quando já existe: os arquivos cifrados com ela ficariam ilegíveis.
    if (-not $atual['FILE_ENCRYPTION_KEY'] -or $atual['FILE_ENCRYPTION_KEY'] -like 'troque-*') {
        Definir-Env $envBack 'FILE_ENCRYPTION_KEY' (Gerar-Segredo 32); Ok 'FILE_ENCRYPTION_KEY gerada'
        Info 'Guarde uma cópia do arquivo .env do backend junto aos backups: sem a FILE_ENCRYPTION_KEY os arquivos enviados não podem ser lidos.'
    } else {
        Ok 'Segredos existentes mantidos (JWT_SECRET e FILE_ENCRYPTION_KEY)'
    }
    Definir-Env $envBack 'PORT' $cfg.PortaApi
    Definir-Env $envBack 'FRONTEND_URL' "http://localhost:$($cfg.PortaSite)"
    $envFront = Join-Path $front '.env'
    if (-not (Test-Path $envFront) -and (Test-Path (Join-Path $front '.env.example'))) { Copy-Item (Join-Path $front '.env.example') $envFront }
    Definir-Env $envFront 'VITE_API_URL' "http://localhost:$($cfg.PortaApi)"
    Ok "Frontend apontando para a API em http://localhost:$($cfg.PortaApi)"
    return $envBack
}

# ---------------------------------------------------------------------------------------------------------------
# Portas
# ---------------------------------------------------------------------------------------------------------------
function Dono-Porta([int]$porta) {
    $c = Get-NetTCPConnection -LocalPort $porta -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $c) { return $null }
    return Get-CimInstance Win32_Process -Filter "ProcessId=$($c.OwningProcess)" -ErrorAction SilentlyContinue
}

function E-Processo-Rooster($proc, $front) {
    if (-not $proc -or -not $proc.CommandLine) { return $false }
    return ($proc.CommandLine -like "*$Back*") -or ($front -and $proc.CommandLine -like "*$front*") -or
        ($proc.CommandLine -match 'nest\.js|vite|\.output[\\/]server[\\/]index\.mjs|dist[\\/]src[\\/]main')
}

# Confere as portas da API e do site. Com -Ajustar, a porta ocupada por outro programa é trocada pela próxima
# livre, sem perguntar (a nova porta é gravada na configuração e usada na compilação do frontend).
function Verificar-Portas($cfg, $front, [switch]$Ajustar) {
    foreach ($nome in 'PortaApi', 'PortaSite') {
        $rotulo = if ($nome -eq 'PortaApi') { 'API' } else { 'site' }
        $proc = Dono-Porta $cfg[$nome]
        if (-not $proc) { Ok "Porta $($cfg[$nome]) livre ($rotulo)"; continue }
        if (E-Processo-Rooster $proc $front) { Info "Porta $($cfg[$nome]) em uso pelo próprio Rooster One (será reiniciado)"; continue }
        if ($Ajustar) {
            $outra = if ($nome -eq 'PortaApi') { $cfg.PortaSite } else { $cfg.PortaApi }
            $nova = $cfg[$nome]
            do { $nova = Porta-Livre ($nova + 1) } while ($nova -eq $outra)
            Aviso "Porta $($cfg[$nome]) ocupada por outro programa ($($proc.Name)); $(if ($nome -eq 'PortaApi') { 'a API' } else { 'o site' }) usará a porta $nova."
            $cfg[$nome] = $nova
        } else {
            Aviso "Porta $($cfg[$nome]) ocupada por outro programa: $($proc.Name) (PID $($proc.ProcessId))"
        }
    }
}

# ---------------------------------------------------------------------------------------------------------------
# Compilação, migrations e dados
# ---------------------------------------------------------------------------------------------------------------
function Compilar-Backend {
    Info 'Instalando as dependências (npm ci); leva alguns minutos...'
    Executar 'npm.cmd' @('ci', '--no-audit', '--no-fund') $Back
    Executar 'npx.cmd' @('prisma', 'generate') $Back
    Info 'Compilando...'
    Executar 'npm.cmd' @('run', 'build') $Back
    if (-not (Test-Path (Join-Path $Back 'dist\src\main.js'))) { throw 'A compilação do backend não gerou dist\src\main.js.' }
    Ok 'Backend compilado (dist)'
}

function Compilar-Frontend($front) {
    Info 'Instalando as dependências (npm ci); leva alguns minutos...'
    Executar 'npm.cmd' @('ci', '--no-audit', '--no-fund') $front
    Info 'Compilando...'
    # O template gera, por padrão, pacote para Cloudflare Workers; para rodar com o Node local, o preset é node-server.
    $env:NITRO_PRESET = 'node-server'
    try { Executar 'npm.cmd' @('run', 'build') $front } finally { Remove-Item Env:NITRO_PRESET -ErrorAction SilentlyContinue }
    if (-not (Test-Path (Join-Path $front '.output\server\index.mjs'))) { throw 'A compilação do frontend não gerou .output\server\index.mjs.' }
    Ok 'Frontend compilado (.output, servidor Node)'
}

function Aplicar-Migrations {
    Executar 'npx.cmd' @('prisma', 'migrate', 'deploy') $Back
    Ok 'Migrations aplicadas'
}

function Contar-No-Banco($pg, $sql) {
    $ErrorActionPreference = 'Continue'
    $url = (Ler-Env (Join-Path $Back '.env'))['DATABASE_URL']
    $n = & (Join-Path $pg.Bin 'psql.exe') (Url-Libpq $url) -tAc $sql 2>$null
    if ($LASTEXITCODE -ne 0) { return -1 }
    return [int]("$n".Trim())
}
function Banco-Vazio($pg) { return ((Contar-No-Banco $pg 'select count(*) from usuarios') -eq 0) }
function Banco-Sem-Admin($pg) {
    $sql = "select count(*) from usuarios_permissoes up join usuarios u on u.id = up.usuario_id join permissoes p on p.id = up.permissao_id where u.ativo and p.recurso = '/hub/acessos' and p.acao = 'gerenciar-permissoes'"
    return ((Contar-No-Banco $pg $sql) -le 0)
}

function Carregar-Demonstracao {
    Info 'Carregando os dados de demonstração...'
    Executar 'npm.cmd' @('run', 'db:seed:dev') $Back
    Ok 'Dados de demonstração carregados (usuários e senhas no Apêndice B do Manual do Usuário)'
}

# Catálogo de permissões e administrador (scripts/preparar-base.ts). A senha do administrador é passada por
# variável de ambiente ao processo filho, nunca pela linha de comando. Devolve $true quando a senha foi gerada
# (e gravada em .rooster\primeiro-acesso.txt).
function Preparar-Base($opc) {
    $gerada = $false
    $variaveis = 'ROOSTER_ADMIN_EMAIL', 'ROOSTER_ADMIN_NOME', 'ROOSTER_ADMIN_SENHA', 'ROOSTER_ADMIN_SAIDA'
    try {
        if ($opc.AdminEmail) {
            $env:ROOSTER_ADMIN_EMAIL = $opc.AdminEmail
            $env:ROOSTER_ADMIN_NOME = $opc.AdminNome
            if ($opc.AdminSenha) { $env:ROOSTER_ADMIN_SENHA = $opc.AdminSenha }
            else {
                New-Item -ItemType Directory -Force $Dados | Out-Null
                if (Test-Path $ArqPrimeiroAcesso) { Remove-Item $ArqPrimeiroAcesso -Force }
                $env:ROOSTER_ADMIN_SAIDA = $ArqPrimeiroAcesso
            }
        }
        Executar 'npx.cmd' @('ts-node', 'scripts/preparar-base.ts') $Back
        $gerada = [bool]($opc.AdminEmail -and -not $opc.AdminSenha -and (Test-Path $ArqPrimeiroAcesso))
    } finally {
        foreach ($v in $variaveis) { Remove-Item "Env:$v" -ErrorAction SilentlyContinue }
    }
    Ok 'Catálogo de permissões e administrador conferidos'
    return $gerada
}

# ---------------------------------------------------------------------------------------------------------------
# Documentação
# ---------------------------------------------------------------------------------------------------------------
# Gera, em Word, o Manual do Usuário (docs/manual-usuario/gerar-manual.js) e a Documentação Geral
# (docs/gerar-documentacao.js) na pasta "documentacao", e cria o atalho dela na área de trabalho. Os geradores usam as
# dependências já instaladas na compilação do backend. Uma falha aqui não impede o uso do sistema: é informada como
# aviso, e a documentação pode ser gerada depois (npm run manual e npm run documentacao). Devolve a pasta, ou $null.
function Gerar-Documentacao($cfg) {
    New-Item -ItemType Directory -Force $PastaDocumentacao | Out-Null
    $node = if ($cfg.Node) { $cfg.Node } else { 'node' }
    $gerados = 0
    foreach ($item in @(
            @{ Nome = 'Manual do Usuário'; Script = 'docs\manual-usuario\gerar-manual.js'; Arquivo = 'Rooster-One-Manual-do-Usuario.docx' },
            @{ Nome = 'Documentação Geral'; Script = 'docs\gerar-documentacao.js'; Arquivo = 'Rooster-One-Documentacao-Geral.docx' })) {
        $destino = Join-Path $PastaDocumentacao $item.Arquivo
        try {
            Info "Gerando $($item.Nome)..."
            Executar $node @((Join-Path $Back $item.Script), $destino) $Back
            Ok ("{0}: {1} ({2:N1} MB)" -f $item.Nome, $item.Arquivo, ((Get-Item $destino).Length / 1MB))
            $gerados++
        } catch {
            Aviso "Não foi possível gerar $($item.Nome): $($_.Exception.Message)"
        }
    }
    if ($gerados -eq 0) { return $null }
    try {
        $shell = New-Object -ComObject WScript.Shell
        $lnk = $shell.CreateShortcut($AtalhoDocumentacao)
        $lnk.TargetPath = $PastaDocumentacao
        $lnk.Description = 'Documentação do Rooster One (Manual do Usuário e Documentação Geral)'
        $lnk.Save()
        Ok "Atalho 'Rooster One - Documentação' criado na área de trabalho"
    } catch {
        Aviso "Não foi possível criar o atalho da documentação: $($_.Exception.Message)"
    }
    Info 'O sumário de cada documento é atualizado ao abri-lo no Word (Referências > Atualizar Sumário).'
    return $PastaDocumentacao
}

# ---------------------------------------------------------------------------------------------------------------
# Início automático (Agendador de Tarefas)
# ---------------------------------------------------------------------------------------------------------------
function Escrever-Lancador($cfg, $front) {
    New-Item -ItemType Directory -Force $Logs | Out-Null
    # Lançador único: executa o serviço em laço (reinicia em caso de queda) e alterna o log ao passar de 10 MB.
    $lancador = @"
param([ValidateSet('api', 'site')][string]`$Servico)
`$ErrorActionPreference = 'Continue'
`$node = '$($cfg.Node)'
if (`$Servico -eq 'api') {
    `$pasta = '$Back'; `$script = 'dist\src\main.js'
    `$env:NODE_ENV = 'production'; `$env:PORT = '$($cfg.PortaApi)'
} else {
    `$pasta = '$front'; `$script = '.output\server\index.mjs'
    `$env:NODE_ENV = 'production'; `$env:PORT = '$($cfg.PortaSite)'
}
`$log = Join-Path '$Logs' "`$Servico.log"
Set-Location `$pasta
while (`$true) {
    if ((Test-Path `$log) -and (Get-Item `$log).Length -gt 10MB) { Move-Item `$log "`$log.1" -Force }
    Add-Content `$log ("[{0}] iniciando {1}" -f (Get-Date -Format s), `$Servico)
    & `$node (Join-Path `$pasta `$script) *>> `$log
    Add-Content `$log ("[{0}] processo encerrado (código {1}); reiniciando em 5 s" -f (Get-Date -Format s), `$LASTEXITCODE)
    Start-Sleep -Seconds 5
}
"@
    $arq = Join-Path $Dados 'iniciar-servico.ps1'
    [IO.File]::WriteAllText($arq, $lancador, (New-Object Text.UTF8Encoding $true))
    return $arq
}

function Registrar-Tarefas($lancador) {
    $principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
    $config = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
        -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew
    $gatilho = New-ScheduledTaskTrigger -AtStartup
    foreach ($par in @(@($TarefaApi, 'api'), @($TarefaSite, 'site'))) {
        $acao = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$lancador`" -Servico $($par[1])"
        Register-ScheduledTask -TaskName $par[0] -Action $acao -Trigger $gatilho -Principal $principal -Settings $config `
            -Description 'Rooster One: inicia com o Windows (registrado pelo instalador).' -Force | Out-Null
        Ok "Tarefa '$($par[0])' registrada"
    }
}

function Criar-Atalho($cfg, $front) {
    $icone = Join-Path $front 'public\favicon.png'
    $conteudo = "[InternetShortcut]`r`nURL=http://localhost:$($cfg.PortaSite)/`r`n"
    $ico = Join-Path $Dados 'rooster.ico'
    if (Test-Path $icone) {
        # Converte o PNG em ICO (cabeçalho ICO com a imagem PNG embutida, aceito pelo Windows Vista em diante).
        $png = [IO.File]::ReadAllBytes($icone)
        $ms = New-Object IO.MemoryStream
        $bw = New-Object IO.BinaryWriter $ms
        $bw.Write([uint16]0); $bw.Write([uint16]1); $bw.Write([uint16]1)
        $bw.Write([byte]0); $bw.Write([byte]0); $bw.Write([byte]0); $bw.Write([byte]0)
        $bw.Write([uint16]1); $bw.Write([uint16]32); $bw.Write([uint32]$png.Length); $bw.Write([uint32]22); $bw.Write($png)
        [IO.File]::WriteAllBytes($ico, $ms.ToArray())
        $conteudo += "IconFile=$ico`r`nIconIndex=0`r`n"
    }
    [IO.File]::WriteAllText($Atalho, $conteudo)
    Ok "Atalho 'Rooster One' criado na área de trabalho"
}

# ---------------------------------------------------------------------------------------------------------------
# Operações
# ---------------------------------------------------------------------------------------------------------------
function Parar-Sistema($front) {
    foreach ($t in $TarefaApi, $TarefaSite) {
        if (Get-ScheduledTask -TaskName $t -ErrorAction SilentlyContinue) { Stop-ScheduledTask -TaskName $t -ErrorAction SilentlyContinue }
    }
    # Encerrar a tarefa não encerra o processo do Node iniciado por ela; os processos do Rooster One são localizados
    # pela linha de comando (inclui os servidores de desenvolvimento das mesmas pastas). O banco continua em execução.
    Get-CimInstance Win32_Process -Filter "Name='node.exe' or Name='powershell.exe'" | Where-Object {
        $_.ProcessId -ne $PID -and $_.CommandLine -and (
            ($_.Name -eq 'powershell.exe' -and $_.CommandLine -like '*iniciar-servico.ps1*') -or
            ($_.Name -eq 'node.exe' -and (($_.CommandLine -like "*$Back*") -or ($front -and $_.CommandLine -like "*$front*"))))
    } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    Ok 'Sistema parado'
}

function Aguardar-Url($url, [int]$segundos) {
    $fim = (Get-Date).AddSeconds($segundos)
    while ((Get-Date) -lt $fim) {
        try { $r = Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 5; if ($r.StatusCode -eq 200) { return $true } } catch { }
        Start-Sleep -Seconds 2
    }
    return $false
}

function Mostrar-Fim-Do-Log($arquivo) {
    if (Test-Path $arquivo) { Get-Content $arquivo -Tail 15 -ErrorAction SilentlyContinue | ForEach-Object { Emitir 'log' $_ } }
}

# Inicia as tarefas da API e do site e aguarda a resposta de ambos. Com -Exigir, a ausência de resposta é erro
# (usado na instalação); sem ele, apenas é informada.
function Iniciar-Sistema($cfg, [switch]$AbrirNavegador, [switch]$Exigir) {
    $pg = Localizar-Postgres
    if ($pg -and $cfg.Banco) { try { Iniciar-Cluster $pg $cfg.Banco.Pasta ([int]$cfg.Banco.Porta) } catch { Aviso $_.Exception.Message } }
    foreach ($t in $TarefaApi, $TarefaSite) {
        if (-not (Get-ScheduledTask -TaskName $t -ErrorAction SilentlyContinue)) { throw "Tarefa '$t' não registrada. Execute a instalação completa." }
        Start-ScheduledTask -TaskName $t
    }
    Info 'Aguardando a API responder...'
    if (Aguardar-Url "http://localhost:$($cfg.PortaApi)/health" 90) { Ok "API respondendo em http://localhost:$($cfg.PortaApi)" }
    else {
        Mostrar-Fim-Do-Log (Join-Path $Logs 'api.log')
        if ($Exigir) { throw "A API não respondeu em 90 segundos; consulte $Logs\api.log." }
        Falha "A API não respondeu; consulte $Logs\api.log"
    }
    Info 'Aguardando o site responder...'
    if (Aguardar-Url "http://localhost:$($cfg.PortaSite)/login" 60) { Ok "Site respondendo em http://localhost:$($cfg.PortaSite)" }
    else {
        Mostrar-Fim-Do-Log (Join-Path $Logs 'site.log')
        if ($Exigir) { throw "O site não respondeu em 60 segundos; consulte $Logs\site.log." }
        Falha "O site não respondeu; consulte $Logs\site.log"
    }
    if ($AbrirNavegador) { Start-Process "http://localhost:$($cfg.PortaSite)/" }
}

function Descrever-Banco($cfg) {
    if (-not $cfg.Banco) { return 'conforme o DATABASE_URL do .env' }
    $tipo = if ($cfg.Banco.Tipo -eq 'adotado') { 'banco local existente' } else { 'banco próprio do Rooster One' }
    return "$tipo, porta $($cfg.Banco.Porta) ($($cfg.Banco.Pasta))"
}

function Mostrar-Status($cfg) {
    Titulo 'Situação do Rooster One'
    $front = Localizar-Frontend $cfg
    if ($front) { Ok "Frontend: $front" } else { Falha 'Frontend não localizado ao lado do backend' }
    $n = Versao-Node
    if ($n) { Ok "Node.js $($n.Versao)" } else { Falha 'Node.js não instalado' }
    $pg = Localizar-Postgres
    if (-not $pg) { Falha 'PostgreSQL não instalado' } else { Ok "PostgreSQL $($pg.Versao) ($($pg.Bin))" }
    $envBack = Join-Path $Back '.env'
    if (Test-Path $envBack) { Ok '.env do backend presente' } else { Aviso '.env do backend ausente' }
    if ($pg) {
        if (Testar-Conexao $pg (Ler-Env $envBack)['DATABASE_URL']) { Ok "Banco de dados acessível: $(Descrever-Banco $cfg)" }
        else { Aviso "Banco de dados inacessível: $(Descrever-Banco $cfg)" }
    }
    foreach ($t in $TarefaApi, $TarefaSite) {
        $tarefa = Get-ScheduledTask -TaskName $t -ErrorAction SilentlyContinue
        if ($tarefa) { Ok "Tarefa '$t': $($tarefa.State)" } else { Aviso "Tarefa '$t' não registrada (início automático desativado)" }
    }
    foreach ($par in @(@('API', "http://localhost:$($cfg.PortaApi)/health"), @('Site', "http://localhost:$($cfg.PortaSite)/login"))) {
        try { $r = Invoke-WebRequest $par[1] -UseBasicParsing -TimeoutSec 5; Ok "$($par[0]) respondendo ($($par[1]), HTTP $($r.StatusCode))" }
        catch { Aviso "$($par[0]) não responde em $($par[1])" }
    }
}

function Verificar-Ambiente($cfg) {
    Mostrar-Status $cfg
    Titulo 'Verificação de pré-requisitos'
    $temWinget = [bool](Get-Command winget -ErrorAction SilentlyContinue)
    if ($temWinget) { Ok 'winget disponível (instalação pela internet)' } else { Aviso 'winget indisponível' }
    foreach ($item in @(@('PostgreSQL', 'postgresql-*.exe', [bool](Localizar-Postgres)), @('Node.js', 'node-*.msi', [bool](Versao-Node)))) {
        $arq = Procurar-Instalador $item[1]
        if ($item[2]) { Ok "$($item[0]) já instalado: o instalador não será usado" }
        elseif ($arq) { Ok "$($item[0]) será instalado a partir de $($arq.FullName)" }
        elseif ($temWinget) { Info "$($item[0]) será instalado pela internet (winget)" }
        else { Falha "$($item[0]) não instalado e sem instalador $($item[1]): coloque-o em scripts\instalador\instaladores" }
    }
    $front = Localizar-Frontend $cfg
    Verificar-Portas $cfg $front
    Conferir-Disco
}

function Conferir-Disco {
    $disco = Get-PSDrive ((Split-Path $Back -Qualifier).TrimEnd(':'))
    $livreGb = [math]::Round($disco.Free / 1GB, 1)
    if ($livreGb -ge 5) { Ok "Espaço livre no disco: $livreGb GB" } else { Aviso "Pouco espaço livre: $livreGb GB (recomendado: 5 GB)" }
}

# ---------------------------------------------------------------------------------------------------------------
# Instalação completa, em passos
# ---------------------------------------------------------------------------------------------------------------
# A lista é a mesma para o console e para a tela, que a exibe como o passo a passo da instalação.
function Passos-Instalacao {
    return @(
        @{ Id = 'ambiente'; Titulo = 'Verificação do computador'; Descricao = 'Pastas do sistema, espaço em disco e portas.' }
        @{ Id = 'node'; Titulo = 'Node.js'; Descricao = 'Ambiente de execução da API e do site.' }
        @{ Id = 'postgres'; Titulo = 'PostgreSQL'; Descricao = 'Programa do banco de dados.' }
        @{ Id = 'config'; Titulo = 'Configuração e segredos'; Descricao = 'Arquivo .env e chaves de segurança.' }
        @{ Id = 'banco'; Titulo = 'Banco de dados'; Descricao = 'Criação do banco do Rooster One.' }
        @{ Id = 'backend'; Titulo = 'API (backend)'; Descricao = 'Dependências e compilação.' }
        @{ Id = 'frontend'; Titulo = 'Site (frontend)'; Descricao = 'Dependências e compilação.' }
        @{ Id = 'migrations'; Titulo = 'Estrutura do banco'; Descricao = 'Tabelas e atualizações (migrations).' }
        @{ Id = 'dados'; Titulo = 'Dados iniciais'; Descricao = 'Permissões e conta de administrador.' }
        @{ Id = 'documentacao'; Titulo = 'Documentação'; Descricao = 'Manual do Usuário e Documentação Geral, em Word.' }
        @{ Id = 'servicos'; Titulo = 'Início automático'; Descricao = 'Tarefas do Windows e atalho.' }
        @{ Id = 'inicio'; Titulo = 'Início do sistema'; Descricao = 'API e site em funcionamento.' }
    )
}

function Executar-Passo-Instalacao($id, $ctx) {
    $cfg = $ctx.Cfg
    switch ($id) {
        'ambiente' {
            $front = Localizar-Frontend $cfg
            if (-not $front -and -not $global:RoosterRelator) {
                $front = Read-Host '  Pasta do frontend (RoosterOneFrontEnd) não encontrada ao lado do backend. Informe o caminho'
            }
            if (-not $front -or -not (Test-Path (Join-Path $front 'package.json'))) { throw 'Pasta do frontend (RoosterOneFrontEnd) não encontrada ao lado do backend.' }
            $cfg.Frontend = (Resolve-Path $front).Path
            Ok "Backend: $Back"
            Ok "Frontend: $($cfg.Frontend)"
            Conferir-Disco
            Verificar-Portas $cfg $cfg.Frontend -Ajustar
            Parar-Sistema $cfg.Frontend
            Salvar-Config $cfg
        }
        'node' { Garantir-Node $cfg }
        'postgres' { $ctx.Pg = Garantir-Postgres; Salvar-Config $cfg }
        'config' { $ctx.EnvBack = Configurar-Env $cfg $cfg.Frontend }
        'banco' { Configurar-Banco $ctx.Pg $cfg $ctx.EnvBack; Salvar-Config $cfg }
        'backend' { Compilar-Backend }
        'frontend' { Compilar-Frontend $cfg.Frontend }
        'migrations' { Aplicar-Migrations }
        'dados' {
            if ($ctx.Opc.Demonstracao) {
                if (Banco-Vazio $ctx.Pg) { Carregar-Demonstracao }
                else { Info 'O banco já possui dados; os dados de demonstração não foram carregados.' }
            }
            $ctx.SenhaGerada = Preparar-Base $ctx.Opc
            if (Banco-Sem-Admin $ctx.Pg) { Aviso 'Não há administrador cadastrado: informe nome e e-mail do administrador e repita a instalação.' }
            New-Item -ItemType Directory -Force (Join-Path $Back 'uploads') | Out-Null
        }
        'documentacao' { $ctx.Documentacao = Gerar-Documentacao $cfg }
        'servicos' {
            Registrar-Tarefas (Escrever-Lancador $cfg $cfg.Frontend)
            Criar-Atalho $cfg $cfg.Frontend
            Salvar-Config $cfg
        }
        'inicio' { Iniciar-Sistema $cfg -Exigir }
    }
}

# Executa a instalação completa. $opc: AdminNome, AdminEmail, AdminSenha (vazia = gerar) e Demonstracao.
# Devolve o resumo exibido ao final (endereço, login e onde está a senha gerada, se houver).
function Instalar($cfg, $opc) {
    Exigir-Admin
    $ctx = @{ Cfg = $cfg; Opc = $opc; Pg = $null; EnvBack = $null; SenhaGerada = $false; Documentacao = $null }
    $passos = Passos-Instalacao
    $n = 0
    foreach ($p in $passos) {
        $n++
        $global:RoosterAvisoNoPasso = $false
        Emitir 'passo-inicio' $p.Titulo @{ Id = $p.Id; Numero = $n; Total = $passos.Count }
        if (-not $global:RoosterRelator) { Titulo "[$n/$($passos.Count)] $($p.Titulo)" }
        try {
            Executar-Passo-Instalacao $p.Id $ctx | Out-Null
            Emitir 'passo-fim' $p.Titulo @{ Id = $p.Id; Estado = $(if ($global:RoosterAvisoNoPasso) { 'aviso' } else { 'ok' }) }
        } catch {
            Emitir 'passo-fim' $p.Titulo @{ Id = $p.Id; Estado = 'erro'; Mensagem = $_.Exception.Message }
            throw
        }
    }
    $resumo = @{
        Url = "http://localhost:$($cfg.PortaSite)"
        AdminEmail = $opc.AdminEmail
        SenhaGerada = [bool]$ctx.SenhaGerada
        ArquivoSenha = $ArqPrimeiroAcesso
        Demonstracao = [bool]$opc.Demonstracao
        Banco = Descrever-Banco $cfg
        Documentacao = $ctx.Documentacao
    }
    Emitir 'resultado' 'Instalação concluída' $resumo
    return $resumo
}

# Pergunta, no console, o que a tela pergunta no formulário.
function Perguntar-Opcoes {
    $opc = @{ AdminNome = ''; AdminEmail = ''; AdminSenha = ''; Demonstracao = $false }
    Titulo 'Rooster One — instalação completa'
    Info 'Conta de administrador (deixe o e-mail em branco para não criar; uma conta existente nunca é alterada).'
    $opc.AdminEmail = (Read-Host '  E-mail do administrador').Trim()
    if ($opc.AdminEmail) {
        $opc.AdminNome = (Read-Host '  Nome do administrador').Trim()
        $s = Read-Host '  Senha (mínimo de 8 caracteres; em branco = gerar uma senha)' -AsSecureString
        $opc.AdminSenha = (New-Object Management.Automation.PSCredential('x', $s)).GetNetworkCredential().Password
        if ($opc.AdminSenha -and $opc.AdminSenha.Length -lt 8) { throw 'A senha deve ter pelo menos 8 caracteres.' }
    }
    $opc.Demonstracao = Confirmar 'Carregar os dados de demonstração se o banco estiver vazio (usuários, turmas, cursos etc.)?'
    return $opc
}

function Instalar-Pelo-Console($cfg) {
    Exigir-Admin
    $resumo = Instalar $cfg (Perguntar-Opcoes)
    Titulo 'Instalação concluída'
    Ok "Acesse $($resumo.Url) (atalho 'Rooster One' na área de trabalho)."
    if ($resumo.AdminEmail) {
        if ($resumo.SenhaGerada) { Ok "Administrador: $($resumo.AdminEmail) — a senha gerada está em $($resumo.ArquivoSenha)" }
        else { Ok "Administrador: $($resumo.AdminEmail)" }
    }
    if ($resumo.Documentacao) { Ok "Documentação em $($resumo.Documentacao) (atalho 'Rooster One - Documentação' na área de trabalho)." }
    Ok 'O sistema passa a iniciar automaticamente com o Windows.'
    Start-Process "$($resumo.Url)/"
}

function Fazer-Backup {
    Titulo 'Backup'
    $pg = Localizar-Postgres
    if (-not $pg) { throw 'PostgreSQL não encontrado.' }
    $env:Path = "$($pg.Bin);$env:Path"
    $destino = Join-Path $Back 'backups'
    & (Join-Path $Back 'scripts\backup.ps1') -Destino $destino
    Ok "Backup gravado em $destino"
    Aviso 'Guarde também uma cópia do arquivo .env do backend (contém a chave dos arquivos cifrados).'
}

function Restaurar-Demonstracao($cfg) {
    Exigir-Admin
    Titulo 'Restaurar dados de demonstração'
    Aviso 'TODOS os dados do banco serão APAGADOS e substituídos pelos dados de demonstração.'
    $r = Read-Host '  Para confirmar, digite APAGAR'
    if ($r -cne 'APAGAR') { Info 'Operação cancelada.'; return }
    $front = Localizar-Frontend $cfg
    Parar-Sistema $front
    Carregar-Demonstracao
    Iniciar-Sistema $cfg
}

function Remover-Inicio-Do-Banco($pg) {
    $ErrorActionPreference = 'Continue'
    if (Get-Service -Name $ServicoBanco -ErrorAction SilentlyContinue) {
        Stop-Service $ServicoBanco -Force -ErrorAction SilentlyContinue
        & (Join-Path $pg.Bin 'pg_ctl.exe') unregister -N $ServicoBanco 2>&1 | Out-Null
        Ok "Serviço '$ServicoBanco' removido"
    }
    if (Get-ScheduledTask -TaskName $TarefaBanco -ErrorAction SilentlyContinue) {
        Unregister-ScheduledTask -TaskName $TarefaBanco -Confirm:$false
        Ok "Tarefa '$TarefaBanco' removida"
    }
}

function Desinstalar($cfg) {
    Exigir-Admin
    Titulo 'Desinstalação'
    $front = Localizar-Frontend $cfg
    Parar-Sistema $front
    foreach ($t in $TarefaApi, $TarefaSite) {
        if (Get-ScheduledTask -TaskName $t -ErrorAction SilentlyContinue) { Unregister-ScheduledTask -TaskName $t -Confirm:$false; Ok "Tarefa '$t' removida" }
    }
    if (Test-Path $Atalho) { Remove-Item $Atalho -Force; Ok 'Atalho removido' }
    if (Test-Path $AtalhoDocumentacao) { Remove-Item $AtalhoDocumentacao -Force; Ok 'Atalho da documentação removido' }
    $pg = Localizar-Postgres
    $url = (Ler-Env (Join-Path $Back '.env'))['DATABASE_URL']
    if ($pg -and $cfg.Banco -and $cfg.Banco.Tipo -eq 'proprio') {
        if (Confirmar "Excluir também o banco de dados do Rooster One ($PastaCluster)? (todos os dados serão perdidos)") {
            Remover-Inicio-Do-Banco $pg
            & (Join-Path $pg.Bin 'pg_ctl.exe') stop -D $PastaCluster -m fast 2>&1 | Out-Null
            Remove-Item $PastaComum -Recurse -Force
            $cfg.Banco = $null; Salvar-Config $cfg
            Ok 'Banco excluído'
        } else { Info "O banco foi mantido em $PastaCluster e continua iniciando com o Windows." }
    } elseif ($pg -and $cfg.Banco -and $cfg.Banco.Tipo -eq 'adotado') {
        $pastaLocal = $cfg.Banco.Pasta
        Remover-Inicio-Do-Banco $pg
        $cfg.Banco = $null; Salvar-Config $cfg
        Info "O banco local ($pastaLocal) deixou de iniciar com o Windows; a pasta e os dados foram mantidos."
    } elseif ($pg -and (Test-Path $ArqCredPg) -and $url -match '^postgres(?:ql)?://([^:@/]+)(?::[^@]*)?@[^/]+/([^?]+)') {
        $usuarioDb = $Matches[1]; $nomeDb = $Matches[2]
        if (Confirmar "Excluir também o banco '$nomeDb'? (todos os dados serão perdidos)") {
            $senhaSuper = (Import-Clixml $ArqCredPg).GetNetworkCredential().Password
            Psql-Super $pg $senhaSuper "drop database if exists `"$nomeDb`" with (force)" | Out-Null
            if ($usuarioDb -ne 'postgres') { Psql-Super $pg $senhaSuper "drop role if exists `"$usuarioDb`"" | Out-Null }
            Ok 'Banco excluído'
        }
    } else {
        Info 'O banco de dados não foi criado por este instalador e foi mantido.'
    }
    Info 'O código-fonte, o .env, os arquivos enviados (uploads), os backups e a pasta documentacao foram mantidos.'
    Info 'Node.js e PostgreSQL permanecem instalados; para removê-los, use "Aplicativos instalados" do Windows.'
}

# ---------------------------------------------------------------------------------------------------------------
# Menu
# ---------------------------------------------------------------------------------------------------------------
function Executar-Acao($nome, $cfg) {
    switch ($nome) {
        'Instalar' { Instalar-Pelo-Console $cfg }
        'Iniciar' { Exigir-Admin; Titulo 'Iniciando o sistema'; Iniciar-Sistema $cfg -AbrirNavegador }
        'Parar' { Exigir-Admin; Parar-Sistema (Localizar-Frontend $cfg) }
        'Status' { Mostrar-Status $cfg }
        'Verificar' { Verificar-Ambiente $cfg }
        'Backup' { Fazer-Backup }
        'Demonstracao' { Restaurar-Demonstracao $cfg }
        'Desinstalar' { Desinstalar $cfg }
    }
}

# Carregado com ". .\instalador.ps1" (tela do instalador e testes): apenas define as funções, sem executar o menu.
if ($MyInvocation.InvocationName -eq '.') { return }

$cfg = Ler-Config
if ($Acao) {
    Executar-Acao $Acao $cfg
    exit 0
}

$opcoes = [ordered]@{
    '1' = @('Instalação completa (pré-requisitos, banco, compilação e início automático)', 'Instalar')
    '2' = @('Iniciar o sistema', 'Iniciar')
    '3' = @('Parar o sistema', 'Parar')
    '4' = @('Ver situação (banco, API e site)', 'Status')
    '5' = @('Verificar pré-requisitos (sem alterar nada)', 'Verificar')
    '6' = @('Fazer backup (banco e arquivos)', 'Backup')
    '7' = @('Restaurar dados de demonstração (apaga os dados atuais)', 'Demonstracao')
    '8' = @('Desinstalar (remove início automático e atalho)', 'Desinstalar')
}
while ($true) {
    Clear-Host
    Write-Host '==============================================' -ForegroundColor DarkYellow
    Write-Host '        ROOSTER ONE — Menu do instalador       ' -ForegroundColor Yellow
    Write-Host '==============================================' -ForegroundColor DarkYellow
    foreach ($k in $opcoes.Keys) { Write-Host "  $k. $($opcoes[$k][0])" }
    Write-Host '  0. Sair'
    Write-Host ''
    $escolha = Read-Host 'Escolha uma opção'
    if ($escolha -eq '0') { break }
    if (-not $opcoes.Contains($escolha)) { continue }
    try {
        Executar-Acao $opcoes[$escolha][1] $cfg
    } catch {
        Falha $_.Exception.Message
    }
    Write-Host ''
    Read-Host 'Pressione Enter para voltar ao menu' | Out-Null
}
