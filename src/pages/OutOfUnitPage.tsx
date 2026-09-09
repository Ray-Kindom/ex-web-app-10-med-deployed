import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  OutOfUnitCategory,
  OUT_OF_UNIT_CATEGORIES,
  Battery,
  ALL_BATTERIES,
  Personnel,
} from '../types';
import { sortBySeniority } from '../utils/seniorityUtils';
import {
  ArrowRightLeft,
  Plus,
  Search,
  MapPin,
  RotateCcw,
  User,
  X,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Printer,
  Edit2,
  Lock,
  Save,
  Check,
} from 'lucide-react';

interface OutOfUnitPageProps {
  onViewDossier?: (p: Personnel) => void;
  onOpenPrintModal?: () => void;
}

export const OutOfUnitPage: React.FC<OutOfUnitPageProps> = ({ onViewDossier, onOpenPrintModal }) => {
  const {
    personnelList,
    currentUser,
    assignOutOfUnit,
    cancelOutOfUnit,
    activeOutOfUnitCategory,
    setActiveOutOfUnitCategory,
    ranksList,
    isGuest,
  } = useApp();

  const isBsm = ['P BSM', 'Q BSM', 'R BSM', 'HQ BSM', 'BSM'].includes(currentUser.role);
  const assignedBty = currentUser.assignedBattery;

  const [currentCategory, setCurrentCategory] = useState<OutOfUnitCategory | 'ALL'>(
    activeOutOfUnitCategory || 'ALL'
  );
  const [selectedBattery, setSelectedBattery] = useState<Battery | 'All'>(
    isBsm && assignedBty ? (assignedBty as Battery) : 'All'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingSoldier, setIsAddingSoldier] = useState(false);

  // Inline editing state: row edits directly in the table with no popup window
  const [inlineEditingPersonId, setInlineEditingPersonId] = useState<string | null>(null);
  const [inlineCategory, setInlineCategory] = useState<OutOfUnitCategory>('Comd');
  const [inlineLocation, setInlineLocation] = useState('');
  const [inlineStartDate, setInlineStartDate] = useState('');
  const [inlineEndDate, setInlineEndDate] = useState('');
  const [inlineDurationDays, setInlineDurationDays] = useState<number | ''>('');
  const [inlineAuthority, setInlineAuthority] = useState('');
  const [inlineRemarks, setInlineRemarks] = useState('');

  const startInlineEdit = (person: Personnel) => {
    setInlineEditingPersonId(person.id);
    const cat = (person.outOfUnitCategory ||
      (person.status === 'CMH/Sick'
        ? 'CMH'
        : person.status === 'Course/Trg'
        ? 'Course'
        : person.leaveType === 'P/Lve'
        ? 'P/Lve'
        : person.leaveType === 'C/Lve'
        ? 'C/Lve'
        : 'Comd')) as OutOfUnitCategory;
    setInlineCategory(cat);
    setInlineLocation(
      person.outOfUnitLocation ||
        person.location ||
        person.leaveAddress ||
        person.courseName ||
        person.hospitalName ||
        person.comdAssignment ||
        ''
    );
    const start =
      person.outOfUnitStartDate ||
      person.startDate ||
      person.leaveFrom ||
      person.courseFrom ||
      person.admissionDate ||
      person.comdFrom ||
      new Date().toISOString().split('T')[0];
    setInlineStartDate(start);
    const end =
      person.outOfUnitEndDate ||
      person.endDate ||
      person.leaveTo ||
      person.courseTo ||
      person.comdTo ||
      '';
    setInlineEndDate(end);
    setInlineAuthority(
      person.outOfUnitAuthority ||
        person.authority ||
        person.comdAuthority ||
        ''
    );
    setInlineRemarks(
      person.outOfUnitRemarks ||
        person.remarks ||
        person.rmk ||
        person.diagnosis ||
        ''
    );

    if (person.durationDays) {
      setInlineDurationDays(person.durationDays);
    } else if (start && end) {
      const d1 = new Date(start).getTime();
      const d2 = new Date(end).getTime();
      if (!isNaN(d1) && !isNaN(d2) && d2 >= d1) {
        setInlineDurationDays(Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1));
      } else {
        setInlineDurationDays('');
      }
    } else {
      setInlineDurationDays('');
    }
  };

  const cancelInlineEdit = () => {
    setInlineEditingPersonId(null);
  };

  const saveInlineEdit = (person: Personnel) => {
    if (isGuest) {
      alert('গেস্ট মোডে তথ্য পরিবর্তন করা যাবে না (View-Only)।');
      return;
    }

    const isLeave = inlineCategory === 'P/Lve' || inlineCategory === 'C/Lve';
    if (isLeave) {
      if (!inlineStartDate) {
        alert('ছুটির ক্ষেত্রে শুরুর তারিখ (Start Date) বাধ্যতামূলক।');
        return;
      }
      if (!inlineEndDate) {
        alert('ছুটির ক্ষেত্রে যোগদানের তারিখ (Joining Date) বাধ্যতামূলক।');
        return;
      }
    } else {
      if (!inlineStartDate) {
        alert('শুরুর তারিখ (Start Date) প্রদান করুন।');
        return;
      }
    }

    assignOutOfUnit(person.id, inlineCategory, {
      location: inlineLocation.trim() || undefined,
      startDate: inlineStartDate || undefined,
      endDate: inlineEndDate || undefined,
      authority: inlineAuthority.trim() || undefined,
      remarks: inlineRemarks.trim() || undefined,
    });

    setInlineEditingPersonId(null);
  };

  // Form State for Adding Soldier
  const [selectedPersonnelId, setSelectedPersonnelId] = useState('');
  const [targetCategory, setTargetCategory] = useState<OutOfUnitCategory>('Comd');
  const [locationOrName, setLocationOrName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [authority, setAuthority] = useState('');
  const [remarks, setRemarks] = useState('');
  const [soldierSearchQuery, setSoldierSearchQuery] = useState('');
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSuggestionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  const totalOutOfUnitCount = useMemo(() => {
    return Object.values(categoryCounts).reduce((a: number, b: number) => a + b, 0);
  }, [categoryCounts]);

  // Filtered soldiers currently Out Of Unit
  const outOfUnitSoldiers = useMemo(() => {
    const raw = (personnelList || []).filter((p) => {
      if (!p) return false;
      const details = (p.statusDetails || '').toLowerCase();
      const loc = (p.outOfUnitLocation || '').toLowerCase();

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

      let matchesCategory = false;
      if (currentCategory === 'ALL') {
        matchesCategory =
          Boolean(p.outOfUnitCategory) ||
          p.status === 'CMH/Sick' ||
          p.status === 'Course/Trg' ||
          p.status === 'Attached Out' ||
          p.status === 'Temp Duty' ||
          p.leaveType === 'P/Lve' ||
          p.leaveType === 'C/Lve' ||
          isFdmn ||
          isComd;
      } else if (currentCategory === 'FDMN') {
        matchesCategory = isFdmn;
      } else if (currentCategory === 'Comd') {
        matchesCategory = isComd;
      } else {
        matchesCategory =
          p.outOfUnitCategory === currentCategory ||
          (currentCategory === 'CMH' && p.status === 'CMH/Sick') ||
          (currentCategory === 'Course' && p.status === 'Course/Trg') ||
          (currentCategory === 'P/Lve' && p.leaveType === 'P/Lve') ||
          (currentCategory === 'C/Lve' && p.leaveType === 'C/Lve') ||
          (currentCategory === 'Att' && p.status === 'Attached Out') ||
          (currentCategory === 'ERE' && details.includes('ere')) ||
          (currentCategory === 'Msn' && (details.includes('mission') || details.includes('un')));
      }

      if (!matchesCategory) return false;

      // Battery filter
      if (selectedBattery !== 'All' && p.battery !== selectedBattery) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (p.snkNo || '').toLowerCase().includes(q) ||
          (p.name || '').toLowerCase().includes(q) ||
          (p.rk || '').toLowerCase().includes(q) ||
          (p.trade || '').toLowerCase().includes(q) ||
          (p.outOfUnitLocation && p.outOfUnitLocation.toLowerCase().includes(q)) ||
          (p.statusDetails && p.statusDetails.toLowerCase().includes(q)) ||
          (p.outOfUnitAuthority && p.outOfUnitAuthority.toLowerCase().includes(q))
        );
      }

      return true;
    });

    return sortBySeniority(raw, ranksList);
  }, [personnelList, currentCategory, selectedBattery, searchQuery, ranksList]);

  // Base pool of soldiers for selection
  const baseSoldiers = useMemo(() => {
    const raw = (personnelList || []).filter((p) => {
      if (!p) return false;
      if (isBsm && assignedBty && p.battery !== assignedBty) {
        return false;
      }
      if (selectedBattery !== 'All' && p.battery !== selectedBattery) return false;
      return true;
    });
    return sortBySeniority(raw, ranksList);
  }, [personnelList, selectedBattery, isBsm, assignedBty, ranksList]);

  // Dynamic suggestions based on search text
  const suggestedSoldiers = useMemo(() => {
    const q = soldierSearchQuery.toLowerCase().trim();
    if (!q) {
      return baseSoldiers.slice(0, 20);
    }
    return baseSoldiers.filter((p) => {
      return (
        (p.snkNo || '').toLowerCase().includes(q) ||
        (p.name || '').toLowerCase().includes(q) ||
        (p.rk || '').toLowerCase().includes(q) ||
        (p.trade || '').toLowerCase().includes(q)
      );
    }).slice(0, 25);
  }, [baseSoldiers, soldierSearchQuery]);

  const selectedSoldier = useMemo(() => {
    return (personnelList || []).find((p) => p && p.id === selectedPersonnelId);
  }, [personnelList, selectedPersonnelId]);

  const handleSelectSoldier = (soldier: Personnel) => {
    setSelectedPersonnelId(soldier.id);
    setSoldierSearchQuery(`${soldier.snkNo} • ${soldier.rk} ${soldier.name}`);
    setIsSuggestionsOpen(false);
  };

  const handleClearSelectedSoldier = () => {
    setSelectedPersonnelId('');
    setSoldierSearchQuery('');
    setIsSuggestionsOpen(false);
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSoldierSearchQuery(val);
    setIsSuggestionsOpen(true);
    if (selectedPersonnelId) {
      setSelectedPersonnelId('');
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonnelId) {
      alert('Please select a soldier to assign.');
      return;
    }

    const targetPerson = personnelList.find((p) => p.id === selectedPersonnelId);
    if (isBsm && assignedBty && targetPerson && targetPerson.battery !== assignedBty) {
      alert(`⚠️ এই সদস্য ${targetPerson.battery}-এর। আপনি ${currentUser.role} হিসেবে শুধুমাত্র ${assignedBty}-এর তথ্য পরিবর্তন করতে পারবেন।`);
      return;
    }

    const isLeave = targetCategory === 'P/Lve' || targetCategory === 'C/Lve';
    if (isLeave) {
      if (!startDate || !endDate) {
        alert('ছুটির ক্ষেত্রে শুরুর তারিখ (Start Date) এবং যোগদানের তারিখ (Joining Date) বাধ্যতামূলক।');
        return;
      }
    } else {
      if (!locationOrName.trim()) {
        alert('Please enter location/destination.');
        return;
      }
      if (!startDate) {
        alert('Please select start date.');
        return;
      }
    }

    assignOutOfUnit(selectedPersonnelId, targetCategory, {
      location: locationOrName.trim() || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      authority: authority.trim() || undefined,
      remarks: remarks.trim() || undefined,
    });

    setSelectedPersonnelId('');
    setSoldierSearchQuery('');
    setLocationOrName('');
    setAuthority('');
    setRemarks('');
    setEndDate('');
    setIsSuggestionsOpen(false);
    setIsAddingSoldier(false);
  };

  const getCategoryColor = (cat: OutOfUnitCategory) => {
    switch (cat) {
      case 'ERE':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'Msn':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'Att':
        return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30';
      case 'FDMN':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'CMH':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'Course':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      case 'Comd':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'P/Lve':
        return 'text-teal-400 bg-teal-500/10 border-teal-500/30';
      case 'C/Lve':
        return 'text-lime-400 bg-lime-500/10 border-lime-500/30';
    }
  };

  return (
    <div className="space-y-4 max-w-[1700px] mx-auto pb-10">
      {/* 1. TOP CONTROL BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Out Of Unit Personnel Management
              </h1>
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {totalOutOfUnitCount} Total Out
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              ছুটি, সিএমএইচ, কোর্স, জাতিসংঘ মিশন, অ্যাটাচড এবং কমান্ড ডিউটি রেজিস্টার
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Battery Scope */}
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            {!isBsm && (
              <button
                type="button"
                id="out-bty-filter-all"
                onClick={() => setSelectedBattery('All')}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                  selectedBattery === 'All'
                    ? 'bg-rose-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                All Btys
              </button>
            )}
            {(isBsm && assignedBty ? [assignedBty as Battery] : ALL_BATTERIES).map((bty) => (
              <button
                key={bty}
                type="button"
                id={`out-bty-filter-${bty.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => setSelectedBattery(bty)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                  selectedBattery === bty
                    ? 'bg-rose-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {bty.replace(' Bty', '')}
              </button>
            ))}
          </div>

          {/* Print Off Parade A4 Button */}
          {onOpenPrintModal && (
            <button
              type="button"
              id="btn-print-off-parade-a4"
              onClick={onOpenPrintModal}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm border border-slate-700 cursor-pointer"
              title="Print 1-Page A4 Off Parade Nominal Roll"
            >
              <Printer className="w-4 h-4 text-rose-400" />
              <span className="hidden sm:inline">Print Off Parade (A4)</span>
              <span className="sm:hidden">Print (A4)</span>
            </button>
          )}

          {/* Assign Personnel Button */}
          <button
            type="button"
            id="btn-assign-out-of-unit"
            onClick={() => {
              setTargetCategory(currentCategory === 'ALL' ? 'Comd' : currentCategory);
              setIsAddingSoldier(true);
            }}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Assign Personnel</span>
          </button>
        </div>
      </div>

      {/* 2. CATEGORY SELECTOR CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
        {/* ALL TAB */}
        <button
          type="button"
          onClick={() => {
            setCurrentCategory('ALL');
            setActiveOutOfUnitCategory(null);
          }}
          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
            currentCategory === 'ALL'
              ? 'bg-rose-600/20 border-rose-500 text-white shadow-md shadow-rose-950/30'
              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="text-[11px] font-mono font-bold block truncate">All Categories</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-bold font-mono text-white">{totalOutOfUnitCount}</span>
            <span className="text-[10px] font-mono text-slate-500">Total</span>
          </div>
        </button>

        {OUT_OF_UNIT_CATEGORIES.map((cat) => {
          const isSelected = currentCategory === cat.id;
          const count = categoryCounts[cat.id] || 0;
          return (
            <button
              key={cat.id}
              type="button"
              id={`cat-card-${cat.id.toLowerCase().replace('/', '-')}`}
              onClick={() => {
                setCurrentCategory(cat.id);
                setActiveOutOfUnitCategory(cat.id);
              }}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-800 border-rose-500 text-white shadow-md shadow-rose-950/30 ring-1 ring-rose-500/50'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-mono font-bold truncate">{cat.label}</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className={`text-lg font-bold font-mono ${count > 0 ? 'text-white' : 'text-slate-500'}`}>
                  {count}
                </span>
                <span className="text-[10px] font-mono text-slate-500">{cat.id}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. ASSIGN SOLDIER PANEL (COLLAPSIBLE / MODAL FORM) */}
      {isAddingSoldier && (
        <div className="bg-slate-900 border border-slate-750 rounded-xl p-4 shadow-xl animate-fadeIn space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-rose-400" />
              <h2 className="text-sm font-bold text-white">
                Assign Soldier to Out-of-Unit ({targetCategory})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingSoldier(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Category Selection */}
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  Category *
                </label>
                <select
                  value={targetCategory}
                  onChange={(e) => setTargetCategory(e.target.value as OutOfUnitCategory)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-rose-500"
                >
                  {OUT_OF_UNIT_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label} ({c.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Soldier Search & Autocomplete suggestions */}
              <div className="sm:col-span-2 relative" ref={searchContainerRef}>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-mono text-slate-300">
                    Search Soldier (আর্মি নং বা নাম লিখুন) *
                  </label>
                  {selectedSoldier && (
                    <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      সৈন্য নির্বাচিত হয়েছে
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                  <input
                    id="input-soldier-search"
                    type="text"
                    required
                    placeholder="Type Army No or Name (e.g. 1452 or Rahim)..."
                    value={soldierSearchQuery}
                    onFocus={() => setIsSuggestionsOpen(true)}
                    onChange={handleSearchInputChange}
                    autoComplete="off"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono"
                  />
                  {soldierSearchQuery && (
                    <button
                      type="button"
                      id="btn-clear-soldier-search"
                      onClick={handleClearSelectedSoldier}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                      title="Clear selection"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Inline Suggestions Dropdown */}
                {isSuggestionsOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-slate-950 border border-slate-750 rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-slate-800/80 backdrop-blur-md ring-1 ring-black/60">
                    <div className="px-3 py-1.5 bg-slate-900/95 text-[10px] font-mono text-slate-400 flex items-center justify-between border-b border-slate-800 sticky top-0 z-10">
                      <span>সাজেশন তালিকা থেকে সৈন্য নির্বাচন করুন</span>
                      <span>{suggestedSoldiers.length} জন ম্যাচ করেছে</span>
                    </div>
                    {suggestedSoldiers.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500 font-mono">
                        কোনো সৈন্যের নাম বা নম্বর মেলেনি (No match found)
                      </div>
                    ) : (
                      suggestedSoldiers.map((s) => {
                        const isSelected = s.id === selectedPersonnelId;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            id={`suggest-soldier-${s.id}`}
                            onClick={() => handleSelectSoldier(s)}
                            className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-rose-600/20 border-l-2 border-rose-500'
                                : 'hover:bg-slate-900'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono font-bold text-cyan-400 text-xs shrink-0">
                                {s.snkNo}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono font-bold text-rose-300 shrink-0">
                                {s.rk}
                              </span>
                              <span className="font-bold text-white text-xs truncate">
                                {s.name}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 hidden sm:inline truncate">
                                ({s.trade})
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                                {s.battery}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                {s.status || 'Active'}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Soldier Details Card (niche details) */}
            {selectedSoldier ? (
              <div
                id="soldier-selected-details-card"
                className="p-3 rounded-xl bg-slate-950/90 border border-rose-500/40 bg-gradient-to-r from-rose-950/20 via-slate-950 to-slate-950 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shadow-md"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 font-bold shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {selectedSoldier.rk}
                      </span>
                      <span className="text-white font-bold text-sm">
                        {selectedSoldier.name}
                      </span>
                      <span className="text-cyan-400 font-bold">
                        (Army No: {selectedSoldier.snkNo})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 flex-wrap">
                      <span>ব্যাটারি: <strong className="text-white">{selectedSoldier.battery}</strong></span>
                      <span>•</span>
                      <span>ট্রেড: <strong className="text-white">{selectedSoldier.trade}</strong></span>
                      <span>•</span>
                      <span>বর্তমান অবস্থান: <strong className="text-emerald-400">{selectedSoldier.status || 'Active'}</strong></span>
                      {selectedSoldier.outOfUnitCategory && (
                        <>
                          <span>•</span>
                          <span className="text-amber-400 font-bold">
                            ইতোমধ্যে আউটে: {selectedSoldier.outOfUnitCategory} ({selectedSoldier.outOfUnitLocation || 'N/A'})
                          </span>
                        </>
                      )}
                    </div>
                    {isBsm && assignedBty && selectedSoldier.battery !== assignedBty && (
                      <div className="mt-2 p-1.5 rounded bg-rose-950/80 border border-rose-500 text-rose-200 text-[11px]">
                        ⚠️ সতর্কতা: ইনি <strong>{selectedSoldier.battery}</strong>-এর সদস্য! আপনি {currentUser.role} হিসেবে শুধুমাত্র {assignedBty}-এর তথ্য এন্ট্রি করতে পারবেন।
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  id="btn-change-selected-soldier"
                  onClick={handleClearSelectedSoldier}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors border border-slate-700 cursor-pointer shrink-0"
                >
                  Change Soldier
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-xs font-mono text-slate-500">
                🔍 উপরে সার্চ বক্সে টাইপ করে তালিকা থেকে সৈন্য নির্বাচন করুন — সৈন্যের বিস্তারিত তথ্য এখানে প্রদর্শিত হবে।
              </div>
            )}

            {/* Destination, Authority & Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  {targetCategory === 'P/Lve' || targetCategory === 'C/Lve'
                    ? 'Leave Address / ছুটির ঠিকানা (Optional)'
                    : 'Location / Destination *'}
                </label>
                <input
                  type="text"
                  required={targetCategory !== 'P/Lve' && targetCategory !== 'C/Lve'}
                  placeholder={
                    targetCategory === 'P/Lve' || targetCategory === 'C/Lve'
                      ? 'e.g. নিজ গ্রাম, ডাকঘর (বাধ্যতামূলক নয়)'
                      : 'e.g. CMH Savar, UNMISS, etc.'
                  }
                  value={locationOrName}
                  onChange={(e) => setLocationOrName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  Authority / Order
                </label>
                <input
                  type="text"
                  placeholder="e.g. AHQ Ltr 104/24"
                  value={authority}
                  onChange={(e) => setAuthority(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  Departure / Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  {targetCategory === 'P/Lve' || targetCategory === 'C/Lve'
                    ? 'Joining Date / যোগদানের তারিখ *'
                    : 'Expected Return Date'}
                </label>
                <input
                  type="date"
                  required={targetCategory === 'P/Lve' || targetCategory === 'C/Lve'}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">
                Remarks / Notes
              </label>
              <input
                type="text"
                placeholder="Optional remarks..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddingSoldier(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Assignment</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. SEARCH & STATS BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search active out-of-unit by Army No, Rank, Name, Trade, or Location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono"
          />
        </div>

        <div className="text-xs font-mono text-slate-400">
          Showing <span className="text-white font-bold">{outOfUnitSoldiers.length}</span> personnel in{' '}
          <span className="text-rose-400 font-bold">{currentCategory}</span>
        </div>
      </div>

      {/* 5. SOLDIER TABLE */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40 shadow-md">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-mono text-[11px]">
              <th className="py-2.5 px-3 text-center w-12">#</th>
              <th className="py-2.5 px-3">Army No</th>
              <th className="py-2.5 px-3">Rank & Name</th>
              <th className="py-2.5 px-3">Battery</th>
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3">Location / Unit</th>
              <th className="py-2.5 px-3">Dates / Duration</th>
              <th className="py-2.5 px-3">Authority / Remarks</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {outOfUnitSoldiers.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500">
                  <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                  <p className="font-mono text-xs">No soldiers currently out of unit matching the criteria.</p>
                </td>
              </tr>
            ) : (
              outOfUnitSoldiers.map((person, idx) => {
                const categoryBadge = (person.outOfUnitCategory ||
                  (person.status === 'CMH/Sick'
                    ? 'CMH'
                    : person.status === 'Course/Trg'
                    ? 'Course'
                    : person.leaveType || 'Out')) as OutOfUnitCategory;

                const locationText =
                  person.outOfUnitLocation ||
                  person.courseName ||
                  person.hospitalName ||
                  person.leaveAddress ||
                  person.comdAssignment ||
                  person.statusDetails ||
                  '-';

                const dateText = person.outOfUnitStartDate
                  ? `${person.outOfUnitStartDate} ${person.outOfUnitEndDate ? '→ ' + person.outOfUnitEndDate : ''}`
                  : person.leaveFrom
                  ? `${person.leaveFrom} → ${person.leaveTo || 'Presently Out'}`
                  : person.courseFrom
                  ? `${person.courseFrom} → ${person.courseTo || 'Ongoing'}`
                  : person.admissionDate
                  ? `Admitted: ${person.admissionDate}`
                  : 'Active Out';

                if (inlineEditingPersonId === person.id) {
                  const isLeave = inlineCategory === 'P/Lve' || inlineCategory === 'C/Lve';
                  return (
                    <tr
                      key={person.id}
                      className="bg-amber-950/40 border-y border-amber-500/60 shadow-inner"
                    >
                      {/* 1. # */}
                      <td className="py-2 px-3 text-center text-slate-500 font-mono text-xs">
                        {idx + 1}
                      </td>

                      {/* 2. Army No */}
                      <td className="py-2 px-3 font-mono font-bold text-white whitespace-nowrap">
                        {person.snkNo}
                      </td>

                      {/* 3. Rank & Name */}
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-200">
                          <span className="text-rose-400 font-mono mr-1.5">{person.rk}</span>
                          <span>{person.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {person.trade}
                        </span>
                      </td>

                      {/* 4. Battery */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {person.battery}
                        </span>
                      </td>

                      {/* 5. Category */}
                      <td className="py-1 px-2 whitespace-nowrap">
                        <select
                          value={inlineCategory}
                          onChange={(e) => setInlineCategory(e.target.value as OutOfUnitCategory)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveInlineEdit(person);
                            if (e.key === 'Escape') cancelInlineEdit();
                          }}
                          className="w-full bg-slate-900 border border-amber-500 rounded px-1.5 py-1 text-[11px] font-mono font-bold text-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
                        >
                          <option value="P/Lve">P/Lve</option>
                          <option value="C/Lve">C/Lve</option>
                          <option value="Course">Course</option>
                          <option value="CMH">CMH</option>
                          <option value="FDMN">FDMN</option>
                          <option value="Comd">Comd</option>
                          <option value="Att">Att</option>
                          <option value="Msn">Msn</option>
                          <option value="ERE">ERE</option>
                        </select>
                      </td>

                      {/* 6. Location / Unit */}
                      <td className="py-1 px-2">
                        <input
                          type="text"
                          value={inlineLocation}
                          onChange={(e) => setInlineLocation(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveInlineEdit(person);
                            if (e.key === 'Escape') cancelInlineEdit();
                          }}
                          placeholder={isLeave ? 'Address (ঐচ্ছিক)' : 'Location'}
                          className="w-full bg-slate-900 border border-amber-500 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                        />
                      </td>

                      {/* 7. Dates / Duration */}
                      <td className="py-1 px-2 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <input
                            type="date"
                            value={inlineStartDate}
                            onChange={(e) => setInlineStartDate(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveInlineEdit(person);
                              if (e.key === 'Escape') cancelInlineEdit();
                            }}
                            className="bg-slate-900 border border-amber-500 rounded px-1 py-0.5 text-[11px] font-mono text-white focus:outline-none"
                          />
                          <span className="text-slate-500 text-[10px]">→</span>
                          <input
                            type="date"
                            value={inlineEndDate}
                            onChange={(e) => setInlineEndDate(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveInlineEdit(person);
                              if (e.key === 'Escape') cancelInlineEdit();
                            }}
                            className="bg-slate-900 border border-amber-500 rounded px-1 py-0.5 text-[11px] font-mono text-white focus:outline-none"
                          />
                        </div>
                      </td>

                      {/* 8. Authority / Remarks */}
                      <td className="py-1 px-2">
                        <div className="flex flex-col gap-1">
                          <input
                            type="text"
                            placeholder="Authority"
                            value={inlineAuthority}
                            onChange={(e) => setInlineAuthority(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveInlineEdit(person);
                              if (e.key === 'Escape') cancelInlineEdit();
                            }}
                            className="w-full bg-slate-900 border border-amber-500 rounded px-1.5 py-0.5 text-[11px] text-white focus:outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Remarks"
                            value={inlineRemarks}
                            onChange={(e) => setInlineRemarks(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveInlineEdit(person);
                              if (e.key === 'Escape') cancelInlineEdit();
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-slate-300 focus:outline-none"
                          />
                        </div>
                      </td>

                      {/* 9. Actions */}
                      <td className="py-1 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => saveInlineEdit(person)}
                            title="Save (সংরক্ষণ করুন / Enter)"
                            className="p-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white shadow cursor-pointer transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={cancelInlineEdit}
                            title="Cancel (বাতিল / Esc)"
                            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={person.id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="py-2.5 px-3 text-center text-slate-500 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-white">
                      {person.snkNo}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-200">
                        <span className="text-rose-400 font-mono mr-1.5">{person.rk}</span>
                        <span>{person.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {person.trade}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {person.battery}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getCategoryColor(categoryBadge)}`}>
                        {categoryBadge}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-200 max-w-xs truncate">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate">{locationText}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {dateText}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 max-w-xs truncate text-[11px]">
                      {person.outOfUnitAuthority || person.outOfUnitRemarks || person.diagnosis || person.comdAuthority || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {onViewDossier && (
                          <button
                            type="button"
                            onClick={() => onViewDossier(person)}
                            title="View Soldier Dossier"
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-semibold transition-all inline-flex items-center gap-1 cursor-pointer"
                          >
                            <User className="w-3 h-3 text-rose-400" />
                            <span>Dossier</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => startInlineEdit(person)}
                          title="Update Location, Duration, Remarks (RSM Edit)"
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-amber-950/60 text-slate-300 hover:text-amber-300 border border-slate-700 hover:border-amber-500/50 text-[11px] font-semibold transition-all inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3 text-amber-400" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => cancelOutOfUnit(person.id)}
                          title="Return Soldier to Unit (ক্যাম্পাসে প্রত্যাবর্তন)"
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
  );
};
