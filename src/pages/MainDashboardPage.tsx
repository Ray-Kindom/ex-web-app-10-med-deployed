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
  GraduationCap,
  Sparkles,
  ArrowRight,
  Plus,
  Clock,
  Shield,
  Building2,
  Layers,
  ChevronRight,
  UserCheck,
  Compass,
  Tent,
  Globe,
  Zap,
  Award,
  Crown,
} from 'lucide-react';

interface MainDashboardPageProps {
  onViewDossier: (person: Personnel) => void;
  onOpenAddModal: () => void;
  onOpenPrintModal: () => void;
}

export const MainDashboardPage: React.FC<MainDashboardPageProps> = ({
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
    auditLogs,
    setOutOfUnitModalOpen,
    setActiveOutOfUnitCategory,
  } = useApp();

  const [selectedBattery, setSelectedBattery] = useState<Battery | 'All'>('All');

  const troopsSectionRef = useRef<HTMLDivElement>(null);

  const totals = getRegimentalTotals();
  const summaries = getBatterySummaries();
  const isCO = currentUser.role === 'CO' || currentUser.role === '2IC';
  const isCoOrOffr = currentUser.role === 'CO' || currentUser.role === '2IC' || currentUser.role === 'Offr';

  // Count personnel detailed to FDMN Camp
  const fdmnCount = personnelList.filter((p) => {
    if (p.outOfUnitCategory === 'FDMN') return true;
    const details = (p.statusDetails || '').toLowerCase();
    const loc = (p.outOfUnitLocation || '').toLowerCase();
    const rem = (p.outOfUnitRemarks || '').toLowerCase();
    return details.includes('fdmn') || loc.includes('fdmn') || rem.includes('fdmn') || loc.includes('camp') || details.includes('camp') || loc.includes('হোয়াইকং');
  }).length;

  // Count personnel detailed to Command (Comd)
  const comdCount = personnelList.filter((p) => {
    if (p.outOfUnitCategory === 'Comd') return true;
    if (p.outOfUnitCategory === 'FDMN') return false;
    const details = (p.statusDetails || '').toLowerCase();
    const loc = (p.outOfUnitLocation || '').toLowerCase();
    const rem = (p.outOfUnitRemarks || '').toLowerCase();
    if (details.includes('fdmn') || loc.includes('fdmn') || rem.includes('fdmn') || loc.includes('camp') || details.includes('camp') || loc.includes('হোয়াইকং')) return false;
    return details.includes('comd') || Boolean(p.comdAssignment) || (p.status === 'Temp Duty' && !p.outOfUnitCategory);
  }).length;

  // Count personnel detailed to Att & Msn (Attached / UN Mission)
  const totalAttCount = personnelList.filter((p) => p.outOfUnitCategory === 'Att').length;
  const totalMsnCount = personnelList.filter((p) => p.outOfUnitCategory === 'Msn').length;
  const attMsnCount = totalAttCount + totalMsnCount;

  // Count personnel detailed to Others Out (ERE, external postings & other duties)
  const totalOthersOutCount = personnelList.filter((p) => {
    if (p.outOfUnitCategory === 'ERE') return true;
    if (p.outOfUnitCategory && !['Att', 'Msn', 'FDMN', 'CMH', 'Course', 'Comd', 'P/Lve', 'C/Lve'].includes(p.outOfUnitCategory)) return true;
    if (p.status === 'Attached Out' && p.outOfUnitCategory !== 'Att' && p.outOfUnitCategory !== 'Msn' && p.outOfUnitCategory !== 'FDMN') return true;
    if (p.status === 'AWOL/OSL') return true;
    const details = (p.statusDetails || '').toLowerCase();
    const loc = (p.outOfUnitLocation || '').toLowerCase();
    const rem = (p.outOfUnitRemarks || '').toLowerCase();
    return details.includes('ere') || loc.includes('ere') || rem.includes('ere');
  }).length;

  const batteryList: { bty: Battery; name: string; shortCode: string; role: string }[] = [
    { bty: 'P Bty', name: 'P Battery (P Bty)', shortCode: 'P', role: '1st Gun Support' },
    { bty: 'Q Bty', name: 'Q Battery (Q Bty)', shortCode: 'Q', role: '2nd Gun Support' },
    { bty: 'R Bty', name: 'R Battery (R Bty)', shortCode: 'R', role: '3rd Gun Support' },
    { bty: 'HQ Bty', name: 'HQ Battery (Headquarters)', shortCode: 'HQ', role: 'Command & Signals' },
    { bty: 'EME', name: 'EME', shortCode: 'EME', role: 'Electrical & Mechanical Engineers' },
  ];

  const handleSelectBatteryBox = (bty: Battery) => {
    setSelectedBattery(bty);
    setSelectedBatteryFilter(bty);
    // Smoothly scroll down to the troops nominal table if needed
    if (troopsSectionRef.current) {
      troopsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const btyTroopsCount = (bty: Battery) => {
    return personnelList.filter((p) => p.battery === bty).length;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Standard Luxury Executive Command for CO, or Dignified Command for others */}
      {isCO ? (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 border border-amber-500/40 p-5 sm:p-7 shadow-2xl shadow-amber-950/20 space-y-5">
          <div className="absolute right-0 top-0 bottom-0 w-2/5 bg-radial-gradient from-amber-500/10 via-amber-600/5 to-transparent pointer-events-none" />
          <div className="absolute left-0 top-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1.5 shadow-sm">
                  <Crown className="w-3 h-3 text-amber-400" />
                  <span>Commanding Officer Executive Console</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>REGIMENTAL STATE: ACTIVE</span>
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white font-serif tracking-tight flex items-center gap-2.5">
                <span>10 Medium Regiment Artillery</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300">
                <span className="text-amber-200 font-semibold">{currentUser.rank} {currentUser.name}</span> — Commanding Officer
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-[10px] font-mono text-amber-400/80 uppercase tracking-wider font-semibold">Total Combat Force</div>
                <div className="text-xl font-bold font-mono text-white">{totals.totalPosted} Troops</div>
              </div>
            </div>
          </div>

          {/* Operational Combat Readiness Gauge Bar for CO */}
          <div className="relative p-4 sm:p-5 rounded-xl bg-slate-950/90 border border-amber-500/25 space-y-3 shadow-inner">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <span className="font-bold text-slate-100 flex items-center gap-2 font-mono tracking-wide">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>OPERATIONAL COMBAT READINESS INDEX</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-emerald-400 font-extrabold text-sm sm:text-base">
                  {totals.presentPercentage}% COMBAT FIT
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  ({totals.totalPresent + totals.totalDuty} / {totals.totalPosted})
                </span>
              </div>
            </div>

            <div className="w-full bg-slate-900 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-800">
              <div
                className="bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 h-full rounded-full transition-all duration-1000 shadow-sm"
                style={{ width: `${totals.presentPercentage}%` }}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-mono">
              {summaries.map((s) => (
                <div key={s.battery} className="bg-slate-900/80 border border-slate-800/80 px-2.5 py-1.5 rounded-lg flex items-center justify-between">
                  <span className="text-slate-300 font-semibold">{s.battery}:</span>
                  <span className="text-amber-300 font-bold">{s.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 p-5 sm:p-6 shadow-xl space-y-4">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial-gradient from-rose-600/10 to-transparent pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                  10 Medium Regiment Artillery
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  MORNING PARADE ACTIVE
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white font-sans tracking-tight">
                Regimental Command Dashboard
              </h1>
              <p className="text-xs text-slate-400">
                <span className="text-white font-semibold">{currentUser.rank} {currentUser.name}</span> ({currentUser.role})
              </p>
            </div>

            <div className="flex items-center gap-2 sm:self-end">
              {currentUser.role === 'RSM' && (
                <button
                  id="enlist-soldier-btn-rsm"
                  onClick={onOpenAddModal}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-900/40 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Enlist Soldier</span>
                </button>
              )}
            </div>
          </div>

          {/* Operational Readiness Summary Gauge */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-2 font-mono">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>OPERATIONAL COMBAT READINESS</span>
              </span>
              <span className="font-mono text-emerald-400 font-bold">
                {totals.presentPercentage}% COMBAT FIT ({totals.totalPresent + totals.totalDuty} / {totals.totalPosted})
              </span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-800">
              <div
                className="bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 h-full rounded-full transition-all duration-700"
                style={{ width: `${totals.presentPercentage}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Regimental Key Performance Stat Cards - 9 Key Status Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-9 gap-3 sm:gap-4">
        <StatCard
          title="Posted Strength"
          value={totals.totalPosted}
          subtitle="All 10 Med Roll"
          icon={Users}
          colorScheme="slate"
          badge="100% Accounted"
          onClick={() => {
            setSelectedBattery('All');
            if (troopsSectionRef.current) {
              troopsSectionRef.current.scrollIntoView({ behavior: 'smooth' });
            }
          }}
        />
        <StatCard
          title="Present In Unit"
          value={totals.totalPresent}
          subtitle="In Unit Lines"
          icon={CheckCircle2}
          colorScheme="emerald"
          percentage={Math.round((totals.totalPresent / totals.totalPosted) * 100)}
          onClick={() => setActivePage('parade_state')}
        />
        <StatCard
          title="Command"
          value={comdCount}
          subtitle="Comd Duty"
          icon={Compass}
          colorScheme="indigo"
          badge={comdCount > 0 ? `${comdCount} Out` : 'Nil Command'}
          onClick={() => {
            setActiveOutOfUnitCategory('Comd');
            setOutOfUnitModalOpen(true);
          }}
        />
        <StatCard
          title="CMH/Sick"
          value={totals.totalSick}
          subtitle="CMH & Sic"
          icon={HeartPulse}
          colorScheme="amber"
          badge={totals.totalSick > 0 ? `${totals.totalSick} Admitted` : 'Nil Sick'}
          onClick={() => {
            setActiveOutOfUnitCategory('CMH');
            setOutOfUnitModalOpen(true);
          }}
        />
        <StatCard
          title="Lve"
          value={totals.totalLeave}
          subtitle="P/Lve & C/Lve"
          icon={PlaneTakeoff}
          colorScheme="purple"
          badge={totals.totalLeave > 0 ? `${totals.totalLeave} Soldiers` : 'Nil Leave'}
          onClick={() => {
            setActiveOutOfUnitCategory('P/Lve');
            setOutOfUnitModalOpen(true);
          }}
        />
        <StatCard
          title="Course"
          value={totals.totalCourse}
          subtitle="Cadres & Trg"
          icon={GraduationCap}
          colorScheme="cyan"
          badge={totals.totalCourse > 0 ? `${totals.totalCourse} Attending` : 'Nil Course'}
          onClick={() => {
            setActiveOutOfUnitCategory('Course');
            setOutOfUnitModalOpen(true);
          }}
        />
        <StatCard
          title="FDMN Camp"
          value={fdmnCount}
          subtitle="Rohingya Camp Duty"
          icon={Tent}
          colorScheme="teal"
          badge={fdmnCount > 0 ? `${fdmnCount} Soldiers` : 'Nil FDMN'}
          onClick={() => {
            setActiveOutOfUnitCategory('FDMN');
            setOutOfUnitModalOpen(true);
          }}
        />
        <StatCard
          title="Att & Msn"
          value={attMsnCount}
          subtitle={`Att: ${totalAttCount} | Msn: ${totalMsnCount}`}
          icon={Globe}
          colorScheme="blue"
          badge={attMsnCount > 0 ? `${attMsnCount} Out` : 'Nil Att/Msn'}
          onClick={() => {
            setActiveOutOfUnitCategory('Att');
            setOutOfUnitModalOpen(true);
          }}
        />
        <StatCard
          title="Others Out"
          value={totalOthersOutCount}
          subtitle="ERE & Ext Duties"
          icon={Building2}
          colorScheme="orange"
          badge={totalOthersOutCount > 0 ? `${totalOthersOutCount} Soldiers` : 'Nil Others'}
          onClick={() => {
            setActiveOutOfUnitCategory('ERE');
            setOutOfUnitModalOpen(true);
          }}
        />
      </div>

      {/* Main Grid: Battery Breakdown Table + Quick Actions & Recent Log */}
      {isCoOrOffr ? (
        <ParadeStateSummaryGrid
          selectedBattery={selectedBattery}
          onSelectBattery={(bty) => handleSelectBatteryBox(bty)}
          onOpenPrintModal={onOpenPrintModal}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Bty Wise Parade State Matrix & Interactive Battery Boxes */}
        <div className="lg:col-span-2 space-y-6">
          <ParadeStateSummaryGrid
            selectedBattery={selectedBattery}
            onSelectBattery={(bty) => handleSelectBatteryBox(bty)}
            onOpenPrintModal={onOpenPrintModal}
          />

          {/* Sub-Unit Quick Navigation Cards (Clicking any box automatically displays that battery's nominal roll) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Select Battery to View Nominal Roll</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Click box to show troops below
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {batteryList.map((item) => {
                const isSelected = selectedBattery === item.bty;
                const count = btyTroopsCount(item.bty);

                return (
                  <button
                    key={item.bty}
                    onClick={() => handleSelectBatteryBox(item.bty)}
                    className={`p-3.5 rounded-xl text-left transition-all group flex flex-col justify-between border ${
                      isSelected
                        ? 'bg-rose-950/40 border-rose-500/80 ring-2 ring-rose-500/40 shadow-lg shadow-rose-950/30'
                        : 'bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-sm border transition-colors ${
                            isSelected
                              ? 'bg-rose-600 text-white border-rose-500'
                              : 'bg-slate-800 border-slate-700 text-rose-400 group-hover:border-rose-500'
                          }`}
                        >
                          {item.shortCode}
                        </div>
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            isSelected
                              ? 'bg-rose-500 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {count} Soldiers
                        </span>
                      </div>

                      <div className="font-bold text-xs text-white mt-2.5 font-sans flex items-center gap-1">
                        <span>{item.bty}</span>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{item.name}</div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px] font-mono">
                      <span className={isSelected ? 'text-rose-300 font-bold' : 'text-slate-400'}>
                        {isSelected ? 'Active Roll' : 'View Nominal'}
                      </span>
                      <ArrowRight
                        className={`w-3.5 h-3.5 transition-transform ${
                          isSelected
                            ? 'text-rose-400 translate-x-1'
                            : 'text-slate-500 group-hover:text-rose-400 group-hover:translate-x-1'
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Quick Action Shortcuts & Live Audit Log */}
        <div className="space-y-6">
          {/* Quick Shortcuts */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-rose-400" />
              <span>Quick Navigation Actions</span>
            </h3>

            <div className="space-y-2">
              <button
                onClick={() => setActivePage('master_personnel')}
                className="w-full p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 flex items-center justify-between text-xs text-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="font-medium">Search Master Nominal Roll</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => setActivePage('parade_state')}
                className="w-full p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 flex items-center justify-between text-xs text-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-medium">Update Daily Parade Status</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => setActivePage('rsm_dashboard')}
                className="w-full p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 flex items-center justify-between text-xs text-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-purple-400" />
                  <span className="font-medium">RSM Guard & Duty Roster</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => setActivePage('co_dashboard')}
                className="w-full p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 flex items-center justify-between text-xs text-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="font-medium">CO Executive Readiness Brief</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Recent Parade Activity Logs (Admin Only) */}
          {currentUser.role === 'Admin' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>Unit Activity & Audit Log</span>
                </h3>
                <button
                  onClick={() => setActivePage('admin_panel')}
                  className="text-[11px] text-rose-400 hover:underline"
                >
                  View All
                </button>
              </div>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 text-xs">
                {auditLogs.slice(0, 4).map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-[11px]">{log.action}</span>
                      <span className="text-[9px] font-mono text-slate-400">
                        {log.timestamp.slice(11, 16)} HRS
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2">{log.details}</p>
                    <div className="text-[9px] text-rose-400 font-mono">By: {log.performedBy}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Interactive Troop Nominal Roll Display (Shows Selected Battery Troops automatically) - Hidden for CO and Offr */}
      {!isCoOrOffr && (
        <div ref={troopsSectionRef} className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                {selectedBattery === 'All' ? 'Full Regimental Roll' : `${selectedBattery} Sub-Unit Nominal`}
              </span>
              <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                {selectedBattery === 'All'
                  ? `${personnelList.length} Personnel Total`
                  : `${btyTroopsCount(selectedBattery)} Troops in ${selectedBattery}`}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white font-sans">
              {selectedBattery === 'All'
                ? 'All 10 Med Regt Troops Nominal Roll'
                : `${selectedBattery} Personnel Nominal Roll & Active Parade State`}
            </h2>
          </div>

          {/* Quick Battery Switcher Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => {
                setSelectedBattery('All');
                setSelectedBatteryFilter('All');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all whitespace-nowrap ${
                selectedBattery === 'All'
                  ? 'bg-rose-600 text-white font-bold shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              All (140)
            </button>
            {batteryList.map((item) => {
              const isSelected = selectedBattery === item.bty;
              return (
                <button
                  key={item.bty}
                  onClick={() => handleSelectBatteryBox(item.bty)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all whitespace-nowrap ${
                    isSelected
                      ? 'bg-rose-600 text-white font-bold shadow'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {item.bty} ({btyTroopsCount(item.bty)})
                </button>
              );
            })}

            {selectedBattery !== 'All' && (
              <button
                onClick={() => {
                  setSelectedBatteryFilter(selectedBattery);
                  setActivePage('battery_dashboard');
                }}
                className="ml-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold border border-slate-700 flex items-center gap-1 whitespace-nowrap"
              >
                <span>Full Bty Console</span>
                <ChevronRight className="w-3.5 h-3.5 text-rose-400" />
              </button>
            )}
          </div>
        </div>

        {/* Live Filtered Table */}
        <PersonnelTable
          personnel={personnelList}
          fixedBattery={selectedBattery === 'All' ? undefined : selectedBattery}
          onViewDossier={onViewDossier}
          onOpenAddModal={onOpenAddModal}
          allowStatusEdits={currentUser.role !== 'CO'}
          title={
            selectedBattery === 'All'
              ? '10 Med Regt Master Personnel Roll'
              : `${selectedBattery} Troops Nominal Roll`
          }
        />
      </div>
      )}
    </div>
  );
};

