import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Battery, Personnel } from '../types';
import { RankBadge } from '../components/common/RankBadge';
import {
  TrgModuleType,
  TrgModuleDef,
  TrgBiannualType,
  IpftResultType,
  TrgRecord,
  IpftBoardDef,
  TRG_MODULE_CONFIGS,
  DEFAULT_TRG_MODULES,
  inferIpftBiannual,
  inferIpftBoardName,
  getIpftResultCategory,
} from '../data/trgStateData';
import {
  fetchTrgStateFromSupabase,
  upsertTrgStateToSupabase,
  deleteTrgStateFromSupabase,
  upsertIpftBoardToSupabase,
  upsertTrgModuleToSupabase,
  renameTrgModuleRecordsInSupabase,
  deleteTrgModuleFromSupabase,
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
  Award,
  RefreshCw,
  Layers,
  Users,
  RotateCcw,
  ChevronRight,
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
  year: string;
  biannual: TrgBiannualType;
  boardDate: string;
  minDate: string;
  maxDate: string;
  appeared: number;
  passed: number;
  failed: number;
  total: number;
}

const inferIpftYear = (rec: { date?: string }): string => {
  if (rec.date) {
    const match = rec.date.trim().match(/^(\d{4})/);
    if (match) return match[1];
  }
  return String(new Date().getFullYear());
};

