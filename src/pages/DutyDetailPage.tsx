import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ParadeDutyHeadingBoxes } from '../components/parade/ParadeDutyHeadingBoxes';
import { DutyDetailPrintModal } from '../components/duty/DutyDetailPrintModal';
import { Battery, ALL_BATTERIES, isOfficerRank, Personnel } from '../types';
import {
  ShieldAlert,
  Printer,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Save,
  Edit3,
  Send,
  Lock,
  Unlock,
  X,
} from 'lucide-react';

interface DutyDetailPageProps {
  onViewDossier?: (person: Personnel) => void;
  onOpenPrintModal?: () => void;
}

export const DutyDetailPage: React.FC<DutyDetailPageProps> = () => {
  const {
    currentUser,
    selectedParadeDate,
    setSelectedParadeDate,
    paradeTypes,
    getParadeSummary,
    personnelList,
    getDutySessionStatus,
    saveDutySession,
    editDutySession,
    sendDutySessionToAdjt,
    theme,
  } = useApp();
  const isLight = theme === 'light';

  const isOfficerOrCo =
    currentUser.role === 'CO' ||
    currentUser.role === 'Offr' ||
    (currentUser.role as string) === '2IC' ||
    (currentUser.role as string) === 'Officer' ||
    isOfficerRank(currentUser.rank);
  const isBsm = ['P BSM', 'Q BSM', 'R BSM', 'HQ BSM', 'BSM'].includes(currentUser.role);
  const isRsm = currentUser.role === 'RSM' || currentUser.role === 'Admin';
  const assignedBty =
    (currentUser.assignedBattery as Battery) ||
    (currentUser.role === 'P BSM'
      ? 'P Bty'
      : currentUser.role === 'Q BSM'
      ? 'Q Bty'
      : currentUser.role === 'R BSM'
      ? 'R Bty'
      : currentUser.role === 'HQ BSM'
      ? 'HQ Bty'
      : 'P Bty');

  // BSM is strictly read-only for now; RSM has full active control over duty detailing
  const isReadOnly = isOfficerOrCo || currentUser.role === 'Guest' || isBsm;

  const [selectedDutySession, setSelectedDutySession] = useState<string>('Morning');
  const [selectedBatteryFilter, setSelectedBatteryFilter] = useState<Battery | 'Consolidated'>(
    isBsm ? assignedBty : 'Consolidated'
  );
  const [isDutyPrintOpen, setIsDutyPrintOpen] = useState<boolean>(false);

  // Workflow Status & Controls (Save, Edit, Sent to Adjt)
  const dutyStatus = getDutySessionStatus(selectedParadeDate, selectedDutySession);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [isSendAdjtModalOpen, setIsSendAdjtModalOpen] = useState<boolean>(false);
  const [adjtDispatchNote, setAdjtDispatchNote] = useState<string>('');

  const isLocked = !isEditMode && dutyStatus.status === 'Sent to Adjt';
  const effectiveReadOnly = isReadOnly || isLocked;

  const handleSave = () => {
    saveDutySession(selectedParadeDate, selectedDutySession);
    setIsEditMode(false);
  };

  const handleEdit = () => {
    editDutySession(selectedParadeDate, selectedDutySession);
    setIsEditMode(true);
  };

  const handleOpenSendToAdjt = () => {
    setAdjtDispatchNote(dutyStatus.notes || '');
    setIsSendAdjtModalOpen(true);
  };

  const handleConfirmSendToAdjt = () => {
    sendDutySessionToAdjt(selectedParadeDate, selectedDutySession, adjtDispatchNote);
    setIsEditMode(false);
    setIsSendAdjtModalOpen(false);
  };

  // Active parade sessions/types
  const activeParadeTypes = useMemo(() => {
    return paradeTypes.filter((t) => !t.isDeleted && !t.deleted && t.isActive !== false);
  }, [paradeTypes]);

  // Date Navigation
  const handlePrevDay = () => {
    const d = new Date(selectedParadeDate);
    d.setDate(d.getDate() - 1);
    setSelectedParadeDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedParadeDate);
    d.setDate(d.getDate() + 1);
    setSelectedParadeDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedParadeDate(new Date().toISOString().split('T')[0]);
  };

  // Parade Summary: Present in Unit - Off Parade = On Parade
  const paradeSummary = useMemo(() => {
    return getParadeSummary(selectedBatteryFilter, selectedParadeDate, selectedDutySession);
  }, [getParadeSummary, selectedBatteryFilter, selectedParadeDate, selectedDutySession, personnelList]);

  return (
    <div className="space-y-2.5 max-w-[1700px] mx-auto pb-8">
      {/* 1. COMPACT MINIMAL CONTROL BAR */}
      <div className={`border rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 flex flex-wrap items-center justify-between gap-2.5 shadow-sm ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        {/* Left: Title + Session Selector + Battery Selector */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className={`flex items-center gap-1.5 font-mono text-sm font-bold tracking-tight ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
            <span>Duty Detailing</span>
          </div>

          <div className={`h-4 w-px hidden sm:block ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`} />

          {/* Session Selector */}
          <div className={`flex items-center gap-1 p-0.5 rounded-lg border ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-850'
          }`}>
            {activeParadeTypes.map((pt) => {
              const isSelected = selectedDutySession === pt.name;
              return (
                <button
                  key={pt.id}
                  type="button"
                  id={`duty-session-btn-${pt.name.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => setSelectedDutySession(pt.name)}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-rose-600 text-white font-bold shadow-sm'
                      : isLight
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {pt.name}
                </button>
              );
            })}
          </div>

          {/* Battery Scope */}
          <div className={`flex items-center gap-1 p-0.5 rounded-lg border ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-850'
          }`}>
            {!isBsm && (
              <button
                type="button"
                id="duty-bty-filter-all"
                onClick={() => setSelectedBatteryFilter('Consolidated')}
                className={`px-2 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                  selectedBatteryFilter === 'Consolidated'
                    ? 'bg-cyan-600 text-white font-bold'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                All
              </button>
            )}
            {(isBsm ? [assignedBty] : ALL_BATTERIES).map((bty) => (
              <button
                key={bty}
                type="button"
                id={`duty-bty-filter-${bty.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => setSelectedBatteryFilter(bty)}
                className={`px-2 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                  selectedBatteryFilter === bty
                    ? 'bg-cyan-600 text-white font-bold'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {bty.replace(' Bty', '')}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Date Navigation + Workflow Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Picker */}
          <div className={`flex items-center gap-1 px-1.5 py-1 rounded-lg border ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-850'
          }`}>
            <button
              type="button"
              id="btn-duty-prev-day"
              onClick={handlePrevDay}
              className={`p-1 rounded transition-colors cursor-pointer ${
                isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Previous Day"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <input
              type="date"
              id="input-duty-date"
              value={selectedParadeDate}
              onChange={(e) => setSelectedParadeDate(e.target.value)}
              className={`bg-transparent border-none text-xs font-mono focus:outline-none cursor-pointer w-28 text-center ${
                isLight ? 'text-slate-900 font-bold' : 'text-white'
              }`}
            />
            <button
              type="button"
              id="btn-duty-next-day"
              onClick={handleNextDay}
              className={`p-1 rounded transition-colors cursor-pointer ${
                isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Next Day"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              id="btn-duty-today"
              onClick={handleToday}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                isLight ? 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              Today
            </button>
          </div>

          {/* Workflow Action Buttons: Save, Edit, Sent to Adjt (RSM/Admin exclusive) */}
          {isBsm ? (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono ${
              isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-slate-950 border-slate-850 text-slate-400'
            }`}>
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>BSM (Read-Only) • RSM Controlled</span>
            </div>
          ) : (
            <div className={`flex items-center gap-1 p-1 rounded-lg border ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-850'
            }`}>
              {/* 1. SAVE */}
              <button
                type="button"
                id="btn-duty-save"
                onClick={handleSave}
                className={`px-2.5 py-1 rounded text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  dutyStatus.status === 'Saved'
                    ? isLight ? 'bg-blue-100 text-blue-900 border border-blue-300' : 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
                    : isLight ? 'bg-white hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white'
                }`}
                title="Save current detailing"
              >
                <Save className="w-3.5 h-3.5 text-blue-500" />
                <span>Save</span>
              </button>

              {/* 2. EDIT */}
              <button
                type="button"
                id="btn-duty-edit"
                onClick={handleEdit}
                className={`px-2.5 py-1 rounded text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  isEditMode || dutyStatus.status === 'Draft'
                    ? isLight ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-amber-500/25 text-amber-300 border border-amber-500/50'
                    : isLight ? 'bg-white hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white'
                }`}
                title="Unlock & Edit detailing"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                <span>Edit</span>
              </button>

              {/* 3. SENT TO ADJT */}
              <button
                type="button"
                id="btn-duty-sent-to-adjt"
                onClick={handleOpenSendToAdjt}
                className={`px-2.5 py-1 rounded text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  dutyStatus.status === 'Sent to Adjt'
                    ? isLight ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-emerald-600/25 text-emerald-300 border border-emerald-500/50'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
                title="Dispatch to Adjutant"
              >
                <Send className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sent to Adjt</span>
                {dutyStatus.status === 'Sent to Adjt' && (
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                )}
              </button>
            </div>
          )}

          {/* Print PDF */}
          <button
            type="button"
            id="btn-duty-print"
            onClick={() => setIsDutyPrintOpen(true)}
            className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
            title="Print Duty PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* 2. SLIM STATS & STATUS STRIP (SINGLE LINE MILITARY PARADE STATE) */}
      <div className={`flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
      }`}>
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          <div className={`flex items-center gap-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            <span>Auth:</span>
            <strong className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{paradeSummary.auth}</strong>
          </div>
          <span className={isLight ? 'text-slate-300' : 'text-slate-600'}>•</span>
          <div className={`flex items-center gap-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            <span>Out of Unit (Msn+Att):</span>
            <strong className={`font-bold ${isLight ? 'text-rose-600' : 'text-rose-400'}`}>{paradeSummary.outOfUnit}</strong>
          </div>
          <span className={isLight ? 'text-slate-300' : 'text-slate-600'}>•</span>
          <div className={`flex items-center gap-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            <span>Held:</span>
            <strong className={`font-bold ${isLight ? 'text-amber-700' : 'text-amber-300'}`}>{paradeSummary.held}</strong>
          </div>
          <span className={isLight ? 'text-slate-300' : 'text-slate-600'}>•</span>
          <div className={`flex items-center gap-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            <span>Total Out:</span>
            <strong className={`font-bold ${isLight ? 'text-purple-700' : 'text-purple-300'}`}>{paradeSummary.totalOut}</strong>
          </div>
          <span className={isLight ? 'text-slate-300' : 'text-slate-600'}>•</span>
          <div className={`flex items-center gap-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            <span>Present in Unit:</span>
            <strong className={`font-bold ${isLight ? 'text-cyan-800' : 'text-cyan-300'}`}>{paradeSummary.presentInUnit}</strong>
          </div>
          <span className={isLight ? 'text-slate-300' : 'text-slate-600'}>•</span>
          <div className={`flex items-center gap-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            <span>Off Parade:</span>
            <strong className={`font-bold ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>{paradeSummary.offParade}</strong>
          </div>
          <span className={isLight ? 'text-slate-300' : 'text-slate-600'}>•</span>
          <div className={`flex items-center gap-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            <span>On Parade:</span>
            <strong className={`font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>{paradeSummary.onParade}</strong>
          </div>
        </div>

        {/* Workflow State Indicator */}
        <div className="flex items-center gap-2">
          {dutyStatus.status === 'Sent to Adjt' ? (
            <div className={`flex items-center gap-1.5 ${isLight ? 'text-emerald-700 font-semibold' : 'text-emerald-400'}`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Status: <strong>Sent to Adjt</strong></span>
              {isLocked ? (
                <button
                  type="button"
                  onClick={handleEdit}
                  className={`ml-1 px-1.5 py-0.5 rounded border text-[10px] flex items-center gap-1 cursor-pointer ${
                    isLight ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}
                  title="Click to Unlock and edit"
                >
                  <Lock className="w-2.5 h-2.5" />
                  <span>Locked (Edit)</span>
                </button>
              ) : (
                <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 ${
                  isLight ? 'bg-amber-100 text-amber-900' : 'bg-amber-500/30 text-amber-300'
                }`}>
                  <Unlock className="w-2.5 h-2.5" />
                  <span>Unlocked</span>
                </span>
              )}
            </div>
          ) : dutyStatus.status === 'Saved' ? (
            <span className={`flex items-center gap-1 ${isLight ? 'text-blue-700 font-semibold' : 'text-blue-300'}`}>
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
              <span>Status: <strong>Saved</strong></span>
            </span>
          ) : (
            <span className={`flex items-center gap-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>Status: <strong>Draft</strong></span>
            </span>
          )}
        </div>
      </div>

      {/* 3. DIRECT DUTY DETAILING INPUT BOARD (MAIN FOCUS) */}
      <ParadeDutyHeadingBoxes
        date={selectedParadeDate}
        sessionType={selectedDutySession}
        isReadOnly={effectiveReadOnly}
        filterBattery={selectedBatteryFilter}
      />

      {/* Duty Detailing PDF Print Sheet Modal */}
      <DutyDetailPrintModal
        isOpen={isDutyPrintOpen}
        onClose={() => setIsDutyPrintOpen(false)}
        date={selectedParadeDate}
        sessionType={selectedDutySession}
        filterBattery={selectedBatteryFilter}
      />

      {/* Transmit to Adjutant Modal */}
      {isSendAdjtModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-4 sm:p-5 shadow-2xl space-y-3 text-white">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 font-mono text-sm font-bold text-white">
                <Send className="w-4 h-4 text-emerald-400" />
                <span>Transmit to Adjutant</span>
              </div>
              <button
                type="button"
                onClick={() => setIsSendAdjtModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Session:</span>
                <span className="text-white font-bold">{selectedParadeDate} • {selectedDutySession}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 text-center">
                <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                  <div className="text-[9px] text-slate-400">Auth / Held</div>
                  <div className="text-xs font-bold text-white">{paradeSummary.auth} / {paradeSummary.held}</div>
                </div>
                <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                  <div className="text-[9px] text-purple-400">Total Out</div>
                  <div className="text-xs font-bold text-purple-300">{paradeSummary.totalOut}</div>
                </div>
                <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                  <div className="text-[9px] text-cyan-400">Present in Unit</div>
                  <div className="text-xs font-bold text-cyan-300">{paradeSummary.presentInUnit}</div>
                </div>
                <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                  <div className="text-[9px] text-emerald-400">On Parade (Eff)</div>
                  <div className="text-xs font-bold text-emerald-400">{paradeSummary.onParade}</div>
                </div>
              </div>
            </div>

            <div className="space-y-1 font-mono text-xs">
              <label className="text-slate-300 font-semibold">Note / Remarks (Optional):</label>
              <textarea
                value={adjtDispatchNote}
                onChange={(e) => setAdjtDispatchNote(e.target.value)}
                placeholder="Remarks for Adjutant..."
                rows={2}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsSendAdjtModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-send-adjt"
                onClick={handleConfirmSendToAdjt}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Confirm Send</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

