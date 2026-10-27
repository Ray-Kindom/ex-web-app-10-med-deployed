import React from 'react';
import { LucideIcon } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  colorScheme?: 'blue' | 'emerald' | 'amber' | 'purple' | 'rose' | 'cyan' | 'slate' | 'indigo' | 'teal';
  percentage?: number;
  onClick?: () => void;
  badge?: string;
  active?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  colorScheme = 'blue',
  percentage,
  onClick,
  badge,
  active = false,
}) => {
  const { theme } = useApp();
  const isLight = theme === 'light';

  // Dark Theme Palette
  const darkSchemeMap: Record<string, { bg: string; border: string; iconBg: string; accent: string; glow: string }> = {
    blue: {
      bg: 'from-blue-950/40 to-slate-900/80',
      border: 'border-blue-800/40 hover:border-blue-500/60',
      iconBg: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      accent: 'text-blue-400',
      glow: 'shadow-blue-950/20',
    },
    emerald: {
      bg: 'from-emerald-950/40 to-slate-900/80',
      border: 'border-emerald-800/40 hover:border-emerald-500/60',
      iconBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      accent: 'text-emerald-400',
      glow: 'shadow-emerald-950/20',
    },
    amber: {
      bg: 'from-amber-950/40 to-slate-900/80',
      border: 'border-amber-800/40 hover:border-amber-500/60',
      iconBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      accent: 'text-amber-400',
      glow: 'shadow-amber-950/20',
    },
    purple: {
      bg: 'from-purple-950/40 to-slate-900/80',
      border: 'border-purple-800/40 hover:border-purple-500/60',
      iconBg: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
      accent: 'text-purple-400',
      glow: 'shadow-purple-950/20',
    },
    rose: {
      bg: 'from-rose-950/40 to-slate-900/80',
      border: 'border-rose-800/40 hover:border-rose-500/60',
      iconBg: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
      accent: 'text-rose-400',
      glow: 'shadow-rose-950/20',
    },
    cyan: {
      bg: 'from-cyan-950/40 to-slate-900/80',
      border: 'border-cyan-800/40 hover:border-cyan-500/60',
      iconBg: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
      accent: 'text-cyan-400',
      glow: 'shadow-cyan-950/20',
    },
    indigo: {
      bg: 'from-indigo-950/40 to-slate-900/80',
      border: 'border-indigo-800/40 hover:border-indigo-500/60',
      iconBg: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
      accent: 'text-indigo-400',
      glow: 'shadow-indigo-950/20',
    },
    teal: {
      bg: 'from-teal-950/40 to-slate-900/80',
      border: 'border-teal-800/40 hover:border-teal-500/60',
      iconBg: 'bg-teal-500/10 text-teal-400 border border-teal-500/20',
      accent: 'text-teal-400',
      glow: 'shadow-teal-950/20',
    },
    slate: {
      bg: 'from-slate-800/40 to-slate-900/80',
      border: 'border-slate-700/60 hover:border-slate-500',
      iconBg: 'bg-slate-700/40 text-slate-300 border border-slate-600/40',
      accent: 'text-slate-300',
      glow: 'shadow-slate-950/20',
    },
  };

  // Light Theme Palette: Ultra crisp, high contrast
  const lightSchemeMap: Record<string, { bg: string; border: string; iconBg: string; accent: string; glow: string }> = {
    blue: {
      bg: 'bg-white',
      border: 'border-slate-200 hover:border-blue-500',
      iconBg: 'bg-blue-50 text-blue-700 border border-blue-200',
      accent: 'text-blue-700 font-bold',
      glow: 'shadow-sm hover:shadow-md',
    },
    emerald: {
      bg: 'bg-white',
      border: 'border-slate-200 hover:border-emerald-500',
      iconBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      accent: 'text-emerald-700 font-bold',
      glow: 'shadow-sm hover:shadow-md',
    },
    amber: {
      bg: 'bg-white',
      border: 'border-slate-200 hover:border-amber-500',
      iconBg: 'bg-amber-50 text-amber-800 border border-amber-200',
      accent: 'text-amber-800 font-bold',
      glow: 'shadow-sm hover:shadow-md',
    },
    purple: {
      bg: 'bg-white',
      border: 'border-slate-200 hover:border-purple-500',
      iconBg: 'bg-purple-50 text-purple-700 border border-purple-200',
      accent: 'text-purple-700 font-bold',
      glow: 'shadow-sm hover:shadow-md',
    },
    rose: {
      bg: 'bg-white',
      border: 'border-slate-200 hover:border-rose-500',
      iconBg: 'bg-rose-50 text-rose-700 border border-rose-200',
      accent: 'text-rose-700 font-bold',
      glow: 'shadow-sm hover:shadow-md',
    },
    cyan: {
      bg: 'bg-white',
      border: 'border-slate-200 hover:border-cyan-500',
      iconBg: 'bg-cyan-50 text-cyan-800 border border-cyan-200',
      accent: 'text-cyan-800 font-bold',
      glow: 'shadow-sm hover:shadow-md',
    },
    indigo: {
      bg: 'bg-white',
      border: 'border-slate-200 hover:border-indigo-500',
      iconBg: 'bg-indigo-50 text-indigo-800 border border-indigo-200',
      accent: 'text-indigo-800 font-bold',
      glow: 'shadow-sm hover:shadow-md',
    },
    teal: {
      bg: 'bg-white',
      border: 'border-slate-200 hover:border-teal-500',
      iconBg: 'bg-teal-50 text-teal-800 border border-teal-200',
      accent: 'text-teal-800 font-bold',
      glow: 'shadow-sm hover:shadow-md',
    },
    slate: {
      bg: 'bg-white',
      border: 'border-slate-200 hover:border-slate-400',
      iconBg: 'bg-slate-100 text-slate-700 border border-slate-200',
      accent: 'text-slate-700 font-bold',
      glow: 'shadow-sm hover:shadow-md',
    },
  };

  const scheme = isLight
    ? (lightSchemeMap[colorScheme] || lightSchemeMap.blue)
    : (darkSchemeMap[colorScheme] || darkSchemeMap.blue);

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl border ${
        isLight ? scheme.bg : `bg-gradient-to-b ${scheme.bg}`
      } ${
        active
          ? 'ring-2 ring-rose-500/80 border-transparent'
          : scheme.border
      } p-2.5 sm:p-3 ${scheme.glow} transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className={`text-[11px] font-semibold uppercase tracking-wider block truncate ${
            isLight ? 'text-slate-600' : 'text-slate-400'
          }`}>
            {title}
          </span>
          <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
            <span className={`text-xl sm:text-2xl font-bold font-mono tracking-tight ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              {value}
            </span>
            {percentage !== undefined && (
              <span className={`text-[11px] font-semibold font-mono ${scheme.accent}`}>
                ({percentage}%)
              </span>
            )}
          </div>
          {subtitle && (
            <p className={`mt-0.5 text-[11px] flex items-center gap-1 font-medium truncate ${
              isLight ? 'text-slate-500' : 'text-slate-400'
            }`}>
              {subtitle}
            </p>
          )}
        </div>

        <div className={`p-1.5 rounded-lg shrink-0 ${scheme.iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      {badge && (
        <div className={`mt-1.5 pt-1.5 border-t flex items-center justify-between text-[10px] ${
          isLight ? 'border-slate-100' : 'border-slate-800/80'
        }`}>
          <span className={`truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{badge}</span>
        </div>
      )}
    </div>
  );
};
