import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UnitLogo } from '../common/UnitLogo';
import { ParadeDutyCategory, Battery } from '../../types';
import { normalizeDutyName } from '../../utils/paradeCalculations';
import { Printer, X, ShieldAlert, CheckCircle2, Columns, List, ZoomIn, ZoomOut, RotateCcw, Download, FileSpreadsheet } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface DutyDetailPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  sessionType: string;
  filterBattery?: Battery | 'Consolidated';
}

const CATEGORY_META: Record<
  ParadeDutyCategory,
  { num: string; title: string; shortTitle: string }
> = {
  Team: {
    num: '1.',
    title: 'TEAMS & CADRES / SPECIAL SQUADS',
    shortTitle: 'Teams / Squads',
  },
  'Unit Sy': {
    num: '2.',
    title: 'UNIT SECURITY (UNIT SY)',
    shortTitle: 'Unit Security',
  },
  working: {
    num: '3.',
    title: 'WORKING PARTIES (FATIGUE & RATIONS)',
    shortTitle: 'Working Parties',
  },
  'Fixed Duty': {
    num: '4.',
    title: 'FIXED SUB-UNIT & REGIMENTAL DUTIES',
    shortTitle: 'Fixed Duty',
  },
  Others: {
    num: '5.',
    title: 'OTHERS & SPECIAL OPERATIONAL TASKS',
    shortTitle: 'Others & Special',
  },
};

const ORDERED_CATEGORIES: ParadeDutyCategory[] = ['Team', 'Unit Sy', 'working', 'Fixed Duty', 'Others'];

