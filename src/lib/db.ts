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
