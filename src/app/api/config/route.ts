import { NextResponse } from 'next/server';
import { getStoredDbConfig, saveStoredDbConfig, getPool } from '@/lib/db';

export async function GET() {
  try {
    const config = getStoredDbConfig();
    // Mask password in response for safety
    return NextResponse.json({
      success: true,
      config: {
        host: config.host,
        port: config.port,
        user: config.user,
        database: config.database,
        ssl: !!config.ssl,
        hasPassword: !!config.password,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al obtener la configuración' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { host, port, user, password, database, ssl, testOnly } = body;

    if (!host || !port || !user || !database) {
      return NextResponse.json(
        { success: false, message: 'Host, Puerto, Usuario y Base de Datos son obligatorios.' },
        { status: 400 }
      );
    }

    const testConfig = {
      host: String(host).trim(),
      port: Number(port),
      user: String(user).trim(),
      password: password !== undefined ? String(password) : '',
      database: String(database).trim(),
      ssl: Boolean(ssl),
    };

    // If password was empty but we already had one stored, keep the previous one if desired
    const current = getStoredDbConfig();
    if (password === '' && current.password && current.host === testConfig.host && current.database === testConfig.database) {
      testConfig.password = current.password;
    }

    // Test connection
    const tempPool = getPool(testConfig);
    const client = await tempPool.connect();
    
    // Auto-create tables if they don't exist
    const { ensureDatabaseSchema } = await import('@/lib/schema');
    await ensureDatabaseSchema(client);

    client.release();
    await tempPool.end();

    if (!testOnly) {
      saveStoredDbConfig(testConfig);
    }

    return NextResponse.json({
      success: true,
      message: '¡Conexión exitosa a PostgreSQL y tablas verificadas!',
    });
  } catch (error: any) {
    console.error('Error connecting to database:', error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'No se pudo conectar a la base de datos PostgreSQL.',
      },
      { status: 500 }
    );
  }
}
