import React, { useState, useMemo, useEffect } from 'react';
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
  Search,
  Plus,
  X,
  Printer,
  Eye,
  Trash2,
  Calendar,
  MapPin,
  CheckCircle2,
  Award,
} from 'lucide-react';

const STORAGE_KEY_TRG = '10MED_TRG_STATE_RECORDS_V1';

interface TrgStatePageProps {
  onViewDossier: (person: Personnel) => void;
  onOpenPrintModal?: () => void;
}

export const TrgStatePage: React.FC<TrgStatePageProps> = ({
  onViewDossier,
}) => {
  const { personnelList, showNotification, isGuest } = useApp();

  // Persistent training state records
  const [records, setRecords] = useState<TrgRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TRG);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_TRG_RECORDS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TRG, JSON.stringify(records));
    } catch (e) {}
  }, [records]);

  // Selected training module (default to 'RET')
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

  // Helper to find soldier by Army / Snk No
  const findPerson = (snkNo: string): Personnel | undefined => {
    return personnelList.find(
      (p) => (p.snkNo || '').trim().toLowerCase() === snkNo.trim().toLowerCase()
    );
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

  // Filtered Records for Selected Module
  const filteredRecords = useMemo(() => {
    let result = records.filter((r) => r.module === selectedModule);

    if (btyFilter !== 'All') {
      result = result.filter((r) => r.battery === btyFilter);
    }

    if (gradeFilter !== 'All') {
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
    setFormLocation(TRG_MODULE_CONFIGS[mod]?.defaultLocation || '10 Med Trg Ground');
    setFormScore(TRG_MODULE_CONFIGS[mod]?.sampleScores || '');
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
      location: formLocation || '10 Med Trg Ground',
      status: isDistinction ? 'Distinction' : 'Qualified',
      remarks: formRemarks || '',
    };

    setRecords((prev) => [newRecord, ...prev]);
    setIsAddModalOpen(false);
    showNotification(`${soldier.name}-এর ${formModule} ফলাফল সংরক্ষণ করা হয়েছে।`);
  };

  // Delete Record
  const handleDeleteRecord = (id: string, name: string) => {
    if (isGuest) {
      showNotification('গেস্ট মোডে ডিলিট অনুমোদিত নয়।');
      return;
    }
    setRecords((prev) => prev.filter((r) => r.id !== id));
    showNotification(`${name}-এর রেকর্ড মুছে ফেলা হয়েছে।`);
  };

  const modules: { id: TrgModuleType; label: string; full: string }[] = [
    { id: 'RET', label: 'RET', full: 'Ready Evaluation Test' },
    { id: 'IPFT', label: 'IPFT', full: 'Physical Fitness Test' },
    { id: 'Gren Firing', label: 'Gren Firing', full: 'Grenade Firing' },
    { id: 'Firing', label: 'Firing', full: 'Annual Weapon Firing' },
  ];

  return (
    <div className="space-y-4 pb-12 animate-fadeIn">
      {/* 1. Header Bar: Minimal, Direct & Clean */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">
              Training State (প্রশিক্ষণ স্টেটাস)
            </h1>
            <p className="text-xs text-slate-400">
              10 Medium Regiment Artillery — RET, IPFT, Grenade & Annual Firing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleOpenAddModal(selectedModule)}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>নতুন রেকর্ড</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            title="প্রিন্ট করুন"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>প্রিন্ট</span>
          </button>
        </div>
      </div>

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
                  ? 'bg-slate-800/90 border-emerald-500/80 shadow-sm ring-1 ring-emerald-500/30'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${
                    isSelected ? 'text-emerald-400' : 'text-slate-300'
                  }`}
                >
                  {m.label}
                </span>
                <span className="font-mono tabular-nums text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {moduleCounts[m.id]}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 truncate">{m.full}</p>
            </button>
          );
        })}
      </div>

      {/* 3. Sleek Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Battery Selector */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            {(['All', 'HQ Bty', 'P Bty', 'Q Bty', 'R Bty', 'EME'] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBtyFilter(b)}
                className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
                  btyFilter === b
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {b === 'All' ? 'সব' : b.replace(' Bty', '')}
              </button>
            ))}
          </div>

          {/* Grade Quick Filter */}
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
                    ? 'bg-slate-800 text-emerald-400 border-emerald-500/40 font-medium'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="সেনা নং বা নাম লিখুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-full sm:w-56"
          />
        </div>
      </div>

      {/* 4. Main Records Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {filteredRecords.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            কোনো প্রশিক্ষণ রেকর্ড পাওয়া যায়নি।
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">সেনা নং</th>
                  <th className="py-2.5 px-3">পদবি ও নাম</th>
                  <th className="py-2.5 px-3">ব্যাটারী</th>
                  <th className="py-2.5 px-3">গ্রেড / ফলাফল</th>
                  <th className="py-2.5 px-3">স্কোর ও বিবরণ</th>
                  <th className="py-2.5 px-3">তারিখ ও স্থান</th>
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
                    phone: '',
                  };

                  const isDistinction =
                    item.status === 'Distinction' ||
                    item.grade.includes('Marksman') ||
                    item.grade.includes('1st Class') ||
                    item.grade.includes('Distinction');

                  return (
                    <tr key={item.id || idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 text-center text-slate-500 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                        {item.snkNo}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <RankBadge rank={item.rk} size="sm" />
                          <button
                            type="button"
                            onClick={() => onViewDossier(person)}
                            className="font-medium text-white hover:text-emerald-400 hover:underline cursor-pointer text-left transition-colors"
                            title="ক্লিক করে ডসিয়ার দেখুন"
                          >
                            {item.name}
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">
                        {item.battery}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold ${
                            isDistinction
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {isDistinction ? (
                            <Award className="w-3 h-3 text-amber-400" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          )}
                          <span>{item.grade}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300">
                        <span title={item.scoreDetails}>{item.scoreDetails}</span>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-400">
                        <div className="flex items-center gap-1 font-mono text-slate-300">
                          <Calendar className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span>{item.date}</span>
                        </div>
                        {item.location && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 truncate max-w-[180px]">
                            <MapPin className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                            <span className="truncate">{item.location}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!isGuest ? (
                            <button
                              onClick={() => handleDeleteRecord(item.id, item.name)}
                              className="p-1.5 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
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

      {/* 5. Clean Add Record Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                <span>নতুন প্রশিক্ষণ রেকর্ড যুক্ত করুন</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="space-y-3 text-xs">
              {/* Module select */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">মডিউল</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['RET', 'IPFT', 'Gren Firing', 'Firing'] as TrgModuleType[]).map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => {
                        setFormModule(m);
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
                      }}
                      className={`py-1.5 rounded-lg font-medium border text-center transition-colors cursor-pointer ${
                        formModule === m
                          ? 'bg-emerald-600 text-white border-emerald-500 font-semibold'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Soldier select */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">সৈনিক নির্বাচন</label>
                <select
                  value={selectedSoldierSnkNo}
                  onChange={(e) => setSelectedSoldierSnkNo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                  required
                >
                  {personnelList.map((p) => (
                    <option key={p.id} value={p.snkNo}>
                      {p.snkNo} — {p.rk} {p.name} ({p.battery})
                    </option>
                  ))}
                </select>
              </div>

              {/* Grade */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">ফলাফল / গ্রেড</label>
                <input
                  type="text"
                  value={formGrade}
                  onChange={(e) => setFormGrade(e.target.value)}
                  placeholder="e.g. 1st Class, Marksman, Qualified..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* Score / Performance */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">স্কোর ও পারফরম্যান্স বিবরণ</label>
                <input
                  type="text"
                  value={formScore}
                  onChange={(e) => setFormScore(e.target.value)}
                  placeholder="e.g. 1.6km: 5m 30s | Push-ups: 44"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Date & Location */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">তারিখ</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">স্থান / ভেন্যু</label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g. Bhatiary / Halishahar..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">মন্তব্য (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  placeholder="মন্তব্য..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer shadow-sm"
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
