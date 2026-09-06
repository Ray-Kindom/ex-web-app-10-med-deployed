import React from 'react';
import { useApp } from '../../context/AppContext';
import { Battery } from '../../types';
import {
  ArrowRightLeft,
  ChevronRight,
} from 'lucide-react';

interface ParadeActionControlsProps {
  battery?: Battery;
}

export const ParadeActionControls: React.FC<ParadeActionControlsProps> = ({ battery }) => {
  const {
    currentUser,
    setOutOfUnitModalOpen,
    personnelList,
  } = useApp();

  const isRsm = currentUser.role === 'RSM' || currentUser.role === 'Admin';

  if (!isRsm) {
    return null;
  }

  const outOfUnitCount = personnelList.filter((p) => {
    if (battery && p.battery !== battery) return false;
    return (
      Boolean(p.outOfUnitCategory) ||
      p.status === 'CMH/Sick' ||
      p.status === 'Course/Trg' ||
      p.status === 'Attached Out' ||
      p.status === 'Temp Duty' ||
      p.leaveType === 'P/Lve' ||
      p.leaveType === 'C/Lve'
    );
  }).length;

  return (
    <div className="mb-3">
      {/* Compact Updt Out Of Unit Action Bar */}
      <div
        onClick={() => setOutOfUnitModalOpen(true)}
        className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-750 hover:border-cyan-500/60 p-2.5 sm:p-3 shadow-md transition-all duration-200 cursor-pointer"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 group-hover:scale-105 transition-transform shrink-0">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-300 transition-colors font-sans truncate">
                  Out Of Unit Personnel (ছুটি / সিএমএইচ / কোর্স)
                </h3>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
                  {outOfUnitCount} Active
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate hidden sm:block">
                Leave, Hospital, Courses, Temp Duty & Attachment
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-cyan-400 font-bold text-xs shrink-0">
            <span className="hidden sm:inline">Update</span>
            <div className="p-1 rounded-md bg-slate-800 group-hover:bg-cyan-600 text-slate-300 group-hover:text-white transition-all">
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
