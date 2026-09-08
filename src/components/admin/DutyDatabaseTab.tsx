import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { ParadeDutyCategory, ParadeDutyAssignment, Battery } from '../../types';
import {
  Clock,
  Calendar,
  Shield,
  Plus,
  Trash2,
  Search,
  Filter,
  Users,
  AlertCircle,
  Download,
  CheckCircle2,
} from 'lucide-react';

export const DutyDatabaseTab: React.FC = () => {
  const {
    personnelList,
    paradeDutyAssignments,
    addParadeDutyAssignment,
    removeParadeDutyAssignment,
    clearParadeDutyAssignments,
    showNotification,
    isGuest,
  } = useApp();

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedSession, setSelectedSession] = useState<string>('Morning');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Add Duty Form State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState('');
  const [dutyCategory, setDutyCategory] = useState<ParadeDutyCategory>('Unit Sy');
  const [dutyName, setDutyName] = useState('Regt Guard');
  const [dutyTime, setDutyTime] = useState('06:00 - 18:00');
  const [weaponOrAmmo, setWeaponOrAmmo] = useState('Rifle with 20 rds');
  const [locationOrPost, setLocationOrPost] = useState('Main Gate');
  const [remarks, setRemarks] = useState('');

  // Current session key
  const sessionKey = `${selectedDate}_${selectedSession}`;
  const currentAssignments: ParadeDutyAssignment[] = useMemo(() => {
    return paradeDutyAssignments[sessionKey] || [];
  }, [paradeDutyAssignments, sessionKey]);

  // Filtered assignments
  const filteredAssignments = useMemo(() => {
    return (currentAssignments || []).filter((a) => {
      if (!a) return false;
      if (selectedCategoryFilter !== 'All' && a.category !== selectedCategoryFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matches =
          (a.name || '').toLowerCase().includes(q) ||
          (a.snkNo || '').toLowerCase().includes(q) ||
          (a.dutyName || '').toLowerCase().includes(q) ||
          (a.rank || '').toLowerCase().includes(q) ||
          (a.battery || '').toLowerCase().includes(q) ||
          (a.location && a.location.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [currentAssignments, selectedCategoryFilter, searchTerm]);

  // Quick statistics
  const stats = useMemo(() => {
    const total = (currentAssignments || []).length;
    let unitSy = 0;
    let fixed = 0;
    let working = 0;
    let others = 0;

    (currentAssignments || []).forEach((a) => {
      if (!a) return;
      if (a.category === 'Unit Sy') unitSy++;
      else if (a.category === 'Fixed Duty') fixed++;
      else if (a.category === 'working') working++;
      else others++;
    });

    return { total, unitSy, fixed, working, others };
  }, [currentAssignments]);

  // Handle Add Duty
  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) {
      showNotification('গেস্ট মোডে ডিউটি দেওয়া সম্ভব নয় (View-Only)।');
      return;
    }
    if (!selectedPersonnelId) {
      showNotification('অনুগ্রহ করে একজন সৈন্য নির্বাচন করুন।');
      return;
    }

    const person = (personnelList || []).find((p) => p && p.id === selectedPersonnelId);
    if (!person) {
      showNotification('সৈন্য খুঁজে পাওয়া যায়নি।');
      return;
    }

    addParadeDutyAssignment({
      personnelId: person.id,
      snkNo: person.snkNo,
      rank: person.rk,
      name: person.name,
      battery: person.battery,
      category: dutyCategory,
      dutyName,
      dutyTime,
      weaponOrAmmo,
      location: locationOrPost,
      remarks,
      date: selectedDate,
      sessionType: selectedSession,
    });

    showNotification(`${person.rk} ${person.name}-কে ${dutyName} হিসেবে ডিউটিতে অন্তর্ভুক্ত করা হয়েছে।`);
    setIsAddOpen(false);
    setSelectedPersonnelId('');
  };

  // Handle Delete Duty
  const handleDeleteDuty = (id: string, name: string) => {
    if (isGuest) {
      showNotification('গেস্ট মোডে ডিউটি মুছে ফেলা যাবে না।');
      return;
    }
    removeParadeDutyAssignment(id, selectedDate, selectedSession);
    showNotification(`${name}-এর ডিউটি এসাইনমেন্ট মুছে ফেলা হয়েছে।`);
  };

  // Handle Clear All Duties
  const handleClearAll = () => {
    if (isGuest) {
      showNotification('গেস্ট মোডে ক্লিয়ার করা যাবে না।');
      return;
    }
    if (window.confirm(`Are you sure you want to clear all ${currentAssignments.length} duties for ${selectedDate} (${selectedSession})?`)) {
      clearParadeDutyAssignments(selectedDate, selectedSession);
      showNotification('সকল ডিউটি এসাইনমেন্ট মুছে ফেলা হয়েছে।');
    }
  };

  // Export Duty List to CSV
  const handleExportCSV = () => {
    const headers = ['Army No', 'Rank', 'Name', 'Battery', 'Category', 'Duty Name', 'Shift Time', 'Post / Location', 'Weapon / Ammo', 'Remarks'];
    const rows = (filteredAssignments || []).map((a) => [
      `"${a.snkNo || ''}"`,
      `"${a.rank || ''}"`,
      `"${a.name || ''}"`,
      `"${a.battery || ''}"`,
      `"${a.category || ''}"`,
      `"${a.dutyName || ''}"`,
      `"${a.dutyTime || ''}"`,
      `"${a.location || ''}"`,
      `"${a.weaponOrAmmo || ''}"`,
      `"${a.remarks || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `10Med_Duty_Roster_${selectedDate}_${selectedSession}.csv`;
    link.click();
    showNotification('Duty roster exported as CSV.');
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-700 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                Duty Allocation & Security Board Database
              </h2>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                {currentAssignments.length} Assigned
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              রেজিমেন্টাল গার্ড, কোয়ার্টার গার্ড, ডিউটি এনসিও ও সিকিউরিটি ডিউটি ডাটাবেজ কন্ট্রোল
            </p>
          </div>
        </div>

        {/* Date & Session Pickers */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200">
            <Calendar className="w-3.5 h-3.5 text-rose-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-white focus:outline-none font-mono text-xs cursor-pointer"
            />
          </div>

          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:border-rose-500 focus:outline-none"
          >
            <option value="Morning">Morning Session</option>
            <option value="Evening">Evening Session</option>
            <option value="Night">Night Session</option>
          </select>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-orange-950/50 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Assign Duty</span>
          </button>
        </div>
      </div>

      {/* 2. Micro Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs font-sans">
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <span className="text-slate-400 text-[11px]">Total on Duty</span>
          <span className="text-lg font-bold font-mono text-white mt-1">{stats.total}</span>
        </div>
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <span className="text-orange-400 text-[11px]">Unit Security</span>
          <span className="text-lg font-bold font-mono text-orange-300 mt-1">{stats.unitSy}</span>
        </div>
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <span className="text-cyan-400 text-[11px]">Fixed Duty</span>
          <span className="text-lg font-bold font-mono text-cyan-300 mt-1">{stats.fixed}</span>
        </div>
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <span className="text-emerald-400 text-[11px]">Working Party</span>
          <span className="text-lg font-bold font-mono text-emerald-300 mt-1">{stats.working}</span>
        </div>
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between col-span-2 sm:col-span-1">
          <span className="text-blue-400 text-[11px]">Other Duties</span>
          <span className="text-lg font-bold font-mono text-blue-300 mt-1">{stats.others}</span>
        </div>
      </div>

      {/* 3. Filter & Search Bar */}
      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search duty by Soldier Name, Snk No, Duty Name, Location..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:border-orange-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-orange-500 focus:outline-none"
          >
            <option value="All">All Categories</option>
            <option value="Unit Sy">Unit Security</option>
            <option value="Fixed Duty">Fixed Duty</option>
            <option value="working">Working Party</option>
            <option value="Others">Others</option>
          </select>

          {currentAssignments.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="px-3 py-1.5 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              Clear Session
            </button>
          )}
        </div>
      </div>

      {/* 4. Duty Assignments Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3 text-center w-12">SL</th>
                <th className="py-3 px-3 text-center">Army No</th>
                <th className="py-3 px-3 text-center">Rank</th>
                <th className="py-3 px-4">Soldier Name</th>
                <th className="py-3 px-3 text-center">Battery</th>
                <th className="py-3 px-3 text-center">Category</th>
                <th className="py-3 px-4">Duty / Post</th>
                <th className="py-3 px-3 text-center">Shift Time</th>
                <th className="py-3 px-3">Weapon / Equip</th>
                <th className="py-3 px-3 text-center w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500 bg-slate-950/40">
                    <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-slate-400">
                      No duty assignments recorded for {selectedDate} ({selectedSession}).
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsAddOpen(true)}
                      className="mt-3 px-3.5 py-1.5 rounded-lg bg-orange-600/80 hover:bg-orange-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Assign Soldier to Duty</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((duty, idx) => (
                  <tr key={duty.id} className="hover:bg-slate-850/80 transition-colors">
                    <td className="py-2.5 px-3 text-center font-mono text-slate-500 text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-200">
                      {duty.snkNo}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-400">
                      {duty.rank}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-white">
                      {duty.name}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-xs">
                      <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                        {duty.battery}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${
                          duty.category === 'Unit Sy'
                            ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                            : duty.category === 'Fixed Duty'
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                            : duty.category === 'working'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {duty.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-200">
                      <div className="flex flex-col">
                        <span className="font-bold text-white">{duty.dutyName}</span>
                        {duty.location && (
                          <span className="text-[11px] text-slate-400">{duty.location}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-300">
                      {duty.dutyTime || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-400">
                      {duty.weaponOrAmmo || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteDuty(duty.id, duty.name)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Remove Duty Assignment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Add Duty Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-400" />
                <h3 className="text-base font-bold text-white">Assign Soldier to Duty</h3>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="p-5 space-y-3.5 text-xs">
              {/* Select Soldier */}
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Select Soldier *</label>
                <select
                  value={selectedPersonnelId}
                  onChange={(e) => setSelectedPersonnelId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:border-orange-500 focus:outline-none"
                >
                  <option value="">-- Choose Soldier from Nominal Roll --</option>
                  {(personnelList || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.rk} {p.name} ({p.snkNo}) - {p.battery} [{p.status}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Duty Category */}
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Duty Category</label>
                <select
                  value={dutyCategory}
                  onChange={(e) => setDutyCategory(e.target.value as ParadeDutyCategory)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-orange-500 focus:outline-none"
                >
                  <option value="Unit Sy">Unit Security Guard</option>
                  <option value="Fixed Duty">Fixed Regimental Duty</option>
                  <option value="working">Working Party / Fatigue</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              {/* Duty Name */}
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Duty Post / Assignment Name *</label>
                <input
                  type="text"
                  value={dutyName}
                  onChange={(e) => setDutyName(e.target.value)}
                  placeholder="e.g. Regt Guard, Main Gate, Quarter Guard Commander, Duty NCO"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-orange-500 focus:outline-none"
                />
              </div>

              {/* Location / Post */}
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Specific Location / Post</label>
                <input
                  type="text"
                  value={locationOrPost}
                  onChange={(e) => setLocationOrPost(e.target.value)}
                  placeholder="e.g. Morcha 1, Main Magazine, MT Park"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-orange-500 focus:outline-none"
                />
              </div>

              {/* Shift Time & Equipment */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Shift Time</label>
                  <input
                    type="text"
                    value={dutyTime}
                    onChange={(e) => setDutyTime(e.target.value)}
                    placeholder="06:00 - 18:00"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Weapon / Ammo</label>
                  <input
                    type="text"
                    value={weaponOrAmmo}
                    onChange={(e) => setWeaponOrAmmo(e.target.value)}
                    placeholder="Rifle with 20 rds"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Remarks</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Special instructions or orders"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-lg cursor-pointer"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
