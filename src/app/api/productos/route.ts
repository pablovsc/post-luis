import { NextResponse } from 'next/server';
import type { PoolClient } from 'pg';
import { getPool, query } from '@/lib/db';

// Columnas comunes del producto (incluye unidad base y presentaciones activas como JSON)
const PRODUCT_SELECT = `
  SELECT 
    p.id, 
    p.nombre, 
    p.precio_usd, 
    COALESCE(p.stock_actual, 0)::numeric as stock_actual,
    COALESCE(p.costo_promedio_usd, 0)::numeric as costo_promedio_usd,
    p.impuesto_id,
    COALESCE(i.nombre, 'IVA 16%') as impuesto_nombre,
    COALESCE(i.porcentaje, 16.00)::numeric as impuesto_porcentaje,
    COALESCE(p.unidad_base, 'Unidad') as unidad_base,
    COALESCE((
      SELECT json_agg(json_build_object(
               'id', pp.id, 'nombre', pp.nombre, 'factor', pp.factor, 'precio_usd', pp.precio_usd
             ) ORDER BY pp.factor ASC)
      FROM m_producto_presentacion pp
      WHERE pp.producto_id = p.id AND pp.activo = true
    ), '[]'::json) as presentaciones,
    p.activo, 
    p.creado_en
  FROM m_producto p
  LEFT JOIN m_impuesto i ON i.id = p.impuesto_id
`;

interface PresentacionInput {
  id?: number | null;
  nombre: string;
  factor: number;
  precio_usd: number;
}

function parsePresentaciones(raw: unknown): PresentacionInput[] {
  if (!Array.isArray(raw)) return [];
  const list: PresentacionInput[] = [];
  for (const r of raw) {
    const nombre = String(r?.nombre ?? '').trim();
    const factor = Number(r?.factor);
    const precio = Number(r?.precio_usd);
    if (!nombre && !factor) continue; // fila vacía
    if (!nombre) throw new Error('Cada presentación debe tener un nombre (ej: Bulto, Caja, Paquete).');
    if (!factor || factor <= 1) {
      throw new Error(`La presentación "${nombre}" debe equivaler a más de 1 unidad base.`);
    }
    if (isNaN(precio) || precio < 0) {
      throw new Error(`El precio de la presentación "${nombre}" no es válido.`);
    }
    list.push({ id: r?.id ? Number(r.id) : null, nombre, factor, precio_usd: precio });
  }
  return list;
}

