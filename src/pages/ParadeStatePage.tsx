import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ParadeStateSummaryGrid } from '../components/parade/ParadeStateSummaryGrid';
import { DailyParadeStateModal } from '../components/parade/DailyParadeStateModal';
import { ParadeStateSummaryModal } from '../components/parade/ParadeStateSummaryModal';
import { Personnel, Battery, isOfficerRank } from '../types';
import {
  Plus,
  PersonStanding,
  Dumbbell,
  Trophy,
  Trash2,
  Calendar,
  Clock,
  X,
  Maximize2,
  ChevronDown,
  Check,
  Eye,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

const PARADE_TYPE_DROPDOWN_OPTIONS = [
  { id: 'Ni trg', label: '1. Ni trg', desc: 'Night Training (রাত্রীকালীন প্যারেড / নাইট ট্রেনিং)' },
  { id: 'Darbar', label: '2. Darbar', desc: 'Regimental Darbar (দরবার প্যারেড)' },
  { id: 'Tv Room', label: '3. Tv Room', desc: 'TV Room Roll Call (টিভি রুম সমাবেশ)' },
  { id: 'Other', label: '4. Other', desc: 'Custom Name (কাস্টম নাম এন্ট্রি করুন)' },
] as const;

interface ParadeStatePageProps {
  onViewDossier: (person: Personnel) => void;
  onOpenAddModal: () => void;
  onOpenPrintModal: () => void;
}

export const ParadeStatePage: React.FC<ParadeStatePageProps> = ({
  onViewDossier,
  onOpenAddModal,
  onOpenPrintModal,
}) => {
  const {
    personnelList,
    currentUser,
    isAdmin,
    getRegimentalTotals,
    showNotification,
    addAuditLog,
    paradeBatteryStatus,
    setBatteryParadeStatus,
    selectedParadeDate,
    setSelectedParadeDate,
    paradeTypes,
    addParadeType,
    deleteParadeType,
    getParadeRecord,
    confirmBatteryParadeRecord,
    finalizeParadeType,
    dailyParadePoints,
    setActivePage,
    getParadeDutyAssignments,
  } = useApp();

  const [activeModalSession, setActiveModalSession] = useState<string | null>(null);
  const [isAddTypeModalOpen, setIsAddTypeModalOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('Ni trg');
  const [selectedTypePreset, setSelectedTypePreset] = useState<string>('Ni trg');
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState<boolean>(false);
  const [selectedDutySession, setSelectedDutySession] = useState<string>('Morning');

  const totals = getRegimentalTotals();
  const isOfficerOrCo =
    currentUser.role === 'CO' ||
    currentUser.role === 'Offr' ||
    (currentUser.role as string) === '2IC' ||
    (currentUser.role as string) === 'Officer' ||
    isOfficerRank(currentUser.rank);
  const isActualRsm = currentUser.role === 'RSM';
  const isBsm = !isOfficerOrCo && ['P BSM', 'Q BSM', 'R BSM', 'HQ BSM'].includes(currentUser.role);
  const isRsm = !isOfficerOrCo && (currentUser.role === 'RSM' || currentUser.role === 'Admin' || isAdmin);
  const assignedBty = (currentUser.assignedBattery as Battery) || 'P Bty';
  const isReadOnly = isOfficerOrCo || currentUser.role === 'Guest';

  // Filter out soft-deleted/archived parade states for normal display across all dashboards
  const activeParadeTypes = useMemo(() => {
    const list = Array.isArray(paradeTypes) ? paradeTypes : [];
    return list.filter((t) => t && !t.isDeleted && !t.deleted && t.isActive !== false);
  }, [paradeTypes]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Confirmed':
        return { text: '✓ Confirmed', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
      case 'Finalized':
        return { text: '✓ Finalized', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40' };
      case 'Edited by RSM':
        return { text: '✎ Edited by RSM', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
      case 'Submitted':
      case 'Pending RSM Confirmation':
        return { text: '⏳ Pending RSM', bg: 'bg-blue-500/20 text-blue-300 border-blue-500/40' };
      default:
        return { text: 'Draft', bg: 'bg-slate-800 text-slate-400 border-slate-700' };
    }
  };

  const getParadeTypeIcon = (typeName: string) => {
    const lower = typeName.toLowerCase();
    // 2nd period: Strictly multiple soldiers falling in / standing in formation
    if (lower.includes('second') || lower.includes('period') || lower.includes('cadre') || lower.includes('trg')) {
      return (
        <div className="flex items-center -space-x-1.5 text-cyan-400" title="Soldiers Fall-in Formation">
          <PersonStanding className="w-4 h-4 text-cyan-400/80" />
          <PersonStanding className="w-5 h-5 text-cyan-300 scale-110" />
          <PersonStanding className="w-4 h-4 text-cyan-400/80" />
        </div>
      );
    }
    if (lower.includes('game') || lower.includes('sport')) {
      return (
        <div className="relative flex items-center justify-center" title="Games & Sports">
          <PersonStanding className="w-5 h-5 text-emerald-400" />
          <Trophy className="w-3 h-3 text-amber-300 absolute -bottom-0.5 -right-0.5 drop-shadow" />
        </div>
      );
    }
    // Default & Morning State: Soldier doing PT (PersonStanding + Dumbbell)
    return (
      <div className="relative flex items-center justify-center" title="Soldier doing PT">
        <PersonStanding className="w-5 h-5 text-rose-400" />
        <Dumbbell className="w-3 h-3 text-amber-300 absolute -bottom-0.5 -right-0.5 drop-shadow" />
      </div>
    );
  };

  const getParadeTypeStats = (typeName: string) => {
    let count = 0;
    let lastEditTime = 'Not Edited';

    const onParadePt = dailyParadePoints.find(
      (p) => p.name.trim().toUpperCase() === 'ON PARADE'
    );

    if (isBsm) {
      const rec = getParadeRecord(selectedParadeDate, typeName, assignedBty);
      const ptCount = onParadePt && rec.counts?.[onParadePt.id];
      if (ptCount && (ptCount.offr + ptCount.jco + ptCount.or > 0)) {
        count = ptCount.offr + ptCount.jco + ptCount.or;
      } else {
        count = personnelList.filter(
          (p) => p.battery === assignedBty && p.status === 'Present'
        ).length;
      }
      if (rec.lastUpdated && rec.lastUpdated !== 'Not submitted') {
        lastEditTime = rec.lastUpdated;
      }
    } else {
      let regtCount = 0;
      let hasRecordCounts = false;
      let latestEdit = '';

      (['P Bty', 'Q Bty', 'R Bty', 'HQ Bty'] as Battery[]).forEach((bty) => {
        const rec = getParadeRecord(selectedParadeDate, typeName, bty);
        const ptCount = onParadePt && rec.counts?.[onParadePt.id];
        if (ptCount && (ptCount.offr + ptCount.jco + ptCount.or > 0)) {
          regtCount += ptCount.offr + ptCount.jco + ptCount.or;
          hasRecordCounts = true;
        }
        if (rec.lastUpdated && rec.lastUpdated !== 'Not submitted') {
          if (!latestEdit || rec.lastUpdated > latestEdit) {
            latestEdit = rec.lastUpdated;
          }
        }
      });

      count = hasRecordCounts ? regtCount : totals.totalPresent;
      lastEditTime = latestEdit || 'Not Edited';
    }

    let formattedEditTime = lastEditTime;
    if (lastEditTime.includes(' ')) {
      formattedEditTime = lastEditTime;
    } else if (lastEditTime.includes('T')) {
      const d = new Date(lastEditTime);
      if (!isNaN(d.getTime())) {
        formattedEditTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      }
    }

    return { count, lastEditTime: formattedEditTime };
  };

  return (
    <div className="space-y-4">
      {/* Date Selector Only (No Box, No Quick Entry) */}
      <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap pb-1">
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 shadow-inner">
          <Calendar className="w-4 h-4 text-slate-400 ml-1.5" />
          <span className="text-xs font-mono text-slate-400 font-medium">Date:</span>
          <button
            type="button"
            onClick={() => {
              const d = new Date(selectedParadeDate);
              d.setDate(d.getDate() - 1);
              setSelectedParadeDate(d.toISOString().slice(0, 10));
            }}
            className="px-2 py-1 rounded-lg text-xs font-mono text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Previous Day"
          >
            ← Prev
          </button>
          <input
            type="date"
            value={selectedParadeDate}
            onChange={(e) => e.target.value && setSelectedParadeDate(e.target.value)}
            className="bg-slate-900 text-white font-mono font-bold text-xs px-2.5 py-1 rounded-lg border border-slate-700/80 focus:outline-none focus:border-rose-500 cursor-pointer"
          />
          <button
            type="button"
            onClick={() => {
              setSelectedParadeDate(new Date().toISOString().slice(0, 10));
            }}
            className="px-2 py-1 rounded-lg text-[11px] font-mono font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
            title="Today"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => {
              const d = new Date(selectedParadeDate);
              d.setDate(d.getDate() + 1);
              setSelectedParadeDate(d.toISOString().slice(0, 10));
            }}
            className="px-2 py-1 rounded-lg text-xs font-mono text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Next Day"
          >
            Next →
          </button>
        </div>
      </div>

      {/* PRIMARY PARADE STATE TYPE BOXES/CARDS (Morning, Second Period, Games + Dynamic) */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {(activeParadeTypes || []).map((type) => {
            const btyRecord = getParadeRecord(selectedParadeDate, type.name, assignedBty);
            const badge = getStatusBadge(btyRecord.status);
            const stats = getParadeTypeStats(type.name);

            // Permission rules for deleting parade states:
            // Default core types ('Morning', 'Second Period', 'Games') can NEVER be deleted.
            // All custom types (including box 4, box 5, and any future ones) are RSM-created and can be deleted by RSM (or Admin).
            const isDefaultType =
              ['Morning', 'Second Period', 'Games'].includes(type.name) ||
              ['Morning', 'Second Period', 'Games'].includes(type.id);
            const canDelete = (isActualRsm || isAdmin) && !isDefaultType;

            return (
              <div
                key={type.id}
                onClick={() => setActiveModalSession(type.name)}
                className="relative overflow-hidden rounded-xl border border-slate-800/80 hover:border-emerald-500/60 bg-gradient-to-b from-slate-900/90 to-slate-950 p-3 sm:p-3.5 shadow-md shadow-slate-950/30 transition-all duration-200 cursor-pointer hover:-translate-y-0.5 group flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block truncate font-mono">
                        {type.name} Parade
                      </span>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Are you sure you want to delete "${type.name}" Parade State?`)) {
                              deleteParadeType(type.id);
                            }
                          }}
                          title={`Delete ${type.name} Parade State`}
                          className="text-slate-500 hover:text-rose-400 transition-colors p-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-white">
                        {stats.count}
                      </span>
                      <span className="text-[11px] font-semibold font-mono text-emerald-400">
                        On Parade
                      </span>
                    </div>

                    <p className="mt-0.5 text-[11px] text-slate-400 font-mono truncate">
                      {selectedParadeDate} • {badge.text}
                    </p>
                  </div>

                  <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0 group-hover:scale-105 transition-transform">
                    {getParadeTypeIcon(type.name)}
                  </div>
                </div>

                <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>Edit: {stats.lastEditTime}</span>
                  <span className="text-slate-400 font-semibold">{isBsm ? assignedBty : 'Regiment'}</span>
                </div>
              </div>
            );
          })}

          {/* Sequential ADD NEW PARADE STATE box — exclusively visible to RSM & Admin */}
          {(isActualRsm || isAdmin) && (
            <div
              id="btn-add-new-parade-state-box"
              onClick={() => {
                setSelectedTypePreset('Ni trg');
                setNewTypeName('Ni trg');
                setIsTypeDropdownOpen(false);
                setIsAddTypeModalOpen(true);
              }}
              className="relative overflow-hidden rounded-xl border border-dashed border-slate-700/80 hover:border-purple-500/60 bg-gradient-to-b from-purple-950/10 to-slate-900/60 p-3 sm:p-3.5 shadow-md transition-all duration-200 cursor-pointer hover:-translate-y-0.5 flex flex-col justify-center items-center text-center group min-h-[90px]"
            >
              <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-1 group-hover:scale-105 transition-transform">
                <Plus className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300 group-hover:text-purple-300 font-mono">
                + Add Parade State
              </span>
              <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                RSM / Admin
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Duty Detailing Section - Relocated to Dedicated Full Board for RSM between Parade State and Regt Nominal */}
      <div
        id="section-duty-detailing-navigator"
        className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800/80 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-white font-sans">
                Duty Detailing Board
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Dedicated Page
              </span>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {getParadeDutyAssignments(selectedParadeDate, selectedDutySession).length} Detailed ({selectedDutySession})
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">
              Separate full board for RSM duty allocation (Unit Sy, Working Parties, Fixed Duty &amp; Others).
            </p>
          </div>
        </div>

        <button
          type="button"
          id="btn-nav-to-full-duty-board"
          onClick={() => setActivePage('duty_detail')}
          className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-rose-950/40 cursor-pointer shrink-0"
        >
          <span>Open Full Duty Board</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Battery-Wise Matrix */}
      <ParadeStateSummaryGrid
        onOpenPrintModal={onOpenPrintModal}
      />

      {/* Active Session ParadeStateSummaryModal (Morning, Second Period, Games, Roll Call etc.) - Read Only Summary */}
      {activeModalSession && (
        <ParadeStateSummaryModal
          isOpen={Boolean(activeModalSession)}
          onClose={() => setActiveModalSession(null)}
          sessionType={activeModalSession}
          date={selectedParadeDate}
          defaultBattery={isBsm ? assignedBty : 'P Bty'}
          onOpenPrintModal={onOpenPrintModal}
        />
      )}

      {/* RSM Modal: Add New Parade State Type */}
      {isAddTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Create New Parade State Type</h3>
              <button
                onClick={() => setIsAddTypeModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 relative">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-300 font-mono font-bold flex items-center gap-1.5">
                  <span>Parade State Name (প্যারেড স্টেটের নাম)</span>
                  <span className="text-purple-400 text-[10px] bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                    {selectedTypePreset === 'Other' ? 'Custom Entry' : 'Selected Preset'}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsTypeDropdownOpen((prev) => !prev)}
                  className="text-xs font-mono font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                >
                  <span>Select Option</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isTypeDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={newTypeName}
                  onClick={() => setIsTypeDropdownOpen(true)}
                  onChange={(e) => {
                    setNewTypeName(e.target.value);
                    if (selectedTypePreset !== 'Other') {
                      setSelectedTypePreset('Other');
                    }
                  }}
                  placeholder={
                    selectedTypePreset === 'Other'
                      ? 'Type custom parade state name (যেমন: Roll Call, Special Guard)...'
                      : 'Click to open dropdown or select options below...'
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 pr-10 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition-all font-medium"
                />

                <button
                  type="button"
                  onClick={() => setIsTypeDropdownOpen((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Toggle Dropdown Menu"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isTypeDropdownOpen ? 'rotate-180 text-purple-400' : ''}`} />
                </button>

                {/* Dropdown Options List */}
                {isTypeDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-slate-950/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl overflow-hidden p-1.5 space-y-1 animate-fadeIn">
                    <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-slate-800/80">
                      Select Parade State Option (অপশন সিলেক্ট করুন)
                    </div>
                    {PARADE_TYPE_DROPDOWN_OPTIONS.map((opt) => {
                      const isSelected = selectedTypePreset === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setSelectedTypePreset(opt.id);
                            if (opt.id === 'Other') {
                              if (['Ni trg', 'Darbar', 'Tv Room'].includes(newTypeName)) {
                                setNewTypeName('');
                              }
                            } else {
                              setNewTypeName(opt.id);
                            }
                            setIsTypeDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-purple-600/25 text-purple-200 border border-purple-500/40 font-bold'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <div>
                            <div className="font-bold flex items-center gap-2">
                              <span>{opt.label}</span>
                              {opt.id === 'Other' && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  Customize Name
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              {opt.desc}
                            </span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-purple-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick 1-Click Selection Pills */}
              <div className="space-y-1 pt-1">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  Quick Select / দ্রুত নির্বাচন:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {PARADE_TYPE_DROPDOWN_OPTIONS.map((opt) => {
                    const isSelected = selectedTypePreset === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setSelectedTypePreset(opt.id);
                          if (opt.id === 'Other') {
                            if (['Ni trg', 'Darbar', 'Tv Room'].includes(newTypeName)) {
                              setNewTypeName('');
                            }
                          } else {
                            setNewTypeName(opt.id);
                          }
                          setIsTypeDropdownOpen(false);
                        }}
                        className={`px-2 py-1.5 rounded-lg text-xs font-mono transition-all border text-center cursor-pointer ${
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-500 font-bold shadow-sm'
                            : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:text-white hover:border-slate-600'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsAddTypeModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const finalName = newTypeName.trim() || (selectedTypePreset !== 'Other' ? selectedTypePreset : '');
                  if (finalName) {
                    addParadeType(finalName);
                    setNewTypeName('Ni trg');
                    setSelectedTypePreset('Ni trg');
                    setIsTypeDropdownOpen(false);
                    setIsAddTypeModalOpen(false);
                    showNotification(`✅ Added new parade state: ${finalName}`);
                  } else {
                    showNotification('⚠️ Please specify or type a parade state name');
                  }
                }}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save & Publish</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
