export interface Impuesto {
  id: number;
  nombre: string;
  porcentaje: number | string;
  activo: boolean;
  creado_en?: string;
}

export type TipoTercero = 'CLIENTE' | 'PROVEEDOR' | 'AMBOS';

export interface Tercero {
  id: number;
  tipo: TipoTercero;
  identificacion: string;
  razon_social_nombre: string;
  direccion?: string | null;
  telefono?: string | null;
  email?: string | null;
  activo: boolean;
  creado_en?: string;
}

export interface Presentacion {
  id?: number;
  nombre: string;
  factor: number | string;
  precio_usd: number | string;
}

export interface Producto {
  id: number;
  nombre: string;
  precio_usd: number | string;
  stock_actual: number | string;
  costo_promedio_usd: number | string;
  impuesto_id: number;
  impuesto_nombre?: string;
  impuesto_porcentaje?: number | string;
  unidad_base?: string;
  presentaciones?: Presentacion[];
  activo: boolean;
  creado_en?: string;
}

export interface Tasa {
  id: number;
  fecha: string;
  tasa: number | string;
  creado_en?: string;
}

export interface PedidoLinea {
  id?: number;
  pedido_id?: number;
  producto_id: number;
  producto_nombre?: string;
  cantidad: number;
  precio_unitario_usd: number;
  impuesto_id?: number;
  porcentaje_impuesto?: number;
  monto_impuesto_usd?: number;
  subtotal_usd: number;
  presentacion_id?: number | null;
  presentacion_nombre?: string | null;
  factor_conversion?: number | string;
  cantidad_base?: number | string;
}

export type EstadoPedido = 'COMPLETADO' | 'ANULADO';

export interface Pedido {
  id: number;
  fecha_hora: string;
  tercero_id?: number | null;
  tercero_identificacion?: string | null;
  cliente_nombre?: string | null;
  tasa_cambio_aplicada: number | string;
  base_imponible_usd: number | string;
  monto_impuesto_usd: number | string;
  total_usd: number | string;
  total_moneda_local: number | string;
  total_articulos?: number;
  estado: EstadoPedido;
  lineas?: PedidoLinea[];
}

export interface CompraLinea {
  id?: number;
  compra_id?: number;
  producto_id: number;
  producto_nombre?: string;
  cantidad: number;
  costo_unitario_usd: number;
  impuesto_id: number;
  impuesto_nombre?: string;
  porcentaje_impuesto: number;
  monto_impuesto_usd: number;
  subtotal_usd: number;
  presentacion_id?: number | null;
  presentacion_nombre?: string | null;
  factor_conversion?: number | string;
  cantidad_base?: number | string;
}

export type EstadoCompra = 'PROCESO' | 'COMPLETADO' | 'ANULADO';

export interface Compra {
  id: number;
  numero_factura: string;
  tercero_id: number;
  proveedor_nombre?: string;
  proveedor_identificacion?: string;
  fecha_emision: string;
  tasa_cambio_aplicada: number | string;
  base_imponible_usd: number | string;
  monto_impuesto_usd: number | string;
  total_usd: number | string;
  total_moneda_local: number | string;
  observaciones?: string | null;
  estado: EstadoCompra;
  creado_en?: string;
  total_articulos?: number;
  lineas?: CompraLinea[];
}

export interface DashboardData {
  tasaActual: Tasa | null;
  hoy: {
    pedidos_hoy: number;
    total_usd_hoy: number;
    total_local_hoy: number;
  };
  total: {
    pedidos_totales: number;
    total_usd_total: number;
    total_local_total: number;
  };
  comprasResumen?: {
    total_compras: number;
    total_usd_compras: number;
    total_local_compras: number;
  };
  inventarioResumen?: {
    total_productos: number;
    total_unidades: number;
    valor_inventario_costo: number;
    productos_bajo_stock: number;
  };
  ventasDiarias: {
    fecha: string;
    etiqueta: string;
    total_usd: number;
    total_local: number;
    cantidad_pedidos: number;
  }[];
  ventasSemanales: {
    semana: string;
    etiqueta: string;
    total_usd: number;
    total_local: number;
    cantidad_pedidos: number;
  }[];
  ventasMensuales: {
    mes: string;
    etiqueta: string;
    total_usd: number;
    total_local: number;
    cantidad_pedidos: number;
  }[];
  topProductos: {
    id: number;
    nombre: string;
    unidades_vendidas: number;
    ingresos_usd: number;
  }[];
}
