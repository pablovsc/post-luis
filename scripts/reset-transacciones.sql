-- ==============================================================================
-- SCRIPT DE MANTENIMIENTO Y LIMPIEZA DE TRANSACCIONES DE PRUEBA (POSTGRESQL)
-- Tienda Express POS / ERP Express
-- ==============================================================================
-- Este script permite vaciar los registros de prueba de Ventas y Compras
-- y reiniciar los contadores correlativos (secuencias) a 1.
-- ==============================================================================

BEGIN;

-- 1. Vaciar Ventas (Pedidos y sus renglones) y reiniciar secuencias
TRUNCATE TABLE t_pedidolinea, t_pedido RESTART IDENTITY CASCADE;

-- 2. Vaciar Compras (Facturas y sus renglones) y reiniciar secuencias
TRUNCATE TABLE t_compralinea, t_compra RESTART IDENTITY CASCADE;

-- 3. (OPCIONAL) Si deseas reiniciar el inventario a un valor por defecto o 0 tras borrar las pruebas:
-- UPDATE m_producto SET stock_actual = 0;

-- 4. Verificación de secuencias reiniciadas
-- SELECT pg_get_serial_sequence('t_pedido', 'id'), last_value FROM t_pedido_id_seq;
-- SELECT pg_get_serial_sequence('t_compra', 'id'), last_value FROM t_compra_id_seq;

COMMIT;

-- Informar al operador
DO $$
BEGIN
    RAISE NOTICE 'Base de datos limpia: Ventas y Compras vaciadas. Secuencias reiniciadas a 1 exitosamente.';
END $$;

