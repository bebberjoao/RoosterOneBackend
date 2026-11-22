<#
  Monta o pacote de instalação do Rooster One: uma pasta autocontida para levar a outro computador Windows.

  Estrutura gerada (padrão: pasta "instalador" ao lado dos dois repositórios):
    instalador\
      INSTALAR.exe              executável que abre a tela do instalador (pede elevação de administrador)
      LEIA-ME.txt               instruções de uso
      RoosterOneBackend\        cópia do backend (sem node_modules, .env, uploads, compilação e banco)
      RoosterOneFrontEnd\       cópia do frontend (sem node_modules e compilação)
      pacotes\                  instaladores do Node.js LTS e do PostgreSQL, usados sem internet

  Uso, em PowerShell (não exige administrador):
    .\scripts\instalador\montar-pacote.ps1
    .\scripts\instalador\montar-pacote.ps1 -Destino D:\RoosterOne-instalador -VersaoPostgres 18.4
    .\scripts\instalador\montar-pacote.ps1 -SemDownload      # só atualiza código e executável

  Pode ser repetido: o código é espelhado (arquivos removidos dos repositórios saem do pacote), e os instaladores já
  baixados não são baixados de novo. Documentação: docs/operations/09-instalador.md.
#>
[CmdletBinding()]
param(
    [string]$Destino = '',
    [string]$VersaoNode = 'latest-v24.x',
    [string]$VersaoPostgres = '18.4',
    [switch]$SemDownload
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Back = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Raiz = Split-Path $Back -Parent
if (-not $Destino) { $Destino = Join-Path $Raiz 'instalador' }
$Front = Get-ChildItem $Raiz -Directory | Where-Object { $_.Name -like 'RoosterOneFront*' -and (Test-Path (Join-Path $_.FullName 'package.json')) } |
    Select-Object -First 1
if (-not $Front) { throw "Repositório do frontend (RoosterOneFront*) não encontrado em $Raiz." }

function Passo($t) { Write-Host ''; Write-Host "== $t ==" -ForegroundColor Cyan }
function Ok($t) { Write-Host "  [OK] $t" -ForegroundColor Green }
function Info($t) { Write-Host "  ... $t" }

New-Item -ItemType Directory -Force $Destino | Out-Null
$Pacotes = Join-Path $Destino 'pacotes'
New-Item -ItemType Directory -Force $Pacotes | Out-Null

# ---------------------------------------------------------------------------------------------------------------
# 1. Código dos dois repositórios
# ---------------------------------------------------------------------------------------------------------------
# Ficam de fora o que é gerado na instalação ou é próprio deste computador: dependências, compilação, configuração
# com segredos, arquivos enviados, backups, dados da instalação e o histórico do Git. Com /MIR, o destino espelha a
# origem; as pastas excluídas não são apagadas do destino, de modo que uma instalação feita a partir do próprio
# pacote neste computador é preservada.
$PastasExcluidas = @('node_modules', '.git', 'dist', '.output', '.rooster', 'uploads', 'backups', 'prisma-test-client',
    '.tanstack', '.wrangler', '.vercel', '.netlify', '.nitro', 'coverage')
# Os documentos Word não vão na cópia: a instalação os gera de novo, já atualizados, na pasta "documentacao".
$ArquivosExcluidos = @('.env', '*.db', '*.db-journal', '*.log', '*.exe', '*.msi', '*.docx')

function Copiar-Repositorio($origem) {
    $alvo = Join-Path $Destino (Split-Path $origem -Leaf)
    $argumentos = @($origem, $alvo, '/MIR', '/R:1', '/W:1', '/NFL', '/NDL', '/NJH', '/NJS', '/NP', '/XD') + $PastasExcluidas + @('/XF') + $ArquivosExcluidos
    & robocopy.exe @argumentos | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "Falha ao copiar $origem (robocopy, código $LASTEXITCODE)." }
    $tamanho = (Get-ChildItem $alvo -Recurse -File -Force | Measure-Object Length -Sum).Sum / 1MB
    Ok ("{0} copiado ({1:N0} MB)" -f (Split-Path $origem -Leaf), $tamanho)
}

Passo 'Código do sistema'
Copiar-Repositorio $Back
Copiar-Repositorio $Front.FullName

