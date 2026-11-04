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

export type CondicionPago =
  | 'CONTADO'
  | 'CREDITO'
  | 'CREDITO_7'
  | 'CREDITO_15'
  | 'CREDITO_30'
  | 'CREDITO_45';

export interface TipoPago {
  id: number;
  codigo: string;
  nombre: string;
  moneda: 'USD' | 'VES';
  requiere_referencia: boolean;
  activo: boolean;
  creado_en?: string;
}

export type TipoEntidadFinanciera = 'BANCO' | 'CAJA';

export interface Banco {
  id: number;
  codigo?: string | null;
  nombre: string;
  tipo: TipoEntidadFinanciera;
  activo: boolean;
  creado_en?: string;
}

export type TipoCuentaBancaria = 'CORRIENTE' | 'AHORRO' | 'CAJA_EFECTIVO' | 'VIRTUAL';

export interface CuentaBancaria {
  id: number;
  banco_id: number;
  banco_nombre?: string;
  banco_tipo?: TipoEntidadFinanciera;
  nombre: string;
  tipo_cuenta: TipoCuentaBancaria;
  numero_cuenta?: string | null;
  moneda: 'USD' | 'VES';
  saldo_actual: number | string;
  activo: boolean;
  creado_en?: string;
}

export type TipoOperacionPago = 'COBRO_VENTA' | 'PAGO_COMPRA' | 'ABONO_VENTA' | 'ABONO_COMPRA';
export type EstadoPago = 'APROBADO' | 'ANULADO';

export interface Pago {
  id: number;
  tipo_operacion: TipoOperacionPago;
  pedido_id?: number | null;
  compra_id?: number | null;
  tercero_id?: number | null;
  tercero_nombre?: string | null;
  tipo_pago_id: number;
  tipo_pago_nombre?: string;
  cuenta_bancaria_id?: number | null;
  cuenta_bancaria_nombre?: string | null;
  fecha_pago: string;
  moneda: 'USD' | 'VES';
  monto_original: number | string;
  tasa_cambio: number | string;
  monto_equivalente_usd: number | string;
  referencia?: string | null;
  nota?: string | null;
  estado: EstadoPago;
  creado_en?: string;
  creado_por?: number | null;
  creado_por_nombre?: string | null;
  actualizado_en?: string | null;
  actualizado_por?: number | null;
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
  condicion_pago?: CondicionPago;
  tipo_pago_id?: number | null;
  tipo_pago_nombre?: string | null;
  tipo_pago_moneda?: 'USD' | 'VES' | null;
  referencia_pago?: string | null;
  fecha_vencimiento?: string | null;
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
  condicion_pago?: CondicionPago;
  tipo_pago_id?: number | null;
  tipo_pago_nombre?: string | null;
  tipo_pago_moneda?: 'USD' | 'VES' | null;
  referencia_pago?: string | null;
  fecha_vencimiento?: string | null;
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

export type ModuloPermiso =
  | 'pos'
  | 'orders'
  | 'compras'
  | 'products'
  | 'terceros'
  | 'rates'
  | 'impuestos'
  | 'reports'
  | 'reports_profit'
  | 'users'
  | 'maintenance';

export interface Rol {
  id: number;
  nombre: string;
  descripcion?: string | null;
  permisos: ModuloPermiso[];
  activo: boolean;
  creado_en?: string;
  total_usuarios?: number;
}

export interface Usuario {
  id: number;
  username: string;
  nombre_completo: string;
  email?: string | null;
  rol_id: number;
  rol_nombre?: string;
  permisos?: ModuloPermiso[];
  activo: boolean;
  ultimo_acceso?: string | null;
  creado_en?: string;
}

