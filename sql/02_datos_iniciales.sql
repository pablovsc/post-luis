-- ==============================================================================
-- 02_DATOS_INICIALES.SQL - REGISTROS INICIALES Y SEMILLAS (DML)
-- Tienda Express POS / ERP Express Multimoneda
-- ==============================================================================

BEGIN;

-- 1. Impuestos por Defecto
INSERT INTO m_impuesto (id, nombre, porcentaje, activo) VALUES
(1, 'IVA 16%', 16.00, true),
(2, 'Exento (0%)', 0.00, true)
ON CONFLICT (id) DO NOTHING;

SELECT setval('m_impuesto_id_seq', COALESCE((SELECT MAX(id) FROM m_impuesto), 2));

-- 2. Terceros por Defecto (Cliente Mostrador y Proveedor Base)
INSERT INTO m_tercero (id, tipo, identificacion, razon_social_nombre, direccion, telefono, email, activo) VALUES
(1, 'CLIENTE', 'V-00000000', 'Cliente Genérico / Venta Mostrador', 'Tienda Local', 'N/A', 'cliente@mostrador.com', true),
(2, 'PROVEEDOR', 'J-00000000-1', 'Distribuidora Central (Proveedor Demo)', 'Zona Industrial', '0414-0000000', 'proveedor@demo.com', true)
ON CONFLICT (id) DO NOTHING;

SELECT setval('m_tercero_id_seq', COALESCE((SELECT MAX(id) FROM m_tercero), 2));

-- 3. Roles del Sistema
-- Permisos: pos, orders, compras, products, terceros, rates, impuestos, reports, reports_profit, users, maintenance
INSERT INTO m_rol (id, nombre, descripcion, permisos, activo) VALUES
(1, 'ADMINISTRADOR', 'Acceso completo a todos los módulos y configuraciones del sistema', '["pos", "orders", "compras", "products", "terceros", "rates", "impuestos", "reports", "reports_profit", "users", "maintenance"]'::jsonb, true),
(2, 'SUPERVISOR', 'Acceso a ventas, compras, productos, clientes y reportes operativos', '["pos", "orders", "compras", "products", "terceros", "rates", "reports"]'::jsonb, true),
(3, 'CAJERO', 'Acceso exclusivo para facturación en Punto de Venta y consulta de tasa', '["pos", "orders", "rates"]'::jsonb, true),
(4, 'ALMACEN', 'Acceso a inventario, productos, proveedores y recepción de compras', '["products", "compras", "terceros"]'::jsonb, true)
ON CONFLICT (id) DO NOTHING;

SELECT setval('m_rol_id_seq', COALESCE((SELECT MAX(id) FROM m_rol), 4));

