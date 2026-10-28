-- Migración v3: Unidades de medida y presentaciones por producto
-- El inventario (stock_actual) se guarda SIEMPRE en la unidad base del producto.
-- Cada presentación (Paquete, Bulto, Caja...) equivale a "factor" unidades base y tiene su propio precio.

ALTER TABLE m_producto
    ADD COLUMN IF NOT EXISTS unidad_base VARCHAR(50) NOT NULL DEFAULT 'Unidad';

-- Mayor precisión para costo unitario (costo bulto / factor puede tener más de 2 decimales)
ALTER TABLE m_producto ALTER COLUMN costo_promedio_usd TYPE NUMERIC(14, 4);

CREATE TABLE IF NOT EXISTS m_producto_presentacion (
    id SERIAL PRIMARY KEY,
    producto_id INT NOT NULL REFERENCES m_producto(id) ON DELETE CASCADE,
    nombre VARCHAR(50) NOT NULL,
    factor NUMERIC(12, 3) NOT NULL CHECK (factor > 0),
    precio_usd NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (precio_usd >= 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE t_pedidolinea
    ADD COLUMN IF NOT EXISTS presentacion_id INT REFERENCES m_producto_presentacion(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS presentacion_nombre VARCHAR(50),
    ADD COLUMN IF NOT EXISTS factor_conversion NUMERIC(12, 3) NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS cantidad_base NUMERIC(14, 3);
UPDATE t_pedidolinea SET cantidad_base = cantidad * factor_conversion WHERE cantidad_base IS NULL;

ALTER TABLE t_compralinea
    ADD COLUMN IF NOT EXISTS presentacion_id INT REFERENCES m_producto_presentacion(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS presentacion_nombre VARCHAR(50),
    ADD COLUMN IF NOT EXISTS factor_conversion NUMERIC(12, 3) NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS cantidad_base NUMERIC(14, 3);
UPDATE t_compralinea SET cantidad_base = cantidad * factor_conversion WHERE cantidad_base IS NULL;

CREATE INDEX IF NOT EXISTS idx_presentacion_producto ON m_producto_presentacion(producto_id);
