import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ParadeDutyCategory, Battery } from '../../types';
import { normalizeDutyName } from '../../utils/paradeCalculations';
import { sortBySeniority } from '../../utils/seniorityUtils';
import {
  Shield,
  Wrench,
  Clock,
  Layers,
  Search,
  Plus,
  Trash2,
  X,
  ChevronDown,
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
    category: 'Unit Sy',
    num: '1.',
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
    num: '2.',
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
    num: '3.',
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
    num: '4.',
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
    removeParadeDutyAssignment,
    clearParadeDutyAssignments,
    showNotification,
    ranksList,
  } = useApp();

  // Active Category (defaults to Unit Sy for immediate entry readiness)
  const [activeCategory, setActiveCategory] = useState<ParadeDutyCategory | null>('Unit Sy');

  // Selected Duty Role from dropdown
  const [selectedDutyName, setSelectedDutyName] = useState<string>('');
  const [customDutyInput, setCustomDutyInput] = useState<string>('');
  const [isCustomDuty, setIsCustomDuty] = useState(false);

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

  // When active category changes, set default dropdown duty option
  useEffect(() => {
    if (activeCategory && activeBoxDef) {
      setSelectedDutyName(activeBoxDef.defaultRoles[0] || '');
      setIsCustomDuty(false);
      setCustomDutyInput('');
      setSearchQuery('');
      setIsSearchOpen(false);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 80);
    }
  }, [activeCategory, activeBoxDef]);

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

  return (
    <div className="w-full space-y-2.5">
      {/* 1. CATEGORY BOXES AT THE TOP (SMALL & SIMPLE WITH DIGIT COUNT) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {DUTY_BOXES.map((box) => {
          const Icon = box.icon;
          const isSelected = activeCategory === box.category;
          const count = categoryCounts[box.category];

          return (
            <button
              key={box.category}
              type="button"
              id={`duty-btn-${box.category.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => handleBoxClick(box.category)}
              className={`p-2 sm:py-2 px-3 rounded-lg border text-xs font-mono transition-all cursor-pointer flex items-center justify-between gap-1.5 ${
                isSelected
                  ? 'bg-rose-600 text-white border-rose-500 shadow-md font-bold'
                  : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-rose-400'}`} />
                <span className="truncate">{box.num} {box.title}</span>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded font-mono font-bold shrink-0 ${
                  isSelected
                    ? 'bg-white/25 text-white'
                    : count > 0
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
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
                  onClick={() => {
                    if (window.confirm(`Clear all ${activeCategory} assignments?`)) {
                      clearParadeDutyAssignments(date, sessionType, activeCategory);
                    }
                  }}
                  className="text-xs font-mono text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                  title="Clear all"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveCategory(null)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
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
                  <span>Duty Role:</span>
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
                        } else {
                          setSelectedDutyName(e.target.value);
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-700 hover:border-slate-500 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-rose-500 appearance-none cursor-pointer pr-7"
                    >
                      {(activeBoxDef?.defaultRoles || []).map((role) => (
                        <option key={role} value={role} className="bg-slate-900 text-white">
                          {role}
                        </option>
                      ))}
                      <option value="__CUSTOM__" className="bg-slate-900 text-cyan-400 font-bold">
                        + Custom Duty...
                      </option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                ) : (
                  <input
                    type="text"
                    value={customDutyInput}
                    onChange={(e) => setCustomDutyInput(e.target.value)}
                    placeholder="Enter custom duty name..."
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
                    {/* Sub-category header */}
                    <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100/90 border-b border-slate-200 text-xs font-mono">
                      <div className="flex items-center gap-2 font-bold text-slate-800">
                        <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
                        <span>{group.dutyName}</span>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-300">
                        {group.personnel.length}
                      </span>
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
    </div>
  );
};
