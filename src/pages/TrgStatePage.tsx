import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Battery, Personnel } from '../types';
import { RankBadge } from '../components/common/RankBadge';
import {
  TrgModuleType,
  TrgBiannualType,
  IpftResultType,
  TrgRecord,
  IpftBoardDef,
  TRG_MODULE_CONFIGS,
  inferIpftBiannual,
  inferIpftBoardName,
  getIpftResultCategory,
} from '../data/trgStateData';
import {
  fetchTrgStateFromSupabase,
  upsertTrgStateToSupabase,
  deleteTrgStateFromSupabase,
  upsertIpftBoardToSupabase,
} from '../lib/supabase';
import {
  Target,
  Search,
  Plus,
  X,
  Printer,
  Trash2,
  Edit3,
  Calendar,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  RefreshCw,
  Layers,
  Users,
  RotateCcw,
  ChevronDown,
  ClipboardList,
} from 'lucide-react';

interface TrgStatePageProps {
  onViewDossier: (person: Personnel) => void;
  onOpenPrintModal?: () => void;
}

type IpftResultFilter = 'All' | 'Appeared' | IpftResultType;
type IpftAppearanceFilter = 'All' | '0' | '1' | '2' | '3+';

interface BoardSummary {
  key: string;
  boardDefId?: string;
  boardName: string;
  biannual: TrgBiannualType;
  boardDate: string;
  minDate: string;
  maxDate: string;
  appeared: number;
  passed: number;
  failed: number;
  notAppeared: number;
  total: number;
}

