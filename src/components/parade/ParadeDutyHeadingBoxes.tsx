import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ParadeDutyCategory, Battery, ParadeDutyAssignment } from '../../types';
import { normalizeDutyName } from '../../utils/paradeCalculations';
import { sortBySeniority } from '../../utils/seniorityUtils';
import {
  Users,
  Shield,
  Wrench,
  Clock,
  Layers,
  Search,
  Plus,
  Trash2,
  X,
  ChevronDown,
  RotateCcw,
  ExternalLink,
  UserCheck,
  AlertTriangle,
  Undo2,
} from 'lucide-react';

interface ParadeDutyHeadingBoxesProps {
  date: string;
  sessionType: string;
  isReadOnly?: boolean;
  filterBattery?: Battery | 'Consolidated';
}

interface DutyBoxDefinition {
  category: ParadeDutyCategory;
  num: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultRoles: string[];
}

const DUTY_BOXES: DutyBoxDefinition[] = [
  {
    category: 'Team',
    num: '1.',
    title: 'Team',
    icon: Users,
    defaultRoles: [],
  },
  {
    category: 'Unit Sy',
    num: '2.',
    title: 'Unit Sy',
    icon: Shield,
    defaultRoles: [
      'Quarter Guard',
      'Main Gate Guard',
      'RP Duty',
      'Magazine Guard',
      'Kot Guard',
      'Perimeter Patrol',
      'Camp Security',
    ],
  },
  {
    category: 'working',
    num: '3.',
    title: 'working',
    icon: Wrench,
    defaultRoles: [
      'Camp Cleaning',
      'Fresh Ration Party',
      'Dry Ration Party',
      'Ammo Working',
      'Store Working',
      'MT Maintenance / Wash',
      'Line Fatigue',
      'Fire Fighting Party',
    ],
  },
  {
    category: 'Fixed Duty',
    num: '4.',
    title: 'Fixed Duty',
    icon: Clock,
    defaultRoles: [
      'Cook / Cookhouse',
      'MT Driver',
      'Radio Operator',
      'Bty Clerk / Office',
      'Water Carrier',
      'Electrician / Gen Op',
      'Armament Artificer',
      'Barber / Cobbler / Washerman',
    ],
  },
  {
    category: 'Others',
    num: '5.',
    title: 'Others',
    icon: Layers,
    defaultRoles: [
      'General Duty (GD)',
      'Special Assignment',
      'MI Room Attendant',
      'Sports Cadre',
      'Escort Duty',
      'Admin Duty',
    ],
  },
];

