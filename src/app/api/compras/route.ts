import { NextResponse } from 'next/server';
import { getPool, query } from '@/lib/db';

export interface PurchaseLineInput {
  producto_id: number;
  cantidad: number;
  costo_unitario_usd: number;
  impuesto_id: number;
  presentacion_id?: number | null;
}

// GET purchases list or single purchase with lines
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const purchaseId = searchParams.get('id');

    if (purchaseId) {
      const purchases = await query(
        `SELECT c.id, c.numero_factura, c.tercero_id, 
                t.razon_social_nombre as proveedor_nombre,
                t.identificacion as proveedor_identificacion,
                t.telefono as proveedor_telefono,
                TO_CHAR(c.fecha_emision, 'YYYY-MM-DD') as fecha_emision,
                c.tasa_cambio_aplicada,
                c.base_imponible_usd, c.monto_impuesto_usd, c.total_usd, c.total_moneda_local,
                c.observaciones, c.estado, c.creado_en
         FROM t_compra c
         JOIN m_tercero t ON t.id = c.tercero_id
         WHERE c.id = $1`,
        [Number(purchaseId)]
      );

      if (purchases.length === 0) {
        return NextResponse.json({ success: false, message: 'Factura de compra no encontrada' }, { status: 404 });
      }

      const lines = await query(
        `SELECT l.id, l.producto_id, p.nombre as producto_nombre, l.cantidad, l.costo_unitario_usd,
                l.impuesto_id, i.nombre as impuesto_nombre, l.porcentaje_impuesto, l.monto_impuesto_usd,
                l.subtotal_usd,
                l.presentacion_id,
                COALESCE(l.presentacion_nombre, p.unidad_base, 'Unidad') as presentacion_nombre,
                COALESCE(l.factor_conversion, 1)::numeric as factor_conversion,
                COALESCE(l.cantidad_base, l.cantidad)::numeric as cantidad_base
         FROM t_compralinea l
         JOIN m_producto p ON p.id = l.producto_id
         JOIN m_impuesto i ON i.id = l.impuesto_id
         WHERE l.compra_id = $1
         ORDER BY l.id ASC`,
        [Number(purchaseId)]
      );

      return NextResponse.json({
        success: true,
        purchase: {
          ...purchases[0],
          lineas: lines,
        },
      });
    }

    const purchases = await query(
      `SELECT c.id, c.numero_factura, c.tercero_id,
              t.razon_social_nombre as proveedor_nombre,
              t.identificacion as proveedor_identificacion,
              TO_CHAR(c.fecha_emision, 'YYYY-MM-DD') as fecha_emision,
              c.tasa_cambio_aplicada,
              c.base_imponible_usd, c.monto_impuesto_usd, c.total_usd, c.total_moneda_local,
              c.observaciones, c.estado, c.creado_en,
              COUNT(l.id)::int as total_articulos
       FROM t_compra c
       JOIN m_tercero t ON t.id = c.tercero_id
       LEFT JOIN t_compralinea l ON l.compra_id = c.id
       GROUP BY c.id, t.razon_social_nombre, t.identificacion
       ORDER BY c.fecha_emision DESC, c.id DESC
       LIMIT $1`,
      [limit]
    );

    return NextResponse.json({ success: true, purchases });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al obtener facturas de compra' },
      { status: 500 }
    );
  }
}

