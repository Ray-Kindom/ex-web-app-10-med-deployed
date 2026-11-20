import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { CustomTeam, Personnel, Battery, ALL_BATTERIES } from '../types';
import { sortBySeniority } from '../utils/seniorityUtils';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  Search,
  Check,
  X,
  ShieldAlert,
  ArrowRight,
  UserPlus,
  Calendar,
  RefreshCw,
  RotateCcw,
  Undo2,
  AlertTriangle,
  History,
  Eye,
  EyeOff,
  Archive,
  Database,
  Table2,
  LayoutGrid,
  Printer,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface TeamsPageProps {
  onViewDossier?: (p: Personnel) => void;
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

  // Tabs & View Mode
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [selectedYear, setSelectedYear] = useState<number | 'All'>('All');
  const [expandedRosterIds, setExpandedRosterIds] = useState<Record<string, boolean>>({});
  const [expandAllRosters, setExpandAllRosters] = useState(false);

  const toggleRosterExpand = (id: string) => {
    setExpandedRosterIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Create / Edit Team Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [teamNameInput, setTeamNameInput] = useState('');
  const [teamYearInput, setTeamYearInput] = useState<number>(currentYear);
  const [teamDescInput, setTeamDescInput] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  // Delete / Undo / Trash states
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

  // Member picker search & filter inside Modal
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [pickerBatteryFilter, setPickerBatteryFilter] = useState<Battery | 'All'>('All');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Team search filter
  const [teamFilterQuery, setTeamFilterQuery] = useState('');

  // Inline quick add soldier
  const [inlineAddingTeamId, setInlineAddingTeamId] = useState<string | null>(null);
  const [inlineSearchQuery, setInlineSearchQuery] = useState('');

  // Map of personnel by ID and snkNo for fast lookup
  const personnelMap = useMemo(() => {
    const map = new Map<string, Personnel>();
    (personnelList || []).forEach((p) => {
      map.set(p.id, p);
      if (p.snkNo) {
        map.set(p.snkNo, p);
      }
    });
    return map;
  }, [personnelList]);

  // All available years from DB teams + current/previous year
  const availableYears = useMemo(() => {
    const yearSet = new Set<number>([currentYear, currentYear - 1]);
    customTeams.forEach((t) => yearSet.add(resolveYear(t)));
    teamHistory.forEach((t) => yearSet.add(resolveYear(t)));
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [customTeams, teamHistory, currentYear]);

  // Count teams per year for current activeTab
  const yearTeamCounts = useMemo(() => {
    const source = activeTab === 'active' ? customTeams : teamHistory;
    const counts: Record<number, number> = {};
    source.forEach((t) => {
      const yr = resolveYear(t);
      counts[yr] = (counts[yr] || 0) + 1;
    });
    return counts;
  }, [activeTab, customTeams, teamHistory]);

  // Resolve full member objects for either Active or Archived team
  const resolveTeamMembers = (team: CustomTeam) => {
    if (team.isDeleted && Array.isArray(team.snapshotMembers) && team.snapshotMembers.length > 0) {
      return team.snapshotMembers.map((m) => ({
        id: m.id,
        snkNo: m.snkNo,
        rk: m.rk,
        name: m.name,
        battery: m.battery,
        trade: m.trade || '-',
        status: m.status || 'Archived',
        livePerson: personnelMap.get(m.id) || personnelMap.get(m.snkNo),
      }));
    }

    const resolved = (team.memberIds || [])
      .map((id) => personnelMap.get(id))
      .filter(Boolean) as Personnel[];

    return sortBySeniority(resolved, ranksList).map((p) => ({
      id: p.id,
      snkNo: p.snkNo,
      rk: p.rk,
      name: p.name,
      battery: p.battery,
      trade: p.trade || '-',
      status: p.status || 'In Unit',
      livePerson: p,
    }));
  };

  // Filtered teams (Year + Search, sorted by Year desc then name)
  const filteredTeams = useMemo(() => {
    let list = [...customTeams];
    if (selectedYear !== 'All') {
      list = list.filter((t) => resolveYear(t) === selectedYear);
    }
    if (teamFilterQuery.trim()) {
      const q = teamFilterQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          String(resolveYear(t)).includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => resolveYear(b) - resolveYear(a) || a.name.localeCompare(b.name));
  }, [customTeams, selectedYear, teamFilterQuery]);

  const filteredHistoryTeams = useMemo(() => {
    let list = [...teamHistory];
    if (selectedYear !== 'All') {
      list = list.filter((t) => resolveYear(t) === selectedYear);
    }
    if (teamFilterQuery.trim()) {
      const q = teamFilterQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          String(resolveYear(t)).includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.deletedBy && t.deletedBy.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => resolveYear(b) - resolveYear(a));
  }, [teamHistory, selectedYear, teamFilterQuery]);

  // Open form for creating a new team
  const handleOpenCreateForm = () => {
    setEditingTeamId(null);
    setTeamNameInput('');
    setTeamYearInput(selectedYear === 'All' ? currentYear : selectedYear);
    setTeamDescInput('');
    setSelectedMemberIds([]);
    setMemberSearchQuery('');
    setIsFormOpen(true);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  // Open form for editing an existing team
  const handleOpenEditForm = (team: CustomTeam) => {
    setEditingTeamId(team.id);
    setTeamNameInput(team.name);
    setTeamYearInput(resolveYear(team));
    setTeamDescInput(team.description || '');
    setSelectedMemberIds([...(team.memberIds || [])]);
    setMemberSearchQuery('');
    setIsFormOpen(true);
  };

  const handleToggleMember = (personnelId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(personnelId) ? prev.filter((id) => id !== personnelId) : [...prev, personnelId]
    );
  };

  const handleSaveTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamNameInput.trim()) {
      showNotification('অনুগ্রহ করে টিমের একটি নাম দিন।');
      return;
    }
    const parsedYear = Math.min(2100, Math.max(2000, Number(teamYearInput) || currentYear));

    if (editingTeamId) {
      updateCustomTeam(editingTeamId, {
        name: teamNameInput.trim(),
        year: parsedYear,
        description: teamDescInput.trim(),
        memberIds: selectedMemberIds,
      });
    } else {
      addCustomTeam({
        name: teamNameInput.trim(),
        year: parsedYear,
        description: teamDescInput.trim(),
        memberIds: selectedMemberIds,
      });
    }

    setIsFormOpen(false);
    setEditingTeamId(null);
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

  const handleToggleExpandAll = () => {
    const next = !expandAllRosters;
    setExpandAllRosters(next);
    const list = activeTab === 'active' ? filteredTeams : filteredHistoryTeams;
    const map: Record<string, boolean> = {};
    list.forEach((t) => {
      map[t.id] = next;
    });
    setExpandedRosterIds(map);
  };

  const handlePrintTeams = () => {
    const list = activeTab === 'active' ? filteredTeams : filteredHistoryTeams;
    const map: Record<string, boolean> = {};
    list.forEach((t) => {
      map[t.id] = true;
    });
    setExpandAllRosters(true);
    setExpandedRosterIds(map);
    setTimeout(() => {
      window.print();
    }, 120);
  };

  // Filtered available personnel in picker modal
  const filteredPickerPersonnel = useMemo(() => {
    let list = personnelList || [];
    if (pickerBatteryFilter !== 'All') {
      list = list.filter((p) => p.battery === pickerBatteryFilter);
    }
    if (memberSearchQuery.trim()) {
      const q = memberSearchQuery.toLowerCase().trim();
      list = list.filter((p) => {
        const snk = (p.snkNo || '').toLowerCase();
        const name = (p.name || '').toLowerCase();
        const rk = (p.rk || '').toLowerCase();
        return snk.includes(q) || name.includes(q) || rk.includes(q);
      });
    }
    return sortBySeniority(list, ranksList);
  }, [personnelList, pickerBatteryFilter, memberSearchQuery, ranksList]);

  const handleGoToDutyDetailing = (teamName: string) => {
    setActivePage('duty_detail');
    showNotification(`Duty Detailing-এ "${teamName}" টিম লোড করার জন্য প্রস্তুত।`);
  };

  const currentList = activeTab === 'active' ? filteredTeams : filteredHistoryTeams;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 px-2 sm:px-4 py-3">
      {/* 1. TOP HEADER & CONTROLS */}
      <div
        className={`rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900/95 border-slate-800'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-600 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-rose-950/40 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className={`text-lg sm:text-xl font-bold tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Team Management / টিম ম্যানেজমেন্ট
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-500 border border-rose-500/30 font-mono font-bold">
                {activeTab === 'active' ? `${customTeams.length} টি সক্রিয়` : `${teamHistory.length} টি হিস্ট্রিতে`}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 font-mono font-semibold flex items-center gap-1">
                <Database className="w-3 h-3" />
                <span>Supabase Year DB</span>
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              ডাটাবেজে থাকা সাল-ভিত্তিক টিমের তালিকা দেখুন — প্রয়োজনে যেকোনো সালের পুরো সদস্য তালিকা এক্সপ্যান্ড বা প্রিন্ট করুন।
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap print:hidden">
          {/* Search team */}
          <div className="relative flex-1 min-w-[180px] sm:w-52">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={teamFilterQuery}
              onChange={(e) => setTeamFilterQuery(e.target.value)}
              placeholder="টিম বা সাল খুঁজুন..."
              className={`w-full pl-8 pr-7 py-2 rounded-xl border text-xs focus:outline-none focus:border-rose-500 ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  : 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
              }`}
            />
            {teamFilterQuery && (
              <button
                type="button"
                onClick={() => setTeamFilterQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Refresh from Supabase */}
          <button
            type="button"
            onClick={() => refreshTeamsFromDatabase()}
            disabled={teamsLoading}
            className={`px-3 py-2 rounded-xl border text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
            }`}
            title="ডাটাবেজ থেকে পুনরায় লোড করুন"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${teamsLoading ? 'animate-spin text-rose-500' : ''}`} />
            <span className="hidden sm:inline">রিফ্রেশ</span>
          </button>

          {/* Deleted Teams Recovery */}
          {recentlyDeletedTeams && recentlyDeletedTeams.length > 0 && (
            <button
              type="button"
              onClick={() => setIsTrashModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-500 border border-amber-500/30 text-xs font-mono font-bold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
              title="আর্কাইভ / মোছা টিম পুনরুদ্ধার করুন"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>পুনরুদ্ধার ({recentlyDeletedTeams.length})</span>
            </button>
          )}

          {!isGuest && (
            <button
              type="button"
              onClick={handleOpenCreateForm}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-bold font-mono transition-all cursor-pointer shadow-lg shadow-rose-900/30 flex items-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন টিম যোগ করুন</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. NAVIGATION TABS, YEAR SELECTOR & VIEW MODE */}
      <div
        className={`p-3 rounded-2xl border space-y-3 print:hidden ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-950/70 border-slate-800/80'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Active vs History Tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'active'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-900/30'
                  : isLight
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>সক্রিয় টিম (Active)</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === 'active'
                    ? 'bg-rose-700 text-white'
                    : isLight
                    ? 'bg-slate-200 text-slate-700'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {customTeams.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-900/30'
                  : isLight
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>আর্কাইভ / হিস্ট্রি</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === 'history'
                    ? 'bg-amber-700 text-white'
                    : isLight
                    ? 'bg-slate-200 text-slate-700'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {teamHistory.length}
              </span>
            </button>
          </div>

          {/* View Mode & Full List Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div
              className={`inline-flex rounded-xl p-1 border ${
                isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-900 border-slate-800'
              }`}
            >
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Table2 className="w-3.5 h-3.5" />
                <span>ডাটাবেজ টেবিল</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>কার্ড ভিউ</span>
              </button>
            </div>

            {viewMode === 'table' && currentList.length > 0 && (
              <button
                type="button"
                onClick={handleToggleExpandAll}
                className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  isLight
                    ? 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
                }`}
              >
                {expandAllRosters ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-amber-500" />}
                <span>{expandAllRosters ? 'সব তালিকা লুকান' : 'সব টিমের পুরো তালিকা দেখুন'}</span>
              </button>
            )}

            {currentList.length > 0 && (
              <button
                type="button"
                onClick={handlePrintTeams}
                className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  isLight
                    ? 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
                }`}
                title="পুরো তালিকা প্রিন্ট করুন"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-500" />
                <span>প্রিন্ট</span>
              </button>
            )}
          </div>
        </div>

        {/* Year Partition Selector Pills */}
        <div
          className={`pt-2.5 border-t flex items-center gap-2 flex-wrap ${
            isLight ? 'border-slate-200' : 'border-slate-800/80'
          }`}
        >
          <span
            className={`text-xs font-mono font-bold flex items-center gap-1.5 mr-1 ${
              isLight ? 'text-slate-600' : 'text-slate-400'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-rose-500" />
            <span>সাল অনুযায়ী ডাটাবেজ টেবিল:</span>
          </span>

          <button
            type="button"
            onClick={() => setSelectedYear('All')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
              selectedYear === 'All'
                ? 'bg-rose-600 text-white shadow-sm'
                : isLight
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            সকল সাল ({activeTab === 'active' ? customTeams.length : teamHistory.length})
          </button>

          {availableYears.map((yr) => {
            const count = yearTeamCounts[yr] || 0;
            const isSelected = selectedYear === yr;
            return (
              <button
                key={yr}
                type="button"
                onClick={() => setSelectedYear(yr)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-rose-600 text-white shadow-sm'
                    : isLight
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                <span>{yr} সাল</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isSelected
                      ? 'bg-rose-700 text-white'
                      : isLight
                      ? 'bg-slate-200 text-slate-700'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. CREATE / EDIT TEAM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto print:hidden">
          <div
            className={`border rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
            }`}
          >
            <div
              className={`px-5 py-4 border-b flex items-center justify-between ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-600/20 text-rose-500 border border-rose-500/30 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold">
                    {editingTeamId ? 'টিম এডিট করুন / Edit Team' : 'নতুন টিম তৈরি করুন / Create Team'}
                  </h2>
                  <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    টিমের নাম, সাল (Year) এবং সৈনিক তালিকা নির্ধারণ করে ডাটাবেজে সংরক্ষণ করুন
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTeam} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-5 space-y-1">
                  <label className="text-xs font-mono font-semibold block">
                    টিমের নাম (Team Name) *
                  </label>
                  <input
                    type="text"
                    required
                    value={teamNameInput}
                    onChange={(e) => setTeamNameInput(e.target.value)}
                    placeholder="যেমন: Athletics Team, Firing Team..."
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-rose-500 font-mono ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900'
                        : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-mono font-semibold block">
                    সাল (Year) *
                  </label>
                  <input
                    type="number"
                    required
                    min={2000}
                    max={2100}
                    value={teamYearInput}
                    onChange={(e) => setTeamYearInput(Number(e.target.value) || currentYear)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-rose-500 font-mono font-bold ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900'
                        : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  />
                </div>

                <div className="sm:col-span-5 space-y-1">
                  <label className="text-xs font-mono font-semibold block">
                    বিবরণ / নোট (Description)
                  </label>
                  <input
                    type="text"
                    value={teamDescInput}
                    onChange={(e) => setTeamDescInput(e.target.value)}
                    placeholder="যেমন: বার্ষিক প্রতিযোগিতা দল..."
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-rose-500 ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900'
                        : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  />
                </div>
              </div>

              {/* Selected Soldiers Chips */}
              <div className={`space-y-2 pt-2 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold flex items-center gap-2">
                    <span>নির্বাচিত সদস্যবৃন্দ:</span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-500 font-mono text-[11px] font-bold border border-rose-500/30">
                      {selectedMemberIds.length} জন
                    </span>
                  </label>
                  {selectedMemberIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedMemberIds([])}
                      className="text-[11px] font-mono text-rose-500 hover:underline cursor-pointer"
                    >
                      সব বাতিল করুন
                    </button>
                  )}
                </div>

                {selectedMemberIds.length > 0 ? (
                  <div
                    className={`flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 border rounded-xl ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'
                    }`}
                  >
                    {selectedMemberIds.map((id) => {
                      const p = personnelMap.get(id);
                      if (!p) return null;
                      return (
                        <span
                          key={id}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono ${
                            isLight
                              ? 'bg-white text-slate-800 border-slate-300'
                              : 'bg-slate-800 text-slate-200 border-slate-700'
                          }`}
                        >
                          <span className="font-bold text-rose-500">{p.snkNo}</span>
                          <span>{p.rk} {p.name}</span>
                          <span className="text-[10px] text-slate-400">({p.battery})</span>
                          <button
                            type="button"
                            onClick={() => handleToggleMember(id)}
                            className="text-slate-400 hover:text-rose-500 ml-0.5 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    className={`p-3 rounded-xl border border-dashed text-center text-xs font-mono ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-500' : 'bg-slate-950/50 border-slate-800 text-slate-500'
                    }`}
                  >
                    এখনও কোনো সৈনিক নির্বাচন করা হয়নি। নিচের তালিকা থেকে সিলেক্ট করুন।
                  </div>
                )}
              </div>

              {/* Soldier Search & Picker */}
              <div className={`space-y-2 pt-2 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      placeholder="সৈনিক খুঁজুন (Army No, Name, Rank)..."
                      className={`w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs focus:outline-none focus:border-rose-500 font-mono ${
                        isLight
                          ? 'bg-slate-50 border-slate-300 text-slate-900'
                          : 'bg-slate-950 border-slate-700 text-white'
                      }`}
                    />
                  </div>
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                    {(['All', ...ALL_BATTERIES] as const).map((bty) => (
                      <button
                        key={bty}
                        type="button"
                        onClick={() => setPickerBatteryFilter(bty)}
                        className={`px-2 py-1 rounded-md text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                          pickerBatteryFilter === bty
                            ? 'bg-rose-600 text-white'
                            : isLight
                            ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {bty}
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  className={`border rounded-xl overflow-hidden max-h-56 overflow-y-auto divide-y ${
                    isLight ? 'border-slate-200 divide-slate-100 bg-white' : 'border-slate-800 divide-slate-800 bg-slate-950'
                  }`}
                >
                  {filteredPickerPersonnel.length > 0 ? (
                    filteredPickerPersonnel.map((soldier) => {
                      const isSelected = selectedMemberIds.includes(soldier.id);
                      return (
                        <div
                          key={soldier.id}
                          onClick={() => handleToggleMember(soldier.id)}
                          className={`p-2 px-3 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                            isSelected
                              ? isLight
                                ? 'bg-rose-50 border-l-2 border-rose-500'
                                : 'bg-rose-950/40 border-l-2 border-rose-500'
                              : isLight
                              ? 'hover:bg-slate-50'
                              : 'hover:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded border-slate-400 text-rose-600 pointer-events-none"
                            />
                            <span className="text-xs font-mono font-bold text-rose-500">
                              {soldier.snkNo}
                            </span>
                            <span className="text-xs font-semibold truncate">
                              {soldier.rk} {soldier.name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              ({soldier.battery})
                            </span>
                            <span
                              className={`text-[10px] px-1.5 rounded font-mono ${
                                isLight ? 'bg-slate-100 text-slate-600' : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {soldier.trade}
                            </span>
                          </div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-mono font-bold shrink-0 ${
                              isSelected
                                ? 'bg-rose-600 text-white'
                                : isLight
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {isSelected ? 'Selected' : '+ Add'}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-xs font-mono text-slate-500">
                      কোনো সৈনিক খুঁজে পাওয়া যায়নি।
                    </div>
                  )}
                </div>
              </div>

              <div className={`pt-3 border-t flex items-center justify-end gap-2 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-semibold cursor-pointer ${
                    isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold shadow-lg shadow-rose-900/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingTeamId ? 'ডাটাবেজে আপডেট করুন' : 'ডাটাবেজে সংরক্ষণ করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. MAIN CONTENT: LOADING / EMPTY / DATABASE TABLE OR CARDS */}
      {teamsLoading && currentList.length === 0 ? (
        <div
          className={`p-12 text-center rounded-2xl border space-y-3 ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-800'
          }`}
        >
          <RefreshCw className="w-7 h-7 animate-spin text-rose-500 mx-auto" />
          <p className={`text-sm font-mono ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
            Supabase ডাটাবেজ থেকে টিমের তালিকা লোড হচ্ছে...
          </p>
        </div>
      ) : currentList.length === 0 ? (
        <div
          className={`p-12 text-center border border-dashed rounded-2xl space-y-3 ${
            isLight ? 'bg-white border-slate-300' : 'bg-slate-900/50 border-slate-800'
          }`}
        >
          <div
            className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${
              isLight ? 'bg-slate-100 text-slate-500' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {activeTab === 'active' ? <Database className="w-6 h-6" /> : <Archive className="w-6 h-6" />}
          </div>
          <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {selectedYear === 'All'
              ? activeTab === 'active'
                ? 'ডাটাবেজে কোনো সক্রিয় টিম সংরক্ষিত নেই'
                : 'আর্কাইভ হিস্ট্রিতে কোনো টিম নেই'
              : `${selectedYear} সালে ডাটাবেজে কোনো টিম সংরক্ষিত নেই`}
          </h3>
          <p className={`text-xs max-w-md mx-auto ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            এই ভিউতে শুধুমাত্র Supabase ডাটাবেজে সংরক্ষিত রেকর্ড দেখানো হয়। প্রয়োজন অনুযায়ী নতুন টিম তৈরি করে নির্দিষ্ট সালে সংরক্ষণ করুন।
          </p>
          {activeTab === 'active' && !isGuest && (
            <button
              type="button"
              onClick={handleOpenCreateForm}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold font-mono transition-colors cursor-pointer inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন টিম তৈরি করুন ({selectedYear === 'All' ? currentYear : selectedYear})</span>
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* --- YEAR-PARTITIONED DATABASE TABLE VIEW --- */
        <div
          className={`rounded-2xl border shadow-xl overflow-hidden ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-slate-800'
          }`}
        >
          <div
            className={`px-4 py-3 border-b flex items-center justify-between gap-2 flex-wrap ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Table2 className="w-4 h-4 text-rose-500" />
              <span className={`text-xs font-mono font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>
                {selectedYear === 'All'
                  ? 'সকল সালের টিম ডাটাবেজ তালিকা'
                  : `${selectedYear} সালের টিম ডাটাবেজ টেবিল`}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-500 text-[11px] font-mono font-bold border border-rose-500/30">
                মোট {currentList.length}টি টিম
              </span>
            </div>
            <span className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              "পুরো তালিকা" ক্লিক করলে ওই টিমের সকল সৈনিকের তালিকা দেখা যাবে
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr
                  className={`border-b text-[11px] font-mono uppercase tracking-wider ${
                    isLight
                      ? 'bg-slate-100 border-slate-200 text-slate-600'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <th className="py-3 px-3 text-center w-12">SL</th>
                  <th className="py-3 px-3 w-24">সাল (Year)</th>
                  <th className="py-3 px-3">টিমের নাম ও বিবরণ</th>
                  <th className="py-3 px-3 text-center w-28">সদস্য</th>
                  <th className="py-3 px-3">ব্যাটারি বিভাজন</th>
                  <th className="py-3 px-3 text-center w-28">অবস্থা</th>
                  <th className="py-3 px-3 text-right print:hidden">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className={isLight ? 'divide-y divide-slate-200' : 'divide-y divide-slate-800'}>
                {currentList.map((team, idx) => {
                  const yr = resolveYear(team);
                  const members = resolveTeamMembers(team);
                  const isExpanded = Boolean(expandedRosterIds[team.id]);
                  const btyBreakdown: Record<string, number> = {
                    'HQ Bty': 0,
                    'P Bty': 0,
                    'Q Bty': 0,
                    'R Bty': 0,
                  };
                  members.forEach((m) => {
                    if (btyBreakdown[m.battery] !== undefined) {
                      btyBreakdown[m.battery]++;
                    }
                  });

                  return (
                    <React.Fragment key={team.id}>
                      <tr
                        className={`transition-colors ${
                          isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-3 px-3 text-center font-mono text-xs text-slate-400">
                          {idx + 1}.
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-500 border border-rose-500/30 text-xs font-mono font-bold">
                            {yr}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            {team.name}
                          </div>
                          {team.description && (
                            <div className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                              {team.description}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${
                              isLight
                                ? 'bg-slate-100 text-slate-800 border-slate-300'
                                : 'bg-slate-800 text-amber-300 border-slate-700'
                            }`}
                          >
                            {members.length} জন
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1 flex-wrap text-[11px] font-mono">
                            {ALL_BATTERIES.map((bty) => (
                              <span
                                key={bty}
                                className={`px-1.5 py-0.5 rounded border ${
                                  isLight
                                    ? 'bg-slate-100 text-slate-700 border-slate-200'
                                    : 'bg-slate-950 text-slate-300 border-slate-800'
                                }`}
                              >
                                {bty.replace(' Bty', '')}: {btyBreakdown[bty]}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {activeTab === 'active' ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-[11px] font-mono font-bold">
                              সক্রিয়
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[11px] font-mono font-bold">
                              আর্কাইভ
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right print:hidden">
                          <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                            <button
                              type="button"
                              onClick={() => toggleRosterExpand(team.id)}
                              className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                                isExpanded
                                  ? 'bg-rose-600 text-white border-rose-600'
                                  : isLight
                                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                              }`}
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="w-3.5 h-3.5" />
                                  <span>লুকান</span>
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3.5 h-3.5 text-amber-500" />
                                  <span>পুরো তালিকা ({members.length})</span>
                                </>
                              )}
                            </button>

                            {activeTab === 'active' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleGoToDutyDetailing(team.name)}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-500 border border-emerald-500/30 text-xs font-mono font-bold cursor-pointer"
                                  title="Duty Detailing-এ লোড করুন"
                                >
                                  Duty
                                </button>
                                {!isGuest && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditForm(team)}
                                      className={`p-1.5 rounded-lg border cursor-pointer ${
                                        isLight
                                          ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-amber-600'
                                          : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-400'
                                      }`}
                                      title="এডিট"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRequestDeleteTeam(team)}
                                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 cursor-pointer"
                                      title="আর্কাইভ / ডিলিট"
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
                                    onClick={() => {
                                      restoreCustomTeam(team);
                                      setActiveTab('active');
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-mono font-bold cursor-pointer flex items-center gap-1"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Restore</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setTeamPendingPermDelete(team)}
                                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 cursor-pointer"
                                    title="ডাটাবেজ থেকে স্থায়ীভাবে মুছুন"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* EXPANDED FULL MEMBER ROSTER ROW */}
                      {isExpanded && (
                        <tr>
                          <td
                            colSpan={7}
                            className={`p-3 sm:p-4 ${
                              isLight ? 'bg-slate-50/90' : 'bg-slate-950/70'
                            }`}
                          >
                            <div
                              className={`rounded-xl border overflow-hidden ${
                                isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                              }`}
                            >
                              <div
                                className={`px-3 py-2 border-b flex items-center justify-between text-xs font-mono font-bold ${
                                  isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-950 border-slate-800 text-slate-300'
                                }`}
                              >
                                <span>
                                  {team.name} ({yr} সাল) — সম্পূর্ণ সদস্য তালিকা ({members.length} জন)
                                </span>
                                {activeTab === 'active' && !isGuest && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditForm(team)}
                                    className="text-rose-500 hover:underline cursor-pointer print:hidden"
                                  >
                                    + সদস্য পরিবর্তন করুন
                                  </button>
                                )}
                              </div>

                              {members.length > 0 ? (
                                <table className="w-full text-xs border-collapse">
                                  <thead>
                                    <tr
                                      className={`border-b text-[11px] font-mono ${
                                        isLight
                                          ? 'bg-slate-50 border-slate-200 text-slate-600'
                                          : 'bg-slate-950/60 border-slate-800 text-slate-400'
                                      }`}
                                    >
                                      <th className="py-2 px-3 text-center w-12">SL</th>
                                      <th className="py-2 px-3">Army No</th>
                                      <th className="py-2 px-3">Rank & Name</th>
                                      <th className="py-2 px-3 text-center">Battery</th>
                                      <th className="py-2 px-3 text-center">Trade</th>
                                      <th className="py-2 px-3 text-center">Status</th>
                                      {activeTab === 'active' && !isGuest && (
                                        <th className="py-2 px-3 text-right print:hidden">Action</th>
                                      )}
                                    </tr>
                                  </thead>
                                  <tbody className={isLight ? 'divide-y divide-slate-100' : 'divide-y divide-slate-800/70'}>
                                    {members.map((m, mIdx) => (
                                      <tr
                                        key={m.id || mIdx}
                                        className={isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'}
                                      >
                                        <td className="py-2 px-3 text-center font-mono text-slate-400">
                                          {mIdx + 1}.
                                        </td>
                                        <td className="py-2 px-3 font-mono font-bold">
                                          <span
                                            className={`px-1.5 py-0.5 rounded border ${
                                              isLight
                                                ? 'bg-slate-100 text-slate-900 border-slate-300'
                                                : 'bg-slate-800 text-amber-300 border-slate-700'
                                            }`}
                                          >
                                            {m.snkNo}
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 font-semibold">
                                          {onViewDossier && m.livePerson ? (
                                            <button
                                              type="button"
                                              onClick={() => onViewDossier(m.livePerson!)}
                                              className="hover:text-rose-500 hover:underline cursor-pointer text-left"
                                            >
                                              {m.rk} {m.name}
                                            </button>
                                          ) : (
                                            <span>
                                              {m.rk} {m.name}
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-2 px-3 text-center font-mono font-bold">{m.battery}</td>
                                        <td className="py-2 px-3 text-center font-mono text-slate-400">{m.trade}</td>
                                        <td className="py-2 px-3 text-center">
                                          <span
                                            className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                              m.status === 'In Unit' || m.status === 'Present'
                                                ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                                                : 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                                            }`}
                                          >
                                            {m.status}
                                          </span>
                                        </td>
                                        {activeTab === 'active' && !isGuest && (
                                          <td className="py-2 px-3 text-right print:hidden">
                                            <button
                                              type="button"
                                              onClick={() => removeMemberFromTeam(team.id, m.id)}
                                              className="p-1 rounded text-slate-400 hover:text-rose-500 cursor-pointer"
                                              title="টিম থেকে বাদ দিন"
                                            >
                                              <X className="w-3.5 h-3.5" />
                                            </button>
                                          </td>
                                        )}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <div className="p-4 text-center text-xs font-mono text-slate-500">
                                  এই টিমে এখনও কোনো সদস্য যুক্ত নেই।
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* --- CARD VIEW (Active & History) --- */
        <div className="space-y-4">
          {currentList.map((team) => {
            const yr = resolveYear(team);
            const members = resolveTeamMembers(team);
            const btyBreakdown: Record<string, number> = {
              'HQ Bty': 0,
              'P Bty': 0,
              'Q Bty': 0,
              'R Bty': 0,
            };
            members.forEach((m) => {
              if (btyBreakdown[m.battery] !== undefined) {
                btyBreakdown[m.battery]++;
              }
            });

            const isInlineAdding = activeTab === 'active' && inlineAddingTeamId === team.id;
            const inlineSearchResults =
              isInlineAdding && inlineSearchQuery.trim()
                ? sortBySeniority(
                    personnelList.filter((p) => {
                      if (team.memberIds.includes(p.id)) return false;
                      const q = inlineSearchQuery.toLowerCase().trim();
                      return (
                        (p.snkNo || '').toLowerCase().includes(q) ||
                        (p.name || '').toLowerCase().includes(q) ||
                        (p.rk || '').toLowerCase().includes(q)
                      );
                    }),
                    ranksList
                  ).slice(0, 8)
                : [];

            return (
              <div
                key={team.id}
                className={`border rounded-2xl shadow-xl overflow-hidden transition-all ${
                  isLight ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div
                  className={`p-4 sm:p-5 border-b flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span
                        className={`w-3 h-3 rounded-full shrink-0 ${
                          activeTab === 'active' ? 'bg-rose-500' : 'bg-amber-500'
                        }`}
                      />
                      <h2 className={`text-base sm:text-lg font-bold tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {team.name}
                      </h2>
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-rose-500/15 text-rose-500 border border-rose-500/30">
                        {yr} সাল
                      </span>
                      <span
                        className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                          isLight
                            ? 'bg-slate-100 text-slate-800 border-slate-300'
                            : 'bg-slate-800 text-amber-300 border-slate-700'
                        }`}
                      >
                        {members.length} জন সদস্য
                      </span>

                      <div className="flex items-center gap-1 text-[11px] font-mono">
                        {ALL_BATTERIES.map((bty) => (
                          <span
                            key={bty}
                            className={`px-1.5 py-0.2 rounded border ${
                              isLight
                                ? 'bg-white text-slate-700 border-slate-300'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {bty}: {btyBreakdown[bty]}
                          </span>
                        ))}
                      </div>
                    </div>

                    {team.description && (
                      <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{team.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap print:hidden">
                    {activeTab === 'active' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleGoToDutyDetailing(team.name)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-500 border border-emerald-500/30 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Duty Detailing</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                        {!isGuest && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEditForm(team)}
                              className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer ${
                                isLight
                                  ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800'
                                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                              }`}
                            >
                              <Edit2 className="w-3.5 h-3.5 text-amber-500" />
                              <span>এডিট</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRequestDeleteTeam(team)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 cursor-pointer"
                              title="আর্কাইভ / ডিলিট"
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
                            onClick={() => {
                              restoreCustomTeam(team);
                              setActiveTab('active');
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>পুনরুদ্ধার</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setTeamPendingPermDelete(team)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 cursor-pointer"
                            title="ডাটাবেজ থেকে স্থায়ীভাবে মুছুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )
                    )}
                  </div>
                </div>

                {/* Members Table inside Card */}
                <div className="p-3 sm:p-4 space-y-3">
                  {members.length > 0 ? (
                    <div
                      className={`rounded-xl border overflow-hidden ${
                        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900/95 border-slate-800 text-slate-100'
                      }`}
                    >
                      <div
                        className={`grid grid-cols-12 gap-2 px-3 py-2 border-b text-xs font-mono font-bold ${
                          isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-950/90 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="col-span-1 text-center">SL</div>
                        <div className="col-span-2">Army No</div>
                        <div className="col-span-4">Rank & Name</div>
                        <div className="col-span-2 text-center">Battery</div>
                        <div className="col-span-2 text-center">Trade</div>
                        <div className="col-span-1 text-right">
                          {activeTab === 'active' ? 'Action' : 'Status'}
                        </div>
                      </div>
                      <div className={isLight ? 'divide-y divide-slate-100' : 'divide-y divide-slate-800/60'}>
                        {members.map((soldier, idx) => (
                          <div
                            key={soldier.id || idx}
                            className={`grid grid-cols-12 gap-2 px-3 py-2 items-center text-xs ${
                              isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/60'
                            }`}
                          >
                            <div className="col-span-1 text-center font-mono text-slate-400">{idx + 1}.</div>
                            <div className="col-span-2 font-mono font-bold">
                              <span
                                className={`px-1.5 py-0.5 rounded border ${
                                  isLight ? 'bg-slate-100 text-slate-900 border-slate-300' : 'bg-slate-800 text-amber-300 border-slate-700'
                                }`}
                              >
                                {soldier.snkNo}
                              </span>
                            </div>
                            <div className="col-span-4 font-semibold truncate">
                              {onViewDossier && soldier.livePerson ? (
                                <button
                                  type="button"
                                  onClick={() => onViewDossier(soldier.livePerson!)}
                                  className="hover:text-rose-500 hover:underline cursor-pointer text-left truncate"
                                >
                                  {soldier.rk} {soldier.name}
                                </button>
                              ) : (
                                <span>
                                  {soldier.rk} {soldier.name}
                                </span>
                              )}
                            </div>
                            <div className="col-span-2 text-center font-mono font-bold">{soldier.battery}</div>
                            <div className="col-span-2 text-center font-mono text-slate-400">{soldier.trade}</div>
                            <div className="col-span-1 text-right">
                              {activeTab === 'active' && !isGuest ? (
                                <button
                                  type="button"
                                  onClick={() => removeMemberFromTeam(team.id, soldier.id)}
                                  className="p-1 rounded text-slate-400 hover:text-rose-500 cursor-pointer"
                                  title="বাদ দিন"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <span className="text-[10px] font-mono text-slate-400">{soldier.status}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`p-5 rounded-xl border text-center text-xs font-mono ${
                        isLight ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-slate-900/80 border-slate-800 text-slate-400'
                      }`}
                    >
                      এই টিমে কোনো সদস্য যুক্ত নেই।
                    </div>
                  )}

                  {activeTab === 'active' && !isGuest && (
                    <div className="pt-1 print:hidden">
                      {!isInlineAdding ? (
                        <button
                          type="button"
                          onClick={() => {
                            setInlineAddingTeamId(team.id);
                            setInlineSearchQuery('');
                          }}
                          className="text-xs font-mono font-semibold text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>+ আরও সৈনিক যোগ করুন</span>
                        </button>
                      ) : (
                        <div
                          className={`p-2.5 rounded-xl border space-y-2 ${
                            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span>সৈনিক খুঁজুন এবং সরাসরি যোগ করুন:</span>
                            <button
                              type="button"
                              onClick={() => setInlineAddingTeamId(null)}
                              className="text-slate-400 hover:text-rose-500 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <input
                            type="text"
                            value={inlineSearchQuery}
                            onChange={(e) => setInlineSearchQuery(e.target.value)}
                            placeholder="সৈনিকের নম্বর বা নাম লিখুন..."
                            className={`w-full px-3 py-1.5 rounded-lg border text-xs font-mono focus:outline-none focus:border-rose-500 ${
                              isLight
                                ? 'bg-white border-slate-300 text-slate-900'
                                : 'bg-slate-900 border-slate-700 text-white'
                            }`}
                            autoFocus
                          />
                          {inlineSearchResults.length > 0 && (
                            <div className="divide-y divide-slate-800/40 max-h-40 overflow-y-auto border border-slate-700/40 rounded-lg">
                              {inlineSearchResults.map((soldier) => (
                                <div
                                  key={soldier.id}
                                  className="p-2 flex items-center justify-between text-xs font-mono"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-rose-500">{soldier.snkNo}</span>
                                    <span>{soldier.rk} {soldier.name}</span>
                                    <span className="text-slate-400">({soldier.battery})</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      addMemberToTeam(team.id, soldier.id);
                                      showNotification(`${soldier.rk} ${soldier.name} টিমে যোগ করা হয়েছে।`);
                                    }}
                                    className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer"
                                  >
                                    + যোগ
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. CONFIRM ARCHIVE / DELETE MODAL */}
      {teamPendingDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
          <div
            className={`border rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
            }`}
          >
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold">টিম আর্কাইভ / অপসারণ</h3>
                <p className="text-xs text-slate-400">Confirm Archive Team</p>
              </div>
            </div>

            <div
              className={`p-3.5 rounded-xl border space-y-2 text-xs ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}
            >
              <p>
                আপনি কি <span className="font-bold font-mono">"{teamPendingDelete.name}" ({resolveYear(teamPendingDelete)} সাল)</span> টিমটি আর্কাইভে সরাতে চান?
              </p>
              <p className="text-[11px] text-slate-400 font-mono">
                সদস্য: {teamPendingDelete.memberIds.length} জন • হিস্ট্রি ট্যাবে সম্পূর্ণ তালিকা সংরক্ষিত থাকবে।
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setTeamPendingDelete(null)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>সরিয়ে নিন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. CONFIRM PERMANENT DELETE FROM HISTORY MODAL */}
      {teamPendingPermDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
          <div
            className={`border rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
            }`}
          >
            <div className="flex items-center gap-3 text-rose-500">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold">ডাটাবেজ থেকে স্থায়ীভাবে মুছুন?</h3>
            </div>
            <p className="text-xs text-slate-400">
              "{teamPendingPermDelete.name}" ({resolveYear(teamPendingPermDelete)} সাল) স্থায়ীভাবে ডাটাবেজ থেকে মুছে যাবে এবং আর পুনরুদ্ধার করা যাবে না।
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setTeamPendingPermDelete(null)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                  isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-slate-300'
                }`}
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleConfirmPermanentDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
              >
                স্থায়ীভাবে মুছুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. FLOATING UNDO BANNER */}
      {activeUndoToast && (
        <div className="fixed bottom-5 right-4 sm:right-8 z-50 bg-slate-900/95 border-2 border-amber-500/60 shadow-2xl p-3.5 rounded-2xl flex items-center gap-3.5 text-white max-w-md backdrop-blur-md print:hidden">
          <RotateCcw className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">"{activeUndoToast.team.name}" আর্কাইভ হয়েছে</p>
          </div>
          <button
            type="button"
            onClick={() => handleUndo(activeUndoToast.team)}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold font-mono flex items-center gap-1 cursor-pointer shrink-0"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveUndoToast(null)}
            className="p-1 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 8. RECENTLY DELETED TEAMS RECOVERY MODAL */}
      {isTrashModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto print:hidden">
          <div
            className={`border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
            }`}
          >
            <div
              className={`px-5 py-4 border-b flex items-center justify-between ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <RotateCcw className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold">আর্কাইভ / মোছা টিম পুনরুদ্ধার</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTrashModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {recentlyDeletedTeams.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">কোনো আর্কাইভ টিম নেই।</div>
              ) : (
                recentlyDeletedTeams.map((team) => (
                  <div
                    key={team.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold font-mono truncate">{team.name}</h4>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-500/15 text-rose-500 font-bold">
                          {resolveYear(team)} সাল
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{team.description || 'বিবরণ নেই'}</p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-slate-500">
                        <span>{team.memberIds.length} জন সদস্য</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleUndo(team);
                        if (recentlyDeletedTeams.length <= 1) setIsTrashModalOpen(false);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold font-mono flex items-center gap-1.5 cursor-pointer shrink-0"
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
