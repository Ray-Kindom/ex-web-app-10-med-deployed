import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { UnitLogo } from '../common/UnitLogo';
import { X, Printer, Download, FileSpreadsheet, Users, ListFilter } from 'lucide-react';
import { sortBySeniority } from '../../utils/seniorityUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

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

  const [docMode, setDocMode] = useState<'off-parade' | 'full-state'>('off-parade');

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

  // Partition into 2 or 3 clean readable columns for display
  const columnsCount = absentees.length > 120 ? 3 : 2;
  const columnData = useMemo(() => {
    const total = absentees.length;
    if (total === 0) return [];
    const perCol = Math.ceil(total / columnsCount);
    const result: { items: typeof absentees; startIndex: number }[] = [];
    for (let i = 0; i < columnsCount; i++) {
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
  }, [absentees, columnsCount]);

  if (!isOpen) return null;

  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, '0')}-${['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][today.getMonth()]}-${today.getFullYear()}`;

  const coOfficer = personnelList.find(p => p.snkNo === 'BA-7592') || personnelList.find(p => p.rk === 'Lt Col');
  const adjutantOfficer = personnelList.find(p => p.snkNo === 'BA-11735') || personnelList.find(p => p.rk === 'Capt');
  const coName = coOfficer ? coOfficer.name : 'Lt Col Md Shafiqul Islam Rubel, PSC, G';
  const adjutantName = adjutantOfficer ? adjutantOfficer.name : 'Capt Iftekhar Mahmud Abir';

  // 1. Direct PDF Download (using jsPDF + autoTable)
  const handleDownloadPdf = () => {
    try {
      const doc = new jsPDF('portrait', 'pt', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Official Regimental Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('10 MEDIUM REGIMENT ARTILLERY', pageWidth / 2, 36, { align: 'center' });

      doc.setFontSize(10);
      doc.setTextColor(185, 28, 28);
      doc.text(
        docMode === 'off-parade'
          ? 'OFF PARADE NOMINAL ROLL (দৈনিক অফ প্যারেড সৈনিকদের তালিকা)'
          : 'DAILY MORNING PARADE STATE & NOMINAL ROLL',
        pageWidth / 2,
        50,
        { align: 'center' }
      );

      // Meta box
      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(30, 58, pageWidth - 60, 26, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(`DATE: ${dateStr}   |   TIME: 0630 HRS   |   TOTAL OFF PARADE: ${absentees.length} PERSONS`, 40, 74);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(
        `HQ: ${absenteeBtyCounts['HQ Bty']} | P: ${absenteeBtyCounts['P Bty']} | Q: ${absenteeBtyCounts['Q Bty']} | R: ${absenteeBtyCounts['R Bty']}`,
        pageWidth - 40,
        74,
        { align: 'right' }
      );

      // Table rows
      const tableData = absentees.map((p, idx) => {
        const reason = p.outOfUnitCategory || p.remarks || p.status;
        return [
          (idx + 1).toString(),
          p.snkNo,
          p.rk,
          p.trade && p.trade !== '-' ? p.trade : '',
          p.name,
          p.battery.replace(' Bty', ''),
          p.status,
          reason !== p.status ? reason : '',
        ];
      });

      autoTable(doc, {
        startY: 92,
        head: [['SL', 'ARMY NO', 'RANK', 'TRADE', 'NAME', 'BTY', 'STATUS', 'REMARKS / DETAILS']],
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
          1: { cellWidth: 55, halign: 'center', fontStyle: 'bold' },
          2: { cellWidth: 42, halign: 'center', fontStyle: 'bold' },
          3: { cellWidth: 42, halign: 'center' },
          4: { cellWidth: 140, fontStyle: 'bold' },
          5: { cellWidth: 38, halign: 'center' },
          6: { cellWidth: 65, halign: 'center', fontStyle: 'bold' },
          7: { cellWidth: 'auto' },
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        margin: { left: 30, right: 30, bottom: 65, top: 40 },
        didDrawPage: (data) => {
          const str = `Page ${data.pageNumber} • 10 Medium Regiment Artillery • Confidential Military Document`;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(100, 116, 139);
          doc.text(str, pageWidth / 2, pageHeight - 15, { align: 'center' });
        },
      });

      // Signature block
      const finalY = (doc as any).lastAutoTable?.finalY || 100;
      const neededHeight = 45;
      let sigY = finalY + 15;

      if (sigY + neededHeight > pageHeight - 30) {
        doc.addPage();
        sigY = 50;
      }

      const colW = (pageWidth - 60) / 4;
      const sigTitles = [
        { role: 'Prepared by (BSM)', sub: 'Battery Sgt Major' },
        { role: 'Consolidated by (RSM)', sub: 'Regimental Sgt Major' },
        { role: 'Authorized by (Adjt)', sub: adjutantName },
        { role: 'Seen by (CO)', sub: coName },
      ];

      sigTitles.forEach((sig, i) => {
        const x = 30 + i * colW + colW / 2;
        doc.setDrawColor(148, 163, 184);
        doc.setLineDashPattern([2, 2], 0);
        doc.line(x - colW * 0.4, sigY + 18, x + colW * 0.4, sigY + 18);
        doc.setLineDashPattern([], 0);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        doc.text(sig.role, x, sigY + 28, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(sig.sub, x, sigY + 37, { align: 'center' });
      });

      doc.save(`10_Med_Regt_Off_Parade_Roll_${dateStr}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
    }
  };

  // 2. Direct Excel Download (using xlsx)
  const handleDownloadExcel = () => {
    try {
      const rows = [
        ['10 MEDIUM REGIMENT ARTILLERY - OFF PARADE NOMINAL ROLL'],
        [`DATE: ${dateStr}`, 'TIME: 0630 HRS', `TOTAL OFF PARADE: ${absentees.length}`],
        [],
        ['SL', 'Army No', 'Rank', 'Trade', 'Name', 'Battery', 'Status', 'Remarks / Category', 'Medical Cat', 'Blood Group'],
        ...absentees.map((p, idx) => [
          idx + 1,
          p.snkNo,
          p.rk,
          p.trade && p.trade !== '-' ? p.trade : '-',
          p.name,
          p.battery,
          p.status,
          p.outOfUnitCategory || p.remarks || p.status,
          p.medicalCategory || 'AYE',
          p.bloodGroup || 'O+',
        ]),
      ];

      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Off Parade Roll');
      XLSX.writeFile(wb, `10_Med_Regt_Off_Parade_Roll_${dateStr}.xlsx`);
    } catch (err) {
      console.error('Excel export error:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      {/* Print Styles for Clean Output */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm 6mm 8mm !important;
          }
          html, body {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          #parade-state-print-document,
          #parade-state-print-document * {
            visibility: visible !important;
          }
          #parade-state-print-document {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: #0f172a !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      <div className="relative w-full max-w-5xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto border border-slate-300 print:border-none print:shadow-none print:w-full print:max-w-none max-h-[96vh]">
        {/* Simple & Clean Top Action Bar */}
        <div className="px-4 py-3 bg-slate-950 text-white flex flex-wrap items-center justify-between gap-3 print:hidden border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-1 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30">
              <UnitLogo size="sm" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>১০ মিডিয়াম রেজিমেন্ট আর্টিলারি</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 font-mono font-bold border border-red-500/30">
                  অফ প্যারেড: {absentees.length} জন
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                তারিখ: {dateStr} • সময়: ০৬৩০ ঘটিকা
              </p>
            </div>
          </div>

          {/* Simple Clean Buttons */}
          <div className="flex items-center flex-wrap gap-2 font-sans text-xs">
            {/* Mode Switcher */}
            <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800">
              <button
                type="button"
                onClick={() => setDocMode('off-parade')}
                className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  docMode === 'off-parade'
                    ? 'bg-red-700 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>অফ প্যারেড তালিকা</span>
              </button>
              <button
                type="button"
                onClick={() => setDocMode('full-state')}
                className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  docMode === 'full-state'
                    ? 'bg-red-700 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>প্যারেড স্টেট ম্যাট্রিক্স</span>
              </button>
            </div>

            {/* Direct PDF Download */}
            <button
              type="button"
              id="btn-download-pdf"
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md transition-all cursor-pointer"
              title="সরাসরি PDF ফাইল ডাউনলোড করুন"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>

            {/* Direct Excel Download */}
            <button
              type="button"
              id="btn-download-excel"
              onClick={handleDownloadExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold transition-colors cursor-pointer"
              title="Excel (.xlsx) ফাইল ডাউনলোড করুন"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Excel</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              id="btn-print-doc"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold transition-colors cursor-pointer"
              title="প্রিন্ট ডায়ালগ ওপেন করুন"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>

            {/* Close Button */}
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

        {/* Printable Document Body */}
        <div className="p-3 sm:p-6 overflow-y-auto bg-slate-100 print:bg-white print:p-0 flex justify-center">
          <div
            id="parade-state-print-document"
            className="w-full max-w-[210mm] bg-white text-slate-950 font-sans p-4 sm:p-6 space-y-3 border border-slate-300 shadow-sm print:shadow-none print:border-none print:p-0"
          >
            {/* 1. OFFICIAL REGIMENTAL HEADER */}
            <div className="border-b-2 border-slate-950 pb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <UnitLogo size="md" />
                <div>
                  <h1 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-950 font-serif leading-none">
                    10 MEDIUM REGIMENT ARTILLERY
                  </h1>
                  <div className="text-[10px] font-bold tracking-widest text-red-700 font-mono mt-0.5">
                    BORN DESTROYER • HONOUR &amp; GLORY
                  </div>
                  <div className="text-xs text-slate-900 font-bold font-mono mt-0.5">
                    {docMode === 'off-parade'
                      ? 'OFF PARADE NOMINAL ROLL (দৈনিক অফ প্যারেড সৈনিকদের তালিকা)'
                      : 'DAILY MORNING PARADE STATE & OFF-PARADE NOMINAL ROLL'}
                  </div>
                </div>
              </div>

              <div className="text-right font-mono text-[9.5px] leading-tight border-l-2 border-slate-950 pl-3">
                <div className="font-black text-slate-950 uppercase text-[10.5px]">
                  {docMode === 'off-parade' ? 'OFF PARADE LIST' : 'PARADE STATE'}
                </div>
                <div className="text-slate-900">
                  DATE: <span className="font-bold">{dateStr}</span>
                </div>
                <div className="text-slate-800">
                  TIME: <span className="font-bold">0630 HRS</span>
                </div>
                <div className="text-[8.5px] font-bold text-red-700 uppercase tracking-wide mt-0.5">
                  CONFIDENTIAL RECORD
                </div>
              </div>
            </div>

            {/* IF FULL-STATE MODE: Show Battery Matrix */}
            {docMode === 'full-state' && (
              <div className="space-y-1.5 border border-slate-400 p-2 rounded bg-slate-50/50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-800 font-mono">
                  I. BATTERY-WISE PARADE STRENGTH MATRIX
                </div>
                <table className="w-full text-[9px] border border-slate-900 text-center border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-mono">
                      <th className="py-1 px-1.5 text-left border-r border-slate-700">Battery</th>
                      <th className="py-1 px-1 border-r border-slate-700">Post</th>
                      <th className="py-1 px-1 border-r border-slate-700">Att In</th>
                      <th className="py-1 px-1 border-r border-slate-700">Att Out</th>
                      <th className="py-1 px-1 border-r border-slate-700 font-bold bg-slate-800">Effct</th>
                      <th className="py-1 px-1 border-r border-slate-700">Pres</th>
                      <th className="py-1 px-1 border-r border-slate-700 font-bold bg-red-900/40 text-red-950">Off Pde</th>
                      <th className="py-1 px-1 border-r border-slate-700">Leave</th>
                      <th className="py-1 px-1 border-r border-slate-700">Sick</th>
                      <th className="py-1 px-1 border-r border-slate-700">Duty</th>
                      <th className="py-1 px-1 border-r border-slate-700">Course</th>
                      <th className="py-1 px-1">Others</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaries.map((s, idx) => (
                      <tr key={s.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-100'}>
                        <td className="py-0.5 px-1.5 text-left font-bold text-slate-950 border-r border-slate-300">
                          {s.name}
                        </td>
                        <td className="py-0.5 px-1 border-r border-slate-300">{s.posted}</td>
                        <td className="py-0.5 px-1 border-r border-slate-300">{s.attIn}</td>
                        <td className="py-0.5 px-1 border-r border-slate-300">{s.attOut}</td>
                        <td className="py-0.5 px-1 font-bold border-r border-slate-300 bg-slate-200/50">{s.effective}</td>
                        <td className="py-0.5 px-1 font-bold text-emerald-800 border-r border-slate-300">{s.present}</td>
                        <td className="py-0.5 px-1 font-bold text-red-700 border-r border-slate-300 bg-red-50">
                          {s.offParade}
                        </td>
                        <td className="py-0.5 px-1 border-r border-slate-300">{s.onLeave}</td>
                        <td className="py-0.5 px-1 border-r border-slate-300">{s.cmhSick}</td>
                        <td className="py-0.5 px-1 border-r border-slate-300">{s.onDuty}</td>
                        <td className="py-0.5 px-1 border-r border-slate-300">{s.courses}</td>
                        <td className="py-0.5 px-1">{s.others}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-200 font-bold border-t-2 border-slate-950 text-slate-950">
                      <td className="py-1 px-1.5 text-left uppercase border-r border-slate-400">Total</td>
                      <td className="py-1 px-1 border-r border-slate-400">{totals.posted}</td>
                      <td className="py-1 px-1 border-r border-slate-400">{totals.attIn}</td>
                      <td className="py-1 px-1 border-r border-slate-400">{totals.attOut}</td>
                      <td className="py-1 px-1 border-r border-slate-400 bg-slate-300">{totals.effective}</td>
                      <td className="py-1 px-1 text-emerald-900 border-r border-slate-400">{totals.present}</td>
                      <td className="py-1 px-1 text-red-800 border-r border-slate-400 bg-red-100">{totals.offParade}</td>
                      <td className="py-1 px-1 border-r border-slate-400">{totals.onLeave}</td>
                      <td className="py-1 px-1 border-r border-slate-400">{totals.cmhSick}</td>
                      <td className="py-1 px-1 border-r border-slate-400">{totals.onDuty}</td>
                      <td className="py-1 px-1 border-r border-slate-400">{totals.courses}</td>
                      <td className="py-1 px-1">{totals.others}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* 2. SUMMARY STRIP FOR OFF-PARADE */}
            <div className="bg-slate-100 border border-slate-300 rounded p-2 flex items-center justify-between text-xs font-mono">
              <div className="font-bold text-slate-900">
                মোট অফ প্যারেড সৈনিক: <span className="text-red-700 font-black">{absentees.length} জন</span>
              </div>
              <div className="flex items-center gap-3 text-slate-700">
                <span>HQ: <strong className="text-slate-950">{absenteeBtyCounts['HQ Bty']}</strong></span>
                <span>P Bty: <strong className="text-slate-950">{absenteeBtyCounts['P Bty']}</strong></span>
                <span>Q Bty: <strong className="text-slate-950">{absenteeBtyCounts['Q Bty']}</strong></span>
                <span>R Bty: <strong className="text-slate-950">{absenteeBtyCounts['R Bty']}</strong></span>
              </div>
            </div>

            {/* 3. CLEAN & READABLE MULTI-COLUMN TABLE */}
            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-800 font-mono flex items-center justify-between">
                <span>NOMINAL ROLL OF OFF-PARADE PERSONNEL</span>
                <span className="text-slate-500 font-normal">ক্রম অনুযায়ী সাজানো</span>
              </div>

              {absentees.length === 0 ? (
                <div className="p-6 text-center text-slate-500 font-mono text-xs border border-dashed border-slate-300 rounded">
                  আজকে কোনো সৈনিক অফ প্যারেড নেই (100% Present on Parade)
                </div>
              ) : (
                <div className={`grid ${columnsCount === 3 ? 'grid-cols-3 gap-2' : 'grid-cols-2 gap-2.5'} items-start`}>
                  {columnData.map((col, colIdx) => (
                    <div key={colIdx} className="overflow-hidden">
                      <table className="w-full text-[8px] sm:text-[8.5px] text-left border border-slate-900 border-collapse">
                        <thead>
                          <tr className="bg-slate-900 text-white font-mono text-[8px] uppercase">
                            <th className="py-1 px-1 w-5 text-center border-r border-slate-700">Ser</th>
                            <th className="py-1 px-1.5 w-16 border-r border-slate-700">Army No</th>
                            <th className="py-1 px-1.5 border-r border-slate-700">Rk &amp; Name</th>
                            <th className="py-1 px-1 w-7 text-center border-r border-slate-700">Bty</th>
                            <th className="py-1 px-1.5 border-r border-slate-700">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {col.items.map((p, itemIdx) => {
                            const serialNo = col.startIndex + itemIdx + 1;
                            const reason = p.outOfUnitCategory || p.remarks || p.status;
                            return (
                              <tr
                                key={p.id}
                                className={serialNo % 2 === 0 ? 'bg-slate-50/80' : 'bg-white'}
                              >
                                <td className="py-0.5 px-1 font-mono text-slate-600 text-center border-r border-slate-300">
                                  {serialNo}
                                </td>
                                <td className="py-0.5 px-1.5 font-mono font-bold text-slate-900 border-r border-slate-300 whitespace-nowrap">
                                  {p.snkNo}
                                </td>
                                <td className="py-0.5 px-1.5 font-bold text-slate-950 border-r border-slate-300 truncate max-w-[110px] whitespace-nowrap">
                                  <span className="font-medium text-slate-700 mr-1">{p.rk}</span>
                                  {p.name}
                                </td>
                                <td className="py-0.5 px-1 text-center font-mono font-semibold text-slate-800 border-r border-slate-300 whitespace-nowrap">
                                  {p.battery.replace(' Bty', '')}
                                </td>
                                <td className="py-0.5 px-1.5 font-semibold text-slate-900 border-r border-slate-300 truncate max-w-[95px] whitespace-nowrap">
                                  <span className="font-bold text-red-700 mr-1">[{p.status}]</span>
                                  {reason !== p.status ? reason : ''}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. CLEAN OFFICIAL MILITARY SIGNATURES */}
            <div className="border-t-2 border-slate-950 pt-2 mt-4 break-inside-avoid">
              <div className="grid grid-cols-4 gap-3 text-center font-mono text-[8.5px] leading-tight">
                <div className="space-y-1">
                  <div className="h-5 border-b border-slate-400 border-dashed mb-1" />
                  <div className="font-bold text-slate-950 uppercase text-[8px]">Prepared by (BSM)</div>
                  <div className="text-slate-600 text-[7px]">Battery Sgt Major</div>
                </div>

                <div className="space-y-1">
                  <div className="h-5 border-b border-slate-400 border-dashed mb-1" />
                  <div className="font-bold text-slate-950 uppercase text-[8px]">Consolidated by (RSM)</div>
                  <div className="text-slate-600 text-[7px]">Regimental Sgt Major</div>
                </div>

                <div className="space-y-1">
                  <div className="h-5 border-b border-slate-400 border-dashed mb-1" />
                  <div className="font-bold text-slate-950 uppercase text-[8px]">Authorized by (Adjt)</div>
                  <div className="text-slate-600 text-[7px] truncate">{adjutantName}</div>
                </div>

                <div className="space-y-1">
                  <div className="h-5 border-b border-slate-400 border-dashed mb-1" />
                  <div className="font-bold text-slate-950 uppercase text-[8px]">Seen by (CO)</div>
                  <div className="text-slate-600 text-[7px] truncate">{coName}</div>
                </div>
              </div>

              <div className="text-center text-[7px] text-slate-500 font-mono mt-1">
                10 Med Regt Arty Parade State &amp; Off-Parade Management System • Confidential Military Record
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
