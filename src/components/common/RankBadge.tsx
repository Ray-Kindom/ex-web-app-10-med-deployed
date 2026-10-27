import React from 'react';
import { useApp } from '../../context/AppContext';

interface RankBadgeProps {
  rank: string;
  trade?: string;
  size?: 'sm' | 'md';
}

export const RankBadge: React.FC<RankBadgeProps> = ({
  rank,
  trade,
  size = 'md',
}) => {
  const { ranksList, theme } = useApp();
  const isLight = theme === 'light';

  const getRankStyle = (rk: string) => {
    // Check dynamic ranksList first
    const dynamicRank = ranksList?.find(
      (r) => r.name.toLowerCase() === rk.toLowerCase() || (r.code && r.code.toLowerCase() === rk.toLowerCase())
    );

    if (dynamicRank) {
      switch (dynamicRank.category) {
        case 'Officer':
          return {
            bg: isLight ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-amber-500/20 text-amber-300 border-amber-500/40',
            category: 'Officer',
          };
        case 'JCO':
          return {
            bg: isLight ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
            category: 'JCO',
          };
        case 'Civilian':
          return {
            bg: isLight ? 'bg-purple-100 text-purple-900 border-purple-300' : 'bg-purple-500/20 text-purple-300 border-purple-500/40',
            category: 'Civilian',
          };
        case 'RCO':
          return {
            bg: isLight ? 'bg-cyan-100 text-cyan-900 border-cyan-300' : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
            category: 'RCO',
          };
        case 'OR':
        default:
          return {
            bg: isLight ? 'bg-blue-100 text-blue-900 border-blue-300' : 'bg-blue-500/20 text-blue-300 border-blue-500/40',
            category: 'OR',
          };
      }
    }

    switch (rk) {
      case 'Lt Col':
      case 'Maj':
      case 'Capt':
      case 'Lt':
      case '2Lt':
        return {
          bg: isLight ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          category: 'Officer',
        };
      case 'MWO':
      case 'SWO':
      case 'WO':
        return {
          bg: isLight ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          category: 'JCO',
        };
      case 'Sgt':
      case 'Cpl':
      case 'Lcpl':
        return {
          bg: isLight ? 'bg-blue-100 text-blue-900 border-blue-300' : 'bg-blue-500/20 text-blue-300 border-blue-500/40',
          category: 'OR',
        };
      case 'Civilian':
      case 'NC(E)':
      case 'NC(U)':
        return {
          bg: isLight ? 'bg-purple-100 text-purple-900 border-purple-300' : 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          category: 'Civilian',
        };
      case 'RCO':
        return {
          bg: isLight ? 'bg-cyan-100 text-cyan-900 border-cyan-300' : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          category: 'RCO',
        };
      case 'Snk':
      case 'Gnr':
      default:
        return {
          bg: isLight ? 'bg-slate-100 text-slate-800 border-slate-300' : 'bg-slate-800 text-slate-300 border-slate-700',
          category: 'OR',
        };
    }
  };

  const style = getRankStyle(rank || 'Snk');

  return (
    <div className="inline-flex items-center gap-1.5 font-mono">
      <span
        className={`inline-flex items-center font-bold rounded border ${style.bg} ${
          size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
        }`}
      >
        {rank}
      </span>
      {trade && (
        <span
          className={`font-medium px-1.5 py-0.5 rounded border ${
            isLight
              ? 'text-slate-700 bg-slate-100 border-slate-300'
              : 'text-slate-400 bg-slate-800/80 border-slate-700/60'
          } ${size === 'sm' ? 'text-[9px]' : 'text-[10px]'}`}
          title={`Trade: ${trade}`}
        >
          {trade}
        </span>
      )}
    </div>
  );
};
