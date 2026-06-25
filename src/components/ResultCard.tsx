import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import * as Lucide from 'lucide-react';

interface ResultCardProps {
  id: string;
  label: string;
  value: number;
  suffix?: string;
  icon: keyof typeof Lucide;
  type?: 'irsa' | 'success' | 'neutral' | 'info';
  description?: string;
}

export default function ResultCard({
  id,
  label,
  value,
  suffix = ' Ar',
  icon,
  type = 'neutral',
  description
}: ResultCardProps) {
  const IconComponent = Lucide[icon] as React.ComponentType<{ className?: string }>;

  // Animation for count-up
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = Math.round(value);
    if (start === end) {
      setDisplayValue(end);
      return;
    }

    const duration = 800; // ms
    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      
      const currentVal = Math.round(start + (end - start) * ease);
      setDisplayValue(currentVal);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(end);
      }
    }

    requestAnimationFrame(animate);
  }, [value]);

  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const getBorderColor = () => {
    switch (type) {
      case 'irsa':
        return 'border-l-4 border-l-[#7C3AED] shadow-[0_4px_20px_rgba(124,58,237,0.06)] dark:shadow-[0_4px_24px_rgba(124,58,237,0.12)]';
      case 'success':
        return 'border-l-4 border-l-[#10B981] shadow-[0_4px_20px_rgba(16,185,129,0.06)] dark:shadow-[0_4px_24px_rgba(16,185,129,0.12)]';
      case 'info':
        return 'border-l-4 border-l-[#6366F1] shadow-[0_4px_20px_rgba(99,102,241,0.06)] dark:shadow-[0_4px_24px_rgba(99,102,241,0.12)]';
      default:
        return 'border-l-4 border-l-gray-400 dark:border-l-zinc-700';
    }
  };

  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`glass-panel p-5 relative overflow-hidden flex flex-col justify-between h-full min-h-[120px] ${getBorderColor()}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-display font-semibold">
            {label}
          </span>
          {description && (
            <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 leading-snug">
              {description}
            </p>
          )}
        </div>
        <div className="p-2 rounded-lg bg-[var(--color-bg-input)] text-[var(--color-accent-violet)]">
          {IconComponent && <IconComponent className="w-5 h-5" />}
        </div>
      </div>
      
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-2xl md:text-3xl font-bold font-mono tracking-tight text-[var(--color-text-primary)]">
          {formatNumber(displayValue)}
        </span>
        <span className="text-sm font-medium text-[var(--color-text-secondary)]">
          {suffix}
        </span>
      </div>
    </motion.div>
  );
}
