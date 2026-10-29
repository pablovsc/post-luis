@echo off
title Tienda Express POS
color 0A

echo ========================================================
echo    TIENDA EXPRESS POS - INICIANDO SISTEMA CON NODE.JS
echo ========================================================
echo.

cd /d "c:\app\post-luis"

REM 1. Iniciar el scraper de tasa BCV en segundo plano
if exist "scrape-bcv.js" (
    echo [INFO] Consultando y sincronizando tasa oficial del BCV...
    start "BCV Tasa Background" /min cmd /c "node scrape-bcv.js --daemon"
)

REM 2. Abrir automáticamente el navegador tras 3 segundos
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"

REM 3. Iniciar el servidor Next.js
echo [INFO] Servidor web iniciando en http://localhost:3000 ...
echo [INFO] Para detener el sistema, simplemente cierra esta ventana.
echo.

call npm run dev

pause

