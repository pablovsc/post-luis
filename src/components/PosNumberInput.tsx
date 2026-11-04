'use client';

import React, { useState, useEffect, useRef } from 'react';

/**
 * Formatea un valor numérico a moneda / número en formato POS en español (VE / ES)
 * Ej: 35700.2 -> "35.700,20" (con 2 decimales) o 4 decimales según precision
 */
export function formatPosValue(
  value: number | string | undefined | null,
  decimals: number = 2
): string {
  const num = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
  if (isNaN(num)) {
    return (0).toLocaleString('es-VE', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
  return num.toLocaleString('es-VE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export interface PosNumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number | string;
  onChange: (value: number) => void;
  decimals?: number; // Por defecto 2 (centavos), o 4 para tasas
  min?: number;
  max?: number;
  placeholder?: string;
  className?: string;
}

/**
 * Componente de entrada numérica estilo Punto de Venta (POS):
 * - Comienza en 0,00
 * - Cada dígito ingresado desplaza los números hacia la izquierda (multiplica por 10 y suma el nuevo dígito en los centavos).
 * - Backspace / Borrar desplaza los números hacia la derecha (divide entre 10).
 */
export default function PosNumberInput({
  value,
  onChange,
  decimals = 2,
  min = 0,
  max,
  className = '',
  placeholder,
  disabled,
  readOnly,
  ...rest
}: PosNumberInputProps) {
  // Mantener los dígitos brutos (entero en centavos)
  const factor = Math.pow(10, decimals);

  const getCentsFromValue = (v: number | string): number => {
    const num = typeof v === 'number' ? v : parseFloat(String(v || 0));
    if (isNaN(num)) return 0;
    return Math.round(Math.abs(num) * factor);
  };

  const [digits, setDigits] = useState<number>(() => getCentsFromValue(value));
  const isInternalChange = useRef(false);

  // Sincronizar si cambia el valor externamente
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    setDigits(getCentsFromValue(value));
  }, [value, decimals]);

  const displayString = (digits / factor).toLocaleString('es-VE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled || readOnly) return;

    // Permitir teclas de navegación habituales
    if (['Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(e.key)) {
      return;
    }

    // Manejo de Backspace o Delete: desplazar a la derecha (eliminar último dígito)
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      const nextDigits = Math.floor(digits / 10);
      setDigits(nextDigits);
      const nextVal = nextDigits / factor;
      isInternalChange.current = true;
      onChange(nextVal);
      return;
    }

    // Tecla 'Escape' o selección completa para limpiar
    if (e.ctrlKey || e.metaKey) {
      return;
    }

    // Si es un número (0 al 9)
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      const digitNum = parseInt(e.key, 10);
      const nextDigits = digits * 10 + digitNum;
      const nextVal = nextDigits / factor;

      if (max !== undefined && nextVal > max) {
        return;
      }

      setDigits(nextDigits);
      isInternalChange.current = true;
      onChange(nextVal);
      return;
    }

    // Bloquear cualquier otra tecla (letras, comas, puntos directos ya que se maneja por desplazamiento)
    e.preventDefault();
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayString}
      onKeyDown={handleKeyDown}
      onChange={() => {}} // Manejado por onKeyDown para garantizar precisión de desplazamiento
      disabled={disabled}
      readOnly={readOnly}
      className={className}
      placeholder={placeholder || displayString}
      {...rest}
    />
  );
}

