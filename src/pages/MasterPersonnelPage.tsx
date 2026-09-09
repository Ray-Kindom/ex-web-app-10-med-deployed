import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { PersonnelTable } from '../components/personnel/PersonnelTable';
import {
  Personnel,
  Battery,
  isOfficerRank,
  isJCORank,
  isORRank,
  isCivilianRank,
  isNCERank,
  isNCURank,
  isRCORank,
} from '../types';
import {
  UserPlus,
  Layers,
  Building2,
  ChevronDown,
  Users,
  Scissors,
  Shirt,
  Wrench,
  Sprout,
  Car,
  Sparkles,
} from 'lucide-react';
import { sortBySeniority } from '../utils/seniorityUtils';

interface MasterPersonnelPageProps {
  onViewDossier: (person: Personnel) => void;
  onOpenAddModal: () => void;
  onOpenPrintModal: () => void;
}

type RankCategoryFilter = 'ALL' | 'OFFICER' | 'JCO' | 'OR' | 'CIVILIAN' | 'NCE' | 'NCU' | 'RCO' | 'OTHERS';

export const MasterPersonnelPage: React.FC<MasterPersonnelPageProps> = ({
  onViewDossier,
  onOpenAddModal,
}) => {
  const { personnelList, currentUser, isGuest, showNotification, ranksList } = useApp();

  const isBsm = ['P BSM', 'Q BSM', 'R BSM', 'HQ BSM', 'BSM'].includes(currentUser.role);
  const assignedBattery: Battery =
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

  // Battery serial: P Bty, Q Bty, R Bty, HQ Bty, EME
  const batteryOrder: Battery[] = ['P Bty', 'Q Bty', 'R Bty', 'HQ Bty', 'EME'];

  // Three primary modes: 'REGT' (Regt Nominal), 'BTY' (Bty Nominal), or 'CIVILIAN' (Civilian Staff)
  const [viewMode, setViewMode] = useState<'REGT' | 'BTY' | 'CIVILIAN'>(isBsm ? 'BTY' : 'REGT');
  const [activeBatteryTab, setActiveBatteryTab] = useState<Battery>(
    isBsm ? assignedBattery : currentUser.assignedBattery || 'P Bty'
  );

  // Category & trade filter state
  const [selectedCategory, setSelectedCategory] = useState<RankCategoryFilter>('ALL');
  const [selectedCivilianTrade, setSelectedCivilianTrade] = useState<string>('ALL');
  const [isOthersExpanded, setIsOthersExpanded] = useState<boolean>(false);

  // Switch view mode handler
  const handleSetViewMode = (mode: 'REGT' | 'BTY' | 'CIVILIAN') => {
    if (isBsm && mode !== 'BTY') {
      showNotification?.('বিএসএম রোল শুধুমাত্র নিজ ব্যাটারির সৈনিকদের তালিকা দেখতে পারেন।', 'error');
      return;
    }
    setViewMode(mode);
    setSelectedCategory('ALL');
    setSelectedCivilianTrade('ALL');
    setIsOthersExpanded(false);
  };

  // Switch battery tab handler
  const handleSelectBattery = (bty: Battery) => {
    if (isBsm && bty !== assignedBattery) {
      showNotification?.(`বিএসএম হিসেবে আপনি শুধুমাত্র ${assignedBattery}-র তথ্য দেখতে পারবেন।`, 'error');
      return;
    }
    setActiveBatteryTab(bty);
    setSelectedCategory('ALL');
    setIsOthersExpanded(false);
  };

  // Filter list depending on selected mode and BSM isolation
  const currentScopePersonnel = useMemo(() => {
    if (isBsm) {
      return personnelList.filter((p) => p.battery === assignedBattery);
    }
    if (viewMode === 'CIVILIAN') {
      return personnelList.filter((p) => isCivilianRank(p.rk, p.trade) || p.battery === 'Civilian');
    }
    return viewMode === 'REGT'
      ? personnelList
      : personnelList.filter((p) => p.battery === activeBatteryTab);
  }, [isBsm, assignedBattery, viewMode, activeBatteryTab, personnelList]);

  // Overall counts
  const militaryPersonnelCount = useMemo(
    () => personnelList.filter((p) => !isCivilianRank(p.rk, p.trade) && p.battery !== 'Civilian').length,
    [personnelList]
  );
  const civilianTotalCount = useMemo(
    () => personnelList.filter((p) => isCivilianRank(p.rk, p.trade) || p.battery === 'Civilian').length,
    [personnelList]
  );

  // Civilian Trade Counts
  const civilianDupiCount = useMemo(
    () =>
      personnelList.filter(
        (p) =>
          (isCivilianRank(p.rk, p.trade) || p.battery === 'Civilian') &&
          (p.trade || '').toLowerCase().includes('dupi')
      ).length,
    [personnelList]
  );
  const civilianBarberCount = useMemo(
    () =>
      personnelList.filter(
        (p) =>
          (isCivilianRank(p.rk, p.trade) || p.battery === 'Civilian') &&
          (p.trade || '').toLowerCase().includes('barber')
      ).length,
    [personnelList]
  );
  const civilianTailorCount = useMemo(
    () =>
      personnelList.filter(
        (p) =>
          (isCivilianRank(p.rk, p.trade) || p.battery === 'Civilian') &&
          (p.trade || '').toLowerCase().includes('tailor')
      ).length,
    [personnelList]
  );
  const civilianCarpenterCount = useMemo(
    () =>
      personnelList.filter(
        (p) =>
          (isCivilianRank(p.rk, p.trade) || p.battery === 'Civilian') &&
          (p.trade || '').toLowerCase().includes('carpenter')
      ).length,
    [personnelList]
  );
  const civilianMaliCount = useMemo(
    () =>
      personnelList.filter(
        (p) =>
          (isCivilianRank(p.rk, p.trade) || p.battery === 'Civilian') &&
          (p.trade || '').toLowerCase().includes('mali')
      ).length,
    [personnelList]
  );
  const civilianDriverCount = useMemo(
    () =>
      personnelList.filter(
        (p) =>
          (isCivilianRank(p.rk, p.trade) || p.battery === 'Civilian') &&
          (p.trade || '').toLowerCase().includes('driver')
      ).length,
    [personnelList]
  );

  // Military Rank Category Counts
  const officerCount = useMemo(
    () => currentScopePersonnel.filter((p) => isOfficerRank(p.rk)).length,
    [currentScopePersonnel]
  );
  const jcoCount = useMemo(
    () => currentScopePersonnel.filter((p) => isJCORank(p.rk)).length,
    [currentScopePersonnel]
  );
  const orCount = useMemo(
    () => currentScopePersonnel.filter((p) => isORRank(p.rk)).length,
    [currentScopePersonnel]
  );
  const civilianCount = useMemo(
    () => currentScopePersonnel.filter((p) => isCivilianRank(p.rk, p.trade) || p.battery === 'Civilian').length,
    [currentScopePersonnel]
  );
  const nceCount = useMemo(
    () => currentScopePersonnel.filter((p) => isNCERank(p.rk, p.trade)).length,
    [currentScopePersonnel]
  );
  const ncuCount = useMemo(
    () => currentScopePersonnel.filter((p) => isNCURank(p.rk, p.trade)).length,
    [currentScopePersonnel]
  );
  const rcoCount = useMemo(
    () => currentScopePersonnel.filter((p) => isRCORank(p.rk, p.trade)).length,
    [currentScopePersonnel]
  );
  const othersCount = useMemo(
    () =>
      currentScopePersonnel.filter(
        (p) =>
          isRCORank(p.rk, p.trade) ||
          isNCERank(p.rk, p.trade) ||
          isNCURank(p.rk, p.trade)
      ).length,
    [currentScopePersonnel]
  );

  // Filter displayed personnel according to selected rank category or civilian trade
  const displayedPersonnel = useMemo(() => {
    if (viewMode === 'CIVILIAN') {
      let list = currentScopePersonnel;
      if (selectedCivilianTrade !== 'ALL') {
        list = list.filter((p) =>
          (p.trade || '').toLowerCase().includes(selectedCivilianTrade.toLowerCase())
        );
      }
      return sortBySeniority(list, ranksList);
    }

    let list = currentScopePersonnel;
    if (selectedCategory === 'OFFICER') {
      list = list.filter((p) => isOfficerRank(p.rk));
    } else if (selectedCategory === 'JCO') {
      list = list.filter((p) => isJCORank(p.rk));
    } else if (selectedCategory === 'OR') {
      list = list.filter((p) => isORRank(p.rk));
    } else if (selectedCategory === 'CIVILIAN') {
      list = list.filter((p) => isCivilianRank(p.rk, p.trade) || p.battery === 'Civilian');
    } else if (selectedCategory === 'NCE') {
      list = list.filter((p) => isNCERank(p.rk, p.trade));
    } else if (selectedCategory === 'NCU') {
      list = list.filter((p) => isNCURank(p.rk, p.trade));
    } else if (selectedCategory === 'RCO') {
      list = list.filter((p) => isRCORank(p.rk, p.trade));
    } else if (selectedCategory === 'OTHERS') {
      list = list.filter(
        (p) =>
          isRCORank(p.rk, p.trade) ||
          isNCERank(p.rk, p.trade) ||
          isNCURank(p.rk, p.trade)
      );
    }
    return sortBySeniority(list, ranksList);
  }, [currentScopePersonnel, selectedCategory, selectedCivilianTrade, viewMode, ranksList]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
                viewMode === 'CIVILIAN'
                  ? 'text-purple-400 bg-purple-500/10 border-purple-500/20'
                  : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
              }`}
            >
              {viewMode === 'REGT'
                ? 'Regt Nominal Roll'
                : viewMode === 'CIVILIAN'
                ? 'Civilian Staff Nominal Roll'
                : `${activeBatteryTab} Nominal Roll`}
            </span>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
              {displayedPersonnel.length} {viewMode === 'CIVILIAN' ? 'Staff' : 'Personnel'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {viewMode === 'REGT'
              ? 'Regt Nominal'
              : viewMode === 'CIVILIAN'
              ? 'Civilian Staff (বেসামরিক কর্মী)'
              : `${activeBatteryTab} Nominal`}
          </h1>
        </div>

        {['RSM', 'Admin'].includes(currentUser.role) && !isGuest && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-900/40 transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Enlist Soldier</span>
            </button>
          </div>
        )}
      </div>

      {/* Primary Toggle: "Regt Nominal" vs "Bty Nominal" vs "Civilian Staff" */}
      <div className="p-2 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {!isBsm && (
            <button
              onClick={() => handleSetViewMode('REGT')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'REGT'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-950/40 border border-rose-500'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Regt Nominal ({personnelList.length})</span>
            </button>
          )}

          <button
            onClick={() => handleSetViewMode('BTY')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'BTY'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-950/40 border border-rose-500'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>{isBsm ? `${assignedBattery} Nominal (Your Unit)` : `Bty Nominal (${militaryPersonnelCount})`}</span>
          </button>

          {!isBsm && (
            <button
              onClick={() => handleSetViewMode('CIVILIAN')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'CIVILIAN'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-950/40 border border-purple-500'
                  : 'bg-slate-950 text-purple-400 hover:text-purple-300 border border-purple-900/40'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Civilian Staff ({civilianTotalCount})</span>
            </button>
          )}
        </div>

        {/* Battery Sub-Tabs (P, Q, R, HQ, EME) - Exclusively for military batteries */}
        {viewMode === 'BTY' && (
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(isBsm ? [assignedBattery] : batteryOrder).map((bty) => {
              const count = personnelList.filter((p) => p.battery === bty).length;
              const isSelected = activeBatteryTab === bty;
              return (
                <button
                  key={bty}
                  onClick={() => handleSelectBattery(bty)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                      : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
                  }`}
                >
                  <span>{bty}</span>
                  <span
                    className={`text-[10px] px-1.5 rounded ${
                      isSelected ? 'bg-black/20 text-black' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* CIVILIAN VIEW MODE: Trade Summary Filter Cards */}
      {viewMode === 'CIVILIAN' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {/* All Civilians */}
            <button
              type="button"
              onClick={() => setSelectedCivilianTrade('ALL')}
              className={`p-3.5 rounded-xl text-left transition-all cursor-pointer border ${
                selectedCivilianTrade === 'ALL'
                  ? 'bg-purple-950/80 border-purple-500 ring-2 ring-purple-500/50 shadow-lg shadow-purple-950/50'
                  : 'bg-slate-900 border-purple-500/30 hover:border-purple-500/60 hover:bg-slate-850'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-purple-300">
                <span>All Civilian</span>
                <Users className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white font-mono mt-1">
                {civilianTotalCount}
              </div>
              <div className="text-[10px] text-purple-400/80 font-mono mt-0.5">সব বেসামরিক</div>
            </button>

            {/* Dupi (Laundry) */}
            <button
              type="button"
              onClick={() => setSelectedCivilianTrade((prev) => (prev === 'Dupi' ? 'ALL' : 'Dupi'))}
              className={`p-3.5 rounded-xl text-left transition-all cursor-pointer border ${
                selectedCivilianTrade === 'Dupi'
                  ? 'bg-cyan-950/80 border-cyan-500 ring-2 ring-cyan-500/50 shadow-lg shadow-cyan-950/50'
                  : 'bg-slate-900 border-cyan-500/30 hover:border-cyan-500/60 hover:bg-slate-850'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
                <span>Dupi (ধোপা)</span>
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white font-mono mt-1">
                {civilianDupiCount}
              </div>
              <div className="text-[10px] text-cyan-400/80 font-mono mt-0.5">1 Contractor, 5 Dupi</div>
            </button>

            {/* Barber */}
            <button
              type="button"
              onClick={() => setSelectedCivilianTrade((prev) => (prev === 'Barber' ? 'ALL' : 'Barber'))}
              className={`p-3.5 rounded-xl text-left transition-all cursor-pointer border ${
                selectedCivilianTrade === 'Barber'
                  ? 'bg-amber-950/80 border-amber-500 ring-2 ring-amber-500/50 shadow-lg shadow-amber-950/50'
                  : 'bg-slate-900 border-amber-500/30 hover:border-amber-500/60 hover:bg-slate-850'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                <span>Barber (নাপিত)</span>
                <Scissors className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white font-mono mt-1">
                {civilianBarberCount}
              </div>
              <div className="text-[10px] text-amber-400/80 font-mono mt-0.5">1 Contractor, 5 Barber</div>
            </button>

            {/* Tailor */}
            <button
              type="button"
              onClick={() => setSelectedCivilianTrade((prev) => (prev === 'Tailor' ? 'ALL' : 'Tailor'))}
              className={`p-3.5 rounded-xl text-left transition-all cursor-pointer border ${
                selectedCivilianTrade === 'Tailor'
                  ? 'bg-emerald-950/80 border-emerald-500 ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-950/50'
                  : 'bg-slate-900 border-emerald-500/30 hover:border-emerald-500/60 hover:bg-slate-850'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                <span>Tailor (দর্জি)</span>
                <Shirt className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white font-mono mt-1">
                {civilianTailorCount}
              </div>
              <div className="text-[10px] text-emerald-400/80 font-mono mt-0.5">1 Contractor, 2 Tailor</div>
            </button>

            {/* Carpenter */}
            <button
              type="button"
              onClick={() => setSelectedCivilianTrade((prev) => (prev === 'Carpenter' ? 'ALL' : 'Carpenter'))}
              className={`p-3.5 rounded-xl text-left transition-all cursor-pointer border ${
                selectedCivilianTrade === 'Carpenter'
                  ? 'bg-rose-950/80 border-rose-500 ring-2 ring-rose-500/50 shadow-lg shadow-rose-950/50'
                  : 'bg-slate-900 border-rose-500/30 hover:border-rose-500/60 hover:bg-slate-850'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-rose-300">
                <span>Carpenter</span>
                <Wrench className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white font-mono mt-1">
                {civilianCarpenterCount}
              </div>
              <div className="text-[10px] text-rose-400/80 font-mono mt-0.5">কাঠমিস্ত্রি</div>
            </button>

            {/* Mali */}
            <button
              type="button"
              onClick={() => setSelectedCivilianTrade((prev) => (prev === 'Mali' ? 'ALL' : 'Mali'))}
              className={`p-3.5 rounded-xl text-left transition-all cursor-pointer border ${
                selectedCivilianTrade === 'Mali'
                  ? 'bg-lime-950/80 border-lime-500 ring-2 ring-lime-500/50 shadow-lg shadow-lime-950/50'
                  : 'bg-slate-900 border-lime-500/30 hover:border-lime-500/60 hover:bg-slate-850'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-lime-300">
                <span>Mali (মালী)</span>
                <Sprout className="w-3.5 h-3.5 text-lime-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white font-mono mt-1">
                {civilianMaliCount}
              </div>
              <div className="text-[10px] text-lime-400/80 font-mono mt-0.5">বাগান পরিচর্যাকারী</div>
            </button>

            {/* Auto Driver */}
            <button
              type="button"
              onClick={() => setSelectedCivilianTrade((prev) => (prev === 'Driver' ? 'ALL' : 'Driver'))}
              className={`p-3.5 rounded-xl text-left transition-all cursor-pointer border ${
                selectedCivilianTrade === 'Driver'
                  ? 'bg-indigo-950/80 border-indigo-500 ring-2 ring-indigo-500/50 shadow-lg shadow-indigo-950/50'
                  : 'bg-slate-900 border-indigo-500/30 hover:border-indigo-500/60 hover:bg-slate-850'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-indigo-300">
                <span>Auto Driver</span>
                <Car className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white font-mono mt-1">
                {civilianDriverCount}
              </div>
              <div className="text-[10px] text-indigo-400/80 font-mono mt-0.5">অটো চালক</div>
            </button>
          </div>

          {/* Trade Filter Indicator */}
          {selectedCivilianTrade !== 'ALL' && (
            <div className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-slate-900/90 border border-purple-900/50 text-xs">
              <span className="text-slate-300">
                Filtered by Trade:{' '}
                <strong className="text-purple-300 font-mono font-bold">
                  {selectedCivilianTrade}
                </strong>{' '}
                ({displayedPersonnel.length} staff)
              </span>
              <button
                type="button"
                onClick={() => setSelectedCivilianTrade('ALL')}
                className="text-purple-400 hover:text-purple-300 font-semibold underline cursor-pointer"
              >
                Show All Civilians
              </button>
            </div>
          )}
        </div>
      ) : (
        /* REGT & BTY VIEW MODES: Military Hierarchy Summary Cards */
        <div
          className={`grid gap-3 ${
            viewMode === 'REGT'
              ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
              : activeBatteryTab === 'HQ Bty'
              ? 'grid-cols-2 sm:grid-cols-4'
              : 'grid-cols-3'
          }`}
        >
          {/* Officer Card */}
          <button
            type="button"
            onClick={() => {
              setSelectedCategory((prev) => (prev === 'OFFICER' ? 'ALL' : 'OFFICER'));
              setIsOthersExpanded(false);
            }}
            className={`p-4 rounded-xl text-left transition-all cursor-pointer border ${
              selectedCategory === 'OFFICER'
                ? 'bg-rose-950/60 border-rose-500 ring-2 ring-rose-500/50 shadow-lg shadow-rose-950/50'
                : 'bg-slate-900 border-rose-500/30 hover:border-rose-500/60 hover:bg-slate-850'
            }`}
          >
            <div className="text-sm sm:text-base font-bold text-rose-300">
              Offr
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono mt-1">
              {officerCount}
            </div>
          </button>

          {/* JCO Card */}
          <button
            type="button"
            onClick={() => {
              setSelectedCategory((prev) => (prev === 'JCO' ? 'ALL' : 'JCO'));
              setIsOthersExpanded(false);
            }}
            className={`p-4 rounded-xl text-left transition-all cursor-pointer border ${
              selectedCategory === 'JCO'
                ? 'bg-amber-950/60 border-amber-500 ring-2 ring-amber-500/50 shadow-lg shadow-amber-950/50'
                : 'bg-slate-900 border-amber-500/30 hover:border-amber-500/60 hover:bg-slate-850'
            }`}
          >
            <div className="text-sm sm:text-base font-bold text-amber-300">
              JCO
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono mt-1">
              {jcoCount}
            </div>
          </button>

          {/* OR Card */}
          <button
            type="button"
            onClick={() => {
              setSelectedCategory((prev) => (prev === 'OR' ? 'ALL' : 'OR'));
              setIsOthersExpanded(false);
            }}
            className={`p-4 rounded-xl text-left transition-all cursor-pointer border ${
              selectedCategory === 'OR'
                ? 'bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/50 shadow-lg shadow-blue-950/50'
                : 'bg-slate-900 border-blue-500/30 hover:border-blue-500/60 hover:bg-slate-850'
            }`}
          >
            <div className="text-sm sm:text-base font-bold text-blue-300">
              OR
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono mt-1">
              {orCount}
            </div>
          </button>

          {/* NC(E) Card (for Regt Nominal) */}
          {viewMode === 'REGT' && (
            <button
              type="button"
              onClick={() => {
                setSelectedCategory((prev) => (prev === 'NCE' ? 'ALL' : 'NCE'));
                setIsOthersExpanded(false);
              }}
              className={`p-4 rounded-xl text-left transition-all cursor-pointer border ${
                selectedCategory === 'NCE'
                  ? 'bg-orange-950/60 border-orange-500 ring-2 ring-orange-500/50 shadow-lg shadow-orange-950/50'
                  : 'bg-slate-900 border-orange-500/30 hover:border-orange-500/60 hover:bg-slate-850'
              }`}
            >
              <div className="text-sm sm:text-base font-bold text-orange-300">
                NC(E)
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono mt-1">
                {nceCount}
              </div>
            </button>
          )}

          {/* NC(U) Card (for Regt Nominal) */}
          {viewMode === 'REGT' && (
            <button
              type="button"
              onClick={() => {
                setSelectedCategory((prev) => (prev === 'NCU' ? 'ALL' : 'NCU'));
                setIsOthersExpanded(false);
              }}
              className={`p-4 rounded-xl text-left transition-all cursor-pointer border ${
                selectedCategory === 'NCU'
                  ? 'bg-teal-950/60 border-teal-500 ring-2 ring-teal-500/50 shadow-lg shadow-teal-950/50'
                  : 'bg-slate-900 border-teal-500/30 hover:border-teal-500/60 hover:bg-slate-850'
              }`}
            >
              <div className="text-sm sm:text-base font-bold text-teal-300">
                NC(U)
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono mt-1">
                {ncuCount}
              </div>
            </button>
          )}

          {/* Civilian Card (for Regt Nominal) */}
          {viewMode === 'REGT' && (
            <button
              type="button"
              onClick={() => {
                setSelectedCategory((prev) => (prev === 'CIVILIAN' ? 'ALL' : 'CIVILIAN'));
                setIsOthersExpanded(false);
              }}
              className={`p-4 rounded-xl text-left transition-all cursor-pointer border ${
                selectedCategory === 'CIVILIAN'
                  ? 'bg-purple-950/60 border-purple-500 ring-2 ring-purple-500/50 shadow-lg shadow-purple-950/50'
                  : 'bg-slate-900 border-purple-500/30 hover:border-purple-500/60 hover:bg-slate-850'
              }`}
            >
              <div className="text-sm sm:text-base font-bold text-purple-300">
                Civilian
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono mt-1">
                {civilianCount}
              </div>
            </button>
          )}

          {/* Others Card (Only for HQ Battery: NC(E), NC(U), RCO) */}
          {viewMode === 'BTY' && activeBatteryTab === 'HQ Bty' && (
            <button
              type="button"
              onClick={() => {
                const willExpand = !isOthersExpanded;
                setIsOthersExpanded(willExpand);
                setSelectedCategory(willExpand ? 'OTHERS' : 'ALL');
              }}
              className={`p-4 rounded-xl text-left transition-all cursor-pointer border ${
                selectedCategory === 'OTHERS' || selectedCategory === 'NCE' || selectedCategory === 'NCU' || selectedCategory === 'RCO'
                  ? 'bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-950/50'
                  : 'bg-slate-900 border-emerald-500/30 hover:border-emerald-500/60 hover:bg-slate-850'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm sm:text-base font-bold text-emerald-300">
                  Others
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-emerald-400 transition-transform duration-200 ${
                    isOthersExpanded ? 'rotate-180' : ''
                  }`}
                />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono mt-1">
                {othersCount}
              </div>
            </button>
          )}
        </div>
      )}

      {/* Others Sub-Categories (NC(E), NC(U), RCO) for HQ Battery - STRICTLY EXCLUDES CIVILIAN */}
      {viewMode === 'BTY' && activeBatteryTab === 'HQ Bty' && isOthersExpanded && (
        <div className="p-3.5 rounded-xl bg-slate-900 border border-emerald-500/40 flex flex-wrap items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
              Others Category:
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedCategory('NCE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                  selectedCategory === 'NCE'
                    ? 'bg-orange-600 text-white border-orange-400 shadow-md ring-1 ring-orange-300'
                    : 'bg-slate-950 text-orange-300 border-orange-500/40 hover:bg-orange-950/30'
                }`}
              >
                <span>NC(E)</span>
                <span className="bg-black/40 px-1.5 py-0.5 rounded text-[11px] font-mono">
                  {nceCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('NCU')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                  selectedCategory === 'NCU'
                    ? 'bg-teal-600 text-white border-teal-400 shadow-md ring-1 ring-teal-300'
                    : 'bg-slate-950 text-teal-300 border-teal-500/40 hover:bg-teal-950/30'
                }`}
              >
                <span>NC(U)</span>
                <span className="bg-black/40 px-1.5 py-0.5 rounded text-[11px] font-mono">
                  {ncuCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('RCO')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                  selectedCategory === 'RCO'
                    ? 'bg-cyan-600 text-white border-cyan-400 shadow-md ring-1 ring-cyan-300'
                    : 'bg-slate-950 text-cyan-300 border-cyan-500/40 hover:bg-cyan-950/30'
                }`}
              >
                <span>RCO (আরসিও)</span>
                <span className="bg-black/40 px-1.5 py-0.5 rounded text-[11px] font-mono">
                  {rcoCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('OTHERS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                  selectedCategory === 'OTHERS'
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                    : 'bg-slate-950 text-emerald-300 border-emerald-500/40 hover:bg-emerald-950/30'
                }`}
              >
                <span>All Others ({othersCount})</span>
              </button>
            </div>
          </div>
          {selectedCategory !== 'ALL' && (
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('ALL');
                setIsOthersExpanded(false);
              }}
              className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Show All
            </button>
          )}
        </div>
      )}

      {/* Active Filter Indicator if user clicked a card in REGT / BTY mode */}
      {viewMode !== 'CIVILIAN' && selectedCategory !== 'ALL' && !isOthersExpanded && (
        <div className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
          <span className="text-slate-300">
            Filtered by:{' '}
            <strong className="text-white font-mono font-bold">
              {selectedCategory === 'OFFICER'
                ? 'Officer'
                : selectedCategory === 'JCO'
                ? 'JCO'
                : selectedCategory === 'OR'
                ? 'OR (Other Ranks)'
                : selectedCategory === 'NCE'
                ? 'NC(E)'
                : selectedCategory === 'NCU'
                ? 'NC(U)'
                : selectedCategory === 'CIVILIAN'
                ? 'Civilian'
                : selectedCategory === 'RCO'
                ? 'RCO'
                : selectedCategory}
            </strong>{' '}
            ({displayedPersonnel.length} personnel)
          </span>
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className="text-rose-400 hover:text-rose-300 font-semibold underline cursor-pointer"
          >
            Show All
          </button>
        </div>
      )}

      {/* Main Personnel Table Component */}
      <PersonnelTable
        personnel={displayedPersonnel}
        fixedBattery={viewMode === 'BTY' ? activeBatteryTab : undefined}
        onViewDossier={onViewDossier}
        onOpenAddModal={onOpenAddModal}
        allowStatusEdits={currentUser.role !== 'CO'}
        title={
          viewMode === 'REGT'
            ? selectedCategory !== 'ALL'
              ? `Regt Nominal (${selectedCategory})`
              : 'Regt Nominal'
            : viewMode === 'CIVILIAN'
            ? selectedCivilianTrade !== 'ALL'
              ? `Civilian Staff (${selectedCivilianTrade})`
              : 'Civilian Staff'
            : selectedCategory !== 'ALL'
            ? `${activeBatteryTab} Nominal (${selectedCategory})`
            : `${activeBatteryTab} Nominal`
        }
      />
    </div>
  );
};
