import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  OutOfUnitCategory,
  OUT_OF_UNIT_CATEGORIES,
  Battery,
  ALL_BATTERIES,
  Personnel,
} from '../../types';
import { sortBySeniority } from '../../utils/seniorityUtils';
import {
  X,
  Plus,
  ArrowRightLeft,
  Search,
  CheckCircle2,
  Calendar,
  Building2,
  MapPin,
  FileText,
  Trash2,
  RotateCcw,
  Plane,
  Cross,
  BookOpen,
  Award,
  Shield,
  Clock,
  User,
} from 'lucide-react';

interface OutOfUnitManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: OutOfUnitCategory;
  defaultBattery?: Battery;
  onViewDossier?: (p: Personnel) => void;
}

export const OutOfUnitManagerModal: React.FC<OutOfUnitManagerModalProps> = ({
  isOpen,
  onClose,
  defaultCategory,
  defaultBattery,
  onViewDossier,
}) => {
  const {
    personnelList,
    currentUser,
    assignOutOfUnit,
    cancelOutOfUnit,
    activeOutOfUnitCategory,
    setActiveOutOfUnitCategory,
    ranksList,
  } = useApp();

  const [currentCategory, setCurrentCategory] = useState<OutOfUnitCategory>(
    defaultCategory || activeOutOfUnitCategory || 'Comd'
  );
  const [selectedBattery, setSelectedBattery] = useState<Battery | 'All'>(
    defaultBattery || (currentUser.assignedBattery as Battery) || 'All'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingSoldier, setIsAddingSoldier] = useState(false);

  // Synchronize category immediately when defaultCategory or activeOutOfUnitCategory changes
  const [prevDefaultCategory, setPrevDefaultCategory] = useState(defaultCategory);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      const targetCat = defaultCategory || activeOutOfUnitCategory || 'Comd';
      setCurrentCategory(targetCat);
      setIsAddingSoldier(false);
      setSearchQuery('');
    }
  } else if (defaultCategory && defaultCategory !== prevDefaultCategory) {
    setPrevDefaultCategory(defaultCategory);
    setCurrentCategory(defaultCategory);
  }

  useEffect(() => {
    if (defaultCategory) {
      setCurrentCategory(defaultCategory);
    } else if (activeOutOfUnitCategory) {
      setCurrentCategory(activeOutOfUnitCategory);
    }
  }, [defaultCategory, activeOutOfUnitCategory, isOpen]);

  // Form State for Adding Soldier to Category
  const [selectedPersonnelId, setSelectedPersonnelId] = useState('');
  const [locationOrName, setLocationOrName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [authority, setAuthority] = useState('');
  const [remarks, setRemarks] = useState('');
  const [soldierSearchQuery, setSoldierSearchQuery] = useState('');

  // Synchronize category
  const handleCategoryChange = (cat: OutOfUnitCategory) => {
    setCurrentCategory(cat);
    setActiveOutOfUnitCategory(cat);
    setIsAddingSoldier(false);
  };

  // Filtered soldiers currently in this Out Of Unit Category
  const outOfUnitSoldiers = useMemo(() => {
    const raw = (personnelList || []).filter((p) => {
      if (!p) return false;
      // Check if matches category
      const details = (p.statusDetails || '').toLowerCase();
      const loc = (p.outOfUnitLocation || '').toLowerCase();
      const rem = (p.outOfUnitRemarks || '').toLowerCase();

      const isFdmn =
        p.outOfUnitCategory === 'FDMN' ||
        details.includes('fdmn') ||
        loc.includes('camp') ||
        details.includes('camp') ||
        loc.includes('হোয়াইকং');

      const isComd =
        !isFdmn &&
        (p.outOfUnitCategory === 'Comd' ||
          Boolean(p.comdAssignment) ||
          details.includes('comd') ||
          (p.status === 'Temp Duty' && !p.outOfUnitCategory));

      const matchesCategory =
        currentCategory === 'FDMN'
          ? isFdmn
          : currentCategory === 'Comd'
          ? isComd
          : p.outOfUnitCategory === currentCategory ||
            (currentCategory === 'CMH' && p.status === 'CMH/Sick') ||
            (currentCategory === 'Course' && p.status === 'Course/Trg') ||
            (currentCategory === 'P/Lve' && p.leaveType === 'P/Lve') ||
            (currentCategory === 'C/Lve' && p.leaveType === 'C/Lve') ||
            (currentCategory === 'Att' && p.status === 'Attached Out') ||
            (currentCategory === 'ERE' && details.includes('ere')) ||
            (currentCategory === 'Msn' && (details.includes('mission') || details.includes('un')));

      if (!matchesCategory) return false;

      // Check Battery
      if (selectedBattery !== 'All' && p.battery !== selectedBattery) {
        return false;
      }

      // Check Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (p.snkNo || '').toLowerCase().includes(q) ||
          (p.name || '').toLowerCase().includes(q) ||
          (p.rk || '').toLowerCase().includes(q) ||
          (p.trade || '').toLowerCase().includes(q) ||
          (p.outOfUnitLocation && p.outOfUnitLocation.toLowerCase().includes(q)) ||
          (p.statusDetails && p.statusDetails.toLowerCase().includes(q))
        );
      }

      return true;
    });
    return sortBySeniority(raw, ranksList);
  }, [personnelList, currentCategory, selectedBattery, searchQuery, ranksList]);

  // Check if current user is a BSM
  const isBsm = ['P BSM', 'Q BSM', 'R BSM', 'HQ BSM'].includes(currentUser.role);
  const bsmBattery = currentUser.assignedBattery;

  // Available soldiers for selection in Add Modal
  // If BSM: defaults to only suggesting their own battery troops; if search matches another bty, warns user
  const availableSoldiers = useMemo(() => {
    const raw = (personnelList || []).filter((p) => {
      if (!p) return false;
      // If BSM and no search query, only suggest their own battery
      if (isBsm && bsmBattery && !soldierSearchQuery.trim() && p.battery !== bsmBattery) {
        return false;
      }
      if (selectedBattery !== 'All' && p.battery !== selectedBattery) return false;
      if (soldierSearchQuery.trim()) {
        const q = soldierSearchQuery.toLowerCase();
        return (
          (p.snkNo || '').toLowerCase().includes(q) ||
          (p.name || '').toLowerCase().includes(q) ||
          (p.rk || '').toLowerCase().includes(q) ||
          (p.trade || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
    return sortBySeniority(raw, ranksList);
  }, [personnelList, selectedBattery, soldierSearchQuery, isBsm, bsmBattery, ranksList]);

  // Selected soldier details for preview
  const selectedSoldier = useMemo(() => {
    return (personnelList || []).find((p) => p && p.id === selectedPersonnelId);
  }, [personnelList, selectedPersonnelId]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<OutOfUnitCategory, number> = {
      ERE: 0,
      Msn: 0,
      Att: 0,
      FDMN: 0,
      CMH: 0,
      Course: 0,
      Comd: 0,
      'P/Lve': 0,
      'C/Lve': 0,
    };

    (personnelList || []).forEach((p) => {
      if (!p) return;
      if (selectedBattery !== 'All' && p.battery !== selectedBattery) return;

      const details = (p.statusDetails || '').toLowerCase();
      const loc = (p.outOfUnitLocation || '').toLowerCase();

      const isFdmn =
        p.outOfUnitCategory === 'FDMN' ||
        details.includes('fdmn') ||
        loc.includes('camp') ||
        details.includes('camp') ||
        loc.includes('হোয়াইকং');

      if (isFdmn) {
        counts['FDMN'] += 1;
      } else if (
        p.outOfUnitCategory === 'Comd' ||
        Boolean(p.comdAssignment) ||
        details.includes('comd') ||
        (p.status === 'Temp Duty' && !p.outOfUnitCategory)
      ) {
        counts['Comd'] += 1;
      } else if (p.outOfUnitCategory) {
        counts[p.outOfUnitCategory] = (counts[p.outOfUnitCategory] || 0) + 1;
      } else if (p.status === 'CMH/Sick') {
        counts['CMH'] += 1;
      } else if (p.status === 'Course/Trg') {
        counts['Course'] += 1;
      } else if (p.leaveType === 'P/Lve') {
        counts['P/Lve'] += 1;
      } else if (p.leaveType === 'C/Lve') {
        counts['C/Lve'] += 1;
      } else if (p.status === 'Attached Out') {
        counts['Att'] += 1;
      } else if (details.includes('ere')) {
        counts['ERE'] += 1;
      } else if (details.includes('mission') || details.includes('un')) {
        counts['Msn'] += 1;
      }
    });

    return counts;
  }, [personnelList, selectedBattery]);

  if (!isOpen) return null;

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonnelId) {
      alert('Please select a soldier to assign to ' + currentCategory);
      return;
    }

    const targetPerson = personnelList.find((p) => p.id === selectedPersonnelId);
    if (isBsm && bsmBattery && targetPerson && targetPerson.battery !== bsmBattery) {
      alert(`⚠️ এই সদস্য ${targetPerson.battery}-এর। আপনি ${currentUser.role} হিসেবে শুধুমাত্র ${bsmBattery}-এর তথ্য এন্ট্রি/পরিবর্তন করতে পারবেন।`);
      return;
    }

    assignOutOfUnit(selectedPersonnelId, currentCategory, {
      location: locationOrName.trim() || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      authority: authority.trim() || undefined,
      remarks: remarks.trim() || undefined,
    });

    // Reset Form
    setSelectedPersonnelId('');
    setLocationOrName('');
    setAuthority('');
    setRemarks('');
    setEndDate('');
    setIsAddingSoldier(false);
  };

  const getCategoryTheme = (cat: OutOfUnitCategory) => {
    switch (cat) {
      case 'ERE':
        return { color: 'border-cyan-500 bg-cyan-500/10 text-cyan-400', active: 'bg-cyan-600 text-white' };
      case 'Msn':
        return { color: 'border-blue-500 bg-blue-500/10 text-blue-400', active: 'bg-blue-600 text-white' };
      case 'Att':
        return { color: 'border-indigo-500 bg-indigo-500/10 text-indigo-400', active: 'bg-indigo-600 text-white' };
      case 'FDMN':
        return { color: 'border-emerald-500 bg-emerald-500/10 text-emerald-400', active: 'bg-emerald-600 text-white' };
      case 'CMH':
        return { color: 'border-red-500 bg-red-500/10 text-red-400', active: 'bg-red-600 text-white' };
      case 'Course':
        return { color: 'border-purple-500 bg-purple-500/10 text-purple-400', active: 'bg-purple-600 text-white' };
      case 'Comd':
        return { color: 'border-amber-500 bg-amber-500/10 text-amber-400', active: 'bg-amber-600 text-white' };
      case 'P/Lve':
        return { color: 'border-teal-500 bg-teal-500/10 text-teal-400', active: 'bg-teal-600 text-white' };
      case 'C/Lve':
        return { color: 'border-lime-500 bg-lime-500/10 text-lime-400', active: 'bg-lime-600 text-white' };
    }
  };

  const activeCategoryMeta = OUT_OF_UNIT_CATEGORIES.find((c) => c.id === currentCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-wide">
                  Updt Out Of Unit
                </h3>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1-Click Navigation Tab Bar */}
        <div className="px-6 pt-3 pb-2 bg-slate-950/80 border-b border-slate-800/80">
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <div className="flex items-center gap-1.5 min-w-max">
              {OUT_OF_UNIT_CATEGORIES.map((cat) => {
                const isActive = currentCategory === cat.id;
                const count = categoryCounts[cat.id] || 0;
                const theme = getCategoryTheme(cat.id);

                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      isActive
                        ? `${theme.active} shadow-lg ring-2 ring-white/20`
                        : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                        isActive
                          ? 'bg-black/30 text-white'
                          : count > 0
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Battery Filter Dropdown */}
            <div className="flex items-center gap-2 min-w-max ml-3 pl-3 border-l border-slate-800">
              <span className="text-[11px] text-slate-400 font-semibold">Battery:</span>
              <select
                value={selectedBattery}
                onChange={(e) => setSelectedBattery(e.target.value as any)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-rose-500"
              >
                <option value="All">All Btys</option>
                {ALL_BATTERIES.map((bty) => (
                  <option key={bty} value={bty}>
                    {bty}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Active Category Banner & Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white">
                  [{activeCategoryMeta?.label}] {activeCategoryMeta?.badge}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300">
                  Total Active: {outOfUnitSoldiers.length}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search soldier in this tab..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <button
                onClick={() => setIsAddingSoldier(!isAddingSoldier)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                  isAddingSoldier
                    ? 'bg-slate-700 text-slate-200'
                    : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 text-white'
                }`}
              >
                {isAddingSoldier ? (
                  <>
                    <X className="w-3.5 h-3.5" />
                    <span>Cancel Add</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Soldier to {currentCategory}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Add Soldier Form Drawer */}
          {isAddingSoldier && (
            <form
              onSubmit={handleAddSubmit}
              className="p-5 rounded-xl bg-slate-950 border border-rose-500/30 space-y-4 animate-fadeIn"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span>Assign Soldier to [{currentCategory}] Out-of-Unit Roster</span>
                </h4>
                <span className="text-[11px] text-slate-400 font-mono">
                  Auto syncs with Parade State
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Search & Select Soldier */}
                <div className="sm:col-span-1">
                  <label className="block text-slate-300 font-semibold mb-1">
                    Select Soldier *
                  </label>
                  <input
                    type="text"
                    value={soldierSearchQuery}
                    onChange={(e) => setSoldierSearchQuery(e.target.value)}
                    placeholder="Type name / Snk No to filter..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-rose-500 mb-1"
                  />
                  <select
                    required
                    value={selectedPersonnelId}
                    onChange={(e) => setSelectedPersonnelId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono focus:outline-none focus:border-rose-500"
                    size={4}
                  >
                    <option value="" disabled>
                      -- Choose Soldier ({availableSoldiers.length} available) --
                    </option>
                    {availableSoldiers.map((p) => {
                      const isOtherBty = isBsm && bsmBattery && p.battery !== bsmBattery;
                      return (
                        <option key={p.id} value={p.id}>
                          {p.snkNo} {p.rk} {p.name} ({p.battery} - {p.trade}) {isOtherBty ? '⚠️ [অন্য ব্যাটারি]' : ''}
                        </option>
                      );
                    })}
                  </select>
                  {selectedSoldier && isBsm && bsmBattery && selectedSoldier.battery !== bsmBattery && (
                    <div className="mt-1.5 p-2 rounded-lg bg-rose-950/80 border border-rose-500 text-rose-200 text-[11px] leading-tight">
                      ⚠️ সতর্কতা: ইনি <strong className="text-white">{selectedSoldier.battery}</strong>-এর সদস্য! আপনি {currentUser.role} হিসেবে শুধুমাত্র {bsmBattery}-এর সদস্য এন্ট্রি করতে পারবেন।
                    </div>
                  )}
                </div>

                {/* Destination / Details */}
                <div className="sm:col-span-2 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        {currentCategory === 'CMH'
                          ? 'Hospital / Ward / Illness'
                          : currentCategory === 'Course'
                          ? 'Course / Cadre Name & Location'
                          : currentCategory === 'Msn'
                          ? 'Mission Deployment Country / Force'
                          : currentCategory === 'P/Lve' || currentCategory === 'C/Lve'
                          ? 'Leave Destination / Address'
                          : currentCategory === 'ERE'
                          ? 'ERE Organization (e.g. DGFI, BGB, AHQ)'
                          : 'Deployment / Duty Station / Location'} *
                      </label>
                      <input
                        type="text"
                        required
                        value={locationOrName}
                        onChange={(e) => setLocationOrName(e.target.value)}
                        placeholder="e.g. UNMISS South Sudan / AC&S Halishahar / CMH Savar"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Authority / Cadre / Order No
                      </label>
                      <input
                        type="text"
                        value={authority}
                        onChange={(e) => setAuthority(e.target.value)}
                        placeholder="e.g. AHQ Ltr 104/24 / Trg Directive 02"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Departure / Start Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Expected Return / End Date
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Remarks / Notes
                    </label>
                    <input
                      type="text"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Additional details / contact info / medical note"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              </div>

              {selectedSoldier && (
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Selected:</span>
                    <span className="font-bold text-white font-mono">{selectedSoldier.snkNo}</span>
                    <span className="font-semibold text-rose-300">{selectedSoldier.rk} {selectedSoldier.name}</span>
                    <span className="text-slate-400">({selectedSoldier.battery})</span>
                    <span className="text-slate-400">Trade: {selectedSoldier.trade}</span>
                  </div>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Current: {selectedSoldier.status}
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddingSoldier(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-rose-900/40 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Assignment to {currentCategory}</span>
                </button>
              </div>
            </form>
          )}

          {/* Soldiers Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3 w-12 text-center">Sl</th>
                  <th className="py-3 px-3">Army No / BA</th>
                  <th className="py-3 px-3">Rank & Name</th>
                  <th className="py-3 px-3">Bty</th>
                  <th className="py-3 px-3">Trade</th>
                  <th className="py-3 px-3">Destination / Details</th>
                  <th className="py-3 px-3">Dates (From - To)</th>
                  <th className="py-3 px-3">Authority / Remarks</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {outOfUnitSoldiers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <ArrowRightLeft className="w-8 h-8 text-slate-600 stroke-[1.5]" />
                        <p className="text-sm font-medium text-slate-400">
                          No personnel currently assigned to [{currentCategory}] in {selectedBattery === 'All' ? 'the regiment' : selectedBattery}.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  outOfUnitSoldiers.map((person, idx) => {
                    const locationText =
                      person.outOfUnitLocation ||
                      person.courseName ||
                      person.hospitalName ||
                      person.leaveAddress ||
                      person.comdAssignment ||
                      person.statusDetails ||
                      '-';

                    const dateText =
                      person.outOfUnitStartDate
                        ? `${person.outOfUnitStartDate} ${person.outOfUnitEndDate ? '→ ' + person.outOfUnitEndDate : ''}`
                        : person.leaveFrom
                        ? `${person.leaveFrom} → ${person.leaveTo || 'Presently Out'}`
                        : person.courseFrom
                        ? `${person.courseFrom} → ${person.courseTo || 'Ongoing'}`
                        : person.admissionDate
                        ? `Admitted: ${person.admissionDate}`
                        : 'Active Out-of-Unit';

                    return (
                      <tr
                        key={person.id}
                        className="hover:bg-slate-900/60 transition-colors group"
                      >
                        <td className="py-3 px-3 text-center text-slate-500 font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-white">
                          {person.snkNo}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-200">
                            <span className="text-rose-400 font-mono mr-1.5">{person.rk}</span>
                            <span>{person.name}</span>
                          </div>
                          {person.batch && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              Batch: {person.batch}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                            {person.battery}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-300">
                          {person.trade}
                        </td>
                        <td className="py-3 px-3 text-slate-200 max-w-xs truncate">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="truncate">{locationText}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                          {dateText}
                        </td>
                        <td className="py-3 px-3 text-slate-400 max-w-xs truncate text-[11px]">
                          {person.outOfUnitAuthority || person.outOfUnitRemarks || person.diagnosis || person.comdAuthority || '-'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {onViewDossier && (
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onViewDossier(person);
                                }}
                                title="View Soldier Dossier"
                                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-semibold transition-all inline-flex items-center gap-1 cursor-pointer"
                              >
                                <User className="w-3 h-3 text-rose-400" />
                                <span>Dossier</span>
                              </button>
                            )}
                            <button
                              onClick={() => cancelOutOfUnit(person.id)}
                              title="Cancel Out-of-Unit & Return Soldier to Unit Parade"
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 border border-slate-700 text-[11px] font-semibold transition-all inline-flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Return to Unit</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-end text-xs text-slate-400">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors cursor-pointer"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};
