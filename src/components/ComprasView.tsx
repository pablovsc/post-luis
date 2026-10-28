'use client';

import { useState, useEffect, useRef } from 'react';
import { Compra, Producto, Tercero, Impuesto, Tasa, EstadoCompra } from '@/types';
import { getOpcionesUnidad, formatStockDesglose } from '@/lib/unidades';
import {
  FileText,
  Plus,
  Search,
  Eye,
  Trash2,
  Calendar,
  Building,
  DollarSign,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  PackagePlus,
  UserPlus,
  Clock,
  Ban,
  Filter,
  ChevronDown,
  Check,
} from 'lucide-react';

interface ComprasViewProps {
  products: Producto[];
  currentRate: Tasa | null;
  onRefreshProducts: () => void;
  isDarkMode?: boolean;
}

interface NewPurchaseLine {
  producto_id: number | '';
  cantidad: number;
  costo_unitario_usd: number;
  impuesto_id: number;
  presentacion_id?: number | null;
}

// Searchable Product Dropdown for each row in the purchase form
function ProductSearchSelect({
  products,
  selectedId,
  onSelect,
  isDarkMode = false,
}: {
  products: Producto[];
  selectedId: number | '';
  onSelect: (productId: number) => void;
  isDarkMode?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedProduct = products.find((p) => p.id === Number(selectedId));

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const filtered = products.filter((p) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      p.nombre.toLowerCase().includes(q) ||
      String(p.id).includes(q)
    );
  });

  return (
    <div ref={wrapperRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch('');
        }}
        className={`w-full px-2.5 py-1.5 rounded-lg border text-xs text-left flex items-center justify-between gap-1.5 transition ${
          !selectedProduct
            ? 'border-amber-400 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold'
            : isDarkMode
            ? 'bg-slate-800 border-slate-700 text-slate-100 hover:border-slate-600'
            : 'bg-white border-slate-300 text-slate-800 hover:border-slate-400 shadow-sm'
        }`}
      >
        <span className="truncate flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {selectedProduct ? (
            <span className="truncate">
              <strong className="font-semibold">{selectedProduct.nombre}</strong>{' '}
              <span className="text-[10px] text-slate-400 font-mono">
                (Stock: {formatStockDesglose(selectedProduct)})
              </span>
            </span>
          ) : (
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              🔍 Buscar producto por nombre...
            </span>
          )}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Floating Dropdown with Search */}
      {isOpen && (
        <div
          className={`absolute left-0 top-full mt-1 w-full min-w-[280px] max-w-[420px] z-50 rounded-xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${
            isDarkMode ? 'bg-slate-900 border-slate-700 shadow-black/80' : 'bg-white border-slate-200 shadow-slate-300/60'
          }`}
        >
          {/* Search bar inside Dropdown */}
          <div className={`p-2 border-b flex items-center gap-2 ${
            isDarkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-slate-50'
          }`}>
            <Search className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Escribe el nombre del producto..."
              className={`w-full bg-transparent text-xs focus:outline-none ${
                isDarkMode ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
              }`}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-slate-400 hover:text-slate-600 p-0.5 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* List of matching products */}
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40">
            {filtered.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 italic">
                No se encontraron productos con "{search}"
              </div>
            ) : (
              filtered.map((p) => {
                const isSelected = selectedProduct?.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onSelect(p.id);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2 transition ${
                      isSelected
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold'
                        : isDarkMode
                        ? 'hover:bg-slate-800/80 text-slate-200'
                        : 'hover:bg-emerald-50/70 text-slate-800'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="font-semibold truncate">{p.nombre}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Costo ref: ${Number(p.costo_promedio_usd || 0).toFixed(2)} USD
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      Stock: {formatStockDesglose(p)}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ComprasView({
  products,
  currentRate,
  onRefreshProducts,
  isDarkMode = false,
}: ComprasViewProps) {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [suppliers, setSuppliers] = useState<Tercero[]>([]);
  const [taxes, setTaxes] = useState<Impuesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | EstadoCompra>('TODOS');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStatusDecisionModal, setShowStatusDecisionModal] = useState(false);
  const [anularModalCompra, setAnularModalCompra] = useState<Compra | null>(null);
  const [selectedCompra, setSelectedCompra] = useState<Compra | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showQuickSupplierModal, setShowQuickSupplierModal] = useState(false);
  const [changingStatusId, setChangingStatusId] = useState<number | null>(null);

  // New Purchase Form State
  const [numeroFactura, setNumeroFactura] = useState('');
  const [terceroId, setTerceroId] = useState<number | ''>('');
  const [fechaEmision, setFechaEmision] = useState(() => new Date().toISOString().split('T')[0]);
  const [tasaCambio, setTasaCambio] = useState<number>(currentRate ? Number(currentRate.tasa) : 36.5);
  const [observaciones, setObservaciones] = useState('');
  const [estadoDoc, setEstadoDoc] = useState<EstadoCompra>('COMPLETADO');
  const [lines, setLines] = useState<NewPurchaseLine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Quick Product Search Bar State
  const [quickSearchProd, setQuickSearchProd] = useState('');
  const [showQuickResults, setShowQuickResults] = useState(false);
  const quickDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (quickDropdownRef.current && !quickDropdownRef.current.contains(event.target as Node)) {
        setShowQuickResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddProductDirectly = (prod: Producto) => {
    const defaultCost = Number(prod.costo_promedio_usd) || Number(prod.precio_usd) * 0.7;
    const defaultTax = prod.impuesto_id || taxes[0]?.id || 1;
    setLines((prev) => [
      ...prev,
      {
        producto_id: prod.id,
        cantidad: 1,
        costo_unitario_usd: Number(defaultCost.toFixed(2)),
        impuesto_id: defaultTax,
        presentacion_id: null,
      },
    ]);
    setQuickSearchProd('');
    setShowQuickResults(false);
  };

  const filteredQuickProducts = products.filter((p) => {
    const q = quickSearchProd.toLowerCase().trim();
    if (!q) return false;
    return (
      p.nombre.toLowerCase().includes(q) ||
      String(p.id).includes(q)
    );
  });

  // Quick Supplier Form
  const [quickSupplierData, setQuickSupplierData] = useState({
    identificacion: '',
    razon_social_nombre: '',
    telefono: '',
  });

  const fetchCompras = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/compras');
      const data = await res.json();
      if (data.success) {
        setCompras(data.purchases || []);
      }
    } catch (e) {
      console.error('Error fetching purchases:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliersAndTaxes = async () => {
    try {
      const [supRes, taxRes] = await Promise.all([
        fetch('/api/terceros?tipo=PROVEEDOR&active=true'),
        fetch('/api/impuestos?active=true'),
      ]);
      const supData = await supRes.json();
      const taxData = await taxRes.json();
      if (supData.success) setSuppliers(supData.terceros || []);
      if (taxData.success) setTaxes(taxData.taxes || []);
    } catch (e) {
      console.error('Error fetching suppliers/taxes:', e);
    }
  };

  useEffect(() => {
    fetchCompras();
    fetchSuppliersAndTaxes();
  }, []);

  useEffect(() => {
    if (currentRate && Number(currentRate.tasa) > 0) {
      setTasaCambio(Number(currentRate.tasa));
    }
  }, [currentRate]);

  const openAddModal = () => {
    setNumeroFactura('');
    setTerceroId(suppliers.length > 0 ? suppliers[0].id : '');
    setFechaEmision(new Date().toISOString().split('T')[0]);
    setTasaCambio(currentRate ? Number(currentRate.tasa) : 36.5);
    setObservaciones('');
    setEstadoDoc('COMPLETADO');
    setErrorMsg('');
    setSuccessMsg('');
    // No agregar ningún producto por defecto; el usuario debe elegirlo
    setLines([]);
    setShowAddModal(true);
  };

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      {
        producto_id: '',
        cantidad: 1,
        costo_unitario_usd: 0,
        impuesto_id: taxes[0]?.id ?? 1,
        presentacion_id: null,
      },
    ]);
  };

  const handleUpdateLine = (index: number, field: keyof NewPurchaseLine, value: any) => {
    setLines((prev) =>
      prev.map((line, idx) => {
        if (idx !== index) return line;
        const updated = { ...line, [field]: value };
        if (field === 'producto_id') {
          const selectedProd = products.find((p) => p.id === Number(value));
          if (selectedProd) {
            updated.presentacion_id = null;
            updated.costo_unitario_usd =
              Number(selectedProd.costo_promedio_usd) || Number(selectedProd.precio_usd) * 0.7;
            updated.impuesto_id = selectedProd.impuesto_id || updated.impuesto_id;
          } else {
            updated.presentacion_id = null;
            updated.costo_unitario_usd = 0;
          }
        }
        if (field === 'presentacion_id') {
          const selectedProd = products.find((p) => p.id === Number(line.producto_id));
          if (selectedProd) {
            const options = getOpcionesUnidad(selectedProd);
            const chosen = options.find((o) => (o.id === null ? value === null : o.id === Number(value)));
            if (chosen && chosen.factor > 1) {
              const baseCost = Number(selectedProd.costo_promedio_usd) || Number(selectedProd.precio_usd) * 0.7;
              updated.costo_unitario_usd = Number((baseCost * chosen.factor).toFixed(2));
            } else if (chosen && chosen.factor === 1) {
              const baseCost = Number(selectedProd.costo_promedio_usd) || Number(selectedProd.precio_usd) * 0.7;
              updated.costo_unitario_usd = Number(baseCost.toFixed(2));
            }
          }
        }
        return updated;
      })
    );
  };

  const handleRemoveLine = (index: number) => {
    setLines((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Calculations for current lines
  const taxMap = new Map<number, number>();
  taxes.forEach((t) => taxMap.set(t.id, Number(t.porcentaje)));

  let formBaseUsd = 0;
  let formTaxUsd = 0;
  lines.forEach((l) => {
    const subtotal = l.cantidad * l.costo_unitario_usd;
    const pct = taxMap.get(l.impuesto_id) ?? 16.0;
    const taxVal = (subtotal * pct) / 100;
    formBaseUsd += subtotal;
    formTaxUsd += taxVal;
  });
  const formTotalUsd = formBaseUsd + formTaxUsd;
  const formTotalLocal = formTotalUsd * (tasaCambio || 1);

  // Validate and prompt decision modal
  const handleOpenDecisionModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeroFactura.trim()) {
      setErrorMsg('El número de factura del proveedor es obligatorio');
      return;
    }
    if (!terceroId) {
      setErrorMsg('Debe seleccionar un proveedor');
      return;
    }
    if (lines.length === 0) {
      setErrorMsg('Debe agregar al menos un producto a la compra');
      return;
    }
    for (const l of lines) {
      if (!l.producto_id) {
        setErrorMsg('Debe seleccionar el producto en cada fila');
        return;
      }
      if (l.cantidad <= 0 || l.costo_unitario_usd < 0) {
        setErrorMsg('La cantidad debe ser mayor a 0 y el costo no puede ser negativo');
        return;
      }
    }

    setErrorMsg('');
    setShowStatusDecisionModal(true);
  };

  // Submit Purchase with selected status
  const executeSubmitPurchase = async (statusChoice: EstadoCompra) => {
    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/compras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero_factura: numeroFactura.trim(),
          tercero_id: Number(terceroId),
          fecha_emision: fechaEmision,
          tasa_cambio_aplicada: tasaCambio,
          observaciones: observaciones.trim() || undefined,
          estado: statusChoice,
          items: lines,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowStatusDecisionModal(false);
        setShowAddModal(false);
        fetchCompras();
        onRefreshProducts();
      } else {
        setErrorMsg(data.message || 'Error al procesar la compra');
        setShowStatusDecisionModal(false);
      }
    } catch {
      setErrorMsg('Error de conexión al guardar la compra');
      setShowStatusDecisionModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  // Change status of existing purchase
  const handleUpdateStatus = (compra: Compra, newEstado: EstadoCompra) => {
    if (newEstado === 'ANULADO') {
      // Abre modal detallada de anulación
      setAnularModalCompra(compra);
      return;
    }

    const confirmMsg =
      newEstado === 'COMPLETADO'
        ? `¿Confirmas pasar la compra #${compra.id} a COMPLETO? Esto sumará los productos al inventario.`
        : `¿Confirmas pasar la compra #${compra.id} a PROCESO?`;

    if (!confirm(confirmMsg)) return;
    executeStatusChange(compra.id, newEstado);
  };

  const executeStatusChange = async (compraId: number, newEstado: EstadoCompra) => {
    setChangingStatusId(compraId);
    try {
      const res = await fetch('/api/compras', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: compraId, estado: newEstado }),
      });
      const data = await res.json();
      if (data.success) {
        setAnularModalCompra(null);
        fetchCompras();
        onRefreshProducts();
        if (selectedCompra && selectedCompra.id === compraId) {
          setSelectedCompra({ ...selectedCompra, estado: newEstado });
        }
      } else {
        alert(data.message || 'Error al cambiar estado');
      }
    } catch {
      alert('Error de conexión con el servidor');
    } finally {
      setChangingStatusId(null);
    }
  };

  // Quick Supplier Creation
  const handleQuickSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSupplierData.identificacion.trim() || !quickSupplierData.razon_social_nombre.trim()) {
      alert('Identificación y Razón Social son requeridos');
      return;
    }

    try {
      const res = await fetch('/api/terceros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'PROVEEDOR',
          identificacion: quickSupplierData.identificacion.trim(),
          razon_social_nombre: quickSupplierData.razon_social_nombre.trim(),
          telefono: quickSupplierData.telefono.trim() || undefined,
          activo: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        await fetchSuppliersAndTaxes();
        setTerceroId(data.tercero.id);
        setShowQuickSupplierModal(false);
        setQuickSupplierData({ identificacion: '', razon_social_nombre: '', telefono: '' });
      } else {
        alert(data.message || 'Error al crear proveedor');
      }
    } catch {
      alert('Error de conexión con el servidor');
    }
  };

  // View Details
  const handleViewDetails = async (id: number) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/compras?id=${id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedCompra(data.purchase);
      }
    } catch (e) {
      console.error('Error fetching purchase details:', e);
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredCompras = compras.filter((c) => {
    const term = searchTerm.toLowerCase();
    const numMatch = c.numero_factura.toLowerCase().includes(term);
    const provMatch = c.proveedor_nombre ? c.proveedor_nombre.toLowerCase().includes(term) : false;
    const rifMatch = c.proveedor_identificacion ? c.proveedor_identificacion.toLowerCase().includes(term) : false;
    const matchesSearch = numMatch || provMatch || rifMatch;

    const matchesStatus = statusFilter === 'TODOS' || (c.estado || 'COMPLETADO') === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (estado: EstadoCompra = 'COMPLETADO') => {
    switch (estado) {
      case 'PROCESO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" /> Proceso
          </span>
        );
      case 'COMPLETADO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Completo
          </span>
        );
      case 'ANULADO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <Ban className="w-3 h-3" /> Anulado
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className={`flex flex-col sm:flex-row gap-4 items-center justify-between p-5 rounded-2xl border transition-colors ${
        isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/90 shadow-sm'
      }`}>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className={`text-xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Facturas de Compra & Proveedores
            </h2>
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Control de compras por estado (Proceso, Completo, Anulado) e ingresos a inventario
            </p>
          </div>
        </div>

        <div className="flex w-full sm:w-auto items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por # factura o proveedor..."
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
            onClick={fetchCompras}
            disabled={loading}
            className={`p-2 rounded-xl border transition shrink-0 ${
              isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-emerald-600/20 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nueva Factura de Compra
          </button>
        </div>
      </div>

      {/* Filter Tabs by Status */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className={`flex items-center p-1 rounded-xl border transition-colors ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          {(['TODOS', 'COMPLETADO', 'PROCESO', 'ANULADO'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === st
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st === 'TODOS'
                ? 'Todos los Estados'
                : st === 'COMPLETADO'
                ? 'Completos'
                : st === 'PROCESO'
                ? 'En Proceso'
                : 'Anulados'}
            </button>
          ))}
        </div>

        <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Total: <span className="font-semibold text-emerald-500">{filteredCompras.length}</span> documentos
        </div>
      </div>

      {/* Compras Table */}
      <div className={`rounded-2xl border overflow-hidden transition-colors ${
        isDarkMode ? 'bg-slate-900/60 border-slate-800/80 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className={`text-xs uppercase tracking-wider border-b transition-colors ${
              isDarkMode ? 'bg-slate-950/70 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}>
              <tr>
                <th className="py-3.5 px-6">ID</th>
                <th className="py-3.5 px-6">Factura Prov.</th>
                <th className="py-3.5 px-6">Proveedor</th>
                <th className="py-3.5 px-6">Fecha Emisión</th>
                <th className="py-3.5 px-6 text-center">Estado</th>
                <th className="py-3.5 px-6 text-center">Items</th>
                <th className="py-3.5 px-6 text-right">Base USD</th>
                <th className="py-3.5 px-6 text-right">IVA USD</th>
                <th className="py-3.5 px-6 text-right">Total USD</th>
                <th className="py-3.5 px-6 text-right">Total Bs.</th>
                <th className="py-3.5 px-6 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={11} className="text-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500 mb-2" />
                    <span className="text-xs text-slate-400">Cargando facturas de compra...</span>
                  </td>
                </tr>
              ) : filteredCompras.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-slate-400">
                    No se han encontrado facturas de compra con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredCompras.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-slate-500/5">
                    <td className="py-4 px-6 font-mono text-xs text-slate-400">#{c.id}</td>
                    <td className="py-4 px-6 font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                      {c.numero_factura}
                    </td>
                    <td className="py-4 px-6 font-medium">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {c.proveedor_nombre}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">
                          {c.proveedor_identificacion}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{c.fecha_emision}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {getStatusBadge(c.estado)}
                        {/* Selector rápido de estado */}
                        <select
                          value={c.estado || 'COMPLETADO'}
                          disabled={changingStatusId === c.id}
                          onChange={(e) => handleUpdateStatus(c, e.target.value as EstadoCompra)}
                          className={`text-[10px] py-0.5 px-1.5 rounded-lg border font-semibold cursor-pointer ${
                            isDarkMode
                              ? 'bg-slate-800 border-slate-700 text-slate-300'
                              : 'bg-slate-100 border-slate-200 text-slate-700'
                          }`}
                          title="Cambiar estado del documento"
                        >
                          <option value="PROCESO">Proceso</option>
                          <option value="COMPLETADO">Completo</option>
                          <option value="ANULADO">Anulado</option>
                        </select>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-700 dark:text-slate-300">
                        {c.total_articulos || 0}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right font-mono text-xs text-slate-600 dark:text-slate-300">
                      ${Number(c.base_imponible_usd).toFixed(2)}
                    </td>
                    <td className="py-4 px-6 text-right font-mono text-xs text-amber-600 dark:text-amber-400">
                      ${Number(c.monto_impuesto_usd).toFixed(2)}
                    </td>
                    <td className="py-4 px-6 text-right font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                      ${Number(c.total_usd).toFixed(2)}
                    </td>
                    <td className="py-4 px-6 text-right font-mono text-xs text-slate-500">
                      Bs. {Number(c.total_moneda_local).toFixed(2)}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleViewDetails(c.id)}
                          className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-emerald-600 transition"
                          title="Ver Comprobante de Compra"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {c.estado !== 'ANULADO' && (
                          <button
                            onClick={() => setAnularModalCompra(c)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/15 text-slate-400 hover:text-rose-500 transition"
                            title="Anular Documento y Restar Inventario"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Registrar Compra */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
          <div className={`w-full max-w-5xl rounded-2xl border shadow-2xl p-6 sm:p-8 transition-all my-8 ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <FileText className="w-5 h-5" />
                Registrar Factura de Compra
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-200 text-lg font-bold p-1"
              >
                &times;
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleOpenDecisionModal} className="space-y-5 mt-4">
              {/* Top Row: Provider, Factura #, Fecha, Estado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Proveedor *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowQuickSupplierModal(true)}
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1"
                    >
                      <UserPlus className="w-3 h-3" /> + Nuevo Proveedor
                    </button>
                  </div>
                  <select
                    value={terceroId}
                    onChange={(e) => setTerceroId(Number(e.target.value))}
                    required
                    className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                      isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <option value="">-- Seleccionar Proveedor --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.identificacion} - {s.razon_social_nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                    N° Factura Física *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 0001234"
                    value={numeroFactura}
                    onChange={(e) => setNumeroFactura(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                      isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                    Fecha de Emisión *
                  </label>
                  <input
                    type="date"
                    required
                    value={fechaEmision}
                    onChange={(e) => setFechaEmision(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                      isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              {/* Tasa & Observaciones row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                    Tasa de Cambio Aplicada
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    required
                    value={tasaCambio}
                    onChange={(e) => setTasaCambio(Number(e.target.value))}
                    className={`w-full px-3 py-2 rounded-xl border text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                      isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                    Observaciones / Notas (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Pedido recibido por almacén central, entrega parcial, etc."
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                      isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              {/* Interactive Purchase Lines Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Productos de la Compra
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar Fila en Blanco
                  </button>
                </div>

                {/* Quick Add Product Search Bar */}
                <div className={`p-3 rounded-xl border flex flex-col sm:flex-row items-center gap-2.5 ${
                  isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-emerald-50/60 border-emerald-200'
                }`}>
                  <div ref={quickDropdownRef} className="relative flex-1 w-full">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="🔍 Escribe para buscar y agregar rápidamente un producto a la compra..."
                      value={quickSearchProd}
                      onChange={(e) => {
                        setQuickSearchProd(e.target.value);
                        setShowQuickResults(true);
                      }}
                      onFocus={() => setShowQuickResults(true)}
                      className={`w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition ${
                        isDarkMode
                          ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500'
                          : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 shadow-sm'
                      }`}
                    />
                    {showQuickResults && quickSearchProd.trim() && (
                      <div
                        className={`absolute left-0 top-full mt-1 w-full z-50 rounded-xl border shadow-2xl max-h-56 overflow-y-auto divide-y ${
                          isDarkMode
                            ? 'bg-slate-900 border-slate-700 divide-slate-800 shadow-black/80'
                            : 'bg-white border-slate-200 divide-slate-100 shadow-slate-300/40'
                        }`}
                      >
                        {filteredQuickProducts.length === 0 ? (
                          <div className="p-3 text-xs text-slate-400 text-center italic">
                            No se encontraron productos con "{quickSearchProd}"
                          </div>
                        ) : (
                          filteredQuickProducts.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleAddProductDirectly(p)}
                              className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2 transition ${
                                isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-emerald-50 text-slate-800'
                              }`}
                            >
                              <div className="truncate">
                                <span className="font-semibold">{p.nombre}</span>
                                <span className="text-[10px] text-slate-400 font-mono ml-2">
                                  Costo ref: ${Number(p.costo_promedio_usd || 0).toFixed(2)}
                                </span>
                              </div>
                              <span className="shrink-0 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                                + Agregar (Stock: {formatStockDesglose(p)})
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="shrink-0 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-sm shadow-emerald-600/20"
                  >
                    <Plus className="w-3.5 h-3.5" /> Fila en Blanco
                  </button>
                </div>

                <div className={`rounded-xl border overflow-visible ${
                  isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <table className="w-full text-left text-xs">
                    <thead className={`border-b ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
                      <tr>
                        <th className="py-2.5 px-3 min-w-[220px]">Producto (Buscador) *</th>
                        <th className="py-2.5 px-3 min-w-[170px]">Presentación / Medida</th>
                        <th className="py-2.5 px-3 w-24">Cantidad</th>
                        <th className="py-2.5 px-3 w-28">Costo USD</th>
                        <th className="py-2.5 px-3 w-32">Impuesto</th>
                        <th className="py-2.5 px-3 w-28 text-right">Subtotal</th>
                        <th className="py-2.5 px-3 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/40">
                      {lines.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <PackagePlus className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                              <span className="text-xs">No hay productos agregados en este documento.</span>
                              <p className="text-[11px] text-slate-500 max-w-sm">
                                Utiliza el buscador rápido superior o haz clic en el botón de abajo para agregar productos.
                              </p>
                              <button
                                type="button"
                                onClick={handleAddLine}
                                className="mt-1 px-3 py-1.5 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 font-semibold text-xs transition flex items-center gap-1.5"
                              >
                                <Plus className="w-3.5 h-3.5" /> Agregar Fila
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        lines.map((line, idx) => {
                          const lineSubtotal = line.cantidad * line.costo_unitario_usd;
                          const selectedProd = products.find((p) => p.id === Number(line.producto_id));
                          const unitOptions = selectedProd ? getOpcionesUnidad(selectedProd) : [];
                          const selectedOption = unitOptions.find((o) =>
                            o.id === null ? line.presentacion_id == null : o.id === Number(line.presentacion_id)
                          ) || unitOptions[0];
                          const factor = selectedOption?.factor || 1;
                          const totalBaseUnits = line.cantidad * factor;
                          const costPerBaseUnit = factor > 0 ? line.costo_unitario_usd / factor : line.costo_unitario_usd;

                          return (
                            <tr key={idx}>
                              <td className="py-2 px-3 min-w-[220px]">
                                <ProductSearchSelect
                                  products={products}
                                  selectedId={line.producto_id}
                                  onSelect={(pId) => handleUpdateLine(idx, 'producto_id', pId)}
                                  isDarkMode={isDarkMode}
                                />
                              </td>
                              <td className="py-2 px-3">
                                {selectedProd ? (
                                  <div className="space-y-1">
                                    <select
                                      value={line.presentacion_id ?? ''}
                                      onChange={(e) => {
                                        const val = e.target.value === '' ? null : Number(e.target.value);
                                        handleUpdateLine(idx, 'presentacion_id', val);
                                      }}
                                      className={`w-full px-2 py-1.5 rounded-lg border text-xs font-semibold ${
                                        isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-800'
                                      }`}
                                    >
                                      {unitOptions.map((opt) => (
                                        <option key={opt.id ?? 'base'} value={opt.id ?? ''}>
                                          {opt.nombre} {opt.factor > 1 ? `(x${opt.factor} ${selectedProd.unidad_base || 'unid'})` : `(Base: ${selectedProd.unidad_base || 'Unid'})`}
                                        </option>
                                      ))}
                                    </select>
                                    {factor > 1 && (
                                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                                        = {totalBaseUnits} {selectedProd.unidad_base || 'unid'} (${costPerBaseUnit.toFixed(4)} c/u)
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">Selecciona producto</span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="number"
                                  min="0.01"
                                  step="any"
                                  value={line.cantidad}
                                  onChange={(e) => handleUpdateLine(idx, 'cantidad', Number(e.target.value))}
                                  className={`w-full px-2 py-1.5 rounded-lg border text-xs font-mono font-bold ${
                                    isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'
                                  }`}
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={line.costo_unitario_usd}
                                  onChange={(e) => handleUpdateLine(idx, 'costo_unitario_usd', Number(e.target.value))}
                                  className={`w-full px-2 py-1.5 rounded-lg border text-xs font-mono font-bold ${
                                    isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'
                                  }`}
                                />
                              </td>
                              <td className="py-2 px-3">
                                <select
                                  value={line.impuesto_id}
                                  onChange={(e) => handleUpdateLine(idx, 'impuesto_id', Number(e.target.value))}
                                  className={`w-full px-2 py-1.5 rounded-lg border text-xs ${
                                    isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'
                                  }`}
                                >
                                  {taxes.map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {t.nombre} ({t.porcentaje}%)
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                                ${lineSubtotal.toFixed(2)}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLine(idx)}
                                  className="text-rose-400 hover:text-rose-600 p-1"
                                  title="Quitar"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[11px] text-slate-500 uppercase font-semibold">Base Imponible</span>
                  <p className="text-base font-mono font-bold text-slate-800 dark:text-slate-200">
                    ${formBaseUsd.toFixed(2)}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 uppercase font-semibold">Impuesto (IVA)</span>
                  <p className="text-base font-mono font-bold text-amber-600 dark:text-amber-400">
                    ${formTaxUsd.toFixed(2)}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 uppercase font-semibold">Total USD</span>
                  <p className="text-lg font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                    ${formTotalUsd.toFixed(2)}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 uppercase font-semibold">Total Moneda Local</span>
                  <p className="text-sm font-mono font-bold text-slate-600 dark:text-slate-400">
                    Bs. {formTotalLocal.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-emerald-600/25 disabled:opacity-50"
                >
                  <PackagePlus className="w-4 h-4" /> Continuar y Guardar Factura...
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Decisión de Estado de la Compra */}
      {showStatusDecisionModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl transition-all ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 mb-3 border border-emerald-500/20">
                <PackagePlus className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold">
                ¿Cómo deseas registrar esta compra?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Factura <span className="font-mono font-bold text-slate-700 dark:text-slate-200">#{numeroFactura}</span> por un total de <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">${formTotalUsd.toFixed(2)}</span> ({lines.length} productos).
              </p>
            </div>

            <div className="space-y-3">
              {/* Opción 1: Dejar en Proceso */}
              <button
                type="button"
                disabled={submitting}
                onClick={() => executeSubmitPurchase('PROCESO')}
                className={`w-full text-left p-4 rounded-xl border transition group hover:scale-[1.01] ${
                  isDarkMode
                    ? 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/15 hover:border-amber-500/50'
                    : 'border-amber-300 bg-amber-50/50 hover:bg-amber-100/70 hover:border-amber-400'
                } disabled:opacity-50`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-500 mt-0.5">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-amber-600 dark:text-amber-400">
                        Dejar en Proceso (Borrador)
                      </span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                        Recomendado si está pendiente
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      Guarda el documento para revisión o edición posterior. <strong className="font-semibold text-slate-700 dark:text-slate-200">NO modifica las existencias de inventario</strong> ni recalcula costos hasta que sea completado.
                    </p>
                  </div>
                </div>
              </button>

              {/* Opción 2: Completar Documento */}
              <button
                type="button"
                disabled={submitting}
                onClick={() => executeSubmitPurchase('COMPLETADO')}
                className={`w-full text-left p-4 rounded-xl border transition group hover:scale-[1.01] ${
                  isDarkMode
                    ? 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/15 hover:border-emerald-500/50'
                    : 'border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100/70 hover:border-emerald-400'
                } disabled:opacity-50`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-500 mt-0.5">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        Completar y Cargar al Inventario
                      </span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                        Ingreso definitivo
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      Finaliza la recepción de la compra, <strong className="font-semibold text-slate-700 dark:text-slate-200">suma inmediatamente las cantidades al stock actual</strong> y actualiza el costo promedio ponderado de los productos.
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {submitting && (
              <div className="flex items-center justify-center gap-2 mt-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Guardando compra...
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowStatusDecisionModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Volver a la edición
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Quick Supplier */}
      {showQuickSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h4 className="font-bold text-base mb-3 flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Building className="w-4 h-4" /> Alta Rápida de Proveedor
            </h4>
            <form onSubmit={handleQuickSupplierSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">RIF / Cédula *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: J-12345678-0"
                  value={quickSupplierData.identificacion}
                  onChange={(e) => setQuickSupplierData({ ...quickSupplierData, identificacion: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border text-sm ${
                    isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Razón Social *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Distribuidora Central C.A."
                  value={quickSupplierData.razon_social_nombre}
                  onChange={(e) => setQuickSupplierData({ ...quickSupplierData, razon_social_nombre: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border text-sm ${
                    isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Teléfono</label>
                <input
                  type="text"
                  placeholder="Ej: 0414-1234567"
                  value={quickSupplierData.telefono}
                  onChange={(e) => setQuickSupplierData({ ...quickSupplierData, telefono: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border text-sm ${
                    isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickSupplierModal(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
                >
                  Guardar Proveedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalle de Compra */}
      {selectedCompra && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl p-6 transition-all ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-500" />
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    Comprobante de Compra #{selectedCompra.id}
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(selectedCompra.estado)}
                <button
                  onClick={() => setSelectedCompra(null)}
                  className="text-slate-400 hover:text-slate-200 text-lg font-bold p-1"
                >
                  &times;
                </button>
              </div>
            </div>

            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400">N° Factura Física:</span>
                  <p className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                    {selectedCompra.numero_factura}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Proveedor:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedCompra.proveedor_nombre}
                  </p>
                  <p className="font-mono text-[11px] text-slate-400">
                    {selectedCompra.proveedor_identificacion}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Fecha de Emisión:</span>
                  <p className="font-semibold">{selectedCompra.fecha_emision}</p>
                </div>
                <div>
                  <span className="text-slate-400">Estado Actual:</span>
                  <div className="mt-0.5">
                    <select
                      value={selectedCompra.estado || 'COMPLETADO'}
                      onChange={(e) => handleUpdateStatus(selectedCompra, e.target.value as EstadoCompra)}
                      className={`text-xs font-semibold py-1 px-2 rounded-lg border ${
                        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
                      }`}
                    >
                      <option value="PROCESO">Proceso</option>
                      <option value="COMPLETADO">Completo</option>
                      <option value="ANULADO">Anulado</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="rounded-xl border overflow-hidden border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800/60 uppercase font-semibold text-slate-500">
                    <tr>
                      <th className="py-2.5 px-3">Producto</th>
                      <th className="py-2.5 px-3 text-center">Cant.</th>
                      <th className="py-2.5 px-3 text-right">Costo USD</th>
                      <th className="py-2.5 px-3 text-center">IVA</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/40">
                    {selectedCompra.lineas?.map((line, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-medium">
                          <div className="font-semibold">{line.producto_nombre}</div>
                          {line.presentacion_nombre && line.factor_conversion && Number(line.factor_conversion) > 1 && (
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                              Presentación: {line.presentacion_nombre} (x{line.factor_conversion}) • Ingreso real: {line.cantidad_base} unidades
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center font-mono">
                          <span className="font-bold">{line.cantidad}</span>{' '}
                          <span className="text-[10px] text-slate-400 font-normal">
                            {line.presentacion_nombre || 'Unid'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          <div>${Number(line.costo_unitario_usd).toFixed(2)}</div>
                          {line.factor_conversion && Number(line.factor_conversion) > 1 && (
                            <div className="text-[9px] text-slate-400 font-mono">
                              (${(Number(line.costo_unitario_usd) / Number(line.factor_conversion)).toFixed(4)} c/u base)
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-amber-500">
                          {line.porcentaje_impuesto}%
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold">
                          ${Number(line.subtotal_usd).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Breakdown */}
              <div className="flex flex-col items-end gap-1.5 pt-2 text-xs">
                <div className="flex justify-between w-60 text-slate-500">
                  <span>Base Imponible:</span>
                  <span className="font-mono">${Number(selectedCompra.base_imponible_usd).toFixed(2)}</span>
                </div>
                <div className="flex justify-between w-60 text-amber-600 dark:text-amber-400">
                  <span>Impuesto (IVA):</span>
                  <span className="font-mono">+${Number(selectedCompra.monto_impuesto_usd).toFixed(2)}</span>
                </div>
                <div className="flex justify-between w-60 text-base font-bold text-emerald-600 dark:text-emerald-400 border-t pt-1">
                  <span>Total Compra:</span>
                  <span className="font-mono">${Number(selectedCompra.total_usd).toFixed(2)}</span>
                </div>
                <div className="flex justify-between w-60 text-xs text-slate-400 font-mono">
                  <span>Total Moneda Local:</span>
                  <span>Bs. {Number(selectedCompra.total_moneda_local).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setSelectedCompra(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmación de Anulación */}
      {anularModalCompra && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl transition-all ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 mb-3 border border-rose-500/20">
                <Ban className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-rose-600 dark:text-rose-400">
                ¿Anular Documento de Compra?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Documento #{anularModalCompra.id} — Factura <span className="font-mono font-bold text-slate-700 dark:text-slate-200">#{anularModalCompra.numero_factura}</span>
              </p>
            </div>

            <div className={`p-4 rounded-xl border mb-5 text-xs space-y-2 ${
              isDarkMode ? 'bg-rose-500/5 border-rose-500/20 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Efectos de esta anulación:</p>
                  {anularModalCompra.estado === 'COMPLETADO' ? (
                    <p className="mt-1 leading-relaxed">
                      Esta compra se encuentra actualmente <strong className="font-semibold underline">COMPLETA</strong>. Al anularla, el sistema <strong className="font-bold">RESTARÁ automáticamente las cantidades de todos los artículos comprados del stock actual de inventario</strong> para revertir el ingreso.
                    </p>
                  ) : (
                    <p className="mt-1 leading-relaxed">
                      Esta compra está en estado <strong className="font-semibold">PROCESO (Borrador)</strong>. Quedará invalidada en el historial contable y no afectará existencias.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                disabled={changingStatusId === anularModalCompra.id}
                onClick={() => setAnularModalCompra(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={changingStatusId === anularModalCompra.id}
                onClick={() => executeStatusChange(anularModalCompra.id, 'ANULADO')}
                className="flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-rose-600/25 disabled:opacity-50"
              >
                {changingStatusId === anularModalCompra.id ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Anulando...
                  </>
                ) : (
                  <>
                    <Ban className="w-3.5 h-3.5" /> Sí, Anular y Restar Cantidades
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
