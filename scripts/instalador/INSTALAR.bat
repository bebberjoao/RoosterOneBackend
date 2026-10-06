@echo off
rem Rooster One - instalador. Duplo clique para abrir o menu de instalacao.
rem Solicita elevacao de administrador (necessaria para instalar o PostgreSQL e registrar o inicio automatico).
setlocal
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0instalador.ps1" %*
endlocal
