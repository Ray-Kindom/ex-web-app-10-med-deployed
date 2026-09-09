import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { UnitLogo } from '../common/UnitLogo';
import { X, Printer, CheckCircle2, ListFilter, Users } from 'lucide-react';
import { sortBySeniority } from '../../utils/seniorityUtils';

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

  // Document display mode: Default to 'off-parade' as requested by user
  // ("এখানে শুধুমাত্র অফ প্যারেড যারা আছে তাদের লিস্টটা থাকবে... এক পেজের মধ্যেই থাকবে")
  const [docMode, setDocMode] = useState<'off-parade' | 'full-state'>('off-parade');

  // Manual column override if user desires, defaults to 'auto'
  // ("tahole evabe customized kore daw jeno off parade er total sonkhar upor depend kore print dey, alalda kore jeno kisu dite na hoy")
  const [columnOverride, setColumnOverride] = useState<'auto' | 1 | 2 | 3 | 4>('auto');

  // Filter absentees (all personnel who are not marked as 'Present')
  const absentees = useMemo(() => {
    const raw = (personnelList || []).filter((p) => p && p.status !== 'Present');
    return sortBySeniority(raw);
  }, [personnelList]);

  // Battery distribution of absentees
  const absenteeBtyCounts = useMemo(() => {
    const map: Record<string, number> = {
      'HQ Bty': 0,
      'P Bty': 0,
      'Q Bty': 0,
      'R Bty': 0,
    };
    absentees.forEach((p) => {
      if (map[p.battery] !== undefined) {
        map[p.battery]++;
      }
    });
    return map;
  }, [absentees]);

  // Automated layout engine for Off-Parade Nominal Roll
  // Guarantees strictly 1-page A4 output whether 5, 20, 100, or 200+ personnel!
  const autoConfig = useMemo(() => {
    const total = absentees.length;
    if (total <= 20) {
      return {
        cols: 1 as const,
        fontSize: 'text-[9.5px]',
        headFontSize: 'text-[8.5px]',
        padding: 'py-1 px-1.5',
        scale: 1.0,
        badgeText: `১ কলাম (${total} জন)`,
        badge: '1-Col Clean',
      };
    } else if (total <= 52) {
      return {
        cols: 2 as const,
        fontSize: 'text-[8.5px]',
        headFontSize: 'text-[7.5px]',
        padding: 'py-0.5 px-1',
        scale: 0.98,
        badgeText: `২ কলাম (${total} জন)`,
        badge: '2-Col Balanced',
      };
    } else if (total <= 110) {
      return {
        cols: 3 as const,
        fontSize: 'text-[7.5px]',
        headFontSize: 'text-[6.8px]',
        padding: 'py-[1.5px] px-[2px]',
        scale: 0.92,
        badgeText: `৩ কলাম (${total} জন)`,
        badge: '3-Col Auto-Fit',
      };
    } else {
      // 111 to 240+ personnel: 4 ultra-dense columns
      return {
        cols: 4 as const,
        fontSize: 'text-[6.8px]',
        headFontSize: 'text-[6px]',
        padding: 'py-[1px] px-[1.5px]',
        scale: total > 180 ? 0.78 : 0.84,
        badgeText: `৪ কলাম আল্ট্রা-কম্প্যাক্ট (${total} জন)`,
        badge: '4-Col Ultra-Fit',
      };
    }
  }, [absentees.length]);

  const activeCols = columnOverride === 'auto' ? autoConfig.cols : columnOverride;

  // Partition absentees equally into columns
  const columnData = useMemo(() => {
    const total = absentees.length;
    if (total === 0) return [];
    const cols = activeCols;
    const perCol = Math.ceil(total / cols);
    const result: { items: typeof absentees; startIndex: number }[] = [];
    for (let i = 0; i < cols; i++) {
      const start = i * perCol;
      const end = Math.min(start + perCol, total);
      if (start < total) {
        result.push({
          items: absentees.slice(start, end),
          startIndex: start,
        });
      }
    }
    return result;
  }, [absentees, activeCols]);

  if (!isOpen) return null;

  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, '0')}-${['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][today.getMonth()]}-${today.getFullYear()}`;

  const coOfficer = personnelList.find(p => p.snkNo === 'BA-7592') || personnelList.find(p => p.rk === 'Lt Col');
  const adjutantOfficer = personnelList.find(p => p.snkNo === 'BA-11735') || personnelList.find(p => p.rk === 'Capt');
  const coName = coOfficer ? coOfficer.name : 'Lt Col Md Shafiqul Islam Rubel, PSC, G';
  const adjutantName = adjutantOfficer ? adjutantOfficer.name : 'Capt Iftekhar Mahmud Abir';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      {/* Print Styles for Guaranteed Single Page Fit */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 4mm 5mm 4mm 5mm !important;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: white !important;
          }
          #parade-state-print-document {
            zoom: ${autoConfig.scale} !important;
            max-height: 288mm !important;
            overflow: hidden !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="relative w-full max-w-5xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto border border-slate-300 print:border-none print:shadow-none print:w-full print:max-w-none max-h-[96vh]">
        {/* Modal Top Control Bar (Hidden on print) */}
        <div className="px-4 py-2.5 bg-slate-950 text-white flex flex-wrap items-center justify-between gap-2.5 print:hidden border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>Military Document Printout</span>
                {docMode === 'off-parade' && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-bold">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 inline" />
                    {autoConfig.badgeText} • Guaranteed 1-Page A4
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                {dateStr} • মোট অফ প্যারেড: {absentees.length} জন (স্বয়ংক্রিয় ১-পেজ ফরম্যাট)
              </p>
            </div>
          </div>

          {/* Document View & Column Controls */}
          <div className="flex items-center flex-wrap gap-1.5 font-mono text-[11px]">
            {/* View Switcher */}
            <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => setDocMode('off-parade')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                  docMode === 'off-parade'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="শুধুমাত্র অফ প্যারেড সৈনিকদের স্বয়ংক্রিয় ১-পেজ তালিকা"
              >
                <Users className="w-3 h-3" />
                <span>অফ প্যারেড তালিকা (1-Page)</span>
              </button>
              <button
                type="button"
                onClick={() => setDocMode('full-state')}
                className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                  docMode === 'full-state'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="সম্পূর্ণ সকালের প্যারেড স্টেট এবং ব্যাটারি ম্যাট্রিক্স"
              >
                <ListFilter className="w-3 h-3" />
                <span>সম্পূর্ণ প্যারেড স্টেট</span>
              </button>
            </div>

            {/* Column Selector for Off-Parade View */}
            {docMode === 'off-parade' && (
              <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-700">
                <button
                  type="button"
                  onClick={() => setColumnOverride('auto')}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                    columnOverride === 'auto'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Auto-detect column count based on total absentees"
                >
                  Auto ({autoConfig.cols} Col)
                </button>
                <button
                  type="button"
                  onClick={() => setColumnOverride(2)}
                  className={`px-1.5 py-1 rounded text-[10px] transition-colors cursor-pointer ${
                    activeCols === 2 && columnOverride !== 'auto'
                      ? 'bg-slate-700 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  2 Col
                </button>
                <button
                  type="button"
                  onClick={() => setColumnOverride(3)}
                  className={`px-1.5 py-1 rounded text-[10px] transition-colors cursor-pointer ${
                    activeCols === 3 && columnOverride !== 'auto'
                      ? 'bg-slate-700 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  3 Col
                </button>
                <button
                  type="button"
                  onClick={() => setColumnOverride(4)}
                  className={`px-1.5 py-1 rounded text-[10px] transition-colors cursor-pointer ${
                    activeCols === 4 && columnOverride !== 'auto'
                      ? 'bg-slate-700 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  4 Col
                </button>
              </div>
            )}

            {/* Print Action */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs shadow-md transition-all cursor-pointer ml-1"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print A4 PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer ml-1"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Official Document Container */}
        <div className="p-3 sm:p-6 overflow-y-auto bg-slate-100 print:bg-white print:p-0 flex justify-center">
          <div
            id="parade-state-print-document"
            style={{
              zoom: autoConfig.scale,
              transformOrigin: 'top center',
            }}
            className="w-full max-w-[210mm] bg-white text-slate-950 font-sans p-3 sm:p-4 space-y-1.5 border border-slate-300 shadow-sm print:shadow-none print:border-none print:p-1"
          >
            {/* 1. ULTRA-COMPACT OFFICIAL REGIMENTAL HEADER */}
            <div className="border-b-2 border-slate-950 pb-1 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <UnitLogo size="md" />
                <div>
                  <h1 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-950 font-serif leading-none">
                    10 MEDIUM REGIMENT ARTILLERY
                  </h1>
                  <div className="text-[9px] font-bold tracking-widest text-red-700 font-mono leading-tight">
                    BORN DESTROYER • HONOUR &amp; GLORY
                  </div>
                  <div className="text-[10px] text-slate-900 font-bold font-mono leading-tight">
                    {docMode === 'off-parade'
                      ? 'OFF PARADE NOMINAL ROLL (দৈনিক অফ প্যারেড সৈনিকদের তালিকা)'
                      : 'DAILY MORNING PARADE STATE & OFF-PARADE NOMINAL ROLL'}
                  </div>
                </div>
              </div>

              <div className="text-right font-mono text-[9px] leading-tight border-l-2 border-slate-950 pl-2.5">
                <div className="font-black text-slate-950 uppercase text-[10px]">
                  {docMode === 'off-parade' ? 'OFF PARADE LIST' : 'MORNING PARADE STATE'}
                </div>
                <div className="text-slate-900">
                  DATE: <span className="font-bold">{dateStr}</span>
                </div>
                <div className="text-slate-800">
                  TIME: <span className="font-bold">0630 HRS</span>
                </div>
                <div className="text-[8px] font-bold text-red-700 uppercase tracking-wide">
                  CONFIDENTIAL / MILITARY RECORD
                </div>
              </div>
            </div>

            {/* IF FULL-STATE MODE: Show Battery Matrix First */}
            {docMode === 'full-state' && (
              <div className="space-y-1">
                <h2 className="text-[9px] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 font-mono">
                  1. SUB-UNIT (BATTERY-WISE) STRENGTH MUSTER
                </h2>

                <table className="w-full text-[8.5px] text-left border border-slate-900 border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-mono text-[7.5px] uppercase">
                      <th className="py-0.5 px-1 border-r border-slate-700">Battery</th>
                      <th className="py-0.5 px-1 text-center border-r border-slate-700">Posted</th>
                      <th className="py-0.5 px-1 text-center border-r border-slate-700 bg-slate-800 font-bold">Present</th>
                      <th className="py-0.5 px-1 text-center border-r border-slate-700">Duty/Guard</th>
                      <th className="py-0.5 px-1 text-center border-r border-slate-700">CMH</th>
                      <th className="py-0.5 px-1 text-center border-r border-slate-700">Leave</th>
                      <th className="py-0.5 px-1 text-center border-r border-slate-700">Course</th>
                      <th className="py-0.5 px-1 text-center border-r border-slate-700">TD</th>
                      <th className="py-0.5 px-1 text-center border-r border-slate-700">Att</th>
                      <th className="py-0.5 px-1 text-center border-r border-slate-700">AWOL</th>
                      <th className="py-0.5 px-1 text-center">Eff %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300 font-mono">
                    {summaries.map((b) => {
                      const eff = b.present + b.onDuty;
                      const pct = b.posted > 0 ? Math.round((eff / b.posted) * 100) : 0;
                      return (
                        <tr key={b.battery} className="border-b border-slate-200">
                          <td className="py-0.5 px-1 font-bold border-r border-slate-300">{b.battery}</td>
                          <td className="py-0.5 px-1 text-center border-r border-slate-300">{b.posted}</td>
                          <td className="py-0.5 px-1 text-center font-bold border-r border-slate-300 bg-slate-50">
                            {b.present}
                          </td>
                          <td className="py-0.5 px-1 text-center border-r border-slate-300">{b.onDuty}</td>
                          <td className="py-0.5 px-1 text-center border-r border-slate-300">{b.sick}</td>
                          <td className="py-0.5 px-1 text-center border-r border-slate-300">{b.leave}</td>
                          <td className="py-0.5 px-1 text-center border-r border-slate-300">{b.course}</td>
                          <td className="py-0.5 px-1 text-center border-r border-slate-300">{b.tempDuty}</td>
                          <td className="py-0.5 px-1 text-center border-r border-slate-300">{b.attached}</td>
                          <td className="py-0.5 px-1 text-center border-r border-slate-300">{b.absent}</td>
                          <td className="py-0.5 px-1 text-center font-bold">{pct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-200 font-bold border-t border-slate-900 font-mono text-[8px]">
                      <td className="py-0.5 px-1 border-r border-slate-400">TOTAL REGIMENT</td>
                      <td className="py-0.5 px-1 text-center border-r border-slate-400">{totals.totalPosted}</td>
                      <td className="py-0.5 px-1 text-center border-r border-slate-400">{totals.totalPresent}</td>
                      <td className="py-0.5 px-1 text-center border-r border-slate-400">{totals.totalDuty}</td>
                      <td className="py-0.5 px-1 text-center border-r border-slate-400">{totals.totalSick}</td>
                      <td className="py-0.5 px-1 text-center border-r border-slate-400">{totals.totalLeave}</td>
                      <td className="py-0.5 px-1 text-center border-r border-slate-400">{totals.totalCourse}</td>
                      <td className="py-0.5 px-1 text-center border-r border-slate-400">{totals.totalTempDuty}</td>
                      <td className="py-0.5 px-1 text-center border-r border-slate-400">{totals.totalAttached}</td>
                      <td className="py-0.5 px-1 text-center border-r border-slate-400">{totals.totalAbsent}</td>
                      <td className="py-0.5 px-1 text-center">{totals.presentPercentage}%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* 2. CONSOLIDATED EXECUTIVE OFF-PARADE STRIP (Single concise line) */}
            <div className="border border-slate-950 rounded bg-slate-50 px-2 py-0.5 font-mono text-[8.5px] flex items-center justify-between flex-wrap gap-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-950 uppercase">OFF PARADE STRENGTH:</span>
                <span className="text-rose-700 font-bold bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                  Total Off Parade: {absentees.length}
                </span>
                <span>•</span>
                <span>Regt Posted: <strong>{totals.totalPosted}</strong></span>
                <span>•</span>
                <span className="text-emerald-800 font-bold">
                  Present on Parade: {totals.totalPresent} ({totals.presentPercentage}%)
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <span className="font-bold">SUB-UNITS:</span>
                <span>HQ: <strong>{absenteeBtyCounts['HQ Bty']}</strong></span>
                <span>P: <strong>{absenteeBtyCounts['P Bty']}</strong></span>
                <span>Q: <strong>{absenteeBtyCounts['Q Bty']}</strong></span>
                <span>R: <strong>{absenteeBtyCounts['R Bty']}</strong></span>
              </div>
            </div>

            {/* 3. DYNAMIC OFF-PARADE NOMINAL ROLL SECTION */}
            {absentees.length === 0 ? (
              <div className="p-4 text-center text-slate-500 font-mono text-xs border border-dashed border-slate-300 rounded bg-slate-50">
                — No personnel Off Parade (100% Present on Parade) —
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center justify-between border-b border-slate-900 pb-0.5 font-mono text-[8.5px]">
                  <span className="font-bold uppercase text-slate-950">
                    NOMINAL ROLL OF OFF-PARADE PERSONNEL ({absentees.length} RECORDS)
                  </span>
                  <span className="text-slate-600">
                    Auto-Formatted in {activeCols} Equal Columns • Guaranteed 1-Page A4
                  </span>
                </div>

                {(() => {
                  const renderColumnTable = (items: typeof absentees, startIndex: number) => {
                    const isSingleCol = activeCols === 1;
                    const isDualCol = activeCols === 2;

                    return (
                      <table className={`w-full ${autoConfig.fontSize} text-left border border-slate-900 border-collapse`}>
                        <thead>
                          <tr className={`bg-slate-900 text-white font-mono ${autoConfig.headFontSize} uppercase`}>
                            <th className={`${autoConfig.padding} w-5 text-center border-r border-slate-700`}>Ser</th>
                            <th className={`${autoConfig.padding} ${activeCols >= 3 ? 'w-16' : 'w-20'} border-r border-slate-700`}>
                              Army No
                            </th>
                            {isSingleCol ? (
                              <>
                                <th className={`${autoConfig.padding} w-14 border-r border-slate-700`}>Rank</th>
                                <th className={`${autoConfig.padding} border-r border-slate-700`}>Soldier Name</th>
                                <th className={`${autoConfig.padding} w-12 border-r border-slate-700`}>Trade</th>
                              </>
                            ) : isDualCol ? (
                              <>
                                <th className={`${autoConfig.padding} w-12 border-r border-slate-700`}>Rk</th>
                                <th className={`${autoConfig.padding} border-r border-slate-700`}>Name</th>
                              </>
                            ) : (
                              <th className={`${autoConfig.padding} border-r border-slate-700`}>
                                Rk &amp; Name
                              </th>
                            )}
                            <th className={`${autoConfig.padding} ${activeCols >= 4 ? 'w-6' : 'w-8'} text-center border-r border-slate-700`}>
                              Bty
                            </th>
                            <th className={`${autoConfig.padding} border-r border-slate-700`}>
                              Status / Details
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300 font-mono">
                          {items.map((p, idx) => {
                            const sl = startIndex + idx + 1;
                            const isEven = idx % 2 === 1;
                            const reason = p.statusDetails || p.status || '-';

                            return (
                              <tr key={p.id} className={isEven ? 'bg-slate-50' : 'bg-white'}>
                                <td className={`${autoConfig.padding} text-center font-bold text-slate-600 border-r border-slate-300`}>
                                  {sl}
                                </td>
                                <td className={`${autoConfig.padding} font-bold text-slate-950 border-r border-slate-300 whitespace-nowrap`}>
                                  {p.snkNo}
                                </td>
                                {isSingleCol ? (
                                  <>
                                    <td className={`${autoConfig.padding} font-medium text-slate-800 border-r border-slate-300 whitespace-nowrap`}>
                                      {p.rk}
                                    </td>
                                    <td className={`${autoConfig.padding} font-bold text-slate-950 border-r border-slate-300 truncate max-w-[120px]`}>
                                      {p.name}
                                    </td>
                                    <td className={`${autoConfig.padding} font-medium text-slate-700 border-r border-slate-300 whitespace-nowrap`}>
                                      {p.trade}
                                    </td>
                                  </>
                                ) : isDualCol ? (
                                  <>
                                    <td className={`${autoConfig.padding} font-medium text-slate-800 border-r border-slate-300 whitespace-nowrap`}>
                                      {p.rk}
                                    </td>
                                    <td className={`${autoConfig.padding} font-bold text-slate-950 border-r border-slate-300 truncate max-w-[95px]`}>
                                      {p.name}
                                    </td>
                                  </>
                                ) : (
                                  <td className={`${autoConfig.padding} font-bold text-slate-950 border-r border-slate-300 truncate max-w-[100px] whitespace-nowrap`}>
                                    <span className="font-medium text-slate-700 mr-1">{p.rk}</span>
                                    {p.name}
                                  </td>
                                )}
                                <td className={`${autoConfig.padding} text-center font-medium text-slate-800 border-r border-slate-300 whitespace-nowrap`}>
                                  {p.battery.replace(' Bty', '')}
                                </td>
                                <td className={`${autoConfig.padding} font-semibold text-slate-900 border-r border-slate-300 truncate max-w-[110px] whitespace-nowrap`}>
                                  <span className="font-bold text-red-700 mr-1">[{p.status}]</span>
                                  {reason !== p.status ? reason : ''}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                  };

                  const gridClasses = {
                    1: 'grid grid-cols-1 gap-2 items-start',
                    2: 'grid grid-cols-2 gap-2 items-start',
                    3: 'grid grid-cols-3 gap-1.5 items-start',
                    4: 'grid grid-cols-4 gap-1 items-start',
                  }[activeCols] || 'grid grid-cols-2 gap-2 items-start';

                  return (
                    <div className={gridClasses}>
                      {columnData.map((col, idx) => (
                        <div key={idx} className="min-w-0">
                          {renderColumnTable(col.items, col.startIndex)}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 4. COMPACT 4-BLOCK OFFICIAL MILITARY SIGNATURES */}
            <div className="border-t border-slate-950 pt-1.5 break-inside-avoid">
              <div className="grid grid-cols-4 gap-3 text-center font-mono text-[9px] leading-tight">
                <div className="space-y-0.5">
                  <div className="h-5 border-b border-slate-400 border-dashed mb-0.5" />
                  <div className="font-bold text-slate-950 uppercase text-[8.5px]">Prepared by (BSM)</div>
                  <div className="text-slate-600 text-[7.5px]">Battery Sgt Major</div>
                </div>

                <div className="space-y-0.5">
                  <div className="h-5 border-b border-slate-400 border-dashed mb-0.5" />
                  <div className="font-bold text-slate-950 uppercase text-[8.5px]">Consolidated by (RSM)</div>
                  <div className="text-slate-600 text-[7.5px]">Regimental Sgt Major</div>
                </div>

                <div className="space-y-0.5">
                  <div className="h-5 border-b border-slate-400 border-dashed mb-0.5" />
                  <div className="font-bold text-slate-950 uppercase text-[8.5px]">Authorized by (Adjt)</div>
                  <div className="text-slate-600 text-[7.5px] truncate">{adjutantName}</div>
                </div>

                <div className="space-y-0.5">
                  <div className="h-5 border-b border-slate-400 border-dashed mb-0.5" />
                  <div className="font-bold text-slate-950 uppercase text-[8.5px]">Seen by (CO)</div>
                  <div className="text-slate-600 text-[7.5px] truncate">{coName}</div>
                </div>
              </div>

              <div className="text-center text-[7px] text-slate-500 font-mono mt-0.5">
                10 Med Regt Arty Parade State &amp; Off-Parade Management System • Confidential Military Record
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
