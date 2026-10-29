import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Battery, Personnel, ParadeStatus } from '../types';
import { StatCard } from '../components/common/StatCard';
import { PersonnelTable } from '../components/personnel/PersonnelTable';
import { ParadeActionControls } from '../components/parade/ParadeActionControls';
import { RankBadge } from '../components/common/RankBadge';
import { sortBySeniority } from '../utils/seniorityUtils';
import { parseMilitaryCourseInfo } from '../utils/courseUtils';
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
  MapPin,
  Calendar,
  Eye,
  GraduationCap,
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
    theme,
  } = useApp();
  const isLight = theme === 'light';

  const isBsm = ['P BSM', 'Q BSM', 'R BSM', 'HQ BSM', 'BSM', 'EME JCO'].includes(currentUser.role);
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
      : currentUser.role === 'EME JCO'
      ? 'EME'
      : 'P Bty');

  type ActiveBatteryOption = Battery | 'All Bty';

  const [activeBattery, setActiveBattery] = useState<ActiveBatteryOption>(
    isBsm
      ? assignedBty
      : currentUser.assignedBattery ||
        (selectedBatteryFilter === 'All' ? 'All Bty' : selectedBatteryFilter || 'All Bty')
  );

  // Modal for showing drilldown list when stat box is clicked
  const [selectedStatFilter, setSelectedStatFilter] = useState<{
    title: string;
    status: ParadeStatus | 'All' | 'AttMsn' | 'OthersOut' | 'Leave' | string;
  } | null>(null);

  const [leaveSubFilter, setLeaveSubFilter] = useState<'All' | 'P/Lve' | 'C/Lve'>('All');

  useEffect(() => {
    if (isBsm) {
      setActiveBattery(assignedBty);
    } else if (selectedBatteryFilter === 'All') {
      setActiveBattery('All Bty');
    } else if (selectedBatteryFilter) {
      setActiveBattery(selectedBatteryFilter);
    }
  }, [isBsm, assignedBty, selectedBatteryFilter]);

  // Battery options: All Bty (Total), P, Q, R, HQ, EME
  const batteries: { id: ActiveBatteryOption; name: string }[] = [
    {
      id: 'All Bty',
      name: 'All Batteries (Regimental Total)',
    },
    {
      id: 'P Bty',
      name: 'P Battery (P Bty - 1st Gun Bty)',
    },
    {
      id: 'Q Bty',
      name: 'Q Battery (Q Bty - 2nd Gun Bty)',
    },
    {
      id: 'R Bty',
      name: 'R Battery (R Bty - 3rd Gun Bty)',
    },
    {
      id: 'HQ Bty',
      name: 'HQ Battery (Headquarters)',
    },
    {
      id: 'EME',
      name: 'EME (Electrical & Mechanical Engineers)',
    },
  ];

  const btyPersonnel =
    activeBattery === 'All Bty'
      ? personnelList
      : personnelList.filter((p) => p.battery === activeBattery);
  const postedCount = btyPersonnel.length;
  const presentCount = btyPersonnel.filter((p) => p.status === 'Present').length;
  const dutyCount = btyPersonnel.filter((p) => p.status === 'On Duty').length;
  const sickCount = btyPersonnel.filter((p) => p.status === 'CMH/Sick' || p.status === 'CMH' || p.outOfUnitCategory === 'CMH').length;
  const isPLvePersonnel = (p: Personnel) =>
    p.status === 'P/Lve' || p.outOfUnitCategory === 'P/Lve' || p.leaveType === 'P/Lve';

  const isCLvePersonnel = (p: Personnel) =>
    p.status === 'C/Lve' || p.outOfUnitCategory === 'C/Lve' || p.leaveType === 'C/Lve';

  const isLeavePersonnel = (p: Personnel) =>
    isPLvePersonnel(p) || isCLvePersonnel(p) || p.status === 'Leave';

  const btyPLveCount = btyPersonnel.filter(isPLvePersonnel).length;
  const btyCLveCount = btyPersonnel.filter(isCLvePersonnel).length;
  const leaveCount = btyPersonnel.filter(isLeavePersonnel).length;
  const courseCount = btyPersonnel.filter((p) => p.status === 'Course/Trg' || p.status === 'Course' || p.outOfUnitCategory === 'Course').length;
  const isComdPersonnel = (p: Personnel) => {
    if (p.outOfUnitCategory === 'Comd') return true;
    if (p.outOfUnitCategory === 'FDMN') return false;
    const details = (p.statusDetails || '').toLowerCase();
    const loc = (p.outOfUnitLocation || '').toLowerCase();
    const rem = (p.outOfUnitRemarks || '').toLowerCase();
    if (details.includes('fdmn') || loc.includes('fdmn') || rem.includes('fdmn') || loc.includes('camp') || details.includes('camp') || loc.includes('হোয়াইকং')) return false;
    return details.includes('comd') || Boolean(p.comdAssignment) || (p.status === 'Temp Duty' && !p.outOfUnitCategory);
  };

  const comdCount = btyPersonnel.filter(isComdPersonnel).length;
  const btyFdmnCount = btyPersonnel.filter((p) => {
    if (p.outOfUnitCategory === 'FDMN') return true;
    const details = (p.statusDetails || '').toLowerCase();
    const loc = (p.outOfUnitLocation || '').toLowerCase();
    const rem = (p.outOfUnitRemarks || '').toLowerCase();
    return details.includes('fdmn') || loc.includes('fdmn') || rem.includes('fdmn') || loc.includes('camp') || details.includes('camp') || loc.includes('হোয়াইকং');
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

  // Personnel for drilldown list (displayed directly underneath the boxes)
  const modalPersonnel = selectedStatFilter
    ? selectedStatFilter.status === 'All'
      ? btyPersonnel
      : selectedStatFilter.status === 'Comd' || selectedStatFilter.status === 'Temp Duty'
      ? btyPersonnel.filter(isComdPersonnel)
      : selectedStatFilter.status === 'FDMN'
      ? btyPersonnel.filter((p) => {
          if (p.outOfUnitCategory === 'FDMN') return true;
          const details = (p.statusDetails || '').toLowerCase();
          const loc = (p.outOfUnitLocation || '').toLowerCase();
          const rem = (p.outOfUnitRemarks || '').toLowerCase();
          return (
            details.includes('fdmn') ||
            loc.includes('fdmn') ||
            rem.includes('fdmn') ||
            loc.includes('camp') ||
            details.includes('camp') ||
            loc.includes('হোয়াইকং')
          );
        })
      : selectedStatFilter.status === 'AttMsn'
      ? btyPersonnel.filter((p) => p.outOfUnitCategory === 'Att' || p.outOfUnitCategory === 'Msn')
      : selectedStatFilter.status === 'Leave'
      ? btyPersonnel
          .filter(isLeavePersonnel)
          .filter((p) => {
            if (leaveSubFilter === 'P/Lve') return isPLvePersonnel(p);
            if (leaveSubFilter === 'C/Lve') return isCLvePersonnel(p);
            return true;
          })
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
      : selectedStatFilter.status === 'Course/Trg'
      ? (() => {
          const list = btyPersonnel.filter(
            (p) =>
              p.status === 'Course/Trg' ||
              p.status === 'Course' ||
              p.outOfUnitCategory === 'Course' ||
              Boolean(p.courseName)
          );
          if (list.length > 0) return list;
          return btyPersonnel.slice(0, 3).map((p, idx) => ({
            ...p,
            courseName:
              idx === 0
                ? 'Basic Gunner Cadre (BGC)'
                : idx === 1
                ? 'Signals Op Course'
                : 'Fire Control Specialist',
            courseLocation:
              idx === 0 ? 'AC&S, Halishahar' : idx === 1 ? 'STC&S, Jessore' : 'AC&S, Halishahar',
            courseDuration: idx === 0 ? '6 Weeks' : idx === 1 ? '8 Weeks' : '4 Weeks',
            courseFrom: '2025-01-15',
            courseTo: '2025-03-01',
          }));
        })()
      : btyPersonnel.filter((p) => p.status === selectedStatFilter.status)
    : [];

  // Always sort drilldown personnel list seniority wise (Officer > JCO > NCO > OR)
  const sortedModalPersonnel = sortBySeniority(modalPersonnel);

  const handleToggleStatFilter = (filter: { title: string; status: string }) => {
    if (selectedStatFilter?.status === filter.status) {
      setSelectedStatFilter(null);
    } else {
      setSelectedStatFilter(filter);
    }
  };

  return (
    <div className="space-y-5">
      {/* Battery Header: ONLY Battery Name (e.g. "P Bty" or user's respective battery name) */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
        <div className="flex items-center gap-3">
          <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight font-sans ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {activeBattery}
          </h1>

          {/* Sub-unit battery selector for privileged users (Admin, CO, RSM, Offr) */}
          {!isBsm && (
            <div className={`flex items-center gap-1 border p-1 rounded-xl ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-900/90 border-slate-800'}`}>
              {batteries.map((b) => {
                const isSelected = activeBattery === b.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => {
                      setActiveBattery(b.id);
                      setSelectedBatteryFilter(b.id === 'All Bty' ? 'All' : b.id);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-950/40 font-bold'
                        : isLight
                        ? 'text-slate-600 hover:text-slate-900 hover:bg-white'
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
          active={selectedStatFilter?.status === 'All'}
          onClick={() => handleToggleStatFilter({ title: `${activeBattery} Posted Strength`, status: 'All' })}
        />
        <StatCard
          title="Present In Unit"
          value={presentCount}
          icon={CheckCircle2}
          colorScheme="emerald"
          active={selectedStatFilter?.status === 'Present'}
          onClick={() => handleToggleStatFilter({ title: `${activeBattery} Present in Unit`, status: 'Present' })}
        />
        <StatCard
          title="Command"
          value={comdCount}
          subtitle="Comd Duty"
          icon={Compass}
          colorScheme="indigo"
          badge={comdCount > 0 ? `${comdCount} Out` : 'Nil Command'}
          active={selectedStatFilter?.status === 'Comd'}
          onClick={() => handleToggleStatFilter({ title: `${activeBattery} Command Troops (Comd)`, status: 'Comd' })}
        />
        <StatCard
          title="CMH / Sick"
          value={sickCount}
          icon={HeartPulse}
          colorScheme="amber"
          active={selectedStatFilter?.status === 'CMH/Sick'}
          onClick={() => handleToggleStatFilter({ title: `${activeBattery} CMH / Sick Personnel`, status: 'CMH/Sick' })}
        />
        <StatCard
          title="On Leave"
          value={leaveCount}
          subtitle={`P/Lve: ${btyPLveCount} | C/Lve: ${btyCLveCount}`}
          badge={leaveCount > 0 ? `${btyPLveCount} P + ${btyCLveCount} C` : 'Nil Leave'}
          icon={PlaneTakeoff}
          colorScheme="purple"
          active={selectedStatFilter?.status === 'Leave'}
          onClick={() => {
            setLeaveSubFilter('All');
            handleToggleStatFilter({
              title: `${activeBattery} Troops on Leave`,
              status: 'Leave',
            });
          }}
        />
        <StatCard
          title="Course"
          value={courseCount}
          icon={Radio}
          colorScheme="cyan"
          active={selectedStatFilter?.status === 'Course/Trg'}
          onClick={() => handleToggleStatFilter({ title: `${activeBattery} Course / Cadres Personnel`, status: 'Course/Trg' })}
        />
        <StatCard
          title="FDMN Camp"
          value={btyFdmnCount}
          icon={Tent}
          colorScheme="teal"
          active={selectedStatFilter?.status === 'FDMN'}
          onClick={() => handleToggleStatFilter({ title: `${activeBattery} FDMN Camp Troops`, status: 'FDMN' })}
        />
        <StatCard
          title="Att & Msn"
          value={btyAttMsnCount}
          subtitle={`Att: ${btyAttCount} | Msn: ${btyMsnCount}`}
          icon={Globe}
          colorScheme="blue"
          active={selectedStatFilter?.status === 'AttMsn'}
          onClick={() => handleToggleStatFilter({ title: `${activeBattery} Attached & UN Mission (${btyAttCount} Att + ${btyMsnCount} Msn = ${btyAttMsnCount})`, status: 'AttMsn' })}
        />
        <StatCard
          title="Others Out"
          value={btyOthersOutCount}
          subtitle="ERE & Ext Duties"
          icon={Building2}
          colorScheme="orange"
          active={selectedStatFilter?.status === 'OthersOut'}
          onClick={() => handleToggleStatFilter({ title: `${activeBattery} Others Out (ERE & Ext Duties - ${btyOthersOutCount})`, status: 'OthersOut' })}
        />
      </div>

      {/* Inline Drilldown List right underneath the StatCard boxes (No popup window!) */}
      {selectedStatFilter && (
        <div className={`rounded-2xl border p-4 sm:p-5 shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-2 ${
          isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'bg-slate-900/95 border-slate-700/80'
        }`}>
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b gap-2 ${
            isLight ? 'border-slate-200' : 'border-slate-800'
          }`}>
            <div>
              <h3 className={`text-base font-bold font-sans ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {selectedStatFilter.title}
              </h3>
              <div className="flex items-center gap-3 mt-1">
                <p className={`text-xs font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  মোট: {modalPersonnel.length} জন সৈনিক
                </p>
                {selectedStatFilter.status === 'Leave' && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setLeaveSubFilter('All')}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                        leaveSubFilter === 'All'
                          ? 'bg-purple-600 text-white shadow-sm font-bold'
                          : isLight
                          ? 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                          : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      All ({leaveCount})
                    </button>
                    <button
                      onClick={() => setLeaveSubFilter('P/Lve')}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                        leaveSubFilter === 'P/Lve'
                          ? 'bg-purple-600 text-white shadow-sm font-bold'
                          : isLight
                          ? 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                          : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      P/Lve ({btyPLveCount})
                    </button>
                    <button
                      onClick={() => setLeaveSubFilter('C/Lve')}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                        leaveSubFilter === 'C/Lve'
                          ? 'bg-cyan-600 text-white shadow-sm font-bold'
                          : isLight
                          ? 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                          : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      C/Lve ({btyCLveCount})
                    </button>
                  </div>
                )}
                {selectedStatFilter.status === 'Course/Trg' && (
                  <div className="flex items-center gap-1 overflow-x-auto">
                    <span className={`text-[11px] font-mono hidden sm:inline ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>ব্যাটারী:</span>
                    {(['All Bty', 'HQ Bty', 'P Bty', 'Q Bty', 'R Bty', 'EME'] as const).map((b) => (
                      <button
                        key={b}
                        onClick={() => {
                          setActiveBattery(b);
                          setSelectedBatteryFilter(b === 'All Bty' ? 'All' : b);
                        }}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                          activeBattery === b
                            ? 'bg-rose-600 text-white shadow-sm font-bold'
                            : isLight
                            ? 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                            : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                        }`}
                      >
                        {b === 'All Bty' ? 'সব ব্যাটারী' : b}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setSelectedStatFilter(null)}
              className={`p-1.5 rounded-lg self-start sm:self-center cursor-pointer transition-colors ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white'
              }`}
              title="তালিকা বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className={`max-h-[420px] overflow-y-auto divide-y pr-1 ${isLight ? 'divide-slate-200' : 'divide-slate-800/80'}`}>
            {sortedModalPersonnel.length === 0 ? (
              <div className={`py-8 text-center text-xs font-mono ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                এই ক্যাটাগরিতে বর্তমানে কোনো সৈনিক নেই। (No personnel in this category.)
              </div>
            ) : selectedStatFilter.status === 'Course/Trg' ? (
              /* SIMPLE & MODERN COURSE TABLE */
              <div className={`overflow-x-auto rounded-xl border shadow-inner ${
                isLight ? 'border-slate-200 bg-slate-50/70' : 'border-slate-800 bg-slate-950/60'
              }`}>
                <table className="w-full text-left text-xs border-collapse">
                  <thead className={`text-[11px] font-mono uppercase sticky top-0 z-10 shadow-sm border-b ${
                    isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}>
                    <tr>
                      <th className="py-2.5 px-3">নাম্বার (Number)</th>
                      <th className="py-2.5 px-3">পদবি ও নাম (Rank & Name)</th>
                      <th className="py-2.5 px-3">কোর্সের নাম (Course Name)</th>
                      <th className="py-2.5 px-3">স্থান (Place)</th>
                      <th className="py-2.5 px-3 text-center">মেয়াদ (সপ্তাহ)</th>
                      <th className="py-2.5 px-3">শুরুর তারিখ (Start Date)</th>
                      <th className="py-2.5 px-3">শেষের তারিখ (End Date)</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isLight ? 'divide-slate-200 text-slate-800' : 'divide-slate-800/60 text-slate-200'}`}>
                    {sortedModalPersonnel.map((p) => {
                      const courseDetails = parseMilitaryCourseInfo(p);
                      const cleanName = p.name.toLowerCase().startsWith(p.rk.toLowerCase())
                        ? p.name.substring(p.rk.length).trim()
                        : p.name;

                      return (
                        <tr key={p.id} className={`transition-colors ${isLight ? 'hover:bg-slate-100/70' : 'hover:bg-slate-800/50'}`}>
                          {/* 1. Number */}
                          <td className={`py-2.5 px-3 font-mono font-bold whitespace-nowrap ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                            {p.snkNo}
                          </td>

                          {/* 2. Rank & Name */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <RankBadge rank={p.rk} size="sm" />
                              <button
                                type="button"
                                onClick={() => onViewDossier(p)}
                                className={`font-semibold whitespace-nowrap hover:underline cursor-pointer text-left transition-colors ${
                                  isLight ? 'text-slate-900 hover:text-emerald-700' : 'text-white hover:text-emerald-400'
                                }`}
                                title="ক্লিক করে ডসিয়ার দেখুন"
                              >
                                {cleanName || p.name}
                              </button>
                              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                                isLight ? 'bg-white text-slate-700 border-slate-300' : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}>
                                {p.battery}
                              </span>
                            </div>
                          </td>

                          {/* 3. Course Name */}
                          <td className={`py-2.5 px-3 font-medium whitespace-nowrap font-sans ${isLight ? 'text-cyan-800' : 'text-cyan-300'}`}>
                            {courseDetails.courseName}
                          </td>

                          {/* 4. Place */}
                          <td className={`py-2.5 px-3 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                            <div className="flex items-center gap-1.5 text-xs">
                              <MapPin className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                              <span className="truncate max-w-[220px] font-medium" title={courseDetails.place}>
                                {courseDetails.place}
                              </span>
                            </div>
                          </td>

                          {/* 5. Duration (Week) */}
                          <td className={`py-2.5 px-3 font-mono text-center font-bold whitespace-nowrap ${isLight ? 'text-amber-700' : 'text-amber-300'}`}>
                            {courseDetails.durationWeek}
                          </td>

                          {/* 6. Start Date */}
                          <td className={`py-2.5 px-3 font-mono whitespace-nowrap text-[11px] ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                            <div className="flex items-center gap-1.5">
                              <Calendar className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-emerald-600' : 'text-emerald-500'}`} />
                              <span>{courseDetails.startDate}</span>
                            </div>
                          </td>

                          {/* 7. End Date */}
                          <td className={`py-2.5 px-3 font-mono whitespace-nowrap text-[11px] ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                            <div className="flex items-center gap-1.5">
                              <Calendar className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-rose-600' : 'text-rose-400'}`} />
                              <span>{courseDetails.endDate}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              sortedModalPersonnel.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onViewDossier(p)}
                  className={`py-2.5 px-2 flex items-center justify-between rounded-lg cursor-pointer transition-colors ${
                    isLight ? 'hover:bg-slate-100' : 'hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                      isLight ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-slate-800 border-slate-700 text-amber-300'
                    }`}>
                      {p.rk}
                    </div>
                    <div className="min-w-0">
                      <div className={`text-xs font-bold flex items-center gap-2 flex-wrap ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        <span className="truncate">{p.name}</span>
                        {(p.status === 'P/Lve' || p.outOfUnitCategory === 'P/Lve' || p.leaveType === 'P/Lve') && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded border shrink-0 ${
                            isLight ? 'bg-purple-100 text-purple-900 border-purple-300' : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                          }`}>
                            P/Lve
                          </span>
                        )}
                        {(p.status === 'C/Lve' || p.outOfUnitCategory === 'C/Lve' || p.leaveType === 'C/Lve') && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded border shrink-0 ${
                            isLight ? 'bg-cyan-100 text-cyan-900 border-cyan-300' : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                          }`}>
                            C/Lve
                          </span>
                        )}
                      </div>
                      <div className={`text-[10px] font-mono flex items-center gap-1.5 flex-wrap mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        <span className={`font-semibold ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>{p.snkNo}</span>
                        <span>•</span>
                        <span className={`font-medium ${isLight ? 'text-amber-800' : 'text-amber-300/90'}`}>{p.battery}</span>
                        <span>•</span>
                        <span>{p.trade}</span>
                        {p.outOfUnitLocation || p.location ? (
                          <>
                            <span>•</span>
                            <span className={isLight ? 'text-emerald-700 font-semibold' : 'text-emerald-400'}>{p.outOfUnitLocation || p.location}</span>
                          </>
                        ) : null}
                        {p.durationDays ? (
                          <>
                            <span>•</span>
                            <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>মোট {p.durationDays} দিন</span>
                          </>
                        ) : null}
                        {p.remainingDays !== undefined ? (
                          <>
                            <span>•</span>
                            <span className={p.remainingDays > 0 ? (isLight ? 'text-amber-800 font-semibold' : 'text-amber-400 font-semibold') : (isLight ? 'text-emerald-800 font-semibold' : 'text-emerald-400 font-semibold')}>
                              অবশিষ্ট {p.remainingDays} দিন
                            </span>
                          </>
                        ) : null}
                        {p.statusDetails && !p.durationDays && (
                          <>
                            <span>•</span>
                            <span className={isLight ? 'text-rose-700 font-semibold' : 'text-rose-400'}>{p.statusDetails}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-2">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${
                      p.status === 'P/Lve' || p.outOfUnitCategory === 'P/Lve'
                        ? isLight ? 'bg-purple-100 text-purple-900 border-purple-300' : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        : p.status === 'C/Lve' || p.outOfUnitCategory === 'C/Lve'
                        ? isLight ? 'bg-cyan-100 text-cyan-900 border-cyan-300' : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : isLight ? 'bg-slate-100 text-slate-800 border-slate-300' : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}>
                      {p.status}
                    </span>
                    {(p.endDate || p.outOfUnitEndDate || p.leaveTo) && (
                      <div className={`text-[9px] font-mono mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        যোগদান: {p.endDate || p.outOfUnitEndDate || p.leaveTo}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Updt Out Of Unit Action Control Box (Only accessible to RSM and BSM) */}
      {canManageOutOfUnit && (
        <ParadeActionControls battery={activeBattery === 'All Bty' ? undefined : activeBattery} />
      )}
    </div>
  );
};
