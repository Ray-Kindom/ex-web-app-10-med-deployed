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
    theme,
  } = useApp();

  const isLight = theme === 'light';

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
    <div className={`rounded-xl overflow-hidden shadow-xl border transition-colors duration-200 ${
      isLight ? 'bg-white border-slate-200 text-slate-900 shadow-md' : 'bg-slate-900 border-slate-800 text-white'
    }`}>
      <div className={`p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        isLight
          ? 'bg-gradient-to-r from-slate-50 via-white to-slate-50 border-slate-200'
          : 'bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-slate-800'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <h3 className={`text-base font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <Layers className="w-4 h-4 text-rose-500" />
              <span>Bty Wise Parade State</span>
            </h3>
            <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded">
              0630 HRS MORNING STATE
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className={`uppercase tracking-wider text-[10px] font-mono border-b ${
              isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-950 text-slate-400 border-slate-800'
            }`}>
              <th className="p-3">Battery / Sub-Unit</th>
              <th className="p-3 text-center">Posted</th>
              <th className={`p-3 text-center ${isLight ? 'bg-emerald-50 text-emerald-800 font-bold' : 'bg-emerald-950/30 text-emerald-300'}`}>Present</th>
              <th className={`p-3 text-center ${isLight ? 'bg-blue-50 text-blue-800 font-bold' : 'bg-blue-950/30 text-blue-300'}`}>On Duty</th>
              <th
                onClick={handleSick}
                className={`p-3 text-center cursor-pointer transition-colors ${isLight ? 'text-amber-700 hover:bg-amber-50' : 'text-amber-400 hover:bg-amber-950/30'}`}
                title="Click to view CMH & Sic Nominal List"
              >
                <div className="inline-flex items-center gap-1">
                  <span>CMH/Sick</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </div>
              </th>
              <th
                onClick={handleLeave}
                className={`p-3 text-center cursor-pointer transition-colors ${isLight ? 'text-purple-700 hover:bg-purple-50' : 'text-purple-400 hover:bg-purple-950/30'}`}
                title="Click to view P/Lve & C/Lve Nominal List"
              >
                <div className="inline-flex items-center gap-1">
                  <span>Lve</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </div>
              </th>
              <th
                onClick={handleCourse}
                className={`p-3 text-center cursor-pointer transition-colors ${isLight ? 'text-cyan-800 hover:bg-cyan-50' : 'text-cyan-400 hover:bg-cyan-950/30'}`}
                title="Click to view Course Details Nominal List"
              >
                <div className="inline-flex items-center gap-1">
                  <span>Course</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </div>
              </th>
              <th
                onClick={handleComd}
                className={`p-3 text-center cursor-pointer transition-colors ${isLight ? 'text-indigo-700 hover:bg-indigo-50' : 'text-indigo-400 hover:bg-indigo-950/30'}`}
                title="Click to view Command Duty (COMD) List"
              >
                <div className="inline-flex items-center gap-1">
                  <span>COMD (TD)</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </div>
              </th>
              <th
                onClick={handleAttached}
                className={`p-3 text-center cursor-pointer transition-colors ${isLight ? 'text-teal-700 hover:bg-teal-50' : 'text-teal-400 hover:bg-teal-950/30'}`}
                title="Click to view Attached Out List"
              >
                <div className="inline-flex items-center gap-1">
                  <span>Attached</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </div>
              </th>
              <th className={`p-3 text-center ${isLight ? 'text-rose-700 font-bold' : 'text-rose-400'}`}>AWOL</th>
              <th className="p-3 text-center font-bold">Effective %</th>
              <th className="p-3 text-right">Verification</th>
            </tr>
          </thead>
          <tbody className={`divide-y font-sans ${isLight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
            {summaries.map((summary) => {
              const isSelected = selectedBattery === summary.battery;
              const effective = summary.present + summary.onDuty;
              const pct = summary.posted > 0 ? Math.round((effective / summary.posted) * 100) : 0;

              return (
                <tr
                  key={summary.battery}
                  onClick={() => onSelectBattery && onSelectBattery(summary.battery)}
                  className={`transition-colors cursor-pointer ${
                    isSelected
                      ? isLight ? 'bg-rose-50 font-semibold' : 'bg-rose-950/30 font-semibold'
                      : isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/60'
                  }`}
                >
                  <td className="p-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg border flex items-center justify-center font-mono font-bold text-xs ${
                        isLight ? 'bg-slate-100 border-slate-200 text-rose-600' : 'bg-slate-800 border-slate-700 text-rose-400'
                      }`}>
                        {summary.battery.slice(0, 1)}
                      </div>
                      <div>
                        <span className={`font-bold block ${isLight ? 'text-slate-900' : 'text-white'}`}>{summary.battery}</span>
                        <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          {summary.submittedBy}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className={`p-3 text-center font-mono font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                    {summary.posted}
                  </td>

                  <td className={`p-3 text-center font-mono font-bold ${
                    isLight ? 'text-emerald-700 bg-emerald-50' : 'text-emerald-400 bg-emerald-950/20'
                  }`}>
                    {summary.present}
                  </td>

                  <td className={`p-3 text-center font-mono font-bold ${
                    isLight ? 'text-blue-700 bg-blue-50' : 'text-blue-400 bg-blue-950/20'
                  }`}>
                    {summary.onDuty}
                  </td>

                  <td
                    onClick={(e) => {
                      if (summary.sick > 0) {
                        e.stopPropagation();
                        handleSick();
                      }
                    }}
                    className={`p-3 text-center font-mono ${isLight ? 'text-amber-700' : 'text-amber-400'} ${
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
                    className={`p-3 text-center font-mono ${isLight ? 'text-purple-700' : 'text-purple-400'} ${
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
                    className={`p-3 text-center font-mono ${isLight ? 'text-cyan-800' : 'text-cyan-400'} ${
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
                    className={`p-3 text-center font-mono ${isLight ? 'text-indigo-700' : 'text-indigo-400'} ${
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
                    className={`p-3 text-center font-mono ${isLight ? 'text-teal-700' : 'text-teal-400'} ${
                      summary.attached > 0 ? 'hover:underline hover:font-bold cursor-pointer' : ''
                    }`}
                  >
                    {summary.attached > 0 ? summary.attached : '-'}
                  </td>

                  <td className={`p-3 text-center font-mono font-bold ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>
                    {summary.absent > 0 ? summary.absent : '0'}
                  </td>

                  <td className="p-3 text-center font-mono font-bold">
                    <span
                      className={`px-2 py-0.5 rounded ${
                        pct >= 90
                          ? isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-500/20 text-emerald-300'
                          : pct >= 80
                          ? isLight ? 'bg-amber-100 text-amber-800' : 'bg-amber-500/20 text-amber-300'
                          : isLight ? 'bg-rose-100 text-rose-800' : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {pct}%
                    </span>
                  </td>

                  <td className="p-3 text-right whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded border ${
                      isLight
                        ? 'text-emerald-800 bg-emerald-50 border-emerald-200 font-semibold'
                        : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                    }`}>
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
            <tr className={`font-bold border-t-2 ${
              isLight
                ? 'bg-slate-100 text-slate-900 border-slate-300'
                : 'bg-slate-950 text-slate-100 border-slate-700'
            }`}>
              <td className="p-3 uppercase font-mono tracking-wider text-rose-600 dark:text-rose-400">
                10 Med Regt Total:
              </td>
              <td className={`p-3 text-center font-mono text-base ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {totals.totalPosted}
              </td>
              <td className={`p-3 text-center font-mono text-base ${
                isLight ? 'text-emerald-800 bg-emerald-100/60 font-extrabold' : 'text-emerald-400 bg-emerald-950/40'
              }`}>
                {totals.totalPresent}
              </td>
              <td className={`p-3 text-center font-mono text-base ${
                isLight ? 'text-blue-800 bg-blue-100/60 font-extrabold' : 'text-blue-400 bg-blue-950/40'
              }`}>
                {totals.totalDuty}
              </td>
              <td
                onClick={handleSick}
                className={`p-3 text-center font-mono cursor-pointer ${
                  isLight ? 'text-amber-800 hover:bg-amber-100' : 'text-amber-400 hover:bg-amber-950/30'
                }`}
              >
                {totals.totalSick}
              </td>
              <td
                onClick={handleLeave}
                className={`p-3 text-center font-mono cursor-pointer ${
                  isLight ? 'text-purple-800 hover:bg-purple-100' : 'text-purple-400 hover:bg-purple-950/30'
                }`}
              >
                {totals.totalLeave}
              </td>
              <td
                onClick={handleCourse}
                className={`p-3 text-center font-mono cursor-pointer ${
                  isLight ? 'text-cyan-800 hover:bg-cyan-100' : 'text-cyan-400 hover:bg-cyan-950/30'
                }`}
              >
                {totals.totalCourse}
              </td>
              <td
                onClick={handleComd}
                className={`p-3 text-center font-mono cursor-pointer ${
                  isLight ? 'text-indigo-800 hover:bg-indigo-100' : 'text-indigo-400 hover:bg-indigo-950/30'
                }`}
              >
                {totals.totalTempDuty}
              </td>
              <td
                onClick={handleAttached}
                className={`p-3 text-center font-mono cursor-pointer ${
                  isLight ? 'text-teal-800 hover:bg-teal-100' : 'text-teal-400 hover:bg-teal-950/30'
                }`}
              >
                {totals.totalAttached}
              </td>
              <td className={`p-3 text-center font-mono ${isLight ? 'text-rose-700 font-extrabold' : 'text-rose-400'}`}>
                {totals.totalAbsent}
              </td>
              <td className={`p-3 text-center font-mono text-base font-bold ${
                isLight ? 'text-emerald-700' : 'text-emerald-300'
              }`}>
                {totals.presentPercentage}%
              </td>
              <td className={`p-3 text-right text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                ADJT VERIFIED
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
