import { Pool, PoolConfig } from 'pg';
import fs from 'fs';
import path from 'path';

export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
  ssl?: boolean;
}

const CONFIG_FILE_PATH = path.join(process.cwd(), '.dbconfig.json');

// Parse .env directly if process.env hasn't loaded it yet or has indentations
function parseEnvFile(): Record<string, string> {
  const envPath = path.join(process.cwd(), '.env');
  const result: Record<string, string> = {};
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf-8');
      for (const rawLine of content.split('\n')) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const eqIdx = line.indexOf('=');
        if (eqIdx !== -1) {
          const key = line.slice(0, eqIdx).trim();
          const val = line.slice(eqIdx + 1).trim();
          result[key] = val;
        }
      }
    } catch (e) {
      console.error('Error reading .env:', e);
    }
  }
  return result;
}

// Get stored or env config
export function getStoredDbConfig(): DbConfig {
  if (fs.existsSync(CONFIG_FILE_PATH)) {
    try {
      const data = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      return JSON.parse(data);
    } catch {
      // fallback
    }
  }

  const env = parseEnvFile();

  return {
    host: env.DB_HOST || process.env.DB_HOST || process.env.PGHOST || 'localhost',
    port: parseInt(env.DB_PORT || process.env.DB_PORT || process.env.PGPORT || '5432', 10),
    user: env.DB_USER || process.env.DB_USER || process.env.PGUSER || 'adempiere',
    password: env.DB_PASSWORD || process.env.DB_PASSWORD || process.env.PGPASSWORD || 'adempiere',
    database: env.DB_DATABASE || process.env.DB_DATABASE || process.env.PGDATABASE || 'luis',
    ssl: (env.DB_SSL || process.env.DB_SSL || process.env.PGSSL) === 'true',
  };
}

export function saveStoredDbConfig(config: DbConfig): void {
  fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf-8');
  resetPool();
}

let poolInstance: Pool | null = null;

export function getPool(customConfig?: DbConfig): Pool {
  if (customConfig) {
    return new Pool({
      host: customConfig.host,
      port: customConfig.port,
      user: customConfig.user,
      password: customConfig.password,
      database: customConfig.database,
      ssl: customConfig.ssl ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }

  if (!poolInstance) {
    const config = getStoredDbConfig();
    const poolConfig: PoolConfig = {
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      max: 15,
      idleTimeoutMillis: 30000,
    };
    poolInstance = new Pool(poolConfig);

    poolInstance.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client:', err);
    });
  }

  return poolInstance;
}

export function resetPool(): void {
  if (poolInstance) {
    poolInstance.end().catch(() => {});
    poolInstance = null;
  }
}

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const pool = getPool();
  const res = await pool.query(text, params);
  return res.rows as T[];
}

