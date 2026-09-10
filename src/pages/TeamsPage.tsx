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
  UserCheck,
  Building2,
  Calendar,
  RefreshCw,
  RotateCcw,
  Undo2,
  AlertTriangle,
} from 'lucide-react';

interface TeamsPageProps {
  onViewDossier?: (p: Personnel) => void;
}

export const TeamsPage: React.FC<TeamsPageProps> = ({ onViewDossier }) => {
  const {
    customTeams,
    recentlyDeletedTeams,
    addCustomTeam,
    updateCustomTeam,
    deleteCustomTeam,
    undoDeleteTeam,
    restoreCustomTeam,
    addMemberToTeam,
    removeMemberFromTeam,
    resetAsltCourseTeam,
    resetCricketTeam,
    personnelList,
    ranksList,
    setActivePage,
    currentUser,
    isGuest,
    showNotification,
  } = useApp();

  // Create / Edit Team Modal/Inline Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [teamNameInput, setTeamNameInput] = useState('');
  const [teamDescInput, setTeamDescInput] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  // In-app Delete confirmation & Undo state
  const [teamPendingDelete, setTeamPendingDelete] = useState<CustomTeam | null>(null);
  const [activeUndoToast, setActiveUndoToast] = useState<{ team: CustomTeam; expiresAt: number } | null>(null);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);

  // Auto-dismiss floating undo toast after expiration
  useEffect(() => {
    if (!activeUndoToast) return;
    const remaining = Math.max(0, activeUndoToast.expiresAt - Date.now());
    const timer = setTimeout(() => {
      setActiveUndoToast(null);
    }, remaining || 15000);
    return () => clearTimeout(timer);
  }, [activeUndoToast]);

  // Search in member picker
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [pickerBatteryFilter, setPickerBatteryFilter] = useState<Battery | 'All'>('All');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search filter across teams list
  const [teamFilterQuery, setTeamFilterQuery] = useState('');

  // Quick inline add soldier to existing team
  const [inlineAddingTeamId, setInlineAddingTeamId] = useState<string | null>(null);
  const [inlineSearchQuery, setInlineSearchQuery] = useState('');

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Open form for creating a new team
  const handleOpenCreateForm = () => {
    setEditingTeamId(null);
    setTeamNameInput('');
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
    setTeamDescInput(team.description || '');
    setSelectedMemberIds([...team.memberIds]);
    setMemberSearchQuery('');
    setIsFormOpen(true);
  };

  // Toggle member selection in create/edit modal
  const handleToggleMember = (personnelId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(personnelId) ? prev.filter((id) => id !== personnelId) : [...prev, personnelId]
    );
  };

  // Save team (Create or Update)
  const handleSaveTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamNameInput.trim()) {
      showNotification('অনুগ্রহ করে টিমের একটি নাম দিন।');
      return;
    }

    if (editingTeamId) {
      updateCustomTeam(editingTeamId, {
        name: teamNameInput.trim(),
        description: teamDescInput.trim(),
        memberIds: selectedMemberIds,
      });
      showNotification(`"${teamNameInput.trim()}" আপডেট করা হয়েছে।`);
    } else {
      addCustomTeam({
        name: teamNameInput.trim(),
        description: teamDescInput.trim(),
        memberIds: selectedMemberIds,
      });
    }

    setIsFormOpen(false);
    setEditingTeamId(null);
  };

  // Delete team with custom in-app confirmation (no native blocked window.confirm)
  const handleRequestDeleteTeam = (team: CustomTeam) => {
    if (isGuest) {
      showNotification('View-Only mode: Cannot delete team.');
      return;
    }
    setTeamPendingDelete(team);
  };

  const handleConfirmDelete = () => {
    if (!teamPendingDelete) return;
    const target = teamPendingDelete;
    const deleted = deleteCustomTeam(target.id);
    setTeamPendingDelete(null);
    if (deleted) {
      setActiveUndoToast({ team: deleted, expiresAt: Date.now() + 15000 });
    }
  };

  const handleCancelDelete = () => {
    setTeamPendingDelete(null);
  };

  const handleUndo = (teamToRestore?: CustomTeam) => {
    if (teamToRestore) {
      restoreCustomTeam(teamToRestore);
    } else {
      undoDeleteTeam();
    }
    setActiveUndoToast(null);
  };

  // Filtered available personnel in the picker modal
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

  // Filtered teams list based on search
  const filteredTeams = useMemo(() => {
    if (!teamFilterQuery.trim()) return customTeams;
    const q = teamFilterQuery.toLowerCase().trim();
    return customTeams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
    );
  }, [customTeams, teamFilterQuery]);

  // Jump to Duty Detailing page
  const handleGoToDutyDetailing = (teamName: string) => {
    setActivePage('duty_detail');
    showNotification(`Duty Detailing-এ "${teamName}" টিম লোড করার জন্য প্রস্তুত।`);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 px-2 sm:px-4 py-3">
      {/* 1. TOP HEADER & CONTROLS */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-600 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-rose-950/40 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                Team Management / টিম ম্যানেজমেন্ট
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono font-bold">
                {customTeams.length} Teams
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              বিভিন্ন টিম তৈরি করুন, সৈনিক যুক্ত বা পরিবর্তন করুন এবং ডিউটি ডিটেইলিংয়ে এক ক্লিকে ডিটেইল করুন।
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Search team */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={teamFilterQuery}
              onChange={(e) => setTeamFilterQuery(e.target.value)}
              placeholder="Search team..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
            {teamFilterQuery && (
              <button
                onClick={() => setTeamFilterQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Undo / Deleted Teams button if any recently deleted */}
          {recentlyDeletedTeams && recentlyDeletedTeams.length > 0 && (
            <button
              type="button"
              onClick={() => setIsTrashModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold transition-colors flex items-center gap-2 shrink-0 cursor-pointer shadow-sm"
              title="সম্প্রতি মুছে ফেলা টিমগুলো দেখুন এবং এক ক্লিকে পুনরুদ্ধার করুন"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>মোছা টিম পুনরুদ্ধার ({recentlyDeletedTeams.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenCreateForm}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-bold font-mono transition-all cursor-pointer shadow-lg shadow-rose-900/30 flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন টিম তৈরি করুন</span>
          </button>
        </div>
      </div>

      {/* 2. CREATE / EDIT TEAM FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-600/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">
                    {editingTeamId ? 'টিম এডিট করুন / Edit Team' : 'নতুন টিম তৈরি করুন / Create Team'}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    টিমের নাম দিন এবং সৈনিকদের তালিকা থেকে সদস্য নির্বাচন করুন
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveTeam} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Team Name and Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-1">
                    <span>টিমের নাম (Team Name) *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={teamNameInput}
                    onChange={(e) => setTeamNameInput(e.target.value)}
                    placeholder="যেমন: Athletics Team, SL Course, Firing Team..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono font-semibold text-slate-300">
                    বিবরণ / নোট (Description)
                  </label>
                  <input
                    type="text"
                    value={teamDescInput}
                    onChange={(e) => setTeamDescInput(e.target.value)}
                    placeholder="যেমন: বার্ষিক প্রতিযোগিতা অথবা ক্যাডার প্রশিক্ষণ দল..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Selected Soldiers Summary Chips */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold text-slate-300 flex items-center gap-2">
                    <span>নির্বাচিত সদস্যবৃন্দ (Selected Members):</span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono text-[11px] font-bold border border-rose-500/30">
                      {selectedMemberIds.length} জন
                    </span>
                  </label>
                  {selectedMemberIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedMemberIds([])}
                      className="text-[11px] font-mono text-rose-400 hover:text-rose-300 cursor-pointer"
                    >
                      সব বাতিল করুন
                    </button>
                  )}
                </div>

                {selectedMemberIds.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-slate-950/70 border border-slate-800 rounded-xl">
                    {selectedMemberIds.map((id) => {
                      const p = personnelMap.get(id);
                      if (!p) return null;
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 text-xs font-mono"
                        >
                          <span className="font-bold text-rose-400">{p.snkNo}</span>
                          <span>{p.rk} {p.name}</span>
                          <span className="text-[10px] text-slate-400">({p.battery})</span>
                          <button
                            type="button"
                            onClick={() => handleToggleMember(id)}
                            className="text-slate-400 hover:text-rose-400 transition-colors ml-0.5 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-950/50 border border-dashed border-slate-800 text-center text-xs font-mono text-slate-500">
                    এখনও কোনো সৈনিক নির্বাচন করা হয়নি। নিচের তালিকা থেকে সিলেক্ট করুন।
                  </div>
                )}
              </div>

              {/* Soldier Search & Filter Controls */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  {/* Search box */}
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      placeholder="সৈনিক খুঁজুন (Army No, Name, Rank)..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono"
                    />
                    {memberSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setMemberSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Battery Filter Pills */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                    {(['All', ...ALL_BATTERIES] as const).map((bty) => (
                      <button
                        key={bty}
                        type="button"
                        onClick={() => setPickerBatteryFilter(bty)}
                        className={`px-2 py-1 rounded-md text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                          pickerBatteryFilter === bty
                            ? 'bg-rose-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        {bty}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Soldiers List for selection */}
                <div className="border border-slate-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-800 bg-slate-950">
                  {filteredPickerPersonnel.length > 0 ? (
                    filteredPickerPersonnel.map((soldier) => {
                      const isSelected = selectedMemberIds.includes(soldier.id);
                      return (
                        <div
                          key={soldier.id}
                          onClick={() => handleToggleMember(soldier.id)}
                          className={`p-2 px-3 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-rose-950/40 hover:bg-rose-950/60 border-l-2 border-rose-500'
                              : 'hover:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // Handled by div onClick
                              className="rounded border-slate-700 text-rose-600 focus:ring-0 cursor-pointer pointer-events-none"
                            />
                            <span className="text-xs font-mono font-bold text-rose-300">
                              {soldier.snkNo}
                            </span>
                            <span className="text-xs font-semibold text-white truncate">
                              {soldier.rk} {soldier.name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              ({soldier.battery})
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                              {soldier.trade}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                soldier.status === 'In Unit' || soldier.status === 'Present'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}
                            >
                              {soldier.status}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                                isSelected
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              }`}
                            >
                              {isSelected ? 'Selected' : '+ Add'}
                            </span>
                          </div>
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

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-semibold transition-colors cursor-pointer"
                >
                  বাতিল (Cancel)
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold transition-all shadow-lg shadow-rose-900/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingTeamId ? 'টিম সংরক্ষণ করুন (Save)' : 'টিম তৈরি করুন (Create)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. TEAMS LIST VIEW */}
      {filteredTeams.length > 0 ? (
        <div className="space-y-4">
          {filteredTeams.map((team) => {
            // Member statistics
            const members = team.memberIds
              .map((id) => personnelMap.get(id))
              .filter(Boolean) as Personnel[];

            const btyBreakdown = { 'HQ Bty': 0, 'P Bty': 0, 'Q Bty': 0, 'R Bty': 0 };
            members.forEach((m) => {
              if (btyBreakdown[m.battery] !== undefined) {
                btyBreakdown[m.battery]++;
              }
            });

            const isInlineAdding = inlineAddingTeamId === team.id;

            // Search filter for inline add soldier to this specific team
            const inlineSearchResults = isInlineAdding && inlineSearchQuery.trim()
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
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl shadow-xl overflow-hidden transition-all"
              >
                {/* Team Card Header */}
                <div className="p-4 sm:p-5 bg-slate-950/70 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="w-3 h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50 shrink-0" />
                      <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                        {team.name}
                      </h2>
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {team.memberIds.length} জন সদস্য
                      </span>

                      {(team.id === 'team_aslt_course' || team.name.toLowerCase().includes('aslt')) && (
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          অফিসিয়াল ৩২ জন সদস্য
                        </span>
                      )}

                      {(team.id === 'team_cricket' || team.name.toLowerCase().includes('cricket')) && (
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          অফিসিয়াল ১৬ জন সদস্য
                        </span>
                      )}

                      {/* Battery Breakdown chips */}
                      <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                        {ALL_BATTERIES.map((bty) => (
                          <span
                            key={bty}
                            className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700"
                          >
                            {bty}: {btyBreakdown[bty]}
                          </span>
                        ))}
                      </div>
                    </div>

                    {team.description && (
                      <p className="text-xs text-slate-400">{team.description}</p>
                    )}
                  </div>

                  {/* Actions for this team */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {/* Reset Aslt Course to official 32 */}
                    {(team.id === 'team_aslt_course' || team.name.toLowerCase().includes('aslt')) && (
                      <button
                        type="button"
                        onClick={() => resetAsltCourseTeam()}
                        className="px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Aslt Course টিম ৩২ জন সদস্যে রিসেট ও আপডেট করুন"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>রিসেট ৩২ জন</span>
                      </button>
                    )}

                    {/* Reset Cricket to official 16 */}
                    {(team.id === 'team_cricket' || team.name.toLowerCase().includes('cricket')) && (
                      <button
                        type="button"
                        onClick={() => resetCricketTeam()}
                        className="px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Cricket টিম ১৬ জন সদস্যে রিসেট ও আপডেট করুন"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>রিসেট ১৬ জন</span>
                      </button>
                    )}

                    {/* Send to Duty Detailing */}
                    <button
                      type="button"
                      onClick={() => handleGoToDutyDetailing(team.name)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                      title="Duty Detailing-এ এই টিমটি ডিটেইল করুন"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Duty Detailing-এ যান</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>

                    {/* Edit Team */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditForm(team)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>এডিট (Edit)</span>
                    </button>

                    {/* Delete Team */}
                    {!isGuest && (
                      <button
                        type="button"
                        onClick={() => handleRequestDeleteTeam(team)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs transition-colors cursor-pointer"
                        title="টিম মুছে ফেলুন"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Team Members List (Clean White Table Style) */}
                <div className="p-3 sm:p-4 space-y-3">
                  {members.length > 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-slate-900">
                      {/* Table Header */}
                      <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-100 border-b border-slate-200 text-xs font-mono font-bold text-slate-700">
                        <div className="col-span-1 text-center">SL</div>
                        <div className="col-span-2">Army No</div>
                        <div className="col-span-4">Rank & Name</div>
                        <div className="col-span-2 text-center">Battery</div>
                        <div className="col-span-2 text-center">Trade</div>
                        <div className="col-span-1 text-right">Action</div>
                      </div>

                      {/* Table Rows */}
                      <div className="divide-y divide-slate-100">
                        {members.map((soldier, idx) => (
                          <div
                            key={soldier.id}
                            className="grid grid-cols-12 gap-2 px-3 py-2 items-center text-xs hover:bg-slate-50 transition-colors"
                          >
                            <div className="col-span-1 text-center font-mono text-slate-400">
                              {idx + 1}.
                            </div>
                            <div className="col-span-2 font-mono font-bold text-slate-900">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300">
                                {soldier.snkNo}
                              </span>
                            </div>
                            <div className="col-span-4 font-semibold text-slate-900 truncate">
                              {soldier.rk} {soldier.name}
                            </div>
                            <div className="col-span-2 text-center font-mono font-bold text-slate-700">
                              {soldier.battery}
                            </div>
                            <div className="col-span-2 text-center font-mono text-slate-500">
                              {soldier.trade}
                            </div>
                            <div className="col-span-1 text-right">
                              <button
                                type="button"
                                onClick={() => removeMemberFromTeam(team.id, soldier.id)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="এই টিম থেকে বাদ দিন"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 rounded-xl bg-white border border-slate-200 text-center text-xs font-mono text-slate-500 space-y-2">
                      <p>এই টিমে এখনও কোনো সৈনিক যোগ করা হয়নি।</p>
                      <button
                        type="button"
                        onClick={() => handleOpenEditForm(team)}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-500 cursor-pointer"
                      >
                        + সৈনিক যোগ করুন
                      </button>
                    </div>
                  )}

                  {/* Inline Quick Add Soldier to this Team */}
                  <div className="pt-1 flex items-center justify-between">
                    {!isInlineAdding ? (
                      <button
                        type="button"
                        onClick={() => {
                          setInlineAddingTeamId(team.id);
                          setInlineSearchQuery('');
                        }}
                        className="text-xs font-mono font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>+ এই টিমে আরো সৈনিক যোগ করুন (Add Soldier)</span>
                      </button>
                    ) : (
                      <div className="w-full bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-2 animate-fadeIn">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-slate-300">
                            সৈনিক খুঁজুন এবং সরাসরি যোগ করুন:
                          </span>
                          <button
                            type="button"
                            onClick={() => setInlineAddingTeamId(null)}
                            className="text-slate-400 hover:text-white"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={inlineSearchQuery}
                            onChange={(e) => setInlineSearchQuery(e.target.value)}
                            placeholder="সৈনিকের নম্বর বা নাম লিখুন..."
                            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono"
                            autoFocus
                          />
                        </div>

                        {inlineSearchResults.length > 0 && (
                          <div className="divide-y divide-slate-800 max-h-40 overflow-y-auto border border-slate-800 rounded-lg">
                            {inlineSearchResults.map((soldier) => (
                              <div
                                key={soldier.id}
                                className="p-2 flex items-center justify-between hover:bg-slate-900 text-xs font-mono text-white"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-rose-400">{soldier.snkNo}</span>
                                  <span>{soldier.rk} {soldier.name}</span>
                                  <span className="text-slate-400">({soldier.battery})</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    addMemberToTeam(team.id, soldier.id);
                                    showNotification(`${soldier.rk} ${soldier.name} টিমে যোগ করা হয়েছে।`);
                                  }}
                                  className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer flex items-center gap-1"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>যোগ করুন</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 text-slate-400 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">কোনো টিম তৈরি করা নেই</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            আপনার পছন্দের ১০-১২ জন সৈনিক নিয়ে নতুন টিম বানান (যেমন: Athletics Team, SL Course, Firing Team) এবং ডিউটি ডিটেইলিংয়ে এক ক্লিকে ব্যবহার করুন।
          </p>
          <button
            type="button"
            onClick={handleOpenCreateForm}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold font-mono transition-colors cursor-pointer inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>প্রথম টিম তৈরি করুন</span>
          </button>
        </div>
      )}

      {/* 3. CONFIRM DELETE MODAL (In-app, iframe safe) */}
      {teamPendingDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">টিম মুছে ফেলার নিশ্চিতকরণ</h3>
                <p className="text-xs text-slate-400">Confirm Team Deletion</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs text-slate-300">
              <p>
                আপনি কি নিশ্চিত যে <span className="font-bold text-white font-mono">"{teamPendingDelete.name}"</span> টিমটি মুছে ফেলতে চান?
              </p>
              <div className="flex items-center gap-2 text-slate-400 text-[11px] font-mono">
                <span>সদস্য সংখ্যা: {teamPendingDelete.memberIds.length} জন</span>
                <span>•</span>
                <span>ID: {teamPendingDelete.id}</span>
              </div>
              <p className="text-amber-300/90 text-[11px] bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 leading-relaxed">
                💡 <strong>চিন্তার কিছু নেই:</strong> ভুলবশত কোনো টিম মুছে ফেললেও আপনি সাথে সাথে নিচে থাকা <strong>"Undo (ফিরিয়ে আনুন)"</strong> বাটন বা উপরের <strong>"মোছা টিম পুনরুদ্ধার"</strong> অপশন থেকে যে কোনো সময় তা এক ক্লিকে ফিরিয়ে আনতে পারবেন।
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
                <span>মুছে ফেলুন (Delete)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. FLOATING UNDO BANNER (Persistent with countdown) */}
      {activeUndoToast && (
        <div className="fixed bottom-5 right-4 sm:right-8 z-50 bg-slate-900/95 border-2 border-amber-500/60 shadow-2xl shadow-amber-950/50 p-3.5 rounded-2xl flex items-center gap-3.5 text-white max-w-md animate-slideUp backdrop-blur-md">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
            <RotateCcw className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              "{activeUndoToast.team.name}" মুছে ফেলা হয়েছে
            </p>
            <p className="text-[11px] text-slate-400">
              ভুলবশত হয়ে থাকলে এখনই Undo করুন
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleUndo(activeUndoToast.team)}
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

      {/* 5. RECENTLY DELETED TEAMS RECOVERY MODAL */}
      {isTrashModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">মোছা টিম রিকভারি / Deleted Teams History</h3>
                  <p className="text-xs text-slate-400">মুছে ফেলা যেকোনো টিম এক ক্লিকে পুনরুদ্ধার করুন</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTrashModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {recentlyDeletedTeams.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  কোনো মোছা টিম নেই (No deleted teams in history)।
                </div>
              ) : (
                recentlyDeletedTeams.map((team) => (
                  <div
                    key={team.id}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-white font-mono truncate">{team.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{team.description || 'বিবরণ নেই'}</p>
                      <div className="flex items-center gap-2 mt-1.5 text-[11px] font-mono text-slate-500">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {team.memberIds.length} জন সদস্য
                        </span>
                        {team.createdAt && (
                          <span>তৈরি: {new Date(team.createdAt).toLocaleDateString('bn-BD')}</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleUndo(team);
                        if (recentlyDeletedTeams.length <= 1) {
                          setIsTrashModalOpen(false);
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold font-mono transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 shadow-md"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>পুনরুদ্ধার (Restore)</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono">মোট {recentlyDeletedTeams.length}টি টিম ইতিহাসে আছে</span>
              <button
                type="button"
                onClick={() => setIsTrashModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                বন্ধ করুন (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
