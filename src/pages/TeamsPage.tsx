import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { CustomTeam, Personnel, Battery, normalizeBattery, matchesBatteryFilter } from '../types';
import { sortBySeniority } from '../utils/seniorityUtils';
import { RankBadge } from '../components/common/RankBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  Users,
  Plus,
  Trash2,
  Edit3,
  Search,
  Check,
  X,
  ShieldAlert,
  ArrowRight,
  UserPlus,
  RefreshCw,
  RotateCcw,
  Undo2,
  AlertTriangle,
  Archive,
  ChevronRight,
  ChevronDown,
  Printer,
} from 'lucide-react';

interface TeamsPageProps {
  onViewDossier?: (p: Personnel) => void;
}

interface TeamGroup {
  key: string;
  name: string;
  records: CustomTeam[]; // sorted newest year first
  years: number[];
  latestYear: number;
  hasActive: boolean;
}

const resolveYear = (team: Partial<CustomTeam>): number =>
  Number(team.year) ||
  (team.createdAt ? new Date(team.createdAt).getFullYear() : new Date().getFullYear()) ||
  new Date().getFullYear();

export const TeamsPage: React.FC<TeamsPageProps> = ({ onViewDossier }) => {
  const {
    customTeams,
    teamHistory = [],
    recentlyDeletedTeams,
    teamsLoading,
    refreshTeamsFromDatabase,
    addCustomTeam,
    updateCustomTeam,
    deleteCustomTeam,
    permanentlyDeleteTeam,
    undoDeleteTeam,
    restoreCustomTeam,
    addMemberToTeam,
    removeMemberFromTeam,
    personnelList,
    ranksList,
    setActivePage,
    isGuest,
    showNotification,
    theme,
  } = useApp();

  const isLight = theme === 'light';
  const currentYear = new Date().getFullYear();

  // Directory & Search State
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [selectedTeamKey, setSelectedTeamKey] = useState<string>('');
  const [selectedTeamRecordId, setSelectedTeamRecordId] = useState<string>('');
  const [isMobileTeamDropdownOpen, setIsMobileTeamDropdownOpen] = useState(false);
  const mobileDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileDropdownRef.current && !mobileDropdownRef.current.contains(e.target as Node)) {
        setIsMobileTeamDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Right Panel Roster Filters
  const [btyFilter, setBtyFilter] = useState<Battery | 'EME' | 'All'>('All');
  const [rosterSearch, setRosterSearch] = useState('');

  // Inline Quick Add Soldier State
  const [isInlineAddOpen, setIsInlineAddOpen] = useState(false);
  const [inlineSearchQuery, setInlineSearchQuery] = useState('');

  // Minimal Add Year Inline Input State
  const [isAddingYear, setIsAddingYear] = useState(false);
  const [newYearInput, setNewYearInput] = useState<string>(String(currentYear));
  const newYearInputRef = useRef<HTMLInputElement>(null);

  // Minimal Create Team Modal & Inline Rename Team State
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [teamNameInput, setTeamNameInput] = useState('');
  const [inlineEditingTeamKey, setInlineEditingTeamKey] = useState<string | null>(null);
  const [inlineTeamNameInput, setInlineTeamNameInput] = useState('');

  // Delete / Undo / Trash Modals
  const [teamPendingDelete, setTeamPendingDelete] = useState<CustomTeam | null>(null);
  const [teamPendingPermDelete, setTeamPendingPermDelete] = useState<CustomTeam | null>(null);
  const [activeUndoToast, setActiveUndoToast] = useState<{ team: CustomTeam; expiresAt: number } | null>(null);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);

  useEffect(() => {
    if (!activeUndoToast) return;
    const remaining = Math.max(0, activeUndoToast.expiresAt - Date.now());
    const timer = setTimeout(() => {
      setActiveUndoToast(null);
    }, remaining || 15000);
    return () => clearTimeout(timer);
  }, [activeUndoToast]);

  // Live lookup map for main personnel database
  const personnelMap = useMemo(() => {
    const map = new Map<string, Personnel>();
    (personnelList || []).forEach((p) => {
      if (p.id) map.set(p.id, p);
      if (p.snkNo) {
        map.set(p.snkNo, p);
        map.set(p.snkNo.trim().toLowerCase(), p);
      }
    });
    return map;
  }, [personnelList]);

  // Combine active + archived year records so clicking a team lets user view every year
  const combinedSourceTeams = useMemo(() => {
    const seenIds = new Set<string>();
    const list: CustomTeam[] = [];

    customTeams.forEach((t) => {
      if (!seenIds.has(t.id)) {
        seenIds.add(t.id);
        list.push(t);
      }
    });
    teamHistory.forEach((t) => {
      if (!seenIds.has(t.id)) {
        seenIds.add(t.id);
        list.push(t);
      }
    });
    return list;
  }, [customTeams, teamHistory]);

  // Group teams by normalized team name
  const teamGroups = useMemo<TeamGroup[]>(() => {
    const map = new Map<string, CustomTeam[]>();

    combinedSourceTeams.forEach((t) => {
      const normalized = (t.name || 'Untitled Team').trim().toLowerCase();
      const existing = map.get(normalized) || [];
      existing.push(t);
      map.set(normalized, existing);
    });

    const groups: TeamGroup[] = [];
    map.forEach((records, key) => {
      const sortedRecords = [...records].sort((a, b) => {
        const yDiff = resolveYear(b) - resolveYear(a);
        if (yDiff !== 0) return yDiff;
        if (Boolean(a.isDeleted) !== Boolean(b.isDeleted)) {
          return a.isDeleted ? 1 : -1;
        }
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });

      const years = Array.from(new Set(sortedRecords.map((r) => resolveYear(r)))).sort((a, b) => b - a);
      const displayName = sortedRecords[0]?.name || key;

      groups.push({
        key,
        name: displayName,
        records: sortedRecords,
        years,
        latestYear: years[0] || currentYear,
        hasActive: sortedRecords.some((r) => !r.isDeleted),
      });
    });

    return groups.sort((a, b) => a.name.localeCompare(b.name));
  }, [combinedSourceTeams, currentYear]);

  // Filtered left team list
  const filteredTeamGroups = useMemo(() => {
    if (!teamSearchQuery.trim()) return teamGroups;
    const q = teamSearchQuery.toLowerCase().trim();
    return teamGroups.filter((grp) => grp.name.toLowerCase().includes(q));
  }, [teamGroups, teamSearchQuery]);

  // Keep selectedTeamKey valid
  useEffect(() => {
    if (filteredTeamGroups.length === 0) {
      if (selectedTeamKey) setSelectedTeamKey('');
      return;
    }
    const stillVisible = filteredTeamGroups.some((g) => g.key === selectedTeamKey);
    if (!stillVisible) {
      setSelectedTeamKey(filteredTeamGroups[0].key);
    }
  }, [filteredTeamGroups, selectedTeamKey]);

  const currentTeamGroup = useMemo(() => {
    return filteredTeamGroups.find((g) => g.key === selectedTeamKey) || filteredTeamGroups[0] || null;
  }, [filteredTeamGroups, selectedTeamKey]);

  // Keep selectedTeamRecordId synced within selected team group
  useEffect(() => {
    if (!currentTeamGroup || currentTeamGroup.records.length === 0) {
      if (selectedTeamRecordId) setSelectedTeamRecordId('');
      return;
    }

    const existsInGroup = currentTeamGroup.records.some((r) => r.id === selectedTeamRecordId);
    if (!existsInGroup) {
      setSelectedTeamRecordId(currentTeamGroup.records[0].id);
      setIsInlineAddOpen(false);
      setIsAddingYear(false);
    }
  }, [currentTeamGroup, selectedTeamRecordId]);

  const activeTeamRecord = useMemo(() => {
    if (!currentTeamGroup) return null;
    return currentTeamGroup.records.find((r) => r.id === selectedTeamRecordId) || currentTeamGroup.records[0] || null;
  }, [currentTeamGroup, selectedTeamRecordId]);

  const handleSelectTeamGroup = (grp: TeamGroup) => {
    setSelectedTeamKey(grp.key);
    setSelectedTeamRecordId(grp.records[0]?.id || '');
    setRosterSearch('');
    setBtyFilter('All');
    setIsInlineAddOpen(false);
    setIsAddingYear(false);
    setIsMobileTeamDropdownOpen(false);
  };

  // Resolve full member objects for a team record (live synced with personnelList)
  const resolveTeamMembers = (team: CustomTeam) => {
    if (team.isDeleted && Array.isArray(team.snapshotMembers) && team.snapshotMembers.length > 0) {
      return team.snapshotMembers.map((m) => {
        const live =
          personnelMap.get(m.id) ||
          (m.snkNo ? personnelMap.get(m.snkNo.trim().toLowerCase()) || personnelMap.get(m.snkNo) : undefined);

        return {
          id: live?.id || m.id,
          snkNo: live?.snkNo || m.snkNo,
          rk: live?.rk || m.rk,
          name: live?.name || m.name,
          battery: (normalizeBattery(live?.battery || m.battery || 'HQ Bty') || m.battery) as Battery,
          trade: live?.trade || m.trade || '-',
          status: live?.status || m.status || 'Archived',
          livePerson: live,
        };
      });
    }

    const resolved = (team.memberIds || [])
      .map((id) => personnelMap.get(id))
      .filter(Boolean) as Personnel[];

    return sortBySeniority(resolved, ranksList).map((p) => ({
      id: p.id,
      snkNo: p.snkNo,
      rk: p.rk,
      name: p.name,
      battery: (normalizeBattery(p.battery || 'HQ Bty') || p.battery) as Battery,
      trade: p.trade || '-',
      status: p.status || 'In Unit',
      livePerson: p,
    }));
  };

  // Resolved & filtered roster for the selected team + selected year box
  const activeTeamMembersAll = useMemo(() => {
    if (!activeTeamRecord) return [];
    return resolveTeamMembers(activeTeamRecord);
  }, [activeTeamRecord, personnelMap, ranksList]);

  const filteredRosterMembers = useMemo(() => {
    return activeTeamMembersAll.filter((m) => {
      if (btyFilter !== 'All' && !matchesBatteryFilter(m.battery, btyFilter)) return false;
      if (rosterSearch.trim()) {
        const q = rosterSearch.toLowerCase().trim();
        const live = m.livePerson;
        const liveLoc = live
          ? live.outOfUnitLocation ||
            live.location ||
            live.leaveAddress ||
            live.courseName ||
            live.hospitalName ||
            live.comdAssignment ||
            live.statusDetails ||
            ''
          : '';
        const match =
          (m.snkNo || '').toLowerCase().includes(q) ||
          (m.name || '').toLowerCase().includes(q) ||
          (m.rk || '').toLowerCase().includes(q) ||
          (m.trade || '').toLowerCase().includes(q) ||
          (m.battery || '').toLowerCase().includes(q) ||
          (m.status || '').toLowerCase().includes(q) ||
          (live?.outOfUnitCategory || '').toLowerCase().includes(q) ||
          liveLoc.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [activeTeamMembersAll, btyFilter, rosterSearch]);

  // Inline quick add search results
  const inlineSearchResults = useMemo(() => {
    if (!activeTeamRecord || !isInlineAddOpen || !inlineSearchQuery.trim()) return [];
    const q = inlineSearchQuery.toLowerCase().trim();
    const existingSet = new Set(activeTeamRecord.memberIds || []);
    return sortBySeniority(
      (personnelList || []).filter((p) => {
        if (existingSet.has(p.id)) return false;
        return (
          (p.snkNo || '').toLowerCase().includes(q) ||
          (p.name || '').toLowerCase().includes(q) ||
          (p.rk || '').toLowerCase().includes(q) ||
          (p.trade || '').toLowerCase().includes(q) ||
          (p.battery || '').toLowerCase().includes(q)
        );
      }),
      ranksList
    ).slice(0, 8);
  }, [activeTeamRecord, isInlineAddOpen, inlineSearchQuery, personnelList, ranksList]);

  // Minimal Create Team Modal & Inline Rename Team Handlers
  const handleOpenAddTeam = () => {
    setInlineEditingTeamKey(null);
    setTeamNameInput('');
    setIsTeamModalOpen(true);
  };

  const startInlineRenameTeam = (grp: TeamGroup) => {
    if (isGuest) return;
    setInlineEditingTeamKey(grp.key);
    setInlineTeamNameInput(grp.name);
  };

  const cancelInlineRenameTeam = () => {
    setInlineEditingTeamKey(null);
    setInlineTeamNameInput('');
  };

  const saveInlineRenameTeam = (grp: TeamGroup) => {
    const trimmedName = inlineTeamNameInput.trim();
    if (!trimmedName) {
      showNotification('অনুগ্রহ করে টিমের নাম লিখুন।');
      return;
    }
    const activeRecs = grp.records.filter((r) => !r.isDeleted);
    if (activeRecs.length > 0) {
      activeRecs.forEach((rec) => {
        updateCustomTeam(rec.id, { name: trimmedName });
      });
    }
    setSelectedTeamKey(trimmedName.toLowerCase());
    setInlineEditingTeamKey(null);
    setInlineTeamNameInput('');
    showNotification(`টিমের নাম পরিবর্তন করে "${trimmedName}" সংরক্ষণ করা হয়েছে।`);
  };

  const handleSaveTeamName = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = teamNameInput.trim();
    if (!trimmedName) {
      showNotification('অনুগ্রহ করে টিমের নাম লিখুন।');
      return;
    }

    const existing = teamGroups.find((g) => g.key === trimmedName.toLowerCase());
    if (existing) {
      setSelectedTeamKey(existing.key);
      showNotification(`"${existing.name}" টিম ইতোমধ্যে তালিকায় আছে।`);
      setIsTeamModalOpen(false);
      return;
    }
    const created = addCustomTeam({
      name: trimmedName,
      year: currentYear,
      description: '',
      memberIds: [],
    });
    setSelectedTeamKey(trimmedName.toLowerCase());
    setSelectedTeamRecordId(created.id);
    setIsTeamModalOpen(false);
  };

  // Minimal Add Year Box Handler
  const handleOpenInlineYearAdd = () => {
    if (!currentTeamGroup) return;
    const existingYears = new Set(currentTeamGroup.years);
    let suggested = currentYear;
    if (existingYears.has(suggested)) {
      suggested = currentTeamGroup.latestYear + 1;
      while (existingYears.has(suggested)) suggested++;
    }
    setNewYearInput(String(suggested));
    setIsAddingYear(true);
    setTimeout(() => newYearInputRef.current?.focus(), 50);
  };

  const handleConfirmAddYear = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTeamGroup) return;
    const parsedYear = Number(newYearInput);
    if (!Number.isFinite(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
      showNotification('সঠিক সাল দিন (২০০০–২১০০)।');
      return;
    }

    const existingForYear = currentTeamGroup.records.find((r) => resolveYear(r) === parsedYear);
    if (existingForYear) {
      setSelectedTeamRecordId(existingForYear.id);
      setIsAddingYear(false);
      showNotification(`${parsedYear} সাল ইতোমধ্যে এই টিমে রয়েছে।`);
      return;
    }

    const created = addCustomTeam({
      name: currentTeamGroup.name,
      year: parsedYear,
      description: '',
      memberIds: [],
    });
    setSelectedTeamRecordId(created.id);
    setIsAddingYear(false);
  };

  const handleRequestDeleteTeam = (team: CustomTeam) => {
    if (isGuest) {
      showNotification('View-Only mode: Cannot delete team.');
      return;
    }
    setTeamPendingDelete(team);
  };

  const handleConfirmDelete = () => {
    if (!teamPendingDelete) return;
    const deleted = deleteCustomTeam(teamPendingDelete.id);
    setTeamPendingDelete(null);
    if (deleted) {
      setActiveUndoToast({ team: deleted, expiresAt: Date.now() + 15000 });
    }
  };

  const handleConfirmPermanentDelete = async () => {
    if (!teamPendingPermDelete) return;
    const targetId = teamPendingPermDelete.id;
    setTeamPendingPermDelete(null);
    await permanentlyDeleteTeam(targetId);
  };

  const handleUndo = (teamToRestore?: CustomTeam) => {
    if (teamToRestore) {
      restoreCustomTeam(teamToRestore);
    } else {
      undoDeleteTeam();
    }
    setActiveUndoToast(null);
  };

  const handlePrintSelectedTeam = () => {
    setTimeout(() => {
      window.print();
    }, 80);
  };

  const handleGoToDutyDetailing = (teamName: string) => {
    setActivePage('duty_detail');
    showNotification(`Duty Detailing-এ "${teamName}" টিম লোড করার জন্য প্রস্তুত।`);
  };

  return (
    <div className="space-y-4 pb-12 animate-fadeIn">
      {/* 1. Header Bar: Clean & Minimal (matching Course & Cadre) */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border p-4 rounded-xl shadow-sm ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className={`text-lg font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Team Management
              </h1>
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                  isLight
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                }`}
              >
                {teamGroups.length} টি টিম
              </span>
            </div>
            <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              10 Medium Regiment Artillery — টিম নির্বাচন করে সাল অনুযায়ী সদস্য তালিকা দেখুন
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 flex-wrap print:hidden">
          <button
            type="button"
            onClick={() => refreshTeamsFromDatabase()}
            disabled={teamsLoading}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
              isLight
                ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300'
            }`}
            title="ডাটাবেজ থেকে রিফ্রেশ করুন"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${teamsLoading ? 'animate-spin text-emerald-500' : ''}`} />
            <span className="hidden sm:inline">রিফ্রেশ</span>
          </button>

          {activeTeamRecord && (
            <button
              type="button"
              onClick={handlePrintSelectedTeam}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                isLight
                  ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300'
              }`}
              title="প্রিন্ট করুন"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">প্রিন্ট</span>
            </button>
          )}

          {recentlyDeletedTeams && recentlyDeletedTeams.length > 0 && (
            <button
              type="button"
              onClick={() => setIsTrashModalOpen(true)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                isLight
                  ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-800'
                  : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/30 text-amber-300'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>পুনরুদ্ধার ({recentlyDeletedTeams.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Layout: Two Panels (Minimal Team Names on Left, Year Boxes + Roster on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Panel: Minimal Team Name List */}
        <div
          className={`lg:col-span-4 border rounded-xl p-3.5 space-y-3 print:hidden ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div
            className={`flex items-center justify-between pb-2 border-b gap-2 ${
              isLight ? 'border-slate-200' : 'border-slate-800'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Users className="w-4 h-4 text-emerald-500 shrink-0" />
              <h2 className={`text-xs font-bold uppercase tracking-wider truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                টিম তালিকা
              </h2>
            </div>
            {!isGuest && (
              <button
                type="button"
                onClick={handleOpenAddTeam}
                className="px-2 py-1 rounded-md text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1 cursor-pointer shadow-xs shrink-0"
                title="নতুন টিমের নাম যোগ করুন"
              >
                <Plus className="w-3 h-3" />
                <span>নতুন টিম</span>
              </button>
            )}
          </div>

          {/* Mobile Dropdown Selector (< lg) */}
          <div className="lg:hidden relative" ref={mobileDropdownRef}>
            <button
              type="button"
              onClick={() => setIsMobileTeamDropdownOpen((prev) => !prev)}
              className={`w-full p-2.5 rounded-lg border flex items-center justify-between gap-2 text-left transition-colors cursor-pointer ${
                isLight
                  ? 'bg-emerald-50/70 border-emerald-500/60 text-slate-900'
                  : 'bg-slate-950 border-emerald-500/50 text-white'
              }`}
            >
              <div className="min-w-0 flex-1 flex items-center gap-2">
                <span className={`text-xs font-bold truncate ${isLight ? 'text-emerald-900' : 'text-emerald-400'}`}>
                  {currentTeamGroup ? currentTeamGroup.name : 'টিম নির্বাচন করুন...'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {currentTeamGroup && (
                  <span
                    className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                      isLight
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}
                  >
                    {currentTeamGroup.records[0] ? resolveTeamMembers(currentTeamGroup.records[0]).length : 0} জন
                  </span>
                )}
                <ChevronDown
                  className={`w-4 h-4 text-emerald-500 transition-transform ${
                    isMobileTeamDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>

            {isMobileTeamDropdownOpen && (
              <div
                className={`mt-2 p-2 rounded-xl border shadow-xl space-y-2 ${
                  isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div className="relative">
                  <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
                  <input
                    type="text"
                    placeholder="টিমের নাম লিখুন..."
                    value={teamSearchQuery}
                    onChange={(e) => setTeamSearchQuery(e.target.value)}
                    className={`w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border focus:outline-none focus:border-emerald-500 ${
                      isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                        : 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500'
                    }`}
                  />
                  {teamSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setTeamSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="space-y-1 max-h-64 overflow-y-auto pr-0.5">
                  {teamsLoading && filteredTeamGroups.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">লোড হচ্ছে...</div>
                  ) : filteredTeamGroups.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">কোনো টিম নেই</div>
                  ) : (
                    filteredTeamGroups.map((grp) => {
                      const isSelected = currentTeamGroup?.key === grp.key;
                      const latestRec = grp.records[0];
                      const memberCount = latestRec ? resolveTeamMembers(latestRec).length : 0;

                      if (inlineEditingTeamKey === grp.key) {
                        return (
                          <div
                            key={grp.key}
                            onClick={(e) => e.stopPropagation()}
                            className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                              isLight
                                ? 'bg-amber-50 border-amber-400 shadow-xs'
                                : 'bg-amber-950/40 border-amber-500/70 shadow-xs'
                            }`}
                          >
                            <input
                              type="text"
                              autoFocus
                              value={inlineTeamNameInput}
                              onChange={(e) => setInlineTeamNameInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveInlineRenameTeam(grp);
                                if (e.key === 'Escape') cancelInlineRenameTeam();
                              }}
                              className={`flex-1 min-w-0 border border-amber-500 rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-400 ${
                                isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => saveInlineRenameTeam(grp)}
                              title="সংরক্ষণ করুন (Enter)"
                              className="p-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shrink-0"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={cancelInlineRenameTeam}
                              title="বাতিল (Esc)"
                              className={`p-1.5 rounded cursor-pointer shrink-0 ${
                                isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                              }`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={grp.key}
                          onClick={() => handleSelectTeamGroup(grp)}
                          className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                            isSelected
                              ? isLight
                                ? 'bg-emerald-50 border-emerald-500'
                                : 'bg-slate-800 border-emerald-500/70'
                              : isLight
                              ? 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                              : 'bg-slate-900/70 border-slate-800 hover:bg-slate-800/50'
                          }`}
                        >
                          <span
                            className={`text-xs font-semibold truncate ${
                              isSelected
                                ? isLight
                                  ? 'text-emerald-900 font-bold'
                                  : 'text-emerald-400 font-bold'
                                : isLight
                                ? 'text-slate-900'
                                : 'text-white'
                            }`}
                          >
                            {grp.name}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                                isSelected
                                  ? isLight
                                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : isLight
                                  ? 'bg-white text-slate-700 border-slate-200'
                                  : 'bg-slate-900 text-slate-300 border-slate-800'
                              }`}
                            >
                              {memberCount} জন
                            </span>
                            {grp.hasActive && !isGuest && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startInlineRenameTeam(grp);
                                }}
                                className={`p-1 rounded cursor-pointer ${
                                  isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-white'
                                }`}
                                title="সরাসরি টিমের নাম পরিবর্তন করুন"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Desktop Team List (lg and above) */}
          <div className="hidden lg:block space-y-3">
            {/* Search Team Name */}
            <div className="relative">
              <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
              <input
                type="text"
                placeholder="টিমের নাম লিখুন..."
                value={teamSearchQuery}
                onChange={(e) => setTeamSearchQuery(e.target.value)}
                className={`w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border focus:outline-none focus:border-emerald-500 ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                    : 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500'
                }`}
              />
              {teamSearchQuery && (
                <button
                  type="button"
                  onClick={() => setTeamSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Clean Team List Items (No Year Clutter) */}
            <div className="space-y-1.5 max-h-[620px] overflow-y-auto pr-0.5 scrollbar-thin">
              {teamsLoading && filteredTeamGroups.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  লোড হচ্ছে...
                </div>
              ) : filteredTeamGroups.length === 0 ? (
                <div
                  className={`py-8 text-center text-xs rounded-lg border border-dashed ${
                    isLight ? 'border-slate-200 text-slate-500' : 'border-slate-800 text-slate-400'
                  }`}
                >
                  কোনো টিম নেই
                </div>
              ) : (
                filteredTeamGroups.map((grp) => {
                  const isSelected = currentTeamGroup?.key === grp.key;
                  const latestRec = grp.records[0];
                  const memberCount = latestRec ? resolveTeamMembers(latestRec).length : 0;

                  if (inlineEditingTeamKey === grp.key) {
                    return (
                      <div
                        key={grp.key}
                        onClick={(e) => e.stopPropagation()}
                        className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                          isLight
                            ? 'bg-amber-50 border-amber-400 shadow-xs'
                            : 'bg-amber-950/40 border-amber-500/70 shadow-xs'
                        }`}
                      >
                        <input
                          type="text"
                          autoFocus
                          value={inlineTeamNameInput}
                          onChange={(e) => setInlineTeamNameInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveInlineRenameTeam(grp);
                            if (e.key === 'Escape') cancelInlineRenameTeam();
                          }}
                          className={`flex-1 min-w-0 border border-amber-500 rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-400 ${
                            isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => saveInlineRenameTeam(grp)}
                          title="সংরক্ষণ করুন (Enter)"
                          className="p-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shrink-0"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelInlineRenameTeam}
                          title="বাতিল (Esc)"
                          className={`p-1.5 rounded cursor-pointer shrink-0 ${
                            isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={grp.key}
                      onClick={() => handleSelectTeamGroup(grp)}
                      className={`group p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? isLight
                            ? 'bg-emerald-50 border-emerald-500 shadow-xs'
                            : 'bg-slate-800 border-emerald-500/70 shadow-xs'
                          : isLight
                          ? 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                          : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold truncate">
                          <span
                            className={
                              isSelected
                                ? isLight
                                  ? 'text-emerald-900 font-bold'
                                  : 'text-emerald-400 font-bold'
                                : isLight
                                ? 'text-slate-900'
                                : 'text-white'
                            }
                          >
                            {grp.name}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`text-xs font-mono font-bold tabular-nums px-2 py-0.5 rounded border ${
                            isSelected
                              ? isLight
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : isLight
                              ? 'bg-white text-slate-700 border-slate-200'
                              : 'bg-slate-900 text-slate-300 border-slate-800'
                          }`}
                        >
                          {memberCount} জন
                        </span>

                        {grp.hasActive && !isGuest && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              startInlineRenameTeam(grp);
                            }}
                            className={`p-1 rounded transition-colors cursor-pointer ${
                              isSelected
                                ? isLight
                                  ? 'hover:bg-emerald-200 text-emerald-800'
                                  : 'hover:bg-slate-700 text-emerald-300'
                                : isLight
                                ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-200'
                                : 'text-slate-500 hover:text-white hover:bg-slate-800'
                            }`}
                            title="সরাসরি টিমের নাম পরিবর্তন করুন"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <ChevronRight
                          className={`w-3.5 h-3.5 transition-transform ${
                            isSelected ? 'text-emerald-500 translate-x-0.5' : isLight ? 'text-slate-400' : 'text-slate-600'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Selected Team -> Minimal Year Boxes on Top + Member Table */}
        <div
          className={`lg:col-span-8 border rounded-xl p-4 space-y-4 ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
          }`}
        >
          {!currentTeamGroup || !activeTeamRecord ? (
            <div className="py-14 text-center space-y-3">
              <div
                className={`w-11 h-11 mx-auto rounded-xl flex items-center justify-center ${
                  isLight ? 'bg-slate-100 text-slate-400' : 'bg-slate-800 text-slate-500'
                }`}
              >
                <Users className="w-5 h-5" />
              </div>
              <p className={`text-sm font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                কোনো টিম নির্বাচিত নেই
              </p>
              <p className={`text-xs max-w-md mx-auto ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                বাম পাশ থেকে একটি টিম নির্বাচন করুন অথবা নতুন টিম যোগ করুন।
              </p>
              {!isGuest && (
                <button
                  type="button"
                  onClick={handleOpenAddTeam}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>নতুন টিম</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Team Header */}
              <div
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b ${
                  isLight ? 'border-slate-200' : 'border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className={`text-base font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {activeTeamRecord.name}
                  </h3>
                  <span
                    className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border ${
                      isLight
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    {resolveYear(activeTeamRecord)}
                  </span>
                  <span
                    className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border ${
                      isLight
                        ? 'bg-slate-100 text-slate-800 border-slate-300'
                        : 'bg-slate-800 text-slate-200 border-slate-700'
                    }`}
                  >
                    {activeTeamMembersAll.length} জন
                  </span>
                  {activeTeamRecord.isDeleted && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-500 border border-amber-500/30 font-semibold">
                      আর্কাইভ
                    </span>
                  )}
                </div>

                {/* Team Action Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap shrink-0 print:hidden">
                  {!activeTeamRecord.isDeleted ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleGoToDutyDetailing(activeTeamRecord.name)}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                          isLight
                            ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                            : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300'
                        }`}
                        title="Duty Detailing পেজে যান"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Duty</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>

                      {!isGuest && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setIsInlineAddOpen((prev) => !prev);
                              setInlineSearchQuery('');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>সৈনিক যুক্ত করুন</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRequestDeleteTeam(activeTeamRecord)}
                            className="p-1.5 rounded-lg border border-rose-500/25 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-colors cursor-pointer"
                            title={`${resolveYear(activeTeamRecord)} সালের এই রেকর্ড আর্কাইভ / ডিলিট করুন`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    !isGuest && (
                      <>
                        <button
                          type="button"
                          onClick={() => restoreCustomTeam(activeTeamRecord)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>পুনরুদ্ধার</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setTeamPendingPermDelete(activeTeamRecord)}
                          className="p-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 cursor-pointer"
                          title="স্থায়ীভাবে মুছুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )
                  )}
                </div>
              </div>

              {/* Minimal Year Boxes Strip */}
              <div className="flex items-center gap-2 flex-wrap">
                {currentTeamGroup.records.map((rec) => {
                  const yr = resolveYear(rec);
                  const count = resolveTeamMembers(rec).length;
                  const isYearSelected = rec.id === activeTeamRecord.id;

                  return (
                    <button
                      key={rec.id}
                      type="button"
                      onClick={() => {
                        setSelectedTeamRecordId(rec.id);
                        setIsInlineAddOpen(false);
                      }}
                      className={`px-3.5 py-2 rounded-lg border font-mono text-xs transition-all cursor-pointer flex items-center gap-2 ${
                        isYearSelected
                          ? isLight
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-xs'
                            : 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-bold shadow-xs'
                          : isLight
                          ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <span>{yr}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          isYearSelected
                            ? isLight
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-emerald-500/20 text-emerald-300'
                            : isLight
                            ? 'bg-white text-slate-500 border border-slate-200'
                            : 'bg-slate-900 text-slate-400 border border-slate-800'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}

                {/* Minimal Inline "+ সাল" Box */}
                {!isGuest && (
                  !isAddingYear ? (
                    <button
                      type="button"
                      onClick={handleOpenInlineYearAdd}
                      className={`px-3 py-2 rounded-lg border border-dashed text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1 print:hidden ${
                        isLight
                          ? 'border-slate-300 text-slate-600 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50/40'
                          : 'border-slate-700 text-slate-400 hover:border-emerald-500/70 hover:text-emerald-300 hover:bg-emerald-500/10'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>সাল</span>
                    </button>
                  ) : (
                    <form
                      onSubmit={handleConfirmAddYear}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border print:hidden ${
                        isLight ? 'bg-white border-emerald-500' : 'bg-slate-950 border-emerald-500'
                      }`}
                    >
                      <input
                        ref={newYearInputRef}
                        type="number"
                        min={2000}
                        max={2100}
                        value={newYearInput}
                        onChange={(e) => setNewYearInput(e.target.value)}
                        placeholder="2025"
                        className={`w-16 text-xs font-mono font-bold bg-transparent focus:outline-none ${
                          isLight ? 'text-slate-900' : 'text-white'
                        }`}
                        required
                      />
                      <button
                        type="submit"
                        className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold cursor-pointer"
                      >
                        যোগ
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingYear(false)}
                        className="p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  )
                )}
              </div>

              {/* Quick Inline Soldier Add Panel */}
              {isInlineAddOpen && !activeTeamRecord.isDeleted && !isGuest && (
                <div
                  className={`p-3 rounded-lg border space-y-2 print:hidden ${
                    isLight ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-950 border-emerald-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className={isLight ? 'text-emerald-900' : 'text-emerald-300'}>
                      {resolveYear(activeTeamRecord)} সালের &ldquo;{activeTeamRecord.name}&rdquo;-এ সৈনিক যুক্ত করুন:
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsInlineAddOpen(false)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={inlineSearchQuery}
                    onChange={(e) => setInlineSearchQuery(e.target.value)}
                    placeholder="সেনা নং, নাম বা পদবি লিখুন..."
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs focus:outline-none focus:border-emerald-500 ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-slate-900 border-slate-700 text-white'
                    }`}
                    autoFocus
                  />
                  {inlineSearchResults.length > 0 && (
                    <div
                      className={`divide-y max-h-44 overflow-y-auto rounded-lg border ${
                        isLight ? 'bg-white border-slate-200 divide-slate-100' : 'bg-slate-900 border-slate-800 divide-slate-800'
                      }`}
                    >
                      {inlineSearchResults.map((soldier) => (
                        <div key={soldier.id} className="p-2 px-3 flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono font-bold text-emerald-500 shrink-0">{soldier.snkNo}</span>
                            <RankBadge rank={soldier.rk} trade={soldier.trade} size="sm" />
                            <span className="font-medium truncate">{soldier.name}</span>
                            <span className="text-[11px] font-mono text-slate-400 shrink-0">({soldier.battery})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              addMemberToTeam(activeTeamRecord.id, soldier.id);
                              showNotification(`${soldier.rk} ${soldier.name} টিমে যোগ করা হয়েছে।`);
                            }}
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs cursor-pointer shrink-0"
                          >
                            + যোগ করুন
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Filter & Search Bar */}
              <div
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-lg border print:hidden ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-1 text-xs flex-wrap">
                  {(['All', 'HQ Bty', 'P Bty', 'Q Bty', 'R Bty', 'EME'] as const).map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBtyFilter(b)}
                      className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
                        btyFilter === b
                          ? 'bg-emerald-600 text-white font-semibold'
                          : isLight
                          ? 'text-slate-600 hover:text-slate-900'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {b === 'All' ? 'সব' : b.replace(' Bty', '')}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
                  <input
                    type="text"
                    placeholder="সেনা নং, নাম বা স্টেটাস খুঁজুন..."
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    className={`pl-8 pr-2.5 py-1 text-xs rounded-lg border focus:outline-none focus:border-emerald-500 w-full sm:w-56 ${
                      isLight
                        ? 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                        : 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500'
                    }`}
                  />
                </div>
              </div>

              {/* Member Roster Table */}
              {filteredRosterMembers.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <div
                    className={`w-10 h-10 mx-auto rounded-lg flex items-center justify-center ${
                      isLight ? 'bg-slate-100 text-slate-400' : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    <Users className="w-5 h-5" />
                  </div>
                  <p className={`text-xs font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    {activeTeamMembersAll.length === 0
                      ? `${resolveYear(activeTeamRecord)} সালে এই টিমে কোনো সদস্য নেই`
                      : 'ফিল্টার অনুযায়ী কোনো সৈনিক পাওয়া যায়নি'}
                  </p>
                  {activeTeamMembersAll.length === 0 && !activeTeamRecord.isDeleted && !isGuest && (
                    <p className="text-[11px] text-slate-500">
                      উপরে &ldquo;সৈনিক যুক্ত করুন&rdquo; বাটনে ক্লিক করে সদস্য যোগ করুন।
                    </p>
                  )}
                </div>
              ) : (
                <div className={`overflow-x-auto rounded-lg border ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr
                        className={`border-b text-[11px] uppercase tracking-wider font-mono ${
                          isLight
                            ? 'border-slate-200 bg-slate-100 text-slate-700'
                            : 'border-slate-800 bg-slate-950/70 text-slate-400'
                        }`}
                      >
                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                        <th className="py-2.5 px-3">সেনা নং</th>
                        <th className="py-2.5 px-3">পদবি, ট্রেড ও নাম</th>
                        <th className="py-2.5 px-3">ব্যাটারী</th>
                        <th className="py-2.5 px-3">বর্তমান স্টেটাস</th>
                        {!activeTeamRecord.isDeleted && !isGuest && (
                          <th className="py-2.5 px-3 text-right print:hidden">অ্যাকশন</th>
                        )}
                      </tr>
                    </thead>
                    <tbody
                      className={`divide-y ${
                        isLight ? 'divide-slate-200 text-slate-800' : 'divide-slate-800/60 text-slate-200'
                      }`}
                    >
                      {filteredRosterMembers.map((m, idx) => {
                        const livePerson = m.livePerson;
                        const personObj: Personnel = livePerson || {
                          id: m.id,
                          snkNo: m.snkNo,
                          rk: m.rk,
                          trade: m.trade || '-',
                          name: m.name,
                          battery: (m.battery as Battery) || 'HQ Bty',
                          status: m.status || 'In Unit',
                          phone: '',
                        };
                        const liveLocationDetails = livePerson
                          ? livePerson.outOfUnitLocation ||
                            livePerson.location ||
                            livePerson.leaveAddress ||
                            livePerson.courseName ||
                            livePerson.hospitalName ||
                            livePerson.comdAssignment ||
                            livePerson.statusDetails
                          : undefined;

                        return (
                          <tr
                            key={m.id || `${m.snkNo}-${idx}`}
                            className={`transition-colors ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'}`}
                          >
                            <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-500">
                              {idx + 1}
                            </td>
                            <td
                              className={`py-2.5 px-3 font-mono font-bold whitespace-nowrap ${
                                isLight ? 'text-emerald-700' : 'text-emerald-400'
                              }`}
                            >
                              {m.snkNo}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <RankBadge rank={m.rk} trade={personObj.trade} size="sm" />
                                {onViewDossier && livePerson ? (
                                  <button
                                    type="button"
                                    onClick={() => onViewDossier(personObj)}
                                    className={`font-medium hover:underline cursor-pointer text-left transition-colors ${
                                      isLight
                                        ? 'text-slate-900 hover:text-emerald-700'
                                        : 'text-white hover:text-emerald-400'
                                    }`}
                                    title="ক্লিক করে ডসিয়ার দেখুন"
                                  >
                                    {m.name}
                                  </button>
                                ) : (
                                  <span className={isLight ? 'text-slate-900 font-medium' : 'text-white font-medium'}>
                                    {m.name}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono border ${
                                  isLight
                                    ? 'bg-slate-100 text-slate-800 border-slate-300'
                                    : 'bg-slate-800 text-slate-300 border-slate-700'
                                }`}
                              >
                                {m.battery}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <StatusBadge
                                status={personObj.status}
                                outOfUnitCategory={personObj.outOfUnitCategory}
                                details={liveLocationDetails}
                                size="sm"
                              />
                            </td>
                            {!activeTeamRecord.isDeleted && !isGuest && (
                              <td className="py-2.5 px-3 text-right print:hidden">
                                <button
                                  type="button"
                                  onClick={() => removeMemberFromTeam(activeTeamRecord.id, m.id)}
                                  className="p-1.5 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                                  title="টিম থেকে বাদ দিন"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 3. MINIMAL ADD TEAM MODAL (Just Team Name, identical to Course & Cadre) */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn print:hidden">
          <div
            className={`relative w-full max-w-md border rounded-xl shadow-2xl p-5 space-y-4 ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
            }`}
          >
            <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">নতুন টিম যুক্ত করুন</h3>
                  <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    শুধুমাত্র টিমের নাম লিখে যুক্ত করুন
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTeamModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTeamName} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1.5">
                  টিমের নাম (Team Name) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={teamNameInput}
                  onChange={(e) => setTeamNameInput(e.target.value)}
                  placeholder="যেমন: Athletics Team, Shooting Team"
                  className={`w-full rounded-lg border p-2.5 focus:outline-none focus:border-emerald-500 ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                      : 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
                  }`}
                  required
                  autoFocus
                />
              </div>

              <div className={`pt-3 border-t flex items-center justify-end gap-2 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(false)}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                    isLight ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer shadow-sm transition-colors inline-flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>টিম তৈরি করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. CONFIRM ARCHIVE / DELETE MODAL */}
      {teamPendingDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div
            className={`border rounded-xl w-full max-w-md shadow-2xl p-5 space-y-4 ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
            }`}
          >
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-9 h-9 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold">টিম আর্কাইভ / অপসারণ</h3>
                <p className="text-xs text-slate-400">Confirm Archive Team</p>
              </div>
            </div>

            <div
              className={`p-3 rounded-lg border space-y-1.5 text-xs ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}
            >
              <p>
                আপনি কি{' '}
                <span className="font-bold font-mono">
                  &ldquo;{teamPendingDelete.name}&rdquo; ({resolveYear(teamPendingDelete)})
                </span>{' '}
                আর্কাইভে সরাতে চান?
              </p>
              <p className="text-[11px] text-slate-400 font-mono">
                সদস্য: {teamPendingDelete.memberIds.length} জন • প্রয়োজনে পুনরুদ্ধার করা যাবে।
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setTeamPendingDelete(null)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer flex items-center gap-1.5"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>আর্কাইভ করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. CONFIRM PERMANENT DELETE MODAL */}
      {teamPendingPermDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div
            className={`border rounded-xl w-full max-w-md shadow-2xl p-5 space-y-4 ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
            }`}
          >
            <div className="flex items-center gap-2.5 text-rose-500">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold">ডাটাবেজ থেকে স্থায়ীভাবে মুছুন?</h3>
            </div>
            <p className="text-xs text-slate-400">
              &ldquo;{teamPendingPermDelete.name}&rdquo; ({resolveYear(teamPendingPermDelete)}) স্থায়ীভাবে ডাটাবেজ থেকে মুছে যাবে।
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setTeamPendingPermDelete(null)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-slate-300'
                }`}
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleConfirmPermanentDelete}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
              >
                স্থায়ীভাবে মুছুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. FLOATING UNDO TOAST */}
      {activeUndoToast && (
        <div className="fixed bottom-5 right-4 sm:right-8 z-50 bg-slate-900/95 border border-emerald-500/60 shadow-xl p-3 rounded-xl flex items-center gap-3 text-white max-w-md backdrop-blur-md print:hidden">
          <RotateCcw className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">&ldquo;{activeUndoToast.team.name}&rdquo; আর্কাইভ হয়েছে</p>
          </div>
          <button
            type="button"
            onClick={() => handleUndo(activeUndoToast.team)}
            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveUndoToast(null)}
            className="p-1 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 7. RECENTLY DELETED TEAMS RECOVERY MODAL */}
      {isTrashModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:hidden">
          <div
            className={`border rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
            }`}
          >
            <div
              className={`px-5 py-3.5 border-b flex items-center justify-between ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-bold">আর্কাইভ / মোছা টিম পুনরুদ্ধার</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTrashModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-2.5 flex-1">
              {recentlyDeletedTeams.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">কোনো আর্কাইভ টিম নেই।</div>
              ) : (
                recentlyDeletedTeams.map((team) => (
                  <div
                    key={team.id}
                    className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold truncate">{team.name}</h4>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-semibold border border-emerald-500/30">
                          {resolveYear(team)}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                        {team.memberIds.length} জন সদস্য
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleUndo(team);
                        if (recentlyDeletedTeams.length <= 1) setIsTrashModalOpen(false);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>পুনরুদ্ধার</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
