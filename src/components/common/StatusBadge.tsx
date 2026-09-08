import React from 'react';
import { ParadeStatus } from '../../types';

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
  const getStatusConfig = (st: string) => {
    switch (st) {
      case 'In Unit':
      case 'Present':
        return {
          bg: 'bg-emerald-500/15',
          text: 'text-emerald-400',
          border: 'border-emerald-500/30',
          dot: 'bg-emerald-400 shadow-emerald-400/50',
          label: 'In Unit (On Parade)',
        };
      case 'On Duty':
        return {
          bg: 'bg-blue-500/15',
          text: 'text-blue-400',
          border: 'border-blue-500/30',
          dot: 'bg-blue-400 shadow-blue-400/50',
          label: 'Off Parade: Duty',
        };
      case 'Line Sick':
        return {
          bg: 'bg-orange-500/15',
          text: 'text-orange-400',
          border: 'border-orange-500/30',
          dot: 'bg-orange-400 shadow-orange-400/50',
          label: 'Line Sick (Off Parade)',
        };
      case 'P/Lve':
        return {
          bg: 'bg-purple-500/15',
          text: 'text-purple-400',
          border: 'border-purple-500/30',
          dot: 'bg-purple-400 shadow-purple-400/50',
          label: 'P/Lve (Leave)',
        };
      case 'C/Lve':
        return {
          bg: 'bg-fuchsia-500/15',
          text: 'text-fuchsia-400',
          border: 'border-fuchsia-500/30',
          dot: 'bg-fuchsia-400 shadow-fuchsia-400/50',
          label: 'C/Lve (Leave)',
        };
      case 'Leave':
        return {
          bg: 'bg-purple-500/15',
          text: 'text-purple-400',
          border: 'border-purple-500/30',
          dot: 'bg-purple-400 shadow-purple-400/50',
          label: 'Leave',
        };
      case 'Course':
      case 'Course/Trg':
        return {
          bg: 'bg-cyan-500/15',
          text: 'text-cyan-400',
          border: 'border-cyan-500/30',
          dot: 'bg-cyan-400 shadow-cyan-400/50',
          label: 'Course',
        };
      case 'CMH':
      case 'CMH/Sick':
        return {
          bg: 'bg-amber-500/15',
          text: 'text-amber-400',
          border: 'border-amber-500/30',
          dot: 'bg-amber-400 shadow-amber-400/50',
          label: 'CMH (Hospital)',
        };
      case 'FDMN':
        return {
          bg: 'bg-indigo-500/15',
          text: 'text-indigo-400',
          border: 'border-indigo-500/30',
          dot: 'bg-indigo-400 shadow-indigo-400/50',
          label: 'FDMN (Field Duty)',
        };
      case 'Comd':
      case 'Temp Duty':
        return {
          bg: 'bg-blue-500/15',
          text: 'text-blue-400',
          border: 'border-blue-500/30',
          dot: 'bg-blue-400 shadow-blue-400/50',
          label: 'Comd (Task)',
        };
      case 'Att':
      case 'Attached Out':
        return {
          bg: 'bg-teal-500/15',
          text: 'text-teal-400',
          border: 'border-teal-500/30',
          dot: 'bg-teal-400 shadow-teal-400/50',
          label: 'Att (Attachment)',
        };
      case 'Msn':
        return {
          bg: 'bg-sky-500/15',
          text: 'text-sky-400',
          border: 'border-sky-500/30',
          dot: 'bg-sky-400 shadow-sky-400/50',
          label: 'UN Mission',
        };
      case 'ERE':
        return {
          bg: 'bg-violet-500/15',
          text: 'text-violet-400',
          border: 'border-violet-500/30',
          dot: 'bg-violet-400 shadow-violet-400/50',
          label: 'ERE (Non-Posted)',
        };
      case 'Civilian':
        return {
          bg: 'bg-slate-500/15',
          text: 'text-slate-400',
          border: 'border-slate-500/30',
          dot: 'bg-slate-400 shadow-slate-400/50',
          label: 'Civilian Staff',
        };
      case 'AWOL':
      case 'AWOL/OSL':
        return {
          bg: 'bg-rose-500/15',
          text: 'text-rose-400',
          border: 'border-rose-500/30',
          dot: 'bg-rose-400 shadow-rose-400/50',
          label: 'AWOL / OSL',
        };
      default:
        return {
          bg: 'bg-slate-700/50',
          text: 'text-slate-300',
          border: 'border-slate-600',
          dot: 'bg-slate-400',
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
            className={`w-1.5 h-1.5 rounded-full ${config.dot} shadow-[0_0_8px_rgba(0,0,0,0.5)]`}
          />
        )}
        <span>{config.label}</span>
      </span>
      {details && (
        <span className="text-[10px] text-slate-400 pl-1 max-w-[170px] truncate" title={details}>
          {details}
        </span>
      )}
    </div>
  );
};
