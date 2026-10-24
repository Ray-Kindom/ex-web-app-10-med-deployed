import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Battery, Personnel } from '../types';
import { RankBadge } from '../components/common/RankBadge';
import {
  TrgModuleType,
  TrgRecord,
  INITIAL_TRG_RECORDS,
  TRG_MODULE_CONFIGS,
} from '../data/trgStateData';
import {
  Target,
  Crosshair,
  Flame,
  Activity,
  Award,
  Search,
  Plus,
  X,
  Printer,
  Eye,
  CheckCircle2,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  Shield,
  Trash2,
  Filter,
  Check,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

const STORAGE_KEY = '10MED_TRG_STATE_RECORDS_V1';

interface TrgStatePageProps {
  onViewDossier: (person: Personnel) => void;
  onOpenPrintModal?: () => void;
}

export const TrgStatePage: React.FC<TrgStatePageProps> = ({
  onViewDossier,
  onOpenPrintModal,
}) => {
  const { personnelList, currentUser, showNotification, isGuest } = useApp();

  // Persistent training state records
  const [records, setRecords] = useState<TrgRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_TRG_RECORDS;
  });

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {}
  }, [records]);

  // Selected training box (default to 'RET')
  const [selectedModule, setSelectedModule] = useState<TrgModuleType>('RET');
  const [btyFilter, setBtyFilter] = useState<Battery | 'All'>('All');
  const [gradeFilter, setGradeFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Record Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedSoldierSnkNo, setSelectedSoldierSnkNo] = useState('');
  const [formModule, setFormModule] = useState<TrgModuleType>('RET');
  const [formGrade, setFormGrade] = useState('Qualified');
  const [formScore, setFormScore] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formLocation, setFormLocation] = useState('');
  const [formRemarks, setFormRemarks] = useState('');

  const rosterTableRef = useRef<HTMLDivElement>(null);

  // Helper to find soldier by Army / Snk No
  const findPerson = (snkNo: string): Personnel | undefined => {
    return personnelList.find((p) => (p.snkNo || '').trim().toLowerCase() === snkNo.trim().toLowerCase());
  };

  // Module counts
  const moduleCounts = useMemo(() => {
    const counts: Record<TrgModuleType, number> = {
      RET: 0,
      IPFT: 0,
      'Gren Firing': 0,
      Firing: 0,
    };
    records.forEach((r) => {
      if (counts[r.module] !== undefined) {
        counts[r.module]++;
      }
    });
    return counts;
  }, [records]);

  // Handle Box Selection
  const handleSelectBox = (mod: TrgModuleType) => {
    setSelectedModule(mod);
    setSearchQuery('');
    setBtyFilter('All');
    setGradeFilter('All');
    setTimeout(() => {
      rosterTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  };

  // Filtered Records for Selected Module
  const filteredRecords = useMemo(() => {
    let result = records.filter((r) => r.module === selectedModule);

    if (btyFilter !== 'All') {
      result = result.filter((r) => r.battery === btyFilter);
    }

    if (gradeFilter !== 'All') {
      if (gradeFilter === 'Distinction') {
        result = result.filter((r) => r.status === 'Distinction' || r.grade.toLowerCase().includes('distinction') || r.grade.toLowerCase().includes('marksman') || r.grade.toLowerCase().includes('1st class'));
      } else if (gradeFilter === 'Qualified') {
        result = result.filter((r) => r.status === 'Qualified' || r.status === 'Distinction' || r.status === 'Passed');
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
          (r.remarks || '').toLowerCase().includes(q) ||
          r.battery.toLowerCase().includes(q)
      );
    }

    return result;
  }, [records, selectedModule, btyFilter, gradeFilter, searchQuery]);

  // Open Add Record Modal
  const handleOpenAddModal = (defaultMod?: TrgModuleType) => {
    const mod = defaultMod || selectedModule;
    setFormModule(mod);
    setFormLocation(TRG_MODULE_CONFIGS[mod].defaultLocation);
    setFormScore(TRG_MODULE_CONFIGS[mod].sampleScores);
    setFormGrade(
      mod === 'IPFT'
        ? '1st Class'
        : mod === 'Firing'
        ? 'Marksman Shot'
        : mod === 'Gren Firing'
        ? 'Qualified (Live Fired)'
        : 'Qualified (Grade A)'
    );
    setSelectedSoldierSnkNo(personnelList[0]?.snkNo || '');
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormRemarks('');
    setIsAddModalOpen(true);
  };

  // Save New Record
  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) {
      showNotification('Guest mode is view-only. You cannot make any changes.');
      return;
    }

    const soldier = personnelList.find(
      (p) => (p.snkNo || '').trim().toLowerCase() === selectedSoldierSnkNo.trim().toLowerCase()
    );

    if (!soldier) {
      showNotification('অনুগ্রহ করে একজন সঠিক সৈনিক নির্বাচন করুন!');
      return;
    }

    const isDistinction =
      formGrade.includes('1st Class') ||
      formGrade.includes('Marksman') ||
      formGrade.includes('Distinction');

    const newRecord: TrgRecord = {
      id: `trg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      module: formModule,
      snkNo: soldier.snkNo,
      name: soldier.name,
      rk: soldier.rk,
      battery: soldier.battery,
      grade: formGrade,
      scoreDetails: formScore || 'Standard Completed',
      date: formDate,
      location: formLocation || TRG_MODULE_CONFIGS[formModule].defaultLocation,
      status: isDistinction ? 'Distinction' : 'Qualified',
      remarks: formRemarks || `${formModule} Evaluation Completed`,
    };

    setRecords((prev) => [newRecord, ...prev]);
    setIsAddModalOpen(false);
    showNotification(`${soldier.name}-এর ${formModule} ফলাফল সফলভাবে সংরক্ষিত হয়েছে।`);
  };

  // Delete Record
  const handleDeleteRecord = (id: string, name: string) => {
    if (isGuest) {
      showNotification('Guest mode is view-only.');
      return;
    }
    setRecords((prev) => prev.filter((r) => r.id !== id));
    showNotification(`${name}-এর রেকর্ড সফলভাবে মুছে ফেলা হয়েছে।`);
  };

  // Quick print handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* ========================================================= */}
      {/* Header Banner: 10 Med Regimental Training Console         */}
      {/* ========================================================= */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/40 border border-emerald-500/30 p-5 sm:p-7 shadow-2xl space-y-4">
        <div className="absolute right-0 top-0 bottom-0 w-2/5 bg-radial-gradient from-emerald-500/10 via-emerald-600/5 to-transparent pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                <span>10 Medium Regiment Artillery — Training State (Trg State)</span>
              </span>
              <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                <span>ACTIVE EVALUATION CYCLE</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white font-sans tracking-tight">
              Regimental Training & Firing State Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              রেজিমেন্টাল প্রস্তুতি মূল্যায়ন (RET), শারীরিক সক্ষমতা (IPFT), গ্রেনেড লাইভ ফায়ারিং ও অ্যানুয়াল ফায়ারিং রোস্টার
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => handleOpenAddModal()}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-950/40 cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন রেকর্ড যুক্ত করুন</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-all cursor-pointer inline-flex items-center gap-1.5"
              title="প্রশিক্ষণ স্টেটাস প্রিন্ট করুন"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">প্রিন্ট</span>
            </button>
          </div>
        </div>

        {/* Global Summary KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-mono">RET Qualified</div>
              <div className="text-lg font-bold font-mono text-white">{moduleCounts.RET} Soldiers</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-mono">IPFT Tested</div>
              <div className="text-lg font-bold font-mono text-white">{moduleCounts.IPFT} Soldiers</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-mono">Grenade Fired</div>
              <div className="text-lg font-bold font-mono text-white">{moduleCounts['Gren Firing']} Live</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Crosshair className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-mono">Weapon Classified</div>
              <div className="text-lg font-bold font-mono text-white">{moduleCounts.Firing} Classified</div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4 Interactive Training Boxes: RET, IPFT, Gren Firing, Firing */}
      {/* ========================================================= */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-emerald-400" />
              <span>Select Training Module to View Details (প্রশিক্ষণ মডিউল নির্বাচন করুন)</span>
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
            যেকোনো বক্সে ক্লিক করে সেই প্রশিক্ষণে অংশগ্রহণকারীদের তালিকা দেখুন
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* ---------------- 1. RET Box ---------------- */}
          <div
            onClick={() => handleSelectBox('RET')}
            className={`relative rounded-2xl p-4 sm:p-5 transition-all duration-200 cursor-pointer shadow-lg group select-none border ${
              selectedModule === 'RET'
                ? 'bg-gradient-to-br from-amber-950/60 via-slate-900 to-slate-950 border-amber-500/80 ring-2 ring-amber-500/50 shadow-amber-950/30'
                : 'bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/15 border-slate-700/80 hover:border-amber-500/50 hover:bg-slate-850'
            }`}
          >
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold border transition-colors ${
                    selectedModule === 'RET'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/30'
                      : 'bg-amber-500/15 border-amber-500/30 text-amber-400 group-hover:bg-amber-500/25'
                  }`}
                >
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white tracking-tight font-sans">
                      RET
                    </h3>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {moduleCounts.RET} জন
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">Ready Evaluation Test</p>
                </div>
              </div>

              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  selectedModule === 'RET'
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-800 text-amber-300 border-slate-700'
                }`}
              >
                {selectedModule === 'RET' ? 'সক্রিয় ✓' : 'তালিকা'}
              </span>
            </div>

            <p className="mt-2.5 text-xs text-slate-300 line-clamp-2">
              আর্টিলারি গান ড্রিল, ম্যাপ রিডিং, অস্ত্র ডিসঅ্যাসেম্বলি ও টেকটিক্যাল জ্ঞান মূল্যায়ন
            </p>

            <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
              <span className={selectedModule === 'RET' ? 'text-amber-300 font-bold' : 'text-slate-400'}>
                {selectedModule === 'RET' ? 'রোস্টার প্রদর্শিত হচ্ছে' : 'ক্লিক করে তালিকা দেখুন'}
              </span>
              <ChevronRight
                className={`w-3.5 h-3.5 transition-transform ${
                  selectedModule === 'RET'
                    ? 'text-amber-400 translate-x-1'
                    : 'text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1'
                }`}
              />
            </div>
          </div>

          {/* ---------------- 2. IPFT Box ---------------- */}
          <div
            onClick={() => handleSelectBox('IPFT')}
            className={`relative rounded-2xl p-4 sm:p-5 transition-all duration-200 cursor-pointer shadow-lg group select-none border ${
              selectedModule === 'IPFT'
                ? 'bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 border-emerald-500/80 ring-2 ring-emerald-500/50 shadow-emerald-950/30'
                : 'bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/15 border-slate-700/80 hover:border-emerald-500/50 hover:bg-slate-850'
            }`}
          >
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold border transition-colors ${
                    selectedModule === 'IPFT'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/30'
                      : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 group-hover:bg-emerald-500/25'
                  }`}
                >
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white tracking-tight font-sans">
                      IPFT
                    </h3>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {moduleCounts.IPFT} জন
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">Physical Fitness Test</p>
                </div>
              </div>

              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  selectedModule === 'IPFT'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-800 text-emerald-300 border-slate-700'
                }`}
              >
                {selectedModule === 'IPFT' ? 'সক্রিয় ✓' : 'তালিকা'}
              </span>
            </div>

            <p className="mt-2.5 text-xs text-slate-300 line-clamp-2">
              ১.৬ কিমি দৌড়, পুশ-আপ, চিন-আপ ও সিট-আপের শারীরিক সক্ষমতা পরীক্ষা ও ফলাফল
            </p>

            <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
              <span className={selectedModule === 'IPFT' ? 'text-emerald-300 font-bold' : 'text-slate-400'}>
                {selectedModule === 'IPFT' ? 'রোস্টার প্রদর্শিত হচ্ছে' : 'ক্লিক করে তালিকা দেখুন'}
              </span>
              <ChevronRight
                className={`w-3.5 h-3.5 transition-transform ${
                  selectedModule === 'IPFT'
                    ? 'text-emerald-400 translate-x-1'
                    : 'text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1'
                }`}
              />
            </div>
          </div>

          {/* ---------------- 3. Gren Firing Box ---------------- */}
          <div
            onClick={() => handleSelectBox('Gren Firing')}
            className={`relative rounded-2xl p-4 sm:p-5 transition-all duration-200 cursor-pointer shadow-lg group select-none border ${
              selectedModule === 'Gren Firing'
                ? 'bg-gradient-to-br from-rose-950/60 via-slate-900 to-slate-950 border-rose-500/80 ring-2 ring-rose-500/50 shadow-rose-950/30'
                : 'bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/15 border-slate-700/80 hover:border-rose-500/50 hover:bg-slate-850'
            }`}
          >
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold border transition-colors ${
                    selectedModule === 'Gren Firing'
                      ? 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/30'
                      : 'bg-rose-500/15 border-rose-500/30 text-rose-400 group-hover:bg-rose-500/25'
                  }`}
                >
                  <Flame className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white tracking-tight font-sans">
                      Gren Firing
                    </h3>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {moduleCounts['Gren Firing']} জন
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">Grenade Live Firing</p>
                </div>
              </div>

              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  selectedModule === 'Gren Firing'
                    ? 'bg-rose-500 text-white border-rose-400'
                    : 'bg-slate-800 text-rose-300 border-slate-700'
                }`}
              >
                {selectedModule === 'Gren Firing' ? 'সক্রিয় ✓' : 'তালিকা'}
              </span>
            </div>

            <p className="mt-2.5 text-xs text-slate-300 line-clamp-2">
              লাইভ এইচই গ্রেনেড থ্রোয়িং, বিস্ফোরণ নিরাপত্তা, দূরত্ব ও বাঙ্কার লক্ষ্যভেদ মূল্যায়ন
            </p>

            <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
              <span className={selectedModule === 'Gren Firing' ? 'text-rose-300 font-bold' : 'text-slate-400'}>
                {selectedModule === 'Gren Firing' ? 'রোস্টার প্রদর্শিত হচ্ছে' : 'ক্লিক করে তালিকা দেখুন'}
              </span>
              <ChevronRight
                className={`w-3.5 h-3.5 transition-transform ${
                  selectedModule === 'Gren Firing'
                    ? 'text-rose-400 translate-x-1'
                    : 'text-slate-500 group-hover:text-rose-400 group-hover:translate-x-1'
                }`}
              />
            </div>
          </div>

          {/* ---------------- 4. Firing Box ---------------- */}
          <div
            onClick={() => handleSelectBox('Firing')}
            className={`relative rounded-2xl p-4 sm:p-5 transition-all duration-200 cursor-pointer shadow-lg group select-none border ${
              selectedModule === 'Firing'
                ? 'bg-gradient-to-br from-cyan-950/60 via-slate-900 to-slate-950 border-cyan-500/80 ring-2 ring-cyan-500/50 shadow-cyan-950/30'
                : 'bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/15 border-slate-700/80 hover:border-cyan-500/50 hover:bg-slate-850'
            }`}
          >
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold border transition-colors ${
                    selectedModule === 'Firing'
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/30'
                      : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400 group-hover:bg-cyan-500/25'
                  }`}
                >
                  <Crosshair className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white tracking-tight font-sans">
                      Firing
                    </h3>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      {moduleCounts.Firing} জন
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">Annual Weapon Firing</p>
                </div>
              </div>

              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  selectedModule === 'Firing'
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                    : 'bg-slate-800 text-cyan-300 border-slate-700'
                }`}
              >
                {selectedModule === 'Firing' ? 'সক্রিয় ✓' : 'তালিকা'}
              </span>
            </div>

            <p className="mt-2.5 text-xs text-slate-300 line-clamp-2">
              ব্যক্তিগত অস্ত্র বিডি-০৮ / পিস্তল ক্লাসিফিকেশন, গ্রুপিং ও মার্কসম্যান স্কোরিং
            </p>

            <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
              <span className={selectedModule === 'Firing' ? 'text-cyan-300 font-bold' : 'text-slate-400'}>
                {selectedModule === 'Firing' ? 'রোস্টার প্রদর্শিত হচ্ছে' : 'ক্লিক করে তালিকা দেখুন'}
              </span>
              <ChevronRight
                className={`w-3.5 h-3.5 transition-transform ${
                  selectedModule === 'Firing'
                    ? 'text-cyan-400 translate-x-1'
                    : 'text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1'
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* DETAILED ROSTER TABLE FOR SELECTED TRAINING MODULE        */}
      {/* ========================================================= */}
      <div
        ref={rosterTableRef}
        className="rounded-2xl bg-slate-900/95 border border-slate-700/80 p-4 sm:p-5 shadow-2xl backdrop-blur-md space-y-4"
      >
        {/* Table Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold border shrink-0 ${
                selectedModule === 'RET'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : selectedModule === 'IPFT'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : selectedModule === 'Gren Firing'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              }`}
            >
              {selectedModule === 'RET' ? (
                <Award className="w-5 h-5" />
              ) : selectedModule === 'IPFT' ? (
                <Activity className="w-5 h-5" />
              ) : selectedModule === 'Gren Firing' ? (
                <Flame className="w-5 h-5" />
              ) : (
                <Crosshair className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white font-sans tracking-tight">
                  {TRG_MODULE_CONFIGS[selectedModule].title}
                </h3>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700">
                  {filteredRecords.length} জন সৈনিক তালিকাভুক্ত
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {TRG_MODULE_CONFIGS[selectedModule].bengaliTitle} — {TRG_MODULE_CONFIGS[selectedModule].description}
              </p>
            </div>
          </div>

          {/* Controls: Add, Battery Filter, Search */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Battery Pills */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
              {(['All', 'HQ Bty', 'P Bty', 'Q Bty', 'R Bty', 'EME'] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setBtyFilter(b)}
                  className={`px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    btyFilter === b
                      ? 'bg-emerald-600 text-white font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {b === 'All' ? 'সব' : b.replace(' Bty', '')}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="খুঁজুন (নাম / নং)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-2.5 py-1 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-36 sm:w-44"
              />
            </div>

            {/* Add Record Button */}
            <button
              onClick={() => handleOpenAddModal(selectedModule)}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer shrink-0 inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">যুক্ত করুন</span>
            </button>
          </div>
        </div>

        {/* Sub-Filters / Grade Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          <span className="text-[11px] text-slate-400 font-mono mr-1">ফলাফল ফিল্টার:</span>
          {[
            { id: 'All', label: 'সকল ফলাফল' },
            { id: 'Distinction', label: '1st Class / Marksman / Distinction' },
            { id: 'Qualified', label: 'Qualified (উত্তীর্ণ)' },
            { id: 'Passed', label: 'Passed' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setGradeFilter(cat.id)}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all cursor-pointer whitespace-nowrap border ${
                gradeFilter === cat.id
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Table Content */}
        {filteredRecords.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500">
              <Target className="w-6 h-6" />
            </div>
            <p className="text-sm text-slate-300 font-semibold">কোনো প্রশিক্ষণ রেকর্ড পাওয়া যায়নি</p>
            <p className="text-xs text-slate-500">
              ফিল্টার পরিবর্তন করুন অথবা &ldquo;নতুন রেকর্ড যুক্ত করুন&rdquo; বাটনে ক্লিক করে ফলাফল এন্ট্রি দিন।
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">সেনা নং</th>
                  <th className="py-2.5 px-3">র‍্যাংক ও নাম</th>
                  <th className="py-2.5 px-3">ব্যাটারী</th>
                  <th className="py-2.5 px-3">ফলাফল / গ্রেড (Result)</th>
                  <th className="py-2.5 px-3">পারফরম্যান্স ও স্কোর বিবরণ</th>
                  <th className="py-2.5 px-3">তারিখ ও রেঞ্জ লোকেশন</th>
                  <th className="py-2.5 px-3">মন্তব্য</th>
                  <th className="py-2.5 px-3 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {filteredRecords.map((item, idx) => {
                  const person = findPerson(item.snkNo) || {
                    id: item.id,
                    snkNo: item.snkNo,
                    rk: item.rk,
                    trade: '-',
                    name: item.name,
                    battery: item.battery,
                    status: 'In Unit',
                    statusDetails: `${item.module} Qualified: ${item.grade}`,
                    phone: '',
                  };

                  const isDistinction =
                    item.status === 'Distinction' ||
                    item.grade.includes('Marksman') ||
                    item.grade.includes('1st Class') ||
                    item.grade.includes('Distinction');

                  return (
                    <tr
                      key={item.id || idx}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* SL */}
                      <td className="py-2.5 px-3 text-center text-slate-500 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Snk No */}
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-300">
                        {item.snkNo}
                      </td>

                      {/* Rank & Name */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <RankBadge rank={item.rk} size="sm" />
                          <span className="font-semibold text-white">{item.name}</span>
                        </div>
                      </td>

                      {/* Battery */}
                      <td className="py-2.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                          {item.battery}
                        </span>
                      </td>

                      {/* Result / Grade */}
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${
                            isDistinction
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          }`}
                        >
                          {isDistinction ? (
                            <Award className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                          <span>{item.grade}</span>
                        </span>
                      </td>

                      {/* Performance & Score */}
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300">
                        <div className="max-w-[280px] truncate" title={item.scoreDetails}>
                          {item.scoreDetails}
                        </div>
                      </td>

                      {/* Date & Location */}
                      <td className="py-2.5 px-3 text-[11px]">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 font-mono text-slate-300">
                            <Calendar className="w-3 h-3 text-emerald-400" />
                            <span>{item.date}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 truncate max-w-[160px]">
                            <MapPin className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                            <span className="truncate">{item.location}</span>
                          </div>
                        </div>
                      </td>

                      {/* Remarks */}
                      <td className="py-2.5 px-3 text-[11px] text-slate-400">
                        <div className="max-w-[160px] truncate" title={item.remarks || ''}>
                          {item.remarks || '—'}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onViewDossier(person)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 hover:border-emerald-500/50 text-[11px] font-semibold transition-all cursor-pointer inline-flex items-center gap-1"
                            title="সৈনিকের ডসিয়ার দেখুন"
                          >
                            <Eye className="w-3 h-3" />
                            <span>ডসিয়ার</span>
                          </button>

                          {!isGuest && (
                            <button
                              onClick={() => handleDeleteRecord(item.id, item.name)}
                              className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                              title="রেকর্ড মুছে ফেলুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL: Record New Training / Firing Result               */}
      {/* ========================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white font-sans">
                  প্রশিক্ষণ ফলাফল এন্ট্রি (Record Training State)
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="space-y-3.5 text-xs">
              {/* Select Training Module */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  প্রশিক্ষণ মডিউল (Training Module)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['RET', 'IPFT', 'Gren Firing', 'Firing'] as TrgModuleType[]).map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => {
                        setFormModule(m);
                        setFormLocation(TRG_MODULE_CONFIGS[m].defaultLocation);
                        setFormScore(TRG_MODULE_CONFIGS[m].sampleScores);
                        setFormGrade(
                          m === 'IPFT'
                            ? '1st Class'
                            : m === 'Firing'
                            ? 'Marksman Shot'
                            : m === 'Gren Firing'
                            ? 'Qualified (Live Fired)'
                            : 'Qualified (Grade A)'
                        );
                      }}
                      className={`py-2 rounded-xl font-bold border transition-all cursor-pointer text-center text-xs ${
                        formModule === m
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Select Soldier */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  সৈনিক নির্বাচন করুন (Nominate Soldier)
                </label>
                <select
                  value={selectedSoldierSnkNo}
                  onChange={(e) => setSelectedSoldierSnkNo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  required
                >
                  {personnelList.map((p) => (
                    <option key={p.id} value={p.snkNo}>
                      {p.snkNo} — {p.rk} {p.name} ({p.battery})
                    </option>
                  ))}
                </select>
              </div>

              {/* Grade / Classification */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  গ্রেড / ফলাফল (Grade / Classification)
                </label>
                <input
                  type="text"
                  value={formGrade}
                  onChange={(e) => setFormGrade(e.target.value)}
                  placeholder="e.g. 1st Class, Marksman, Qualified (Grade A)..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* Performance Score Details */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  পারফরম্যান্স বিবরণ ও স্কোর (Performance Score Details)
                </label>
                <input
                  type="text"
                  value={formScore}
                  onChange={(e) => setFormScore(e.target.value)}
                  placeholder="e.g. 1.6km: 5m 30s | Push-ups: 44 | Chin-ups: 12"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Date & Location */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">তারিখ (Date)</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">রেঞ্জ / ভেন্যু (Venue)</label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g. Bhatiary / Halishahar..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">মন্তব্য (Remarks)</label>
                <input
                  type="text"
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  placeholder="Optional remarks..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer shadow-lg shadow-emerald-950/40"
                >
                  রেকর্ড সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
