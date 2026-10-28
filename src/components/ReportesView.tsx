'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import {
  Receipt,
  TrendingUp,
  Calendar,
  CalendarRange,
  DollarSign,
  Filter,
  RefreshCw,
  Printer,
  ArrowUpRight,
  Package,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  Info,
  Layers,
  BarChart3,
  Search,
  Eye,
  SlidersHorizontal,
  FileSpreadsheet,
  Boxes,
  AlertTriangle,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Tasa } from '@/types';
import { formatStockDesglose, formatStockDesgloseCompleto, getSegmentacionExistencias } from '@/lib/unidades';
import * as XLSX from 'xlsx';

interface ReportesViewProps {
  currentRate: Tasa | null;
  initialTab?: 'ventas' | 'rentabilidad' | 'inventario';
  isDarkMode?: boolean;
}

export default function ReportesView({ currentRate, initialTab = 'ventas', isDarkMode = false }: ReportesViewProps) {
  // Tabs: 'ventas' (Reporte de ventas por fecha) | 'rentabilidad' (Venta vs Costo FIFO) | 'inventario' (Existencias y Valorización)
  const [activeTab, setActiveTab] = useState<'ventas' | 'rentabilidad' | 'inventario'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [inventoryFilter, setInventoryFilter] = useState<'TODOS' | 'CON_STOCK' | 'BAJO_STOCK' | 'AGOTADOS'>('TODOS');
  const [inventorySort, setInventorySort] = useState<'NOMBRE' | 'STOCK_DESC' | 'VALOR_COSTO_DESC' | 'VALOR_VENTA_DESC' | 'UTILIDAD_DESC'>('NOMBRE');
  const [selectedSegmentacionItem, setSelectedSegmentacionItem] = useState<any | null>(null);
  const [expandedProductIds, setExpandedProductIds] = useState<number[]>([]);

  const toggleExpandedProduct = (id: number) => {
    setExpandedProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const [expandedSaleIds, setExpandedSaleIds] = useState<number[]>([]);

  const toggleExpandedSale = (id: number) => {
    setExpandedSaleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Dates state
  const now = new Date();
  const defaultFirstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const defaultToday = now.toISOString().split('T')[0];

  const [fechaDesde, setFechaDesde] = useState(defaultFirstDay);
  const [fechaHasta, setFechaHasta] = useState(defaultToday);
  const [datePreset, setDatePreset] = useState<'mes' | 'hoy' | 'semana' | '30dias' | 'anio' | 'custom'>('mes');

  // Loading & Data states
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Selector de moneda para visualización, exportación e impresión de ventas: 'ambas' | 'usd' | 'bs'
  const [salesCurrencyMode, setSalesCurrencyMode] = useState<'ambas' | 'usd' | 'bs'>('ambas');

  // Sub-tab for Rentabilidad: 'productos' | 'ventas'
  const [rentabilidadSubTab, setRentabilidadSubTab] = useState<'productos' | 'ventas'>('productos');

  // Modal for FIFO lot details
  const [selectedFifoItem, setSelectedFifoItem] = useState<any | null>(null);

  // Apply quick date preset
  const handleApplyPreset = (preset: 'mes' | 'hoy' | 'semana' | '30dias' | 'anio') => {
    setDatePreset(preset);
    const d = new Date();
    const todayStr = d.toISOString().split('T')[0];

    if (preset === 'hoy') {
      setFechaDesde(todayStr);
      setFechaHasta(todayStr);
    } else if (preset === 'semana') {
      const dayOfWeek = d.getDay() || 7;
      const monday = new Date(d);
      monday.setDate(d.getDate() - (dayOfWeek - 1));
      setFechaDesde(monday.toISOString().split('T')[0]);
      setFechaHasta(todayStr);
    } else if (preset === 'mes') {
      const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
      setFechaDesde(firstDay.toISOString().split('T')[0]);
      setFechaHasta(todayStr);
    } else if (preset === '30dias') {
      const thirtyDaysAgo = new Date(d);
      thirtyDaysAgo.setDate(d.getDate() - 30);
      setFechaDesde(thirtyDaysAgo.toISOString().split('T')[0]);
      setFechaHasta(todayStr);
    } else if (preset === 'anio') {
      const firstDayYear = new Date(d.getFullYear(), 0, 1);
      setFechaDesde(firstDayYear.toISOString().split('T')[0]);
      setFechaHasta(todayStr);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reportes?desde=${fechaDesde}&hasta=${fechaHasta}`);
      const data = await res.json();
      if (data.success) {
        setReportData(data);
      }
    } catch (e) {
      console.error('Error fetching reports:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [fechaDesde, fechaHasta]);

  // Filtered sales in Sales Report (searches ID, client, RIF, or product name/presentation)
  const filteredSales = useMemo(() => {
    if (!reportData?.ventas?.pedidos) return [];
    if (!searchTerm.trim()) return reportData.ventas.pedidos;
    const q = searchTerm.toLowerCase();
    return reportData.ventas.pedidos.filter((p: any) =>
      String(p.id).includes(q) ||
      (p.cliente_nombre && p.cliente_nombre.toLowerCase().includes(q)) ||
      (p.cliente_identificacion && p.cliente_identificacion.toLowerCase().includes(q)) ||
      (p.lineas && p.lineas.some((l: any) =>
        (l.producto_nombre && l.producto_nombre.toLowerCase().includes(q)) ||
        (l.presentacion_nombre && l.presentacion_nombre.toLowerCase().includes(q))
      ))
    );
  }, [reportData, searchTerm]);

  // Filtered products in Profitability Report
  const filteredProductsProfit = useMemo(() => {
    if (!reportData?.rentabilidadFifo?.porProducto) return [];
    if (!searchTerm.trim()) return reportData.rentabilidadFifo.porProducto;
    const q = searchTerm.toLowerCase();
    return reportData.rentabilidadFifo.porProducto.filter((p: any) =>
      p.producto_nombre.toLowerCase().includes(q) ||
      String(p.producto_id).includes(q)
    );
  }, [reportData, searchTerm]);

  // Filtered FIFO sales details
  const filteredFifoSalesDetails = useMemo(() => {
    if (!reportData?.rentabilidadFifo?.ventasDetalle) return [];
    if (!searchTerm.trim()) return reportData.rentabilidadFifo.ventasDetalle;
    const q = searchTerm.toLowerCase();
    return reportData.rentabilidadFifo.ventasDetalle.filter((s: any) =>
      String(s.pedido_id).includes(q) ||
      s.producto_nombre.toLowerCase().includes(q) ||
      s.cliente_nombre.toLowerCase().includes(q)
    );
  }, [reportData, searchTerm]);

  // Filtered Inventory items
  const filteredInventory = useMemo(() => {
    if (!reportData?.inventario?.productos) return [];
    let list = [...reportData.inventario.productos];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((p: any) =>
        p.nombre.toLowerCase().includes(q) ||
        String(p.id).includes(q)
      );
    }
    if (inventoryFilter === 'CON_STOCK') {
      list = list.filter((p: any) => p.stock_actual > 0);
    } else if (inventoryFilter === 'BAJO_STOCK') {
      list = list.filter((p: any) => p.stock_actual > 0 && p.stock_actual <= 5);
    } else if (inventoryFilter === 'AGOTADOS') {
      list = list.filter((p: any) => p.stock_actual <= 0);
    }

    if (inventorySort === 'STOCK_DESC') {
      list.sort((a: any, b: any) => b.stock_actual - a.stock_actual);
    } else if (inventorySort === 'VALOR_COSTO_DESC') {
      list.sort((a: any, b: any) => b.valor_costo_usd - a.valor_costo_usd);
    } else if (inventorySort === 'VALOR_VENTA_DESC') {
      list.sort((a: any, b: any) => b.valor_venta_usd - a.valor_venta_usd);
    } else if (inventorySort === 'UTILIDAD_DESC') {
      list.sort((a: any, b: any) => b.utilidad_potencial_usd - a.utilidad_potencial_usd);
    } else {
      list.sort((a: any, b: any) => a.nombre.localeCompare(b.nombre));
    }
    return list;
  }, [reportData, searchTerm, inventoryFilter, inventorySort]);

  // Print Report Handler
  const handlePrint = () => {
    window.print();
  };

  const appliedRate = currentRate && Number(currentRate.tasa) > 0 ? Number(currentRate.tasa) : 1;

  // Excel (.xlsx) Export Handler
  const handleExportExcel = () => {
    if (activeTab === 'ventas') {
      if (!reportData?.ventas?.pedidos) return;
      const wb = XLSX.utils.book_new();

      // Sheet 1: Detalle de Ventas
      let headers: string[] = [];
      if (salesCurrencyMode === 'ambas') {
        headers = [
          'ID Pedido', 'Fecha y Hora', 'Cliente', 'RIF / Cédula', 'Productos Vendidos', 'Artículos', 'Tasa BCV',
          'Base Imponible USD', 'IVA USD', 'Total USD',
          'Base Imponible Bs.', 'IVA Bs.', 'Total Bs.'
        ];
      } else if (salesCurrencyMode === 'usd') {
        headers = [
          'ID Pedido', 'Fecha y Hora', 'Cliente', 'RIF / Cédula', 'Productos Vendidos', 'Artículos', 'Tasa BCV',
          'Base Imponible USD', 'IVA USD', 'Total USD'
        ];
      } else {
        headers = [
          'ID Pedido', 'Fecha y Hora', 'Cliente', 'RIF / Cédula', 'Productos Vendidos', 'Artículos', 'Tasa BCV',
          'Base Imponible Bs.', 'IVA Bs.', 'Total Bs.'
        ];
      }

      const dataRows = reportData.ventas.pedidos.map((p: any) => {
        const prods = (p.lineas || []).map((l: any) => `${Number(l.cantidad)}x ${l.producto_nombre}${l.presentacion_nombre ? ` (${l.presentacion_nombre})` : ''}`).join('; ');
        const tasa = Number(p.tasa_cambio_aplicada);
        const baseBs = p.base_imponible_bs !== undefined ? Number(p.base_imponible_bs) : Number((Number(p.base_imponible_usd) * tasa).toFixed(2));
        const ivaBs = p.monto_impuesto_bs !== undefined ? Number(p.monto_impuesto_bs) : Number((Number(p.monto_impuesto_usd) * tasa).toFixed(2));

        const baseRow = [
          p.id,
          new Date(p.fecha_hora).toLocaleString('es-VE'),
          p.cliente_nombre || 'Consumidor Final',
          p.cliente_identificacion || 'N/A',
          prods,
          p.total_articulos,
          tasa,
        ];

        if (salesCurrencyMode === 'ambas') {
          return [
            ...baseRow,
            Number(p.base_imponible_usd),
            Number(p.monto_impuesto_usd),
            Number(p.total_usd),
            baseBs,
            ivaBs,
            Number(p.total_moneda_local),
          ];
        } else if (salesCurrencyMode === 'usd') {
          return [
            ...baseRow,
            Number(p.base_imponible_usd),
            Number(p.monto_impuesto_usd),
            Number(p.total_usd),
          ];
        } else {
          return [
            ...baseRow,
            baseBs,
            ivaBs,
            Number(p.total_moneda_local),
          ];
        }
      });
      const wsVentas = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
      XLSX.utils.book_append_sheet(wb, wsVentas, 'Ventas');

      // Sheet 2: Detalle de Productos Vendidos (Línea por Línea)
      let itemHeaders: string[] = [];
      if (salesCurrencyMode === 'ambas') {
        itemHeaders = ['ID Pedido', 'Fecha y Hora', 'Cliente', 'ID Producto', 'Producto', 'Presentación / Medida', 'Cantidad', 'Precio Unitario USD', 'IVA %', 'Monto IVA USD', 'Subtotal USD', 'Total USD', 'Base Bs.', 'IVA Bs.', 'Total Bs.'];
      } else if (salesCurrencyMode === 'usd') {
        itemHeaders = ['ID Pedido', 'Fecha y Hora', 'Cliente', 'ID Producto', 'Producto', 'Presentación / Medida', 'Cantidad', 'Precio Unitario USD', 'IVA %', 'Monto IVA USD', 'Subtotal USD', 'Total USD'];
      } else {
        itemHeaders = ['ID Pedido', 'Fecha y Hora', 'Cliente', 'ID Producto', 'Producto', 'Presentación / Medida', 'Cantidad', 'Precio Unitario Bs.', 'IVA %', 'Base Bs.', 'IVA Bs.', 'Total Bs.'];
      }

      const itemRows: any[] = [];
      reportData.ventas.pedidos.forEach((p: any) => {
        const tasa = Number(p.tasa_cambio_aplicada);
        (p.lineas || []).forEach((l: any) => {
          const subtotalUsd = Number(l.subtotal_usd);
          const ivaUsd = Number(l.monto_impuesto_usd);
          const lineTotalUsd = subtotalUsd + ivaUsd;
          const subtotalBs = Number((subtotalUsd * tasa).toFixed(2));
          const ivaBs = Number((ivaUsd * tasa).toFixed(2));
          const lineTotalBs = Number((lineTotalUsd * tasa).toFixed(2));

          const baseItem = [
            p.id,
            new Date(p.fecha_hora).toLocaleString('es-VE'),
            p.cliente_nombre || 'Consumidor Final',
            l.producto_id,
            l.producto_nombre,
            l.presentacion_nombre || l.unidad_base || 'Unidad',
            Number(l.cantidad),
          ];

          if (salesCurrencyMode === 'ambas') {
            itemRows.push([
              ...baseItem,
              Number(l.precio_unitario_usd),
              Number(l.porcentaje_impuesto),
              ivaUsd,
              subtotalUsd,
              Number(lineTotalUsd.toFixed(2)),
              subtotalBs,
              ivaBs,
              lineTotalBs,
            ]);
          } else if (salesCurrencyMode === 'usd') {
            itemRows.push([
              ...baseItem,
              Number(l.precio_unitario_usd),
              Number(l.porcentaje_impuesto),
              ivaUsd,
              subtotalUsd,
              Number(lineTotalUsd.toFixed(2)),
            ]);
          } else {
            itemRows.push([
              ...baseItem,
              Number((Number(l.precio_unitario_usd) * tasa).toFixed(2)),
              Number(l.porcentaje_impuesto),
              subtotalBs,
              ivaBs,
              lineTotalBs,
            ]);
          }
        });
      });
      const wsItems = XLSX.utils.aoa_to_sheet([itemHeaders, ...itemRows]);
      XLSX.utils.book_append_sheet(wb, wsItems, 'Detalle de Productos');

      // Sheet 3: Resumen
      const res = reportData.ventas.resumen;
      if (res) {
        const resumenHeaders = ['Métrica', 'Valor'];
        const resumenRows = [
          ['Modo de Moneda', salesCurrencyMode === 'ambas' ? 'Ambas Monedas (USD y Bs.)' : salesCurrencyMode === 'usd' ? 'Solo Dólares (USD)' : 'Solo Bolívares (Bs.)'],
          ['Total Ventas USD', res.totalVentasUsd],
          ['Total Ventas Bs.', res.totalVentasLocal],
          ['Base Imponible USD', res.totalBaseUsd],
          ['Base Imponible Bs.', res.totalBaseLocal || Number((res.totalBaseUsd * appliedRate).toFixed(2))],
          ['IVA Total USD', res.totalIvaUsd],
          ['IVA Total Bs.', res.totalIvaLocal || Number((res.totalIvaUsd * appliedRate).toFixed(2))],
          ['Cantidad de Pedidos', res.totalPedidos],
          ['Ticket Promedio USD', res.ticketPromedioUsd],
          ['Tasa BCV Promedio', res.tasaPromedio || appliedRate],
          ['Período Desde', fechaDesde],
          ['Período Hasta', fechaHasta],
        ];
        const wsResumen = XLSX.utils.aoa_to_sheet([resumenHeaders, ...resumenRows]);
        XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');
      }

      XLSX.writeFile(wb, `reporte_ventas_${salesCurrencyMode}_${fechaDesde}_al_${fechaHasta}.xlsx`);
    } else if (activeTab === 'rentabilidad') {
      if (!reportData?.rentabilidadFifo?.porProducto) return;
      const wb = XLSX.utils.book_new();

      // Sheet 1: Rentabilidad por Producto
      const prodHeaders = ['ID Producto', 'Producto', 'Unidades Vendidas', 'Ingreso Total USD', 'Costo FIFO Total USD', 'Utilidad Bruta USD', 'Margen %'];
      const prodRows = reportData.rentabilidadFifo.porProducto.map((p: any) => [
        p.producto_id,
        p.producto_nombre,
        Number(p.unidades_vendidas),
        Number(p.ingreso_total_usd),
        Number(p.costo_fifo_total_usd),
        Number(p.utilidad_bruta_usd),
        Number(p.margen_porcentaje),
      ]);
      const wsProd = XLSX.utils.aoa_to_sheet([prodHeaders, ...prodRows]);
      XLSX.utils.book_append_sheet(wb, wsProd, 'Rentabilidad Productos');

      // Sheet 2: Rentabilidad por Ticket
      if (reportData.rentabilidadFifo.porPedido) {
        const pedHeaders = ['ID Pedido', 'Fecha', 'Cliente', 'Venta Total USD', 'Costo FIFO USD', 'Utilidad USD', 'Margen %'];
        const pedRows = reportData.rentabilidadFifo.porPedido.map((p: any) => [
          p.pedido_id,
          new Date(p.fecha).toLocaleString('es-VE'),
          p.cliente_nombre || 'Consumidor Final',
          Number(p.venta_total_usd),
          Number(p.costo_fifo_usd),
          Number(p.utilidad_usd),
          Number(p.margen_porcentaje),
        ]);
        const wsPed = XLSX.utils.aoa_to_sheet([pedHeaders, ...pedRows]);
        XLSX.utils.book_append_sheet(wb, wsPed, 'Rentabilidad Ventas');
      }

      // Sheet 3: Resumen FIFO
      const rFifo = reportData.rentabilidadFifo.resumen;
      if (rFifo) {
        const resHeaders = ['Métrica FIFO', 'Valor USD', 'Valor Bs.'];
        const resRows = [
          ['Ingresos Totales por Ventas', rFifo.totalVentasUsd, (rFifo.totalVentasUsd * appliedRate).toFixed(2)],
          ['Costo Total de Ventas (FIFO)', rFifo.totalCostoFifoUsd, (rFifo.totalCostoFifoUsd * appliedRate).toFixed(2)],
          ['Utilidad Bruta Global', rFifo.utilidadBrutaGlobalUsd, (rFifo.utilidadBrutaGlobalUsd * appliedRate).toFixed(2)],
          ['Margen Bruto Global %', `${rFifo.margenBrutoGlobalPorcentaje}%`, ''],
          ['Tasa BCV Aplicada', appliedRate, ''],
          ['Período Desde', fechaDesde, ''],
          ['Período Hasta', fechaHasta, ''],
        ];
        const wsResumen = XLSX.utils.aoa_to_sheet([resHeaders, ...resRows]);
        XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen FIFO');
      }

      XLSX.writeFile(wb, `reporte_rentabilidad_fifo_${fechaDesde}_al_${fechaHasta}.xlsx`);
    } else {
      if (!reportData?.inventario?.productos) return;
      const wb = XLSX.utils.book_new();

      // Sheet 1: Inventario Completo
      const invHeaders = [
        'ID Producto',
        'Nombre Producto',
        'Unidad Base',
        'Presentaciones Registradas',
        'Stock Base (Unidades)',
        'Empaque Jerárquico Óptimo',
        'Segmentación de Existencias',
        'Precios de Venta por Medida',
        'Costo Unitario USD',
        'Precio Venta Base USD',
        'Valor Costo Total USD',
        'Valor Costo Total Bs.',
        'Valor Venta Total USD',
        'Valor Venta Total Bs.',
        'Ganancia Potencial USD',
        'Margen %',
        'Estado',
      ];
      const invRows = reportData.inventario.productos.map((p: any) => {
        const presNames = (p.presentaciones || []).map((pr: any) => `${pr.nombre} (x${pr.factor})`).join('; ') || 'Ninguna';
        const empaque = formatStockDesgloseCompleto(p, p.stock_actual);
        const segs = getSegmentacionExistencias(p, p.stock_actual);
        const segText = segs.map(s => `${s.unidades_completas} ${s.nombre}${s.resto_unidades > 0 && s.factor > 1 ? ` (+${s.resto_unidades}u)` : ''}`).join(' | ');
        const preciosText = segs.map(s => `${s.nombre}: $${s.precio_usd.toFixed(2)}${s.factor > 1 ? ` ($${s.precio_unitario_equivalente.toFixed(2)}/u)` : ''}`).join(' | ');
        const st = p.stock_actual <= 0 ? 'Agotado' : p.stock_actual <= 5 ? 'Stock Bajo' : 'Óptimo';
        return [
          p.id,
          p.nombre,
          p.unidad_base || 'Unidad',
          presNames,
          Number(p.stock_actual),
          empaque,
          segText,
          preciosText,
          Number(p.costo_promedio_usd),
          Number(p.precio_usd),
          Number(p.valor_costo_usd),
          Number((p.valor_costo_usd * appliedRate).toFixed(2)),
          Number(p.valor_venta_usd),
          Number((p.valor_venta_usd * appliedRate).toFixed(2)),
          Number(p.utilidad_potencial_usd),
          Number(p.margen_potencial_porcentaje),
          st,
        ];
      });
      const wsInv = XLSX.utils.aoa_to_sheet([invHeaders, ...invRows]);
      XLSX.utils.book_append_sheet(wb, wsInv, 'Inventario');

      // Sheet 2: Detalle de Segmentaciones por Medida
      const segDetailHeaders = [
        'ID Producto',
        'Nombre Producto',
        'Presentación / Medida',
        'Factor Empaque',
        'Stock Disponible Completo',
        'Fracción / Unidades Sueltas',
        'Precio Venta USD',
        'Precio Venta Bs.',
        'Precio Equivalente por Unidad USD',
        'Valor Total Potencial USD',
        'Ganancia Potencial USD',
      ];
      const segDetailRows: any[] = [];
      reportData.inventario.productos.forEach((p: any) => {
        const segs = getSegmentacionExistencias(p, p.stock_actual);
        segs.forEach((seg) => {
          const precioBs = seg.precio_usd * appliedRate;
          const ganancia = seg.valor_potencial_usd - p.valor_costo_usd;
          segDetailRows.push([
            p.id,
            p.nombre,
            seg.nombre,
            seg.factor,
            seg.unidades_completas,
            seg.resto_unidades,
            seg.precio_usd,
            Number(precioBs.toFixed(2)),
            seg.precio_unitario_equivalente,
            seg.valor_potencial_usd,
            Number(ganancia.toFixed(2)),
          ]);
        });
      });
      const wsSeg = XLSX.utils.aoa_to_sheet([segDetailHeaders, ...segDetailRows]);
      XLSX.utils.book_append_sheet(wb, wsSeg, 'Detalle Medidas');

      // Sheet 3: Resumen Almacén
      const invSum = reportData.inventario.resumen;
      if (invSum) {
        const sumHeaders = ['Métrica', 'Valor USD', 'Valor Bs.'];
        const sumRows = [
          ['Total Productos en Catálogo', invSum.totalProductos, ''],
          ['Productos Activos', invSum.productosActivos, ''],
          ['Total Unidades Físicas en Stock', invSum.totalUnidadesEnStock, ''],
          ['Valor Total al Costo', invSum.valorCostoTotalGlobalUsd, (invSum.valorCostoTotalGlobalUsd * appliedRate).toFixed(2)],
          ['Valor Total a Venta Proyectado', invSum.valorVentaTotalGlobalUsd, (invSum.valorVentaTotalGlobalUsd * appliedRate).toFixed(2)],
          ['Ganancia Potencial Global', invSum.utilidadPotencialGlobalUsd, (invSum.utilidadPotencialGlobalUsd * appliedRate).toFixed(2)],
          ['Margen Potencial Global %', `${invSum.margenPotencialGlobalPct}%`, ''],
          ['Productos Agotados (Stock 0)', invSum.productosAgotados, ''],
          ['Productos con Stock Bajo (≤ 5)', invSum.productosStockBajo, ''],
          ['Tasa BCV Aplicada', appliedRate, ''],
          ['Fecha de Emisión', new Date().toLocaleDateString('es-VE'), ''],
        ];
        const wsSum = XLSX.utils.aoa_to_sheet([sumHeaders, ...sumRows]);
        XLSX.utils.book_append_sheet(wb, wsSum, 'Resumen Almacén');
      }

      XLSX.writeFile(wb, `reporte_inventario_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
  };

  // CSV Export Handler
  const handleExportCsv = () => {
    if (activeTab === 'ventas') {
      if (!reportData?.ventas?.pedidos) return;

      let headers: string[] = [];
      if (salesCurrencyMode === 'ambas') {
        headers = ['ID Pedido', 'Fecha y Hora', 'Cliente', 'RIF', 'Productos Vendidos', 'Articulos', 'Tasa', 'Base USD', 'IVA USD', 'Total USD', 'Base Bs', 'IVA Bs', 'Total Bs'];
      } else if (salesCurrencyMode === 'usd') {
        headers = ['ID Pedido', 'Fecha y Hora', 'Cliente', 'RIF', 'Productos Vendidos', 'Articulos', 'Tasa', 'Base USD', 'IVA USD', 'Total USD'];
      } else {
        headers = ['ID Pedido', 'Fecha y Hora', 'Cliente', 'RIF', 'Productos Vendidos', 'Articulos', 'Tasa', 'Base Bs', 'IVA Bs', 'Total Bs'];
      }

      const rows = reportData.ventas.pedidos.map((p: any) => {
        const prods = (p.lineas || []).map((l: any) => `${Number(l.cantidad)}x ${l.producto_nombre}${l.presentacion_nombre ? ` (${l.presentacion_nombre})` : ''}`).join('; ');
        const tasa = Number(p.tasa_cambio_aplicada);
        const baseBs = p.base_imponible_bs !== undefined ? Number(p.base_imponible_bs) : Number((Number(p.base_imponible_usd) * tasa).toFixed(2));
        const ivaBs = p.monto_impuesto_bs !== undefined ? Number(p.monto_impuesto_bs) : Number((Number(p.monto_impuesto_usd) * tasa).toFixed(2));

        const baseRow = [
          p.id,
          new Date(p.fecha_hora).toLocaleString('es-VE'),
          `"${p.cliente_nombre || ''}"`,
          `"${p.cliente_identificacion || ''}"`,
          `"${prods}"`,
          p.total_articulos,
          p.tasa_cambio_aplicada,
        ];

        if (salesCurrencyMode === 'ambas') {
          return [
            ...baseRow,
            p.base_imponible_usd,
            p.monto_impuesto_usd,
            p.total_usd,
            baseBs,
            ivaBs,
            p.total_moneda_local,
          ];
        } else if (salesCurrencyMode === 'usd') {
          return [
            ...baseRow,
            p.base_imponible_usd,
            p.monto_impuesto_usd,
            p.total_usd,
          ];
        } else {
          return [
            ...baseRow,
            baseBs,
            ivaBs,
            p.total_moneda_local,
          ];
        }
      });
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e: any[]) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `reporte_ventas_${salesCurrencyMode}_${fechaDesde}_al_${fechaHasta}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (activeTab === 'rentabilidad') {
      if (!reportData?.rentabilidadFifo?.porProducto) return;
      const headers = ['ID Producto', 'Producto', 'Unidades Vendidas', 'Ingreso Total USD', 'Costo FIFO Total USD', 'Utilidad Bruta USD', 'Margen %'];
      const rows = reportData.rentabilidadFifo.porProducto.map((p: any) => [
        p.producto_id,
        `"${p.producto_nombre}"`,
        p.unidades_vendidas,
        p.ingreso_total_usd,
        p.costo_fifo_total_usd,
        p.utilidad_bruta_usd,
        `${p.margen_porcentaje}%`,
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e: any[]) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `reporte_rentabilidad_fifo_${fechaDesde}_al_${fechaHasta}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      if (!reportData?.inventario?.productos) return;
      const headers = [
        'ID Producto',
        'Nombre Producto',
        'Unidad Base',
        'Presentaciones Registradas',
        'Stock Base (Unidades)',
        'Empaque Jerarquico Optimo',
        'Segmentacion de Existencias por Medida',
        'Precios por Medida',
        'Costo Promedio USD',
        'Precio Venta Base USD',
        'Valor Costo Total USD',
        'Valor Costo Total Bs',
        'Valor Venta Total USD',
        'Valor Venta Total Bs',
        'Ganancia Potencial USD',
        'Margen %',
        'Estado',
      ];
      const rows = reportData.inventario.productos.map((p: any) => {
        const presNames = (p.presentaciones || []).map((pr: any) => `${pr.nombre} (x${pr.factor})`).join('; ') || 'Ninguna';
        const empaque = formatStockDesgloseCompleto(p, p.stock_actual);
        const segs = getSegmentacionExistencias(p, p.stock_actual);
        const segText = segs.map(s => `${s.unidades_completas} ${s.nombre}${s.resto_unidades > 0 && s.factor > 1 ? ` (+${s.resto_unidades}u)` : ''}`).join(' | ');
        const preciosText = segs.map(s => `${s.nombre}: $${s.precio_usd.toFixed(2)}${s.factor > 1 ? ` ($${s.precio_unitario_equivalente.toFixed(2)}/u)` : ''}`).join(' | ');
        const st = p.stock_actual <= 0 ? 'Agotado' : p.stock_actual <= 5 ? 'Stock Bajo' : 'Óptimo';
        return [
          p.id,
          `"${p.nombre}"`,
          `"${p.unidad_base || 'Unidad'}"`,
          `"${presNames}"`,
          p.stock_actual,
          `"${empaque}"`,
          `"${segText}"`,
          `"${preciosText}"`,
          p.costo_promedio_usd,
          p.precio_usd,
          p.valor_costo_usd,
          (p.valor_costo_usd * appliedRate).toFixed(2),
          p.valor_venta_usd,
          (p.valor_venta_usd * appliedRate).toFixed(2),
          p.utilidad_potencial_usd,
          `${p.margen_potencial_porcentaje}%`,
          st,
        ];
      });
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e: any[]) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `reporte_inventario_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const salesSummary = reportData?.ventas?.resumen || {
    totalVentasUsd: 0,
    totalVentasLocal: 0,
    totalBaseUsd: 0,
    totalBaseLocal: 0,
    totalIvaUsd: 0,
    totalIvaLocal: 0,
    cantidadPedidos: 0,
    ticketPromedioUsd: 0,
    totalUnidadesVendidas: 0,
  };

  const fifoSummary = reportData?.rentabilidadFifo?.resumen || {
    totalIngresosUsd: 0,
    totalCostosFifoUsd: 0,
    totalUtilidadBrutaUsd: 0,
    margenGlobalPorcentaje: 0,
  };

  const invSummary = reportData?.inventario?.resumen || {
    totalProductos: 0,
    productosActivos: 0,
    totalUnidadesEnStock: 0,
    valorTotalCostoUsd: 0,
    valorTotalVentaUsd: 0,
    utilidadPotencialGlobalUsd: 0,
    margenPotencialGlobalPct: 0,
    productosAgotados: 0,
    productosStockBajo: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header with Title & Main Tabs */}
      <div className={`print:hidden p-6 rounded-3xl border transition-all ${
        isDarkMode
          ? 'bg-slate-900/60 border-slate-800 shadow-xl'
          : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <BarChart3 className="w-3.5 h-3.5" />
              Centro de Informes & Analítica
            </div>
            <h2 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Reportes Ejecutivos del Negocio
            </h2>
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Análisis de ventas por período y rentabilidad operativa calculada bajo la metodología FIFO (PEPS)
            </p>
          </div>

          {/* Action Tabs: Ventas vs Rentabilidad FIFO vs Inventario */}
          <div className={`inline-flex flex-wrap items-center p-1.5 rounded-2xl border ${
            isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setActiveTab('ventas')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'ventas'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-4 h-4" />
              1. Ventas por Fecha
            </button>

            <button
              onClick={() => setActiveTab('rentabilidad')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'rentabilidad'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              2. Rentabilidad FIFO
            </button>

            <button
              onClick={() => setActiveTab('inventario')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'inventario'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Boxes className="w-4 h-4" />
              3. Inventario & Valorización
            </button>
          </div>
        </div>
      </div>

      {/* Date Range Selector & Actions Bar */}
      <div className={`print:hidden p-4 rounded-2xl border flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 transition-colors ${
        isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        {/* Quick Date Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Período:
          </span>

          {[
            { id: 'hoy', label: 'Hoy' },
            { id: 'semana', label: 'Esta Semana' },
            { id: 'mes', label: 'Este Mes' },
            { id: '30dias', label: 'Últimos 30 días' },
            { id: 'anio', label: 'Este Año' },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleApplyPreset(preset.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                datePreset === preset.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : isDarkMode
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Date Pickers (Desde - Hasta) + Export Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-medium">Desde:</span>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => {
                  setFechaDesde(e.target.value);
                  setDatePreset('custom');
                }}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-medium">Hasta:</span>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => {
                  setFechaHasta(e.target.value);
                  setDatePreset('custom');
                }}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchReports}
              disabled={loading}
              title="Refrescar reporte"
              className={`p-2 rounded-xl border transition ${
                isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleExportExcel}
              title="Descargar libro de Microsoft Excel (.xlsx)"
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-emerald-600/25"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Excel (.xlsx)
            </button>

            <button
              onClick={handleExportCsv}
              title="Exportar a archivo plano CSV"
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 shadow-sm'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
              CSV
            </button>

            <button
              onClick={handlePrint}
              title="Imprimir reporte"
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-indigo-600/20"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. REPORTE DE VENTAS POR RANGO DE FECHA                                    */}
      {/* ========================================================================= */}
      {activeTab === 'ventas' && (
        <div className="space-y-6 animate-in fade-in">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total USD */}
            <div className={`p-5 rounded-2xl border transition-all ${
              isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Ventas (USD)</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mb-1">
                ${salesSummary.totalVentasUsd.toFixed(2)}
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Base: ${salesSummary.totalBaseUsd.toFixed(2)}</span>
                <span className="text-amber-500 font-semibold">+IVA: ${salesSummary.totalIvaUsd.toFixed(2)}</span>
              </div>
            </div>

            {/* Card 2: Total Bs */}
            <div className={`p-5 rounded-2xl border transition-all ${
              isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Moneda Local</span>
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Receipt className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400 mb-1">
                {salesSummary.totalVentasLocal.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-xs font-normal text-slate-400 ml-1">Bs.</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Base: {(salesSummary.totalBaseLocal || Number((salesSummary.totalBaseUsd * appliedRate).toFixed(2))).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.</span>
                <span className="text-amber-500 font-semibold">+IVA: {(salesSummary.totalIvaLocal || Number((salesSummary.totalIvaUsd * appliedRate).toFixed(2))).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.</span>
              </div>
            </div>

            {/* Card 3: Cantidad de Ventas */}
            <div className={`p-5 rounded-2xl border transition-all ${
              isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Ventas Completadas</span>
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mb-1">
                {salesSummary.cantidadPedidos} <span className="text-xs font-normal text-slate-400">pedidos</span>
              </div>
              <div className="text-xs text-slate-500">
                {salesSummary.totalUnidadesVendidas} unidades de artículos despachadas
              </div>
            </div>

            {/* Card 4: Ticket Promedio */}
            <div className={`p-5 rounded-2xl border transition-all ${
              isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Ticket Promedio</span>
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <BarChart3 className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400 mb-1">
                ${salesSummary.ticketPromedioUsd.toFixed(2)}
              </div>
              <div className="text-xs text-slate-400">
                Promedio de consumo por cliente
              </div>
            </div>
          </div>

          {/* Encabezado visible únicamente al imprimir */}
          <div className="hidden print:block mb-4 p-4 border border-slate-300 rounded-2xl bg-white text-slate-900">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">Reporte de Ventas</h2>
                <p className="text-xs font-semibold text-slate-700 mt-0.5">
                  Visualización de Moneda:{' '}
                  <span className="font-bold text-indigo-700">
                    {salesCurrencyMode === 'ambas'
                      ? 'Ambas Monedas (USD y Bs.)'
                      : salesCurrencyMode === 'usd'
                      ? 'Solo Dólares (USD)'
                      : 'Solo Bolívares (Bs.)'}
                  </span>
                </p>
                <p className="text-xs text-slate-600 font-mono">
                  Período: {fechaDesde} al {fechaHasta}
                </p>
              </div>
              <div className="text-right text-xs text-slate-500 font-mono">
                <p>Fecha de Impresión: {new Date().toLocaleString('es-VE')}</p>
                <p>Total Pedidos: {salesSummary.cantidadPedidos}</p>
              </div>
            </div>
          </div>

          {/* Search bar & Currency Selector inside Sales Table */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 print:hidden">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filtrar por ID, cliente o RIF..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-9 pr-3.5 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              {/* Selector de Moneda (Ambas / USD / Bs.) */}
              <div className={`flex items-center gap-1 p-1 rounded-xl border transition-colors ${
                isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-100/90 border-slate-200'
              }`}>
                <span className="text-[11px] font-bold text-slate-400 px-2 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-indigo-500" /> Moneda:
                </span>
                <button
                  type="button"
                  onClick={() => setSalesCurrencyMode('ambas')}
                  title="Ver, descargar e imprimir en ambas monedas (USD y Bs.)"
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    salesCurrencyMode === 'ambas'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ambas (USD + Bs.)
                </button>
                <button
                  type="button"
                  onClick={() => setSalesCurrencyMode('usd')}
                  title="Ver, descargar e imprimir solo en Dólares (USD)"
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    salesCurrencyMode === 'usd'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Solo USD ($)
                </button>
                <button
                  type="button"
                  onClick={() => setSalesCurrencyMode('bs')}
                  title="Ver, descargar e imprimir solo en Bolívares (Bs.)"
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    salesCurrencyMode === 'bs'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Solo Bs.
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-400 font-mono">
              Mostrando {filteredSales.length} de {salesSummary.cantidadPedidos} ventas en el período
            </div>
          </div>

          {/* Sales Table */}
          <div className={`rounded-2xl border overflow-hidden transition-colors ${
            isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className={`text-xs uppercase tracking-wider border-b transition-colors ${
                  isDarkMode ? 'bg-slate-950/70 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}>
                  <tr>
                    <th className="py-3.5 px-4">ID</th>
                    <th className="py-3.5 px-4">Fecha y Hora</th>
                    <th className="py-3.5 px-4">Cliente</th>
                    <th className="py-3.5 px-4">Productos Vendidos</th>
                    <th className="py-3.5 px-3 text-center">Arts.</th>
                    <th className="py-3.5 px-3 text-right">Tasa BCV</th>

                    {/* Columnas en USD */}
                    {(salesCurrencyMode === 'ambas' || salesCurrencyMode === 'usd') && (
                      <>
                        <th className="py-3.5 px-3 text-right text-slate-700 dark:text-slate-300">Base Imponible USD</th>
                        <th className="py-3.5 px-3 text-right text-amber-600 dark:text-amber-400">IVA USD</th>
                        <th className="py-3.5 px-4 text-right text-emerald-600 dark:text-emerald-400">Total USD</th>
                      </>
                    )}

                    {/* Columnas en Bolívares (Bs.) */}
                    {(salesCurrencyMode === 'ambas' || salesCurrencyMode === 'bs') && (
                      <>
                        <th className="py-3.5 px-3 text-right text-slate-700 dark:text-slate-300">Base Imponible Bs.</th>
                        <th className="py-3.5 px-3 text-right text-amber-600 dark:text-amber-400">IVA Bs.</th>
                        <th className="py-3.5 px-4 text-right text-indigo-600 dark:text-indigo-400">Total Bs.</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className={`divide-y transition-colors ${
                  isDarkMode ? 'divide-slate-800/60 text-slate-200' : 'divide-slate-100 text-slate-800'
                }`}>
                  {loading ? (
                    <tr>
                      <td colSpan={salesCurrencyMode === 'ambas' ? 12 : 9} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-indigo-500 opacity-60" />
                        Cargando reporte de ventas...
                      </td>
                    </tr>
                  ) : filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={salesCurrencyMode === 'ambas' ? 12 : 9} className="py-12 text-center text-slate-400">
                        <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        No se encontraron ventas completadas en el rango seleccionado ({fechaDesde} a {fechaHasta}).
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map((p: any) => {
                      const isSaleExpanded = expandedSaleIds.includes(p.id);
                      const hasLineas = p.lineas && p.lineas.length > 0;

                      return (
                        <Fragment key={p.id}>
                          <tr className={`transition-colors ${isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'} ${isSaleExpanded ? 'bg-indigo-50/20 dark:bg-indigo-950/20' : ''}`}>
                            <td className="py-3 px-4 font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                              #{p.id}
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400 font-mono">
                              {new Date(p.fecha_hora).toLocaleString('es-VE')}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-xs text-slate-900 dark:text-white">
                                {p.cliente_nombre || 'Cliente General'}
                              </div>
                              {p.cliente_identificacion && (
                                <div className="text-[10px] font-mono text-slate-400">
                                  {p.cliente_identificacion}
                                </div>
                              )}
                            </td>

                            {/* Columna de Productos Vendidos */}
                            <td className="py-3 px-4">
                              <div className="space-y-1 max-w-[280px]">
                                {hasLineas ? (
                                  <>
                                    <div className="flex flex-wrap gap-1">
                                      {p.lineas.map((linea: any, idx: number) => (
                                        <span
                                          key={linea.id || idx}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80"
                                          title={`${Number(linea.cantidad)}x ${linea.producto_nombre} ${linea.presentacion_nombre ? `(${linea.presentacion_nombre})` : ''} - $${Number(linea.subtotal_usd).toFixed(2)}`}
                                        >
                                          <Package className="w-3 h-3 text-indigo-500 shrink-0" />
                                          <strong className="text-indigo-600 dark:text-indigo-400 font-bold">
                                            {Number(linea.cantidad)}x
                                          </strong>
                                          <span className="font-semibold truncate max-w-[120px]">{linea.producto_nombre}</span>
                                          {linea.presentacion_nombre && (
                                            <span className="text-[10px] px-1 rounded bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-bold">
                                              {linea.presentacion_nombre}
                                            </span>
                                          )}
                                        </span>
                                      ))}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => toggleExpandedSale(p.id)}
                                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 mt-0.5"
                                    >
                                      {isSaleExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                      <span>{isSaleExpanded ? 'Ocultar ticket' : 'Ver detalle del ticket'}</span>
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-xs text-slate-400 italic">Sin productos detallados</span>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-3 text-center font-mono text-xs">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {p.total_articulos}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-xs text-slate-500">
                              {Number(p.tasa_cambio_aplicada).toFixed(4)}
                            </td>
                            {/* Columnas en USD */}
                            {(salesCurrencyMode === 'ambas' || salesCurrencyMode === 'usd') && (
                              <>
                                <td className="py-3 px-3 text-right font-mono text-xs text-slate-600 dark:text-slate-300">
                                  ${Number(p.base_imponible_usd).toFixed(2)}
                                </td>
                                <td className="py-3 px-3 text-right font-mono text-xs text-amber-600 dark:text-amber-400">
                                  ${Number(p.monto_impuesto_usd).toFixed(2)}
                                </td>
                                <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                  ${Number(p.total_usd).toFixed(2)}
                                </td>
                              </>
                            )}

                            {/* Columnas en Bolívares (Bs.) */}
                            {(salesCurrencyMode === 'ambas' || salesCurrencyMode === 'bs') && (
                              <>
                                <td className="py-3 px-3 text-right font-mono text-xs text-slate-600 dark:text-slate-300">
                                  {(p.base_imponible_bs !== undefined
                                    ? Number(p.base_imponible_bs)
                                    : Number(p.base_imponible_usd) * Number(p.tasa_cambio_aplicada)
                                  ).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                                  <span className="text-[10px] font-normal text-slate-400">Bs.</span>
                                </td>
                                <td className="py-3 px-3 text-right font-mono text-xs text-amber-600 dark:text-amber-400">
                                  {(p.monto_impuesto_bs !== undefined
                                    ? Number(p.monto_impuesto_bs)
                                    : Number(p.monto_impuesto_usd) * Number(p.tasa_cambio_aplicada)
                                  ).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                                  <span className="text-[10px] font-normal text-slate-400">Bs.</span>
                                </td>
                                <td className="py-3 px-4 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                  {Number(p.total_moneda_local).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                                  <span className="text-[10px] font-normal text-slate-400">Bs.</span>
                                </td>
                              </>
                            )}
                          </tr>

                          {/* Fila expandible con el desglose del ticket */}
                          {isSaleExpanded && hasLineas && (
                            <tr className="bg-slate-50/90 dark:bg-slate-900/60 border-b-2 border-indigo-500/30">
                              <td colSpan={salesCurrencyMode === 'ambas' ? 12 : 9} className="p-4 sm:p-5">
                                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center gap-2">
                                      <Receipt className="w-4 h-4 text-indigo-500" />
                                      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                                        Detalle de Productos en Pedido #{p.id} — {p.cliente_nombre || 'Cliente General'}
                                      </h5>
                                    </div>
                                    <span className="text-xs font-mono text-slate-400">
                                      Tasa Aplicada: {Number(p.tasa_cambio_aplicada).toFixed(4)} Bs/$
                                    </span>
                                  </div>

                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs font-mono">
                                      <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                                        <tr>
                                          <th className="py-2 px-3">Producto</th>
                                          <th className="py-2 px-3">Presentación / Medida</th>
                                          <th className="py-2 px-3 text-center">Cantidad</th>
                                          <th className="py-2 px-3 text-right">Precio Unit. (USD)</th>
                                          <th className="py-2 px-3 text-right">IVA %</th>
                                          <th className="py-2 px-3 text-right">IVA (USD)</th>
                                          <th className="py-2 px-3 text-right">Subtotal (USD)</th>
                                          <th className="py-2 px-3 text-right">Total (Bs.)</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                        {p.lineas.map((linea: any, idx: number) => {
                                          const lineTotalUsd = Number(linea.subtotal_usd) + Number(linea.monto_impuesto_usd);
                                          const lineTotalBs = lineTotalUsd * Number(p.tasa_cambio_aplicada);
                                          return (
                                            <tr key={linea.id || idx} className="hover:bg-slate-500/5">
                                              <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                                                {linea.producto_nombre}
                                              </td>
                                              <td className="py-2.5 px-3">
                                                <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-bold">
                                                  {linea.presentacion_nombre || linea.unidad_base || 'Unidad'}
                                                </span>
                                              </td>
                                              <td className="py-2.5 px-3 text-center font-bold">
                                                {Number(linea.cantidad)}
                                              </td>
                                              <td className="py-2.5 px-3 text-right">
                                                ${Number(linea.precio_unitario_usd).toFixed(2)}
                                              </td>
                                              <td className="py-2.5 px-3 text-right text-slate-400">
                                                {Number(linea.porcentaje_impuesto)}%
                                              </td>
                                              <td className="py-2.5 px-3 text-right text-amber-600 dark:text-amber-400">
                                                ${Number(linea.monto_impuesto_usd).toFixed(2)}
                                              </td>
                                              <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                                                ${Number(linea.subtotal_usd).toFixed(2)}
                                              </td>
                                              <td className="py-2.5 px-3 text-right font-bold text-indigo-600 dark:text-indigo-400">
                                                Bs. {lineTotalBs.toFixed(2)}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. REPORTE DE RENTABILIDAD VENTA VS COSTO (FIFO)                           */}
      {/* ========================================================================= */}
      {activeTab === 'rentabilidad' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Methodology Explanatory Banner */}
          <div className={`p-4 rounded-2xl border flex items-start gap-3.5 text-xs ${
            isDarkMode ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}>
            <Info className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-sm block">
                Metodología de Costeo FIFO / PEPS (Primeras Entradas, Primeras Salidas)
              </span>
              <p className="leading-relaxed opacity-90 text-[11px]">
                Este reporte analiza el margen de ganancia real de cada producto. Al vender un artículo, se le asigna el costo exacto del 
                <strong> lote de compra más antiguo disponible en inventario</strong>. Cuando ese lote se agota, las siguientes unidades toman el costo del siguiente lote de compra.
              </p>
            </div>
          </div>

          {/* Profitability KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Ingresos Ventas */}
            <div className={`p-5 rounded-2xl border transition-all ${
              isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Ingresos por Ventas</span>
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400 mb-1">
                ${fifoSummary.totalIngresosUsd.toFixed(2)} <span className="text-xs font-normal text-slate-400">USD</span>
              </div>
              <div className="text-xs text-slate-400">
                Monto facturado sin impuestos
              </div>
            </div>

            {/* 2. Costo Mercancía Vendida FIFO */}
            <div className={`p-5 rounded-2xl border transition-all ${
              isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Costo de Ventas (FIFO)</span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Package className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mb-1">
                ${fifoSummary.totalCostosFifoUsd.toFixed(2)} <span className="text-xs font-normal text-slate-400">USD</span>
              </div>
              <div className="text-xs text-slate-400">
                Costo histórico según compras FIFO
              </div>
            </div>

            {/* 3. Utilidad Bruta */}
            <div className={`p-5 rounded-2xl border transition-all ${
              isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Utilidad Bruta (Ganancia)</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mb-1">
                ${fifoSummary.totalUtilidadBrutaUsd.toFixed(2)} <span className="text-xs font-normal text-slate-400">USD</span>
              </div>
              <div className="text-xs text-slate-400">
                Ganancia neta (Ingresos - Costos)
              </div>
            </div>

            {/* 4. Margen de Rentabilidad Global */}
            <div className={`p-5 rounded-2xl border transition-all ${
              isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Margen de Rentabilidad</span>
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400 mb-1">
                {fifoSummary.margenGlobalPorcentaje}%
              </div>
              <div className="text-xs text-slate-400">
                Rentabilidad sobre ventas totales
              </div>
            </div>
          </div>

          {/* Sub-Tabs: Por Producto vs. Detalle por Venta */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className={`inline-flex items-center p-1 rounded-xl border ${
              isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                onClick={() => setRentabilidadSubTab('productos')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  rentabilidadSubTab === 'productos'
                    ? isDarkMode ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm'
                    : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                Rentabilidad por Producto
                <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {filteredProductsProfit.length}
                </span>
              </button>

              <button
                onClick={() => setRentabilidadSubTab('ventas')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  rentabilidadSubTab === 'ventas'
                    ? isDarkMode ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm'
                    : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                Detalle por Venta Individual
                <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {filteredFifoSalesDetails.length}
                </span>
              </button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por producto o venta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-9 pr-3.5 py-1.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>
          </div>

          {/* Sub-View A: Rentabilidad por Producto */}
          {rentabilidadSubTab === 'productos' && (
            <div className={`rounded-2xl border overflow-hidden transition-colors ${
              isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className={`text-xs uppercase tracking-wider border-b transition-colors ${
                    isDarkMode ? 'bg-slate-950/70 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}>
                    <tr>
                      <th className="py-3.5 px-5">Producto</th>
                      <th className="py-3.5 px-4 text-center">Unid. Vendidas</th>
                      <th className="py-3.5 px-5 text-right">Ingreso Venta (USD)</th>
                      <th className="py-3.5 px-5 text-right">Costo FIFO (USD)</th>
                      <th className="py-3.5 px-5 text-right">Utilidad Bruta</th>
                      <th className="py-3.5 px-5 text-center w-48">Margen %</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y transition-colors ${
                    isDarkMode ? 'divide-slate-800/60 text-slate-200' : 'divide-slate-100 text-slate-800'
                  }`}>
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-emerald-500 opacity-60" />
                          Calculando costos FIFO por producto...
                        </td>
                      </tr>
                    ) : filteredProductsProfit.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                          No se registraron ventas de productos en este período.
                        </td>
                      </tr>
                    ) : (
                      filteredProductsProfit.map((prod: any) => {
                        const isProfitable = prod.utilidad_bruta_usd >= 0;
                        const margin = prod.margen_porcentaje;

                        return (
                          <tr key={prod.producto_id} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                            <td className="py-3.5 px-5 font-semibold text-xs">
                              <span className="text-slate-900 dark:text-white block">{prod.producto_nombre}</span>
                              <span className="font-mono text-[10px] text-slate-400">ID #{prod.producto_id}</span>
                            </td>

                            <td className="py-3.5 px-4 text-center font-mono font-bold text-xs">
                              {prod.unidades_vendidas}
                            </td>

                            <td className="py-3.5 px-5 text-right font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                              ${prod.ingreso_total_usd.toFixed(2)}
                            </td>

                            <td className="py-3.5 px-5 text-right font-mono text-xs text-amber-600 dark:text-amber-400">
                              ${prod.costo_fifo_total_usd.toFixed(2)}
                            </td>

                            <td className={`py-3.5 px-5 text-right font-mono font-bold text-xs ${
                              isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            }`}>
                              ${prod.utilidad_bruta_usd.toFixed(2)}
                            </td>

                            <td className="py-3.5 px-5 text-center">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      margin >= 30
                                        ? 'bg-emerald-500'
                                        : margin >= 15
                                        ? 'bg-amber-500'
                                        : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${Math.min(100, Math.max(0, margin))}%` }}
                                  />
                                </div>
                                <span className={`font-mono font-bold text-xs shrink-0 ${
                                  margin >= 30
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : margin >= 15
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                }`}>
                                  {margin}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-View B: Detalle por Venta Individual */}
          {rentabilidadSubTab === 'ventas' && (
            <div className={`rounded-2xl border overflow-hidden transition-colors ${
              isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className={`text-xs uppercase tracking-wider border-b transition-colors ${
                    isDarkMode ? 'bg-slate-950/70 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}>
                    <tr>
                      <th className="py-3.5 px-4">Pedido</th>
                      <th className="py-3.5 px-4">Fecha y Hora</th>
                      <th className="py-3.5 px-4">Cliente</th>
                      <th className="py-3.5 px-4">Producto</th>
                      <th className="py-3.5 px-3 text-center">Cant.</th>
                      <th className="py-3.5 px-4 text-right">P. Venta</th>
                      <th className="py-3.5 px-4 text-right">Costo FIFO</th>
                      <th className="py-3.5 px-4 text-right">Ingreso USD</th>
                      <th className="py-3.5 px-4 text-right">Costo USD</th>
                      <th className="py-3.5 px-4 text-right">Ganancia</th>
                      <th className="py-3.5 px-4 text-center">Margen</th>
                      <th className="py-3.5 px-3 text-center">Lotes</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y transition-colors ${
                    isDarkMode ? 'divide-slate-800/60 text-slate-200' : 'divide-slate-100 text-slate-800'
                  }`}>
                    {loading ? (
                      <tr>
                        <td colSpan={12} className="py-12 text-center text-slate-400">
                          <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-emerald-500 opacity-60" />
                          Cargando detalle FIFO por venta...
                        </td>
                      </tr>
                    ) : filteredFifoSalesDetails.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="py-12 text-center text-slate-400">
                          <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
                          No se encontraron transacciones en este período.
                        </td>
                      </tr>
                    ) : (
                      filteredFifoSalesDetails.map((sale: any, idx: number) => {
                        const isProfitable = sale.utilidad_bruta_usd >= 0;
                        return (
                          <tr key={idx} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                            <td className="py-3 px-4 font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                              #{sale.pedido_id}
                            </td>
                            <td className="py-3 px-4 text-xs font-mono text-slate-400 whitespace-nowrap">
                              {new Date(sale.fecha_hora).toLocaleDateString('es-VE')} {new Date(sale.fecha_hora).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-3 px-4 text-xs font-medium truncate max-w-[140px]">
                              {sale.cliente_nombre}
                            </td>
                            <td className="py-3 px-4 text-xs font-semibold text-slate-900 dark:text-white truncate max-w-[180px]">
                              {sale.producto_nombre}
                            </td>
                            <td className="py-3 px-3 text-center font-mono font-bold text-xs">
                              {sale.cantidad}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-xs text-slate-600 dark:text-slate-300">
                              ${sale.precio_unitario_usd.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-xs text-amber-600 dark:text-amber-400">
                              ${sale.costo_unitario_ponderado_fifo.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                              ${sale.ingreso_usd.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-xs text-amber-600 dark:text-amber-400">
                              ${sale.costo_fifo_total_usd.toFixed(2)}
                            </td>
                            <td className={`py-3 px-4 text-right font-mono font-bold text-xs ${
                              isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            }`}>
                              ${sale.utilidad_bruta_usd.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full font-mono font-bold text-[11px] ${
                                sale.margen_porcentaje >= 30
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : sale.margen_porcentaje >= 15
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              }`}>
                                {sale.margen_porcentaje}%
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <button
                                onClick={() => setSelectedFifoItem(sale)}
                                title="Ver lotes de compra consumidos"
                                className={`p-1.5 rounded-lg transition ${
                                  isDarkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-600'
                                }`}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. REPORTE DE INVENTARIO Y VALORIZACIÓN                                   */}
      {/* ========================================================================= */}
      {activeTab === 'inventario' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Methodology Explanatory Banner */}
          <div className={`p-4 rounded-2xl border flex items-start gap-3.5 text-xs ${
            isDarkMode ? 'bg-blue-950/20 border-blue-900/40 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-950'
          }`}>
            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-sm block">
                Valorización de Existencias Físicas en Almacén
              </span>
              <p className="leading-relaxed opacity-90 text-[11px]">
                Este reporte calcula el valor monetario de tu inventario en tiempo real. 
                El <strong>Costo Total</strong> representa el capital invertido según el costo promedio ponderado de compra.
                El <strong>Valor de Venta</strong> y la <strong>Utilidad Potencial</strong> proyectan los ingresos y el margen bruto que se generarán al comercializar todas las existencias disponibles.
              </p>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* 1. Valor al Costo */}
            <div className={`p-5 rounded-2xl border transition-all ${
              isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Capital al Costo</span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Package className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mb-1">
                ${invSummary.valorTotalCostoUsd.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-slate-500 font-mono">
                Bs. {(invSummary.valorTotalCostoUsd * appliedRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Costo promedio de adquisición</p>
            </div>

            {/* 2. Valor a Precio de Venta */}
            <div className={`p-5 rounded-2xl border transition-all ${
              isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Valor a Venta</span>
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400 mb-1">
                ${invSummary.valorTotalVentaUsd.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-slate-500 font-mono">
                Bs. {(invSummary.valorTotalVentaUsd * appliedRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Proyección de venta total</p>
            </div>

            {/* 3. Utilidad Potencial Estimada */}
            <div className={`p-5 rounded-2xl border transition-all ${
              isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Ganancia Proyectada</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mb-1">
                +${invSummary.utilidadPotencialGlobalUsd.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs font-bold text-emerald-500">
                {invSummary.margenPotencialGlobalPct}% de margen
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Beneficio bruto proyectado</p>
            </div>

            {/* 4. Unidades Físicas Totales */}
            <div className={`p-5 rounded-2xl border transition-all ${
              isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Existencia Total</span>
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Boxes className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400 mb-1">
                {invSummary.totalUnidadesEnStock.toLocaleString('es-VE')}
              </div>
              <div className="text-xs text-slate-500">
                Unidades base en almacén
              </div>
              <p className="text-[10px] text-slate-400 mt-1">{invSummary.productosActivos} de {invSummary.totalProductos} productos activos</p>
            </div>

            {/* 5. Alertas de Reposición */}
            <div className={`p-5 rounded-2xl border transition-all ${
              isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Alertas de Stock</span>
                <div className={`p-2 rounded-xl ${
                  invSummary.productosAgotados > 0
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                }`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Agotados (0 stock):</span>
                  <span className={`font-mono font-bold ${invSummary.productosAgotados > 0 ? 'text-rose-500' : 'text-slate-500'}`}>
                    {invSummary.productosAgotados}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Stock Bajo (≤ 5):</span>
                  <span className={`font-mono font-bold ${invSummary.productosStockBajo > 0 ? 'text-amber-500' : 'text-slate-500'}`}>
                    {invSummary.productosStockBajo}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">Productos que requieren reposición</p>
            </div>
          </div>

          {/* Filters & Sorting Bar */}
          <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 transition-colors ${
            isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            {/* Filter pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filtrar:
              </span>
              {[
                { id: 'TODOS', label: 'Todos', count: invSummary.totalProductos },
                { id: 'CON_STOCK', label: 'Con Existencia', count: reportData?.inventario?.productos?.filter((p: any) => p.stock_actual > 0).length || 0 },
                { id: 'BAJO_STOCK', label: 'Stock Bajo (≤ 5)', count: invSummary.productosStockBajo },
                { id: 'AGOTADOS', label: 'Agotados (0)', count: invSummary.productosAgotados },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setInventoryFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    inventoryFilter === f.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isDarkMode
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{f.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    inventoryFilter === f.id ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search and Sort */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar producto por nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={inventorySort}
                  onChange={(e) => setInventorySort(e.target.value as any)}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none cursor-pointer ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="NOMBRE">Nombre A-Z</option>
                  <option value="STOCK_DESC">Mayor Existencia</option>
                  <option value="VALOR_COSTO_DESC">Mayor Capital al Costo</option>
                  <option value="VALOR_VENTA_DESC">Mayor Valor a Venta</option>
                  <option value="UTILIDAD_DESC">Mayor Ganancia Proyectada</option>
                </select>
              </div>
            </div>
          </div>

          {/* Inventory Table */}
          <div className={`rounded-2xl border overflow-hidden transition-all ${
            isDarkMode ? 'bg-slate-900/60 border-slate-800 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`border-b text-[11px] uppercase tracking-wider ${
                  isDarkMode ? 'bg-slate-950/80 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}>
                  <tr>
                    <th className="py-3.5 px-4">Producto</th>
                    <th className="py-3.5 px-3">Presentaciones</th>
                    <th className="py-3.5 px-4 text-center">Existencia Actual</th>
                    <th className="py-3.5 px-3 text-right">Costo Unit.</th>
                    <th className="py-3.5 px-3 text-right">Precio Venta</th>
                    <th className="py-3.5 px-4 text-right">Valor al Costo</th>
                    <th className="py-3.5 px-4 text-right">Valor a Venta</th>
                    <th className="py-3.5 px-4 text-right">Ganancia Est.</th>
                    <th className="py-3.5 px-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                        Cargando inventario valorizado...
                      </td>
                    </tr>
                  ) : filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        No se encontraron productos que coincidan con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredInventory.map((item: any) => {
                      const stockNum = Number(item.stock_actual);
                      const isAgotado = stockNum <= 0;
                      const isBajo = stockNum > 0 && stockNum <= 5;
                      const empaqueCompleto = formatStockDesgloseCompleto(item, stockNum);
                      const segmentaciones = getSegmentacionExistencias(item, stockNum);
                      const valorCostoLocal = item.valor_costo_usd * appliedRate;
                      const valorVentaLocal = item.valor_venta_usd * appliedRate;
                      const isExpanded = expandedProductIds.includes(item.id);
                      const hasPresentaciones = item.presentaciones && item.presentaciones.length > 0;

                      return (
                        <Fragment key={item.id}>
                          <tr className={`transition-colors hover:bg-slate-500/5 ${isExpanded ? 'bg-indigo-50/20 dark:bg-indigo-950/20' : ''}`}>
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-800 dark:text-slate-100">{item.nombre}</div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-mono text-[10px] text-slate-400">#{item.id}</span>
                                <span className="text-[10px] font-semibold text-slate-400">• {item.impuesto_nombre} ({item.impuesto_porcentaje}%)</span>
                              </div>
                              {hasPresentaciones && (
                                <button
                                  type="button"
                                  onClick={() => toggleExpandedProduct(item.id)}
                                  className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                                >
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  <span>{isExpanded ? 'Ocultar matriz' : `Ver segmentación (${item.presentaciones.length + 1} medidas)`}</span>
                                </button>
                              )}
                            </td>

                            <td className="py-3 px-3">
                              <div className="space-y-1">
                                <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono">
                                  Base: {item.unidad_base || 'Unidad'} (${Number(item.precio_usd).toFixed(2)})
                                </span>
                                {hasPresentaciones && (
                                  <div className="flex flex-wrap gap-1">
                                    {item.presentaciones.map((pr: any) => (
                                      <span key={pr.id} className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-mono flex items-center gap-1">
                                        <strong className="font-bold">{pr.nombre}</strong>
                                        <span className="opacity-70">x{pr.factor}</span>
                                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">(${Number(pr.precio_usd).toFixed(2)})</span>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex flex-col items-center max-w-[340px] mx-auto">
                                {/* Empaque combinado principal */}
                                <span className={`px-2.5 py-1 rounded-xl text-xs font-bold font-mono border text-center ${
                                  isAgotado
                                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                    : isBajo
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                }`}>
                                  {empaqueCompleto}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  Total: <strong className="text-slate-600 dark:text-slate-300">{stockNum}</strong> {item.unidad_base || 'unidades'}
                                </span>

                                {/* Desglose detallado de cada medida con su precio */}
                                {hasPresentaciones && stockNum > 0 && (
                                  <div className="mt-2 w-full bg-slate-50 dark:bg-slate-800/80 rounded-xl p-2.5 border border-slate-200/90 dark:border-slate-700/80 text-left font-mono shadow-sm">
                                    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-700/60">
                                      <span>Disponibilidad por Medida</span>
                                      <span className="text-emerald-600 dark:text-emerald-400">P. Venta</span>
                                    </div>
                                    <div className="space-y-1">
                                      {segmentaciones.map((s) => (
                                        <div key={s.id ?? 'base'} className="flex items-center justify-between gap-1.5 text-xs py-0.5 border-b border-slate-100 dark:border-slate-700/40 last:border-0">
                                          <div className="flex items-center gap-1 min-w-0">
                                            <span className="text-xs">📦</span>
                                            <span className="font-black text-slate-800 dark:text-slate-100">{s.unidades_completas}</span>
                                            <span className="text-slate-600 dark:text-slate-300 font-medium truncate">{s.nombre}</span>
                                            {s.resto_unidades > 0 && s.factor > 1 && (
                                              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400" title={`Sobran ${s.resto_unidades} unidades sueltas`}>
                                                (+{s.resto_unidades}u)
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-1 text-right flex-shrink-0">
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                              ${s.precio_usd.toFixed(2)}
                                            </span>
                                            {s.factor > 1 && (
                                              <span className="text-[9px] text-slate-400">
                                                (${s.precio_unitario_equivalente.toFixed(2)}/u)
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    <div className="mt-2 pt-1.5 border-t border-slate-200 dark:border-slate-700/70 flex items-center justify-between text-[10px]">
                                      <button
                                        type="button"
                                        onClick={() => toggleExpandedProduct(item.id)}
                                        className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                                      >
                                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                        <span>{isExpanded ? 'Cerrar análisis' : 'Análisis financiero'}</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setSelectedSegmentacionItem(item)}
                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                      >
                                        Ver modal
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                              ${item.costo_promedio_usd.toFixed(2)}
                            </td>

                            <td className="py-3 px-3 text-right">
                              <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                ${item.precio_usd.toFixed(2)} <span className="text-[10px] font-normal text-slate-400">/{item.unidad_base || 'un'}</span>
                              </div>
                              {hasPresentaciones && (
                                <div className="space-y-0.5 mt-1 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                  {item.presentaciones.map((pr: any) => {
                                    const equiv = Number(pr.factor) > 0 ? (Number(pr.precio_usd) / Number(pr.factor)).toFixed(2) : '0';
                                    return (
                                      <div key={pr.id} className="truncate">
                                        <span className="font-semibold text-indigo-500 dark:text-indigo-400">{pr.nombre}:</span> ${Number(pr.precio_usd).toFixed(2)}
                                        <span className="text-[9px] text-slate-400 ml-1">(${equiv}/u)</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="font-mono font-bold text-amber-600 dark:text-amber-400">
                                ${item.valor_costo_usd.toFixed(2)}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400">
                                Bs. {valorCostoLocal.toFixed(2)}
                              </div>
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="font-mono font-bold text-blue-600 dark:text-blue-400">
                                ${item.valor_venta_usd.toFixed(2)}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400">
                                Bs. {valorVentaLocal.toFixed(2)}
                              </div>
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                +${item.utilidad_potencial_usd.toFixed(2)}
                              </div>
                              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                                {item.margen_potencial_porcentaje}%
                              </span>
                            </td>

                            <td className="py-3 px-3 text-center">
                              {isAgotado ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                  <AlertTriangle className="w-3 h-3" /> Agotado
                                </span>
                              ) : isBajo ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  <AlertTriangle className="w-3 h-3" /> Stock Bajo
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  <CheckCircle2 className="w-3 h-3" /> Óptimo
                                </span>
                              )}
                            </td>
                          </tr>

                          {/* Fila expandible con la matriz de segmentación completa */}
                          {isExpanded && (
                            <tr className="bg-slate-50/90 dark:bg-slate-900/60 border-b-2 border-indigo-500/30">
                              <td colSpan={9} className="p-4 sm:p-6">
                                <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-md space-y-4">
                                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center gap-3">
                                      <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                        <Boxes className="w-5 h-5" />
                                      </div>
                                      <div>
                                        <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
                                          Matriz Financiera de Medidas & Precios — {item.nombre}
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                          Stock físico total: <strong className="text-slate-700 dark:text-slate-200">{stockNum} {item.unidad_base || 'unidades'}</strong> • Costo promedio: <strong className="text-amber-600 dark:text-amber-400 font-mono">${item.costo_promedio_usd.toFixed(2)}</strong> (Valor costo total: ${item.valor_costo_usd.toFixed(2)} / Bs. {(item.valor_costo_usd * appliedRate).toFixed(2)})
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="px-3 py-1 rounded-xl text-xs font-bold font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                        Empaque Óptimo: {empaqueCompleto}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs font-mono">
                                      <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                                        <tr>
                                          <th className="py-2.5 px-3">Presentación / Medida</th>
                                          <th className="py-2.5 px-3 text-center">Factor</th>
                                          <th className="py-2.5 px-3 text-center">Stock Disponible</th>
                                          <th className="py-2.5 px-3 text-right">Precio Venta (USD)</th>
                                          <th className="py-2.5 px-3 text-right">Precio Venta (Bs.)</th>
                                          <th className="py-2.5 px-3 text-right">Equiv. / Unidad</th>
                                          <th className="py-2.5 px-3 text-right">Valor Venta Potencial (USD)</th>
                                          <th className="py-2.5 px-3 text-right">Ganancia Est. (USD)</th>
                                          <th className="py-2.5 px-3 text-center">Margen %</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                        {segmentaciones.map((seg) => {
                                          const precioBs = seg.precio_usd * appliedRate;
                                          const ganancia = seg.valor_potencial_usd - item.valor_costo_usd;
                                          const margenPct = seg.valor_potencial_usd > 0
                                            ? ((ganancia / seg.valor_potencial_usd) * 100).toFixed(2)
                                            : '0.00';
                                          const isBase = seg.id === null;

                                          return (
                                            <tr key={seg.id ?? 'base'} className={`hover:bg-slate-500/5 ${isBase ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''}`}>
                                              <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                                <span className="text-sm">📦</span>
                                                <span>{seg.nombre}</span>
                                                {isBase && (
                                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-bold uppercase">
                                                    Base
                                                  </span>
                                                )}
                                              </td>
                                              <td className="py-3 px-3 text-center text-slate-500">
                                                {seg.factor} {item.unidad_base || 'un'}
                                              </td>
                                              <td className="py-3 px-3 text-center">
                                                <span className="font-bold text-slate-800 dark:text-slate-100">
                                                  {seg.unidades_completas} {seg.nombre}s
                                                </span>
                                                {seg.resto_unidades > 0 && seg.factor > 1 && (
                                                  <span className="block text-[10px] text-amber-600 dark:text-amber-400">
                                                    + {seg.resto_unidades} {item.unidad_base || 'unidades'} sueltas
                                                  </span>
                                                )}
                                              </td>
                                              <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                                ${seg.precio_usd.toFixed(2)}
                                              </td>
                                              <td className="py-3 px-3 text-right text-slate-500">
                                                Bs. {precioBs.toFixed(2)}
                                              </td>
                                              <td className="py-3 px-3 text-right">
                                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                  ${seg.precio_unitario_equivalente.toFixed(2)}
                                                </span>
                                                {seg.factor > 1 && (
                                                  <span className="block text-[10px] text-slate-400">
                                                    {((1 - (seg.precio_unitario_equivalente / (Number(item.precio_usd) || 1))) * 100).toFixed(0)}% desc.
                                                  </span>
                                                )}
                                              </td>
                                              <td className="py-3 px-3 text-right font-bold text-blue-600 dark:text-blue-400">
                                                ${seg.valor_potencial_usd.toFixed(2)}
                                                <span className="block text-[10px] text-slate-400 font-normal">
                                                  Bs. {(seg.valor_potencial_usd * appliedRate).toFixed(2)}
                                                </span>
                                              </td>
                                              <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                                +${ganancia.toFixed(2)}
                                              </td>
                                              <td className="py-3 px-3 text-center font-bold text-purple-600 dark:text-purple-400">
                                                {margenPct}%
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Desglose de Lotes FIFO Consumidos */}
      {selectedFifoItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className={`border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden transition-colors ${
            isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`px-6 py-4 border-b flex justify-between items-center ${
              isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50'
            }`}>
              <div>
                <h3 className="font-bold text-base text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Desglose FIFO de Venta #{selectedFifoItem.pedido_id}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedFifoItem.producto_nombre} — {selectedFifoItem.cantidad} unidades vendidas
                </p>
              </div>
              <button
                onClick={() => setSelectedFifoItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
                <div>
                  <span className="text-slate-400 block">Precio Venta Unitario:</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    ${selectedFifoItem.precio_unitario_usd.toFixed(2)} USD
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Costo Ponderado FIFO:</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                    ${selectedFifoItem.costo_unitario_ponderado_fifo.toFixed(2)} USD
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Utilidad Bruta:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    +${selectedFifoItem.utilidad_bruta_usd.toFixed(2)} USD
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Margen de Ganancia:</span>
                  <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                    {selectedFifoItem.margen_porcentaje}%
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Lotes de Compra Consumidos (FIFO):
                </h4>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase">
                      <tr>
                        <th className="py-2 px-3">Lote / Factura</th>
                        <th className="py-2 px-3 text-center">Unidades</th>
                        <th className="py-2 px-3 text-right">Costo Lote</th>
                        <th className="py-2 px-3 text-right">Subtotal Costo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                      {selectedFifoItem.lotes_consumidos?.map((lote: any, i: number) => (
                        <tr key={i}>
                          <td className="py-2 px-3 font-medium">
                            {lote.es_costo_base ? (
                              <span className="text-slate-400 italic">Costo Base / Inventario Inicial</span>
                            ) : (
                              <span>Factura #{lote.numero_factura} (Compra #{lote.compra_id})</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-bold">
                            {lote.cantidad_consumida} un.
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-amber-600 dark:text-amber-400">
                            ${Number(lote.costo_unitario_usd).toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                            ${(lote.cantidad_consumida * lote.costo_unitario_usd).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className={`px-6 py-3 border-t flex justify-end ${
              isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50'
            }`}>
              <button
                onClick={() => setSelectedFifoItem(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Desglose de Segmentación de Medidas y Precios de Venta */}
      {selectedSegmentacionItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className={`border rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden transition-colors ${
            isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`px-6 py-4 border-b flex justify-between items-center ${
              isDarkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-slate-50'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                    Segmentación de Medidas & Precios — {selectedSegmentacionItem.nombre}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Stock Total: {selectedSegmentacionItem.stock_actual} {selectedSegmentacionItem.unidad_base || 'unidades'} • Costo ref: ${Number(selectedSegmentacionItem.costo_promedio_usd).toFixed(2)} USD
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSegmentacionItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-base p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Empaque Óptimo Combinado */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs ${
                isDarkMode ? 'bg-indigo-950/20 border-indigo-900/40' : 'bg-indigo-50 border-indigo-200'
              }`}>
                <div>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 block text-xs uppercase tracking-wider">
                    📦 Empaque Combinado Óptimo en Almacén
                  </span>
                  <p className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                    {formatStockDesgloseCompleto(selectedSegmentacionItem, selectedSegmentacionItem.stock_actual)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Base</span>
                  <p className="font-mono font-bold text-sm text-indigo-500">{selectedSegmentacionItem.stock_actual} {selectedSegmentacionItem.unidad_base || 'unidades'}</p>
                </div>
              </div>

              {/* Tabla de Equivalencias y Precios de Venta */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className={`text-[11px] uppercase tracking-wider border-b ${
                    isDarkMode ? 'bg-slate-950/80 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    <tr>
                      <th className="py-2.5 px-3">Presentación / Medida</th>
                      <th className="py-2.5 px-3 text-center">Contenido</th>
                      <th className="py-2.5 px-3 text-center">Disponible</th>
                      <th className="py-2.5 px-3 text-right">Precio Venta</th>
                      <th className="py-2.5 px-3 text-right">Equiv. / Unidad</th>
                      <th className="py-2.5 px-3 text-right">Valor Total Estimado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                    {getSegmentacionExistencias(selectedSegmentacionItem, selectedSegmentacionItem.stock_actual).map((seg) => (
                      <tr key={seg.id ?? 'base'} className="hover:bg-slate-500/5 transition">
                        <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          {seg.nombre} {seg.id === null ? '(Unidad Base)' : ''}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          {seg.factor} {selectedSegmentacionItem.unidad_base || 'un.'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                            {seg.unidades_completas}
                          </span>{' '}
                          <span className="text-[11px] text-slate-400">{seg.nombre}s</span>
                          {seg.resto_unidades > 0 && seg.factor > 1 && (
                            <span className="block text-[10px] text-slate-400 font-mono">
                              (+{seg.resto_unidades} {selectedSegmentacionItem.unidad_base || 'un'} sueltas)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          ${seg.precio_usd.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                          ${seg.precio_unitario_equivalente.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                          ${seg.valor_potencial_usd.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={`px-6 py-3 border-t flex justify-end ${
              isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50'
            }`}>
              <button
                onClick={() => setSelectedSegmentacionItem(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
