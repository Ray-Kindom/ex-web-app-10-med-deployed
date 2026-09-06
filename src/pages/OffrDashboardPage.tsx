import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { StatCard } from '../components/common/StatCard';
import { ParadeStateSummaryGrid } from '../components/parade/ParadeStateSummaryGrid';
import { PersonnelTable } from '../components/personnel/PersonnelTable';
import { Battery, Personnel } from '../types';
import {
  Users,
  CheckCircle2,
  ShieldAlert,
  HeartPulse,
  PlaneTakeoff,
  Clock,
  Shield,
  Building2,
  ChevronRight,
  UserCheck,
  Compass,
  Zap,
  Award,
  FileCheck,
  Calendar,
  AlertCircle,
  Eye,
  Printer,
  Edit3,
} from 'lucide-react';

interface OffrDashboardPageProps {
  onViewDossier: (person: Personnel) => void;
  onOpenAddModal: () => void;
  onOpenPrintModal: () => void;
}

export const OffrDashboardPage: React.FC<OffrDashboardPageProps> = ({
  onViewDossier,
  onOpenAddModal,
  onOpenPrintModal,
}) => {
  const {
    currentUser,
    personnelList,
    getRegimentalTotals,
    getBatterySummaries,
    setActivePage,
    setSelectedBatteryFilter,
    setDailyParadeModalOpen,
    dutyRoster,
    paradeBatteryStatus,
  } = useApp();

  const [selectedBattery, setSelectedBattery] = useState<Battery | 'All'>('All');
  const [activeTab, setActiveTab] = useState<'overview' | 'officers' | 'readiness'>('overview');
  const troopsSectionRef = useRef<HTMLDivElement>(null);

  const totals = getRegimentalTotals();
  const summaries = getBatterySummaries();

  // Officer-specific subsets
  const officerPersonnel = personnelList.filter((p) =>
    ['Lt Col', 'Maj', 'Capt', 'Lt', '2Lt'].includes(p.rk)
  );

  const activeDuties = dutyRoster.filter(
    (d) => d.status === 'Active' || d.status === 'Scheduled'
  );

  const dutyOfficer = activeDuties.find((d) => d.dutyType === 'Duty Officer');

  const scrollToTroops = (bty?: Battery) => {
    if (bty) {
      setSelectedBattery(bty);
    }
    troopsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      {/* Officer Command Banner */}
      <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 border border-indigo-500/30 shadow-2xl space-y-4">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial-gradient from-indigo-500/10 to-transparent pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/30 flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-indigo-400" />
                Officer (Offr) Operations Console
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                COMBAT READY
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight font-serif">
              10 Medium Regiment Artillery — Officer Operational Dashboard
            </h1>
            <p className="text-xs text-slate-300">
              Welcome, <strong className="text-indigo-300">{currentUser.rank} {currentUser.name}</strong>. Battery operational oversight, parade state verification, and officer roster.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setDailyParadeModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>Verify Parade State</span>
            </button>
            <button
              onClick={onOpenPrintModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Official State</span>
            </button>
          </div>
        </div>

        {/* Quick Officer Inspection KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] text-slate-400 font-mono block">Regt Readiness</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-black text-emerald-400 font-mono">{totals.presentPercentage}%</span>
              <span className="text-[10px] text-slate-500">Present</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] text-slate-400 font-mono block">Officer Strength</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-black text-indigo-400 font-mono">{totals.offrPresent}</span>
              <span className="text-[10px] text-slate-500">/ {totals.offrPosted} Posted</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] text-slate-400 font-mono block">Today's Duty Officer</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-sm font-bold text-amber-300 truncate">
                {dutyOfficer?.assignedPersonnel[0]?.name || 'Capt Saifuddin'}
              </span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] text-slate-400 font-mono block">Total Out of Unit</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-black text-rose-400 font-mono">{totals.totalOut}</span>
              <span className="text-[10px] text-slate-500">Leave / Sick / Msn</span>
            </div>
          </div>
        </div>
      </div>

      {/* Regimental Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="Total Posted"
          value={totals.totalPosted}
          subtitle="Authorized Roll"
          icon={Users}
          color="blue"
          onClick={() => scrollToTroops()}
        />
        <StatCard
          title="Parade Present"
          value={totals.totalPresent}
          subtitle={`${totals.presentPercentage}% on Parade`}
          icon={CheckCircle2}
          color="emerald"
          onClick={() => scrollToTroops()}
        />
        <StatCard
          title="On Essential Duty"
          value={totals.totalDuty}
          subtitle="Guard & Security"
          icon={ShieldAlert}
          color="amber"
          onClick={() => scrollToTroops()}
        />
        <StatCard
          title="CMH / Sick"
          value={totals.totalSick}
          subtitle="Medical Attention"
          icon={HeartPulse}
          color="rose"
          onClick={() => scrollToTroops()}
        />
        <StatCard
          title="On Leave"
          value={totals.totalLeave}
          subtitle="Privilege / Casual"
          icon={PlaneTakeoff}
          color="purple"
          onClick={() => scrollToTroops()}
        />
        <StatCard
          title="Course / Trg"
          value={totals.totalCourse}
          subtitle="Military Schools"
          icon={Compass}
          color="emerald"
          onClick={() => scrollToTroops()}
        />
      </div>

      {/* Officer View Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          Battery Supervision & Muster
        </button>
        <button
          onClick={() => setActiveTab('officers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'officers'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          Officer State & Roster ({officerPersonnel.length})
        </button>
        <button
          onClick={() => setActiveTab('readiness')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'readiness'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          Battery Readiness Cards
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Sub-Unit Quick Supervision Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {summaries.map((bty) => {
              const presentPct = bty.posted > 0 ? Math.round((bty.present / bty.posted) * 100) : 0;
              const isSelected = selectedBattery === bty.battery;
              const btyStat = paradeBatteryStatus[bty.battery];
              const statusText =
                typeof btyStat === 'object' && btyStat !== null
                  ? btyStat.status
                  : typeof btyStat === 'string'
                  ? btyStat
                  : 'Draft';

              return (
                <div
                  key={bty.battery}
                  onClick={() => {
                    setSelectedBattery(bty.battery);
                    scrollToTroops(bty.battery);
                  }}
                  className={`relative p-4 rounded-2xl border transition-all duration-200 cursor-pointer shadow-lg ${
                    isSelected
                      ? 'bg-gradient-to-br from-indigo-950/60 to-slate-900 border-indigo-500 shadow-indigo-950/40'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-xs font-mono">
                        {bty.battery.split(' ')[0]}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">{bty.battery}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {bty.battery === 'HQ Bty' ? 'Headquarters' : 'Gun Battery'}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                        statusText === 'Approved' || statusText === 'Confirmed'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : statusText === 'Submitted'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {statusText}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-800/80 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400">Present</span>
                      <p className="font-mono font-black text-emerald-400 text-sm">
                        {bty.present} <span className="text-[10px] text-slate-500">/ {bty.posted}</span>
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Readiness</span>
                      <p className="font-mono font-black text-white text-sm">{presentPct}%</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold pt-2 border-t border-slate-800/50">
                    <span>Inspect Battery Roll</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* 10 Med Regt 29-Point Parade State Summary Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-indigo-400" />
                Regimental 29-Point Parade State Matrix
              </h3>
              <button
                onClick={() => setActivePage('parade_state')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Full Parade State Dashboard</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <ParadeStateSummaryGrid onSelectBattery={(bty) => scrollToTroops(bty)} />
          </div>
        </div>
      )}

      {activeTab === 'officers' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-400" />
              Regimental Officers Nominal Roll & Current Status
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              All commissioned officers serving in 10 Medium Regiment Artillery.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-mono border-b border-slate-800">
                    <th className="p-3">BA / P.No</th>
                    <th className="p-3">Rank & Name</th>
                    <th className="p-3">Sub-Unit</th>
                    <th className="p-3">Appointment / Role</th>
                    <th className="p-3">Parade Status</th>
                    <th className="p-3">Details / Location</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {officerPersonnel.map((offr) => (
                    <tr key={offr.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono text-indigo-300 font-bold">{offr.snkNo}</td>
                      <td className="p-3 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-mono text-[11px] font-bold border border-indigo-500/20">
                            {offr.rk}
                          </span>
                          <span>{offr.name}</span>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-slate-300">{offr.battery}</td>
                      <td className="p-3 text-slate-300">
                        {offr.currentDuty || (offr.rk === 'Lt Col' ? 'Commanding Officer' : offr.rk === 'Maj' ? 'Battery Commander' : 'Troop Leader')}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                            offr.status === 'Present'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : offr.status === 'On Duty'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {offr.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400 text-xs">
                        {offr.statusDetails || offr.rmk || 'In Unit'}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => onViewDossier(offr)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                        >
                          Dossier
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'readiness' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {summaries.map((bty) => (
            <div key={bty.battery} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-base text-white">{bty.battery}</h4>
                  <span className="text-xs text-slate-400 font-mono">Detailed Sub-Unit Readiness</span>
                </div>
                <button
                  onClick={() => {
                    setSelectedBatteryFilter(bty.battery);
                    setActivePage('battery_dashboard');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Open Bty Console
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-mono block">Posted</span>
                  <span className="text-lg font-mono font-bold text-white">{bty.posted}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-emerald-400 font-mono block">Present</span>
                  <span className="text-lg font-mono font-bold text-emerald-400">{bty.present}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-rose-400 font-mono block">Out of Unit</span>
                  <span className="text-lg font-mono font-bold text-rose-400">
                    {bty.sick + bty.leave + bty.course + bty.tempDuty + bty.attached + bty.absent}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                <span>Duty: <strong className="text-amber-400">{bty.onDuty}</strong></span>
                <span>Leave: <strong className="text-purple-400">{bty.leave}</strong></span>
                <span>Sick: <strong className="text-rose-400">{bty.sick}</strong></span>
                <span>Course: <strong className="text-emerald-400">{bty.course}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Troops Nominal Roll Section */}
      <div ref={troopsSectionRef} className="space-y-4 pt-4 border-t border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              Troops Nominal Roll — Inspection View
            </h3>
            <p className="text-xs text-slate-400">
              Filtered by: <strong className="text-indigo-400">{selectedBattery}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(['All', 'HQ Bty', 'P Bty', 'Q Bty', 'R Bty'] as const).map((bty) => (
              <button
                key={bty}
                onClick={() => setSelectedBattery(bty)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  selectedBattery === bty
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {bty}
              </button>
            ))}
          </div>
        </div>

        <PersonnelTable
          selectedBattery={selectedBattery}
          onViewDossier={onViewDossier}
          onOpenAddModal={onOpenAddModal}
        />
      </div>
    </div>
  );
};
