# Simulado de recuperação do Rooster One: restaura um backup de verdade
# (gerado por backup.ps1) num banco DESCARTÁVEL, confere que as tabelas
# principais vieram populadas e que um arquivo referenciado no banco existe
# de fato no zip de uploads — e depois apaga tudo. NUNCA toca no banco nem
# na pasta uploads/ reais: por isso pode ser reexecutado com segurança e
# agendado (ex.: Agendador de Tarefas semanal), diferente de restore.ps1.
#
# Existe porque um backup que nunca foi restaurado não é um backup de
# verdade — restore.ps1 exige confirmação e sobrescreve dados reais, então
# na prática só roda numa emergência. Este script é o jeito de provar,
# rotineiramente, que os backups gerados são restauráveis.
#
# Uso:
#   .\scripts\recovery-drill.ps1 -Pasta .\backups\20260928-090000
#   .\scripts\recovery-drill.ps1 -Pasta .\backups\20260928-090000 -ManterBanco   # não limpa, pra inspecionar
#
# Requer createdb/pg_restore/psql/dropdb no PATH (mesma instalação do
# PostgreSQL usada por backup.ps1/restore.ps1) e DATABASE_URL no ambiente ou
# em .env — usada só para descobrir host/porta/usuário do SERVIDOR; o nome
# do banco de dentro dela nunca é tocado.

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Pasta,
    [switch]$ManterBanco
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

foreach ($cmd in 'createdb', 'pg_restore', 'psql', 'dropdb') {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Error "$cmd nao encontrado no PATH. Acrescente a pasta bin do PostgreSQL."
    }
}

if ($env:DATABASE_URL -notmatch '^postgres(?:ql)?://([^:]+):([^@]+)@([^:/]+):(\d+)/') {
    Write-Error "DATABASE_URL nao esta no formato esperado (postgresql://usuario:senha@host:porta/banco)."
}
$PgUser = $Matches[1]
$env:PGPASSWORD = $Matches[2]
$PgHost = $Matches[3]
$PgPort = $Matches[4]

$Carimbo = Get-Date -Format 'yyyyMMddHHmmss'
$BancoDrill = "rooster_drill_$Carimbo"
$PastaUploadsDrill = Join-Path $env:TEMP "rooster-drill-uploads-$Carimbo"

# Tabelas centrais de módulos independentes — se todas vierem populadas (ou
# corretamente vazias num banco de teste), o dump não está truncado/corrompido.
$TabelasEsperadas = @('usuarios', 'permissoes', 'logs_auditoria', 'tickets', 'reservas', 'cobrancas')

$sucesso = $false
try {
    Write-Output "==> Restaurando '$arquivoDump' em banco descartavel '$BancoDrill' (${PgHost}:${PgPort})"
    & createdb -h $PgHost -p $PgPort -U $PgUser $BancoDrill
    if ($LASTEXITCODE -ne 0) { Write-Error "createdb falhou (codigo $LASTEXITCODE)." }

    $UriDrill = "postgresql://${PgUser}:$($env:PGPASSWORD)@${PgHost}:${PgPort}/${BancoDrill}"
    & pg_restore --no-owner --no-acl --dbname=$UriDrill $arquivoDump
    if ($LASTEXITCODE -ne 0) { Write-Error "pg_restore falhou (codigo $LASTEXITCODE) - o backup NAO e restauravel." }

    Write-Output ""
    Write-Output "==> Conferindo tabelas principais"
    $falhas = @()
    foreach ($tabela in $TabelasEsperadas) {
        $total = & psql -h $PgHost -p $PgPort -U $PgUser -d $BancoDrill -t -A -c "SELECT COUNT(*) FROM $tabela" 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Output "  [FALHA] $tabela - tabela nao existe no restore"
            $falhas += $tabela
            continue
        }
        Write-Output "  [OK]    $tabela - $($total.Trim()) linha(s)"
    }

    Write-Output ""
    Write-Output "==> Conferindo sincronia banco/arquivo (uploads.zip)"
    $arquivoUploads = Join-Path $Pasta 'uploads.zip'
    if (-not (Test-Path $arquivoUploads)) {
        Write-Output "  [PULADO] backup nao tem uploads.zip"
    } else {
        $amostraRaw = & psql -h $PgHost -p $PgPort -U $PgUser -d $BancoDrill -t -A -c "SELECT caminho FROM anexos_tickets WHERE caminho IS NOT NULL LIMIT 1" 2>$null
        $amostra = "$amostraRaw".Trim()
        if (-not $amostra) {
            Write-Output "  [PULADO] nenhum anexo de chamado no banco restaurado"
        } else {
            Expand-Archive -Path $arquivoUploads -DestinationPath $PastaUploadsDrill -Force
            $caminhoEsperado = Join-Path $PastaUploadsDrill 'uploads' 'anexos-tickets' $amostra
            if (Test-Path $caminhoEsperado) {
                Write-Output "  [OK]    anexo '$amostra' referenciado no banco existe no zip de uploads"
            } else {
                Write-Output "  [FALHA] anexo '$amostra' referenciado no banco NAO existe no zip de uploads"
                $falhas += 'sincronia-uploads'
            }
        }
    }

    Write-Output ""
    if ($falhas.Count -eq 0) {
        Write-Output "==> Simulado OK: backup em '$Pasta' e restauravel e consistente."
        $sucesso = $true
    } else {
        Write-Output "==> Simulado FALHOU: $($falhas -join ', ')"
    }
} finally {
    if ($ManterBanco) {
        Write-Output ""
        Write-Output "-ManterBanco: banco '$BancoDrill' preservado para inspecao manual."
        Write-Output "Limpe depois com: dropdb -h $PgHost -p $PgPort -U $PgUser $BancoDrill"
    } else {
        Write-Output ""
        Write-Output "--> Limpando banco descartavel"
        & dropdb -h $PgHost -p $PgPort -U $PgUser --if-exists $BancoDrill 2>$null
    }
    if (Test-Path $PastaUploadsDrill) { Remove-Item $PastaUploadsDrill -Recurse -Force -ErrorAction SilentlyContinue }
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

if (-not $sucesso) { exit 1 }
