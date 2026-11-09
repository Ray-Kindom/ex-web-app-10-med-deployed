import React from 'react';
import { LucideIcon } from 'lucide-react';

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
  const iconToneMap: Record<string, string> = {
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40',
    rose: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40',
    purple: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40',
    cyan: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40',
    indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40',
    teal: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40',
    blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40',
    slate: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800',
  };

  const iconStyle = iconToneMap[colorScheme] || iconToneMap.blue;

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border transition-all duration-150 p-3 sm:p-3.5 select-none ${
        active
          ? 'bg-white dark:bg-slate-900 border-slate-900 dark:border-slate-100 ring-1 ring-slate-900 dark:ring-slate-100'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      } ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
            {title}
          </span>
          <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
            <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white tracking-tight">
              {value}
            </span>
            {percentage !== undefined && (
              <span className="text-[11px] font-medium font-mono tabular-nums text-slate-500 dark:text-slate-400">
                ({percentage}%)
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {subtitle}
            </p>
          )}
        </div>

        <div className={`p-2 rounded-lg shrink-0 ${iconStyle}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      {badge && (
        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 truncate">
          {badge}
        </div>
      )}
    </div>
  );
};

