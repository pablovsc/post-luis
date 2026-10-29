<#
.SYNOPSIS
    Script de mantenimiento y limpieza de pruebas para Tienda Express POS en Docker.
.DESCRIPTION
    Borra las transacciones de ventas y/o compras y reinicia los contadores correlativos (SERIAL) a 1.
    Puede ejecutarse directamente apuntando al contenedor pos_postgres.
#>

param(
    [string]$ContainerName = "pos_postgres",
    [string]$DbUser = "adempiere",
    [string]$DbName = "luis",
    [ValidateSet("ventas", "compras", "ambos", "todo")]
    [string]$Accion = "ambos",
    [switch]$ResetStock = $false,
    [double]$StockValor = 0
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   TIENDA EXPRESS POS - HERRAMIENTA DE SISTEMAS" -ForegroundColor Yellow
Write-Host "   Mantenimiento y Reinicio de Secuencias en Docker" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Comprobar si docker está en ejecución
try {
    $dockerCheck = docker ps --filter "name=$ContainerName" --format "{{.Names}}"
    if (-not $dockerCheck) {
        Write-Host "ERROR: No se encontró el contenedor '$ContainerName' en ejecución." -ForegroundColor Red
        Write-Host "Asegúrate de haber iniciado el entorno con: docker compose up -d" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "ERROR: No se pudo comunicar con Docker. Asegúrate de tener Docker Desktop abierto." -ForegroundColor Red
    exit 1
}

Write-Host "Contenedor detectado: $ContainerName" -ForegroundColor Green
Write-Host "Base de Datos: $DbName | Usuario: $DbUser" -ForegroundColor Gray
Write-Host "Acción solicitada: $Accion" -ForegroundColor Yellow

$sql = "BEGIN; "

if ($Accion -eq "ventas" -or $Accion -eq "ambos" -or $Accion -eq "todo") {
    $sql += "TRUNCATE TABLE t_pedidolinea, t_pedido RESTART IDENTITY CASCADE; "
}

if ($Accion -eq "compras" -or $Accion -eq "ambos" -or $Accion -eq "todo") {
    $sql += "TRUNCATE TABLE t_compralinea, t_compra RESTART IDENTITY CASCADE; "
}

if ($ResetStock) {
    $sql += "UPDATE m_producto SET stock_actual = $StockValor; "
}

$sql += "COMMIT;"

Write-Host "`nEjecutando sentencia en PostgreSQL dentro del contenedor..." -ForegroundColor Cyan

$cmd = "docker exec -i $ContainerName psql -U $DbUser -d $DbName -c `"$sql`""
Invoke-Expression $cmd

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n[EXITO] Operación completada con éxito." -ForegroundColor Green
    Write-Host "- Transacciones eliminadas según selección: $Accion" -ForegroundColor White
    Write-Host "- Secuencias correlativas reiniciadas a 1 (próximo pedido o compra iniciará en #1)." -ForegroundColor White
    if ($ResetStock) {
        Write-Host "- Stock de productos actualizado a $StockValor." -ForegroundColor White
    }
} else {
    Write-Host "`n[ERROR] Ocurrió un error al ejecutar la limpieza en la base de datos." -ForegroundColor Red
}

Write-Host "==========================================================" -ForegroundColor Cyan

