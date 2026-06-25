import React, { ChangeEvent } from 'react';

interface SalaryInputProps {
  id: string;
  label: string;
  value: number;
  onChange: (newValue: number) => void;
  max?: number;
  step?: number;
}

export default function SalaryInput({
  id,
  label,
  value,
  onChange,
  max = 10000000, // 10 Million default
  step = 50000
}: SalaryInputProps) {
  
  // Format numeric value to display string with spaces, e.g. 1 500 000
  const formatNumber = (num: number): string => {
    if (num === 0) return '';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  // Convert display string back to raw number
  const parseNumber = (str: string): number => {
    const cleanStr = str.replace(/\s/g, '');
    const num = parseInt(cleanStr, 10);
    return isNaN(num) ? 0 : num;
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const rawValue = parseNumber(e.target.value);
    // Limit to safety max (100,000,000 Ar)
    const cappedValue = Math.min(rawValue, 100000000);
    onChange(cappedValue);
  };

  const handleSliderChange = (e: ChangeEvent<HTMLInputElement>) => {
    const sliderVal = Number(e.target.value);
    onChange(sliderVal);
  };

  return (
    <div id={`${id}-wrapper`} className="w-full flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="text-xs uppercase tracking-wider text-[var(--color-text-secondary)] font-display font-semibold"
        >
          {label}
        </label>
        <span className="text-xs font-mono text-[var(--color-text-muted)]">
          Ariary de Madagascar
        </span>
      </div>

      {/* Input container */}
      <div className="relative flex items-center">
        <input
          type="text"
          id={id}
          value={formatNumber(value)}
          onChange={handleInputChange}
          placeholder="Ex: 1 500 000"
          className="w-full h-14 px-4 pr-16 bg-white/5 dark:bg-white/5 border border-white/10 focus:border-[#7C3AED]/50 focus:ring-2 focus:ring-[#7C3AED]/20 focus:outline-none rounded-xl text-2xl font-bold font-mono text-[var(--color-text-primary)] transition-all"
        />
        <div className="absolute right-4 text-sm font-bold font-display uppercase text-[var(--color-text-secondary)]/60 pointer-events-none px-2 py-1 rounded">
          Ar
        </div>
      </div>

      {/* Synced Slider */}
      <div className="flex items-center gap-3 mt-1">
        <span className="text-[10px] font-mono text-[var(--color-text-muted)]">0</span>
        <input
          type="range"
          min="0"
          max={max}
          step={step}
          value={Math.min(value, max)}
          onChange={handleSliderChange}
          className="w-full h-1.5 rounded-lg bg-[var(--color-bg-input)] appearance-none cursor-pointer accent-[#7C3AED] transition-all"
        />
        <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
          {formatNumber(max)}
        </span>
      </div>
    </div>
  );
}
