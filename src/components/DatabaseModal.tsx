'use client';

import { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertCircle, RefreshCw, KeyRound, Server, HardDrive } from 'lucide-react';

interface ConfigForm {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
  ssl: boolean;
}

export default function DatabaseModal({
  isOpen,
  onClose,
  onConnected,
  isDarkMode = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConnected: () => void;
  isDarkMode?: boolean;
}) {
  const [formData, setFormData] = useState<ConfigForm>({
    host: 'localhost',
    port: 5432,
    user: 'adempiere',
    password: '',
    database: 'luis',
    ssl: false,
  });
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/config')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.config) {
            setFormData((prev) => ({
              ...prev,
              host: data.config.host || 'localhost',
              port: data.config.port || 5432,
              user: data.config.user || 'adempiere',
              database: data.config.database || 'luis',
              ssl: !!data.config.ssl,
            }));
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestOrSave = async (isSave: boolean) => {
    if (isSave) setSaving(true);
    else setTesting(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, testOnly: !isSave }),
      });
      const data = await res.json();

      if (data.success) {
        setStatusMessage({
          type: 'success',
          text: isSave
            ? '¡Configuración guardada y base de datos sincronizada con éxito!'
            : '¡Prueba exitosa! Conexión verificada a PostgreSQL.',
        });
        if (isSave) {
          setTimeout(() => {
            onConnected();
            onClose();
          }, 1200);
        }
      } else {
        setStatusMessage({
          type: 'error',
          text: data.message || 'Error al conectar con la base de datos.',
        });
      }
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'No se pudo comunicar con el servidor backend.',
      });
    } finally {
      setTesting(false);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className={`border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden transition-colors ${
        isDarkMode
          ? 'bg-slate-900 border-slate-700/80 text-slate-100'
          : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className={`px-6 py-5 border-b flex items-center justify-between ${
          isDarkMode
            ? 'border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900'
            : 'border-slate-100 bg-gradient-to-r from-indigo-50/50 via-white to-white'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className={`text-lg font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Configuración PostgreSQL
              </h2>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Parámetros de conexión y sincronización de tablas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl text-sm flex items-start gap-3 border ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
              )}
              <div className="leading-snug">{statusMessage.text}</div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-1.5 ${
                isDarkMode ? 'text-slate-400' : 'text-slate-600'
              }`}>
                <Server className="w-3.5 h-3.5 text-indigo-500" /> Host
              </label>
              <input
                type="text"
                value={formData.host}
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                placeholder="localhost o IP"
                className={`w-full rounded-xl px-3.5 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                  isDarkMode
                    ? 'bg-slate-800/80 border-slate-700 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
            <div>
              <label className={`text-xs font-semibold uppercase tracking-wider mb-1.5 block ${
                isDarkMode ? 'text-slate-400' : 'text-slate-600'
              }`}>
                Puerto
              </label>
              <input
                type="number"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                className={`w-full rounded-xl px-3.5 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                  isDarkMode
                    ? 'bg-slate-800/80 border-slate-700 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-1.5 ${
                isDarkMode ? 'text-slate-400' : 'text-slate-600'
              }`}>
                <HardDrive className="w-3.5 h-3.5 text-indigo-500" /> Base de Datos
              </label>
              <input
                type="text"
                value={formData.database}
                onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                placeholder="luis"
                className={`w-full rounded-xl px-3.5 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                  isDarkMode
                    ? 'bg-slate-800/80 border-slate-700 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
            <div>
              <label className={`text-xs font-semibold uppercase tracking-wider mb-1.5 block ${
                isDarkMode ? 'text-slate-400' : 'text-slate-600'
              }`}>
                Usuario
              </label>
              <input
                type="text"
                value={formData.user}
                onChange={(e) => setFormData({ ...formData, user: e.target.value })}
                placeholder="adempiere"
                className={`w-full rounded-xl px-3.5 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                  isDarkMode
                    ? 'bg-slate-800/80 border-slate-700 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
          </div>

          <div>
            <label className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-1.5 ${
              isDarkMode ? 'text-slate-400' : 'text-slate-600'
            }`}>
              <KeyRound className="w-3.5 h-3.5 text-indigo-500" /> Contraseña
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Contraseña de PostgreSQL"
              className={`w-full rounded-xl px-3.5 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                isDarkMode
                  ? 'bg-slate-800/80 border-slate-700 text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="sslCheck"
              checked={formData.ssl}
              onChange={(e) => setFormData({ ...formData, ssl: e.target.checked })}
              className="rounded bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="sslCheck" className={`text-xs cursor-pointer ${
              isDarkMode ? 'text-slate-300' : 'text-slate-600'
            }`}>
              Habilitar SSL (para servicios en la nube como Neon, Supabase, RDS)
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t flex items-center justify-between gap-3 ${
          isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-100'
        }`}>
          <button
            type="button"
            onClick={() => handleTestOrSave(false)}
            disabled={testing || saving}
            className={`px-4 py-2 rounded-xl text-xs font-medium border transition disabled:opacity-50 flex items-center gap-2 ${
              isDarkMode
                ? 'border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
                : 'border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {testing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            Probar Conexión
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => handleTestOrSave(true)}
              disabled={testing || saving}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              Guardar y Conectar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