export const TrgStatePage: React.FC<TrgStatePageProps> = ({
  onViewDossier,
}) => {
  const { personnelList, showNotification, isGuest, theme } = useApp();
  const isLight = theme === 'light';

  // Training state records & IPFT board definitions strictly from Supabase `trg_state`
  const [records, setRecords] = useState<TrgRecord[]>([]);
  const [boardDefs, setBoardDefs] = useState<IpftBoardDef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);

  const loadFromSupabase = useCallback(async () => {
    const res = await fetchTrgStateFromSupabase();
    if (res.success) {
      setRecords(res.records);
      setBoardDefs(res.boardDefs || []);
      setTableMissing(false);
    } else {
      setRecords([]);
      setBoardDefs([]);
      setTableMissing(Boolean(res.tableMissing));
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadFromSupabase();
    const interval = setInterval(loadFromSupabase, 15000);
    const onFocus = () => loadFromSupabase();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [loadFromSupabase]);

  // Selected training module (default to 'RET')
  const [selectedModule, setSelectedModule] = useState<TrgModuleType>('RET');
  const [btyFilter, setBtyFilter] = useState<Battery | 'All'>('All');
  const [gradeFilter, setGradeFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // IPFT-specific filters & left-side board selection
  const [ipftBiannualFilter, setIpftBiannualFilter] = useState<'All' | TrgBiannualType>('All');
  const [ipftBoardFilter, setIpftBoardFilter] = useState<string>('');
  const [ipftResultFilter, setIpftResultFilter] = useState<IpftResultFilter>('All');
  const [ipftAppearanceFilter, setIpftAppearanceFilter] = useState<IpftAppearanceFilter>('All');
  const [isMobileBoardDropdownOpen, setIsMobileBoardDropdownOpen] = useState(false);
  const mobileBoardDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        mobileBoardDropdownRef.current &&
        !mobileBoardDropdownRef.current.contains(e.target as Node)
      ) {
        setIsMobileBoardDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // New / Edit IPFT Board Modal
  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
  const [editingBoardDef, setEditingBoardDef] = useState<IpftBoardDef | null>(null);
  const [boardModalName, setBoardModalName] = useState('');
  const [boardModalDate, setBoardModalDate] = useState(new Date().toISOString().slice(0, 10));
  const [boardModalBiannual, setBoardModalBiannual] = useState<TrgBiannualType>(
    inferIpftBiannual({ date: new Date().toISOString().slice(0, 10) })
  );

  // Add / Edit Soldier Record Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [soldierModalSearch, setSoldierModalSearch] = useState('');
  const [selectedSoldierSnkNo, setSelectedSoldierSnkNo] = useState('');
  const [formModule, setFormModule] = useState<TrgModuleType>('RET');
  const [formBiannual, setFormBiannual] = useState<TrgBiannualType>('1st Biannual');
  const [formBoardName, setFormBoardName] = useState('');
  const [formIpftResult, setFormIpftResult] = useState<IpftResultType>('Passed');
  const [formGrade, setFormGrade] = useState('Qualified');
  const [formScore, setFormScore] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formLocation, setFormLocation] = useState('');
  const [formRemarks, setFormRemarks] = useState('');

  // Live lookup map for main personnel database
  const personnelMap = useMemo(() => {
    const map = new Map<string, Personnel>();
    (personnelList || []).forEach((p) => {
      if (p.id) map.set(p.id, p);
      if (p.snkNo) map.set(p.snkNo.trim().toLowerCase(), p);
    });
    return map;
  }, [personnelList]);

  // Helper to find soldier by Army / Snk No or ID
  const findPerson = useCallback(
    (snkNo: string, personnelId?: string): Personnel | undefined => {
      if (personnelId && personnelMap.has(personnelId)) {
        return personnelMap.get(personnelId);
      }
      if (!snkNo) return undefined;
      return personnelMap.get(snkNo.trim().toLowerCase());
    },
    [personnelMap]
  );

  const getSoldierKey = useCallback(
    (rec: { snkNo?: string; personnelId?: string; id?: string }): string => {
      const live = findPerson(rec.snkNo || '', rec.personnelId);
      if (live?.id) return `id:${live.id}`;
      if (rec.snkNo) return `snk:${rec.snkNo.trim().toLowerCase()}`;
      return `rec:${rec.id || ''}`;
    },
    [findPerson]
  );

  // Enrich every training record dynamically with live rank, name, battery, snkNo & IPFT metadata
  const syncedRecords = useMemo(() => {
    return records.map((r) => {
      const live = findPerson(r.snkNo, r.personnelId);
      const base = live
        ? {
            ...r,
            personnelId: live.id,
            snkNo: live.snkNo || r.snkNo,
            name: live.name || r.name,
            rk: live.rk || r.rk,
            battery: live.battery || r.battery,
          }
        : r;

      if (base.module === 'IPFT') {
        return {
          ...base,
          biannual: inferIpftBiannual(base),
          boardName: inferIpftBoardName(base),
        };
      }
      return base;
    });
  }, [records, findPerson]);

  // Module counts
  const moduleCounts = useMemo(() => {
    const counts: Record<TrgModuleType, number> = {
      RET: 0,
      IPFT: 0,
      'Gren Firing': 0,
      Firing: 0,
    };
    syncedRecords.forEach((r) => {
      if (counts[r.module] !== undefined) {
        counts[r.module]++;
      }
    });
    return counts;
  }, [syncedRecords]);

  // All IPFT records
  const ipftRecordsAll = useMemo(
    () => syncedRecords.filter((r) => r.module === 'IPFT'),
    [syncedRecords]
  );

  const ipftRecordsByBty = useMemo(
    () => (btyFilter === 'All' ? ipftRecordsAll : ipftRecordsAll.filter((r) => r.battery === btyFilter)),
    [ipftRecordsAll, btyFilter]
  );

  // Build unified Boards catalog (merging explicit `boardDefs` + any boards inferred from existing records)
  const allIpftBoards = useMemo<BoardSummary[]>(() => {
    const map = new Map<string, BoardSummary>();

    // Seed explicit board definitions first so newly created empty boards always appear
    boardDefs.forEach((def) => {
      const biannual = def.biannual || inferIpftBiannual({ date: def.date });
      const boardName = def.boardName.trim();
      const key = `${biannual}::${boardName}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          boardDefId: def.id,
          boardName,
          biannual,
          boardDate: def.date || '',
          minDate: def.date || '',
          maxDate: def.date || '',
          appeared: 0,
          passed: 0,
          failed: 0,
          notAppeared: 0,
          total: 0,
        });
      } else {
        const existing = map.get(key)!;
        if (!existing.boardDefId) existing.boardDefId = def.id;
        if (def.date && !existing.boardDate) existing.boardDate = def.date;
      }
    });

    // Fold record metrics (respecting battery filter for counts, while keeping defined boards visible)
    ipftRecordsAll.forEach((rec) => {
      const biannual = inferIpftBiannual(rec);
      const boardName = inferIpftBoardName(rec);
      const key = `${biannual}::${boardName}`;
      const recDate = rec.date || '';

      let entry = map.get(key);
      if (!entry) {
        entry = {
          key,
          boardName,
          biannual,
          boardDate: recDate,
          minDate: recDate,
          maxDate: recDate,
          appeared: 0,
          passed: 0,
          failed: 0,
          notAppeared: 0,
          total: 0,
        };
        map.set(key, entry);
      }

      if (recDate) {
        if (!entry.boardDate) entry.boardDate = recDate;
        if (!entry.minDate || recDate < entry.minDate) entry.minDate = recDate;
        if (!entry.maxDate || recDate > entry.maxDate) entry.maxDate = recDate;
      }

      if (btyFilter !== 'All' && rec.battery !== btyFilter) return;

      const resCat = getIpftResultCategory(rec);
      entry.total++;
      if (resCat === 'Passed') {
        entry.passed++;
        entry.appeared++;
      } else if (resCat === 'Failed') {
        entry.failed++;
        entry.appeared++;
      } else {
        entry.notAppeared++;
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const dA = a.boardDate || a.minDate || a.maxDate || '9999-12-31';
      const dB = b.boardDate || b.minDate || b.maxDate || '9999-12-31';
      const dateCmp = dA.localeCompare(dB);
      if (dateCmp !== 0) return dateCmp;
      return a.boardName.localeCompare(b.boardName);
    });
  }, [boardDefs, ipftRecordsAll, btyFilter]);

  // Biannual summary stats (1st Biannual & 2nd Biannual)
  const biannualStats = useMemo(() => {
    const createEmpty = () => ({
      appeared: 0,
      passed: 0,
      failed: 0,
      notAppeared: 0,
      total: 0,
      boardCount: 0,
    });

    const stats: Record<TrgBiannualType, ReturnType<typeof createEmpty>> = {
      '1st Biannual': createEmpty(),
      '2nd Biannual': createEmpty(),
    };

    allIpftBoards.forEach((b) => {
      stats[b.biannual].boardCount++;
      stats[b.biannual].appeared += b.appeared;
      stats[b.biannual].passed += b.passed;
      stats[b.biannual].failed += b.failed;
      stats[b.biannual].notAppeared += b.notAppeared;
      stats[b.biannual].total += b.total;
    });

    return stats;
  }, [allIpftBoards]);

  // Boards filtered by selected Biannual
  const ipftBoardsInBiannual = useMemo(() => {
    return ipftBiannualFilter === 'All'
      ? allIpftBoards
      : allIpftBoards.filter((b) => b.biannual === ipftBiannualFilter);
  }, [allIpftBoards, ipftBiannualFilter]);

  // Auto-select first chronological board when none or invalid is selected
  useEffect(() => {
    if (ipftBoardsInBiannual.length === 0) {
      if (ipftBoardFilter !== '') setIpftBoardFilter('');
      return;
    }
    const exists = ipftBoardsInBiannual.some((b) => b.key === ipftBoardFilter);
    if (!exists) {
      setIpftBoardFilter(ipftBoardsInBiannual[0].key);
    }
  }, [ipftBoardsInBiannual, ipftBoardFilter]);

  const activeBoardObj = useMemo(() => {
    if (ipftBoardsInBiannual.length === 0) return null;
    return ipftBoardsInBiannual.find((b) => b.key === ipftBoardFilter) || ipftBoardsInBiannual[0] || null;
  }, [ipftBoardsInBiannual, ipftBoardFilter]);

  // Right-panel summary numbers for the clicked board
  const activeBoardStats = useMemo(() => {
    if (!activeBoardObj) {
      return { appeared: 0, passed: 0, failed: 0, notAppeared: 0, total: 0 };
    }
    return {
      appeared: activeBoardObj.appeared,
      passed: activeBoardObj.passed,
      failed: activeBoardObj.failed,
      notAppeared: activeBoardObj.notAppeared,
      total: activeBoardObj.total,
    };
  }, [activeBoardObj]);

  // Appearance Count per soldier (only counts Appeared = Passed + Failed; Not Appeared = 0)
  const ipftAppearanceCountMap = useMemo(() => {
    const map = new Map<string, number>();
    const scopeRecords =
      ipftBiannualFilter === 'All'
        ? ipftRecordsAll
        : ipftRecordsAll.filter((r) => inferIpftBiannual(r) === ipftBiannualFilter);

    scopeRecords.forEach((rec) => {
      const key = getSoldierKey(rec);
      const resCat = getIpftResultCategory(rec);
      if (resCat !== 'Not Appeared') {
        map.set(key, (map.get(key) || 0) + 1);
      } else if (!map.has(key)) {
        map.set(key, 0);
      }
    });
    return map;
  }, [ipftRecordsAll, ipftBiannualFilter, getSoldierKey]);

  // Personnel with 0 appearances (respecting btyFilter & searchQuery)
  const zeroAppearancePersonnel = useMemo(() => {
    const scopedPersonnel =
      btyFilter === 'All'
        ? personnelList
        : personnelList.filter((p) => p.battery === btyFilter);

    const zeroList = scopedPersonnel.filter((p) => {
      const key = p.id ? `id:${p.id}` : `snk:${(p.snkNo || '').trim().toLowerCase()}`;
      return (ipftAppearanceCountMap.get(key) || 0) === 0;
    });

    if (!searchQuery.trim()) return zeroList;
    const q = searchQuery.toLowerCase().trim();
    return zeroList.filter(
      (p) =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.snkNo || '').toLowerCase().includes(q) ||
        (p.rk || '').toLowerCase().includes(q) ||
        (p.battery || '').toLowerCase().includes(q)
    );
  }, [personnelList, btyFilter, ipftAppearanceCountMap, searchQuery]);

  // Appearance distribution counts for IPFT filter pills
  const appearanceFilterCounts = useMemo(() => {
    const baseScoped = ipftRecordsByBty.filter((r) => {
      if (ipftBiannualFilter !== 'All' && inferIpftBiannual(r) !== ipftBiannualFilter) return false;
      if (activeBoardObj && `${inferIpftBiannual(r)}::${inferIpftBoardName(r)}` !== activeBoardObj.key) return false;
      if (!activeBoardObj) return false;
      return true;
    });

    let c1 = 0;
    let c2 = 0;
    let c3Plus = 0;
    baseScoped.forEach((r) => {
      const cnt = ipftAppearanceCountMap.get(getSoldierKey(r)) || 0;
      if (cnt === 1) c1++;
      else if (cnt === 2) c2++;
      else if (cnt >= 3) c3Plus++;
    });

    return {
      zero: zeroAppearancePersonnel.length,
      one: c1,
      two: c2,
      threePlus: c3Plus,
    };
  }, [
    ipftRecordsByBty,
    ipftBiannualFilter,
    activeBoardObj,
    ipftAppearanceCountMap,
    getSoldierKey,
    zeroAppearancePersonnel.length,
  ]);

  // Filtered Records for Selected Module
  const filteredRecords = useMemo(() => {
    let result = syncedRecords.filter((r) => r.module === selectedModule);

    if (btyFilter !== 'All') {
      result = result.filter((r) => r.battery === btyFilter);
    }

    if (selectedModule === 'IPFT') {
      if (ipftBiannualFilter !== 'All') {
        result = result.filter((r) => inferIpftBiannual(r) === ipftBiannualFilter);
      }

      if (activeBoardObj) {
        result = result.filter(
          (r) => `${inferIpftBiannual(r)}::${inferIpftBoardName(r)}` === activeBoardObj.key
        );
      } else {
        result = [];
      }

      if (ipftResultFilter !== 'All') {
        if (ipftResultFilter === 'Appeared') {
          result = result.filter((r) => getIpftResultCategory(r) !== 'Not Appeared');
        } else {
          result = result.filter((r) => getIpftResultCategory(r) === ipftResultFilter);
        }
      }

      if (ipftAppearanceFilter !== 'All') {
        result = result.filter((r) => {
          const cnt = ipftAppearanceCountMap.get(getSoldierKey(r)) || 0;
          if (ipftAppearanceFilter === '0') return cnt === 0;
          if (ipftAppearanceFilter === '1') return cnt === 1;
          if (ipftAppearanceFilter === '2') return cnt === 2;
          if (ipftAppearanceFilter === '3+') return cnt >= 3;
          return true;
        });
      }
    } else if (gradeFilter !== 'All') {
      if (gradeFilter === 'Distinction') {
        result = result.filter(
          (r) =>
            r.status === 'Distinction' ||
            r.grade.toLowerCase().includes('distinction') ||
            r.grade.toLowerCase().includes('marksman') ||
            r.grade.toLowerCase().includes('1st class')
        );
      } else if (gradeFilter === 'Qualified') {
        result = result.filter(
          (r) => r.status === 'Qualified' || r.status === 'Distinction' || r.status === 'Passed'
        );
      } else if (gradeFilter === 'Passed') {
        result = result.filter((r) => r.status === 'Passed');
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.snkNo.toLowerCase().includes(q) ||
          r.rk.toLowerCase().includes(q) ||
          r.grade.toLowerCase().includes(q) ||
          r.scoreDetails.toLowerCase().includes(q) ||
          (r.boardName || '').toLowerCase().includes(q) ||
          (r.biannual || '').toLowerCase().includes(q) ||
          (r.remarks || '').toLowerCase().includes(q) ||
          r.battery.toLowerCase().includes(q)
      );
    }

    return result;
  }, [
    syncedRecords,
    selectedModule,
    btyFilter,
    gradeFilter,
    searchQuery,
    ipftBiannualFilter,
    activeBoardObj,
    ipftResultFilter,
    ipftAppearanceFilter,
    ipftAppearanceCountMap,
    getSoldierKey,
  ]);

  // Filtered soldiers for the Soldier Add Modal search
  const modalFilteredPersonnel = useMemo(() => {
    if (!soldierModalSearch.trim()) return personnelList;
    const q = soldierModalSearch.toLowerCase().trim();
    return personnelList.filter(
      (p) =>
        (p.snkNo || '').toLowerCase().includes(q) ||
        (p.name || '').toLowerCase().includes(q) ||
        (p.rk || '').toLowerCase().includes(q) ||
        (p.battery || '').toLowerCase().includes(q)
    );
  }, [personnelList, soldierModalSearch]);

  const hasActiveIpftFilters =
    ipftResultFilter !== 'All' ||
    ipftAppearanceFilter !== 'All' ||
    btyFilter !== 'All' ||
    searchQuery.trim() !== '';

  const resetIpftFilters = () => {
    setIpftResultFilter('All');
    setIpftAppearanceFilter('All');
    setBtyFilter('All');
    setSearchQuery('');
  };

  // ==================== NEW / EDIT BOARD HANDLERS ====================
  const handleOpenNewBoardModal = () => {
    const today = new Date().toISOString().slice(0, 10);
    setEditingBoardDef(null);
    setBoardModalName('');
    setBoardModalDate(today);
    setBoardModalBiannual(
      ipftBiannualFilter !== 'All' ? ipftBiannualFilter : inferIpftBiannual({ date: today })
    );
    setIsBoardModalOpen(true);
  };

  const handleOpenEditBoardModal = (board: BoardSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    const def: IpftBoardDef = {
      id: board.boardDefId || `ipft-board-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      boardName: board.boardName,
      date: board.boardDate || board.maxDate || new Date().toISOString().slice(0, 10),
      biannual: board.biannual,
    };
    setEditingBoardDef(def);
    setBoardModalName(def.boardName);
    setBoardModalDate(def.date);
    setBoardModalBiannual(def.biannual);
    setIsBoardModalOpen(true);
  };

  const handleSaveBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) {
      showNotification('গেস্ট মোডে নতুন বোর্ড যোগ করা অনুমোদিত নয়।');
      return;
    }

    const cleanName = boardModalName.trim();
    if (!cleanName) {
      showNotification('বোর্ডের নাম লিখুন!');
      return;
    }

    const boardToSave: IpftBoardDef = {
      id:
        editingBoardDef?.id ||
        `ipft-board-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      boardName: cleanName,
      date: boardModalDate,
      biannual: boardModalBiannual,
    };

    setIsSaving(true);
    try {
      const res = await upsertIpftBoardToSupabase(boardToSave);
      if (!res.success) {
        if (res.tableMissing) setTableMissing(true);
        showNotification(`বোর্ড সংরক্ষণ ব্যর্থ: ${res.error || 'Supabase error'}`);
        return;
      }

      // If renaming an existing board that already has records, update those records' boardName/biannual too
      if (
        editingBoardDef &&
        (editingBoardDef.boardName !== cleanName ||
          editingBoardDef.biannual !== boardModalBiannual)
      ) {
        const affected = ipftRecordsAll.filter(
          (r) =>
            inferIpftBiannual(r) === editingBoardDef.biannual &&
            inferIpftBoardName(r) === editingBoardDef.boardName
        );
        for (const rec of affected) {
          await upsertTrgStateToSupabase({
            ...rec,
            biannual: boardModalBiannual,
            boardName: cleanName,
          });
        }
        setRecords((prev) =>
          prev.map((r) =>
            r.module === 'IPFT' &&
            inferIpftBiannual(r) === editingBoardDef.biannual &&
            inferIpftBoardName(r) === editingBoardDef.boardName
              ? { ...r, biannual: boardModalBiannual, boardName: cleanName }
              : r
          )
        );
      }

      setBoardDefs((prev) => {
        const exists = prev.some((b) => b.id === boardToSave.id);
        if (exists) {
          return prev.map((b) => (b.id === boardToSave.id ? boardToSave : b));
        }
        return [boardToSave, ...prev];
      });

      const newKey = `${boardToSave.biannual}::${boardToSave.boardName}`;
      setIpftBiannualFilter(boardToSave.biannual);
      setIpftBoardFilter(newKey);
      setIpftResultFilter('All');
      setIpftAppearanceFilter('All');
      setIsBoardModalOpen(false);
      setEditingBoardDef(null);
      showNotification(`বোর্ড "${boardToSave.boardName}" (${boardToSave.date}) যুক্ত করা হয়েছে।`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEmptyBoard = async (board: BoardSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isGuest) {
      showNotification('গেস্ট মোডে ডিলিট অনুমোদিত নয়।');
      return;
    }
    if (board.total > 0) {
      showNotification('এই বোর্ডে সৈনিকের রেকর্ড রয়েছে; আগে রেকর্ডগুলো মুছুন।');
      return;
    }
    if (!board.boardDefId) return;

    const res = await deleteTrgStateFromSupabase(board.boardDefId);
    if (!res.success) {
      showNotification(`বোর্ড ডিলিট ব্যর্থ: ${res.error || 'Supabase error'}`);
      return;
    }
    setBoardDefs((prev) => prev.filter((b) => b.id !== board.boardDefId));
    if (ipftBoardFilter === board.key) {
      setIpftBoardFilter('');
    }
    showNotification(`বোর্ড "${board.boardName}" মুছে ফেলা হয়েছে।`);
  };

  // ==================== SOLDIER RECORD ADD / EDIT HANDLERS ====================
  const handleOpenAddModal = (
    defaultMod?: TrgModuleType,
    prefill?: {
      snkNo?: string;
      biannual?: TrgBiannualType;
      boardName?: string;
      boardDate?: string;
      result?: IpftResultType;
    }
  ) => {
    const mod = defaultMod || selectedModule;
    const defaultDate =
      prefill?.boardDate ||
      activeBoardObj?.boardDate ||
      activeBoardObj?.maxDate ||
      new Date().toISOString().slice(0, 10);
    const activeBiannual: TrgBiannualType =
      prefill?.biannual ||
      activeBoardObj?.biannual ||
      (ipftBiannualFilter !== 'All' ? ipftBiannualFilter : inferIpftBiannual({ date: defaultDate }));
    const activeBoard =
      prefill?.boardName ??
      activeBoardObj?.boardName ??
      inferIpftBoardName({ date: defaultDate });

    setEditingRecordId(null);
    setSoldierModalSearch('');
    setFormModule(mod);
    setFormBiannual(activeBiannual);
    setFormBoardName(activeBoard);
    setFormIpftResult(prefill?.result || 'Passed');
    setFormLocation(TRG_MODULE_CONFIGS[mod]?.defaultLocation || '10 Med Trg Ground');
    setFormScore(
      prefill?.result === 'Not Appeared' ? '' : TRG_MODULE_CONFIGS[mod]?.sampleScores || ''
    );
    setFormGrade(
      prefill?.result === 'Not Appeared'
        ? 'Not Appeared'
        : prefill?.result === 'Failed'
        ? 'Failed'
        : mod === 'IPFT'
        ? '1st Class'
        : mod === 'Firing'
        ? 'Marksman Shot'
        : mod === 'Gren Firing'
        ? 'Qualified (Live Fired)'
        : 'Qualified (Grade A)'
    );
    setSelectedSoldierSnkNo(prefill?.snkNo || personnelList[0]?.snkNo || '');
    setFormDate(defaultDate);
    setFormRemarks('');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (rec: TrgRecord) => {
    setEditingRecordId(rec.id);
    setSoldierModalSearch('');
    setFormModule(rec.module);
    setSelectedSoldierSnkNo(rec.snkNo);
    setFormBiannual(rec.module === 'IPFT' ? inferIpftBiannual(rec) : '1st Biannual');
    setFormBoardName(rec.module === 'IPFT' ? inferIpftBoardName(rec) : '');
    setFormIpftResult(rec.module === 'IPFT' ? getIpftResultCategory(rec) : 'Passed');
    setFormGrade(rec.grade || '');
    setFormScore(rec.scoreDetails || '');
    setFormDate(rec.date || new Date().toISOString().slice(0, 10));
    setFormLocation(rec.location || '');
    setFormRemarks(rec.remarks || '');
    setIsAddModalOpen(true);
  };

  const handleIpftResultSelect = (resType: IpftResultType) => {
    setFormIpftResult(resType);
    if (resType === 'Passed') {
      if (
        !formGrade ||
        formGrade.toLowerCase().includes('fail') ||
        formGrade.toLowerCase().includes('not appeared')
      ) {
        setFormGrade('1st Class');
      }
      if (!formScore) {
        setFormScore(TRG_MODULE_CONFIGS.IPFT.sampleScores);
      }
    } else if (resType === 'Failed') {
      if (
        !formGrade ||
        formGrade === '1st Class' ||
        formGrade === '2nd Class' ||
        formGrade.toLowerCase().includes('not appeared')
      ) {
        setFormGrade('Failed');
      }
    } else {
      setFormGrade('Not Appeared');
      if (formScore === TRG_MODULE_CONFIGS.IPFT.sampleScores) {
        setFormScore('');
      }
    }
  };

  const saveCurrentRecord = async (keepModalOpenForNext: boolean) => {
    if (isGuest) {
      showNotification('গেস্ট মোডে কোনো পরিবর্তন সংরক্ষণ করা সম্ভব নয়।');
      return;
    }

    const soldier = personnelList.find(
      (p) => (p.snkNo || '').trim().toLowerCase() === selectedSoldierSnkNo.trim().toLowerCase()
    );

    if (!soldier) {
      showNotification('অনুগ্রহ করে একজন সঠিক সৈনিক নির্বাচন করুন!');
      return;
    }

    let computedStatus: TrgRecord['status'];
    if (formModule === 'IPFT') {
      if (formIpftResult === 'Not Appeared') {
        computedStatus = 'Not Appeared';
      } else if (formIpftResult === 'Failed') {
        computedStatus = 'Failed';
      } else {
        const isDistinction =
          formGrade.toLowerCase().includes('1st class') ||
          formGrade.toLowerCase().includes('distinction');
        computedStatus = isDistinction ? 'Distinction' : 'Passed';
      }
    } else {
      const isDistinction =
        formGrade.includes('1st Class') ||
        formGrade.includes('Marksman') ||
        formGrade.includes('Distinction');
      computedStatus = isDistinction ? 'Distinction' : 'Qualified';
    }

    const cleanBoardName =
      formModule === 'IPFT'
        ? formBoardName.trim() || inferIpftBoardName({ date: formDate })
        : undefined;

    const recordToSave: TrgRecord = {
      id: editingRecordId || `trg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      personnelId: soldier.id,
      module: formModule,
      snkNo: soldier.snkNo,
      name: soldier.name,
      rk: soldier.rk,
      battery: soldier.battery,
      grade:
        formGrade.trim() ||
        (formModule === 'IPFT' ? formIpftResult : 'Qualified'),
      scoreDetails:
        formScore.trim() ||
        (formModule === 'IPFT' && formIpftResult === 'Not Appeared'
          ? 'Not Appeared in Board'
          : 'Standard Completed'),
      date: formDate,
      location: formLocation || '10 Med Trg Ground',
      status: computedStatus,
      remarks: formRemarks.trim(),
      biannual: formModule === 'IPFT' ? formBiannual : undefined,
      boardName: cleanBoardName,
    };

    setIsSaving(true);
    try {
      const res = await upsertTrgStateToSupabase(recordToSave);
      if (!res.success) {
        if (res.tableMissing) setTableMissing(true);
        showNotification(`Supabase সংরক্ষণ ব্যর্থ: ${res.error || 'trg_state টেবিল তৈরি করুন'}`);
        return;
      }

      setRecords((prev) => {
        if (editingRecordId) {
          return prev.map((r) => (r.id === editingRecordId ? recordToSave : r));
        }
        return [recordToSave, ...prev];
      });

      if (formModule === 'IPFT' && cleanBoardName) {
        setIpftBoardFilter(`${formBiannual}::${cleanBoardName}`);
      }

      showNotification(
        editingRecordId
          ? `${soldier.name}-এর ${formModule} রেকর্ড আপডেট করা হয়েছে।`
          : `${soldier.name}-এর ${formModule} ফলাফল সংরক্ষণ করা হয়েছে।`
      );

      if (keepModalOpenForNext && !editingRecordId) {
        setSoldierModalSearch('');
        setFormRemarks('');
      } else {
        setIsAddModalOpen(false);
        setEditingRecordId(null);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveCurrentRecord(false);
  };

  // Delete Record from Supabase `trg_state`
  const handleDeleteRecord = async (id: string, name: string) => {
    if (isGuest) {
      showNotification('গেস্ট মোডে ডিলিট অনুমোদিত নয়।');
      return;
    }
    const res = await deleteTrgStateFromSupabase(id);
    if (!res.success) {
      showNotification(`ডিলিট ব্যর্থ: ${res.error || 'Supabase error'}`);
      return;
    }
    setRecords((prev) => prev.filter((r) => r.id !== id));
    showNotification(`${name}-এর রেকর্ড Supabase থেকে মুছে ফেলা হয়েছে।`);
  };

  const modules: { id: TrgModuleType; label: string; full: string }[] = [
    { id: 'RET', label: 'RET', full: 'Ready Evaluation Test' },
    { id: 'IPFT', label: 'IPFT', full: 'Physical Fitness Test' },
    { id: 'Gren Firing', label: 'Gren Firing', full: 'Grenade Firing' },
    { id: 'Firing', label: 'Firing', full: 'Annual Weapon Firing' },
  ];

  // Shared records table renderer (used both in IPFT right panel and non-IPFT full view)
  const renderRecordsTable = () => {
    if (isLoading) {
      return (
        <div className={`py-12 text-center text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
          Supabase থেকে প্রশিক্ষণ রেকর্ড লোড হচ্ছে...
        </div>
      );
    }

    if (selectedModule === 'IPFT' && ipftAppearanceFilter === '0') {
      if (zeroAppearancePersonnel.length === 0) {
        return (
          <div className={`py-12 text-center text-xs space-y-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            <p className="font-medium">০ বার উপস্থিত সৈনিক পাওয়া যায়নি (সকলেই কমপক্ষে ১ বার IPFT-তে অংশগ্রহণ করেছেন)।</p>
          </div>
        );
      }

      return (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b text-[11px] uppercase tracking-wider font-mono ${
                isLight
                  ? 'border-slate-200 bg-slate-100/90 text-slate-700'
                  : 'border-slate-800 bg-slate-950/70 text-slate-400'
              }`}>
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3">সেনা নং</th>
                <th className="py-2.5 px-3">পদবি ও নাম</th>
                <th className="py-2.5 px-3">ব্যাটারী</th>
                <th className="py-2.5 px-3">অবস্থা</th>
                <th className="py-2.5 px-3">উপস্থিতি</th>
                <th className="py-2.5 px-3 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${
              isLight ? 'divide-slate-200 text-slate-800' : 'divide-slate-800/60 text-slate-200'
            }`}>
              {zeroAppearancePersonnel.map((person, idx) => {
                const notAppearedRec = ipftRecordsByBty.find((r) => {
                  const matchesBiannual =
                    ipftBiannualFilter === 'All' || inferIpftBiannual(r) === ipftBiannualFilter;
                  const sameSoldier =
                    (r.personnelId && r.personnelId === person.id) ||
                    (r.snkNo || '').trim().toLowerCase() === (person.snkNo || '').trim().toLowerCase();
                  return matchesBiannual && sameSoldier && getIpftResultCategory(r) === 'Not Appeared';
                });

                return (
                  <tr
                    key={person.id || idx}
                    className={`transition-colors ${
                      isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <td className={`py-2.5 px-3 text-center font-mono text-[11px] ${
                      isLight ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      {idx + 1}
                    </td>
                    <td className={`py-2.5 px-3 font-mono font-bold ${
                      isLight ? 'text-emerald-700' : 'text-emerald-400'
                    }`}>
                      {person.snkNo}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <RankBadge rank={person.rk} size="sm" />
                        <button
                          type="button"
                          onClick={() => onViewDossier(person)}
                          className={`font-medium hover:text-emerald-500 hover:underline cursor-pointer text-left transition-colors ${
                            isLight ? 'text-slate-900' : 'text-white'
                          }`}
                        >
                          {person.name}
                        </button>
                      </div>
                    </td>
                    <td className={`py-2.5 px-3 font-mono ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      {person.battery}
                    </td>
                    <td className="py-2.5 px-3">
                      {notAppearedRec ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <Clock className="w-3 h-3" />
                          <span>Not Appeared ({inferIpftBoardName(notAppearedRec)})</span>
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
                          isLight
                            ? 'bg-slate-100 text-slate-600 border-slate-200'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          বোর্ডে অংশগ্রহণ করেনি
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`font-mono text-[11px] font-semibold px-2 py-0.5 rounded border ${
                        isLight
                          ? 'bg-slate-100 text-slate-700 border-slate-200'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        0 বার
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {!isGuest && (
                        <button
                          type="button"
                          onClick={() =>
                            handleOpenAddModal('IPFT', {
                              snkNo: person.snkNo,
                              biannual:
                                activeBoardObj?.biannual ||
                                (ipftBiannualFilter !== 'All' ? ipftBiannualFilter : undefined),
                              boardName: activeBoardObj?.boardName,
                              boardDate: activeBoardObj?.boardDate,
                            })
                          }
                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>এন্ট্রি দিন</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    if (filteredRecords.length === 0) {
      return (
        <div className={`py-12 px-4 text-center text-xs space-y-2.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
          <p className="font-medium">
            {selectedModule === 'IPFT' && activeBoardObj
              ? `"${activeBoardObj.boardName}" বোর্ডে এখনো কোনো সৈনিকের ফলাফল এন্ট্রি করা হয়নি।`
              : 'কোনো প্রশিক্ষণ রেকর্ড পাওয়া যায়নি।'}
          </p>
          {!isGuest && (
            <button
              type="button"
              onClick={() => handleOpenAddModal(selectedModule)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>
                {selectedModule === 'IPFT' && activeBoardObj
                  ? 'এই বোর্ডে প্রথম এন্ট্রি যোগ করুন'
                  : 'নতুন রেকর্ড যোগ করুন'}
              </span>
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className={`border-b text-[11px] uppercase tracking-wider font-mono ${
              isLight
                ? 'border-slate-200 bg-slate-100/90 text-slate-700'
                : 'border-slate-800 bg-slate-950/70 text-slate-400'
            }`}>
              <th className="py-2.5 px-3 w-10 text-center">#</th>
              <th className="py-2.5 px-3">সেনা নং</th>
              <th className="py-2.5 px-3">পদবি ও নাম</th>
              <th className="py-2.5 px-3">ব্যাটারী</th>
              {selectedModule === 'IPFT' && !activeBoardObj && (
                <th className="py-2.5 px-3">বাই-অ্যানুয়াল ও বোর্ড</th>
              )}
              <th className="py-2.5 px-3">ফলাফল / গ্রেড</th>
              {selectedModule === 'IPFT' && (
                <th className="py-2.5 px-3 text-center">উপস্থিতি</th>
              )}
              {selectedModule !== 'IPFT' && (
                <>
                  <th className="py-2.5 px-3">স্কোর ও বিবরণ</th>
                  <th className="py-2.5 px-3">তারিখ ও স্থান</th>
                </>
              )}
              <th className="py-2.5 px-3 text-right">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${
            isLight
              ? 'divide-slate-200 text-slate-800'
              : 'divide-slate-800/60 text-slate-200'
          }`}>
            {filteredRecords.map((item, idx) => {
              const person = findPerson(item.snkNo, item.personnelId) || {
                id: item.id,
                snkNo: item.snkNo,
                rk: item.rk,
                trade: '-',
                name: item.name,
                battery: item.battery,
                status: 'In Unit',
                phone: '',
              };

              const ipftResCat =
                item.module === 'IPFT' ? getIpftResultCategory(item) : null;
              const appearanceCount =
                item.module === 'IPFT'
                  ? ipftAppearanceCountMap.get(getSoldierKey(item)) || 0
                  : 0;

              const isDistinction =
                ipftResCat !== 'Failed' &&
                ipftResCat !== 'Not Appeared' &&
                (item.status === 'Distinction' ||
                  item.grade.includes('Marksman') ||
                  item.grade.includes('1st Class') ||
                  item.grade.includes('Distinction'));

              return (
                <tr
                  key={item.id || idx}
                  className={`transition-colors ${
                    isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'
                  }`}
                >
                  <td className={`py-2.5 px-3 text-center font-mono text-[11px] ${
                    isLight ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    {idx + 1}
                  </td>
                  <td className={`py-2.5 px-3 font-mono font-bold ${
                    isLight ? 'text-emerald-700' : 'text-emerald-400'
                  }`}>
                    {item.snkNo}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <RankBadge rank={item.rk} size="sm" />
                      <button
                        type="button"
                        onClick={() => onViewDossier(person)}
                        className={`font-medium hover:text-emerald-500 hover:underline cursor-pointer text-left transition-colors ${
                          isLight ? 'text-slate-900' : 'text-white'
                        }`}
                        title="ক্লিক করে ডসিয়ার দেখুন"
                      >
                        {item.name}
                      </button>
                    </div>
                  </td>
                  <td className={`py-2.5 px-3 font-mono ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    {item.battery}
                  </td>

                  {selectedModule === 'IPFT' && !activeBoardObj && (
                    <td className="py-2.5 px-3">
                      <div className="flex flex-col gap-0.5">
                        <span className={`text-[10px] font-mono font-semibold ${
                          isLight ? 'text-cyan-700' : 'text-cyan-400'
                        }`}>
                          {inferIpftBiannual(item)}
                        </span>
                        <span className={`text-[11px] font-medium ${
                          isLight ? 'text-slate-700' : 'text-slate-200'
                        }`}>
                          {inferIpftBoardName(item)}
                        </span>
                      </div>
                    </td>
                  )}

                  <td className="py-2.5 px-3">
                    {ipftResCat === 'Failed' ? (
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold border ${
                        isLight
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      }`}>
                        <XCircle className="w-3 h-3 text-rose-500" />
                        <span>{item.grade || 'Failed'}</span>
                      </span>
                    ) : ipftResCat === 'Not Appeared' ? (
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold border ${
                        isLight
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      }`}>
                        <Clock className="w-3 h-3 text-amber-500" />
                        <span>{item.grade || 'Not Appeared'}</span>
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold ${
                          isDistinction
                            ? isLight
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : isLight
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {isDistinction ? (
                          <Award className="w-3 h-3 text-amber-500" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        )}
                        <span>{item.grade}</span>
                      </span>
                    )}
                  </td>

                  {selectedModule === 'IPFT' && (
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block font-mono text-[11px] font-bold px-2 py-0.5 rounded border ${
                          appearanceCount >= 2
                            ? isLight
                              ? 'bg-cyan-50 text-cyan-800 border-cyan-300'
                              : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                            : appearanceCount === 1
                            ? isLight
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                            : isLight
                            ? 'bg-slate-100 text-slate-600 border-slate-200'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                        title={`${ipftBiannualFilter === 'All' ? 'সকল IPFT' : ipftBiannualFilter}-এ মোট ${appearanceCount} বার উপস্থিত হয়েছেন`}
                      >
                        {appearanceCount} বার
                      </span>
                    </td>
                  )}

                  {selectedModule !== 'IPFT' && (
                    <>
                      <td className={`py-2.5 px-3 font-mono text-[11px] ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                        <span title={item.scoreDetails}>{item.scoreDetails}</span>
                      </td>
                      <td className={`py-2.5 px-3 text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        <div className={`flex items-center gap-1 font-mono ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                          <Calendar className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span>{item.date}</span>
                        </div>
                        {item.location && (
                          <div className={`flex items-center gap-1 text-[10px] truncate max-w-[180px] ${
                            isLight ? 'text-slate-500' : 'text-slate-400'
                          }`}>
                            <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                            <span className="truncate">{item.location}</span>
                          </div>
                        )}
                      </td>
                    </>
                  )}
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {!isGuest ? (
                        <>
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className={`p-1.5 rounded transition-colors cursor-pointer ${
                              isLight
                                ? 'hover:bg-emerald-100 text-slate-400 hover:text-emerald-700'
                                : 'hover:bg-emerald-500/20 text-slate-500 hover:text-emerald-400'
                            }`}
                            title="এডিট করুন"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(item.id, item.name)}
                            className={`p-1.5 rounded transition-colors cursor-pointer ${
                              isLight
                                ? 'hover:bg-rose-100 text-slate-400 hover:text-rose-600'
                                : 'hover:bg-rose-500/20 text-slate-500 hover:text-rose-400'
                            }`}
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <span className={`text-xs ${isLight ? 'text-slate-400' : 'text-slate-600'}`}>—</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-12 animate-fadeIn">
      {/* 1. Header Bar: Minimal, Direct & Clean */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border p-4 rounded-xl shadow-sm ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h1 className={`text-lg font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Training State (প্রশিক্ষণ স্টেটাস)
            </h1>
            <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              10 Medium Regiment Artillery — RET, IPFT, Grenade &amp; Annual Firing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={loadFromSupabase}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Supabase থেকে রিফ্রেশ করুন"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">রিফ্রেশ</span>
          </button>
          {selectedModule === 'IPFT' && !isGuest && (
            <button
              type="button"
              onClick={handleOpenNewBoardModal}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                isLight
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
                  : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>নতুন বোর্ড</span>
            </button>
          )}
          <button
            onClick={() => handleOpenAddModal(selectedModule)}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{selectedModule === 'IPFT' ? 'নতুন এন্ট্রি' : 'নতুন রেকর্ড'}</span>
          </button>
          <button
            onClick={() => window.print()}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="প্রিন্ট করুন"
          >
            <Printer className={`w-3.5 h-3.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`} />
            <span>প্রিন্ট</span>
          </button>
        </div>
      </div>

      {tableMissing && (
        <div className={`p-3 rounded-xl border text-xs ${
          isLight ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
        }`}>
          Supabase `trg_state` ডাটাবেজ সংযোগে সমস্যা রয়েছে। অনুগ্রহ করে রিফ্রেশ করুন।
        </div>
      )}

      {/* 2. Four Clean Module Selector Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {modules.map((m) => {
          const isSelected = selectedModule === m.id;
          return (
            <button
              key={m.id}
              onClick={() => {
                setSelectedModule(m.id);
                setSearchQuery('');
              }}
              className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? isLight
                    ? 'bg-emerald-50/80 border-emerald-500 shadow-sm ring-1 ring-emerald-500/30'
                    : 'bg-slate-800/90 border-emerald-500/80 shadow-sm ring-1 ring-emerald-500/30'
                  : isLight
                  ? 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${
                    isSelected
                      ? isLight ? 'text-emerald-700' : 'text-emerald-400'
                      : isLight ? 'text-slate-700' : 'text-slate-300'
                  }`}
                >
                  {m.label}
                </span>
                <span className={`font-mono tabular-nums text-xs font-semibold px-2 py-0.5 rounded border ${
                  isLight
                    ? 'bg-slate-100 text-slate-700 border-slate-200'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  {moduleCounts[m.id]}
                </span>
              </div>
              <p className={`text-[11px] mt-1 truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{m.full}</p>
            </button>
          );
        })}
      </div>

      {/* ==================== IPFT DEDICATED TWO-PANEL WORKSPACE ==================== */}
      {selectedModule === 'IPFT' ? (
        <div className="space-y-4">
          {/* 2A. 1st Biannual & 2nd Biannual Overall Categories */}
          <div className={`border rounded-xl p-3.5 space-y-3 ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-500" />
                <h2 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                  IPFT বাই-অ্যানুয়াল ক্যাটাগরি (1st &amp; 2nd Biannual)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIpftBiannualFilter('All');
                  setIpftBoardFilter('');
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                  ipftBiannualFilter === 'All'
                    ? 'bg-emerald-600 text-white border-emerald-500 font-semibold'
                    : isLight
                    ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                সকল বাই-অ্যানুয়াল (All)
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(
                [
                  {
                    id: '1st Biannual' as TrgBiannualType,
                    subtitle: 'Jan – Jun (১ম বাই-অ্যানুয়াল)',
                  },
                  {
                    id: '2nd Biannual' as TrgBiannualType,
                    subtitle: 'Jul – Dec (২য় বাই-অ্যানুয়াল)',
                  },
                ]
              ).map((cat) => {
                const st = biannualStats[cat.id];
                const isActiveBiannual = ipftBiannualFilter === cat.id;

                return (
                  <div
                    key={cat.id}
                    onClick={() => {
                      setIpftBiannualFilter(isActiveBiannual ? 'All' : cat.id);
                      setIpftBoardFilter('');
                    }}
                    className={`rounded-xl border p-3.5 transition-all cursor-pointer ${
                      isActiveBiannual
                        ? isLight
                          ? 'bg-emerald-50/70 border-emerald-500 ring-1 ring-emerald-500/30 shadow-sm'
                          : 'bg-emerald-950/25 border-emerald-500/70 ring-1 ring-emerald-500/30 shadow-sm'
                        : isLight
                        ? 'bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${
                            isActiveBiannual
                              ? isLight ? 'text-emerald-700' : 'text-emerald-400'
                              : isLight ? 'text-slate-900' : 'text-white'
                          }`}>
                            {cat.id}
                          </span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                            isLight
                              ? 'bg-white text-slate-600 border-slate-200'
                              : 'bg-slate-900 text-slate-300 border-slate-700'
                          }`}>
                            {st.boardCount} বোর্ড
                          </span>
                        </div>
                        <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          {cat.subtitle}
                        </p>
                      </div>
                      <span className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${
                        isLight ? 'bg-slate-200/70 text-slate-700' : 'bg-slate-800 text-slate-300'
                      }`}>
                        মোট: {st.total}
                      </span>
                    </div>

                    {/* Appeared / Passed / Failed / Not Appeared 4-box breakdown */}
                    <div className="grid grid-cols-4 gap-2">
                      {(
                        [
                          {
                            key: 'Appeared' as IpftResultFilter,
                            label: 'Appeared',
                            val: st.appeared,
                            activeCls: 'border-cyan-500 bg-cyan-500/20 text-cyan-400',
                            baseCls: isLight
                              ? 'bg-white border-slate-200 text-cyan-700 hover:border-cyan-400'
                              : 'bg-slate-900/90 border-slate-800 text-cyan-400 hover:border-cyan-500/40',
                          },
                          {
                            key: 'Passed' as IpftResultFilter,
                            label: 'Passed',
                            val: st.passed,
                            activeCls: 'border-emerald-500 bg-emerald-500/20 text-emerald-400',
                            baseCls: isLight
                              ? 'bg-white border-slate-200 text-emerald-700 hover:border-emerald-400'
                              : 'bg-slate-900/90 border-slate-800 text-emerald-400 hover:border-emerald-500/40',
                          },
                          {
                            key: 'Failed' as IpftResultFilter,
                            label: 'Failed',
                            val: st.failed,
                            activeCls: 'border-rose-500 bg-rose-500/20 text-rose-400',
                            baseCls: isLight
                              ? 'bg-white border-slate-200 text-rose-700 hover:border-rose-400'
                              : 'bg-slate-900/90 border-slate-800 text-rose-400 hover:border-rose-500/40',
                          },
                          {
                            key: 'Not Appeared' as IpftResultFilter,
                            label: 'Not Appeared',
                            val: st.notAppeared,
                            activeCls: 'border-amber-500 bg-amber-500/20 text-amber-400',
                            baseCls: isLight
                              ? 'bg-white border-slate-200 text-slate-600 hover:border-amber-400'
                              : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-amber-500/40',
                          },
                        ]
                      ).map((statBox) => {
                        const isBoxActive =
                          isActiveBiannual && ipftResultFilter === statBox.key;
                        return (
                          <button
                            key={statBox.key}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIpftBiannualFilter(cat.id);
                              setIpftBoardFilter('');
                              setIpftAppearanceFilter('All');
                              setIpftResultFilter(isBoxActive ? 'All' : statBox.key);
                            }}
                            className={`rounded-lg border p-2 text-left transition-all cursor-pointer ${
                              isBoxActive ? statBox.activeCls : statBox.baseCls
                            }`}
                          >
                            <div className="text-base font-bold font-mono tabular-nums leading-none">
                              {statBox.val}
                            </div>
                            <div className={`text-[10px] font-medium mt-1 truncate ${
                              isLight ? 'text-slate-500' : 'text-slate-400'
                            }`}>
                              {statBox.label}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2B. Mobile Board Dropdown Selector (< lg) */}
          <div className="lg:hidden space-y-2" ref={mobileBoardDropdownRef}>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsMobileBoardDropdownOpen((prev) => !prev)}
                  className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900 shadow-xs'
                      : 'bg-slate-900 border-slate-700 text-white'
                  }`}
                >
                  <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium truncate">
                      {activeBoardObj ? activeBoardObj.boardName : 'কোনো বোর্ড নেই'}
                    </span>
                    {activeBoardObj && (
                      <span className={`text-xs font-medium shrink-0 ${
                        isLight ? 'text-slate-500' : 'text-slate-400'
                      }`}>
                        {activeBoardObj.boardDate || activeBoardObj.maxDate || ''}
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      isMobileBoardDropdownOpen ? 'rotate-180 text-emerald-500' : 'text-slate-400'
                    }`}
                  />
                </button>

                {isMobileBoardDropdownOpen && (
                  <div
                    className={`absolute left-0 right-0 top-full mt-1.5 z-40 rounded-xl border shadow-xl max-h-72 overflow-y-auto p-1.5 space-y-1 ${
                      isLight
                        ? 'bg-white border-slate-300'
                        : 'bg-slate-900 border-slate-700'
                    }`}
                  >
                    {ipftBoardsInBiannual.length === 0 ? (
                      <div className={`px-3 py-3 text-center text-xs ${
                        isLight ? 'text-slate-500' : 'text-slate-400'
                      }`}>
                        কোনো বোর্ড পাওয়া যায়নি।
                      </div>
                    ) : (
                      ipftBoardsInBiannual.map((board) => {
                        const isSel = activeBoardObj?.key === board.key;
                        const displayDate = board.boardDate || board.maxDate || '';
                        return (
                          <button
                            key={board.key}
                            type="button"
                            onClick={() => {
                              setIpftBoardFilter(board.key);
                              setIsMobileBoardDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                              isSel
                                ? isLight
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-400'
                                  : 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/40'
                                : isLight
                                ? 'text-slate-700 hover:bg-slate-100'
                                : 'text-slate-200 hover:bg-slate-800'
                            }`}
                          >
                            <span className="truncate">{board.boardName}</span>
                            <span className={`shrink-0 ${
                              isSel
                                ? ''
                                : isLight ? 'text-slate-500' : 'text-slate-400'
                            }`}>
                              {displayDate}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {!isGuest && (
                <button
                  type="button"
                  onClick={handleOpenNewBoardModal}
                  className="px-3 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>নতুন বোর্ড</span>
                </button>
              )}
            </div>
          </div>

          {/* 2C. Desktop Two-Panel Layout (Left: Board List | Right: Appeared / Pass / Fail Roster + Entry) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* LEFT PANEL: IPFT Board List (Desktop) */}
            <div className={`hidden lg:flex lg:col-span-4 xl:col-span-3 flex-col border rounded-xl overflow-hidden shadow-sm ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}>
              <div className={`p-3 border-b flex items-center justify-between gap-2 ${
                isLight ? 'border-slate-200 bg-slate-50/70' : 'border-slate-800 bg-slate-950/60'
              }`}>
                <div className="flex items-center gap-2 min-w-0">
                  <ClipboardList className="w-4 h-4 text-emerald-500 shrink-0" />
                  <h3 className={`text-xs font-bold uppercase tracking-wider truncate ${
                    isLight ? 'text-slate-800' : 'text-slate-200'
                  }`}>
                    বোর্ড তালিকা ({ipftBoardsInBiannual.length})
                  </h3>
                </div>
                {!isGuest && (
                  <button
                    type="button"
                    onClick={handleOpenNewBoardModal}
                    className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold inline-flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>নতুন বোর্ড</span>
                  </button>
                )}
              </div>

              {/* Clean Chronological Board Items (Name + Date only, same font) */}
              <div className="p-2 space-y-1 max-h-[600px] overflow-y-auto">
                {ipftBoardsInBiannual.length === 0 ? (
                  <div className={`py-8 px-3 text-center text-xs ${
                    isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}>
                    কোনো বোর্ড পাওয়া যায়নি। &ldquo;+ নতুন বোর্ড&rdquo; এ ক্লিক করে তৈরি করুন।
                  </div>
                ) : (
                  ipftBoardsInBiannual.map((board) => {
                    const isSelected = activeBoardObj?.key === board.key;
                    const displayDate = board.boardDate || board.maxDate || '';

                    return (
                      <button
                        key={board.key}
                        type="button"
                        onClick={() => setIpftBoardFilter(board.key)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                          isSelected
                            ? isLight
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                              : 'bg-emerald-950/35 border-emerald-500/80 text-emerald-300'
                            : isLight
                            ? 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                            : 'bg-slate-950/60 border-slate-800 text-slate-200 hover:border-slate-700 hover:bg-slate-800/40'
                        }`}
                      >
                        <span className="truncate">{board.boardName}</span>
                        <span className={`shrink-0 ${
                          isSelected
                            ? isLight ? 'text-emerald-700' : 'text-emerald-300'
                            : isLight ? 'text-slate-500' : 'text-slate-400'
                        }`}>
                          {displayDate}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT PANEL: Selected Board Details + Appeared/Pass/Fail List + Entry */}
            <div className="lg:col-span-8 xl:col-span-9 space-y-3">
              {/* Selected Board Header & 4-Stat Summary */}
              <div className={`border rounded-xl p-3.5 space-y-3 ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {activeBoardObj ? activeBoardObj.boardName : 'কোনো বোর্ড নির্বাচিত নেই'}
                      </h2>
                    </div>
                    <p className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      {activeBoardObj
                        ? 'এই বোর্ডের Appeared, Passed, Failed ও Not Appeared তালিকা নিচে দেখানো হয়েছে।'
                        : 'বাম পাশ থেকে নতুন বোর্ড তৈরি করুন।'}
                    </p>
                  </div>

                  {!isGuest && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {activeBoardObj && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => handleOpenEditBoardModal(activeBoardObj, e)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              isLight
                                ? 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                                : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                            }`}
                            title="বোর্ডের নাম/তারিখ এডিট করুন"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {activeBoardObj.boardDefId && activeBoardObj.total === 0 && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteEmptyBoard(activeBoardObj, e)}
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                isLight
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200'
                                  : 'bg-rose-950/30 hover:bg-rose-900/40 text-rose-400 border-rose-500/30'
                              }`}
                              title="ফাঁকা বোর্ড মুছুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenAddModal('IPFT')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>এই বোর্ডে এন্ট্রি করুন</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 3 Clickable Summary Boxes for Current Selection */}
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      {
                        key: 'Appeared' as IpftResultFilter,
                        label: 'Appeared (উপস্থিত)',
                        val: activeBoardStats.appeared,
                        activeCls: 'border-cyan-500 bg-cyan-500/15 text-cyan-400',
                        baseCls: isLight
                          ? 'bg-slate-50 border-slate-200 text-cyan-700 hover:border-cyan-400'
                          : 'bg-slate-950/70 border-slate-800 text-cyan-400 hover:border-cyan-500/40',
                      },
                      {
                        key: 'Passed' as IpftResultFilter,
                        label: 'Passed (উত্তীর্ণ)',
                        val: activeBoardStats.passed,
                        activeCls: 'border-emerald-500 bg-emerald-500/15 text-emerald-400',
                        baseCls: isLight
                          ? 'bg-slate-50 border-slate-200 text-emerald-700 hover:border-emerald-400'
                          : 'bg-slate-950/70 border-slate-800 text-emerald-400 hover:border-emerald-500/40',
                      },
                      {
                        key: 'Failed' as IpftResultFilter,
                        label: 'Failed (অনুত্তীর্ণ)',
                        val: activeBoardStats.failed,
                        activeCls: 'border-rose-500 bg-rose-500/15 text-rose-400',
                        baseCls: isLight
                          ? 'bg-slate-50 border-slate-200 text-rose-700 hover:border-rose-400'
                          : 'bg-slate-950/70 border-slate-800 text-rose-400 hover:border-rose-500/40',
                      },
                    ]
                  ).map((box) => {
                    const isActive = ipftResultFilter === box.key;
                    return (
                      <button
                        key={box.key}
                        type="button"
                        onClick={() => {
                          setIpftAppearanceFilter((prev) => (prev === '0' ? 'All' : prev));
                          setIpftResultFilter(isActive ? 'All' : box.key);
                        }}
                        className={`rounded-lg border p-2.5 text-left transition-all cursor-pointer ${
                          isActive ? box.activeCls : box.baseCls
                        }`}
                      >
                        <div className="text-lg font-bold font-mono tabular-nums leading-none">
                          {box.val}
                        </div>
                        <div className={`text-[10px] font-medium mt-1 ${
                          isLight ? 'text-slate-600' : 'text-slate-400'
                        }`}>
                          {box.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filter Bar inside Right Panel */}
              <div className={`flex flex-col gap-3 border p-3 rounded-xl ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
              }`}>
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Battery Selector */}
                    <div className={`flex items-center gap-1 p-1 rounded-lg border text-xs ${
                      isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'
                    }`}>
                      {(['All', 'HQ Bty', 'P Bty', 'Q Bty', 'R Bty', 'EME'] as const).map((b) => (
                        <button
                          key={b}
                          onClick={() => setBtyFilter(b)}
                          className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
                            btyFilter === b
                              ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                              : isLight
                              ? 'text-slate-600 hover:text-slate-900'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {b === 'All' ? 'সব' : b.replace(' Bty', '')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Search Input */}
                  <div className="relative">
                    <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${
                      isLight ? 'text-slate-400' : 'text-slate-500'
                    }`} />
                    <input
                      type="text"
                      placeholder="সেনা নং বা নাম লিখুন..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`pl-8 pr-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:border-emerald-500 w-full xl:w-52 ${
                        isLight
                          ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                          : 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500'
                      }`}
                    />
                  </div>
                </div>

                {/* IPFT Appearance Count Filter Row */}
                <div className={`flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t ${
                  isLight ? 'border-slate-200' : 'border-slate-800'
                }`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[11px] font-semibold inline-flex items-center gap-1 ${
                      isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}>
                      <Users className="w-3.5 h-3.5 text-emerald-500" />
                      <span>উপস্থিতির সংখ্যা (Times Appeared):</span>
                    </span>
                    {(
                      [
                        { id: 'All', label: 'সব' },
                        { id: '0', label: `0 বার (${appearanceFilterCounts.zero})` },
                        { id: '1', label: `1 বার (${appearanceFilterCounts.one})` },
                        { id: '2', label: `2 বার (${appearanceFilterCounts.two})` },
                        { id: '3+', label: `3+ বার (${appearanceFilterCounts.threePlus})` },
                      ] as { id: IpftAppearanceFilter; label: string }[]
                    ).map((af) => (
                      <button
                        key={af.id}
                        type="button"
                        onClick={() => {
                          setIpftAppearanceFilter(af.id);
                          if (af.id === '0') {
                            setIpftResultFilter('All');
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                          ipftAppearanceFilter === af.id
                            ? 'bg-emerald-600 text-white border-emerald-500 font-semibold'
                            : isLight
                            ? 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {af.label}
                      </button>
                    ))}
                  </div>

                  {hasActiveIpftFilters && (
                    <button
                      type="button"
                      onClick={resetIpftFilters}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border inline-flex items-center gap-1 transition-colors cursor-pointer ${
                        isLight
                          ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>ফিল্টার রিসেট</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Main Records Table Card */}
              <div className={`border rounded-xl overflow-hidden shadow-sm ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
              }`}>
                {renderRecordsTable()}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ==================== STANDARD VIEW FOR RET, GREN FIRING, FIRING ==================== */
        <>
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border p-3 rounded-xl ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            <div className="flex items-center gap-2 flex-wrap">
              <div className={`flex items-center gap-1 p-1 rounded-lg border text-xs ${
                isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'
              }`}>
                {(['All', 'HQ Bty', 'P Bty', 'Q Bty', 'R Bty', 'EME'] as const).map((b) => (
                  <button
                    key={b}
                    onClick={() => setBtyFilter(b)}
                    className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
                      btyFilter === b
                        ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                        : isLight
                        ? 'text-slate-600 hover:text-slate-900'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {b === 'All' ? 'সব' : b.replace(' Bty', '')}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 text-xs">
                {[
                  { id: 'All', label: 'সকল' },
                  { id: 'Distinction', label: 'Distinction / 1st Class' },
                  { id: 'Qualified', label: 'Qualified' },
                ].map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setGradeFilter(g.id)}
                    className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer border ${
                      gradeFilter === g.id
                        ? isLight
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-400 font-semibold'
                          : 'bg-slate-800 text-emerald-400 border-emerald-500/40 font-medium'
                        : isLight
                        ? 'bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${
                isLight ? 'text-slate-400' : 'text-slate-500'
              }`} />
              <input
                type="text"
                placeholder="সেনা নং বা নাম লিখুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-8 pr-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:border-emerald-500 w-full sm:w-56 ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                    : 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500'
                }`}
              />
            </div>
          </div>

          <div className={`border rounded-xl overflow-hidden shadow-sm ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            {renderRecordsTable()}
          </div>
        </>
      )}

      {/* ==================== MODAL 1: NEW / EDIT IPFT BOARD (Name + Date + Biannual) ==================== */}
      {isBoardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className={`relative w-full max-w-sm border rounded-xl shadow-xl p-5 space-y-4 ${
            isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${
              isLight ? 'border-slate-200' : 'border-slate-800'
            }`}>
              <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <ClipboardList className="w-4 h-4 text-emerald-500" />
                <span>{editingBoardDef ? 'IPFT বোর্ড এডিট করুন' : 'নতুন IPFT বোর্ড যোগ করুন'}</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsBoardModalOpen(false);
                  setEditingBoardDef(null);
                }}
                className={`p-1 rounded cursor-pointer ${
                  isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBoard} className="space-y-3 text-xs">
              <div>
                <label className={`block font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  বোর্ডের নাম (Board Name)
                </label>
                <input
                  type="text"
                  value={boardModalName}
                  onChange={(e) => setBoardModalName(e.target.value)}
                  placeholder="যেমন: Board 1, 2nd Chance Board..."
                  autoFocus
                  className={`w-full rounded-lg p-2 focus:outline-none focus:border-emerald-500 border ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                      : 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
                  }`}
                  required
                />
              </div>

              <div>
                <label className={`block font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  বোর্ড কবে হয়েছে (Board Date)
                </label>
                <input
                  type="date"
                  value={boardModalDate}
                  onChange={(e) => {
                    const nextDate = e.target.value;
                    setBoardModalDate(nextDate);
                    if (nextDate && !editingBoardDef) {
                      setBoardModalBiannual(inferIpftBiannual({ date: nextDate }));
                    }
                  }}
                  className={`w-full rounded-lg p-2 focus:outline-none focus:border-emerald-500 border ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900'
                      : 'bg-slate-950 border-slate-800 text-white'
                  }`}
                  required
                />
              </div>

              <div>
                <label className={`block font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  বাই-অ্যানুয়াল (Biannual)
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['1st Biannual', '2nd Biannual'] as TrgBiannualType[]).map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBoardModalBiannual(b)}
                      className={`py-1.5 rounded-lg font-medium border text-center transition-colors cursor-pointer ${
                        boardModalBiannual === b
                          ? 'bg-emerald-600 text-white border-emerald-500 font-semibold'
                          : isLight
                          ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsBoardModalOpen(false);
                    setEditingBoardDef(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer ${
                    isLight
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold cursor-pointer shadow-sm"
                >
                  {isSaving ? 'সংরক্ষণ হচ্ছে...' : editingBoardDef ? 'আপডেট করুন' : 'বোর্ড তৈরি করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL 2: ADD / EDIT SOLDIER RECORD ==================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className={`relative w-full max-w-md max-h-[92vh] overflow-y-auto border rounded-xl shadow-xl p-5 space-y-4 ${
            isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${
              isLight ? 'border-slate-200' : 'border-slate-800'
            }`}>
              <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <Target className="w-4 h-4 text-emerald-500" />
                <span>
                  {editingRecordId
                    ? 'প্রশিক্ষণ রেকর্ড এডিট করুন'
                    : 'নতুন প্রশিক্ষণ রেকর্ড যুক্ত করুন'}
                </span>
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingRecordId(null);
                }}
                className={`p-1 rounded cursor-pointer ${
                  isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="space-y-3 text-xs">
              {/* Module select */}
              <div>
                <label className={`block font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>মডিউল</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['RET', 'IPFT', 'Gren Firing', 'Firing'] as TrgModuleType[]).map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => {
                        setFormModule(m);
                        if (!editingRecordId) {
                          setFormLocation(TRG_MODULE_CONFIGS[m]?.defaultLocation || '');
                          setFormScore(TRG_MODULE_CONFIGS[m]?.sampleScores || '');
                          setFormGrade(
                            m === 'IPFT'
                              ? '1st Class'
                              : m === 'Firing'
                              ? 'Marksman Shot'
                              : m === 'Gren Firing'
                              ? 'Qualified (Live Fired)'
                              : 'Qualified (Grade A)'
                          );
                        }
                      }}
                      className={`py-1.5 rounded-lg font-medium border text-center transition-colors cursor-pointer ${
                        formModule === m
                          ? 'bg-emerald-600 text-white border-emerald-500 font-semibold'
                          : isLight
                          ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Soldier select with quick filter */}
              <div>
                <label className={`block font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>সৈনিক নির্বাচন</label>
                <div className="space-y-1.5">
                  <div className="relative">
                    <Search className={`w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 ${
                      isLight ? 'text-slate-400' : 'text-slate-500'
                    }`} />
                    <input
                      type="text"
                      value={soldierModalSearch}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSoldierModalSearch(val);
                        const q = val.toLowerCase().trim();
                        if (q) {
                          const firstMatch = personnelList.find(
                            (p) =>
                              (p.snkNo || '').toLowerCase().includes(q) ||
                              (p.name || '').toLowerCase().includes(q)
                          );
                          if (firstMatch) setSelectedSoldierSnkNo(firstMatch.snkNo);
                        }
                      }}
                      placeholder="সেনা নং বা নাম লিখে খুঁজুন..."
                      className={`w-full pl-7 pr-2.5 py-1.5 text-xs rounded-lg border focus:outline-none focus:border-emerald-500 ${
                        isLight
                          ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                          : 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
                      }`}
                    />
                  </div>
                  <select
                    value={selectedSoldierSnkNo}
                    onChange={(e) => setSelectedSoldierSnkNo(e.target.value)}
                    className={`w-full rounded-lg p-2 focus:outline-none focus:border-emerald-500 border ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900'
                        : 'bg-slate-950 border-slate-800 text-white'
                    }`}
                    required
                  >
                    {modalFilteredPersonnel.map((p) => (
                      <option key={p.id} value={p.snkNo}>
                        {p.snkNo} — {p.rk} {p.name} ({p.battery})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* IPFT Specific: Biannual, Board Name & Result Status */}
              {formModule === 'IPFT' && (
                <div className={`p-3 rounded-lg border space-y-2.5 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
                }`}>
                  {/* Biannual */}
                  <div>
                    <label className={`block font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      বাই-অ্যানুয়াল (Biannual)
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['1st Biannual', '2nd Biannual'] as TrgBiannualType[]).map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setFormBiannual(b)}
                          className={`py-1.5 rounded-lg font-medium border text-center transition-colors cursor-pointer ${
                            formBiannual === b
                              ? 'bg-emerald-600 text-white border-emerald-500 font-semibold'
                              : isLight
                              ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                          }`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Board Name */}
                  <div>
                    <label className={`block font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      বোর্ডের নাম (Board Name)
                    </label>
                    <input
                      type="text"
                      value={formBoardName}
                      onChange={(e) => setFormBoardName(e.target.value)}
                      placeholder="e.g. Board 1, 2nd Chance Board..."
                      className={`w-full rounded-lg p-2 focus:outline-none focus:border-emerald-500 border ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                          : 'bg-slate-900 border-slate-800 text-white placeholder-slate-500'
                      }`}
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {allIpftBoards
                        .filter((b) => b.biannual === formBiannual)
                        .slice(0, 6)
                        .map((b) => (
                          <button
                            key={b.key}
                            type="button"
                            onClick={() => {
                              setFormBoardName(b.boardName);
                              if (b.boardDate) setFormDate(b.boardDate);
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] border transition-colors cursor-pointer ${
                              formBoardName === b.boardName
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-semibold'
                                : isLight
                                ? 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                            }`}
                          >
                            {b.boardName}
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* IPFT Result Status */}
                  <div>
                    <label className={`block font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      IPFT অবস্থা (Passed / Failed / Not Appeared)
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['Passed', 'Failed', 'Not Appeared'] as IpftResultType[]).map((res) => (
                        <button
                          key={res}
                          type="button"
                          onClick={() => handleIpftResultSelect(res)}
                          className={`py-1.5 rounded-lg font-medium border text-center transition-colors cursor-pointer ${
                            formIpftResult === res
                              ? res === 'Passed'
                                ? 'bg-emerald-600 text-white border-emerald-500 font-semibold'
                                : res === 'Failed'
                                ? 'bg-rose-600 text-white border-rose-500 font-semibold'
                                : 'bg-amber-600 text-white border-amber-500 font-semibold'
                              : isLight
                              ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                          }`}
                        >
                          {res}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Grade */}
              <div>
                <label className={`block font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>ফলাফল / গ্রেড</label>
                <input
                  type="text"
                  value={formGrade}
                  onChange={(e) => setFormGrade(e.target.value)}
                  placeholder="e.g. 1st Class, Marksman, Qualified..."
                  className={`w-full rounded-lg p-2 focus:outline-none focus:border-emerald-500 border ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                      : 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
                  }`}
                  required
                />
              </div>

              {/* Score / Performance */}
              <div>
                <label className={`block font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>স্কোর ও পারফরম্যান্স বিবরণ</label>
                <input
                  type="text"
                  value={formScore}
                  onChange={(e) => setFormScore(e.target.value)}
                  placeholder="e.g. 1.6km: 5m 30s | Push-ups: 44"
                  className={`w-full rounded-lg p-2 focus:outline-none focus:border-emerald-500 border ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                      : 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
                  }`}
                />
              </div>

              {/* Date & Location */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`block font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>তারিখ</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => {
                      const nextDate = e.target.value;
                      setFormDate(nextDate);
                      if (formModule === 'IPFT' && !editingRecordId && nextDate) {
                        setFormBiannual(inferIpftBiannual({ date: nextDate }));
                      }
                    }}
                    className={`w-full rounded-lg p-2 focus:outline-none focus:border-emerald-500 border ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900'
                        : 'bg-slate-950 border-slate-800 text-white'
                    }`}
                    required
                  />
                </div>
                <div>
                  <label className={`block font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>স্থান / ভেন্যু</label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g. Bhatiary / Halishahar..."
                    className={`w-full rounded-lg p-2 focus:outline-none focus:border-emerald-500 border ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                        : 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
                    }`}
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className={`block font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>মন্তব্য (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  placeholder="মন্তব্য..."
                  className={`w-full rounded-lg p-2 focus:outline-none focus:border-emerald-500 border ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                      : 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
                  }`}
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingRecordId(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer ${
                    isLight
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  বাতিল
                </button>
                {!editingRecordId && formModule === 'IPFT' && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => saveCurrentRecord(true)}
                    className={`px-3 py-1.5 rounded-lg font-semibold border cursor-pointer disabled:opacity-50 ${
                      isLight
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                        : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                    }`}
                  >
                    সংরক্ষণ ও পরের জন
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold cursor-pointer shadow-sm"
                >
                  {isSaving
                    ? 'সংরক্ষণ হচ্ছে...'
                    : editingRecordId
                    ? 'আপডেট করুন'
                    : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
