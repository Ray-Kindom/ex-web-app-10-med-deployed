import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import {
  Battery,
  ALL_BATTERIES,
  LeaveManagementRecord,
  LeaveRecordType,
  Personnel,
} from '../types';
import {
  fetchLeaveManagementFromSupabase,
  saveLeaveManagementToSupabase,
} from '../lib/supabase';
import { sortBySeniority } from '../utils/seniorityUtils';
import { RankBadge } from '../components/common/RankBadge';
import {
  PlaneTakeoff,
  BarChart3,
  Plus,
  Search,
  RotateCcw,
  Trash2,
  Edit3,
  Printer,
  RefreshCw,
  X,
  Calendar,
  MapPin,
  CheckCircle2,
  Clock,
  Users,
  Moon,
  FileCheck2,
  Eye,
} from 'lucide-react';

interface LeaveManagementPageProps {
  onViewDossier?: (person: Personnel) => void;
}

type ActiveWorkspaceTab = 'active' | 'matrix' | 'ledger';

const LEAVE_TYPES: { id: LeaveRecordType; label: string; bnLabel: string; color: string; barHex: string }[] = [
  { id: 'P/Lve', label: 'P/Lve', bnLabel: 'বাৎসরিক ছুটি (Privilege)', color: 'purple', barHex: '#9333ea' },
  { id: 'C/Lve', label: 'C/Lve', bnLabel: 'নৈমিত্তিক ছুটি (Casual)', color: 'fuchsia', barHex: '#d946ef' },
  { id: 'Ni Pass', label: 'Ni Pass', bnLabel: 'নাইট পাস (Night Pass)', color: 'cyan', barHex: '#0891b2' },
];

function calcDaysInclusive(start?: string, end?: string, fallback = 1): number {
  if (!start || !end) return fallback;
  const d1 = new Date(start).getTime();
  const d2 = new Date(end).getTime();
  if (Number.isNaN(d1) || Number.isNaN(d2) || d2 < d1) return fallback;
  return Math.max(1, Math.round((d2 - d1) / 86400000) + 1);
}

function getRecordYear(dateStr?: string): number {
  if (dateStr && /^\d{4}/.test(dateStr)) {
    const y = Number(dateStr.slice(0, 4));
    if (!Number.isNaN(y)) return y;
  }
  return new Date().getFullYear();
}

