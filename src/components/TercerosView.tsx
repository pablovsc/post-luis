'use client';

import { useState, useEffect } from 'react';
import { Tercero, TipoTercero } from '@/types';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Building,
  UserCheck,
  CheckCircle,
  XCircle,
  Loader2,
  Filter,
} from 'lucide-react';

interface TercerosViewProps {
  isDarkMode?: boolean;
}

export default function TercerosView({ isDarkMode = false }: TercerosViewProps) {
  const [terceros, setTerceros] = useState<Tercero[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<'TODOS' | TipoTercero>('TODOS');
  const [showModal, setShowModal] = useState(false);
  const [editingTercero, setEditingTercero] = useState<Tercero | null>(null);
  const [formData, setFormData] = useState({
    tipo: 'CLIENTE' as TipoTercero,
    identificacion: '',
    razon_social_nombre: '',
    direccion: '',
    telefono: '',
    email: '',
    activo: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchTerceros = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/terceros');
      const data = await res.json();
      if (data.success) {
        setTerceros(data.terceros || []);
      }
    } catch (e) {
      console.error('Error fetching terceros:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTerceros();
  }, []);

  const handleOpenAdd = () => {
    setEditingTercero(null);
    setFormData({
      tipo: 'CLIENTE',
      identificacion: '',
      razon_social_nombre: '',
      direccion: '',
      telefono: '',
      email: '',
      activo: true,
    });
    setErrorMsg('');
    setSuccessMsg('');
    setShowModal(true);
  };

  const handleOpenEdit = (t: Tercero) => {
    setEditingTercero(t);
    setFormData({
      tipo: t.tipo,
      identificacion: t.identificacion,
      razon_social_nombre: t.razon_social_nombre,
      direccion: t.direccion || '',
      telefono: t.telefono || '',
      email: t.email || '',
      activo: t.activo,
    });
    setErrorMsg('');
    setSuccessMsg('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.identificacion.trim() || !formData.razon_social_nombre.trim()) {
      setErrorMsg('Identificación y Razón Social / Nombre son obligatorios');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const method = editingTercero ? 'PUT' : 'POST';
      const body = editingTercero ? { id: editingTercero.id, ...formData } : formData;

      const res = await fetch('/api/terceros', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) {
        setShowModal(false);
        fetchTerceros();
      } else {
        setErrorMsg(data.message || 'Error al guardar');
      }
    } catch {
      setErrorMsg('Error de red al procesar la solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (id === 1) {
      alert('No se puede eliminar el Cliente Genérico del sistema.');
      return;
    }
    if (!confirm('¿Estás seguro de eliminar o desactivar este registro?')) return;

    try {
      const res = await fetch(`/api/terceros?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchTerceros();
      } else {
        alert(data.message || 'Error al procesar la solicitud');
      }
    } catch {
      alert('Error de conexión con el servidor');
    }
  };

  const filteredTerceros = terceros.filter((t) => {
    const matchesFilter =
      filterTipo === 'TODOS'
        ? true
        : filterTipo === 'CLIENTE'
        ? t.tipo === 'CLIENTE' || t.tipo === 'AMBOS'
        : filterTipo === 'PROVEEDOR'
        ? t.tipo === 'PROVEEDOR' || t.tipo === 'AMBOS'
        : t.tipo === 'AMBOS';

    const term = searchTerm.toLowerCase();
    const matchesSearch =
      t.identificacion.toLowerCase().includes(term) ||
      t.razon_social_nombre.toLowerCase().includes(term) ||
      (t.telefono && t.telefono.toLowerCase().includes(term)) ||
      (t.email && t.email.toLowerCase().includes(term));

    return matchesFilter && matchesSearch;
  });

  const countClientes = terceros.filter((t) => t.tipo === 'CLIENTE' || t.tipo === 'AMBOS').length;
  const countProveedores = terceros.filter((t) => t.tipo === 'PROVEEDOR' || t.tipo === 'AMBOS').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex flex-col sm:flex-row gap-4 items-center justify-between p-5 rounded-2xl border transition-colors ${
        isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/90 shadow-sm'
      }`}>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className={`text-xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Clientes y Proveedores
            </h2>
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Gestión centralizada de terceros para compras y ventas
            </p>
          </div>
        </div>

        <div className="flex w-full sm:w-auto items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por RIF, nombre o telf..."
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
            Nuevo Tercero
          </button>
        </div>
      </div>

      {/* Filter Tabs & Quick Counters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className={`flex items-center p-1 rounded-xl border transition-colors ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          {(['TODOS', 'CLIENTE', 'PROVEEDOR', 'AMBOS'] as const).map((tipo) => (
            <button
              key={tipo}
              onClick={() => setFilterTipo(tipo)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filterTipo === tipo
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tipo === 'TODOS'
                ? 'Todos'
                : tipo === 'CLIENTE'
                ? `Clientes (${countClientes})`
                : tipo === 'PROVEEDOR'
                ? `Proveedores (${countProveedores})`
                : 'Ambos Roles'}
            </button>
          ))}
        </div>

        <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Total: <span className="font-semibold text-indigo-500">{filteredTerceros.length}</span> registros encontrados
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
                <th className="py-3.5 px-6">Identificación (RIF/CI)</th>
                <th className="py-3.5 px-6">Razón Social / Nombre</th>
                <th className="py-3.5 px-6">Tipo</th>
                <th className="py-3.5 px-6">Contacto</th>
                <th className="py-3.5 px-6">Dirección</th>
                <th className="py-3.5 px-6 text-center">Estado</th>
                <th className="py-3.5 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                    <span className="text-xs text-slate-400">Cargando terceros...</span>
                  </td>
                </tr>
              ) : filteredTerceros.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No se encontraron clientes o proveedores registrados.
                  </td>
                </tr>
              ) : (
                filteredTerceros.map((t) => (
                  <tr
                    key={t.id}
                    className={`transition-colors hover:bg-slate-500/5 ${
                      t.id === 1 ? 'bg-indigo-500/5' : ''
                    }`}
                  >
                    <td className="py-4 px-6 font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      {t.identificacion}
                      {t.id === 1 && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                          Predeterminado
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 font-medium">
                      <div className="flex items-center gap-2">
                        {t.tipo === 'PROVEEDOR' ? (
                          <Building className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                          <UserCheck className="w-4 h-4 text-indigo-500 shrink-0" />
                        )}
                        <span>{t.razon_social_nombre}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        t.tipo === 'CLIENTE'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                          : t.tipo === 'PROVEEDOR'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                      }`}>
                        {t.tipo}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-500 dark:text-slate-400">
                      {t.telefono && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{t.telefono}</span>
                        </div>
                      )}
                      {t.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{t.email}</span>
                        </div>
                      )}
                      {!t.telefono && !t.email && <span className="text-slate-400 italic">Sin datos</span>}
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate">
                      {t.direccion || <span className="text-slate-400 italic">No indicada</span>}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {t.activo ? (
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
                          onClick={() => handleOpenEdit(t)}
                          className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {t.id !== 1 && (
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition"
                            title="Desactivar o Eliminar"
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
      </div>

      {/* Modal Crear / Editar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl p-6 transition-all ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              {editingTercero ? 'Editar Cliente / Proveedor' : 'Nuevo Cliente / Proveedor'}
            </h3>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                    Tipo de Registro *
                  </label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value as TipoTercero })}
                    className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                      isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <option value="CLIENTE">Cliente</option>
                    <option value="PROVEEDOR">Proveedor</option>
                    <option value="AMBOS">Ambos (Cliente y Proveedor)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                    Identificación (RIF / CI / DNI) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: V-12345678 o J-12345678-0"
                    value={formData.identificacion}
                    onChange={(e) => setFormData({ ...formData, identificacion: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                      isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                  Razón Social / Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Distribuidora Los Andes C.A. o Juan Pérez"
                  value={formData.razon_social_nombre}
                  onChange={(e) => setFormData({ ...formData, razon_social_nombre: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                    isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 0414-1234567"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                      isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    placeholder="contacto@ejemplo.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                      isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                  Dirección Fiscal / Física
                </label>
                <textarea
                  rows={2}
                  placeholder="Calle, avenida, local o ciudad..."
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                    isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="activoCheck"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="activoCheck" className="text-xs font-medium cursor-pointer">
                  Registro activo para operaciones
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
                  {editingTercero ? 'Guardar Cambios' : 'Registrar Tercero'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
