import { NextResponse } from 'next/server';
import { query, ensureAuthTables } from '@/lib/db';

export async function GET(req: Request) {
  try {
    await ensureAuthTables();
    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get('tipo'); // 'BANCO' | 'CAJA' | null

    let sql = `
      SELECT cb.id, cb.banco_id, cb.nombre, cb.tipo_cuenta, cb.numero_cuenta,
             cb.moneda, cb.saldo_actual, cb.activo, cb.creado_en,
             b.nombre as banco_nombre, b.tipo as banco_tipo, b.codigo as banco_codigo
      FROM m_cuentabancaria cb
      JOIN m_banco b ON b.id = cb.banco_id
      WHERE cb.activo = true AND b.activo = true
    `;
    const params: any[] = [];

    if (tipo) {
      sql += ' AND b.tipo = $1';
      params.push(tipo.toUpperCase());
    }

    sql += ' ORDER BY b.tipo ASC, cb.nombre ASC';

    const cuentas = await query(sql, params);
    return NextResponse.json({ success: true, cuentas });
  } catch (error: any) {
    console.error('Error fetching cuentas bancarias:', error);
    return NextResponse.json(
      { success: false, message: 'Error al consultar cuentas bancarias', error: error?.message },
      { status: 500 }
    );
  }
}

