import { NextResponse } from 'next/server';
import { getPool, query } from '@/lib/db';

export interface OrderLineInput {
  producto_id: number;
  cantidad: number;
  precio_unitario_usd: number;
  presentacion_id?: number | null;
  subtotal_usd?: number;
}

// GET orders list (with items count, customer info, taxes and totals)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const orderId = searchParams.get('id');

    if (orderId) {
      // Get single order with its lines
      const orders = await query(
        `SELECT p.id, p.fecha_hora, p.tercero_id,
                COALESCE(p.estado, 'COMPLETADO') as estado,
                COALESCE(t.razon_social_nombre, p.cliente_nombre, 'Cliente Genérico') as cliente_nombre,
                t.identificacion as tercero_identificacion,
                t.telefono as cliente_telefono,
                p.tasa_cambio_aplicada,
                COALESCE(p.base_imponible_usd, p.total_usd)::numeric as base_imponible_usd,
                COALESCE(p.monto_impuesto_usd, 0)::numeric as monto_impuesto_usd,
                p.total_usd, p.total_moneda_local
         FROM t_pedido p
         LEFT JOIN m_tercero t ON t.id = p.tercero_id
         WHERE p.id = $1`,
        [Number(orderId)]
      );

      if (orders.length === 0) {
        return NextResponse.json({ success: false, message: 'Pedido no encontrado' }, { status: 404 });
      }

      const lines = await query(
        `SELECT l.id, l.producto_id, pr.nombre as producto_nombre, l.cantidad, l.precio_unitario_usd,
                l.impuesto_id, COALESCE(i.nombre, 'IVA') as impuesto_nombre,
                COALESCE(l.porcentaje_impuesto, i.porcentaje, 0)::numeric as porcentaje_impuesto,
                COALESCE(l.monto_impuesto_usd, 0)::numeric as monto_impuesto_usd,
                l.subtotal_usd,
                l.presentacion_id,
                COALESCE(l.presentacion_nombre, pr.unidad_base, 'Unidad') as presentacion_nombre,
                COALESCE(l.factor_conversion, 1)::numeric as factor_conversion,
                COALESCE(l.cantidad_base, l.cantidad)::numeric as cantidad_base
         FROM t_pedidolinea l
         JOIN m_producto pr ON pr.id = l.producto_id
         LEFT JOIN m_impuesto i ON i.id = l.impuesto_id
         WHERE l.pedido_id = $1
         ORDER BY l.id ASC`,
        [Number(orderId)]
      );

      return NextResponse.json({
        success: true,
        order: {
          ...orders[0],
          lineas: lines,
        },
      });
    }

    const orders = await query(
      `SELECT p.id, p.fecha_hora, p.tercero_id,
              COALESCE(p.estado, 'COMPLETADO') as estado,
              COALESCE(t.razon_social_nombre, p.cliente_nombre, 'Cliente Genérico') as cliente_nombre,
              t.identificacion as tercero_identificacion,
              p.tasa_cambio_aplicada,
              COALESCE(p.base_imponible_usd, p.total_usd)::numeric as base_imponible_usd,
              COALESCE(p.monto_impuesto_usd, 0)::numeric as monto_impuesto_usd,
              p.total_usd, p.total_moneda_local,
              COUNT(l.id)::int as total_articulos
       FROM t_pedido p
       LEFT JOIN m_tercero t ON t.id = p.tercero_id
       LEFT JOIN t_pedidolinea l ON l.pedido_id = p.id
       GROUP BY p.id, p.estado, t.razon_social_nombre, t.identificacion, t.telefono
       ORDER BY p.fecha_hora DESC
       LIMIT $1`,
      [limit]
    );

    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al obtener pedidos' },
      { status: 500 }
    );
  }
}

