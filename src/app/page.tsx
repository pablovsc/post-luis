'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  TrendingUp,
  Receipt,
  Database,
  RefreshCw,
  Store,
  Sun,
  Moon,
  Truck,
  Users,
  Percent,
  LayoutGrid,
  QrCode,
  BarChart3,
  ShieldAlert,
} from 'lucide-react';
import MainMenuView from '@/components/MainMenuView';
import DashboardView from '@/components/DashboardView';
import PosView from '@/components/PosView';
import ProductsView from '@/components/ProductsView';
import RatesView from '@/components/RatesView';
import OrdersView from '@/components/OrdersView';
import ComprasView from '@/components/ComprasView';
import TercerosView from '@/components/TercerosView';
import ImpuestosView from '@/components/ImpuestosView';
import ReportesView from '@/components/ReportesView';
import DatabaseModal from '@/components/DatabaseModal';
import QrModal from '@/components/QrModal';
import MantenimientoModal from '@/components/MantenimientoModal';
import { Producto, Tasa, DashboardData } from '@/types';

type ActiveTab = 'menu' | 'dashboard' | 'pos' | 'orders' | 'compras' | 'products' | 'terceros' | 'impuestos' | 'rates' | 'reports';

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('menu');
  const [reportSubTab, setReportSubTab] = useState<'ventas' | 'rentabilidad' | 'inventario'>('ventas');
  const [showDbModal, setShowDbModal] = useState(false);
  const [showMantenimientoModal, setShowMantenimientoModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [dbConnected, setDbConnected] = useState(true);
  
  // Theme state: defaults to 'light'
  const [isDarkMode, setIsDarkMode] = useState(false);

  // App data state
  const [products, setProducts] = useState<Producto[]>([]);
  const [currentRate, setCurrentRate] = useState<Tasa | null>(null);
  const [historyRates, setHistoryRates] = useState<Tasa[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load theme preference on mount (light by default)
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Fetch all initial data
  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // 1. Fetch Products
      const prodRes = await fetch('/api/productos');
      const prodData = await prodRes.json();
      if (prodData.success) {
        setProducts(prodData.products || []);
        setDbConnected(true);
      } else {
        setDbConnected(false);
      }

      // 2. Fetch Rates
      const rateRes = await fetch('/api/tasa');
      const rateData = await rateRes.json();
      if (rateData.success) {
        setCurrentRate(rateData.rate || null);
      }

      const historyRes = await fetch('/api/tasa?all=true');
      const historyData = await historyRes.json();
      if (historyData.success) {
        setHistoryRates(historyData.rates || []);
      }

      // 3. Fetch Dashboard Stats
      const dashRes = await fetch('/api/dashboard');
      const dashData = await dashRes.json();
      if (dashData.success) {
        setDashboardData(dashData.data);
      }
    } catch (e) {
      console.error('Error fetching application data:', e);
      setDbConnected(false);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const navItems = [
    { id: 'menu', label: 'Inicio', icon: LayoutGrid },
    { id: 'pos', label: 'Punto de Venta', icon: ShoppingCart },
    { id: 'compras', label: 'Compras', icon: Truck },
    { id: 'reports', label: 'Reportes', icon: BarChart3 },
  ] as const;

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
      isDarkMode 
        ? 'bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white' 
        : 'bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white'
    }`}>
      {/* Top Navigation Bar */}
      <header className={`print:hidden sticky top-0 z-40 backdrop-blur-xl border-b transition-colors ${
        isDarkMode
          ? 'bg-slate-950/80 border-slate-800/80'
          : 'bg-white/90 border-slate-200/90 shadow-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          {/* Logo & Store Brand */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (activeTab === 'menu') {
                  setShowQrModal(true);
                } else {
                  setActiveTab('menu');
                }
              }}
              title={activeTab === 'menu' ? "Ver Código QR para Móvil" : "Ir al Menú Principal"}
              className="flex items-center gap-2.5 text-left group p-1 -ml-1 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-900/60 transition cursor-pointer shrink-0"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-600/25 group-hover:scale-105 transition">
                <Store className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className={`font-bold text-sm tracking-tight flex items-center gap-1.5 ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  Tienda Express{' '}
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 dark:bg-indigo-500/20 border border-indigo-500/20">
                    POS
                  </span>
                </h1>
                <p className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  ERP Express Multimoneda
                </p>
              </div>
            </button>

            {/* Direct QR trigger button right next to the brand */}
            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              title="Abrir Código QR para Móvil"
              className={`p-1.5 rounded-xl border transition flex items-center gap-1 text-xs font-semibold ${
                isDarkMode
                  ? 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300 hover:bg-indigo-900/60'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 shadow-sm'
              }`}
            >
              <QrCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden lg:inline text-[11px]">QR Móvil</span>
            </button>
          </div>

          {/* Navigation Tabs (Desktop & Tablet) */}
          <nav className={`hidden sm:flex items-center p-1 rounded-2xl border transition-colors ${
            isDarkMode 
              ? 'bg-slate-900/90 border-slate-800' 
              : 'bg-slate-100/90 border-slate-200'
          }`}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as ActiveTab)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                      : isDarkMode
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Controls: Theme Toggle, Rate Badge, Refresh, DB, QR */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Rate Badge */}
            {currentRate && (
              <div
                onClick={() => setActiveTab('rates')}
                className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs cursor-pointer transition ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Tasa:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {Number(currentRate.tasa).toFixed(4)}
                </span>
              </div>
            )}

            {/* Mobile QR Button */}
            <button
              onClick={() => setShowQrModal(true)}
              title="Escanear Código QR para Teléfono"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition ${
                isDarkMode
                  ? 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300 hover:bg-indigo-900/60'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 shadow-sm'
              }`}
            >
              <QrCode className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden md:inline">Código QR</span>
            </button>

            {/* Light / Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className={`p-2 rounded-xl border transition flex items-center justify-center ${
                isDarkMode
                  ? 'bg-slate-900 border-slate-800 text-amber-300 hover:text-amber-200 hover:bg-slate-800'
                  : 'bg-white border-slate-200 text-slate-700 hover:text-indigo-600 hover:bg-slate-100 shadow-sm'
              }`}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => fetchData()}
              disabled={isRefreshing}
              title="Refrescar Datos"
              className={`p-2 rounded-xl border transition disabled:opacity-50 ${
                isDarkMode
                  ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-500' : ''}`} />
            </button>

            {/* DB Status & Config Button */}
            <button
              onClick={() => setShowDbModal(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition ${
                dbConnected
                  ? isDarkMode
                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300 hover:bg-emerald-950/50'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 shadow-sm'
                  : isDarkMode
                  ? 'bg-rose-950/30 border-rose-500/30 text-rose-300 hover:bg-rose-950/50'
                  : 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100 shadow-sm'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {dbConnected ? 'BD Conectada' : 'Configurar BD'}
              </span>
            </button>

            {/* Mantenimiento / Sistemas Button */}
            <button
              onClick={() => setShowMantenimientoModal(true)}
              title="Herramienta de Mantenimiento de Base de Datos y Pruebas"
              className={`p-2 rounded-xl border transition flex items-center justify-center ${
                isDarkMode
                  ? 'bg-rose-950/20 border-rose-900/40 text-rose-400 hover:bg-rose-900/40'
                  : 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 shadow-sm'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className={`sm:hidden border-t px-3 py-2 flex items-center justify-around gap-2 transition-colors ${
          isDarkMode ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-50/90 border-slate-200 shadow-inner'
        }`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as ActiveTab)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : isDarkMode
                    ? 'bg-slate-900 text-slate-400 border border-slate-800'
                    : 'bg-white text-slate-600 border border-slate-200 shadow-sm'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab !== 'menu' && (
          <div className="mb-5 flex items-center justify-between">
            <button
              onClick={() => setActiveTab('menu')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition shadow-sm ${
                isDarkMode
                  ? 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-850'
                  : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-indigo-500" />
              ← Menú Principal
            </button>
          </div>
        )}

        {activeTab === 'menu' && (
          <MainMenuView
            onNavigate={(tab, subTab) => {
              setActiveTab(tab);
              if (subTab) setReportSubTab(subTab);
            }}
            currentRate={currentRate}
            dashboardData={dashboardData}
            productsCount={products.length}
            isDarkMode={isDarkMode}
          />
        )}

        {activeTab === 'pos' && (
          <PosView
            products={products}
            currentRate={currentRate}
            onOrderCompleted={fetchData}
            onOpenRates={() => setActiveTab('rates')}
            isDarkMode={isDarkMode}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersView
            isDarkMode={isDarkMode}
            onRefreshProducts={fetchData}
          />
        )}

        {activeTab === 'compras' && (
          <ComprasView
            products={products}
            currentRate={currentRate}
            onRefreshProducts={fetchData}
            isDarkMode={isDarkMode}
          />
        )}

        {activeTab === 'products' && (
          <ProductsView
            products={products}
            onRefresh={fetchData}
            isDarkMode={isDarkMode}
          />
        )}

        {activeTab === 'terceros' && (
          <TercerosView isDarkMode={isDarkMode} />
        )}

        {activeTab === 'impuestos' && (
          <ImpuestosView
            isDarkMode={isDarkMode}
            onRefresh={fetchData}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            data={dashboardData}
            onNavigatePos={() => setActiveTab('pos')}
            onNavigateRates={() => setActiveTab('rates')}
            onNavigateCompras={() => setActiveTab('compras')}
            onNavigateProducts={() => setActiveTab('products')}
            isDarkMode={isDarkMode}
          />
        )}

        {activeTab === 'rates' && (
          <RatesView
            currentRate={currentRate}
            historyRates={historyRates}
            onRefresh={fetchData}
            isDarkMode={isDarkMode}
          />
        )}

        {activeTab === 'reports' && (
          <ReportesView
            currentRate={currentRate}
            initialTab={reportSubTab}
            isDarkMode={isDarkMode}
          />
        )}
      </main>

      {/* Footer */}
      <footer className={`border-t py-4 text-center text-xs transition-colors ${
        isDarkMode
          ? 'border-slate-800/80 bg-slate-950 text-slate-500'
          : 'border-slate-200 bg-white text-slate-400 shadow-inner'
      }`}>
        Tienda Express &bull; POS, Compras, Inventario, Terceros e Impuestos &bull; PostgreSQL
      </footer>

      {/* Database Modal */}
      <DatabaseModal
        isOpen={showDbModal}
        onClose={() => setShowDbModal(false)}
        onConnected={fetchData}
        isDarkMode={isDarkMode}
      />

      {/* QR Code Modal para Móvil */}
      <QrModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        isDarkMode={isDarkMode}
      />

      {/* Modal de Mantenimiento / Sistemas */}
      <MantenimientoModal
        isOpen={showMantenimientoModal}
        onClose={() => setShowMantenimientoModal(false)}
        onCompleted={fetchData}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}
