import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET all or filtered thirds (Clients / Suppliers)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get('tipo'); // 'CLIENTE' | 'PROVEEDOR' | 'AMBOS'
    const q = searchParams.get('q');
    const onlyActive = searchParams.get('active') === 'true';

    let sql = `
      SELECT id, tipo, identificacion, razon_social_nombre, direccion, telefono, email, activo, creado_en
      FROM m_tercero
      WHERE 1=1
    `;
    const params: any[] = [];

    if (tipo === 'CLIENTE') {
      params.push('CLIENTE', 'AMBOS');
      sql += ` AND tipo IN ($${params.length - 1}, $${params.length})`;
    } else if (tipo === 'PROVEEDOR') {
      params.push('PROVEEDOR', 'AMBOS');
      sql += ` AND tipo IN ($${params.length - 1}, $${params.length})`;
    } else if (tipo === 'AMBOS') {
      params.push('AMBOS');
      sql += ` AND tipo = $${params.length}`;
    }

    if (onlyActive) {
      sql += ' AND activo = true';
    }

    if (q && q.trim()) {
      params.push(`%${q.trim()}%`);
      sql += ` AND (identificacion ILIKE $${params.length} OR razon_social_nombre ILIKE $${params.length} OR telefono ILIKE $${params.length})`;
    }

    // Always sort with Cliente Genérico first (id=1), then alphabetized
    sql += ' ORDER BY CASE WHEN id = 1 THEN 0 ELSE 1 END, razon_social_nombre ASC';

    const rows = await query(sql, params);
    return NextResponse.json({ success: true, terceros: rows });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al listar clientes/proveedores' },
      { status: 500 }
    );
  }
}

// POST create third
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tipo = 'CLIENTE', identificacion, razon_social_nombre, direccion, telefono, email, activo = true } = body;

    if (!identificacion || !razon_social_nombre) {
      return NextResponse.json(
        { success: false, message: 'La identificación (RIF/Cédula) y la razón social / nombre son obligatorios' },
        { status: 400 }
      );
    }

    const validTipos = ['CLIENTE', 'PROVEEDOR', 'AMBOS'];
    const selectedTipo = validTipos.includes(tipo) ? tipo : 'CLIENTE';

    // Check unique identification
    const existing = await query('SELECT id FROM m_tercero WHERE LOWER(identificacion) = LOWER($1)', [
      String(identificacion).trim(),
    ]);

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Ya existe un cliente o proveedor registrado con esa identificación (RIF/Cédula)' },
        { status: 400 }
      );
    }

    const rows = await query(
      `INSERT INTO m_tercero (tipo, identificacion, razon_social_nombre, direccion, telefono, email, activo)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        selectedTipo,
        String(identificacion).trim(),
        String(razon_social_nombre).trim(),
        direccion ? String(direccion).trim() : null,
        telefono ? String(telefono).trim() : null,
        email ? String(email).trim() : null,
        Boolean(activo),
      ]
    );

    return NextResponse.json({ success: true, tercero: rows[0], message: 'Tercero registrado con éxito' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al crear cliente o proveedor' },
      { status: 500 }
    );
  }
}

// PUT update third
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, tipo, identificacion, razon_social_nombre, direccion, telefono, email, activo } = body;

    if (!id || !identificacion || !razon_social_nombre) {
      return NextResponse.json(
        { success: false, message: 'ID, identificación y razón social son obligatorios' },
        { status: 400 }
      );
    }

    const thirdId = Number(id);

    // Check unique identification excluding self
    const existing = await query(
      'SELECT id FROM m_tercero WHERE LOWER(identificacion) = LOWER($1) AND id <> $2',
      [String(identificacion).trim(), thirdId]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Ya existe otro registro con esta identificación (RIF/Cédula)' },
        { status: 400 }
      );
    }

    const validTipos = ['CLIENTE', 'PROVEEDOR', 'AMBOS'];
    const selectedTipo = validTipos.includes(tipo) ? tipo : 'CLIENTE';

    const rows = await query(
      `UPDATE m_tercero
       SET tipo = $1, identificacion = $2, razon_social_nombre = $3, direccion = $4, telefono = $5, email = $6, activo = $7
       WHERE id = $8
       RETURNING *`,
      [
        selectedTipo,
        String(identificacion).trim(),
        String(razon_social_nombre).trim(),
        direccion ? String(direccion).trim() : null,
        telefono ? String(telefono).trim() : null,
        email ? String(email).trim() : null,
        Boolean(activo),
        thirdId,
      ]
    );

    if (rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Tercero no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, tercero: rows[0], message: 'Actualizado correctamente' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al actualizar cliente o proveedor' },
      { status: 500 }
    );
  }
}

// DELETE delete or deactivate third
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID requerido' }, { status: 400 });
    }

    const thirdId = Number(id);

    // Prevent deleting default generic client
    if (thirdId === 1) {
      return NextResponse.json(
        { success: false, message: 'No se puede eliminar el Cliente Genérico del sistema.' },
        { status: 400 }
      );
    }

    // Check if referenced in t_pedido or t_compra
    const [ordersCheck, purchasesCheck] = await Promise.all([
      query('SELECT id FROM t_pedido WHERE tercero_id = $1 LIMIT 1', [thirdId]),
      query('SELECT id FROM t_compra WHERE tercero_id = $1 LIMIT 1', [thirdId]),
    ]);

    if (ordersCheck.length > 0 || purchasesCheck.length > 0) {
      await query('UPDATE m_tercero SET activo = false WHERE id = $1', [thirdId]);
      return NextResponse.json({
        success: true,
        message: 'El tercero tiene compras o ventas asociadas. Se ha desactivado para proteger el historial.',
        deactivated: true,
      });
    }

    await query('DELETE FROM m_tercero WHERE id = $1', [thirdId]);
    return NextResponse.json({ success: true, message: 'Tercero eliminado correctamente' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al eliminar cliente o proveedor' },
      { status: 500 }
    );
  }
}
