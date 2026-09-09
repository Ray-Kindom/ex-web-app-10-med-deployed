import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Personnel, isNCERank, isCivilianRank } from '../types';
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
  const doc = new jsPDF('landscape', 'pt', 'a4');
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
  const leave = safeList.filter((p) => p.status === 'Leave').length;
  const course = safeList.filter((p) => p.status === 'Course/Trg').length;
  const others = total - (present + onDuty + cmh + leave + course);

  // Document Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text(title.toUpperCase(), 421, 40, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 20, 30);
  doc.text('OFFICIAL FILTERED NOMINAL ROLL & STATE', 421, 56, { align: 'center' });

  // Subheader & Filter Info Box
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(40, 68, 762, 32, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(40, 50, 70);
  doc.text(`CRITERIA: ${filterDesc.toUpperCase()}`, 50, 84);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(`Generated: ${dateStr} at ${timeStr} hrs`, 790, 84, { align: 'right' });

  // Prepare table data with SEPARATE Rank and Trade columns
  const tableRows = safeList.map((person, index) => [
    (index + 1).toString(),
    person.snkNo || '',
    person.rk || '',
    person.trade && person.trade !== '-' && !isNCERank(person.rk, person.trade) && !['Lt Col', 'Maj', 'Capt', 'Lt', '2Lt'].includes(person.rk) ? person.trade : '-',
    person.name || '',
    isCivilianRank(person.rk, person.trade) || person.battery === 'Civilian' ? 'Civilian' : (person.battery || ''),
    person.status || '',
    person.medicalCategory || 'AYE',
    person.bloodGroup || 'O+',
  ]);

  autoTable(doc, {
    startY: 110,
    head: [['SL', 'ARMY / SNK NO', 'RANK', 'TRADE', 'NAME', 'BATTERY', 'PARADE STATE', 'MED CAT', 'BLOOD']],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 4,
      font: 'helvetica',
      textColor: [30, 30, 30],
      lineColor: [210, 215, 225],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [30, 41, 59], // Slate 800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 30, halign: 'center' }, // SL
      1: { cellWidth: 80, fontStyle: 'bold', halign: 'center' }, // Snk No
      2: { cellWidth: 55, fontStyle: 'bold', halign: 'center' }, // Rank
      3: { cellWidth: 55, fontStyle: 'bold', halign: 'center' }, // Trade
      4: { cellWidth: 180, fontStyle: 'bold' }, // Name
      5: { cellWidth: 65, halign: 'center' }, // Battery
      6: { cellWidth: 100, halign: 'center' }, // Parade State
      7: { cellWidth: 60, halign: 'center' }, // Med Cat
      8: { cellWidth: 50, halign: 'center' }, // Blood
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 40, right: 40, bottom: 90 },
  });

  // Calculate final Y position
  const finalY = (doc as any).lastAutoTable.finalY + 15;

  // Add Summary Box if page space allows, otherwise new page
  if (finalY < 480) {
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(240, 244, 248);
    doc.roundedRect(40, finalY, 762, 34, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 40, 60);

    const statsText = `STRENGTH SUMMARY:  Total: ${total}  |  Present: ${present}  |  On Duty: ${onDuty}  |  CMH/Sick: ${cmh}  |  Leave: ${leave}  |  Course/Trg: ${course}  |  Others: ${others}`;
    doc.text(statsText, 50, finalY + 21);

    // Signatures block
    const sigY = finalY + 60;
    if (sigY < 560) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);

      doc.text('_____________________________', 100, sigY);
      doc.text('Regimental Havildar Major (RHM)', 100, sigY + 12);

      doc.text('_____________________________', 421, sigY, { align: 'center' });
      doc.text('Regimental Sergeant Major (RSM)', 421, sigY + 12, { align: 'center' });

      doc.text('_____________________________', 710, sigY, { align: 'right' });
      doc.text('Adjutant / Commanding Officer', 710, sigY + 12, { align: 'right' });
    }
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
  const leave = safeList.filter((p) => p.status === 'Leave').length;
  const course = safeList.filter((p) => p.status === 'Course/Trg').length;
  const others = total - (present + onDuty + cmh + leave + course);

  const tableRowsHtml = safeList
    .map(
      (p, idx) => `
      <tr style="${idx % 2 === 1 ? 'background-color: #f8fafc;' : 'background-color: #ffffff;'}">
        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-size: 11px;">${idx + 1}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-family: monospace; font-weight: bold; font-size: 11px;">${p.snkNo || ''}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-weight: bold; font-size: 11px;">${p.rk || ''}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-weight: bold; font-size: 11px; color: #0284c7;">${p.trade && p.trade !== '-' && !isNCERank(p.rk, p.trade) && !['Lt Col', 'Maj', 'Capt', 'Lt', '2Lt'].includes(p.rk) ? p.trade : '-'}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; font-weight: bold; font-size: 11px;">${p.name || ''}</td>
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
            <th style="width: 4%;">SL</th>
            <th style="width: 14%;">ARMY / SNK NO</th>
            <th style="width: 10%;">RANK</th>
            <th style="width: 10%;">TRADE</th>
            <th style="width: 25%;">NAME</th>
            <th style="width: 10%;">BATTERY</th>
            <th style="width: 13%;">PARADE STATE</th>
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
