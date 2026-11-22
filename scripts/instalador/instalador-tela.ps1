<#
  Tela do instalador do Rooster One para Windows.

  Mostra o passo a passo da instalação (o que já foi feito, o que está em andamento e o que falta), com barra de
  progresso, tempo decorrido e os detalhes de cada operação. A instalação em si é feita pelo motor
  (instalador.ps1), executado em segundo plano; esta tela apenas recebe o andamento e o exibe.

  Uso: execute INSTALAR.bat (pede elevação de administrador). Para ver a tela sem instalar nada:
    powershell -ExecutionPolicy Bypass -File .\scripts\instalador\instalador-tela.ps1 -Demo
  -Captura <pasta> grava imagens das telas (usado na documentação) e encerra.
#>
[CmdletBinding()]
param(
    [switch]$Demo,
    [string]$Captura = ''
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase, System.Windows.Forms
try { [Console]::OutputEncoding = New-Object Text.UTF8Encoding $false } catch { }
# O console fica oculto: um erro fora da instalação (por exemplo, ao montar a janela) é mostrado em uma caixa de mensagem.
trap {
    [void][Windows.MessageBox]::Show("O instalador encontrou um erro e será fechado.`n`n$($_.Exception.Message)`n$($_.InvocationInfo.PositionMessage)", 'Rooster One — Instalador', 'OK', 'Error')
    break
}

$Motor = Join-Path $PSScriptRoot 'instalador.ps1'
. $Motor

# ---------------------------------------------------------------------------------------------------------------
# Janela
# ---------------------------------------------------------------------------------------------------------------
[xml]$xaml = @'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Rooster One — Instalador" Width="1000" Height="704" MinWidth="1000" MinHeight="704"
        WindowStartupLocation="CenterScreen" ResizeMode="CanMinimize" Background="#F5F6FA"
        FontFamily="Segoe UI" FontSize="13" UseLayoutRounding="True" SnapsToDevicePixels="True"
        TextOptions.TextFormattingMode="Display">
  <Window.Resources>
    <SolidColorBrush x:Key="Tinta" Color="#171B2E"/>
    <SolidColorBrush x:Key="TintaSuave" Color="#5B6380"/>
    <SolidColorBrush x:Key="Destaque" Color="#4F5FE0"/>
    <SolidColorBrush x:Key="Borda" Color="#E1E4EE"/>

    <Style x:Key="BotaoPrimario" TargetType="Button">
      <Setter Property="Foreground" Value="White"/>
      <Setter Property="Background" Value="#4F5FE0"/>
      <Setter Property="FontWeight" Value="SemiBold"/>
      <Setter Property="FontSize" Value="13.5"/>
      <Setter Property="Padding" Value="22,0"/>
      <Setter Property="Height" Value="40"/>
      <Setter Property="Cursor" Value="Hand"/>
      <Setter Property="Template">
        <Setter.Value>
          <ControlTemplate TargetType="Button">
            <Border x:Name="Fundo" Background="{TemplateBinding Background}" CornerRadius="9" Padding="{TemplateBinding Padding}">
              <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
            </Border>
            <ControlTemplate.Triggers>
              <Trigger Property="IsMouseOver" Value="True"><Setter TargetName="Fundo" Property="Background" Value="#3F4ECB"/></Trigger>
              <Trigger Property="IsPressed" Value="True"><Setter TargetName="Fundo" Property="Background" Value="#3542B0"/></Trigger>
              <Trigger Property="IsEnabled" Value="False"><Setter TargetName="Fundo" Property="Background" Value="#B9BFDD"/></Trigger>
            </ControlTemplate.Triggers>
          </ControlTemplate>
        </Setter.Value>
      </Setter>
    </Style>

    <Style x:Key="BotaoSecundario" TargetType="Button">
      <Setter Property="Foreground" Value="#171B2E"/>
      <Setter Property="Background" Value="White"/>
      <Setter Property="FontSize" Value="13"/>
      <Setter Property="Padding" Value="18,0"/>
      <Setter Property="Height" Value="40"/>
      <Setter Property="Cursor" Value="Hand"/>
      <Setter Property="Template">
        <Setter.Value>
          <ControlTemplate TargetType="Button">
            <Border x:Name="Fundo" Background="{TemplateBinding Background}" BorderBrush="#D5D9E6" BorderThickness="1" CornerRadius="9" Padding="{TemplateBinding Padding}">
              <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
            </Border>
            <ControlTemplate.Triggers>
              <Trigger Property="IsMouseOver" Value="True"><Setter TargetName="Fundo" Property="Background" Value="#EEF0F7"/></Trigger>
              <Trigger Property="IsEnabled" Value="False"><Setter Property="Foreground" Value="#A3A9BF"/></Trigger>
            </ControlTemplate.Triggers>
          </ControlTemplate>
        </Setter.Value>
      </Setter>
    </Style>

    <Style x:Key="BotaoLink" TargetType="Button">
      <Setter Property="Foreground" Value="#4F5FE0"/>
      <Setter Property="Cursor" Value="Hand"/>
      <Setter Property="FontSize" Value="12.5"/>
      <Setter Property="Template">
        <Setter.Value>
          <ControlTemplate TargetType="Button">
            <TextBlock x:Name="Texto" Text="{TemplateBinding Content}" Foreground="{TemplateBinding Foreground}"/>
            <ControlTemplate.Triggers>
              <Trigger Property="IsMouseOver" Value="True"><Setter TargetName="Texto" Property="TextDecorations" Value="Underline"/></Trigger>
            </ControlTemplate.Triggers>
          </ControlTemplate>
        </Setter.Value>
      </Setter>
    </Style>

    <Style x:Key="Campo" TargetType="TextBox">
      <Setter Property="Height" Value="34"/>
      <Setter Property="Padding" Value="9,0"/>
      <Setter Property="VerticalContentAlignment" Value="Center"/>
      <Setter Property="BorderBrush" Value="#D5D9E6"/>
      <Setter Property="Foreground" Value="#171B2E"/>
      <Setter Property="Template">
        <Setter.Value>
          <ControlTemplate TargetType="TextBox">
            <Border x:Name="Moldura" Background="White" BorderBrush="{TemplateBinding BorderBrush}" BorderThickness="1" CornerRadius="8">
              <ScrollViewer x:Name="PART_ContentHost" Margin="{TemplateBinding Padding}" VerticalAlignment="Center"/>
            </Border>
            <ControlTemplate.Triggers>
              <Trigger Property="IsKeyboardFocused" Value="True"><Setter TargetName="Moldura" Property="BorderBrush" Value="#4F5FE0"/></Trigger>
            </ControlTemplate.Triggers>
          </ControlTemplate>
        </Setter.Value>
      </Setter>
    </Style>

    <Style x:Key="CampoSenha" TargetType="PasswordBox">
      <Setter Property="Height" Value="34"/>
      <Setter Property="Padding" Value="9,0"/>
      <Setter Property="VerticalContentAlignment" Value="Center"/>
      <Setter Property="BorderBrush" Value="#D5D9E6"/>
      <Setter Property="Template">
        <Setter.Value>
          <ControlTemplate TargetType="PasswordBox">
            <Border x:Name="Moldura" Background="White" BorderBrush="{TemplateBinding BorderBrush}" BorderThickness="1" CornerRadius="8">
              <ScrollViewer x:Name="PART_ContentHost" Margin="{TemplateBinding Padding}" VerticalAlignment="Center"/>
            </Border>
            <ControlTemplate.Triggers>
              <Trigger Property="IsKeyboardFocused" Value="True"><Setter TargetName="Moldura" Property="BorderBrush" Value="#4F5FE0"/></Trigger>
            </ControlTemplate.Triggers>
          </ControlTemplate>
        </Setter.Value>
      </Setter>
    </Style>


    <!-- Barra de rolagem discreta, para a área escura dos detalhes -->
    <Style x:Key="RolagemEscura" TargetType="ScrollBar">
      <Setter Property="Width" Value="8"/>
      <Setter Property="MinWidth" Value="8"/>
      <Setter Property="Background" Value="Transparent"/>
      <Setter Property="Template">
        <Setter.Value>
          <ControlTemplate TargetType="ScrollBar">
            <Grid Background="Transparent">
              <Track x:Name="PART_Track" IsDirectionReversed="True">
                <Track.Thumb>
                  <Thumb>
                    <Thumb.Template>
                      <ControlTemplate TargetType="Thumb">
                        <Border CornerRadius="4" Background="#39426A"/>
                      </ControlTemplate>
                    </Thumb.Template>
                  </Thumb>
                </Track.Thumb>
              </Track>
            </Grid>
          </ControlTemplate>
        </Setter.Value>
      </Setter>
    </Style>

    <Style x:Key="Rotulo" TargetType="TextBlock">
      <Setter Property="Foreground" Value="#5B6380"/>
      <Setter Property="FontSize" Value="11.5"/>
      <Setter Property="Margin" Value="0,0,0,5"/>
    </Style>
    <Style x:Key="Cartao" TargetType="Border">
      <Setter Property="Background" Value="White"/>
      <Setter Property="BorderBrush" Value="#E1E4EE"/>
      <Setter Property="BorderThickness" Value="1"/>
      <Setter Property="CornerRadius" Value="12"/>
      <Setter Property="Padding" Value="18,12"/>
    </Style>
  </Window.Resources>

  <Grid x:Name="Raiz" Background="#F5F6FA">
    <Grid.ColumnDefinitions>
      <ColumnDefinition Width="304"/>
      <ColumnDefinition Width="*"/>
    </Grid.ColumnDefinitions>

    <!-- Coluna do passo a passo -->
    <Border Grid.Column="0">
      <Border.Background>
        <LinearGradientBrush StartPoint="0,0" EndPoint="0,1">
          <GradientStop Color="#171C31" Offset="0"/>
          <GradientStop Color="#10142A" Offset="1"/>
        </LinearGradientBrush>
      </Border.Background>
      <DockPanel Margin="24,24,18,18">
        <StackPanel DockPanel.Dock="Top" Orientation="Horizontal">
          <Border Width="46" Height="46" CornerRadius="13" Background="White">
            <Image x:Name="Logo" Margin="7" RenderOptions.BitmapScalingMode="HighQuality"/>
          </Border>
          <StackPanel Margin="13,0,0,0" VerticalAlignment="Center">
            <TextBlock Text="Rooster One" FontSize="19" FontWeight="SemiBold" Foreground="White"/>
            <TextBlock Text="Instalador para Windows" Foreground="#8E96B8" FontSize="11.5" Margin="0,1,0,0"/>
          </StackPanel>
        </StackPanel>
        <TextBlock DockPanel.Dock="Bottom" x:Name="Rodape" Foreground="#606991" FontSize="10.5" TextWrapping="Wrap"/>
        <TextBlock DockPanel.Dock="Top" Text="PASSO A PASSO" Margin="2,30,0,12" Foreground="#6C759E" FontSize="10.5" FontWeight="SemiBold"/>
        <StackPanel x:Name="ListaPassos"/>
      </DockPanel>
    </Border>

    <!-- Área principal -->
    <Grid Grid.Column="1" Margin="38,26,38,22">

      <!-- Página inicial -->
      <DockPanel x:Name="PaginaInicio">
        <StackPanel DockPanel.Dock="Top">
          <TextBlock x:Name="InicioTitulo" Text="Instalar o Rooster One" FontSize="25" FontWeight="SemiBold" Foreground="{StaticResource Tinta}"/>
          <TextBlock x:Name="InicioSubtitulo" Margin="0,6,0,0" Foreground="{StaticResource TintaSuave}" TextWrapping="Wrap"
                     Text="O instalador prepara tudo neste computador, sem perguntas no meio do caminho: banco de dados, API, site e início automático com o Windows."/>
        </StackPanel>

        <Grid DockPanel.Dock="Bottom" Margin="0,12,0,0">
          <StackPanel Orientation="Horizontal" HorizontalAlignment="Left" VerticalAlignment="Center">
            <Button x:Name="BotaoMenu" Style="{StaticResource BotaoLink}" Content="Menu avançado (parar, backup, desinstalar)"/>
          </StackPanel>
          <StackPanel Orientation="Horizontal" HorizontalAlignment="Right">
            <Button x:Name="BotaoAbrirInstalado" Style="{StaticResource BotaoSecundario}" Content="Abrir o Rooster One" Margin="0,0,10,0" Visibility="Collapsed"/>
            <Button x:Name="BotaoInstalar" Style="{StaticResource BotaoPrimario}" Content="Instalar agora"/>
          </StackPanel>
        </Grid>
        <Border DockPanel.Dock="Bottom" x:Name="FaixaAviso" Background="#FDECEC" BorderBrush="#F3B4B4" BorderThickness="1" CornerRadius="9" Padding="12,7" Margin="0,10,0,0" Visibility="Collapsed">
          <TextBlock x:Name="TextoAviso" Foreground="#9B1C1C" TextWrapping="Wrap" FontSize="12.5"/>
        </Border>

        <ScrollViewer Margin="0,16,0,0" VerticalScrollBarVisibility="Auto" Focusable="False">
        <StackPanel>
          <Border Style="{StaticResource Cartao}">
            <StackPanel>
              <TextBlock Text="Este computador" FontWeight="SemiBold" Foreground="{StaticResource Tinta}" Margin="0,0,0,5"/>
              <StackPanel x:Name="ListaAmbiente"/>
            </StackPanel>
          </Border>

          <Border x:Name="CartaoAdmin" Style="{StaticResource Cartao}" Margin="0,10,0,0">
            <StackPanel>
              <TextBlock Text="Conta de administrador" FontWeight="SemiBold" Foreground="{StaticResource Tinta}"/>
              <TextBlock Text="É com ela que você entra no sistema pela primeira vez e cadastra os demais usuários." Foreground="{StaticResource TintaSuave}" FontSize="12" Margin="0,2,0,8" TextWrapping="Wrap"/>
              <Grid>
                <Grid.ColumnDefinitions><ColumnDefinition/><ColumnDefinition Width="14"/><ColumnDefinition/></Grid.ColumnDefinitions>
                <Grid.RowDefinitions><RowDefinition/><RowDefinition Height="8"/><RowDefinition/></Grid.RowDefinitions>
                <StackPanel Grid.Row="0" Grid.Column="0"><TextBlock Style="{StaticResource Rotulo}" Text="Nome"/><TextBox x:Name="CampoNome" Style="{StaticResource Campo}"/></StackPanel>
                <StackPanel Grid.Row="0" Grid.Column="2"><TextBlock Style="{StaticResource Rotulo}" Text="E-mail (será o login)"/><TextBox x:Name="CampoEmail" Style="{StaticResource Campo}"/></StackPanel>
                <StackPanel Grid.Row="2" Grid.Column="0"><TextBlock Style="{StaticResource Rotulo}" Text="Senha (em branco = gerar uma senha segura)"/><PasswordBox x:Name="CampoSenha" Style="{StaticResource CampoSenha}"/></StackPanel>
                <StackPanel Grid.Row="2" Grid.Column="2"><TextBlock Style="{StaticResource Rotulo}" Text="Confirmar a senha"/><PasswordBox x:Name="CampoSenha2" Style="{StaticResource CampoSenha}"/></StackPanel>
              </Grid>
            </StackPanel>
          </Border>

          <CheckBox x:Name="CaixaDemo" Margin="2,11,0,2" Foreground="{StaticResource Tinta}" VerticalContentAlignment="Center"
                    Content="Carregar dados de demonstração (usuários, cursos, turmas e chamados de exemplo)"/>
        </StackPanel>
        </ScrollViewer>
      </DockPanel>

      <!-- Página de andamento -->
      <DockPanel x:Name="PaginaProgresso" Visibility="Collapsed">
        <StackPanel DockPanel.Dock="Top">
          <TextBlock x:Name="ProgEyebrow" Text="PASSO 1 DE 11" FontSize="11" FontWeight="SemiBold" Foreground="{StaticResource Destaque}"/>
          <TextBlock x:Name="ProgTitulo" Text="Preparando…" FontSize="25" FontWeight="SemiBold" Foreground="{StaticResource Tinta}" Margin="0,4,0,0"/>
          <TextBlock x:Name="ProgDescricao" Foreground="{StaticResource TintaSuave}" Margin="0,4,0,0" TextWrapping="Wrap"/>

          <Grid Margin="0,20,0,0">
            <Grid.ColumnDefinitions><ColumnDefinition/><ColumnDefinition Width="Auto"/></Grid.ColumnDefinitions>
            <Border x:Name="BarraTrilho" Height="10" CornerRadius="5" Background="#E3E6F1" VerticalAlignment="Center">
              <Border x:Name="BarraCheia" Width="0" HorizontalAlignment="Left" CornerRadius="5">
                <Border.Background>
                  <LinearGradientBrush StartPoint="0,0" EndPoint="1,0">
                    <GradientStop Color="#4F5FE0" Offset="0"/>
                    <GradientStop Color="#7B8BFF" Offset="1"/>
                  </LinearGradientBrush>
                </Border.Background>
              </Border>
            </Border>
            <TextBlock x:Name="ProgPercentual" Grid.Column="1" Text="0%" Width="46" TextAlignment="Right" FontWeight="SemiBold" Foreground="{StaticResource Tinta}"/>
          </Grid>

          <Grid Margin="0,10,0,0">
            <TextBlock x:Name="ProgAtividade" Foreground="{StaticResource TintaSuave}" TextTrimming="CharacterEllipsis" Margin="0,0,150,0"/>
            <TextBlock x:Name="ProgTempo" HorizontalAlignment="Right" Foreground="{StaticResource TintaSuave}" Text="Tempo decorrido 00:00"/>
          </Grid>
        </StackPanel>

        <Grid DockPanel.Dock="Bottom" Margin="0,14,0,0">
          <TextBlock VerticalAlignment="Center" Foreground="{StaticResource TintaSuave}" FontSize="12" TextWrapping="Wrap" Margin="0,0,170,0"
                     Text="Pode continuar usando o computador. A compilação costuma levar de 5 a 15 minutos; não feche esta janela."/>
          <Button x:Name="BotaoCancelar" Style="{StaticResource BotaoSecundario}" Content="Interromper" HorizontalAlignment="Right"/>
        </Grid>

        <Border Margin="0,18,0,0" CornerRadius="12" Background="#0F1326" Padding="4,10,4,10">
          <DockPanel>
            <TextBlock DockPanel.Dock="Top" Text="DETALHES DA INSTALAÇÃO" Margin="12,0,0,6" Foreground="#6C759E" FontSize="10.5" FontWeight="SemiBold"/>
            <RichTextBox x:Name="CaixaLog" IsReadOnly="True" Background="Transparent" BorderThickness="0" Foreground="#C6CDEA"
                         FontFamily="Consolas" FontSize="12" VerticalScrollBarVisibility="Auto" Padding="6,0,6,0" IsDocumentEnabled="False">
              <RichTextBox.Resources>
                <Style TargetType="ScrollBar" BasedOn="{StaticResource RolagemEscura}"/>
              </RichTextBox.Resources>
              <FlowDocument PagePadding="0" LineHeight="17"/>
            </RichTextBox>
          </DockPanel>
        </Border>
      </DockPanel>

      <!-- Página final -->
      <DockPanel x:Name="PaginaFim" Visibility="Collapsed">
        <StackPanel DockPanel.Dock="Bottom" Orientation="Horizontal" HorizontalAlignment="Right" Margin="0,14,0,0">
          <Button x:Name="BotaoLog" Style="{StaticResource BotaoSecundario}" Content="Ver o registro completo" Margin="0,0,10,0"/>
          <Button x:Name="BotaoDocs" Style="{StaticResource BotaoSecundario}" Content="Abrir a documentação" Margin="0,0,10,0" Visibility="Collapsed"/>
          <Button x:Name="BotaoFechar" Style="{StaticResource BotaoSecundario}" Content="Fechar" Margin="0,0,10,0"/>
          <Button x:Name="BotaoRepetir" Style="{StaticResource BotaoPrimario}" Content="Tentar novamente" Visibility="Collapsed"/>
          <Button x:Name="BotaoAbrir" Style="{StaticResource BotaoPrimario}" Content="Abrir o Rooster One"/>
        </StackPanel>

        <StackPanel>
          <StackPanel Orientation="Horizontal">
            <Border x:Name="FimSelo" Width="54" Height="54" CornerRadius="27" Background="#DCFCE7">
              <TextBlock x:Name="FimIcone" Text="&#xE73E;" FontFamily="Segoe MDL2 Assets" FontSize="26" Foreground="#16A34A" HorizontalAlignment="Center" VerticalAlignment="Center"/>
            </Border>
            <StackPanel Margin="16,0,0,0" VerticalAlignment="Center">
              <TextBlock x:Name="FimTitulo" Text="Instalação concluída" FontSize="25" FontWeight="SemiBold" Foreground="{StaticResource Tinta}"/>
              <TextBlock x:Name="FimSubtitulo" Foreground="{StaticResource TintaSuave}" Margin="0,3,0,0" TextWrapping="Wrap" MaxWidth="520"
                         Text="O Rooster One está em funcionamento e passa a iniciar sozinho com o Windows."/>
            </StackPanel>
          </StackPanel>

          <Border x:Name="FimCartao" Style="{StaticResource Cartao}" Margin="0,22,0,0">
            <StackPanel x:Name="FimLinhas"/>
          </Border>

          <Border x:Name="FimSenhaCartao" Margin="0,12,0,0" Background="#FFF7E6" BorderBrush="#F2D38B" BorderThickness="1" CornerRadius="12" Padding="18,14" Visibility="Collapsed">
            <StackPanel>
              <TextBlock Text="Senha gerada para o primeiro acesso" FontWeight="SemiBold" Foreground="#7A4B00"/>
              <Grid Margin="0,8,0,0">
                <Grid.ColumnDefinitions><ColumnDefinition/><ColumnDefinition Width="Auto"/></Grid.ColumnDefinitions>
                <TextBox x:Name="FimSenha" Style="{StaticResource Campo}" IsReadOnly="True" FontFamily="Consolas" FontSize="14"/>
                <Button x:Name="BotaoCopiar" Grid.Column="1" Style="{StaticResource BotaoSecundario}" Content="Copiar" Height="36" Margin="8,0,0,0"/>
              </Grid>
              <TextBlock x:Name="FimSenhaNota" Margin="0,8,0,0" Foreground="#7A4B00" FontSize="12" TextWrapping="Wrap"/>
            </StackPanel>
          </Border>

          <Border x:Name="FimErroCartao" Margin="0,22,0,0" Background="#FDECEC" BorderBrush="#F3B4B4" BorderThickness="1" CornerRadius="12" Padding="18,14" Visibility="Collapsed">
            <StackPanel>
              <TextBlock x:Name="FimErroPasso" FontWeight="SemiBold" Foreground="#9B1C1C"/>
              <TextBlock x:Name="FimErroTexto" Margin="0,6,0,0" Foreground="#7F1D1D" TextWrapping="Wrap" FontFamily="Consolas" FontSize="12"/>
              <TextBlock Margin="0,10,0,0" Foreground="#7F1D1D" FontSize="12" TextWrapping="Wrap"
                         Text="Nada do que já foi feito se perde: corrija a causa e use Tentar novamente — os passos concluídos são conferidos de novo rapidamente."/>
            </StackPanel>
          </Border>
        </StackPanel>
      </DockPanel>
    </Grid>
  </Grid>
</Window>
'@

$janela = [Windows.Markup.XamlReader]::Load((New-Object System.Xml.XmlNodeReader $xaml))
$ui = @{}
foreach ($no in $xaml.SelectNodes('//*[@*[local-name()="Name"]]')) {
    $nome = $no.GetAttribute('Name', 'http://schemas.microsoft.com/winfx/2006/xaml')
    if ($nome) { $ui[$nome] = $janela.FindName($nome) }
}

function Cor($hex) { return (New-Object Windows.Media.BrushConverter).ConvertFromString($hex) }

# ---------------------------------------------------------------------------------------------------------------
# Estado
# ---------------------------------------------------------------------------------------------------------------
$Passos = Passos-Instalacao
# Peso de cada passo na barra geral (proporcional ao tempo que costuma levar) e tempo esperado, em segundos,
# usado para a barra avançar suavemente enquanto o passo está em andamento.
$Pesos = @{ ambiente = 2; node = 3; postgres = 3; config = 1; banco = 5; backend = 22; frontend = 33; migrations = 5; dados = 7; documentacao = 6; servicos = 3; inicio = 10 }
$Esperado = @{ ambiente = 5; node = 10; postgres = 15; config = 3; banco = 25; backend = 150; frontend = 260; migrations = 20; dados = 40; documentacao = 60; servicos = 8; inicio = 45 }

$estado = @{
    Cfg          = Ler-Config
    Itens        = @{}      # controles de cada passo na lista
    EstadoPasso  = @{}      # pendente | executando | ok | aviso | erro
    InicioPasso  = @{}
    PassoAtual   = $null
    Rodando      = $false
    InicioGeral  = $null
    Trabalho     = $null
    Execucao     = 0       # identifica a execução em curso; eventos de uma execução anterior são ignorados
    Resumo       = $null
    ArquivoLog   = $null
    Escritor     = $null
    Opcoes       = $null
    Instalado    = $false
    Admin        = (E-Admin)
}
$Fila = New-Object 'System.Collections.Concurrent.ConcurrentQueue[object]'

# ---------------------------------------------------------------------------------------------------------------
# Lista de passos (coluna da esquerda)
# ---------------------------------------------------------------------------------------------------------------
function Criar-Item-Passo($passo, [int]$numero, [bool]$ultimo) {
    $grade = New-Object Windows.Controls.Grid
    $grade.Margin = '0,0,0,0'
    $c1 = New-Object Windows.Controls.ColumnDefinition; $c1.Width = 30
    $c2 = New-Object Windows.Controls.ColumnDefinition
    $c3 = New-Object Windows.Controls.ColumnDefinition; $c3.Width = [Windows.GridLength]::Auto
    $grade.ColumnDefinitions.Add($c1); $grade.ColumnDefinitions.Add($c2); $grade.ColumnDefinitions.Add($c3)

    # Linha que liga um passo ao seguinte
    $linha = New-Object Windows.Shapes.Rectangle
    $linha.Width = 2; $linha.Fill = Cor '#2A3152'; $linha.HorizontalAlignment = 'Left'; $linha.Margin = '11,24,0,-2'
    if ($ultimo) { $linha.Visibility = 'Collapsed' }
    $grade.Children.Add($linha) | Out-Null

    $disco = New-Object Windows.Controls.Grid
    $disco.Width = 24; $disco.Height = 24; $disco.HorizontalAlignment = 'Left'; $disco.VerticalAlignment = 'Top'
    $circulo = New-Object Windows.Shapes.Ellipse
    $circulo.StrokeThickness = 2; $circulo.Stroke = Cor '#333B60'; $circulo.Fill = Cor '#151A30'
    $giro = New-Object Windows.Shapes.Path
    $giro.Data = [Windows.Media.Geometry]::Parse('M 12,1 A 11,11 0 0 1 23,12')
    $giro.Stroke = Cor '#8D9BFF'; $giro.StrokeThickness = 2.4; $giro.StrokeStartLineCap = 'Round'; $giro.StrokeEndLineCap = 'Round'
    $giro.RenderTransformOrigin = '0.5,0.5'; $giro.Visibility = 'Collapsed'
    $giro.RenderTransform = New-Object Windows.Media.RotateTransform 0
    $sinal = New-Object Windows.Controls.TextBlock
    $sinal.Text = "$numero"; $sinal.FontSize = 10.5; $sinal.FontWeight = 'SemiBold'; $sinal.Foreground = Cor '#7C85AB'
    $sinal.HorizontalAlignment = 'Center'; $sinal.VerticalAlignment = 'Center'
    $disco.Children.Add($circulo) | Out-Null; $disco.Children.Add($giro) | Out-Null; $disco.Children.Add($sinal) | Out-Null
    $grade.Children.Add($disco) | Out-Null

    $textos = New-Object Windows.Controls.StackPanel
    $textos.Margin = '6,2,0,13'
    [Windows.Controls.Grid]::SetColumn($textos, 1)
    $titulo = New-Object Windows.Controls.TextBlock
    $titulo.Text = $passo.Titulo; $titulo.FontSize = 13; $titulo.Foreground = Cor '#8089AE'
    $detalhe = New-Object Windows.Controls.TextBlock
    $detalhe.Text = $passo.Descricao; $detalhe.FontSize = 11; $detalhe.Foreground = Cor '#8E96B8'; $detalhe.TextWrapping = 'Wrap'
    $detalhe.Margin = '0,2,0,0'; $detalhe.Visibility = 'Collapsed'
    $textos.Children.Add($titulo) | Out-Null; $textos.Children.Add($detalhe) | Out-Null
    $grade.Children.Add($textos) | Out-Null

    $tempo = New-Object Windows.Controls.TextBlock
    $tempo.FontSize = 11; $tempo.Foreground = Cor '#6C759E'; $tempo.Margin = '6,4,2,0'; $tempo.VerticalAlignment = 'Top'
    [Windows.Controls.Grid]::SetColumn($tempo, 2)
    $grade.Children.Add($tempo) | Out-Null

    $ui.ListaPassos.Children.Add($grade) | Out-Null
    return @{ Circulo = $circulo; Giro = $giro; Sinal = $sinal; Titulo = $titulo; Detalhe = $detalhe; Tempo = $tempo; Linha = $linha; Numero = $numero }
}

function Formatar-Duracao([TimeSpan]$d) {
    if ($d.TotalSeconds -lt 60) { return "$([int][math]::Floor($d.TotalSeconds)) s" }
    return ('{0}:{1:00}' -f [int][math]::Floor($d.TotalMinutes), $d.Seconds)
}

function Definir-Estado-Passo($id, $novo) {
    $item = $estado.Itens[$id]
    if (-not $item) { return }
    $estado.EstadoPasso[$id] = $novo
    $item.Giro.Visibility = 'Collapsed'
    $item.Giro.RenderTransform.BeginAnimation([Windows.Media.RotateTransform]::AngleProperty, $null)
    $item.Sinal.FontFamily = New-Object Windows.Media.FontFamily 'Segoe UI'
    $item.Sinal.FontSize = 10.5
    $item.Detalhe.Visibility = 'Collapsed'
    $item.Titulo.FontWeight = 'Normal'
    switch ($novo) {
        'pendente' {
            $item.Circulo.Stroke = Cor '#333B60'; $item.Circulo.Fill = Cor '#151A30'
            $item.Sinal.Text = "$($item.Numero)"; $item.Sinal.Foreground = Cor '#7C85AB'
            $item.Titulo.Foreground = Cor '#8089AE'; $item.Tempo.Text = ''; $item.Linha.Fill = Cor '#2A3152'
        }
        'executando' {
            $item.Circulo.Stroke = Cor '#2E3760'; $item.Circulo.Fill = Cor '#1D2444'
            $item.Sinal.Text = "$($item.Numero)"; $item.Sinal.Foreground = Cor '#FFFFFF'
            $item.Titulo.Foreground = Cor '#FFFFFF'; $item.Titulo.FontWeight = 'SemiBold'
            $item.Detalhe.Visibility = 'Visible'
            $item.Giro.Visibility = 'Visible'
            $anim = New-Object Windows.Media.Animation.DoubleAnimation 0, 360, (New-Object Windows.Duration ([TimeSpan]::FromSeconds(1.1)))
            $anim.RepeatBehavior = [Windows.Media.Animation.RepeatBehavior]::Forever
            $item.Giro.RenderTransform.BeginAnimation([Windows.Media.RotateTransform]::AngleProperty, $anim)
        }
        default {
            $cores = @{ ok = '#22C55E'; aviso = '#F59E0B'; erro = '#EF4444' }
            $glifos = @{ ok = [char]0xE73E; aviso = [char]0xE7BA; erro = [char]0xE711 }
            $item.Circulo.Stroke = Cor $cores[$novo]; $item.Circulo.Fill = Cor $cores[$novo]
            $item.Sinal.FontFamily = New-Object Windows.Media.FontFamily 'Segoe MDL2 Assets'
            $item.Sinal.FontSize = 11.5; $item.Sinal.Text = "$($glifos[$novo])"; $item.Sinal.Foreground = Cor '#FFFFFF'
            $item.Titulo.Foreground = Cor $(if ($novo -eq 'erro') { '#FCA5A5' } else { '#D3D9F2' })
            if ($novo -eq 'ok') { $item.Linha.Fill = Cor '#1F7A45' }
            if ($estado.InicioPasso[$id]) { $item.Tempo.Text = Formatar-Duracao ((Get-Date) - $estado.InicioPasso[$id]) }
        }
    }
}

$n = 0
foreach ($p in $Passos) {
    $n++
    $estado.Itens[$p.Id] = Criar-Item-Passo $p $n ($n -eq $Passos.Count)
    $estado.EstadoPasso[$p.Id] = 'pendente'
}

# ---------------------------------------------------------------------------------------------------------------
# Página inicial
# ---------------------------------------------------------------------------------------------------------------
function Linha-Ambiente($rotulo, $valor, $situacao) {
    # situacao: ok | fazer | erro
    $cores = @{ ok = '#22C55E'; fazer = '#4F5FE0'; erro = '#EF4444' }
    $grade = New-Object Windows.Controls.Grid
    $grade.Margin = '0,2,0,2'
    foreach ($w in 16, 118) { $c = New-Object Windows.Controls.ColumnDefinition; $c.Width = $w; $grade.ColumnDefinitions.Add($c) }
    $grade.ColumnDefinitions.Add((New-Object Windows.Controls.ColumnDefinition))
    $ponto = New-Object Windows.Shapes.Ellipse
    $ponto.Width = 8; $ponto.Height = 8; $ponto.Fill = Cor $cores[$situacao]; $ponto.HorizontalAlignment = 'Left'; $ponto.VerticalAlignment = 'Center'
    $r = New-Object Windows.Controls.TextBlock
    $r.Text = $rotulo; $r.Foreground = Cor '#5B6380'; $r.FontSize = 12.5
    [Windows.Controls.Grid]::SetColumn($r, 1)
    $v = New-Object Windows.Controls.TextBlock
    $v.Text = $valor; $v.Foreground = Cor '#171B2E'; $v.FontSize = 12.5; $v.TextTrimming = 'CharacterEllipsis'; $v.ToolTip = $valor
    [Windows.Controls.Grid]::SetColumn($v, 2)
    $grade.Children.Add($ponto) | Out-Null; $grade.Children.Add($r) | Out-Null; $grade.Children.Add($v) | Out-Null
    $ui.ListaAmbiente.Children.Add($grade) | Out-Null
}

function Mostrar-Aviso($texto) {
    if ($texto) { $ui.TextoAviso.Text = $texto; $ui.FaixaAviso.Visibility = 'Visible' }
    else { $ui.FaixaAviso.Visibility = 'Collapsed' }
}

function Porta-Responde([int]$porta) {
    $cliente = New-Object Net.Sockets.TcpClient
    try {
        $pedido = $cliente.BeginConnect('127.0.0.1', $porta, $null, $null)
        return ($pedido.AsyncWaitHandle.WaitOne(400) -and $cliente.Connected)
    } catch { return $false } finally { $cliente.Close() }
}

function Preencher-Inicio {
    $cfg = $estado.Cfg
    $ui.ListaAmbiente.Children.Clear()
    $front = Localizar-Frontend $cfg
    $node = Versao-Node
    $pg = Localizar-Postgres
    $instalado = [bool](Get-ScheduledTask -TaskName $TarefaApi -ErrorAction SilentlyContinue)
    $estado.Instalado = $instalado
    $estado.Front = $front

    Linha-Ambiente 'API (backend)' $Back 'ok'
    if ($front) { Linha-Ambiente 'Site (frontend)' $front 'ok' }
    else { Linha-Ambiente 'Site (frontend)' 'pasta RoosterOneFrontEnd não encontrada ao lado do backend' 'erro' }
    if ($node -and $node.Maior -ge 20) { Linha-Ambiente 'Node.js' "versão $($node.Versao), já instalado" 'ok' }
    else { Linha-Ambiente 'Node.js' 'será instalado (versão LTS)' 'fazer' }
    if ($pg) { Linha-Ambiente 'PostgreSQL' "versão $($pg.Versao), já instalado" 'ok' }
    else { Linha-Ambiente 'PostgreSQL' 'será instalado em modo silencioso' 'fazer' }
    if ($cfg.Banco) { Linha-Ambiente 'Banco de dados' "$(Descrever-Banco $cfg) — os dados são mantidos" 'ok' }
    elseif ($pg -and (Testar-Conexao $pg (Ler-Env (Join-Path $Back '.env'))['DATABASE_URL'])) { Linha-Ambiente 'Banco de dados' 'o banco configurado no .env está acessível e será mantido' 'ok' }
    else { Linha-Ambiente 'Banco de dados' 'será criado automaticamente, sem pedir nenhuma senha' 'fazer' }
    Linha-Ambiente 'Endereços' "site em http://localhost:$($cfg.PortaSite) · API em http://localhost:$($cfg.PortaApi)" 'ok'

    if ($instalado) {
        $noAr = (Porta-Responde $cfg.PortaSite)
        $ui.InicioTitulo.Text = 'O Rooster One já está instalado'
        $ui.InicioSubtitulo.Text = "$(if ($noAr) { 'O sistema está em funcionamento.' } else { 'O sistema está parado no momento.' }) Use Atualizar ou reparar depois de receber uma versão nova do código, ou quando algo deixar de funcionar: os dados, o banco e os segredos são mantidos."
        $ui.BotaoInstalar.Content = 'Atualizar ou reparar'
        $ui.BotaoAbrirInstalado.Visibility = 'Visible'
        $ui.CartaoAdmin.Visibility = 'Collapsed'
        $ui.CaixaDemo.Visibility = 'Collapsed'
    }

    $ui.Rodape.Text = "Os registros de cada instalação ficam em`n$Logs"
    $bloqueio = $null
    if (-not $front) { $bloqueio = 'Coloque a pasta do frontend (RoosterOneFrontEnd) ao lado da pasta do backend e abra o instalador novamente.' }
    elseif (-not $estado.Admin -and -not $Demo -and -not $Captura) { $bloqueio = 'É preciso permissão de administrador para instalar. Feche esta janela e abra o instalador pelo arquivo INSTALAR.bat.' }
    Mostrar-Aviso $bloqueio
    $ui.BotaoInstalar.IsEnabled = -not $bloqueio
}

function Validar-Formulario {
    if ($estado.Instalado) { return @{ AdminNome = ''; AdminEmail = ''; AdminSenha = ''; Demonstracao = $false } }
    $nome = $ui.CampoNome.Text.Trim()
    $email = $ui.CampoEmail.Text.Trim().ToLower()
    $senha = $ui.CampoSenha.Password
    $demo = [bool]$ui.CaixaDemo.IsChecked
    if (-not $email -and -not $demo) { Mostrar-Aviso 'Informe o e-mail do administrador (ou marque os dados de demonstração, que já trazem um administrador de exemplo).'; $ui.CampoEmail.Focus() | Out-Null; return $null }
    if ($email) {
        if ($email -notmatch '^[^@\s]+@[^@\s]+\.[^@\s]+$') { Mostrar-Aviso 'O e-mail do administrador não parece válido.'; $ui.CampoEmail.Focus() | Out-Null; return $null }
        if ($nome.Length -lt 2) { Mostrar-Aviso 'Informe o nome do administrador.'; $ui.CampoNome.Focus() | Out-Null; return $null }
        if ($senha -and $senha.Length -lt 8) { Mostrar-Aviso 'A senha deve ter pelo menos 8 caracteres (ou deixe em branco para o instalador gerar uma).'; $ui.CampoSenha.Focus() | Out-Null; return $null }
        if ($senha -cne $ui.CampoSenha2.Password) { Mostrar-Aviso 'A confirmação não confere com a senha.'; $ui.CampoSenha2.Focus() | Out-Null; return $null }
    }
    Mostrar-Aviso $null
    return @{ AdminNome = $nome; AdminEmail = $email; AdminSenha = $senha; Demonstracao = $demo }
}

# ---------------------------------------------------------------------------------------------------------------
# Andamento
# ---------------------------------------------------------------------------------------------------------------
function Mostrar-Pagina($nome) {
    foreach ($p in 'PaginaInicio', 'PaginaProgresso', 'PaginaFim') { $ui[$p].Visibility = $(if ($p -eq $nome) { 'Visible' } else { 'Collapsed' }) }
}

$CoresLog = @{ titulo = '#8D9BFF'; ok = '#4ADE80'; info = '#C6CDEA'; aviso = '#FBBF24'; erro = '#F87171'; log = '#737CA3' }
$PrefixosLog = @{ titulo = ''; ok = '  ✓ '; info = '  • '; aviso = '  ! '; erro = '  ✗ '; log = '      ' }

function Escrever-Log($tipo, $texto) {
    $doc = $ui.CaixaLog.Document
    $par = New-Object Windows.Documents.Paragraph
    $par.Margin = '0'
    if ($tipo -eq 'titulo') { $par.Margin = '0,7,0,1'; $par.FontWeight = 'Bold' }
    $par.Foreground = Cor $CoresLog[$tipo]
    $par.Inlines.Add((New-Object Windows.Documents.Run "$($PrefixosLog[$tipo])$texto")) | Out-Null
    $doc.Blocks.Add($par) | Out-Null
    while ($doc.Blocks.Count -gt 1500) { $doc.Blocks.Remove($doc.Blocks.FirstBlock) | Out-Null }
    $ui.CaixaLog.ScrollToEnd()
    if ($estado.Escritor) { $estado.Escritor.WriteLine("[{0}] {1}{2}" -f (Get-Date -Format 'HH:mm:ss'), $PrefixosLog[$tipo], $texto) }
}

function Atualizar-Barra {
    $feito = 0.0
    foreach ($p in $Passos) {
        $peso = $Pesos[$p.Id]
        switch ($estado.EstadoPasso[$p.Id]) {
            'ok' { $feito += $peso }
            'aviso' { $feito += $peso }
            'executando' {
                # Avança suavemente dentro do passo, sem nunca chegar ao fim antes de ele terminar.
                $seg = ((Get-Date) - $estado.InicioPasso[$p.Id]).TotalSeconds
                $feito += $peso * 0.92 * (1 - [math]::Exp(-$seg / $Esperado[$p.Id]))
            }
        }
    }
    $fracao = [math]::Min(1.0, $feito / 100.0)
    $largura = $ui.BarraTrilho.ActualWidth
    if ($largura -le 0) { $largura = 560 }
    $ui.BarraCheia.Width = [math]::Max(0, $largura * $fracao)
    $ui.ProgPercentual.Text = "$([int][math]::Floor($fracao * 100))%"
}

function Atualizar-Relogios {
    if ($estado.InicioGeral) {
        $d = (Get-Date) - $estado.InicioGeral
        $ui.ProgTempo.Text = 'Tempo decorrido {0:00}:{1:00}' -f [int][math]::Floor($d.TotalMinutes), $d.Seconds
    }
    $id = $estado.PassoAtual
    if ($id -and $estado.EstadoPasso[$id] -eq 'executando') {
        $estado.Itens[$id].Tempo.Text = Formatar-Duracao ((Get-Date) - $estado.InicioPasso[$id])
    }
    Atualizar-Barra
}

function Tratar-Evento($ev) {
    if ($ev.Exec -and $ev.Exec -ne $estado.Execucao) { return }
    switch ($ev.Tipo) {
        'passo-inicio' {
            $id = $ev.Dados.Id
            $estado.PassoAtual = $id
            $estado.InicioPasso[$id] = Get-Date
            Definir-Estado-Passo $id 'executando'
            $passo = $Passos | Where-Object { $_.Id -eq $id }
            $ui.ProgEyebrow.Text = "PASSO $($ev.Dados.Numero) DE $($ev.Dados.Total)"
            $ui.ProgTitulo.Text = $passo.Titulo
            $ui.ProgDescricao.Text = $passo.Descricao
            $ui.ProgAtividade.Text = ''
            Escrever-Log 'titulo' "$($ev.Dados.Numero). $($passo.Titulo)"
        }
        'passo-fim' {
            Definir-Estado-Passo $ev.Dados.Id $ev.Dados.Estado
            if ($ev.Dados.Estado -eq 'erro') { Escrever-Log 'erro' $ev.Dados.Mensagem }
        }
        'resultado' { $estado.Resumo = $ev.Dados }
        'fim' { Encerrar-Trabalho $ev.Dados }
        default {
            if ($ev.Tipo -in 'ok', 'info', 'aviso') { $ui.ProgAtividade.Text = $ev.Texto }
            elseif ($ev.Tipo -eq 'log' -and $ev.Texto.Length -lt 160) { $ui.ProgAtividade.Text = $ev.Texto.Trim() }
            if ($CoresLog.ContainsKey($ev.Tipo)) { Escrever-Log $ev.Tipo $ev.Texto }
        }
    }
}

function Linha-Resumo($rotulo, $valor, [switch]$Destaque) {
    $grade = New-Object Windows.Controls.Grid
    $grade.Margin = '0,4,0,4'
    $c = New-Object Windows.Controls.ColumnDefinition; $c.Width = 130; $grade.ColumnDefinitions.Add($c)
    $grade.ColumnDefinitions.Add((New-Object Windows.Controls.ColumnDefinition))
    $r = New-Object Windows.Controls.TextBlock
    $r.Text = $rotulo; $r.Foreground = Cor '#5B6380'
    $v = New-Object Windows.Controls.TextBlock
    $v.Text = $valor; $v.Foreground = Cor $(if ($Destaque) { '#4F5FE0' } else { '#171B2E' }); $v.TextWrapping = 'Wrap'
    if ($Destaque) { $v.FontWeight = 'SemiBold' }
    [Windows.Controls.Grid]::SetColumn($v, 1)
    $grade.Children.Add($r) | Out-Null; $grade.Children.Add($v) | Out-Null
    $ui.FimLinhas.Children.Add($grade) | Out-Null
}

function Encerrar-Trabalho($dados) {
    $estado.Rodando = $false
    $relogio.Stop()
    Atualizar-Relogios
    if ($estado.Escritor) { $estado.Escritor.Dispose(); $estado.Escritor = $null }
    # Interrompida, a execução em segundo plano é apenas abandonada: liberá-la aqui poderia travar a janela.
    if ($estado.Trabalho -and -not $dados.Interrompido) { try { $estado.Trabalho.PS.Dispose() } catch { } }
    $estado.Trabalho = $null
    $ui.BotaoCancelar.Content = 'Voltar'
    $duracao = if ($estado.InicioGeral) { Formatar-Duracao ((Get-Date) - $estado.InicioGeral) } else { '' }

    $ui.FimLinhas.Children.Clear()
    $ui.FimSenhaCartao.Visibility = 'Collapsed'
    if ($dados.Ok) {
        $r = $estado.Resumo
        $ui.BarraCheia.Width = $ui.BarraTrilho.ActualWidth
        $ui.FimSelo.Background = Cor '#DCFCE7'; $ui.FimIcone.Text = "$([char]0xE73E)"; $ui.FimIcone.Foreground = Cor '#16A34A'
        $ui.FimTitulo.Text = 'Instalação concluída'
        $ui.FimSubtitulo.Text = "O Rooster One está em funcionamento e passa a iniciar sozinho com o Windows. Tempo total: $duracao."
        $ui.FimCartao.Visibility = 'Visible'; $ui.FimErroCartao.Visibility = 'Collapsed'
        Linha-Resumo 'Endereço' $r.Url -Destaque
        if ($r.AdminEmail) {
            Linha-Resumo 'Login' $r.AdminEmail
            if ($r.SenhaGerada) {
                $senha = ''
                if (Test-Path $r.ArquivoSenha) { $senha = ((Get-Content $r.ArquivoSenha) -match '^Senha:' | Select-Object -First 1) -replace '^Senha:\s*', '' }
                $ui.FimSenha.Text = $senha
                $ui.FimSenhaNota.Text = "Anote agora: ela também ficou gravada em $($r.ArquivoSenha). Troque a senha no primeiro acesso e apague esse arquivo."
                $ui.FimSenhaCartao.Visibility = 'Visible'
            } else { Linha-Resumo 'Senha' 'a que você definiu (ou a que a conta já tinha, se ela já existia)' }
        }
        if ($r.Demonstracao) { Linha-Resumo 'Demonstração' 'dados de exemplo carregados se o banco estava vazio (usuários e senhas no Apêndice B do Manual do Usuário)' }
        Linha-Resumo 'Banco de dados' $r.Banco
        Linha-Resumo 'Atalho' 'Rooster One, na área de trabalho'
        if ($r.Documentacao) {
            Linha-Resumo 'Documentação' "Manual do Usuário e Documentação Geral em Word, em $($r.Documentacao) (atalho na área de trabalho)"
            $ui.BotaoDocs.Visibility = 'Visible'
            $estado.PastaDocs = $r.Documentacao
        } else { $ui.BotaoDocs.Visibility = 'Collapsed' }
        $ui.BotaoAbrir.Visibility = 'Visible'; $ui.BotaoRepetir.Visibility = 'Collapsed'
    } else {
        $id = $estado.PassoAtual
        if ($id -and $estado.EstadoPasso[$id] -eq 'executando') { Definir-Estado-Passo $id 'erro' }
        $passo = $Passos | Where-Object { $_.Id -eq $id }
        $ui.FimSelo.Background = Cor '#FEE2E2'; $ui.FimIcone.Text = "$([char]0xE711)"; $ui.FimIcone.Foreground = Cor '#DC2626'
        $ui.FimTitulo.Text = $(if ($dados.Interrompido) { 'Instalação interrompida' } else { 'A instalação não foi concluída' })
        $ui.FimSubtitulo.Text = "O instalador parou depois de $duracao. O registro completo mostra tudo o que foi feito até aqui."
        $ui.FimCartao.Visibility = 'Collapsed'; $ui.FimErroCartao.Visibility = 'Visible'
        $ui.FimErroPasso.Text = "Passo: $(if ($passo) { $passo.Titulo } else { 'preparação' })"
        $ui.FimErroTexto.Text = $dados.Mensagem
        $ui.BotaoAbrir.Visibility = 'Collapsed'; $ui.BotaoRepetir.Visibility = 'Visible'; $ui.BotaoDocs.Visibility = 'Collapsed'
    }
    Mostrar-Pagina 'PaginaFim'
}

# ---------------------------------------------------------------------------------------------------------------
# Execução em segundo plano
# ---------------------------------------------------------------------------------------------------------------
$ScriptTrabalho = {
    param($motor, $fila, $opc, $demo, $exec)
    try {
        . $motor
        $global:RoosterRelator = { param($tipo, $texto, $dados) $fila.Enqueue(@{ Tipo = $tipo; Texto = $texto; Dados = $dados; Exec = $exec }) }.GetNewClosure()
        if ($demo) {
            # Demonstração da tela: percorre os passos sem alterar nada no computador.
            $passos = Passos-Instalacao
            $n = 0
            foreach ($p in $passos) {
                $n++
                Emitir 'passo-inicio' $p.Titulo @{ Id = $p.Id; Numero = $n; Total = $passos.Count }
                Info "Simulação: $($p.Descricao)"
                1..4 | ForEach-Object { Start-Sleep -Milliseconds 350; Emitir 'log' "linha de saída $_ do passo $($p.Id)" }
                Ok "$($p.Titulo): concluído (simulação)"
                Emitir 'passo-fim' $p.Titulo @{ Id = $p.Id; Estado = 'ok' }
            }
            Emitir 'resultado' 'Instalação concluída' @{ Url = 'http://localhost:8080'; AdminEmail = $opc.AdminEmail; SenhaGerada = $false; ArquivoSenha = ''; Demonstracao = [bool]$opc.Demonstracao; Banco = 'simulação — nada foi instalado'; Documentacao = $null }
        } else {
            $cfg = Ler-Config
            [void](Instalar $cfg $opc)
        }
        $fila.Enqueue(@{ Tipo = 'fim'; Exec = $exec; Dados = @{ Ok = $true } })
    } catch {
        $fila.Enqueue(@{ Tipo = 'fim'; Exec = $exec; Dados = @{ Ok = $false; Mensagem = $_.Exception.Message } })
    }
}

function Iniciar-Instalacao($opc) {
    $estado.Opcoes = $opc
    $estado.Resumo = $null
    $estado.PassoAtual = $null
    $estado.InicioPasso = @{}
    $estado.Execucao++
    foreach ($p in $Passos) { Definir-Estado-Passo $p.Id 'pendente' }
    $ui.BotaoCancelar.Content = 'Interromper'
    $ui.CaixaLog.Document.Blocks.Clear()
    $ui.ProgEyebrow.Text = "PASSO 1 DE $($Passos.Count)"; $ui.ProgTitulo.Text = 'Preparando…'; $ui.ProgDescricao.Text = ''; $ui.ProgAtividade.Text = ''
    $ui.BarraCheia.Width = 0; $ui.ProgPercentual.Text = '0%'

    if (-not $Demo) {
        New-Item -ItemType Directory -Force $Logs | Out-Null
        $estado.ArquivoLog = Join-Path $Logs ("instalacao-{0}.log" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
        $estado.Escritor = New-Object IO.StreamWriter($estado.ArquivoLog, $false, (New-Object Text.UTF8Encoding $true))
        $estado.Escritor.AutoFlush = $true
    }

    $rs = [runspacefactory]::CreateRunspace()
    $rs.ApartmentState = 'MTA'; $rs.ThreadOptions = 'ReuseThread'
    $rs.Open()
    $ps = [powershell]::Create()
    $ps.Runspace = $rs
    [void]$ps.AddScript($ScriptTrabalho.ToString()).AddArgument($Motor).AddArgument($Fila).AddArgument($opc).AddArgument([bool]$Demo).AddArgument($estado.Execucao)
    $estado.Trabalho = @{ PS = $ps; Pedido = $ps.BeginInvoke() }
    $estado.Rodando = $true
    $estado.InicioGeral = Get-Date
    Mostrar-Pagina 'PaginaProgresso'
    $relogio.Start()
}

# Encerra os processos iniciados pela instalação (npm, node, compiladores), sem tocar no banco de dados.
function Encerrar-Filhos {
    $todos = Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, Name
    $pendentes = New-Object System.Collections.Queue
    $pendentes.Enqueue($PID)
    while ($pendentes.Count) {
        $pai = $pendentes.Dequeue()
        foreach ($f in $todos | Where-Object { $_.ParentProcessId -eq $pai -and $_.ProcessId -ne $PID }) {
            $pendentes.Enqueue($f.ProcessId)
            if ($f.Name -notmatch '^(postgres|pg_ctl|conhost)') { Stop-Process -Id $f.ProcessId -Force -ErrorAction SilentlyContinue }
        }
    }
}

function Interromper-Instalacao {
    if (-not $estado.Rodando) { return }
    Escrever-Log 'aviso' 'Instalação interrompida pelo usuário.'
    try { [void]$estado.Trabalho.PS.BeginStop($null, $null) } catch { }
    Encerrar-Filhos
    $vazio = $null
    while ($Fila.TryDequeue([ref]$vazio)) { }
    Encerrar-Trabalho @{ Ok = $false; Interrompido = $true; Mensagem = 'A instalação foi interrompida antes do fim. Use Tentar novamente para continuar.' }
}

$relogio = New-Object Windows.Threading.DispatcherTimer
$relogio.Interval = [TimeSpan]::FromMilliseconds(120)
$relogio.Add_Tick({
    $ev = $null
    $lidos = 0
    while ($lidos -lt 150 -and $Fila.TryDequeue([ref]$ev)) { $lidos++; Tratar-Evento $ev }
    if ($estado.Rodando) { Atualizar-Relogios }
})

# ---------------------------------------------------------------------------------------------------------------
# Eventos da janela
# ---------------------------------------------------------------------------------------------------------------
$ui.BotaoInstalar.Add_Click({
    $opc = Validar-Formulario
    if ($opc) { Iniciar-Instalacao $opc }
})
$ui.BotaoRepetir.Add_Click({ Iniciar-Instalacao $estado.Opcoes })
$ui.BotaoCancelar.Add_Click({
    if (-not $estado.Rodando) { Mostrar-Pagina 'PaginaFim'; return }
    $r = [Windows.MessageBox]::Show($janela, 'Interromper a instalação? O que já foi feito é mantido, e você pode continuar depois.', 'Rooster One', 'YesNo', 'Question')
    if ($r -eq 'Yes') { Interromper-Instalacao }
})
$abrirSite = { Start-Process "http://localhost:$((Ler-Config).PortaSite)/" }
$ui.BotaoAbrir.Add_Click($abrirSite)
$ui.BotaoAbrirInstalado.Add_Click($abrirSite)
$ui.BotaoFechar.Add_Click({ $janela.Close() })
$ui.BotaoLog.Add_Click({
    if ($estado.ArquivoLog -and (Test-Path $estado.ArquivoLog)) { Start-Process notepad.exe $estado.ArquivoLog }
    else { Mostrar-Pagina 'PaginaProgresso' }
})
$ui.BotaoDocs.Add_Click({ if ($estado.PastaDocs -and (Test-Path $estado.PastaDocs)) { Start-Process explorer.exe $estado.PastaDocs } })
$ui.BotaoCopiar.Add_Click({ [Windows.Clipboard]::SetText($ui.FimSenha.Text); $ui.BotaoCopiar.Content = 'Copiada' })
$ui.BotaoMenu.Add_Click({ Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$Motor`"" })
$janela.Add_Closing({
    param($origem, $e)
    if ($estado.Rodando) {
        $r = [Windows.MessageBox]::Show($janela, 'A instalação está em andamento. Interromper e fechar?', 'Rooster One', 'YesNo', 'Warning')
        if ($r -ne 'Yes') { $e.Cancel = $true; return }
        Interromper-Instalacao
    }
})

# Logotipo: o mesmo do sistema, lido do repositório do frontend.
$frontLogo = Localizar-Frontend $estado.Cfg
if ($frontLogo) {
    $arqLogo = Join-Path $frontLogo 'src\assets\rooster-logo.png'
    if (Test-Path $arqLogo) {
        $img = New-Object Windows.Media.Imaging.BitmapImage
        $img.BeginInit(); $img.CacheOption = 'OnLoad'; $img.UriSource = New-Object Uri $arqLogo; $img.EndInit()
        $ui.Logo.Source = $img
        $janela.Icon = $img
    }
}

Preencher-Inicio

# ---------------------------------------------------------------------------------------------------------------
# Captura de imagens das telas (documentação) ou exibição normal
# ---------------------------------------------------------------------------------------------------------------
if ($Captura) {
    New-Item -ItemType Directory -Force $Captura | Out-Null
    $janela.ShowInTaskbar = $false; $janela.ShowActivated = $false
    $janela.WindowStartupLocation = 'Manual'; $janela.Left = -30000; $janela.Top = -30000
    $janela.Show()
    function Fotografar($nome) {
        $janela.UpdateLayout()
        $janela.Dispatcher.Invoke([Action] { }, [Windows.Threading.DispatcherPriority]::ContextIdle)
        $alvo = $ui.Raiz
        $escala = 1.5
        $bmp = New-Object Windows.Media.Imaging.RenderTargetBitmap ([int]($alvo.ActualWidth * $escala)), ([int]($alvo.ActualHeight * $escala)), (96 * $escala), (96 * $escala), ([Windows.Media.PixelFormats]::Pbgra32)
        $bmp.Render($alvo)
        $cod = New-Object Windows.Media.Imaging.PngBitmapEncoder
        $cod.Frames.Add([Windows.Media.Imaging.BitmapFrame]::Create($bmp))
        $fs = [IO.File]::Create((Join-Path $Captura "$nome.png"))
        try { $cod.Save($fs) } finally { $fs.Dispose() }
    }
    $ui.CampoNome.Text = 'Maria Souza'; $ui.CampoEmail.Text = 'maria.souza@escola.edu.br'
    Fotografar '1-inicio'

    if ($Demo) {
        # Com -Demo, a captura percorre a simulação de verdade (execução em segundo plano e fila de eventos).
        Iniciar-Instalacao (Validar-Formulario)
        $limite = (Get-Date).AddSeconds(90)
        while ($estado.Rodando -and (Get-Date) -lt $limite) {
            $janela.Dispatcher.Invoke([Action] { }, [Windows.Threading.DispatcherPriority]::Background)
            Start-Sleep -Milliseconds 40
        }
        Fotografar '5-simulacao'
        $janela.Close()
        return
    }

    Mostrar-Pagina 'PaginaProgresso'
    $estado.InicioGeral = (Get-Date).AddSeconds(-252)
    $total = $Passos.Count
    $falas = @{
        ambiente = @(@('ok', 'Frontend: C:\RoosterOne\RoosterOneFrontEnd'), @('ok', 'Espaço livre no disco: 212,4 GB'), @('ok', 'Porta 3000 livre (API)'), @('ok', 'Porta 8080 livre (site)'))
        node = @(, @('ok', 'Node.js 24.14.0 encontrado (C:\Program Files\nodejs\node.exe)'))
        postgres = @(, @('ok', 'PostgreSQL 18 encontrado (C:\Program Files\PostgreSQL\18\bin)'))
        config = @(@('ok', 'JWT_SECRET gerado'), @('ok', 'FILE_ENCRYPTION_KEY gerada'), @('ok', 'Frontend apontando para a API em http://localhost:3000'))
        banco = @(@('info', 'Criando o banco de dados próprio do Rooster One em C:\ProgramData\RoosterOne\pgdata (porta 5433)...'), @('ok', 'Servidor de banco de dados criado'), @('ok', 'Banco de dados em execução na porta 5433'), @('ok', 'Usuário "rooster" criado'), @('ok', 'Banco "rooster_one" criado'), @('ok', 'DATABASE_URL gravada no .env'))
        backend = @(@('info', 'Instalando as dependências (npm ci); leva alguns minutos...'), @('log', 'added 912 packages in 48s'), @('log', '✔ Generated Prisma Client (v6.19.3) to .\node_modules\@prisma\client in 412ms'), @('info', 'Compilando...'), @('log', '> rooster-one-api@0.0.1 build'), @('log', '> nest build'))
    }
    $i = 0
    foreach ($p in $Passos) {
        $i++
        if ($i -gt 6) { break }
        $estado.InicioPasso[$p.Id] = (Get-Date).AddSeconds( - (3 + $i * 7))
        Tratar-Evento @{ Tipo = 'passo-inicio'; Dados = @{ Id = $p.Id; Numero = $i; Total = $total } }
        $estado.InicioPasso[$p.Id] = (Get-Date).AddSeconds( - (3 + $i * 7))
        foreach ($f in $falas[$p.Id]) { Tratar-Evento @{ Tipo = $f[0]; Texto = $f[1] } }
        if ($i -lt 6) { Tratar-Evento @{ Tipo = 'passo-fim'; Dados = @{ Id = $p.Id; Estado = 'ok' } } }
    }
    $estado.InicioPasso['backend'] = (Get-Date).AddSeconds(-95)
    $janela.UpdateLayout()
    Atualizar-Relogios
    Fotografar '2-andamento'

    foreach ($p in $Passos) { if ($estado.EstadoPasso[$p.Id] -ne 'ok') { $estado.InicioPasso[$p.Id] = (Get-Date).AddSeconds(-40); Definir-Estado-Passo $p.Id 'ok' } }
    $estado.Resumo = @{ Url = 'http://localhost:8080'; AdminEmail = 'maria.souza@escola.edu.br'; SenhaGerada = $false; ArquivoSenha = ''; Demonstracao = $false; Banco = 'banco próprio do Rooster One, porta 5433 (C:\ProgramData\RoosterOne\pgdata)'; Documentacao = 'C:\RoosterOne\documentacao' }
    $estado.InicioGeral = (Get-Date).AddSeconds(-563)
    Encerrar-Trabalho @{ Ok = $true }
    $ui.FimSenha.Text = 'Rooster-Xy7kQ2mP1!'; $ui.FimSenhaNota.Text = 'Anote agora: ela também ficou gravada em .rooster\primeiro-acesso.txt. Troque a senha no primeiro acesso e apague esse arquivo.'
    $ui.FimSenhaCartao.Visibility = 'Visible'
    Fotografar '3-concluido'

    $estado.PassoAtual = 'frontend'
    $estado.EstadoPasso['frontend'] = 'executando'
    foreach ($id in 'migrations', 'dados', 'documentacao', 'servicos', 'inicio') { Definir-Estado-Passo $id 'pendente' }
    Encerrar-Trabalho @{ Ok = $false; Mensagem = 'Falha ao executar: npm.cmd run build (código 1)' }
    Fotografar '4-erro'
    $janela.Close()
    return
}

[void]$janela.ShowDialog()
