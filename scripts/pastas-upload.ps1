# Resolução das pastas de arquivos enviados, com a mesma regra da aplicação
# (src/common/storage.config.ts): cada tipo de arquivo pode ser redirecionado
# por variável própria; sem ela, fica em <UPLOADS_DIR>/<subpasta>; sem
# UPLOADS_DIR, em <projeto>/uploads/<subpasta>. Caminho relativo é resolvido a
# partir da raiz do projeto, que é o diretório de trabalho esperado da aplicação.
#
# Carregado por backup.ps1 e restore.ps1 via dot-sourcing; não é executado
# diretamente. Qualquer nova pasta em storage.config.ts precisa ser incluída
# também em $TiposDeUpload, senão ficará fora do backup.

$TiposDeUpload = @(
    @{ Subpasta = 'videos-boost';          Variavel = 'BOOST_VIDEOS_DIR' },
    @{ Subpasta = 'materiais-boost';       Variavel = 'BOOST_MATERIAIS_DIR' },
    @{ Subpasta = 'certificados-boost';    Variavel = 'BOOST_CERTIFICADOS_DIR' },
    @{ Subpasta = 'anexos-tickets';        Variavel = 'DESK_ANEXOS_DIR' },
    @{ Subpasta = 'anexos-entregas';       Variavel = 'LEARN_ANEXOS_DIR' },
    @{ Subpasta = 'imagens-questoes';      Variavel = 'LEARN_IMAGENS_DIR' },
    @{ Subpasta = 'documentos-academicos'; Variavel = 'ACADEMY_DOCUMENTOS_DIR' },
    @{ Subpasta = 'notas-fiscais';         Variavel = 'FINANCE_NOTAS_DIR' }
)

function Resolve-CaminhoConfigurado([string]$Valor, [string]$Raiz) {
    if ([System.IO.Path]::IsPathRooted($Valor)) { return $Valor }
    return Join-Path $Raiz $Valor
}

function Resolve-PastasUpload([string]$Raiz) {
    $raizUploads = if ($env:UPLOADS_DIR -and $env:UPLOADS_DIR.Trim()) {
        Resolve-CaminhoConfigurado $env:UPLOADS_DIR.Trim() $Raiz
    } else {
        Join-Path $Raiz 'uploads'
    }
    foreach ($tipo in $TiposDeUpload) {
        $especifica = [Environment]::GetEnvironmentVariable($tipo.Variavel)
        $caminho = if ($especifica -and $especifica.Trim()) {
            Resolve-CaminhoConfigurado $especifica.Trim() $Raiz
        } else {
            Join-Path $raizUploads $tipo.Subpasta
        }
        [PSCustomObject]@{ Subpasta = $tipo.Subpasta; Variavel = $tipo.Variavel; Caminho = $caminho }
    }
}
