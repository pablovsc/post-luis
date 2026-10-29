'use client';

import { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Trash2, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  Database, 
  RefreshCw,
  ShoppingBag,
  Truck,
  Layers,
  Info,
  Download,
  X
} from 'lucide-react';

interface MaintenanceStats {
  pedidos: number;
  pedidolineas: number;
  compras: number;
  compralineas: number;
  productos: number;
  terceros: number;
}

export default function MantenimientoModal({
  isOpen,
  onClose,
  onCompleted,
  isDarkMode = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: () => void;
  isDarkMode?: boolean;
}) {
  const [stats, setStats] = useState<MaintenanceStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'reset_ventas' | 'reset_compras' | 'reset_ambos'>('reset_ambos');
  const [resetStock, setResetStock] = useState(false);
  const [newStockValue, setNewStockValue] = useState<number>(0);
  const [downloadingBackup, setDownloadingBackup] = useState(false);

  const handleDownloadBackup = () => {
    setDownloadingBackup(true);
    window.location.href = '/api/respaldo';
    setTimeout(() => setDownloadingBackup(false), 2000);
  };
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string; details?: string[] } | null>(null);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch('/api/mantenimiento');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch {
      // Ignorar error temporal
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setStatusMessage(null);
      setConfirmPhrase('');
      fetchStats();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExecute = async () => {
    if (confirmPhrase.trim().toUpperCase() !== 'REINICIAR') {
      setStatusMessage({
        type: 'error',
        text: 'Debes escribir la palabra "REINICIAR" para autorizar esta operación.',
      });
      return;
    }

    setExecuting(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/mantenimiento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: selectedAction,
          resetStock,
          newStockValue: Number(newStockValue) || 0,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          type: 'success',
          text: data.message,
          details: data.executedActions,
        });
        setConfirmPhrase('');
        fetchStats();
        if (onCompleted) {
          onCompleted();
        }
      } else {
        setStatusMessage({
          type: 'error',
          text: data.message || 'Error durante la ejecución del mantenimiento.',
        });
      }
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'Error al contactar con el servicio de mantenimiento.',
      });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
        isDarkMode ? 'bg-slate-900 border-rose-900/40 text-slate-100' : 'bg-white border-rose-200 text-slate-800'
      }`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDarkMode ? 'bg-rose-950/20 border-rose-900/30' : 'bg-rose-50/70 border-rose-100'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-600/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base flex items-center gap-2 text-rose-700 dark:text-rose-400">
                Consola de Sistemas / Mantenimiento
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Limpieza de registros de prueba y reinicio de secuencias correlativas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Current Counts Info */}
          <div className={`p-4 rounded-xl border ${
            isDarkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                Registros actuales en PostgreSQL
              </span>
              <button 
                onClick={fetchStats} 
                disabled={loadingStats}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${loadingStats ? 'animate-spin' : ''}`} />
                Actualizar
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className={`p-2.5 rounded-lg border text-center ${
                isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400">
                  {stats ? stats.pedidos : '...'}
                </div>
                <div className="text-[11px] text-slate-500">Ventas Registradas</div>
              </div>

              <div className={`p-2.5 rounded-lg border text-center ${
                isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {stats ? stats.compras : '...'}
                </div>
                <div className="text-[11px] text-slate-500">Compras Registradas</div>
              </div>

              <div className={`p-2.5 rounded-lg border text-center ${
                isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">
                  {stats ? stats.productos : '...'}
                </div>
                <div className="text-[11px] text-slate-500">Productos en Catálogo</div>
              </div>
            </div>

            {/* Quick Backup Trigger Button inside Modal */}
            <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
              <span className="text-xs text-slate-500">¿Quieres asegurar una copia antes de cualquier cambio?</span>
              <button
                type="button"
                onClick={handleDownloadBackup}
                disabled={downloadingBackup}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-sm'
                }`}
              >
                <Download className={`w-3.5 h-3.5 text-indigo-500 ${downloadingBackup ? 'animate-bounce' : ''}`} />
                {downloadingBackup ? 'Descargando...' : 'Descargar Copia SQL'}
              </button>
            </div>
          </div>

          {/* Action Selector */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
              Seleccione la operación a ejecutar
            </label>
            <div className="space-y-2">
              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                selectedAction === 'reset_ambos'
                  ? isDarkMode ? 'bg-rose-950/30 border-rose-600' : 'bg-rose-50 border-rose-300'
                  : isDarkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-850' : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}>
                <input
                  type="radio"
                  name="action"
                  checked={selectedAction === 'reset_ambos'}
                  onChange={() => setSelectedAction('reset_ambos')}
                  className="mt-1 text-rose-600 focus:ring-rose-500"
                />
                <div className="flex-1">
                  <div className="font-semibold text-sm flex items-center gap-1.5">
                    <Trash2 className="w-4 h-4 text-rose-500" />
                    Vaciar Ventas y Compras (Reinicio Completo de Pruebas)
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Borra todas las facturas de venta (pedidos) y de compras. Reinicia las secuencias a ID #1.
                  </p>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                selectedAction === 'reset_ventas'
                  ? isDarkMode ? 'bg-rose-950/30 border-rose-600' : 'bg-rose-50 border-rose-300'
                  : isDarkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-850' : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}>
                <input
                  type="radio"
                  name="action"
                  checked={selectedAction === 'reset_ventas'}
                  onChange={() => setSelectedAction('reset_ventas')}
                  className="mt-1 text-rose-600 focus:ring-rose-500"
                />
                <div className="flex-1">
                  <div className="font-semibold text-sm flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-indigo-500" />
                    Vaciar sólo Ventas (Pedidos del POS)
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Elimina pedidos de venta y líneas. Reinicia la secuencia <code className="text-rose-500">t_pedido_id_seq</code> a 1.
                  </p>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                selectedAction === 'reset_compras'
                  ? isDarkMode ? 'bg-rose-950/30 border-rose-600' : 'bg-rose-50 border-rose-300'
                  : isDarkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-850' : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}>
                <input
                  type="radio"
                  name="action"
                  checked={selectedAction === 'reset_compras'}
                  onChange={() => setSelectedAction('reset_compras')}
                  className="mt-1 text-rose-600 focus:ring-rose-500"
                />
                <div className="flex-1">
                  <div className="font-semibold text-sm flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-emerald-500" />
                    Vaciar sólo Compras (Facturas a Proveedores)
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Elimina facturas de compra y líneas. Reinicia la secuencia <code className="text-rose-500">t_compra_id_seq</code> a 1.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Optional stock adjustment */}
          <div className={`p-3.5 rounded-xl border space-y-2.5 ${
            isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={resetStock}
                onChange={(e) => setResetStock(e.target.checked)}
                className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4"
              />
              <span className="text-xs font-semibold">
                ¿Reestablecer también el stock de los productos?
              </span>
            </label>

            {resetStock && (
              <div className="flex items-center gap-3 pt-1">
                <span className="text-xs text-slate-500">Fijar nuevo stock de todos los productos en:</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={newStockValue}
                  onChange={(e) => setNewStockValue(parseFloat(e.target.value) || 0)}
                  className={`w-24 px-2.5 py-1 text-xs font-mono font-bold rounded-lg border focus:ring-2 focus:ring-rose-500/50 ${
                    isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            )}
          </div>

          {/* Safety Warning */}
          <div className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
            isDarkMode ? 'bg-rose-950/20 border-rose-900/40 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong>¡Acción destructiva e irreversible!</strong> Esta herramienta utiliza sentencias de tipo <code className="font-mono bg-rose-500/10 px-1 rounded">TRUNCATE ... RESTART IDENTITY</code> directamente en PostgreSQL.
            </div>
          </div>

          {/* Confirmation Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
              Para confirmar, escribe la palabra <span className="font-mono font-bold text-rose-600 bg-rose-500/10 px-1 py-0.5 rounded">REINICIAR</span>:
            </label>
            <input
              type="text"
              value={confirmPhrase}
              onChange={(e) => setConfirmPhrase(e.target.value)}
              placeholder="Escribe REINICIAR aquí"
              className={`w-full rounded-xl px-3.5 py-2 text-sm border font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-rose-500/50 ${
                isDarkMode ? 'bg-slate-800/80 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
          </div>

          {/* Status Alert */}
          {statusMessage && (
            <div className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
              statusMessage.type === 'success'
                ? isDarkMode ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : isDarkMode ? 'bg-rose-950/30 border-rose-500/30 text-rose-300' : 'bg-rose-50 border-rose-300 text-rose-800'
            }`}>
              <div className="flex items-center gap-2 font-semibold">
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
              {statusMessage.details && (
                <ul className="list-disc pl-6 space-y-1 text-[11px] opacity-90">
                  {statusMessage.details.map((detail, idx) => (
                    <li key={idx}>{detail}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t flex items-center justify-between gap-3 ${
          isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-100'
        }`}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition"
          >
            Cerrar
          </button>

          <button
            type="button"
            onClick={handleExecute}
            disabled={executing || confirmPhrase.trim().toUpperCase() !== 'REINICIAR'}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 transition disabled:opacity-50 flex items-center gap-2"
          >
            {executing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Ejecutando en PostgreSQL...
              </>
            ) : (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                Ejecutar y Reiniciar Secuencias
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

