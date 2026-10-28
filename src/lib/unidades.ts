import { Producto, Presentacion } from '@/types';

/** Opción de venta/compra de un producto: la unidad base (id null) o una presentación. */
export interface OpcionUnidad {
  id: number | null;
  nombre: string;
  factor: number;
  precio_usd: number;
}

export interface SegmentacionMedida {
  id: number | null;
  nombre: string;
  factor: number;
  precio_usd: number;
  precio_unitario_equivalente: number;
  unidades_completas: number;
  resto_unidades: number;
  total_base: number;
  valor_potencial_usd: number;
}

/** Devuelve la unidad base + todas las presentaciones del producto, ordenadas por factor. */
export function getOpcionesUnidad(p: any): OpcionUnidad[] {
  const base: OpcionUnidad = {
    id: null,
    nombre: p.unidad_base || 'Unidad',
    factor: 1,
    precio_usd: Number(p.precio_usd) || 0,
  };
  const pres = (p.presentaciones || [])
    .filter((x: Presentacion) => x.id && Number(x.factor) > 0)
    .map((x: Presentacion) => ({
      id: Number(x.id),
      nombre: x.nombre,
      factor: Number(x.factor),
      precio_usd: Number(x.precio_usd) || 0,
    }))
    .sort((a: OpcionUnidad, b: OpcionUnidad) => a.factor - b.factor);
  return [base, ...pres];
}

export function getOpcionUnidad(p: any, presentacionId: number | null): OpcionUnidad {
  const ops = getOpcionesUnidad(p);
  return ops.find((o) => o.id === presentacionId) || ops[0];
}

function fmtNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
}

/**
 * Desglose usando la presentación mayor.
 * Ej: 293 cervezas con Caja x30 -> "9 caja + 23 Unidad".
 */
export function formatStockDesglose(p: any, stockBase?: number): string {
  const stock = stockBase !== undefined ? stockBase : Number(p.stock_actual) || 0;
  const unidad = p.unidad_base || 'Unidad';
  const ops = getOpcionesUnidad(p);
  const mayor = ops[ops.length - 1];
  if (!mayor || mayor.id === null || stock <= 0) {
    return `${fmtNum(stock)} ${unidad}`;
  }
  const enteros = Math.floor(stock / mayor.factor);
  const resto = Number((stock - enteros * mayor.factor).toFixed(3));
  const partes: string[] = [];
  if (enteros > 0) partes.push(`${enteros} ${mayor.nombre}`);
  if (resto > 0) partes.push(`${fmtNum(resto)} ${unidad}`);
  return partes.length ? partes.join(' + ') : `0 ${unidad}`;
}

/**
 * Desglose jerárquico inteligente pasando por todas las presentaciones de mayor a menor.
 * Ej: 293 cervezas con Caja x30 y Combo x7:
 * 293 = 9 cajas (270) + 3 combos (21) + 2 unidades.
 * -> "9 caja + 3 combo + 2 Unidad"
 */
export function formatStockDesgloseCompleto(p: any, stockBase?: number): string {
  let stock = stockBase !== undefined ? stockBase : Number(p.stock_actual) || 0;
  const unidad = p.unidad_base || 'Unidad';
  if (stock <= 0) return `0 ${unidad}`;

  const ops = getOpcionesUnidad(p);
  // Mayores primero (factor descendente > 1)
  const mayores = ops.filter((o) => o.factor > 1).sort((a, b) => b.factor - a.factor);
  if (mayores.length === 0) {
    return `${fmtNum(stock)} ${unidad}`;
  }

  const partes: string[] = [];
  for (const op of mayores) {
    const cant = Math.floor(stock / op.factor);
    if (cant > 0) {
      partes.push(`${cant} ${op.nombre}`);
      stock = Number((stock - cant * op.factor).toFixed(3));
    }
  }

  if (stock > 0 || partes.length === 0) {
    partes.push(`${fmtNum(stock)} ${unidad}`);
  }

  return partes.join(' + ');
}

/**
 * Obtiene la segmentación completa para CADA medida individual:
 * Ej para 293 cervezas con Combo x7 ($7) y Caja x30 ($25):
 * - Caja x30: 9 cajas completas (+ 23 un.) a $25 c/u ($0.83 c/u)
 * - Combo x7: 41 combos completos (+ 6 un.) a $7 c/u ($1.00 c/u)
 * - Unidad: 293 unidades completas a $1.50 c/u
 */
export function getSegmentacionExistencias(p: any, stockBase?: number): SegmentacionMedida[] {
  const stock = stockBase !== undefined ? stockBase : Number(p.stock_actual) || 0;
  const precioBase = Number(p.precio_usd) || 0;
  const ops = getOpcionesUnidad(p);

  return ops.map((op) => {
    const factor = op.factor || 1;
    const completas = Math.floor(stock / factor);
    const resto = Number((stock - completas * factor).toFixed(3));
    const equiv = factor > 0 ? Number(((op.precio_usd || 0) / factor).toFixed(4)) : (op.precio_usd || 0);
    const valorPotencial = Number(((completas * (op.precio_usd || 0)) + (resto * precioBase)).toFixed(2));

    return {
      id: op.id,
      nombre: op.nombre,
      factor: factor,
      precio_usd: Number(op.precio_usd) || 0,
      precio_unitario_equivalente: equiv,
      unidades_completas: completas,
      resto_unidades: resto,
      total_base: stock,
      valor_potencial_usd: valorPotencial,
    };
  });
}
