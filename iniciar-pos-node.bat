@echo off
title Tienda Express POS (Modo Produccion)
color 0A

echo ========================================================
echo    TIENDA EXPRESS POS - INICIANDO (MODO PRODUCCION)
echo ========================================================
echo.

cd /d "c:\app\post-luis"

REM 1. Verificar si Node.js está disponible
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] No se encontro Node.js instalado o en la variable PATH.
    echo Por favor instala Node.js LTS desde https://nodejs.org/
    pause
    exit /b 1
)

REM 2. Verificar que existan las dependencias en node_modules
if not exist "node_modules\" (
    echo [INFO] Primera ejecucion detectada o faltan librerias.
    echo Instalando dependencias con npm install...
    call npm install
)

REM 3. Verificar si el proyecto ya fue compilado para produccion (.next)
if not exist ".next\" (
    echo [INFO] No se encontro compilacion previa (.next).
    echo Compilando aplicacion para produccion por primera vez (npm run build)...
    call npm run build
    if %errorlevel% neq 0 (
        echo [ERROR] Fallo la compilacion. Iniciando en modo dev como respaldo...
        call npm run dev
        exit /b 1
    )
)

REM 4. Iniciar el scraper de tasa BCV en segundo plano con actualizacion continua
if exist "scrape-bcv.js" (
    echo [INFO] Consultando y sincronizando tasa oficial del BCV...
    start "BCV Tasa Background" /min cmd /c "node scrape-bcv.js --daemon"
)

REM 5. Abrir automáticamente el navegador tras 3 segundos
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"

REM 6. Iniciar la aplicación Next.js en MODO PRODUCCIÓN (npm start)
echo [INFO] Servidor de produccion iniciando en http://localhost:3000 ...
echo [INFO] Rendimiento optimizado al maximo.
echo [INFO] Para detener el sistema, simplemente cierra esta ventana.
echo.

call npx --no-install next start -p 3000

pause

