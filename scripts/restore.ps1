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
if (-not $env:DATABASE_URL) { Write-Error "DATABASE_URL nao definida." }

if (-not (Get-Command pg_restore -ErrorAction SilentlyContinue)) {
    Write-Error "pg_restore nao encontrado no PATH. Acrescente a pasta bin do PostgreSQL."
}

$alvo = $env:DATABASE_URL -replace '(//[^:]+):[^@]+@', '$1:***@'
Write-Output "Backup:  $Pasta"
$manifesto = Join-Path $Pasta 'manifesto.txt'
if (Test-Path $manifesto) { Write-Output ""; Get-Content $manifesto; Write-Output "" }
Write-Output "DESTINO: $alvo"
Write-Output ""
Write-Output "Isto APAGA os dados atuais desse banco e de uploads/."

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
    Write-Output "--> Restaurando uploads/"
    $pastaUploads = Join-Path $Raiz 'uploads'
    if (Test-Path $pastaUploads) { Remove-Item $pastaUploads -Recurse -Force }
    Expand-Archive -Path $arquivoUploads -DestinationPath $Raiz -Force
} else {
    Write-Output "--> Backup nao tinha uploads.zip; uploads/ mantido como esta"
}

Write-Output ""
Write-Output "==> Restauracao concluida."
Write-Output "Confira antes de considerar o sistema no ar:"
Write-Output "  - GET /health responde 200 (banco alcancavel)"
Write-Output "  - um anexo/certificado antigo ainda abre (arquivo e registro em sincronia)"
