-- Migración V2: Impuestos, Terceros, Inventario y Compras

-- 1. Tabla de Impuestos (m_impuesto)
CREATE TABLE IF NOT EXISTS m_impuesto (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    porcentaje NUMERIC(5, 2) NOT NULL CHECK (porcentaje >= 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO m_impuesto (id, nombre, porcentaje, activo) VALUES
(1, 'IVA 16%', 16.00, true),
(2, 'Exento (0%)', 0.00, true)
ON CONFLICT (id) DO NOTHING;

SELECT setval('m_impuesto_id_seq', COALESCE((SELECT MAX(id) FROM m_impuesto), 1));

-- 2. Modificar m_producto
ALTER TABLE m_producto 
    ADD COLUMN IF NOT EXISTS impuesto_id INT REFERENCES m_impuesto(id),
    ADD COLUMN IF NOT EXISTS stock_actual NUMERIC(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS costo_promedio_usd NUMERIC(12, 2) NOT NULL DEFAULT 0;

UPDATE m_producto SET impuesto_id = 1 WHERE impuesto_id IS NULL;

-- 3. Tabla de Clientes y Proveedores (m_tercero)
CREATE TABLE IF NOT EXISTS m_tercero (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('CLIENTE', 'PROVEEDOR', 'AMBOS')),
    identificacion VARCHAR(50) NOT NULL UNIQUE,
    razon_social_nombre VARCHAR(255) NOT NULL,
    direccion TEXT,
    telefono VARCHAR(50),
    email VARCHAR(255),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO m_tercero (id, tipo, identificacion, razon_social_nombre, direccion, telefono, email, activo)
VALUES (1, 'CLIENTE', 'V-00000000', 'Cliente Genérico / Venta Mostrador', 'Tienda Local', 'N/A', 'cliente@mostrador.com', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO m_tercero (id, tipo, identificacion, razon_social_nombre, direccion, telefono, email, activo)
VALUES (2, 'PROVEEDOR', 'J-00000000-1', 'Distribuidora Central (Proveedor Demo)', 'Zona Industrial', '0414-0000000', 'proveedor@demo.com', true)
ON CONFLICT (id) DO NOTHING;

SELECT setval('m_tercero_id_seq', COALESCE((SELECT MAX(id) FROM m_tercero), 2));

-- 4. Modificar t_pedido y t_pedidolinea
ALTER TABLE t_pedido
    ADD COLUMN IF NOT EXISTS tercero_id INT REFERENCES m_tercero(id),
    ADD COLUMN IF NOT EXISTS base_imponible_usd NUMERIC(14, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS monto_impuesto_usd NUMERIC(14, 2) NOT NULL DEFAULT 0;

UPDATE t_pedido SET tercero_id = 1 WHERE tercero_id IS NULL;
UPDATE t_pedido SET base_imponible_usd = total_usd WHERE base_imponible_usd = 0 AND total_usd > 0;

ALTER TABLE t_pedidolinea
    ADD COLUMN IF NOT EXISTS impuesto_id INT REFERENCES m_impuesto(id),
    ADD COLUMN IF NOT EXISTS porcentaje_impuesto NUMERIC(5, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS monto_impuesto_usd NUMERIC(14, 2) NOT NULL DEFAULT 0;

-- 5. Tablas de Factura de Compra (t_compra y t_compralinea)
CREATE TABLE IF NOT EXISTS t_compra (
    id SERIAL PRIMARY KEY,
    numero_factura VARCHAR(100) NOT NULL,
    tercero_id INT NOT NULL REFERENCES m_tercero(id),
    fecha_emision DATE NOT NULL,
    tasa_cambio_aplicada NUMERIC(14, 4) NOT NULL CHECK (tasa_cambio_aplicada > 0),
    base_imponible_usd NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (base_imponible_usd >= 0),
    monto_impuesto_usd NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (monto_impuesto_usd >= 0),
    total_usd NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (total_usd >= 0),
    total_moneda_local NUMERIC(16, 2) NOT NULL DEFAULT 0 CHECK (total_moneda_local >= 0),
    observaciones TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS t_compralinea (
    id SERIAL PRIMARY KEY,
    compra_id INT NOT NULL REFERENCES t_compra(id) ON DELETE CASCADE,
    producto_id INT NOT NULL REFERENCES m_producto(id),
    cantidad NUMERIC(12, 2) NOT NULL CHECK (cantidad > 0),
    costo_unitario_usd NUMERIC(12, 2) NOT NULL CHECK (costo_unitario_usd >= 0),
    impuesto_id INT NOT NULL REFERENCES m_impuesto(id),
    porcentaje_impuesto NUMERIC(5, 2) NOT NULL DEFAULT 0,
    monto_impuesto_usd NUMERIC(14, 2) NOT NULL DEFAULT 0,
    subtotal_usd NUMERIC(14, 2) NOT NULL CHECK (subtotal_usd >= 0)
);

-- Índices recomendados
CREATE INDEX IF NOT EXISTS idx_tercero_tipo ON m_tercero(tipo);
CREATE INDEX IF NOT EXISTS idx_tercero_identificacion ON m_tercero(identificacion);
CREATE INDEX IF NOT EXISTS idx_compra_fecha ON t_compra(fecha_emision DESC);
CREATE INDEX IF NOT EXISTS idx_compra_tercero ON t_compra(tercero_id);
CREATE INDEX IF NOT EXISTS idx_compralinea_compra ON t_compralinea(compra_id);
CREATE INDEX IF NOT EXISTS idx_compralinea_producto ON t_compralinea(producto_id);
CREATE INDEX IF NOT EXISTS idx_pedido_tercero ON t_pedido(tercero_id);
CREATE INDEX IF NOT EXISTS idx_producto_impuesto ON m_producto(impuesto_id);
