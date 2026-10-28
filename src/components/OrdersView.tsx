'use client';

import { useState, useEffect } from 'react';
import { Pedido, EstadoPedido } from '@/types';
import {
  Receipt,
  Search,
  Calendar,
  User,
  Eye,
  RefreshCw,
  Clock,
  Ban,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Info,
} from 'lucide-react';

interface OrdersViewProps {
  isDarkMode?: boolean;
  onRefreshProducts?: () => void;
}

export default function OrdersView({ isDarkMode = false, onRefreshProducts }: OrdersViewProps) {
  const [orders, setOrders] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETADO' | 'ANULADO'>('ALL');
  
  // Details Modal
  const [selectedOrder, setSelectedOrder] = useState<Pedido | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Void / Anular Modal
  const [anularModalPedido, setAnularModalPedido] = useState<Pedido | null>(null);
  const [anularLines, setAnularLines] = useState<any[]>([]);
  const [loadingAnularLines, setLoadingAnularLines] = useState(false);
  const [isVoiding, setIsVoiding] = useState(false);
  const [voidError, setVoidError] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pedidos?limit=150');
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch (e) {
      console.error('Error fetching orders:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const openOrderDetails = async (orderId: number) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/pedidos?id=${orderId}`);
      const data = await res.json();
      if (data.success) {
        setSelectedOrder(data.order);
      }
    } catch (e) {
      console.error('Error fetching order details:', e);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Open the void confirmation modal
  const openAnularModal = async (pedido: Pedido) => {
    setAnularModalPedido(pedido);
    setVoidError(null);
    setLoadingAnularLines(true);
    try {
      const res = await fetch(`/api/pedidos?id=${pedido.id}`);
      const data = await res.json();
      if (data.success && data.order?.lineas) {
        setAnularLines(data.order.lineas);
      } else {
        setAnularLines([]);
      }
    } catch {
      setAnularLines([]);
    } finally {
      setLoadingAnularLines(false);
    }
  };

  // Execute voiding of an order
  const executeVoidOrder = async () => {
    if (!anularModalPedido) return;

    setIsVoiding(true);
    setVoidError(null);

    try {
      const res = await fetch('/api/pedidos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: anularModalPedido.id,
          estado: 'ANULADO',
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Refresh local orders list
        await fetchOrders();
        // Refresh products and stats in parent
        if (onRefreshProducts) {
          onRefreshProducts();
        }
        // If details modal was open for this order, update it
        if (selectedOrder && selectedOrder.id === anularModalPedido.id) {
          setSelectedOrder({
            ...selectedOrder,
            estado: 'ANULADO',
          });
        }
        setAnularModalPedido(null);
      } else {
        setVoidError(data.message || 'Error al anular el pedido');
      }
    } catch (e: any) {
      setVoidError(e?.message || 'Error de conexión al procesar la anulación');
    } finally {
      setIsVoiding(false);
    }
  };

  const countCompletados = orders.filter((o) => (o.estado || 'COMPLETADO') === 'COMPLETADO').length;
  const countAnulados = orders.filter((o) => o.estado === 'ANULADO').length;

  const filteredOrders = orders.filter((o) => {
    const estado = o.estado || 'COMPLETADO';
    if (statusFilter !== 'ALL' && estado !== statusFilter) {
      return false;
    }

    const term = searchTerm.toLowerCase();
    const idMatch = String(o.id).includes(term);
    const clientMatch = o.cliente_nombre ? o.cliente_nombre.toLowerCase().includes(term) : false;
    const rifMatch = o.tercero_identificacion ? o.tercero_identificacion.toLowerCase().includes(term) : false;
    const dateMatch = o.fecha_hora ? o.fecha_hora.toLowerCase().includes(term) : false;
    return idMatch || clientMatch || rifMatch || dateMatch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex flex-col sm:flex-row gap-4 items-center justify-between p-5 rounded-2xl border transition-colors ${
        isDarkMode
          ? 'bg-slate-900/60 border-slate-800'
          : 'bg-white border-slate-200/90 shadow-sm'
      }`}>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-500/20">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h2 className={`text-xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Historial de Pedidos y Ventas
            </h2>
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Pedidos creados desde el Punto de Venta (POS) en estado Completo, con opción de anulación y retorno a stock
            </p>
          </div>
        </div>

        <div className="flex w-full sm:w-auto items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por ID, RIF o cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full rounded-xl pl-9 pr-3.5 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors ${
                isDarkMode
                  ? 'bg-slate-800/80 border-slate-700/80 text-white placeholder-slate-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>
          <button
            onClick={fetchOrders}
            disabled={loading}
            title="Recargar historial"
            className={`p-2 rounded-xl border transition shrink-0 ${
              isDarkMode
                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Status Filter Tabs & Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className={`inline-flex items-center p-1 rounded-xl border ${
          isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-100/80 border-slate-200'
        }`}>
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              statusFilter === 'ALL'
                ? isDarkMode
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-white text-slate-900 shadow-sm'
                : isDarkMode
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Todos
            <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${
              statusFilter === 'ALL'
                ? isDarkMode ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-800'
                : isDarkMode ? 'bg-slate-800/80 text-slate-500' : 'bg-slate-200/60 text-slate-600'
            }`}>
              {orders.length}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('COMPLETADO')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              statusFilter === 'COMPLETADO'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                : isDarkMode
                ? 'text-slate-400 hover:text-emerald-400'
                : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completos
            <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${
              statusFilter === 'COMPLETADO'
                ? 'bg-emerald-700/60 text-white'
                : isDarkMode ? 'bg-emerald-950/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {countCompletados}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('ANULADO')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              statusFilter === 'ANULADO'
                ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/20'
                : isDarkMode
                ? 'text-slate-400 hover:text-rose-400'
                : 'text-slate-600 hover:text-rose-700'
            }`}
          >
            <Ban className="w-3.5 h-3.5" />
            Anulados
            <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${
              statusFilter === 'ANULADO'
                ? 'bg-rose-700/60 text-white'
                : isDarkMode ? 'bg-rose-950/40 text-rose-400' : 'bg-rose-100 text-rose-700'
            }`}>
              {countAnulados}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Info className="w-3.5 h-3.5 text-indigo-500" />
          <span>Las ventas se originan en el POS como <strong>Completas</strong>. Al anular una venta se revierte el stock al inventario.</span>
        </div>
      </div>

      {/* Orders Table */}
      <div className={`rounded-2xl border overflow-hidden transition-colors ${
        isDarkMode
          ? 'bg-slate-900/60 border-slate-800/80 shadow-xl'
          : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className={`text-xs uppercase tracking-wider border-b transition-colors ${
              isDarkMode
                ? 'bg-slate-950/70 text-slate-400 border-slate-800'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}>
              <tr>
                <th className="py-3.5 px-5">ID Pedido</th>
                <th className="py-3.5 px-5">Fecha y Hora</th>
                <th className="py-3.5 px-5">Cliente</th>
                <th className="py-3.5 px-4 text-center">Estado</th>
                <th className="py-3.5 px-4 text-center">Artículos</th>
                <th className="py-3.5 px-5 text-right">Tasa Aplicada</th>
                <th className="py-3.5 px-5 text-right">Base USD</th>
                <th className="py-3.5 px-5 text-right">IVA USD</th>
                <th className="py-3.5 px-5 text-right">Total USD</th>
                <th className="py-3.5 px-5 text-right">Total Bs.</th>
                <th className="py-3.5 px-5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className={`divide-y transition-colors ${
              isDarkMode ? 'divide-slate-800/60' : 'divide-slate-100'
            }`}>
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-indigo-500 opacity-60" />
                    Cargando historial de pedidos...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    No se encontraron pedidos con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => {
                  const estado = o.estado || 'COMPLETADO';
                  const isAnulado = estado === 'ANULADO';

                  const dateObj = new Date(o.fecha_hora);
                  const formattedDate = dateObj.toLocaleDateString('es-VE', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  });
                  const formattedTime = dateObj.toLocaleTimeString('es-VE', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr
                      key={o.id}
                      className={`transition-colors ${
                        isAnulado
                          ? isDarkMode
                            ? 'bg-rose-950/10 hover:bg-rose-950/20 text-slate-400'
                            : 'bg-rose-50/40 hover:bg-rose-50/70 text-slate-600'
                          : isDarkMode
                          ? 'hover:bg-slate-800/40'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className={`py-4 px-5 font-mono font-bold text-xs ${
                        isAnulado
                          ? 'text-slate-400 line-through'
                          : isDarkMode
                          ? 'text-indigo-400'
                          : 'text-indigo-600'
                      }`}>
                        #{o.id}
                      </td>

                      <td className={`py-4 px-5 text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        <div className="flex items-center gap-1.5 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {formattedDate}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <Clock className="w-3 h-3" />
                          {formattedTime}
                        </div>
                      </td>

                      <td className={`py-4 px-5 font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        <div className="flex flex-col">
                          <span className="flex items-center gap-1.5 text-xs">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {o.cliente_nombre || 'Cliente General'}
                          </span>
                          {o.tercero_identificacion && (
                            <span className="font-mono text-[10px] text-slate-400 pl-5">
                              {o.tercero_identificacion}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Estado Badge */}
                      <td className="py-4 px-4 text-center">
                        {isAnulado ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isDarkMode
                              ? 'bg-rose-950/50 text-rose-300 border border-rose-800/60'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            <Ban className="w-3 h-3" />
                            Anulado
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isDarkMode
                              ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/60'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            <CheckCircle2 className="w-3 h-3" />
                            Completo
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-semibold ${
                          isDarkMode
                            ? 'bg-slate-800 text-slate-300 border border-slate-700'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {o.total_articulos || 0}
                        </span>
                      </td>

                      <td className={`py-4 px-5 text-right font-mono text-xs ${
                        isDarkMode ? 'text-slate-300' : 'text-slate-600'
                      }`}>
                        {Number(o.tasa_cambio_aplicada).toFixed(4)}
                      </td>

                      <td className="py-4 px-5 text-right font-mono text-xs text-slate-600 dark:text-slate-300">
                        ${Number(o.base_imponible_usd || o.total_usd).toFixed(2)}
                      </td>

                      <td className="py-4 px-5 text-right font-mono text-xs text-amber-600 dark:text-amber-400">
                        ${Number(o.monto_impuesto_usd || 0).toFixed(2)}
                      </td>

                      <td className={`py-4 px-5 text-right font-mono font-bold ${
                        isAnulado
                          ? 'text-slate-400 line-through'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        ${Number(o.total_usd).toFixed(2)}
                      </td>

                      <td className={`py-4 px-5 text-right font-mono font-bold ${
                        isAnulado
                          ? 'text-slate-400 line-through'
                          : isDarkMode
                          ? 'text-indigo-400'
                          : 'text-indigo-600'
                      }`}>
                        {Number(o.total_moneda_local).toLocaleString('es-VE', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        <span className="text-[10px] font-normal text-slate-400">Bs.</span>
                      </td>

                      {/* Actions: View Details and Anular Button */}
                      <td className="py-4 px-5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openOrderDetails(o.id)}
                            title="Ver detalle del pedido"
                            className={`p-1.5 rounded-lg transition ${
                              isDarkMode
                                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {!isAnulado ? (
                            <button
                              onClick={() => openAnularModal(o)}
                              title="Anular venta y devolver cantidades a inventario"
                              className={`p-1.5 rounded-lg transition ${
                                isDarkMode
                                  ? 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40'
                                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                              }`}
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          ) : (
                            <span
                              title="Este pedido ya ha sido anulado"
                              className="p-1.5 text-slate-400 opacity-40 cursor-not-allowed"
                            >
                              <Ban className="w-4 h-4" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Confirmar Anulación de Pedido */}
      {anularModalPedido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className={`border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden transition-colors ${
            isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Header */}
            <div className={`px-6 py-4 border-b flex justify-between items-center ${
              isDarkMode ? 'border-slate-800 bg-rose-950/20' : 'border-slate-100 bg-rose-50/50'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg border border-rose-500/20">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-bold text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    ¿Anular Pedido de Venta #{anularModalPedido.id}?
                  </h3>
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                    Esta acción restaurará el inventario vendido
                  </p>
                </div>
              </div>
              <button
                disabled={isVoiding}
                onClick={() => setAnularModalPedido(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                isDarkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cliente:</span>
                  <span className="font-semibold">{anularModalPedido.cliente_nombre || 'Cliente General'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Fecha y Hora:</span>
                  <span className="font-mono">{new Date(anularModalPedido.fecha_hora).toLocaleString('es-VE')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Venta:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    ${Number(anularModalPedido.total_usd).toFixed(2)} USD ({Number(anularModalPedido.total_moneda_local).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.)
                  </span>
                </div>
              </div>

              {/* Notice Banner */}
              <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
                isDarkMode ? 'bg-rose-950/20 border-rose-900/40 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                <Ban className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">
                    Consecuencias de anular esta venta:
                  </p>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px] opacity-90">
                    <li>El estado del pedido pasará a <strong className="underline">ANULADO</strong>.</li>
                    <li><strong>Se sumará automáticamente el stock al inventario</strong> de cada producto vendido para reponer las cantidades.</li>
                    <li>Esta venta dejará de contabilizarse en las estadísticas e ingresos del Dashboard.</li>
                  </ul>
                </div>
              </div>

              {/* Items preview to be returned */}
              <div>
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Artículos que retornarán al stock:
                </h4>
                {loadingAnularLines ? (
                  <div className="p-3 text-center text-xs text-slate-400">
                    <RefreshCw className="w-4 h-4 mx-auto animate-spin mb-1 text-indigo-500" />
                    Cargando artículos...
                  </div>
                ) : anularLines.length > 0 ? (
                  <div className={`max-h-36 overflow-y-auto rounded-xl border text-xs divide-y ${
                    isDarkMode ? 'border-slate-800 divide-slate-800 bg-slate-950/40' : 'border-slate-200 divide-slate-100 bg-white'
                  }`}>
                    {anularLines.map((line, idx) => (
                      <div key={idx} className="p-2.5 flex justify-between items-center">
                        <span className="font-medium truncate max-w-[280px]">
                          {line.producto_nombre}
                        </span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                          +{line.cantidad} un.
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Detalle de líneas no disponible.</p>
                )}
              </div>

              {voidError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {voidError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`px-6 py-3 border-t flex justify-end gap-2.5 ${
              isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50'
            }`}>
              <button
                type="button"
                disabled={isVoiding}
                onClick={() => setAnularModalPedido(null)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition border ${
                  isDarkMode
                    ? 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isVoiding}
                onClick={executeVoidOrder}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition shadow-lg shadow-rose-600/25 flex items-center gap-1.5"
              >
                {isVoiding ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Anulando y reponiendo stock...
                  </>
                ) : (
                  <>
                    <Ban className="w-3.5 h-3.5" />
                    Sí, Anular Venta y Restaurar Stock
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalle de Pedido */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className={`border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden transition-colors ${
            isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Header Modal */}
            <div className={`px-6 py-4 border-b flex justify-between items-center ${
              isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg border border-indigo-500/20">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`font-bold text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      Pedido #{selectedOrder.id}
                    </h3>
                    {selectedOrder.estado === 'ANULADO' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                        <Ban className="w-3 h-3" /> Anulado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" /> Completo
                      </span>
                    )}
                  </div>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Comprobante con desglose de impuestos y artículos
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {selectedOrder.estado === 'ANULADO' && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <Ban className="w-4 h-4 shrink-0" />
                  <span>Este pedido se encuentra <strong>ANULADO</strong>. Las cantidades fueron reincorporadas al inventario.</span>
                </div>
              )}

              <div className={`p-4 rounded-xl border grid grid-cols-2 gap-3 text-xs ${
                isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <span className="text-slate-400 block mb-0.5">Cliente:</span>
                  <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {selectedOrder.cliente_nombre || 'Cliente General'}
                  </span>
                  {selectedOrder.tercero_identificacion && (
                    <span className="font-mono text-[10px] text-slate-400 block">
                      {selectedOrder.tercero_identificacion}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Fecha y Hora:</span>
                  <span className={`font-mono ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {new Date(selectedOrder.fecha_hora).toLocaleString('es-VE')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Tasa Aplicada:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {Number(selectedOrder.tasa_cambio_aplicada).toFixed(4)} Bs. / USD
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Total Artículos:</span>
                  <span className={`font-mono font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {selectedOrder.lineas?.reduce((acc, l) => acc + Number(l.cantidad), 0) || 0} unidades
                  </span>
                </div>
              </div>

              {/* Order Lines */}
              <div>
                <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  Líneas del Pedido
                </h4>
                <div className={`rounded-xl border overflow-hidden ${
                  isDarkMode ? 'border-slate-800' : 'border-slate-200'
                }`}>
                  <table className="w-full text-xs text-left">
                    <thead className={`border-b ${
                      isDarkMode ? 'bg-slate-950/70 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}>
                      <tr>
                        <th className="py-2.5 px-3">Producto</th>
                        <th className="py-2.5 px-3 text-center">Cant.</th>
                        <th className="py-2.5 px-3 text-right">Precio USD</th>
                        <th className="py-2.5 px-3 text-center">IVA</th>
                        <th className="py-2.5 px-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${
                      isDarkMode ? 'divide-slate-800/60 text-slate-300' : 'divide-slate-100 text-slate-700'
                    }`}>
                      {selectedOrder.lineas?.map((line, idx) => (
                        <tr key={idx}>
                          <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                            {line.producto_nombre}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono">
                            {line.cantidad}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            ${Number(line.precio_unitario_usd).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-amber-500">
                            {Number(line.porcentaje_impuesto || 0)}%
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                            ${Number(line.subtotal_usd).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals Summary */}
              <div className={`p-4 rounded-xl border space-y-1.5 text-xs ${
                isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex justify-between text-slate-500">
                  <span>Base Imponible:</span>
                  <span className="font-mono font-medium">${Number(selectedOrder.base_imponible_usd || selectedOrder.total_usd).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-amber-600 dark:text-amber-400">
                  <span>Impuesto (IVA):</span>
                  <span className="font-mono font-medium">+${Number(selectedOrder.monto_impuesto_usd || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-baseline text-sm font-bold border-t pt-1.5 border-slate-200 dark:border-slate-800">
                  <span className={isDarkMode ? 'text-white' : 'text-slate-900'}>Total General (USD):</span>
                  <span className={`font-mono text-base font-bold ${
                    selectedOrder.estado === 'ANULADO' ? 'text-slate-400 line-through' : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    ${Number(selectedOrder.total_usd).toFixed(2)}
                  </span>
                </div>
                <div className={`flex justify-between items-baseline text-xs font-bold pt-1 ${
                  selectedOrder.estado === 'ANULADO' ? 'text-slate-400 line-through' : 'text-indigo-600 dark:text-indigo-400'
                }`}>
                  <span>Total en Moneda Local:</span>
                  <span className="font-mono">
                    {Number(selectedOrder.total_moneda_local).toLocaleString('es-VE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    Bs.
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className={`px-6 py-3 border-t flex justify-between items-center ${
              isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50'
            }`}>
              <div>
                {selectedOrder.estado !== 'ANULADO' && (
                  <button
                    onClick={() => {
                      const orderToVoid = selectedOrder;
                      setSelectedOrder(null);
                      openAnularModal(orderToVoid);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition flex items-center gap-1.5"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Anular Pedido
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-indigo-600/20"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
