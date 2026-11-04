-- ==============================================================================
-- 01_TABLAS.SQL - DEFINICIÓN DE ESTRUCTURA Y TABLAS (DDL)
-- Tienda Express POS / ERP Express Multimoneda
-- PostgreSQL 14 / 15 / 16 / 17
-- ==============================================================================

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

-- 5. Tabla de Roles (m_rol)
CREATE TABLE IF NOT EXISTS m_rol (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    permisos JSONB NOT NULL DEFAULT '[]'::jsonb,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabla de Usuarios (m_usuario)
CREATE TABLE IF NOT EXISTS m_usuario (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(150) NOT NULL,
    email VARCHAR(255),
    rol_id INT NOT NULL REFERENCES m_rol(id) ON UPDATE CASCADE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_acceso TIMESTAMP WITH TIME ZONE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabla de Tipos / Métodos de Pago (m_tipopago)
CREATE TABLE IF NOT EXISTS m_tipopago (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    moneda VARCHAR(10) NOT NULL DEFAULT 'USD' CHECK (moneda IN ('USD', 'VES')),
    requiere_referencia BOOLEAN NOT NULL DEFAULT FALSE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7.1 Tabla de Entidades Financieras / Cajas (m_banco)
CREATE TABLE IF NOT EXISTS m_banco (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    tipo VARCHAR(10) NOT NULL DEFAULT 'BANCO' CHECK (tipo IN ('BANCO', 'CAJA')),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7.2 Tabla de Cuentas Bancarias y Cajas (m_cuentabancaria)
CREATE TABLE IF NOT EXISTS m_cuentabancaria (
    id SERIAL PRIMARY KEY,
    banco_id INT NOT NULL REFERENCES m_banco(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    nombre VARCHAR(100) NOT NULL,
    tipo_cuenta VARCHAR(30) NOT NULL DEFAULT 'CORRIENTE' 
        CHECK (tipo_cuenta IN ('CORRIENTE', 'AHORRO', 'CAJA_EFECTIVO', 'VIRTUAL')),
    numero_cuenta VARCHAR(50),
    moneda VARCHAR(10) NOT NULL CHECK (moneda IN ('USD', 'VES')),
    saldo_actual NUMERIC(16, 2) NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Tabla de Pedidos de Ventas (t_pedido)
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
    condicion_pago VARCHAR(20) NOT NULL DEFAULT 'CONTADO' CHECK (condicion_pago IN ('CONTADO', 'CREDITO', 'CREDITO_7', 'CREDITO_15', 'CREDITO_30', 'CREDITO_45')),
    tipo_pago_id INT REFERENCES m_tipopago(id),
    referencia_pago VARCHAR(100),
    fecha_vencimiento DATE,
    estado VARCHAR(20) NOT NULL DEFAULT 'COMPLETADO' CHECK (estado IN ('COMPLETADO', 'ANULADO'))
);

-- 9. Tabla de Líneas de Pedido (t_pedidolinea)
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

-- 10. Tabla de Factura de Compra (t_compra)
CREATE TABLE IF NOT EXISTS t_compra (
    id SERIAL PRIMARY KEY,
    numero_factura VARCHAR(100) NOT NULL,
    tercero_id INT NOT NULL REFERENCES m_tercero(id),
    fecha_emision DATE NOT NULL,
    tasa_cambio_aplicada NUMERIC(14, 4) NOT NULL CHECK (tasa_cambio_aplicada > 0),
    base_imponible_usd NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (base_imponible_usd >= 0),
    monto_impuesto_usd NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (monto_impuesto_usd >= 0),
    total_usd NUMERIC(14, 2) NOT NULL CHECK (total_usd >= 0),
    total_moneda_local NUMERIC(16, 2) NOT NULL DEFAULT 0 CHECK (total_moneda_local >= 0),
    condicion_pago VARCHAR(20) NOT NULL DEFAULT 'CONTADO' CHECK (condicion_pago IN ('CONTADO', 'CREDITO', 'CREDITO_7', 'CREDITO_15', 'CREDITO_30', 'CREDITO_45')),
    tipo_pago_id INT REFERENCES m_tipopago(id),
    referencia_pago VARCHAR(100),
    fecha_vencimiento DATE,
    observaciones TEXT,
    estado VARCHAR(20) NOT NULL DEFAULT 'COMPLETADO' CHECK (estado IN ('PROCESO', 'COMPLETADO', 'ANULADO')),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Tabla de Líneas de Factura de Compra (t_compralinea)
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

-- 12. Tabla de Pagos y Cobranzas (t_pago)
CREATE TABLE IF NOT EXISTS t_pago (
    id SERIAL PRIMARY KEY,
    tipo_operacion VARCHAR(20) NOT NULL CHECK (tipo_operacion IN ('COBRO_VENTA', 'PAGO_COMPRA', 'ABONO_VENTA', 'ABONO_COMPRA')),
    pedido_id INT REFERENCES t_pedido(id) ON DELETE RESTRICT,
    compra_id INT REFERENCES t_compra(id) ON DELETE RESTRICT,
    tercero_id INT REFERENCES m_tercero(id),
    tipo_pago_id INT NOT NULL REFERENCES m_tipopago(id),
    cuenta_bancaria_id INT REFERENCES m_cuentabancaria(id),
    fecha_pago TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    moneda VARCHAR(10) NOT NULL CHECK (moneda IN ('USD', 'VES')),
    monto_original NUMERIC(14, 2) NOT NULL CHECK (monto_original > 0),
    tasa_cambio NUMERIC(14, 4) NOT NULL CHECK (tasa_cambio > 0),
    monto_equivalente_usd NUMERIC(14, 2) NOT NULL CHECK (monto_equivalente_usd > 0),
    referencia VARCHAR(100),
    nota TEXT,
    estado VARCHAR(20) NOT NULL DEFAULT 'APROBADO' CHECK (estado IN ('APROBADO', 'ANULADO')),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    creado_por INT REFERENCES m_usuario(id),
    actualizado_en TIMESTAMP WITH TIME ZONE,
    actualizado_por INT REFERENCES m_usuario(id)
);

-- 12.1 Tabla de Relación Documento - Pago (t_pago_documento)
-- Permite imputación de múltiples pagos a una factura o un pago a múltiples facturas
CREATE TABLE IF NOT EXISTS t_pago_documento (
    id SERIAL PRIMARY KEY,
    pago_id INT NOT NULL REFERENCES t_pago(id) ON DELETE CASCADE,
    tipo_documento VARCHAR(20) NOT NULL CHECK (tipo_documento IN ('VENTA', 'COMPRA')),
    pedido_id INT REFERENCES t_pedido(id) ON DELETE RESTRICT,
    compra_id INT REFERENCES t_compra(id) ON DELETE RESTRICT,
    monto_imputado_original NUMERIC(14, 2) NOT NULL CHECK (monto_imputado_original > 0),
    monto_imputado_usd NUMERIC(14, 2) NOT NULL CHECK (monto_imputado_usd > 0),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- ÍNDICES DE RENDIMIENTO
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_producto_activo ON m_producto(activo);
CREATE INDEX IF NOT EXISTS idx_producto_impuesto ON m_producto(impuesto_id);
CREATE INDEX IF NOT EXISTS idx_presentacion_producto ON m_producto_presentacion(producto_id);
CREATE INDEX IF NOT EXISTS idx_tasa_fecha ON m_tasa(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_usuario_username ON m_usuario(username);
CREATE INDEX IF NOT EXISTS idx_usuario_rol ON m_usuario(rol_id);
CREATE INDEX IF NOT EXISTS idx_banco_tipo ON m_banco(tipo);
CREATE INDEX IF NOT EXISTS idx_cuenta_banco ON m_cuentabancaria(banco_id);
CREATE INDEX IF NOT EXISTS idx_cuenta_moneda ON m_cuentabancaria(moneda);
CREATE INDEX IF NOT EXISTS idx_pedido_fecha ON t_pedido(fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_pedido_tercero ON t_pedido(tercero_id);
CREATE INDEX IF NOT EXISTS idx_pedido_tipopago ON t_pedido(tipo_pago_id);
CREATE INDEX IF NOT EXISTS idx_pedido_condicion ON t_pedido(condicion_pago);
CREATE INDEX IF NOT EXISTS idx_pedidolinea_pedido ON t_pedidolinea(pedido_id);
CREATE INDEX IF NOT EXISTS idx_tercero_tipo ON m_tercero(tipo);
CREATE INDEX IF NOT EXISTS idx_tercero_identificacion ON m_tercero(identificacion);
CREATE INDEX IF NOT EXISTS idx_compra_fecha ON t_compra(fecha_emision DESC);
CREATE INDEX IF NOT EXISTS idx_compra_tercero ON t_compra(tercero_id);
CREATE INDEX IF NOT EXISTS idx_compra_tipopago ON t_compra(tipo_pago_id);
CREATE INDEX IF NOT EXISTS idx_compra_condicion ON t_compra(condicion_pago);
CREATE INDEX IF NOT EXISTS idx_compralinea_compra ON t_compralinea(compra_id);
CREATE INDEX IF NOT EXISTS idx_compralinea_producto ON t_compralinea(producto_id);
CREATE INDEX IF NOT EXISTS idx_pago_pedido ON t_pago(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pago_compra ON t_pago(compra_id);
CREATE INDEX IF NOT EXISTS idx_pago_tercero ON t_pago(tercero_id);
CREATE INDEX IF NOT EXISTS idx_pago_tipopago ON t_pago(tipo_pago_id);
CREATE INDEX IF NOT EXISTS idx_pago_cuenta ON t_pago(cuenta_bancaria_id);
CREATE INDEX IF NOT EXISTS idx_pago_fecha ON t_pago(fecha_pago DESC);
CREATE INDEX IF NOT EXISTS idx_pagodoc_pago ON t_pago_documento(pago_id);
CREATE INDEX IF NOT EXISTS idx_pagodoc_pedido ON t_pago_documento(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pagodoc_compra ON t_pago_documento(compra_id);