// POST create order transaction with stock validation and inventory deduction
export async function POST(req: Request) {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const body = await req.json();
    const {
      tercero_id,
      cliente_nombre,
      tasa_cambio_aplicada,
      permitir_stock_negativo = false,
      items,
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'El pedido debe tener al menos un producto' },
        { status: 400 }
      );
    }

    const rate = Number(tasa_cambio_aplicada);
    if (!rate || isNaN(rate) || rate <= 0) {
      return NextResponse.json(
        { success: false, message: 'Tasa de cambio inválida para procesar la venta' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // 1. Resolve Customer (tercero_id)
    let assignedTerceroId = Number(tercero_id);
    let finalClienteNombre = cliente_nombre ? String(cliente_nombre).trim() : null;

    if (!assignedTerceroId) {
      // Find generic customer (default id 1 or search by 'V-00000000')
      const genRes = await client.query(
        "SELECT id, razon_social_nombre FROM m_tercero WHERE id = 1 OR identificacion = 'V-00000000' LIMIT 1"
      );
      if (genRes.rows.length > 0) {
        assignedTerceroId = genRes.rows[0].id;
        if (!finalClienteNombre) finalClienteNombre = genRes.rows[0].razon_social_nombre;
      } else {
        assignedTerceroId = 1;
      }
    } else {
      const custRes = await client.query('SELECT razon_social_nombre FROM m_tercero WHERE id = $1', [assignedTerceroId]);
      if (custRes.rows.length > 0 && !finalClienteNombre) {
        finalClienteNombre = custRes.rows[0].razon_social_nombre;
      }
    }

    // 2. Validate products, check stock, calculate taxes
    let calculatedBaseUsd = 0;
    let calculatedTaxUsd = 0;

    const validatedLines: {
      producto_id: number;
      cantidad: number;
      precio_unitario_usd: number;
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
      const unitPrice = Number(item.precio_unitario_usd);
      const presId = item.presentacion_id ? Number(item.presentacion_id) : null;

      if (!pId || qty <= 0 || unitPrice < 0) {
        throw new Error('Detalles de línea de pedido inválidos.');
      }

      // Lock product for atomic stock check and discount
      const prodRes = await client.query(
        `SELECT p.id, p.nombre, p.stock_actual, p.impuesto_id,
                COALESCE(p.unidad_base, 'Unidad') as unidad_base,
                COALESCE(i.porcentaje, 16.00)::numeric as impuesto_porcentaje
         FROM m_producto p
         LEFT JOIN m_impuesto i ON i.id = p.impuesto_id
         WHERE p.id = $1 FOR UPDATE OF p`,
        [pId]
      );

      if (prodRes.rows.length === 0) {
        throw new Error(`Producto #${pId} no encontrado en la base de datos.`);
      }

      const prod = prodRes.rows[0];
      const stockDisponible = Number(prod.stock_actual) || 0;

      // Resolver presentación (null = unidad base, factor 1)
      let factor = 1;
      let presNombre = String(prod.unidad_base);
      if (presId) {
        const presRes = await client.query(
          'SELECT nombre, factor FROM m_producto_presentacion WHERE id = $1 AND producto_id = $2',
          [presId, pId]
        );
        if (presRes.rows.length === 0) {
          throw new Error(`La presentación seleccionada para "${prod.nombre}" no existe.`);
        }
        factor = Number(presRes.rows[0].factor);
        presNombre = String(presRes.rows[0].nombre);
      }
      const qtyBase = Number((qty * factor).toFixed(3));

      // Check stock availability (en unidad base)
      if (!permitir_stock_negativo && stockDisponible < qtyBase) {
        throw new Error(
          `Stock insuficiente para "${prod.nombre}". Solicitado: ${qty} ${presNombre} (${qtyBase} ${prod.unidad_base}), disponible: ${stockDisponible} ${prod.unidad_base}.`
        );
      }

      const taxId = prod.impuesto_id || 1;
      const taxPercent = prod.impuesto_porcentaje !== null && prod.impuesto_porcentaje !== undefined ? Number(prod.impuesto_porcentaje) : 0;
      const subtotal = Number((qty * unitPrice).toFixed(2));
      const lineTax = Number(((subtotal * taxPercent) / 100).toFixed(2));

      calculatedBaseUsd += subtotal;
      calculatedTaxUsd += lineTax;

      validatedLines.push({
        producto_id: pId,
        cantidad: qty,
        precio_unitario_usd: unitPrice,
        impuesto_id: taxId,
        porcentaje_impuesto: taxPercent,
        monto_impuesto_usd: lineTax,
        subtotal_usd: subtotal,
        presentacion_id: presId,
        presentacion_nombre: presNombre,
        factor_conversion: factor,
        cantidad_base: qtyBase,
      });

      // Deduct inventory (unidad base)
      await client.query(
        'UPDATE m_producto SET stock_actual = stock_actual - $1 WHERE id = $2',
        [qtyBase, pId]
      );
    }

    calculatedBaseUsd = Number(calculatedBaseUsd.toFixed(2));
    calculatedTaxUsd = Number(calculatedTaxUsd.toFixed(2));
    const totalUsd = Number((calculatedBaseUsd + calculatedTaxUsd).toFixed(2));
    const totalLocal = Number((totalUsd * rate).toFixed(2));

    // 3. Insert t_pedido
    const insertPedidoSql = `
      INSERT INTO t_pedido (
        tercero_id, cliente_nombre, tasa_cambio_aplicada,
        base_imponible_usd, monto_impuesto_usd, total_usd, total_moneda_local, estado
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'COMPLETADO')
      RETURNING *;
    `;

    const pedidoRes = await client.query(insertPedidoSql, [
      assignedTerceroId,
      finalClienteNombre,
      rate,
      calculatedBaseUsd,
      calculatedTaxUsd,
      totalUsd,
      totalLocal,
    ]);

    const nuevoPedido = pedidoRes.rows[0];

    // 4. Insert t_pedidolinea
    for (const line of validatedLines) {
      await client.query(
        `INSERT INTO t_pedidolinea (
          pedido_id, producto_id, cantidad, precio_unitario_usd,
          impuesto_id, porcentaje_impuesto, monto_impuesto_usd, subtotal_usd,
          presentacion_id, presentacion_nombre, factor_conversion, cantidad_base
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          nuevoPedido.id,
          line.producto_id,
          line.cantidad,
          line.precio_unitario_usd,
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
    }

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      order: nuevoPedido,
      message: 'Venta registrada e inventario actualizado con éxito',
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error inserting order:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al procesar la venta' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// PATCH change order status (COMPLETADO, ANULADO)
export async function PATCH(req: Request) {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const body = await req.json();
    const { id, estado } = body;

    if (!id || !estado) {
      return NextResponse.json(
        { success: false, message: 'ID y estado son obligatorios' },
        { status: 400 }
      );
    }

    const validEstados = ['COMPLETADO', 'ANULADO'];
    if (!validEstados.includes(estado)) {
      return NextResponse.json(
        { success: false, message: 'Estado no válido. Use: COMPLETADO o ANULADO' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Fetch order with row lock
    const orderRes = await client.query('SELECT * FROM t_pedido WHERE id = $1 FOR UPDATE', [Number(id)]);
    if (orderRes.rows.length === 0) {
      throw new Error('Pedido no encontrado');
    }

    const pedido = orderRes.rows[0];
    const estadoAnterior = pedido.estado || 'COMPLETADO';
    const nuevoEstado = estado;

    if (estadoAnterior === nuevoEstado) {
      await client.query('COMMIT');
      return NextResponse.json({
        success: true,
        message: `El pedido ya se encuentra en estado ${nuevoEstado}`,
      });
    }

    // Fetch order lines
    const linesRes = await client.query(
      'SELECT producto_id, COALESCE(cantidad_base, cantidad) as cantidad FROM t_pedidolinea WHERE pedido_id = $1',
      [Number(id)]
    );

    // Si se ANULA un pedido que estaba COMPLETADO: RESTAURAR inventario (sumar stock)
    if (estadoAnterior === 'COMPLETADO' && nuevoEstado === 'ANULADO') {
      for (const line of linesRes.rows) {
        await client.query(
          'UPDATE m_producto SET stock_actual = stock_actual + $1 WHERE id = $2',
          [Number(line.cantidad), Number(line.producto_id)]
        );
      }
    }

    // Si se reactiva de ANULADO a COMPLETADO: Restar inventario nuevamente
    if (estadoAnterior === 'ANULADO' && nuevoEstado === 'COMPLETADO') {
      for (const line of linesRes.rows) {
        await client.query(
          'UPDATE m_producto SET stock_actual = stock_actual - $1 WHERE id = $2',
          [Number(line.cantidad), Number(line.producto_id)]
        );
      }
    }

    // Actualizar estado del pedido
    await client.query('UPDATE t_pedido SET estado = $1 WHERE id = $2', [nuevoEstado, Number(id)]);

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      message:
        nuevoEstado === 'ANULADO'
          ? 'Pedido anulado y stock devuelto al inventario con éxito'
          : 'Pedido reactivado a completado con éxito',
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error updating order status:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al cambiar estado del pedido' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

