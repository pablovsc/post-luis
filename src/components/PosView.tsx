'use client';

import { useState, useEffect } from 'react';
import { Producto, Tasa, Tercero, Presentacion } from '@/types';
import { getOpcionesUnidad, getOpcionUnidad, formatStockDesglose } from '@/lib/unidades';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  User,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Search,
  ArrowRight,
  Loader2,
  UserPlus,
  AlertTriangle,
  Layers,
  Boxes,
} from 'lucide-react';

export interface CartItem {
  id: string; // `${producto.id}-${presentacion_id ?? 'base'}`
  producto: Producto;
  presentacion_id: number | null;
  presentacion_nombre: string;
  factor: number;
  precio_unitario_usd: number;
  cantidad: number;
}

interface PosViewProps {
  products: Producto[];
  currentRate: Tasa | null;
  onOrderCompleted: () => void;
  onOpenRates: () => void;
  isDarkMode?: boolean;
}

export default function PosView({
  products,
  currentRate,
  onOrderCompleted,
  onOpenRates,
  isDarkMode = false,
}: PosViewProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clients, setClients] = useState<Tercero[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lastCompletedOrder, setLastCompletedOrder] = useState<any | null>(null);

  // Presentación seleccionada activamente en cada tarjeta de producto (por defecto null = unidad base)
  const [cardSelectedPres, setCardSelectedPres] = useState<Record<number, number | null>>({});

  // Allow negative stock toggle
  const [permitirStockNegativo, setPermitirStockNegativo] = useState(false);

  // Quick Client Creation Modal
  const [showQuickClientModal, setShowQuickClientModal] = useState(false);
  const [quickClientData, setQuickClientData] = useState({
    identificacion: '',
    razon_social_nombre: '',
    telefono: '',
    email: '',
  });

  const rateValue = currentRate ? Number(currentRate.tasa) : 0;

  // Load clients
  const loadClients = async () => {
    try {
      const res = await fetch('/api/terceros?tipo=CLIENTE&active=true');
      const data = await res.json();
      if (data.success && data.terceros) {
        setClients(data.terceros);
        if (!selectedClientId && data.terceros.length > 0) {
          setSelectedClientId(data.terceros[0].id);
        }
      }
    } catch (e) {
      console.error('Error fetching clients for POS:', e);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const activeProducts = products.filter((p) => p.activo);
  const filteredProducts = activeProducts.filter((p) =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Unidades base consumidas por un producto en el carrito (excluyendo una línea si se pasa)
  const getCartBaseUnits = (productId: number, excludeLineId?: string): number => {
    return cart
      .filter((c) => c.producto.id === productId && c.id !== excludeLineId)
      .reduce((sum, c) => sum + c.cantidad * c.factor, 0);
  };

  const makeLineId = (productId: number, presId: number | null): string => {
    return `${productId}-${presId ?? 'base'}`;
  };

  // Agregar al carrito
  const addToCart = (product: Producto, presIdOverride?: number | null) => {
    const presId = presIdOverride !== undefined ? presIdOverride : (cardSelectedPres[product.id] ?? null);
    const opcion = getOpcionUnidad(product, presId);
    const lineId = makeLineId(product.id, opcion.id);

    const stockTotal = Number(product.stock_actual) || 0;
    const currentBaseUnits = getCartBaseUnits(product.id);
    const neededBaseUnits = opcion.factor;

    if (!permitirStockNegativo && currentBaseUnits + neededBaseUnits > stockTotal) {
      const disponible = Math.max(0, stockTotal - currentBaseUnits);
      setNotification({
        type: 'error',
        text: `Stock insuficiente para "${product.nombre}". Disponible: ${disponible} ${product.unidad_base || 'unidades'} base.`,
      });
      return;
    }

    setCart((prev) => {
      const idx = prev.findIndex((item) => item.id === lineId);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], cantidad: copy[idx].cantidad + 1 };
        return copy;
      }
      return [
        ...prev,
        {
          id: lineId,
          producto: product,
          presentacion_id: opcion.id,
          presentacion_nombre: opcion.nombre,
          factor: opcion.factor,
          precio_unitario_usd: opcion.precio_usd,
          cantidad: 1,
        },
      ];
    });
  };

  // Modificar cantidad (+1 o -1)
  const updateQuantity = (lineId: string, delta: number) => {
    const item = cart.find((c) => c.id === lineId);
    if (!item) return;

    if (delta > 0 && !permitirStockNegativo) {
      const stockTotal = Number(item.producto.stock_actual) || 0;
      const currentBaseOther = getCartBaseUnits(item.producto.id, lineId);
      const newTotalBase = currentBaseOther + (item.cantidad + delta) * item.factor;
      if (newTotalBase > stockTotal) {
        setNotification({
          type: 'error',
          text: `No hay más stock disponible para "${item.producto.nombre}" en ${item.presentacion_nombre}.`,
        });
        return;
      }
    }

    setCart((prev) =>
      prev
        .map((c) => {
          if (c.id === lineId) {
            const nextQty = c.cantidad + delta;
            return nextQty > 0 ? { ...c, cantidad: nextQty } : null;
          }
          return c;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Escribir cantidad directa
  const setDirectQuantity = (lineId: string, rawQty: number) => {
    const item = cart.find((c) => c.id === lineId);
    if (!item) return;

    let targetQty = Math.max(0, Math.floor(rawQty));

    if (!permitirStockNegativo) {
      const stockTotal = Number(item.producto.stock_actual) || 0;
      const currentBaseOther = getCartBaseUnits(item.producto.id, lineId);
      const maxQty = Math.floor(Math.max(0, stockTotal - currentBaseOther) / item.factor);
      if (targetQty > maxQty) {
        targetQty = maxQty;
        setNotification({
          type: 'error',
          text: `Máximo disponible para "${item.producto.nombre}" (${item.presentacion_nombre}): ${maxQty}.`,
        });
      }
    }

    setCart((prev) => {
      if (targetQty <= 0) {
        return prev.filter((c) => c.id !== lineId);
      }
      return prev.map((c) => (c.id === lineId ? { ...c, cantidad: targetQty } : c));
    });
  };

  // Cambiar presentación de una línea en el carrito
  const changeItemPresentation = (lineId: string, newPresId: number | null) => {
    const item = cart.find((c) => c.id === lineId);
    if (!item) return;

    const nuevaOpcion = getOpcionUnidad(item.producto, newPresId);
    const newLineId = makeLineId(item.producto.id, nuevaOpcion.id);

    // Si ya existe otra línea con esa presentación, las fusionamos
    const existing = cart.find((c) => c.id === newLineId && c.id !== lineId);
    const mergedQty = (existing ? existing.cantidad : 0) + item.cantidad;

    if (!permitirStockNegativo) {
      const stockTotal = Number(item.producto.stock_actual) || 0;
      const otherBase = getCartBaseUnits(item.producto.id, lineId);
      const neededBase = mergedQty * nuevaOpcion.factor;
      if (otherBase + neededBase > stockTotal) {
        setNotification({
          type: 'error',
          text: `Stock insuficiente para cambiar a ${nuevaOpcion.nombre}.`,
        });
        return;
      }
    }

    setCart((prev) => {
      const filtered = prev.filter((c) => c.id !== lineId && c.id !== newLineId);
      return [
        ...filtered,
        {
          id: newLineId,
          producto: item.producto,
          presentacion_id: nuevaOpcion.id,
          presentacion_nombre: nuevaOpcion.nombre,
          factor: nuevaOpcion.factor,
          precio_unitario_usd: nuevaOpcion.precio_usd,
          cantidad: mergedQty,
        },
      ];
    });
  };

  const removeFromCart = (lineId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== lineId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Cálculos con discriminación exacta de IVA y productos exentos
  let baseImponibleUsd = 0;
  let baseExentaUsd = 0;
  let baseGravadaUsd = 0;
  let montoImpuestoUsd = 0;

  cart.forEach((item) => {
    const itemSubtotal = item.precio_unitario_usd * item.cantidad;
    const rawTax = item.producto.impuesto_porcentaje;
    const taxPercent = rawTax !== undefined && rawTax !== null ? Number(rawTax) : 16.0;
    const itemTax = (itemSubtotal * taxPercent) / 100;

    baseImponibleUsd += itemSubtotal;
    if (taxPercent === 0) {
      baseExentaUsd += itemSubtotal;
    } else {
      baseGravadaUsd += itemSubtotal;
    }
    montoImpuestoUsd += itemTax;
  });

  const totalUsd = baseImponibleUsd + montoImpuestoUsd;
  const totalLocal = rateValue > 0 ? totalUsd * rateValue : 0;

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const handleProcessOrder = async () => {
    if (cart.length === 0) {
      setNotification({ type: 'error', text: 'El carrito está vacío.' });
      return;
    }

    if (!currentRate || rateValue <= 0) {
      setNotification({
        type: 'error',
        text: 'Debes registrar la tasa de cambio del día antes de procesar ventas.',
      });
      return;
    }

    setLoading(true);
    setNotification(null);

    try {
      const itemsPayload = cart.map((item) => ({
        producto_id: item.producto.id,
        cantidad: item.cantidad,
        precio_unitario_usd: item.precio_unitario_usd,
        presentacion_id: item.presentacion_id,
      }));

      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tercero_id: selectedClientId || 1,
          cliente_nombre: selectedClient?.razon_social_nombre || 'Cliente Genérico',
          tasa_cambio_aplicada: rateValue,
          permitir_stock_negativo: permitirStockNegativo,
          items: itemsPayload,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setLastCompletedOrder({
          ...data.order,
          cliente_nombre: selectedClient?.razon_social_nombre || 'Cliente Genérico',
          cliente_identificacion: selectedClient?.identificacion || 'V-00000000',
          lineas: cart.map((c) => {
            const rawTax = c.producto.impuesto_porcentaje;
            const taxPct = rawTax !== undefined && rawTax !== null ? Number(rawTax) : 16.0;
            const sub = c.precio_unitario_usd * c.cantidad;
            return {
              nombre: c.presentacion_id ? `${c.producto.nombre} (${c.presentacion_nombre})` : c.producto.nombre,
              presentacion_nombre: c.presentacion_nombre,
              cantidad: c.cantidad,
              precio: c.precio_unitario_usd,
              subtotal: sub,
              taxPct,
            };
          }),
        });
        clearCart();
        setNotification({
          type: 'success',
          text: `¡Venta #${data.order.id} registrada correctamente e inventario descontado!`,
        });
        onOrderCompleted();
      } else {
        setNotification({ type: 'error', text: data.message || 'Error al guardar la venta' });
      }
    } catch {
      setNotification({ type: 'error', text: 'Error de conexión al procesar el pedido' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuickClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickClientData.identificacion.trim() || !quickClientData.razon_social_nombre.trim()) {
      setNotification({ type: 'error', text: 'Cédula/RIF y Nombre son obligatorios' });
      return;
    }

    try {
      const res = await fetch('/api/terceros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'CLIENTE',
          identificacion: quickClientData.identificacion.trim().toUpperCase(),
          razon_social_nombre: quickClientData.razon_social_nombre.trim(),
          telefono: quickClientData.telefono.trim() || null,
          email: quickClientData.email.trim() || null,
          activo: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        await loadClients();
        setSelectedClientId(data.tercero.id);
        setShowQuickClientModal(false);
        setQuickClientData({ identificacion: '', razon_social_nombre: '', telefono: '', email: '' });
        setNotification({ type: 'success', text: 'Cliente registrado y seleccionado con éxito' });
      } else {
        setNotification({ type: 'error', text: data.message || 'Error al crear cliente' });
      }
    } catch {
      setNotification({ type: 'error', text: 'Error de conexión al guardar cliente' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-semibold animate-in fade-in duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 text-sm leading-none ml-2"
          >
            &times;
          </button>
        </div>
      )}

      {/* Grid Layout: 7 cols Catalog | 5 cols Cart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Products Catalog (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar producto por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full rounded-2xl pl-10 pr-24 py-2.5 text-xs border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm transition-colors ${
                isDarkMode
                  ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500'
                  : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
              }`}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono text-slate-400">
              {filteredProducts.length} productos
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[700px] overflow-y-auto pr-1">
            {filteredProducts.map((p) => {
              const stockNum = Number(p.stock_actual) || 0;
              const isOutOfStock = !permitirStockNegativo && stockNum <= 0;

              // Opciones de unidad/presentación del producto
              const opciones = getOpcionesUnidad(p);
              const activePresId = cardSelectedPres[p.id] ?? null;
              const activeOpcion = getOpcionUnidad(p, activePresId);

              const activePriceUsd = activeOpcion.precio_usd;
              const activePriceLocal = rateValue > 0 ? activePriceUsd * rateValue : 0;

              // Línea en carrito correspondiente a esta presentación activa
              const activeLineId = makeLineId(p.id, activeOpcion.id);
              const currentLineItem = cart.find((c) => c.id === activeLineId);
              const currentQty = currentLineItem ? currentLineItem.cantidad : 0;

              // Total de unidades base en carrito de este producto
              const totalBaseInCart = getCartBaseUnits(p.id);

              return (
                <div
                  key={p.id}
                  className={`group relative rounded-2xl border transition-all flex flex-col justify-between overflow-hidden shadow-sm ${
                    currentQty > 0
                      ? isDarkMode
                        ? 'border-indigo-500/70 bg-indigo-950/20 shadow-indigo-900/20'
                        : 'border-indigo-500 bg-indigo-50/40 shadow-indigo-100'
                      : isDarkMode
                      ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      : 'bg-white border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  {/* Badge de cantidad en carrito */}
                  {totalBaseInCart > 0 && (
                    <div className="absolute top-2 right-2 z-20">
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-mono text-xs font-bold flex items-center justify-center shadow-md shadow-indigo-600/30">
                        {currentQty}
                      </span>
                    </div>
                  )}

                  {/* Contenido Visual Superior */}
                  <div className="p-3.5 pb-2">
                    <h4 className={`font-semibold text-xs line-clamp-2 mb-1 pr-6 ${
                      currentQty > 0
                        ? 'text-indigo-600 dark:text-indigo-300'
                        : isDarkMode
                        ? 'text-white'
                        : 'text-slate-900'
                    }`}>
                      {p.nombre}
                    </h4>

                    {/* Stock & Tax Indicator */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                        stockNum > 10
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : stockNum > 0
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                      }`}>
                        {stockNum <= 0 ? 'Agotado (0)' : formatStockDesglose(p)}
                      </span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        Number(p.impuesto_porcentaje) === 0
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                          : 'text-slate-400'
                      }`}>
                        {Number(p.impuesto_porcentaje) === 0 ? 'Exento (0%)' : p.impuesto_nombre || 'IVA 16%'}
                      </span>
                    </div>

                    {/* Selector de Presentación en la tarjeta (si tiene más de 1) */}
                    {opciones.length > 1 && (
                      <div className="mb-2">
                        <label className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block mb-1">
                          Presentación:
                        </label>
                        <div className="flex flex-wrap gap-1">
                          {opciones.map((op) => {
                            const isSelected = activePresId === op.id;
                            return (
                              <button
                                key={op.id ?? 'base'}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCardSelectedPres((prev) => ({ ...prev, [p.id]: op.id }));
                                }}
                                className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border transition ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm font-bold'
                                    : isDarkMode
                                    ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                {op.nombre}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Precio Activo de la Presentación */}
                    <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
                      <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        ${activePriceUsd.toFixed(2)}{' '}
                        <span className="text-[10px] font-normal text-slate-400">
                          / {activeOpcion.nombre}
                        </span>
                      </div>
                      {rateValue > 0 && (
                        <div className={`text-[10px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          ≈ {activePriceLocal.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Botones de Restar, Input de Cantidad y Sumar */}
                  <div className={`p-2 pt-1.5 border-t flex items-center gap-1.5 transition-colors ${
                    isDarkMode ? 'bg-slate-950/70 border-slate-800/80' : 'bg-white border-slate-100'
                  }`}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (currentQty > 0) updateQuantity(activeLineId, -1);
                      }}
                      disabled={currentQty === 0}
                      title="Restar 1 unidad"
                      className={`p-1.5 rounded-xl text-xs font-semibold flex items-center justify-center transition-all ${
                        currentQty > 0
                          ? isDarkMode
                            ? 'bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 active:scale-95 cursor-pointer'
                            : 'bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 active:scale-95 cursor-pointer shadow-sm'
                          : isDarkMode
                          ? 'bg-slate-900/40 text-slate-600 border border-slate-800/60 cursor-not-allowed opacity-40'
                          : 'bg-slate-100 text-slate-300 border border-slate-200/80 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>

                    <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="number"
                        min="0"
                        value={currentQty > 0 ? currentQty : ''}
                        placeholder="0"
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                          if (!isNaN(val)) {
                            if (currentLineItem) {
                              setDirectQuantity(activeLineId, val);
                            } else if (val > 0) {
                              addToCart(p, activePresId);
                              if (val > 1) {
                                setTimeout(() => setDirectQuantity(activeLineId, val), 50);
                              }
                            }
                          }
                        }}
                        className={`w-full text-center text-xs font-bold font-mono py-1 rounded-xl border focus:ring-2 focus:ring-indigo-500/50 outline-none transition ${
                          currentQty > 0
                            ? isDarkMode
                              ? 'bg-indigo-950/50 border-indigo-500/50 text-indigo-300 font-black'
                              : 'bg-indigo-50 border-indigo-300 text-indigo-700 font-black'
                            : isDarkMode
                            ? 'bg-slate-800/80 border-slate-700 text-slate-300 placeholder-slate-500'
                            : 'bg-slate-50 border-slate-200 text-slate-700 placeholder-slate-400'
                        }`}
                        title={`Escribe la cantidad de ${activeOpcion.nombre}`}
                      />
                    </div>

                    <button
                      type="button"
                      disabled={isOutOfStock}
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(p, activePresId);
                      }}
                      title={`Sumar 1 ${activeOpcion.nombre}`}
                      className={`p-1.5 rounded-xl text-xs font-semibold flex items-center justify-center transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        isDarkMode
                          ? 'bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current Order / Cart Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className={`rounded-2xl border shadow-xl flex flex-col h-[700px] transition-colors ${
            isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-md'
          }`}>
            {/* Cart Header */}
            <div className={`p-4 border-b flex items-center justify-between ${
              isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg border border-indigo-500/20">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Pedido de Venta
                  </h3>
                  <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {cart.length} líneas en carrito
                  </p>
                </div>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-rose-500 hover:text-rose-600 transition font-medium"
                >
                  Vaciar
                </button>
              )}
            </div>

            {/* Client Selector & Stock Negativo Toggle */}
            <div className={`p-4 border-b space-y-2 ${
              isDarkMode ? 'bg-slate-950/20 border-slate-800' : 'bg-white border-slate-100'
            }`}>
              <div className="flex items-center justify-between">
                <label className={`text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  <User className="w-3.5 h-3.5 text-indigo-500" /> Cliente / Tercero *
                </label>
                <button
                  type="button"
                  onClick={() => setShowQuickClientModal(true)}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                >
                  <UserPlus className="w-3 h-3" /> + Cliente Rápido
                </button>
              </div>

              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(Number(e.target.value))}
                className={`w-full rounded-xl px-3 py-2 text-xs border font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                  isDarkMode
                    ? 'bg-slate-800/80 border-slate-700/80 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.identificacion} - {c.razon_social_nombre} {c.id === 1 ? '(Por defecto)' : ''}
                  </option>
                ))}
              </select>

              {/* Negative Stock Toggle */}
              <div className="flex items-center justify-between pt-1">
                <label htmlFor="negStockToggle" className="text-[11px] text-slate-400 cursor-pointer flex items-center gap-1">
                  <input
                    type="checkbox"
                    id="negStockToggle"
                    checked={permitirStockNegativo}
                    onChange={(e) => setPermitirStockNegativo(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 text-xs"
                  />
                  <span>Permitir venta sin stock (stock negativo)</span>
                </label>
              </div>
            </div>

            {/* Cart Items List */}
            <div className={`flex-1 overflow-y-auto p-4 space-y-2.5 divide-y ${
              isDarkMode ? 'divide-slate-800/40' : 'divide-slate-100'
            }`}>
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center py-16">
                  <ShoppingCart className="w-12 h-12 mb-2 opacity-25" />
                  <p className="text-sm font-medium">El carrito está vacío</p>
                  <p className="text-xs text-slate-400 mt-1">Haz clic en los productos para agregarlos</p>
                </div>
              ) : (
                cart.map((item) => {
                  const subtotal = item.precio_unitario_usd * item.cantidad;
                  const rawTax = item.producto.impuesto_porcentaje;
                  const taxPct = rawTax !== undefined && rawTax !== null ? Number(rawTax) : 16.0;
                  const opciones = getOpcionesUnidad(item.producto);

                  return (
                    <div
                      key={item.id}
                      className="pt-2.5 first:pt-0 flex items-center justify-between gap-2.5"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className={`font-semibold text-xs truncate ${
                          isDarkMode ? 'text-white' : 'text-slate-900'
                        }`}>
                          {item.producto.nombre}
                        </div>

                        {/* Selector de Presentación en la línea del carrito */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {opciones.length > 1 ? (
                            <select
                              value={item.presentacion_id ?? ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? null : Number(e.target.value);
                                changeItemPresentation(item.id, val);
                              }}
                              className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                                isDarkMode
                                  ? 'bg-slate-800 border-slate-700 text-indigo-300'
                                  : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                              }`}
                            >
                              {opciones.map((op) => (
                                <option key={op.id ?? 'base'} value={op.id ?? ''}>
                                  {op.nombre} ({op.factor} {item.producto.unidad_base || 'un.'}) - ${op.precio_usd.toFixed(2)}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-[10px] font-mono font-bold text-slate-400">
                              {item.presentacion_nombre}
                            </span>
                          )}

                          <span className={`text-[10px] font-semibold ${
                            taxPct === 0
                              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 rounded'
                              : 'text-amber-500'
                          }`}>
                            {taxPct === 0 ? '(Exento 0%)' : `(IVA: ${taxPct}%)`}
                          </span>
                        </div>

                        <div className={`text-[11px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          ${item.precio_unitario_usd.toFixed(2)} c/u
                        </div>
                      </div>

                      {/* Quantity Controller */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className={`flex items-center rounded-lg border ${
                          isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
                        }`}>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-1 hover:text-indigo-600 text-slate-400 transition"
                            title="Restar 1"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.cantidad}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 1 : parseInt(e.target.value, 10);
                              if (!isNaN(val)) {
                                setDirectQuantity(item.id, val);
                              }
                            }}
                            className={`w-12 text-center text-xs font-bold font-mono bg-transparent border-0 focus:ring-1 focus:ring-indigo-500 rounded py-0.5 px-0.5 outline-none ${
                              isDarkMode ? 'text-white' : 'text-slate-900'
                            }`}
                            title="Escribe la cantidad directamente"
                          />
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, 1)}
                            className="p-1 hover:text-indigo-600 text-slate-400 transition"
                            title="Sumar 1"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="text-right w-16">
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                            ${subtotal.toFixed(2)}
                          </span>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-slate-400 hover:text-rose-500 p-1 transition"
                          title="Eliminar de carrito"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Order Totals & Action with Tax Breakdown */}
            <div className={`p-4 border-t space-y-2.5 ${
              isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className={`space-y-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {baseExentaUsd > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                    <span>Base Exenta (0%):</span>
                    <span className="font-mono font-semibold">
                      ${baseExentaUsd.toFixed(2)}
                    </span>
                  </div>
                )}
                {baseGravadaUsd > 0 && (
                  <div className="flex justify-between">
                    <span>{baseExentaUsd > 0 ? 'Base Gravable:' : 'Base Imponible:'}</span>
                    <span className={`font-mono font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                      ${baseGravadaUsd.toFixed(2)}
                    </span>
                  </div>
                )}
                {baseExentaUsd === 0 && baseGravadaUsd === 0 && (
                  <div className="flex justify-between">
                    <span>Base Imponible:</span>
                    <span className={`font-mono font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                      ${baseImponibleUsd.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-amber-600 dark:text-amber-400">
                  <span>Impuesto (IVA):</span>
                  <span className="font-mono font-semibold">
                    +${montoImpuestoUsd.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline pt-1 border-t border-slate-200 dark:border-slate-800">
                  <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Total USD:
                  </span>
                  <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                    ${totalUsd.toFixed(2)}
                  </span>
                </div>
                <div className={`flex justify-between items-baseline border-t pt-1 ${
                  isDarkMode ? 'border-slate-800' : 'border-slate-200'
                }`}>
                  <span className={`text-xs font-bold uppercase tracking-wider ${
                    isDarkMode ? 'text-indigo-300' : 'text-indigo-600'
                  }`}>
                    Total Moneda Local:
                  </span>
                  <span className="text-xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                    {totalLocal.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                    <span className="text-xs font-normal">Bs.</span>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleProcessOrder}
                disabled={cart.length === 0 || loading || rateValue <= 0}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Procesando Venta...
                  </>
                ) : (
                  <>
                    <Receipt className="w-4 h-4" /> Cobrar y Descontar Inventario
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Client Modal */}
      {showQuickClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 transition-all ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h3 className="text-base font-bold mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-indigo-500" />
              Nuevo Cliente Rápido
            </h3>
            <form onSubmit={handleCreateQuickClient} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Cédula / RIF *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: V-12345678"
                  value={quickClientData.identificacion}
                  onChange={(e) => setQuickClientData({ ...quickClientData, identificacion: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border text-sm uppercase ${
                    isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Nombre o Razón Social *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: María Rodríguez"
                  value={quickClientData.razon_social_nombre}
                  onChange={(e) => setQuickClientData({ ...quickClientData, razon_social_nombre: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border text-sm ${
                    isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Teléfono</label>
                <input
                  type="text"
                  placeholder="Ej: 0412-1234567"
                  value={quickClientData.telefono}
                  onChange={(e) => setQuickClientData({ ...quickClientData, telefono: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border text-sm ${
                    isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickClientModal(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500"
                >
                  Guardar y Seleccionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recibo modal último pedido completado */}
      {lastCompletedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className={`border rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4 ${
            isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2 border border-emerald-500/20">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                ¡Venta Exitosa!
              </h3>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Comprobante de Pedido #{lastCompletedOrder.id}
              </p>
              <div className="mt-2 flex justify-center">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" /> Estado: Completo
                </span>
              </div>
            </div>

            <div className={`p-3.5 rounded-xl border space-y-2 text-xs ${
              isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex justify-between text-slate-500">
                <span>Cliente:</span>
                <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {lastCompletedOrder.cliente_nombre || 'Cliente General'}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>RIF / Cédula:</span>
                <span className="font-mono text-slate-400">
                  {lastCompletedOrder.cliente_identificacion || 'V-00000000'}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Tasa aplicada:</span>
                <span className={`font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {Number(lastCompletedOrder.tasa_cambio_aplicada).toFixed(4)}
                </span>
              </div>
              <div className={`border-t pt-2 space-y-1 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                {lastCompletedOrder.lineas?.map((l: any, i: number) => (
                  <div key={i} className="flex justify-between text-[11px]">
                    <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
                      {l.cantidad}x {l.nombre}
                    </span>
                    <span className="font-mono">${Number(l.subtotal).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className={`border-t pt-2 space-y-1 text-slate-500 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <div className="flex justify-between text-[11px]">
                  <span>Base Imponible:</span>
                  <span className="font-mono">${Number(lastCompletedOrder.base_imponible_usd || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-amber-500">
                  <span>Impuesto (IVA):</span>
                  <span className="font-mono">+${Number(lastCompletedOrder.monto_impuesto_usd || 0).toFixed(2)}</span>
                </div>
              </div>
              <div className={`border-t pt-2 flex justify-between font-bold ${
                isDarkMode ? 'border-slate-800 text-white' : 'border-slate-200 text-slate-900'
              }`}>
                <span>Total USD:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  ${Number(lastCompletedOrder.total_usd).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-indigo-600 dark:text-indigo-400">
                <span>Total Local:</span>
                <span className="font-mono">
                  {Number(lastCompletedOrder.total_moneda_local).toLocaleString('es-VE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  Bs.
                </span>
              </div>
            </div>

            <button
              onClick={() => setLastCompletedOrder(null)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-indigo-600/20"
            >
              Cerrar y Continuar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