// Sincroniza las presentaciones: actualiza existentes, inserta nuevas y elimina/desactiva las removidas
async function syncPresentaciones(client: PoolClient, productoId: number, list: PresentacionInput[]) {
  const existentes = await client.query(
    'SELECT id FROM m_producto_presentacion WHERE producto_id = $1 AND activo = true',
    [productoId]
  );
  const keepIds = new Set<number>();

  for (const pr of list) {
    if (pr.id) {
      const upd = await client.query(
        `UPDATE m_producto_presentacion SET nombre = $1, factor = $2, precio_usd = $3, activo = true
         WHERE id = $4 AND producto_id = $5 RETURNING id`,
        [pr.nombre, pr.factor, pr.precio_usd, pr.id, productoId]
      );
      if (upd.rows.length > 0) {
        keepIds.add(pr.id);
        continue;
      }
    }
    const ins = await client.query(
      `INSERT INTO m_producto_presentacion (producto_id, nombre, factor, precio_usd)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [productoId, pr.nombre, pr.factor, pr.precio_usd]
    );
    keepIds.add(ins.rows[0].id);
  }

  for (const row of existentes.rows) {
    const presId = Number(row.id);
    if (keepIds.has(presId)) continue;
    const usada = await client.query(
      `SELECT 1 FROM t_pedidolinea WHERE presentacion_id = $1
       UNION ALL SELECT 1 FROM t_compralinea WHERE presentacion_id = $1 LIMIT 1`,
      [presId]
    );
    if (usada.rows.length > 0) {
      // Conservar para el historial de ventas/compras
      await client.query('UPDATE m_producto_presentacion SET activo = false WHERE id = $1', [presId]);
    } else {
      await client.query('DELETE FROM m_producto_presentacion WHERE id = $1', [presId]);
    }
  }
}

async function fetchProduct(id: number) {
  const rows = await query(`${PRODUCT_SELECT} WHERE p.id = $1`, [id]);
  return rows[0];
}

// GET all products or active products with tax information
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const onlyActive = searchParams.get('active') === 'true';

    let sql = PRODUCT_SELECT;
    if (onlyActive) {
      sql += ' WHERE p.activo = true';
    }
    sql += ' ORDER BY p.id DESC';

    const rows = await query(sql);
    return NextResponse.json({ success: true, products: rows });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al listar productos' },
      { status: 500 }
    );
  }
}

// POST create product
export async function POST(req: Request) {
  const client = await getPool().connect();
  try {
    const body = await req.json();
    const {
      nombre,
      precio_usd,
      stock_actual = 0,
      costo_promedio_usd = 0,
      impuesto_id = 1,
      activo = true,
      unidad_base = 'Unidad',
      presentaciones = [],
    } = body;

    if (!nombre || precio_usd === undefined || isNaN(Number(precio_usd))) {
      return NextResponse.json(
        { success: false, message: 'El nombre y el precio en USD son obligatorios' },
        { status: 400 }
      );
    }

    const price = Number(precio_usd);
    if (price < 0) {
      return NextResponse.json(
        { success: false, message: 'El precio debe ser mayor o igual a 0' },
        { status: 400 }
      );
    }

    const presList = parsePresentaciones(presentaciones);
    const stock = Number(stock_actual) || 0;
    const costo = Number(costo_promedio_usd) || 0;
    const taxId = Number(impuesto_id) || 1;
    const unidad = String(unidad_base || 'Unidad').trim() || 'Unidad';

    await client.query('BEGIN');
    const ins = await client.query(
      `INSERT INTO m_producto (nombre, precio_usd, stock_actual, costo_promedio_usd, impuesto_id, activo, unidad_base)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [String(nombre).trim(), price, stock, costo, taxId, Boolean(activo), unidad]
    );
    const newId = Number(ins.rows[0].id);
    await syncPresentaciones(client, newId, presList);
    await client.query('COMMIT');

    return NextResponse.json({ success: true, product: await fetchProduct(newId) });
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {});
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al crear producto' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// PUT update product
export async function PUT(req: Request) {
  const client = await getPool().connect();
  try {
    const body = await req.json();
    const {
      id,
      nombre,
      precio_usd,
      stock_actual,
      costo_promedio_usd,
      impuesto_id,
      activo,
      unidad_base,
      presentaciones,
    } = body;

    if (!id || !nombre || precio_usd === undefined) {
      return NextResponse.json(
        { success: false, message: 'ID, nombre y precio en USD son obligatorios' },
        { status: 400 }
      );
    }

    const price = Number(precio_usd);
    const stock = stock_actual !== undefined ? Number(stock_actual) : 0;
    const costo = costo_promedio_usd !== undefined ? Number(costo_promedio_usd) : 0;
    const taxId = impuesto_id ? Number(impuesto_id) : 1;
    const unidad = String(unidad_base || 'Unidad').trim() || 'Unidad';
    const presList = presentaciones !== undefined ? parsePresentaciones(presentaciones) : null;

    await client.query('BEGIN');
    const rows = await client.query(
      `UPDATE m_producto 
       SET nombre = $1, precio_usd = $2, stock_actual = $3, costo_promedio_usd = $4, impuesto_id = $5, activo = $6,
           unidad_base = $7
       WHERE id = $8
       RETURNING id`,
      [String(nombre).trim(), price, stock, costo, taxId, Boolean(activo), unidad, Number(id)]
    );

    if (rows.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ success: false, message: 'Producto no encontrado' }, { status: 404 });
    }

    if (presList) {
      await syncPresentaciones(client, Number(id), presList);
    }
    await client.query('COMMIT');

    return NextResponse.json({ success: true, product: await fetchProduct(Number(id)) });
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {});
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al actualizar producto' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// DELETE delete product (or toggle inactive if referenced)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID requerido' }, { status: 400 });
    }

    const prodId = Number(id);

    // Check if product is referenced in order lines or purchase lines
    const [orderCheck, purchaseCheck] = await Promise.all([
      query('SELECT id FROM t_pedidolinea WHERE producto_id = $1 LIMIT 1', [prodId]),
      query('SELECT id FROM t_compralinea WHERE producto_id = $1 LIMIT 1', [prodId]),
    ]);

    if (orderCheck.length > 0 || purchaseCheck.length > 0) {
      // Deactivate instead of hard delete to preserve historical integrity
      await query('UPDATE m_producto SET activo = false WHERE id = $1', [prodId]);
      return NextResponse.json({
        success: true,
        message: 'El producto tiene movimientos (ventas o compras). Se desactivó para preservar el historial.',
        deactivated: true,
      });
    }

    await query('DELETE FROM m_producto WHERE id = $1', [prodId]);
    return NextResponse.json({ success: true, message: 'Producto eliminado correctamente' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al eliminar producto' },
      { status: 500 }
    );
  }
}
