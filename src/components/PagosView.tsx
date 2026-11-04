'use client';

import React, { useState, useEffect, Fragment } from 'react';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Search,
  Filter,
  Calendar,
  Building,
  User,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Ban,
  Clock,
  Loader2,
  RefreshCw,
  FileText,
  DollarSign,
  X,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Pago, TipoPago, CuentaBancaria, Tercero, TipoOperacionPago, DocumentoPendiente } from '@/types';
import PosNumberInput from '@/components/PosNumberInput';

interface PagosViewProps {
  isDarkMode?: boolean;
  initialAction?: {
    tipo_operacion: TipoOperacionPago;
    pedido_id?: number;
    compra_id?: number;
    tercero_id?: number;
    monto_original?: number;
    moneda?: 'USD' | 'VES';
  } | null;
}

export default function PagosView({ isDarkMode = false, initialAction = null }: PagosViewProps) {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [tiposPago, setTiposPago] = useState<TipoPago[]>([]);
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [terceros, setTerceros] = useState<Tercero[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [operacionFilter, setOperacionFilter] = useState<'TODOS' | TipoOperacionPago>('TODOS');

  // Facturas y compras pendientes para imputación
  const [documentosPendientes, setDocumentosPendientes] = useState<DocumentoPendiente[]>([]);
  const [loadingPendientes, setLoadingPendientes] = useState(false);
  const [imputacionesSeleccionadas, setImputacionesSeleccionadas] = useState<Record<string, number>>({});
  const [selectedDocToAdd, setSelectedDocToAdd] = useState<string>('');

  // Modal Nuevo Pago / Cobro
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form State
  const [tipoOperacion, setTipoOperacion] = useState<TipoOperacionPago>('COBRO_VENTA');
  const [pedidoId, setPedidoId] = useState<number | ''>('');
  const [compraId, setCompraId] = useState<number | ''>('');
  const [terceroId, setTerceroId] = useState<number | ''>('');
  const [tipoPagoId, setTipoPagoId] = useState<number | ''>('');
  const [cuentaBancariaId, setCuentaBancariaId] = useState<number | ''>('');
  const [moneda, setMoneda] = useState<'USD' | 'VES'>('USD');
  const [montoOriginal, setMontoOriginal] = useState<string>('');
  const [tasaCambio, setTasaCambio] = useState<number>(36.5);
  const [referencia, setReferencia] = useState('');
  const [nota, setNota] = useState('');

  // Expandir detalles de pago
  const [expandedPagoId, setExpandedPagoId] = useState<number | null>(null);

  // Cargar datos
  const loadData = async () => {
    setLoading(true);
    try {
      const [pagosRes, tpRes, cbRes, terRes, tasaRes] = await Promise.all([
        fetch('/api/pagos'),
        fetch('/api/tipos-pago'),
        fetch('/api/cuentas-bancarias'),
        fetch('/api/terceros?active=true'),
        fetch('/api/tasa'),
      ]);

      const pagosData = await pagosRes.json();
      const tpData = await tpRes.json();
      const cbData = await cbRes.json();
      const terData = await terRes.json();
      const tasaData = await tasaRes.json();

      if (pagosData.success) setPagos(pagosData.pagos || []);
      if (tpData.success) {
        setTiposPago(tpData.tiposPago || []);
        if (tpData.tiposPago?.length > 0 && !tipoPagoId) setTipoPagoId(tpData.tiposPago[0].id);
      }
      if (cbData.success) {
        setCuentas(cbData.cuentas || []);
        if (cbData.cuentas?.length > 0 && !cuentaBancariaId) setCuentaBancariaId(cbData.cuentas[0].id);
      }
      if (terData.success) setTerceros(terData.terceros || []);
      if (tasaData.success && tasaData.rate) {
        setTasaCambio(Number(tasaData.rate.tasa));
      }
    } catch (e) {
      console.error('Error cargando gestión de pagos:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Si se abre con una acción inicial (por ejemplo desde ventas o compras)
  useEffect(() => {
    if (initialAction) {
      setTipoOperacion(initialAction.tipo_operacion);
      if (initialAction.pedido_id) setPedidoId(initialAction.pedido_id);
      if (initialAction.compra_id) setCompraId(initialAction.compra_id);
      if (initialAction.tercero_id) setTerceroId(initialAction.tercero_id);
      if (initialAction.monto_original) setMontoOriginal(String(initialAction.monto_original));
      if (initialAction.moneda) setMoneda(initialAction.moneda);
      setShowAddModal(true);
    }
  }, [initialAction]);

  // Cargar facturas/compras pendientes cuando cambia el tercero o el tipo de operación
  const fetchPendientes = async (tId: number | '', op: TipoOperacionPago) => {
    setLoadingPendientes(true);
    try {
      const tipoDoc = op.startsWith('COBRO') || op.startsWith('ABONO_VENTA') ? 'VENTA' : 'COMPRA';
      let url = `/api/pagos/pendientes?tipo=${tipoDoc}`;
      if (tId) url += `&tercero_id=${tId}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setDocumentosPendientes(data.documentos || []);
      } else {
        setDocumentosPendientes([]);
      }
    } catch (e) {
      console.error('Error al cargar pendientes:', e);
      setDocumentosPendientes([]);
    } finally {
      setLoadingPendientes(false);
    }
  };

  useEffect(() => {
    if (showAddModal) {
      fetchPendientes(terceroId, tipoOperacion);
    }
  }, [terceroId, tipoOperacion, showAddModal]);

  const openNewPagoModal = (defaultOp: TipoOperacionPago = 'COBRO_VENTA') => {
    setTipoOperacion(defaultOp);
    setTerceroId('');
    setPedidoId('');
    setCompraId('');
    setMontoOriginal('');
    setReferencia('');
    setNota('');
    setImputacionesSeleccionadas({});
    setSelectedDocToAdd('');
    setModalError(null);
    if (tiposPago.length > 0) setTipoPagoId(tiposPago[0].id);
    if (defaultOp) {
      const tp = tiposPago[0];
      const isEf = tp?.codigo?.startsWith('EFECTIVO');
      const filteredCbs = cuentas.filter(
        (c) => (isEf ? c.banco_tipo === 'CAJA' : c.banco_tipo === 'BANCO') && c.moneda === tp?.moneda
      );
      if (filteredCbs.length > 0) setCuentaBancariaId(filteredCbs[0].id);
      else setCuentaBancariaId('');
    }
    setShowAddModal(true);
  };

  // Manejar imputación a una factura
  const handleSetImputacion = (docKey: string, monto: number) => {
    setImputacionesSeleccionadas((prev) => {
      const copy = { ...prev };
      if (monto <= 0) {
        delete copy[docKey];
      } else {
        copy[docKey] = monto;
      }
      return copy;
    });
  };

  // Autocalcular monto total del pago sumando las imputaciones si el usuario lo desea
  const totalImputadoUsd = Object.values(imputacionesSeleccionadas).reduce((a, b) => a + b, 0);

  const handleCreatePago = async (e: React.FormEvent) => {
    e.preventDefault();
    const monto = parseFloat(montoOriginal);
    if (!monto || monto <= 0) {
      setModalError('Ingresa un monto válido mayor a 0');
      return;
    }
    if (!tipoPagoId) {
      setModalError('Selecciona el método de pago');
      return;
    }

    setSubmitting(true);
    setModalError(null);

    try {
      const eqUsd = moneda === 'USD' ? monto : Number((monto / tasaCambio).toFixed(2));

      // Preparar arreglo de imputaciones
      const imputaciones = Object.entries(imputacionesSeleccionadas).map(([key, impUsd]) => {
        const [tipoDoc, docIdStr] = key.split('-');
        const docId = Number(docIdStr);
        const impOrig = moneda === 'USD' ? impUsd : Number((impUsd * tasaCambio).toFixed(2));
        return {
          tipo_documento: tipoDoc as 'VENTA' | 'COMPRA',
          pedido_id: tipoDoc === 'VENTA' ? docId : null,
          compra_id: tipoDoc === 'COMPRA' ? docId : null,
          monto_imputado_original: impOrig,
          monto_imputado_usd: impUsd,
        };
      });

      const res = await fetch('/api/pagos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo_operacion: tipoOperacion,
          pedido_id: pedidoId ? Number(pedidoId) : null,
          compra_id: compraId ? Number(compraId) : null,
          tercero_id: terceroId ? Number(terceroId) : null,
          tipo_pago_id: Number(tipoPagoId),
          cuenta_bancaria_id: cuentaBancariaId ? Number(cuentaBancariaId) : null,
          moneda,
          monto_original: monto,
          tasa_cambio: tasaCambio,
          monto_equivalente_usd: eqUsd,
          referencia: referencia.trim() || undefined,
          nota: nota.trim() || undefined,
          imputaciones,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        loadData();
      } else {
        setModalError(data.message || 'Error al registrar el pago');
      }
    } catch {
      setModalError('Error de conexión al guardar el pago');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtrado
  const filteredPagos = pagos.filter((p) => {
    const term = searchTerm.toLowerCase();
    const matchTerm =
      (p.referencia && p.referencia.toLowerCase().includes(term)) ||
      (p.tipo_pago_nombre && p.tipo_pago_nombre.toLowerCase().includes(term)) ||
      (p.cuenta_bancaria_nombre && p.cuenta_bancaria_nombre.toLowerCase().includes(term)) ||
      (p.tercero_nombre && p.tercero_nombre.toLowerCase().includes(term)) ||
      (p.creado_por_nombre && p.creado_por_nombre.toLowerCase().includes(term));

    const matchOp = operacionFilter === 'TODOS' || p.tipo_operacion === operacionFilter;

    return matchTerm && matchOp;
  });

  // Cuentas filtradas según el método de pago seleccionado:
  // 1. Si es efectivo (EFECTIVO_USD, EFECTIVO_VES): SOLO CAJAS DE EFECTIVO con la misma moneda.
  // 2. Si es bancario (Pago móvil, punto, transferencia, zelle, etc.): SOLO BANCOS con la misma moneda.
  const currentSelectedTp = tiposPago.find((t) => t.id === Number(tipoPagoId));
  const isEfectivo = currentSelectedTp?.codigo?.startsWith('EFECTIVO');
  const targetMoneda = currentSelectedTp ? currentSelectedTp.moneda : moneda;

  const cuentasFiltradas = cuentas.filter((c) => {
    const matchTipo = isEfectivo ? c.banco_tipo === 'CAJA' : c.banco_tipo === 'BANCO';
    const matchMoneda = c.moneda === targetMoneda;
    return matchTipo && matchMoneda;
  });

  // Totales
  const totalCobrosUsd = pagos
    .filter((p) => p.tipo_operacion.startsWith('COBRO') || p.tipo_operacion.startsWith('ABONO_VENTA'))
    .reduce((sum, p) => sum + Number(p.monto_equivalente_usd), 0);

  const totalPagosUsd = pagos
    .filter((p) => p.tipo_operacion.startsWith('PAGO') || p.tipo_operacion.startsWith('ABONO_COMPRA'))
    .reduce((sum, p) => sum + Number(p.monto_equivalente_usd), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-black flex items-center gap-2.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            <Wallet className="w-7 h-7 text-indigo-500" />
            Gestión de Pagos y Cobros
          </h2>
          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Control centralizado de ingresos por ventas, egresos por compras, facturas asociadas y movimientos en bancos/cajas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openNewPagoModal('COBRO_VENTA')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4" /> + Registrar Cobro
          </button>
          <button
            onClick={() => openNewPagoModal('PAGO_COMPRA')}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-rose-600/20 flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4" /> - Registrar Pago
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-2xl border transition-colors ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Cobranzas Totales (Ingresos)</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            ${totalCobrosUsd.toFixed(2)} USD
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Cobros directos y abonos a facturas de venta</p>
        </div>

        <div className={`p-4 rounded-2xl border transition-colors ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Pagos Realizados (Egresos)</span>
            <ArrowUpRight className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
            ${totalPagosUsd.toFixed(2)} USD
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Pagos directos y cancelaciones de compras</p>
        </div>

        <div className={`p-4 rounded-2xl border transition-colors ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Balance de Operaciones</span>
            <DollarSign className="w-4 h-4 text-indigo-500" />
          </div>
          <div className={`text-xl font-black font-mono ${totalCobrosUsd - totalPagosUsd >= 0 ? 'text-indigo-500' : 'text-amber-500'}`}>
            ${(totalCobrosUsd - totalPagosUsd).toFixed(2)} USD
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Diferencial neto recaudado</p>
        </div>
      </div>

      {/* Filtros y Buscador */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row gap-3 items-center justify-between ${
        isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por referencia, cliente, proveedor, método o cuenta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border ${
              isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
            }`}
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={operacionFilter}
            onChange={(e) => setOperacionFilter(e.target.value as any)}
            className={`px-3 py-2 rounded-xl text-xs border font-medium ${
              isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <option value="TODOS">Todos los movimientos</option>
            <option value="COBRO_VENTA">Cobros de Venta</option>
            <option value="ABONO_VENTA">Abonos de Venta</option>
            <option value="PAGO_COMPRA">Pagos de Compra</option>
            <option value="ABONO_COMPRA">Abonos de Compra</option>
          </select>

          <button
            onClick={loadData}
            title="Refrescar datos"
            className="p-2 border rounded-xl hover:bg-slate-500/10 text-slate-400 hover:text-white transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabla de Pagos Realizados */}
      <div className={`rounded-2xl border overflow-hidden ${
        isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                isDarkMode ? 'border-slate-800 text-slate-400 bg-slate-900/80' : 'border-slate-200 text-slate-500 bg-slate-50'
              }`}>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Fecha / Hora</th>
                <th className="py-3 px-4">Tipo Movimiento</th>
                <th className="py-3 px-4">Tercero / Cliente</th>
                <th className="py-3 px-4">Facturas Asociadas</th>
                <th className="py-3 px-4">Método</th>
                <th className="py-3 px-4">Caja / Banco</th>
                <th className="py-3 px-4">Referencia</th>
                <th className="py-3 px-4 text-right">Monto Original</th>
                <th className="py-3 px-4 text-right">Equiv. USD</th>
                <th className="py-3 px-4 text-center">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                    Cargando transacciones de pago...
                  </td>
                </tr>
              ) : filteredPagos.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400 italic">
                    No se encontraron transacciones con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredPagos.map((p) => {
                  const isIngreso = p.tipo_operacion.startsWith('COBRO') || p.tipo_operacion.startsWith('ABONO_VENTA');
                  const hasDocs = p.documentos && p.documentos.length > 0;
                  const isExpanded = expandedPagoId === p.id;

                  return (
                    <Fragment key={p.id}>
                      <tr className="hover:bg-slate-500/5 transition">
                        <td className="py-3 px-4 font-mono text-slate-400">#{p.id}</td>
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(p.fecha_pago).toLocaleDateString('es-VE')} {new Date(p.fecha_pago).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isIngreso
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                          }`}>
                            {isIngreso ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            {p.tipo_operacion.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {p.tercero_nombre ? (
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {p.tercero_nombre}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">General / Contado</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold">
                          {hasDocs ? (
                            <div className="flex flex-wrap gap-1 items-center">
                              {p.documentos!.slice(0, 2).map((d) => (
                                <span
                                  key={d.id}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    d.tipo_documento === 'VENTA'
                                      ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                                      : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                  }`}
                                >
                                  {d.numero_factura || `#${d.pedido_id || d.compra_id}`}
                                </span>
                              ))}
                              {p.documentos!.length > 2 && (
                                <span className="text-[10px] text-slate-400 font-bold">
                                  +{p.documentos!.length - 2} más
                                </span>
                              )}
                            </div>
                          ) : p.pedido_id ? (
                            <span className="text-indigo-500">Venta #{p.pedido_id}</span>
                          ) : p.compra_id ? (
                            <span className="text-amber-500">Compra #{p.compra_id}</span>
                          ) : (
                            <span className="text-slate-400">Sin Factura</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {p.tipo_pago_nombre || 'N/A'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {p.cuenta_bancaria_nombre ? (
                            <span>
                              [{p.banco_tipo || 'CUENTA'}] {p.cuenta_bancaria_nombre}
                            </span>
                          ) : (
                            <span className="italic">Sin asignar</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">
                          {p.referencia || '-'}
                        </td>
                        <td className={`py-3 px-4 text-right font-mono font-bold ${isIngreso ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {p.moneda === 'VES' ? 'Bs. ' : '$'}
                          {Number(p.monto_original).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-200 font-bold">
                          ${Number(p.monto_equivalente_usd).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {hasDocs ? (
                            <button
                              onClick={() => setExpandedPagoId(isExpanded ? null : p.id)}
                              className="p-1 rounded-lg hover:bg-slate-500/10 text-slate-400 hover:text-indigo-400 transition"
                              title="Ver facturas asociadas a este pago"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[10px]">-</span>
                          )}
                        </td>
                      </tr>

                      {/* Fila desplegable con detalle de imputaciones a facturas */}
                      {isExpanded && hasDocs && (
                        <tr key={`exp-${p.id}`} className="bg-slate-500/5">
                          <td colSpan={11} className="p-3 pl-12">
                            <div className={`p-3 rounded-xl border text-xs space-y-2 ${
                              isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'
                            }`}>
                              <div className="font-bold text-slate-400 flex items-center gap-1.5 text-[11px] uppercase">
                                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                                Detalle de Imputación de Facturas para el Pago #{p.id}:
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                {p.documentos!.map((doc) => (
                                  <div
                                    key={doc.id}
                                    className={`p-2.5 rounded-lg border flex items-center justify-between ${
                                      isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'
                                    }`}
                                  >
                                    <div>
                                      <div className="font-bold flex items-center gap-1">
                                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                                        {doc.numero_factura || `#${doc.pedido_id || doc.compra_id}`}
                                      </div>
                                      <div className="text-[10px] text-slate-400">
                                        Tipo: {doc.tipo_documento}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-mono font-bold text-emerald-500">
                                        ${Number(doc.monto_imputado_usd).toFixed(2)} USD
                                      </div>
                                      <div className="font-mono text-[10px] text-slate-400">
                                        {Number(doc.monto_imputado_original).toLocaleString('es-VE', { minimumFractionDigits: 2 })} {p.moneda}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Registrar Cobro / Pago Manual con Selección de Facturas */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className={`w-full max-w-3xl rounded-2xl border shadow-2xl p-6 transition-all my-8 ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold flex items-center gap-2">
                {tipoOperacion.startsWith('COBRO') ? (
                  <span className="text-emerald-500 flex items-center gap-1.5">
                    <ArrowDownLeft className="w-5 h-5" /> Registrar Cobro / Ingreso
                  </span>
                ) : (
                  <span className="text-rose-500 flex items-center gap-1.5">
                    <ArrowUpRight className="w-5 h-5" /> Registrar Pago / Egreso
                  </span>
                )}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreatePago} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-400">Tipo de Operación</label>
                  <select
                    value={tipoOperacion}
                    onChange={(e) => setTipoOperacion(e.target.value as TipoOperacionPago)}
                    className={`w-full px-3 py-2 rounded-xl border font-bold ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <option value="COBRO_VENTA">COBRO DE VENTA (INGRESO)</option>
                    <option value="ABONO_VENTA">ABONO A CRÉDITO DE CLIENTE (INGRESO)</option>
                    <option value="PAGO_COMPRA">PAGO DE COMPRA (EGRESO)</option>
                    <option value="ABONO_COMPRA">ABONO A CRÉDITO DE PROVEEDOR (EGRESO)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-400">
                    {tipoOperacion.startsWith('COBRO') || tipoOperacion.startsWith('ABONO_VENTA') ? 'Cliente' : 'Proveedor'} (Filtra facturas adeudadas)
                  </label>
                  <select
                    value={terceroId}
                    onChange={(e) => setTerceroId(e.target.value ? Number(e.target.value) : '')}
                    className={`w-full px-3 py-2 rounded-xl border font-medium ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <option value="">-- Ver todas las facturas pendientes --</option>
                    {terceros
                      .filter((t) => {
                        const isVenta = tipoOperacion.startsWith('COBRO') || tipoOperacion.startsWith('ABONO_VENTA');
                        return isVenta ? (t.tipo === 'CLIENTE' || t.tipo === 'AMBOS') : (t.tipo === 'PROVEEDOR' || t.tipo === 'AMBOS');
                      })
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.identificacion} - {t.razon_social_nombre}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* SECCIÓN RELACIÓN CON FACTURAS PENDIENTES (RELACIÓN MUCHOS A MUCHOS - MODO AGREGAR) */}
              <div className={`p-3.5 rounded-xl border ${
                isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold flex items-center gap-1.5 text-slate-300">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    Facturas / Documentos a Abonar o Cancelar
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Total Imputado: <strong className="text-emerald-500 font-mono">${totalImputadoUsd.toFixed(2)} USD</strong>
                  </span>
                </div>

                {loadingPendientes ? (
                  <div className="py-4 text-center text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin inline-block mr-2 text-indigo-400" />
                    Buscando facturas pendientes...
                  </div>
                ) : documentosPendientes.length === 0 ? (
                  <div className="py-3 text-center text-slate-400 text-[11px] italic">
                    No hay facturas pendientes con saldo adeudado para este criterio. Puedes registrar un pago libre.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Selector para AGREGAR una factura a la lista de imputación */}
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <select
                        value={selectedDocToAdd}
                        onChange={(e) => setSelectedDocToAdd(e.target.value)}
                        className={`flex-1 w-full px-3 py-2 rounded-xl border text-xs font-medium ${
                          isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      >
                        <option value="">-- Seleccionar factura o pedido pendiente para agregar --</option>
                        {documentosPendientes
                          .filter((doc) => !(`${doc.tipo_documento}-${doc.id}` in imputacionesSeleccionadas))
                          .map((doc) => (
                            <option key={`${doc.tipo_documento}-${doc.id}`} value={`${doc.tipo_documento}-${doc.id}`}>
                              {doc.numero_documento} • Saldo: ${Number(doc.saldo_pendiente_usd).toFixed(2)} USD • {doc.tercero_nombre}
                            </option>
                          ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => {
                          if (!selectedDocToAdd) return;
                          const doc = documentosPendientes.find(
                            (d) => `${d.tipo_documento}-${d.id}` === selectedDocToAdd
                          );
                          if (doc) {
                            const saldo = Number(doc.saldo_pendiente_usd);
                            handleSetImputacion(selectedDocToAdd, saldo);
                            setSelectedDocToAdd('');
                            // Si el monto del pago está vacío, sugerirlo
                            if (!montoOriginal || parseFloat(montoOriginal) === 0) {
                              setMontoOriginal(moneda === 'USD' ? String(saldo) : String((saldo * tasaCambio).toFixed(2)));
                            }
                          }
                        }}
                        disabled={!selectedDocToAdd}
                        className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" /> Agregar Factura
                      </button>
                    </div>

                    {/* Lista solo de las facturas que el usuario decidió agregar */}
                    {Object.keys(imputacionesSeleccionadas).length === 0 ? (
                      <div className="p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-400 text-[11px] italic">
                        No has agregado ninguna factura aún. Selecciona una en el desplegable y haz clic en "Agregar Factura", o déjalo vacío si es un pago libre.
                      </div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                        {Object.entries(imputacionesSeleccionadas).map(([docKey, currentVal]) => {
                          const doc = documentosPendientes.find(
                            (d) => `${d.tipo_documento}-${d.id}` === docKey
                          );
                          const saldoUsd = doc ? Number(doc.saldo_pendiente_usd) : currentVal;

                          return (
                            <div
                              key={docKey}
                              className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition ${
                                isDarkMode ? 'bg-indigo-950/40 border-indigo-500/40' : 'bg-indigo-50 border-indigo-200'
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-800 dark:text-white">
                                    {doc?.numero_documento || docKey}
                                  </span>
                                  {doc?.condicion_pago && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-500/10 text-slate-400">
                                      {doc.condicion_pago}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 truncate">
                                  {doc?.tercero_nombre || ''} {doc?.fecha ? `• Fecha: ${new Date(doc.fecha).toLocaleDateString('es-VE')}` : ''}
                                </div>
                              </div>

                              <div className="text-right whitespace-nowrap">
                                <div className="text-[11px] text-slate-400">Saldo Pendiente:</div>
                                <div className="font-mono font-bold text-amber-500">
                                  ${saldoUsd.toFixed(2)} USD
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max={saldoUsd}
                                  placeholder="0.00"
                                  value={currentVal > 0 ? currentVal : ''}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    handleSetImputacion(docKey, Math.min(val, saldoUsd));
                                  }}
                                  className={`w-24 px-2 py-1.5 rounded-lg border font-mono font-bold text-right text-xs ${
                                    isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                                  }`}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSetImputacion(docKey, 0)}
                                  className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition whitespace-nowrap cursor-pointer bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
                                >
                                  Quitar
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-400">Método de Pago *</label>
                  <select
                    value={tipoPagoId}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      setTipoPagoId(id);
                      const tp = tiposPago.find((t) => t.id === id);
                      if (tp) {
                        setMoneda(tp.moneda);
                        // Auto-ajustar la cuenta/caja compatible con la moneda y naturaleza del pago
                        const isEf = tp.codigo?.startsWith('EFECTIVO');
                        const compatible = cuentas.find(
                          (c) => (isEf ? c.banco_tipo === 'CAJA' : c.banco_tipo === 'BANCO') && c.moneda === tp.moneda
                        );
                        if (compatible) {
                          setCuentaBancariaId(compatible.id);
                        } else {
                          setCuentaBancariaId('');
                        }
                      }
                    }}
                    required
                    className={`w-full px-3 py-2 rounded-xl border ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    {tiposPago.map((tp) => (
                      <option key={tp.id} value={tp.id}>
                        {tp.nombre} ({tp.moneda})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-400">
                    {isEfectivo ? 'Caja de Efectivo Receptora / Emisora *' : 'Cuenta Bancaria Afectada *'}
                  </label>
                  <select
                    value={cuentaBancariaId}
                    onChange={(e) => setCuentaBancariaId(e.target.value ? Number(e.target.value) : '')}
                    className={`w-full px-3 py-2 rounded-xl border ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    {cuentasFiltradas.length === 0 ? (
                      <option value="">
                        -- No hay {isEfectivo ? 'caja' : 'cuenta bancaria'} en {targetMoneda} registrada --
                      </option>
                    ) : (
                      cuentasFiltradas.map((c) => (
                        <option key={c.id} value={c.id}>
                          [{c.banco_tipo}] {c.nombre} ({c.moneda})
                        </option>
                      ))
                    )}
                  </select>
                  {cuentasFiltradas.length === 0 && (
                    <p className="text-[10px] text-amber-500 mt-1">
                      ⚠️ Registra una {isEfectivo ? 'Caja de efectivo' : 'Cuenta de banco'} en moneda {targetMoneda} en el módulo de Bancos y Cajas.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-400">Moneda de la Operación</label>
                  <div className={`w-full px-3 py-2 rounded-xl border font-bold flex items-center justify-between ${
                    isDarkMode ? 'bg-slate-800/80 border-slate-700 text-white' : 'bg-slate-100 border-slate-200 text-slate-800'
                  }`}>
                    <span>{moneda === 'USD' ? 'Dólares ($ USD)' : 'Bolívares (Bs. VES)'}</span>
                    <span className="text-[10px] text-slate-400 font-normal">(Vinculada al método)</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-400">Monto del Pago *</label>
                    {totalImputadoUsd > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const sugerido = moneda === 'USD' ? totalImputadoUsd : (totalImputadoUsd * tasaCambio);
                          setMontoOriginal(sugerido.toFixed(2));
                        }}
                        className="text-[10px] text-indigo-400 hover:underline cursor-pointer"
                      >
                        Copiar total facturas ({moneda === 'USD' ? `$${totalImputadoUsd.toFixed(2)}` : `Bs. ${(totalImputadoUsd * tasaCambio).toFixed(2)}`})
                      </button>
                    )}
                  </div>
                  <PosNumberInput
                    value={montoOriginal}
                    onChange={(val) => setMontoOriginal(String(val))}
                    decimals={2}
                    className={`w-full px-3 py-2 rounded-xl border font-mono font-bold text-sm ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-400">Referencia de Pago (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Ref Bancaria / N° de Aprobación"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border font-mono ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-400">Nota u Observación (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Abono a factura 1024 o notas de la transacción"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold hover:bg-slate-500/10 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md cursor-pointer ${
                    tipoOperacion.startsWith('COBRO')
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                      : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                  }`}
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Confirmar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
