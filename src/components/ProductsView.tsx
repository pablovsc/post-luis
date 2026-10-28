'use client';

import { useState, useEffect } from 'react';
import { Producto, Impuesto, Presentacion } from '@/types';
import { formatStockDesglose, formatStockDesgloseCompleto, getOpcionesUnidad, getSegmentacionExistencias } from '@/lib/unidades';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  DollarSign,
  Loader2,
  Layers,
  AlertTriangle,
  Scale,
  Boxes,
} from 'lucide-react';

interface ProductsViewProps {
  products: Producto[];
  onRefresh: () => void;
  isDarkMode?: boolean;
}

interface PresFormItem {
  id?: number;
  nombre: string;
  factor: string;
  precio_usd: string;
}

export default function ProductsView({ products, onRefresh, isDarkMode = false }: ProductsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [taxes, setTaxes] = useState<Impuesto[]>([]);
  const [formData, setFormData] = useState({
    nombre: '',
    precio_usd: '',
    stock_actual: '0',
    costo_promedio_usd: '0',
    impuesto_id: 1,
    unidad_base: 'Unidad',
    presentaciones: [] as PresFormItem[],
    activo: true,
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch taxes list for the dropdown
  useEffect(() => {
    async function loadTaxes() {
      try {
        const res = await fetch('/api/impuestos?active=true');
        const data = await res.json();
        if (data.success) {
          setTaxes(data.taxes || []);
        }
      } catch (e) {
        console.error('Error fetching taxes for products:', e);
      }
    }
    loadTaxes();
  }, []);

  const filteredProducts = products.filter((p) =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      nombre: '',
      precio_usd: '',
      stock_actual: '0',
      costo_promedio_usd: '0',
      impuesto_id: taxes.length > 0 ? taxes[0].id : 1,
      unidad_base: 'Unidad',
      presentaciones: [],
      activo: true,
    });
    setErrorMsg('');
    setShowModal(true);
  };

  const handleOpenEdit = (p: Producto) => {
    setEditingProduct(p);
    setFormData({
      nombre: p.nombre,
      precio_usd: String(p.precio_usd),
      stock_actual: String(p.stock_actual ?? 0),
      costo_promedio_usd: String(p.costo_promedio_usd ?? 0),
      impuesto_id: p.impuesto_id || (taxes[0]?.id ?? 1),
      unidad_base: p.unidad_base || 'Unidad',
      presentaciones: (p.presentaciones || []).map((pr) => ({
        id: pr.id,
        nombre: pr.nombre,
        factor: String(pr.factor),
        precio_usd: String(pr.precio_usd),
      })),
      activo: p.activo,
    });
    setErrorMsg('');
    setShowModal(true);
  };

  const handleAddPresentationRow = () => {
    setFormData((prev) => ({
      ...prev,
      presentaciones: [
        ...prev.presentaciones,
        { nombre: '', factor: '', precio_usd: '' },
      ],
    }));
  };

  const handleUpdatePresentationRow = (
    index: number,
    field: keyof PresFormItem,
    value: string
  ) => {
    setFormData((prev) => {
      const updated = [...prev.presentaciones];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, presentaciones: updated };
    });
  };

  const handleRemovePresentationRow = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      presentaciones: prev.presentaciones.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim() || formData.precio_usd === '') {
      setErrorMsg('Nombre y precio de venta son requeridos');
      return;
    }

    // Validar presentaciones
    for (const pr of formData.presentaciones) {
      if (!pr.nombre.trim()) {
        setErrorMsg('Cada presentación debe tener un nombre (ej: Bulto, Paquete, Caja).');
        return;
      }
      const f = Number(pr.factor);
      if (isNaN(f) || f <= 1) {
        setErrorMsg(`La presentación "${pr.nombre}" debe tener un factor mayor a 1 (ej: 20 unidades).`);
        return;
      }
      const p = Number(pr.precio_usd);
      if (isNaN(p) || p < 0) {
        setErrorMsg(`El precio de venta para "${pr.nombre}" debe ser mayor o igual a 0.`);
        return;
      }
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const url = '/api/productos';
      const method = editingProduct ? 'PUT' : 'POST';
      const body = {
        ...(editingProduct ? { id: editingProduct.id } : {}),
        nombre: formData.nombre.trim(),
        precio_usd: Number(formData.precio_usd),
        stock_actual: Number(formData.stock_actual) || 0,
        costo_promedio_usd: Number(formData.costo_promedio_usd) || 0,
        impuesto_id: Number(formData.impuesto_id) || 1,
        unidad_base: formData.unidad_base.trim() || 'Unidad',
        presentaciones: formData.presentaciones.map((pr) => ({
          ...(pr.id ? { id: pr.id } : {}),
          nombre: pr.nombre.trim(),
          factor: Number(pr.factor),
          precio_usd: Number(pr.precio_usd),
        })),
        activo: Boolean(formData.activo),
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) {
        setShowModal(false);
        onRefresh();
      } else {
        setErrorMsg(data.message || 'Error al guardar el producto');
      }
    } catch {
      setErrorMsg('Error de red al procesar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar o desactivar este producto?')) return;

    try {
      const res = await fetch(`/api/productos?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        onRefresh();
      } else {
        alert(data.message || 'Error al eliminar');
      }
    } catch {
      alert('Error al comunicarse con el servidor');
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className={`flex flex-col sm:flex-row gap-4 items-center justify-between p-5 rounded-2xl border transition-colors ${
        isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/90 shadow-sm'
      }`}>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-500/20">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h2 className={`text-xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Catálogo de Productos & Control de Inventario
            </h2>
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Administra productos, unidades de medida (Unidad, Bulto, Caja), precios y existencias
            </p>
          </div>
        </div>

        <div className="flex w-full sm:w-auto items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar producto..."
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
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-indigo-600/20 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nuevo Producto
          </button>
        </div>
      </div>

      {/* Table */}
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
                <th className="py-3.5 px-6">Producto & Presentaciones</th>
                <th className="py-3.5 px-6 text-center">Precio Unidad Base</th>
                <th className="py-3.5 px-6 text-center">Stock Disponible (Desglose)</th>
                <th className="py-3.5 px-6 text-center">Estado</th>
                <th className="py-3.5 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No se encontraron productos registrados.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const stockNum = Number(p.stock_actual) || 0;
                  const unidadBase = p.unidad_base || 'Unidad';
                  const presentaciones = p.presentaciones || [];
                  const stockDesglosado = formatStockDesgloseCompleto(p);
                  const segmentaciones = getSegmentacionExistencias(p);

                  return (
                    <tr key={p.id} className="transition-colors hover:bg-slate-500/5">
                      <td className="py-4 px-6 font-mono text-xs text-slate-400">#{p.id}</td>
                      <td className="py-4 px-6">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 font-semibold">
                            <Package className="w-4 h-4 text-indigo-500 shrink-0" />
                            <span className={isDarkMode ? 'text-white' : 'text-slate-900'}>{p.nombre}</span>
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              Base: {unidadBase}
                            </span>
                          </div>

                          {/* Presentaciones Chips */}
                          {presentaciones.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              {presentaciones.map((pr, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
                                >
                                  <Boxes className="w-3 h-3" />
                                  <span className="font-bold">{pr.nombre}</span>
                                  <span className="text-slate-400">({pr.factor} {unidadBase})</span>
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">${Number(pr.precio_usd).toFixed(2)}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-6 text-center font-mono">
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                          ${Number(p.precio_usd).toFixed(2)}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          por {unidadBase}
                        </div>
                      </td>

                      <td className="py-4 px-6 text-center">
                        <div className="space-y-1 inline-flex flex-col items-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold ${
                            stockNum > 10
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : stockNum > 0
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          }`}>
                            {stockNum <= 0 && <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
                            {stockDesglosado}
                          </span>
                          {presentaciones.length > 0 && stockNum > 0 && (
                            <>
                              <p className="text-[10px] font-mono text-slate-400">
                                (Total: {stockNum} {unidadBase}s)
                              </p>
                              <div className="flex flex-wrap items-center justify-center gap-1 mt-1 max-w-[240px]">
                                {segmentaciones.filter((s) => s.factor > 1).map((s) => (
                                  <span
                                    key={s.id ?? 'base'}
                                    className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono"
                                    title={`Disponible: ${s.unidades_completas} ${s.nombre}s a $${s.precio_usd.toFixed(2)}`}
                                  >
                                    📦 <strong>{s.unidades_completas}</strong> {s.nombre}
                                    {s.resto_unidades > 0 && (
                                      <span className="text-amber-600 dark:text-amber-400 ml-0.5">+{s.resto_unidades}u</span>
                                    )}
                                    <span className="ml-1 text-emerald-600 dark:text-emerald-400 font-bold">${s.precio_usd.toFixed(2)}</span>
                                  </span>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-6 text-center">
                        {p.activo ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle className="w-4 h-4" /> Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-400 font-medium">
                            <XCircle className="w-4 h-4" /> Inactivo
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition"
                            title="Desactivar o Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Modal Crear / Editar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
          <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl p-6 my-8 transition-all max-h-[90vh] overflow-y-auto ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-500" />
              {editingProduct ? 'Editar Producto & Unidades de Medida' : 'Nuevo Producto & Presentaciones'}
            </h3>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nombre del Producto */}
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Harina de Maíz Precocida"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                    isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              {/* Unidad Base y Precio Base */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <Scale className="w-3.5 h-3.5 text-indigo-500" /> Unidad Base *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Unidad, Kg, Paquete"
                    value={formData.unidad_base}
                    onChange={(e) => setFormData({ ...formData, unidad_base: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                      isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    La unidad mínima de inventario
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                    Precio Venta Unidad (USD) *
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                      value={formData.precio_usd}
                      onChange={(e) => setFormData({ ...formData, precio_usd: e.target.value })}
                      className={`w-full pl-9 pr-3 py-2 rounded-xl border text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                    Alícuota de Impuesto *
                  </label>
                  <select
                    value={formData.impuesto_id}
                    onChange={(e) => setFormData({ ...formData, impuesto_id: Number(e.target.value) })}
                    className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                      isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    {taxes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre} ({t.porcentaje}%)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SECCIÓN DE PRESENTACIONES / BULTO / CAJA */}
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                      <Boxes className="w-4 h-4" /> Presentaciones Mayores (Bulto, Caja, Paquete)
                    </h4>
                    <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Permite comprar o vender en bultos con precio propio al mayor. El stock se descuenta en unidades base automáticamente.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPresentationRow}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar Presentación
                  </button>
                </div>

                {formData.presentaciones.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2 text-center">
                    No tiene presentaciones configuradas (solo se venderá por {formData.unidad_base || 'Unidad'}).
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-2 text-[11px] font-bold uppercase text-slate-400 px-1">
                      <span className="col-span-4">Nombre (ej: Bulto)</span>
                      <span className="col-span-3">Equivale a ({formData.unidad_base || 'Unidades'})</span>
                      <span className="col-span-4">Precio Venta (USD)</span>
                      <span className="col-span-1 text-center">Quitar</span>
                    </div>

                    {formData.presentaciones.map((pr, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-4">
                          <input
                            type="text"
                            required
                            placeholder="Ej: Bulto"
                            value={pr.nombre}
                            onChange={(e) => handleUpdatePresentationRow(index, 'nombre', e.target.value)}
                            className={`w-full px-3 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                              isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                            }`}
                          />
                        </div>

                        <div className="col-span-3">
                          <input
                            type="number"
                            min="2"
                            step="any"
                            required
                            placeholder="Ej: 20"
                            value={pr.factor}
                            onChange={(e) => handleUpdatePresentationRow(index, 'factor', e.target.value)}
                            className={`w-full px-3 py-1.5 rounded-xl border text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                              isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                            }`}
                          />
                        </div>

                        <div className="col-span-4 relative">
                          <DollarSign className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            placeholder="0.00"
                            value={pr.precio_usd}
                            onChange={(e) => handleUpdatePresentationRow(index, 'precio_usd', e.target.value)}
                            className={`w-full pl-7 pr-3 py-1.5 rounded-xl border text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                              isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                            }`}
                          />
                        </div>

                        <div className="col-span-1 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemovePresentationRow(index)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                            title="Eliminar presentación"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stock y Costo Promedio */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                    Stock Actual ({formData.unidad_base || 'Unidades'} base)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.stock_actual}
                    onChange={(e) => setFormData({ ...formData, stock_actual: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                      isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Siempre se contabiliza en la unidad base ({formData.unidad_base || 'Unidad'})
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                    Costo Promedio (USD por {formData.unidad_base || 'Unidad'})
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={formData.costo_promedio_usd}
                      onChange={(e) => setFormData({ ...formData, costo_promedio_usd: e.target.value })}
                      className={`w-full pl-9 pr-3 py-2 rounded-xl border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="prodActivoCheck"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="prodActivoCheck" className="text-xs font-medium cursor-pointer">
                  Producto activo para venta
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
