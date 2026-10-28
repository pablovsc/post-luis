import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET latest rate or rate for a specific date
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('fecha'); // YYYY-MM-DD
    const all = searchParams.get('all') === 'true';

    if (all) {
      const rows = await query('SELECT id, TO_CHAR(fecha, \'YYYY-MM-DD\') as fecha, tasa, creado_en FROM m_tasa ORDER BY fecha DESC LIMIT 60');
      return NextResponse.json({ success: true, rates: rows });
    }

    let sql = 'SELECT id, TO_CHAR(fecha, \'YYYY-MM-DD\') as fecha, tasa FROM m_tasa';
    let params: any[] = [];

    if (dateParam) {
      sql += ' WHERE fecha = $1';
      params.push(dateParam);
    } else {
      sql += ' ORDER BY fecha DESC LIMIT 1';
    }

    const rows = await query(sql, params);
    const currentRate = rows.length > 0 ? rows[0] : null;

    return NextResponse.json({
      success: true,
      rate: currentRate,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al obtener tasa de cambio' },
      { status: 500 }
    );
  }
}

// POST register or update rate for a specific date
export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { fecha, tasa } = body;

    if (!tasa || isNaN(Number(tasa)) || Number(tasa) <= 0) {
      return NextResponse.json(
        { success: false, message: 'La tasa debe ser un número positivo válido' },
        { status: 400 }
      );
    }

    if (!fecha) {
      fecha = new Date().toISOString().split('T')[0];
    }

    // Insert or update on conflict on fecha
    const upsertSql = `
      INSERT INTO m_tasa (fecha, tasa)
      VALUES ($1, $2)
      ON CONFLICT (fecha)
      DO UPDATE SET tasa = EXCLUDED.tasa, creado_en = CURRENT_TIMESTAMP
      RETURNING id, TO_CHAR(fecha, 'YYYY-MM-DD') as fecha, tasa;
    `;

    const rows = await query(upsertSql, [fecha, Number(tasa)]);
    return NextResponse.json({
      success: true,
      rate: rows[0],
      message: 'Tasa registrada/actualizada exitosamente',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al registrar tasa' },
      { status: 500 }
    );
  }
}