export const LeaveManagementPage: React.FC<LeaveManagementPageProps> = ({ onViewDossier }) => {
  const {
    personnelList,
    ranksList,
    currentUser,
    isGuest,
    showNotification,
    assignOutOfUnit,
    cancelOutOfUnit,
    addPersonnelActivity,
    updatePersonnelActivity,
    deletePersonnelActivity,
    theme,
  } = useApp();
  const isLight = theme === 'light';

  const isBsm = ['P BSM', 'Q BSM', 'R BSM', 'HQ BSM', 'BSM'].includes(currentUser.role);
  const assignedBty = currentUser.assignedBattery;

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number | 'All'>(currentYear);
  const [batteryFilter, setBatteryFilter] = useState<Battery | 'All'>(
    isBsm && assignedBty ? (assignedBty as Battery) : 'All'
  );
  const [records, setRecords] = useState<LeaveManagementRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Workspace tabs & filters
  const [workspaceTab, setWorkspaceTab] = useState<ActiveWorkspaceTab>('active');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<LeaveRecordType | 'All'>('All');
  const [matrixType, setMatrixType] = useState<LeaveRecordType>('P/Lve');
  const [matrixStatus, setMatrixStatus] = useState<'remaining' | 'availed'>('remaining');
  const [searchQuery, setSearchQuery] = useState('');

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<LeaveManagementRecord | null>(null);
  const [selectedSoldierId, setSelectedSoldierId] = useState('');
  const [soldierPickerSearch, setSoldierPickerSearch] = useState('');
  const [modalLeaveType, setModalLeaveType] = useState<LeaveRecordType>('P/Lve');
  const [modalStatus, setModalStatus] = useState<'Active' | 'Completed'>('Active');
  const [modalStartDate, setModalStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [modalEndDate, setModalEndDate] = useState('');
  const [modalAddress, setModalAddress] = useState('');
  const [modalAuthority, setModalAuthority] = useState('');
  const [modalRemarks, setModalRemarks] = useState('');

  const loadFromSupabase = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchLeaveManagementFromSupabase();
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

  const persistRecords = async (nextRecords: LeaveManagementRecord[]) => {
    setIsSaving(true);
    setRecords(nextRecords);
    try {
      const res = await saveLeaveManagementToSupabase(nextRecords);
      if (!res.success) {
        showNotification(`সংরক্ষণ ত্রুটি: ${res.error || 'Supabase error'}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Personnel Map for Dossier lookup
  const personnelMap = useMemo(() => {
    const map = new Map<string, Personnel>();
    (personnelList || []).forEach((p) => {
      map.set(p.id, p);
      if (p.snkNo) map.set(p.snkNo.toLowerCase(), p);
    });
    return map;
  }, [personnelList]);

  // Eligible Posted Troops (exclude Civilian and ERE, respect BSM & battery filter)
  const eligiblePersonnel = useMemo(() => {
    const seenIds = new Set<string>();
    const filtered = (personnelList || []).filter((p) => {
      if (!p.id || seenIds.has(p.id)) return false;
      const isCiv =
        p.status === 'Civilian' ||
        p.rk === 'Civilian' ||
        p.trade === 'Civilian' ||
        (typeof p.rk === 'string' && p.rk.toLowerCase().includes('civ'));
      if (isCiv || p.status === 'ERE' || p.outOfUnitCategory === 'ERE') return false;
      if (isBsm && assignedBty && p.battery !== assignedBty) return false;
      if (batteryFilter !== 'All' && p.battery !== batteryFilter) return false;
      seenIds.add(p.id);
      return true;
    });
    return sortBySeniority(filtered, ranksList);
  }, [personnelList, ranksList, isBsm, assignedBty, batteryFilter]);

  // Merge Supabase leave_management records + personnel.activityHistory leave entries + current active Leave status
  const unifiedRecords = useMemo(() => {
    const merged: LeaveManagementRecord[] = [];
    const seenKeys = new Set<string>();
    const seenIds = new Set<string>();

    const makeKey = (pId: string, snk: string, lType: string, start: string) =>
      `${(pId || snk).toLowerCase()}__${lType.toLowerCase()}__${start || ''}`;

    // 1. Saved Supabase LeaveManagementRecords (enriched dynamically with live personnelList data)
    records.forEach((rawRec) => {
      if (rawRec.status === 'Cancelled') return;
      const live =
        personnelMap.get(rawRec.personnelId) ||
        personnelMap.get((rawRec.snkNo || '').trim().toLowerCase());
      const rec: LeaveManagementRecord = live
        ? {
            ...rawRec,
            personnelId: live.id,
            snkNo: live.snkNo || rawRec.snkNo,
            rk: live.rk || rawRec.rk,
            name: live.name || rawRec.name,
            battery: live.battery || rawRec.battery,
          }
        : rawRec;
      if (isBsm && assignedBty && rec.battery !== assignedBty) return;
      if (rec.id && seenIds.has(rec.id)) return;
      if (rec.id) seenIds.add(rec.id);
      merged.push(rec);
      seenKeys.add(makeKey(rec.personnelId, rec.snkNo, rec.leaveType, rec.startDate));
    });

    // 2. Existing activityHistory Leave entries from personnelList
    (personnelList || []).forEach((p) => {
      if (isBsm && assignedBty && p.battery !== assignedBty) return;
      (p.activityHistory || []).forEach((act) => {
        const sub = (act.subType || '').toLowerCase();
        const title = (act.title || '').toLowerCase();
        const isLeaveAct =
          act.type === 'Leave' ||
          sub === 'p/lve' ||
          sub === 'c/lve' ||
          sub === 'ni pass' ||
          title.includes('ni pass') ||
          title.includes('night pass') ||
          title.includes('নাইট পাস');

        if (!isLeaveAct || act.status === 'Cancelled') return;

        let lType: LeaveRecordType = 'P/Lve';
        if (sub === 'ni pass' || title.includes('ni pass') || title.includes('night pass') || title.includes('নাইট পাস')) {
          lType = 'Ni Pass';
        } else if (sub === 'c/lve' || title.includes('casual')) {
          lType = 'C/Lve';
        }

        const start = act.startDate || '';
        const k = makeKey(p.id, p.snkNo, lType, start);
        if (seenKeys.has(k)) return;
        seenKeys.add(k);

        const derivedStatus: 'Active' | 'Completed' =
          act.status === 'Active' &&
          (lType === 'Ni Pass' ||
            p.status === 'Leave' ||
            p.status === 'P/Lve' ||
            p.status === 'C/Lve' ||
            p.outOfUnitCategory === 'P/Lve' ||
            p.outOfUnitCategory === 'C/Lve')
            ? 'Active'
            : 'Completed';

        const recId = act.sourceId && !seenIds.has(act.sourceId) ? act.sourceId : `${p.id}_${act.id}`;
        if (seenIds.has(recId)) return;
        seenIds.add(recId);

        merged.push({
          id: recId,
          personnelId: p.id,
          snkNo: p.snkNo,
          rk: p.rk,
          name: p.name,
          battery: p.battery,
          leaveType: lType,
          startDate: start || new Date().toISOString().slice(0, 10),
          endDate: act.endDate,
          durationDays: act.durationDays || calcDaysInclusive(start, act.endDate, 1),
          addressOrDestination: act.location,
          authority: act.authority,
          remarks: act.remarks,
          status: derivedStatus,
          year: getRecordYear(start),
          activityId: act.id,
          recordedBy: act.recordedBy,
          recordedAt: act.recordedAt,
        });
      });

      // 3. Active Parade Leave status if not yet represented
      const isCurrentlyOnLeave =
        p.status === 'Leave' ||
        p.status === 'P/Lve' ||
        p.status === 'C/Lve' ||
        p.outOfUnitCategory === 'P/Lve' ||
        p.outOfUnitCategory === 'C/Lve' ||
        p.leaveType === 'P/Lve' ||
        p.leaveType === 'C/Lve';

      if (isCurrentlyOnLeave) {
        const lType: LeaveRecordType =
          p.status === 'C/Lve' || p.outOfUnitCategory === 'C/Lve' || p.leaveType === 'C/Lve'
            ? 'C/Lve'
            : 'P/Lve';
        const start = p.leaveFrom || p.outOfUnitStartDate || p.startDate || new Date().toISOString().slice(0, 10);
        const end = p.leaveTo || p.outOfUnitEndDate || p.endDate;
        const k = makeKey(p.id, p.snkNo, lType, start);
        const alreadyActiveForSoldier = merged.some(
          (r) =>
            (r.personnelId === p.id || r.snkNo.toLowerCase() === p.snkNo.toLowerCase()) &&
            r.leaveType === lType &&
            r.status === 'Active'
        );

        if (!seenKeys.has(k) && !alreadyActiveForSoldier) {
          seenKeys.add(k);
          merged.push({
            id: `live_${p.id}_${lType}`,
            personnelId: p.id,
            snkNo: p.snkNo,
            rk: p.rk,
            name: p.name,
            battery: p.battery,
            leaveType: lType,
            startDate: start,
            endDate: end,
            durationDays: p.durationDays || calcDaysInclusive(start, end, lType === 'P/Lve' ? 15 : 5),
            addressOrDestination: p.leaveAddress || p.outOfUnitLocation || p.location,
            authority: p.outOfUnitAuthority || p.authority,
            remarks: p.outOfUnitRemarks || p.remarks,
            status: 'Active',
            year: getRecordYear(start),
            recordedAt: new Date().toISOString(),
          });
        }
      }
    });

    return merged.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
  }, [records, personnelList, personnelMap, isBsm, assignedBty]);

  // Records scoped by Year & Battery filter
  const scopedRecords = useMemo(() => {
    return unifiedRecords.filter((r) => {
      if (selectedYear !== 'All' && r.year !== selectedYear) return false;
      if (batteryFilter !== 'All' && r.battery !== batteryFilter) return false;
      return true;
    });
  }, [unifiedRecords, selectedYear, batteryFilter]);

  // Summary Stats for P/Lve, C/Lve, Ni Pass: Availed vs Remaining vs Active
  const categoryStats = useMemo(() => {
    const totalEligible = eligiblePersonnel.length;
    const eligibleIdSet = new Set(eligiblePersonnel.map((p) => p.id));
    const eligibleSnkSet = new Set(eligiblePersonnel.map((p) => (p.snkNo || '').toLowerCase()));

    return LEAVE_TYPES.map((lt) => {
      const typeRecords = scopedRecords.filter((r) => r.leaveType === lt.id);
      const availedPersonIds = new Set<string>();
      let totalDays = 0;
      let activeCount = 0;

      typeRecords.forEach((r) => {
        const matchedP = personnelMap.get(r.personnelId) || personnelMap.get((r.snkNo || '').toLowerCase());
        const targetId = matchedP?.id || r.personnelId;
        if (eligibleIdSet.has(targetId) || eligibleSnkSet.has((r.snkNo || '').toLowerCase())) {
          availedPersonIds.add(targetId);
        }
        totalDays += r.durationDays || 1;
        if (r.status === 'Active') activeCount++;
      });

      const takenCount = availedPersonIds.size;
      const remainingCount = Math.max(0, totalEligible - takenCount);
      const takenPct = totalEligible > 0 ? Math.round((takenCount / totalEligible) * 100) : 0;

      return {
        ...lt,
        totalEligible,
        takenCount,
        remainingCount,
        activeCount,
        totalDays,
        totalInstances: typeRecords.length,
        takenPct,
        availedPersonIds,
      };
    });
  }, [eligiblePersonnel, scopedRecords, personnelMap]);

  // Battery-wise graph stats
  const batteryGraphStats = useMemo(() => {
    const btyList = isBsm && assignedBty ? [assignedBty as Battery] : ALL_BATTERIES;
    return btyList.map((bty) => {
      const btyEligible = (personnelList || []).filter((p) => {
        const isCiv =
          p.status === 'Civilian' ||
          p.rk === 'Civilian' ||
          p.trade === 'Civilian' ||
          (typeof p.rk === 'string' && p.rk.toLowerCase().includes('civ'));
        return !isCiv && p.status !== 'ERE' && p.outOfUnitCategory !== 'ERE' && p.battery === bty;
      });
      const btyRecs = unifiedRecords.filter(
        (r) => r.battery === bty && (selectedYear === 'All' || r.year === selectedYear)
      );
      const pSet = new Set(btyRecs.filter((r) => r.leaveType === 'P/Lve').map((r) => r.personnelId));
      const cSet = new Set(btyRecs.filter((r) => r.leaveType === 'C/Lve').map((r) => r.personnelId));
      const nSet = new Set(btyRecs.filter((r) => r.leaveType === 'Ni Pass').map((r) => r.personnelId));

      return {
        battery: bty,
        total: btyEligible.length,
        pLve: pSet.size,
        cLve: cSet.size,
        niPass: nSet.size,
      };
    });
  }, [personnelList, unifiedRecords, selectedYear, isBsm, assignedBty]);

  const maxGraphVal = useMemo(() => {
    const vals = categoryStats.flatMap((s) => [s.takenCount, s.remainingCount]);
    return Math.max(10, ...vals);
  }, [categoryStats]);

  // Active Leave & Ni Pass list
  const activeRecords = useMemo(() => {
    let list = unifiedRecords.filter((r) => {
      if (r.status !== 'Active') return false;
      if (batteryFilter !== 'All' && r.battery !== batteryFilter) return false;
      return true;
    });
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.snkNo.toLowerCase().includes(q) ||
          r.leaveType.toLowerCase().includes(q) ||
          (r.addressOrDestination || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [unifiedRecords, batteryFilter, searchQuery]);

  // Complete Ledger list
  const ledgerRecords = useMemo(() => {
    let list = scopedRecords;
    if (ledgerTypeFilter !== 'All') {
      list = list.filter((r) => r.leaveType === ledgerTypeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.snkNo.toLowerCase().includes(q) ||
          r.leaveType.toLowerCase().includes(q) ||
          (r.addressOrDestination || '').toLowerCase().includes(q) ||
          (r.authority || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [scopedRecords, ledgerTypeFilter, searchQuery]);

  // Availed vs Remaining matrix for selected matrixType
  const matrixData = useMemo(() => {
    const stat = categoryStats.find((s) => s.id === matrixType) || categoryStats[0];
    const availedSet = stat?.availedPersonIds || new Set<string>();

    const availedList: { person: Personnel; count: number; totalDays: number; lastDate: string }[] = [];
    const remainingList: Personnel[] = [];

    eligiblePersonnel.forEach((p) => {
      const q = searchQuery.toLowerCase().trim();
      if (
        q &&
        !p.name.toLowerCase().includes(q) &&
        !p.snkNo.toLowerCase().includes(q) &&
        !p.rk.toLowerCase().includes(q)
      ) {
        return;
      }

      if (availedSet.has(p.id)) {
        const pRecs = scopedRecords.filter(
          (r) =>
            r.leaveType === matrixType &&
            (r.personnelId === p.id || r.snkNo.toLowerCase() === p.snkNo.toLowerCase())
        );
        const totalDays = pRecs.reduce((sum, r) => sum + (r.durationDays || 1), 0);
        const lastDate = pRecs[0]?.startDate || '';
        availedList.push({ person: p, count: pRecs.length, totalDays, lastDate });
      } else {
        remainingList.push(p);
      }
    });

    return { availedList, remainingList };
  }, [eligiblePersonnel, categoryStats, matrixType, scopedRecords, searchQuery]);

  // Soldier picker options inside Modal
  const modalSoldierOptions = useMemo(() => {
    const q = soldierPickerSearch.toLowerCase().trim();
    return eligiblePersonnel.filter((p) => {
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.snkNo.toLowerCase().includes(q) ||
        p.rk.toLowerCase().includes(q) ||
        p.battery.toLowerCase().includes(q)
      );
    });
  }, [eligiblePersonnel, soldierPickerSearch]);

  const openAddModal = (preselectedPersonId?: string, preselectedType?: LeaveRecordType) => {
    setEditingRecord(null);
    setSelectedSoldierId(preselectedPersonId || eligiblePersonnel[0]?.id || '');
    setSoldierPickerSearch('');
    setModalLeaveType(preselectedType || 'P/Lve');
    setModalStatus('Active');
    const today = new Date().toISOString().slice(0, 10);
    setModalStartDate(today);
    setModalEndDate('');
    setModalAddress('');
    setModalAuthority('');
    setModalRemarks('');
    setIsModalOpen(true);
  };

  const openEditModal = (rec: LeaveManagementRecord) => {
    setEditingRecord(rec);
    setSelectedSoldierId(rec.personnelId);
    setModalLeaveType(rec.leaveType);
    setModalStatus(rec.status === 'Active' ? 'Active' : 'Completed');
    setModalStartDate(rec.startDate || new Date().toISOString().slice(0, 10));
    setModalEndDate(rec.endDate || '');
    setModalAddress(rec.addressOrDestination || '');
    setModalAuthority(rec.authority || '');
    setModalRemarks(rec.remarks || '');
    setIsModalOpen(true);
  };

  const handleSaveLeaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) {
      showNotification('গেস্ট মোডে ছুটি এডিট করা যাবে না।');
      return;
    }

    const person = personnelMap.get(selectedSoldierId);
    if (!person) {
      showNotification('দয়া করে একজন সৈনিক নির্বাচন করুন।');
      return;
    }
    if (!modalStartDate) {
      showNotification('শুরুর তারিখ প্রদান করুন।');
      return;
    }
    if (modalStatus === 'Active' && (modalLeaveType === 'P/Lve' || modalLeaveType === 'C/Lve') && !modalEndDate) {
      showNotification('P/Lve বা C/Lve-এর ক্ষেত্রে যোগদানের তারিখ (End Date) প্রদান করুন।');
      return;
    }

    const durationDays = calcDaysInclusive(
      modalStartDate,
      modalEndDate || modalStartDate,
      modalLeaveType === 'Ni Pass' ? 1 : modalLeaveType === 'C/Lve' ? 5 : 15
    );
    const year = getRecordYear(modalStartDate);
    const titleStr =
      modalLeaveType === 'Ni Pass'
        ? 'Night Pass (নাইট পাস)'
        : modalLeaveType === 'C/Lve'
        ? 'Casual Leave (নৈমিত্তিক ছুটি)'
        : 'Privilege Leave (বাৎসরিক ছুটি)';

    if (editingRecord) {
      const updatedRec: LeaveManagementRecord = {
        ...editingRecord,
        leaveType: modalLeaveType,
        status: modalStatus,
        startDate: modalStartDate,
        endDate: modalEndDate || undefined,
        durationDays,
        addressOrDestination: modalAddress.trim() || undefined,
        authority: modalAuthority.trim() || undefined,
        remarks: modalRemarks.trim() || undefined,
        year,
      };

      const existsInSaved = records.some((r) => r.id === editingRecord.id);
      const nextRecords = existsInSaved
        ? records.map((r) => (r.id === editingRecord.id ? updatedRec : r))
        : [updatedRec, ...records];
      await persistRecords(nextRecords);

      if (modalStatus === 'Active' && (modalLeaveType === 'P/Lve' || modalLeaveType === 'C/Lve')) {
        assignOutOfUnit(person.id, modalLeaveType, {
          location: modalAddress.trim() || undefined,
          startDate: modalStartDate,
          endDate: modalEndDate || undefined,
          authority: modalAuthority.trim() || undefined,
          remarks: modalRemarks.trim() || undefined,
        });
      } else if (editingRecord.activityId) {
        updatePersonnelActivity(person.id, editingRecord.activityId, {
          subType: modalLeaveType,
          title: titleStr,
          startDate: modalStartDate,
          endDate: modalEndDate || undefined,
          durationDays,
          location: modalAddress.trim() || undefined,
          authority: modalAuthority.trim() || undefined,
          remarks: modalRemarks.trim() || undefined,
          status: modalStatus === 'Active' ? 'Active' : 'Completed',
        });
      }

      showNotification(`${person.rk} ${person.name}-এর ছুটি/পাস তথ্য আপডেট করা হয়েছে।`);
    } else {
      const actId = 'act_lve_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      const recId = 'lm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);

      const newRec: LeaveManagementRecord = {
        id: recId,
        personnelId: person.id,
        snkNo: person.snkNo,
        rk: person.rk,
        name: person.name,
        battery: person.battery,
        leaveType: modalLeaveType,
        startDate: modalStartDate,
        endDate: modalEndDate || undefined,
        durationDays,
        addressOrDestination: modalAddress.trim() || undefined,
        authority: modalAuthority.trim() || undefined,
        remarks: modalRemarks.trim() || undefined,
        status: modalStatus,
        year,
        activityId: actId,
        recordedBy: `${currentUser.rank} ${currentUser.name}`,
        recordedAt: new Date().toISOString(),
      };

      await persistRecords([newRec, ...records]);

      if (modalStatus === 'Active' && (modalLeaveType === 'P/Lve' || modalLeaveType === 'C/Lve')) {
        // Assign live parade out-of-unit status (also appends to activityHistory)
        assignOutOfUnit(person.id, modalLeaveType, {
          location: modalAddress.trim() || undefined,
          startDate: modalStartDate,
          endDate: modalEndDate || undefined,
          authority: modalAuthority.trim() || undefined,
          remarks: modalRemarks.trim() || undefined,
        });
      } else {
        // Ni Pass OR Completed historical leave -> log directly to soldier's Dossier activityHistory
        addPersonnelActivity(person.id, {
          type: 'Leave',
          subType: modalLeaveType,
          title: titleStr,
          startDate: modalStartDate,
          endDate: modalEndDate || undefined,
          durationDays,
          location: modalAddress.trim() || undefined,
          authority: modalAuthority.trim() || undefined,
          remarks: modalRemarks.trim() || undefined,
          status: modalStatus === 'Active' ? 'Active' : 'Completed',
          sourceTable: 'manual',
          sourceId: recId,
        });
      }

      showNotification(`${person.rk} ${person.name}-কে ${modalLeaveType} যুক্ত করা হয়েছে এবং ডসিয়ারে সংরক্ষিত হয়েছে।`);
    }

    setIsModalOpen(false);
  };

  const handleReturnToUnit = async (rec: LeaveManagementRecord) => {
    if (isGuest) return;
    const person = personnelMap.get(rec.personnelId) || personnelMap.get(rec.snkNo.toLowerCase());

    if (rec.leaveType === 'P/Lve' || rec.leaveType === 'C/Lve') {
      if (person && (person.status === 'Leave' || person.status === 'P/Lve' || person.status === 'C/Lve' || person.outOfUnitCategory === 'P/Lve' || person.outOfUnitCategory === 'C/Lve')) {
        cancelOutOfUnit(person.id);
      }
    } else if (person && rec.activityId) {
      updatePersonnelActivity(person.id, rec.activityId, {
        status: 'Returned',
        endDate: rec.endDate || new Date().toISOString().slice(0, 10),
      });
    }

    const existsInSaved = records.some((r) => r.id === rec.id);
    const updatedRec: LeaveManagementRecord = {
      ...rec,
      status: 'Completed',
      endDate: rec.endDate || new Date().toISOString().slice(0, 10),
    };
    const nextRecords = existsInSaved
      ? records.map((r) => (r.id === rec.id ? updatedRec : r))
      : [updatedRec, ...records];
    await persistRecords(nextRecords);
    showNotification(`${rec.rk} ${rec.name} ইউনিটে যোগদান সম্পন্ন হয়েছে।`);
  };

  const handleDeleteRecord = async (rec: LeaveManagementRecord) => {
    if (isGuest) return;
    const person = personnelMap.get(rec.personnelId) || personnelMap.get(rec.snkNo.toLowerCase());

    if (
      rec.status === 'Active' &&
      (rec.leaveType === 'P/Lve' || rec.leaveType === 'C/Lve') &&
      person &&
      (person.status === 'Leave' || person.status === 'P/Lve' || person.status === 'C/Lve' || person.outOfUnitCategory === 'P/Lve' || person.outOfUnitCategory === 'C/Lve')
    ) {
      cancelOutOfUnit(person.id);
    }

    if (person && rec.activityId) {
      deletePersonnelActivity(person.id, rec.activityId);
    }

    const nextRecords = records.filter((r) => r.id !== rec.id);
    await persistRecords(nextRecords);
    showNotification(`রেকর্ড মুছে ফেলা হয়েছে (${rec.rk} ${rec.name})।`);
  };

  const getTypeBadgeStyle = (lType: LeaveRecordType) => {
    if (lType === 'P/Lve') {
      return isLight
        ? 'bg-purple-100 text-purple-800 border-purple-300'
        : 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    }
    if (lType === 'C/Lve') {
      return isLight
        ? 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300'
        : 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30';
    }
    return isLight
      ? 'bg-cyan-100 text-cyan-800 border-cyan-300'
      : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div
        className={`rounded-2xl border p-4 sm:p-5 transition-colors ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800 shadow-xl'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-0.5 rounded border ${
                  isLight
                    ? 'bg-purple-50 text-purple-800 border-purple-200'
                    : 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                }`}
              >
                Leave & Night Pass Management
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                P/Lve • C/Lve • Ni Pass • Dossier Linked
              </span>
            </div>
            <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              ছুটি ও নাইট পাস ব্যবস্থাপনা (Lve Mgt)
            </h1>
            <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              কয়জন P/Lve, C/Lve ও Ni Pass কাটিয়েছেন এবং কতজন বাকি আছেন তার গ্রাফ বিশ্লেষণ ও ডসিয়ার রেকর্ড।
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Year Selector */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value === 'All' ? 'All' : Number(e.target.value))}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold cursor-pointer ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-200'
              }`}
            >
              <option value={currentYear}>সাল: {currentYear}</option>
              <option value={currentYear - 1}>সাল: {currentYear - 1}</option>
              <option value="All">সকল বছর</option>
            </select>

            {/* Battery Selector */}
            {!isBsm && (
              <select
                value={batteryFilter}
                onChange={(e) => setBatteryFilter(e.target.value as Battery | 'All')}
                className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold cursor-pointer ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-200'
                }`}
              >
                <option value="All">সব ব্যাটারী ({personnelList.length})</option>
                {ALL_BATTERIES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={loadFromSupabase}
              className={`p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                isLight
                  ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
              title="রিফ্রেশ"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading || isSaving ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                isLight
                  ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট</span>
            </button>

            {!isGuest && (
              <button
                type="button"
                onClick={() => openAddModal()}
                className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-md shadow-purple-900/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>নতুন ছুটি / নাইট পাস</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3 Category KPI Cards: P/Lve, C/Lve, Ni Pass */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {categoryStats.map((stat) => {
          const IconComp = stat.id === 'Ni Pass' ? Moon : PlaneTakeoff;
          const borderAccent =
            stat.id === 'P/Lve'
              ? isLight
                ? 'border-purple-200 bg-purple-50/40'
                : 'border-purple-500/30 bg-slate-900'
              : stat.id === 'C/Lve'
              ? isLight
                ? 'border-fuchsia-200 bg-fuchsia-50/40'
                : 'border-fuchsia-500/30 bg-slate-900'
              : isLight
              ? 'border-cyan-200 bg-cyan-50/40'
              : 'border-cyan-500/30 bg-slate-900';

          const barBg =
            stat.id === 'P/Lve'
              ? 'bg-purple-600'
              : stat.id === 'C/Lve'
              ? 'bg-fuchsia-600'
              : 'bg-cyan-600';

          return (
            <div key={stat.id} className={`rounded-2xl border p-4 space-y-3 transition-colors ${borderAccent}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center border ${getTypeBadgeStyle(stat.id)}`}
                  >
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {stat.label}
                    </h3>
                    <p className="text-[11px] text-slate-500">{stat.bnLabel}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${getTypeBadgeStyle(stat.id)}`}>
                  সক্রিয়: {stat.activeCount} জন
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMatrixType(stat.id);
                    setMatrixStatus('availed');
                    setWorkspaceTab('matrix');
                  }}
                  className={`p-2 rounded-xl border text-left transition-colors cursor-pointer ${
                    isLight ? 'bg-white border-slate-200 hover:bg-slate-50' : 'bg-slate-950/70 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <div className="text-[10px] text-slate-500">কাটিয়েছে</div>
                  <div className="text-lg font-mono font-black text-emerald-500">{stat.takenCount}</div>
                  <div className="text-[10px] font-mono text-slate-400">{stat.takenPct}% জন</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMatrixType(stat.id);
                    setMatrixStatus('remaining');
                    setWorkspaceTab('matrix');
                  }}
                  className={`p-2 rounded-xl border text-left transition-colors cursor-pointer ${
                    isLight ? 'bg-white border-slate-200 hover:bg-slate-50' : 'bg-slate-950/70 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <div className="text-[10px] text-slate-500">বাকি আছে</div>
                  <div className="text-lg font-mono font-black text-amber-500">{stat.remainingCount}</div>
                  <div className="text-[10px] font-mono text-slate-400">{100 - stat.takenPct}% জন</div>
                </button>

                <div
                  className={`p-2 rounded-xl border text-left ${
                    isLight ? 'bg-white border-slate-200' : 'bg-slate-950/70 border-slate-800'
                  }`}
                >
                  <div className="text-[10px] text-slate-500">মোট দিন</div>
                  <div className={`text-lg font-mono font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {stat.totalDays}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">{stat.totalInstances} বার</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>কাটিয়েছে: {stat.takenCount} / {stat.totalEligible}</span>
                  <span>{stat.takenPct}%</span>
                </div>
                <div className={`w-full h-2 rounded-full overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}>
                  <div className={`h-full rounded-full transition-all duration-500 ${barBg}`} style={{ width: `${stat.takenPct}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual Graphs Section ("graph er moto") */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Graph 1: Grouped Column Bar Chart (কাটিয়েছে বনাম বাকি আছে) */}
        <div
          className={`lg:col-span-7 rounded-2xl border p-4 sm:p-5 space-y-4 ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800 shadow-xl'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-500" />
              <h2 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                ছুটি ও পাস বিশ্লেষণ গ্রাফ (কাটিয়েছে বনাম বাকি আছে)
              </h2>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
                <span>কাটিয়েছে (Availed)</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
                <span>বাকি আছে (Remaining)</span>
              </span>
            </div>
          </div>

          {/* SVG Bar Chart */}
          <div className="w-full overflow-x-auto">
            <svg viewBox="0 0 620 230" className="w-full min-w-[460px] h-56 select-none">
              {/* Horizontal Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const y = 185 - ratio * 145;
                const labelVal = Math.round(maxGraphVal * ratio);
                return (
                  <g key={idx}>
                    <line
                      x1="46"
                      y1={y}
                      x2="595"
                      y2={y}
                      stroke={isLight ? '#e2e8f0' : '#1e293b'}
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x="38"
                      y={y + 4}
                      textAnchor="end"
                      fill={isLight ? '#64748b' : '#94a3b8'}
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {labelVal}
                    </text>
                  </g>
                );
              })}

              {/* Grouped Bars for P/Lve, C/Lve, Ni Pass */}
              {categoryStats.map((stat, i) => {
                const groupCenterX = 140 + i * 170;
                const barWidth = 44;
                const gap = 12;

                const takenHeight = Math.max(4, (stat.takenCount / maxGraphVal) * 145);
                const remHeight = Math.max(4, (stat.remainingCount / maxGraphVal) * 145);

                const takenY = 185 - takenHeight;
                const remY = 185 - remHeight;

                return (
                  <g key={stat.id}>
                    {/* Availed Bar */}
                    <g
                      className="cursor-pointer"
                      onClick={() => {
                        setMatrixType(stat.id);
                        setMatrixStatus('availed');
                        setWorkspaceTab('matrix');
                      }}
                    >
                      <rect
                        x={groupCenterX - barWidth - gap / 2}
                        y={takenY}
                        width={barWidth}
                        height={takenHeight}
                        rx="6"
                        fill="#10b981"
                        opacity="0.9"
                      />
                      <text
                        x={groupCenterX - barWidth / 2 - gap / 2}
                        y={takenY - 6}
                        textAnchor="middle"
                        fill={isLight ? '#047857' : '#34d399'}
                        fontSize="11"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {stat.takenCount}
                      </text>
                    </g>

                    {/* Remaining Bar */}
                    <g
                      className="cursor-pointer"
                      onClick={() => {
                        setMatrixType(stat.id);
                        setMatrixStatus('remaining');
                        setWorkspaceTab('matrix');
                      }}
                    >
                      <rect
                        x={groupCenterX + gap / 2}
                        y={remY}
                        width={barWidth}
                        height={remHeight}
                        rx="6"
                        fill="#f59e0b"
                        opacity="0.88"
                      />
                      <text
                        x={groupCenterX + barWidth / 2 + gap / 2}
                        y={remY - 6}
                        textAnchor="middle"
                        fill={isLight ? '#b45309' : '#fbbf24'}
                        fontSize="11"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {stat.remainingCount}
                      </text>
                    </g>

                    {/* Category X-axis label */}
                    <text
                      x={groupCenterX}
                      y="206"
                      textAnchor="middle"
                      fill={isLight ? '#0f172a' : '#f8fafc'}
                      fontSize="12"
                      fontWeight="bold"
                    >
                      {stat.label}
                    </text>
                    <text
                      x={groupCenterX}
                      y="221"
                      textAnchor="middle"
                      fill={isLight ? '#64748b' : '#94a3b8'}
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      ({stat.takenPct}% কাটিয়েছে)
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Graph 2: Battery-Wise Distribution */}
        <div
          className={`lg:col-span-5 rounded-2xl border p-4 sm:p-5 space-y-3.5 ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800 shadow-xl'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <Users className="w-4 h-4 text-cyan-500" />
              <span>ব্যাটারী ভিত্তিক ছুটি ও পাস চিত্র</span>
            </h2>
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="text-purple-500 font-bold">● P/Lve</span>
              <span className="text-fuchsia-500 font-bold">● C/Lve</span>
              <span className="text-cyan-500 font-bold">● Ni Pass</span>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {batteryGraphStats.map((b) => {
              const pPct = b.total > 0 ? Math.min(100, Math.round((b.pLve / b.total) * 100)) : 0;
              const cPct = b.total > 0 ? Math.min(100, Math.round((b.cLve / b.total) * 100)) : 0;
              const nPct = b.total > 0 ? Math.min(100, Math.round((b.niPass / b.total) * 100)) : 0;
              return (
                <div
                  key={b.battery}
                  className={`p-2.5 rounded-xl border space-y-1.5 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-mono font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {b.battery} <span className="text-[10px] font-normal text-slate-500">({b.total} জন)</span>
                    </span>
                    <div className="flex items-center gap-2 text-[11px] font-mono">
                      <span className="text-purple-500 font-bold">P: {b.pLve}</span>
                      <span className="text-fuchsia-500 font-bold">C: {b.cLve}</span>
                      <span className="text-cyan-500 font-bold">Ni: {b.niPass}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <div className={`h-1.5 rounded-full overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`} title={`P/Lve: ${b.pLve}`}>
                      <div className="h-full bg-purple-600 rounded-full" style={{ width: `${pPct}%` }} />
                    </div>
                    <div className={`h-1.5 rounded-full overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`} title={`C/Lve: ${b.cLve}`}>
                      <div className="h-full bg-fuchsia-600 rounded-full" style={{ width: `${cPct}%` }} />
                    </div>
                    <div className={`h-1.5 rounded-full overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`} title={`Ni Pass: ${b.niPass}`}>
                      <div className="h-full bg-cyan-600 rounded-full" style={{ width: `${nPct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Workspace Navigation Tabs & Search */}
      <div
        className={`rounded-2xl border p-4 space-y-4 ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800 shadow-xl'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-3 border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setWorkspaceTab('active')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                workspaceTab === 'active'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : isLight
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>বর্তমানে ছুটিতে / নাইট পাসে ({activeRecords.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setWorkspaceTab('matrix')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                workspaceTab === 'matrix'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : isLight
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>কাটিয়েছে ও বাকি তালিকা</span>
            </button>

            <button
              type="button"
              onClick={() => setWorkspaceTab('ledger')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                workspaceTab === 'ledger'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : isLight
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>সকল ছুটি ও পাস রেকর্ড ({ledgerRecords.length})</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="সৈনিক নং, নাম বা ঠিকানা খুঁজুন..."
              className={`pl-8 pr-3 py-1.5 rounded-xl border text-xs w-full sm:w-64 focus:outline-none focus:border-purple-500 ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
              }`}
            />
          </div>
        </div>

        {/* TAB 1: Active Leaves & Ni Pass */}
        {workspaceTab === 'active' && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            {activeRecords.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500">
                বর্তমানে কেউ সক্রিয় ছুটি বা নাইট পাসে নেই।
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead
                  className={`text-[11px] font-mono uppercase border-b ${
                    isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  <tr>
                    <th className="py-2.5 px-3">সৈনিক নং</th>
                    <th className="py-2.5 px-3">পদবি ও নাম</th>
                    <th className="py-2.5 px-2">ব্যাটারী</th>
                    <th className="py-2.5 px-3">ধরন</th>
                    <th className="py-2.5 px-3">সময়কাল ও দিন</th>
                    <th className="py-2.5 px-3">ঠিকানা / গন্তব্য</th>
                    <th className="py-2.5 px-3 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/70'}`}>
                  {activeRecords.map((rec, idx) => {
                    const person = personnelMap.get(rec.personnelId) || personnelMap.get(rec.snkNo.toLowerCase());
                    return (
                      <tr key={`${rec.id}-${idx}`} className={isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'}>
                        <td className="py-2.5 px-3 font-mono font-bold text-amber-500 whitespace-nowrap">{rec.snkNo}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <RankBadge rank={rec.rk} size="sm" />
                            <button
                              type="button"
                              onClick={() => person && onViewDossier && onViewDossier(person)}
                              className="font-semibold hover:underline cursor-pointer text-left"
                            >
                              {rec.name}
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 font-mono whitespace-nowrap">{rec.battery}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${getTypeBadgeStyle(rec.leaveType)}`}>
                            {rec.leaveType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] whitespace-nowrap">
                          <div>
                            {rec.startDate} {rec.endDate ? `➔ ${rec.endDate}` : ''}
                          </div>
                          <div className="text-[10px] text-emerald-500 font-semibold">{rec.durationDays} দিন</div>
                        </td>
                        <td className="py-2.5 px-3 max-w-xs truncate">
                          {rec.addressOrDestination || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {person && onViewDossier && (
                              <button
                                type="button"
                                onClick={() => onViewDossier(person)}
                                className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 text-[11px] hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer inline-flex items-center gap-1"
                                title="ডসিয়ার দেখুন"
                              >
                                <Eye className="w-3 h-3" />
                                <span>ডসিয়ার</span>
                              </button>
                            )}
                            {!isGuest && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleReturnToUnit(rec)}
                                  className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1"
                                  title="ইউনিটে যোগদান সম্পন্ন করুন"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>যোগদান</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditModal(rec)}
                                  className="p-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                  title="এডিট"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* TAB 2: Availed vs Remaining Matrix */}
        {workspaceTab === 'matrix' && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {LEAVE_TYPES.map((lt) => (
                  <button
                    key={lt.id}
                    type="button"
                    onClick={() => setMatrixType(lt.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-colors ${
                      matrixType === lt.id
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent'
                        : isLight
                        ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {lt.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setMatrixStatus('remaining')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                    matrixStatus === 'remaining'
                      ? 'bg-amber-600 text-white border-amber-500'
                      : isLight
                      ? 'bg-white text-slate-700 border-slate-300'
                      : 'bg-slate-950 text-slate-300 border-slate-700'
                  }`}
                >
                  বাকি আছে ({matrixData.remainingList.length} জন)
                </button>
                <button
                  type="button"
                  onClick={() => setMatrixStatus('availed')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                    matrixStatus === 'availed'
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : isLight
                      ? 'bg-white text-slate-700 border-slate-300'
                      : 'bg-slate-950 text-slate-300 border-slate-700'
                  }`}
                >
                  কাটিয়েছে ({matrixData.availedList.length} জন)
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[480px] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
              {matrixStatus === 'remaining' ? (
                <table className="w-full text-left text-xs border-collapse">
                  <thead
                    className={`text-[11px] font-mono uppercase border-b sticky top-0 z-10 ${
                      isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    <tr>
                      <th className="py-2.5 px-3">সৈনিক নং</th>
                      <th className="py-2.5 px-3">পদবি ও নাম</th>
                      <th className="py-2.5 px-3">ব্যাটারী</th>
                      <th className="py-2.5 px-3">বর্তমান অবস্থা</th>
                      <th className="py-2.5 px-3 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/70'}`}>
                    {matrixData.remainingList.map((p) => (
                      <tr key={p.id} className={isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'}>
                        <td className="py-2 px-3 font-mono font-bold text-amber-500 whitespace-nowrap">{p.snkNo}</td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <RankBadge rank={p.rk} trade={p.trade} size="sm" />
                            <button
                              type="button"
                              onClick={() => onViewDossier && onViewDossier(p)}
                              className="font-semibold hover:underline cursor-pointer text-left"
                            >
                              {p.name}
                            </button>
                          </div>
                        </td>
                        <td className="py-2 px-3 font-mono">{p.battery}</td>
                        <td className="py-2 px-3 text-slate-500">{p.status}</td>
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          {!isGuest && (
                            <button
                              type="button"
                              onClick={() => openAddModal(p.id, matrixType)}
                              className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>{matrixType} দিন</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead
                    className={`text-[11px] font-mono uppercase border-b sticky top-0 z-10 ${
                      isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    <tr>
                      <th className="py-2.5 px-3">সৈনিক নং</th>
                      <th className="py-2.5 px-3">পদবি ও নাম</th>
                      <th className="py-2.5 px-3">ব্যাটারী</th>
                      <th className="py-2.5 px-3 text-center">কতবার কাটিয়েছে</th>
                      <th className="py-2.5 px-3 text-center">মোট দিন</th>
                      <th className="py-2.5 px-3">সর্বশেষ তারিখ</th>
                      <th className="py-2.5 px-3 text-right">ডসিয়ার</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/70'}`}>
                    {matrixData.availedList.map(({ person: p, count, totalDays, lastDate }) => (
                      <tr key={p.id} className={isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'}>
                        <td className="py-2 px-3 font-mono font-bold text-amber-500 whitespace-nowrap">{p.snkNo}</td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <RankBadge rank={p.rk} trade={p.trade} size="sm" />
                            <button
                              type="button"
                              onClick={() => onViewDossier && onViewDossier(p)}
                              className="font-semibold hover:underline cursor-pointer text-left"
                            >
                              {p.name}
                            </button>
                          </div>
                        </td>
                        <td className="py-2 px-3 font-mono">{p.battery}</td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-emerald-500">{count} বার</td>
                        <td className="py-2 px-3 text-center font-mono font-bold">{totalDays} দিন</td>
                        <td className="py-2 px-3 font-mono">{lastDate || '-'}</td>
                        <td className="py-2 px-3 text-right">
                          {onViewDossier && (
                            <button
                              type="button"
                              onClick={() => onViewDossier(p)}
                              className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 text-[11px] hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer inline-flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              <span>ডসিয়ার</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Complete Ledger */}
        {workspaceTab === 'ledger' && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['All', 'P/Lve', 'C/Lve', 'Ni Pass'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setLedgerTypeFilter(t)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold border cursor-pointer ${
                    ledgerTypeFilter === t
                      ? 'bg-purple-600 text-white border-purple-500'
                      : isLight
                      ? 'bg-slate-50 text-slate-700 border-slate-200'
                      : 'bg-slate-950 text-slate-300 border-slate-800'
                  }`}
                >
                  {t === 'All' ? 'সকল ধরন' : t}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto max-h-[480px] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
              {ledgerRecords.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500">
                  নির্বাচিত ফিল্টারে কোনো ছুটি বা নাইট পাস রেকর্ড পাওয়া যায়নি।
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead
                    className={`text-[11px] font-mono uppercase border-b sticky top-0 z-10 ${
                      isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    <tr>
                      <th className="py-2.5 px-3">সৈনিক নং</th>
                      <th className="py-2.5 px-3">পদবি ও নাম</th>
                      <th className="py-2.5 px-2">ব্যাটারী</th>
                      <th className="py-2.5 px-3">ধরন</th>
                      <th className="py-2.5 px-3">তারিখ ও দিন</th>
                      <th className="py-2.5 px-3">ঠিকানা ও আদেশ</th>
                      <th className="py-2.5 px-3">অবস্থা</th>
                      <th className="py-2.5 px-3 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/70'}`}>
                    {ledgerRecords.map((rec, idx) => {
                      const person = personnelMap.get(rec.personnelId) || personnelMap.get(rec.snkNo.toLowerCase());
                      return (
                        <tr key={`${rec.id}-${idx}`} className={isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'}>
                          <td className="py-2 px-3 font-mono font-bold text-amber-500 whitespace-nowrap">{rec.snkNo}</td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <RankBadge rank={rec.rk} size="sm" />
                              <button
                                type="button"
                                onClick={() => person && onViewDossier && onViewDossier(person)}
                                className="font-semibold hover:underline cursor-pointer text-left"
                              >
                                {rec.name}
                              </button>
                            </div>
                          </td>
                          <td className="py-2 px-2 font-mono">{rec.battery}</td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${getTypeBadgeStyle(rec.leaveType)}`}>
                              {rec.leaveType}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] whitespace-nowrap">
                            {rec.startDate} {rec.endDate ? `➔ ${rec.endDate}` : ''} ({rec.durationDays} দিন)
                          </td>
                          <td className="py-2 px-3 max-w-xs truncate">
                            {rec.addressOrDestination || '-'} {rec.authority ? `• [${rec.authority}]` : ''}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                                rec.status === 'Active'
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                  : 'bg-slate-500/15 text-slate-400 border-slate-500/30'
                              }`}
                            >
                              {rec.status === 'Active' ? 'চলমান' : 'সম্পন্ন'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              {person && onViewDossier && (
                                <button
                                  type="button"
                                  onClick={() => onViewDossier(person)}
                                  className="p-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                  title="ডসিয়ার"
                                >
                                  <Eye className="w-3 h-3" />
                                </button>
                              )}
                              {!isGuest && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(rec)}
                                    className="p-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                    title="এডিট"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRecord(rec)}
                                    className="p-1.5 rounded border border-slate-300 dark:border-slate-700 text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                                    title="মুছে ফেলুন"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Leave & Ni Pass Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/65 backdrop-blur-xs">
          <div
            className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${
              isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
            }`}
          >
            <div
              className={`px-5 py-3.5 border-b flex items-center justify-between ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <PlaneTakeoff className="w-4 h-4 text-purple-500" />
                <h3 className="text-sm font-bold">
                  {editingRecord ? 'ছুটি / নাইট পাস তথ্য এডিট করুন' : 'নতুন ছুটি / নাইট পাস যুক্ত করুন'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLeaveModal} className="p-5 space-y-4 text-xs">
              {/* Soldier Selection */}
              {!editingRecord ? (
                <div className="space-y-1.5">
                  <label className="block font-semibold">সৈনিক নির্বাচন করুন *</label>
                  <input
                    type="text"
                    value={soldierPickerSearch}
                    onChange={(e) => setSoldierPickerSearch(e.target.value)}
                    placeholder="সৈনিক নং বা নাম দিয়ে খুঁজুন..."
                    className={`w-full rounded-lg p-2 border text-xs ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  />
                  <select
                    required
                    value={selectedSoldierId}
                    onChange={(e) => setSelectedSoldierId(e.target.value)}
                    className={`w-full rounded-lg p-2 border text-xs ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  >
                    {modalSoldierOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.snkNo} — {p.rk} {p.name} ({p.battery})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className={`p-2.5 rounded-lg border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
                  <span className="font-mono font-bold text-amber-500 mr-2">{editingRecord.snkNo}</span>
                  <span className="font-bold">{editingRecord.rk} {editingRecord.name}</span> ({editingRecord.battery})
                </div>
              )}

              {/* Leave Type Pills */}
              <div className="space-y-1.5">
                <label className="block font-semibold">ছুটি / পাসের ধরন *</label>
                <div className="grid grid-cols-3 gap-2">
                  {LEAVE_TYPES.map((lt) => (
                    <button
                      key={lt.id}
                      type="button"
                      onClick={() => setModalLeaveType(lt.id)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                        modalLeaveType === lt.id
                          ? 'bg-purple-600 text-white border-purple-500 shadow-xs'
                          : isLight
                          ? 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                          : 'bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {lt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status & Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">অবস্থা (Status)</label>
                  <select
                    value={modalStatus}
                    onChange={(e) => setModalStatus(e.target.value as 'Active' | 'Completed')}
                    className={`w-full rounded-lg p-2 border text-xs ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  >
                    <option value="Active">চলমান (বর্তমানে ছুটিতে/পাসে)</option>
                    <option value="Completed">সম্পন্ন (ইতিপূর্বে কাটিয়েছে)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">শুরুর তারিখ *</label>
                  <input
                    type="date"
                    required
                    value={modalStartDate}
                    onChange={(e) => setModalStartDate(e.target.value)}
                    className={`w-full rounded-lg p-2 border text-xs ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">
                    যোগদানের তারিখ {modalStatus === 'Active' && modalLeaveType !== 'Ni Pass' ? '*' : ''}
                  </label>
                  <input
                    type="date"
                    required={modalStatus === 'Active' && modalLeaveType !== 'Ni Pass'}
                    value={modalEndDate}
                    onChange={(e) => setModalEndDate(e.target.value)}
                    className={`w-full rounded-lg p-2 border text-xs ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  />
                </div>
              </div>

              {/* Address & Authority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">ছুটিকালীন ঠিকানা / গন্তব্য</label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={modalAddress}
                      onChange={(e) => setModalAddress(e.target.value)}
                      placeholder="জেলা / ঠিকানা..."
                      className={`w-full rounded-lg pl-8 pr-2.5 py-2 border text-xs ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1">অনুমোদন / আদেশ</label>
                  <input
                    type="text"
                    value={modalAuthority}
                    onChange={(e) => setModalAuthority(e.target.value)}
                    placeholder="CO / Adjutant / Part II..."
                    className={`w-full rounded-lg p-2 border text-xs ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
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
                  placeholder="অতিরিক্ত মন্তব্য..."
                  className={`w-full rounded-lg p-2 border text-xs ${
                    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-4 py-2 rounded-lg border font-semibold cursor-pointer ${
                    isLight ? 'bg-white border-slate-300 text-slate-700' : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer shadow-sm"
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
