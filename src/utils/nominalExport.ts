import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Personnel, isCivilianRank, normalizeBattery, formatRankTradeName } from '../types';
import { sortBySeniority } from './seniorityUtils';

export interface ExportFilterOptions {
  searchQuery?: string;
  battery?: string;
  rankCategory?: string;
  specificRank?: string;
  trade?: string;
  status?: string;
}

export const getFilterDescription = (filters: ExportFilterOptions): string => {
  const parts: string[] = [];
  if (filters.searchQuery?.trim()) parts.push(`Search: "${filters.searchQuery.trim()}"`);
  if (filters.battery && filters.battery !== 'All') parts.push(`Battery: ${filters.battery}`);
  if (filters.rankCategory && filters.rankCategory !== 'ALL') parts.push(`Rank Group: ${filters.rankCategory}`);
  if (filters.specificRank && filters.specificRank !== 'All') parts.push(`Rank: ${filters.specificRank}`);
  if (filters.trade && filters.trade !== 'All') parts.push(`Trade: ${filters.trade}`);
  if (filters.status && filters.status !== 'All') parts.push(`Status: ${filters.status}`);

  return parts.length > 0 ? parts.join(' | ') : 'All Personnel (Unfiltered)';
};

const getTimestamp = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hr = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${d}-${m}-${y}_${hr}${min}`;
};

export const exportNominalRollToPdf = (
  personnelList: Personnel[],
  filterInfo: ExportFilterOptions = {},
  title = '10 MEDIUM REGIMENT ARTILLERY'
) => {
  const doc = new jsPDF('portrait', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const filterDesc = getFilterDescription(filterInfo);
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const rawList = Array.isArray(personnelList) ? personnelList.filter(Boolean) : [];
  const safeList = sortBySeniority(rawList);

  // Calculate statistics
  const total = safeList.length;
  const present = safeList.filter((p) => p.status === 'Present').length;
  const onDuty = safeList.filter((p) => p.status === 'On Duty').length;
  const cmh = safeList.filter((p) => p.status === 'CMH/Sick').length;
  const leave = safeList.filter((p) => p.status === 'Leave' || p.status === 'P/Lve' || p.status === 'C/Lve' || p.outOfUnitCategory === 'P/Lve' || p.outOfUnitCategory === 'C/Lve').length;
  const course = safeList.filter((p) => p.status === 'Course/Trg').length;
  const others = total - (present + onDuty + cmh + leave + course);

  // Document Header (A4 Portrait)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text(title.toUpperCase(), pageWidth / 2, 34, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 20, 30);
  doc.text('OFFICIAL FILTERED NOMINAL ROLL & STATE', pageWidth / 2, 49, { align: 'center' });

  // Subheader & Filter Info Box
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(28, 59, pageWidth - 56, 28, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(40, 50, 70);
  doc.text(`CRITERIA: ${filterDesc.toUpperCase()}`, 36, 76);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(`Generated: ${dateStr} at ${timeStr} hrs`, pageWidth - 36, 76, { align: 'right' });

  // Prepare table data with Rank, Trade & Name together
  const tableRows = safeList.map((person, index) => [
    (index + 1).toString(),
    person.snkNo || '',
    formatRankTradeName(person.rk, person.trade, person.name),
    isCivilianRank(person.rk, person.trade) || person.battery === 'Civilian' ? 'Civilian' : (person.battery || ''),
    person.status || '',
    person.medicalCategory || 'AYE',
    person.bloodGroup || 'O+',
  ]);

  autoTable(doc, {
    startY: 96,
    head: [['SL', 'ARMY / SNK NO', 'RANK, TRADE & NAME', 'BATTERY', 'PARADE STATE', 'MED CAT', 'BLOOD']],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 3.5,
      font: 'helvetica',
      textColor: [30, 30, 30],
      lineColor: [210, 215, 225],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [30, 41, 59], // Slate 800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 26, halign: 'center' }, // SL
      1: { cellWidth: 66, fontStyle: 'bold', halign: 'center' }, // Snk No
      2: { cellWidth: 225, fontStyle: 'bold' }, // Rank, Trade & Name
      3: { cellWidth: 52, halign: 'center' }, // Battery
      4: { cellWidth: 80, halign: 'center' }, // Parade State
      5: { cellWidth: 48, halign: 'center' }, // Med Cat
      6: { cellWidth: 42, halign: 'center' }, // Blood
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 28, right: 28, bottom: 72, top: 28 },
    didDrawPage: (data) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Page ${data.pageNumber} • 10 Medium Regiment Artillery • Official Nominal Roll (A4)`,
        pageWidth / 2,
        pageHeight - 16,
        { align: 'center' }
      );
    },
  });

  // Calculate final Y position
  let finalY = ((doc as any).lastAutoTable?.finalY || 110) + 14;
  if (finalY + 75 > pageHeight - 28) {
    doc.addPage();
    finalY = 36;
  }

  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(240, 244, 248);
  doc.roundedRect(28, finalY, pageWidth - 56, 30, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 40, 60);

  const statsText = `STRENGTH SUMMARY:  Total: ${total}  |  Present: ${present}  |  On Duty: ${onDuty}  |  CMH/Sick: ${cmh}  |  Leave: ${leave}  |  Course/Trg: ${course}  |  Others: ${others}`;
  doc.text(statsText, 36, finalY + 19);

  // Signatures block
  const sigY = finalY + 56;
  if (sigY < pageHeight - 24) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(60, 60, 60);

    doc.text('_________________________', 28, sigY);
    doc.text('Regimental Havildar Major (RHM)', 28, sigY + 12);

    doc.text('_________________________', pageWidth / 2, sigY, { align: 'center' });
    doc.text('Regimental Sergeant Major (RSM)', pageWidth / 2, sigY + 12, { align: 'center' });

    doc.text('_________________________', pageWidth - 28, sigY, { align: 'right' });
    doc.text('Adjutant / Commanding Officer', pageWidth - 28, sigY + 12, { align: 'right' });
  }

  // Generate clean filename
  let cleanTrade = filterInfo.trade && filterInfo.trade !== 'All' ? `_${filterInfo.trade}` : '';
  let cleanBty = filterInfo.battery && filterInfo.battery !== 'All' ? `_${filterInfo.battery.replace(' ', '')}` : '';
  let cleanRank = filterInfo.specificRank && filterInfo.specificRank !== 'All' ? `_${filterInfo.specificRank.replace(' ', '')}` : '';
  const filename = `10MedRegt_NominalRoll${cleanTrade}${cleanBty}${cleanRank}_${getTimestamp()}.pdf`;

  doc.save(filename);
};

