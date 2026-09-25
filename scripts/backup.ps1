# Backup do Rooster One em Windows: banco + arquivos enviados.
#
# Equivalente PowerShell de backup.sh. Existe porque o servidor de destino é
# Windows, e o script bash exigiria Git Bash ou WSL instalados só para isso.
#
# São as DUAS metades do estado. Só o dump do PostgreSQL não basta: anexo de
# chamado, documento academico, certificado e nota fiscal sao arquivos em
# uploads/, e o banco guarda apenas o caminho. Restaurar um sem o outro
# produz registro apontando para arquivo que nao existe.
#
# Uso:
#   .\scripts\backup.ps1
#   .\scripts\backup.ps1 -Destino D:\backups-rooster
#
# Requer pg_dump no PATH (vem com o PostgreSQL para Windows; normalmente em
# C:\Program Files\PostgreSQL\16\bin) e DATABASE_URL no ambiente ou em .env.

[CmdletBinding()]
param(
    [string]$Destino = "./backups"
)

$ErrorActionPreference = 'Stop'
$Raiz = Split-Path -Parent $PSScriptRoot

# Carrega .env se DATABASE_URL nao veio do ambiente.
if (-not $env:DATABASE_URL) {
    $arquivoEnv = Join-Path $Raiz '.env'
    if (Test-Path $arquivoEnv) {
        Get-Content $arquivoEnv | ForEach-Object {
            if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
                $nome = $Matches[1]
                $valor = $Matches[2].Trim('"').Trim("'")
                if (-not [Environment]::GetEnvironmentVariable($nome)) {
                    Set-Item -Path "Env:$nome" -Value $valor
                }
            }
        }
    }
}

if (-not $env:DATABASE_URL) {
    Write-Error "DATABASE_URL nao definida (nem no ambiente, nem em .env)."
}

if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
    Write-Error "pg_dump nao encontrado no PATH. Acrescente a pasta bin do PostgreSQL (ex.: C:\Program Files\PostgreSQL\16\bin)."
}

$Carimbo = Get-Date -Format 'yyyyMMdd-HHmmss'
$Pasta = Join-Path $Destino $Carimbo
New-Item -ItemType Directory -Force -Path $Pasta | Out-Null
Write-Output "==> Backup em $Pasta"

# --- Banco ---
# --no-owner/--no-acl: o dump precisa poder ser restaurado num banco cujo
# usuario tem outro nome, que e o caso normal entre maquinas diferentes.
Write-Output "--> Banco (pg_dump)"
$arquivoDump = Join-Path $Pasta 'banco.dump'
& pg_dump --no-owner --no-acl --format=custom --dbname=$env:DATABASE_URL --file=$arquivoDump
if ($LASTEXITCODE -ne 0) { Write-Error "pg_dump falhou (codigo $LASTEXITCODE)." }

# --- Arquivos ---
$pastaUploads = Join-Path $Raiz 'uploads'
if (Test-Path $pastaUploads) {
    Write-Output "--> Arquivos (uploads/)"
    Compress-Archive -Path $pastaUploads -DestinationPath (Join-Path $Pasta 'uploads.zip') -Force
} else {
    Write-Output "--> uploads/ nao existe ainda; nada a arquivar"
}

# --- Manifesto ---
# Registra o que foi salvo e de onde, para a restauracao nao depender de
# memoria sobre qual dump corresponde a qual ambiente.
$bancoMascarado = $env:DATABASE_URL -replace '(//[^:]+):[^@]+@', '$1:***@'
$pastaMigrations = Join-Path $Raiz 'prisma/migrations'
$ultimaMigration = if (Test-Path $pastaMigrations) {
    (Get-ChildItem $pastaMigrations -Directory | Where-Object { $_.Name -match '^\d' } | Sort-Object Name | Select-Object -Last 1).Name
} else { '(nenhuma)' }
$temUploads = Test-Path (Join-Path $Pasta 'uploads.zip')

@"
Rooster One - backup
Data:        $(Get-Date -Format 'o')
Host:        $env:COMPUTERNAME
Banco:       $bancoMascarado
Migration:   $ultimaMigration
Conteudo:    banco.dump$(if ($temUploads) { ', uploads.zip' })
"@ | Set-Content -Path (Join-Path $Pasta 'manifesto.txt') -Encoding utf8

Write-Output "==> Concluido:"
Get-ChildItem $Pasta | Format-Table Name, Length, LastWriteTime
Write-Output ""
Write-Output "Lembrete: um backup que nunca foi restaurado nao e um backup."
Write-Output "Teste a restauracao com .\scripts\restore.ps1 -Pasta $Pasta num banco descartavel."
