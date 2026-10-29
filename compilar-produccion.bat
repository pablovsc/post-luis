@echo off
title Compilando Tienda Express POS para Produccion
color 0B

echo ========================================================
echo    COMPILANDO TIENDA EXPRESS POS (MODO PRODUCCION)
echo ========================================================
echo.

cd /d "c:\app\post-luis"

REM Verificar Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] No se encontro Node.js instalado.
    pause
    exit /b 1
)

REM Instalar dependencias si faltan
if not exist "node_modules\" (
    echo [INFO] Instalando dependencias con npm install...
    call npm install
)

echo [INFO] Ejecutando compilacion optimizada (npm run build)...
echo Esto puede tardar 1 o 2 minutos. Por favor espera...
echo.

call npm run build

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo    [EXITO] APLICACION COMPILADA CORRECTAMENTE!
    echo ========================================================
    echo Ahora la aplicacion arrancara de forma ultrarrapida
    echo en modo produccion con 'npm start'.
) else (
    echo.
    echo ========================================================
    echo    [ERROR] Hubo un problema durante la compilacion.
    echo ========================================================
)

echo.
pause

