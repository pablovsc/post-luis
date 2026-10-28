'use client';

import { DashboardData } from '@/types';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Calendar,
  Layers,
  ArrowUpRight,
  Sparkles,
  Truck,
  Boxes,
  AlertTriangle,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { useState } from 'react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DashboardViewProps {
  data: DashboardData | null;
  onNavigatePos: () => void;
  onNavigateRates: () => void;
  onNavigateCompras?: () => void;
  onNavigateProducts?: () => void;
  isDarkMode?: boolean;
}

export default function DashboardView({
  data,
  onNavigatePos,
  onNavigateRates,
  onNavigateCompras,
  onNavigateProducts,
  isDarkMode = false,
}: DashboardViewProps) {
  const [currencyMode, setCurrencyMode] = useState<'USD' | 'LOCAL'>('USD');

  if (!data) {
    return (
      <div className="py-20 text-center text-slate-400">
        Cargando estadísticas del sistema...
      </div>
    );
  }

  const {
    tasaActual,
    hoy,
    total,
    comprasResumen,
    inventarioResumen,
    ventasDiarias,
    ventasSemanales,
    ventasMensuales,
    topProductos,
  } = data;
  const currentRateVal = tasaActual ? Number(tasaActual.tasa) : 0;

  // Chart configuration for Daily Sales (Line)
  const dailyLabels = ventasDiarias.map((d) => d.etiqueta);
  const dailyDataValues = ventasDiarias.map((d) =>
    currencyMode === 'USD' ? Number(d.total_usd) : Number(d.total_local)
  );

  const dailyChartData = {
    labels: dailyLabels,
    datasets: [
      {
        fill: true,
        label: currencyMode === 'USD' ? 'Ventas USD' : 'Ventas Bs.',
        data: dailyDataValues,
        borderColor: '#6366f1',
        backgroundColor: isDarkMode ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)',
        tension: 0.35,
        pointBackgroundColor: '#6366f1',
        pointBorderColor: '#ffffff',
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  // Weekly Chart Data (Bar)
  const weeklyLabels = ventasSemanales.map((w) => w.etiqueta);
  const weeklyDataValues = ventasSemanales.map((w) =>
    currencyMode === 'USD' ? Number(w.total_usd) : Number(w.total_local)
  );

  const weeklyChartData = {
    labels: weeklyLabels,
    datasets: [
      {
        label: currencyMode === 'USD' ? 'Ventas Semanales USD' : 'Ventas Semanales Bs.',
        data: weeklyDataValues,
        backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.75)' : 'rgba(16, 185, 129, 0.85)',
        borderRadius: 8,
      },
    ],
  };

  // Monthly Chart Data (Bar)
  const monthlyLabels = ventasMensuales.map((m) => m.etiqueta);
  const monthlyDataValues = ventasMensuales.map((m) =>
    currencyMode === 'USD' ? Number(m.total_usd) : Number(m.total_local)
  );

  const monthlyChartData = {
    labels: monthlyLabels,
    datasets: [
      {
        label: currencyMode === 'USD' ? 'Ventas Mensuales USD' : 'Ventas Mensuales Bs.',
        data: monthlyDataValues,
        backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.75)' : 'rgba(14, 165, 233, 0.85)',
        borderRadius: 8,
      },
    ],
  };

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: isDarkMode ? '#0f172a' : '#1e293b',
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        borderColor: isDarkMode ? '#334155' : '#cbd5e1',
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
      },
    },
    scales: {
      x: {
        grid: { color: isDarkMode ? 'rgba(51, 65, 85, 0.3)' : 'rgba(226, 232, 240, 0.8)' },
        ticks: { color: isDarkMode ? '#94a3b8' : '#64748b', font: { size: 11 } },
      },
      y: {
        grid: { color: isDarkMode ? 'rgba(51, 65, 85, 0.3)' : 'rgba(226, 232, 240, 0.8)' },
        ticks: {
          color: isDarkMode ? '#94a3b8' : '#64748b',
          font: { size: 11 },
          callback: (value: any) =>
            currencyMode === 'USD' ? `$${value}` : `${value} Bs.`,
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl border transition-colors ${
        isDarkMode
          ? 'bg-slate-900/60 border-slate-800'
          : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div>
          <h2 className={`text-xl font-bold tracking-tight flex items-center gap-2 ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            Panel de Métricas y Rendimiento <Sparkles className="w-4 h-4 text-amber-500" />
          </h2>
          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Control integral de ventas, compras, inventario y tasa cambiaria
          </p>
        </div>

        {/* Currency Toggle */}
        <div className={`flex items-center p-1 rounded-xl border ${
          isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            onClick={() => setCurrencyMode('USD')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              currencyMode === 'USD'
                ? 'bg-indigo-600 text-white shadow-sm'
                : isDarkMode
                ? 'text-slate-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ver en Dólares ($)
          </button>
          <button
            onClick={() => setCurrencyMode('LOCAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              currencyMode === 'LOCAL'
                ? 'bg-indigo-600 text-white shadow-sm'
                : isDarkMode
                ? 'text-slate-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ver en Moneda Local (Bs.)
          </button>
        </div>
      </div>

      {/* 6 Key Widgets: Sales, Purchases, Inventory, Exchange Rate */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* WIDGET 1: Tasa de Cambio Actual */}
        <div
          onClick={onNavigateRates}
          className={`relative overflow-hidden group cursor-pointer rounded-2xl border p-4 transition-all shadow-sm ${
            isDarkMode
              ? 'bg-gradient-to-br from-indigo-950/70 via-slate-900 to-slate-950 border-indigo-500/40 hover:border-indigo-400'
              : 'bg-gradient-to-br from-indigo-50/70 via-white to-white border-indigo-200 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
              isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
            }`}>
              <TrendingUp className="w-3 h-3" /> Tasa Hoy
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition" />
          </div>
          <div className={`text-xl font-black font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {currentRateVal > 0 ? `${currentRateVal.toFixed(4)}` : 'S/A'}
          </div>
          <div className={`text-[10px] mt-1 flex items-center gap-1 ${
            isDarkMode ? 'text-slate-400' : 'text-slate-500'
          }`}>
            <Calendar className="w-2.5 h-2.5 text-indigo-500" />
            {tasaActual ? tasaActual.fecha : 'Registrar'}
          </div>
        </div>

        {/* WIDGET 2: Ventas Hoy */}
        <div className={`rounded-2xl border p-4 shadow-sm transition-colors ${
          isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              <DollarSign className="w-3 h-3 text-emerald-500" /> Ventas Hoy
            </span>
            <span className="p-0.5 px-1.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
              {hoy.pedidos_hoy} p.
            </span>
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            ${Number(hoy.total_usd_hoy).toFixed(2)}
          </div>
          <div className={`text-[10px] mt-1 font-mono truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            ≈ {Number(hoy.total_local_hoy).toFixed(2)} Bs.
          </div>
        </div>

        {/* WIDGET 3: Ventas Totales */}
        <div className={`rounded-2xl border p-4 shadow-sm transition-colors ${
          isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              <Layers className="w-3 h-3 text-cyan-500" /> Ventas Totales
            </span>
            <span className="p-0.5 px-1.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[10px] font-bold">
              {total.pedidos_totales}
            </span>
          </div>
          <div className={`text-xl font-black font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            ${Number(total.total_usd_total).toFixed(2)}
          </div>
          <div className={`text-[10px] mt-1 font-mono truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            ≈ {Number(total.total_local_total).toFixed(2)} Bs.
          </div>
        </div>

        {/* WIDGET 4: Compras Totales (NEW) */}
        <div
          onClick={onNavigateCompras}
          className={`rounded-2xl border p-4 shadow-sm cursor-pointer transition group ${
            isDarkMode ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              <Truck className="w-3 h-3 text-amber-500" /> Compras
            </span>
            <span className="p-0.5 px-1.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
              {comprasResumen?.total_compras || 0} fact.
            </span>
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
            ${Number(comprasResumen?.total_usd_compras || 0).toFixed(2)}
          </div>
          <div className={`text-[10px] mt-1 font-mono truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            ≈ {Number(comprasResumen?.total_local_compras || 0).toFixed(2)} Bs.
          </div>
        </div>

        {/* WIDGET 5: Inventario Valorizado al Costo (NEW) */}
        <div
          onClick={onNavigateProducts}
          className={`rounded-2xl border p-4 shadow-sm cursor-pointer transition group ${
            isDarkMode ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              <Boxes className="w-3 h-3 text-purple-500" /> Inventario
            </span>
            <span className="p-0.5 px-1.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-bold">
              {Number(inventarioResumen?.total_unidades || 0)} un.
            </span>
          </div>
          <div className={`text-xl font-black font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            ${Number(inventarioResumen?.valor_inventario_costo || 0).toFixed(2)}
          </div>
          <div className={`text-[10px] mt-1 flex items-center gap-1 ${
            (inventarioResumen?.productos_bajo_stock || 0) > 0 ? 'text-rose-500 font-bold' : isDarkMode ? 'text-slate-400' : 'text-slate-500'
          }`}>
            {(inventarioResumen?.productos_bajo_stock || 0) > 0 ? (
              <>
                <AlertTriangle className="w-2.5 h-2.5" />
                {inventarioResumen?.productos_bajo_stock} stock crítico
              </>
            ) : (
              'Stock saludable'
            )}
          </div>
        </div>

        {/* WIDGET 6: Acceso Rápido POS */}
        <div
          onClick={onNavigatePos}
          className={`rounded-2xl border p-4 shadow-sm cursor-pointer transition flex flex-col justify-between group ${
            isDarkMode
              ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              <ShoppingCart className="w-3 h-3 text-indigo-500" /> Punto de Venta
            </span>
            <div className="p-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition">
              <ArrowUpRight className="w-3 h-3" />
            </div>
          </div>
          <div className="mt-2">
            <div className={`text-xs font-bold transition ${
              isDarkMode ? 'text-white group-hover:text-indigo-300' : 'text-slate-900 group-hover:text-indigo-600'
            }`}>
              Nueva Venta
            </div>
            <p className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Cobrar con tasa
            </p>
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Ventas Diarias */}
        <div className={`lg:col-span-8 rounded-2xl border p-5 shadow-sm transition-colors ${
          isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={`text-sm font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Ventas Diarias (Últimos 7 Días)
              </h3>
              <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Evolución de ingresos diarios en {currencyMode === 'USD' ? 'USD' : 'Moneda Local'}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              Tendencia
            </span>
          </div>
          <div className="h-64">
            <Line data={dailyChartData} options={chartOptions} />
          </div>
        </div>

        {/* Top 5 Productos */}
        <div className={`lg:col-span-4 rounded-2xl border p-5 shadow-sm transition-colors flex flex-col justify-between ${
          isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div>
            <h3 className={`text-sm font-bold tracking-tight mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Top Productos Vendidos
            </h3>
            <p className={`text-[11px] mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Artículos con mayor demanda
            </p>

            <div className="space-y-3">
              {topProductos.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Aún no se han registrado ventas.
                </div>
              ) : (
                topProductos.map((tp, idx) => (
                  <div
                    key={tp.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                      isDarkMode
                        ? 'bg-slate-950/40 border-slate-800/80'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-5 h-5 rounded-full text-[10px] font-mono font-bold flex items-center justify-center shrink-0 ${
                        isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className={`font-medium truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {tp.nombre}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        ${Number(tp.ingresos_usd).toFixed(2)}
                      </div>
                      <div className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {tp.unidades_vendidas} unds.
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Chart 2: Ventas Semanales */}
        <div className={`lg:col-span-6 rounded-2xl border p-5 shadow-sm transition-colors ${
          isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={`text-sm font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Ventas Semanales
              </h3>
              <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Rendimiento por semanas consecutivas
              </p>
            </div>
          </div>
          <div className="h-56">
            <Bar data={weeklyChartData} options={chartOptions} />
          </div>
        </div>

        {/* Chart 3: Ventas Mensuales */}
        <div className={`lg:col-span-6 rounded-2xl border p-5 shadow-sm transition-colors ${
          isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={`text-sm font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Ventas Mensuales
              </h3>
              <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Rendimiento acumulado por mes
              </p>
            </div>
          </div>
          <div className="h-56">
            <Bar data={monthlyChartData} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
}
