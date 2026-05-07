@echo off
REM ═══════════════════════════════════════════════════
REM  StockControl — Lanzador Unificado (Windows)
REM ═══════════════════════════════════════════════════
REM
REM Uso:
REM   start.bat          Menu interactivo
REM   start.bat web      Iniciar version Web
REM   start.bat cli      Iniciar version CLI
REM   start.bat status   Ver estado del sistema
REM   start.bat setup    Instalar dependencias

setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "BACKEND_DIR=%SCRIPT_DIR%backend"
set "CLI_DIR=%SCRIPT_DIR%cli_version"

if "%~1"=="web" goto :launch_web
if "%~1"=="cli" goto :launch_cli
if "%~1"=="status" goto :show_status
if "%~1"=="setup" goto :run_setup
if "%~1"=="help" goto :show_help
if "%~1"=="--help" goto :show_help
if "%~1"=="" goto :menu
echo   [ERROR] Comando desconocido: %~1
echo   Uso: start.bat [web^|cli^|status^|setup^|help]
exit /b 1

REM ── Menu ───────────────────────────────────────────
:menu
cls
echo.
echo  ======================================================
echo           STOCKCONTROL — Lanzador Unificado
echo  ======================================================
echo.
echo    1. Iniciar version Web    (Node.js + MySQL)
echo    2. Iniciar version CLI    (Python + SQLite)
echo    3. Ver estado del sistema
echo    4. Instalar dependencias
echo    0. Salir
echo.
set /p "choice=  Opcion: "
if "%choice%"=="1" goto :launch_web_menu
if "%choice%"=="2" goto :launch_cli_menu
if "%choice%"=="3" goto :show_status_menu
if "%choice%"=="4" goto :run_setup_menu
if "%choice%"=="0" goto :exit_app
echo.
echo   [ERROR] Opcion invalida.
timeout /t 2 >nul
goto :menu

:launch_web_menu
call :launch_web
pause
goto :menu

:launch_cli_menu
call :launch_cli
pause
goto :menu

:show_status_menu
call :show_status
pause
goto :menu

:run_setup_menu
call :run_setup
pause
goto :menu

REM ── Status ─────────────────────────────────────────
:show_status
echo.
echo   Estado del Sistema
echo   ------------------
echo.
echo   Version Web (Node.js + MySQL)
where node >nul 2>&1
if %errorlevel%==0 (
    echo   [OK]  Node.js instalado
) else (
    echo   [NO]  Node.js no encontrado
)
where npm >nul 2>&1
if %errorlevel%==0 (
    echo   [OK]  npm instalado
) else (
    echo   [NO]  npm no encontrado
)
if exist "%BACKEND_DIR%\node_modules\" (
    echo   [OK]  Dependencias backend instaladas
) else (
    echo   [NO]  Dependencias backend no instaladas
)
echo.
echo   Version CLI (Python + SQLite)
where python >nul 2>&1
if %errorlevel%==0 (
    echo   [OK]  Python instalado
) else (
    where python3 >nul 2>&1
    if %errorlevel%==0 (
        echo   [OK]  Python3 instalado
    ) else (
        echo   [NO]  Python no encontrado
    )
)
if exist "%CLI_DIR%\main.py" (
    echo   [OK]  cli_version\main.py encontrado
) else (
    echo   [NO]  cli_version\main.py no encontrado
)
echo.
goto :eof

REM ── Launch Web ─────────────────────────────────────
:launch_web
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo   [ERROR] Node.js no esta instalado.
    echo   Instalelo desde https://nodejs.org/
    goto :eof
)
if not exist "%BACKEND_DIR%\node_modules\" (
    echo.
    echo   [INFO] Instalando dependencias...
    cd /d "%BACKEND_DIR%"
    call npm install
)
if not exist "%BACKEND_DIR%\.env" (
    if exist "%BACKEND_DIR%\.env.example" (
        copy "%BACKEND_DIR%\.env.example" "%BACKEND_DIR%\.env" >nul
        echo.
        echo   [INFO] Archivo .env creado. Edite backend\.env con sus credenciales MySQL.
    )
)
echo.
echo   [WEB] Iniciando servidor en http://localhost:3000 ...
echo   [WEB] Frontend: frontend\index.html
echo   [INFO] Presione Ctrl+C para detener.
echo.
cd /d "%BACKEND_DIR%"
node server.js
goto :eof

REM ── Launch CLI ─────────────────────────────────────
:launch_cli
set "PY_CMD="
where python3 >nul 2>&1
if %errorlevel%==0 (
    set "PY_CMD=python3"
) else (
    where python >nul 2>&1
    if %errorlevel%==0 (
        set "PY_CMD=python"
    )
)
if "%PY_CMD%"=="" (
    echo.
    echo   [ERROR] Python 3 no esta instalado.
    goto :eof
)
if not exist "%CLI_DIR%\main.py" (
    echo.
    echo   [ERROR] cli_version\main.py no encontrado.
    goto :eof
)
echo.
echo   [CLI] Iniciando sistema de inventario por terminal...
echo.
cd /d "%CLI_DIR%"
%PY_CMD% main.py
goto :eof

REM ── Setup ──────────────────────────────────────────
:run_setup
set "PY_CMD="
where python3 >nul 2>&1
if %errorlevel%==0 (
    set "PY_CMD=python3"
) else (
    where python >nul 2>&1
    if %errorlevel%==0 (
        set "PY_CMD=python"
    )
)
if "%PY_CMD%"=="" (
    echo   [ERROR] Python 3 no encontrado.
    goto :eof
)
if exist "%SCRIPT_DIR%setup.py" (
    %PY_CMD% "%SCRIPT_DIR%setup.py"
) else (
    echo   [ERROR] setup.py no encontrado.
)
goto :eof

REM ── Help ───────────────────────────────────────────
:show_help
echo Uso: start.bat [web^|cli^|status^|setup^|help]
echo   Sin argumentos: menu interactivo
goto :eof

REM ── Exit ───────────────────────────────────────────
:exit_app
echo.
echo   Hasta luego!
echo.
exit /b 0