export const ParadeDutyHeadingBoxes: React.FC<ParadeDutyHeadingBoxesProps> = ({
  date,
  sessionType,
  isReadOnly = false,
  filterBattery,
}) => {
  const {
    personnelList,
    getParadeDutyAssignments,
    addParadeDutyAssignment,
    addParadeDutyAssignmentsBatch,
    removeParadeDutyAssignment,
    clearParadeDutyAssignments,
    deleteParadeDutyGroup,
    restoreParadeDutyAssignments,
    showNotification,
    ranksList,
    customTeams,
    setActivePage,
  } = useApp();

  // Active Category (defaults to Team as first category for immediate entry readiness)
  const [activeCategory, setActiveCategory] = useState<ParadeDutyCategory | null>('Team');

  // Selected Duty Role from dropdown
  const [selectedDutyName, setSelectedDutyName] = useState<string>('');
  const [customDutyInput, setCustomDutyInput] = useState<string>('');
  const [isCustomDuty, setIsCustomDuty] = useState(false);

  // Group & Category Deletion State (In-app safe confirmation modal)
  interface PendingDeleteState {
    type: 'group' | 'category';
    category: ParadeDutyCategory;
    dutyName?: string;
    displayName: string;
    items: ParadeDutyAssignment[];
  }
  const [pendingDelete, setPendingDelete] = useState<PendingDeleteState | null>(null);

  // Undo Toast state with 15s auto-expire
  const [activeUndoToast, setActiveUndoToast] = useState<{
    displayName: string;
    items: ParadeDutyAssignment[];
    expiresAt: number;
  } | null>(null);

  useEffect(() => {
    if (!activeUndoToast) return;
    const remainingMs = Math.max(0, activeUndoToast.expiresAt - Date.now());
    const timer = setTimeout(() => {
      setActiveUndoToast(null);
    }, remainingMs || 15000);
    return () => clearTimeout(timer);
  }, [activeUndoToast]);

  // Snk No / Name Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Current assignments for this date and session
  const allAssignments = getParadeDutyAssignments(date, sessionType);

  // Filter assignments by battery if filterBattery is a specific battery
  const displayAssignments = useMemo(() => {
    if (!filterBattery || filterBattery === 'Consolidated') {
      return allAssignments;
    }
    return allAssignments.filter((a) => a.battery === filterBattery);
  }, [allAssignments, filterBattery]);

  // Counts for each category
  const categoryCounts = useMemo(() => {
    const counts: Record<ParadeDutyCategory, number> = {
      Team: 0,
      'Unit Sy': 0,
      working: 0,
      'Fixed Duty': 0,
      Others: 0,
    };
    displayAssignments.forEach((a) => {
      if (counts[a.category] !== undefined) {
        counts[a.category]++;
      }
    });
    return counts;
  }, [displayAssignments]);

  // Active box definition
  const activeBoxDef = useMemo(() => {
    return DUTY_BOXES.find((b) => b.category === activeCategory);
  }, [activeCategory]);

  // Dynamic available roles for dropdown
  const availableRoles = useMemo(() => {
    if (activeCategory === 'Team') {
      const names = (customTeams || []).map((t) => t.name);
      if (names.length > 0) return names;
      return ['Aslt Course', 'Cricket', 'Athletics Team', 'SL Course', 'Firing Team'];
    }
    return activeBoxDef?.defaultRoles || [];
  }, [activeCategory, customTeams, activeBoxDef]);

  // When active category changes or available roles change, set selected duty option
  useEffect(() => {
    if (activeCategory && availableRoles.length > 0) {
      if (!selectedDutyName || !availableRoles.includes(selectedDutyName)) {
        setSelectedDutyName(availableRoles[0]);
      }
      setIsCustomDuty(false);
      setCustomDutyInput('');
      setSearchQuery('');
      setIsSearchOpen(false);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 80);
    }
  }, [activeCategory, availableRoles]);

  // Team object matching current selected role
  const currentTeamObj = useMemo(() => {
    if (activeCategory !== 'Team') return null;
    return (customTeams || []).find(
      (t) => t.name.toLowerCase().trim() === selectedDutyName.toLowerCase().trim()
    );
  }, [activeCategory, customTeams, selectedDutyName]);

  // Members of current team currently detailed for this dutyName
  const teamMembersDetailed = useMemo(() => {
    if (!currentTeamObj) return [];
    const norm = normalizeDutyName(selectedDutyName);
    return displayAssignments.filter(
      (a) => a.category === 'Team' && normalizeDutyName(a.dutyName) === norm
    );
  }, [currentTeamObj, displayAssignments, selectedDutyName]);

  // Batch load team into today's duty detailing
  const handleLoadFullTeam = (teamObj: NonNullable<typeof currentTeamObj>) => {
    if (isReadOnly) {
      showNotification('View-Only mode: Cannot add duty personnel.');
      return;
    }
    const finalDuty = normalizeDutyName(teamObj.name);
    const membersToAssign = teamObj.memberIds
      .map((id) => personnelList.find((p) => p.id === id || p.snkNo === id))
      .filter(Boolean) as typeof personnelList;

    if (membersToAssign.length === 0) {
      showNotification(`"${teamObj.name}" টিমে কোনো সদস্য নেই। Team পেজ থেকে সদস্য যোগ করুন।`);
      return;
    }

    const assignmentsToAdd = membersToAssign.map((soldier) => ({
      personnelId: soldier.id,
      snkNo: soldier.snkNo || (soldier as any).armyNo || '',
      name: soldier.name,
      rank: (soldier.rk || (soldier as any).rank || '') as string,
      battery: soldier.battery,
      category: 'Team' as ParadeDutyCategory,
      dutyName: finalDuty,
      date,
      sessionType,
    }));

    addParadeDutyAssignmentsBatch(assignmentsToAdd);
    showNotification(`"${teamObj.name}"-এর ${membersToAssign.length} জন সদস্য ডিউটিতে সফলভাবে যোগ করা হয়েছে।`);
  };

  // Auto-load team members when team is selected if not yet detailed
  const autoLoadedTeamsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (activeCategory === 'Team' && currentTeamObj && currentTeamObj.memberIds.length > 0) {
      const loadKey = `${date}_${sessionType}_${currentTeamObj.id}`;
      if (!autoLoadedTeamsRef.current.has(loadKey)) {
        const norm = normalizeDutyName(currentTeamObj.name);
        const alreadyInDuty = allAssignments.filter(
          (a) => a.category === 'Team' && normalizeDutyName(a.dutyName) === norm
        );
        if (alreadyInDuty.length === 0 && !isReadOnly) {
          autoLoadedTeamsRef.current.add(loadKey);
          handleLoadFullTeam(currentTeamObj);
        }
      }
    }
  }, [activeCategory, currentTeamObj, date, sessionType, isReadOnly]);

  // Click outside listener for search autocomplete
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter personnel based on search query - sorted by Military Seniority
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    const matched = personnelList.filter((p) => {
      if (filterBattery && filterBattery !== 'Consolidated' && p.battery !== filterBattery) {
        return false;
      }
      const soldierSnkNo = (p.snkNo || (p as any).armyNo || '').toLowerCase();
      const soldierName = (p.name || '').toLowerCase();
      const soldierRank = (p.rk || (p as any).rank || '').toLowerCase();
      return soldierSnkNo.includes(q) || soldierName.includes(q) || soldierRank.includes(q);
    });
    return sortBySeniority(matched, ranksList).slice(0, 10);
  }, [personnelList, searchQuery, filterBattery, ranksList]);

  // Handle adding a soldier
  const handleAddSoldier = (soldier: (typeof personnelList)[0]) => {
    if (!activeCategory) return;
    if (isReadOnly) {
      showNotification('View-Only mode: Cannot add duty personnel.');
      return;
    }

    const rawDuty = isCustomDuty && customDutyInput.trim() ? customDutyInput.trim() : selectedDutyName;
    const finalDuty = normalizeDutyName(rawDuty);

    if (!finalDuty) {
      showNotification('Please select or enter a duty name first.');
      return;
    }

    const soldierSnk = soldier.snkNo || (soldier as any).armyNo || '';
    const soldierRank = (soldier.rk || (soldier as any).rank || '') as string;

    const alreadyAssigned = allAssignments.some(
      (a) => a.personnelId === soldier.id && a.category === activeCategory
    );

    addParadeDutyAssignment({
      personnelId: soldier.id,
      snkNo: soldierSnk,
      name: soldier.name,
      rank: soldierRank,
      battery: soldier.battery,
      category: activeCategory,
      dutyName: finalDuty,
      date,
      sessionType,
    });

    if (alreadyAssigned) {
      showNotification(`Updated ${soldierRank} ${soldier.name} duty to: ${finalDuty}`);
    } else {
      showNotification(`Added ${soldierRank} ${soldier.name} (${soldierSnk}) to ${activeCategory}`);
    }

    setSearchQuery('');
    setIsSearchOpen(false);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  };

  const handleBoxClick = (cat: ParadeDutyCategory) => {
    setActiveCategory((prev) => (prev === cat ? null : cat));
  };

  const activeCategoryAssignments = useMemo(() => {
    if (!activeCategory) return [];
    return displayAssignments.filter((a) => a.category === activeCategory);
  }, [displayAssignments, activeCategory]);

  // Group active category assignments by sub-category (dutyName) in list order
  const groupedSubCategories = useMemo(() => {
    if (!activeCategory || activeCategoryAssignments.length === 0) return [];

    const map = new Map<string, typeof activeCategoryAssignments>();
    activeCategoryAssignments.forEach((a) => {
      const duty = normalizeDutyName(a.dutyName || 'General');
      if (!map.has(duty)) {
        map.set(duty, []);
      }
      map.get(duty)!.push({
        ...a,
        dutyName: duty,
      });
    });

    const defaultRoles = activeBoxDef?.defaultRoles || [];
    const sortedDuties = Array.from(map.keys()).sort((a, b) => {
      const idxA = defaultRoles.indexOf(a);
      const idxB = defaultRoles.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    return sortedDuties.map((duty) => ({
      dutyName: duty,
      personnel: map.get(duty)!,
    }));
  }, [activeCategory, activeCategoryAssignments, activeBoxDef]);

  // Request to delete an entire group / sub-category
  const handleRequestDeleteGroup = (groupDutyName: string, personnel: ParadeDutyAssignment[]) => {
    if (isReadOnly) {
      showNotification('View-Only mode: ডিউটি মুছে ফেলা যাবে না।');
      return;
    }
    if (!activeCategory || personnel.length === 0) return;
    setPendingDelete({
      type: 'group',
      category: activeCategory,
      dutyName: groupDutyName,
      displayName: `"${groupDutyName}" গ্রুপ`,
      items: personnel,
    });
  };

  // Request to delete an entire category
  const handleRequestDeleteCategory = (category: ParadeDutyCategory, personnel: ParadeDutyAssignment[]) => {
    if (isReadOnly) {
      showNotification('View-Only mode: ডিউটি মুছে ফেলা যাবে না।');
      return;
    }
    if (personnel.length === 0) return;
    setPendingDelete({
      type: 'category',
      category,
      displayName: `"${category}" ক্যাটাগরি`,
      items: personnel,
    });
  };

  // Confirm delete handler (in-app modal)
  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    const { type, category, dutyName, displayName, items } = pendingDelete;
    let removed: ParadeDutyAssignment[] = [];
    if (type === 'group' && dutyName) {
      removed = deleteParadeDutyGroup(date, sessionType, category, dutyName);
    } else {
      removed = clearParadeDutyAssignments(date, sessionType, category);
    }
    setPendingDelete(null);
    const count = removed && removed.length > 0 ? removed.length : items.length;
    showNotification(`${displayName}-এর ${count} জন সদস্যের ডিউটি মুছে ফেলা হয়েছে।`);
    setActiveUndoToast({
      displayName,
      items: removed && removed.length > 0 ? removed : items,
      expiresAt: Date.now() + 15000,
    });
  };

  const handleCancelDelete = () => {
    setPendingDelete(null);
  };

  // Undo delete
  const handleUndo = () => {
    if (!activeUndoToast || activeUndoToast.items.length === 0) return;
    restoreParadeDutyAssignments(activeUndoToast.items);
    showNotification(`${activeUndoToast.displayName}-এর ${activeUndoToast.items.length} জন সদস্যের ডিউটি পুনরায় ফিরিয়ে আনা হয়েছে (Restored)।`);
    setActiveUndoToast(null);
  };

  return (
    <div className="w-full space-y-2.5">
      {/* 1. CATEGORY BOXES AT THE TOP (SMALL & SIMPLE WITH DIGIT COUNT + QUICK DELETE) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {DUTY_BOXES.map((box) => {
          const Icon = box.icon;
          const isSelected = activeCategory === box.category;
          const count = categoryCounts[box.category];

          return (
            <div
              key={box.category}
              id={`duty-btn-${box.category.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => handleBoxClick(box.category)}
              className={`p-2 sm:py-2 px-3 rounded-lg border text-xs font-mono transition-all cursor-pointer flex items-center justify-between gap-1.5 select-none ${
                isSelected
                  ? 'bg-rose-600 text-white border-rose-500 shadow-md font-bold'
                  : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-rose-400'}`} />
                <span className="truncate">{box.num} {box.title}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                    isSelected
                      ? 'bg-white/25 text-white'
                      : count > 0
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {count}
                </span>
                {count > 0 && !isReadOnly && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const categoryPersonnel = displayAssignments.filter((a) => a.category === box.category);
                      handleRequestDeleteCategory(box.category, categoryPersonnel);
                    }}
                    className={`p-1 rounded transition-colors cursor-pointer ${
                      isSelected
                        ? 'hover:bg-rose-700 text-rose-200 hover:text-white'
                        : 'hover:bg-rose-500/20 text-slate-400 hover:text-rose-400'
                    }`}
                    title={`"${box.title}" ক্যাটাগরির সকল (${count} জন) সদস্যের ডিউটি মুছে ফেলুন`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. ENTRY OPTION & LIST BELOW (APPEARS WHEN A CATEGORY IS CLICKED) */}
      {activeCategory && activeBoxDef ? (
        <div className="p-3 sm:p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 shadow-lg space-y-3 animate-fadeIn">
          {/* Active Category Header */}
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {activeBoxDef.num} {activeBoxDef.title} Entry
              </span>
              <span className="text-xs font-mono text-slate-400">
                Assigned: <strong className="text-white font-bold">{activeCategoryAssignments.length}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              {activeCategoryAssignments.length > 0 && !isReadOnly && (
                <button
                  type="button"
                  onClick={() => handleRequestDeleteCategory(activeCategory, activeCategoryAssignments)}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title={`"${activeCategory}" ক্যাটাগরির সকল (${activeCategoryAssignments.length} জন) সৈনিকের ডিউটি মুছে ফেলুন`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ক্যাটাগরি মুছুন ({activeCategoryAssignments.length})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveCategory(null)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close Entry"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Entry Form: Dropdown + Snk No/Name Search */}
          {!isReadOnly ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              {/* Dropdown */}
              <div className="md:col-span-5 space-y-1">
                <label className="text-xs font-mono text-slate-400 flex items-center justify-between">
                  <span>{activeCategory === 'Team' ? 'Select Team / Squad:' : 'Duty Role:'}</span>
                  {isCustomDuty && (
                    <button
                      type="button"
                      onClick={() => setIsCustomDuty(false)}
                      className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
                    >
                      ← Back
                    </button>
                  )}
                </label>

                {!isCustomDuty ? (
                  <div className="relative">
                    <select
                      value={selectedDutyName}
                      onChange={(e) => {
                        if (e.target.value === '__CUSTOM__') {
                          setIsCustomDuty(true);
                          setCustomDutyInput('');
                        } else if (e.target.value === '__GO_TO_TEAMS__') {
                          setActivePage('teams');
                        } else {
                          setSelectedDutyName(e.target.value);
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-700 hover:border-slate-500 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-rose-500 appearance-none cursor-pointer pr-7"
                    >
                      {(availableRoles || []).map((role) => (
                        <option key={role} value={role} className="bg-slate-900 text-white">
                          {role}
                        </option>
                      ))}
                      <option value="__CUSTOM__" className="bg-slate-900 text-cyan-400 font-bold">
                        + Custom {activeCategory === 'Team' ? 'Team Name' : 'Duty'}...
                      </option>
                      {activeCategory === 'Team' && (
                        <option value="__GO_TO_TEAMS__" className="bg-slate-900 text-amber-300 font-bold">
                          ⚙ Manage Teams / নতুন টিম বানান...
                        </option>
                      )}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                ) : (
                  <input
                    type="text"
                    value={customDutyInput}
                    onChange={(e) => setCustomDutyInput(e.target.value)}
                    placeholder={activeCategory === 'Team' ? 'টিমের নাম লিখুন...' : 'Enter custom duty name...'}
                    className="w-full bg-slate-950 border border-cyan-500/60 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                    autoFocus
                  />
                )}
              </div>

              {/* Soldier Search */}
              <div className="md:col-span-7 space-y-1 relative" ref={dropdownRef}>
                <label className="text-xs font-mono text-slate-400">
                  Search Soldier (Snk No or Name):
                </label>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsSearchOpen(true);
                    }}
                    onFocus={() => {
                      if (searchQuery.trim()) setIsSearchOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchResults.length > 0) {
                        e.preventDefault();
                        handleAddSoldier(searchResults[0]);
                      } else if (e.key === 'Escape') {
                        setIsSearchOpen(false);
                      }
                    }}
                    placeholder="Type Snk No or Name..."
                    className="w-full bg-slate-950 border border-slate-700 hover:border-slate-500 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setIsSearchOpen(false);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Autocomplete Dropdown */}
                {isSearchOpen && searchQuery.trim().length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-slate-950 border border-slate-700 rounded-lg shadow-2xl max-h-56 overflow-y-auto z-50 p-1 divide-y divide-slate-850">
                    {searchResults.length > 0 ? (
                      searchResults.map((soldier) => {
                        const isAlready = allAssignments.some(
                          (a) => a.personnelId === soldier.id && a.category === activeCategory
                        );

                        return (
                          <div
                            key={soldier.id}
                            onClick={() => handleAddSoldier(soldier)}
                            className="p-2 hover:bg-slate-900 rounded-md flex items-center justify-between gap-2 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs font-mono font-bold px-1.5 py-0.2 rounded bg-slate-800 text-rose-300">
                                {soldier.snkNo || (soldier as any).armyNo}
                              </span>
                              <div className="truncate">
                                <span className="text-xs font-bold text-white">
                                  {soldier.rk || (soldier as any).rank} {soldier.name}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400 ml-1.5">
                                  ({soldier.battery})
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1 shrink-0"
                            >
                              <Plus className="w-3 h-3" />
                              <span>{isAlready ? 'Update' : 'Add'}</span>
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-2.5 text-center text-xs text-slate-400 font-mono">
                        No soldier found matching "{searchQuery}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300 font-mono">
              View-Only Mode
            </div>
          )}

          {/* Quick Team Status & Action Bar */}
          {activeCategory === 'Team' && currentTeamObj && (
            <div className="p-2.5 px-3 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-2 flex-wrap">
                <Users className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="text-slate-300">
                  টিম: <strong className="text-white font-bold">{currentTeamObj.name}</strong> ({currentTeamObj.memberIds.length} জন মূল সদস্য)
                </span>
                <span className="text-slate-600 hidden sm:inline">•</span>
                <span className="text-emerald-400 font-bold">
                  আজকের ডিউটিতে: {teamMembersDetailed.length} জন
                </span>
              </div>

              <div className="flex items-center gap-2">
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => handleLoadFullTeam(currentTeamObj)}
                    className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="মূল টিমের সব সদস্যকে আজকের ডিউটিতে লোড বা রিলোড করুন"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>টিম রিলোড করুন ({currentTeamObj.memberIds.length} জন)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActivePage('teams')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                  title="টিম তৈরি বা সদস্য পরিবর্তন করতে Team পেজে যান"
                >
                  <span>Team পেজ</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* 3. LIST OF ASSIGNED SOLDIERS BELOW (CLEAN MINIMALIZED WHITE BG DESIGN) */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-300">
                Assigned Personnel List ({activeCategoryAssignments.length}):
              </span>
            </div>

            {groupedSubCategories.length > 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-slate-900">
                {groupedSubCategories.map((group, gIdx) => (
                  <div key={group.dutyName} className={gIdx > 0 ? 'border-t border-slate-200' : ''}>
                    {/* Sub-category / Group header with delete button */}
                    <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100/90 border-b border-slate-200 text-xs font-mono">
                      <div className="flex items-center gap-2 font-bold text-slate-800 truncate">
                        <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
                        <span className="truncate">{group.dutyName}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-300">
                          {group.personnel.length} জন
                        </span>
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => handleRequestDeleteGroup(group.dutyName, group.personnel)}
                            className="px-2 py-0.5 rounded text-[11px] font-mono text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50 border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer font-semibold shadow-xs"
                            title={`"${group.dutyName}" গ্রুপের সকল (${group.personnel.length} জন) সদস্যের ডিউটি মুছে ফেলুন`}
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>গ্রুপ মুছুন ({group.personnel.length})</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Personnel List (Clean white tabular list) */}
                    <div className="divide-y divide-slate-100">
                      {group.personnel.map((assigned, idx) => (
                        <div
                          key={assigned.id}
                          className="px-3 py-1.5 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span className="text-[11px] font-mono font-medium text-slate-400 w-5 shrink-0">
                              {idx + 1}.
                            </span>
                            <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-900 border border-slate-300 shrink-0">
                              {assigned.snkNo}
                            </span>
                            <span className="text-xs font-semibold text-slate-900 truncate">
                              {assigned.rank} {assigned.name}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500 shrink-0">
                              ({assigned.battery})
                            </span>
                          </div>

                          {!isReadOnly && (
                            <button
                              type="button"
                              onClick={() => removeParadeDutyAssignment(assigned.id, date, sessionType)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                              title="Remove"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-white border border-slate-200 text-center text-xs text-slate-500 font-mono">
                No personnel assigned yet to {activeCategory}.
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* 4. CONFIRM DELETE MODAL (Group or Category - Iframe Safe) */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {pendingDelete.type === 'group' ? 'গ্রুপ ডিউটি মুছে ফেলা' : 'পুরো ক্যাটাগরি ডিউটি মুছে ফেলা'}
                </h3>
                <p className="text-xs text-slate-400">
                  {pendingDelete.type === 'group' ? 'Delete Group Detailing' : 'Delete Category Detailing'}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs text-slate-300">
              <p>
                আপনি কি নিশ্চিত যে <span className="font-bold text-white font-mono">{pendingDelete.displayName}</span>-এর অন্তর্ভুক্ত সকল <span className="text-rose-400 font-bold font-mono">({pendingDelete.items.length} জন)</span> সদস্যের ডিউটি মুছে ফেলতে চান?
              </p>
              <div className="max-h-36 overflow-y-auto space-y-1 p-2 rounded-lg bg-slate-900 border border-slate-800/80 font-mono text-[11px] text-slate-400">
                {pendingDelete.items.map((it, idx) => (
                  <div key={it.id} className="flex items-center justify-between py-0.5">
                    <span className="truncate">{idx + 1}. {it.rank} {it.name} ({it.snkNo})</span>
                    <span className="text-slate-500 shrink-0 ml-2">{it.battery}</span>
                  </div>
                ))}
              </div>
              <p className="text-amber-300/90 text-[11px] bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 leading-relaxed">
                💡 <strong>চিন্তার কিছু নেই:</strong> ভুলবশত মুছে ফেললেও আপনি সাথে সাথে নিচে থাকা <strong>"Undo (ফিরিয়ে আনুন)"</strong> বাটন থেকে এক ক্লিকে সবাইকে পুনরায় ফিরিয়ে আনতে পারবেন।
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleCancelDelete}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                বাতিল (Cancel)
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-md shadow-rose-900/40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>হ্যাঁ, মুছে ফেলুন (Delete)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. FLOATING UNDO TOAST */}
      {activeUndoToast && (
        <div className="fixed bottom-5 right-4 sm:right-8 z-50 bg-slate-900/95 border-2 border-amber-500/60 shadow-2xl shadow-amber-950/50 p-3.5 rounded-2xl flex items-center gap-3.5 text-white max-w-md animate-slideUp backdrop-blur-md">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
            <RotateCcw className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              {activeUndoToast.displayName} ({activeUndoToast.items.length} জন) মুছে ফেলা হয়েছে
            </p>
            <p className="text-[11px] text-slate-400">
              ভুলবশত হয়ে থাকলে এখনই ফিরিয়ে আনুন
            </p>
          </div>
          <button
            type="button"
            onClick={handleUndo}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow-md shrink-0"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveUndoToast(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
