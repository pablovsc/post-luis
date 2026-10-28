-- Script de creación de tablas para PostgreSQL
-- Tienda POS - Gestión de ventas, compras, inventario, terceros e impuestos

-- 1. Tabla de Impuestos (m_impuesto)
CREATE TABLE IF NOT EXISTS m_impuesto (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    porcentaje NUMERIC(5, 2) NOT NULL CHECK (porcentaje >= 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Clientes y Proveedores (m_tercero)
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

-- 3. Tabla de Productos (m_producto)
CREATE TABLE IF NOT EXISTS m_producto (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    precio_usd NUMERIC(12, 2) NOT NULL CHECK (precio_usd >= 0),
    stock_actual NUMERIC(12, 2) NOT NULL DEFAULT 0,
    costo_promedio_usd NUMERIC(14, 4) NOT NULL DEFAULT 0,
    unidad_base VARCHAR(50) NOT NULL DEFAULT 'Unidad',
    impuesto_id INT REFERENCES m_impuesto(id),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3.1 Tabla de Presentaciones por Producto (m_producto_presentacion)
CREATE TABLE IF NOT EXISTS m_producto_presentacion (
    id SERIAL PRIMARY KEY,
    producto_id INT NOT NULL REFERENCES m_producto(id) ON DELETE CASCADE,
    nombre VARCHAR(50) NOT NULL,
    factor NUMERIC(12, 3) NOT NULL CHECK (factor > 0),
    precio_usd NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (precio_usd >= 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Tasa de Cambio (m_tasa)
CREATE TABLE IF NOT EXISTS m_tasa (
    id SERIAL PRIMARY KEY,
    fecha DATE NOT NULL UNIQUE,
    tasa NUMERIC(14, 4) NOT NULL CHECK (tasa > 0),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla de Pedidos de Ventas (t_pedido)
CREATE TABLE IF NOT EXISTS t_pedido (
    id SERIAL PRIMARY KEY,
    fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tercero_id INT REFERENCES m_tercero(id),
    cliente_nombre VARCHAR(255),
    tasa_cambio_aplicada NUMERIC(14, 4) NOT NULL,
    base_imponible_usd NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (base_imponible_usd >= 0),
    monto_impuesto_usd NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (monto_impuesto_usd >= 0),
    total_usd NUMERIC(14, 2) NOT NULL CHECK (total_usd >= 0),
    total_moneda_local NUMERIC(16, 2) NOT NULL CHECK (total_moneda_local >= 0),
    estado VARCHAR(20) NOT NULL DEFAULT 'COMPLETADO' CHECK (estado IN ('COMPLETADO', 'ANULADO'))
);

-- 6. Tabla de Líneas de Pedido (t_pedidolinea)
CREATE TABLE IF NOT EXISTS t_pedidolinea (
    id SERIAL PRIMARY KEY,
    pedido_id INT NOT NULL REFERENCES t_pedido(id) ON DELETE CASCADE,
    producto_id INT NOT NULL REFERENCES m_producto(id),
    presentacion_id INT REFERENCES m_producto_presentacion(id) ON DELETE SET NULL,
    presentacion_nombre VARCHAR(50),
    factor_conversion NUMERIC(12, 3) NOT NULL DEFAULT 1,
    cantidad NUMERIC(12, 2) NOT NULL CHECK (cantidad > 0),
    cantidad_base NUMERIC(14, 3),
    precio_unitario_usd NUMERIC(12, 2) NOT NULL CHECK (precio_unitario_usd >= 0),
    impuesto_id INT REFERENCES m_impuesto(id),
    porcentaje_impuesto NUMERIC(5, 2) NOT NULL DEFAULT 0,
    monto_impuesto_usd NUMERIC(14, 2) NOT NULL DEFAULT 0,
    subtotal_usd NUMERIC(14, 2) NOT NULL CHECK (subtotal_usd >= 0)
);

-- 7. Tabla de Factura de Compra (t_compra)
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
    estado VARCHAR(20) NOT NULL DEFAULT 'COMPLETADO' CHECK (estado IN ('PROCESO', 'COMPLETADO', 'ANULADO')),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Tabla de Líneas de Factura de Compra (t_compralinea)
CREATE TABLE IF NOT EXISTS t_compralinea (
    id SERIAL PRIMARY KEY,
    compra_id INT NOT NULL REFERENCES t_compra(id) ON DELETE CASCADE,
    producto_id INT NOT NULL REFERENCES m_producto(id),
    presentacion_id INT REFERENCES m_producto_presentacion(id) ON DELETE SET NULL,
    presentacion_nombre VARCHAR(50),
    factor_conversion NUMERIC(12, 3) NOT NULL DEFAULT 1,
    cantidad NUMERIC(12, 2) NOT NULL CHECK (cantidad > 0),
    cantidad_base NUMERIC(14, 3),
    costo_unitario_usd NUMERIC(12, 2) NOT NULL CHECK (costo_unitario_usd >= 0),
    impuesto_id INT NOT NULL REFERENCES m_impuesto(id),
    porcentaje_impuesto NUMERIC(5, 2) NOT NULL DEFAULT 0,
    monto_impuesto_usd NUMERIC(14, 2) NOT NULL DEFAULT 0,
    subtotal_usd NUMERIC(14, 2) NOT NULL CHECK (subtotal_usd >= 0)
);

-- Índices recomendados para optimización de consultas y reportes
CREATE INDEX IF NOT EXISTS idx_producto_activo ON m_producto(activo);
CREATE INDEX IF NOT EXISTS idx_producto_impuesto ON m_producto(impuesto_id);
CREATE INDEX IF NOT EXISTS idx_presentacion_producto ON m_producto_presentacion(producto_id);
CREATE INDEX IF NOT EXISTS idx_tasa_fecha ON m_tasa(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_pedido_fecha ON t_pedido(fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_pedido_tercero ON t_pedido(tercero_id);
CREATE INDEX IF NOT EXISTS idx_pedidolinea_pedido ON t_pedidolinea(pedido_id);
CREATE INDEX IF NOT EXISTS idx_tercero_tipo ON m_tercero(tipo);
CREATE INDEX IF NOT EXISTS idx_tercero_identificacion ON m_tercero(identificacion);
CREATE INDEX IF NOT EXISTS idx_compra_fecha ON t_compra(fecha_emision DESC);
CREATE INDEX IF NOT EXISTS idx_compra_tercero ON t_compra(tercero_id);
CREATE INDEX IF NOT EXISTS idx_compralinea_compra ON t_compralinea(compra_id);
CREATE INDEX IF NOT EXISTS idx_compralinea_producto ON t_compralinea(producto_id);