-- 4. Usuarios Iniciales
-- Contraseña por defecto: admin123
-- SHA-256 de "admin123": 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
INSERT INTO m_usuario (id, username, password_hash, nombre_completo, email, rol_id, activo) VALUES
(1, 'admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Administrador del Sistema', 'admin@tiendaexpress.com', 1, true),
(2, 'cajero', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Cajero Principal', 'cajero@tiendaexpress.com', 3, true)
ON CONFLICT (id) DO NOTHING;

SELECT setval('m_usuario_id_seq', COALESCE((SELECT MAX(id) FROM m_usuario), 2));

-- 5. Tipos de Pago Base
INSERT INTO m_tipopago (id, codigo, nombre, moneda, requiere_referencia, activo) VALUES
(1, 'EFECTIVO_USD', 'Efectivo Dólares ($)', 'USD', false, true),
(2, 'EFECTIVO_VES', 'Efectivo Bolívares (Bs)', 'VES', false, true),
(3, 'PAGO_MOVIL', 'Pago Móvil (Bs)', 'VES', true, true),
(4, 'PUNTO_VENTA', 'Punto de Venta / Tarjeta Débito/Crédito (Bs)', 'VES', true, true),
(5, 'TRANSFERENCIA_VES', 'Transferencia Bancaria (Bs)', 'VES', true, true),
(6, 'ZELLE', 'Zelle ($)', 'USD', true, true),
(7, 'CASHEA', 'Cashea (App Móvil)', 'USD', true, true)
ON CONFLICT (id) DO UPDATE 
SET nombre = EXCLUDED.nombre,
    moneda = EXCLUDED.moneda,
    requiere_referencia = EXCLUDED.requiere_referencia;

SELECT setval('m_tipopago_id_seq', COALESCE((SELECT MAX(id) FROM m_tipopago), 7));

-- 5.1 Entidades Financieras y Cajas (m_banco)
INSERT INTO m_banco (id, codigo, nombre, tipo, activo) VALUES
(1, 'CAJAS', 'Cajas del Negocio (Efectivo)', 'CAJA', true),
(2, '0102', 'Banco de Venezuela', 'BANCO', true),
(3, '0134', 'Banesco Banco Universal', 'BANCO', true),
(4, '0108', 'Banco Provincial', 'BANCO', true),
(5, '0105', 'Banco Mercantil', 'BANCO', true)
ON CONFLICT (id) DO UPDATE SET
    tipo = EXCLUDED.tipo,
    nombre = EXCLUDED.nombre;

SELECT setval('m_banco_id_seq', COALESCE((SELECT MAX(id) FROM m_banco), 5));

-- 5.2 Cuentas Bancarias y Cajas (m_cuentabancaria)
INSERT INTO m_cuentabancaria (id, banco_id, nombre, tipo_cuenta, numero_cuenta, moneda, saldo_actual, activo) VALUES
(1, 1, 'Caja Principal Dólares ($)', 'CAJA_EFECTIVO', 'N/A', 'USD', 0, true),
(2, 1, 'Caja Principal Bolívares (Bs)', 'CAJA_EFECTIVO', 'N/A', 'VES', 0, true),
(3, 3, 'Banesco Corriente / Pago Móvil (Bs)', 'CORRIENTE', '0134-0000-00-0000000000', 'VES', 0, true),
(4, 2, 'BDV Cuenta Corriente (Bs)', 'CORRIENTE', '0102-0000-00-0000000000', 'VES', 0, true)
ON CONFLICT (id) DO UPDATE SET
    banco_id = EXCLUDED.banco_id,
    nombre = EXCLUDED.nombre,
    tipo_cuenta = EXCLUDED.tipo_cuenta,
    moneda = EXCLUDED.moneda;

SELECT setval('m_cuentabancaria_id_seq', COALESCE((SELECT MAX(id) FROM m_cuentabancaria), 4));

-- 6. Tasa Inicial del Día (si no existe ninguna)
INSERT INTO m_tasa (fecha, tasa)
VALUES (CURRENT_DATE, 36.5000)
ON CONFLICT (fecha) DO NOTHING;

-- 6. Productos Demo Iniciales
INSERT INTO m_producto (nombre, precio_usd, stock_actual, costo_promedio_usd, impuesto_id, activo) VALUES
('Café Molido Gourmet 500g', 5.50, 25.00, 3.80, 1, true),
('Harina de Maíz Precocida 1kg', 1.20, 50.00, 0.85, 2, true),
('Arroz Blanco Premium 1kg', 1.40, 40.00, 0.95, 2, true),
('Aceite Vegetal 1L', 3.20, 30.00, 2.20, 1, true),
('Azúcar Refinada 1kg', 1.50, 45.00, 1.05, 2, true),
('Pasta Spaghetti 500g', 1.10, 60.00, 0.75, 2, true),
('Leche Completa Polvo 900g', 8.50, 20.00, 6.00, 2, true),
('Refresco Cola 2L', 2.00, 35.00, 1.30, 1, true)
ON CONFLICT DO NOTHING;

COMMIT;

