import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useApp } from '../../context/AppContext';
import { ParadeDutyHeadingBoxes } from './ParadeDutyHeadingBoxes';
import {
  DailyParadePoint,
  Battery,
  ALL_BATTERIES,
  ParadePointCount,
  isOfficerRank,
} from '../../types';
import { DEFAULT_PARADE_POINTS } from '../../data/paradePointsData';
import {
  X,
  Plus,
  Layers,
  Save,
  Trash2,
  CheckCircle2,
  Sliders,
  Sparkles,
  Calculator,
  Shield,
  Eye,
  EyeOff,
  Filter,
  Check,
  Printer,
  Download,
  Clock,
  ArrowLeft,
  Maximize2,
  Minimize2,
  Search,
} from 'lucide-react';

interface DailyParadeStateModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBattery?: Battery;
  sessionType?: string; // Morning, Second Period, Games, Roll Call
  date?: string; // YYYY-MM-DD
  onOpenPrintModal?: () => void;
}

export const DailyParadeStateModal: React.FC<DailyParadeStateModalProps> = ({
  isOpen,
  onClose,
  defaultBattery,
  sessionType = 'Morning',
  date,
  onOpenPrintModal,
}) => {
  const {
    dailyParadePoints,
    categoriesList,
    isAdmin,
    isRSM,
    isGuest,
    updateParadePointCount,
    togglePointForBattery,
    setRsmPointSuggestion,
    addDailyParadePoint,
    deleteDailyParadePoint,
    currentUser,
    showNotification,
    selectedParadeDate,
    setSelectedParadeDate,
    getParadeRecord,
    saveParadeRecordCounts,
    confirmBatteryParadeRecord,
    finalizeParadeType,
    getRegimentalTotals,
  } = useApp();

  const activeDate = date || selectedParadeDate;

  // Strict view-only access for Guests, Officers and CO - they must NOT have any Add, Edit, Delete, Update, or Modify option
  const isOfficerOrCo =
    currentUser.role === 'CO' ||
    currentUser.role === 'Offr' ||
    (currentUser.role as string) === '2IC' ||
    (currentUser.role as string) === 'Officer' ||
    isOfficerRank(currentUser.rank);

  const isBsm = ['P BSM', 'Q BSM', 'R BSM', 'HQ BSM', 'BSM'].includes(currentUser.role);
  const isReadOnly = isOfficerOrCo || isGuest || isBsm;

  const isRsmOrAdmin =
    !isReadOnly &&
    (currentUser.role === 'RSM' ||
      currentUser.role === 'Admin' ||
      isAdmin ||
      isRSM);

  // Combine dynamic categories with daily parade points so any ADMIN category changes reflect here automatically
  const dynamicParadePoints = useMemo<DailyParadePoint[]>(() => {
    const safeDailyPoints = Array.isArray(dailyParadePoints) ? dailyParadePoints : [];
    if (categoriesList && Array.isArray(categoriesList) && categoriesList.length > 0) {
      const list: DailyParadePoint[] = [];
      categoriesList.forEach((cat) => {
        if (!cat || !cat.isActive) return;
        const subCats = Array.isArray(cat.subCategories) ? cat.subCategories : [];
        subCats.forEach((sub) => {
          if (!sub || !sub.isActive) return;
          const existing = safeDailyPoints.find(
            (dp) => dp && (dp.id === sub.id || (dp.name && dp.name.toLowerCase() === sub.name.toLowerCase()))
          );

          list.push({
            id: sub.id,
            name: sub.name,
            isActive: sub.isActive,
            category: cat.name,
            order: sub.order,
            enabledBatteries:
              (sub.applicableSubUnits as Battery[]) ||
              (cat.applicableSubUnits as Battery[]) ||
              ALL_BATTERIES,
            counts: existing?.counts || sub.counts || {
              'HQ Bty': { offr: 0, jco: 0, or: 0 },
              'P Bty': { offr: 0, jco: 0, or: 0 },
              'Q Bty': { offr: 0, jco: 0, or: 0 },
              'R Bty': { offr: 0, jco: 0, or: 0 },
            },
            lockedByRsm: existing?.lockedByRsm,
            rsmSuggestedCounts: existing?.rsmSuggestedCounts,
            lastUpdated: existing?.lastUpdated,
            rsmFixedAt: existing?.rsmFixedAt,
          });
        });
      });
      return list;
    }
    return safeDailyPoints;
  }, [categoriesList, dailyParadePoints]);

  // Active view tab: 'HQ Bty' | 'P Bty' | 'Q Bty' | 'R Bty' | 'Consolidated'
  const [activeTab, setActiveTab] = useState<Battery | 'Consolidated'>(
    defaultBattery || (currentUser.assignedBattery as Battery) || (isBsm ? 'P Bty' : 'Consolidated')
  );

  // RSM Summary vs Detail view switch
  const [rsmViewMode, setRsmViewMode] = useState<'Summary' | 'Detail'>('Summary');

  // RSM Control Panel toggle
  const [showRsmControls, setShowRsmControls] = useState(false);

  // Add new point state
  const [newPointName, setNewPointName] = useState('');
  const [newPointSelectedBtys, setNewPointSelectedBtys] = useState<Battery[]>([
    'P Bty',
    'Q Bty',
    'R Bty',
    'HQ Bty',
  ]);
  const [isAddingNewPoint, setIsAddingNewPoint] = useState(false);

  // Quick edit buffer to allow fluid typing without lagging
  const [countsBuffer, setCountsBuffer] = useState<
    Record<string, Record<Battery, ParadePointCount>>
  >(() => {
    const buffer: Record<string, Record<Battery, ParadePointCount>> = {};
    dynamicParadePoints.forEach((pt) => {
      buffer[pt.id] = {
        'HQ Bty': { ...pt.counts['HQ Bty'] },
        'P Bty': { ...pt.counts['P Bty'] },
        'Q Bty': { ...pt.counts['Q Bty'] },
        'R Bty': { ...pt.counts['R Bty'] },
      };
    });
    return buffer;
  });

  // Keep buffer in sync when modal opens or dynamic points/date/session update
  React.useEffect(() => {
    const buffer: Record<string, Record<Battery, ParadePointCount>> = {};

    // 1. First try loading saved record for this date and session
    ALL_BATTERIES.forEach((bty) => {
      const rec = getParadeRecord(activeDate, sessionType, bty);
      if (rec && rec.counts) {
        Object.entries(rec.counts).forEach(([ptId, cnt]) => {
          if (!buffer[ptId]) {
            buffer[ptId] = {
              'HQ Bty': { offr: 0, jco: 0, or: 0 },
              'P Bty': { offr: 0, jco: 0, or: 0 },
              'Q Bty': { offr: 0, jco: 0, or: 0 },
              'R Bty': { offr: 0, jco: 0, or: 0 },
            };
          }
          const safeCnt = cnt as ParadePointCount;
          buffer[ptId][bty] = {
            offr: safeCnt?.offr || 0,
            jco: safeCnt?.jco || 0,
            or: safeCnt?.or || 0,
          };
        });
      }
    });

    // 2. Ensure all dynamic points are present
    dynamicParadePoints.forEach((pt) => {
      if (!buffer[pt.id]) {
        buffer[pt.id] = {
          'HQ Bty': { ...pt.counts['HQ Bty'] },
          'P Bty': { ...pt.counts['P Bty'] },
          'Q Bty': { ...pt.counts['Q Bty'] },
          'R Bty': { ...pt.counts['R Bty'] },
        };
      } else {
        ALL_BATTERIES.forEach((bty) => {
          if (!buffer[pt.id][bty]) {
            buffer[pt.id][bty] = { ...(pt.counts[bty] || { offr: 0, jco: 0, or: 0 }) };
          }
        });
      }
    });
    setCountsBuffer(buffer);
  }, [isOpen, dynamicParadePoints, activeDate, sessionType]);

  // Full-screen state (defaults to true as requested)
  const [isFullScreen, setIsFullScreen] = useState(true);

  // Quick PT Search & Category filter
  const [pointSearchQuery, setPointSearchQuery] = useState('');
  const [ptCategoryFilter, setPtCategoryFilter] = useState<'All' | 'PT' | 'Duty' | 'Sick' | 'Out'>('All');

  // ESC key to close listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Points enabled for the active tab (all batteries or specific battery)
  const tabPoints = useMemo(() => {
    return dynamicParadePoints.filter((pt) => {
      if (!pt.isActive) return false;
      if (activeTab === 'Consolidated') return true;
      return (
        !pt.enabledBatteries ||
        pt.enabledBatteries.includes(activeTab) ||
        pt.enabledBatteries.length === 0
      );
    });
  }, [dynamicParadePoints, activeTab]);

  // Filtered points visible in table (with search query and category filter)
  const visiblePoints = useMemo(() => {
    return tabPoints.filter((pt) => {
      // 1. Search Query
      if (pointSearchQuery.trim()) {
        const q = pointSearchQuery.toLowerCase();
        const matchesName = pt.name.toLowerCase().includes(q);
        const matchesCat = pt.category?.toLowerCase().includes(q);
        if (!matchesName && !matchesCat) return false;
      }

      // 2. Category Filter
      if (ptCategoryFilter === 'PT') {
        const lower = pt.name.toLowerCase();
        return (
          lower.includes('pt') ||
          lower.includes('parade') ||
          lower.includes('athletics') ||
          lower.includes('cadre') ||
          lower.includes('trg') ||
          lower.includes('course')
        );
      }
      if (ptCategoryFilter === 'Duty') {
        const lower = pt.name.toLowerCase();
        return (
          lower.includes('duty') ||
          lower.includes('guard') ||
          lower.includes('rp') ||
          lower.includes('canteen') ||
          lower.includes('cook') ||
          lower.includes('mess') ||
          lower.includes('mt') ||
          lower.includes('wksp') ||
          lower.includes('fresh') ||
          lower.includes('eqp')
        );
      }
      if (ptCategoryFilter === 'Sick') {
        const lower = pt.name.toLowerCase();
        return (
          lower.includes('sick') ||
          lower.includes('cmh') ||
          lower.includes('hosp') ||
          lower.includes('med')
        );
      }
      if (ptCategoryFilter === 'Out') {
        const lower = pt.name.toLowerCase();
        return (
          lower.includes('comd') ||
          lower.includes('leave') ||
          lower.includes('lve') ||
          lower.includes('att') ||
          lower.includes('off parade') ||
          lower.includes('chutti')
        );
      }

      return true;
    });
  }, [tabPoints, pointSearchQuery, ptCategoryFilter]);

  // Autocomplete suggestions for new point
  const pointSuggestions = useMemo(() => {
    if (!newPointName.trim()) return [];
    const query = newPointName.toLowerCase();
    const safeDailyPoints = Array.isArray(dailyParadePoints) ? dailyParadePoints : [];
    const existingNames = safeDailyPoints.map((p) => (p && p.name ? p.name.toLowerCase() : ''));
    return (DEFAULT_PARADE_POINTS || []).filter(
      (p) => p && p.toLowerCase().includes(query) && !existingNames.includes(p.toLowerCase())
    ).slice(0, 6);
  }, [newPointName, dailyParadePoints]);

  const [isEditing, setIsEditing] = useState(!isReadOnly);

  if (!isOpen) return null;

  const handleCountChange = (
    pointId: string,
    bty: Battery,
    field: 'offr' | 'jco' | 'or',
    valueStr: string
  ) => {
    if (isReadOnly) return;
    // Check if locked by RSM and current user is BSM
    const point = dailyParadePoints.find((p) => p.id === pointId);
    const isLocked = point?.lockedByRsm?.[bty];
    const isBsm = ['P BSM', 'Q BSM', 'R BSM', 'HQ BSM'].includes(currentUser.role);

    if (isLocked && isBsm) {
      alert('⚠️ এটা RSM কর্তৃক fixed করা হয়েছে, আপনি change করতে পারবেন না।');
      showNotification('⚠️ এটা RSM কর্তৃক fixed করা হয়েছে, আপনি change করতে পারবেন না।');
      return;
    }

    const val = parseInt(valueStr, 10);
    const safeVal = isNaN(val) || val < 0 ? 0 : val;

    setCountsBuffer((prev) => {
      const pointCounts = prev[pointId] || {
        'HQ Bty': { offr: 0, jco: 0, or: 0 },
        'P Bty': { offr: 0, jco: 0, or: 0 },
        'Q Bty': { offr: 0, jco: 0, or: 0 },
        'R Bty': { offr: 0, jco: 0, or: 0 },
      };

      const updatedBtyCount = {
        ...pointCounts[bty],
        [field]: safeVal,
      };

      const updated = {
        ...prev,
        [pointId]: {
          ...pointCounts,
          [bty]: updatedBtyCount,
        },
      };

      // Persist to context
      updateParadePointCount(pointId, bty, updatedBtyCount);

      return updated;
    });
  };

  const handleCreatePoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !newPointName.trim()) return;

    addDailyParadePoint(newPointName.trim(), newPointSelectedBtys);
    setNewPointName('');
    setIsAddingNewPoint(false);
  };

  // Grand totals computation
  const totals = useMemo(() => {
    let grandOffr = 0;
    let grandJco = 0;
    let grandOr = 0;

    tabPoints.forEach((pt) => {
      if (activeTab === 'Consolidated') {
        ALL_BATTERIES.forEach((bty) => {
          const c = pt.counts[bty] || { offr: 0, jco: 0, or: 0 };
          grandOffr += c.offr;
          grandJco += c.jco;
          grandOr += c.or;
        });
      } else {
        const c = pt.counts[activeTab] || { offr: 0, jco: 0, or: 0 };
        grandOffr += c.offr;
        grandJco += c.jco;
        grandOr += c.or;
      }
    });

    return {
      grandOffr,
      grandJco,
      grandOr,
      grandTotal: grandOffr + grandJco + grandOr,
    };
  }, [tabPoints, activeTab]);

  const handleDownloadState = () => {
    try {
      const rows: (string | number)[][] = [];
      rows.push(['10 MEDIUM REGIMENT ARTILLERY']);
      rows.push([`${sessionType.toUpperCase()} PARADE STATE - ${activeDate}`]);
      rows.push([`Generated on: ${new Date().toLocaleString()}`]);
      rows.push([]);
      rows.push([
        'SL',
        'Parade State / Duty Point',
        'HQ Offr',
        'HQ JCO',
        'HQ OR',
        'HQ Total',
        'P Offr',
        'P JCO',
        'P OR',
        'P Total',
        'Q Offr',
        'Q JCO',
        'Q OR',
        'Q Total',
        'R Offr',
        'R JCO',
        'R OR',
        'R Total',
        'Regt Offr',
        'Regt JCO',
        'Regt OR',
        'Grand Total',
      ]);

      visiblePoints.forEach((pt, idx) => {
        const hq = countsBuffer[pt.id]?.['HQ Bty'] || { offr: 0, jco: 0, or: 0 };
        const p = countsBuffer[pt.id]?.['P Bty'] || { offr: 0, jco: 0, or: 0 };
        const q = countsBuffer[pt.id]?.['Q Bty'] || { offr: 0, jco: 0, or: 0 };
        const r = countsBuffer[pt.id]?.['R Bty'] || { offr: 0, jco: 0, or: 0 };

        const hqTot = (hq.offr || 0) + (hq.jco || 0) + (hq.or || 0);
        const pTot = (p.offr || 0) + (p.jco || 0) + (p.or || 0);
        const qTot = (q.offr || 0) + (q.jco || 0) + (q.or || 0);
        const rTot = (r.offr || 0) + (r.jco || 0) + (r.or || 0);

        const offrTot = (hq.offr || 0) + (p.offr || 0) + (q.offr || 0) + (r.offr || 0);
        const jcoTot = (hq.jco || 0) + (p.jco || 0) + (q.jco || 0) + (r.jco || 0);
        const orTot = (hq.or || 0) + (p.or || 0) + (q.or || 0) + (r.or || 0);
        const grandTot = offrTot + jcoTot + orTot;

        rows.push([
          idx + 1,
          pt.name,
          hq.offr || 0,
          hq.jco || 0,
          hq.or || 0,
          hqTot,
          p.offr || 0,
          p.jco || 0,
          p.or || 0,
          pTot,
          q.offr || 0,
          q.jco || 0,
          q.or || 0,
          qTot,
          r.offr || 0,
          r.jco || 0,
          r.or || 0,
          rTot,
          offrTot,
          jcoTot,
          orTot,
          grandTot,
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `${sessionType} State`);
      XLSX.writeFile(wb, `10_Med_Regt_${sessionType}_Parade_State_${activeDate}.xlsx`);
      showNotification(`${sessionType} Parade State downloaded successfully!`);
    } catch (err) {
      console.error('Download error:', err);
      showNotification('Failed to export state.');
    }
  };

  const handlePrintState = () => {
    if (onOpenPrintModal) {
      onOpenPrintModal();
    } else {
      window.print();
    }
  };

  return (
    <div
      className={
        isFullScreen
          ? 'fixed inset-0 z-50 w-full h-full bg-slate-950 flex flex-col overflow-hidden animate-fadeIn'
          : 'fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn'
      }
    >
      <div
        className={
          isFullScreen
            ? 'relative w-full h-full bg-slate-950 flex flex-col overflow-hidden'
            : 'relative w-full max-w-7xl bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]'
        }
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition-all cursor-pointer shadow-sm group"
              title="Close & return to Dashboard (ড্যাশবোর্ডে ফিরুন)"
            >
              <ArrowLeft className="w-4 h-4 text-rose-400 group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden sm:inline">Back / ফেরত যান</span>
              <span className="sm:hidden">Back</span>
            </button>

            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shrink-0">
              <Layers className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  {sessionType} Parade State
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {isBsm ? `${activeTab} View` : 'Regimental Full Overview'}
                </span>
                {isFullScreen && (
                  <span className="hidden sm:inline px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    FULL SCREEN
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-mono hidden sm:block">
                10 Medium Regiment Artillery — Comprehensive Parade &amp; PT Inspection Sheet
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Date Selector Inside Session Sheet */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700/80 shadow-inner">
              <Clock className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-xs text-slate-400 font-mono font-bold">Date:</span>
              <input
                type="date"
                value={activeDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedParadeDate(e.target.value);
                    showNotification(`Date changed to ${e.target.value}`);
                  }
                }}
                className="bg-transparent text-white font-mono font-bold text-xs focus:outline-none cursor-pointer"
              />
            </div>

            {/* Direct Quick Save Button in Header */}
            {!isReadOnly && (
              <button
                onClick={() => {
                  showNotification('✅ Parade State Saved & Synchronized successfully.');
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black transition-all cursor-pointer shadow-md shadow-emerald-950/40 hover:scale-105 active:scale-95"
                title="Save & Sync Parade State (সেভ করুন)"
              >
                <Check className="w-4 h-4 text-white" />
                <span>Save State</span>
              </button>
            )}

            {/* Download State Button */}
            <button
              onClick={handleDownloadState}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer shadow-sm hover:border-emerald-500/50"
              title="Download Parade State Excel Sheet"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Download State</span>
              <span className="sm:hidden">Excel</span>
            </button>

            {/* Print State Button */}
            <button
              onClick={() => {
                if (onOpenPrintModal) {
                  onOpenPrintModal();
                } else {
                  window.print();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer shadow-sm hover:border-blue-500/50"
              title="Print Parade State Sheet"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Print State</span>
              <span className="sm:hidden">Print</span>
            </button>

            {/* Fullscreen Toggle Button */}
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700"
              title={isFullScreen ? 'Exit Full Screen (Window Mode)' : 'Enter Full Screen'}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-white transition-colors cursor-pointer ml-1 border border-slate-700"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Guest or Officer/CO View-Only Notice Banner */}
        {isGuest ? (
          <div className="px-6 py-2.5 bg-gradient-to-r from-amber-600/20 via-slate-900 to-amber-600/20 border-b border-amber-500/40 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-amber-300 font-mono font-bold">
              <Eye className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                GUEST — VIEW ONLY
              </span>
              <span>DEMO MODE — COMPLETE PARADE STATE INSPECTION</span>
            </div>
            <span className="text-[11px] text-amber-200/90 font-mono">
              Parade State is view-only. You can inspect all battery breakdowns, totals, and export sheets.
            </span>
          </div>
        ) : isReadOnly && (
          <div className="px-6 py-2.5 bg-gradient-to-r from-amber-500/10 via-slate-900 to-amber-500/10 border-b border-amber-500/30 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-amber-300 font-mono font-semibold">
              <Eye className="w-4 h-4 text-amber-400 shrink-0" />
              <span>OFFICER &amp; CO INSPECTION MODE — VIEW-ONLY ACCESS</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Parade State is locked against edits. Complete summary &amp; details for {activeDate}.
            </span>
          </div>
        )}

        {/* Complete Summary / Strength Information for activeDate */}
        {(() => {
          const regtTotals = getRegimentalTotals();
          return (
            <div className="px-6 py-2.5 bg-slate-900/95 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Total Posted</span>
                  <span className="text-[9px] text-slate-500 font-mono">Tot: {regtTotals.totalPersonnel}</span>
                </div>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-base font-bold font-mono text-white">{regtTotals.totalPosted}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    (ERE: {regtTotals.ere}, Civ: {regtTotals.civilian})
                  </span>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-950/80 border border-rose-500/20">
                <span className="text-[10px] uppercase font-mono text-rose-400 block">Out of Unit</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-base font-bold font-mono text-rose-300">{regtTotals.totalOutOfUnit}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    (Lve: {regtTotals.lve}, Crs: {regtTotals.totalCourse}, CMH: {regtTotals.totalSick})
                  </span>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-950/80 border border-cyan-500/20">
                <span className="text-[10px] uppercase font-mono text-cyan-400 block">Present in Unit</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-base font-bold font-mono text-cyan-300">{regtTotals.presentInUnit}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    (Posted - Out)
                  </span>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-950/80 border border-amber-500/20">
                <span className="text-[10px] uppercase font-mono text-amber-400 block">Off Parade</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-base font-bold font-mono text-amber-300">{regtTotals.offParade}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    (Duty: {regtTotals.totalDuty} + LS: {regtTotals.totalLineSick})
                  </span>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-950/80 border border-emerald-500/30 bg-emerald-950/10">
                <span className="text-[10px] uppercase font-mono text-emerald-400 block font-bold">On Parade</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-base font-extrabold font-mono text-emerald-300">{regtTotals.onParade}</span>
                  <span className="text-[10px] text-emerald-400/80 font-mono">
                    ({regtTotals.onParadePercentage}%)
                  </span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Tab Selection & PT Filter Control Bar */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* View Mode & Battery Tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            {(isRsmOrAdmin || isReadOnly) && (
              <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-700/80 text-xs font-mono font-bold">
                <button
                  onClick={() => {
                    setRsmViewMode('Summary');
                    setActiveTab('Consolidated');
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    rsmViewMode === 'Summary'
                      ? 'bg-rose-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Summary View (Consolidated)
                </button>
                <button
                  onClick={() => {
                    setRsmViewMode('Detail');
                    if (activeTab === 'Consolidated') setActiveTab('P Bty');
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    rsmViewMode === 'Detail'
                      ? 'bg-rose-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Detail View
                </button>
              </div>
            )}

            {/* Battery selection (for Detail view or BSM view) */}
            {((!isRsmOrAdmin && !isReadOnly) || rsmViewMode === 'Detail') && (
              <div className="flex items-center gap-1.5">
                {ALL_BATTERIES.map((bty) => {
                  if (isBsm && currentUser.assignedBattery && currentUser.assignedBattery !== bty) {
                    return null; // BSM only sees assigned battery
                  }
                  return (
                    <button
                      key={bty}
                      onClick={() => setActiveTab(bty)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        activeTab === bty
                          ? 'bg-gradient-to-r from-slate-800 to-slate-700 text-white border border-slate-600 shadow-md'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
                      }`}
                    >
                      <span>{bty}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick PT Search & Category Filters */}
          <div className="flex items-center gap-2 flex-1 max-w-xl justify-end flex-wrap">
            {/* Search Input */}
            <div className="relative min-w-[200px] sm:min-w-[240px] flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={pointSearchQuery}
                onChange={(e) => setPointSearchQuery(e.target.value)}
                placeholder="Search PT / Point (e.g. GPT, On Parade, Sick)..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
              {pointSearchQuery && (
                <button
                  type="button"
                  onClick={() => setPointSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1">
              {[
                { key: 'All', label: 'All PTs' },
                { key: 'PT', label: '🏃 PT/Parade' },
                { key: 'Duty', label: '🛡️ Duties' },
                { key: 'Sick', label: '🏥 Sick' },
                { key: 'Out', label: '✈️ Out' },
              ].map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => setPtCategoryFilter(chip.key as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    ptCategoryFilter === chip.key
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* RSM Controls Toggle */}
            {isRsmOrAdmin && !isReadOnly && (
              <button
                onClick={() => setShowRsmControls(!showRsmControls)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer whitespace-nowrap ${
                  showRsmControls
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
                title="Toggle Battery Visibility Controls"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Visibility</span>
              </button>
            )}

            {/* ONLY ADMIN can add new points / boxes */}
            {isAdmin && !isReadOnly && (
              <button
                onClick={() => setIsAddingNewPoint(!isAddingNewPoint)}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Point</span>
              </button>
            )}
          </div>
        </div>

        {/* Visibility Controls Panel */}
        {showRsmControls && isRsmOrAdmin && !isReadOnly && (
          <div className="px-6 py-4 bg-slate-950 border-b border-amber-500/30 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  Parade Points Battery Visibility Controls
                </h4>
              </div>
            </div>

            <div className="max-h-40 overflow-y-auto pr-2 space-y-1.5 scrollbar-thin">
              {dynamicParadePoints.map((pt) => {
                const enabled = pt.enabledBatteries || ALL_BATTERIES;
                return (
                  <div
                    key={pt.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{pt.name}</span>
                      {pt.category && (
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                          {pt.category}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {ALL_BATTERIES.map((bty) => {
                        const isChecked = enabled.includes(bty);
                        return (
                          <label
                            key={bty}
                            className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) =>
                                togglePointForBattery(pt.id, bty, e.target.checked)
                              }
                              className="rounded border-slate-700 bg-slate-950 text-rose-600 focus:ring-rose-500"
                            />
                            <span>{bty}</span>
                          </label>
                        );
                      })}
                      {isAdmin && !isReadOnly && (
                        <button
                          onClick={() => deleteDailyParadePoint(pt.id)}
                          className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors ml-2"
                          title="Delete Point (Admin Only)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add New Custom Point Form */}
        {isAddingNewPoint && !isReadOnly && (
          <form
            onSubmit={handleCreatePoint}
            className="px-6 py-4 bg-slate-950 border-b border-rose-500/30 space-y-3 animate-fadeIn"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                <span>Create New Duty / Parade Point</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsAddingNewPoint(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold text-xs mb-1">
                  Point Name * (Autosuggests previous regiment points)
                </label>
                <input
                  type="text"
                  required
                  value={newPointName}
                  onChange={(e) => setNewPointName(e.target.value)}
                  placeholder="e.g. Special Guard, VIP Escort, Gun Park"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />

                {/* Suggestions Pills */}
                {pointSuggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-[10px] text-slate-400 self-center">Suggestions:</span>
                    {pointSuggestions.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setNewPointName(sug)}
                        className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white border border-slate-700 font-medium transition-colors"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-semibold text-xs mb-1">
                  Enable for Batteries
                </label>
                <div className="flex items-center gap-3 pt-2">
                  {ALL_BATTERIES.map((bty) => {
                    const checked = newPointSelectedBtys.includes(bty);
                    return (
                      <label
                        key={bty}
                        className="flex items-center gap-1.5 text-xs text-slate-300 font-mono cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewPointSelectedBtys([...newPointSelectedBtys, bty]);
                            } else {
                              setNewPointSelectedBtys(
                                newPointSelectedBtys.filter((b) => b !== bty)
                              );
                            }
                          }}
                          className="rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-rose-500"
                        />
                        <span>{bty}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingNewPoint(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-900/40 cursor-pointer"
              >
                Save Point
              </button>
            </div>
          </form>
        )}

        {/* Parade State Table & Duty Section */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* Duty Heading Boxes (1. Unit Sy, 2. working, 3. Fixed Duty, 4. Others) */}
          <ParadeDutyHeadingBoxes
            date={activeDate}
            sessionType={sessionType}
            isReadOnly={isReadOnly}
            filterBattery={activeTab}
          />

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 shadow-inner">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md shadow-sm">
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3 w-12 text-center">Sl</th>
                  <th className="py-3 px-4 min-w-[220px]">Duty Point / PT (প্যারেড পয়েন্ট)</th>
                  {activeTab === 'Consolidated' ? (
                    <>
                      <th className="py-3 px-3 text-center bg-slate-950/40">HQ Bty</th>
                      <th className="py-3 px-3 text-center bg-slate-950/40">P Bty</th>
                      <th className="py-3 px-3 text-center bg-slate-950/40">Q Bty</th>
                      <th className="py-3 px-3 text-center bg-slate-950/40">R Bty</th>
                      <th className="py-3 px-3 text-center font-bold text-rose-400">Total Offr</th>
                      <th className="py-3 px-3 text-center font-bold text-rose-400">Total JCO</th>
                      <th className="py-3 px-3 text-center font-bold text-rose-400">Total OR</th>
                      <th className="py-3 px-4 text-right font-bold text-white bg-slate-900">Total (যোগফল)</th>
                    </>
                  ) : (
                    <>
                      <th className="py-3.5 px-4 text-center w-36 sm:w-44 text-slate-300 font-bold">Offr (অফিসার)</th>
                      <th className="py-3.5 px-4 text-center w-36 sm:w-44 text-slate-300 font-bold">JCO (জেসিও)</th>
                      <th className="py-3.5 px-4 text-center w-36 sm:w-44 text-slate-300 font-bold">OR (সৈনিক)</th>
                      <th className="py-3.5 px-4 text-right font-bold text-rose-300 w-40 sm:w-48 bg-slate-900/80">
                        Total / যোগফল
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {visiblePoints.map((pt, idx) => {
                  const upperName = pt.name.toUpperCase();
                  const isMainParade =
                    upperName.includes('ON PARADE') ||
                    upperName === 'GPT' ||
                    upperName === 'IPFT' ||
                    upperName.includes('PHYSICAL TRAINING');

                  if (activeTab === 'Consolidated') {
                    const hq = pt.counts['HQ Bty'] || { offr: 0, jco: 0, or: 0 };
                    const p = pt.counts['P Bty'] || { offr: 0, jco: 0, or: 0 };
                    const q = pt.counts['Q Bty'] || { offr: 0, jco: 0, or: 0 };
                    const r = pt.counts['R Bty'] || { offr: 0, jco: 0, or: 0 };

                    const ptTotalOffr = hq.offr + p.offr + q.offr + r.offr;
                    const ptTotalJco = hq.jco + p.jco + q.jco + r.jco;
                    const ptTotalOr = hq.or + p.or + q.or + r.or;
                    const ptGrand = ptTotalOffr + ptTotalJco + ptTotalOr;

                    return (
                      <tr
                        key={pt.id}
                        className={`transition-colors ${
                          isMainParade
                            ? 'bg-emerald-950/25 hover:bg-emerald-950/35 border-l-4 border-l-emerald-500'
                            : 'hover:bg-slate-900/60'
                        }`}
                      >
                        <td className="py-3 px-3 text-center text-slate-500 font-mono text-sm">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-200">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={isMainParade ? 'text-emerald-300 font-black text-sm sm:text-base' : 'text-sm text-slate-200'}>
                              {pt.name}
                            </span>
                            {isMainParade && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 uppercase tracking-wider">
                                MAIN PT
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-300 bg-slate-950/20 text-sm">
                          {hq.offr + hq.jco + hq.or}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-300 bg-slate-950/20 text-sm">
                          {p.offr + p.jco + p.or}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-300 bg-slate-950/20 text-sm">
                          {q.offr + q.jco + q.or}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-300 bg-slate-950/20 text-sm">
                          {r.offr + r.jco + r.or}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-300 text-sm">
                          {ptTotalOffr}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-300 text-sm">
                          {ptTotalJco}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-300 text-sm">
                          {ptTotalOr}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-white text-base bg-slate-900/40">
                          {ptGrand}
                        </td>
                      </tr>
                    );
                  }

                  // Single Battery Edit Row
                  const currentCounts = pt.counts[activeTab] || { offr: 0, jco: 0, or: 0 };
                  const rowTotal = currentCounts.offr + currentCounts.jco + currentCounts.or;
                  const isLockedByRsm = Boolean(pt.lockedByRsm?.[activeTab]);
                  const lastTime = pt.lastUpdated?.[activeTab] || pt.rsmFixedAt?.[activeTab];
                  const isBsm = ['P BSM', 'Q BSM', 'R BSM', 'HQ BSM'].includes(currentUser.role);
                  const isInputDisabled = !isEditing || (isLockedByRsm && isBsm);

                  return (
                    <tr
                      key={pt.id}
                      className={`transition-colors ${
                        isLockedByRsm
                          ? 'bg-amber-950/10'
                          : isMainParade
                          ? 'bg-emerald-950/25 hover:bg-emerald-950/35 border-l-4 border-l-emerald-500'
                          : 'hover:bg-slate-900/60'
                      }`}
                    >
                      <td className="py-3 px-3 text-center text-slate-500 font-mono text-sm font-semibold">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-200">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={isMainParade ? 'text-emerald-300 font-black text-sm sm:text-base' : 'text-sm font-bold text-slate-200'}>
                            {pt.name}
                          </span>
                          {isMainParade && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 uppercase tracking-wider">
                              MAIN PT
                            </span>
                          )}
                          {isLockedByRsm && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <span>🔒 RSM Fixed</span>
                              {lastTime && <span>({lastTime})</span>}
                            </span>
                          )}
                          {!isLockedByRsm && lastTime && (
                            <span className="text-[9px] font-mono text-slate-500">
                              Updt: {lastTime}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isReadOnly ? (
                          <span className="inline-block min-w-16 py-2 px-3 font-mono font-black text-slate-100 text-base bg-slate-950/80 rounded-xl border border-slate-800 shadow-inner">
                            {currentCounts.offr}
                          </span>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            disabled={isInputDisabled}
                            value={currentCounts.offr}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) =>
                              handleCountChange(pt.id, activeTab, 'offr', e.target.value)
                            }
                            className={`w-28 sm:w-36 border-2 rounded-xl py-2 px-3 text-center font-mono font-black text-base sm:text-lg transition-all shadow-inner focus:outline-none ${
                              isInputDisabled
                                ? 'bg-slate-900/60 border-slate-800 text-slate-500 cursor-not-allowed'
                                : 'bg-slate-950 border-slate-700 text-white hover:border-slate-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/40'
                            }`}
                          />
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isReadOnly ? (
                          <span className="inline-block min-w-16 py-2 px-3 font-mono font-black text-slate-100 text-base bg-slate-950/80 rounded-xl border border-slate-800 shadow-inner">
                            {currentCounts.jco}
                          </span>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            disabled={isInputDisabled}
                            value={currentCounts.jco}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) =>
                              handleCountChange(pt.id, activeTab, 'jco', e.target.value)
                            }
                            className={`w-28 sm:w-36 border-2 rounded-xl py-2 px-3 text-center font-mono font-black text-base sm:text-lg transition-all shadow-inner focus:outline-none ${
                              isInputDisabled
                                ? 'bg-slate-900/60 border-slate-800 text-slate-500 cursor-not-allowed'
                                : 'bg-slate-950 border-slate-700 text-white hover:border-slate-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/40'
                            }`}
                          />
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isReadOnly ? (
                          <span className="inline-block min-w-16 py-2 px-3 font-mono font-black text-slate-100 text-base bg-slate-950/80 rounded-xl border border-slate-800 shadow-inner">
                            {currentCounts.or}
                          </span>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            disabled={isInputDisabled}
                            value={currentCounts.or}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) =>
                              handleCountChange(pt.id, activeTab, 'or', e.target.value)
                            }
                            className={`w-28 sm:w-36 border-2 rounded-xl py-2 px-3 text-center font-mono font-black text-base sm:text-lg transition-all shadow-inner focus:outline-none ${
                              isInputDisabled
                                ? 'bg-slate-900/60 border-slate-800 text-slate-500 cursor-not-allowed'
                                : 'bg-slate-950 border-slate-700 text-white hover:border-slate-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/40'
                            }`}
                          />
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-black text-rose-400 text-lg sm:text-xl bg-slate-900/70">
                        {rowTotal}
                      </td>
                    </tr>
                  );
                })}

                {visiblePoints.length === 0 && (
                  <tr>
                    <td
                      colSpan={activeTab === 'Consolidated' ? 10 : 6}
                      className="py-12 text-center text-slate-400 font-mono"
                    >
                      <span>No parade points matched "{pointSearchQuery || ptCategoryFilter}".</span>
                      <button
                        type="button"
                        onClick={() => {
                          setPointSearchQuery('');
                          setPtCategoryFilter('All');
                        }}
                        className="ml-2 text-rose-400 underline font-bold cursor-pointer"
                      >
                        Reset Filter
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="sticky bottom-0 z-20 bg-slate-950 border-t-2 border-slate-700 shadow-2xl">
                <tr className="bg-slate-950 font-bold text-white text-xs">
                  <td colSpan={2} className="py-3.5 px-4 text-rose-400 uppercase tracking-wider">
                    {activeTab === 'Consolidated'
                      ? 'Regimental Grand Total (সর্বমোট প্যারেড স্টেট)'
                      : `${activeTab} Total (সর্বমোট)`}
                  </td>
                  {activeTab === 'Consolidated' ? (
                    <>
                      <td colSpan={4} className="py-3.5 px-3 text-center text-slate-400 font-mono">
                        4 Batteries Consolidated
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono text-white text-sm">
                        {totals.grandOffr}
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono text-white text-sm">
                        {totals.grandJco}
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono text-white text-sm">
                        {totals.grandOr}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-rose-400 font-extrabold text-base bg-rose-500/10">
                        {totals.grandTotal}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-3.5 px-3 text-center font-mono text-white text-sm">
                        {totals.grandOffr}
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono text-white text-sm">
                        {totals.grandJco}
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono text-white text-sm">
                        {totals.grandOr}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-rose-400 font-extrabold text-base bg-rose-500/10">
                        {totals.grandTotal}
                      </td>
                    </>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            {isReadOnly ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono font-semibold text-[11px]">
                <Eye className="w-3.5 h-3.5" />
                <span>View-Only Access (Officer / CO Mode)</span>
              </span>
            ) : (
              <span className="text-slate-500 font-mono text-[11px]">
                * Modifications auto-sync across regimental parade records
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Download Parade State Option */}
            <button
              onClick={handleDownloadState}
              className="px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white font-bold text-xs transition-all border border-emerald-500/40 cursor-pointer flex items-center gap-1.5 shadow-sm"
              title="Download Parade State Excel"
            >
              <Download className="w-4 h-4" />
              <span>Download Parade State</span>
            </button>

            {/* Print / Official Sheet Option */}
            {onOpenPrintModal && (
              <button
                onClick={onOpenPrintModal}
                className="px-3.5 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs transition-all border border-slate-700 cursor-pointer flex items-center gap-1.5"
                title="Print Official Parade Sheet"
              >
                <Printer className="w-3.5 h-3.5 text-blue-400" />
                <span>Print / Official Sheet</span>
              </button>
            )}

            {!isReadOnly && (
              <>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    isEditing
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                  }`}
                >
                  {isEditing ? '🔒 Lock View' : '✏️ Edit State'}
                </button>

                {/* BSM Submit / Resubmit action */}
                {isBsm && (
                  <button
                    onClick={() => {
                      const bty = activeTab === 'Consolidated' ? ((currentUser.assignedBattery as Battery) || 'P Bty') : (activeTab as Battery);
                      const btyCounts: Record<string, ParadePointCount> = {};
                      visiblePoints.forEach((pt) => {
                        btyCounts[pt.id] = countsBuffer[pt.id]?.[bty] || pt.counts[bty] || { offr: 0, jco: 0, or: 0 };
                      });
                      saveParadeRecordCounts(activeDate, sessionType, bty, btyCounts, 'Submitted');
                      showNotification(`✅ ${bty} ${sessionType} স্টেট RSM-এর কাছে দাখিল ও সফলভাবে সংরক্ষিত হয়েছে।`);
                      onClose();
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white font-bold text-xs transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Submit to RSM / দাখিল করুন</span>
                  </button>
                )}

                {/* RSM Single Battery Confirm or Finalize */}
                {isRsmOrAdmin && activeTab !== 'Consolidated' && (
                  <button
                    onClick={() => {
                      const bty = activeTab as Battery;
                      const btyCounts: Record<string, ParadePointCount> = {};
                      visiblePoints.forEach((pt) => {
                        btyCounts[pt.id] = countsBuffer[pt.id]?.[bty] || pt.counts[bty] || { offr: 0, jco: 0, or: 0 };
                      });
                      saveParadeRecordCounts(activeDate, sessionType, bty, btyCounts, 'Confirmed');
                      confirmBatteryParadeRecord(activeDate, sessionType, bty);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm {activeTab}</span>
                  </button>
                )}

                {isRsmOrAdmin && (
                  <button
                    onClick={() => {
                      ALL_BATTERIES.forEach((bty) => {
                        const btyCounts: Record<string, ParadePointCount> = {};
                        visiblePoints.forEach((pt) => {
                          btyCounts[pt.id] = countsBuffer[pt.id]?.[bty] || pt.counts[bty] || { offr: 0, jco: 0, or: 0 };
                        });
                        saveParadeRecordCounts(activeDate, sessionType, bty, btyCounts, 'Finalized');
                      });
                      finalizeParadeType(activeDate, sessionType);
                      onClose();
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 text-white font-bold text-xs transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Finalize {sessionType} State</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    ALL_BATTERIES.forEach((bty) => {
                      const btyCounts: Record<string, ParadePointCount> = {};
                      visiblePoints.forEach((pt) => {
                        btyCounts[pt.id] = countsBuffer[pt.id]?.[bty] || pt.counts[bty] || { offr: 0, jco: 0, or: 0 };
                      });
                      const existing = getParadeRecord(activeDate, sessionType, bty);
                      saveParadeRecordCounts(activeDate, sessionType, bty, btyCounts, existing.status);
                    });
                    showNotification(`✅ ${sessionType} প্যারেড স্টেট (${activeDate}) সফলভাবে সংরক্ষিত ও ক্লাউডে সিঙ্ক হয়েছে।`);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-white" />
                  <span>Save Changes / সংরক্ষণ করুন</span>
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
