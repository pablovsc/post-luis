'use client';

import { useState, useEffect } from 'react';
import {
  Building2,
  Wallet,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  DollarSign,
  CreditCard,
  Layers,
  ArrowRight,
  Edit2,
  X,
  ChevronDown,
  ChevronRight,
  Landmark,
  Coins,
  BadgeDollarSign,
} from 'lucide-react';
import { Banco, CuentaBancaria } from '@/types';
import PosNumberInput from '@/components/PosNumberInput';

interface BancosCuentasViewProps {
  isDarkMode?: boolean;
}

export default function BancosCuentasView({ isDarkMode = false }: BancosCuentasViewProps) {
  const [bancos, setBancos] = useState<any[]>([]);
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'bancos' | 'cajas'>('bancos');
  const [searchTerm, setSearchTerm] = useState('');

  // Control de acordeón desplegable por banco
  const [expandedBancos, setExpandedBancos] = useState<Record<number, boolean>>({});

  // Modal Banco (Crear o Editar)
  const [showBancoModal, setShowBancoModal] = useState(false);
  const [editingBancoId, setEditingBancoId] = useState<number | null>(null);
  const [bancoNombre, setBancoNombre] = useState('');
  const [bancoCodigo, setBancoCodigo] = useState('');
  const [submittingBanco, setSubmittingBanco] = useState(false);
  const [bancoError, setBancoError] = useState<string | null>(null);

  // Modal Cuenta Bancaria (Crear o Editar)
  const [showCuentaModal, setShowCuentaModal] = useState(false);
  const [editingCuentaId, setEditingCuentaId] = useState<number | null>(null);
  const [cuentaBancoId, setCuentaBancoId] = useState<number | ''>('');
  const [cuentaNombre, setCuentaNombre] = useState('');
  const [cuentaTipo, setCuentaTipo] = useState<'CORRIENTE' | 'AHORRO' | 'VIRTUAL'>('CORRIENTE');
  const [cuentaNumero, setCuentaNumero] = useState('');
  const [cuentaMoneda, setCuentaMoneda] = useState<'USD' | 'VES'>('VES');
  const [cuentaSaldo, setCuentaSaldo] = useState<string>('0');
  const [submittingCuenta, setSubmittingCuenta] = useState(false);
  const [cuentaError, setCuentaError] = useState<string | null>(null);

  // Modal Caja de Efectivo (Crear o Editar)
  const [showCajaModal, setShowCajaModal] = useState(false);
  const [editingCajaId, setEditingCajaId] = useState<number | null>(null);
  const [cajaNombre, setCajaNombre] = useState('');
  const [cajaMoneda, setCajaMoneda] = useState<'USD' | 'VES'>('USD');
  const [cajaSaldo, setCajaSaldo] = useState<string>('0');
  const [submittingCaja, setSubmittingCaja] = useState(false);
  const [cajaError, setCajaError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bancosRes, cuentasRes] = await Promise.all([
        fetch('/api/bancos'),
        fetch('/api/cuentas-bancarias'),
      ]);
      const bData = await bancosRes.json();
      const cData = await cuentasRes.json();
      if (bData.success) {
        setBancos(bData.bancos || []);
        // Por defecto abrir todos los bancos en el acordeón
        const expMap: Record<number, boolean> = {};
        (bData.bancos || []).forEach((b: any) => {
          expMap[b.id] = true;
        });
        setExpandedBancos(expMap);
      }
      if (cData.success) {
        setCuentas(cData.cuentas || []);
      }
    } catch (e) {
      console.error('Error cargando bancos y cuentas:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtrar entidades que son BANCOS y entidades que son CAJAS
  const soloBancos = bancos.filter((b) => b.tipo === 'BANCO');
  const entidadCaja = bancos.find((b) => b.tipo === 'CAJA');

  // Cuentas pertenecientes a Bancos vs Cajas
  const cuentasDeBancos = cuentas.filter((c) => c.banco_tipo === 'BANCO');
  const cuentasDeCajas = cuentas.filter((c) => c.banco_tipo === 'CAJA');

  // Toggle banco desplegable
  const toggleBanco = (id: number) => {
    setExpandedBancos((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // BANCO: Abrir modal nuevo
  const openNewBancoModal = () => {
    setEditingBancoId(null);
    setBancoNombre('');
    setBancoCodigo('');
    setBancoError(null);
    setShowBancoModal(true);
  };

  // BANCO: Abrir modal editar
  const openEditBancoModal = (b: any) => {
    setEditingBancoId(b.id);
    setBancoNombre(b.nombre);
    setBancoCodigo(b.codigo || '');
    setBancoError(null);
    setShowBancoModal(true);
  };

  // CUENTA BANCARIA: Abrir modal nueva
  const openNewCuentaModal = (defaultBancoId?: number) => {
    setEditingCuentaId(null);
    setCuentaBancoId(defaultBancoId || (soloBancos.length > 0 ? soloBancos[0].id : ''));
    setCuentaNombre('');
    setCuentaNumero('');
    setCuentaTipo('CORRIENTE');
    setCuentaMoneda('VES');
    setCuentaSaldo('0');
    setCuentaError(null);
    setShowCuentaModal(true);
  };

  // CUENTA BANCARIA: Abrir modal editar
  const openEditCuentaModal = (c: CuentaBancaria) => {
    setEditingCuentaId(c.id);
    setCuentaBancoId(c.banco_id);
    setCuentaNombre(c.nombre);
    setCuentaTipo((c.tipo_cuenta as any) || 'CORRIENTE');
    setCuentaNumero(c.numero_cuenta || '');
    setCuentaMoneda(c.moneda as any);
    setCuentaSaldo(String(c.saldo_actual));
    setCuentaError(null);
    setShowCuentaModal(true);
  };

  // CAJA: Abrir modal nueva caja
  const openNewCajaModal = () => {
    setEditingCajaId(null);
    setCajaNombre('');
    setCajaMoneda('USD');
    setCajaSaldo('0');
    setCajaError(null);
    setShowCajaModal(true);
  };

  // CAJA: Abrir modal editar caja
  const openEditCajaModal = (c: CuentaBancaria) => {
    setEditingCajaId(c.id);
    setCajaNombre(c.nombre);
    setCajaMoneda(c.moneda as any);
    setCajaSaldo(String(c.saldo_actual));
    setCajaError(null);
    setShowCajaModal(true);
  };

  // Guardar Banco
  const handleSaveBanco = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bancoNombre.trim()) {
      setBancoError('Ingresa el nombre del banco');
      return;
    }
    setSubmittingBanco(true);
    setBancoError(null);
    try {
      const isEdit = editingBancoId !== null;
      const res = await fetch('/api/bancos', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingBancoId,
          codigo: bancoCodigo,
          nombre: bancoNombre,
          tipo: 'BANCO',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowBancoModal(false);
        loadData();
      } else {
        setBancoError(data.message || 'Error al guardar');
      }
    } catch {
      setBancoError('Error de red al guardar el banco');
    } finally {
      setSubmittingBanco(false);
    }
  };

  // Guardar Cuenta Bancaria
  const handleSaveCuenta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cuentaBancoId || !cuentaNombre.trim()) {
      setCuentaError('Completa los campos obligatorios');
      return;
    }
    setSubmittingCuenta(true);
    setCuentaError(null);
    try {
      const isEdit = editingCuentaId !== null;
      const res = await fetch('/api/cuentas-bancarias', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingCuentaId,
          banco_id: Number(cuentaBancoId),
          nombre: cuentaNombre,
          tipo_cuenta: cuentaTipo,
          numero_cuenta: cuentaNumero,
          moneda: cuentaMoneda,
          saldo_inicial: !isEdit ? parseFloat(cuentaSaldo) || 0 : undefined,
          saldo_actual: isEdit ? parseFloat(cuentaSaldo) || 0 : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCuentaModal(false);
        loadData();
      } else {
        setCuentaError(data.message || 'Error al guardar la cuenta');
      }
    } catch {
      setCuentaError('Error de red al guardar la cuenta');
    } finally {
      setSubmittingCuenta(false);
    }
  };

  // Guardar Caja de Efectivo
  const handleSaveCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cajaNombre.trim()) {
      setCajaError('Ingresa el nombre de la caja');
      return;
    }
    setSubmittingCaja(true);
    setCajaError(null);
    try {
      const isEdit = editingCajaId !== null;
      const parentCajaId = entidadCaja?.id || 1;
      const res = await fetch('/api/cuentas-bancarias', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingCajaId,
          banco_id: parentCajaId,
          nombre: cajaNombre,
          tipo_cuenta: 'CAJA_EFECTIVO',
          numero_cuenta: 'EFECTIVO',
          moneda: cajaMoneda,
          saldo_inicial: !isEdit ? parseFloat(cajaSaldo) || 0 : undefined,
          saldo_actual: isEdit ? parseFloat(cajaSaldo) || 0 : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCajaModal(false);
        loadData();
      } else {
        setCajaError(data.message || 'Error al guardar la caja');
      }
    } catch {
      setCajaError('Error de red al guardar la caja');
    } finally {
      setSubmittingCaja(false);
    }
  };

  // Totales
  const totalCajasUsd = cuentasDeCajas
    .filter((c) => c.moneda === 'USD')
    .reduce((sum, c) => sum + Number(c.saldo_actual), 0);

  const totalCajasBs = cuentasDeCajas
    .filter((c) => c.moneda === 'VES')
    .reduce((sum, c) => sum + Number(c.saldo_actual), 0);

  const term = searchTerm.toLowerCase();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-black flex items-center gap-2.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            <Landmark className="w-7 h-7 text-indigo-500" />
            Bancos y Cajas
          </h2>
          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Gestión jerárquica de bancos con sus cuentas bancarias asociadas y control de cajas de efectivo
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'bancos' ? (
            <>
              <button
                onClick={openNewBancoModal}
                className="px-3.5 py-2 rounded-xl text-xs font-bold border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> + Nuevo Banco
              </button>
              <button
                onClick={() => openNewCuentaModal()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> + Nueva Cuenta Bancaria
              </button>
            </>
          ) : (
            <button
              onClick={openNewCajaModal}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-amber-600/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> + Nueva Caja de Efectivo
            </button>
          )}
        </div>
      </div>

      {/* Switch de Secciones Principales */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
        isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('bancos')}
            className={`flex-1 sm:flex-none px-5 py-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'bancos'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" /> BANCOS Y CUENTAS ({soloBancos.length})
          </button>
          <button
            onClick={() => setActiveTab('cajas')}
            className={`flex-1 sm:flex-none px-5 py-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'cajas'
                ? 'bg-white dark:bg-slate-700 text-amber-500 dark:text-amber-400 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wallet className="w-4 h-4" /> CAJAS DE EFECTIVO ({cuentasDeCajas.length})
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre, código o cuenta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-9 pr-4 py-1.5 rounded-xl text-xs border ${
                isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
          </div>

          <button
            onClick={loadData}
            title="Refrescar datos"
            className="p-2 border rounded-xl hover:bg-slate-500/10 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECCIÓN 1: BANCOS CON SUS CUENTAS HIJAS EN ARQUITECTURA JERÁRQUICA         */}
      {/* ========================================================================= */}
      {activeTab === 'bancos' && (
        <div className="space-y-4">
          {loading ? (
            <div className={`p-12 text-center rounded-2xl border ${
              isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
              <p className="text-xs text-slate-400">Cargando bancos y cuentas...</p>
            </div>
          ) : soloBancos.length === 0 ? (
            <div className={`p-12 text-center rounded-2xl border text-slate-400 italic text-xs ${
              isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              No se han registrado bancos aún. Haz clic en "+ Nuevo Banco" para comenzar.
            </div>
          ) : (
            soloBancos
              .filter((b) => b.nombre.toLowerCase().includes(term) || (b.codigo && b.codigo.toLowerCase().includes(term)))
              .map((banco) => {
                const cuentasHijas = cuentasDeBancos.filter((c) => c.banco_id === banco.id);
                const isExpanded = !!expandedBancos[banco.id];

                return (
                  <div
                    key={banco.id}
                    className={`rounded-2xl border overflow-hidden transition-all shadow-sm ${
                      isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    {/* Header del Banco Padre */}
                    <div className={`p-4 flex items-center justify-between gap-3 border-b ${
                      isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50/90 border-slate-200'
                    }`}>
                      <div
                        onClick={() => toggleBanco(banco.id)}
                        className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                      >
                        <button className="text-slate-400 hover:text-white p-0.5">
                          {isExpanded ? <ChevronDown className="w-5 h-5 text-indigo-400" /> : <ChevronRight className="w-5 h-5" />}
                        </button>
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                          <Building2 className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                              {banco.nombre}
                            </span>
                            {banco.codigo && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                                Código: {banco.codigo}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400">
                            {cuentasHijas.length} {cuentasHijas.length === 1 ? 'cuenta bancaria asignada' : 'cuentas bancarias asignadas'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditBancoModal(banco)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-indigo-400 hover:bg-slate-500/10 transition inline-flex items-center gap-1 cursor-pointer"
                          title="Editar información del banco"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Editar Banco
                        </button>
                        <button
                          onClick={() => openNewCuentaModal(banco.id)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm inline-flex items-center gap-1 cursor-pointer"
                          title="Crear cuenta en este banco"
                        >
                          <Plus className="w-3.5 h-3.5" /> + Agregar Cuenta
                        </button>
                      </div>
                    </div>

                    {/* Cuentas Hijas Asociadas */}
                    {isExpanded && (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {cuentasHijas.length === 0 ? (
                          <div className="p-4 pl-14 text-xs text-slate-400 italic">
                            Este banco no tiene cuentas registradas aún. Haz clic en "+ Agregar Cuenta" arriba para registrar la primera.
                          </div>
                        ) : (
                          cuentasHijas.map((cuenta) => (
                            <div
                              key={cuenta.id}
                              className="p-3 pl-12 sm:pl-14 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-500/5 transition"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-lg bg-slate-500/10 flex items-center justify-center shrink-0">
                                  <CreditCard className="w-4 h-4 text-slate-400" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                      {cuenta.nombre}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                      cuenta.moneda === 'USD'
                                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                        : 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                                    }`}>
                                      {cuenta.moneda}
                                    </span>
                                    <span className="text-[10px] text-slate-400 px-1.5 py-0.2 rounded bg-slate-500/10">
                                      {cuenta.tipo_cuenta.replace('_', ' ')}
                                    </span>
                                  </div>
                                  <div className="text-[11px] font-mono text-slate-400">
                                    N°: {cuenta.numero_cuenta || 'N/A'}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-4">
                                <div className="text-right">
                                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">Saldo Disponible</div>
                                  <div className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                                    {cuenta.moneda === 'VES' ? 'Bs. ' : '$'}
                                    {Number(cuenta.saldo_actual).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                  </div>
                                </div>

                                <button
                                  onClick={() => openEditCuentaModal(cuenta)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition inline-flex items-center gap-1 cursor-pointer"
                                  title="Editar cuenta"
                                >
                                  <Edit2 className="w-3.5 h-3.5" /> Editar
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECCIÓN 2: CAJAS DE EFECTIVO                                              */}
      {/* ========================================================================= */}
      {activeTab === 'cajas' && (
        <div className="space-y-6">
          {/* Tarjetas Resumen Cajas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={`p-4 rounded-2xl border ${
              isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Efectivo Total en Cajas (Dólares)</span>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                ${totalCajasUsd.toFixed(2)} USD
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Suma en billetes y monedas físicas en divisa</p>
            </div>

            <div className={`p-4 rounded-2xl border ${
              isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Efectivo Total en Cajas (Bolívares)</span>
                <Coins className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                {totalCajasBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Suma en efectivo local en cajones y bóveda</p>
            </div>
          </div>

          {/* Listado de Cajas de Efectivo */}
          <div className={`rounded-2xl border overflow-hidden ${
            isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="p-4 border-b flex items-center justify-between dark:border-slate-800">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Wallet className="w-4 h-4 text-amber-500" /> Cajas Físicas Registradas
              </h3>
              <button
                onClick={openNewCajaModal}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> + Registrar Nueva Caja
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-amber-500 mb-2" />
                  Cargando cajas de efectivo...
                </div>
              ) : cuentasDeCajas.length === 0 ? (
                <div className="p-12 text-center text-slate-400 italic text-xs">
                  No hay cajas de efectivo registradas.
                </div>
              ) : (
                cuentasDeCajas
                  .filter((c) => c.nombre.toLowerCase().includes(term))
                  .map((caja) => (
                    <div
                      key={caja.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-500/5 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                          <Wallet className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                              {caja.nombre}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              caja.moneda === 'USD'
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                            }`}>
                              {caja.moneda}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Caja de Efectivo • Destino para cobros en punto de venta y compras en efectivo
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-5">
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Saldo Físico en Caja</div>
                          <div className="font-mono font-black text-base text-slate-900 dark:text-white">
                            {caja.moneda === 'VES' ? 'Bs. ' : '$'}
                            {Number(caja.saldo_actual).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                          </div>
                        </div>

                        <button
                          onClick={() => openEditCajaModal(caja)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Modificar
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NUEVO / EDITAR BANCO                                               */}
      {/* ========================================================================= */}
      {showBancoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-500" />
                {editingBancoId ? 'Editar Banco' : 'Nuevo Banco'}
              </h3>
              <button onClick={() => setShowBancoModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {bancoError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                {bancoError}
              </div>
            )}

            <form onSubmit={handleSaveBanco} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-400">Código / Prefijo Bancario (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: 0134, 0102, 0108"
                  value={bancoCodigo}
                  onChange={(e) => setBancoCodigo(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border font-mono ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-400">Nombre del Banco *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Banesco Banco Universal o Banco de Venezuela"
                  value={bancoNombre}
                  onChange={(e) => setBancoNombre(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBancoModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingBanco}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  {submittingBanco ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {editingBancoId ? 'Guardar Cambios' : 'Registrar Banco'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NUEVA / EDITAR CUENTA BANCARIA                                     */}
      {/* ========================================================================= */}
      {showCuentaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl p-6 ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-500" />
                {editingCuentaId ? 'Editar Cuenta Bancaria' : 'Nueva Cuenta Bancaria'}
              </h3>
              <button onClick={() => setShowCuentaModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {cuentaError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                {cuentaError}
              </div>
            )}

            <form onSubmit={handleSaveCuenta} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-400">Banco Asociado *</label>
                  <select
                    value={cuentaBancoId}
                    onChange={(e) => setCuentaBancoId(Number(e.target.value))}
                    required
                    className={`w-full px-3 py-2 rounded-xl border ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    {soloBancos.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nombre} {b.codigo ? `(${b.codigo})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-400">Tipo de Cuenta *</label>
                  <select
                    value={cuentaTipo}
                    onChange={(e) => setCuentaTipo(e.target.value as any)}
                    className={`w-full px-3 py-2 rounded-xl border ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <option value="CORRIENTE">Cuenta Corriente</option>
                    <option value="AHORRO">Cuenta de Ahorro</option>
                    <option value="VIRTUAL">Billetera / Pasarela Virtual</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-400">Nombre Descriptivo de la Cuenta *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Banesco Corriente / Cobros Pago Móvil"
                  value={cuentaNombre}
                  onChange={(e) => setCuentaNombre(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-400">Moneda *</label>
                  <select
                    value={cuentaMoneda}
                    onChange={(e) => setCuentaMoneda(e.target.value as 'USD' | 'VES')}
                    className={`w-full px-3 py-2 rounded-xl border font-bold ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <option value="VES">Bolívares (Bs. VES)</option>
                    <option value="USD">Dólares ($ USD)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-400">
                    {editingCuentaId ? 'Saldo Actual' : 'Saldo Inicial'}
                  </label>
                  <PosNumberInput
                    value={cuentaSaldo}
                    onChange={(val) => setCuentaSaldo(String(val))}
                    decimals={2}
                    className={`w-full px-3 py-2 rounded-xl border font-mono font-bold text-sm ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-400">Número de Cuenta de 20 Dígitos (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: 0134-0000-00-0000000000"
                  value={cuentaNumero}
                  onChange={(e) => setCuentaNumero(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border font-mono ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCuentaModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingCuenta}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  {submittingCuenta ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {editingCuentaId ? 'Guardar Cambios' : 'Registrar Cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NUEVA / EDITAR CAJA DE EFECTIVO                                    */}
      {/* ========================================================================= */}
      {showCajaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Wallet className="w-5 h-5 text-amber-500" />
                {editingCajaId ? 'Editar Caja de Efectivo' : 'Nueva Caja de Efectivo'}
              </h3>
              <button onClick={() => setShowCajaModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {cajaError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                {cajaError}
              </div>
            )}

            <form onSubmit={handleSaveCaja} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-400">Nombre de la Caja *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Caja Principal Dólares, Caja Chica Local"
                  value={cajaNombre}
                  onChange={(e) => setCajaNombre(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-400">Moneda *</label>
                  <select
                    value={cajaMoneda}
                    onChange={(e) => setCajaMoneda(e.target.value as 'USD' | 'VES')}
                    className={`w-full px-3 py-2 rounded-xl border font-bold ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <option value="USD">Dólares ($ USD)</option>
                    <option value="VES">Bolívares (Bs. VES)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-400">
                    {editingCajaId ? 'Saldo Actual' : 'Saldo Inicial'}
                  </label>
                  <PosNumberInput
                    value={cajaSaldo}
                    onChange={(val) => setCajaSaldo(String(val))}
                    decimals={2}
                    className={`w-full px-3 py-2 rounded-xl border font-mono font-bold text-sm ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCajaModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingCaja}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-amber-600/20 cursor-pointer"
                >
                  {submittingCaja ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {editingCajaId ? 'Guardar Cambios' : 'Registrar Caja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
