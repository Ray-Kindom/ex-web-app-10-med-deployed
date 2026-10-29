import React, { useState, useMemo, useRef } from 'react';
import {
  Personnel,
  Battery,
  ParadeStatus,
  normalizePersonnelStatus,
  isOfficerRank,
  isJCORank,
  isNCORank,
  isORRank,
  isRCORank,
  isNCERank,
  isNCURank,
  isCivilianRank,
} from '../../types';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';
import { exportNominalRollToPdf, exportNominalRollToWord } from '../../utils/nominalExport';
import { comparePersonnelSeniority, sortBySeniority } from '../../utils/seniorityUtils';
import { ChangeStatusModal } from './ChangeStatusModal';
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
  Shield,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Save,
  Check,
  X,
  Lock,
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
  const {
    updateParadeStatus,
    updatePersonnel,
    currentUser,
    showNotification,
    searchQuery,
    setSearchQuery,
    isGuest,
    ranksList,
    tradesList,
    subUnitsList,
    theme,
  } = useApp();

  const isLight = theme === 'light';

  const safePersonnel = useMemo(() => (Array.isArray(personnel) ? personnel.filter(Boolean) : []), [personnel]);
  const safeRanks = useMemo(() => (Array.isArray(ranksList) ? ranksList.filter(Boolean) : []), [ranksList]);
  const safeTrades = useMemo(() => (Array.isArray(tradesList) ? tradesList.filter(Boolean) : []), [tradesList]);

  // Inline editing state for Master Personnel Database (No separate window or popup)
  const [inlineEditingPersonId, setInlineEditingPersonId] = useState<string | null>(null);
  const [editSnkNo, setEditSnkNo] = useState('');
  const [editRank, setEditRank] = useState('');
  const [editName, setEditName] = useState('');
  const [editBattery, setEditBattery] = useState<Battery>('HQ');
  const [editTrade, setEditTrade] = useState('');
  const [editBloodGroup, setEditBloodGroup] = useState('O+');
  const [editMedicalCat, setEditMedicalCat] = useState('AYE');
  const [editMobileNo, setEditMobileNo] = useState('');
  const [editRemarks, setEditRemarks] = useState('');

  const canEditAny =
    !isGuest &&
    (currentUser.role === 'RSM' ||
      currentUser.role === 'Admin' ||
      currentUser.role === '2IC' ||
      currentUser.role === 'Adjutant');

  const canEditPerson = (person: Personnel) => {
    if (isGuest) return false;
    if (canEditAny) return true;
    if (
      (currentUser.role === 'Battery In-charge' || currentUser.assignedBattery) &&
      person.battery === currentUser.assignedBattery
    ) {
      return true;
    }
    return false;
  };

  const startInlineEdit = (person: Personnel) => {
    if (!canEditPerson(person)) {
      showNotification(
        `⚠️ আপনি ${currentUser.role} হিসেবে শুধুমাত্র ${currentUser.assignedBattery || 'আপনার ব্যাটারি'}-এর সৈনিকের তথ্য পরিবর্তন করতে পারবেন।`
      );
      return;
    }

    setInlineEditingPersonId(person.id);
    setEditSnkNo(person.snkNo || '');
    setEditRank(person.rk || '');
    setEditName(person.name || '');
    setEditBattery(person.battery || 'HQ');
    setEditTrade(person.trade || '');
    setEditBloodGroup(person.bloodGroup || 'O+');
    setEditMedicalCat(person.medicalCategory || 'AYE');
    setEditMobileNo(person.mobileNo || '');
    setEditRemarks(person.remarks || person.rmk || '');
  };

  const cancelInlineEdit = () => {
    setInlineEditingPersonId(null);
  };

  const saveInlineEdit = (personId: string) => {
    if (isGuest) {
      alert('গেস্ট মোডে তথ্য পরিবর্তন করা যাবে না (View-Only)।');
      return;
    }
    if (!editSnkNo.trim()) {
      alert('সৈনিক নম্বর (Army / Soldier No) প্রদান করুন।');
      return;
    }
    if (!editName.trim()) {
      alert('নাম প্রদান করুন।');
      return;
    }

    updatePersonnel(personId, {
      snkNo: editSnkNo.trim(),
      rk: editRank.trim(),
      name: editName.trim(),
      battery: editBattery,
      trade: editTrade.trim(),
      bloodGroup: editBloodGroup,
      medicalCategory: editMedicalCat,
      mobileNo: editMobileNo.trim() || undefined,
      remarks: editRemarks.trim() || undefined,
      rmk: editRemarks.trim() || undefined,
    });

    showNotification('পার্সোনেল তথ্য সফলভাবে পরিবর্তন ও সংরক্ষণ করা হয়েছে।');
    setInlineEditingPersonId(null);
  };

  const rankOptions = useMemo(() => {
    if (safeRanks.length > 0) return safeRanks.map((r) => r.name);
    return [
      'Col',
      'Lt Col',
      'Maj',
      'Capt',
      'Lt',
      '2Lt',
      'MWO',
      'SWO',
      'WO',
      'Sgt',
      'Cpl',
      'L/Cpl',
      'Snk',
      'NC(E)',
      'NC(U)',
      'Civilian',
    ];
  }, [safeRanks]);

  const batteryOptions = useMemo(() => {
    if (subUnitsList && subUnitsList.length > 0) {
      return subUnitsList.map((s) => s.name as Battery);
    }
    return ['HQ', 'P', 'Q', 'R', 'Civilian'] as Battery[];
  }, [subUnitsList]);

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
  const [statusModalPerson, setStatusModalPerson] = useState<Personnel | null>(null);

  // Sorting State - Defaults to Military Seniority: Officers -> JCOs -> NCOs -> Soldiers
  type SortField = 'seniority' | 'snkNo' | 'rk' | 'name' | 'battery' | 'status';
  const [sortField, setSortField] = useState<SortField>('seniority');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Quick Status Edit Options - Strictly Atomic Statuses
  const statusOptions: ParadeStatus[] = [
    'In Unit',
    'P/Lve',
    'C/Lve',
    'Course',
    'CMH',
    'Line Sick',
    'FDMN',
    'Comd',
    'Att',
    'Msn',
    'ERE',
    'Civilian',
    'AWOL',
  ];

  // Dynamic Rank Filter Options
  const rankFilterOptions = useMemo(() => {
    const categoryOptions = [
      { value: 'All', label: 'All Ranks (সব পদবী)' },
      { value: 'Offr', label: 'Offr (Lt Col, Maj, Capt, Lt)' },
      { value: 'JCO', label: 'JCO (MWO, SWO, WO)' },
      { value: 'NCO', label: 'NCO (Sgt, Cpl)' },
      { value: 'OR', label: 'OR (Sgt, Cpl, Lcpl, Snk)' },
      { value: 'RCO', label: 'RCO (Religious Teacher)' },
      { value: 'NC(E)', label: 'NC(E)' },
      { value: 'NC(U)', label: 'NC(U)' },
      { value: 'Civilian', label: 'Civilian (Dupi, Barbar, Mali, Carpenter)' },
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

  // Trade Filter Options (strictly based on configured active unit trades: TA, Gnr, OCU, DMT, Clk, Ck(U), Ck(M), Tailor, E&BR, AEC)
  const tradeFilterOptions = useMemo(() => {
    const validTrades = safeTrades
      .filter((t) => t && t.isActive !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((t) => ({
        value: t.name,
        label: t.name,
      }));

    return [
      { value: 'All', label: 'All Trades' },
      ...validTrades,
    ];
  }, [safeTrades]);

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

  // Battery Filter Options - Serial: P Bty, Q Bty, R Bty, HQ Bty, EME, and Civilian Staff
  const batteryFilterOptions = [
    { value: 'All', label: 'All Batteries' },
    { value: 'P Bty', label: 'P Bty' },
    { value: 'Q Bty', label: 'Q Bty' },
    { value: 'R Bty', label: 'R Bty' },
    { value: 'HQ Bty', label: 'HQ Bty' },
    { value: 'EME', label: 'EME' },
    { value: 'Civilian', label: 'Civilian (No Battery)' },
  ];

  // Filter Logic
  const filteredPersonnel = useMemo(() => {
    const filtered = safePersonnel.filter((person) => {
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
          if (!isOfficerRank(person.rk)) return false;
        } else if (selectedRank === 'JCO') {
          if (!isJCORank(person.rk)) return false;
        } else if (selectedRank === 'NCO') {
          if (!isNCORank(person.rk)) return false;
        } else if (selectedRank === 'OR') {
          if (!isORRank(person.rk)) return false;
        } else if (selectedRank === 'RCO') {
          if (!isRCORank(person.rk, person.trade)) return false;
        } else if (selectedRank === 'NC(E)' || selectedRank === 'NCE') {
          if (!isNCERank(person.rk, person.trade)) return false;
        } else if (selectedRank === 'NC(U)' || selectedRank === 'NCU') {
          if (!isNCURank(person.rk, person.trade)) return false;
        } else if (selectedRank === 'Civilian') {
          if (!isCivilianRank(person.rk, person.trade)) return false;
        } else {
          if (person.rk !== selectedRank) return false;
        }
      }

      // 3. Trade Filter
      if (selectedTrade !== 'All') {
        const pTrade = (person.trade || '').trim().toLowerCase();
        const sTrade = selectedTrade.trim().toLowerCase();
        if (pTrade !== sTrade) return false;
      }

      // 4. Blood Group Filter
      if (selectedBlood !== 'All') {
        if (person.bloodGroup !== selectedBlood) return false;
      }

      // 5. Battery Filter
      const activeBatteryFilter = fixedBattery || selectedBattery;
      if (activeBatteryFilter !== 'All') {
        if (activeBatteryFilter === 'Civilian') {
          if (!isCivilianRank(person.rk, person.trade) && person.battery !== 'Civilian') return false;
        } else {
          if (person.battery !== activeBatteryFilter) return false;
        }
      }

      // 6. Status Filter
      if (selectedStatus !== 'All') {
        const norm = normalizePersonnelStatus(
          person.status,
          person.outOfUnitCategory,
          person.rk,
          person.trade,
          person.statusDetails
        );
        if (selectedStatus === 'Leave') {
          if (norm !== 'P/Lve' && norm !== 'C/Lve' && norm !== 'Leave') return false;
        } else if (selectedStatus === 'In Unit') {
          if (norm !== 'In Unit' && norm !== 'Present') return false;
        } else {
          if (norm !== selectedStatus && person.status !== selectedStatus) return false;
        }
      }

      return true;
    });

    // Default Sort: Military Seniority (Officers -> JCOs -> NCOs -> Soldiers / OR -> RCO -> Civilian)
    return [...filtered].sort((a, b) => {
      if (sortField === 'seniority' || sortField === 'rk') {
        const diff = comparePersonnelSeniority(a, b, safeRanks);
        return sortDirection === 'asc' ? diff : -diff;
      }
      if (sortField === 'snkNo') {
        const numA = parseInt((a.snkNo || '').replace(/\D/g, ''), 10);
        const numB = parseInt((b.snkNo || '').replace(/\D/g, ''), 10);
        if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
          return sortDirection === 'asc' ? numA - numB : numB - numA;
        }
        const diff = (a.snkNo || '').localeCompare(b.snkNo || '', undefined, { numeric: true, sensitivity: 'base' });
        return sortDirection === 'asc' ? diff : -diff;
      }
      if (sortField === 'name') {
        const diff = (a.name || '').localeCompare(b.name || '');
        return sortDirection === 'asc' ? diff : -diff;
      }
      if (sortField === 'battery') {
        const diff = (a.battery || '').localeCompare(b.battery || '');
        if (diff !== 0) return sortDirection === 'asc' ? diff : -diff;
        return comparePersonnelSeniority(a, b, safeRanks);
      }
      if (sortField === 'status') {
        const diff = (a.status || '').localeCompare(b.status || '');
        if (diff !== 0) return sortDirection === 'asc' ? diff : -diff;
        return comparePersonnelSeniority(a, b, safeRanks);
      }
      return comparePersonnelSeniority(a, b, safeRanks);
    });
  }, [
    safePersonnel,
    safeRanks,
    activeSearch,
    selectedRank,
    selectedTrade,
    selectedBlood,
    selectedBattery,
    fixedBattery,
    selectedStatus,
    sortField,
    sortDirection,
  ]);

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
    setSortField('seniority');
    setSortDirection('asc');
  };

  const hasActiveFilters =
    activeSearch !== '' ||
    selectedRank !== 'All' ||
    selectedTrade !== 'All' ||
    selectedBlood !== 'All' ||
    (!fixedBattery && selectedBattery !== 'All') ||
    selectedStatus !== 'All';

  return (
    <div className={`rounded-2xl border shadow-xl overflow-hidden transition-colors duration-200 ${
      isLight ? 'bg-white border-slate-200 text-slate-900 shadow-md' : 'bg-slate-900 border-slate-800 text-white'
    }`}>
      {/* Header Bar */}
      <div className={`p-4 sm:p-5 border-b transition-colors ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/90 border-slate-800'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Title & Count */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className={`text-lg font-bold font-sans tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {title || 'Nominal'}
              </h2>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${
                isLight ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-rose-600/20 text-rose-300 border-rose-500/40'
              }`}>
                {filteredPersonnel.length} / {personnel.length}
              </span>
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-mono ${
                isLight ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                <Shield className="w-3 h-3 text-emerald-500" />
                <span>Seniority: Offr → JCO → NCO → OR</span>
              </div>
            </div>
          </div>

          {/* Action Controls: Download Nominal, Enlist Soldier, Reset */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
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
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border shadow-md transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700 shadow-md'
                }`}
              >
                <Download className="w-3.5 h-3.5 text-rose-500" />
                <span>Download Nominal</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isExportMenuOpen && (
                <div className={`absolute right-0 mt-2 w-56 rounded-xl shadow-2xl py-1.5 z-40 border ${
                  isLight
                    ? 'bg-white border-slate-200 text-slate-800 divide-y divide-slate-100'
                    : 'bg-slate-900 border-slate-700 text-slate-200 divide-y divide-slate-800'
                }`}>
                  <div className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider font-mono border-b ${
                    isLight ? 'text-slate-500 border-slate-100' : 'text-slate-400 border-slate-800'
                  }`}>
                    Export Filtered Nominal Roll
                  </div>
                  <button
                    onClick={handlePrintFilteredNominal}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors cursor-pointer ${
                      isLight ? 'hover:bg-slate-50 text-slate-800' : 'hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Printer className="w-4 h-4 text-rose-500" />
                    <div>
                      <div className={`font-semibold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>Print / PDF Nominal</div>
                      <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Official formatted print layout</div>
                    </div>
                  </button>
                  <button
                    onClick={handleWordExport}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors cursor-pointer ${
                      isLight ? 'hover:bg-slate-50 text-slate-800' : 'hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-blue-500" />
                    <div>
                      <div className={`font-semibold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>Word Document (.doc)</div>
                      <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Editable Microsoft Word table</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Enlist Soldier (RSM Role) */}
            {currentUser.role === 'RSM' && !isGuest && onOpenAddModal && (
              <button
                onClick={onOpenAddModal}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-900/40 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Enlist Soldier</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Toolbar: Search, Rank, Trade, Blood Group, Battery, Status */}
        <div className={`mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 ${
          isLight ? 'border-slate-200' : 'border-slate-800/80'
        }`}>
          {/* 1. Search Box */}
          <div className="relative">
            <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isLight ? 'text-slate-400' : 'text-slate-400'}`} />
            <input
              type="text"
              value={activeSearch}
              onChange={(e) => {
                setLocalSearchTerm(e.target.value);
                setSearchQuery(e.target.value);
              }}
              placeholder="Search No, Name..."
              className={`w-full rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-rose-500 font-sans transition-colors ${
                isLight
                  ? 'bg-white border border-slate-300 text-slate-900 placeholder-slate-400 shadow-sm'
                  : 'bg-slate-900 border border-slate-700/80 text-white placeholder-slate-400'
              }`}
            />
          </div>

          {/* 2. Rank Filter Dropdown (Offr, JCO, Sgt, Cpl, Lcpl, Snk) */}
          <div>
            <select
              value={selectedRank}
              onChange={(e) => setSelectedRank(e.target.value)}
              className={`w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-rose-500 font-sans cursor-pointer transition-colors ${
                isLight
                  ? 'bg-white border border-slate-300 text-slate-900 shadow-sm'
                  : 'bg-slate-900 border border-slate-700/80 text-white'
              }`}
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
              className={`w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-rose-500 font-sans cursor-pointer transition-colors ${
                isLight
                  ? 'bg-white border border-slate-300 text-slate-900 shadow-sm'
                  : 'bg-slate-900 border border-slate-700/80 text-white'
              }`}
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
              className={`w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-rose-500 font-sans cursor-pointer font-mono transition-colors ${
                isLight
                  ? 'bg-white border border-slate-300 text-slate-900 shadow-sm'
                  : 'bg-slate-900 border border-slate-700/80 text-white'
              }`}
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
                className={`w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-rose-500 font-sans cursor-pointer font-mono transition-colors ${
                  isLight
                    ? 'bg-white border border-slate-300 text-slate-900 shadow-sm'
                    : 'bg-slate-900 border border-slate-700/80 text-white'
                }`}
              >
                {batteryFilterOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-mono border ${
              isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-950 border-slate-800 text-slate-300'
            }`}>
              <span className={`mr-1.5 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Bty:</span>
              <span className="font-bold text-rose-500">{fixedBattery}</span>
            </div>
          )}

          {/* 6. Parade State Status Filter Dropdown */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className={`w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-rose-500 font-sans cursor-pointer transition-colors ${
                isLight
                  ? 'bg-white border border-slate-300 text-slate-900 shadow-sm'
                  : 'bg-slate-900 border border-slate-700/80 text-white'
              }`}
            >
              <option value="All">All Statuses (সব স্ট্যাটাস)</option>
              <option value="In Unit">In Unit (ইউনিটে উপস্থিতি)</option>
              <option value="P/Lve">P/Lve (বাৎসরিক ছুটি)</option>
              <option value="C/Lve">C/Lve (নৈমিত্তিক ছুটি)</option>
              <option value="Leave">All Leave (ছুটি - P/Lve + C/Lve)</option>
              <option value="Course">Course (কোর্স / প্রশিক্ষণ)</option>
              <option value="CMH">CMH (সিএমএইচ ভর্তি)</option>
              <option value="Line Sick">Line Sick (লাইন সিক - Off Parade)</option>
              <option value="FDMN">FDMN (হোয়াইকং ফিল্ড ডিউটি)</option>
              <option value="Comd">Comd (কমান্ড / ফরমেশন)</option>
              <option value="Att">Att (সংযুক্ত / Attachment)</option>
              <option value="Msn">Msn (জাতিসংঘ শান্তিরক্ষা মিশন)</option>
              <option value="ERE">ERE (নন-পোস্টেড)</option>
              <option value="Civilian">Civilian Staff (বেসামরিক কর্মী)</option>
              <option value="AWOL">AWOL (অনুপস্থিত)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Flat Nominal Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className={`${isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-950 text-slate-400 border-slate-800'} uppercase tracking-wider font-mono text-[11px] border-b`}>
              <th className="py-3 px-3 w-12 text-center">SL</th>
              <th
                onClick={() => toggleSort('snkNo')}
                className={`py-3 px-3 w-32 text-center cursor-pointer select-none transition-colors ${isLight ? 'hover:text-slate-950' : 'hover:text-white'}`}
                title="Click to sort by Army / Soldier Number"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Army / Snk No</span>
                  {sortField === 'snkNo' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-rose-400" /> : <ArrowDown className="w-3 h-3 text-rose-400" />
                  ) : (
                    <ArrowUpDown className="w-2.5 h-2.5 opacity-30 hover:opacity-100" />
                  )}
                </div>
              </th>
              <th
                onClick={() => toggleSort('seniority')}
                className={`py-3 px-3 w-28 text-center cursor-pointer select-none transition-colors ${isLight ? 'hover:text-slate-950' : 'hover:text-white'}`}
                title="Default: Military Seniority (Officers -> JCOs -> NCOs -> Soldiers)"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Rank</span>
                  {sortField === 'seniority' || sortField === 'rk' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <ArrowUpDown className="w-2.5 h-2.5 opacity-30 hover:opacity-100" />
                  )}
                </div>
              </th>
              <th className="py-3 px-3 w-20 text-center">Trade</th>
              <th
                onClick={() => toggleSort('name')}
                className={`py-3 px-4 min-w-[180px] cursor-pointer select-none transition-colors ${isLight ? 'hover:text-slate-950' : 'hover:text-white'}`}
                title="Click to sort alphabetically by Name"
              >
                <div className="flex items-center gap-1">
                  <span>Name</span>
                  {sortField === 'name' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-rose-400" /> : <ArrowDown className="w-3 h-3 text-rose-400" />
                  ) : (
                    <ArrowUpDown className="w-2.5 h-2.5 opacity-30 hover:opacity-100" />
                  )}
                </div>
              </th>
              <th
                onClick={() => toggleSort('battery')}
                className={`py-3 px-3 w-24 text-center cursor-pointer select-none transition-colors ${isLight ? 'hover:text-slate-950' : 'hover:text-white'}`}
                title="Click to sort by Battery"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Battery</span>
                  {sortField === 'battery' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-rose-400" /> : <ArrowDown className="w-3 h-3 text-rose-400" />
                  ) : (
                    <ArrowUpDown className="w-2.5 h-2.5 opacity-30 hover:opacity-100" />
                  )}
                </div>
              </th>
              <th
                onClick={() => toggleSort('status')}
                className={`py-3 px-4 w-44 cursor-pointer select-none transition-colors ${isLight ? 'hover:text-slate-950' : 'hover:text-white'}`}
                title="Click to sort by Parade State"
              >
                <div className="flex items-center gap-1">
                  <span>Parade State</span>
                  {sortField === 'status' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-rose-400" /> : <ArrowDown className="w-3 h-3 text-rose-400" />
                  ) : (
                    <ArrowUpDown className="w-2.5 h-2.5 opacity-30 hover:opacity-100" />
                  )}
                </div>
              </th>
              <th className="py-3 px-3 w-16 text-center">Blood</th>
              <th className="py-3 px-3 w-20 text-center">Med Cat</th>
              <th className="py-3 px-3 w-24 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className={isLight ? "divide-y divide-slate-200" : "divide-y divide-slate-800/80"}>
            {filteredPersonnel.length === 0 ? (
              <tr>
                <td colSpan={10} className={`py-12 text-center ${isLight ? 'text-slate-500 bg-slate-50' : 'text-slate-400 bg-slate-900/50'}`}>
                  <div className="max-w-xs mx-auto space-y-2">
                    <Filter className={`w-8 h-8 mx-auto ${isLight ? 'text-slate-400' : 'text-slate-600'}`} />
                    <p className={`font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>No personnel match current criteria</p>
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
                if (inlineEditingPersonId === person.id) {
                  return (
                    <tr
                      key={person.id}
                      className={isLight ? "bg-amber-50 border-y border-amber-300 shadow-inner" : "bg-amber-950/40 border-y border-amber-500/60 shadow-inner"}
                    >
                      {/* 1. SL */}
                      <td className={`py-2 px-3 text-center font-mono text-[11px] ${isLight ? 'text-slate-600 font-semibold' : 'text-slate-400'}`}>
                        {index + 1}
                      </td>

                      {/* 2. Army / Snk No */}
                      <td className="py-1 px-1.5 text-center">
                        <input
                          type="text"
                          value={editSnkNo}
                          onChange={(e) => setEditSnkNo(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveInlineEdit(person.id);
                            if (e.key === 'Escape') cancelInlineEdit();
                          }}
                          autoFocus
                          className={`w-full border border-amber-500 rounded px-1.5 py-1 text-center font-mono font-bold text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 ${
                            isLight ? 'bg-white text-amber-800' : 'bg-slate-900 text-amber-300'
                          }`}
                        />
                      </td>

                      {/* 3. Rank */}
                      <td className="py-1 px-1.5 text-center">
                        <select
                          value={editRank}
                          onChange={(e) => setEditRank(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveInlineEdit(person.id);
                            if (e.key === 'Escape') cancelInlineEdit();
                          }}
                          className={`w-full border border-amber-500 rounded px-1 py-1 text-center font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer ${
                            isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
                          }`}
                        >
                          {rankOptions.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* 4. Trade */}
                      <td className="py-1 px-1.5 text-center">
                        <input
                          list="trade-options-inline"
                          type="text"
                          value={editTrade}
                          onChange={(e) => setEditTrade(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveInlineEdit(person.id);
                            if (e.key === 'Escape') cancelInlineEdit();
                          }}
                          className={`w-full border border-amber-500 rounded px-1.5 py-1 text-center font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 ${
                            isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
                          }`}
                        />
                        <datalist id="trade-options-inline">
                          {safeTrades.map((t) => (
                            <option key={t.id || t.name} value={t.name} />
                          ))}
                        </datalist>
                      </td>

                      {/* 5. Name */}
                      <td className="py-1 px-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveInlineEdit(person.id);
                            if (e.key === 'Escape') cancelInlineEdit();
                          }}
                          className={`w-full border border-amber-500 rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-400 ${
                            isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
                          }`}
                        />
                      </td>

                      {/* 6. Battery */}
                      <td className="py-1 px-1.5 text-center">
                        <select
                          value={editBattery}
                          onChange={(e) => setEditBattery(e.target.value as Battery)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveInlineEdit(person.id);
                            if (e.key === 'Escape') cancelInlineEdit();
                          }}
                          className={`w-full border border-amber-500 rounded px-1 py-1 text-center font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer ${
                            isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
                          }`}
                        >
                          {batteryOptions.map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* 7. Parade State */}
                      <td className="py-1 px-3 text-center">
                        <StatusBadge status={person.status} />
                      </td>

                      {/* 8. Blood */}
                      <td className="py-1 px-1 text-center">
                        <select
                          value={editBloodGroup}
                          onChange={(e) => setEditBloodGroup(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveInlineEdit(person.id);
                            if (e.key === 'Escape') cancelInlineEdit();
                          }}
                          className={`w-full border border-amber-500 rounded px-1 py-1 text-center font-mono font-bold text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer ${
                            isLight ? 'bg-white text-rose-600' : 'bg-slate-900 text-rose-400'
                          }`}
                        >
                          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                            <option key={bg} value={bg}>
                              {bg}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* 9. Med Cat */}
                      <td className="py-1 px-1 text-center">
                        <select
                          value={editMedicalCat}
                          onChange={(e) => setEditMedicalCat(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveInlineEdit(person.id);
                            if (e.key === 'Escape') cancelInlineEdit();
                          }}
                          className={`w-full border border-amber-500 rounded px-1 py-1 text-center font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer ${
                            isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
                          }`}
                        >
                          <option value="AYE">AYE</option>
                          <option value="BEE">BEE</option>
                          <option value="CEE">CEE</option>
                        </select>
                      </td>

                      {/* 10. Actions */}
                      <td className="py-1 px-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => saveInlineEdit(person.id)}
                            title="Save (সংরক্ষণ করুন / Enter)"
                            className="p-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white shadow transition-all cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={cancelInlineEdit}
                            title="Cancel (বাতিল / Esc)"
                            className={`p-1.5 rounded transition-all cursor-pointer ${
                              isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            }`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                const isEditing = activeEditingId === person.id;

                return (
                  <tr
                    key={person.id}
                    className={`transition-colors group cursor-default ${
                      isLight
                        ? 'hover:bg-slate-100/80 text-slate-800'
                        : 'hover:bg-slate-850/70 text-slate-200'
                    }`}
                  >
                    {/* 1. SL */}
                    <td className={`py-2.5 px-3 text-center font-mono text-[11px] ${isLight ? 'text-slate-600 font-semibold' : 'text-slate-400'}`}>
                      {index + 1}
                    </td>

                    {/* 2. Army / Snk No */}
                    <td className={`py-2.5 px-3 text-center font-mono font-bold whitespace-nowrap ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                      {person.snkNo}
                    </td>

                    {/* 3. Rank (Separate Column) */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-[11px] border ${
                          ['Lt Col', 'Maj', 'Capt', 'Lt', '2Lt'].includes(person.rk)
                            ? isLight
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : ['SWO', 'WO', 'MWO'].includes(person.rk)
                            ? isLight
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : ['Sgt', 'Cpl', 'Lcpl'].includes(person.rk)
                            ? isLight
                              ? 'bg-blue-100 text-blue-900 border-blue-300'
                              : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                            : isLight
                            ? 'bg-slate-100 text-slate-800 border-slate-300'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {person.rk}
                      </span>
                    </td>

                    {/* 4. Trade (Separate Column - Short form, Dash for Officers and NC(E)) */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {['Lt Col', 'Maj', 'Capt', 'Lt', '2Lt', 'NC(E)', 'NC (E)'].includes(person.rk) || isNCERank(person.rk, person.trade) || person.trade === '-' || !person.trade ? (
                        <span className={`font-mono text-xs font-medium ${isLight ? 'text-slate-400' : 'text-slate-500'}`} title="No trade">
                          -
                        </span>
                      ) : (
                        <span className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-[11px] border ${
                          isLight
                            ? 'bg-cyan-50 text-cyan-900 border-cyan-200'
                            : 'bg-slate-800 text-cyan-300 border-slate-700'
                        }`}>
                          {person.trade}
                        </span>
                      )}
                    </td>

                    {/* 5. Full Name */}
                    <td className={`py-2.5 px-4 font-semibold whitespace-nowrap ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      <button
                        type="button"
                        onClick={() => onViewDossier(person)}
                        className={`text-left hover:underline transition-colors cursor-pointer ${
                          isLight ? 'hover:text-emerald-700 text-slate-900' : 'hover:text-emerald-400 text-white'
                        }`}
                        title="ক্লিক করে ডসিয়ার দেখুন (Click to view dossier)"
                      >
                        {person.name}
                      </button>
                    </td>

                    {/* 6. Battery */}
                    <td className="py-2.5 px-3 text-center font-mono text-xs whitespace-nowrap">
                      {isCivilianRank(person.rk, person.trade) || person.battery === 'Civilian' ? (
                        <span className={`px-2 py-0.5 rounded font-semibold shadow-sm border ${
                          isLight
                            ? 'bg-purple-100 border-purple-300 text-purple-900'
                            : 'bg-purple-950/70 border-purple-800/80 text-purple-300'
                        }`}>
                          Civilian
                        </span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded border ${
                          isLight
                            ? 'bg-slate-100 border-slate-300 text-slate-700 font-medium'
                            : 'bg-slate-950 border-slate-800 text-slate-300'
                        }`}>
                          {person.battery || '-'}
                        </span>
                      )}
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
                            className={`border border-rose-500 rounded px-2 py-1 text-xs focus:outline-none ${
                              isLight ? 'bg-white text-slate-900' : 'bg-slate-950 text-white'
                            }`}
                            autoFocus
                          >
                            {statusOptions.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => {
                              setActiveEditingId(null);
                              setStatusModalPerson(person);
                            }}
                            title="Open Full Status & Location Dialog"
                            className={`p-1 rounded text-xs ${
                              isLight
                                ? 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                                : 'bg-rose-600/20 text-rose-300 hover:bg-rose-600/30'
                            }`}
                          >
                            Details
                          </button>
                          <button
                            onClick={() => setActiveEditingId(null)}
                            className={`text-xs px-1 ${
                              isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (allowStatusEdits && currentUser.role !== 'CO' && !isGuest) {
                                setStatusModalPerson(person);
                              }
                            }}
                            className={`text-left group/badge transition-transform ${
                              allowStatusEdits && currentUser.role !== 'CO' && !isGuest
                                ? 'hover:scale-[1.02] cursor-pointer'
                                : 'cursor-default'
                            }`}
                          >
                            <StatusBadge
                              status={person.status}
                              outOfUnitCategory={person.outOfUnitCategory}
                              details={
                                person.location
                                  ? `${person.location}${person.durationDays ? ` • ${person.durationDays}d` : ''}`
                                  : person.statusDetails
                              }
                              size="sm"
                            />
                          </button>
                          {allowStatusEdits && currentUser.role !== 'CO' && !isGuest && (
                            <button
                              onClick={() => setStatusModalPerson(person)}
                              title="Update Status, Dates & Location"
                              className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity cursor-pointer ${
                                isLight
                                  ? 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
                                  : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* 8. Blood Group */}
                    <td className={`py-2.5 px-3 text-center font-mono font-bold text-xs ${
                      isLight ? 'text-rose-600' : 'text-rose-400'
                    }`}>
                      {person.bloodGroup || 'O+'}
                    </td>

                    {/* 9. Medical Cat */}
                    <td className="py-2.5 px-3 text-center font-mono text-[11px]">
                      <span
                        className={`px-1.5 py-0.5 rounded font-semibold ${
                          person.medicalCategory === 'AYE'
                            ? isLight ? 'text-emerald-700 bg-emerald-100 border border-emerald-200' : 'text-emerald-400 bg-emerald-500/10'
                            : person.medicalCategory === 'BEE'
                            ? isLight ? 'text-amber-800 bg-amber-100 border border-amber-200' : 'text-amber-400 bg-amber-500/10'
                            : isLight ? 'text-rose-700 bg-rose-100 border border-rose-200' : 'text-rose-400 bg-rose-500/10'
                        }`}
                      >
                        {person.medicalCategory || 'AYE'}
                      </span>
                    </td>

                    {/* 10. Actions */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {(onEditPerson || canEditPerson(person)) && (
                          <button
                            type="button"
                            onClick={() => startInlineEdit(person)}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                              isLight
                                ? 'bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-800 border-slate-300 hover:border-amber-400'
                                : 'bg-slate-800 hover:bg-amber-950/60 text-slate-300 hover:text-amber-300 border-slate-700 hover:border-amber-500/50'
                            }`}
                            title="Edit Personnel (সরাসরি টেবিলে এডিট)"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-amber-500" />
                            <span>Edit</span>
                          </button>
                        )}
                        {onDeletePerson && (
                          <button
                            onClick={() => onDeletePerson(person)}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                              isLight
                                ? 'bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-800 border-slate-300 hover:border-rose-400'
                                : 'bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border-slate-700 hover:border-rose-500/50'
                            }`}
                            title="Delete Personnel"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
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
      <div className={`p-3 border-t flex items-center justify-between text-xs font-mono ${
        isLight
          ? 'bg-slate-50 border-slate-200 text-slate-600'
          : 'bg-slate-950 border-slate-800 text-slate-400'
      }`}>
        <div className="flex items-center gap-4">
          <span>Showing {filteredPersonnel.length} personnel</span>
          {hasActiveFilters && (
            <span className={isLight ? "text-amber-700 font-semibold" : "text-amber-400 font-semibold"}>• Filters Active</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span>10 Medium Regiment Artillery</span>
        </div>
      </div>

      {/* Change Status Modal */}
      <ChangeStatusModal
        isOpen={Boolean(statusModalPerson)}
        onClose={() => setStatusModalPerson(null)}
        personnel={statusModalPerson}
      />
    </div>
  );
};
