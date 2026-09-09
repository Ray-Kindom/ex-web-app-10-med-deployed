import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StatCard } from '../components/common/StatCard';
import { PersonnelTable } from '../components/personnel/PersonnelTable';
import { ParadeActionControls } from '../components/parade/ParadeActionControls';
import { Personnel, DutyAssignment } from '../types';
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  Shield,
  FileText,
  UserCheck,
  Calendar,
  UserPlus,
} from 'lucide-react';

interface RsmDashboardPageProps {
  onViewDossier: (person: Personnel) => void;
  onOpenAddModal: () => void;
  onOpenPrintModal: () => void;
}

export const RsmDashboardPage: React.FC<RsmDashboardPageProps> = ({
  onViewDossier,
  onOpenAddModal,
  onOpenPrintModal,
}) => {
  const {
    personnelList,
    dutyRoster,
    addDutyAssignment,
    getRegimentalTotals,
    showNotification,
    paradeBatteryStatus,
    setBatteryParadeStatus,
    dailyParadePoints,
    isGuest,
  } = useApp();

  const totals = getRegimentalTotals();

  const [dutyModalOpen, setDutyModalOpen] = useState(false);
  const [newDutyType, setNewDutyType] = useState<DutyAssignment['dutyType']>('Quarter Guard');
  const [newShift, setNewShift] = useState<DutyAssignment['shift']>('24 Hours');
  const [newLocation, setNewLocation] = useState('Regimental Quarter Guard');
  const [selectedSoldierId, setSelectedSoldierId] = useState(personnelList[0]?.id || '1');

  const handleAddDuty = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) {
      showNotification('Guest mode is view-only. You cannot make any changes.');
      return;
    }
    const soldier = personnelList.find((p) => p.id === selectedSoldierId);
    if (!soldier) return;

    addDutyAssignment({
      dutyType: newDutyType,
      shift: newShift,
      location: newLocation,
      date: new Date().toISOString().slice(0, 10),
      status: 'Active',
      assignedPersonnel: [
        {
          id: soldier.id,
          snkNo: soldier.snkNo,
          name: soldier.name,
          rank: soldier.rk,
          battery: soldier.battery,
        },
      ],
    });

    setDutyModalOpen(false);
  };

  const guardsPersonnel = personnelList.filter((p) => p.status === 'On Duty');

  return (
    <div className="space-y-6">
      {/* RSM Command Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                Regimental Sergeant Major (RSM) Console
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                DISCIPLINE & PARADE STATE
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight font-sans mt-1">
              RSM Consolidated Muster & Parade State Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onOpenAddModal && !isGuest && (
              <button
                onClick={onOpenAddModal}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950/40 transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Enlist Soldier</span>
              </button>
            )}
            {!isGuest && (
              <button
                onClick={() => setDutyModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-950/40 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Detail Guard Shift</span>
              </button>
            )}
          </div>
        </div>

        {/* Battery Confirmation & Last Update Bar for RSM */}
        <div className="pt-3 border-t border-slate-800/80">
          <div className="text-[11px] font-mono text-slate-400 mb-2 uppercase font-semibold">
            Battery Parade State Submissions & Confirmation Status:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {(['P Bty', 'Q Bty', 'R Bty', 'HQ Bty', 'EME'] as const).map((bty) => {
              const bStat = paradeBatteryStatus[bty] || { status: 'Pending', lastUpdated: '0630 HRS' };
              const isConfirmed = bStat.status === 'Confirmed';
              const btyPersonnel = personnelList.filter((p) => p.battery === bty);
              const presentCount = btyPersonnel.filter((p) => p.status === 'Present').length;

              return (
                <div
                  key={bty}
                  className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white font-mono">{bty}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        isConfirmed
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {isConfirmed ? 'Confirmed' : 'Pending'}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between">
                    <span>Present: <strong className="text-emerald-400">{presentCount}</strong>/{btyPersonnel.length}</span>
                    <span className="text-[10px] text-slate-500">Updt: {bStat.lastUpdated}</span>
                  </div>

                  <button
                    onClick={() => {
                      if (isGuest) {
                        showNotification('Guest mode is view-only. You cannot make any changes.');
                        return;
                      }
                      setBatteryParadeStatus(bty, isConfirmed ? 'Pending' : 'Confirmed');
                    }}
                    className={`w-full py-1 rounded-lg text-xs font-bold transition-all border ${
                      isGuest
                        ? 'bg-slate-800/60 text-slate-500 border-slate-800 cursor-not-allowed'
                        : isConfirmed
                        ? 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700 cursor-pointer'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-950/40 cursor-pointer'
                    }`}
                  >
                    {isGuest ? 'View Only' : isConfirmed ? 'Revoke Confirmation' : 'Approve & Confirm'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RSM Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Total Posted Roll"
          value={totals.totalPosted}
          subtitle="All 4 Batteries"
          icon={Users}
          colorScheme="purple"
        />
        <StatCard
          title="Active Guards Detailed"
          value={dutyRoster.length}
          subtitle="Quarter Guard, RP, Kote"
          icon={ShieldAlert}
          colorScheme="blue"
        />
        <StatCard
          title="Present in Lines"
          value={totals.totalPresent}
          subtitle="Parade Ground Fit"
          icon={CheckCircle2}
          colorScheme="emerald"
        />
        <StatCard
          title="Disciplinary Discrepancies"
          value={totals.totalAbsent > 0 ? totals.totalAbsent : 'NIL'}
          subtitle="AWOL / OSL"
          icon={AlertTriangle}
          colorScheme={totals.totalAbsent > 0 ? 'rose' : 'slate'}
        />
      </div>

      {/* Guard Roster & Sentries Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Guard Detail Cards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-400" />
              <span>Active Guard Details & Mounting Shifts</span>
            </h2>
            <span className="text-xs text-slate-400 font-mono">{dutyRoster.length} Posts Guarded</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {dutyRoster.map((duty) => (
              <div
                key={duty.id}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5 shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white font-sans">{duty.dutyType}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    {duty.status}
                  </span>
                </div>

                <div className="text-xs text-slate-400 font-mono space-y-1">
                  <div>Location: <span className="text-slate-200">{duty.location}</span></div>
                  <div>Shift: <span className="text-slate-200">{duty.shift}</span></div>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase font-mono mb-1">
                    Detailed Personnel:
                  </div>
                  {duty.assignedPersonnel.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-950 border border-slate-800 font-mono"
                    >
                      <span className="font-bold text-slate-200">
                        {p.rank} {p.name}
                      </span>
                      <span className="text-rose-400 font-bold text-[11px]">{p.battery}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RSM Daily Directives & Morning Inspection Notes */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <span>RSM Routine & Instructions</span>
          </h2>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <div className="font-bold text-amber-300">1. Barracks & Lines Inspection</div>
              <p className="text-slate-400">
                0600 HRS inspection of HQ, P, Q, R battery lines completed. Cleanliness standard SATISFACTORY.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <div className="font-bold text-blue-300">2. Cookhouse & Ration State</div>
              <p className="text-slate-400">
                Unit Cookhouse I/C inspected by Duty NCO. Rations verified for {totals.totalPosted} posted strength.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <div className="font-bold text-rose-300">3. Gun Park Security</div>
              <p className="text-slate-400">
                Medium Artillery Gun Park locks and Kote verification confirmed with Battery Duty Officers.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Parade State & Out Of Unit Action Controls */}
      <ParadeActionControls />

      {/* Detailed Roll for On-Duty Soldiers */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-400" />
          <span>Regimental Duty & Guard Personnel Nominated ({guardsPersonnel.length})</span>
        </h2>

        <PersonnelTable
          personnel={guardsPersonnel.length > 0 ? guardsPersonnel : personnelList}
          onViewDossier={onViewDossier}
          onOpenAddModal={onOpenAddModal}
          allowStatusEdits={true}
          title="Regimental Police & Quarter Guard Personnel"
        />
      </div>

      {/* Duty Assignment Modal */}
      {dutyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4 text-xs">
            <h3 className="text-base font-bold text-white font-sans">
              Detail Guard Assignment
            </h3>

            <form onSubmit={handleAddDuty} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Guard Post / Duty</label>
                <select
                  value={newDutyType}
                  onChange={(e) => setNewDutyType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="Quarter Guard">Quarter Guard</option>
                  <option value="Regimental Police">Regimental Police</option>
                  <option value="Armoury Guard">Armoury Guard / Kote</option>
                  <option value="Main Gate">Main Gate Sentry</option>
                  <option value="Cookhouse I/C">Cookhouse I/C</option>
                  <option value="Duty NCO">Duty NCO</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Location</label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Shift Duration</label>
                <select
                  value={newShift}
                  onChange={(e) => setNewShift(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="24 Hours">24 Hours</option>
                  <option value="Day">Day Shift</option>
                  <option value="Night">Night Shift</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nominate Soldier</label>
                <select
                  value={selectedSoldierId}
                  onChange={(e) => setSelectedSoldierId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                >
                  {personnelList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.rk} {p.name} ({p.snkNo}) - {p.battery}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDutyModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg"
                >
                  Save Duty Roster
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