export const DutyDetailPrintModal: React.FC<DutyDetailPrintModalProps> = ({
  isOpen,
  onClose,
  date,
  sessionType,
  filterBattery = 'Consolidated',
}) => {
  const { getParadeDutyAssignments, getParadeSummary, currentUser, getDutySessionStatus } = useApp();
  const dutyStatus = getDutySessionStatus(date, sessionType);

  const allAssignments = useMemo(() => {
    const raw = getParadeDutyAssignments(date, sessionType);
    const filtered =
      !filterBattery || filterBattery === 'Consolidated'
        ? raw
        : raw.filter((a) => a.battery === filterBattery);

    return filtered
      .map((a) => ({
        ...a,
        dutyName: normalizeDutyName(a.dutyName || 'General'),
      }))
      .sort((a, b) => {
        const catIdxA = ORDERED_CATEGORIES.indexOf(a.category);
        const catIdxB = ORDERED_CATEGORIES.indexOf(b.category);
        if (catIdxA !== catIdxB) return catIdxA - catIdxB;
        if (a.dutyName !== b.dutyName) return a.dutyName.localeCompare(b.dutyName);
        return a.snkNo.localeCompare(b.snkNo);
      });
  }, [getParadeDutyAssignments, date, sessionType, filterBattery]);

  const paradeSummary = useMemo(() => {
    return getParadeSummary(filterBattery, date, sessionType);
  }, [getParadeSummary, filterBattery, date, sessionType]);

  const batteryCounts = useMemo(() => {
    const counts: Record<string, number> = { 'HQ Bty': 0, 'P Bty': 0, 'Q Bty': 0, 'R Bty': 0 };
    allAssignments.forEach((a) => {
      const bty = a.battery;
      if (counts[bty] !== undefined) {
        counts[bty]++;
      }
    });
    return counts;
  }, [allAssignments]);

  // Automated dynamic layout engine: strictly guarantees 1-page A4 print
  // without needing any manual configuration!
  // "jeno off parade er total sonkhar upor depend kore print dey, alalda kore jeno kisu dite na hoy"
  const autoConfig = useMemo(() => {
    const total = allAssignments.length;
    if (total <= 20) {
      return {
        cols: 1 as const,
        fontSize: 'text-[9.5px]',
        headFontSize: 'text-[8.5px]',
        padding: 'py-1 px-1.5',
        scale: 1.0,
        badgeText: `১ কলাম (${total} জন)`,
        badge: '1-Col Clean',
        gridClass: 'grid grid-cols-1 gap-2 items-start',
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
        gridClass: 'grid grid-cols-2 gap-2 items-start',
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
        gridClass: 'grid grid-cols-3 gap-1.5 items-start',
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
        gridClass: 'grid grid-cols-4 gap-1 items-start',
      };
    }
  }, [allAssignments.length]);

  // If user wants manual override (defaults to 'auto')
  const [columnOverride, setColumnOverride] = useState<'auto' | 1 | 2 | 3 | 4>('auto');
  const [scaleMode, setScaleMode] = useState<'auto' | number>('auto');
  const [layoutMode, setLayoutMode] = useState<'auto' | 'category' | 'grid'>('auto');

  const activeCols = columnOverride === 'auto' ? autoConfig.cols : columnOverride;

  const effectiveScale = useMemo(() => {
    if (typeof scaleMode === 'number') return scaleMode;
    return autoConfig.scale;
  }, [scaleMode, autoConfig.scale]);

  // Group assignments by category (for category mode if selected or for count <= 20)
  const groupedData = useMemo(() => {
    return ORDERED_CATEGORIES.map((cat) => {
      const catAssignments = allAssignments.filter((a) => a.category === cat);
      return {
        category: cat,
        meta: CATEGORY_META[cat],
        totalCount: catAssignments.length,
        personnelList: catAssignments,
      };
    });
  }, [allAssignments]);

  // Partition assignments equally among the active columns
  const columnData = useMemo(() => {
    const total = allAssignments.length;
    if (total === 0) return [];
    const cols = activeCols;
    const perCol = Math.ceil(total / cols);
    const result: { items: typeof allAssignments; startIndex: number }[] = [];
    for (let i = 0; i < cols; i++) {
      const start = i * perCol;
      const end = Math.min(start + perCol, total);
      if (start < total) {
        result.push({
          items: allAssignments.slice(start, end),
          startIndex: start,
        });
      }
    }
    return result;
  }, [allAssignments, activeCols]);

  if (!isOpen) return null;

  const formattedDate = (() => {
    try {
      const d = new Date(date);
      return d.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).toUpperCase();
    } catch {
      return date;
    }
  })();

  const printDateStr = (() => {
    try {
      const d = new Date(date);
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      return `${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()}`;
    } catch {
      return date;
    }
  })();

  const handleDownloadPdf = () => {
    try {
      const doc = new jsPDF('portrait', 'pt', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('10 MEDIUM REGIMENT ARTILLERY', pageWidth / 2, 36, { align: 'center' });

      doc.setFontSize(10);
      doc.setTextColor(185, 28, 28);
      doc.text(`DAILY PARADE DUTY DETAIL & NOMINAL ROLL (${sessionType.toUpperCase()})`, pageWidth / 2, 50, { align: 'center' });

      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(30, 58, pageWidth - 60, 26, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(`DATE: ${formattedDate.toUpperCase()}   |   SUB-UNIT: ${filterBattery.toUpperCase()}   |   TOTAL: ${allAssignments.length}`, 40, 74);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(`HQ: ${batteryCounts['HQ Bty']} | P: ${batteryCounts['P Bty']} | Q: ${batteryCounts['Q Bty']} | R: ${batteryCounts['R Bty']}`, pageWidth - 40, 74, { align: 'right' });

      const tableData = allAssignments.map((a, idx) => [
        (idx + 1).toString(),
        a.armyNo,
        a.rank,
        a.name,
        a.battery.replace(' Bty', ''),
        a.dutyName,
        a.category,
      ]);

      autoTable(doc, {
        startY: 92,
        head: [['SL', 'ARMY NO', 'RANK', 'NAME', 'BTY', 'DUTY ASSIGNMENT', 'CATEGORY']],
        body: tableData,
        theme: 'grid',
        styles: {
          fontSize: 7.5,
          cellPadding: 2.5,
          font: 'helvetica',
          textColor: [15, 23, 42],
          lineColor: [203, 213, 225],
          lineWidth: 0.5,
        },
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
        },
        columnStyles: {
          0: { cellWidth: 26, halign: 'center' },
          1: { cellWidth: 60, halign: 'center', fontStyle: 'bold' },
          2: { cellWidth: 45, halign: 'center', fontStyle: 'bold' },
          3: { cellWidth: 140, fontStyle: 'bold' },
          4: { cellWidth: 40, halign: 'center' },
          5: { cellWidth: 'auto', fontStyle: 'bold' },
          6: { cellWidth: 70, halign: 'center' },
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        margin: { left: 30, right: 30, bottom: 60, top: 40 },
        didDrawPage: (data) => {
          const str = `Page ${data.pageNumber} • 10 Medium Regiment Artillery • Duty Detail State`;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(100, 116, 139);
          doc.text(str, pageWidth / 2, pageHeight - 15, { align: 'center' });
        },
      });

      doc.save(`10_Med_Regt_Duty_Detail_${printDateStr}.pdf`);
    } catch (err) {
      console.error('Duty PDF error:', err);
    }
  };

  const handleDownloadExcel = () => {
    try {
      const rows = [
        ['10 MEDIUM REGIMENT ARTILLERY - DAILY DUTY DETAIL NOMINAL ROLL'],
        [`DATE: ${formattedDate}`, `SESSION: ${sessionType}`, `SUB-UNIT: ${filterBattery}`, `TOTAL: ${allAssignments.length}`],
        [],
        ['SL', 'Army No', 'Rank', 'Name', 'Battery', 'Duty Assignment', 'Category'],
        ...allAssignments.map((a, idx) => [
          idx + 1,
          a.armyNo,
          a.rank,
          a.name,
          a.battery,
          a.dutyName,
          a.category,
        ]),
      ];

      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Duty Detail');
      XLSX.writeFile(wb, `10_Med_Regt_Duty_Detail_${printDateStr}.xlsx`);
    } catch (err) {
      console.error('Duty Excel error:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto print:z-auto">
      {/* Strict 1-Page A4 Portrait CSS */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 4mm 5mm 4mm 5mm !important;
          }
          html, body {
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          #duty-detail-print-document,
          #duty-detail-print-document * {
            visibility: visible !important;
          }
          #duty-detail-print-document {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            max-height: 288mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: #0f172a !important;
            box-shadow: none !important;
            border: none !important;
            overflow: hidden !important;
            page-break-inside: avoid !important;
            page-break-before: avoid !important;
            page-break-after: avoid !important;
            break-inside: avoid !important;
            transform-origin: top center !important;
          }
        }
      `}</style>

      <div className="relative w-full max-w-5xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto border border-slate-300 print:border-none print:shadow-none print:w-full print:max-w-none print:rounded-none max-h-[96vh]">
        {/* Top Action & Layout Control Bar (Hidden when printing) */}
        <div className="px-4 py-2.5 bg-slate-950 text-white flex flex-wrap items-center justify-between gap-2.5 print:hidden border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>Off Parade Nominal Roll (অফ প্যারেড তালিকা)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-bold">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 inline" />
                  {autoConfig.badgeText} • Guaranteed 1-Page A4
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                {sessionType} Parade • {printDateStr} • মোট অফ প্যারেড: {allAssignments.length} জন (স্বয়ংক্রিয় ১-পেজ ফরম্যাট)
              </p>
            </div>
          </div>

          {/* Layout & Density Controls */}
          <div className="flex items-center flex-wrap gap-1.5 font-mono text-[11px]">
            {/* Quick Auto / Column Selector */}
            <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setColumnOverride('auto');
                  setLayoutMode('auto');
                }}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                  columnOverride === 'auto' && layoutMode === 'auto'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Auto-Detect columns according to total count of personnel"
              >
                Auto ({autoConfig.cols} Col)
              </button>
              <button
                type="button"
                onClick={() => {
                  setColumnOverride(2);
                  setLayoutMode('grid');
                }}
                className={`px-1.5 py-1 rounded text-[10px] transition-colors cursor-pointer ${
                  activeCols === 2 && layoutMode !== 'category'
                    ? 'bg-slate-700 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                2 Col
              </button>
              <button
                type="button"
                onClick={() => {
                  setColumnOverride(3);
                  setLayoutMode('grid');
                }}
                className={`px-1.5 py-1 rounded text-[10px] transition-colors cursor-pointer ${
                  activeCols === 3 && layoutMode !== 'category'
                    ? 'bg-slate-700 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                3 Col
              </button>
              <button
                type="button"
                onClick={() => {
                  setColumnOverride(4);
                  setLayoutMode('grid');
                }}
                className={`px-1.5 py-1 rounded text-[10px] transition-colors cursor-pointer ${
                  activeCols === 4 && layoutMode !== 'category'
                    ? 'bg-slate-700 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                4 Col
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('category')}
                className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                  layoutMode === 'category' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
                title="Category Grouped View"
              >
                <List className="w-3 h-3" />
                <span>Cat</span>
              </button>
            </div>

            {/* Download & Print Actions */}
            <button
              type="button"
              id="btn-download-duty-pdf"
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs shadow-md transition-all cursor-pointer ml-1"
              title="Download PDF directly"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              id="btn-download-duty-excel"
              onClick={handleDownloadExcel}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs transition-colors cursor-pointer"
              title="Download Excel spreadsheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Excel</span>
            </button>

            <button
              type="button"
              id="btn-confirm-print-duty-pdf"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              type="button"
              id="btn-close-duty-print-modal"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer ml-1"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-3 sm:p-6 overflow-y-auto bg-slate-100 print:bg-white print:p-0 flex justify-center">
          <div
            id="duty-detail-print-document"
            style={{
              zoom: effectiveScale,
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
                    OFF PARADE NOMINAL ROLL (দৈনিক অফ প্যারেড সৈনিকদের তালিকা)
                  </div>
                </div>
              </div>

              <div className="text-right font-mono text-[9px] leading-tight border-l-2 border-slate-950 pl-2.5">
                <div className="font-black text-slate-950 uppercase text-[10px]">
                  {sessionType.toUpperCase()} PARADE
                </div>
                <div className="text-slate-900">
                  DATE: <span className="font-bold">{printDateStr}</span>
                </div>
                <div className="text-slate-800">
                  SCOPE: <span className="font-bold uppercase">{filterBattery}</span>
                </div>
                <div className="text-[8px] font-bold text-red-700 uppercase tracking-wide">
                  CONFIDENTIAL / OPERATIONAL
                </div>
              </div>
            </div>

            {/* 2. CONSOLIDATED EXECUTIVE OFF-PARADE STRIP (Single concise line) */}
            <div className="border border-slate-950 rounded bg-slate-50 px-2 py-0.5 font-mono text-[8.5px] flex items-center justify-between flex-wrap gap-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-950 uppercase">OFF PARADE STRENGTH:</span>
                <span className="text-rose-700 font-bold bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                  Total Off Parade: {allAssignments.length}
                </span>
                <span>•</span>
                <span>Present in Unit: <strong>{paradeSummary.presentInUnit}</strong></span>
                <span>•</span>
                <span className="text-emerald-800 font-bold">
                  On Parade: {paradeSummary.onParade} ({paradeSummary.onParadePercentage}%)
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <span className="font-bold">SUB-UNITS:</span>
                <span>HQ: <strong>{batteryCounts['HQ Bty']}</strong></span>
                <span>P: <strong>{batteryCounts['P Bty']}</strong></span>
                <span>Q: <strong>{batteryCounts['Q Bty']}</strong></span>
                <span>R: <strong>{batteryCounts['R Bty']}</strong></span>
              </div>
            </div>

            {/* 3. DYNAMIC OFF-PARADE NOMINAL ROLL SECTION */}
            {allAssignments.length === 0 ? (
              <div className="p-4 text-center text-slate-500 font-mono text-xs border border-dashed border-slate-300 rounded bg-slate-50">
                — No personnel detailed for {sessionType} parade ({filterBattery}) —
              </div>
            ) : layoutMode === 'category' ? (
              /* ================= CATEGORY GROUPED VIEW ================= */
              <div className="space-y-1.5">
                {groupedData.map((group) => {
                  if (group.totalCount === 0) return null;
                  let runningIndex = 0;
                  return (
                    <div
                      key={group.category}
                      className="border border-slate-900 rounded overflow-hidden break-inside-avoid"
                    >
                      <div className="bg-slate-900 text-white px-2 py-0.5 flex items-center justify-between font-mono text-[9px]">
                        <div className="font-bold flex items-center gap-1.5">
                          <span>{group.meta.num} {group.meta.title}</span>
                        </div>
                        <span className="font-bold px-1.5 py-0.2 rounded bg-rose-600 text-white text-[8px]">
                          Strength: {group.totalCount}
                        </span>
                      </div>
                      <table className="w-full text-[9px] text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-800 font-mono text-[8px] uppercase border-b border-slate-300">
                            <th className="py-0.5 px-1.5 w-7 text-center border-r border-slate-300">Sl</th>
                            <th className="py-0.5 px-1.5 w-20 border-r border-slate-300">Army / Snk No</th>
                            <th className="py-0.5 px-1.5 w-14 border-r border-slate-300">Rank</th>
                            <th className="py-0.5 px-1.5 border-r border-slate-300">Soldier Name</th>
                            <th className="py-0.5 px-1.5 w-14 text-center border-r border-slate-300">Battery</th>
                            <th className="py-0.5 px-1.5 w-44 border-r border-slate-300">Specific Duty Role</th>
                            <th className="py-0.5 px-1.5 w-20 text-center">Sign</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono">
                          {group.personnelList.map((p, idx) => {
                            runningIndex++;
                            const isEven = idx % 2 === 1;
                            return (
                              <tr key={p.id} className={isEven ? 'bg-slate-50/70' : 'bg-white'}>
                                <td className="py-0.5 px-1.5 text-center text-slate-600 font-bold border-r border-slate-300">
                                  {runningIndex}
                                </td>
                                <td className="py-0.5 px-1.5 font-bold text-slate-950 border-r border-slate-300 whitespace-nowrap">
                                  {p.snkNo}
                                </td>
                                <td className="py-0.5 px-1.5 font-semibold text-slate-800 border-r border-slate-300 whitespace-nowrap">
                                  {p.rank}
                                </td>
                                <td className="py-0.5 px-1.5 font-bold text-slate-950 border-r border-slate-300">
                                  {p.name}
                                </td>
                                <td className="py-0.5 px-1.5 text-center font-medium text-slate-800 border-r border-slate-300 whitespace-nowrap">
                                  {p.battery.replace(' Bty', '')}
                                </td>
                                <td className="py-0.5 px-1.5 font-bold text-slate-900 border-r border-slate-300">
                                  {p.dutyName}
                                </td>
                                <td className="py-0.5 px-1.5 text-center text-slate-400 text-[8px]">
                                  ___
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ================= MULTI-COLUMN AUTO-FIT BALANCED GRID ================= */
              <div className="space-y-1">
                <div className="flex items-center justify-between border-b border-slate-900 pb-0.5 font-mono text-[8.5px]">
                  <span className="font-bold uppercase text-slate-950">
                    NOMINAL ROLL ({allAssignments.length} OFF PARADE PERSONNEL)
                  </span>
                  <span className="text-slate-600">
                    Auto-Formatted in {activeCols} Equal Columns • Guaranteed 1-Page A4
                  </span>
                </div>

                {(() => {
                  const renderColumnTable = (items: typeof allAssignments, startIndex: number) => {
                    const isSingleCol = activeCols === 1;
                    const isDualCol = activeCols === 2;

                    return (
                      <table className={`w-full ${autoConfig.fontSize} text-left border border-slate-900 border-collapse`}>
                        <thead>
                          <tr className={`bg-slate-900 text-white font-mono ${autoConfig.headFontSize} uppercase`}>
                            <th className={`${autoConfig.padding} w-5 text-center border-r border-slate-700`}>Sl</th>
                            <th className={`${autoConfig.padding} ${activeCols >= 3 ? 'w-16' : 'w-20'} border-r border-slate-700`}>
                              Army No
                            </th>
                            {isSingleCol ? (
                              <>
                                <th className={`${autoConfig.padding} w-14 border-r border-slate-700`}>Rank</th>
                                <th className={`${autoConfig.padding} border-r border-slate-700`}>Soldier Name</th>
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
                              Duty / Role
                            </th>
                            <th className={`${autoConfig.padding} ${activeCols >= 4 ? 'w-6' : 'w-8'} text-center`}>
                              Sign
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300 font-mono">
                          {items.map((p, idx) => {
                            const sl = startIndex + idx + 1;
                            const isEven = idx % 2 === 1;
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
                                      {p.rank}
                                    </td>
                                    <td className={`${autoConfig.padding} font-bold text-slate-950 border-r border-slate-300 truncate max-w-[120px]`}>
                                      {p.name}
                                    </td>
                                  </>
                                ) : isDualCol ? (
                                  <>
                                    <td className={`${autoConfig.padding} font-medium text-slate-800 border-r border-slate-300 whitespace-nowrap`}>
                                      {p.rank}
                                    </td>
                                    <td className={`${autoConfig.padding} font-bold text-slate-950 border-r border-slate-300 truncate max-w-[95px]`}>
                                      {p.name}
                                    </td>
                                  </>
                                ) : (
                                  <td className={`${autoConfig.padding} font-bold text-slate-950 border-r border-slate-300 truncate max-w-[100px] whitespace-nowrap`}>
                                    <span className="font-medium text-slate-700 mr-1">{p.rank}</span>
                                    {p.name}
                                  </td>
                                )}
                                <td className={`${autoConfig.padding} text-center font-medium text-slate-800 border-r border-slate-300 whitespace-nowrap`}>
                                  {p.battery.replace(' Bty', '')}
                                </td>
                                <td className={`${autoConfig.padding} font-semibold text-slate-900 border-r border-slate-300 truncate max-w-[90px] whitespace-nowrap`}>
                                  {p.dutyName}
                                </td>
                                <td className={`${autoConfig.padding} text-center text-slate-400 text-[7px]`}>
                                  ___
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

            {/* 4. COMPACT 3-BLOCK OFFICIAL MILITARY SIGNATURES */}
            <div className="border-t border-slate-950 pt-1.5 break-inside-avoid">
              <div className="grid grid-cols-3 gap-3 text-center font-mono text-[9px] leading-tight">
                <div className="space-y-0.5">
                  <div className="h-5 border-b border-slate-400 border-dashed mb-0.5" />
                  <div className="font-bold text-slate-950 uppercase text-[8.5px]">Detailed By (BSM)</div>
                  <div className="text-slate-600 text-[7.5px]">Battery Sergeant Major</div>
                </div>

                <div className="space-y-0.5">
                  <div className="h-5 border-b border-slate-400 border-dashed mb-0.5" />
                  <div className="font-bold text-slate-950 uppercase text-[8.5px]">Verified By (RSM)</div>
                  <div className="text-slate-600 text-[7.5px]">Regimental Sergeant Major</div>
                </div>

                <div className="space-y-0.5">
                  <div className="h-5 border-b border-slate-400 border-dashed mb-0.5" />
                  <div className="font-bold text-slate-950 uppercase text-[8.5px]">Approved By (Adjt / CO)</div>
                  <div className="text-slate-600 text-[7.5px]">10 Medium Regiment Artillery</div>
                </div>
              </div>

              <div className="text-center text-[7px] text-slate-500 font-mono mt-0.5">
                10 Med Regt Arty Off Parade Nominal Management System • Confidential Military Record
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
