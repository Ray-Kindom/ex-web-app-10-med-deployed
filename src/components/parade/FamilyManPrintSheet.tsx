import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FamilyManRankGroup, FamilyManRecord, LivingCategory } from '../../types';
import {
  buildBanglaTitleFromPersonnel,
  formatIsoToBanglaShortDate,
  getRemainingDaysInfo,
  inferRankCategory,
  toBanglaDigits,
} from '../../data/familyManSeedData';
import { Printer, X, CheckSquare, Square } from 'lucide-react';

interface FamilyManPrintSheetProps {
  isOpen: boolean;
  onClose: () => void;
  records: FamilyManRecord[];
  defaultTab: LivingCategory;
}

type PrintScope = 'Out Living' | 'In Living' | 'Both';

const RANK_GROUPS: FamilyManRankGroup[] = ['জেসিও', 'অন্যান্য পদবী', 'এনসি (ই)'];

function padBnCount(n: number): string {
  return toBanglaDigits(String(n).padStart(2, '0'));
}

export const FamilyManPrintSheet: React.FC<FamilyManPrintSheetProps> = ({
  isOpen,
  onClose,
  records,
  defaultTab,
}) => {
  const [printScope, setPrintScope] = useState<PrintScope>(defaultTab);
  const [includeRemainingCol, setIncludeRemainingCol] = useState(false);

  const wasOpenRef = React.useRef(false);
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setPrintScope(defaultTab);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, defaultTab]);

  useEffect(() => {
    const cleanup = () => {
      document.body.classList.remove('printing-family-man');
    };
    window.addEventListener('afterprint', cleanup);
    return () => {
      window.removeEventListener('afterprint', cleanup);
      cleanup();
    };
  }, []);

  const outLivingRecords = useMemo(
    () => records.filter((r) => r.livingType === 'Out Living'),
    [records]
  );

  const inLivingRecords = useMemo(
    () => records.filter((r) => r.livingType === 'In Living'),
    [records]
  );

  const handlePrint = () => {
    document.body.classList.add('printing-family-man');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-family-man');
      }, 600);
    }, 60);
  };

  if (!isOpen) return null;

  const renderOfficialTable = (
    list: FamilyManRecord[],
    type: LivingCategory,
    addPageBreakBefore: boolean
  ) => {
    const isInLiving = type === 'In Living';
    const headingText = isInLiving
      ? 'সপরিবারে সরকারি পারিবারিক বাসস্থানে বসবাসরত সেনাসদস্যদের তালিকা'
      : 'সপরিবারে সেনানিবাসের বাহিরে বসবাসরত সেনাসদস্যদের তালিকা';
    const serialColHeader = isInLiving ? 'ক্রমিক' : 'ক্রঃ';
    const lastColHeader = isInLiving ? 'বাসা নম্বর' : 'মন্তব্য';
    const totalCols = includeRemainingCol ? 8 : 7;

    // Group records into জেসিও, অন্যান্য পদবী, এনসি (ই)
    const grouped = RANK_GROUPS.map((grp) => {
      const items = list.filter(
        (r) => (r.rankCategory || inferRankCategory(r.rk, r.banglaFullTitle)) === grp
      );
      return { grp, items };
    }).filter((g) => g.items.length > 0);

    let runningSerial = 0;

    return (
      <div
        className={`bg-white text-black mx-auto ${
          addPageBreakBefore ? 'mt-8 pt-6 border-t-2 border-dashed border-slate-300 print:mt-0 print:pt-0 print:border-0 print:break-before-page' : ''
        }`}
        style={{
          fontFamily: "'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', sans-serif",
        }}
      >
        {/* Official Centered Underlined Heading */}
        <h2 className="text-center text-[15px] font-bold underline underline-offset-4 mb-3 text-black">
          {headingText}
        </h2>

        <table
          className="w-full border-collapse text-[11px] leading-[1.35] text-black"
          style={{ border: '1px solid #000' }}
        >
          <thead className="table-header-group">
            <tr>
              <th
                className="border border-black px-1.5 py-1.5 text-center font-bold align-middle"
                style={{ width: '34px' }}
              >
                {serialColHeader}
              </th>
              <th className="border border-black px-2 py-1.5 text-center font-bold align-middle">
                সেনা নং, পদবী এবং নাম
              </th>
              <th
                className="border border-black px-1.5 py-1.5 text-center font-bold align-middle"
                style={{ width: '78px' }}
              >
                আবেদন এর
                <br />
                তারিখ
              </th>
              <th
                className="border border-black px-1.5 py-1.5 text-center font-bold align-middle"
                style={{ width: '82px' }}
              >
                স্টেশন কর্তৃক
                <br />
                বরাদ্দের তারিখ
              </th>
              <th
                className="border border-black px-1.5 py-1.5 text-center font-bold align-middle"
                style={{ width: '68px' }}
              >
                দখলের
                <br />
                তারিখ
              </th>
              <th
                className="border border-black px-1.5 py-1.5 text-center font-bold align-middle"
                style={{ width: '68px' }}
              >
                খালির
                <br />
                তারিখ
              </th>
              {includeRemainingCol && (
                <th
                  className="border border-black px-1.5 py-1.5 text-center font-bold align-middle"
                  style={{ width: '78px' }}
                >
                  শেষ হতে
                  <br />
                  বাকি
                </th>
              )}
              <th
                className="border border-black px-2 py-1.5 text-center font-bold align-middle"
                style={{ width: isInLiving ? '145px' : '72px' }}
              >
                {lastColHeader}
              </th>
            </tr>
          </thead>

          <tbody>
            {grouped.length === 0 ? (
              <tr>
                <td
                  colSpan={totalCols}
                  className="border border-black px-3 py-6 text-center text-slate-600"
                >
                  এই তালিকায় কোনো সেনাসদস্য নেই।
                </td>
              </tr>
            ) : (
              grouped.map(({ grp, items }) => (
                <React.Fragment key={grp}>
                  {/* Category Header Row (e.g. জেসিও-০১, অন্যান্য পদবী-৭০, এনসি (ই)-০৪) */}
                  <tr className="break-inside-avoid">
                    <td
                      colSpan={totalCols}
                      className="border border-black px-2 py-1 text-left font-bold bg-slate-50 print:bg-transparent"
                    >
                      {grp}-{padBnCount(items.length)}
                    </td>
                  </tr>

                  {items.map((rec) => {
                    runningSerial += 1;
                    const bnSerial = `${toBanglaDigits(runningSerial)}।`;
                    const titleText =
                      rec.banglaFullTitle ||
                      buildBanglaTitleFromPersonnel({
                        snkNo: rec.snkNo,
                        rk: rec.rk,
                        trade: rec.trade,
                        name: rec.name,
                      });
                    const appDate = formatIsoToBanglaShortDate(rec.applicationDate);
                    const allotDate = formatIsoToBanglaShortDate(rec.allotmentDate);
                    const sinceDate = formatIsoToBanglaShortDate(rec.sinceDate);
                    const expiryDate = formatIsoToBanglaShortDate(rec.expiryDate);
                    const remaining = getRemainingDaysInfo(rec.expiryDate);
                    const lastCell = isInLiving
                      ? rec.quarterOrAddress || ''
                      : [rec.quarterOrAddress, rec.remarks].filter(Boolean).join(' — ');

                    return (
                      <tr key={rec.id} className="break-inside-avoid">
                        <td className="border border-black px-1 py-1 text-center align-middle">
                          {bnSerial}
                        </td>
                        <td className="border border-black px-2 py-1 text-left align-middle">
                          {titleText}
                        </td>
                        <td className="border border-black px-1.5 py-1 text-center align-middle">
                          {appDate}
                        </td>
                        <td className="border border-black px-1.5 py-1 text-center align-middle">
                          {allotDate}
                        </td>
                        <td className="border border-black px-1.5 py-1 text-center align-middle">
                          {sinceDate}
                        </td>
                        <td className="border border-black px-1.5 py-1 text-center align-middle">
                          {expiryDate}
                        </td>
                        {includeRemainingCol && (
                          <td className="border border-black px-1.5 py-1 text-center align-middle font-semibold">
                            {remaining.daysLeft !== null ? remaining.label : ''}
                          </td>
                        )}
                        <td className="border border-black px-1.5 py-1 text-center align-middle">
                          {lastCell}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return createPortal(
    <div
      id="family-man-print-portal"
      className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-sm flex flex-col overflow-hidden"
    >
      {/* Top Toolbar (Hidden when printing) */}
      <div className="print:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Printer className="w-4 h-4 text-indigo-400" />
            <span>অফিসিয়াল প্রিন্ট প্রিভিউ (আপলোডকৃত ফরম্যাট)</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            {(
              [
                { id: 'Out Living', label: `Out Living (${toBanglaDigits(outLivingRecords.length)})` },
                { id: 'In Living', label: `In Living (${toBanglaDigits(inLivingRecords.length)})` },
                {
                  id: 'Both',
                  label: `উভয় তালিকা একসাথে (${toBanglaDigits(
                    outLivingRecords.length + inLivingRecords.length
                  )})`,
                },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPrintScope(opt.id)}
                className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer ${
                  printScope === opt.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIncludeRemainingCol((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800/60 cursor-pointer"
          >
            {includeRemainingCol ? (
              <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Square className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>প্রিন্টে &quot;শেষ হতে বাকি&quot; কলাম দেখান</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>প্রিন্ট / PDF সংরক্ষণ</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>বন্ধ করুন</span>
          </button>
        </div>
      </div>

      {/* A4 Paper Preview Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 print:p-0 print:overflow-visible">
        <div className="max-w-[210mm] mx-auto bg-white text-black shadow-2xl p-6 sm:p-10 print:shadow-none print:p-0 print:max-w-none">
          {(printScope === 'Out Living' || printScope === 'Both') &&
            renderOfficialTable(outLivingRecords, 'Out Living', false)}
          {(printScope === 'In Living' || printScope === 'Both') &&
            renderOfficialTable(inLivingRecords, 'In Living', printScope === 'Both')}
        </div>
      </div>
    </div>,
    document.body
  );
};