# ---------------------------------------------------------------------------------------------------------------
# 2. Pacotes: Node.js LTS e PostgreSQL (fontes oficiais)
# ---------------------------------------------------------------------------------------------------------------
function Baixar($url, $arquivo) {
    $temp = "$arquivo.parcial"
    Info "Baixando $(Split-Path $arquivo -Leaf)..."
    Invoke-WebRequest $url -OutFile $temp -UseBasicParsing
    Move-Item $temp $arquivo -Force
}

if (-not $SemDownload) {
    Passo 'Pacotes'
    # Node.js: o nome exato e o SHA-256 vêm da lista oficial SHASUMS256.txt da versão.
    $baseNode = "https://nodejs.org/dist/$VersaoNode"
    $somas = (Invoke-WebRequest "$baseNode/SHASUMS256.txt" -UseBasicParsing).Content -split "`n"
    $linha = $somas | Where-Object { $_ -match '\s(node-v[\d.]+-x64\.msi)\s*$' } | Select-Object -First 1
    if (-not $linha) { throw "Instalador .msi do Node.js não encontrado em $baseNode." }
    $hashNode, $nomeNode = ($linha.Trim() -split '\s+')
    $arqNode = Join-Path $Pacotes $nomeNode
    Get-ChildItem $Pacotes -Filter 'node-*.msi' | Where-Object { $_.Name -ne $nomeNode } | Remove-Item -Force
    if (-not (Test-Path $arqNode)) { Baixar "$baseNode/$nomeNode" $arqNode }
    $calculado = (Get-FileHash $arqNode -Algorithm SHA256).Hash
    if ($calculado -ne $hashNode.ToUpper()) { Remove-Item $arqNode -Force; throw "SHA-256 do $nomeNode não confere com a lista oficial; o arquivo foi descartado." }
    Ok "$nomeNode (SHA-256 conferido com nodejs.org)"

    # PostgreSQL: instalador oficial da EDB para Windows (o mesmo indicado em postgresql.org/download/windows).
    $nomePg = "postgresql-$VersaoPostgres-1-windows-x64.exe"
    $arqPg = Join-Path $Pacotes $nomePg
    $urlPg = "https://get.enterprisedb.com/postgresql/$nomePg"
    Get-ChildItem $Pacotes -Filter 'postgresql-*.exe' | Where-Object { $_.Name -ne $nomePg } | Remove-Item -Force
    $esperado = [int64](Invoke-WebRequest $urlPg -Method Head -UseBasicParsing).Headers['Content-Length']
    if (-not (Test-Path $arqPg) -or (Get-Item $arqPg).Length -ne $esperado) { Baixar $urlPg $arqPg }
    if ((Get-Item $arqPg).Length -ne $esperado) { throw "Download incompleto de $nomePg." }
    $assinatura = Get-AuthenticodeSignature $arqPg
    if ($assinatura.Status -ne 'Valid') { Remove-Item $arqPg -Force; throw "A assinatura digital de $nomePg não é válida ($($assinatura.Status)); o arquivo foi descartado." }
    Ok ("{0} ({1:N0} MB; assinatura digital: {2})" -f $nomePg, ($esperado / 1MB), $assinatura.SignerCertificate.GetNameInfo('SimpleName', $false))
}