// POST register purchase and update inventory + average cost
export async function POST(req: Request) {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const body = await req.json();
    const {
      numero_factura,
      tercero_id,
      fecha_emision,
      tasa_cambio_aplicada,
      observaciones,
      estado = 'COMPLETADO',
      items,
    } = body;

    const validEstados = ['PROCESO', 'COMPLETADO', 'ANULADO'];
    const estadoDoc = validEstados.includes(estado) ? estado : 'COMPLETADO';

    if (!numero_factura || !String(numero_factura).trim()) {
      return NextResponse.json(
        { success: false, message: 'El número de factura del proveedor es obligatorio' },
        { status: 400 }
      );
    }

    const supplierId = Number(tercero_id);
    if (!supplierId) {
      return NextResponse.json(
        { success: false, message: 'Debe seleccionar un proveedor válido' },
        { status: 400 }
      );
    }

    // Verify supplier exists and is PROVEEDOR or AMBOS
    const supplierCheck = await client.query(
      'SELECT id, tipo, razon_social_nombre FROM m_tercero WHERE id = $1',
      [supplierId]
    );

    if (supplierCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'El proveedor seleccionado no existe' },
        { status: 400 }
      );
    }

    const supplier = supplierCheck.rows[0];
    if (supplier.tipo !== 'PROVEEDOR' && supplier.tipo !== 'AMBOS') {
      return NextResponse.json(
        { success: false, message: 'El tercero seleccionado debe tener rol de PROVEEDOR' },
        { status: 400 }
      );
    }

    const rate = Number(tasa_cambio_aplicada);
    if (!rate || isNaN(rate) || rate <= 0) {
      return NextResponse.json(
        { success: false, message: 'Tasa de cambio inválida para registrar la compra' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'La factura de compra debe contener al menos un producto' },
        { status: 400 }
      );
    }

    const issueDate = fecha_emision ? String(fecha_emision) : new Date().toISOString().split('T')[0];

    // Fetch taxes map
    const taxesRes = await client.query('SELECT id, porcentaje FROM m_impuesto');
    const taxMap = new Map<number, number>();
    for (const t of taxesRes.rows) {
      taxMap.set(Number(t.id), Number(t.porcentaje));
    }

    await client.query('BEGIN');

    let totalBaseUsd = 0;
    let totalTaxUsd = 0;

    const validatedLines: {
      producto_id: number;
      cantidad: number;
      costo_unitario_usd: number;
      impuesto_id: number;
      porcentaje_impuesto: number;
      monto_impuesto_usd: number;
      subtotal_usd: number;
      presentacion_id: number | null;
      presentacion_nombre: string;
      factor_conversion: number;
      cantidad_base: number;
    }[] = [];

    for (const item of items) {
      const pId = Number(item.producto_id);
      const qty = Number(item.cantidad);
      const unitCost = Number(item.costo_unitario_usd);
      const taxId = Number(item.impuesto_id) || 1;
      const presId = item.presentacion_id ? Number(item.presentacion_id) : null;

      if (!pId || qty <= 0 || unitCost < 0) {
        throw new Error(`Datos inválidos en el producto ID ${pId}: cantidad o costo incorrecto.`);
      }

      // Resolver presentación (null = unidad base)
      let factor = 1;
      let presNombre = 'Unidad';
      if (presId) {
        const presRes = await client.query(
          'SELECT nombre, factor FROM m_producto_presentacion WHERE id = $1 AND producto_id = $2',
          [presId, pId]
        );
        if (presRes.rows.length === 0) {
          throw new Error(`La presentación seleccionada para el producto ID ${pId} no existe.`);
        }
        factor = Number(presRes.rows[0].factor);
        presNombre = String(presRes.rows[0].nombre);
      } else {
        const ub = await client.query("SELECT COALESCE(unidad_base, 'Unidad') as u FROM m_producto WHERE id = $1", [pId]);
        if (ub.rows.length > 0) presNombre = String(ub.rows[0].u);
      }

      const taxPercent = taxMap.has(taxId) ? taxMap.get(taxId)! : 16.0;
      const subtotal = Number((qty * unitCost).toFixed(2));
      const lineTax = Number(((subtotal * taxPercent) / 100).toFixed(2));

      totalBaseUsd += subtotal;
      totalTaxUsd += lineTax;

      validatedLines.push({
        producto_id: pId,
        cantidad: qty,
        costo_unitario_usd: unitCost,
        impuesto_id: taxId,
        porcentaje_impuesto: taxPercent,
        monto_impuesto_usd: lineTax,
        subtotal_usd: subtotal,
        presentacion_id: presId,
        presentacion_nombre: presNombre,
        factor_conversion: factor,
        cantidad_base: Number((qty * factor).toFixed(3)),
      });
    }

    totalBaseUsd = Number(totalBaseUsd.toFixed(2));
    totalTaxUsd = Number(totalTaxUsd.toFixed(2));
    const totalUsd = Number((totalBaseUsd + totalTaxUsd).toFixed(2));
    const totalLocal = Number((totalUsd * rate).toFixed(2));

    // 1. Insert t_compra
    const insertCompraSql = `
      INSERT INTO t_compra (
        numero_factura, tercero_id, fecha_emision, tasa_cambio_aplicada,
        base_imponible_usd, monto_impuesto_usd, total_usd, total_moneda_local, observaciones, estado
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;

    const compraRes = await client.query(insertCompraSql, [
      String(numero_factura).trim(),
      supplierId,
      issueDate,
      rate,
      totalBaseUsd,
      totalTaxUsd,
      totalUsd,
      totalLocal,
      observaciones ? String(observaciones).trim() : null,
      estadoDoc,
    ]);

    const nuevaCompra = compraRes.rows[0];

    // 2. Insert lines
    for (const line of validatedLines) {
      await client.query(
        `INSERT INTO t_compralinea (
          compra_id, producto_id, cantidad, costo_unitario_usd, impuesto_id,
          porcentaje_impuesto, monto_impuesto_usd, subtotal_usd,
          presentacion_id, presentacion_nombre, factor_conversion, cantidad_base
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          nuevaCompra.id,
          line.producto_id,
          line.cantidad,
          line.costo_unitario_usd,
          line.impuesto_id,
          line.porcentaje_impuesto,
          line.monto_impuesto_usd,
          line.subtotal_usd,
          line.presentacion_id,
          line.presentacion_nombre,
          line.factor_conversion,
          line.cantidad_base,
        ]
      );

      // Si el estado es COMPLETADO, suma inventario y recalcula costo promedio inmediatamente
      if (estadoDoc === 'COMPLETADO') {
        const prodRes = await client.query(
          'SELECT id, stock_actual, costo_promedio_usd FROM m_producto WHERE id = $1 FOR UPDATE',
          [line.producto_id]
        );

        if (prodRes.rows.length === 0) {
          throw new Error(`Producto con ID ${line.producto_id} no existe en catálogo.`);
        }

        const prod = prodRes.rows[0];
        const stockAnterior = Math.max(0, Number(prod.stock_actual) || 0);
        const costoAnterior = Number(prod.costo_promedio_usd) || 0;
        // Todo en unidad base: cantidad × factor y costo de la presentación ÷ factor
        const cantComprada = line.cantidad_base;
        const costoCompra = line.costo_unitario_usd / line.factor_conversion;

        let nuevoCostoPromedio = costoCompra;
        const nuevoStockTotal = stockAnterior + cantComprada;

        if (stockAnterior > 0 && nuevoStockTotal > 0) {
          nuevoCostoPromedio = Number(
            ((stockAnterior * costoAnterior + cantComprada * costoCompra) / nuevoStockTotal).toFixed(4)
          );
        } else {
          nuevoCostoPromedio = Number(costoCompra.toFixed(4));
        }

        await client.query(
          `UPDATE m_producto
           SET stock_actual = stock_actual + $1,
               costo_promedio_usd = $2
           WHERE id = $3`,
          [cantComprada, nuevoCostoPromedio, line.producto_id]
        );
      }
    }

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      purchase: nuevaCompra,
      message:
        estadoDoc === 'COMPLETADO'
          ? 'Factura de compra registrada e inventario incrementado con éxito'
          : `Factura de compra registrada en estado ${estadoDoc}`,
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error inserting purchase:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al procesar la factura de compra' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// PATCH change purchase status (PROCESO, COMPLETADO, ANULADO)
export async function PATCH(req: Request) {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const body = await req.json();
    const { id, estado } = body;

    if (!id || !estado) {
      return NextResponse.json(
        { success: false, message: 'ID y nuevo estado son obligatorios' },
        { status: 400 }
      );
    }

    const validEstados = ['PROCESO', 'COMPLETADO', 'ANULADO'];
    if (!validEstados.includes(estado)) {
      return NextResponse.json(
        { success: false, message: 'Estado no válido. Use: PROCESO, COMPLETADO o ANULADO' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Fetch current purchase
    const compRes = await client.query('SELECT * FROM t_compra WHERE id = $1 FOR UPDATE', [Number(id)]);
    if (compRes.rows.length === 0) {
      throw new Error('Factura de compra no encontrada');
    }

    const compra = compRes.rows[0];
    const estadoAnterior = compra.estado;
    const nuevoEstado = estado;

    if (estadoAnterior === nuevoEstado) {
      await client.query('COMMIT');
      return NextResponse.json({ success: true, message: `La compra ya se encuentra en estado ${nuevoEstado}` });
    }

    // Fetch purchase lines
    const linesRes = await client.query(
      'SELECT producto_id, COALESCE(cantidad_base, cantidad) as cantidad, costo_unitario_usd FROM t_compralinea WHERE compra_id = $1',
      [Number(id)]
    );

    // Si pasa a COMPLETADO (desde PROCESO o ANULADO), SUMAR inventario
    if (nuevoEstado === 'COMPLETADO') {
      for (const line of linesRes.rows) {
        await client.query(
          'UPDATE m_producto SET stock_actual = stock_actual + $1 WHERE id = $2',
          [line.cantidad, line.producto_id]
        );
      }
    }

    // Si estaba COMPLETADO y pasa a ANULADO o PROCESO, REVERTIR / RESTAR inventario sumado
    if (estadoAnterior === 'COMPLETADO' && (nuevoEstado === 'ANULADO' || nuevoEstado === 'PROCESO')) {
      for (const line of linesRes.rows) {
        await client.query(
          'UPDATE m_producto SET stock_actual = stock_actual - $1 WHERE id = $2',
          [line.cantidad, line.producto_id]
        );
      }
    }

    await client.query('UPDATE t_compra SET estado = $1 WHERE id = $2', [nuevoEstado, Number(id)]);

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      message: `Estado de la compra #${id} actualizado a ${nuevoEstado} exitosamente.`,
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error changing purchase state:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al actualizar estado de la compra' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
