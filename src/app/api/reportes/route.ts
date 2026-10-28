import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get('tipo') || 'resumen'; // 'ventas' | 'rentabilidad' | 'resumen'
    
    // Default dates: current month (from 1st day of month to today)
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const today = now.toISOString().split('T')[0];

    const fechaDesde = searchParams.get('desde') || firstDayOfMonth;
    const fechaHasta = searchParams.get('hasta') || today;

    // Convert to start of day and end of day in ISO
    const startIso = `${fechaDesde}T00:00:00.000Z`;
    const endIso = `${fechaHasta}T23:59:59.999Z`;

    // ==========================================
    // 1. REPORTE DE VENTAS POR RANGO DE FECHA
    // ==========================================
    const salesReportQuery = `
      SELECT 
        p.id,
        p.fecha_hora,
        p.tercero_id,
        COALESCE(t.razon_social_nombre, p.cliente_nombre, 'Cliente Genérico') as cliente_nombre,
        t.identificacion as cliente_identificacion,
        p.tasa_cambio_aplicada,
        COALESCE(p.base_imponible_usd, p.total_usd)::numeric as base_imponible_usd,
        COALESCE(p.monto_impuesto_usd, 0)::numeric as monto_impuesto_usd,
        p.total_usd::numeric,
        p.total_moneda_local::numeric,
        COUNT(l.id)::int as total_articulos,
        COALESCE(SUM(COALESCE(l.cantidad_base, l.cantidad)), 0)::numeric as total_unidades,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', l.id,
              'producto_id', l.producto_id,
              'producto_nombre', pr.nombre,
              'unidad_base', pr.unidad_base,
              'presentacion_nombre', l.presentacion_nombre,
              'factor_conversion', COALESCE(l.factor_conversion, 1),
              'cantidad', l.cantidad::numeric,
              'cantidad_base', COALESCE(l.cantidad_base, l.cantidad)::numeric,
              'precio_unitario_usd', l.precio_unitario_usd::numeric,
              'porcentaje_impuesto', COALESCE(l.porcentaje_impuesto, 0)::numeric,
              'monto_impuesto_usd', COALESCE(l.monto_impuesto_usd, 0)::numeric,
              'subtotal_usd', l.subtotal_usd::numeric
            ) ORDER BY l.id
          ) FILTER (WHERE l.id IS NOT NULL),
          '[]'::json
        ) as lineas
      FROM t_pedido p
      LEFT JOIN m_tercero t ON t.id = p.tercero_id
      LEFT JOIN t_pedidolinea l ON l.pedido_id = p.id
      LEFT JOIN m_producto pr ON pr.id = l.producto_id
      WHERE p.estado = 'COMPLETADO'
        AND p.fecha_hora >= $1 
        AND p.fecha_hora <= $2
      GROUP BY p.id, p.fecha_hora, p.tercero_id, t.razon_social_nombre, p.cliente_nombre, t.identificacion, p.tasa_cambio_aplicada, p.base_imponible_usd, p.monto_impuesto_usd, p.total_usd, p.total_moneda_local
      ORDER BY p.fecha_hora DESC
    `;

    const salesRows = await query(salesReportQuery, [startIso, endIso]);

    // Calcular base e IVA en Bolívares para cada pedido
    salesRows.forEach((row: any) => {
      const tasa = Number(row.tasa_cambio_aplicada) || 1;
      const baseUsd = Number(row.base_imponible_usd) || 0;
      const ivaUsd = Number(row.monto_impuesto_usd) || 0;
      row.base_imponible_bs = Number((baseUsd * tasa).toFixed(2));
      row.monto_impuesto_bs = Number((ivaUsd * tasa).toFixed(2));
    });

    // Resumen de Ventas
    const totalVentasUsd = salesRows.reduce((acc, row) => acc + Number(row.total_usd || 0), 0);
    const totalVentasLocal = salesRows.reduce((acc, row) => acc + Number(row.total_moneda_local || 0), 0);
    const totalBaseUsd = salesRows.reduce((acc, row) => acc + Number(row.base_imponible_usd || 0), 0);
    const totalIvaUsd = salesRows.reduce((acc, row) => acc + Number(row.monto_impuesto_usd || 0), 0);
    const totalBaseLocal = salesRows.reduce((acc, row) => acc + Number(row.base_imponible_bs || 0), 0);
    const totalIvaLocal = salesRows.reduce((acc, row) => acc + Number(row.monto_impuesto_bs || 0), 0);
    const cantidadPedidos = salesRows.length;
    const ticketPromedioUsd = cantidadPedidos > 0 ? totalVentasUsd / cantidadPedidos : 0;
    const totalUnidadesVendidas = salesRows.reduce((acc, row) => acc + Number(row.total_unidades || 0), 0);

    // Desglose diario para gráfico de ventas
    const dailyBreakdownQuery = `
      SELECT 
        TO_CHAR(p.fecha_hora, 'YYYY-MM-DD') as fecha,
        TO_CHAR(p.fecha_hora, 'Dy DD Mon') as etiqueta,
        COUNT(p.id)::int as cantidad_ventas,
        COALESCE(SUM(p.total_usd), 0)::numeric as total_usd,
        COALESCE(SUM(p.total_moneda_local), 0)::numeric as total_local
      FROM t_pedido p
      WHERE p.estado = 'COMPLETADO'
        AND p.fecha_hora >= $1 
        AND p.fecha_hora <= $2
      GROUP BY TO_CHAR(p.fecha_hora, 'YYYY-MM-DD'), TO_CHAR(p.fecha_hora, 'Dy DD Mon')
      ORDER BY fecha ASC
    `;
    const dailyBreakdown = await query(dailyBreakdownQuery, [startIso, endIso]);

    // ==========================================
    // 2. REPORTE DE RENTABILIDAD FIFO (PEPS)
    // ==========================================
    // Para calcular rentabilidad FIFO con precisión:
    // 1. Obtenemos todas las compras completadas (lotes de entrada con costo) en orden cronológico.
    // 2. Obtenemos todos los pedidos completados y sus líneas en orden cronológico.
    // 3. Aplicamos la pila FIFO por producto: cada venta consume las unidades del lote de compra más antiguo.
    //    Si una venta excede los lotes comprados, utiliza el costo_promedio_usd del producto.

    // A) Todos los productos
    const allProducts = await query(`
      SELECT id, nombre, costo_promedio_usd, precio_usd, stock_actual 
      FROM m_producto 
      ORDER BY id ASC
    `);
    const productMap = new Map<number, any>();
    allProducts.forEach((p) => productMap.set(p.id, p));

    // B) Todos los lotes de compra completados en orden histórico (convertidos a unidad base)
    let purchaseBatches: any[] = [];
    try {
      purchaseBatches = await query(`
        SELECT 
          cl.id as linea_id,
          c.id as compra_id,
          c.numero_factura,
          c.fecha_emision,
          c.creado_en,
          cl.producto_id,
          COALESCE(cl.cantidad_base, cl.cantidad)::numeric as cantidad,
          (cl.costo_unitario_usd / COALESCE(cl.factor_conversion, 1))::numeric as costo_unitario_usd
        FROM t_compra c
        JOIN t_compralinea cl ON cl.compra_id = c.id
        WHERE COALESCE(c.estado, 'COMPLETADO') != 'ANULADO'
        ORDER BY c.fecha_emision ASC, c.id ASC, cl.id ASC
      `);
    } catch {
      try {
        purchaseBatches = await query(`
          SELECT 
            cl.id as linea_id,
            c.id as compra_id,
            c.numero_factura,
            c.fecha_emision,
            c.creado_en,
            cl.producto_id,
            COALESCE(cl.cantidad_base, cl.cantidad)::numeric as cantidad,
            (cl.costo_unitario_usd / COALESCE(cl.factor_conversion, 1))::numeric as costo_unitario_usd
          FROM t_compra c
          JOIN t_compralinea cl ON cl.compra_id = c.id
          ORDER BY c.fecha_emision ASC, c.id ASC, cl.id ASC
        `);
      } catch (err) {
        console.error('Error al consultar lotes de compras FIFO:', err);
      }
    }

    // Estructura de inventario FIFO disponible por producto
    const fifoInventory = new Map<number, {
      compra_id: number;
      numero_factura: string;
      fecha_emision: string;
      costo_unitario_usd: number;
      cantidad_disponible: number;
    }[]>();

    for (const b of purchaseBatches) {
      const pId = Number(b.producto_id);
      if (!fifoInventory.has(pId)) {
        fifoInventory.set(pId, []);
      }
      fifoInventory.get(pId)!.push({
        compra_id: b.compra_id,
        numero_factura: b.numero_factura,
        fecha_emision: b.fecha_emision,
        costo_unitario_usd: Number(b.costo_unitario_usd),
        cantidad_disponible: Number(b.cantidad),
      });
    }

    // C) Todas las líneas de pedidos completados en orden histórico (con cantidad base)
    const allOrderLines = await query(`
      SELECT 
        l.id as linea_id,
        p.id as pedido_id,
        p.fecha_hora,
        p.tasa_cambio_aplicada,
        COALESCE(t.razon_social_nombre, p.cliente_nombre, 'Cliente Genérico') as cliente_nombre,
        l.producto_id,
        pr.nombre as producto_nombre,
        l.cantidad::numeric,
        COALESCE(l.cantidad_base, l.cantidad)::numeric as cantidad_base,
        l.precio_unitario_usd::numeric,
        l.subtotal_usd::numeric,
        l.presentacion_nombre,
        COALESCE(pr.unidad_base, 'Unidad') as unidad_base
      FROM t_pedido p
      JOIN t_pedidolinea l ON l.pedido_id = p.id
      JOIN m_producto pr ON pr.id = l.producto_id
      LEFT JOIN m_tercero t ON t.id = p.tercero_id
      WHERE p.estado = 'COMPLETADO'
      ORDER BY p.fecha_hora ASC, p.id ASC, l.id ASC
    `);

    // Procesamos el FIFO cronológicamente para todas las ventas
    interface FifoSaleRecord {
      linea_id: number;
      pedido_id: number;
      fecha_hora: string;
      cliente_nombre: string;
      producto_id: number;
      producto_nombre: string;
      cantidad: number;
      cantidad_base: number;
      presentacion_nombre?: string;
      unidad_base?: string;
      precio_unitario_usd: number;
      ingreso_usd: number;
      costo_fifo_total_usd: number;
      costo_unitario_ponderado_fifo: number;
      utilidad_bruta_usd: number;
      margen_porcentaje: number;
      lotes_consumidos: {
        compra_id?: number;
        numero_factura?: string;
        costo_unitario_usd: number;
        cantidad_consumida: number;
        es_costo_base?: boolean;
      }[];
    }

    const processedFifoSales: FifoSaleRecord[] = [];

    for (const sale of allOrderLines) {
      const pId = Number(sale.producto_id);
      let qtyNeeded = Number(sale.cantidad_base); // Se consumen unidades base de inventario
      const unitSalePrice = Number(sale.precio_unitario_usd);
      const saleSubtotal = Number(sale.subtotal_usd);

      let lineTotalCostFifo = 0;
      const consumedLots: FifoSaleRecord['lotes_consumidos'] = [];

      const availableBatches = fifoInventory.get(pId) || [];

      // Consumir lotes FIFO disponibles
      for (const batch of availableBatches) {
        if (qtyNeeded <= 0) break;
        if (batch.cantidad_disponible > 0) {
          const qtyToTake = Math.min(qtyNeeded, batch.cantidad_disponible);
          const costOfPortion = qtyToTake * batch.costo_unitario_usd;

          lineTotalCostFifo += costOfPortion;
          batch.cantidad_disponible -= qtyToTake;
          qtyNeeded -= qtyToTake;

          consumedLots.push({
            compra_id: batch.compra_id,
            numero_factura: batch.numero_factura,
            costo_unitario_usd: batch.costo_unitario_usd,
            cantidad_consumida: qtyToTake,
          });
        }
      }

      // Si aún queda cantidad que no provino de compras registradas (inventario previo o inicial):
      if (qtyNeeded > 0) {
        const prod = productMap.get(pId);
        const fallbackCost = prod ? Number(prod.costo_promedio_usd || 0) : 0;
        const portionCost = qtyNeeded * fallbackCost;
        lineTotalCostFifo += portionCost;

        consumedLots.push({
          costo_unitario_usd: fallbackCost,
          cantidad_consumida: qtyNeeded,
          es_costo_base: true,
        });
      }

      lineTotalCostFifo = Number(lineTotalCostFifo.toFixed(2));
      const grossProfit = Number((saleSubtotal - lineTotalCostFifo).toFixed(2));
      const marginPct = saleSubtotal > 0 ? Number(((grossProfit / saleSubtotal) * 100).toFixed(2)) : 0;
      const unitWeightedCostFifo = Number(sale.cantidad) > 0 ? Number((lineTotalCostFifo / Number(sale.cantidad)).toFixed(2)) : 0;

      processedFifoSales.push({
        linea_id: sale.linea_id,
        pedido_id: sale.pedido_id,
        fecha_hora: sale.fecha_hora,
        cliente_nombre: sale.cliente_nombre,
        producto_id: pId,
        producto_nombre: sale.producto_nombre,
        cantidad: Number(sale.cantidad),
        cantidad_base: Number(sale.cantidad_base),
        presentacion_nombre: sale.presentacion_nombre,
        unidad_base: sale.unidad_base,
        precio_unitario_usd: unitSalePrice,
        ingreso_usd: saleSubtotal,
        costo_fifo_total_usd: lineTotalCostFifo,
        costo_unitario_ponderado_fifo: unitWeightedCostFifo,
        utilidad_bruta_usd: grossProfit,
        margen_porcentaje: marginPct,
        lotes_consumidos: consumedLots,
      });
    }

    // Ahora filtramos las ventas procesadas por el rango de fecha solicitado
    const filteredFifoSales = processedFifoSales.filter((s) => {
      const saleDate = new Date(s.fecha_hora).toISOString();
      return saleDate >= startIso && saleDate <= endIso;
    });

    // Agrupación de Rentabilidad por Producto en el período
    const productProfitabilityMap = new Map<number, {
      producto_id: number;
      producto_nombre: string;
      unidades_vendidas: number;
      ingreso_total_usd: number;
      costo_fifo_total_usd: number;
      utilidad_bruta_usd: number;
      margen_porcentaje: number;
    }>();

    for (const item of filteredFifoSales) {
      if (!productProfitabilityMap.has(item.producto_id)) {
        productProfitabilityMap.set(item.producto_id, {
          producto_id: item.producto_id,
          producto_nombre: item.producto_nombre,
          unidades_vendidas: 0,
          ingreso_total_usd: 0,
          costo_fifo_total_usd: 0,
          utilidad_bruta_usd: 0,
          margen_porcentaje: 0,
        });
      }
      const pData = productProfitabilityMap.get(item.producto_id)!;
      pData.unidades_vendidas += item.cantidad_base; // unidades base de inventario
      pData.ingreso_total_usd += item.ingreso_usd;
      pData.costo_fifo_total_usd += item.costo_fifo_total_usd;
      pData.utilidad_bruta_usd += item.utilidad_bruta_usd;
    }

    // Calcular márgenes finales por producto
    const productProfitabilityList = Array.from(productProfitabilityMap.values()).map((p) => {
      const margin = p.ingreso_total_usd > 0
        ? Number(((p.utilidad_bruta_usd / p.ingreso_total_usd) * 100).toFixed(2))
        : 0;
      return {
        ...p,
        ingreso_total_usd: Number(p.ingreso_total_usd.toFixed(2)),
        costo_fifo_total_usd: Number(p.costo_fifo_total_usd.toFixed(2)),
        utilidad_bruta_usd: Number(p.utilidad_bruta_usd.toFixed(2)),
        margen_porcentaje: margin,
      };
    }).sort((a, b) => b.utilidad_bruta_usd - a.utilidad_bruta_usd);

    // Resumen Global de Rentabilidad en el rango
    const totalIngresosFifo = filteredFifoSales.reduce((acc, s) => acc + s.ingreso_usd, 0);
    const totalCostosFifo = filteredFifoSales.reduce((acc, s) => acc + s.costo_fifo_total_usd, 0);
    const totalUtilidadBruta = Number((totalIngresosFifo - totalCostosFifo).toFixed(2));
    const margenGlobalPorcentaje = totalIngresosFifo > 0
      ? Number(((totalUtilidadBruta / totalIngresosFifo) * 100).toFixed(2))
      : 0;

    // ==========================================
    // 3. REPORTE DE INVENTARIO Y VALORIZACIÓN
    // ==========================================
    const inventoryQuery = `
      SELECT 
        p.id,
        p.nombre,
        p.precio_usd,
        COALESCE(p.stock_actual, 0)::numeric as stock_actual,
        COALESCE(p.costo_promedio_usd, 0)::numeric as costo_promedio_usd,
        COALESCE(p.unidad_base, 'Unidad') as unidad_base,
        p.activo,
        p.impuesto_id,
        COALESCE(i.nombre, 'IVA 16%') as impuesto_nombre,
        COALESCE(i.porcentaje, 16.00)::numeric as impuesto_porcentaje,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pr.id,
              'nombre', pr.nombre,
              'factor', pr.factor,
              'precio_usd', pr.precio_usd
            ) ORDER BY pr.factor ASC
          ) FILTER (WHERE pr.id IS NOT NULL AND pr.activo = TRUE),
          '[]'::json
        ) as presentaciones
      FROM m_producto p
      LEFT JOIN m_impuesto i ON i.id = p.impuesto_id
      LEFT JOIN m_producto_presentacion pr ON pr.producto_id = p.id
      GROUP BY p.id, p.nombre, p.precio_usd, p.stock_actual, p.costo_promedio_usd, p.unidad_base, p.activo, p.impuesto_id, i.nombre, i.porcentaje
      ORDER BY p.nombre ASC
    `;

    const inventoryRows = await query(inventoryQuery);

    let valorTotalCostoUsd = 0;
    let valorTotalVentaUsd = 0;
    let totalUnidadesEnStock = 0;
    let productosAgotados = 0;
    let productosStockBajo = 0;

    const inventoryItems = inventoryRows.map((row: any) => {
      const stock = Number(row.stock_actual || 0);
      const costo = Number(row.costo_promedio_usd || 0);
      const precio = Number(row.precio_usd || 0);
      const valorCosto = Number((stock * costo).toFixed(2));
      const valorVenta = Number((stock * precio).toFixed(2));
      const utilidadPotencial = Number((valorVenta - valorCosto).toFixed(2));
      const margenPotencialPct = valorVenta > 0
        ? Number(((utilidadPotencial / valorVenta) * 100).toFixed(2))
        : 0;

      valorTotalCostoUsd += valorCosto;
      valorTotalVentaUsd += valorVenta;
      totalUnidadesEnStock += stock;

      if (stock <= 0) {
        productosAgotados += 1;
      } else if (stock <= 5) {
        productosStockBajo += 1;
      }

      return {
        id: Number(row.id),
        nombre: row.nombre,
        unidad_base: row.unidad_base,
        precio_usd: precio,
        costo_promedio_usd: costo,
        stock_actual: stock,
        valor_costo_usd: valorCosto,
        valor_venta_usd: valorVenta,
        utilidad_potencial_usd: utilidadPotencial,
        margen_potencial_porcentaje: margenPotencialPct,
        activo: Boolean(row.activo),
        impuesto_nombre: row.impuesto_nombre,
        impuesto_porcentaje: Number(row.impuesto_porcentaje),
        presentaciones: Array.isArray(row.presentaciones) ? row.presentaciones : [],
      };
    });

    const utilidadPotencialGlobalUsd = Number((valorTotalVentaUsd - valorTotalCostoUsd).toFixed(2));
    const margenPotencialGlobalPct = valorTotalVentaUsd > 0
      ? Number(((utilidadPotencialGlobalUsd / valorTotalVentaUsd) * 100).toFixed(2))
      : 0;

    return NextResponse.json({
      success: true,
      rango: {
        desde: fechaDesde,
        hasta: fechaHasta,
      },
      ventas: {
        resumen: {
          totalVentasUsd: Number(totalVentasUsd.toFixed(2)),
          totalVentasLocal: Number(totalVentasLocal.toFixed(2)),
          totalBaseUsd: Number(totalBaseUsd.toFixed(2)),
          totalBaseLocal: Number(totalBaseLocal.toFixed(2)),
          totalIvaUsd: Number(totalIvaUsd.toFixed(2)),
          totalIvaLocal: Number(totalIvaLocal.toFixed(2)),
          cantidadPedidos,
          ticketPromedioUsd: Number(ticketPromedioUsd.toFixed(2)),
          totalUnidadesVendidas,
        },
        pedidos: salesRows,
        graficoDiario: dailyBreakdown,
      },
      rentabilidadFifo: {
        resumen: {
          totalIngresosUsd: Number(totalIngresosFifo.toFixed(2)),
          totalCostosFifoUsd: Number(totalCostosFifo.toFixed(2)),
          totalUtilidadBrutaUsd: totalUtilidadBruta,
          margenGlobalPorcentaje,
        },
        porProducto: productProfitabilityList,
        ventasDetalle: filteredFifoSales.sort((a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime()),
      },
      inventario: {
        resumen: {
          totalProductos: inventoryItems.length,
          productosActivos: inventoryItems.filter((i: any) => i.activo).length,
          totalUnidadesEnStock,
          valorTotalCostoUsd: Number(valorTotalCostoUsd.toFixed(2)),
          valorTotalVentaUsd: Number(valorTotalVentaUsd.toFixed(2)),
          utilidadPotencialGlobalUsd,
          margenPotencialGlobalPct,
          productosAgotados,
          productosStockBajo,
        },
        productos: inventoryItems,
      },
    });
  } catch (error: any) {
    console.error('Error in /api/reportes:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al generar reportes' },
      { status: 500 }
    );
  }
}
