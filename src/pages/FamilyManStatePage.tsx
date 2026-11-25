import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import {
  Battery,
  ALL_BATTERIES,
  FamilyManRankGroup,
  FamilyManRecord,
  LivingCategory,
  Personnel,
  normalizeBattery,
  matchesBatteryFilter,
  formatRankTradeName,
} from '../types';
import {
  fetchFamilyManStateFromSupabase,
  saveFamilyManStateToSupabase,
} from '../lib/supabase';
import {
  INITIAL_FAMILY_MAN_RECORDS,
  buildBanglaTitleFromPersonnel,
  formatIsoToBanglaShortDate,
  getBanglaBatteryName,
  getRemainingDaysInfo,
  inferRankCategory,
  toBanglaDigits,
} from '../data/familyManSeedData';
import { FamilyManPrintSheet } from '../components/parade/FamilyManPrintSheet';
import { sortBySeniority } from '../utils/seniorityUtils';
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
  Clock,
  AlertTriangle,
  Database,
} from 'lucide-react';

interface FamilyManStatePageProps {
  onViewDossier?: (person: Personnel) => void;
}

const RANK_GROUPS: FamilyManRankGroup[] = ['জেসিও', 'অন্যান্য পদবী', 'এনসি (ই)'];

export const FamilyManStatePage: React.FC<FamilyManStatePageProps> = ({ onViewDossier }) => {
  const { personnelList, ranksList, currentUser, isGuest, showNotification, theme } = useApp();
  const isLight = theme === 'light';

  const isBsm = ['P BSM', 'Q BSM', 'R BSM', 'HQ BSM', 'EME JCO', 'BSM'].includes(currentUser.role);
  const rawAssignedBty = currentUser.assignedBattery;
  const assignedBty = rawAssignedBty ? (normalizeBattery(rawAssignedBty) as Battery) : undefined;

  const [records, setRecords] = useState<FamilyManRecord[]>(INITIAL_FAMILY_MAN_RECORDS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Two Primary Options: "Out Living" vs "In Living"
  const [activeLivingTab, setActiveLivingTab] = useState<LivingCategory>('Out Living');
  const [batteryFilter, setBatteryFilter] = useState<Battery | 'All'>(
    isBsm && assignedBty ? assignedBty : 'All'
  );
  const [rankGroupFilter, setRankGroupFilter] = useState<FamilyManRankGroup | 'All'>('All');
  const [expiryFilter, setExpiryFilter] = useState<'All' | 'Soon' | 'Expired'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Print Modal State
  const [isPrintSheetOpen, setIsPrintSheetOpen] = useState(false);

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalLivingType, setModalLivingType] = useState<LivingCategory>('Out Living');
  const [selectedSoldierIds, setSelectedSoldierIds] = useState<string[]>([]);
  const [modalQuarterOrAddress, setModalQuarterOrAddress] = useState('');
  const [modalApplicationDate, setModalApplicationDate] = useState(new Date().toISOString().slice(0, 10));
  const [modalAllotmentDate, setModalAllotmentDate] = useState(new Date().toISOString().slice(0, 10));
  const [modalSinceDate, setModalSinceDate] = useState(new Date().toISOString().slice(0, 10));
  const [modalExpiryDate, setModalExpiryDate] = useState('');
  const [modalRemarks, setModalRemarks] = useState('');
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerBattery, setPickerBattery] = useState<Battery | 'All'>(
    isBsm && assignedBty ? (assignedBty as Battery) : 'All'
  );

  // Inline row editing state
  const [inlineEditingRecordId, setInlineEditingRecordId] = useState<string | null>(null);
  const [editBanglaTitle, setEditBanglaTitle] = useState('');
  const [editRankCategory, setEditRankCategory] = useState<FamilyManRankGroup>('অন্যান্য পদবী');
  const [editApplicationDate, setEditApplicationDate] = useState('');
  const [editAllotmentDate, setEditAllotmentDate] = useState('');
  const [editSinceDate, setEditSinceDate] = useState('');
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [editQuarter, setEditQuarter] = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [editLivingType, setEditLivingType] = useState<LivingCategory>('Out Living');

  const loadFromSupabase = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchFamilyManStateFromSupabase();
      if (res.success) {
        const hasUpgradedBanglaRecords =
          res.records.length > 0 &&
          res.records.some((r) => Boolean(r.banglaFullTitle || r.applicationDate || r.allotmentDate));

        if (hasUpgradedBanglaRecords) {
          setRecords(res.records);
        } else {
          // Auto-seed official 93-record register from uploaded PDF into state
          setRecords(INITIAL_FAMILY_MAN_RECORDS);
          await saveFamilyManStateToSupabase(INITIAL_FAMILY_MAN_RECORDS);
        }
      } else {
        setRecords(INITIAL_FAMILY_MAN_RECORDS);
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

  const handleRestoreOfficialList = async () => {
    if (isGuest) {
      showNotification('গেস্ট মোডে পরিবর্তন অনুমোদিত নয়।');
      return;
    }
    await persistRecords(INITIAL_FAMILY_MAN_RECORDS);
    showNotification('অফিসিয়াল ফ্যামিলি ম্যান তালিকা (৯৩ জন) সফলভাবে রিসেট ও সিঙ্ক করা হয়েছে।');
  };

  // Personnel map for live dossier linking & latest battery/snkNo
  const personnelMap = useMemo(() => {
    const map = new Map<string, Personnel>();
    (personnelList || []).forEach((p) => {
      map.set(p.id, p);
      if (p.snkNo) map.set(p.snkNo.trim().toLowerCase(), p);
    });
    return map;
  }, [personnelList]);

  // Enrich Family Man records dynamically with live personnel reference while preserving Bangla register fields
  const syncedRecords = useMemo(() => {
    return records.map((r) => {
      const live =
        personnelMap.get(r.personnelId) ||
        personnelMap.get((r.snkNo || '').trim().toLowerCase());
      const rawBty = live?.battery || r.battery || 'HQ Bty';
      const normalizedBty = (normalizeBattery(rawBty) || rawBty) as Battery;
      const resolvedRk = live?.rk || r.rk;
      const resolvedTrade = live?.trade || r.trade || '-';
      const resolvedSnkNo = live?.snkNo || r.snkNo;
      const resolvedName = live?.name || r.name;
      const banglaFullTitle =
        r.banglaFullTitle ||
        buildBanglaTitleFromPersonnel({
          snkNo: resolvedSnkNo,
          rk: resolvedRk,
          trade: resolvedTrade,
          name: resolvedName,
        });
      const rankCategory = r.rankCategory || inferRankCategory(resolvedRk, banglaFullTitle);

      return {
        ...r,
        personnelId: live?.id || r.personnelId,
        snkNo: resolvedSnkNo,
        rk: resolvedRk,
        name: resolvedName,
        battery: normalizedBty,
        trade: resolvedTrade,
        banglaFullTitle,
        rankCategory,
      };
    });
  }, [records, personnelMap]);

  // Scoped records (respect BSM battery restriction if applicable)
  const scopedRecords = useMemo(() => {
    if (isBsm && assignedBty) {
      return syncedRecords.filter((r) => matchesBatteryFilter(r.battery, assignedBty));
    }
    return syncedRecords;
  }, [syncedRecords, isBsm, assignedBty]);

  // Apply active battery filter
  const batteryScopedRecords = useMemo(() => {
    if (batteryFilter === 'All') return scopedRecords;
    return scopedRecords.filter((r) => matchesBatteryFilter(r.battery, batteryFilter));
  }, [scopedRecords, batteryFilter]);

  const inLivingCount = useMemo(
    () => batteryScopedRecords.filter((r) => r.livingType === 'In Living').length,
    [batteryScopedRecords]
  );

  const outLivingCount = useMemo(
    () => batteryScopedRecords.filter((r) => r.livingType === 'Out Living').length,
    [batteryScopedRecords]
  );

  // Count expiring soon / expired in active tab
  const activeTabStats = useMemo(() => {
    const tabList = batteryScopedRecords.filter((r) => r.livingType === activeLivingTab);
    let soonCount = 0;
    let expiredCount = 0;
    tabList.forEach((r) => {
      const info = getRemainingDaysInfo(r.expiryDate);
      if (info.status === 'expired') expiredCount += 1;
      else if (info.daysLeft !== null && info.daysLeft >= 0 && info.daysLeft <= 30) soonCount += 1;
    });
    return { total: tabList.length, soonCount, expiredCount };
  }, [batteryScopedRecords, activeLivingTab]);

  // Filtered list for activeLivingTab
  const filteredRoster = useMemo(() => {
    let list = batteryScopedRecords.filter((r) => r.livingType === activeLivingTab);

    if (rankGroupFilter !== 'All') {
      list = list.filter((r) => (r.rankCategory || inferRankCategory(r.rk, r.banglaFullTitle)) === rankGroupFilter);
    }

    if (expiryFilter !== 'All') {
      list = list.filter((r) => {
        const info = getRemainingDaysInfo(r.expiryDate);
        if (expiryFilter === 'Expired') return info.status === 'expired';
        if (expiryFilter === 'Soon') {
          return info.daysLeft !== null && info.daysLeft >= 0 && info.daysLeft <= 30;
        }
        return true;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          (r.snkNo || '').toLowerCase().includes(q) ||
          (r.name || '').toLowerCase().includes(q) ||
          (r.banglaFullTitle || '').toLowerCase().includes(q) ||
          (r.rk || '').toLowerCase().includes(q) ||
          (r.battery || '').toLowerCase().includes(q) ||
          (r.applicationDate || '').toLowerCase().includes(q) ||
          (r.allotmentDate || '').toLowerCase().includes(q) ||
          (r.sinceDate || '').toLowerCase().includes(q) ||
          (r.expiryDate || '').toLowerCase().includes(q) ||
          (r.quarterOrAddress || '').toLowerCase().includes(q) ||
          (r.remarks || '').toLowerCase().includes(q)
      );
    }

    // Sort preserving rank category order, then serialOrder, then seniority
    return [...list].sort((a, b) => {
      const grpA = RANK_GROUPS.indexOf(a.rankCategory || inferRankCategory(a.rk, a.banglaFullTitle));
      const grpB = RANK_GROUPS.indexOf(b.rankCategory || inferRankCategory(b.rk, b.banglaFullTitle));
      if (grpA !== grpB) return grpA - grpB;

      if (a.serialOrder !== undefined && b.serialOrder !== undefined) {
        return a.serialOrder - b.serialOrder;
      }
      if (a.serialOrder !== undefined) return -1;
      if (b.serialOrder !== undefined) return 1;

      const pA = personnelMap.get(a.personnelId) || personnelMap.get((a.snkNo || '').trim().toLowerCase());
      const pB = personnelMap.get(b.personnelId) || personnelMap.get((b.snkNo || '').trim().toLowerCase());
      if (pA && pB) {
        const sorted = sortBySeniority([pA, pB], ranksList);
        return sorted[0].id === pA.id ? -1 : 1;
      }
      return (a.snkNo || '').localeCompare(b.snkNo || '');
    });
  }, [batteryScopedRecords, activeLivingTab, rankGroupFilter, expiryFilter, searchQuery, personnelMap, ranksList]);

  // Group filteredRoster by জেসিও, অন্যান্য পদবী, এনসি (ই)
  const groupedRoster = useMemo(() => {
    return RANK_GROUPS.map((grp) => ({
      grp,
      items: filteredRoster.filter(
        (r) => (r.rankCategory || inferRankCategory(r.rk, r.banglaFullTitle)) === grp
      ),
    })).filter((g) => g.items.length > 0);
  }, [filteredRoster]);

  // Available personnel in picker
  const existingPersonnelIds = useMemo(() => new Set(records.map((r) => r.personnelId)), [records]);

  const filteredPickerSoldiers = useMemo(() => {
    let list = personnelList || [];
    if (isBsm && assignedBty) {
      list = list.filter((p) => matchesBatteryFilter(p.battery, assignedBty));
    } else if (pickerBattery !== 'All') {
      list = list.filter((p) => matchesBatteryFilter(p.battery, pickerBattery));
    }
    if (pickerSearch.trim()) {
      const q = pickerSearch.toLowerCase().trim();
      list = list.filter(
        (p) =>
          (p.snkNo || '').toLowerCase().includes(q) ||
          (p.name || '').toLowerCase().includes(q) ||
          (p.rk || '').toLowerCase().includes(q) ||
          (p.trade || '').toLowerCase().includes(q) ||
          (p.battery || '').toLowerCase().includes(q)
      );
    }
    return sortBySeniority(list, ranksList);
  }, [personnelList, isBsm, assignedBty, pickerBattery, pickerSearch, ranksList]);

  const handleOpenAddModal = () => {
    const today = new Date().toISOString().slice(0, 10);
    setModalLivingType(activeLivingTab);
    setSelectedSoldierIds([]);
    setModalQuarterOrAddress('');
    setModalApplicationDate(today);
    setModalAllotmentDate(today);
    setModalSinceDate(today);
    setModalExpiryDate('');
    setModalRemarks('');
    setPickerSearch('');
    setPickerBattery(isBsm && assignedBty ? assignedBty : batteryFilter);
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

    let maxSerial = records
      .filter((r) => r.livingType === modalLivingType)
      .reduce((acc, r) => Math.max(acc, r.serialOrder || 0), 0);

    selectedSoldierIds.forEach((id) => {
      const p = personnelMap.get(id);
      if (!p) return;
      const existing = nextMap.get(p.id);
      maxSerial += 1;
      nextMap.set(p.id, {
        id: existing?.id || `fm_${p.id}`,
        personnelId: p.id,
        snkNo: p.snkNo,
        rk: p.rk,
        name: p.name,
        battery: (normalizeBattery(p.battery || 'HQ Bty') || p.battery || 'HQ Bty') as Battery,
        trade: p.trade || '-',
        livingType: modalLivingType,
        rankCategory: existing?.rankCategory || inferRankCategory(p.rk),
        banglaFullTitle: existing?.banglaFullTitle || buildBanglaTitleFromPersonnel(p),
        applicationDate: modalApplicationDate.trim(),
        allotmentDate: modalAllotmentDate.trim(),
        quarterOrAddress: modalQuarterOrAddress.trim(),
        sinceDate: modalSinceDate,
        expiryDate: modalExpiryDate,
        remarks: modalRemarks.trim(),
        serialOrder: existing?.livingType === modalLivingType ? existing.serialOrder : maxSerial,
        updatedAt: nowIso,
      });
    });

    const nextList = Array.from(nextMap.values());
    await persistRecords(nextList);
    setActiveLivingTab(modalLivingType);
    setIsAddModalOpen(false);
    showNotification(
      `${toBanglaDigits(selectedSoldierIds.length)} জন সৈনিক "${
        modalLivingType === 'In Living' ? 'সরকারি পারিবারিক বাসস্থান' : 'সেনানিবাসের বাহিরে'
      }" তালিকায় সংরক্ষণ করা হয়েছে।`
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
    showNotification(
      `${record.banglaFullTitle || `${record.rk} ${record.name}`}-কে "${targetType}"-এ স্থানান্তর করা হয়েছে।`
    );
  };

  const handleRemoveRecord = async (record: FamilyManRecord) => {
    if (isGuest) {
      showNotification('গেস্ট মোডে ডিলিট অনুমোদিত নয়।');
      return;
    }
    const nextList = records.filter((r) => r.id !== record.id);
    await persistRecords(nextList);
    showNotification(
      `${record.banglaFullTitle || `${record.rk} ${record.name}`}-কে তালিকা থেকে বাদ দেওয়া হয়েছে।`
    );
  };

  const startInlineEditRecord = (record: FamilyManRecord) => {
    if (isGuest) {
      showNotification('গেস্ট মোডে তথ্য পরিবর্তন করা যাবে না।');
      return;
    }
    setInlineEditingRecordId(record.id);
    setEditBanglaTitle(
      record.banglaFullTitle ||
        buildBanglaTitleFromPersonnel({
          snkNo: record.snkNo,
          rk: record.rk,
          trade: record.trade,
          name: record.name,
        })
    );
    setEditRankCategory(record.rankCategory || inferRankCategory(record.rk, record.banglaFullTitle));
    setEditLivingType(record.livingType);
    setEditApplicationDate(record.applicationDate || '');
    setEditAllotmentDate(record.allotmentDate || '');
    setEditSinceDate(record.sinceDate || '');
    setEditExpiryDate(record.expiryDate || '');
    setEditQuarter(record.quarterOrAddress || '');
    setEditRemarks(record.remarks || '');
  };

  const cancelInlineEditRecord = () => {
    setInlineEditingRecordId(null);
  };

  const saveInlineEditRecord = async (record: FamilyManRecord) => {
    if (isGuest) return;
    const nextList = records.map((r) =>
      r.id === record.id
        ? {
            ...r,
            banglaFullTitle: editBanglaTitle.trim() || r.banglaFullTitle,
            rankCategory: editRankCategory,
            livingType: editLivingType,
            applicationDate: editApplicationDate.trim(),
            allotmentDate: editAllotmentDate.trim(),
            sinceDate: editSinceDate.trim(),
            expiryDate: editExpiryDate.trim(),
            quarterOrAddress: editQuarter.trim(),
            remarks: editRemarks.trim(),
            updatedAt: new Date().toISOString(),
          }
        : r
    );
    await persistRecords(nextList);
    setInlineEditingRecordId(null);
    showNotification('ফ্যামিলি ম্যান তথ্য আপডেট করা হয়েছে।');
  };

  let runningRowNumber = 0;

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
                সপরিবারে বসবাসরত সেনাসদস্যদের তালিকা (Family Man State)
              </h1>
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                  isLight
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                }`}
              >
                মোট {toBanglaDigits(inLivingCount + outLivingCount)} জন
              </span>
            </div>
            <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              সেনানিবাসের বাহিরে বসবাসরত ({toBanglaDigits(outLivingCount)} জন) ও সরকারি পারিবারিক বাসস্থানে বসবাসরত ({toBanglaDigits(inLivingCount)} জন) সেনাসদস্যদের পূর্ণাঙ্গ তথ্য ও মেয়াদ ট্র্যাকার
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

          {!isGuest && currentUser.role === 'Admin' && (
            <button
              type="button"
              onClick={handleRestoreOfficialList}
              title="আপলোডকৃত অফিসিয়াল ৯৩ জনের তালিকা পুনরায় লোড করুন"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>অফিসিয়াল তালিকা সিঙ্ক</span>
            </button>
          )}

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
            onClick={() => setIsPrintSheetOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>অফিসিয়াল ফরম্যাটে প্রিন্ট</span>
          </button>
        </div>
      </div>

      {/* 2. TWO LIVING OPTIONS SELECTOR: OUT LIVING vs IN LIVING */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => {
            setActiveLivingTab('Out Living');
            setRankGroupFilter('All');
            setExpiryFilter('All');
          }}
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
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Out Living (সেনানিবাসের বাহিরে)
                </h2>
                {activeLivingTab === 'Out Living' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-600 text-white">
                    নির্বাচিত
                  </span>
                )}
              </div>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                সপরিবারে সেনানিবাসের বাহিরে বসবাসরত সেনাসদস্যদের তালিকা
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div
              className={`text-2xl font-bold ${
                activeLivingTab === 'Out Living'
                  ? 'text-amber-500'
                  : isLight
                  ? 'text-slate-800'
                  : 'text-slate-200'
              }`}
            >
              {toBanglaDigits(outLivingCount)}
            </div>
            <div className="text-[11px] text-slate-400">জন সদস্য</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveLivingTab('In Living');
            setRankGroupFilter('All');
            setExpiryFilter('All');
          }}
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
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  In Living (সরকারি বাসস্থান)
                </h2>
                {activeLivingTab === 'In Living' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white">
                    নির্বাচিত
                  </span>
                )}
              </div>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                সপরিবারে সরকারি পারিবারিক বাসস্থানে বসবাসরত সেনাসদস্যদের তালিকা
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div
              className={`text-2xl font-bold ${
                activeLivingTab === 'In Living'
                  ? 'text-emerald-500'
                  : isLight
                  ? 'text-slate-800'
                  : 'text-slate-200'
              }`}
            >
              {toBanglaDigits(inLivingCount)}
            </div>
            <div className="text-[11px] text-slate-400">জন সদস্য</div>
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
          className={`flex flex-col gap-3 p-3 rounded-lg border print:hidden ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
          }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            {/* Battery Filter */}
            <div className="flex items-center gap-1 text-xs flex-wrap">
              {(['All', ...ALL_BATTERIES] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  disabled={isBsm && Boolean(assignedBty) && !matchesBatteryFilter(b, assignedBty)}
                  onClick={() => setBatteryFilter(b)}
                  className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer disabled:opacity-40 ${
                    batteryFilter === b
                      ? 'bg-indigo-600 text-white font-semibold'
                      : isLight
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {b === 'All' ? 'সব ব্যাটারী' : getBanglaBatteryName(b)}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="সেনা নং, নাম, বাসা নম্বর বা তারিখ খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-8 pr-2.5 py-1.5 text-xs rounded-lg border focus:outline-none focus:border-indigo-500 w-full lg:w-72 ${
                  isLight
                    ? 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                    : 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500'
                }`}
              />
            </div>
          </div>

          {/* Rank Category & Expiry Filter Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-800">
            <div className="flex items-center gap-1 text-xs flex-wrap">
              <span className="text-[11px] font-semibold text-slate-400 mr-1">পদবী গ্রুপ:</span>
              {(['All', ...RANK_GROUPS] as const).map((grp) => (
                <button
                  key={grp}
                  type="button"
                  onClick={() => setRankGroupFilter(grp)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    rankGroupFilter === grp
                      ? 'bg-slate-700 text-white font-semibold dark:bg-indigo-500/25 dark:text-indigo-200 dark:border dark:border-indigo-500/40'
                      : isLight
                      ? 'text-slate-600 hover:bg-slate-200'
                      : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {grp === 'All' ? 'সব পদবী' : grp}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 text-xs flex-wrap">
              <button
                type="button"
                onClick={() => setExpiryFilter('All')}
                className={`px-2.5 py-1 rounded font-medium cursor-pointer transition-colors ${
                  expiryFilter === 'All'
                    ? 'bg-slate-700 text-white dark:bg-slate-700'
                    : isLight
                    ? 'text-slate-600 hover:bg-slate-200'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                সব মেয়াদ ({toBanglaDigits(activeTabStats.total)})
              </button>
              <button
                type="button"
                onClick={() => setExpiryFilter('Soon')}
                className={`px-2.5 py-1 rounded font-medium cursor-pointer inline-flex items-center gap-1 transition-colors ${
                  expiryFilter === 'Soon'
                    ? 'bg-amber-600 text-white'
                    : isLight
                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                    : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>৩০ দিনের মধ্যে শেষ ({toBanglaDigits(activeTabStats.soonCount)})</span>
              </button>
              <button
                type="button"
                onClick={() => setExpiryFilter('Expired')}
                className={`px-2.5 py-1 rounded font-medium cursor-pointer inline-flex items-center gap-1 transition-colors ${
                  expiryFilter === 'Expired'
                    ? 'bg-rose-600 text-white'
                    : isLight
                    ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                    : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                <span>মেয়াদ উত্তীর্ণ ({toBanglaDigits(activeTabStats.expiredCount)})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Table Header Summary */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" />
            <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {activeLivingTab === 'Out Living'
                ? 'সপরিবারে সেনানিবাসের বাহিরে বসবাসরত সেনাসদস্যদের তালিকা'
                : 'সপরিবারে সরকারি পারিবারিক বাসস্থানে বসবাসরত সেনাসদস্যদের তালিকা'}{' '}
              ({toBanglaDigits(filteredRoster.length)} জন)
            </h3>
          </div>
          {isSaving && (
            <span className="text-[11px] font-mono text-indigo-400">সংরক্ষণ হচ্ছে...</span>
          )}
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400 font-mono">
            ডাটাবেজ থেকে ফ্যামিলি ম্যান তালিকা লোড হচ্ছে...
          </div>
        ) : filteredRoster.length === 0 ? (
          <div
            className={`py-12 text-center border border-dashed rounded-xl space-y-2.5 ${
              isLight ? 'border-slate-300 bg-slate-50' : 'border-slate-800 bg-slate-950/40'
            }`}
          >
            <Home className="w-8 h-8 text-slate-400 mx-auto" />
            <p className={`text-sm font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              নির্বাচিত ফিল্টারে কোনো সেনাসদস্য পাওয়া যায়নি
            </p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  if (!(isBsm && assignedBty)) setBatteryFilter('All');
                  setRankGroupFilter('All');
                  setExpiryFilter('All');
                  setSearchQuery('');
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                }`}
              >
                ফিল্টার রিসেট করুন
              </button>
              {!isGuest && (
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>সৈনিক যুক্ত করুন</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className={`overflow-x-auto rounded-lg border ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr
                  className={`border-b text-[11px] font-bold ${
                    isLight
                      ? 'bg-slate-100 border-slate-200 text-slate-800'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300'
                  }`}
                >
                  <th className="py-2.5 px-2.5 text-center w-11">
                    {activeLivingTab === 'In Living' ? 'ক্রমিক' : 'ক্রঃ'}
                  </th>
                  <th className="py-2.5 px-3 min-w-[240px]">সেনা নং, পদবী এবং নাম</th>
                  <th className="py-2.5 px-2.5 text-center whitespace-nowrap">আবেদন এর তারিখ</th>
                  <th className="py-2.5 px-2.5 text-center whitespace-nowrap">স্টেশন কর্তৃক বরাদ্দের তারিখ</th>
                  <th className="py-2.5 px-2.5 text-center whitespace-nowrap">দখলের তারিখ</th>
                  <th className="py-2.5 px-2.5 text-center whitespace-nowrap">খালির তারিখ</th>
                  <th className="py-2.5 px-2.5 text-center whitespace-nowrap">শেষ হতে বাকি</th>
                  <th className="py-2.5 px-3 min-w-[140px]">বাসা নম্বর</th>
                  <th className="py-2.5 px-3 min-w-[100px]">মন্তব্য</th>
                  <th className="py-2.5 px-3 text-right print:hidden">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
                {groupedRoster.map(({ grp, items }) => (
                  <React.Fragment key={grp}>
                    {/* Group Header Row matching PDF (জেসিও-..., অন্যান্য পদবী-..., এনসি (ই)-...) */}
                    <tr
                      className={
                        isLight
                          ? 'bg-indigo-50/80 border-y border-indigo-200/80'
                          : 'bg-indigo-950/35 border-y border-indigo-500/25'
                      }
                    >
                      <td
                        colSpan={10}
                        className={`py-1.5 px-3 font-bold text-xs ${
                          isLight ? 'text-indigo-900' : 'text-indigo-300'
                        }`}
                      >
                        {grp}-{toBanglaDigits(String(items.length).padStart(2, '0'))} জন
                      </td>
                    </tr>

                    {items.map((item) => {
                      runningRowNumber += 1;
                      const currentSerial = runningRowNumber;
                      const livePerson =
                        personnelMap.get(item.personnelId) ||
                        personnelMap.get((item.snkNo || '').toLowerCase());
                      const remaining = getRemainingDaysInfo(item.expiryDate);

                      if (inlineEditingRecordId === item.id) {
                        return (
                          <tr
                            key={item.id}
                            className={
                              isLight
                                ? 'bg-amber-50 border-y border-amber-300 shadow-inner'
                                : 'bg-amber-950/40 border-y border-amber-500/60 shadow-inner'
                            }
                          >
                            <td className="py-2 px-2.5 text-center font-bold text-slate-500">
                              {toBanglaDigits(currentSerial)}।
                            </td>
                            <td className="py-1.5 px-2 space-y-1">
                              <input
                                type="text"
                                autoFocus
                                value={editBanglaTitle}
                                onChange={(e) => setEditBanglaTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveInlineEditRecord(item);
                                  if (e.key === 'Escape') cancelInlineEditRecord();
                                }}
                                placeholder="সেনা নং, পদবী এবং নাম"
                                className={`w-full min-w-[220px] border border-amber-500 rounded px-2 py-1 text-xs focus:outline-none ${
                                  isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
                                }`}
                              />
                              <select
                                value={editRankCategory}
                                onChange={(e) => setEditRankCategory(e.target.value as FamilyManRankGroup)}
                                className={`border border-amber-500 rounded px-1.5 py-0.5 text-[11px] ${
                                  isLight ? 'bg-white text-slate-800' : 'bg-slate-900 text-slate-200'
                                }`}
                              >
                                {RANK_GROUPS.map((g) => (
                                  <option key={g} value={g}>
                                    {g}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-1.5 px-2">
                              <input
                                type="text"
                                value={editApplicationDate}
                                onChange={(e) => setEditApplicationDate(e.target.value)}
                                placeholder="YYYY-MM-DD বা টেক্সট"
                                className={`w-28 border border-amber-500 rounded px-1.5 py-1 text-[11px] ${
                                  isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
                                }`}
                              />
                            </td>
                            <td className="py-1.5 px-2">
                              <input
                                type="date"
                                value={/^\d{4}-\d{2}-\d{2}$/.test(editAllotmentDate) ? editAllotmentDate : ''}
                                onChange={(e) => setEditAllotmentDate(e.target.value)}
                                className={`border border-amber-500 rounded px-1.5 py-1 text-[11px] font-mono ${
                                  isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
                                }`}
                              />
                            </td>
                            <td className="py-1.5 px-2">
                              <input
                                type="date"
                                value={/^\d{4}-\d{2}-\d{2}$/.test(editSinceDate) ? editSinceDate : ''}
                                onChange={(e) => setEditSinceDate(e.target.value)}
                                className={`border border-amber-500 rounded px-1.5 py-1 text-[11px] font-mono ${
                                  isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
                                }`}
                              />
                            </td>
                            <td className="py-1.5 px-2">
                              <input
                                type="date"
                                value={/^\d{4}-\d{2}-\d{2}$/.test(editExpiryDate) ? editExpiryDate : ''}
                                onChange={(e) => setEditExpiryDate(e.target.value)}
                                className={`border border-amber-500 rounded px-1.5 py-1 text-[11px] font-mono ${
                                  isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
                                }`}
                              />
                            </td>
                            <td className="py-1.5 px-2 text-center text-[11px] text-slate-400">
                              {getRemainingDaysInfo(editExpiryDate).label}
                            </td>
                            <td className="py-1.5 px-2">
                              <input
                                type="text"
                                value={editQuarter}
                                onChange={(e) => setEditQuarter(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveInlineEditRecord(item);
                                  if (e.key === 'Escape') cancelInlineEditRecord();
                                }}
                                placeholder="বাসা নম্বর / ঠিকানা"
                                className={`w-full min-w-[130px] border border-amber-500 rounded px-2 py-1 text-xs ${
                                  isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
                                }`}
                              />
                            </td>
                            <td className="py-1.5 px-2">
                              <input
                                type="text"
                                value={editRemarks}
                                onChange={(e) => setEditRemarks(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveInlineEditRecord(item);
                                  if (e.key === 'Escape') cancelInlineEditRecord();
                                }}
                                placeholder="মন্তব্য..."
                                className={`w-full min-w-[100px] border border-amber-500 rounded px-2 py-1 text-xs ${
                                  isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
                                }`}
                              />
                            </td>
                            <td className="py-1.5 px-3 text-right whitespace-nowrap print:hidden">
                              <div className="inline-flex items-center gap-1">
                                <select
                                  value={editLivingType}
                                  onChange={(e) => setEditLivingType(e.target.value as LivingCategory)}
                                  className={`border border-amber-500 rounded px-1.5 py-1 text-[11px] font-bold cursor-pointer ${
                                    isLight ? 'bg-white text-amber-800' : 'bg-slate-900 text-amber-300'
                                  }`}
                                >
                                  <option value="Out Living">Out Living</option>
                                  <option value="In Living">In Living</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => saveInlineEditRecord(item)}
                                  title="সংরক্ষণ করুন"
                                  className="p-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white shadow cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelInlineEditRecord}
                                  title="বাতিল"
                                  className={`p-1.5 rounded cursor-pointer ${
                                    isLight
                                      ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                  }`}
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
                          key={item.id}
                          className={`transition-colors ${
                            isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="py-2.5 px-2.5 text-center font-semibold text-slate-400">
                            {toBanglaDigits(currentSerial)}।
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex flex-col gap-0.5">
                              {onViewDossier && livePerson ? (
                                <button
                                  type="button"
                                  onClick={() => onViewDossier(livePerson)}
                                  className={`font-semibold hover:underline cursor-pointer text-left leading-snug ${
                                    isLight
                                      ? 'text-slate-900 hover:text-indigo-600'
                                      : 'text-slate-100 hover:text-indigo-400'
                                  }`}
                                  title="সৈনিক ডসিয়ার দেখুন"
                                >
                                  {item.banglaFullTitle}
                                </button>
                              ) : (
                                <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                                  {item.banglaFullTitle}
                                </span>
                              )}
                              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                <span
                                  className={`px-1.5 py-0.2 rounded font-medium ${
                                    isLight
                                      ? 'bg-slate-100 text-slate-600'
                                      : 'bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  {getBanglaBatteryName(livePerson?.battery || item.battery)}
                                </span>
                                <span className="font-mono opacity-80">{item.snkNo}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                            {item.applicationDate ? (
                              <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>
                                {formatIsoToBanglaShortDate(item.applicationDate)}
                              </span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                            {item.allotmentDate ? (
                              <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>
                                {formatIsoToBanglaShortDate(item.allotmentDate)}
                              </span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                            {item.sinceDate ? (
                              <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                                {formatIsoToBanglaShortDate(item.sinceDate)}
                              </span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                            {item.expiryDate ? (
                              <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                                {formatIsoToBanglaShortDate(item.expiryDate)}
                              </span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                            {remaining.status === 'none' ? (
                              <span className="text-slate-500">—</span>
                            ) : (
                              <div className="inline-flex flex-col items-center gap-0.5">
                                <span
                                  className={`inline-block text-[11px] px-2 py-0.5 rounded font-bold ${
                                    remaining.status === 'expired'
                                      ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                                      : remaining.status === 'critical'
                                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                      : remaining.status === 'warning'
                                      ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                                      : 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                                  }`}
                                >
                                  {remaining.label}
                                </span>
                                {remaining.subLabel && (
                                  <span className="text-[10px] text-slate-400">
                                    {remaining.subLabel}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {item.quarterOrAddress ? (
                              <span
                                className={`inline-flex items-start gap-1 font-medium ${
                                  isLight ? 'text-slate-800' : 'text-slate-200'
                                }`}
                              >
                                <Home className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                                <span>{item.quarterOrAddress}</span>
                              </span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400">
                            {item.remarks || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap print:hidden">
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
                                  onClick={() => startInlineEditRecord(item)}
                                  className="p-1.5 rounded hover:bg-slate-700/30 text-slate-400 hover:text-indigo-400 cursor-pointer"
                                  title="সরাসরি এডিট করুন"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRecord(item)}
                                  className="p-1.5 rounded hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 cursor-pointer"
                                  title="তালিকা থেকে বাদ দিন"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-500">Read Only</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD SOLDIER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4">
          <div
            className={`w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
            }`}
          >
            <div className={`px-5 py-3.5 border-b flex items-center justify-between ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Home className="w-4 h-4 text-indigo-500" />
                <span>সপরিবারে বসবাস তালিকায় সৈনিক যুক্ত করুন</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-700/20 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAddedSoldiers} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Choose Out Living vs In Living */}
              <div className="grid grid-cols-2 gap-2">
                {(['Out Living', 'In Living'] as const).map((type) => (
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
                    <span>{type === 'In Living' ? 'In Living (সরকারি বাসস্থান)' : 'Out Living (সেনানিবাসের বাহিরে)'}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold mb-1">আবেদন এর তারিখ</label>
                  <input
                    type="date"
                    value={modalApplicationDate}
                    onChange={(e) => setModalApplicationDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-indigo-500 ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">স্টেশন কর্তৃক বরাদ্দের তারিখ</label>
                  <input
                    type="date"
                    value={modalAllotmentDate}
                    onChange={(e) => setModalAllotmentDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-indigo-500 ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">
                    দখলের তারিখ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={modalSinceDate}
                    onChange={(e) => setModalSinceDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-indigo-500 ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">খালির তারিখ</label>
                  <input
                    type="date"
                    value={modalExpiryDate}
                    onChange={(e) => setModalExpiryDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-indigo-500 ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">বাসা নম্বর / ঠিকানা</label>
                  <input
                    type="text"
                    value={modalQuarterOrAddress}
                    onChange={(e) => setModalQuarterOrAddress(e.target.value)}
                    placeholder={
                      modalLivingType === 'In Living'
                        ? 'যেমন: সেনানীড় ৩/ডি বা ঊর্মি-২ বি'
                        : 'যেমন: বাসা নম্বর বা এলাকার ঠিকানা'
                    }
                    className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-indigo-500 ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">মন্তব্য (ঐচ্ছিক)</label>
                  <input
                    type="text"
                    value={modalRemarks}
                    onChange={(e) => setModalRemarks(e.target.value)}
                    placeholder="মন্তব্য..."
                    className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-indigo-500 ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                    }`}
                  />
                </div>
              </div>

              {/* Multi-Select Soldier List */}
              <div className={`space-y-2 pt-2 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold">
                    সৈনিক নির্বাচন করুন ({toBanglaDigits(selectedSoldierIds.length)} জন নির্বাচিত)
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
                        isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                      }`}
                    />
                  </div>
                  <div className="flex items-center gap-1 overflow-x-auto">
                    {(['All', ...ALL_BATTERIES] as const).map((b) => (
                      <button
                        key={b}
                        type="button"
                        disabled={isBsm && Boolean(assignedBty) && !matchesBatteryFilter(b, assignedBty)}
                        onClick={() => setPickerBattery(b)}
                        className={`px-2 py-1 rounded text-[11px] font-mono cursor-pointer disabled:opacity-40 ${
                          pickerBattery === b
                            ? 'bg-indigo-600 text-white font-bold'
                            : isLight
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {b === 'All' ? 'All' : b.replace(' Bty', '')}
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
                            {formatRankTradeName(s.rk, s.trade, s.name)}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">({s.battery})</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {alreadyAssigned && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-500/15 text-slate-400">
                              তালিকাভুক্ত
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
                            {isSelected ? 'নির্বাচিত' : '+ নির্বাচন'}
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

      {/* OFFICIAL PRINT SHEET MODAL */}
      <FamilyManPrintSheet
        isOpen={isPrintSheetOpen}
        onClose={() => setIsPrintSheetOpen(false)}
        records={batteryScopedRecords}
        defaultTab={activeLivingTab}
      />
    </div>
  );
};
