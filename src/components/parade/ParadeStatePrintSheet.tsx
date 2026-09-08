import React from 'react';
import { useApp } from '../../context/AppContext';
import { UnitLogo } from '../common/UnitLogo';
import { X, Printer, Download, Check } from 'lucide-react';

interface ParadeStatePrintSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ParadeStatePrintSheet: React.FC<ParadeStatePrintSheetProps> = ({
  isOpen,
  onClose,
}) => {
  const { personnelList, getBatterySummaries, getRegimentalTotals } = useApp();
  const summaries = getBatterySummaries();
  const totals = getRegimentalTotals();

  if (!isOpen) return null;

  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, '0')}-${['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][today.getMonth()]}-${today.getFullYear()}`;

  const absentees = personnelList.filter(p => p.status !== 'Present');

  const coOfficer = personnelList.find(p => p.snkNo === 'BA-7592') || personnelList.find(p => p.rk === 'Lt Col');
  const adjutantOfficer = personnelList.find(p => p.snkNo === 'BA-11735') || personnelList.find(p => p.rk === 'Capt');
  const coName = coOfficer ? coOfficer.name : 'Lt Col Md Shafiqul Islam Rubel, PSC, G';
  const adjutantName = adjutantOfficer ? adjutantOfficer.name : 'Capt Iftekhar Mahmud Abir';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto border border-slate-300 print:border-none print:shadow-none print:w-full print:max-w-none">
        {/* Modal Top Control Bar (Hidden on print) */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-rose-500" />
            <h3 className="text-sm font-bold text-white">
              Official Military Morning Parade State Document
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Document Container */}
        <div className="p-8 sm:p-12 overflow-y-auto bg-white font-sans text-slate-900 space-y-6 print:p-0 print:space-y-4">
          {/* Document Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex items-center gap-4">
              <UnitLogo size="lg" />
              <div>
                <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-900 font-serif">
                  10 MEDIUM REGIMENT ARTILLERY
                </h1>
                <div className="text-xs font-bold tracking-widest text-red-700 font-mono">
                  BORN DESTROYER • HONOUR & GLORY
                </div>
                <div className="text-xs text-slate-700 font-medium font-mono">
                  10 Medium Regiment Artillery • Bangladesh Army
                </div>
              </div>
            </div>

            <div className="text-right border-l-2 border-slate-800 pl-4 text-xs font-mono">
              <div className="font-bold text-slate-900 uppercase">MORNING PARADE STATE</div>
              <div className="text-slate-700">DATE: {dateStr}</div>
              <div className="text-slate-700">TIME: 0630 HRS</div>
              <div className="text-[10px] text-red-600 font-bold">CONFIDENTIAL / MILITARY USE</div>
            </div>
          </div>

          {/* Section 1: Consolidated Battery Matrix */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 border-b border-slate-400 pb-1 font-mono">
              1. SUB-UNIT (BATTERY-WISE) STRENGTH MUSTER
            </h2>

            <table className="w-full text-xs text-left border border-slate-800 border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-900 font-mono text-[10px] uppercase border-b border-slate-800">
                  <th className="p-2 border-r border-slate-300">Battery</th>
                  <th className="p-2 text-center border-r border-slate-300">Posted</th>
                  <th className="p-2 text-center border-r border-slate-300 bg-slate-200">Present</th>
                  <th className="p-2 text-center border-r border-slate-300">Duty/Guard</th>
                  <th className="p-2 text-center border-r border-slate-300">CMH</th>
                  <th className="p-2 text-center border-r border-slate-300">Leave</th>
                  <th className="p-2 text-center border-r border-slate-300">Course</th>
                  <th className="p-2 text-center border-r border-slate-300">TD</th>
                  <th className="p-2 text-center border-r border-slate-300">Att</th>
                  <th className="p-2 text-center border-r border-slate-300">AWOL</th>
                  <th className="p-2 text-center">Eff %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {summaries.map((b) => {
                  const eff = b.present + b.onDuty;
                  const pct = b.posted > 0 ? Math.round((eff / b.posted) * 100) : 0;
                  return (
                    <tr key={b.battery} className="border-b border-slate-200 font-mono">
                      <td className="p-2 font-bold border-r border-slate-300">{b.battery}</td>
                      <td className="p-2 text-center border-r border-slate-300">{b.posted}</td>
                      <td className="p-2 text-center font-bold border-r border-slate-300 bg-slate-50">
                        {b.present}
                      </td>
                      <td className="p-2 text-center border-r border-slate-300">{b.onDuty}</td>
                      <td className="p-2 text-center border-r border-slate-300">{b.sick}</td>
                      <td className="p-2 text-center border-r border-slate-300">{b.leave}</td>
                      <td className="p-2 text-center border-r border-slate-300">{b.course}</td>
                      <td className="p-2 text-center border-r border-slate-300">{b.tempDuty}</td>
                      <td className="p-2 text-center border-r border-slate-300">{b.attached}</td>
                      <td className="p-2 text-center border-r border-slate-300">{b.absent}</td>
                      <td className="p-2 text-center font-bold">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-200 font-bold border-t-2 border-slate-900 font-mono text-xs">
                  <td className="p-2 border-r border-slate-400">TOTAL REGIMENT</td>
                  <td className="p-2 text-center border-r border-slate-400">{totals.totalPosted}</td>
                  <td className="p-2 text-center border-r border-slate-400">{totals.totalPresent}</td>
                  <td className="p-2 text-center border-r border-slate-400">{totals.totalDuty}</td>
                  <td className="p-2 text-center border-r border-slate-400">{totals.totalSick}</td>
                  <td className="p-2 text-center border-r border-slate-400">{totals.totalLeave}</td>
                  <td className="p-2 text-center border-r border-slate-400">{totals.totalCourse}</td>
                  <td className="p-2 text-center border-r border-slate-400">{totals.totalTempDuty}</td>
                  <td className="p-2 text-center border-r border-slate-400">{totals.totalAttached}</td>
                  <td className="p-2 text-center border-r border-slate-400">{totals.totalAbsent}</td>
                  <td className="p-2 text-center">{totals.presentPercentage}%</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Section 2: Nominal Breakdown of Personnel on Duty / Out of Parade */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 border-b border-slate-400 pb-1 font-mono">
              2. NOMINAL BREAKDOWN OF OFF-PARADE PERSONNEL ({absentees.length} Records)
            </h2>

            <table className="w-full text-[11px] text-left border border-slate-800 border-collapse">
              <thead>
                <tr className="bg-slate-100 font-mono text-[10px] uppercase border-b border-slate-800">
                  <th className="p-1.5 border-r border-slate-300">Ser</th>
                  <th className="p-1.5 border-r border-slate-300">Snk No</th>
                  <th className="p-1.5 border-r border-slate-300">Rk</th>
                  <th className="p-1.5 border-r border-slate-300">Trade</th>
                  <th className="p-1.5 border-r border-slate-300">Soldier Name</th>
                  <th className="p-1.5 border-r border-slate-300">Bty</th>
                  <th className="p-1.5 border-r border-slate-300">Status</th>
                  <th className="p-1.5">Remarks / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {absentees.map((p, idx) => (
                  <tr key={p.id} className="border-b border-slate-200">
                    <td className="p-1.5 font-mono text-center border-r border-slate-300">{idx + 1}</td>
                    <td className="p-1.5 font-mono font-bold border-r border-slate-300">{p.snkNo}</td>
                    <td className="p-1.5 font-mono border-r border-slate-300">{p.rk}</td>
                    <td className="p-1.5 font-mono border-r border-slate-300">{p.trade}</td>
                    <td className="p-1.5 font-semibold border-r border-slate-300">{p.name}</td>
                    <td className="p-1.5 font-mono border-r border-slate-300">{p.battery}</td>
                    <td className="p-1.5 font-mono font-bold border-r border-slate-300">{p.status}</td>
                    <td className="p-1.5 text-slate-700">{p.statusDetails || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 3: Official Sign-Off Blocks */}
          <div className="pt-6 border-t-2 border-slate-800 grid grid-cols-4 gap-4 text-center text-xs font-mono">
            <div className="space-y-8">
              <div className="text-[10px] text-slate-500">Prepared by</div>
              <div className="border-t border-slate-800 pt-1 font-bold">
                <div>SWO Jafor / WO Hamid</div>
                <div className="text-[10px] text-slate-600 font-normal">Battery Sgt Major (BSM)</div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="text-[10px] text-slate-500">Consolidated by</div>
              <div className="border-t border-slate-800 pt-1 font-bold">
                <div>SWO Nasir</div>
                <div className="text-[10px] text-slate-600 font-normal">Regimental Sgt Major (RSM)</div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="text-[10px] text-slate-500">Authorized by</div>
              <div className="border-t border-slate-800 pt-1 font-bold">
                <div>{adjutantName}</div>
                <div className="text-[10px] text-slate-600 font-normal">Adjutant, 10 Med Regt Arty</div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="text-[10px] text-slate-500">Seen by</div>
              <div className="border-t border-slate-800 pt-1 font-bold">
                <div>{coName}</div>
                <div className="text-[10px] text-slate-600 font-normal">Commanding Officer (CO)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