export const TrgStatePage: React.FC<TrgStatePageProps> = ({
  onViewDossier,
}) => {
  const { personnelList, showNotification, isGuest, theme } = useApp();
  const isLight = theme === 'light';

  // Training state records, IPFT boards, & custom training modules strictly from Supabase `trg_state`
  const [records, setRecords] = useState<TrgRecord[]>([]);
  const [boardDefs, setBoardDefs] = useState<IpftBoardDef[]>([]);
  const [customModuleDefs, setCustomModuleDefs] = useState<TrgModuleDef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);

  const loadFromSupabase = useCallback(async () => {
    const res = await fetchTrgStateFromSupabase();
    if (res.success) {
      setRecords(res.records);
      setBoardDefs(res.boardDefs || []);
      setCustomModuleDefs(res.moduleDefs || []);
      setTableMissing(false);
    } else {
      setRecords([]);
      setBoardDefs([]);
      setCustomModuleDefs([]);
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

  // Selection state: nothing selected initially so state is hidden until user clicks
  const [selectedModule, setSelectedModule] = useState<TrgModuleType | null>(null);
  const [isIpftExpanded, setIsIpftExpanded] = useState<boolean>(false);
  const [selectedIpftYear, setSelectedIpftYear] = useState<string | null>(null);
  const [selectedIpftBiannual, setSelectedIpftBiannual] = useState<TrgBiannualType | null>(null);

  const [btyFilter, setBtyFilter] = useState<Battery | 'All'>('All');
  const [gradeFilter, setGradeFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // IPFT-specific right-panel filters
  const [ipftBoardFilter, setIpftBoardFilter] = useState<string>('');
  const [ipftResultFilter, setIpftResultFilter] = useState<IpftResultFilter>('All');
  const [ipftAppearanceFilter, setIpftAppearanceFilter] = useState<IpftAppearanceFilter>('All');

  // New / Edit Custom Training Module Modal
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [editingModuleDef, setEditingModuleDef] = useState<TrgModuleDef | null>(null);
  const [confirmDeleteModule, setConfirmDeleteModule] = useState(false);
  const [moduleModalName, setModuleModalName] = useState('');
  const [moduleModalFull, setModuleModalFull] = useState('');
  const [moduleModalDesc, setModuleModalDesc] = useState('');
  const [moduleModalLocation, setModuleModalLocation] = useState('10 Med Regimental Trg Ground');
  const [moduleModalSampleScore, setModuleModalSampleScore] = useState('');

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

  // State is shown ONLY after clicking a module (or Year + Biannual under IPFT)
  const isStateVisible =
    (selectedModule !== null && selectedModule !== 'IPFT') ||
    (selectedModule === 'IPFT' && selectedIpftYear !== null && selectedIpftBiannual !== null);

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

  // Combined modules list: built-in defaults + Supabase custom modules + any module referenced in records
  const modules = useMemo<TrgModuleDef[]>(() => {
    const list: TrgModuleDef[] = [...DEFAULT_TRG_MODULES];
    const seen = new Set(list.map((m) => m.id.trim().toLowerCase()));

    customModuleDefs.forEach((cm) => {
      const key = cm.id.trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        list.push(cm);
      }
    });

    syncedRecords.forEach((r) => {
      const modName = (r.module || '').trim();
      const key = modName.toLowerCase();
      if (modName && !seen.has(key)) {
        seen.add(key);
        list.push({
          id: modName,
          label: modName,
          full: modName,
          title: modName,
          bengaliTitle: modName,
          description: 'কাস্টম প্রশিক্ষণ মডিউল',
          defaultLocation: r.location || '10 Med Regimental Trg Ground',
          sampleScores: 'Score: Standard | Qualified',
          isDefault: false,
        });
      }
    });

    return list;
  }, [customModuleDefs, syncedRecords]);

  const getModuleConfig = useCallback(
    (moduleId: string): TrgModuleDef => {
      const found = modules.find(
        (m) => m.id.trim().toLowerCase() === (moduleId || '').trim().toLowerCase()
      );
      if (found) return found;
      const fallback = TRG_MODULE_CONFIGS[moduleId];
      if (fallback) {
        return {
          id: moduleId,
          label: moduleId,
          full: fallback.title,
          title: fallback.title,
          bengaliTitle: fallback.bengaliTitle,
          description: fallback.description,
          defaultLocation: fallback.defaultLocation,
          sampleScores: fallback.sampleScores,
          isDefault: true,
        };
      }
      return {
        id: moduleId,
        label: moduleId,
        full: moduleId,
        title: moduleId,
        bengaliTitle: moduleId,
        description: 'কাস্টম প্রশিক্ষণ মডিউল',
        defaultLocation: '10 Med Regimental Trg Ground',
        sampleScores: 'Score: Standard | Qualified',
        isDefault: false,
      };
    },
    [modules]
  );

  // Module counts (supports both built-in & custom modules)
  const moduleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    modules.forEach((m) => {
      counts[m.id] = 0;
    });
    syncedRecords.forEach((r) => {
      counts[r.module] = (counts[r.module] || 0) + 1;
    });
    return counts;
  }, [modules, syncedRecords]);

  // All IPFT records
  const ipftRecordsAll = useMemo(
    () => syncedRecords.filter((r) => r.module === 'IPFT'),
    [syncedRecords]
  );

  const ipftRecordsByBty = useMemo(
    () => (btyFilter === 'All' ? ipftRecordsAll : ipftRecordsAll.filter((r) => r.battery === btyFilter)),
    [ipftRecordsAll, btyFilter]
  );

  // Build unified Boards catalog (year-aware: `${year}::${biannual}::${boardName}`)
  const allIpftBoards = useMemo<BoardSummary[]>(() => {
    const map = new Map<string, BoardSummary>();

    boardDefs.forEach((def) => {
      const year = inferIpftYear({ date: def.date });
      const biannual = def.biannual || inferIpftBiannual({ date: def.date });
      const boardName = def.boardName.trim();
      const key = `${year}::${biannual}::${boardName}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          boardDefId: def.id,
          boardName,
          year,
          biannual,
          boardDate: def.date || '',
          minDate: def.date || '',
          maxDate: def.date || '',
          appeared: 0,
          passed: 0,
          failed: 0,
          total: 0,
        });
      } else {
        const existing = map.get(key)!;
        if (!existing.boardDefId) existing.boardDefId = def.id;
        if (def.date && !existing.boardDate) existing.boardDate = def.date;
      }
    });

    ipftRecordsAll.forEach((rec) => {
      const year = inferIpftYear(rec);
      const biannual = inferIpftBiannual(rec);
      const boardName = inferIpftBoardName(rec);
      const key = `${year}::${biannual}::${boardName}`;
      const recDate = rec.date || '';

      let entry = map.get(key);
      if (!entry) {
        entry = {
          key,
          boardName,
          year,
          biannual,
          boardDate: recDate,
          minDate: recDate,
          maxDate: recDate,
          appeared: 0,
          passed: 0,
          failed: 0,
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
      entry.appeared++;
      if (resCat === 'Failed') {
        entry.failed++;
      } else {
        entry.passed++;
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

  // Available Years under IPFT (always includes current year + all years with records/boards)
  const ipftYears = useMemo(() => {
    const set = new Set<string>();
    set.add(String(new Date().getFullYear()));
    allIpftBoards.forEach((b) => set.add(b.year));
    ipftRecordsAll.forEach((r) => set.add(inferIpftYear(r)));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [allIpftBoards, ipftRecordsAll]);

  // Record counts per year and per (year, biannual) for the left tree
  const ipftTreeCounts = useMemo(() => {
    const byYear: Record<string, number> = {};
    const byYearBiannual: Record<string, Record<TrgBiannualType, number>> = {};

    ipftRecordsAll.forEach((r) => {
      const yr = inferIpftYear(r);
      const bi = inferIpftBiannual(r);
      byYear[yr] = (byYear[yr] || 0) + 1;
      if (!byYearBiannual[yr]) {
        byYearBiannual[yr] = { '1st Biannual': 0, '2nd Biannual': 0 };
      }
      byYearBiannual[yr][bi]++;
    });

    return { byYear, byYearBiannual };
  }, [ipftRecordsAll]);

  // Boards inside selected Year + Biannual
  const boardsInSelectedYearBiannual = useMemo(() => {
    if (!selectedIpftYear || !selectedIpftBiannual) return [];
    return allIpftBoards.filter(
      (b) => b.year === selectedIpftYear && b.biannual === selectedIpftBiannual
    );
  }, [allIpftBoards, selectedIpftYear, selectedIpftBiannual]);

  // Keep ipftBoardFilter valid if board was deleted/renamed, or empty ("All Boards")
  useEffect(() => {
    if (!ipftBoardFilter) return;
    const exists = boardsInSelectedYearBiannual.some((b) => b.key === ipftBoardFilter);
    if (!exists) {
      setIpftBoardFilter('');
    }
  }, [boardsInSelectedYearBiannual, ipftBoardFilter]);

  const activeBoardObj = useMemo(() => {
    if (!ipftBoardFilter) return null;
    return boardsInSelectedYearBiannual.find((b) => b.key === ipftBoardFilter) || null;
  }, [boardsInSelectedYearBiannual, ipftBoardFilter]);

  // Summary stats for the currently selected Year + Biannual (or specific Board if chosen)
  const activeIpftStats = useMemo(() => {
    if (activeBoardObj) {
      return {
        appeared: activeBoardObj.appeared,
        passed: activeBoardObj.passed,
        failed: activeBoardObj.failed,
        total: activeBoardObj.total,
      };
    }
    return boardsInSelectedYearBiannual.reduce(
      (acc, b) => ({
        appeared: acc.appeared + b.appeared,
        passed: acc.passed + b.passed,
        failed: acc.failed + b.failed,
        total: acc.total + b.total,
      }),
      { appeared: 0, passed: 0, failed: 0, total: 0 }
    );
  }, [activeBoardObj, boardsInSelectedYearBiannual]);

  // Appearance Count per soldier within selected Year + Biannual
  const ipftAppearanceCountMap = useMemo(() => {
    const map = new Map<string, number>();
    const scopeRecords = ipftRecordsAll.filter((r) => {
      if (selectedIpftYear && inferIpftYear(r) !== selectedIpftYear) return false;
      if (selectedIpftBiannual && inferIpftBiannual(r) !== selectedIpftBiannual) return false;
      return true;
    });

    scopeRecords.forEach((rec) => {
      const key = getSoldierKey(rec);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [ipftRecordsAll, selectedIpftYear, selectedIpftBiannual, getSoldierKey]);

  // Personnel with 0 appearances in selected Year + Biannual
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
      if (selectedIpftYear && inferIpftYear(r) !== selectedIpftYear) return false;
      if (selectedIpftBiannual && inferIpftBiannual(r) !== selectedIpftBiannual) return false;
      if (
        activeBoardObj &&
        `${inferIpftYear(r)}::${inferIpftBiannual(r)}::${inferIpftBoardName(r)}` !== activeBoardObj.key
      ) {
        return false;
      }
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
    selectedIpftYear,
    selectedIpftBiannual,
    activeBoardObj,
    ipftAppearanceCountMap,
    getSoldierKey,
    zeroAppearancePersonnel.length,
  ]);

  // Filtered Records for Selected Module (or selected IPFT Year + Biannual)
  const filteredRecords = useMemo(() => {
    if (!selectedModule || !isStateVisible) return [];

    let result = syncedRecords.filter((r) => r.module === selectedModule);

    if (btyFilter !== 'All') {
      result = result.filter((r) => r.battery === btyFilter);
    }

    if (selectedModule === 'IPFT') {
      if (selectedIpftYear) {
        result = result.filter((r) => inferIpftYear(r) === selectedIpftYear);
      }
      if (selectedIpftBiannual) {
        result = result.filter((r) => inferIpftBiannual(r) === selectedIpftBiannual);
      }
      if (activeBoardObj) {
        result = result.filter(
          (r) =>
            `${inferIpftYear(r)}::${inferIpftBiannual(r)}::${inferIpftBoardName(r)}` ===
            activeBoardObj.key
        );
      }

      if (ipftResultFilter !== 'All' && ipftResultFilter !== 'Appeared') {
        result = result.filter((r) => getIpftResultCategory(r) === ipftResultFilter);
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
    isStateVisible,
    btyFilter,
    gradeFilter,
    searchQuery,
    selectedIpftYear,
    selectedIpftBiannual,
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

  // ==================== LEFT TREE HANDLERS ====================
  const handleSelectSimpleModule = (mod: TrgModuleType) => {
    setSelectedModule(mod);
    setSelectedIpftYear(null);
    setSelectedIpftBiannual(null);
    setIpftBoardFilter('');
    setIpftResultFilter('All');
    setIpftAppearanceFilter('All');
    setSearchQuery('');
    setGradeFilter('All');
  };

  const handleToggleIpftModule = () => {
    setIsIpftExpanded((prev) => {
      const next = !prev;
      if (next) {
        setSelectedModule('IPFT');
        setSearchQuery('');
      } else if (selectedModule === 'IPFT') {
        setSelectedModule(null);
        setSelectedIpftYear(null);
        setSelectedIpftBiannual(null);
        setIpftBoardFilter('');
      }
      return next;
    });
  };

  const handleSelectIpftYear = (year: string) => {
    setSelectedModule('IPFT');
    setIsIpftExpanded(true);
    if (selectedIpftYear === year) {
      setSelectedIpftYear(null);
      setSelectedIpftBiannual(null);
      setIpftBoardFilter('');
    } else {
      setSelectedIpftYear(year);
      setSelectedIpftBiannual(null);
      setIpftBoardFilter('');
      setIpftResultFilter('All');
      setIpftAppearanceFilter('All');
    }
  };

  const handleSelectIpftBiannual = (year: string, biannual: TrgBiannualType) => {
    setSelectedModule('IPFT');
    setIsIpftExpanded(true);
    setSelectedIpftYear(year);
    setSelectedIpftBiannual(biannual);
    setIpftBoardFilter('');
    setIpftResultFilter('All');
    setIpftAppearanceFilter('All');
    setSearchQuery('');
  };

  // ==================== NEW / EDIT BOARD HANDLERS ====================
  const getDefaultDateForIpftContext = (year?: string | null, biannual?: TrgBiannualType | null) => {
    const today = new Date().toISOString().slice(0, 10);
    const currentYear = String(new Date().getFullYear());
    const targetYear = year || currentYear;
    if (targetYear === currentYear && (!biannual || inferIpftBiannual({ date: today }) === biannual)) {
      return today;
    }
    const monthDay = biannual === '2nd Biannual' ? '07-15' : '01-15';
    return `${targetYear}-${monthDay}`;
  };

  const handleOpenNewBoardModal = () => {
    const defaultDate = getDefaultDateForIpftContext(selectedIpftYear, selectedIpftBiannual);
    setEditingBoardDef(null);
    setBoardModalName('');
    setBoardModalDate(defaultDate);
    setBoardModalBiannual(selectedIpftBiannual || inferIpftBiannual({ date: defaultDate }));
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

      if (
        editingBoardDef &&
        (editingBoardDef.boardName !== cleanName ||
          editingBoardDef.biannual !== boardModalBiannual)
      ) {
        const oldYear = inferIpftYear({ date: editingBoardDef.date });
        const affected = ipftRecordsAll.filter(
          (r) =>
            inferIpftYear(r) === oldYear &&
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
            inferIpftYear(r) === oldYear &&
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

      const savedYear = inferIpftYear({ date: boardToSave.date });
      const newKey = `${savedYear}::${boardToSave.biannual}::${boardToSave.boardName}`;
      setSelectedModule('IPFT');
      setIsIpftExpanded(true);
      setSelectedIpftYear(savedYear);
      setSelectedIpftBiannual(boardToSave.biannual);
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

  // ==================== CUSTOM TRAINING MODULE HANDLERS ====================
  const handleOpenNewModuleModal = () => {
    if (isGuest) {
      showNotification('গেস্ট মোডে নতুন মডিউল তৈরি করা অনুমোদিত নয়।');
      return;
    }
    setEditingModuleDef(null);
    setConfirmDeleteModule(false);
    setModuleModalName('');
    setModuleModalFull('');
    setModuleModalDesc('');
    setModuleModalLocation('10 Med Regimental Trg Ground');
    setModuleModalSampleScore('');
    setIsModuleModalOpen(true);
  };

  const handleOpenEditModuleModal = (modDef: TrgModuleDef) => {
    if (isGuest) {
      showNotification('গেস্ট মোডে মডিউল এডিট করা অনুমোদিত নয়।');
      return;
    }
    setEditingModuleDef(modDef);
    setConfirmDeleteModule(false);
    setModuleModalName(modDef.label);
    setModuleModalFull(modDef.full !== modDef.label ? modDef.full : '');
    setModuleModalDesc(
      modDef.description && modDef.description !== 'কাস্টম প্রশিক্ষণ মডিউল'
        ? modDef.description
        : ''
    );
    setModuleModalLocation(modDef.defaultLocation || '10 Med Regimental Trg Ground');
    setModuleModalSampleScore(
      modDef.sampleScores && modDef.sampleScores !== 'Score: Standard | Qualified'
        ? modDef.sampleScores
        : ''
    );
    setIsModuleModalOpen(true);
  };

  const handleSaveModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) {
      showNotification('গেস্ট মোডে পরিবর্তন সংরক্ষণ করা সম্ভব নয়।');
      return;
    }

    const cleanName = moduleModalName.trim();
    if (!cleanName) {
      showNotification('অনুগ্রহ করে নতুন মডিউলের নাম লিখুন!');
      return;
    }

    const duplicate = modules.find(
      (m) =>
        m.id.trim().toLowerCase() === cleanName.toLowerCase() &&
        (!editingModuleDef || m.id.trim().toLowerCase() !== editingModuleDef.id.trim().toLowerCase())
    );
    if (duplicate) {
      showNotification(`"${cleanName}" নামে ইতিমধ্যে একটি মডিউল রয়েছে!`);
      return;
    }

    const modToSave: TrgModuleDef = {
      defRowId: editingModuleDef?.defRowId,
      id: cleanName,
      label: cleanName,
      full: moduleModalFull.trim() || cleanName,
      title: moduleModalFull.trim() ? `${cleanName} (${moduleModalFull.trim()})` : cleanName,
      bengaliTitle: cleanName,
      description: moduleModalDesc.trim() || 'কাস্টম প্রশিক্ষণ মডিউল',
      defaultLocation: moduleModalLocation.trim() || '10 Med Regimental Trg Ground',
      sampleScores: moduleModalSampleScore.trim() || 'Score: Standard | Qualified',
      isDefault: false,
    };

    setIsSaving(true);
    try {
      const res = await upsertTrgModuleToSupabase(modToSave);
      if (!res.success) {
        if (res.tableMissing) setTableMissing(true);
        showNotification(`মডিউল সংরক্ষণ ব্যর্থ: ${res.error || 'Supabase error'}`);
        return;
      }

      const savedMod: TrgModuleDef = { ...modToSave, defRowId: res.defRowId };

      if (editingModuleDef && editingModuleDef.id !== savedMod.id) {
        await renameTrgModuleRecordsInSupabase(editingModuleDef.id, savedMod.id);
        setRecords((prev) =>
          prev.map((r) => (r.module === editingModuleDef.id ? { ...r, module: savedMod.id } : r))
        );
      }

      setCustomModuleDefs((prev) => {
        const exists = prev.some(
          (m) =>
            (savedMod.defRowId && m.defRowId === savedMod.defRowId) ||
            (editingModuleDef && m.id === editingModuleDef.id) ||
            m.id === savedMod.id
        );
        if (exists) {
          return prev.map((m) =>
            (savedMod.defRowId && m.defRowId === savedMod.defRowId) ||
            (editingModuleDef && m.id === editingModuleDef.id) ||
            m.id === savedMod.id
              ? savedMod
              : m
          );
        }
        return [...prev, savedMod];
      });

      setSelectedModule(savedMod.id);
      setSelectedIpftYear(null);
      setSelectedIpftBiannual(null);
      setIpftBoardFilter('');
      setGradeFilter('All');
      setSearchQuery('');
      setIsModuleModalOpen(false);
      setEditingModuleDef(null);
      showNotification(
        editingModuleDef
          ? `প্রশিক্ষণ মডিউল "${savedMod.label}" আপডেট করা হয়েছে।`
          : `নতুন প্রশিক্ষণ মডিউল "${savedMod.label}" তৈরি করা হয়েছে।`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCustomModule = async () => {
    if (isGuest || !editingModuleDef || editingModuleDef.isDefault) return;
    setIsSaving(true);
    try {
      const modId = editingModuleDef.id;
      const res = await deleteTrgModuleFromSupabase(modId, editingModuleDef.defRowId, true);
      if (!res.success) {
        showNotification(`মডিউল ডিলিট ব্যর্থ: ${res.error || 'Supabase error'}`);
        return;
      }
      setCustomModuleDefs((prev) =>
        prev.filter((m) => m.id !== modId && m.defRowId !== editingModuleDef.defRowId)
      );
      setRecords((prev) => prev.filter((r) => r.module !== modId));
      if (selectedModule === modId) {
        setSelectedModule(null);
      }
      setIsModuleModalOpen(false);
      setEditingModuleDef(null);
      setConfirmDeleteModule(false);
      showNotification(`প্রশিক্ষণ মডিউল "${modId}" মুছে ফেলা হয়েছে।`);
    } finally {
      setIsSaving(false);
    }
  };

  // ==================== SOLDIER RECORD ADD / EDIT HANDLERS ====================
  const handleOpenAddModal = (
    defaultMod?: TrgModuleType | null,
    prefill?: {
      snkNo?: string;
      biannual?: TrgBiannualType;
      boardName?: string;
      boardDate?: string;
      result?: IpftResultType;
    }
  ) => {
    const mod: TrgModuleType = defaultMod || selectedModule || 'RET';
    const modCfg = getModuleConfig(mod);
    const defaultDate =
      prefill?.boardDate ||
      activeBoardObj?.boardDate ||
      activeBoardObj?.maxDate ||
      (mod === 'IPFT'
        ? getDefaultDateForIpftContext(selectedIpftYear, selectedIpftBiannual)
        : new Date().toISOString().slice(0, 10));
    const activeBiannual: TrgBiannualType =
      prefill?.biannual ||
      activeBoardObj?.biannual ||
      selectedIpftBiannual ||
      inferIpftBiannual({ date: defaultDate });
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
    setFormLocation(modCfg.defaultLocation || '10 Med Trg Ground');
    setFormScore(modCfg.sampleScores || '');
    setFormGrade(
      mod === 'IPFT'
        ? prefill?.result || 'Passed'
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
    const normalizedIpftResult: IpftResultType =
      rec.module === 'IPFT' ? getIpftResultCategory(rec) : 'Passed';
    setEditingRecordId(rec.id);
    setSoldierModalSearch('');
    setFormModule(rec.module);
    setSelectedSoldierSnkNo(rec.snkNo);
    setFormBiannual(rec.module === 'IPFT' ? inferIpftBiannual(rec) : '1st Biannual');
    setFormBoardName(rec.module === 'IPFT' ? inferIpftBoardName(rec) : '');
    setFormIpftResult(normalizedIpftResult);
    setFormGrade(rec.module === 'IPFT' ? normalizedIpftResult : rec.grade || '');
    setFormScore(rec.scoreDetails || '');
    setFormDate(rec.date || new Date().toISOString().slice(0, 10));
    setFormLocation(rec.location || '');
    setFormRemarks(rec.remarks || '');
    setIsAddModalOpen(true);
  };

  const handleIpftResultSelect = (resType: IpftResultType) => {
    setFormIpftResult(resType);
    setFormGrade(resType);
    if (resType === 'Passed' && !formScore) {
      setFormScore(TRG_MODULE_CONFIGS.IPFT.sampleScores);
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
      computedStatus = formIpftResult === 'Failed' ? 'Failed' : 'Passed';
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
        formModule === 'IPFT'
          ? formIpftResult
          : formGrade.trim() || 'Qualified',
      scoreDetails: formScore.trim() || 'Standard Completed',
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
        const savedYear = inferIpftYear({ date: formDate });
        setSelectedModule('IPFT');
        setIsIpftExpanded(true);
        setSelectedIpftYear(savedYear);
        setSelectedIpftBiannual(formBiannual);
        setIpftBoardFilter(`${savedYear}::${formBiannual}::${cleanBoardName}`);
      } else {
        setSelectedModule(formModule);
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

  // Shared records table renderer
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
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
                        isLight
                          ? 'bg-slate-100 text-slate-600 border-slate-200'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        বোর্ডে অংশগ্রহণ করেনি
                      </span>
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
                                activeBoardObj?.biannual || selectedIpftBiannual || undefined,
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
              : selectedModule === 'IPFT'
              ? `${selectedIpftYear} (${selectedIpftBiannual})-এ এখনো কোনো IPFT রেকর্ড পাওয়া যায়নি।`
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
                <th className="py-2.5 px-3">বোর্ড ও তারিখ</th>
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
                item.module !== 'IPFT' &&
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
                        <span className={`text-[11px] font-medium ${
                          isLight ? 'text-slate-800' : 'text-slate-200'
                        }`}>
                          {inferIpftBoardName(item)}
                        </span>
                        {item.date && (
                          <span className={`text-[10px] font-mono ${
                            isLight ? 'text-slate-500' : 'text-slate-400'
                          }`}>
                            {item.date}
                          </span>
                        )}
                      </div>
                    </td>
                  )}

                  <td className="py-2.5 px-3">
                    {item.module === 'IPFT' ? (
                      ipftResCat === 'Failed' ? (
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold border ${
                          isLight
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                        }`}>
                          <XCircle className="w-3 h-3 text-rose-500" />
                          <span>Failed</span>
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold border ${
                          isLight
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        }`}>
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>Passed</span>
                        </span>
                      )
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
                        title={`${selectedIpftYear || ''} ${selectedIpftBiannual || ''}-এ মোট ${appearanceCount} বার উপস্থিত হয়েছেন`}
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
          {!isGuest && (
            <button
              onClick={() => handleOpenAddModal(selectedModule)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{selectedModule === 'IPFT' ? 'নতুন এন্ট্রি' : 'নতুন রেকর্ড'}</span>
            </button>
          )}
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

      {/* 2. Main Layout: Left Sidebar (RET, IPFT -> Year -> 1st/2nd Biannual, Gren Firing, Firing) & Right State Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT PANEL: Module Directory (like Course & Cadre) */}
        <div className={`lg:col-span-4 border rounded-xl p-3.5 space-y-3 ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className={`flex items-center justify-between pb-2 border-b gap-2 ${
            isLight ? 'border-slate-200' : 'border-slate-800'
          }`}>
            <div className="flex items-center gap-1.5 min-w-0">
              <Layers className="w-4 h-4 text-emerald-500 shrink-0" />
              <h2 className={`text-xs font-bold uppercase tracking-wider truncate ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                প্রশিক্ষণ মডিউল তালিকা
              </h2>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {!isGuest && (
                <button
                  type="button"
                  onClick={handleOpenNewModuleModal}
                  className="px-2 py-1 rounded-md text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                  title="নতুন প্রশিক্ষণ মডিউল তৈরি করুন"
                >
                  <Plus className="w-3 h-3" />
                  <span>নতুন মডিউল</span>
                </button>
              )}
              <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border shrink-0 ${
                isLight
                  ? 'bg-slate-100 text-slate-700 border-slate-200'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}>
                মোট {syncedRecords.length}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            {modules.map((m) => {
              if (m.id === 'IPFT') {
                const isIpftActive = selectedModule === 'IPFT';

                return (
                  <div key={m.id} className="space-y-1.5">
                    {/* IPFT Parent Button */}
                    <button
                      type="button"
                      onClick={handleToggleIpftModule}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isIpftActive || isIpftExpanded
                          ? isLight
                            ? 'bg-emerald-50 border-emerald-500 shadow-xs'
                            : 'bg-slate-800 border-emerald-500/70 shadow-xs'
                          : isLight
                          ? 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                          : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className={`text-xs font-semibold truncate ${
                          isIpftActive || isIpftExpanded
                            ? isLight ? 'text-emerald-900 font-bold' : 'text-emerald-400 font-bold'
                            : isLight ? 'text-slate-900' : 'text-white'
                        }`}>
                          {m.label}
                        </div>
                        <div className={`text-[10px] truncate mt-0.5 ${
                          isLight ? 'text-slate-500' : 'text-slate-400'
                        }`}>
                          {m.full}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-xs font-mono font-bold tabular-nums px-2 py-0.5 rounded border ${
                          isIpftActive || isIpftExpanded
                            ? isLight
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : isLight
                            ? 'bg-white text-slate-700 border-slate-200'
                            : 'bg-slate-900 text-slate-300 border-slate-800'
                        }`}>
                          {moduleCounts.IPFT} জন
                        </span>
                        {isIpftExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <ChevronRight className={`w-3.5 h-3.5 ${isLight ? 'text-slate-400' : 'text-slate-600'}`} />
                        )}
                      </div>
                    </button>

                    {/* Nested under IPFT: Years -> Clicking a Year shows 1st Biannual & 2nd Biannual */}
                    {isIpftExpanded && (
                      <div className={`ml-3 pl-2.5 border-l-2 space-y-1.5 ${
                        isLight ? 'border-emerald-200' : 'border-emerald-500/30'
                      }`}>
                        {ipftYears.map((yr) => {
                          const isYearSelected = selectedIpftYear === yr;
                          const yrTotal = ipftTreeCounts.byYear[yr] || 0;
                          const b1Count = ipftTreeCounts.byYearBiannual[yr]?.['1st Biannual'] || 0;
                          const b2Count = ipftTreeCounts.byYearBiannual[yr]?.['2nd Biannual'] || 0;

                          return (
                            <div key={yr} className="space-y-1">
                              {/* Year Row */}
                              <button
                                type="button"
                                onClick={() => handleSelectIpftYear(yr)}
                                className={`w-full text-left px-2.5 py-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                  isYearSelected
                                    ? isLight
                                      ? 'bg-emerald-50/90 border-emerald-400 text-emerald-900 font-bold'
                                      : 'bg-emerald-950/35 border-emerald-500/60 text-emerald-300 font-bold'
                                    : isLight
                                    ? 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                                    : 'bg-slate-950/70 border-slate-800 text-slate-200 hover:bg-slate-800/50'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Calendar className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  <span className="text-xs font-mono">{yr}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className={`text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded border ${
                                    isLight
                                      ? 'bg-slate-100 text-slate-700 border-slate-200'
                                      : 'bg-slate-900 text-slate-300 border-slate-700'
                                  }`}>
                                    {yrTotal} জন
                                  </span>
                                  {isYearSelected ? (
                                    <ChevronDown className="w-3.5 h-3.5 text-emerald-500" />
                                  ) : (
                                    <ChevronRight className={`w-3.5 h-3.5 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
                                  )}
                                </div>
                              </button>

                              {/* Nested under clicked Year: 1st Biannual & 2nd Biannual */}
                              {isYearSelected && (
                                <div className={`ml-3 pl-2.5 border-l-2 space-y-1 ${
                                  isLight ? 'border-slate-200' : 'border-slate-700'
                                }`}>
                                  {(
                                    [
                                      {
                                        id: '1st Biannual' as TrgBiannualType,
                                        sub: 'Jan – Jun',
                                        count: b1Count,
                                      },
                                      {
                                        id: '2nd Biannual' as TrgBiannualType,
                                        sub: 'Jul – Dec',
                                        count: b2Count,
                                      },
                                    ]
                                  ).map((bi) => {
                                    const isBiSelected =
                                      selectedModule === 'IPFT' &&
                                      selectedIpftYear === yr &&
                                      selectedIpftBiannual === bi.id;

                                    return (
                                      <button
                                        key={bi.id}
                                        type="button"
                                        onClick={() => handleSelectIpftBiannual(yr, bi.id)}
                                        className={`w-full text-left px-2.5 py-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                          isBiSelected
                                            ? 'bg-emerald-600 border-emerald-500 text-white shadow-xs'
                                            : isLight
                                            ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-emerald-50 hover:border-emerald-300'
                                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                                        }`}
                                      >
                                        <div className="min-w-0">
                                          <div className="text-xs font-semibold truncate">{bi.id}</div>
                                          <div className={`text-[10px] ${
                                            isBiSelected
                                              ? 'text-emerald-100'
                                              : isLight ? 'text-slate-500' : 'text-slate-400'
                                          }`}>
                                            {bi.sub}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                          <span className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                                            isBiSelected
                                              ? 'bg-emerald-700/70 text-white border-emerald-400/50'
                                              : isLight
                                              ? 'bg-white text-slate-700 border-slate-200'
                                              : 'bg-slate-950 text-slate-300 border-slate-700'
                                          }`}>
                                            {bi.count} জন
                                          </span>
                                          <ChevronRight className={`w-3.5 h-3.5 ${
                                            isBiSelected ? 'text-white' : isLight ? 'text-slate-400' : 'text-slate-500'
                                          }`} />
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // RET, Gren Firing, Firing
              const isSelected = selectedModule === m.id;
              const count = moduleCounts[m.id] || 0;

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectSimpleModule(m.id)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    isSelected
                      ? isLight
                        ? 'bg-emerald-50 border-emerald-500 shadow-xs'
                        : 'bg-slate-800 border-emerald-500/70 shadow-xs'
                      : isLight
                      ? 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                      : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className={`text-xs font-semibold truncate ${
                      isSelected
                        ? isLight ? 'text-emerald-900 font-bold' : 'text-emerald-400 font-bold'
                        : isLight ? 'text-slate-900' : 'text-white'
                    }`}>
                      {m.label}
                    </div>
                    <div className={`text-[10px] truncate mt-0.5 ${
                      isLight ? 'text-slate-500' : 'text-slate-400'
                    }`}>
                      {m.full}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-xs font-mono font-bold tabular-nums px-2 py-0.5 rounded border ${
                      isSelected
                        ? isLight
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : isLight
                        ? 'bg-white text-slate-700 border-slate-200'
                        : 'bg-slate-900 text-slate-300 border-slate-800'
                    }`}>
                      {count} জন
                    </span>
                    <ChevronRight
                      className={`w-3.5 h-3.5 transition-transform ${
                        isSelected
                          ? 'text-emerald-500 translate-x-0.5'
                          : isLight ? 'text-slate-400' : 'text-slate-600'
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANEL: Training State (hidden until clicked) */}
        <div className="lg:col-span-8 space-y-3">
          {!isStateVisible ? (
            <div className={`border rounded-xl p-10 text-center space-y-3 ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
            }`}>
              <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center ${
                isLight
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>
                <Target className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {selectedModule === 'IPFT' && selectedIpftYear
                    ? `${selectedIpftYear} সালের বাই-অ্যানুয়াল নির্বাচন করুন`
                    : selectedModule === 'IPFT'
                    ? 'IPFT-এর বছর (Year) নির্বাচন করুন'
                    : 'প্রশিক্ষণ স্টেট দেখতে বাম পাশ থেকে নির্বাচন করুন'}
                </h3>
                <p className={`text-xs max-w-md mx-auto ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  {selectedModule === 'IPFT' && selectedIpftYear
                    ? `বাম পাশে ${selectedIpftYear} এর নিচে 1st Biannual অথবা 2nd Biannual এ ক্লিক করলে IPFT স্টেট প্রদর্শিত হবে।`
                    : selectedModule === 'IPFT'
                    ? 'বাম পাশে IPFT-এর নিচে যেকোনো বছরে ক্লিক করুন, এরপর 1st Biannual বা 2nd Biannual নির্বাচন করুন।'
                    : 'বাম পাশ থেকে RET, IPFT (বছর → ১ম/২য় বাই-অ্যানুয়াল), Gren Firing অথবা Firing এ ক্লিক করলে স্টেট প্রদর্শিত হবে।'}
                </p>
              </div>
            </div>
          ) : selectedModule === 'IPFT' ? (
            /* ==================== IPFT RIGHT PANEL (after clicking Year -> 1st/2nd Biannual) ==================== */
            <div className="space-y-3">
              {/* IPFT Header, Board Selector & 4-Stat Summary */}
              <div className={`border rounded-xl p-4 space-y-3 ${
                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className={`text-base font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        IPFT — {selectedIpftYear} ({selectedIpftBiannual})
                      </h2>
                      <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border ${
                        isLight
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      }`}>
                        {activeIpftStats.total} জন
                      </span>
                    </div>
                    <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      {selectedIpftBiannual === '1st Biannual'
                        ? 'Jan – Jun (১ম বাই-অ্যানুয়াল)'
                        : 'Jul – Dec (২য় বাই-অ্যানুয়াল)'}
                      {activeBoardObj ? ` · বোর্ড: ${activeBoardObj.boardName}` : ' · সকল বোর্ড'}
                    </p>
                  </div>

                  {!isGuest && (
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
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
                        onClick={handleOpenNewBoardModal}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border inline-flex items-center gap-1 cursor-pointer ${
                          isLight
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                        }`}
                      >
                        <ClipboardList className="w-3.5 h-3.5 text-emerald-500" />
                        <span>নতুন বোর্ড</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenAddModal('IPFT')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>এন্ট্রি করুন</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Board Filter Row inside Year + Biannual */}
                {boardsInSelectedYearBiannual.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[11px] font-semibold mr-1 ${
                      isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}>
                      বোর্ড:
                    </span>
                    <button
                      type="button"
                      onClick={() => setIpftBoardFilter('')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                        ipftBoardFilter === ''
                          ? 'bg-emerald-600 text-white border-emerald-500 font-semibold'
                          : isLight
                          ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      সকল বোর্ড ({boardsInSelectedYearBiannual.length})
                    </button>
                    {boardsInSelectedYearBiannual.map((board) => {
                      const isSel = activeBoardObj?.key === board.key;
                      const displayDate = board.boardDate || board.maxDate || '';
                      return (
                        <button
                          key={board.key}
                          type="button"
                          onClick={() => setIpftBoardFilter(isSel ? '' : board.key)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                            isSel
                              ? 'bg-emerald-600 text-white border-emerald-500 font-semibold'
                              : isLight
                              ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          <span>{board.boardName}</span>
                          {displayDate && (
                            <span className={`text-[10px] font-mono ${
                              isSel ? 'text-emerald-100' : isLight ? 'text-slate-500' : 'text-slate-400'
                            }`}>
                              ({displayDate})
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 3 Clickable Summary Boxes (Appeared, Passed, Failed) */}
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      {
                        key: 'Appeared' as IpftResultFilter,
                        label: 'Appeared (উপস্থিত)',
                        val: activeIpftStats.appeared,
                        activeCls: 'border-cyan-500 bg-cyan-500/15 text-cyan-400',
                        baseCls: isLight
                          ? 'bg-slate-50 border-slate-200 text-cyan-700 hover:border-cyan-400'
                          : 'bg-slate-950/70 border-slate-800 text-cyan-400 hover:border-cyan-500/40',
                      },
                      {
                        key: 'Passed' as IpftResultFilter,
                        label: 'Passed (উত্তীর্ণ)',
                        val: activeIpftStats.passed,
                        activeCls: 'border-emerald-500 bg-emerald-500/15 text-emerald-400',
                        baseCls: isLight
                          ? 'bg-slate-50 border-slate-200 text-emerald-700 hover:border-emerald-400'
                          : 'bg-slate-950/70 border-slate-800 text-emerald-400 hover:border-emerald-500/40',
                      },
                      {
                        key: 'Failed' as IpftResultFilter,
                        label: 'Failed (অনুত্তীর্ণ)',
                        val: activeIpftStats.failed,
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

              {/* Filter Bar inside IPFT Right Panel */}
              <div className={`flex flex-col gap-3 border p-3 rounded-xl ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
              }`}>
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
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
          ) : (
            /* ==================== RIGHT PANEL FOR RET, GREN FIRING, FIRING & CUSTOM MODULES ==================== */
            (() => {
              const activeModCfg = getModuleConfig(selectedModule!);
              return (
            <div className="space-y-3">
              {/* Module Header Card */}
              <div className={`border rounded-xl p-4 space-y-3 ${
                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
              }`}>
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b ${
                  isLight ? 'border-slate-200' : 'border-slate-800'
                }`}>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className={`text-base font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {activeModCfg.title}
                      </h2>
                      <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border ${
                        isLight
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      }`}>
                        {filteredRecords.length} জন
                      </span>
                    </div>
                    <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      {activeModCfg.bengaliTitle} — {activeModCfg.description}
                    </p>
                  </div>

                  {!isGuest && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!activeModCfg.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditModuleModal(activeModCfg)}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            isLight
                              ? 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                              : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                          }`}
                          title="মডিউল এডিট বা ডিলিট করুন"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenAddModal(selectedModule)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>সৈনিক যুক্ত করুন</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Filter & Search Bar */}
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-lg border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                }`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className={`flex items-center gap-1 p-1 rounded-lg border text-xs ${
                      isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
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

                    <div className="flex items-center gap-1 text-xs flex-wrap">
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
                              ? 'bg-white text-slate-600 border-slate-200 hover:text-slate-900'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative">
                    <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${
                      isLight ? 'text-slate-400' : 'text-slate-500'
                    }`} />
                    <input
                      type="text"
                      placeholder="সেনা নং বা নাম লিখুন..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`pl-8 pr-2.5 py-1 text-xs rounded-lg border focus:outline-none focus:border-emerald-500 w-full sm:w-52 ${
                        isLight
                          ? 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                          : 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Records Table Card */}
              <div className={`border rounded-xl overflow-hidden shadow-sm ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
              }`}>
                {renderRecordsTable()}
              </div>
            </div>
              );
            })()
          )}
        </div>
      </div>

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
                <div className="flex flex-wrap gap-1.5">
                  {modules.map((m) => (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => {
                        setFormModule(m.id);
                        if (!editingRecordId) {
                          const cfg = getModuleConfig(m.id);
                          setFormLocation(cfg.defaultLocation || '');
                          setFormScore(cfg.sampleScores || '');
                          if (m.id === 'IPFT') {
                            setFormIpftResult('Passed');
                            setFormGrade('Passed');
                          } else {
                            setFormGrade(
                              m.id === 'Firing'
                                ? 'Marksman Shot'
                                : m.id === 'Gren Firing'
                                ? 'Qualified (Live Fired)'
                                : 'Qualified (Grade A)'
                            );
                          }
                        } else if (m.id === 'IPFT') {
                          const normalized: IpftResultType =
                            formIpftResult === 'Failed' ? 'Failed' : 'Passed';
                          setFormIpftResult(normalized);
                          setFormGrade(normalized);
                        }
                      }}
                      className={`px-2.5 py-1.5 rounded-lg font-medium border text-center transition-colors cursor-pointer ${
                        formModule === m.id
                          ? 'bg-emerald-600 text-white border-emerald-500 font-semibold'
                          : isLight
                          ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {m.label}
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
                        .filter(
                          (b) =>
                            b.biannual === formBiannual &&
                            b.year === inferIpftYear({ date: formDate })
                        )
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

                  <div>
                    <label className={`block font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      IPFT ফলাফল (Passed / Failed)
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['Passed', 'Failed'] as IpftResultType[]).map((res) => (
                        <button
                          key={res}
                          type="button"
                          onClick={() => handleIpftResultSelect(res)}
                          className={`py-1.5 rounded-lg font-medium border text-center transition-colors cursor-pointer ${
                            formIpftResult === res
                              ? res === 'Passed'
                                ? 'bg-emerald-600 text-white border-emerald-500 font-semibold'
                                : 'bg-rose-600 text-white border-rose-500 font-semibold'
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

              {/* Grade (only for non-IPFT modules; IPFT strictly allows Passed or Failed) */}
              {formModule !== 'IPFT' && (
                <div>
                  <label className={`block font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>ফলাফল / গ্রেড</label>
                  <input
                    type="text"
                    value={formGrade}
                    onChange={(e) => setFormGrade(e.target.value)}
                    placeholder="e.g. Marksman, Qualified..."
                    className={`w-full rounded-lg p-2 focus:outline-none focus:border-emerald-500 border ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                        : 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
                    }`}
                    required
                  />
                </div>
              )}

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

      {/* ==================== MODAL 3: NEW / EDIT CUSTOM TRAINING MODULE ==================== */}
      {isModuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className={`relative w-full max-w-md border rounded-xl shadow-xl p-5 space-y-4 ${
            isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${
              isLight ? 'border-slate-200' : 'border-slate-800'
            }`}>
              <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <Layers className="w-4 h-4 text-emerald-500" />
                <span>
                  {editingModuleDef ? 'প্রশিক্ষণ মডিউল এডিট করুন' : 'নতুন প্রশিক্ষণ মডিউল তৈরি করুন'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsModuleModalOpen(false);
                  setEditingModuleDef(null);
                  setConfirmDeleteModule(false);
                }}
                className={`p-1 rounded cursor-pointer ${
                  isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModule} className="space-y-3 text-xs">
              <div>
                <label className={`block font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  মডিউলের নাম (Module Name) *
                </label>
                <input
                  type="text"
                  value={moduleModalName}
                  onChange={(e) => setModuleModalName(e.target.value)}
                  placeholder="যেমন: BPT, Map Reading, Night March, Range Test..."
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
                  পূর্ণ নাম / সাবটাইটেল (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={moduleModalFull}
                  onChange={(e) => setModuleModalFull(e.target.value)}
                  placeholder="যেমন: Battle Physical Efficiency Test"
                  className={`w-full rounded-lg p-2 focus:outline-none focus:border-emerald-500 border ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                      : 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
                  }`}
                />
              </div>

              <div>
                <label className={`block font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  বিবরণ (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={moduleModalDesc}
                  onChange={(e) => setModuleModalDesc(e.target.value)}
                  placeholder="প্রশিক্ষণের সংক্ষিপ্ত বিবরণ..."
                  className={`w-full rounded-lg p-2 focus:outline-none focus:border-emerald-500 border ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                      : 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`block font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    ডিফল্ট স্থান (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    value={moduleModalLocation}
                    onChange={(e) => setModuleModalLocation(e.target.value)}
                    placeholder="10 Med Trg Ground"
                    className={`w-full rounded-lg p-2 focus:outline-none focus:border-emerald-500 border ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                        : 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    ডিফল্ট স্কোর ফরম্যাট
                  </label>
                  <input
                    type="text"
                    value={moduleModalSampleScore}
                    onChange={(e) => setModuleModalSampleScore(e.target.value)}
                    placeholder="Score: 85/100"
                    className={`w-full rounded-lg p-2 focus:outline-none focus:border-emerald-500 border ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                        : 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
                    }`}
                  />
                </div>
              </div>

              {editingModuleDef && !editingModuleDef.isDefault && confirmDeleteModule && (
                <div className={`p-2.5 rounded-lg border text-[11px] space-y-2 ${
                  isLight ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-rose-950/30 border-rose-500/30 text-rose-200'
                }`}>
                  <p>
                    আপনি কি নিশ্চিত যে <strong>{editingModuleDef.label}</strong> মডিউল এবং এর সকল রেকর্ড মুছে ফেলতে চান?
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteModule(false)}
                      className={`px-2.5 py-1 rounded cursor-pointer ${
                        isLight ? 'bg-white border border-slate-300 text-slate-700' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      না
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={handleDeleteCustomModule}
                      className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer"
                    >
                      হ্যাঁ, মুছুন
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between gap-2">
                {editingModuleDef && !editingModuleDef.isDefault ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteModule(true)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1 cursor-pointer ${
                      isLight
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                        : 'bg-rose-950/30 hover:bg-rose-900/40 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>মুছুন</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModuleModalOpen(false);
                      setEditingModuleDef(null);
                      setConfirmDeleteModule(false);
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
                    {isSaving
                      ? 'সংরক্ষণ হচ্ছে...'
                      : editingModuleDef
                      ? 'আপডেট করুন'
                      : 'মডিউল তৈরি করুন'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
