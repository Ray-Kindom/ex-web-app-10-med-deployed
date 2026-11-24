import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Battery, ALL_BATTERIES, normalizeBattery, matchesBatteryFilter } from '../../types';
import {
  Shield,
  Wrench,
  Clock,
  Layers,
  X,
  PlaneTakeoff,
  UserCheck,
  Building2,
  Calendar,
  Maximize2,
  Minimize2,
  Printer,
  Search,
  Users,
} from 'lucide-react';

type ViewBattery = Battery | 'Consolidated';

interface ParadeStateSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionType: string;
  date: string;
  defaultBattery?: Battery | 'Consolidated';
  onOpenPrintModal?: () => void;
}

export const ParadeStateSummaryModal: React.FC<ParadeStateSummaryModalProps> = ({
  isOpen,
  onClose,
  sessionType,
  date,
  defaultBattery,
  onOpenPrintModal,
}) => {
  const {
    personnelList,
    currentUser,
    selectedParadeDate,
    getParadeDutyAssignments,
  } = useApp();

  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const activeDate = date || selectedParadeDate;
  const isBsm = ['P BSM', 'Q BSM', 'R BSM', 'HQ BSM', 'EME JCO', 'BSM'].includes(currentUser.role);
  const assignedBty = (normalizeBattery(currentUser.assignedBattery || 'P Bty') || 'P Bty') as Battery;

  // Battery tab: default to assignedBty for BSM, otherwise defaultBattery or 'Consolidated'
  const initialBattery: ViewBattery = isBsm
    ? assignedBty
    : defaultBattery
    ? ((defaultBattery === 'Consolidated' ? 'Consolidated' : normalizeBattery(defaultBattery)) as ViewBattery)
    : 'Consolidated';

  const [selectedBty, setSelectedBty] = useState<ViewBattery>(initialBattery);

  // 1. Fetch real entered duty assignments for this date and session
  const rawDuties = useMemo(() => {
    return getParadeDutyAssignments(activeDate, sessionType);
  }, [getParadeDutyAssignments, activeDate, sessionType]);

  // 2. Filter duties for selected battery (or all if Consolidated)
  const btyDuties = useMemo(() => {
    const list = selectedBty === 'Consolidated'
      ? rawDuties
      : rawDuties.filter((d) => matchesBatteryFilter(d.battery, selectedBty));

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (d) =>
        d.snkNo.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        d.rank.toLowerCase().includes(q) ||
        d.dutyName.toLowerCase().includes(q)
    );
  }, [rawDuties, selectedBty, searchQuery]);

  // 3. Personnel belonging to selected battery or all
  const btyPersonnel = useMemo(() => {
    return selectedBty === 'Consolidated'
      ? personnelList
      : personnelList.filter((p) => matchesBatteryFilter(p.battery, selectedBty));
  }, [personnelList, selectedBty]);

  // 4. Out of Unit personnel
  const outOfUnitList = useMemo(() => {
    const list = btyPersonnel.filter((p) =>
      ['Leave', 'CMH', 'Sick', 'Course', 'Att', 'FDMN', 'Msn', 'ERE'].includes(p.status)
    );
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (p) =>
        p.snkNo.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.rk.toLowerCase().includes(q) ||
        (p.statusDetails && p.statusDetails.toLowerCase().includes(q))
    );
  }, [btyPersonnel, searchQuery]);

  // 5. Present in Unit personnel
  const presentInUnitList = useMemo(() => {
    return btyPersonnel.filter(
      (p) => !['Leave', 'CMH', 'Sick', 'Course', 'Att', 'FDMN', 'Msn', 'ERE'].includes(p.status)
    );
  }, [btyPersonnel]);

  // 6. Duties grouped by the 4 standard categories
  const unitSyDuties = useMemo(() => btyDuties.filter((d) => d.category === 'Unit Sy'), [btyDuties]);
  const workingDuties = useMemo(() => btyDuties.filter((d) => d.category === 'working'), [btyDuties]);
  const fixedDuties = useMemo(() => btyDuties.filter((d) => d.category === 'Fixed Duty'), [btyDuties]);
  const othersDuties = useMemo(() => btyDuties.filter((d) => d.category === 'Others'), [btyDuties]);

  // 7. On Parade count = Present in Unit minus entered duties
  const assignedDutySnkNos = useMemo(() => new Set(btyDuties.map((d) => d.snkNo)), [btyDuties]);
  const onParadeCount = Math.max(0, presentInUnitList.length - assignedDutySnkNos.size);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm overflow-hidden animate-fadeIn">
      <div
        className={`relative w-full flex flex-col bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden transition-all duration-200 ${
          isMaximized
            ? 'w-full h-full max-w-none max-h-none rounded-none'
            : 'max-w-4xl max-h-[88vh] rounded-xl'
        }`}
      >
        {/* MODAL HEADER (Selector 1) */}
        <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="w-4 h-4 text-rose-400 shrink-0" />
            <h2 className="text-xs sm:text-sm font-bold text-white font-sans truncate">
              {selectedBty === 'Consolidated' ? 'All Batteries' : selectedBty} — {sessionType} Summary
            </h2>
            <span className="text-[11px] font-mono text-slate-400 shrink-0">({activeDate})</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenPrintModal && (
              <button
                type="button"
                onClick={onOpenPrintModal}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1 border border-slate-700 cursor-pointer"
                title="Print Parade State"
              >
                <Printer className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Print</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsMaximized((prev) => !prev)}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-700"
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-700"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* BATTERY SELECTOR & SEARCH (Selector 2) */}
        <div className="bg-slate-900/60 px-4 py-1.5 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto">
            {!isBsm && (
              <button
                type="button"
                onClick={() => setSelectedBty('Consolidated')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer shrink-0 ${
                  selectedBty === 'Consolidated'
                    ? 'bg-rose-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                All ({personnelList.length})
              </button>
            )}

            {ALL_BATTERIES.map((bty) => {
              const isSelected = selectedBty === bty;
              const count = personnelList.filter((p) => matchesBatteryFilter(p.battery, bty)).length;

              return (
                <button
                  key={bty}
                  type="button"
                  onClick={() => setSelectedBty(bty)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-rose-600 text-white font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {bty} ({count})
                </button>
              );
            })}
          </div>

          <div className="relative w-36 sm:w-44 shrink-0">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-6 pr-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        {/* SCROLLABLE CONTENT (Selector 4) */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
          {/* COMPACT METRIC BOXES ROW (4 Cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
            {/* 1. Posted */}
            <div className="p-2 px-2.5 rounded-lg bg-slate-900/70 border border-slate-800 flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400 font-medium">Posted</span>
              <span className="text-sm sm:text-base font-bold font-mono text-white">
                {btyPersonnel.length}
              </span>
            </div>

            {/* 2. Present */}
            <div className="p-2 px-2.5 rounded-lg bg-slate-900/70 border border-blue-500/20 flex items-center justify-between">
              <span className="text-xs font-mono text-blue-400 font-medium">Present</span>
              <span className="text-sm sm:text-base font-bold font-mono text-blue-200">
                {presentInUnitList.length}
              </span>
            </div>

            {/* 3. On Parade */}
            <div className="p-2 px-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between">
              <span className="text-xs font-mono text-emerald-400 font-bold">On Parade</span>
              <span className="text-base sm:text-lg font-black font-mono text-emerald-300">
                {onParadeCount}
              </span>
            </div>

            {/* 4. Duties */}
            <div className="p-2 px-2.5 rounded-lg bg-amber-950/20 border border-amber-500/20 flex items-center justify-between">
              <span className="text-xs font-mono text-amber-400 font-medium">Duties</span>
              <span className="text-sm sm:text-base font-bold font-mono text-amber-300">
                {btyDuties.length}
              </span>
            </div>
          </div>

          {/* COMPACT DUTY CATEGORIES GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 items-start">
            {/* 1. Unit Sy */}
            <div className="rounded-lg bg-slate-900/50 border border-slate-800 p-2.5 space-y-2 flex flex-col">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-bold text-white font-sans">1. Unit Sy</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-bold">
                  {unitSyDuties.length}
                </span>
              </div>

              {unitSyDuties.length === 0 ? (
                <p className="text-[11px] font-mono text-slate-500 italic py-2 text-center">No entry</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5">
                  {unitSyDuties.map((d) => (
                    <div
                      key={d.id}
                      className="p-1.5 rounded bg-slate-950 border border-slate-850 text-xs font-mono flex items-center justify-between gap-1"
                    >
                      <span className="font-medium text-white truncate">
                        {d.snkNo} {d.rank} {d.name}
                      </span>
                      <span className="text-[10px] text-emerald-400 shrink-0">{d.dutyName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. working */}
            <div className="rounded-lg bg-slate-900/50 border border-slate-800 p-2.5 space-y-2 flex flex-col">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <div className="flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-bold text-white font-sans">2. working</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 font-bold">
                  {workingDuties.length}
                </span>
              </div>

              {workingDuties.length === 0 ? (
                <p className="text-[11px] font-mono text-slate-500 italic py-2 text-center">No entry</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5">
                  {workingDuties.map((d) => (
                    <div
                      key={d.id}
                      className="p-1.5 rounded bg-slate-950 border border-slate-850 text-xs font-mono flex items-center justify-between gap-1"
                    >
                      <span className="font-medium text-white truncate">
                        {d.snkNo} {d.rank} {d.name}
                      </span>
                      <span className="text-[10px] text-amber-400 shrink-0">{d.dutyName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Fixed Duty */}
            <div className="rounded-lg bg-slate-900/50 border border-slate-800 p-2.5 space-y-2 flex flex-col">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-xs font-bold text-white font-sans">3. Fixed Duty</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 font-bold">
                  {fixedDuties.length}
                </span>
              </div>

              {fixedDuties.length === 0 ? (
                <p className="text-[11px] font-mono text-slate-500 italic py-2 text-center">No entry</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5">
                  {fixedDuties.map((d) => (
                    <div
                      key={d.id}
                      className="p-1.5 rounded bg-slate-950 border border-slate-850 text-xs font-mono flex items-center justify-between gap-1"
                    >
                      <span className="font-medium text-white truncate">
                        {d.snkNo} {d.rank} {d.name}
                      </span>
                      <span className="text-[10px] text-cyan-400 shrink-0">{d.dutyName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Others */}
            <div className="rounded-lg bg-slate-900/50 border border-slate-800 p-2.5 space-y-2 flex flex-col">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-xs font-bold text-white font-sans">4. Others</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 font-bold">
                  {othersDuties.length}
                </span>
              </div>

              {othersDuties.length === 0 ? (
                <p className="text-[11px] font-mono text-slate-500 italic py-2 text-center">No entry</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5">
                  {othersDuties.map((d) => (
                    <div
                      key={d.id}
                      className="p-1.5 rounded bg-slate-950 border border-slate-850 text-xs font-mono flex items-center justify-between gap-1"
                    >
                      <span className="font-medium text-white truncate">
                        {d.snkNo} {d.rank} {d.name}
                      </span>
                      <span className="text-[10px] text-rose-400 shrink-0">{d.dutyName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* COMPACT OUT OF UNIT SECTION */}
          {outOfUnitList.length > 0 && (
            <div className="rounded-lg bg-slate-900/40 border border-purple-500/20 p-2.5 space-y-1.5">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <div className="flex items-center gap-1.5">
                  <PlaneTakeoff className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-xs font-bold text-white font-sans">Out of Unit</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-400 font-bold">
                  {outOfUnitList.length}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 pt-0.5">
                {outOfUnitList.map((p) => (
                  <div
                    key={p.id}
                    className="p-1.5 rounded bg-slate-950 border border-slate-800/80 text-xs font-mono flex items-center justify-between gap-1"
                  >
                    <div className="min-w-0 truncate">
                      <span className="font-medium text-white truncate block">
                        {p.snkNo} {p.rk} {p.name}
                      </span>
                      <span className="text-[10px] text-purple-400 truncate block">
                        {p.statusDetails || p.status}
                      </span>
                    </div>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-purple-950/60 text-purple-300 shrink-0 font-bold">
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between shrink-0 text-xs font-mono">
          <span className="text-slate-400">
            {selectedBty} • <strong className="text-emerald-400">{onParadeCount}</strong> On Parade
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs font-mono transition-colors cursor-pointer border border-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
