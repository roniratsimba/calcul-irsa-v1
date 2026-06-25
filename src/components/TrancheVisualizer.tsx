import React from 'react';
import { motion } from 'motion/react';
import { TrancheDetailResult } from '../types';

interface TrancheVisualizerProps {
  id: string;
  baseImposable: number;
  detailTranches: TrancheDetailResult[];
}

export default function TrancheVisualizer({ id, baseImposable, detailTranches }: TrancheVisualizerProps) {
  // Hardcoded bracket configurations for standard 2026 barème to ensure visual elegance
  const bracketStyles = [
    { bg: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30', label: '0%', colorName: 'Gris (Exonéré)' },
    { bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: '5%', colorName: 'Vert' },
    { bg: 'bg-sky-500/20 text-sky-400 border-sky-500/30', label: '10%', colorName: 'Bleu' },
    { bg: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30', label: '15%', colorName: 'Indigo' },
    { bg: 'bg-purple-500/20 text-purple-400 border-purple-500/30', label: '20%', colorName: 'Violet' },
    { bg: 'bg-rose-500/20 text-rose-400 border-rose-500/30', label: '25%', colorName: 'Rose/Rouge' }
  ];

  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  return (
    <div id={id} className="w-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-display font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
          Ventilation Progressive par Tranches (Base: {formatNumber(baseImposable)} Ar)
        </h3>
        <span className="text-xs text-[var(--color-text-muted)] font-mono">
          Barème DGI 2026
        </span>
      </div>

      {/* Visual horizontal segmented progress bar */}
      <div className="w-full flex gap-1.5 items-center h-4 my-2">
        {detailTranches.map((tranche, idx) => {
          // Calculate proportional fill width or fixed layout for readability
          // To ensure tiny ranges (like 350k-400k) are visible, we give each tranche equal baseline weight
          const style = bracketStyles[idx] || bracketStyles[bracketStyles.length - 1];
          const isCurrent = baseImposable > tranche.min && (tranche.max === null || baseImposable <= tranche.max);
          const isTaxed = tranche.imposable > 0;
          
          let bgClass = 'bg-white/10 dark:bg-white/5';
          if (isCurrent) {
            bgClass = 'bg-[#7C3AED]';
          } else if (isTaxed) {
            bgClass = style.bg.split(' ')[0];
          }

          return (
            <div
              key={idx}
              className={`flex-1 tranche-bar ${bgClass} ${isCurrent ? 'active-tranche scale-y-125' : 'opacity-80 hover:opacity-100'} cursor-help relative group`}
            >
              {/* Tooltip on hover */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#14141F] border border-[var(--color-border-subtle)] text-xs text-white p-3 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 w-52 pointer-events-none">
                <div className="font-semibold text-[var(--color-accent-violet)] mb-1">
                  Tranche {tranche.label}
                </div>
                <div className="text-[10px] text-gray-400 mb-1 leading-snug">
                  Intervalle : {formatNumber(tranche.min)} à {tranche.max ? formatNumber(tranche.max) : '∞'} Ar
                </div>
                <div className="border-t border-zinc-800/80 my-1"></div>
                <div className="flex justify-between mt-1 text-[11px]">
                  <span>Base imposable :</span>
                  <span className="font-mono text-gray-200 font-medium">{formatNumber(tranche.imposable)} Ar</span>
                </div>
                <div className="flex justify-between text-[11px] font-semibold text-emerald-400">
                  <span>Impôt calculé :</span>
                  <span className="font-mono">{formatNumber(tranche.impot)} Ar</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid of details for each tranche */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {detailTranches.map((tranche, idx) => {
          const style = bracketStyles[idx] || bracketStyles[bracketStyles.length - 1];
          const isCurrent = baseImposable > tranche.min && (tranche.max === null || baseImposable <= tranche.max);
          const isTaxed = tranche.imposable > 0;

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`p-3 rounded-xl border flex flex-col justify-between transition-all duration-300 ${
                isCurrent 
                  ? 'border-[#7C3AED] bg-[#7C3AED]/10 shadow-[0_0_15px_rgba(124,58,237,0.15)]' 
                  : isTaxed
                  ? 'border-[var(--color-border-subtle)] bg-[var(--color-bg-card)]'
                  : 'border-zinc-800/40 bg-zinc-950/20 opacity-50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${isCurrent ? 'text-[#C084FC]' : 'text-[var(--color-text-muted)]'}`}>
                    Tranche {idx + 1}
                  </span>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full font-mono ${style.bg}`}>
                    {tranche.label}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--color-text-secondary)] font-mono font-medium leading-tight">
                  {formatNumber(tranche.min)} Ar {tranche.max ? `à ${formatNumber(tranche.max)} Ar` : '+'}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-zinc-800/40">
                <div className="flex justify-between text-[10px] text-[var(--color-text-muted)]">
                  <span>Base :</span>
                  <span className="font-mono">{formatNumber(tranche.imposable)} Ar</span>
                </div>
                <div className="flex justify-between text-[10px] font-semibold text-emerald-400 mt-0.5">
                  <span>Impôt :</span>
                  <span className="font-mono">{formatNumber(tranche.impot)} Ar</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