export const exportNominalRollToWord = (
  personnelList: Personnel[],
  filterInfo: ExportFilterOptions = {},
  title = '10 MEDIUM REGIMENT ARTILLERY'
) => {
  const filterDesc = getFilterDescription(filterInfo);
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const rawList = Array.isArray(personnelList) ? personnelList.filter(Boolean) : [];
  const safeList = sortBySeniority(rawList);

  const total = safeList.length;
  const present = safeList.filter((p) => p.status === 'Present').length;
  const onDuty = safeList.filter((p) => p.status === 'On Duty').length;
  const cmh = safeList.filter((p) => p.status === 'CMH/Sick').length;
  const leave = safeList.filter((p) => p.status === 'Leave' || p.status === 'P/Lve' || p.status === 'C/Lve' || p.outOfUnitCategory === 'P/Lve' || p.outOfUnitCategory === 'C/Lve').length;
  const course = safeList.filter((p) => p.status === 'Course/Trg').length;
  const others = total - (present + onDuty + cmh + leave + course);

  const tableRowsHtml = safeList
    .map(
      (p, idx) => `
      <tr style="${idx % 2 === 1 ? 'background-color: #f8fafc;' : 'background-color: #ffffff;'}">
        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-size: 11px;">${idx + 1}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-family: monospace; font-weight: bold; font-size: 11px;">${p.snkNo || ''}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; font-weight: bold; font-size: 11px;">${formatRankTradeName(p.rk, p.trade, p.name)}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-size: 11px;">${isCivilianRank(p.rk, p.trade) || p.battery === 'Civilian' ? 'Civilian' : (p.battery || '')}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-size: 11px; font-weight: 500;">${p.status || ''}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-size: 11px;">${p.medicalCategory || 'AYE'}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-size: 11px;">${p.bloodGroup || 'O+'}</td>
      </tr>
    `
    )
    .join('');

  const wordHtmlContent = `
    <!DOCTYPE html>
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>${title} - Nominal Roll</title>
      <style>
        body {
          font-family: Calibri, Arial, sans-serif;
          margin: 20px;
          color: #0f172a;
        }
        .header {
          text-align: center;
          margin-bottom: 12px;
        }
        .title {
          font-size: 18pt;
          font-weight: bold;
          letter-spacing: 1px;
          color: #0f172a;
          margin: 0;
        }
        .subtitle {
          font-size: 12pt;
          font-weight: bold;
          color: #991b1b;
          margin-top: 4px;
        }
        .meta-box {
          background-color: #f1f5f9;
          border: 1px solid #cbd5e1;
          padding: 8px 12px;
          margin-bottom: 14px;
          font-size: 10pt;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16px;
        }
        th {
          background-color: #1e293b;
          color: #ffffff;
          border: 1px solid #0f172a;
          padding: 8px 6px;
          font-size: 10pt;
          font-weight: bold;
          text-align: center;
        }
        .summary-box {
          background-color: #f8fafc;
          border: 1px solid #94a3b8;
          padding: 10px;
          font-size: 10pt;
          font-weight: bold;
          margin-top: 14px;
          margin-bottom: 24px;
        }
        .sig-container {
          margin-top: 40px;
          width: 100%;
        }
        .sig-table {
          width: 100%;
          border: none;
        }
        .sig-table td {
          border: none;
          text-align: center;
          font-size: 10pt;
          padding-top: 30px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 class="title">${title}</h1>
        <div class="subtitle">OFFICIAL FILTERED NOMINAL ROLL & STATE</div>
      </div>

      <div class="meta-box">
        <table style="width: 100%; border: none; margin: 0;">
          <tr>
            <td style="border: none; text-align: left; font-weight: bold;">CRITERIA: ${filterDesc.toUpperCase()}</td>
            <td style="border: none; text-align: right; color: #475569;">Generated: ${dateStr} at ${timeStr} hrs</td>
          </tr>
        </table>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 5%;">SL</th>
            <th style="width: 14%;">ARMY / SNK NO</th>
            <th style="width: 42%;">RANK, TRADE &amp; NAME</th>
            <th style="width: 11%;">BATTERY</th>
            <th style="width: 14%;">PARADE STATE</th>
            <th style="width: 7%;">MED CAT</th>
            <th style="width: 7%;">BLOOD</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>

      <div class="summary-box">
        STRENGTH SUMMARY: Total: ${total} | Present: ${present} | On Duty: ${onDuty} | CMH/Sick: ${cmh} | Leave: ${leave} | Course/Trg: ${course} | Others: ${others}
      </div>

      <div class="sig-container">
        <table class="sig-table">
          <tr>
            <td>
              ________________________________<br>
              <strong>Regimental Havildar Major (RHM)</strong>
            </td>
            <td>
              ________________________________<br>
              <strong>Regimental Sergeant Major (RSM)</strong>
            </td>
            <td>
              ________________________________<br>
              <strong>Adjutant / Commanding Officer</strong>
            </td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + wordHtmlContent], {
    type: 'application/msword;charset=utf-8',
  });

  let cleanTrade = filterInfo.trade && filterInfo.trade !== 'All' ? `_${filterInfo.trade}` : '';
  let cleanBty = filterInfo.battery && filterInfo.battery !== 'All' ? `_${filterInfo.battery.replace(' ', '')}` : '';
  let cleanRank = filterInfo.specificRank && filterInfo.specificRank !== 'All' ? `_${filterInfo.specificRank.replace(' ', '')}` : '';
  const filename = `10MedRegt_NominalRoll${cleanTrade}${cleanBty}${cleanRank}_${getTimestamp()}.doc`;

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

export interface CoursePdfRecordItem {
  snkNo: string;
  rk: string;
  trade?: string;
  name: string;
  battery: string;
  currentStatus: string;
  completionDate: string;
  location: string;
  grade: string;
  authority?: string;
}

export interface CoursePdfOptions {
  courseName: string;
  courseCode?: string;
  category?: string;
  duration?: string;
  batteryFilter?: string;
  searchQuery?: string;
}

export const exportCourseRosterToPdf = (
  items: CoursePdfRecordItem[],
  options: CoursePdfOptions
) => {
  const doc = new jsPDF('portrait', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const btyScope =
    options.batteryFilter && options.batteryFilter !== 'All'
      ? options.batteryFilter
      : 'All Batteries';
  const searchNote = options.searchQuery?.trim()
    ? ` | Search: "${options.searchQuery.trim()}"`
    : '';

  // Official Regimental Header (A4 Portrait)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('10 MEDIUM REGIMENT ARTILLERY', pageWidth / 2, 34, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(5, 150, 105);
  doc.text(
    `COURSE & CADRE QUALIFICATION ROLL — ${options.courseName.toUpperCase()}`,
    pageWidth / 2,
    49,
    { align: 'center' }
  );

  // Meta Info Box
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(28, 59, pageWidth - 56, 26, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(
    `SCOPE: ${btyScope.toUpperCase()}${searchNote}   |   TOTAL QUALIFIED: ${items.length} PERSONS`,
    36,
    75
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Generated: ${dateStr} at ${timeStr} hrs`, pageWidth - 36, 75, {
    align: 'right',
  });

  const tableRows = items.map((item, idx) => [
    String(idx + 1),
    item.snkNo || '-',
    formatRankTradeName(item.rk, item.trade, item.name) || '-',
    (item.battery || '-').replace(' Bty', ''),
    item.currentStatus || '-',
    item.completionDate || '-',
    item.location || '-',
    item.grade || '-',
  ]);

  autoTable(doc, {
    startY: 94,
    head: [
      [
        'SL',
        'ARMY NO',
        'RANK, TRADE & NAME',
        'BTY',
        'CUR STATUS',
        'DATE',
        'INSTITUTION / LOCATION',
        'RESULT / GRADE',
      ],
    ],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 3.5,
      font: 'helvetica',
      textColor: [15, 23, 42],
      lineColor: [203, 213, 225],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 24, halign: 'center' },
      1: { cellWidth: 58, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 146, fontStyle: 'bold' },
      3: { cellWidth: 36, halign: 'center' },
      4: { cellWidth: 56, halign: 'center' },
      5: { cellWidth: 52, halign: 'center' },
      6: { cellWidth: 95 },
      7: { cellWidth: 72, halign: 'center', fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 28, right: 28, bottom: 64, top: 28 },
    didDrawPage: (data) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Page ${data.pageNumber} • 10 Medium Regiment Artillery • Course & Cadre Qualification Roll (A4)`,
        pageWidth / 2,
        pageHeight - 16,
        { align: 'center' }
      );
    },
  });

  const finalY = ((doc as any).lastAutoTable?.finalY || 110) + 14;
  let sigY = finalY;

  if (!options.batteryFilter || options.batteryFilter === 'All') {
    const btyCounts: Record<string, number> = {
      'HQ Bty': 0,
      'P Bty': 0,
      'Q Bty': 0,
      'R Bty': 0,
      EME: 0,
    };
    items.forEach((it) => {
      const norm = normalizeBattery(it.battery);
      if (btyCounts[norm] !== undefined) btyCounts[norm]++;
    });

    if (sigY + 80 > pageHeight - 28) {
      doc.addPage();
      sigY = 44;
    }

    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(28, sigY, pageWidth - 56, 26, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(
      `BATTERY SUMMARY:   Total: ${items.length}   |   HQ: ${btyCounts['HQ Bty']}   |   P: ${btyCounts['P Bty']}   |   Q: ${btyCounts['Q Bty']}   |   R: ${btyCounts['R Bty']}   |   EME: ${btyCounts.EME}`,
      36,
      sigY + 16
    );
    sigY += 42;
  } else if (sigY + 50 > pageHeight - 28) {
    doc.addPage();
    sigY = 44;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);

  doc.text('_________________________', 28, sigY + 18);
  doc.text('Prepared by (Trg Clk)', 28, sigY + 30);

  doc.text('_________________________', pageWidth / 2, sigY + 18, { align: 'center' });
  doc.text('Checked by (RSM)', pageWidth / 2, sigY + 30, { align: 'center' });

  doc.text('_________________________', pageWidth - 28, sigY + 18, { align: 'right' });
  doc.text('Adjutant / Commanding Officer', pageWidth - 28, sigY + 30, { align: 'right' });

  const cleanCourse = (options.courseCode || options.courseName || 'Course')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
  const cleanBty =
    options.batteryFilter && options.batteryFilter !== 'All'
      ? `_${options.batteryFilter.replace(/\s+/g, '')}`
      : '_AllBty';
  doc.save(`10MedRegt_${cleanCourse || 'Course'}${cleanBty}_${getTimestamp()}.pdf`);
};

