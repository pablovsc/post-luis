'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  KeyRound,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  RefreshCw,
  Search,
  Lock,
  Mail,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { Usuario, Rol, ModuloPermiso } from '@/types';

const MODULOS_DISPONIBLES: { id: ModuloPermiso; label: string; desc: string }[] = [
  { id: 'pos', label: 'Punto de Venta (POS)', desc: 'Facturación y cobro directo' },
  { id: 'orders', label: 'Historial de Pedidos', desc: 'Consultar y reimprimir ventas' },
  { id: 'compras', label: 'Compras', desc: 'Registro de facturas de proveedores' },
  { id: 'products', label: 'Productos / Inventario', desc: 'Administrar catálogo, precios y stock' },
  { id: 'terceros', label: 'Clientes y Proveedores', desc: 'Gestión de terceros y contactos' },
  { id: 'rates', label: 'Tasa de Cambio', desc: 'Modificar y sincronizar tasa oficial' },
  { id: 'impuestos', label: 'Impuestos', desc: 'Configurar IVA y tipos de alícuotas' },
  { id: 'reports', label: 'Reportes de Ventas e Inventario', desc: 'Reportes analíticos de movimiento' },
  { id: 'reports_profit', label: 'Reportes de Rentabilidad', desc: 'Márgenes de ganancia y costos' },
  { id: 'users', label: 'Gestión de Usuarios', desc: 'Crear usuarios y asignar roles' },
  { id: 'maintenance', label: 'Mantenimiento / Respaldos', desc: 'Consola de base de datos y copias' },
];

