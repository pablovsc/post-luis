import { NextResponse } from 'next/server';
import { query, ensureAuthTables } from '@/lib/db';

// GET: Consultar facturas/pedidos y compras pendientes de cobro o pago
export async function GET(req: Request) {
  try {
    await ensureAuthTables();
    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get('tipo'); // 'VENTA' o 'COMPRA' o undefined
    const terceroId = searchParams.get('tercero_id');

    const params: any[] = [];
    let sqlVentas = `
      SELECT 
        p.id,
        'VENTA' as tipo_documento,
        CONCAT('PED-#', p.id) as numero_documento,
        p.fecha_hora::text as fecha,
        p.tercero_id,
        COALESCE(t.razon_social_nombre, p.cliente_nombre, 'Cliente Contado') as tercero_nombre,
        p.condicion_pago,
        p.total_usd::numeric as total_usd,
        p.total_moneda_local::numeric as total_local,
        COALESCE(SUM(pd.monto_imputado_usd), 0)::numeric as total_pagado_usd,
        (p.total_usd - COALESCE(SUM(pd.monto_imputado_usd), 0))::numeric as saldo_pendiente_usd,
        ROUND((p.total_usd - COALESCE(SUM(pd.monto_imputado_usd), 0)) * p.tasa_cambio_aplicada, 2)::numeric as saldo_pendiente_local
      FROM t_pedido p
      LEFT JOIN m_tercero t ON t.id = p.tercero_id
      LEFT JOIN t_pago_documento pd ON pd.pedido_id = p.id
      WHERE p.estado = 'COMPLETADO'
    `;

    if (terceroId) {
      params.push(Number(terceroId));
      sqlVentas += ` AND p.tercero_id = $${params.length}`;
    }

    sqlVentas += `
      GROUP BY p.id, t.razon_social_nombre, p.cliente_nombre, p.condicion_pago, p.total_usd, p.total_moneda_local, p.tasa_cambio_aplicada
      HAVING (p.total_usd - COALESCE(SUM(pd.monto_imputado_usd), 0)) > 0.009
      ORDER BY p.fecha_hora ASC
    `;

    const paramsCompras: any[] = [];
    let sqlCompras = `
      SELECT 
        c.id,
        'COMPRA' as tipo_documento,
        c.numero_factura as numero_documento,
        c.fecha_emision::text as fecha,
        c.tercero_id,
        COALESCE(t.razon_social_nombre, 'Proveedor') as tercero_nombre,
        c.condicion_pago,
        c.total_usd::numeric as total_usd,
        c.total_moneda_local::numeric as total_local,
        COALESCE(SUM(pd.monto_imputado_usd), 0)::numeric as total_pagado_usd,
        (c.total_usd - COALESCE(SUM(pd.monto_imputado_usd), 0))::numeric as saldo_pendiente_usd,
        ROUND((c.total_usd - COALESCE(SUM(pd.monto_imputado_usd), 0)) * c.tasa_cambio_aplicada, 2)::numeric as saldo_pendiente_local
      FROM t_compra c
      JOIN m_tercero t ON t.id = c.tercero_id
      LEFT JOIN t_pago_documento pd ON pd.compra_id = c.id
      WHERE c.estado = 'COMPLETADO'
    `;

    if (terceroId) {
      paramsCompras.push(Number(terceroId));
      sqlCompras += ` AND c.tercero_id = $${paramsCompras.length}`;
    }

    sqlCompras += `
      GROUP BY c.id, t.razon_social_nombre, c.condicion_pago, c.total_usd, c.total_moneda_local, c.tasa_cambio_aplicada
      HAVING (c.total_usd - COALESCE(SUM(pd.monto_imputado_usd), 0)) > 0.009
      ORDER BY c.fecha_emision ASC
    `;

    let documentos: any[] = [];

    if (!tipo || tipo === 'VENTA') {
      const resVentas = await query(sqlVentas, params);
      documentos = [...documentos, ...resVentas];
    }

    if (!tipo || tipo === 'COMPRA') {
      const resCompras = await query(sqlCompras, paramsCompras);
      documentos = [...documentos, ...resCompras];
    }

    return NextResponse.json({ success: true, documentos });
  } catch (error: any) {
    console.error('Error fetching pendientes:', error);
    return NextResponse.json(
      { success: false, message: 'Error al consultar documentos pendientes', error: error?.message },
      { status: 500 }
    );
  }
}

