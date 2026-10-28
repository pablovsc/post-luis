'use client';

import { useState, useEffect } from 'react';
import { Impuesto } from '@/types';
import {
  Percent,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface ImpuestosViewProps {
  isDarkMode?: boolean;
  onRefresh?: () => void;
}

export default function ImpuestosView({ isDarkMode = false, onRefresh }: ImpuestosViewProps) {
  const [taxes, setTaxes] = useState<Impuesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTax, setEditingTax] = useState<Impuesto | null>(null);
  const [formData, setFormData] = useState({ nombre: '', porcentaje: '', activo: true });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchTaxes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/impuestos');
      const data = await res.json();
      if (data.success) {
        setTaxes(data.taxes || []);
      }
    } catch (e) {
      console.error('Error fetching taxes:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxes();
  }, []);

  const handleOpenAdd = () => {
    setEditingTax(null);
    setFormData({ nombre: '', porcentaje: '', activo: true });
    setErrorMsg('');
    setShowModal(true);
  };

  const handleOpenEdit = (tax: Impuesto) => {
    setEditingTax(tax);
    setFormData({
      nombre: tax.nombre,
      porcentaje: String(tax.porcentaje),
      activo: tax.activo,
    });
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim() || formData.porcentaje === '') {
      setErrorMsg('Nombre y porcentaje son obligatorios');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const method = editingTax ? 'PUT' : 'POST';
      const body = editingTax
        ? { id: editingTax.id, ...formData, porcentaje: Number(formData.porcentaje) }
        : { ...formData, porcentaje: Number(formData.porcentaje) };

      const res = await fetch('/api/impuestos', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) {
        setShowModal(false);
        fetchTaxes();
        if (onRefresh) onRefresh();
      } else {
        setErrorMsg(data.message || 'Error al guardar el impuesto');
      }
    } catch {
      setErrorMsg('Error de red al procesar la solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (id === 1 || id === 2) {
      alert('Los impuestos base del sistema (IVA 16% y Exento) no pueden eliminarse.');
      return;
    }
    if (!confirm('¿Estás seguro de eliminar o desactivar esta alícuota de impuesto?')) return;

    try {
      const res = await fetch(`/api/impuestos?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchTaxes();
        if (onRefresh) onRefresh();
      } else {
        alert(data.message || 'Error al eliminar');
      }
    } catch {
      alert('Error de conexión con el servidor');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex flex-col sm:flex-row gap-4 items-center justify-between p-5 rounded-2xl border transition-colors ${
        isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/90 shadow-sm'
      }`}>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-500/20">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <h2 className={`text-xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Configuración de Impuestos
            </h2>
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Define las alícuotas impositivas (IVA general, exento, etc.) para compras y ventas
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-indigo-600/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nueva Alícuota
        </button>
      </div>

      {/* Taxes Table */}
      <div className={`rounded-2xl border overflow-hidden transition-colors ${
        isDarkMode ? 'bg-slate-900/60 border-slate-800/80 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <table className="w-full text-left text-sm">
          <thead className={`text-xs uppercase tracking-wider border-b transition-colors ${
            isDarkMode ? 'bg-slate-950/70 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
          }`}>
            <tr>
              <th className="py-3.5 px-6">ID</th>
              <th className="py-3.5 px-6">Nombre de la Alícuota</th>
              <th className="py-3.5 px-6 text-center">Porcentaje (%)</th>
              <th className="py-3.5 px-6 text-center">Estado</th>
              <th className="py-3.5 px-6 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                  <span className="text-xs text-slate-400">Cargando impuestos...</span>
                </td>
              </tr>
            ) : taxes.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-slate-400">
                  No hay alícuotas registradas.
                </td>
              </tr>
            ) : (
              taxes.map((tax) => (
                <tr key={tax.id} className="transition-colors hover:bg-slate-500/5">
                  <td className="py-4 px-6 font-mono text-xs text-slate-400">#{tax.id}</td>
                  <td className="py-4 px-6 font-semibold flex items-center gap-2">
                    <span>{tax.nombre}</span>
                    {(tax.id === 1 || tax.id === 2) && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-medium">
                        Sistema
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-center font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
                    {Number(tax.porcentaje).toFixed(2)}%
                  </td>
                  <td className="py-4 px-6 text-center">
                    {tax.activo ? (
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
                        onClick={() => handleOpenEdit(tax)}
                        className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {tax.id !== 1 && tax.id !== 2 && (
                        <button
                          onClick={() => handleDelete(tax.id)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition"
                          title="Eliminar o Desactivar"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Modal Crear / Editar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 transition-all ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Percent className="w-5 h-5 text-indigo-500" />
              {editingTax ? 'Editar Alícuota' : 'Nueva Alícuota de Impuesto'}
            </h3>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                  Nombre descriptivo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: IVA 16%, Exento, Reducido 8%"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                    isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                  Porcentaje (%) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  required
                  placeholder="Ej: 16.00 o 0.00"
                  value={formData.porcentaje}
                  onChange={(e) => setFormData({ ...formData, porcentaje: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                    isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="taxActivoCheck"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="taxActivoCheck" className="text-xs font-medium cursor-pointer">
                  Alícuota activa para selección
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
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingTax ? 'Guardar Cambios' : 'Crear Alícuota'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
