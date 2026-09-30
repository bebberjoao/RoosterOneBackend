# Backup do Rooster One em Windows: banco + arquivos enviados.
#
# Equivalente PowerShell de backup.sh. Existe porque o servidor de destino é
# Windows, e o script bash exigiria Git Bash ou WSL instalados só para isso.
#
# São as DUAS metades do estado. Só o dump do PostgreSQL não basta: anexo de
# chamado, documento academico, certificado e nota fiscal sao arquivos em
# disco, e o banco guarda apenas o nome do arquivo. Restaurar um sem o outro
# produz registro apontando para arquivo que nao existe.
#
# As pastas de arquivos sao resolvidas pela mesma regra da aplicação
# (scripts/pastas-upload.ps1): pastas redirecionadas por variavel de ambiente
# para outro disco (ex.: BOOST_VIDEOS_DIR) tambem entram no backup.
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

# Carrega .env sem sobrescrever o que já veio do ambiente — mesmo comportamento
# da aplicação (dotenv). Além de DATABASE_URL, o .env pode redirecionar as
# pastas de arquivos (UPLOADS_DIR, BOOST_VIDEOS_DIR etc.), que o backup precisa conhecer.
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
. (Join-Path $PSScriptRoot 'pastas-upload.ps1')

if (-not $env:DATABASE_URL) {
    Write-Error "DATABASE_URL nao definida (nem no ambiente, nem em .env)."
}

# pg_dump/pg_restore usam libpq puro, que rejeita "?schema=..." (parametro so
# reconhecido pelo Prisma) com "parametro da consulta de URI invalido".
$env:DATABASE_URL = $env:DATABASE_URL -replace '\?.*$', ''

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
# Cada tipo de arquivo é arquivado a partir da pasta onde a aplicação de fato o
# grava (inclusive pastas redirecionadas para outro disco), sob o nome canônico
# uploads/<subpasta>/ dentro do zip. Usa a API ZipArchive do .NET em vez de
# Compress-Archive: grava separador '/' conforme a especificação ZIP e não tem o
# limite de 2 GB por arquivo do Compress-Archive do Windows PowerShell 5.1.
Write-Output "--> Arquivos"
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$arquivoZip = Join-Path $Pasta 'uploads.zip'
$resumoPastas = @()
$zip = [System.IO.Compression.ZipFile]::Open($arquivoZip, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($pastaTipo in (Resolve-PastasUpload -Raiz $Raiz)) {
        if (-not (Test-Path $pastaTipo.Caminho)) {
            $resumoPastas += "  $($pastaTipo.Subpasta): (inexistente) $($pastaTipo.Caminho)"
            continue
        }
        $base = (Resolve-Path $pastaTipo.Caminho).Path.TrimEnd('\', '/')
        $arquivos = @(Get-ChildItem -Path $base -Recurse -File)
        foreach ($arquivo in $arquivos) {
            $relativo = $arquivo.FullName.Substring($base.Length + 1).Replace('\', '/')
            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                $zip, $arquivo.FullName, "uploads/$($pastaTipo.Subpasta)/$relativo",
                [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
        }
        $resumoPastas += "  $($pastaTipo.Subpasta): $($arquivos.Count) arquivo(s) de $base"
        Write-Output "    $($pastaTipo.Subpasta): $($arquivos.Count) arquivo(s)"
    }
} finally {
    $zip.Dispose()
}

# --- Manifesto ---
# Registra o que foi salvo e de onde, para a restauracao nao depender de
# memoria sobre qual dump corresponde a qual ambiente.
$bancoMascarado = $env:DATABASE_URL -replace '(//[^:]+):[^@]+@', '$1:***@'
$pastaMigrations = Join-Path $Raiz 'prisma/migrations'
$ultimaMigration = if (Test-Path $pastaMigrations) {
    (Get-ChildItem $pastaMigrations -Directory | Where-Object { $_.Name -match '^\d' } | Sort-Object Name | Select-Object -Last 1).Name
} else { '(nenhuma)' }
@"
Rooster One - backup
Data:        $(Get-Date -Format 'o')
Host:        $env:COMPUTERNAME
Banco:       $bancoMascarado
Migration:   $ultimaMigration
Conteudo:    banco.dump, uploads.zip
Pastas de origem:
$($resumoPastas -join "`r`n")
"@ | Set-Content -Path (Join-Path $Pasta 'manifesto.txt') -Encoding utf8

Write-Output "==> Concluido:"
Get-ChildItem $Pasta | Format-Table Name, Length, LastWriteTime
Write-Output ""
Write-Output "Lembrete: um backup que nunca foi restaurado nao e um backup."
Write-Output "Teste a restauracao com .\scripts\restore.ps1 -Pasta $Pasta num banco descartavel."
