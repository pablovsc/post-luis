'use client';

import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Truck,
  Receipt,
  Package,
  Users,
  Percent,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Store,
  ShieldCheck,
  Calendar,
  Layers,
  Grid3X3,
  SlidersHorizontal,
  BarChart3,
  Boxes,
} from 'lucide-react';
import { Tasa, DashboardData } from '@/types';

interface MainMenuViewProps {
  onNavigate: (tab: any, subTab?: 'ventas' | 'rentabilidad' | 'inventario') => void;
  currentRate: Tasa | null;
  dashboardData: DashboardData | null;
  productsCount: number;
  isDarkMode?: boolean;
}

export default function MainMenuView({
  onNavigate,
  currentRate,
  dashboardData,
  productsCount,
  isDarkMode = false,
}: MainMenuViewProps) {
  const [currentPage, setCurrentPage] = useState<0 | 1 | 2>(0);
  const [viewMode, setViewMode] = useState<'slider' | 'grid'>('slider');
  
  // Touch swipe handling
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 50) {
      // Swiped left -> Next page
      setCurrentPage((prev) => (prev < 2 ? ((prev + 1) as 0 | 1 | 2) : prev));
    } else if (distance < -50) {
      // Swiped right -> Previous page
      setCurrentPage((prev) => (prev > 0 ? ((prev - 1) as 0 | 1 | 2) : prev));
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Keyboard navigation (ArrowLeft / ArrowRight)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setCurrentPage((prev) => (prev < 2 ? ((prev + 1) as 0 | 1 | 2) : prev));
      }
      if (e.key === 'ArrowLeft') {
        setCurrentPage((prev) => (prev > 0 ? ((prev - 1) as 0 | 1 | 2) : prev));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const rateValue = currentRate ? Number(currentRate.tasa).toFixed(4) : '0.0000';

  // Group 1 (First view):
  // 1) Dashboard
  // 2) POS
  // 3) Compra
  // 4) Pedidos / Ventas
  const group1 = [
    {
      id: 'dashboard',
      num: '01',
      title: 'Dashboard',
      subtitle: 'Métricas, gráficos de ventas y estadísticas en tiempo real',
      icon: LayoutDashboard,
      gradient: 'from-blue-600 via-indigo-600 to-violet-600',
      badge: 'Resumen Ejecutivo',
      accentColor: 'text-blue-500 dark:text-blue-400',
      glowColor: 'group-hover:shadow-blue-500/25',
      stat: dashboardData?.hoy?.pedidos_hoy !== undefined
        ? `${dashboardData.hoy.pedidos_hoy} ventas hoy`
        : 'Estadísticas vivas',
    },
    {
      id: 'pos',
      num: '02',
      title: 'Punto de Venta (POS)',
      subtitle: 'Facturación rápida, escáner, multimoneda y cálculo de vuelto',
      icon: ShoppingCart,
      gradient: 'from-indigo-600 via-purple-600 to-pink-600',
      badge: 'Caja y Cobro',
      accentColor: 'text-indigo-500 dark:text-indigo-400',
      glowColor: 'group-hover:shadow-indigo-500/25',
      stat: 'Venta Directa',
    },
    {
      id: 'compras',
      num: '03',
      title: 'Compras',
      subtitle: 'Recepción de mercancía, facturas de proveedores e incremento de stock',
      icon: Truck,
      gradient: 'from-amber-500 via-orange-600 to-red-600',
      badge: 'Proveedores',
      accentColor: 'text-amber-500 dark:text-amber-400',
      glowColor: 'group-hover:shadow-amber-500/25',
      stat: dashboardData?.comprasResumen?.total_compras !== undefined
        ? `${dashboardData.comprasResumen.total_compras} compras`
        : 'Ingreso a inventario',
    },
    {
      id: 'orders',
      num: '04',
      title: 'Pedidos y Ventas',
      subtitle: 'Historial completo de ventas, detalle de tickets y anulación con reversión de stock',
      icon: Receipt,
      gradient: 'from-emerald-500 via-teal-600 to-cyan-600',
      badge: 'Con Anulación',
      accentColor: 'text-emerald-500 dark:text-emerald-400',
      glowColor: 'group-hover:shadow-emerald-500/25',
      stat: 'Historial & Anulaciones',
    },
  ];

  // Group 2 (Second view - deslizar a la izquierda):
  // 5) Inventario / Productos
  // 6) Clientes / Proveedores
  // 7) % Impuestos
  // 8) Tasa de Cambio
  const group2 = [
    {
      id: 'products',
      num: '05',
      title: 'Inventario de Productos',
      subtitle: 'Catálogo de artículos, control de existencias, precios USD y costo promedio',
      icon: Package,
      gradient: 'from-cyan-500 via-teal-600 to-emerald-600',
      badge: 'Almacén',
      accentColor: 'text-cyan-500 dark:text-cyan-400',
      glowColor: 'group-hover:shadow-cyan-500/25',
      stat: `${productsCount} productos`,
    },
    {
      id: 'terceros',
      num: '06',
      title: 'Clientes / Proveedores',
      subtitle: 'Directorio de terceros con RIF, razón social, contactos y direcciones',
      icon: Users,
      gradient: 'from-violet-600 via-purple-600 to-fuchsia-600',
      badge: 'Directorio',
      accentColor: 'text-purple-500 dark:text-purple-400',
      glowColor: 'group-hover:shadow-purple-500/25',
      stat: 'Gestión Comercial',
    },
    {
      id: 'impuestos',
      num: '07',
      title: '% Impuestos',
      subtitle: 'Configuración de alícuotas fiscales de IVA (16%, Exento 0% y reducidos)',
      icon: Percent,
      gradient: 'from-pink-500 via-rose-600 to-red-600',
      badge: 'Fiscal',
      accentColor: 'text-pink-500 dark:text-pink-400',
      glowColor: 'group-hover:shadow-pink-500/25',
      stat: 'Alícuotas Activas',
    },
    {
      id: 'rates',
      num: '08',
      title: 'Tasa de Cambio (BCV)',
      subtitle: 'Monitoreo oficial de la tasa de cambio diaria y conversión automática en bolívares',
      icon: TrendingUp,
      gradient: 'from-emerald-600 via-green-600 to-teal-700',
      badge: 'Tasa Oficial',
      accentColor: 'text-emerald-500 dark:text-emerald-400',
      glowColor: 'group-hover:shadow-emerald-500/25',
      stat: `${rateValue} Bs./$`,
    },
  ];

  // Group 3 (Third view - Reportes, Rentabilidad e Inventario):
  // 9) Reportes de Ventas por Fecha
  // 10) Rentabilidad FIFO Venta vs Costo
  // 11) Inventario & Valorización
  const group3 = [
    {
      id: 'reports',
      subTab: 'ventas',
      num: '09',
      title: 'Ventas por Fecha',
      subtitle: 'Filtro por rangos (hoy, semana, mes, año), totales USD/Bs., desglose diario y exportación',
      icon: BarChart3,
      gradient: 'from-blue-600 via-indigo-600 to-cyan-600',
      badge: 'Reporte de Ventas',
      accentColor: 'text-blue-500 dark:text-blue-400',
      glowColor: 'group-hover:shadow-blue-500/25',
      stat: 'Ventas & Facturación',
    },
    {
      id: 'reports',
      subTab: 'rentabilidad',
      num: '10',
      title: 'Rentabilidad FIFO',
      subtitle: 'Valuación PEPS por lote de compra, costo real, utilidad bruta y margen porcentual de ganancia',
      icon: TrendingUp,
      gradient: 'from-emerald-500 via-teal-600 to-indigo-600',
      badge: 'Método FIFO / PEPS',
      accentColor: 'text-emerald-500 dark:text-emerald-400',
      glowColor: 'group-hover:shadow-emerald-500/25',
      stat: 'Margen Venta vs Costo',
    },
    {
      id: 'reports',
      subTab: 'inventario',
      num: '11',
      title: 'Inventario & Valorización',
      subtitle: 'Existencias físicas desglosadas por presentación, capital al costo promedio, proyección a venta y alertas',
      icon: Boxes,
      gradient: 'from-amber-500 via-orange-600 to-rose-600',
      badge: 'Reporte de Almacén',
      accentColor: 'text-amber-500 dark:text-amber-400',
      glowColor: 'group-hover:shadow-amber-500/25',
      stat: 'Stock Valorizado & Alertas',
    },
  ];

  const renderCard = (item: any) => {
    const Icon = item.icon;
    return (
      <button
        key={`${item.id}-${item.num}`}
        onClick={() => onNavigate(item.id, item.subTab)}
        className={`group relative text-left p-6 sm:p-7 rounded-3xl border transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-lg hover:-translate-y-1.5 cursor-pointer ${item.glowColor} ${
          isDarkMode
            ? 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-850 shadow-black/40'
            : 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-white shadow-slate-200/50'
        }`}
      >
        {/* Ambient Top Glow on hover */}
        <div
          className={`absolute -top-16 -right-16 w-36 h-36 rounded-full bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-15 blur-2xl transition-opacity duration-500 pointer-events-none`}
        />

        {/* Top Header of Card */}
        <div>
          <div className="flex items-center justify-between mb-5">
            {/* Big Gradient Icon Container */}
            <div
              className={`w-16 h-16 rounded-2xl bg-gradient-to-tr ${item.gradient} flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-110 group-hover:rotate-1 transition-all duration-300`}
            >
              <Icon className="w-8 h-8" />
            </div>

            {/* Step Number & Category Badge */}
            <div className="flex flex-col items-end gap-1">
              <span className="font-mono text-xs font-black tracking-widest text-slate-400 dark:text-slate-500">
                {item.num}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                isDarkMode
                  ? 'bg-slate-800 text-slate-300 border border-slate-700'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                {item.badge}
              </span>
            </div>
          </div>

          {/* Title & Description */}
          <h3 className={`text-xl font-black tracking-tight mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            {item.title}
          </h3>

          <p className={`text-xs leading-relaxed ${
            isDarkMode ? 'text-slate-400' : 'text-slate-500'
          }`}>
            {item.subtitle}
          </p>
        </div>

        {/* Card Footer: Live Stat Pill + Enter Action */}
        <div className={`mt-6 pt-4 border-t flex items-center justify-between text-xs font-semibold ${
          isDarkMode ? 'border-slate-800/80' : 'border-slate-100'
        }`}>
          <span className={`font-mono text-[11px] px-2.5 py-1 rounded-xl ${
            isDarkMode ? 'bg-slate-800/80 text-slate-300' : 'bg-slate-100 text-slate-700'
          }`}>
            {item.stat}
          </span>

          <span className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold group-hover:underline">
            Abrir
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </span>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      {/* Hero Welcome Banner */}
      <div className={`relative overflow-hidden p-6 sm:p-8 rounded-3xl border transition-all ${
        isDarkMode
          ? 'bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-slate-800 shadow-2xl'
          : 'bg-gradient-to-r from-white via-indigo-50/50 to-white border-slate-200/90 shadow-sm'
      }`}>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              Menú Principal del Sistema
            </div>
            <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              Tienda Express <span className="text-indigo-600 dark:text-indigo-400">POS</span>
            </h2>
            <p className={`text-sm max-w-xl ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Selecciona el módulo con el que deseas trabajar. Desliza a la izquierda o usa los controles para navegar entre opciones.
            </p>
          </div>

          {/* Quick Metrics Cards on Banner */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Rate Badge */}
            <div className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
              isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Tasa BCV</span>
                <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                  {rateValue} <span className="text-[10px] font-normal text-slate-400">Bs./$</span>
                </span>
              </div>
            </div>

            {/* DB Status Badge */}
            <div className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
              isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Sistema</span>
                <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Operativo
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Controls & Slide Selector */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Page Switcher Tabs */}
        <div className={`inline-flex items-center p-1.5 rounded-2xl border ${
          isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            onClick={() => setCurrentPage(0)}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              currentPage === 0
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : isDarkMode
                ? 'text-slate-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center text-[10px] font-mono">
              1
            </span>
            <span className="hidden sm:inline">Operaciones</span>
            <span className="sm:hidden">Operac.</span>
          </button>

          <button
            onClick={() => setCurrentPage(1)}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              currentPage === 1
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : isDarkMode
                ? 'text-slate-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center text-[10px] font-mono">
              2
            </span>
            <span className="hidden sm:inline">Gestión</span>
            <span className="sm:hidden">Gestión</span>
          </button>

          <button
            onClick={() => setCurrentPage(2)}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              currentPage === 2
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : isDarkMode
                ? 'text-slate-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center text-[10px] font-mono">
              3
            </span>
            <span className="hidden sm:inline">Reportes & FIFO</span>
            <span className="sm:hidden">Reportes</span>
          </button>
        </div>

        {/* View Mode Toggle & Arrows */}
        <div className="flex items-center gap-3">
          {/* Arrow Controls for Sliding */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((prev) => (prev > 0 ? ((prev - 1) as 0 | 1 | 2) : prev))}
              disabled={currentPage === 0}
              title="Página Anterior (Flecha Izquierda)"
              className={`p-2.5 rounded-xl border transition ${
                currentPage === 0
                  ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-800'
                  : isDarkMode
                  ? 'bg-slate-900 border-slate-700 text-white hover:bg-slate-800'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentPage((prev) => (prev < 2 ? ((prev + 1) as 0 | 1 | 2) : prev))}
              disabled={currentPage === 2}
              title="Deslizar a la izquierda para ver más opciones (Flecha Derecha)"
              className={`p-2.5 rounded-xl border transition ${
                currentPage === 2
                  ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-800'
                  : isDarkMode
                  ? 'bg-slate-900 border-slate-700 text-white hover:bg-slate-800'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Toggle between Slider Mode & Full Grid */}
          <button
            onClick={() => setViewMode(viewMode === 'slider' ? 'grid' : 'slider')}
            title="Alternar entre modo carrusel deslizable y cuadrícula completa"
            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              viewMode === 'grid'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                : isDarkMode
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'
            }`}
          >
            {viewMode === 'slider' ? (
              <>
                <Grid3X3 className="w-4 h-4" />
                <span className="hidden sm:inline">Ver Todos</span>
              </>
            ) : (
              <>
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Modo Deslizable</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area: Slider or Grid */}
      {viewMode === 'slider' ? (
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
        >
          {/* Sliding Track */}
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${currentPage * 100}%)` }}
          >
            {/* Page 1 (Cards 1 to 4) */}
            <div className="w-full shrink-0 pr-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {group1.map(renderCard)}
              </div>
            </div>

            {/* Page 2 (Cards 5 to 8) */}
            <div className="w-full shrink-0 pr-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {group2.map(renderCard)}
              </div>
            </div>

            {/* Page 3 (Cards 9 to 11: Reportes) */}
            <div className="w-full shrink-0 pr-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {group3.map(renderCard)}
              </div>
            </div>
          </div>

          {/* Slide Progress Dots / Indicators */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setCurrentPage(0)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                currentPage === 0
                  ? 'w-8 bg-indigo-600'
                  : isDarkMode
                  ? 'w-2.5 bg-slate-800 hover:bg-slate-700'
                  : 'w-2.5 bg-slate-300 hover:bg-slate-400'
              }`}
              title="Página 1: Dashboard, POS, Compra, Ventas"
            />
            <button
              onClick={() => setCurrentPage(1)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                currentPage === 1
                  ? 'w-8 bg-indigo-600'
                  : isDarkMode
                  ? 'w-2.5 bg-slate-800 hover:bg-slate-700'
                  : 'w-2.5 bg-slate-300 hover:bg-slate-400'
              }`}
              title="Página 2: Inventario, Terceros, Impuestos, Tasa"
            />
            <button
              onClick={() => setCurrentPage(2)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                currentPage === 2
                  ? 'w-8 bg-indigo-600'
                  : isDarkMode
                  ? 'w-2.5 bg-slate-800 hover:bg-slate-700'
                  : 'w-2.5 bg-slate-300 hover:bg-slate-400'
              }`}
              title="Página 3: Reportes de Ventas, Rentabilidad FIFO e Inventario"
            />
          </div>
        </div>
      ) : (
        /* Full Grid Mode (All options displayed) */
        <div className="space-y-6">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Operaciones de Venta y Movimientos
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {group1.map(renderCard)}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Gestión de Catálogo, Parámetros y Terceros
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {group2.map(renderCard)}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Reportes Gerenciales, Rentabilidad e Inventario
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {group3.map(renderCard)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
