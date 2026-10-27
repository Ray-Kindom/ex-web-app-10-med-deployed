import React from 'react';
import { useApp } from '../../context/AppContext';

interface TradeBadgeProps {
  trade: string;
  size?: 'sm' | 'md';
  showDescription?: boolean;
}

export const TRADE_INFO: Record<string, { label: string; full: string; color: string; desc: string }> = {
  TA: {
    label: 'TA',
    full: 'Technical Assistant',
    color: 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40',
    desc: 'Fire Direction, Artillery Computing & Survey',
  },
  OCU: {
    label: 'OCU',
    full: 'Operational Control Unit',
    color: 'bg-indigo-950/60 text-indigo-300 border-indigo-500/40',
    desc: 'Gun Command Post & Battery Fire Control',
  },
  DMT: {
    label: 'DMT',
    full: 'Driver Mechanical Transport',
    color: 'bg-amber-950/60 text-amber-300 border-amber-500/40',
    desc: 'Artillery Gun Towing Vehicle & Heavy Transport',
  },
  Gnr: {
    label: 'Gnr',
    full: 'Gunner Specialist',
    color: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40',
    desc: 'Gun Detachment, Layer & Breech Operation',
  },
  'Ck(U)': {
    label: 'Ck(U)',
    full: 'Cook (Unit)',
    color: 'bg-rose-950/60 text-rose-300 border-rose-500/40',
    desc: 'Regimental Ration & Battery Cookhouse',
  },
  Tech: {
    label: 'Tech',
    full: 'Technical Specialist',
    color: 'bg-purple-950/60 text-purple-300 border-purple-500/40',
    desc: 'Artillery Equipment & Instrument Maintenance',
  },
  GD: {
    label: 'GD',
    full: 'General Duty',
    color: 'bg-slate-800 text-slate-300 border-slate-700',
    desc: 'Regimental Security, Duty & Operational Support',
  },
};

const CATEGORY_COLORS_DARK: Record<string, string> = {
  COMBAT: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40',
  TECHNICAL: 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40',
  SERVICES: 'bg-rose-950/60 text-rose-300 border-rose-500/40',
  SUPPORT: 'bg-indigo-950/60 text-indigo-300 border-indigo-500/40',
  CIVILIAN: 'bg-amber-950/60 text-amber-300 border-amber-500/40',
  OTHER: 'bg-slate-800 text-slate-300 border-slate-700',
};

const CATEGORY_COLORS_LIGHT: Record<string, string> = {
  COMBAT: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  TECHNICAL: 'bg-cyan-100 text-cyan-900 border-cyan-300',
  SERVICES: 'bg-rose-100 text-rose-900 border-rose-300',
  SUPPORT: 'bg-indigo-100 text-indigo-900 border-indigo-300',
  CIVILIAN: 'bg-amber-100 text-amber-900 border-amber-300',
  OTHER: 'bg-slate-100 text-slate-800 border-slate-300',
};

const TRADE_INFO_LIGHT: Record<string, string> = {
  TA: 'bg-cyan-100 text-cyan-900 border-cyan-300',
  OCU: 'bg-indigo-100 text-indigo-900 border-indigo-300',
  DMT: 'bg-amber-100 text-amber-900 border-amber-300',
  Gnr: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  'Ck(U)': 'bg-rose-100 text-rose-900 border-rose-300',
  Tech: 'bg-purple-100 text-purple-900 border-purple-300',
  GD: 'bg-slate-100 text-slate-800 border-slate-300',
};

export const TradeBadge: React.FC<TradeBadgeProps> = ({
  trade,
  size = 'sm',
  showDescription = false,
}) => {
  const { tradesList, theme } = useApp();
  const isLight = theme === 'light';

  // If trade is officer or empty
  if (!trade || trade === '-') {
    return (
      <span className="text-slate-400 font-mono text-[10px] italic">
        -
      </span>
    );
  }

  // Look up from dynamic tradesList first
  const dynamicTrade = tradesList?.find(
    (t) => t.name.toLowerCase() === trade.toLowerCase() || t.code.toLowerCase() === trade.toLowerCase()
  );

  let label = trade;
  let full = trade;
  let desc = 'Artillery Regimental Specialist';
  let color = isLight ? 'bg-slate-100 text-slate-800 border-slate-300' : 'bg-slate-800 text-slate-300 border-slate-700';

  if (dynamicTrade) {
    label = dynamicTrade.code || dynamicTrade.name;
    full = dynamicTrade.banglaName
      ? `${dynamicTrade.name} (${dynamicTrade.banglaName})`
      : dynamicTrade.name;
    desc = dynamicTrade.description || `${dynamicTrade.category} Trade`;
    color = (isLight ? CATEGORY_COLORS_LIGHT[dynamicTrade.category] : CATEGORY_COLORS_DARK[dynamicTrade.category]) || color;
  } else if (TRADE_INFO[trade]) {
    const staticInfo = TRADE_INFO[trade];
    label = staticInfo.label;
    full = staticInfo.full;
    desc = staticInfo.desc;
    color = isLight ? (TRADE_INFO_LIGHT[trade] || 'bg-slate-100 text-slate-800 border-slate-300') : staticInfo.color;
  }

  return (
    <div className="inline-flex items-center gap-1.5" title={`${full}: ${desc}`}>
      <span
        className={`font-mono font-bold rounded border inline-flex items-center ${color} ${
          size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
        }`}
      >
        {label}
      </span>
      {showDescription && (
        <span className={`text-[10px] font-sans hidden sm:inline truncate max-w-[120px] ${
          isLight ? 'text-slate-600' : 'text-slate-400'
        }`}>
          {full}
        </span>
      )}
    </div>
  );
};
