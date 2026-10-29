@echo off
setlocal enabledelayedexpansion

REM ==============================================================================
REM   TIENDA EXPRESS POS - SCRIPT DE RESPALDO AUTOMÁTICO (POSTGRESQL)
REM ==============================================================================

set "BACKUP_DIR=c:\app\post-luis\backups"
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM Obtener fecha y hora en formato YYYY-MM-DD_HH-MM-SS
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value 2^>nul') do set dt=%%I
set "YYYY=%dt:~0,4%"
set "MM=%dt:~4,2%"
set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%"
set "MIN=%dt:~10,2%"
set "SS=%dt:~12,2%"

if "%YYYY%"=="" (
    set "FILENAME=backup_luis_%date:~-4%-%date:~3,2%-%date:~0,2%_%time:~0,2%-%time:~3,2%.sql"
    set "FILENAME=!FILENAME: =0!"
) else (
    set "FILENAME=backup_luis_%YYYY%-%MM%-%DD%_%HH%-%MIN%-%SS%.sql"
)

set "BACKUP_FILE=%BACKUP_DIR%\%FILENAME%"

echo ============================================================
echo   RESPALDO DE BASE DE DATOS POSTGRESQL (TIENDA EXPRESS)
echo ============================================================
echo Destino: %BACKUP_FILE%
echo.

REM 1. Comprobar si PostgreSQL corre en Docker (pos_postgres)
docker ps --filter "name=pos_postgres" --format "{{.Names}}" 2>nul | findstr /i "pos_postgres" >nul
if %errorlevel% equ 0 (
    echo [MODO DETECTADO] Contenedor Docker 'pos_postgres' en ejecucion.
    echo Generando respaldo mediante docker exec pg_dump...
    docker exec -t pos_postgres pg_dump -U adempiere -d luis --clean --if-exists > "%BACKUP_FILE%"
    goto check_backup
)

REM 2. Si no corre en Docker, buscar pg_dump nativo instalado en Windows
where pg_dump >nul 2>nul
if %errorlevel% equ 0 (
    echo [MODO DETECTADO] pg_dump nativo en Windows.
    set PGPASSWORD=adempiere
    pg_dump -h localhost -p 5432 -U adempiere -d luis --clean --if-exists -F p -f "%BACKUP_FILE%"
    goto check_backup
)

REM 3. Buscar en rutas comunes de instalación de PostgreSQL en Windows
set "FOUND_PG="
for /d %%D in ("C:\Program Files\PostgreSQL\*") do (
    if exist "%%D\bin\pg_dump.exe" (
        set "FOUND_PG=%%D\bin\pg_dump.exe"
    )
)

if defined FOUND_PG (
    echo [MODO DETECTADO] Encontrado en: !FOUND_PG!
    set PGPASSWORD=adempiere
    "!FOUND_PG!" -h localhost -p 5432 -U adempiere -d luis --clean --if-exists -F p -f "%BACKUP_FILE%"
    goto check_backup
)

echo [ERROR] No se pudo encontrar 'docker' ni 'pg_dump' instalado en Windows.
echo Asegurate de tener PostgreSQL instalado en Windows o el contenedor pos_postgres iniciado.
exit /b 1

:check_backup
if exist "%BACKUP_FILE%" (
    for %%F in ("%BACKUP_FILE%") do set size=%%~zF
    if !size! gtr 0 (
        echo.
        echo [EXITO] Respaldo generado correctamente:
        echo Archivo: %BACKUP_FILE%
        echo Tamano: !size! bytes
        
        REM Limpieza automatica: mantener solo los ultimos 30 dias de respaldos
        forfiles /p "%BACKUP_DIR%" /s /m *.sql /d -30 /c "cmd /c del @path" 2>nul
        goto fin
    )
)

echo.
echo [ADVERTENCIA] El archivo de respaldo se genero vacio o con errores.

:fin
echo ============================================================
if "%1" neq "--silent" (
    timeout /t 5
)

