import { NextResponse } from 'next/server';
import { getStoredDbConfig, getPool } from '@/lib/db';

export async function GET() {
  const pool = getPool();
  try {
    const config = getStoredDbConfig();

    // Obtener todas las tablas del esquema public
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const tables = tablesRes.rows.map(r => r.table_name);

    let sqlDump = `-- =============================================================================\n`;
    sqlDump += `-- RESPALDO DE BASE DE DATOS TIENDA EXPRESS POS (ERP EXPRESS)\n`;
    sqlDump += `-- Generado: ${new Date().toISOString()}\n`;
    sqlDump += `-- Base de Datos: ${config.database}\n`;
    sqlDump += `-- =============================================================================\n\n`;
    sqlDump += `SET statement_timeout = 0;\n`;
    sqlDump += `SET client_encoding = 'UTF8';\n`;
    sqlDump += `SET standard_conforming_strings = on;\n\n`;

    // Orden de inserción recomendado para evitar conflictos de Foreign Keys
    const priorityOrder = [
      'm_impuesto',
      'm_tercero',
      'm_producto',
      'm_producto_presentacion',
      'm_tasa',
      't_pedido',
      't_pedidolinea',
      't_compra',
      't_compralinea',
    ];

    const sortedTables = [
      ...priorityOrder.filter(t => tables.includes(t)),
      ...tables.filter(t => !priorityOrder.includes(t))
    ];

    for (const table of sortedTables) {
      const dataRes = await pool.query(`SELECT * FROM ${table} ORDER BY id ASC`);
      if (dataRes.rows.length === 0) continue;

      sqlDump += `-- -------------------------------------------------------------\n`;
      sqlDump += `-- Datos de la tabla: ${table} (${dataRes.rows.length} registros)\n`;
      sqlDump += `-- -------------------------------------------------------------\n`;

      const columns = Object.keys(dataRes.rows[0]);
      const colList = columns.map(c => `"${c}"`).join(', ');

      for (const row of dataRes.rows) {
        const values = columns.map(col => {
          const val = row[col];
          if (val === null || val === undefined) return 'NULL';
          if (typeof val === 'number') return val;
          if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
          if (val instanceof Date) return `'${val.toISOString()}'`;
          if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
          return `'${String(val).replace(/'/g, "''")}'`;
        }).join(', ');

        sqlDump += `INSERT INTO ${table} (${colList}) VALUES (${values}) ON CONFLICT DO NOTHING;\n`;
      }

      // Reiniciar la secuencia de la tabla si existe
      sqlDump += `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1), true);\n\n`;
    }

    const filename = `backup_pos_${new Date().toISOString().slice(0, 10)}_${Date.now()}.sql`;

    return new Response(sqlDump, {
      status: 200,
      headers: {
        'Content-Type': 'application/sql; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error generando respaldo SQL:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al generar respaldo de la base de datos' },
      { status: 500 }
    );
  }
}

