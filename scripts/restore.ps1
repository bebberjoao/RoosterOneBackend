# Restauracao do Rooster One em Windows, a partir de um backup de backup.ps1.
#
# ATENCAO: sobrescreve o banco apontado por DATABASE_URL e o conteudo de
# uploads/. Por isso exige confirmacao explicita — restaurar no banco errado
# e uma das poucas operacoes genuinamente irreversiveis deste sistema.
#
# Uso:
#   .\scripts\restore.ps1 -Pasta .\backups\20260924-084500
#   .\scripts\restore.ps1 -Pasta .\backups\20260924-084500 -Confirmar   # sem prompt

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Pasta,
    [switch]$Confirmar
)

$ErrorActionPreference = 'Stop'
$Raiz = Split-Path -Parent $PSScriptRoot

if (-not (Test-Path $Pasta)) { Write-Error "Pasta de backup nao encontrada: $Pasta" }
$arquivoDump = Join-Path $Pasta 'banco.dump'
if (-not (Test-Path $arquivoDump)) { Write-Error "$arquivoDump nao encontrado." }

# Carrega .env sem sobrescrever o que já veio do ambiente (mesmo comportamento
# da aplicação), incluindo o redirecionamento das pastas de arquivos.
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
if (-not $env:DATABASE_URL) { Write-Error "DATABASE_URL nao definida." }
. (Join-Path $PSScriptRoot 'pastas-upload.ps1')

# pg_dump/pg_restore usam libpq puro, que rejeita "?schema=..." (parametro so
# reconhecido pelo Prisma) com "parametro da consulta de URI invalido".
$env:DATABASE_URL = $env:DATABASE_URL -replace '\?.*$', ''

if (-not (Get-Command pg_restore -ErrorAction SilentlyContinue)) {
    Write-Error "pg_restore nao encontrado no PATH. Acrescente a pasta bin do PostgreSQL."
}

$alvo = $env:DATABASE_URL -replace '(//[^:]+):[^@]+@', '$1:***@'
Write-Output "Backup:  $Pasta"
$manifesto = Join-Path $Pasta 'manifesto.txt'
if (Test-Path $manifesto) { Write-Output ""; Get-Content $manifesto; Write-Output "" }
Write-Output "DESTINO: $alvo"
Write-Output ""
Write-Output "Isto APAGA os dados atuais desse banco e das pastas de arquivos:"
foreach ($pastaTipo in (Resolve-PastasUpload -Raiz $Raiz)) { Write-Output "  $($pastaTipo.Caminho)" }

if (-not $Confirmar) {
    $resposta = Read-Host "Digite 'restaurar' para continuar"
    if ($resposta -ne 'restaurar') { Write-Output "Cancelado."; exit 1 }
}

# --clean --if-exists: derruba os objetos antes de recriar, para a restauracao
# funcionar num banco que ja tem schema — o caso comum.
Write-Output "--> Restaurando banco"
& pg_restore --clean --if-exists --no-owner --no-acl --dbname=$env:DATABASE_URL $arquivoDump
if ($LASTEXITCODE -ne 0) { Write-Error "pg_restore falhou (codigo $LASTEXITCODE)." }

$arquivoUploads = Join-Path $Pasta 'uploads.zip'
if (Test-Path $arquivoUploads) {
    # Cada entrada uploads/<subpasta>/... do zip volta para a pasta onde a
    # aplicação deste servidor grava aquele tipo de arquivo — que pode diferir
    # da pasta do servidor de origem, se houver redirecionamento por variável.
    Write-Output "--> Restaurando arquivos"
    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $destinoPorSubpasta = @{}
    foreach ($pastaTipo in (Resolve-PastasUpload -Raiz $Raiz)) {
        if (Test-Path $pastaTipo.Caminho) { Remove-Item (Join-Path $pastaTipo.Caminho '*') -Recurse -Force }
        New-Item -ItemType Directory -Force -Path $pastaTipo.Caminho | Out-Null
        $destinoPorSubpasta[$pastaTipo.Subpasta] = [System.IO.Path]::GetFullPath($pastaTipo.Caminho).TrimEnd('\', '/')
    }
    $restaurados = 0
    $zip = [System.IO.Compression.ZipFile]::OpenRead($arquivoUploads)
    try {
        foreach ($entrada in $zip.Entries) {
            # '\' -> '/': backups anteriores, gerados com Compress-Archive do
            # Windows PowerShell 5.1, gravavam o separador de diretório do Windows.
            $nome = $entrada.FullName.Replace('\', '/')
            if ($nome.EndsWith('/')) { continue }
            $partes = $nome.Split('/', 3)
            if ($partes.Count -lt 3 -or $partes[0] -ne 'uploads' -or -not $destinoPorSubpasta.ContainsKey($partes[1])) {
                Write-Warning "Entrada ignorada (fora das pastas de arquivos conhecidas): $nome"
                continue
            }
            $base = $destinoPorSubpasta[$partes[1]]
            $alvo = [System.IO.Path]::GetFullPath((Join-Path $base $partes[2]))
            # Impede que uma entrada com '..' grave fora da pasta de destino.
            if (-not $alvo.StartsWith($base + [System.IO.Path]::DirectorySeparatorChar)) {
                Write-Error "Entrada com caminho invalido no zip: $nome"
            }
            New-Item -ItemType Directory -Force -Path (Split-Path -Parent $alvo) | Out-Null
            [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entrada, $alvo, $true)
            $restaurados++
        }
    } finally {
        $zip.Dispose()
    }
    Write-Output "    $restaurados arquivo(s) restaurado(s)"
} else {
    Write-Output "--> Backup nao tinha uploads.zip; pastas de arquivos mantidas como estao"
}

Write-Output ""
Write-Output "==> Restauracao concluida."
Write-Output "Confira antes de considerar o sistema no ar:"
Write-Output "  - GET /health responde 200 (banco alcancavel)"
Write-Output "  - um anexo/certificado antigo ainda abre (arquivo e registro em sincronia)"