# ---------------------------------------------------------------------------------------------------------------
# 3. Executável
# ---------------------------------------------------------------------------------------------------------------
Passo 'Executável'
$csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path $csc)) { $csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe' }
if (-not (Test-Path $csc)) { throw 'Compilador C# do .NET Framework 4 não encontrado (csc.exe).' }

$obra = Join-Path ([IO.Path]::GetTempPath()) ("rooster-exe-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force $obra | Out-Null
try {
    # Ícone: o logotipo do sistema sobre fundo branco, em quatro tamanhos (entradas PNG, aceitas desde o Windows Vista).
    Add-Type -AssemblyName System.Drawing
    $logo = [Drawing.Image]::FromFile((Join-Path $Front.FullName 'src\assets\rooster-logo.png'))
    $imagens = foreach ($tam in 16, 32, 48, 256) {
        $bmp = New-Object Drawing.Bitmap $tam, $tam
        $g = [Drawing.Graphics]::FromImage($bmp)
        $g.SmoothingMode = 'AntiAlias'; $g.InterpolationMode = 'HighQualityBicubic'
        $raio = [int]($tam * 0.22)
        $caminho = New-Object Drawing.Drawing2D.GraphicsPath
        $caminho.AddArc(0, 0, $raio, $raio, 180, 90); $caminho.AddArc($tam - $raio - 1, 0, $raio, $raio, 270, 90)
        $caminho.AddArc($tam - $raio - 1, $tam - $raio - 1, $raio, $raio, 0, 90); $caminho.AddArc(0, $tam - $raio - 1, $raio, $raio, 90, 90)
        $caminho.CloseFigure()
        $g.FillPath([Drawing.Brushes]::White, $caminho)
        $m = [int]($tam * 0.12)
        $g.DrawImage($logo, $m, $m, $tam - 2 * $m, $tam - 2 * $m)
        $g.Dispose()
        $ms = New-Object IO.MemoryStream
        $bmp.Save($ms, [Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
        @{ Tamanho = $tam; Dados = $ms.ToArray() }
    }
    $logo.Dispose()
    $ico = New-Object IO.MemoryStream
    $bw = New-Object IO.BinaryWriter $ico
    $bw.Write([uint16]0); $bw.Write([uint16]1); $bw.Write([uint16]$imagens.Count)
    $deslocamento = 6 + 16 * $imagens.Count
    foreach ($img in $imagens) {
        $lado = if ($img.Tamanho -ge 256) { 0 } else { $img.Tamanho }
        $bw.Write([byte]$lado); $bw.Write([byte]$lado); $bw.Write([byte]0); $bw.Write([byte]0)
        $bw.Write([uint16]1); $bw.Write([uint16]32); $bw.Write([uint32]$img.Dados.Length); $bw.Write([uint32]$deslocamento)
        $deslocamento += $img.Dados.Length
    }
    foreach ($img in $imagens) { $bw.Write($img.Dados) }
    [IO.File]::WriteAllBytes((Join-Path $obra 'rooster.ico'), $ico.ToArray())

    # O manifesto pede a elevação de administrador na abertura, como o INSTALAR.bat.
    @'
<?xml version="1.0" encoding="utf-8"?>
<assembly manifestVersion="1.0" xmlns="urn:schemas-microsoft-com:asm.v1">
  <assemblyIdentity version="1.0.0.0" name="RoosterOne.Instalador"/>
  <trustInfo xmlns="urn:schemas-microsoft-com:asm.v2">
    <security>
      <requestedPrivileges xmlns="urn:schemas-microsoft-com:asm.v3">
        <requestedExecutionLevel level="requireAdministrator" uiAccess="false"/>
      </requestedPrivileges>
    </security>
  </trustInfo>
  <compatibility xmlns="urn:schemas-microsoft-com:compatibility.v1">
    <application>
      <supportedOS Id="{8e0f7a12-bfb3-4fe8-b9a5-48fd50a15a9a}"/>
    </application>
  </compatibility>
</assembly>
'@ | Set-Content (Join-Path $obra 'app.manifest') -Encoding UTF8

    # O executável apenas abre o instalador que está ao lado dele (RoosterOneBackend\scripts\instalador). Com o
    # argumento "menu", abre o menu de console; outros argumentos são repassados ao motor (ex.: -Acao Status).
    @'
using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Windows.Forms;

[assembly: AssemblyTitle("Rooster One - Instalador")]
[assembly: AssemblyProduct("Rooster One")]
[assembly: AssemblyDescription("Instalador do Rooster One para Windows")]
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]

static class Programa
{
    [STAThread]
    static int Main(string[] args)
    {
        string pasta = AppDomain.CurrentDomain.BaseDirectory;
        string scripts = Path.Combine(pasta, @"RoosterOneBackend\scripts\instalador");
        bool console = args.Length > 0;
        string alvo = Path.Combine(scripts, console ? "instalador.ps1" : "instalador-tela.ps1");
        if (!File.Exists(alvo))
        {
            MessageBox.Show(
                "Os arquivos do instalador não foram encontrados:\n" + alvo +
                "\n\nMantenha o INSTALAR.exe na mesma pasta das pastas RoosterOneBackend, RoosterOneFrontEnd e pacotes.",
                "Rooster One - Instalador", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
        string extras = "";
        if (console && !args[0].Equals("menu", StringComparison.OrdinalIgnoreCase))
            foreach (string a in args) extras += " \"" + a.Replace("\"", "") + "\"";
        string powershell = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), @"WindowsPowerShell\v1.0\powershell.exe");
        var inicio = new ProcessStartInfo(powershell,
            "-NoProfile -ExecutionPolicy Bypass " + (console ? "-NoExit " : "-WindowStyle Hidden ") + "-File \"" + alvo + "\"" + extras);
        inicio.WorkingDirectory = scripts;
        inicio.UseShellExecute = console;
        inicio.CreateNoWindow = !console;
        try { Process.Start(inicio); }
        catch (Exception e)
        {
            MessageBox.Show("Não foi possível abrir o instalador:\n" + e.Message, "Rooster One - Instalador", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
        return 0;
    }
}
'@ | Set-Content (Join-Path $obra 'Instalar.cs') -Encoding UTF8

    $exe = Join-Path $Destino 'INSTALAR.exe'
    $saida = & $csc /nologo /target:winexe /optimize+ /codepage:65001 "/out:$exe" "/win32icon:$(Join-Path $obra 'rooster.ico')" `
        "/win32manifest:$(Join-Path $obra 'app.manifest')" /reference:System.Windows.Forms.dll (Join-Path $obra 'Instalar.cs') 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Falha ao compilar o INSTALAR.exe:`n$($saida -join "`n")" }
    Ok ("INSTALAR.exe compilado ({0:N0} KB)" -f ((Get-Item $exe).Length / 1KB))
} finally {
    Remove-Item $obra -Recurse -Force -ErrorAction SilentlyContinue
}

# ---------------------------------------------------------------------------------------------------------------
# 4. Instruções
# ---------------------------------------------------------------------------------------------------------------
$pacotesLista = (Get-ChildItem $Pacotes -File | ForEach-Object { "      - $($_.Name)" }) -join "`r`n"
$leia = @"
ROOSTER ONE - PACOTE DE INSTALACAO PARA WINDOWS
================================================

Conteudo desta pasta
  INSTALAR.exe          abre o instalador (pede permissao de administrador)
  RoosterOneBackend\    sistema - API (backend)
  RoosterOneFrontEnd\   sistema - site (frontend)
  pacotes\              programas necessarios, instalados sem internet quando faltarem:
$pacotesLista

Como instalar
  1. Copie esta pasta inteira para o lugar onde o sistema vai ficar (por exemplo, C:\RoosterOne).
     O sistema e instalado e executado a partir desta pasta: nao a apague nem a mova depois de instalar.
  2. De um duplo clique em INSTALAR.exe e confirme a permissao de administrador.
  3. Na tela do instalador, informe nome, e-mail e senha do administrador e clique em "Instalar agora".
     A tela mostra cada passo. A primeira instalacao leva de 10 a 20 minutos.
  4. Ao final, use o botao "Abrir o Rooster One" ou o atalho "Rooster One" da area de trabalho
     (endereco: http://localhost:8080).
  5. A instalacao tambem gera a documentacao em Word (Manual do Usuario e Documentacao Geral) na pasta
     "documentacao", ao lado deste arquivo, com o atalho "Rooster One - Documentacao" na area de trabalho.

Requisitos
  - Windows 10 ou 11 (64 bits) e cerca de 5 GB livres.
  - Internet durante a instalacao, para baixar as bibliotecas do sistema (npm). O Node.js e o PostgreSQL
    vem nesta pasta e nao precisam de internet.

Outras opcoes
  - Menu avancado (iniciar, parar, situacao, backup, desinstalar): abra um Prompt de Comando nesta pasta e
    execute:  INSTALAR.exe menu
  - O Windows pode exibir o aviso "O Windows protegeu o computador" na primeira abertura, porque o
    INSTALAR.exe nao e assinado digitalmente: clique em "Mais informacoes" e depois em "Executar assim mesmo".

Documentacao completa: RoosterOneBackend\docs\operations\09-instalador.md
Pacote gerado em $(Get-Date -Format 'dd/MM/yyyy HH:mm') por RoosterOneBackend\scripts\instalador\montar-pacote.ps1.
"@
[IO.File]::WriteAllText((Join-Path $Destino 'LEIA-ME.txt'), $leia, (New-Object Text.UTF8Encoding $true))
Ok 'LEIA-ME.txt'

$total = (Get-ChildItem $Destino -Recurse -File -Force | Measure-Object Length -Sum).Sum / 1MB
Passo ('Pacote pronto em {0} ({1:N0} MB)' -f $Destino, $total)
