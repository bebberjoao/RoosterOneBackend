@echo off
rem Rooster One - instalador. Duplo clique para abrir a tela de instalacao.
rem   INSTALAR.bat              abre a tela do instalador (passo a passo da instalacao)
rem   INSTALAR.bat menu         abre o menu de console (iniciar, parar, situacao, backup, desinstalar)
rem   INSTALAR.bat -Acao Status executa uma acao direta do menu (Instalar, Iniciar, Parar, Status, Verificar,
rem                             Backup, Demonstracao, Desinstalar)
rem Solicita elevacao de administrador (necessaria para instalar o PostgreSQL e registrar o inicio automatico).
setlocal
net session >nul 2>&1
if %errorlevel% neq 0 (
    if "%~1"=="" (
        powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    ) else (
        powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -ArgumentList '%*' -Verb RunAs"
    )
    exit /b
)
chcp 65001 >nul
if "%~1"=="" (
    start "" powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0instalador-tela.ps1"
) else if /i "%~1"=="menu" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0instalador.ps1"
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0instalador.ps1" %*
)
endlocal
