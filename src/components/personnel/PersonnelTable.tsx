import React, { useState, useMemo, useRef } from 'react';
import { Personnel, Battery, ParadeStatus } from '../../types';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';
import { exportNominalRollToPdf, exportNominalRollToWord } from '../../utils/nominalExport';
import {
  Search,
  Download,
  Printer,
  ChevronDown,
  Eye,
  Edit2,
  FileText,
  Filter,
  CheckCircle2,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from 'lucide-react';

interface PersonnelTableProps {
  personnel: Personnel[];
  fixedBattery?: Battery;
  onViewDossier: (person: Personnel) => void;
  onOpenAddModal?: () => void;
  onEditPerson?: (person: Personnel) => void;
  onDeletePerson?: (person: Personnel) => void;
  allowStatusEdits?: boolean;
  title?: string;
}

export const PersonnelTable: React.FC<PersonnelTableProps> = ({
  personnel = [],
  fixedBattery,
  onViewDossier,
  onOpenAddModal,
  onEditPerson,
  onDeletePerson,
  allowStatusEdits = true,
  title,
}) => {
  const { updateParadeStatus, currentUser, showNotification, searchQuery, setSearchQuery, isGuest, ranksList, tradesList } = useApp();

  const safePersonnel = useMemo(() => (Array.isArray(personnel) ? personnel.filter(Boolean) : []), [personnel]);
  const safeRanks = useMemo(() => (Array.isArray(ranksList) ? ranksList.filter(Boolean) : []), [ranksList]);
  const safeTrades = useMemo(() => (Array.isArray(tradesList) ? tradesList.filter(Boolean) : []), [tradesList]);

  // Filter States - synced with header search query
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const activeSearch = searchQuery.trim() ? searchQuery : localSearchTerm;
  const [selectedRank, setSelectedRank] = useState<string>('All');
  const [selectedTrade, setSelectedTrade] = useState<string>('All');
  const [selectedBlood, setSelectedBlood] = useState<string>('All');
  const [selectedBattery, setSelectedBattery] = useState<string>(fixedBattery || 'All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [activeEditingId, setActiveEditingId] = useState<string | null>(null);

  // Quick Status Edit Options
  const statusOptions: ParadeStatus[] = [
    'Present',
    'On Duty',
    'CMH/Sick',
    'Leave',
    'Course/Trg',
    'Temp Duty',
    'Attached Out',
    'AWOL/OSL',
  ];

  // Dynamic Rank Filter Options
  const rankFilterOptions = useMemo(() => {
    const categoryOptions = [
      { value: 'All', label: 'All Ranks (সব পদবী)' },
      { value: 'Offr', label: 'Offr (All Officers)' },
      { value: 'JCO', label: 'JCO (All Junior Commissioned)' },
      { value: 'OR', label: 'OR (All Other Ranks / Soldiers)' },
      { value: 'Civilian', label: 'Civilian (All Civilians)' },
      { value: 'RCO', label: 'RCO (Religious Teacher)' },
    ];

    // Individual active ranks from ranksList
    const specificRanks = safeRanks
      .filter((r) => r && r.isActive !== false)
      .map((r) => ({ value: r.name, label: r.banglaName ? `${r.name} (${r.banglaName})` : r.name }));

    // Deduplicate so options with the same value are not repeated
    const seenValues = new Set<string>();
    const combined: { value: string; label: string }[] = [];

    for (const opt of [...categoryOptions, ...specificRanks]) {
      if (!seenValues.has(opt.value)) {
        seenValues.add(opt.value);
        combined.push(opt);
      }
    }

    return combined;
  }, [safeRanks]);

  // Dynamic Trade Filter Options (populated from Admin tradesList & active personnel)
  const tradeFilterOptions = useMemo(() => {
    const uniqueTrades = Array.from(
      new Set([
        ...safeTrades.filter((t) => t && t.isActive !== false).map((t) => t.name),
        ...safePersonnel.map((p) => p && p.trade).filter(Boolean) as string[],
      ])
    ).filter((t) => t !== '-');

    return [
      { value: 'All', label: 'All Trades' },
      ...uniqueTrades.map((t) => ({ value: t, label: t })),
    ];
  }, [safeTrades, safePersonnel]);

  // Blood Group Options
  const bloodFilterOptions = [
    { value: 'All', label: 'All Blood Groups' },
    { value: 'A+', label: 'A+' },
    { value: 'A-', label: 'A-' },
    { value: 'B+', label: 'B+' },
    { value: 'B-', label: 'B-' },
    { value: 'O+', label: 'O+' },
    { value: 'O-', label: 'O-' },
    { value: 'AB+', label: 'AB+' },
    { value: 'AB-', label: 'AB-' },
  ];

  // Battery Filter Options - Serial: P Bty, Q Bty, R Bty, HQ Bty
  const batteryFilterOptions = [
    { value: 'All', label: 'All Batteries' },
    { value: 'P Bty', label: 'P Bty' },
    { value: 'Q Bty', label: 'Q Bty' },
    { value: 'R Bty', label: 'R Bty' },
    { value: 'HQ Bty', label: 'HQ Bty' },
  ];

  // Filter Logic
  const filteredPersonnel = useMemo(() => {
    return safePersonnel.filter((person) => {
      if (!person) return false;
      // 1. Text Search across SnkNo, Name, Rank, Trade, Battery, Status, Blood
      if (activeSearch.trim()) {
        const query = activeSearch.toLowerCase().trim();
        const matchesQuery =
          (person.snkNo || '').toLowerCase().includes(query) ||
          (person.name || '').toLowerCase().includes(query) ||
          (person.rk || '').toLowerCase().includes(query) ||
          (person.trade && person.trade.toLowerCase().includes(query)) ||
          (person.battery || '').toLowerCase().includes(query) ||
          (person.status || '').toLowerCase().includes(query) ||
          (person.bloodGroup && person.bloodGroup.toLowerCase().includes(query));

        if (!matchesQuery) return false;
      }

      // 2. Rank Filter
      if (selectedRank !== 'All') {
        if (selectedRank === 'Offr') {
          const officerRanks = safeRanks.filter((r) => r && r.category === 'Officer').map((r) => r.name);
          const list = officerRanks.length > 0 ? officerRanks : ['Lt Col', 'Maj', 'Capt', 'Lt', '2Lt'];
          if (!list.includes(person.rk)) return false;
        } else if (selectedRank === 'JCO') {
          const jcoRanks = safeRanks.filter((r) => r && r.category === 'JCO').map((r) => r.name);
          const list = jcoRanks.length > 0 ? jcoRanks : ['SWO', 'WO', 'MWO'];
          if (!list.includes(person.rk)) return false;
        } else if (selectedRank === 'OR') {
          const orRanks = safeRanks.filter((r) => r && r.category === 'OR').map((r) => r.name);
          const list = orRanks.length > 0 ? orRanks : ['Sgt', 'Cpl', 'Lcpl', 'Snk', 'Gnr', 'SNK DMT)'];
          if (!list.includes(person.rk)) return false;
        } else if (selectedRank === 'Civilian') {
          const civRanks = safeRanks.filter((r) => r && r.category === 'Civilian').map((r) => r.name);
          if (!civRanks.includes(person.rk) && person.rk !== 'Civilian' && person.rk !== 'NC(E)' && person.rk !== 'NC(U)' && person.trade !== 'Civilian' && person.trade !== 'NC(E)') return false;
        } else if (selectedRank === 'RCO') {
          if (person.rk !== 'RCO' && person.trade !== 'RCO') return false;
        } else {
          if (person.rk !== selectedRank) return false;
        }
      }

      // 3. Trade Filter
      if (selectedTrade !== 'All') {
        const pTrade = person.trade || 'GD';
        if (pTrade !== selectedTrade) return false;
      }

      // 4. Blood Group Filter
      if (selectedBlood !== 'All') {
        if (person.bloodGroup !== selectedBlood) return false;
      }

      // 5. Battery Filter
      const activeBatteryFilter = fixedBattery || selectedBattery;
      if (activeBatteryFilter !== 'All') {
        if (person.battery !== activeBatteryFilter) return false;
      }

      // 6. Status Filter
      if (selectedStatus !== 'All') {
        if (person.status !== selectedStatus) return false;
      }

      return true;
    });
  }, [safePersonnel, safeRanks, activeSearch, selectedRank, selectedTrade, selectedBlood, selectedBattery, fixedBattery, selectedStatus]);

  const handleQuickStatusChange = (personId: string, newStatus: ParadeStatus) => {
    updateParadeStatus(personId, newStatus);
    setActiveEditingId(null);
    showNotification(`Status updated to ${newStatus}`);
  };

  const handlePrintFilteredNominal = () => {
    exportNominalRollToPdf(filteredPersonnel, {
      searchQuery: activeSearch,
      battery: fixedBattery || selectedBattery,
      specificRank: selectedRank,
      trade: selectedTrade,
      status: selectedStatus,
    });
    setIsExportMenuOpen(false);
  };

  const handleWordExport = () => {
    exportNominalRollToWord(filteredPersonnel, {
      searchQuery: activeSearch,
      battery: fixedBattery || selectedBattery,
      specificRank: selectedRank,
      trade: selectedTrade,
      status: selectedStatus,
    });
    setIsExportMenuOpen(false);
  };

  const handleResetFilters = () => {
    setLocalSearchTerm('');
    setSearchQuery('');
    setSelectedRank('All');
    setSelectedTrade('All');
    setSelectedBlood('All');
    if (!fixedBattery) setSelectedBattery('All');
    setSelectedStatus('All');
  };

  const hasActiveFilters =
    activeSearch !== '' ||
    selectedRank !== 'All' ||
    selectedTrade !== 'All' ||
    selectedBlood !== 'All' ||
    (!fixedBattery && selectedBattery !== 'All') ||
    selectedStatus !== 'All';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/90">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Title & Count */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white font-sans tracking-tight">
                {title || 'Nominal'}
              </h2>
              <span className="bg-rose-600/20 text-rose-300 border border-rose-500/40 text-xs font-mono font-bold px-2 py-0.5 rounded-full">
                {filteredPersonnel.length} / {personnel.length}
              </span>
            </div>
          </div>

          {/* Action Controls: Download Nominal, Enlist Soldier, Reset */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                <span>Reset Filters</span>
              </button>
            )}

            {/* Download Nominal Dropdown */}
            <div className="relative">
              <button
                id="download-nominal-dropdown-btn"
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 shadow-md transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-rose-400" />
                <span>Download Nominal</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isExportMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-40 text-slate-200">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono border-b border-slate-800">
                    Export Filtered Nominal Roll
                  </div>
                  <button
                    onClick={handlePrintFilteredNominal}
                    className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    <Printer className="w-4 h-4 text-rose-400" />
                    <div>
                      <div className="font-semibold text-slate-100">Print / PDF Nominal</div>
                      <div className="text-[10px] text-slate-400">Official formatted print layout</div>
                    </div>
                  </button>
                  <button
                    onClick={handleWordExport}
                    className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    <FileText className="w-4 h-4 text-blue-400" />
                    <div>
                      <div className="font-semibold text-slate-100">Word Document (.doc)</div>
                      <div className="text-[10px] text-slate-400">Editable Microsoft Word table</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Enlist Soldier (RSM Role) */}
            {currentUser.role === 'RSM' && !isGuest && onOpenAddModal && (
              <button
                onClick={onOpenAddModal}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-900/40 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Enlist Soldier</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Toolbar: Search, Rank, Trade, Blood Group, Battery, Status */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* 1. Search Box */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={activeSearch}
              onChange={(e) => {
                setLocalSearchTerm(e.target.value);
                setSearchQuery(e.target.value);
              }}
              placeholder="Search No, Name..."
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-rose-500 font-sans"
            />
          </div>

          {/* 2. Rank Filter Dropdown (Offr, JCO, Sgt, Cpl, Lcpl, Snk) */}
          <div>
            <select
              value={selectedRank}
              onChange={(e) => setSelectedRank(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500 font-sans cursor-pointer"
            >
              {rankFilterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Trade Filter Dropdown */}
          <div>
            <select
              value={selectedTrade}
              onChange={(e) => setSelectedTrade(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500 font-sans cursor-pointer"
            >
              {tradeFilterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Blood Group Filter Dropdown */}
          <div>
            <select
              value={selectedBlood}
              onChange={(e) => setSelectedBlood(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500 font-sans cursor-pointer font-mono"
            >
              {bloodFilterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Battery Filter Dropdown (Only if not fixed battery) */}
          {!fixedBattery ? (
            <div>
              <select
                value={selectedBattery}
                onChange={(e) => setSelectedBattery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500 font-sans cursor-pointer font-mono"
              >
                {batteryFilterOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300">
              <span className="text-slate-500 mr-1.5">Bty:</span>
              <span className="font-bold text-rose-400">{fixedBattery}</span>
            </div>
          )}

          {/* 6. Parade State Status Filter Dropdown */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500 font-sans cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Present">Present</option>
              <option value="On Duty">On Duty</option>
              <option value="CMH/Sick">CMH/Sick</option>
              <option value="Leave">Leave</option>
              <option value="Course/Trg">Course/Trg</option>
              <option value="Temp Duty">Temp Duty</option>
              <option value="Attached Out">Attached Out</option>
              <option value="AWOL/OSL">AWOL/OSL</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Flat Nominal Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-950 text-slate-400 uppercase tracking-wider font-mono text-[11px] border-b border-slate-800">
              <th className="py-3 px-3 w-12 text-center">SL</th>
              <th className="py-3 px-3 w-28 text-center">Army / Snk No</th>
              <th className="py-3 px-3 w-20 text-center">Rank</th>
              <th className="py-3 px-3 w-20 text-center">Trade</th>
              <th className="py-3 px-4 min-w-[180px]">Name</th>
              <th className="py-3 px-3 w-24 text-center">Battery</th>
              <th className="py-3 px-4 w-44">Parade State</th>
              <th className="py-3 px-3 w-16 text-center">Blood</th>
              <th className="py-3 px-3 w-20 text-center">Med Cat</th>
              <th className="py-3 px-3 w-24 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {filteredPersonnel.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-400 bg-slate-900/50">
                  <div className="max-w-xs mx-auto space-y-2">
                    <Filter className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="font-semibold text-slate-300">No personnel match current criteria</p>
                    <button
                      onClick={handleResetFilters}
                      className="mt-2 px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold text-xs inline-block"
                    >
                      Reset All Filters
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredPersonnel.map((person, index) => {
                const isEditing = activeEditingId === person.id;

                return (
                  <tr
                    key={person.id}
                    className="hover:bg-slate-850/70 transition-colors group cursor-default text-slate-200"
                  >
                    {/* 1. SL */}
                    <td className="py-2.5 px-3 text-center font-mono text-slate-400 text-[11px]">
                      {index + 1}
                    </td>

                    {/* 2. Army / Snk No */}
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-100 whitespace-nowrap">
                      {person.snkNo}
                    </td>

                    {/* 3. Rank (Separate Column) */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-[11px] border ${
                          ['Lt Col', 'Maj', 'Capt', 'Lt', '2Lt'].includes(person.rk)
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : ['SWO', 'WO', 'MWO'].includes(person.rk)
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : ['Sgt', 'Cpl', 'Lcpl'].includes(person.rk)
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {person.rk}
                      </span>
                    </td>

                    {/* 4. Trade (Separate Column - Short form, Dash for Officers) */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {['Lt Col', 'Maj', 'Capt', 'Lt', '2Lt'].includes(person.rk) ? (
                        <span className="font-mono text-slate-500 text-xs font-medium" title="Officers have no trade">
                          -
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-slate-800 text-cyan-300 border border-slate-700">
                          {person.trade && person.trade !== '-' ? person.trade : 'GD'}
                        </span>
                      )}
                    </td>

                    {/* 5. Full Name */}
                    <td className="py-2.5 px-4 font-semibold text-white whitespace-nowrap">
                      <button
                        onClick={() => onViewDossier(person)}
                        className="text-left hover:text-rose-400 transition-colors group-hover:underline"
                      >
                        {person.name}
                      </button>
                    </td>

                    {/* 6. Battery */}
                    <td className="py-2.5 px-3 text-center font-mono text-xs whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                        {person.battery}
                      </span>
                    </td>

                    {/* 7. Parade State with inline quick update */}
                    <td className="py-2.5 px-4">
                      {isEditing && allowStatusEdits ? (
                        <div className="flex items-center gap-1.5">
                          <select
                            defaultValue={person.status}
                            onChange={(e) =>
                              handleQuickStatusChange(person.id, e.target.value as ParadeStatus)
                            }
                            className="bg-slate-950 border border-rose-500 text-white rounded px-2 py-1 text-xs focus:outline-none"
                            autoFocus
                          >
                            {statusOptions.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => setActiveEditingId(null)}
                            className="text-slate-400 hover:text-white text-xs px-1.5"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <StatusBadge status={person.status} size="sm" />
                          {allowStatusEdits && currentUser.role !== 'CO' && !isGuest && (
                            <button
                              onClick={() => setActiveEditingId(person.id)}
                              title="Update Parade State"
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-opacity"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* 8. Blood Group */}
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-400 text-xs">
                      {person.bloodGroup || 'O+'}
                    </td>

                    {/* 9. Medical Cat */}
                    <td className="py-2.5 px-3 text-center font-mono text-[11px]">
                      <span
                        className={`px-1.5 py-0.5 rounded ${
                          person.medicalCategory === 'AYE'
                            ? 'text-emerald-400 bg-emerald-500/10'
                            : person.medicalCategory === 'BEE'
                            ? 'text-amber-400 bg-amber-500/10'
                            : 'text-rose-400 bg-rose-500/10'
                        }`}
                      >
                        {person.medicalCategory || 'AYE'}
                      </span>
                    </td>

                    {/* 10. Actions */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onViewDossier(person)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
                          title="View Dossier"
                        >
                          <Eye className="w-3.5 h-3.5 text-rose-400" />
                          <span>Dossier</span>
                        </button>
                        {onEditPerson && (
                          <button
                            onClick={() => onEditPerson(person)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-amber-950/60 text-slate-300 hover:text-amber-300 text-xs font-semibold border border-slate-700 hover:border-amber-500/50 transition-colors cursor-pointer"
                            title="Edit Personnel"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                            <span>Edit</span>
                          </button>
                        )}
                        {onDeletePerson && (
                          <button
                            onClick={() => onDeletePerson(person)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 text-xs font-semibold border border-slate-700 hover:border-rose-500/50 transition-colors cursor-pointer"
                            title="Delete Personnel"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer summary bar */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
        <div className="flex items-center gap-4">
          <span>Showing {filteredPersonnel.length} personnel</span>
          {hasActiveFilters && (
            <span className="text-amber-400 font-semibold">• Filters Active</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span>10 Medium Regiment Artillery</span>
        </div>
      </div>
    </div>
  );
};
