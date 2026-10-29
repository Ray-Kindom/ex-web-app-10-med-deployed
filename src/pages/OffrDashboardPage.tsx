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
    theme,
  } = useApp();
  const isLight = theme === 'light';

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
      <div className={`relative overflow-hidden p-6 rounded-2xl border shadow-xl space-y-4 ${
        isLight
          ? 'bg-gradient-to-br from-indigo-50/70 via-white to-indigo-50/70 border-indigo-200'
          : 'bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 border-indigo-500/30'
      }`}>
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial-gradient from-indigo-500/10 to-transparent pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded border flex items-center gap-1.5 ${
                isLight
                  ? 'text-indigo-800 bg-indigo-100 border-indigo-300'
                  : 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30'
              }`}>
                <Shield className="w-3 h-3 text-indigo-500" />
                Officer (Offr) Operations Console
              </span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                isLight
                  ? 'text-emerald-700 bg-emerald-100 border-emerald-300'
                  : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
              }`}>
                COMBAT READY
              </span>
            </div>
            <h1 className={`text-2xl font-black tracking-tight font-serif ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              10 Medium Regiment Artillery — Officer Operational Dashboard
            </h1>
            <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              Welcome, <strong className={isLight ? 'text-indigo-700' : 'text-indigo-300'}>{currentUser.rank} {currentUser.name}</strong>. Battery operational oversight, parade state verification, and officer roster.
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
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>Print Official State</span>
            </button>
          </div>
        </div>

        {/* Quick Officer Inspection KPIs */}
        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t ${
          isLight ? 'border-slate-200' : 'border-slate-800/80'
        }`}>
          <div className={`p-3 rounded-xl border ${
            isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-950/70 border-slate-800'
          }`}>
            <span className={`text-[11px] font-mono block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Regt Readiness</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className={`text-xl font-black font-mono ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>{totals.presentPercentage}%</span>
              <span className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Present</span>
            </div>
          </div>
          <div className={`p-3 rounded-xl border ${
            isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-950/70 border-slate-800'
          }`}>
            <span className={`text-[11px] font-mono block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Officer Strength</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className={`text-xl font-black font-mono ${isLight ? 'text-indigo-700' : 'text-indigo-400'}`}>{totals.offrPresent}</span>
              <span className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>/ {totals.offrPosted} Posted</span>
            </div>
          </div>
          <div className={`p-3 rounded-xl border ${
            isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-950/70 border-slate-800'
          }`}>
            <span className={`text-[11px] font-mono block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Today's Duty Officer</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className={`text-sm font-bold truncate ${isLight ? 'text-amber-800' : 'text-amber-300'}`}>
                {dutyOfficer?.assignedPersonnel[0]?.name || 'Capt Iftekhar Mahmud Abir'}
              </span>
            </div>
          </div>
          <div className={`p-3 rounded-xl border ${
            isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-950/70 border-slate-800'
          }`}>
            <span className={`text-[11px] font-mono block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Total Out of Unit</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className={`text-xl font-black font-mono ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>{totals.totalOut}</span>
              <span className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Leave / Sick / Msn</span>
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
      <div className={`flex items-center gap-2 border-b pb-2 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-indigo-600 text-white shadow-xs'
              : isLight
              ? 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-2xs'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          Battery Supervision & Muster
        </button>
        <button
          onClick={() => setActiveTab('officers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'officers'
              ? 'bg-indigo-600 text-white shadow-xs'
              : isLight
              ? 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-2xs'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          Officer State & Roster ({officerPersonnel.length})
        </button>
        <button
          onClick={() => setActiveTab('readiness')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'readiness'
              ? 'bg-indigo-600 text-white shadow-xs'
              : isLight
              ? 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-2xs'
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
                  className={`relative p-4 rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm ${
                    isSelected
                      ? isLight
                        ? 'bg-indigo-50/80 border-indigo-400 shadow-xs'
                        : 'bg-gradient-to-br from-indigo-950/60 to-slate-900 border-indigo-500 shadow-indigo-950/40'
                      : isLight
                      ? 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 font-black text-xs font-mono">
                        {bty.battery.split(' ')[0]}
                      </div>
                      <div>
                        <h4 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>{bty.battery}</h4>
                        <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          {bty.battery === 'HQ Bty'
                            ? 'Headquarters'
                            : bty.battery === 'EME'
                            ? 'Electrical & Mechanical Engineers'
                            : 'Gun Battery'}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                        statusText === 'Approved' || statusText === 'Confirmed'
                          ? isLight
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : statusText === 'Submitted'
                          ? isLight
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : isLight
                          ? 'bg-slate-100 text-slate-600 border-slate-200'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {statusText}
                    </span>
                  </div>

                  <div className={`grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t text-xs ${
                    isLight ? 'border-slate-200' : 'border-slate-800/80'
                  }`}>
                    <div>
                      <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Present</span>
                      <p className={`font-mono font-black text-sm ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                        {bty.present} <span className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>/ {bty.posted}</span>
                      </p>
                    </div>
                    <div>
                      <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Readiness</span>
                      <p className={`font-mono font-black text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>{presentPct}%</p>
                    </div>
                  </div>

                  <div className={`mt-3 flex items-center justify-between text-[11px] font-semibold pt-2 border-t ${
                    isLight
                      ? 'border-slate-200 text-indigo-700 hover:text-indigo-800'
                      : 'border-slate-800/50 text-indigo-400 hover:text-indigo-300'
                  }`}>
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
              <h3 className={`text-base font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <FileCheck className="w-4 h-4 text-indigo-500" />
                Regimental 29-Point Parade State Matrix
              </h3>
              <button
                onClick={() => setActivePage('parade_state')}
                className={`text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                  isLight ? 'text-indigo-700 hover:text-indigo-800' : 'text-indigo-400 hover:text-indigo-300'
                }`}
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
          <div className={`p-4 rounded-2xl border shadow-sm ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            <h3 className={`text-base font-bold mb-1 flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <Shield className="w-4 h-4 text-indigo-500" />
              Regimental Officers Nominal Roll & Current Status
            </h3>
            <p className={`text-xs mb-4 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              All commissioned officers serving in 10 Medium Regiment Artillery.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`font-mono border-b ${
                    isLight
                      ? 'bg-slate-100 text-slate-700 border-slate-200'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}>
                    <th className="p-3">BA / P.No</th>
                    <th className="p-3">Rank & Name</th>
                    <th className="p-3">Sub-Unit</th>
                    <th className="p-3">Appointment / Role</th>
                    <th className="p-3">Parade Status</th>
                    <th className="p-3">Details / Location</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-sans ${
                  isLight ? 'divide-slate-200 text-slate-800' : 'divide-slate-800/60 text-slate-200'
                }`}>
                  {officerPersonnel.map((offr) => (
                    <tr
                      key={offr.id}
                      className={`transition-colors ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'}`}
                    >
                      <td className={`p-3 font-mono font-bold ${isLight ? 'text-indigo-700' : 'text-indigo-300'}`}>{offr.snkNo}</td>
                      <td className={`p-3 font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded font-mono text-[11px] font-bold border ${
                            isLight
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          }`}>
                            {offr.rk}
                          </span>
                          <button
                            type="button"
                            onClick={() => onViewDossier(offr)}
                            className={`cursor-pointer text-left transition-colors font-semibold ${
                              isLight
                                ? 'hover:text-emerald-600 hover:underline'
                                : 'hover:text-emerald-400 hover:underline'
                            }`}
                            title="ক্লিক করে ডসিয়ার দেখুন"
                          >
                            {offr.name}
                          </button>
                        </div>
                      </td>
                      <td className={`p-3 font-mono ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{offr.battery}</td>
                      <td className={`p-3 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                        {offr.currentDuty || (offr.rk === 'Lt Col' ? 'Commanding Officer' : offr.rk === 'Maj' ? 'Battery Commander' : 'Troop Leader')}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                            offr.status === 'Present'
                              ? isLight
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : offr.status === 'On Duty'
                              ? isLight
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : isLight
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {offr.status}
                        </span>
                      </td>
                      <td className={`p-3 text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        {offr.statusDetails || offr.rmk || 'In Unit'}
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
            <div
              key={bty.battery}
              className={`p-5 rounded-2xl border space-y-3 shadow-sm ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className={`font-bold text-base ${isLight ? 'text-slate-900' : 'text-white'}`}>{bty.battery}</h4>
                  <span className={`text-xs font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Detailed Sub-Unit Readiness</span>
                </div>
                <button
                  onClick={() => {
                    setSelectedBatteryFilter(bty.battery);
                    setActivePage('battery_dashboard');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm"
                >
                  Open Bty Console
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className={`p-2.5 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                }`}>
                  <span className={`text-[10px] font-mono block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Posted</span>
                  <span className={`text-lg font-mono font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{bty.posted}</span>
                </div>
                <div className={`p-2.5 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                }`}>
                  <span className={`text-[10px] font-mono block ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>Present</span>
                  <span className={`text-lg font-mono font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>{bty.present}</span>
                </div>
                <div className={`p-2.5 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                }`}>
                  <span className={`text-[10px] font-mono block ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>Out of Unit</span>
                  <span className={`text-lg font-mono font-bold ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>
                    {bty.sick + bty.leave + bty.course + bty.tempDuty + bty.attached + bty.absent}
                  </span>
                </div>
              </div>

              <div className={`flex items-center justify-between text-xs pt-2 border-t ${
                isLight ? 'border-slate-200 text-slate-600' : 'border-slate-800/80 text-slate-400'
              }`}>
                <span>Duty: <strong className={isLight ? 'text-amber-800' : 'text-amber-400'}>{bty.onDuty}</strong></span>
                <span>Leave: <strong className={isLight ? 'text-purple-800' : 'text-purple-400'}>{bty.leave}</strong></span>
                <span>Sick: <strong className={isLight ? 'text-rose-800' : 'text-rose-400'}>{bty.sick}</strong></span>
                <span>Course: <strong className={isLight ? 'text-emerald-800' : 'text-emerald-400'}>{bty.course}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Troops Nominal Roll Section */}
      <div ref={troopsSectionRef} className={`space-y-4 pt-4 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className={`text-lg font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <Users className="w-5 h-5 text-indigo-500" />
              Troops Nominal Roll — Inspection View
            </h3>
            <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Filtered by: <strong className={isLight ? 'text-indigo-700' : 'text-indigo-400'}>{selectedBattery}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {(['All', 'P Bty', 'Q Bty', 'R Bty', 'HQ Bty', 'EME'] as const).map((bty) => (
              <button
                key={bty}
                onClick={() => setSelectedBattery(bty)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  selectedBattery === bty
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : isLight
                    ? 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
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
