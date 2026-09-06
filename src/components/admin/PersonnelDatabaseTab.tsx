import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Personnel, Battery, ParadeStatus, MilitaryRank } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { AddPersonnelModal } from '../personnel/AddPersonnelModal';
import { EditPersonnelModal } from '../personnel/EditPersonnelModal';
import { PersonnelDossierModal } from '../personnel/PersonnelDossierModal';
import {
  Users,
  Search,
  Plus,
  Download,
  Upload,
  RefreshCw,
  Edit2,
  Trash2,
  Eye,
  CheckSquare,
  Square,
  Filter,
  Shield,
  Cloud,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  FileSpreadsheet,
  Check,
  X,
  Heart,
  Building2,
  Award,
  Hash,
  User,
} from 'lucide-react';

export const PersonnelDatabaseTab: React.FC = () => {
  const {
    personnelList,
    deletePersonnel,
    updatePersonnel,
    syncNominalRollToCloud,
    showNotification,
    isGuest,
    ranksList,
    tradesList,
    subUnitsList,
  } = useApp();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBattery, setSelectedBattery] = useState<string>('All');
  const [selectedRankCategory, setSelectedRankCategory] = useState<string>('All');
  const [selectedTrade, setSelectedTrade] = useState<string>('All');
  const [selectedBloodGroup, setSelectedBloodGroup] = useState<string>('All');

  // Inline Quick Edit state for the 6 core nominal attributes
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineEditForm, setInlineEditForm] = useState<{
    snkNo: string;
    rk: string;
    trade: string;
    name: string;
    battery: Battery;
    bloodGroup: string;
  }>({
    snkNo: '',
    rk: 'Snk',
    trade: 'Gnr',
    name: '',
    battery: 'P Bty',
    bloodGroup: 'O+',
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Personnel | null>(null);
  const [dossierPerson, setDossierPerson] = useState<Personnel | null>(null);
  const [deleteConfirmPerson, setDeleteConfirmPerson] = useState<Personnel | null>(null);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  // CSV Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');

  // High-level Stats focused on permanent nominal distribution
  const stats = useMemo(() => {
    const total = personnelList.length;
    let officers = 0;
    let jcos = 0;
    let ncos = 0;
    let ors = 0;
    let civilians = 0;

    let pBty = 0;
    let qBty = 0;
    let rBty = 0;
    let hqBty = 0;

    personnelList.forEach((p) => {
      const rk = p.rk;
      if (['Lt Col', 'Maj', 'Capt', 'Lt', '2Lt'].includes(rk)) officers++;
      else if (['SWO', 'WO', 'MWO'].includes(rk)) jcos++;
      else if (['Sgt', 'Cpl', 'Lcpl'].includes(rk)) ncos++;
      else if (['Civ', 'Civilian', 'Cook', 'NC(E)', 'NC(U)'].includes(rk)) civilians++;
      else ors++;

      if (p.battery === 'P Bty') pBty++;
      else if (p.battery === 'Q Bty') qBty++;
      else if (p.battery === 'R Bty') rBty++;
      else if (p.battery === 'HQ Bty') hqBty++;
    });

    return {
      total,
      officers,
      jcos,
      ncos,
      ors,
      civilians,
      pBty,
      qBty,
      rBty,
      hqBty,
    };
  }, [personnelList]);

  // Filtered list
  const filteredPersonnel = useMemo(() => {
    return personnelList.filter((p) => {
      // Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesQuery =
          p.name.toLowerCase().includes(query) ||
          p.snkNo.toLowerCase().includes(query) ||
          p.rk.toLowerCase().includes(query) ||
          (p.trade && p.trade.toLowerCase().includes(query)) ||
          p.battery.toLowerCase().includes(query) ||
          (p.bloodGroup && p.bloodGroup.toLowerCase().includes(query)) ||
          (p.mobileNo && p.mobileNo.includes(query)) ||
          (p.remarks && p.remarks.toLowerCase().includes(query));
        if (!matchesQuery) return false;
      }

      // Battery filter
      if (selectedBattery !== 'All' && p.battery !== selectedBattery) {
        return false;
      }

      // Rank category filter
      if (selectedRankCategory !== 'All') {
        const rk = p.rk;
        if (selectedRankCategory === 'Officer' && !['Lt Col', 'Maj', 'Capt', 'Lt', '2Lt'].includes(rk)) return false;
        if (selectedRankCategory === 'JCO' && !['SWO', 'WO', 'MWO'].includes(rk)) return false;
        if (selectedRankCategory === 'NCO' && !['Sgt', 'Cpl', 'Lcpl'].includes(rk)) return false;
        if (selectedRankCategory === 'OR' && ['Lt Col', 'Maj', 'Capt', 'Lt', '2Lt', 'SWO', 'WO', 'MWO', 'Civ', 'Civilian', 'NC(E)', 'NC(U)'].includes(rk)) return false;
        if (selectedRankCategory === 'Civilian' && !['Civ', 'Civilian', 'Cook', 'NC(E)', 'NC(U)'].includes(rk)) return false;
      }

      // Trade filter
      if (selectedTrade !== 'All') {
        const trade = p.trade || 'GD';
        if (trade !== selectedTrade) return false;
      }

      // Blood Group filter
      if (selectedBloodGroup !== 'All') {
        const bg = p.bloodGroup || 'O+';
        if (bg !== selectedBloodGroup) return false;
      }

      return true;
    });
  }, [personnelList, searchTerm, selectedBattery, selectedRankCategory, selectedTrade, selectedBloodGroup]);

  // Paginated records
  const totalPages = Math.ceil(filteredPersonnel.length / pageSize) || 1;
  const paginatedPersonnel = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPersonnel.slice(start, start + pageSize);
  }, [filteredPersonnel, currentPage, pageSize]);

  // Handle Select All visible
  const handleToggleSelectAll = () => {
    if (selectedIds.length === paginatedPersonnel.length && paginatedPersonnel.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedPersonnel.map((p) => p.id));
    }
  };

  // Handle single select
  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk Battery Reassignment
  const handleBulkChangeBattery = (targetBattery: Battery) => {
    if (isGuest) {
      showNotification('গেস্ট মোডে তথ্য পরিবর্তন করা যাবে না।');
      return;
    }
    if (selectedIds.length === 0) return;

    selectedIds.forEach((id) => {
      updatePersonnel(id, { battery: targetBattery });
    });

    showNotification(`${selectedIds.length} personnel moved to ${targetBattery}.`);
    setSelectedIds([]);
  };

  // Bulk Blood Group Assignment
  const handleBulkChangeBloodGroup = (blood: string) => {
    if (isGuest) {
      showNotification('গেস্ট মোডে তথ্য পরিবর্তন করা যাবে না।');
      return;
    }
    if (selectedIds.length === 0) return;

    selectedIds.forEach((id) => {
      updatePersonnel(id, { bloodGroup: blood });
    });

    showNotification(`${selectedIds.length} personnel blood group set to ${blood}.`);
    setSelectedIds([]);
  };

  // Inline Quick Edit Handlers (The 6 Core Attributes)
  const handleStartInlineEdit = (p: Personnel) => {
    setInlineEditingId(p.id);
    setInlineEditForm({
      snkNo: p.snkNo || '',
      rk: p.rk || 'Snk',
      trade: p.trade || 'GD',
      name: p.name || '',
      battery: p.battery || 'P Bty',
      bloodGroup: p.bloodGroup || 'O+',
    });
  };

  const handleSaveInlineEdit = (id: string) => {
    if (isGuest) {
      showNotification('গেস্ট মোডে তথ্য পরিবর্তন করা যাবে না (View-Only)।');
      return;
    }
    if (!inlineEditForm.name.trim() || !inlineEditForm.snkNo.trim()) {
      showNotification('অনুগ্রহ করে নাম এবং বিএ/সৈনিক নম্বর পূরণ করুন।');
      return;
    }
    updatePersonnel(id, {
      snkNo: inlineEditForm.snkNo.trim(),
      rk: inlineEditForm.rk,
      trade: inlineEditForm.trade.trim(),
      name: inlineEditForm.name.trim(),
      battery: inlineEditForm.battery,
      bloodGroup: inlineEditForm.bloodGroup.trim(),
    });
    showNotification(`${inlineEditForm.rk} ${inlineEditForm.name} (${inlineEditForm.snkNo})-এর তথ্য সফলভাবে পরিবর্তন ও সংরক্ষণ করা হয়েছে।`);
    setInlineEditingId(null);
  };

  // Bulk Delete
  const handleExecuteBulkDelete = () => {
    if (isGuest) {
      showNotification('গেস্ট মোডে তথ্য পরিবর্তন করা যাবে না।');
      return;
    }
    selectedIds.forEach((id) => {
      deletePersonnel(id);
    });
    showNotification(`${selectedIds.length} records removed from database.`);
    setSelectedIds([]);
    setIsBulkDeleteConfirmOpen(false);
  };

  // Cloud Sync
  const handleCloudSync = async () => {
    setIsSyncingCloud(true);
    await syncNominalRollToCloud();
    setIsSyncingCloud(false);
  };

  // Export CSV (Focused on the permanent Nominal Roll fields)
  const handleExportCSV = () => {
    const headers = [
      'Army No / Snk No',
      'Rank',
      'Trade',
      'Name',
      'Battery',
      'Blood Group',
      'Medical Category',
      'Mobile No',
      'Remarks',
    ];

    const rows = filteredPersonnel.map((p) => [
      `"${p.snkNo}"`,
      `"${p.rk}"`,
      `"${p.trade || 'GD'}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.battery}"`,
      `"${p.bloodGroup || 'O+'}"`,
      `"${p.medicalCategory || 'AYE'}"`,
      `"${p.mobileNo || ''}"`,
      `"${(p.remarks || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `10_Med_Regt_Nominal_Roll_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Nominal Roll exported as CSV successfully.');
  };

  // Simple CSV Import Parser
  const handleProcessImportCSV = () => {
    if (isGuest) {
      showNotification('গেস্ট মোডে ইমপোর্ট করা যাবে না।');
      return;
    }
    if (!csvText.trim()) {
      showNotification('অনুগ্রহ করে CSV টেক্সট পেস্ট করুন।');
      return;
    }

    try {
      const lines = csvText.trim().split('\n');
      if (lines.length < 2) {
        showNotification('CSV ফাইলে ন্যূনতম ১টি ডেটা সারি থাকতে হবে।');
        return;
      }

      let importedCount = 0;
      // Skip header
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        // Basic CSV split
        const cols = line.split(',').map((c) => c.replace(/^["']|["']$/g, '').trim());
        if (cols.length >= 3) {
          const snkNo = cols[0];
          const rk = cols[1];
          const name = cols[2];
          const trade = cols[3] || 'GD';
          const battery = (cols[4] as Battery) || 'P Bty';
          const status = (cols[5] as ParadeStatus) || 'Present';
          const bloodGroup = cols[7] || 'O+';

          // Check if exists
          const existing = personnelList.find((p) => p.snkNo === snkNo);
          if (existing) {
            updatePersonnel(existing.id, {
              rk,
              name,
              trade,
              battery,
              status,
              bloodGroup,
            });
          } else {
            const newId = `imported-${Date.now()}-${i}`;
            updatePersonnel(newId, {
              id: newId,
              snkNo,
              rk,
              name,
              trade,
              battery,
              status,
              bloodGroup,
              medicalCategory: 'AYE',
            } as any);
          }
          importedCount++;
        }
      }

      showNotification(`${importedCount} personnel records processed from CSV.`);
      setIsImportModalOpen(false);
      setCsvText('');
    } catch (err: any) {
      showNotification(`CSV Import Error: ${err?.message || 'Invalid format'}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Banner & Quick Statistics */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-700/80 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                Personnel & Nominal Roll Database
              </h2>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {personnelList.length} Total Enlisted
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              রেজিমেন্টাল সকল সৈনিক ও অফিসারের ডাটাবেজ সরাসরি নিয়ন্ত্রণ, পরিবর্তন ও ক্লাউড সিঙ্ক
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCloudSync}
            disabled={isSyncingCloud}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Force push all 606 personnel records to Cloud Firestore"
          >
            <Cloud className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-pulse text-amber-400' : 'text-cyan-400'}`} />
            <span>{isSyncingCloud ? 'Syncing...' : 'Sync Firestore'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-blue-400" />
            <span>Import CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-950/50 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Enlist Soldier</span>
          </button>
        </div>
      </div>

      {/* 2. Micro Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 text-xs font-sans">
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <span className="text-slate-400 text-[11px]">Total Personnel</span>
          <span className="text-lg font-bold font-mono text-white mt-1">{stats.total}</span>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <span className="text-amber-400 text-[11px]">Officers</span>
          <span className="text-lg font-bold font-mono text-amber-300 mt-1">{stats.officers}</span>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <span className="text-emerald-400 text-[11px]">JCOs</span>
          <span className="text-lg font-bold font-mono text-emerald-300 mt-1">{stats.jcos}</span>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <span className="text-blue-400 text-[11px]">NCOs</span>
          <span className="text-lg font-bold font-mono text-blue-300 mt-1">{stats.ncos}</span>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <span className="text-cyan-400 text-[11px]">Other Ranks (OR)</span>
          <span className="text-lg font-bold font-mono text-cyan-300 mt-1">{stats.ors}</span>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <span className="text-purple-400 text-[11px]">Civilians</span>
          <span className="text-lg font-bold font-mono text-purple-300 mt-1">{stats.civilians}</span>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between col-span-2 sm:col-span-1">
          <span className="text-rose-400 text-[11px]">Sub-Unit Distribution</span>
          <div className="text-[11px] font-mono text-slate-300 mt-1 space-y-0.5">
            <div>P: <strong className="text-white">{stats.pBty}</strong> | Q: <strong className="text-white">{stats.qBty}</strong></div>
            <div>R: <strong className="text-white">{stats.rBty}</strong> | HQ: <strong className="text-white">{stats.hqBty}</strong></div>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by Army No, Name, Rank, Trade, Battery, Blood Group..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:border-rose-500 focus:outline-none"
          />
        </div>

        {/* Filter Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Battery Filter */}
          <select
            value={selectedBattery}
            onChange={(e) => {
              setSelectedBattery(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-rose-500 focus:outline-none cursor-pointer"
          >
            <option value="All">All Batteries (সব ব্যাটারি)</option>
            {subUnitsList.map((su) => (
              <option key={su.id} value={su.name}>
                {su.name}
              </option>
            ))}
          </select>

          {/* Rank Group Filter */}
          <select
            value={selectedRankCategory}
            onChange={(e) => {
              setSelectedRankCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-rose-500 focus:outline-none cursor-pointer"
          >
            <option value="All">All Ranks (সব পদবি)</option>
            <option value="Officer">Officers</option>
            <option value="JCO">JCOs</option>
            <option value="NCO">NCOs</option>
            <option value="OR">ORs</option>
            <option value="Civilian">Civilians</option>
          </select>

          {/* Trade Filter */}
          <select
            value={selectedTrade}
            onChange={(e) => {
              setSelectedTrade(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-rose-500 focus:outline-none cursor-pointer"
          >
            <option value="All">All Trades (সব ট্রেড)</option>
            {tradesList.map((t) => (
              <option key={t.id} value={t.abbreviation || t.name}>
                {t.name} ({t.abbreviation})
              </option>
            ))}
          </select>

          {/* Blood Group Filter */}
          <select
            value={selectedBloodGroup}
            onChange={(e) => {
              setSelectedBloodGroup(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-rose-500 focus:outline-none cursor-pointer"
          >
            <option value="All">All Blood Groups (সব রক্তগ্রুপ)</option>
            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
              <option key={bg} value={bg}>
                {bg}
              </option>
            ))}
          </select>

          {/* Page size */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-rose-500 focus:outline-none cursor-pointer"
          >
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
            <option value={650}>All records</option>
          </select>
        </div>
      </div>

      {/* 4. Bulk Action Bar (When selected) */}
      {selectedIds.length > 0 && (
        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-600/50 flex flex-wrap items-center justify-between gap-3 text-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="font-bold text-rose-300 font-mono">
              {selectedIds.length} personnel selected
            </span>
            <button
              onClick={() => setSelectedIds([])}
              className="text-slate-400 hover:text-white underline cursor-pointer text-[11px]"
            >
              Clear Selection
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Battery Transfer Dropdown */}
            <span className="text-slate-400 text-[11px]">Move Battery:</span>
            {(['P Bty', 'Q Bty', 'R Bty', 'HQ Bty'] as Battery[]).map((bty) => (
              <button
                key={bty}
                onClick={() => handleBulkChangeBattery(bty)}
                className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 text-[11px] font-semibold cursor-pointer"
              >
                {bty}
              </button>
            ))}

            <div className="h-4 w-px bg-slate-700 mx-1" />

            {/* Blood Group Quick Set */}
            <span className="text-slate-400 text-[11px]">Set Blood:</span>
            {['A+', 'B+', 'O+', 'AB+'].map((bg) => (
              <button
                key={bg}
                onClick={() => handleBulkChangeBloodGroup(bg)}
                className="px-2 py-1 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-700 text-[11px] font-semibold cursor-pointer"
              >
                {bg}
              </button>
            ))}

            <div className="h-4 w-px bg-slate-700 mx-1" />

            <button
              onClick={() => setIsBulkDeleteConfirmOpen(true)}
              className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete Selected</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. Main Personnel Table (Focused on the 6 Core Fields) */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3 text-center w-10">
                  <button
                    onClick={handleToggleSelectAll}
                    className="p-1 hover:text-white transition-colors cursor-pointer"
                  >
                    {selectedIds.length > 0 && selectedIds.length === paginatedPersonnel.length ? (
                      <CheckSquare className="w-4 h-4 text-rose-500" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-2 text-center w-12">SL</th>
                <th className="py-3 px-3 text-center">১. বিএ বা সৈনিক নং</th>
                <th className="py-3 px-3 text-center">২. র‍্যাংক</th>
                <th className="py-3 px-3 text-center">৩. ট্রেড</th>
                <th className="py-3 px-4">৪. ফুল নাম</th>
                <th className="py-3 px-3 text-center">৫. কোন ব্যাটারি</th>
                <th className="py-3 px-3 text-center">৬. ব্লাড গ্রুপ</th>
                <th className="py-3 px-4 text-center w-40">পরিবর্তন ও অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {paginatedPersonnel.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 bg-slate-950/40">
                    <Filter className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-slate-400">ফিল্টারের সাথে মিল রেখে কোনো সৈনিক পাওয়া যায়নি।</p>
                  </td>
                </tr>
              ) : (
                paginatedPersonnel.map((person, idx) => {
                  const isSelected = selectedIds.includes(person.id);
                  const isInlineEditing = inlineEditingId === person.id;
                  const serialNo = (currentPage - 1) * pageSize + idx + 1;

                  if (isInlineEditing) {
                    return (
                      <tr
                        key={person.id}
                        className="bg-rose-950/25 border-y-2 border-rose-500/60 animate-fadeIn"
                      >
                        {/* Select indicator */}
                        <td className="py-2.5 px-3 text-center text-rose-400 font-bold">
                          ●
                        </td>

                        {/* SL */}
                        <td className="py-2.5 px-2 text-center font-mono text-slate-400 text-[11px]">
                          {serialNo}
                        </td>

                        {/* 1. BA or Snk No Inline Input */}
                        <td className="py-2 px-2 text-center">
                          <input
                            type="text"
                            value={inlineEditForm.snkNo}
                            onChange={(e) =>
                              setInlineEditForm((f) => ({ ...f, snkNo: e.target.value }))
                            }
                            className="w-28 px-2 py-1 bg-slate-950 border border-rose-500 text-white font-mono font-bold text-xs rounded text-center focus:outline-none"
                            placeholder="Snk/BA No"
                            autoFocus
                          />
                        </td>

                        {/* 2. Rank Inline Select */}
                        <td className="py-2 px-2 text-center">
                          <select
                            value={inlineEditForm.rk}
                            onChange={(e) =>
                              setInlineEditForm((f) => ({ ...f, rk: e.target.value }))
                            }
                            className="px-2 py-1 bg-slate-950 border border-amber-500 text-amber-300 font-mono font-bold text-xs rounded focus:outline-none cursor-pointer"
                          >
                            {ranksList.map((r) => (
                              <option key={r.id} value={r.abbreviation || r.name}>
                                {r.abbreviation || r.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* 3. Trade Inline Select */}
                        <td className="py-2 px-2 text-center">
                          <select
                            value={inlineEditForm.trade}
                            onChange={(e) =>
                              setInlineEditForm((f) => ({ ...f, trade: e.target.value }))
                            }
                            className="px-2 py-1 bg-slate-950 border border-cyan-500 text-cyan-300 font-mono text-xs rounded focus:outline-none cursor-pointer"
                          >
                            <option value="-">-</option>
                            {tradesList.map((t) => (
                              <option key={t.id} value={t.abbreviation || t.name}>
                                {t.abbreviation || t.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* 4. Full Name Inline Input */}
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={inlineEditForm.name}
                            onChange={(e) =>
                              setInlineEditForm((f) => ({ ...f, name: e.target.value }))
                            }
                            className="w-full min-w-[130px] px-2 py-1 bg-slate-950 border border-emerald-500 text-white font-medium text-xs rounded focus:outline-none"
                            placeholder="সৈনিকের পূর্ণ নাম"
                          />
                        </td>

                        {/* 5. Battery Inline Select */}
                        <td className="py-2 px-2 text-center">
                          <select
                            value={inlineEditForm.battery}
                            onChange={(e) =>
                              setInlineEditForm((f) => ({ ...f, battery: e.target.value as Battery }))
                            }
                            className="px-2 py-1 bg-slate-950 border border-purple-500 text-white font-mono text-xs rounded focus:outline-none cursor-pointer"
                          >
                            {subUnitsList.map((su) => (
                              <option key={su.id} value={su.name}>
                                {su.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* 6. Blood Group Inline Select */}
                        <td className="py-2 px-2 text-center">
                          <select
                            value={inlineEditForm.bloodGroup}
                            onChange={(e) =>
                              setInlineEditForm((f) => ({ ...f, bloodGroup: e.target.value }))
                            }
                            className="px-2 py-1 bg-slate-950 border border-rose-500 text-rose-400 font-mono font-bold text-xs rounded focus:outline-none cursor-pointer"
                          >
                            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                              <option key={bg} value={bg}>
                                {bg}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Save / Cancel Inline Actions */}
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSaveInlineEdit(person.id)}
                              title="পরিবর্তন সংরক্ষণ করুন (Save)"
                              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow cursor-pointer transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Save</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setInlineEditingId(null)}
                              title="বাতিল করুন (Cancel)"
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs cursor-pointer transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={person.id}
                      className={`hover:bg-slate-850/80 transition-colors group ${
                        isSelected ? 'bg-rose-950/20' : ''
                      }`}
                    >
                      {/* Select Checkbox */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => handleToggleSelectOne(person.id)}
                          className="p-1 hover:text-white transition-colors cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-rose-500" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                      </td>

                      {/* SL */}
                      <td className="py-2.5 px-2 text-center font-mono text-slate-500 text-[11px]">
                        {serialNo}
                      </td>

                      {/* 1. Army / Snk No */}
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-200 whitespace-nowrap">
                        {person.snkNo}
                      </td>

                      {/* 2. Rank */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap font-mono font-bold">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] border ${
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

                      {/* 3. Trade */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap font-mono text-cyan-300">
                        {['Lt Col', 'Maj', 'Capt', 'Lt', '2Lt'].includes(person.rk) ? (
                          <span className="text-slate-600">-</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[11px]">
                            {person.trade && person.trade !== '-' ? person.trade : 'GD'}
                          </span>
                        )}
                      </td>

                      {/* 4. Full Name */}
                      <td className="py-2.5 px-4 font-semibold text-white whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setDossierPerson(person)}
                          className="hover:text-rose-400 transition-colors text-left font-medium"
                        >
                          {person.name}
                        </button>
                      </td>

                      {/* 5. Battery */}
                      <td className="py-2.5 px-3 text-center font-mono text-xs whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                          {person.battery}
                        </span>
                      </td>

                      {/* 6. Blood Group */}
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-400 text-xs whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                          {person.bloodGroup || 'O+'}
                        </span>
                      </td>

                      {/* Database Actions */}
                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Quick Inline Edit (Pencil) */}
                          <button
                            type="button"
                            onClick={() => handleStartInlineEdit(person)}
                            title="সরাসরি লাইনে এডিট করুন (Quick Edit)"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 border border-slate-700/60 hover:border-rose-500/40 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Full Modal Edit */}
                          <button
                            type="button"
                            onClick={() => setEditingPerson(person)}
                            title="পূর্ণাঙ্গ প্রোফাইল এডিট ফর্ম"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          >
                            <Award className="w-3.5 h-3.5 text-amber-400" />
                          </button>

                          {/* Dossier */}
                          <button
                            type="button"
                            onClick={() => setDossierPerson(person)}
                            title="View Full Dossier"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-cyan-400" />
                          </button>

                          {/* Delete Soldier */}
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmPerson(person)}
                            title="Delete Soldier from Database"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

        {/* Pagination Footer */}
        <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
          <span className="text-slate-400">
            Showing{' '}
            <strong className="text-white">
              {filteredPersonnel.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
            </strong>{' '}
            to{' '}
            <strong className="text-white">
              {Math.min(currentPage * pageSize, filteredPersonnel.length)}
            </strong>{' '}
            of <strong className="text-white">{filteredPersonnel.length}</strong> personnel
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 rounded bg-slate-900 border border-slate-800 text-white font-bold">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Single Delete Confirmation Modal */}
      {deleteConfirmPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <AlertTriangle className="w-7 h-7" />
              <h3 className="text-base font-bold text-white">Delete Personnel Record?</h3>
            </div>
            <p className="text-xs text-slate-300">
              Are you sure you want to permanently delete{' '}
              <strong className="text-white">
                {deleteConfirmPerson.rk} {deleteConfirmPerson.name} ({deleteConfirmPerson.snkNo})
              </strong>{' '}
              from the active regimental database and Cloud Firestore?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmPerson(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deletePersonnel(deleteConfirmPerson.id);
                  setDeleteConfirmPerson(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {isBulkDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <AlertTriangle className="w-7 h-7" />
              <h3 className="text-base font-bold text-white">Delete {selectedIds.length} Personnel?</h3>
            </div>
            <p className="text-xs text-slate-300">
              This action will permanently delete all {selectedIds.length} selected personnel from both local state and Firebase Cloud Firestore. This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkDeleteConfirmOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg cursor-pointer"
              >
                Delete Selected Records
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Import Personnel CSV Data</h3>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Paste CSV text below with comma-separated values. Format:
              <br />
              <code className="text-cyan-300 font-mono text-[11px] block mt-1 p-2 rounded bg-slate-950 border border-slate-800">
                SnkNo,Rank,Name,Trade,Battery,Status,StatusDetails,BloodGroup
                <br />
                1234567,Snk,Mohammad Ali,GD,P Bty,Present,,O+
              </code>
            </p>

            <textarea
              rows={8}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Paste raw CSV lines here..."
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessImportCSV}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg"
              >
                Process & Import Records
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Personnel Modal */}
      <AddPersonnelModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Edit Personnel Modal */}
      <EditPersonnelModal
        isOpen={!!editingPerson}
        onClose={() => setEditingPerson(null)}
        personnel={editingPerson}
      />

      {/* View Dossier Modal */}
      <PersonnelDossierModal
        isOpen={!!dossierPerson}
        onClose={() => setDossierPerson(null)}
        person={dossierPerson}
      />
    </div>
  );
};
