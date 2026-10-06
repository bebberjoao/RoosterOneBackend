<#
  Instalador do Rooster One para Windows.

  Instala os pré-requisitos (Node.js LTS e PostgreSQL), cria o banco, gera a configuração (.env) com segredos
  aleatórios, compila o backend e o frontend, aplica as migrations, carrega opcionalmente os dados de demonstração
  e registra a API e o site para iniciarem automaticamente com o Windows (Agendador de Tarefas).

  Uso: execute INSTALAR.bat (pede elevação de administrador) ou, no PowerShell como administrador:
    .\scripts\instalador\instalador.ps1                 # menu interativo
    .\scripts\instalador\instalador.ps1 -Acao Status    # ações: Instalar, Iniciar, Parar, Status, Verificar,
                                                         #        Backup, Demonstracao, Desinstalar

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
$Instaladores = Join-Path $PSScriptRoot 'instaladores'

$TarefaApi = 'Rooster One - API'
$TarefaSite = 'Rooster One - Site'
$Atalho = Join-Path ([Environment]::GetFolderPath('CommonDesktopDirectory')) 'Rooster One.url'

function Ler-Config {
    $padrao = [ordered]@{ PortaApi = 3000; PortaSite = 8080; Frontend = ''; Node = '' }
    if (Test-Path $ArqConfig) {
        $salvo = Get-Content $ArqConfig -Raw | ConvertFrom-Json
        foreach ($p in $salvo.PSObject.Properties) { $padrao[$p.Name] = $p.Value }
    }
    return $padrao
}
function Salvar-Config($cfg) {
    New-Item -ItemType Directory -Force $Dados | Out-Null
    ($cfg | ConvertTo-Json) | Set-Content -Path $ArqConfig -Encoding UTF8
}

# ---------------------------------------------------------------------------------------------------------------
# Saída no console
# ---------------------------------------------------------------------------------------------------------------
function Titulo($t) { Write-Host ''; Write-Host "== $t ==" -ForegroundColor Cyan }
function Ok($t) { Write-Host "  [OK] $t" -ForegroundColor Green }
function Info($t) { Write-Host "  ... $t" }
function Aviso($t) { Write-Host "  [!] $t" -ForegroundColor Yellow }
function Falha($t) { Write-Host "  [ERRO] $t" -ForegroundColor Red }

function Confirmar($pergunta) {
    $r = Read-Host "  $pergunta (s/n)"
    return ($r -match '^(s|sim|y|yes)$')
}

function Exigir-Admin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $admin = (New-Object Security.Principal.WindowsPrincipal $id).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if (-not $admin) { throw 'Esta operação exige o PowerShell executado como administrador (use INSTALAR.bat).' }
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