// Asegurar que las tablas de roles, usuarios, tipos y términos de pago existan automáticamente
let authTablesChecked = false;
export async function ensureAuthTables(): Promise<void> {
  if (authTablesChecked) return;
  try {
    const pool = getPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS m_rol (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(50) NOT NULL UNIQUE,
        descripcion TEXT,
        permisos JSONB NOT NULL DEFAULT '[]'::jsonb,
        activo BOOLEAN NOT NULL DEFAULT TRUE,
        creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

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

      CREATE TABLE IF NOT EXISTS m_tipopago (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(30) NOT NULL UNIQUE,
        nombre VARCHAR(100) NOT NULL,
        moneda VARCHAR(10) NOT NULL DEFAULT 'USD' CHECK (moneda IN ('USD', 'VES')),
        requiere_referencia BOOLEAN NOT NULL DEFAULT FALSE,
        activo BOOLEAN NOT NULL DEFAULT TRUE,
        creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO m_tipopago (id, codigo, nombre, moneda, requiere_referencia, activo) VALUES
      (1, 'EFECTIVO_USD', 'Efectivo Dólares ($)', 'USD', false, true),
      (2, 'EFECTIVO_VES', 'Efectivo Bolívares (Bs)', 'VES', false, true),
      (3, 'PAGO_MOVIL', 'Pago Móvil (Bs)', 'VES', true, true),
      (4, 'PUNTO_VENTA', 'Punto de Venta / Tarjeta Débito/Crédito (Bs)', 'VES', true, true),
      (5, 'TRANSFERENCIA_VES', 'Transferencia Bancaria (Bs)', 'VES', true, true),
      (6, 'ZELLE', 'Zelle ($)', 'USD', true, true),
      (7, 'CASHEA', 'Cashea (App Móvil)', 'USD', true, true)
      ON CONFLICT (id) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        moneda = EXCLUDED.moneda,
        requiere_referencia = EXCLUDED.requiere_referencia;

      SELECT setval('m_tipopago_id_seq', COALESCE((SELECT MAX(id) FROM m_tipopago), 7));

      -- Tablas de Bancos y Cuentas Bancarias / Cajas
      CREATE TABLE IF NOT EXISTS m_banco (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(20) UNIQUE,
        nombre VARCHAR(100) NOT NULL,
        tipo VARCHAR(10) NOT NULL DEFAULT 'BANCO' CHECK (tipo IN ('BANCO', 'CAJA')),
        activo BOOLEAN NOT NULL DEFAULT TRUE,
        creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

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

      -- Tabla de Pagos y Cobranzas (t_pago)
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

      ALTER TABLE t_pedido 
      ADD COLUMN IF NOT EXISTS condicion_pago VARCHAR(20) NOT NULL DEFAULT 'CONTADO',
      ADD COLUMN IF NOT EXISTS tipo_pago_id INT REFERENCES m_tipopago(id),
      ADD COLUMN IF NOT EXISTS referencia_pago VARCHAR(100),
      ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE;

      ALTER TABLE t_pedido DROP CONSTRAINT IF EXISTS t_pedido_condicion_pago_check;
      ALTER TABLE t_pedido ADD CONSTRAINT t_pedido_condicion_pago_check 
        CHECK (condicion_pago IN ('CONTADO', 'CREDITO', 'CREDITO_7', 'CREDITO_15', 'CREDITO_30', 'CREDITO_45'));

      UPDATE t_pedido SET tipo_pago_id = 1 WHERE tipo_pago_id IS NULL;

      ALTER TABLE t_compra 
      ADD COLUMN IF NOT EXISTS condicion_pago VARCHAR(20) NOT NULL DEFAULT 'CONTADO',
      ADD COLUMN IF NOT EXISTS tipo_pago_id INT REFERENCES m_tipopago(id),
      ADD COLUMN IF NOT EXISTS referencia_pago VARCHAR(100),
      ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE;

      ALTER TABLE t_compra DROP CONSTRAINT IF EXISTS t_compra_condicion_pago_check;
      ALTER TABLE t_compra ADD CONSTRAINT t_compra_condicion_pago_check 
        CHECK (condicion_pago IN ('CONTADO', 'CREDITO', 'CREDITO_7', 'CREDITO_15', 'CREDITO_30', 'CREDITO_45'));

      UPDATE t_compra SET tipo_pago_id = 1 WHERE tipo_pago_id IS NULL;

      INSERT INTO m_rol (id, nombre, descripcion, permisos, activo) VALUES
      (1, 'ADMINISTRADOR', 'Acceso completo a todos los módulos y configuraciones del sistema', '["pos", "orders", "compras", "products", "terceros", "rates", "impuestos", "reports", "reports_profit", "users", "maintenance"]'::jsonb, true),
      (2, 'SUPERVISOR', 'Acceso a ventas, compras, productos, clientes y reportes operativos', '["pos", "orders", "compras", "products", "terceros", "rates", "reports"]'::jsonb, true),
      (3, 'CAJERO', 'Acceso exclusivo para facturación en Punto de Venta y consulta de tasa', '["pos", "orders", "rates"]'::jsonb, true),
      (4, 'ALMACEN', 'Acceso a inventario, productos, proveedores y recepción de compras', '["products", "compras", "terceros"]'::jsonb, true)
      ON CONFLICT (id) DO NOTHING;

      SELECT setval('m_rol_id_seq', COALESCE((SELECT MAX(id) FROM m_rol), 4));

      INSERT INTO m_usuario (id, username, password_hash, nombre_completo, email, rol_id, activo) VALUES
      (1, 'admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Administrador del Sistema', 'admin@tiendaexpress.com', 1, true),
      (2, 'cajero', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Cajero Principal', 'cajero@tiendaexpress.com', 3, true)
      ON CONFLICT (id) DO NOTHING;

      SELECT setval('m_usuario_id_seq', COALESCE((SELECT MAX(id) FROM m_usuario), 2));
    `);
    authTablesChecked = true;
  } catch (err) {
    console.warn('Advertencia al verificar tablas del sistema:', err);
  }
}

