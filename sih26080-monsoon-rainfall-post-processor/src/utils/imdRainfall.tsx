import React from 'react';

export interface IMDRainfallCategory {
  code: 'DRY' | 'VERY_LIGHT' | 'LIGHT' | 'MODERATE' | 'HEAVY' | 'VERY_HEAVY' | 'EXTREMELY_HEAVY';
  label: string;
  shortLabel: string;
  rangeText: string;
  badgeBg: string;
  textColor: string;
  borderColor: string;
  dotColor: string;
  description: string;
}

export function getIMDRainfallCategory(rainfallMm: number): IMDRainfallCategory {
  const mm = Math.max(0, Number(rainfallMm) || 0);

  if (mm < 0.1) {
    return {
      code: 'DRY',
      label: 'No Rain / Dry',
      shortLabel: 'Dry',
      rangeText: '0.0 mm',
      badgeBg: 'bg-slate-800/60',
      textColor: 'text-slate-300',
      borderColor: 'border-slate-700/60',
      dotColor: 'bg-slate-500',
      description: 'Trace or non-precipitating atmosphere.'
    };
  }

  if (mm <= 2.4) {
    return {
      code: 'VERY_LIGHT',
      label: 'Very Light Rain',
      shortLabel: 'Very Light',
      rangeText: '0.1 – 2.4 mm',
      badgeBg: 'bg-emerald-950/40',
      textColor: 'text-emerald-300',
      borderColor: 'border-emerald-700/50',
      dotColor: 'bg-emerald-400',
      description: 'Scattered drizzle or light misty precipitation.'
    };
  }

  if (mm <= 15.5) {
    return {
      code: 'LIGHT',
      label: 'Light Rain',
      shortLabel: 'Light',
      rangeText: '2.5 – 15.5 mm',
      badgeBg: 'bg-emerald-900/50',
      textColor: 'text-emerald-200',
      borderColor: 'border-emerald-500/60',
      dotColor: 'bg-emerald-400',
      description: 'Gentle, steady monsoon rain.'
    };
  }

  if (mm <= 64.4) {
    return {
      code: 'MODERATE',
      label: 'Moderate Rain',
      shortLabel: 'Moderate',
      rangeText: '15.6 – 64.4 mm',
      badgeBg: 'bg-sky-950/60',
      textColor: 'text-sky-200',
      borderColor: 'border-sky-500/60',
      dotColor: 'bg-sky-400',
      description: 'Sustained monsoon showers with localized puddling.'
    };
  }

  if (mm <= 115.5) {
    return {
      code: 'HEAVY',
      label: 'Heavy Rain',
      shortLabel: 'Heavy',
      rangeText: '64.5 – 115.5 mm',
      badgeBg: 'bg-amber-950/60',
      textColor: 'text-amber-200',
      borderColor: 'border-amber-500/60',
      dotColor: 'bg-amber-400 animate-pulse',
      description: 'Intense downpour, risk of urban waterlogging.'
    };
  }

  if (mm <= 204.4) {
    return {
      code: 'VERY_HEAVY',
      label: 'Very Heavy Rain',
      shortLabel: 'Very Heavy',
      rangeText: '115.6 – 204.4 mm',
      badgeBg: 'bg-orange-950/70',
      textColor: 'text-orange-200',
      borderColor: 'border-orange-500/70',
      dotColor: 'bg-orange-400 animate-ping',
      description: 'Severe deep convective event, flood warnings active.'
    };
  }

  return {
    code: 'EXTREMELY_HEAVY',
    label: 'Extremely Heavy Rain (Cloudburst)',
    shortLabel: 'Extremely Heavy',
    rangeText: '≥ 204.5 mm',
    badgeBg: 'bg-rose-950/80',
    textColor: 'text-rose-100',
    borderColor: 'border-rose-500/80',
    dotColor: 'bg-rose-400 animate-ping',
    description: 'Catastrophic deluge risk, severe orographic cloudburst.'
  };
}

interface IMDRainfallBadgeProps {
  rainfallMm: number;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const IMDRainfallBadge: React.FC<IMDRainfallBadgeProps> = ({
  rainfallMm,
  showValue = true,
  size = 'md',
  className = ''
}) => {
  const cat = getIMDRainfallCategory(rainfallMm);

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2'
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border shadow-xs transition-all ${cat.badgeBg} ${cat.textColor} ${cat.borderColor} ${sizeClasses} ${className}`}
      title={`${cat.label} (${cat.rangeText}): ${cat.description}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cat.dotColor}`} />
      {showValue && (
        <span className="font-mono font-bold">
          {Number(rainfallMm).toFixed(1)} mm
        </span>
      )}
      <span className="opacity-90 font-semibold tracking-wide">
        {cat.shortLabel}
      </span>
    </span>
  );
};
