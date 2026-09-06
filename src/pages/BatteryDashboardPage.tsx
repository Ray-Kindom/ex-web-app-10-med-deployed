import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Battery, Personnel, ParadeStatus } from '../types';
import { StatCard } from '../components/common/StatCard';
import { PersonnelTable } from '../components/personnel/PersonnelTable';
import { ParadeActionControls } from '../components/parade/ParadeActionControls';
import {
  Users,
  CheckCircle2,
  ShieldAlert,
  HeartPulse,
  PlaneTakeoff,
  Radio,
  Compass,
  Tent,
  Globe,
  Building2,
  X,
} from 'lucide-react';

interface BatteryDashboardPageProps {
  onViewDossier: (person: Personnel) => void;
  onOpenAddModal: () => void;
  onOpenPrintModal?: () => void;
}

export const BatteryDashboardPage: React.FC<BatteryDashboardPageProps> = ({
  onViewDossier,
  onOpenAddModal,
  onOpenPrintModal,
}) => {
  const {
    personnelList,
    currentUser,
    selectedBatteryFilter,
    setSelectedBatteryFilter,
    showNotification,
    addAuditLog,
    isGuest,
    setOutOfUnitModalOpen,
    setActiveOutOfUnitCategory,
  } = useApp();

  const isBsm = ['P BSM', 'Q BSM', 'R BSM', 'HQ BSM', 'BSM'].includes(currentUser.role);
  const assignedBty: Battery =
    currentUser.assignedBattery ||
    (currentUser.role === 'P BSM'
      ? 'P Bty'
      : currentUser.role === 'Q BSM'
      ? 'Q Bty'
      : currentUser.role === 'R BSM'
      ? 'R Bty'
      : currentUser.role === 'HQ BSM'
      ? 'HQ Bty'
      : 'P Bty');

  const [activeBattery, setActiveBattery] = useState<Battery>(
    isBsm
      ? assignedBty
      : currentUser.assignedBattery ||
        (selectedBatteryFilter !== 'All' ? selectedBatteryFilter : 'P Bty')
  );

  // Modal for showing drilldown list when stat box is clicked
  const [selectedStatFilter, setSelectedStatFilter] = useState<{
    title: string;
    status: ParadeStatus | 'All';
  } | null>(null);

  useEffect(() => {
    if (isBsm) {
      setActiveBattery(assignedBty);
    } else if (selectedBatteryFilter !== 'All') {
      setActiveBattery(selectedBatteryFilter);
    }
  }, [isBsm, assignedBty, selectedBatteryFilter]);

  // Battery serial: P, Q, R, HQ
  const batteries: { id: Battery; name: string; role: string; commander: string; bsm: string }[] = [
    {
      id: 'P Bty',
      name: 'P Battery (P Bty - 1st Gun Bty)',
      role: 'Medium Artillery Field Fire Support',
      commander: 'Maj Kamrul Hassan',
      bsm: 'SWO Jafor',
    },
    {
      id: 'Q Bty',
      name: 'Q Battery (Q Bty - 2nd Gun Bty)',
      role: 'Medium Artillery Field Fire Support',
      commander: 'Maj Tanveer Ahmed',
      bsm: 'WO Hamid',
    },
    {
      id: 'R Bty',
      name: 'R Battery (R Bty - 3rd Gun Bty)',
      role: 'Medium Artillery Field Fire Support',
      commander: 'Capt M. S. Khan',
      bsm: 'WO Aminul',
    },
    {
      id: 'HQ Bty',
      name: 'HQ Battery (Headquarters)',
      role: 'Regimental Command, Signals & Logistics',
      commander: 'Capt Saifuddin Ahmed',
      bsm: 'SWO Nasir',
    },
  ];

  const btyPersonnel = personnelList.filter((p) => p.battery === activeBattery);
  const postedCount = btyPersonnel.length;
  const presentCount = btyPersonnel.filter((p) => p.status === 'Present').length;
  const dutyCount = btyPersonnel.filter((p) => p.status === 'On Duty').length;
  const sickCount = btyPersonnel.filter((p) => p.status === 'CMH/Sick').length;
  const leaveCount = btyPersonnel.filter((p) => p.status === 'Leave').length;
  const courseCount = btyPersonnel.filter((p) => p.status === 'Course/Trg').length;
  const comdCount = btyPersonnel.filter(
    (p) => p.status === 'Temp Duty' || p.status === 'Attached Out' || Boolean(p.comdAssignment)
  ).length;
  const btyFdmnCount = btyPersonnel.filter((p) => {
    if (p.outOfUnitCategory === 'FDMN') return true;
    const details = (p.statusDetails || '').toLowerCase();
    const loc = (p.outOfUnitLocation || '').toLowerCase();
    const rem = (p.outOfUnitRemarks || '').toLowerCase();
    return details.includes('fdmn') || loc.includes('fdmn') || rem.includes('fdmn') || loc.includes('camp') || details.includes('camp');
  }).length;
  const btyAttCount = btyPersonnel.filter((p) => p.outOfUnitCategory === 'Att').length;
  const btyMsnCount = btyPersonnel.filter((p) => p.outOfUnitCategory === 'Msn').length;
  const btyAttMsnCount = btyAttCount + btyMsnCount;
  const btyOthersOutCount = btyPersonnel.filter((p) => {
    if (p.outOfUnitCategory === 'ERE') return true;
    if (p.outOfUnitCategory && !['Att', 'Msn', 'FDMN', 'CMH', 'Course', 'Comd', 'P/Lve', 'C/Lve'].includes(p.outOfUnitCategory)) return true;
    if (p.status === 'Attached Out' && p.outOfUnitCategory !== 'Att' && p.outOfUnitCategory !== 'Msn' && p.outOfUnitCategory !== 'FDMN') return true;
    if (p.status === 'AWOL/OSL') return true;
    const details = (p.statusDetails || '').toLowerCase();
    const loc = (p.outOfUnitLocation || '').toLowerCase();
    const rem = (p.outOfUnitRemarks || '').toLowerCase();
    return details.includes('ere') || loc.includes('ere') || rem.includes('ere');
  }).length;

  const isRsm = currentUser.role === 'RSM' || currentUser.role === 'Admin';
  const canManageOutOfUnit = !isGuest && isRsm;

  // Personnel for popup modal
  const modalPersonnel = selectedStatFilter
    ? selectedStatFilter.status === 'All'
      ? btyPersonnel
      : selectedStatFilter.status === 'Temp Duty'
      ? btyPersonnel.filter((p) => p.status === 'Temp Duty' || p.status === 'Attached Out' || Boolean(p.comdAssignment))
      : selectedStatFilter.status === 'AttMsn'
      ? btyPersonnel.filter((p) => p.outOfUnitCategory === 'Att' || p.outOfUnitCategory === 'Msn')
      : selectedStatFilter.status === 'OthersOut'
      ? btyPersonnel.filter((p) => {
          if (p.outOfUnitCategory === 'ERE') return true;
          if (p.outOfUnitCategory && !['Att', 'Msn', 'FDMN', 'CMH', 'Course', 'Comd', 'P/Lve', 'C/Lve'].includes(p.outOfUnitCategory)) return true;
          if (p.status === 'Attached Out' && p.outOfUnitCategory !== 'Att' && p.outOfUnitCategory !== 'Msn' && p.outOfUnitCategory !== 'FDMN') return true;
          if (p.status === 'AWOL/OSL') return true;
          const details = (p.statusDetails || '').toLowerCase();
          const loc = (p.outOfUnitLocation || '').toLowerCase();
          const rem = (p.outOfUnitRemarks || '').toLowerCase();
          return details.includes('ere') || loc.includes('ere') || rem.includes('ere');
        })
      : btyPersonnel.filter((p) => p.status === selectedStatFilter.status)
    : [];

  return (
    <div className="space-y-5">
      {/* Battery Header: ONLY Battery Name (e.g. "P Bty" or user's respective battery name) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-sans">
            {activeBattery}
          </h1>

          {/* Sub-unit battery selector for privileged users (Admin, CO, RSM, Offr) */}
          {!isBsm && (
            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl">
              {batteries.map((b) => {
                const isSelected = activeBattery === b.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => {
                      setActiveBattery(b.id);
                      setSelectedBatteryFilter(b.id);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-950/40 font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {b.id}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Battery Stat Cards - adjusted with beautiful layout, clean spacing, and high contrast */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-9 gap-3 sm:gap-4">
        <StatCard
          title="Posted in Bty"
          value={postedCount}
          icon={Users}
          colorScheme="slate"
          onClick={() => setSelectedStatFilter({ title: `${activeBattery} Posted Strength`, status: 'All' })}
        />
        <StatCard
          title="Present In Unit"
          value={presentCount}
          icon={CheckCircle2}
          colorScheme="emerald"
          onClick={() => setSelectedStatFilter({ title: `${activeBattery} Present in Unit`, status: 'Present' })}
        />
        <StatCard
          title="Command"
          value={comdCount}
          icon={Compass}
          colorScheme="indigo"
          onClick={() => setSelectedStatFilter({ title: `${activeBattery} Command Troops (TD / Attached)`, status: 'Temp Duty' })}
        />
        <StatCard
          title="CMH / Sick"
          value={sickCount}
          icon={HeartPulse}
          colorScheme="amber"
          onClick={() => setSelectedStatFilter({ title: `${activeBattery} CMH / Sick Personnel`, status: 'CMH/Sick' })}
        />
        <StatCard
          title="On Leave"
          value={leaveCount}
          icon={PlaneTakeoff}
          colorScheme="purple"
          onClick={() => setSelectedStatFilter({ title: `${activeBattery} Troops on Leave`, status: 'Leave' })}
        />
        <StatCard
          title="Course"
          value={courseCount}
          icon={Radio}
          colorScheme="cyan"
          onClick={() => setSelectedStatFilter({ title: `${activeBattery} Course / Cadres Personnel`, status: 'Course/Trg' })}
        />
        <StatCard
          title="FDMN Camp"
          value={btyFdmnCount}
          icon={Tent}
          colorScheme="teal"
          onClick={() => {
            setActiveOutOfUnitCategory('FDMN');
            setOutOfUnitModalOpen(true);
          }}
        />
        <StatCard
          title="Att & Msn"
          value={btyAttMsnCount}
          subtitle={`Att: ${btyAttCount} | Msn: ${btyMsnCount}`}
          icon={Globe}
          colorScheme="blue"
          onClick={() => setSelectedStatFilter({ title: `${activeBattery} Attached & UN Mission (${btyAttCount} Att + ${btyMsnCount} Msn = ${btyAttMsnCount})`, status: 'AttMsn' })}
        />
        <StatCard
          title="Others Out"
          value={btyOthersOutCount}
          subtitle="ERE & Ext Duties"
          icon={Building2}
          colorScheme="orange"
          onClick={() => setSelectedStatFilter({ title: `${activeBattery} Others Out (ERE & Ext Duties - ${btyOthersOutCount})`, status: 'OthersOut' })}
        />
      </div>

      {/* Updt Out Of Unit Action Control Box (Only accessible to RSM and BSM) */}
      {canManageOutOfUnit && <ParadeActionControls battery={activeBattery} />}



      {/* Clickable Stat Modal Popup */}
      {selectedStatFilter && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[80vh] flex flex-col animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white font-sans">
                  {selectedStatFilter.title}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Total: {modalPersonnel.length} Personnel
                </p>
              </div>
              <button
                onClick={() => setSelectedStatFilter(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 pr-1">
              {modalPersonnel.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 font-mono">
                  No personnel in this category.
                </div>
              ) : (
                modalPersonnel.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedStatFilter(null);
                      onViewDossier(p);
                    }}
                    className="py-2.5 px-2 flex items-center justify-between hover:bg-slate-850 rounded-lg cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-mono font-bold text-amber-300">
                        {p.rk}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">
                          {p.name}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2">
                          <span>{p.snkNo}</span>
                          <span>•</span>
                          <span>{p.trade}</span>
                          {p.statusDetails && (
                            <>
                              <span>•</span>
                              <span className="text-rose-400">{p.statusDetails}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {p.status}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedStatFilter(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
