import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET all taxes
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const onlyActive = searchParams.get('active') === 'true';

    let sql = 'SELECT id, nombre, porcentaje, activo, creado_en FROM m_impuesto';
    if (onlyActive) {
      sql += ' WHERE activo = true';
    }
    sql += ' ORDER BY id ASC';

    const rows = await query(sql);
    return NextResponse.json({ success: true, taxes: rows });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al listar impuestos' },
      { status: 500 }
    );
  }
}

// POST create tax
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nombre, porcentaje, activo = true } = body;

    if (!nombre || porcentaje === undefined || isNaN(Number(porcentaje))) {
      return NextResponse.json(
        { success: false, message: 'El nombre y el porcentaje son obligatorios' },
        { status: 400 }
      );
    }

    const pct = Number(porcentaje);
    if (pct < 0) {
      return NextResponse.json(
        { success: false, message: 'El porcentaje debe ser mayor o igual a 0' },
        { status: 400 }
      );
    }

    const rows = await query(
      'INSERT INTO m_impuesto (nombre, porcentaje, activo) VALUES ($1, $2, $3) RETURNING *',
      [String(nombre).trim(), pct, Boolean(activo)]
    );

    return NextResponse.json({ success: true, tax: rows[0] });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al crear impuesto' },
      { status: 500 }
    );
  }
}

// PUT update tax
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, nombre, porcentaje, activo } = body;

    if (!id || !nombre || porcentaje === undefined) {
      return NextResponse.json(
        { success: false, message: 'ID, nombre y porcentaje son obligatorios' },
        { status: 400 }
      );
    }

    const rows = await query(
      'UPDATE m_impuesto SET nombre = $1, porcentaje = $2, activo = $3 WHERE id = $4 RETURNING *',
      [String(nombre).trim(), Number(porcentaje), Boolean(activo), Number(id)]
    );

    if (rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Impuesto no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, tax: rows[0] });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al actualizar impuesto' },
      { status: 500 }
    );
  }
}

// DELETE delete or deactivate tax
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID requerido' }, { status: 400 });
    }

    const taxId = Number(id);

    // Prevent deleting default taxes
    if (taxId === 1 || taxId === 2) {
      return NextResponse.json(
        { success: false, message: 'No se pueden eliminar los impuestos base del sistema (IVA 16% y Exento).' },
        { status: 400 }
      );
    }

    // Check if referenced in products, orders or purchases
    const [prodCheck, orderCheck, purchaseCheck] = await Promise.all([
      query('SELECT id FROM m_producto WHERE impuesto_id = $1 LIMIT 1', [taxId]),
      query('SELECT id FROM t_pedidolinea WHERE impuesto_id = $1 LIMIT 1', [taxId]),
      query('SELECT id FROM t_compralinea WHERE impuesto_id = $1 LIMIT 1', [taxId]),
    ]);

    if (prodCheck.length > 0 || orderCheck.length > 0 || purchaseCheck.length > 0) {
      await query('UPDATE m_impuesto SET activo = false WHERE id = $1', [taxId]);
      return NextResponse.json({
        success: true,
        message: 'El impuesto está en uso en productos o comprobantes. Se ha desactivado.',
        deactivated: true,
      });
    }

    await query('DELETE FROM m_impuesto WHERE id = $1', [taxId]);
    return NextResponse.json({ success: true, message: 'Impuesto eliminado correctamente' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al eliminar impuesto' },
      { status: 500 }
    );
  }
}
