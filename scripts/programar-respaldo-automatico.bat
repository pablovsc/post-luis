@echo off
setlocal

REM ==============================================================================
REM   CREAR TAREA PROGRAMADA EN WINDOWS (RESPALDO AUTOMÁTICO DIARIO A LAS 22:00)
REM ==============================================================================

set "TASK_NAME=TiendaExpress_RespaldoBD"
set "SCRIPT_PATH=c:\app\post-luis\scripts\hacer-respaldo.bat"
set "HORA=20:00"

echo ============================================================
echo   CONFIGURADOR DE RESPALDO AUTOMATICO (TAREA DE WINDOWS)
echo ============================================================
echo Tarea a crear: %TASK_NAME%
echo Hora diaria de respaldo: %HORA% (10:00 PM)
echo Script: %SCRIPT_PATH%
echo.

REM Crear o reemplazar la tarea en el Programador de Tareas de Windows
schtasks /create /tn "%TASK_NAME%" /tr "\"%SCRIPT_PATH%\" --silent" /sc daily /st %HORA% /f

if %errorlevel% equ 0 (
    echo.
    echo [EXITO] La tarea de respaldo automatico ha sido programada con exito.
    echo Se ejecutara todos los dias a las %HORA%.
    echo Los respaldos se guardaran en: c:\app\post-luis\backups\
) else (
    echo.
    echo [AVISO] Si dio error de permisos, haz clic derecho en este archivo
    echo y selecciona "Ejecutar como administrador".
)

echo.
pause

