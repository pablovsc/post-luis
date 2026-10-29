#!/bin/bash
# ==============================================================================
# Script de mantenimiento y limpieza de pruebas para Tienda Express POS en Docker
# ==============================================================================

CONTAINER_NAME=${1:-pos_postgres}
DB_USER=${2:-adempiere}
DB_NAME=${3:-luis}
ACTION=${4:-ambos}

echo "=========================================================="
echo "   TIENDA EXPRESS POS - HERRAMIENTA DE SISTEMAS (BASH)"
echo "   Limpieza y Reinicio de Secuencias en Docker"
echo "=========================================================="

SQL="BEGIN; "

if [ "$ACTION" = "ventas" ] || [ "$ACTION" = "ambos" ]; then
    SQL+="TRUNCATE TABLE t_pedidolinea, t_pedido RESTART IDENTITY CASCADE; "
fi

if [ "$ACTION" = "compras" ] || [ "$ACTION" = "ambos" ]; then
    SQL+="TRUNCATE TABLE t_compralinea, t_compra RESTART IDENTITY CASCADE; "
fi

SQL+="COMMIT;"

echo "Ejecutando en contenedor '$CONTAINER_NAME' para base de datos '$DB_NAME'..."

docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "$SQL"

if [ $? -eq 0 ]; then
    echo "Operación completada con éxito. Secuencias reiniciadas a 1."
else
    echo "Error al ejecutar la sentencia en Docker."
fi

