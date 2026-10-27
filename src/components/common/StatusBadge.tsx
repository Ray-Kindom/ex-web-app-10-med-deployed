import React from 'react';
import { ParadeStatus } from '../../types';
import { useApp } from '../../context/AppContext';

interface StatusBadgeProps {
  status: ParadeStatus | string;
  category?: string;
  outOfUnitCategory?: string;
  details?: string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  category,
  outOfUnitCategory,
  details,
  size = 'md',
  showDot = true,
}) => {
  const { theme } = useApp();
  const isLight = theme === 'light';

  const getStatusConfig = (st: string) => {
    switch (st) {
      case 'In Unit':
      case 'Present':
        return {
          bg: isLight ? 'bg-emerald-100' : 'bg-emerald-500/15',
          text: isLight ? 'text-emerald-900 font-semibold' : 'text-emerald-400',
          border: isLight ? 'border-emerald-300' : 'border-emerald-500/30',
          dot: isLight ? 'bg-emerald-600' : 'bg-emerald-400 shadow-emerald-400/50',
          label: 'In Unit (On Parade)',
        };
      case 'On Duty':
        return {
          bg: isLight ? 'bg-blue-100' : 'bg-blue-500/15',
          text: isLight ? 'text-blue-900 font-semibold' : 'text-blue-400',
          border: isLight ? 'border-blue-300' : 'border-blue-500/30',
          dot: isLight ? 'bg-blue-600' : 'bg-blue-400 shadow-blue-400/50',
          label: 'Off Parade: Duty',
        };
      case 'Line Sick':
        return {
          bg: isLight ? 'bg-orange-100' : 'bg-orange-500/15',
          text: isLight ? 'text-orange-900 font-semibold' : 'text-orange-400',
          border: isLight ? 'border-orange-300' : 'border-orange-500/30',
          dot: isLight ? 'bg-orange-600' : 'bg-orange-400 shadow-orange-400/50',
          label: 'Line Sick (Off Parade)',
        };
      case 'P/Lve':
        return {
          bg: isLight ? 'bg-purple-100' : 'bg-purple-500/15',
          text: isLight ? 'text-purple-900 font-semibold' : 'text-purple-400',
          border: isLight ? 'border-purple-300' : 'border-purple-500/30',
          dot: isLight ? 'bg-purple-600' : 'bg-purple-400 shadow-purple-400/50',
          label: 'P/Lve (Leave)',
        };
      case 'C/Lve':
        return {
          bg: isLight ? 'bg-fuchsia-100' : 'bg-fuchsia-500/15',
          text: isLight ? 'text-fuchsia-900 font-semibold' : 'text-fuchsia-400',
          border: isLight ? 'border-fuchsia-300' : 'border-fuchsia-500/30',
          dot: isLight ? 'bg-fuchsia-600' : 'bg-fuchsia-400 shadow-fuchsia-400/50',
          label: 'C/Lve (Leave)',
        };
      case 'Leave':
        return {
          bg: isLight ? 'bg-purple-100' : 'bg-purple-500/15',
          text: isLight ? 'text-purple-900 font-semibold' : 'text-purple-400',
          border: isLight ? 'border-purple-300' : 'border-purple-500/30',
          dot: isLight ? 'bg-purple-600' : 'bg-purple-400 shadow-purple-400/50',
          label: 'Leave',
        };
      case 'Course':
      case 'Course/Trg':
        return {
          bg: isLight ? 'bg-cyan-100' : 'bg-cyan-500/15',
          text: isLight ? 'text-cyan-900 font-semibold' : 'text-cyan-400',
          border: isLight ? 'border-cyan-300' : 'border-cyan-500/30',
          dot: isLight ? 'bg-cyan-600' : 'bg-cyan-400 shadow-cyan-400/50',
          label: 'Course',
        };
      case 'CMH':
      case 'CMH/Sick':
        return {
          bg: isLight ? 'bg-amber-100' : 'bg-amber-500/15',
          text: isLight ? 'text-amber-900 font-semibold' : 'text-amber-400',
          border: isLight ? 'border-amber-300' : 'border-amber-500/30',
          dot: isLight ? 'bg-amber-600' : 'bg-amber-400 shadow-amber-400/50',
          label: 'CMH (Hospital)',
        };
      case 'FDMN':
        return {
          bg: isLight ? 'bg-indigo-100' : 'bg-indigo-500/15',
          text: isLight ? 'text-indigo-900 font-semibold' : 'text-indigo-400',
          border: isLight ? 'border-indigo-300' : 'border-indigo-500/30',
          dot: isLight ? 'bg-indigo-600' : 'bg-indigo-400 shadow-indigo-400/50',
          label: 'FDMN (Field Duty)',
        };
      case 'Comd':
      case 'Temp Duty':
        return {
          bg: isLight ? 'bg-blue-100' : 'bg-blue-500/15',
          text: isLight ? 'text-blue-900 font-semibold' : 'text-blue-400',
          border: isLight ? 'border-blue-300' : 'border-blue-500/30',
          dot: isLight ? 'bg-blue-600' : 'bg-blue-400 shadow-blue-400/50',
          label: 'Comd (Task)',
        };
      case 'Att':
      case 'Attached Out':
        return {
          bg: isLight ? 'bg-teal-100' : 'bg-teal-500/15',
          text: isLight ? 'text-teal-900 font-semibold' : 'text-teal-400',
          border: isLight ? 'border-teal-300' : 'border-teal-500/30',
          dot: isLight ? 'bg-teal-600' : 'bg-teal-400 shadow-teal-400/50',
          label: 'Att (Attachment)',
        };
      case 'Msn':
        return {
          bg: isLight ? 'bg-sky-100' : 'bg-sky-500/15',
          text: isLight ? 'text-sky-900 font-semibold' : 'text-sky-400',
          border: isLight ? 'border-sky-300' : 'border-sky-500/30',
          dot: isLight ? 'bg-sky-600' : 'bg-sky-400 shadow-sky-400/50',
          label: 'UN Mission',
        };
      case 'ERE':
        return {
          bg: isLight ? 'bg-violet-100' : 'bg-violet-500/15',
          text: isLight ? 'text-violet-900 font-semibold' : 'text-violet-400',
          border: isLight ? 'border-violet-300' : 'border-violet-500/30',
          dot: isLight ? 'bg-violet-600' : 'bg-violet-400 shadow-violet-400/50',
          label: 'ERE (Non-Posted)',
        };
      case 'Civilian':
        return {
          bg: isLight ? 'bg-slate-100' : 'bg-slate-500/15',
          text: isLight ? 'text-slate-800 font-semibold' : 'text-slate-400',
          border: isLight ? 'border-slate-300' : 'border-slate-500/30',
          dot: isLight ? 'bg-slate-500' : 'bg-slate-400 shadow-slate-400/50',
          label: 'Civilian Staff',
        };
      case 'AWOL':
      case 'AWOL/OSL':
        return {
          bg: isLight ? 'bg-rose-100' : 'bg-rose-500/15',
          text: isLight ? 'text-rose-900 font-semibold' : 'text-rose-400',
          border: isLight ? 'border-rose-300' : 'border-rose-500/30',
          dot: isLight ? 'bg-rose-600' : 'bg-rose-400 shadow-rose-400/50',
          label: 'AWOL / OSL',
        };
      default:
        return {
          bg: isLight ? 'bg-slate-100' : 'bg-slate-700/50',
          text: isLight ? 'text-slate-800 font-semibold' : 'text-slate-300',
          border: isLight ? 'border-slate-300' : 'border-slate-600',
          dot: isLight ? 'bg-slate-500' : 'bg-slate-400',
          label: st,
        };
    }
  };

  const effectiveStatus = (() => {
    const cat = (outOfUnitCategory || category || '').trim();
    if (cat === 'FDMN') return 'FDMN';
    if (cat === 'ERE') return 'ERE';
    if (cat === 'Msn') return 'Msn';
    if (cat === 'Att') return 'Att';
    if (cat === 'Comd') return 'Comd';
    if (cat === 'Course') return 'Course';
    if (cat === 'CMH') return 'CMH';
    if (cat === 'P/Lve') return 'P/Lve';
    if (cat === 'C/Lve') return 'C/Lve';

    // Auto-detect from details if available
    const det = (details || '').toLowerCase();
    if (det.includes('fdmn') || det.includes('হোয়াইকং')) return 'FDMN';
    if (det.includes('un mission') || det.includes('mission party') || det.includes('শান্তিরক্ষা')) return 'Msn';
    if (det.includes('ere')) return 'ERE';
    if (det.includes('line sick')) return 'Line Sick';

    return status || 'Present';
  })();

  const config = getStatusConfig(effectiveStatus);

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-medium',
    lg: 'text-sm px-3 py-1.5 font-semibold',
  };

  return (
    <div className="inline-flex flex-col items-start gap-0.5">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClasses[size]} tracking-tight whitespace-nowrap`}
      >
        {showDot && (
          <span
            className={`w-1.5 h-1.5 rounded-full ${config.dot} ${isLight ? 'shadow-sm' : 'shadow-[0_0_8px_rgba(0,0,0,0.5)]'}`}
          />
        )}
        <span>{config.label}</span>
      </span>
      {details && (
        <span className={`text-[10px] pl-1 max-w-[170px] truncate ${isLight ? 'text-slate-600' : 'text-slate-400'}`} title={details}>
          {details}
        </span>
      )}
    </div>
  );
};
