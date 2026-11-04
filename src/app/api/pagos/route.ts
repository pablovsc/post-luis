import { NextResponse } from 'next/server';
import { getPool, query, ensureAuthTables } from '@/lib/db';

// GET: Consultar pagos (con filtros por pedido_id, compra_id o tercero_id)
export async function GET(req: Request) {
  try {
    await ensureAuthTables();
    const { searchParams } = new URL(req.url);
    const pedidoId = searchParams.get('pedido_id');
    const compraId = searchParams.get('compra_id');
    const terceroId = searchParams.get('tercero_id');

    let sql = `
      SELECT p.id, p.tipo_operacion, p.pedido_id, p.compra_id, p.tercero_id,
             p.tipo_pago_id, p.cuenta_bancaria_id, p.fecha_pago,
             p.moneda, p.monto_original, p.tasa_cambio, p.monto_equivalente_usd,
             p.referencia, p.nota, p.estado, p.creado_en, p.creado_por,
             p.actualizado_en, p.actualizado_por,
             tp.nombre as tipo_pago_nombre,
             cb.nombre as cuenta_bancaria_nombre,
             b.nombre as banco_nombre,
             b.tipo as banco_tipo,
             u.nombre_completo as creado_por_nombre
      FROM t_pago p
      JOIN m_tipopago tp ON tp.id = p.tipo_pago_id
      LEFT JOIN m_cuentabancaria cb ON cb.id = p.cuenta_bancaria_id
      LEFT JOIN m_banco b ON b.id = cb.banco_id
      LEFT JOIN m_usuario u ON u.id = p.creado_por
      WHERE 1=1
    `;
    const params: any[] = [];

    if (pedidoId) {
      params.push(Number(pedidoId));
      sql += ` AND p.pedido_id = $${params.length}`;
    }
    if (compraId) {
      params.push(Number(compraId));
      sql += ` AND p.compra_id = $${params.length}`;
    }
    if (terceroId) {
      params.push(Number(terceroId));
      sql += ` AND p.tercero_id = $${params.length}`;
    }

    sql += ' ORDER BY p.fecha_pago DESC, p.id DESC';

    const pagos = await query(sql, params);
    return NextResponse.json({ success: true, pagos });
  } catch (error: any) {
    console.error('Error fetching pagos:', error);
    return NextResponse.json(
      { success: false, message: 'Error al consultar pagos', error: error?.message },
      { status: 500 }
    );
  }
}

// POST: Registrar un nuevo pago (abono o cobro independiente)
export async function POST(req: Request) {
  try {
    await ensureAuthTables();
    const body = await req.json();
    const {
      tipo_operacion,
      pedido_id,
      compra_id,
      tercero_id,
      tipo_pago_id,
      cuenta_bancaria_id,
      moneda,
      monto_original,
      tasa_cambio,
      monto_equivalente_usd,
      referencia,
      nota,
      creado_por,
    } = body;

    if (!tipo_operacion || !tipo_pago_id || !monto_original || !moneda) {
      return NextResponse.json(
        { success: false, message: 'Datos incompletos para registrar el pago' },
        { status: 400 }
      );
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const rate = Number(tasa_cambio) > 0 ? Number(tasa_cambio) : 1;
      const montoOrig = Number(monto_original);
      const montoEqUsd =
        Number(monto_equivalente_usd) > 0
          ? Number(monto_equivalente_usd)
          : moneda === 'USD'
          ? montoOrig
          : Number((montoOrig / rate).toFixed(2));

      const insertRes = await client.query(
        `INSERT INTO t_pago (
          tipo_operacion, pedido_id, compra_id, tercero_id,
          tipo_pago_id, cuenta_bancaria_id, moneda,
          monto_original, tasa_cambio, monto_equivalente_usd,
          referencia, nota, estado, creado_por
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'APROBADO', $13)
        RETURNING *`,
        [
          tipo_operacion,
          pedido_id ? Number(pedido_id) : null,
          compra_id ? Number(compra_id) : null,
          tercero_id ? Number(tercero_id) : null,
          Number(tipo_pago_id),
          cuenta_bancaria_id ? Number(cuenta_bancaria_id) : null,
          moneda,
          montoOrig,
          rate,
          montoEqUsd,
          referencia ? String(referencia).trim() : null,
          nota ? String(nota).trim() : null,
          creado_por ? Number(creado_por) : null,
        ]
      );

      // Si tiene cuenta bancaria, actualizar saldo estimado (suma si es cobro venta, resta si es pago compra)
      if (cuenta_bancaria_id) {
        const delta = tipo_operacion.startsWith('COBRO') || tipo_operacion.startsWith('ABONO_VENTA')
          ? montoOrig
          : -montoOrig;

        await client.query(
          'UPDATE m_cuentabancaria SET saldo_actual = saldo_actual + $1 WHERE id = $2',
          [delta, Number(cuenta_bancaria_id)]
        );
      }

      await client.query('COMMIT');
      return NextResponse.json({ success: true, pago: insertRes.rows[0] });
    } catch (e: any) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error guardando pago:', error);
    return NextResponse.json(
      { success: false, message: 'Error al registrar el pago', error: error?.message },
      { status: 500 }
    );
  }
}