export default function UsuariosView({
  isDarkMode = false,
  currentUser,
}: {
  isDarkMode?: boolean;
  currentUser?: Usuario | null;
}) {
  const [activeSubTab, setActiveSubTab] = useState<'usuarios' | 'roles'>('usuarios');
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modales
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [userFormData, setUserFormData] = useState({
    username: '',
    password: '',
    nombre_completo: '',
    email: '',
    rol_id: 1,
    activo: true,
  });

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Rol | null>(null);
  const [roleFormData, setRoleFormData] = useState<{
    nombre: string;
    descripcion: string;
    permisos: ModuloPermiso[];
    activo: boolean;
  }>({
    nombre: '',
    descripcion: '',
    permisos: [],
    activo: true,
  });

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        fetch('/api/usuarios').then((r) => r.json()),
        fetch('/api/roles').then((r) => r.json()),
      ]);

      if (usersRes.success) setUsuarios(usersRes.users || []);
      if (rolesRes.success) setRoles(rolesRes.roles || []);
    } catch {
      setMessage({ type: 'error', text: 'Error al cargar usuarios y roles' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Abrir modal de usuario
  const handleOpenUserModal = (user?: Usuario) => {
    if (user) {
      setEditingUser(user);
      setUserFormData({
        username: user.username,
        password: '',
        nombre_completo: user.nombre_completo,
        email: user.email || '',
        rol_id: user.rol_id,
        activo: user.activo,
      });
    } else {
      setEditingUser(null);
      setUserFormData({
        username: '',
        password: '',
        nombre_completo: '',
        email: '',
        rol_id: roles[0]?.id || 1,
        activo: true,
      });
    }
    setShowUserModal(true);
  };

  // Guardar usuario
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!userFormData.username.trim() || !userFormData.nombre_completo.trim()) {
      setMessage({ type: 'error', text: 'Nombre y usuario son obligatorios.' });
      return;
    }

    if (!editingUser && !userFormData.password) {
      setMessage({ type: 'error', text: 'Debe ingresar una contraseña para el nuevo usuario.' });
      return;
    }

    try {
      const method = editingUser ? 'PUT' : 'POST';
      const body = editingUser
        ? { id: editingUser.id, ...userFormData }
        : userFormData;

      const res = await fetch('/api/usuarios', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setShowUserModal(false);
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error al guardar usuario.' });
    }
  };

  // Eliminar usuario
  const handleDeleteUser = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    try {
      const res = await fetch(`/api/usuarios?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error al eliminar usuario.' });
    }
  };

  // Abrir modal de rol
  const handleOpenRoleModal = (role?: Rol) => {
    if (role) {
      setEditingRole(role);
      setRoleFormData({
        nombre: role.nombre,
        descripcion: role.descripcion || '',
        permisos: [...role.permisos],
        activo: role.activo,
      });
    } else {
      setEditingRole(null);
      setRoleFormData({
        nombre: '',
        descripcion: '',
        permisos: ['pos', 'orders'],
        activo: true,
      });
    }
    setShowRoleModal(true);
  };

  // Toggle permiso en el rol
  const handleTogglePermission = (modId: ModuloPermiso) => {
    setRoleFormData((prev) => {
      const exists = prev.permisos.includes(modId);
      return {
        ...prev,
        permisos: exists
          ? prev.permisos.filter((p) => p !== modId)
          : [...prev.permisos, modId],
      };
    });
  };

  // Guardar rol
  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleFormData.nombre.trim()) {
      setMessage({ type: 'error', text: 'El nombre del rol es obligatorio.' });
      return;
    }

    try {
      const method = editingRole ? 'PUT' : 'POST';
      const body = editingRole
        ? { id: editingRole.id, ...roleFormData }
        : roleFormData;

      const res = await fetch('/api/roles', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setShowRoleModal(false);
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error al guardar el rol.' });
    }
  };

  const filteredUsuarios = usuarios.filter(
    (u) =>
      u.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.rol_nombre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className={`p-5 rounded-2xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className={`text-xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Usuarios, Roles y Permisos
            </h2>
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Controla quién puede acceder a ventas, compras, reportes y configuraciones
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === 'usuarios' ? (
            <button
              onClick={() => handleOpenUserModal()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Nuevo Usuario
            </button>
          ) : (
            <button
              onClick={() => handleOpenRoleModal()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/20 transition cursor-pointer"
            >
              <Shield className="w-4 h-4" />
              Nuevo Rol
            </button>
          )}

          <button
            onClick={fetchData}
            disabled={loading}
            className={`p-2 rounded-xl border transition ${
              isDarkMode
                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Alerta de Estado */}
      {message && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            message.type === 'success'
              ? isDarkMode
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                : 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : isDarkMode
              ? 'bg-rose-950/30 border-rose-500/30 text-rose-300'
              : 'bg-rose-50 border-rose-300 text-rose-800'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="font-bold ml-2">
            ×
          </button>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('usuarios')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'usuarios'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : isDarkMode
              ? 'text-slate-400 hover:text-white'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          Usuarios ({usuarios.length})
        </button>
        <button
          onClick={() => setActiveSubTab('roles')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'roles'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : isDarkMode
              ? 'text-slate-400 hover:text-white'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Shield className="w-4 h-4" />
          Roles y Permisos ({roles.length})
        </button>
      </div>

      {/* CONTENIDO: USUARIOS */}
      {activeSubTab === 'usuarios' && (
        <div className="space-y-4">
          {/* Barra de Búsqueda */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar usuario por nombre, login o rol..."
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition ${
                isDarkMode
                  ? 'bg-slate-900/60 border-slate-800 text-white placeholder-slate-500'
                  : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          {/* Tabla de Usuarios */}
          <div
            className={`rounded-2xl border overflow-hidden transition-colors ${
              isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr
                    className={`border-b uppercase font-bold tracking-wider ${
                      isDarkMode
                        ? 'bg-slate-950/40 border-slate-800 text-slate-400'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    <th className="p-3.5 pl-5">Usuario / Login</th>
                    <th className="p-3.5">Nombre Completo</th>
                    <th className="p-3.5">Rol Asignado</th>
                    <th className="p-3.5">Estado</th>
                    <th className="p-3.5">Último Acceso</th>
                    <th className="p-3.5 pr-5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredUsuarios.map((u) => {
                    const isSuper = u.id === 1;
                    const isSelf = currentUser?.id === u.id;
                    return (
                      <tr
                        key={u.id}
                        className={`transition hover:bg-slate-50 dark:hover:bg-slate-800/30 ${
                          !u.activo ? 'opacity-60 bg-rose-50/20 dark:bg-rose-950/10' : ''
                        }`}
                      >
                        <td className="p-3.5 pl-5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white font-bold flex items-center justify-center text-xs">
                              {u.username.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold flex items-center gap-1.5">
                                @{u.username}
                                {isSelf && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    Tú
                                  </span>
                                )}
                              </div>
                              {u.email && <div className="text-[11px] text-slate-400">{u.email}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 font-medium">{u.nombre_completo}</td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                            {u.rol_nombre || 'Sin Rol'}
                          </span>
                        </td>
                        <td className="p-3.5">
                          {u.activo ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-500 font-semibold text-[11px]">
                              <XCircle className="w-3.5 h-3.5" /> Inactivo
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-400">{u.ultimo_acceso || 'Nunca'}</td>
                        <td className="p-3.5 pr-5 text-right space-x-1">
                          <button
                            onClick={() => handleOpenUserModal(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                            title="Editar usuario"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {!isSuper && (
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                              title="Eliminar usuario"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredUsuarios.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        No se encontraron usuarios.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO: ROLES */}
      {activeSubTab === 'roles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((r) => {
            const isAdmin = r.id === 1;
            return (
              <div
                key={r.id}
                className={`p-5 rounded-2xl border transition shadow-sm flex flex-col justify-between ${
                  isDarkMode
                    ? 'bg-slate-900/60 border-slate-800'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-base flex items-center gap-2">
                      <Shield className="w-4 h-4 text-purple-500" />
                      {r.nombre}
                    </h3>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {r.total_usuarios || 0} usuario(s)
                      </span>
                      <button
                        onClick={() => handleOpenRoleModal(r)}
                        className="p-1 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition"
                        title="Editar permisos del rol"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">{r.descripcion || 'Sin descripción'}</p>

                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Módulos Habilitados ({r.permisos.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {MODULOS_DISPONIBLES.map((m) => {
                        const hasPerm = r.permisos.includes(m.id);
                        return (
                          <span
                            key={m.id}
                            className={`text-[10px] px-2 py-0.5 rounded-md font-medium border flex items-center gap-1 ${
                              hasPerm
                                ? isDarkMode
                                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : 'opacity-30 border-dashed border-slate-300 dark:border-slate-700 text-slate-400'
                            }`}
                          >
                            {hasPerm ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : '✕'}{' '}
                            {m.label.split('(')[0].trim()}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: CREAR/EDITAR USUARIO */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div
              className={`p-5 border-b flex items-center justify-between ${
                isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-100'
              }`}
            >
              <h3 className="font-bold text-base flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-500" />
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h3>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Login / Nombre de Usuario *
                  </label>
                  <input
                    type="text"
                    required
                    value={userFormData.username}
                    onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                    placeholder="ej: cajero2"
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium focus:ring-2 focus:ring-indigo-500/50 ${
                      isDarkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={userFormData.nombre_completo}
                    onChange={(e) => setUserFormData({ ...userFormData, nombre_completo: e.target.value })}
                    placeholder="ej: Pedro Pérez"
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium focus:ring-2 focus:ring-indigo-500/50 ${
                      isDarkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>{editingUser ? 'Nueva Contraseña (dejar en blanco para no cambiar)' : 'Contraseña *'}</span>
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  placeholder="••••••••"
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium focus:ring-2 focus:ring-indigo-500/50 ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    placeholder="opcional@correo.com"
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium focus:ring-2 focus:ring-indigo-500/50 ${
                      isDarkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Rol y Permisos
                  </label>
                  <select
                    value={userFormData.rol_id}
                    onChange={(e) => setUserFormData({ ...userFormData, rol_id: Number(e.target.value) })}
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium focus:ring-2 focus:ring-indigo-500/50 ${
                      isDarkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={userFormData.activo}
                    onChange={(e) => setUserFormData({ ...userFormData, activo: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Usuario Activo (Permitir acceso al sistema)</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20"
                >
                  Guardar Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR ROL Y PERMISOS */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div
              className={`p-5 border-b flex items-center justify-between ${
                isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-100'
              }`}
            >
              <h3 className="font-bold text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-500" />
                {editingRole ? `Configurar Permisos: ${editingRole.nombre}` : 'Nuevo Rol'}
              </h3>
              <button
                onClick={() => setShowRoleModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Nombre del Rol *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={editingRole?.id === 1}
                    value={roleFormData.nombre}
                    onChange={(e) => setRoleFormData({ ...roleFormData, nombre: e.target.value })}
                    placeholder="ej: SUPERVISOR"
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium focus:ring-2 focus:ring-purple-500/50 ${
                      isDarkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Descripción
                  </label>
                  <input
                    type="text"
                    value={roleFormData.descripcion}
                    onChange={(e) => setRoleFormData({ ...roleFormData, descripcion: e.target.value })}
                    placeholder="ej: Acceso solo a facturación y caja"
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium focus:ring-2 focus:ring-purple-500/50 ${
                      isDarkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                  Selecciona los módulos a los que tendrá acceso este rol:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {MODULOS_DISPONIBLES.map((mod) => {
                    const isChecked = roleFormData.permisos.includes(mod.id);
                    return (
                      <div
                        key={mod.id}
                        onClick={() => handleTogglePermission(mod.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                          isChecked
                            ? isDarkMode
                              ? 'bg-purple-950/30 border-purple-500/50 text-purple-200'
                              : 'bg-purple-50/70 border-purple-300 text-purple-900'
                            : isDarkMode
                            ? 'bg-slate-800/40 border-slate-800 text-slate-400 hover:border-slate-700'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                        />
                        <div className="text-xs">
                          <div className="font-bold">{mod.label}</div>
                          <div className="text-[11px] opacity-75">{mod.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/20"
                >
                  Guardar Permisos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

