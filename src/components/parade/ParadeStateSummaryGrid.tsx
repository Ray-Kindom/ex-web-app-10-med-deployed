import React from 'react';
import { useApp } from '../../context/AppContext';
import { Battery, OutOfUnitCategory } from '../../types';
import { Building, CheckCircle2, AlertTriangle, Layers, ExternalLink } from 'lucide-react';

interface ParadeStateSummaryGridProps {
  onSelectBattery?: (bty: Battery) => void;
  selectedBattery?: Battery | 'All';
  onOpenPrintModal?: () => void;
  onOpenLeaveModal?: () => void;
  onOpenCourseModal?: () => void;
  onOpenSickModal?: () => void;
  onOpenComdModal?: () => void;
}

export const ParadeStateSummaryGrid: React.FC<ParadeStateSummaryGridProps> = ({
  onSelectBattery,
  selectedBattery = 'All',
  onOpenPrintModal,
  onOpenLeaveModal,
  onOpenCourseModal,
  onOpenSickModal,
  onOpenComdModal,
}) => {
  const {
    getBatterySummaries,
    getRegimentalTotals,
    setOutOfUnitModalOpen,
    setActiveOutOfUnitCategory,
  } = useApp();

  const summaries = getBatterySummaries();
  const totals = getRegimentalTotals();

  const handleOpenCategory = (cat: OutOfUnitCategory) => {
    setActiveOutOfUnitCategory(cat);
    setOutOfUnitModalOpen(true);
  };

  const handleSick = onOpenSickModal || (() => handleOpenCategory('CMH'));
  const handleLeave = onOpenLeaveModal || (() => handleOpenCategory('P/Lve'));
  const handleCourse = onOpenCourseModal || (() => handleOpenCategory('Course'));
  const handleComd = onOpenComdModal || (() => handleOpenCategory('Comd'));
  const handleAttached = () => handleOpenCategory('Att');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-rose-500" />
              <span>Bty Wise Parade State</span>
            </h3>
            <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded">
              0630 HRS MORNING STATE
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] font-mono border-b border-slate-800">
              <th className="p-3">Battery / Sub-Unit</th>
              <th className="p-3 text-center">Posted</th>
              <th className="p-3 text-center bg-emerald-950/30 text-emerald-300">Present</th>
              <th className="p-3 text-center bg-blue-950/30 text-blue-300">On Duty</th>
              <th
                onClick={handleSick}
                className="p-3 text-center text-amber-400 hover:bg-amber-950/30 cursor-pointer transition-colors"
                title="Click to view CMH & Sic Nominal List"
              >
                <div className="inline-flex items-center gap-1">
                  <span>CMH/Sick</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </div>
              </th>
              <th
                onClick={handleLeave}
                className="p-3 text-center text-purple-400 hover:bg-purple-950/30 cursor-pointer transition-colors"
                title="Click to view P/Lve & C/Lve Nominal List"
              >
                <div className="inline-flex items-center gap-1">
                  <span>Lve</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </div>
              </th>
              <th
                onClick={handleCourse}
                className="p-3 text-center text-cyan-400 hover:bg-cyan-950/30 cursor-pointer transition-colors"
                title="Click to view Course Details Nominal List"
              >
                <div className="inline-flex items-center gap-1">
                  <span>Course</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </div>
              </th>
              <th
                onClick={handleComd}
                className="p-3 text-center text-indigo-400 hover:bg-indigo-950/30 cursor-pointer transition-colors"
                title="Click to view Command Duty (COMD) List"
              >
                <div className="inline-flex items-center gap-1">
                  <span>COMD (TD)</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </div>
              </th>
              <th
                onClick={handleAttached}
                className="p-3 text-center text-teal-400 hover:bg-teal-950/30 cursor-pointer transition-colors"
                title="Click to view Attached Out List"
              >
                <div className="inline-flex items-center gap-1">
                  <span>Attached</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </div>
              </th>
              <th className="p-3 text-center text-rose-400">AWOL</th>
              <th className="p-3 text-center font-bold">Effective %</th>
              <th className="p-3 text-right">Verification</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {summaries.map((summary) => {
              const isSelected = selectedBattery === summary.battery;
              const effective = summary.present + summary.onDuty;
              const pct = summary.posted > 0 ? Math.round((effective / summary.posted) * 100) : 0;

              return (
                <tr
                  key={summary.battery}
                  onClick={() => onSelectBattery && onSelectBattery(summary.battery)}
                  className={`hover:bg-slate-800/60 transition-colors cursor-pointer ${
                    isSelected ? 'bg-rose-950/30 font-semibold' : ''
                  }`}
                >
                  <td className="p-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-xs text-rose-400">
                        {summary.battery.slice(0, 1)}
                      </div>
                      <div>
                        <span className="font-bold text-white block">{summary.battery}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {summary.submittedBy}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="p-3 text-center font-mono font-bold text-slate-200">
                    {summary.posted}
                  </td>

                  <td className="p-3 text-center font-mono font-bold text-emerald-400 bg-emerald-950/20">
                    {summary.present}
                  </td>

                  <td className="p-3 text-center font-mono font-bold text-blue-400 bg-blue-950/20">
                    {summary.onDuty}
                  </td>

                  <td
                    onClick={(e) => {
                      if (summary.sick > 0) {
                        e.stopPropagation();
                        handleSick();
                      }
                    }}
                    className={`p-3 text-center font-mono text-amber-400 ${
                      summary.sick > 0 ? 'hover:underline hover:font-bold cursor-pointer' : ''
                    }`}
                  >
                    {summary.sick > 0 ? summary.sick : '-'}
                  </td>

                  <td
                    onClick={(e) => {
                      if (summary.leave > 0) {
                        e.stopPropagation();
                        handleLeave();
                      }
                    }}
                    className={`p-3 text-center font-mono text-purple-400 ${
                      summary.leave > 0 ? 'hover:underline hover:font-bold cursor-pointer' : ''
                    }`}
                  >
                    {summary.leave > 0 ? summary.leave : '-'}
                  </td>

                  <td
                    onClick={(e) => {
                      if (summary.course > 0) {
                        e.stopPropagation();
                        handleCourse();
                      }
                    }}
                    className={`p-3 text-center font-mono text-cyan-400 ${
                      summary.course > 0 ? 'hover:underline hover:font-bold cursor-pointer' : ''
                    }`}
                  >
                    {summary.course > 0 ? summary.course : '-'}
                  </td>

                  <td
                    onClick={(e) => {
                      if (summary.tempDuty > 0) {
                        e.stopPropagation();
                        handleComd();
                      }
                    }}
                    className={`p-3 text-center font-mono text-indigo-400 ${
                      summary.tempDuty > 0 ? 'hover:underline hover:font-bold cursor-pointer' : ''
                    }`}
                  >
                    {summary.tempDuty > 0 ? summary.tempDuty : '-'}
                  </td>

                  <td
                    onClick={(e) => {
                      if (summary.attached > 0) {
                        e.stopPropagation();
                        handleAttached();
                      }
                    }}
                    className={`p-3 text-center font-mono text-teal-400 ${
                      summary.attached > 0 ? 'hover:underline hover:font-bold cursor-pointer' : ''
                    }`}
                  >
                    {summary.attached > 0 ? summary.attached : '-'}
                  </td>

                  <td className="p-3 text-center font-mono text-rose-400 font-bold">
                    {summary.absent > 0 ? summary.absent : '0'}
                  </td>

                  <td className="p-3 text-center font-mono font-bold">
                    <span
                      className={`px-2 py-0.5 rounded ${
                        pct >= 90
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : pct >= 80
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {pct}%
                    </span>
                  </td>

                  <td className="p-3 text-right whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{summary.submissionStatus}</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Consolidated Regimental Total Footer */}
          <tfoot>
            <tr className="bg-slate-950 font-bold text-slate-100 border-t-2 border-slate-700">
              <td className="p-3 uppercase font-mono tracking-wider text-rose-400">
                10 Med Regt Total:
              </td>
              <td className="p-3 text-center font-mono text-base text-white">
                {totals.totalPosted}
              </td>
              <td className="p-3 text-center font-mono text-base text-emerald-400 bg-emerald-950/40">
                {totals.totalPresent}
              </td>
              <td className="p-3 text-center font-mono text-base text-blue-400 bg-blue-950/40">
                {totals.totalDuty}
              </td>
              <td
                onClick={handleSick}
                className="p-3 text-center font-mono text-amber-400 cursor-pointer hover:bg-amber-950/30"
              >
                {totals.totalSick}
              </td>
              <td
                onClick={handleLeave}
                className="p-3 text-center font-mono text-purple-400 cursor-pointer hover:bg-purple-950/30"
              >
                {totals.totalLeave}
              </td>
              <td
                onClick={handleCourse}
                className="p-3 text-center font-mono text-cyan-400 cursor-pointer hover:bg-cyan-950/30"
              >
                {totals.totalCourse}
              </td>
              <td
                onClick={handleComd}
                className="p-3 text-center font-mono text-indigo-400 cursor-pointer hover:bg-indigo-950/30"
              >
                {totals.totalTempDuty}
              </td>
              <td
                onClick={handleAttached}
                className="p-3 text-center font-mono text-teal-400 cursor-pointer hover:bg-teal-950/30"
              >
                {totals.totalAttached}
              </td>
              <td className="p-3 text-center font-mono text-rose-400">
                {totals.totalAbsent}
              </td>
              <td className="p-3 text-center font-mono text-base text-emerald-300 font-bold">
                {totals.presentPercentage}%
              </td>
              <td className="p-3 text-right text-[11px] font-mono text-slate-400">
                ADJT VERIFIED
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
