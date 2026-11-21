import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import {
  Battery,
  ALL_BATTERIES,
  FamilyManRecord,
  LivingCategory,
  Personnel,
} from '../types';
import {
  fetchFamilyManStateFromSupabase,
  saveFamilyManStateToSupabase,
} from '../lib/supabase';
import { sortBySeniority } from '../utils/seniorityUtils';
import { RankBadge } from '../components/common/RankBadge';
import {
  Home,
  Building2,
  MapPin,
  Plus,
  Search,
  Trash2,
  ArrowLeftRight,
  Printer,
  RefreshCw,
  X,
  Check,
  Edit3,
  Users,
} from 'lucide-react';

interface FamilyManStatePageProps {
  onViewDossier?: (person: Personnel) => void;
}

export const FamilyManStatePage: React.FC<FamilyManStatePageProps> = ({ onViewDossier }) => {
  const { personnelList, ranksList, currentUser, isGuest, showNotification, theme } = useApp();
  const isLight = theme === 'light';

  const isBsm = ['P BSM', 'Q BSM', 'R BSM', 'HQ BSM', 'BSM'].includes(currentUser.role);
  const assignedBty = currentUser.assignedBattery;

  const [records, setRecords] = useState<FamilyManRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Two Primary Options: "In Living" vs "Out Living"
  const [activeLivingTab, setActiveLivingTab] = useState<LivingCategory>('In Living');
  const [batteryFilter, setBatteryFilter] = useState<Battery | 'All'>(
    isBsm && assignedBty ? (assignedBty as Battery) : 'All'
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Add / Edit Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalLivingType, setModalLivingType] = useState<LivingCategory>('In Living');
  const [selectedSoldierIds, setSelectedSoldierIds] = useState<string[]>([]);
  const [modalQuarterOrAddress, setModalQuarterOrAddress] = useState('');
  const [modalSinceDate, setModalSinceDate] = useState(new Date().toISOString().slice(0, 10));
  const [modalExpiryDate, setModalExpiryDate] = useState('');
  const [modalRemarks, setModalRemarks] = useState('');
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerBattery, setPickerBattery] = useState<Battery | 'All'>(
    isBsm && assignedBty ? (assignedBty as Battery) : 'All'
  );

  // Inline Edit Modal / State for single record details
  const [editingRecord, setEditingRecord] = useState<FamilyManRecord | null>(null);
  const [editQuarter, setEditQuarter] = useState('');
  const [editSinceDate, setEditSinceDate] = useState('');
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [editLivingType, setEditLivingType] = useState<LivingCategory>('In Living');

  const getExpiryBadge = (expiryDate?: string): { label: string; isExpired: boolean; isNear: boolean } | null => {
    if (!expiryDate) return null;
    const exp = new Date(expiryDate);
    if (Number.isNaN(exp.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    exp.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / 86400000);
    if (diffDays < 0) {
      return { label: `মেয়াদ শেষ (${Math.abs(diffDays)} দিন আগে)`, isExpired: true, isNear: false };
    }
    if (diffDays === 0) {
      return { label: 'আজ মেয়াদ শেষ', isExpired: true, isNear: true };
    }
    if (diffDays <= 30) {
      return { label: `বাকি ${diffDays} দিন`, isExpired: false, isNear: true };
    }
    return { label: `বাকি ${diffDays} দিন`, isExpired: false, isNear: false };
  };

  const loadFromSupabase = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchFamilyManStateFromSupabase();
      if (res.success) {
        setRecords(res.records);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFromSupabase();
  }, [loadFromSupabase]);

  const persistRecords = async (nextRecords: FamilyManRecord[]) => {
    setIsSaving(true);
    setRecords(nextRecords);
    try {
      const res = await saveFamilyManStateToSupabase(nextRecords);
      if (!res.success) {
        showNotification(`সংরক্ষণ ত্রুটি: ${res.error || 'Supabase error'}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Personnel map for live dossier linking & latest data
  const personnelMap = useMemo(() => {
    const map = new Map<string, Personnel>();
    (personnelList || []).forEach((p) => {
      map.set(p.id, p);
      if (p.snkNo) map.set(p.snkNo.toLowerCase(), p);
    });
    return map;
  }, [personnelList]);

  // Enrich Family Man records dynamically with live rank, name, battery, snkNo, trade
  const syncedRecords = useMemo(() => {
    return records.map((r) => {
      const live =
        personnelMap.get(r.personnelId) ||
        personnelMap.get((r.snkNo || '').trim().toLowerCase());
      if (!live) return r;
      return {
        ...r,
        personnelId: live.id,
        snkNo: live.snkNo || r.snkNo,
        rk: live.rk || r.rk,
        name: live.name || r.name,
        battery: live.battery || r.battery,
        trade: live.trade || r.trade || '-',
      };
    });
  }, [records, personnelMap]);

  // Scoped records (respect BSM battery restriction if applicable)
  const scopedRecords = useMemo(() => {
    if (isBsm && assignedBty) {
      return syncedRecords.filter((r) => r.battery === assignedBty);
    }
    return syncedRecords;
  }, [syncedRecords, isBsm, assignedBty]);

  const inLivingCount = useMemo(
    () => scopedRecords.filter((r) => r.livingType === 'In Living').length,
    [scopedRecords]
  );

  const outLivingCount = useMemo(
    () => scopedRecords.filter((r) => r.livingType === 'Out Living').length,
    [scopedRecords]
  );

  // Filtered list for activeLivingTab ("In Living" or "Out Living")
  const filteredRoster = useMemo(() => {
    let list = scopedRecords.filter((r) => r.livingType === activeLivingTab);

    if (batteryFilter !== 'All') {
      list = list.filter((r) => r.battery === batteryFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          (r.snkNo || '').toLowerCase().includes(q) ||
          (r.name || '').toLowerCase().includes(q) ||
          (r.rk || '').toLowerCase().includes(q) ||
          (r.sinceDate || '').toLowerCase().includes(q) ||
          (r.expiryDate || '').toLowerCase().includes(q) ||
          (r.quarterOrAddress || '').toLowerCase().includes(q) ||
          (r.remarks || '').toLowerCase().includes(q)
      );
    }

    // Sort by seniority using ranksList
    return [...list].sort((a, b) => {
      const pA = personnelMap.get(a.personnelId) || personnelMap.get((a.snkNo || '').toLowerCase());
      const pB = personnelMap.get(b.personnelId) || personnelMap.get((b.snkNo || '').toLowerCase());
      if (pA && pB) {
        const sorted = sortBySeniority([pA, pB], ranksList);
        return sorted[0].id === pA.id ? -1 : 1;
      }
      return (a.snkNo || '').localeCompare(b.snkNo || '');
    });
  }, [scopedRecords, activeLivingTab, batteryFilter, searchQuery, personnelMap, ranksList]);

  // Available personnel in picker (excluding those already in records or showing status)
  const existingPersonnelIds = useMemo(() => new Set(records.map((r) => r.personnelId)), [records]);

  const filteredPickerSoldiers = useMemo(() => {
    let list = personnelList || [];
    if (pickerBattery !== 'All') {
      list = list.filter((p) => p.battery === pickerBattery);
    }
    if (pickerSearch.trim()) {
      const q = pickerSearch.toLowerCase().trim();
      list = list.filter(
        (p) =>
          (p.snkNo || '').toLowerCase().includes(q) ||
          (p.name || '').toLowerCase().includes(q) ||
          (p.rk || '').toLowerCase().includes(q) ||
          (p.trade || '').toLowerCase().includes(q)
      );
    }
    return sortBySeniority(list, ranksList);
  }, [personnelList, pickerBattery, pickerSearch, ranksList]);

  const handleOpenAddModal = () => {
    const today = new Date().toISOString().slice(0, 10);
    setModalLivingType(activeLivingTab);
    setSelectedSoldierIds([]);
    setModalQuarterOrAddress('');
    setModalSinceDate(today);
    setModalExpiryDate('');
    setModalRemarks('');
    setPickerSearch('');
    setIsAddModalOpen(true);
  };

  const handleToggleSelectSoldier = (id: string) => {
    setSelectedSoldierIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSaveAddedSoldiers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) {
      showNotification('গেস্ট মোডে কোনো পরিবর্তন করা সম্ভব নয়।');
      return;
    }
    if (selectedSoldierIds.length === 0) {
      showNotification('অনুগ্রহ করে কমপক্ষে একজন সৈনিক নির্বাচন করুন।');
      return;
    }

    const nowIso = new Date().toISOString();
    const nextMap = new Map<string, FamilyManRecord>();
    records.forEach((r) => nextMap.set(r.personnelId, r));

    selectedSoldierIds.forEach((id) => {
      const p = personnelMap.get(id);
      if (!p) return;
      const existing = nextMap.get(p.id);
      nextMap.set(p.id, {
        id: existing?.id || `fm_${p.id}`,
        personnelId: p.id,
        snkNo: p.snkNo,
        rk: p.rk,
        name: p.name,
        battery: p.battery,
        trade: p.trade || '-',
        livingType: modalLivingType,
        quarterOrAddress: modalQuarterOrAddress.trim(),
        sinceDate: modalSinceDate,
        expiryDate: modalExpiryDate,
        remarks: modalRemarks.trim(),
        updatedAt: nowIso,
      });
    });

    const nextList = Array.from(nextMap.values());
    await persistRecords(nextList);
    setActiveLivingTab(modalLivingType);
    setIsAddModalOpen(false);
    showNotification(
      `${selectedSoldierIds.length} জন সৈনিক "${modalLivingType}" তালিকায় সংরক্ষণ করা হয়েছে।`
    );
  };

  const handleSwitchLivingType = async (record: FamilyManRecord) => {
    if (isGuest) {
      showNotification('গেস্ট মোডে কোনো পরিবর্তন করা সম্ভব নয়।');
      return;
    }
    const targetType: LivingCategory =
      record.livingType === 'In Living' ? 'Out Living' : 'In Living';
    const nextList = records.map((r) =>
      r.id === record.id
        ? { ...r, livingType: targetType, updatedAt: new Date().toISOString() }
        : r
    );
    await persistRecords(nextList);
    showNotification(`${record.rk} ${record.name}-কে "${targetType}"-এ স্থানান্তর করা হয়েছে।`);
  };

  const handleRemoveRecord = async (record: FamilyManRecord) => {
    if (isGuest) {
      showNotification('গেস্ট মোডে ডিলিট অনুমোদিত নয়।');
      return;
    }
    const nextList = records.filter((r) => r.id !== record.id);
    await persistRecords(nextList);
    showNotification(`${record.rk} ${record.name}-কে তালিকা থেকে বাদ দেওয়া হয়েছে।`);
  };

  const handleOpenEditRecord = (record: FamilyManRecord) => {
    setEditingRecord(record);
    setEditLivingType(record.livingType);
    setEditQuarter(record.quarterOrAddress || '');
    setEditSinceDate(record.sinceDate || '');
    setEditExpiryDate(record.expiryDate || '');
    setEditRemarks(record.remarks || '');
  };

  const handleSaveEditRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord || isGuest) return;
    const nextList = records.map((r) =>
      r.id === editingRecord.id
        ? {
            ...r,
            livingType: editLivingType,
            quarterOrAddress: editQuarter.trim(),
            sinceDate: editSinceDate,
            expiryDate: editExpiryDate,
            remarks: editRemarks.trim(),
            updatedAt: new Date().toISOString(),
          }
        : r
    );
    await persistRecords(nextList);
    setEditingRecord(null);
    showNotification('ফ্যামিলি ম্যান তথ্য আপডেট করা হয়েছে।');
  };

  return (
    <div className="space-y-4 pb-12 animate-fadeIn">
      {/* 1. HEADER */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border p-4 rounded-xl shadow-sm ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-500 shrink-0">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className={`text-lg font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Family Man State / ফ্যামিলি ম্যান স্টেট
              </h1>
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                  isLight
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                }`}
              >
                মোট {inLivingCount + outLivingCount} জন
              </span>
            </div>
            <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              In Living (ইউনিট কোয়ার্টার) এবং Out Living (বাইরের বাসস্থান) অনুযায়ী সৈনিকদের তালিকা
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap print:hidden">
          <button
            type="button"
            onClick={loadFromSupabase}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>রিফ্রেশ</span>
          </button>

          {!isGuest && (
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>সৈনিক যুক্ত করুন</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => window.print()}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>প্রিন্ট</span>
          </button>
        </div>
      </div>

      {/* 2. TWO LIVING OPTIONS SELECTOR: IN LIVING vs OUT LIVING */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setActiveLivingTab('In Living')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
            activeLivingTab === 'In Living'
              ? isLight
                ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
                : 'bg-emerald-950/40 border-emerald-500 shadow-lg shadow-emerald-950/30'
              : isLight
              ? 'bg-white border-slate-200 hover:border-slate-300'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                activeLivingTab === 'In Living'
                  ? 'bg-emerald-600 text-white'
                  : isLight
                  ? 'bg-slate-100 text-slate-600'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  In Living
                </h2>
                {activeLivingTab === 'In Living' && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                    Selected
                  </span>
                )}
              </div>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                ভিতরে / সেনানিবাস ফ্যামিলি কোয়ার্টারে বসবাসরত
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div
              className={`text-2xl font-mono font-bold ${
                activeLivingTab === 'In Living'
                  ? 'text-emerald-500'
                  : isLight
                  ? 'text-slate-800'
                  : 'text-slate-200'
              }`}
            >
              {inLivingCount}
            </div>
            <div className="text-[10px] font-mono text-slate-400">জন সদস্য</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveLivingTab('Out Living')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
            activeLivingTab === 'Out Living'
              ? isLight
                ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
                : 'bg-amber-950/40 border-amber-500 shadow-lg shadow-amber-950/30'
              : isLight
              ? 'bg-white border-slate-200 hover:border-slate-300'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                activeLivingTab === 'Out Living'
                  ? 'bg-amber-600 text-white'
                  : isLight
                  ? 'bg-slate-100 text-slate-600'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Out Living
                </h2>
                {activeLivingTab === 'Out Living' && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-600 text-white">
                    Selected
                  </span>
                )}
              </div>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                বাইরে / প্রাইভেট বা বহিরাগত বাসায় বসবাসরত
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div
              className={`text-2xl font-mono font-bold ${
                activeLivingTab === 'Out Living'
                  ? 'text-amber-500'
                  : isLight
                  ? 'text-slate-800'
                  : 'text-slate-200'
              }`}
            >
              {outLivingCount}
            </div>
            <div className="text-[10px] font-mono text-slate-400">জন সদস্য</div>
          </div>
        </button>
      </div>

      {/* 3. FILTER & ROSTER PANEL */}
      <div
        className={`border rounded-xl p-4 space-y-4 ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-lg border print:hidden ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
          }`}
        >
          {/* Battery Filter */}
          <div className="flex items-center gap-1 text-xs flex-wrap">
            {(['All', ...ALL_BATTERIES] as const).map((b) => (
              <button
                key={b}
                type="button"
                disabled={isBsm && Boolean(assignedBty) && b !== assignedBty}
                onClick={() => setBatteryFilter(b)}
                className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer disabled:opacity-40 ${
                  batteryFilter === b
                    ? 'bg-indigo-600 text-white font-semibold'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {b === 'All' ? 'সব ব্যাটারী' : b.replace(' Bty', '')}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="সেনা নং, নাম বা ঠিকানা খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-8 pr-2.5 py-1.5 text-xs rounded-lg border focus:outline-none focus:border-indigo-500 w-full sm:w-64 ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                  : 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500'
              }`}
            />
          </div>
        </div>

        {/* Table Header Summary */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" />
            <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {activeLivingTab} — সৈনিকদের তালিকা ({filteredRoster.length} জন)
            </h3>
          </div>
          {isSaving && (
            <span className="text-[11px] font-mono text-indigo-400">সংরক্ষণ হচ্ছে...</span>
          )}
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400 font-mono">
            Supabase ডাটাবেজ থেকে তথ্য লোড হচ্ছে...
          </div>
        ) : filteredRoster.length === 0 ? (
          <div
            className={`py-12 text-center border border-dashed rounded-xl space-y-2.5 ${
              isLight ? 'border-slate-300 bg-slate-50' : 'border-slate-800 bg-slate-950/40'
            }`}
          >
            <Home className="w-8 h-8 text-slate-400 mx-auto" />
            <p className={`text-sm font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              {activeLivingTab} তালিকায় কোনো সৈনিক যুক্ত নেই
            </p>
            <p className="text-xs text-slate-400">
              উপরে &ldquo;সৈনিক যুক্ত করুন&rdquo; বাটনে ক্লিক করে {activeLivingTab} তালিকাভুক্ত সৈনিক যোগ করুন।
            </p>
            {!isGuest && (
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{activeLivingTab}-এ সৈনিক যুক্ত করুন</span>
              </button>
            )}
          </div>
        ) : (
          <div className={`overflow-x-auto rounded-lg border ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr
                  className={`border-b text-[11px] uppercase tracking-wider font-mono ${
                    isLight
                      ? 'bg-slate-100 border-slate-200 text-slate-700'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400'
                  }`}
                >
                  <th className="py-2.5 px-3 text-center w-10">#</th>
                  <th className="py-2.5 px-3">সেনা নং</th>
                  <th className="py-2.5 px-3">পদবি ও নাম</th>
                  <th className="py-2.5 px-3 text-center">ব্যাটারী</th>
                  <th className="py-2.5 px-3 text-center">ট্রেড</th>
                  <th className="py-2.5 px-3">কোয়ার্টার / বাসস্থানের ঠিকানা</th>
                  <th className="py-2.5 px-3">বাসায় ওঠার তারিখ</th>
                  <th className="py-2.5 px-3">বাসার মেয়াদ শেষ হওয়ার সময়</th>
                  <th className="py-2.5 px-3">মন্তব্য</th>
                  <th className="py-2.5 px-3 text-right print:hidden">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
                {filteredRoster.map((item, idx) => {
                  const livePerson =
                    personnelMap.get(item.personnelId) ||
                    personnelMap.get((item.snkNo || '').toLowerCase());

                  return (
                    <tr
                      key={item.id || idx}
                      className={`transition-colors ${
                        isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                        {idx + 1}.
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-500">
                        {item.snkNo}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <RankBadge rank={livePerson?.rk || item.rk} size="sm" />
                          {onViewDossier && livePerson ? (
                            <button
                              type="button"
                              onClick={() => onViewDossier(livePerson)}
                              className={`font-semibold hover:underline cursor-pointer text-left ${
                                isLight ? 'text-slate-900 hover:text-indigo-600' : 'text-white hover:text-indigo-400'
                              }`}
                              title="ডসিয়ার দেখুন"
                            >
                              {livePerson.name}
                            </button>
                          ) : (
                            <span className="font-semibold">{item.name}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-semibold">
                        {livePerson?.battery || item.battery}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                        {livePerson?.trade || item.trade || '-'}
                      </td>
                      <td className="py-2.5 px-3">
                        {item.quarterOrAddress ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{item.quarterOrAddress}</span>
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        {item.sinceDate ? (
                          <span className={isLight ? 'text-slate-800 font-semibold' : 'text-slate-200 font-semibold'}>
                            {item.sinceDate}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        {item.expiryDate ? (
                          <div className="space-y-0.5">
                            <div className={isLight ? 'text-slate-800 font-semibold' : 'text-slate-200 font-semibold'}>
                              {item.expiryDate}
                            </div>
                            {(() => {
                              const status = getExpiryBadge(item.expiryDate);
                              if (!status) return null;
                              return (
                                <span
                                  className={`inline-block text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                    status.isExpired
                                      ? 'bg-rose-500/15 text-rose-500'
                                      : status.isNear
                                      ? 'bg-amber-500/15 text-amber-500'
                                      : 'bg-emerald-500/15 text-emerald-500'
                                  }`}
                                >
                                  {status.label}
                                </span>
                              );
                            })()}
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {item.remarks || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right print:hidden">
                        {!isGuest ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleSwitchLivingType(item)}
                              className={`px-2 py-1 rounded text-[11px] font-mono font-semibold border transition-colors inline-flex items-center gap-1 cursor-pointer ${
                                item.livingType === 'In Living'
                                  ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border-amber-500/30'
                                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
                              }`}
                              title={
                                item.livingType === 'In Living'
                                  ? 'Out Living-এ স্থানান্তর করুন'
                                  : 'In Living-এ স্থানান্তর করুন'
                              }
                            >
                              <ArrowLeftRight className="w-3 h-3" />
                              <span>{item.livingType === 'In Living' ? 'Out' : 'In'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditRecord(item)}
                              className="p-1.5 rounded hover:bg-slate-700/30 text-slate-400 hover:text-indigo-400 cursor-pointer"
                              title="তথ্য এডিট করুন"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveRecord(item)}
                              className="p-1.5 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 cursor-pointer"
                              title="তালিকা থেকে বাদ দিন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. ADD PERSONNEL TO IN LIVING / OUT LIVING MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs print:hidden">
          <div
            className={`relative w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border rounded-xl shadow-2xl ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
            }`}
          >
            <div
              className={`px-5 py-4 border-b flex items-center justify-between ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-bold">
                  Family Man State — সৈনিক যুক্ত করুন
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAddedSoldiers} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Choose In Living vs Out Living */}
              <div className="grid grid-cols-2 gap-2">
                {(['In Living', 'Out Living'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setModalLivingType(type)}
                    className={`py-2.5 px-3 rounded-lg border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      modalLivingType === type
                        ? type === 'In Living'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-amber-600 text-white border-amber-600'
                        : isLight
                        ? 'bg-slate-100 text-slate-700 border-slate-300'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    {type === 'In Living' ? <Building2 className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                    <span>{type}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">
                    কোয়ার্টার নং / বাসার ঠিকানা (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    value={modalQuarterOrAddress}
                    onChange={(e) => setModalQuarterOrAddress(e.target.value)}
                    placeholder={
                      modalLivingType === 'In Living'
                        ? 'যেমন: Family Qtr-05'
                        : 'যেমন: মিরপুর / চট্টগ্রাম'
                    }
                    className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-indigo-500 ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900'
                        : 'bg-slate-950 border-slate-800 text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">
                    বাসায় ওঠার তারিখ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={modalSinceDate}
                    onChange={(e) => setModalSinceDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-indigo-500 ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900'
                        : 'bg-slate-950 border-slate-800 text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">
                    বাসার মেয়াদ শেষ হওয়ার সময়
                  </label>
                  <input
                    type="date"
                    value={modalExpiryDate}
                    onChange={(e) => setModalExpiryDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-indigo-500 ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900'
                        : 'bg-slate-950 border-slate-800 text-white'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">মন্তব্য (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={modalRemarks}
                  onChange={(e) => setModalRemarks(e.target.value)}
                  placeholder="মন্তব্য..."
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-indigo-500 ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900'
                      : 'bg-slate-950 border-slate-800 text-white'
                  }`}
                />
              </div>

              {/* Multi-Select Soldier List */}
              <div className={`space-y-2 pt-2 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold">
                    সৈনিক নির্বাচন করুন ({selectedSoldierIds.length} জন নির্বাচিত)
                  </span>
                  {selectedSoldierIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedSoldierIds([])}
                      className="text-rose-500 hover:underline cursor-pointer"
                    >
                      সব বাতিল
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                      placeholder="সেনা নং, পদবি বা নাম দিয়ে খুঁজুন..."
                      className={`w-full pl-8 pr-3 py-1.5 rounded-lg border focus:outline-none focus:border-indigo-500 ${
                        isLight
                          ? 'bg-slate-50 border-slate-300 text-slate-900'
                          : 'bg-slate-950 border-slate-800 text-white'
                      }`}
                    />
                  </div>
                  <div className="flex items-center gap-1 overflow-x-auto">
                    {(['All', ...ALL_BATTERIES] as const).map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setPickerBattery(b)}
                        className={`px-2 py-1 rounded text-[11px] font-mono cursor-pointer ${
                          pickerBattery === b
                            ? 'bg-indigo-600 text-white font-bold'
                            : isLight
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  className={`border rounded-xl max-h-56 overflow-y-auto divide-y ${
                    isLight ? 'border-slate-200 divide-slate-100 bg-white' : 'border-slate-800 divide-slate-800 bg-slate-950'
                  }`}
                >
                  {filteredPickerSoldiers.map((s) => {
                    const isSelected = selectedSoldierIds.includes(s.id);
                    const alreadyAssigned = existingPersonnelIds.has(s.id);
                    return (
                      <div
                        key={s.id}
                        onClick={() => handleToggleSelectSoldier(s.id)}
                        className={`p-2 px-3 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                          isSelected
                            ? isLight
                              ? 'bg-indigo-50 border-l-2 border-indigo-500'
                              : 'bg-indigo-950/40 border-l-2 border-indigo-500'
                            : isLight
                            ? 'hover:bg-slate-50'
                            : 'hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded text-indigo-600 pointer-events-none"
                          />
                          <span className="font-mono font-bold text-indigo-500">{s.snkNo}</span>
                          <span className="font-semibold truncate">
                            {s.rk} {s.name}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">({s.battery})</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {alreadyAssigned && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-500/15 text-slate-400">
                              Listed
                            </span>
                          )}
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded font-mono font-bold ${
                              isSelected
                                ? 'bg-indigo-600 text-white'
                                : isLight
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {isSelected ? 'Selected' : '+ Select'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={`pt-3 border-t flex items-center justify-end gap-2 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer ${
                    isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{modalLivingType}-এ সংরক্ষণ করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. EDIT RECORD MODAL */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs print:hidden">
          <div
            className={`w-full max-w-md border rounded-xl shadow-2xl p-5 space-y-4 ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/40">
              <h3 className="text-sm font-bold">
                {editingRecord.rk} {editingRecord.name} — তথ্য আপডেট
              </h3>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="text-slate-400 hover:text-rose-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditRecord} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                {(['In Living', 'Out Living'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setEditLivingType(type)}
                    className={`py-2 px-3 rounded-lg border font-bold cursor-pointer ${
                      editLivingType === type
                        ? type === 'In Living'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-amber-600 text-white border-amber-600'
                        : isLight
                        ? 'bg-slate-100 text-slate-700 border-slate-300'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div>
                <label className="block font-semibold mb-1">কোয়ার্টার / বাসার ঠিকানা</label>
                <input
                  type="text"
                  value={editQuarter}
                  onChange={(e) => setEditQuarter(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-indigo-500 ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900'
                      : 'bg-slate-950 border-slate-800 text-white'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">বাসায় ওঠার তারিখ</label>
                  <input
                    type="date"
                    value={editSinceDate}
                    onChange={(e) => setEditSinceDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-indigo-500 ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900'
                        : 'bg-slate-950 border-slate-800 text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">বাসার মেয়াদ শেষ হওয়ার সময়</label>
                  <input
                    type="date"
                    value={editExpiryDate}
                    onChange={(e) => setEditExpiryDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-indigo-500 ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900'
                        : 'bg-slate-950 border-slate-800 text-white'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">মন্তব্য</label>
                <input
                  type="text"
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-indigo-500 ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900'
                      : 'bg-slate-950 border-slate-800 text-white'
                  }`}
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer ${
                    isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
