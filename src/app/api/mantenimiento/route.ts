import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET() {
  const pool = getPool();
  try {
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM t_pedido) as pedidos_count,
        (SELECT COUNT(*) FROM t_pedidolinea) as pedidolineas_count,
        (SELECT COUNT(*) FROM t_compra) as compras_count,
        (SELECT COUNT(*) FROM t_compralinea) as compralineas_count,
        (SELECT COUNT(*) FROM m_producto) as productos_count,
        (SELECT COUNT(*) FROM m_tercero) as terceros_count
    `;
    const res = await pool.query(statsQuery);
    return NextResponse.json({
      success: true,
      stats: {
        pedidos: Number(res.rows[0].pedidos_count || 0),
        pedidolineas: Number(res.rows[0].pedidolineas_count || 0),
        compras: Number(res.rows[0].compras_count || 0),
        compralineas: Number(res.rows[0].compralineas_count || 0),
        productos: Number(res.rows[0].productos_count || 0),
        terceros: Number(res.rows[0].terceros_count || 0),
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al obtener estadísticas del sistema' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const body = await req.json();
    const { action, resetStock, newStockValue } = body;

    // action can be: 'reset_ventas' | 'reset_compras' | 'reset_ambos' | 'reset_all'
    if (!['reset_ventas', 'reset_compras', 'reset_ambos', 'reset_all'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Acción no válida solicitada.' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    const executedActions: string[] = [];

    // 1. Borrar Ventas y reiniciar secuencias
    if (action === 'reset_ventas' || action === 'reset_ambos' || action === 'reset_all') {
      await client.query('TRUNCATE TABLE t_pedidolinea, t_pedido RESTART IDENTITY CASCADE');
      executedActions.push('Se eliminaron todos los pedidos de venta y sus renglones. Secuencia t_pedido_id_seq reiniciada a 1.');
    }

    // 2. Borrar Compras y reiniciar secuencias
    if (action === 'reset_compras' || action === 'reset_ambos' || action === 'reset_all') {
      await client.query('TRUNCATE TABLE t_compralinea, t_compra RESTART IDENTITY CASCADE');
      executedActions.push('Se eliminaron todas las facturas de compra y sus renglones. Secuencia t_compra_id_seq reiniciada a 1.');
    }

    // 3. Opcional: Reestablecer stock de productos
    if (resetStock) {
      const stockVal = typeof newStockValue === 'number' && !isNaN(newStockValue) ? newStockValue : 0;
      await client.query('UPDATE m_producto SET stock_actual = $1', [stockVal]);
      executedActions.push(`Se actualizó el stock actual de todos los productos a ${stockVal}.`);
    }

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      message: 'Operación de mantenimiento completada exitosamente.',
      executedActions,
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error en mantenimiento de base de datos:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al ejecutar el mantenimiento en la base de datos' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

