'use client';

import { useState } from 'react';
import { Tasa } from '@/types';
import { TrendingUp, Calendar, CheckCircle2, History, AlertCircle, Loader2 } from 'lucide-react';

interface RatesViewProps {
  currentRate: Tasa | null;
  historyRates: Tasa[];
  onRefresh: () => void;
  isDarkMode?: boolean;
}

export default function RatesView({ currentRate, historyRates, onRefresh, isDarkMode = false }: RatesViewProps) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [fecha, setFecha] = useState(todayStr);
  const [tasaValor, setTasaValor] = useState(currentRate ? String(currentRate.tasa) : '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tasaValor || isNaN(Number(tasaValor)) || Number(tasaValor) <= 0) {
      setMessage({ type: 'error', text: 'Ingresa un valor de tasa válido y mayor a 0' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/tasa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha, tasa: Number(tasaValor) }),
      });
      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: `Tasa guardada exitosamente para la fecha ${fecha}.` });
        onRefresh();
      } else {
        setMessage({ type: 'error', text: data.message || 'Error al guardar la tasa' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error al comunicarse con el servidor' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`p-5 rounded-2xl border transition-colors flex items-center justify-between ${
        isDarkMode
          ? 'bg-slate-900/60 border-slate-800'
          : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h2 className={`text-xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Tasa de Cambio del Día
            </h2>
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Actualiza la tasa oficial para la conversión automática de tus ventas
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Active Rate Card & Form */}
        <div className="lg:col-span-1 space-y-6">
          {/* Active Card */}
          <div className={`relative overflow-hidden rounded-2xl border p-6 transition-colors shadow-lg ${
            isDarkMode
              ? 'bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-950 border-indigo-500/30'
              : 'bg-gradient-to-br from-indigo-50 via-white to-indigo-50/30 border-indigo-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <span className={`text-xs uppercase font-bold tracking-wider ${
                isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
              }`}>
                Tasa Vigente
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                En Uso
              </span>
            </div>

            <div className={`text-3xl font-black tracking-tight font-mono ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              {currentRate ? `${Number(currentRate.tasa).toFixed(4)}` : 'Sin registrar'}
            </div>
            <div className={`text-xs mt-1 flex items-center gap-1.5 ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              Fecha: {currentRate ? currentRate.fecha : 'Ninguna'}
            </div>
          </div>

          {/* Form */}
          <div className={`rounded-2xl border p-6 transition-colors ${
            isDarkMode
              ? 'bg-slate-900/60 border-slate-800 shadow-xl'
              : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              <Calendar className="w-4 h-4 text-indigo-500" />
              Registrar / Actualizar Tasa
            </h3>

            {message && (
              <div
                className={`p-3.5 rounded-xl text-xs mb-4 flex items-start gap-2.5 border ${
                  message.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={`text-xs font-semibold uppercase tracking-wider mb-1.5 block ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  Fecha
                </label>
                <input
                  type="date"
                  required
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className={`w-full rounded-xl px-3.5 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
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
                  Valor de Tasa *
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  required
                  placeholder="0.0000"
                  value={tasaValor}
                  onChange={(e) => setTasaValor(e.target.value)}
                  className={`w-full rounded-xl px-3.5 py-2.5 text-sm font-mono border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                    isDarkMode
                      ? 'bg-slate-800/80 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
                <p className={`text-[11px] mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  1 USD = {tasaValor ? Number(tasaValor).toFixed(4) : '0.0000'} Moneda Local
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Guardar Tasa del Día
              </button>
            </form>
          </div>
        </div>

        {/* History Table */}
        <div className={`lg:col-span-2 rounded-2xl border overflow-hidden transition-colors ${
          isDarkMode
            ? 'bg-slate-900/60 border-slate-800 shadow-xl'
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className={`px-6 py-4 border-b flex items-center justify-between ${
            isDarkMode ? 'border-slate-800' : 'border-slate-100'
          }`}>
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-500" />
              <h3 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Historial Reciente de Tasas
              </h3>
            </div>
            <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Últimos registros
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className={`text-xs uppercase tracking-wider border-b ${
                isDarkMode
                  ? 'bg-slate-950/70 text-slate-400 border-slate-800'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}>
                <tr>
                  <th className="py-3.5 px-6">Fecha</th>
                  <th className="py-3.5 px-6">Tasa de Cambio</th>
                  <th className="py-3.5 px-6 text-right">Equivalencia $10 USD</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${
                isDarkMode ? 'divide-slate-800/60 text-slate-300' : 'divide-slate-100 text-slate-700'
              }`}>
                {historyRates.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-slate-400">
                      No hay historial de tasas registrado.
                    </td>
                  </tr>
                ) : (
                  historyRates.map((r) => (
                    <tr
                      key={r.id}
                      className={`transition-colors ${
                        isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className={`py-4 px-6 font-medium flex items-center gap-2 ${
                        isDarkMode ? 'text-white' : 'text-slate-900'
                      }`}>
                        <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                        {r.fecha}
                      </td>
                      <td className="py-4 px-6 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {Number(r.tasa).toFixed(4)}
                      </td>
                      <td className={`py-4 px-6 font-mono text-right ${
                        isDarkMode ? 'text-slate-300' : 'text-slate-600'
                      }`}>
                        {(10 * Number(r.tasa)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
