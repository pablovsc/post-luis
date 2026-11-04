import { NextResponse } from 'next/server';
import { query, ensureAuthTables } from '@/lib/db';

// GET: Listar tipos de pago activos
export async function GET() {
  try {
    await ensureAuthTables();
    const rows = await query(
      `SELECT id, codigo, nombre, moneda, requiere_referencia, activo
       FROM m_tipopago
       WHERE activo = true
       ORDER BY id ASC`
    );

    return NextResponse.json({ success: true, tiposPago: rows });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al obtener tipos de pago' },
      { status: 500 }
    );
  }
}

