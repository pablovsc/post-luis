import { NextResponse } from 'next/server';
import { query, ensureAuthTables } from '@/lib/db';

// GET: Consultar bancos / entidades financieras / cajas registradas
export async function GET() {
  try {
    await ensureAuthTables();
    const sql = `
      SELECT b.id, b.codigo, b.nombre, b.tipo, b.activo, b.creado_en,
             COUNT(cb.id)::int as total_cuentas
      FROM m_banco b
      LEFT JOIN m_cuentabancaria cb ON cb.banco_id = b.id AND cb.activo = true
      GROUP BY b.id
      ORDER BY b.tipo ASC, b.nombre ASC
    `;
    const bancos = await query(sql);
    return NextResponse.json({ success: true, bancos });
  } catch (error: any) {
    console.error('Error fetching bancos:', error);
    return NextResponse.json(
      { success: false, message: 'Error al consultar bancos', error: error?.message },
      { status: 500 }
    );
  }
}

// POST: Crear un nuevo banco o caja
export async function POST(req: Request) {
  try {
    await ensureAuthTables();
    const body = await req.json();
    const { codigo, nombre, tipo } = body;

    if (!nombre || !nombre.trim()) {
      return NextResponse.json(
        { success: false, message: 'El nombre de la entidad o caja es obligatorio' },
        { status: 400 }
      );
    }

    const tipoVal = tipo === 'CAJA' ? 'CAJA' : 'BANCO';
    const codigoVal = codigo ? codigo.trim().toUpperCase() : null;

    const res = await query(
      `INSERT INTO m_banco (codigo, nombre, tipo, activo)
       VALUES ($1, $2, $3, true)
       RETURNING *`,
      [codigoVal, nombre.trim(), tipoVal]
    );

    return NextResponse.json({ success: true, banco: res[0] });
  } catch (error: any) {
    console.error('Error creating banco:', error);
    return NextResponse.json(
      { success: false, message: 'Error al registrar entidad o caja', error: error?.message },
      { status: 500 }
    );
  }
}

// PUT: Modificar un banco o caja existente
export async function PUT(req: Request) {
  try {
    await ensureAuthTables();
    const body = await req.json();
    const { id, codigo, nombre, tipo } = body;

    if (!id || !nombre || !nombre.trim()) {
      return NextResponse.json(
        { success: false, message: 'ID y nombre de la entidad o caja son obligatorios' },
        { status: 400 }
      );
    }

    const tipoVal = tipo === 'CAJA' ? 'CAJA' : 'BANCO';
    const codigoVal = codigo ? codigo.trim().toUpperCase() : null;

    const res = await query(
      `UPDATE m_banco
       SET codigo = $1,
           nombre = $2,
           tipo = $3
       WHERE id = $4
       RETURNING *`,
      [codigoVal, nombre.trim(), tipoVal, Number(id)]
    );

    return NextResponse.json({ success: true, banco: res[0] });
  } catch (error: any) {
    console.error('Error updating banco:', error);
    return NextResponse.json(
      { success: false, message: 'Error al actualizar entidad o caja', error: error?.message },
      { status: 500 }
    );
  }
}
