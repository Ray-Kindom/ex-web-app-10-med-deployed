import React from 'react';
import { useApp } from '../context/AppContext';
import { StatCard } from '../components/common/StatCard';
import { ParadeStateSummaryGrid } from '../components/parade/ParadeStateSummaryGrid';
import { PersonnelTable } from '../components/personnel/PersonnelTable';
import { Personnel } from '../types';
import {
  Eye,
  Shield,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  HeartPulse,
  PlaneTakeoff,
  Users,
  Compass,
  Zap,
} from 'lucide-react';

interface CoDashboardPageProps {
  onViewDossier: (person: Personnel) => void;
  onOpenPrintModal: () => void;
}

export const CoDashboardPage: React.FC<CoDashboardPageProps> = ({
  onViewDossier,
  onOpenPrintModal,
}) => {
  const { personnelList, getBatterySummaries, getRegimentalTotals } = useApp();
  const totals = getRegimentalTotals();
  const summaries = getBatterySummaries();

  const sickList = personnelList.filter((p) => p.status === 'CMH/Sick');
  const courseList = personnelList.filter((p) => p.status === 'Course/Trg' || p.status === 'Temp Duty');
  const leaveList = personnelList.filter(
    (p) =>
      p.status === 'Leave' ||
      p.status === 'P/Lve' ||
      p.status === 'C/Lve' ||
      p.outOfUnitCategory === 'P/Lve' ||
      p.outOfUnitCategory === 'C/Lve' ||
      p.leaveType === 'P/Lve' ||
      p.leaveType === 'C/Lve'
  );

  return (
    <div className="space-y-6">
      {/* CO Strategic Banner */}
      <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-amber-500/30 shadow-2xl space-y-4">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial-gradient from-amber-500/10 to-transparent pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                Commanding Officer (CO) Executive Console
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                LIVE MORNING STATE
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight font-serif">
              State of the Regiment — Executive Summary
            </h1>
          </div>
        </div>

        {/* Combat Operational Readiness Gauge Bar */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="font-bold text-slate-200 flex items-center gap-2 font-mono">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>OPERATIONAL COMBAT READINESS INDEX</span>
            </span>
            <span className="font-mono text-emerald-400 font-bold text-sm">
              {totals.presentPercentage}% COMBAT FIT ({totals.totalPresent + totals.totalDuty} / {totals.totalPosted})
            </span>
          </div>

          <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden p-0.5 border border-slate-800">
            <div
              className="bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 h-full rounded-full transition-all duration-700"
              style={{ width: `${totals.presentPercentage}%` }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono text-slate-400 pt-1">
            <div>HQ Bty Manning: <span className="text-white font-bold">100%</span></div>
            <div>P Bty (1st Gun): <span className="text-white font-bold">95%</span></div>
            <div>Q Bty (2nd Gun): <span className="text-white font-bold">94%</span></div>
            <div>R Bty (3rd Gun): <span className="text-white font-bold">97%</span></div>
          </div>
        </div>
      </div>

      {/* CO Executive KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="Regiment Posted"
          value={totals.totalPosted}
          subtitle="Nominal Roll"
          icon={Users}
          colorScheme="slate"
        />
        <StatCard
          title="Troops on Parade"
          value={totals.totalPresent}
          subtitle="Ready in Lines"
          icon={CheckCircle2}
          colorScheme="emerald"
        />
        <StatCard
          title="On Active Duty"
          value={totals.totalDuty}
          subtitle="Quarter Guard, RP"
          icon={Shield}
          colorScheme="blue"
        />
        <StatCard
          title="Hospitalized/Sick"
          value={totals.totalSick}
          subtitle="CMH Care"
          icon={HeartPulse}
          colorScheme="amber"
        />
        <StatCard
          title="On Approved Leave"
          value={totals.totalLeave}
          subtitle="Leave Roster"
          icon={PlaneTakeoff}
          colorScheme="purple"
        />
        <StatCard
          title="Cadres / Courses"
          value={totals.totalCourse + totals.totalTempDuty}
          subtitle="Artillery Center"
          icon={Compass}
          colorScheme="cyan"
        />
      </div>

      {/* Battery Consolidated State Matrix */}
      <ParadeStateSummaryGrid onOpenPrintModal={onOpenPrintModal} />

      {/* Critical Command Briefing Points */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Hospitalized Soldiers */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-amber-400 uppercase font-mono flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4" />
              <span>Medical & Hospitalized ({sickList.length})</span>
            </h3>
          </div>
          <div className="space-y-2 text-xs font-mono">
            {sickList.length === 0 ? (
              <div className="text-slate-500 py-4 text-center">No soldiers in CMH.</div>
            ) : (
              sickList.map((p) => (
                <div key={p.id} className="p-2 rounded bg-slate-950 border border-slate-800">
                  <div className="font-bold text-slate-200">
                    {p.rk} {p.name} ({p.snkNo})
                  </div>
                  <div className="text-[11px] text-amber-400">{p.battery} • {p.statusDetails || 'CMH Ward'}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Courses and Cadres */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-cyan-400 uppercase font-mono flex items-center gap-1.5">
              <Compass className="w-4 h-4" />
              <span>Courses & Training ({courseList.length})</span>
            </h3>
          </div>
          <div className="space-y-2 text-xs font-mono">
            {courseList.slice(0, 3).map((p) => (
              <div key={p.id} className="p-2 rounded bg-slate-950 border border-slate-800">
                <div className="font-bold text-slate-200">
                  {p.rk} {p.name} ({p.snkNo})
                </div>
                <div className="text-[11px] text-cyan-400">{p.battery} • {p.statusDetails || 'Cadre Course'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Leave State */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-purple-400 uppercase font-mono flex items-center gap-1.5">
              <PlaneTakeoff className="w-4 h-4" />
              <span>Troops on Furlough ({leaveList.length})</span>
            </h3>
          </div>
          <div className="space-y-2 text-xs font-mono">
            {leaveList.slice(0, 3).map((p) => (
              <div key={p.id} className="p-2 rounded bg-slate-950 border border-slate-800">
                <div className="font-bold text-slate-200">
                  {p.rk} {p.name} ({p.snkNo})
                </div>
                <div className="text-[11px] text-purple-400">{p.battery} • {p.statusDetails || 'Approved Leave'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Read-Only Personnel Roll for CO Inspection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
            <Eye className="w-4 h-4 text-amber-400" />
            <span>Regimental Nominal Roll — Command Inspection</span>
          </h2>
          <span className="text-xs text-amber-400 font-mono">
            Full Regimental Strength
          </span>
        </div>

        <PersonnelTable
          personnel={personnelList}
          onViewDossier={onViewDossier}
          allowStatusEdits={false}
          title="Commanding Officer's Master Roll Inspection"
        />
      </div>
    </div>
  );
};