# Executa um programa de linha de comando e falha se o código de saída não for zero.
function Executar($exe, [string[]]$argumentos, $pasta) {
    # Avisos que programas externos escrevem no canal de erro não devem interromper o instalador (no PowerShell 5.1,
    # com saída redirecionada, eles viram exceção); o critério de falha é apenas o código de saída.
    $ErrorActionPreference = 'Continue'
    Push-Location $pasta
    try {
        & $exe @argumentos
        if ($LASTEXITCODE -ne 0) { throw "Falha ao executar: $exe $($argumentos -join ' ') (código $LASTEXITCODE)" }
    } finally { Pop-Location }
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
    Titulo 'Node.js'
    Atualizar-Path
    $n = Versao-Node
    if ($n -and $n.Maior -ge 20) { Ok "Node.js $($n.Versao) encontrado ($($n.Caminho))"; $cfg.Node = $n.Caminho; return }
    if ($n) { Aviso "Node.js $($n.Versao) é anterior à versão 20; será instalada a versão LTS." }
    $msi = Get-ChildItem $Instaladores -Filter 'node-*.msi' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($msi) {
        Info "Instalando $($msi.Name) (pasta instaladores)..."
        $p = Start-Process msiexec.exe -ArgumentList "/i `"$($msi.FullName)`" /qn /norestart" -Wait -PassThru
        if ($p.ExitCode -ne 0) { throw "O instalador do Node.js terminou com código $($p.ExitCode)." }
    } elseif (Get-Command winget -ErrorAction SilentlyContinue) {
        Info 'Instalando Node.js LTS pelo winget (requer internet)...'
        & winget install --id OpenJS.NodeJS.LTS -e --silent --accept-package-agreements --accept-source-agreements --scope machine
    } else {
        throw 'Node.js não encontrado, sem winget e sem instalador em scripts\instalador\instaladores (node-*.msi).'
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
# PostgreSQL
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
    Titulo 'PostgreSQL'
    $pg = Localizar-Postgres
    if (-not $pg) {
        $senha = Gerar-Senha 20
        $argsPg = "--mode unattended --unattendedmodeui none --superpassword $senha --serverport 5432"
        $exe = Get-ChildItem $Instaladores -Filter 'postgresql-*.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($exe) {
            Info "Instalando $($exe.Name) (pasta instaladores; leva alguns minutos)..."
            $p = Start-Process $exe.FullName -ArgumentList $argsPg -Wait -PassThru
            if ($p.ExitCode -ne 0) { throw "O instalador do PostgreSQL terminou com código $($p.ExitCode)." }
        } elseif (Get-Command winget -ErrorAction SilentlyContinue) {
            Info 'Instalando PostgreSQL 16 pelo winget (requer internet; leva alguns minutos)...'
            & winget install --id PostgreSQL.PostgreSQL.16 -e --silent --accept-package-agreements --accept-source-agreements --override $argsPg
        } else {
            throw 'PostgreSQL não encontrado, sem winget e sem instalador em scripts\instalador\instaladores (postgresql-*.exe).'
        }
        $pg = Localizar-Postgres
        if (-not $pg) { throw 'O PostgreSQL foi instalado, mas não foi localizado em C:\Program Files\PostgreSQL.' }
        # A senha do superusuário fica protegida pelo Windows (DPAPI): só o usuário que instalou consegue lê-la.
        New-Item -ItemType Directory -Force $Dados | Out-Null
        New-Object Management.Automation.PSCredential('postgres', (ConvertTo-SecureString $senha -AsPlainText -Force)) | Export-Clixml $ArqCredPg
        Ok "PostgreSQL $($pg.Versao) instalado (senha do superusuário 'postgres' guardada de forma protegida em .rooster)"
    } else {
        Ok "PostgreSQL $($pg.Versao) encontrado ($($pg.Bin))"
    }
    if ($pg.Servico -and $pg.Servico.Status -ne 'Running') {
        Info "Iniciando o serviço $($pg.Servico.Name)..."
        Start-Service $pg.Servico.Name -ErrorAction Stop
    }
    if ($pg.Servico) {
        Set-Service $pg.Servico.Name -StartupType Automatic -ErrorAction Stop
        Ok "Serviço $($pg.Servico.Name) em execução e com início automático"
    }
    $env:Path = "$($pg.Bin);$env:Path"
    return $pg
}

function Url-Libpq($url) { return ($url -replace '\?.*$', '') }

function Testar-Conexao($pg, $url) {
    $ErrorActionPreference = 'Continue'
    if (-not $url) { return $false }
    & (Join-Path $pg.Bin 'psql.exe') (Url-Libpq $url) -tAc 'select 1' 2>$null | Out-Null
    return ($LASTEXITCODE -eq 0)
}

function Credencial-Superusuario {
    if (Test-Path $ArqCredPg) { return Import-Clixml $ArqCredPg }
    Aviso 'É necessária a senha do superusuário "postgres", definida na instalação do PostgreSQL.'
    $s = Read-Host '  Senha do usuário postgres' -AsSecureString
    return New-Object Management.Automation.PSCredential('postgres', $s)
}

function Psql-Super($pg, $cred, $sql) {
    $ErrorActionPreference = 'Continue'
    $env:PGPASSWORD = $cred.GetNetworkCredential().Password
    try {
        $saida = & (Join-Path $pg.Bin 'psql.exe') -h localhost -U postgres -d postgres -tAc $sql
        if ($LASTEXITCODE -ne 0) { throw 'Não foi possível conectar ao PostgreSQL como "postgres" (senha incorreta?).' }
        return $saida
    } finally { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
}

function Configurar-Banco($pg, $envBack) {
    Titulo 'Banco de dados'
    $atual = Ler-Env $envBack
    if (Testar-Conexao $pg $atual['DATABASE_URL']) {
        Ok 'A conexão configurada no .env já funciona; o banco existente será mantido.'
        return
    }
    $cred = Credencial-Superusuario
    $senha = Gerar-Senha 24
    $existeRole = Psql-Super $pg $cred "select 1 from pg_roles where rolname = 'rooster'"
    if ($existeRole) {
        Psql-Super $pg $cred "alter role rooster with login password '$senha'" | Out-Null
        Info 'Usuário "rooster" já existia; a senha foi redefinida.'
    } else {
        Psql-Super $pg $cred "create role rooster with login password '$senha'" | Out-Null
        Ok 'Usuário "rooster" criado'
    }
    $existeDb = Psql-Super $pg $cred "select 1 from pg_database where datname = 'rooster_one'"
    if (-not $existeDb) {
        Psql-Super $pg $cred 'create database rooster_one owner rooster' | Out-Null
        Ok 'Banco "rooster_one" criado'
    } else {
        Psql-Super $pg $cred 'alter database rooster_one owner to rooster' | Out-Null
        Info 'Banco "rooster_one" já existia e foi mantido.'
    }
    Definir-Env $envBack 'DATABASE_URL' "postgresql://rooster:$senha@localhost:5432/rooster_one?schema=public"
    Ok 'DATABASE_URL gravada no .env'
}

# ---------------------------------------------------------------------------------------------------------------
# Configuração (.env) do backend e do frontend
# ---------------------------------------------------------------------------------------------------------------
function Configurar-Env($cfg, $front) {
    Titulo 'Configuração (.env)'
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
        Aviso 'Guarde uma cópia do arquivo .env do backend junto aos backups: sem a FILE_ENCRYPTION_KEY os arquivos enviados não podem ser lidos.'
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

function Verificar-Portas($cfg, $front, [switch]$Interativo) {
    foreach ($nome in 'PortaApi', 'PortaSite') {
        $proc = Dono-Porta $cfg[$nome]
        if (-not $proc) { Ok "Porta $($cfg[$nome]) livre"; continue }
        if (E-Processo-Rooster $proc $front) { Info "Porta $($cfg[$nome]) em uso pelo próprio Rooster One (será reiniciado)"; continue }
        Aviso "Porta $($cfg[$nome]) ocupada por outro programa: $($proc.Name) (PID $($proc.ProcessId))"
        if ($Interativo) {
            $nova = Read-Host "  Informe outra porta para $(if ($nome -eq 'PortaApi') { 'a API' } else { 'o site' })"
            if ($nova -match '^\d+$') { $cfg[$nome] = [int]$nova } else { throw 'Porta inválida.' }
        }
    }
}

# ---------------------------------------------------------------------------------------------------------------
# Compilação, migrations e dados
# ---------------------------------------------------------------------------------------------------------------
function Compilar($cfg, $front) {
    Titulo 'Backend: dependências e compilação'
    Executar 'npm.cmd' @('ci', '--no-audit', '--no-fund') $Back
    Executar 'npx.cmd' @('prisma', 'generate') $Back
    Executar 'npm.cmd' @('run', 'build') $Back
    Ok 'Backend compilado (dist)'

    Titulo 'Frontend: dependências e compilação'
    Executar 'npm.cmd' @('ci', '--no-audit', '--no-fund') $front
    # O template gera, por padrão, pacote para Cloudflare Workers; para rodar com o Node local, o preset é node-server.
    $env:NITRO_PRESET = 'node-server'
    try { Executar 'npm.cmd' @('run', 'build') $front } finally { Remove-Item Env:NITRO_PRESET -ErrorAction SilentlyContinue }
    if (-not (Test-Path (Join-Path $front '.output\server\index.mjs'))) { throw 'A compilação do frontend não gerou .output\server\index.mjs.' }
    Ok 'Frontend compilado (.output, servidor Node)'
}

function Aplicar-Migrations {
    Titulo 'Estrutura do banco (migrations)'
    Executar 'npx.cmd' @('prisma', 'migrate', 'deploy') $Back
    Ok 'Migrations aplicadas'
}

function Banco-Vazio($pg) {
    $ErrorActionPreference = 'Continue'
    $url = (Ler-Env (Join-Path $Back '.env'))['DATABASE_URL']
    $n = & (Join-Path $pg.Bin 'psql.exe') (Url-Libpq $url) -tAc 'select count(*) from usuarios' 2>$null
    return ($LASTEXITCODE -eq 0 -and [int]("$n".Trim()) -eq 0)
}

function Carregar-Demonstracao {
    Titulo 'Dados de demonstração'
    Executar 'npm.cmd' @('run', 'db:seed:dev') $Back
    Ok 'Dados de demonstração carregados (usuários e senhas no Apêndice B do Manual do Usuário)'
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
    Titulo 'Início automático com o Windows'
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
    # pela linha de comando (inclui os servidores de desenvolvimento das mesmas pastas).
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

function Iniciar-Sistema($cfg, [switch]$AbrirNavegador) {
    Titulo 'Iniciando o sistema'
    foreach ($t in $TarefaApi, $TarefaSite) {
        if (-not (Get-ScheduledTask -TaskName $t -ErrorAction SilentlyContinue)) { throw "Tarefa '$t' não registrada. Execute a instalação completa." }
        Start-ScheduledTask -TaskName $t
    }
    if (Aguardar-Url "http://localhost:$($cfg.PortaApi)/health" 90) { Ok "API respondendo em http://localhost:$($cfg.PortaApi)" } else { Falha "A API não respondeu; consulte $Logs\api.log" }
    if (Aguardar-Url "http://localhost:$($cfg.PortaSite)/login" 60) { Ok "Site respondendo em http://localhost:$($cfg.PortaSite)" } else { Falha "O site não respondeu; consulte $Logs\site.log" }
    if ($AbrirNavegador) { Start-Process "http://localhost:$($cfg.PortaSite)/" }
}

function Mostrar-Status($cfg) {
    Titulo 'Situação do Rooster One'
    $front = Localizar-Frontend $cfg
    if ($front) { Ok "Frontend: $front" } else { Falha 'Frontend não localizado ao lado do backend' }
    $n = Versao-Node
    if ($n) { Ok "Node.js $($n.Versao)" } else { Falha 'Node.js não instalado' }
    $pg = Localizar-Postgres
    if (-not $pg) { Falha 'PostgreSQL não instalado' }
    elseif ($pg.Servico) {
        $msg = "PostgreSQL $($pg.Versao): serviço $($pg.Servico.Name) $($pg.Servico.Status)"
        if ($pg.Servico.Status -eq 'Running') { Ok $msg } else { Aviso $msg }
    }
    if (Test-Path (Join-Path $Back '.env')) { Ok '.env do backend presente' } else { Aviso '.env do backend ausente' }
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
    if (Get-Command winget -ErrorAction SilentlyContinue) { Ok 'winget disponível (instalação pela internet)' } else { Aviso 'winget indisponível: use a pasta scripts\instalador\instaladores' }
    $front = Localizar-Frontend $cfg
    Verificar-Portas $cfg $front
    $disco = Get-PSDrive ((Split-Path $Back -Qualifier).TrimEnd(':'))
    $livreGb = [math]::Round($disco.Free / 1GB, 1)
    if ($livreGb -ge 5) { Ok "Espaço livre no disco: $livreGb GB" } else { Aviso "Pouco espaço livre: $livreGb GB (recomendado: 5 GB)" }
}

function Instalar($cfg) {
    Exigir-Admin
    $front = Localizar-Frontend $cfg
    if (-not $front) {
        $front = Read-Host '  Pasta do frontend (RoosterOneFrontEnd) não encontrada ao lado do backend. Informe o caminho'
        if (-not (Test-Path (Join-Path $front 'package.json'))) { throw 'Pasta do frontend inválida.' }
    }
    $cfg.Frontend = (Resolve-Path $front).Path
    Titulo 'Rooster One — instalação completa'
    Info "Backend:  $Back"
    Info "Frontend: $($cfg.Frontend)"
    Verificar-Portas $cfg $cfg.Frontend -Interativo
    Garantir-Node $cfg
    $pg = Garantir-Postgres
    Salvar-Config $cfg
    Parar-Sistema $cfg.Frontend
    $envBack = Configurar-Env $cfg $cfg.Frontend
    Configurar-Banco $pg $envBack
    Compilar $cfg $cfg.Frontend
    Aplicar-Migrations
    if (Banco-Vazio $pg) {
        if (Confirmar 'O banco está vazio. Carregar os dados de demonstração (usuários, turmas, cursos etc.)?') { Carregar-Demonstracao }
    } else {
        Info 'O banco já possui dados; os dados de demonstração não foram carregados.'
    }
    New-Item -ItemType Directory -Force (Join-Path $Back 'uploads') | Out-Null
    $lancador = Escrever-Lancador $cfg $cfg.Frontend
    Registrar-Tarefas $lancador
    Criar-Atalho $cfg $cfg.Frontend
    Salvar-Config $cfg
    Iniciar-Sistema $cfg -AbrirNavegador
    Titulo 'Instalação concluída'
    Ok "Acesse http://localhost:$($cfg.PortaSite) (atalho 'Rooster One' na área de trabalho)."
    Ok 'O sistema passa a iniciar automaticamente com o Windows.'
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

function Desinstalar($cfg) {
    Exigir-Admin
    Titulo 'Desinstalação'
    $front = Localizar-Frontend $cfg
    Parar-Sistema $front
    foreach ($t in $TarefaApi, $TarefaSite) {
        if (Get-ScheduledTask -TaskName $t -ErrorAction SilentlyContinue) { Unregister-ScheduledTask -TaskName $t -Confirm:$false; Ok "Tarefa '$t' removida" }
    }
    if (Test-Path $Atalho) { Remove-Item $Atalho -Force; Ok 'Atalho removido' }
    $pg = Localizar-Postgres
    $url = (Ler-Env (Join-Path $Back '.env'))['DATABASE_URL']
    if ($pg -and $url -match '^postgres(?:ql)?://([^:@/]+)(?::[^@]*)?@[^/]+/([^?]+)') {
        $usuarioDb = $Matches[1]; $nomeDb = $Matches[2]
        if (Confirmar "Excluir também o banco '$nomeDb'? (todos os dados serão perdidos)") {
            $cred = Credencial-Superusuario
            Psql-Super $pg $cred "drop database if exists `"$nomeDb`" with (force)" | Out-Null
            if ($usuarioDb -ne 'postgres') { Psql-Super $pg $cred "drop role if exists `"$usuarioDb`"" | Out-Null }
            Ok 'Banco excluído'
        }
    }
    Info 'O código-fonte, o .env, os arquivos enviados (uploads) e os backups foram mantidos.'
    Info 'Node.js e PostgreSQL permanecem instalados; para removê-los, use "Aplicativos instalados" do Windows.'
}

# ---------------------------------------------------------------------------------------------------------------
# Menu
# ---------------------------------------------------------------------------------------------------------------
function Executar-Acao($nome, $cfg) {
    switch ($nome) {
        'Instalar' { Instalar $cfg }
        'Iniciar' { Exigir-Admin; Iniciar-Sistema $cfg -AbrirNavegador }
        'Parar' { Exigir-Admin; Parar-Sistema (Localizar-Frontend $cfg) }
        'Status' { Mostrar-Status $cfg }
        'Verificar' { Verificar-Ambiente $cfg }
        'Backup' { Fazer-Backup }
        'Demonstracao' { Restaurar-Demonstracao $cfg }
        'Desinstalar' { Desinstalar $cfg }
    }
}

# Carregado com ". .\instalador.ps1" (testes): apenas define as funções, sem executar o menu.
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
    Write-Host '            ROOSTER ONE — Instalador           ' -ForegroundColor Yellow
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
