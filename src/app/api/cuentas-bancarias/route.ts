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

export async function POST(req: Request) {
  try {
    await ensureAuthTables();
    const body = await req.json();
    const { banco_id, nombre, tipo_cuenta, numero_cuenta, moneda, saldo_inicial } = body;

    if (!banco_id || !nombre || !nombre.trim() || !moneda) {
      return NextResponse.json(
        { success: false, message: 'Entidad financiera/caja, nombre y moneda son obligatorios' },
        { status: 400 }
      );
    }

    const saldo = Number(saldo_inicial) || 0;
    const res = await query(
      `INSERT INTO m_cuentabancaria (banco_id, nombre, tipo_cuenta, numero_cuenta, moneda, saldo_actual, activo)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING *`,
      [
        Number(banco_id),
        nombre.trim(),
        tipo_cuenta || 'CORRIENTE',
        numero_cuenta ? numero_cuenta.trim() : null,
        moneda === 'VES' ? 'VES' : 'USD',
        saldo,
      ]
    );

    return NextResponse.json({ success: true, cuenta: res[0] });
  } catch (error: any) {
    console.error('Error creating cuenta bancaria:', error);
    return NextResponse.json(
      { success: false, message: 'Error al registrar la cuenta bancaria', error: error?.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    await ensureAuthTables();
    const body = await req.json();
    const { id, banco_id, nombre, tipo_cuenta, numero_cuenta, moneda, saldo_actual } = body;

    if (!id || !nombre || !nombre.trim()) {
      return NextResponse.json(
        { success: false, message: 'ID y nombre de la cuenta son obligatorios' },
        { status: 400 }
      );
    }

    const res = await query(
      `UPDATE m_cuentabancaria
       SET banco_id = COALESCE($1, banco_id),
           nombre = $2,
           tipo_cuenta = COALESCE($3, tipo_cuenta),
           numero_cuenta = $4,
           moneda = COALESCE($5, moneda),
           saldo_actual = COALESCE($6, saldo_actual)
       WHERE id = $7
       RETURNING *`,
      [
        banco_id ? Number(banco_id) : null,
        nombre.trim(),
        tipo_cuenta || null,
        numero_cuenta ? numero_cuenta.trim() : null,
        moneda || null,
        saldo_actual !== undefined && saldo_actual !== null ? Number(saldo_actual) : null,
        Number(id),
      ]
    );

    return NextResponse.json({ success: true, cuenta: res[0] });
  } catch (error: any) {
    console.error('Error updating cuenta bancaria:', error);
    return NextResponse.json(
      { success: false, message: 'Error al actualizar cuenta bancaria', error: error?.message },
      { status: 500 }
    );
  }
}
