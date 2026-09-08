import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UnitLogo } from '../common/UnitLogo';
import { normalizeDutyName } from '../../utils/paradeCalculations';
import { ALL_BATTERIES, Battery } from '../../types';
import {
  Printer,
  X,
  FileText,
  Shield,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';

interface ExecutiveDailyBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  date?: string;
  sessionType?: string;
}

export const ExecutiveDailyBriefingModal: React.FC<ExecutiveDailyBriefingModalProps> = ({
  isOpen,
  onClose,
  date,
  sessionType = 'Morning',
}) => {
  const {
    personnelList,
    selectedParadeDate,
    getParadeDutyAssignments,
    getParadeSummary,
    currentUser,
    getDutySessionStatus,
  } = useApp();

  const effectiveDate = date || selectedParadeDate;
  const dutyStatus = getDutySessionStatus(effectiveDate, sessionType);

  const coOfficer = personnelList.find((p) => p.snkNo === 'BA-7592') || personnelList.find((p) => p.rk === 'Lt Col');
  const adjutantOfficer = personnelList.find((p) => p.snkNo === 'BA-11735') || personnelList.find((p) => p.rk === 'Capt');
  const coName = coOfficer ? coOfficer.name : 'Lt Col Md Shafiqul Islam Rubel, PSC, G';
  const adjutantName = adjutantOfficer ? adjutantOfficer.name : 'Capt Iftekhar Mahmud Abir';

  // Zoom / Scale density control
  const [scaleMode, setScaleMode] = useState<'auto' | 'compact' | 'normal'>('auto');

  const dutyAssignments = useMemo(() => {
    return getParadeDutyAssignments(effectiveDate, sessionType);
  }, [getParadeDutyAssignments, effectiveDate, sessionType]);

  // Regimental parade summary
  const regtSummary = useMemo(() => {
    return getParadeSummary('Consolidated', effectiveDate, sessionType);
  }, [getParadeSummary, effectiveDate, sessionType, personnelList, dutyAssignments]);

  // Battery-wise summaries
  const batterySummaries = useMemo(() => {
    return ALL_BATTERIES.map((bty) => {
      return getParadeSummary(bty, effectiveDate, sessionType);
    });
  }, [getParadeSummary, effectiveDate, sessionType, personnelList, dutyAssignments]);

  // Group duties by category
  const categorizedDuties = useMemo(() => {
    const unitSy = dutyAssignments.filter((d) => d.category === 'Unit Sy');
    const working = dutyAssignments.filter((d) => d.category === 'working');
    const fixedDuty = dutyAssignments.filter((d) => d.category === 'Fixed Duty');
    const others = dutyAssignments.filter((d) => d.category === 'Others');

    return { unitSy, working, fixedDuty, others };
  }, [dutyAssignments]);

  // Out of unit officers & JCOs
  const outOfUnitOfficers = useMemo(() => {
    return personnelList.filter(
      (p) =>
        ['Lt Col', 'Maj', 'Capt', 'Lt', '2Lt', 'SWO', 'WO', 'MWO'].includes(p.rk) &&
        (p.status !== 'Present' || Boolean(p.outOfUnitCategory))
    );
  }, [personnelList]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  // Date formatting for military display (e.g., 06-SEP-2026)
  const dObj = new Date(effectiveDate);
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const formattedDate = `${String(dObj.getDate()).padStart(2, '0')}-${months[dObj.getMonth()]}-${dObj.getFullYear()}`;

  const scaleClass =
    scaleMode === 'compact'
      ? 'scale-[0.88] origin-top'
      : scaleMode === 'normal'
      ? 'scale-100'
      : 'scale-[0.94] origin-top';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto border border-slate-300 print:border-none print:shadow-none print:w-full print:max-w-none">
        {/* Top Control Bar (Screen Only) */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between print:hidden border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                <span>CO Executive Daily Briefing (1-Page Military PDF)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  CONFIDENTIAL
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {formattedDate} • 0630 HRS • Status: {dutyStatus.status}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Scale Toggle */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setScaleMode('compact')}
                className={`px-2 py-1 rounded text-[11px] font-mono ${
                  scaleMode === 'compact' ? 'bg-amber-600 text-white' : 'text-slate-300'
                }`}
              >
                Compact (Fit A4)
              </button>
              <button
                type="button"
                onClick={() => setScaleMode('auto')}
                className={`px-2 py-1 rounded text-[11px] font-mono ${
                  scaleMode === 'auto' ? 'bg-amber-600 text-white' : 'text-slate-300'
                }`}
              >
                Balanced
              </button>
              <button
                type="button"
                onClick={() => setScaleMode('normal')}
                className={`px-2 py-1 rounded text-[11px] font-mono ${
                  scaleMode === 'normal' ? 'bg-amber-600 text-white' : 'text-slate-300'
                }`}
              >
                100%
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Briefing Sheet Container */}
        <div className="p-6 sm:p-8 overflow-y-auto bg-white font-sans text-slate-900 space-y-4 print:p-0 print:space-y-3">
          <div className={`transition-transform duration-200 ${scaleClass}`}>
            {/* Military Header Block */}
            <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between text-left">
              <div className="flex items-center gap-3">
                <UnitLogo size="md" />
                <div>
                  <h1 className="text-lg sm:text-xl font-black uppercase tracking-wider text-slate-900 font-serif leading-none">
                    10 MEDIUM REGIMENT ARTILLERY
                  </h1>
                  <div className="text-[11px] font-bold tracking-widest text-red-700 font-mono mt-0.5">
                    BORN DESTROYER • HONOUR & GLORY
                  </div>
                  <div className="text-[10px] text-slate-700 font-semibold font-mono">
                    COMMANDING OFFICER'S EXECUTIVE DAILY BRIEFING
                  </div>
                </div>
              </div>

              <div className="text-right border-l-2 border-slate-900 pl-3 text-xs font-mono leading-tight">
                <div className="font-bold text-slate-900 uppercase">MORNING PARADE STATE</div>
                <div className="text-slate-800">DATE: <strong>{formattedDate}</strong></div>
                <div className="text-slate-800">TIME: <strong>0630 HRS</strong></div>
                <div className="text-[10px] text-red-700 font-black tracking-widest">CONFIDENTIAL</div>
              </div>
            </div>

            {/* Part I: Executive KPI Strip */}
            <div className="mt-3 grid grid-cols-6 gap-1.5 text-center font-mono">
              <div className="p-2 bg-slate-100 border border-slate-400 rounded">
                <div className="text-[9px] text-slate-600 font-bold uppercase">Total Posted</div>
                <div className="text-base font-black text-slate-900">{regtSummary.totalPosted}</div>
              </div>
              <div className="p-2 bg-slate-100 border border-slate-400 rounded">
                <div className="text-[9px] text-slate-600 font-bold uppercase">Out of Unit</div>
                <div className="text-base font-black text-rose-700">{regtSummary.outOfUnit}</div>
              </div>
              <div className="p-2 bg-slate-100 border border-slate-400 rounded">
                <div className="text-[9px] text-slate-600 font-bold uppercase">Present in Unit</div>
                <div className="text-base font-black text-blue-900">{regtSummary.presentInUnit}</div>
              </div>
              <div className="p-2 bg-slate-100 border border-slate-400 rounded">
                <div className="text-[9px] text-slate-600 font-bold uppercase">Off Parade (Duty)</div>
                <div className="text-base font-black text-amber-700">{regtSummary.offParade}</div>
              </div>
              <div className="p-2 bg-emerald-50 border border-emerald-600 rounded">
                <div className="text-[9px] text-emerald-800 font-bold uppercase">On Parade</div>
                <div className="text-base font-black text-emerald-800">{regtSummary.onParade}</div>
              </div>
              <div className="p-2 bg-slate-100 border border-slate-400 rounded">
                <div className="text-[9px] text-slate-600 font-bold uppercase">Combat Fit %</div>
                <div className="text-base font-black text-slate-900">{regtSummary.presentInUnitPercentage}%</div>
              </div>
            </div>

            {/* Part II: Battery-Wise Strength Matrix Table */}
            <div className="mt-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-900 mb-1 border-b border-slate-800 pb-0.5 font-mono flex items-center justify-between">
                <span>1. SUB-UNIT (BATTERY) MANNING MATRIX</span>
                <span className="text-[9px] text-slate-600">All figures verified by RSM</span>
              </div>

              <table className="w-full text-xs text-left border border-slate-800 border-collapse">
                <thead>
                  <tr className="bg-slate-200 text-slate-900 font-mono text-[9px] uppercase border-b border-slate-800">
                    <th className="p-1.5 border-r border-slate-400">Sub-Unit</th>
                    <th className="p-1.5 text-center border-r border-slate-400">Posted</th>
                    <th className="p-1.5 text-center border-r border-slate-400">Out of Unit</th>
                    <th className="p-1.5 text-center border-r border-slate-400">Present in Unit</th>
                    <th className="p-1.5 text-center border-r border-slate-400">Off Parade (Duty)</th>
                    <th className="p-1.5 text-center border-r border-slate-400 bg-emerald-100 font-bold">On Parade</th>
                    <th className="p-1.5 text-center">On Parade %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 font-mono text-[10px]">
                  {batterySummaries.map((b) => (
                    <tr key={b.battery} className="hover:bg-slate-50">
                      <td className="p-1.5 font-bold border-r border-slate-300">{b.battery}</td>
                      <td className="p-1.5 text-center border-r border-slate-300">{b.totalPosted}</td>
                      <td className="p-1.5 text-center border-r border-slate-300 text-rose-700 font-bold">
                        {b.outOfUnit}
                      </td>
                      <td className="p-1.5 text-center border-r border-slate-300">{b.presentInUnit}</td>
                      <td className="p-1.5 text-center border-r border-slate-300 text-amber-800 font-bold">
                        {b.offParade}
                      </td>
                      <td className="p-1.5 text-center border-r border-slate-300 bg-emerald-50/50 font-bold text-emerald-900">
                        {b.onParade}
                      </td>
                      <td className="p-1.5 text-center font-bold">
                        {b.onParadePercentage}%
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-800 text-[10px]">
                    <td className="p-1.5 border-r border-slate-300 uppercase">Regiment Total</td>
                    <td className="p-1.5 text-center border-r border-slate-300">{regtSummary.totalPosted}</td>
                    <td className="p-1.5 text-center border-r border-slate-300 text-rose-800">{regtSummary.outOfUnit}</td>
                    <td className="p-1.5 text-center border-r border-slate-300">{regtSummary.presentInUnit}</td>
                    <td className="p-1.5 text-center border-r border-slate-300 text-amber-800">{regtSummary.offParade}</td>
                    <td className="p-1.5 text-center border-r border-slate-300 bg-emerald-100 text-emerald-950 font-black">
                      {regtSummary.onParade}
                    </td>
                    <td className="p-1.5 text-center font-black">
                      {regtSummary.onParadePercentage}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Part III: Executive Duty Detailing Roster */}
            <div className="mt-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-900 mb-1 border-b border-slate-800 pb-0.5 font-mono flex items-center justify-between">
                <span>2. OPERATIONAL DUTY DETAILING (SECURITY, FATIGUE & FIXED DUTIES)</span>
                <span className="text-[9px] text-slate-600 font-bold">Total Detailed: {dutyAssignments.length}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* 1. Unit Security */}
                <div className="border border-slate-400 rounded p-1.5 bg-slate-50/70 space-y-1">
                  <div className="text-[10px] font-bold font-mono text-slate-900 border-b border-slate-300 pb-0.5 flex items-center justify-between">
                    <span className="uppercase">1. Unit Security (Unit Sy)</span>
                    <span className="bg-slate-200 px-1 rounded">{categorizedDuties.unitSy.length}</span>
                  </div>
                  {categorizedDuties.unitSy.length > 0 ? (
                    <div className="space-y-0.5 text-[10px] font-mono">
                      {categorizedDuties.unitSy.slice(0, 7).map((d) => (
                        <div key={d.id} className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900 truncate">
                            {d.dutyName}: {d.rank} {d.name}
                          </span>
                          <span className="text-slate-600 text-[9px]">({d.battery})</span>
                        </div>
                      ))}
                      {categorizedDuties.unitSy.length > 7 && (
                        <div className="text-[9px] text-slate-500 italic">
                          + {categorizedDuties.unitSy.length - 7} more guards
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[9px] text-slate-500 italic">Nil assigned</div>
                  )}
                </div>

                {/* 2. Working Parties */}
                <div className="border border-slate-400 rounded p-1.5 bg-slate-50/70 space-y-1">
                  <div className="text-[10px] font-bold font-mono text-slate-900 border-b border-slate-300 pb-0.5 flex items-center justify-between">
                    <span className="uppercase">2. Working Parties (Fatigue)</span>
                    <span className="bg-slate-200 px-1 rounded">{categorizedDuties.working.length}</span>
                  </div>
                  {categorizedDuties.working.length > 0 ? (
                    <div className="space-y-0.5 text-[10px] font-mono">
                      {categorizedDuties.working.slice(0, 7).map((d) => (
                        <div key={d.id} className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900 truncate">
                            {d.dutyName}: {d.rank} {d.name}
                          </span>
                          <span className="text-slate-600 text-[9px]">({d.battery})</span>
                        </div>
                      ))}
                      {categorizedDuties.working.length > 7 && (
                        <div className="text-[9px] text-slate-500 italic">
                          + {categorizedDuties.working.length - 7} more working
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[9px] text-slate-500 italic">Nil assigned</div>
                  )}
                </div>

                {/* 3. Fixed Duties */}
                <div className="border border-slate-400 rounded p-1.5 bg-slate-50/70 space-y-1">
                  <div className="text-[10px] font-bold font-mono text-slate-900 border-b border-slate-300 pb-0.5 flex items-center justify-between">
                    <span className="uppercase">3. Fixed Regimental Duties</span>
                    <span className="bg-slate-200 px-1 rounded">{categorizedDuties.fixedDuty.length}</span>
                  </div>
                  {categorizedDuties.fixedDuty.length > 0 ? (
                    <div className="space-y-0.5 text-[10px] font-mono">
                      {categorizedDuties.fixedDuty.slice(0, 7).map((d) => (
                        <div key={d.id} className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900 truncate">
                            {d.dutyName}: {d.rank} {d.name}
                          </span>
                          <span className="text-slate-600 text-[9px]">({d.battery})</span>
                        </div>
                      ))}
                      {categorizedDuties.fixedDuty.length > 7 && (
                        <div className="text-[9px] text-slate-500 italic">
                          + {categorizedDuties.fixedDuty.length - 7} more fixed
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[9px] text-slate-500 italic">Nil assigned</div>
                  )}
                </div>

                {/* 4. Others & Special */}
                <div className="border border-slate-400 rounded p-1.5 bg-slate-50/70 space-y-1">
                  <div className="text-[10px] font-bold font-mono text-slate-900 border-b border-slate-300 pb-0.5 flex items-center justify-between">
                    <span className="uppercase">4. Others & Special Tasks</span>
                    <span className="bg-slate-200 px-1 rounded">{categorizedDuties.others.length}</span>
                  </div>
                  {categorizedDuties.others.length > 0 ? (
                    <div className="space-y-0.5 text-[10px] font-mono">
                      {categorizedDuties.others.slice(0, 7).map((d) => (
                        <div key={d.id} className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900 truncate">
                            {d.dutyName}: {d.rank} {d.name}
                          </span>
                          <span className="text-slate-600 text-[9px]">({d.battery})</span>
                        </div>
                      ))}
                      {categorizedDuties.others.length > 7 && (
                        <div className="text-[9px] text-slate-500 italic">
                          + {categorizedDuties.others.length - 7} more tasks
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[9px] text-slate-500 italic">Nil assigned</div>
                  )}
                </div>
              </div>
            </div>

            {/* Part IV: Key Out of Unit Officers & Strength Breakdown */}
            <div className="mt-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-900 mb-1 border-b border-slate-800 pb-0.5 font-mono flex items-center justify-between">
                <span>3. OUT OF UNIT SUMMARY & ABSENTEES</span>
                <span className="text-[9px] text-slate-600">Total: {regtSummary.outOfUnit}</span>
              </div>

              <div className="p-2 bg-slate-50 border border-slate-300 rounded text-[10px] font-mono flex flex-wrap items-center justify-between gap-2">
                <div>
                  Leave (P/Lve & C/Lve): <strong>{regtSummary.outOfUnitBreakdown.leave}</strong>
                </div>
                <div>
                  Course / Trg: <strong>{regtSummary.outOfUnitBreakdown.course}</strong>
                </div>
                <div>
                  CMH / Hospital: <strong>{regtSummary.outOfUnitBreakdown.sick}</strong>
                </div>
                <div>
                  Temp Duty / Comd: <strong>{regtSummary.outOfUnitBreakdown.tempDuty}</strong>
                </div>
                <div>
                  Attached Out / ERE: <strong>{regtSummary.outOfUnitBreakdown.attachedOut}</strong>
                </div>
                <div>
                  AWOL: <strong>{regtSummary.outOfUnitBreakdown.awol}</strong>
                </div>
              </div>

              {outOfUnitOfficers.length > 0 && (
                <div className="mt-1 text-[9px] font-mono text-slate-700 bg-amber-50/70 border border-amber-300 p-1.5 rounded">
                  <strong>Officers/JCOs Away: </strong>
                  {outOfUnitOfficers.map((o) => `${o.rk} ${o.name} (${o.outOfUnitCategory || o.status})`).join(', ')}
                </div>
              )}
            </div>

            {/* Part V: Military Sign-Off & Official Authentication */}
            <div className="mt-4 pt-3 border-t border-slate-400 grid grid-cols-3 text-center text-xs font-mono">
              <div className="space-y-1">
                <div className="h-8 flex items-end justify-center font-serif italic text-[11px] text-slate-700">
                  {dutyStatus.savedBy || 'SWO Nasir, RSM'}
                </div>
                <div className="border-t border-slate-600 pt-0.5 font-bold uppercase text-[10px]">
                  Regimental Sergeant Major (RSM)
                </div>
                <div className="text-[9px] text-slate-500">10 Medium Regiment Artillery</div>
              </div>

              <div className="space-y-1">
                <div className="h-8 flex items-end justify-center font-serif italic text-[11px] text-slate-700">
                  {adjutantName}, Adjt
                </div>
                <div className="border-t border-slate-600 pt-0.5 font-bold uppercase text-[10px]">
                  Adjutant (Adjt)
                </div>
                <div className="text-[9px] text-slate-500">10 Medium Regiment Artillery</div>
              </div>

              <div className="space-y-1">
                <div className="h-8 flex items-end justify-center font-serif italic text-[11px] text-slate-700">
                  {coName}
                </div>
                <div className="border-t border-slate-600 pt-0.5 font-bold uppercase text-[10px]">
                  Commanding Officer (CO)
                </div>
                <div className="text-[9px] text-slate-500">10 Medium Regiment Artillery</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
