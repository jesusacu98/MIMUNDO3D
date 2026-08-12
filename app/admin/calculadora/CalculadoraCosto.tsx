'use client';

import { useState } from 'react';

const inputClass =
  'w-full mt-2 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all';
const labelClass = 'text-xs font-bold text-zinc-800 uppercase tracking-wider';

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

function NumberField({
  id,
  label,
  hint,
  value,
  onChange,
  step = 'any',
}: {
  id: string;
  label: string;
  hint?: string;
  value: number;
  onChange: (value: number) => void;
  step?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        step={step}
        min="0"
        value={Number.isFinite(value) ? value : ''}
        onChange={(e) => onChange(e.target.valueAsNumber)}
        className={inputClass}
      />
      {hint && <p className="text-xs text-zinc-500 mt-1.5">{hint}</p>}
    </div>
  );
}

function ResultRow({ label, value, emphasis }: { label: string; value: number; emphasis?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${emphasis ? '' : 'text-zinc-600'}`}>
      <span className={emphasis ? 'font-bold text-zinc-900' : 'text-sm'}>{label}</span>
      <span className={emphasis ? 'text-xl font-extrabold text-primary' : 'text-sm font-medium text-zinc-900'}>
        {currency.format(Number.isFinite(value) ? value : 0)}
      </span>
    </div>
  );
}

export default function CalculadoraCosto() {
  const [filamentPricePerKg, setFilamentPricePerKg] = useState(300);
  const [gramsUsed, setGramsUsed] = useState(0);
  const [printerWattageKw, setPrinterWattageKw] = useState(0.1);
  const [electricityCostPerKwh, setElectricityCostPerKwh] = useState(2);
  const [printHours, setPrintHours] = useState(0);
  const [profitMargin, setProfitMargin] = useState(2);

  const filamentCost = (filamentPricePerKg * gramsUsed) / 1000;
  const hourlyElectricityCost = printerWattageKw * electricityCostPerKwh;
  const energyCost = hourlyElectricityCost * printHours;
  const totalCost = filamentCost + energyCost;
  const salePrice = totalCost * profitMargin;
  const profit = salePrice - totalCost;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <div className="bg-white border border-zinc-200/60 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NumberField
            id="filamentPricePerKg"
            label="Precio filamento (por kg)"
            value={filamentPricePerKg}
            onChange={setFilamentPricePerKg}
          />
          <NumberField id="gramsUsed" label="Gramos usados" value={gramsUsed} onChange={setGramsUsed} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-100">
          <NumberField
            id="printerWattageKw"
            label="Consumo impresora (kW/h)"
            value={printerWattageKw}
            onChange={setPrinterWattageKw}
          />
          <NumberField
            id="electricityCostPerKwh"
            label="Costo kW/h"
            value={electricityCostPerKwh}
            onChange={setElectricityCostPerKwh}
          />
        </div>

        <div className="pt-2 border-t border-zinc-100">
          <NumberField
            id="printHours"
            label="Horas de impresión"
            hint="En horas decimales (ej. 1 hora 30 min = 1.5)."
            value={printHours}
            onChange={setPrintHours}
          />
        </div>

        <div className="pt-2 border-t border-zinc-100">
          <NumberField
            id="profitMargin"
            label="Margen de ganancia (multiplicador)"
            hint="Ej. 2 = el precio de venta es el doble del costo."
            value={profitMargin}
            onChange={setProfitMargin}
          />
        </div>
      </div>

      <div className="bg-white border border-zinc-200/60 rounded-2xl p-6 sm:p-8 space-y-4">
        <ResultRow label="Costo filamento" value={filamentCost} />
        <ResultRow label="Costo energético" value={energyCost} />
        <div className="border-t border-zinc-100 pt-4">
          <ResultRow label="Costo total de impresión" value={totalCost} />
        </div>
        <div className="border-t border-zinc-100 pt-4 space-y-3">
          <ResultRow label="Precio de venta sugerido" value={salePrice} emphasis />
          <ResultRow label="Ganancia" value={profit} />
        </div>
      </div>
    </div>
  );
}
