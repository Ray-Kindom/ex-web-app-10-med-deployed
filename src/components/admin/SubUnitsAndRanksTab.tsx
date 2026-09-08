import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { SubUnitConfig, RankConfig, RankCategory, TradeConfig, TradeCategory } from '../../types';
import {
  Shield,
  Layers,
  Award,
  Briefcase,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  UserCheck,
} from 'lucide-react';

const RANK_CATEGORIES: RankCategory[] = ['Officer', 'JCO', 'OR', 'RCO', 'NC(E)', 'NC(U)', 'Civilian'];
const TRADE_CATEGORIES: { key: TradeCategory; label: string; color: string }[] = [
  { key: 'COMBAT', label: 'Combat', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  { key: 'TECHNICAL', label: 'Technical', color: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' },
  { key: 'SERVICES', label: 'Services', color: 'bg-rose-500/10 text-rose-300 border-rose-500/30' },
  { key: 'SUPPORT', label: 'Support', color: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' },
  { key: 'CIVILIAN', label: 'Civilian', color: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
  { key: 'OTHER', label: 'Other', color: 'bg-slate-800 text-slate-300 border-slate-700' },
];

export const SubUnitsAndRanksTab: React.FC = () => {
  const {
    subUnitsList,
    addSubUnit,
    updateSubUnit,
    deleteSubUnit,
    ranksList,
    addRank,
    updateRank,
    deleteRank,
    tradesList,
    addTrade,
    updateTrade,
    deleteTrade,
    isAdmin,
    showNotification,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'SUB_UNITS' | 'RANKS' | 'TRADES'>('RANKS');

  // Sub-Unit form
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [editingUnit, setEditingUnit] = useState<SubUnitConfig | null>(null);
  const [unitName, setUnitName] = useState('');
  const [unitCode, setUnitCode] = useState('');
  const [unitRole, setUnitRole] = useState<'HQ' | 'GUN_BATTERY' | 'OTHER'>('GUN_BATTERY');

  // Rank form
  const [isAddingRank, setIsAddingRank] = useState(false);
  const [editingRank, setEditingRank] = useState<RankConfig | null>(null);
  const [rankName, setRankName] = useState('');
  const [rankBangla, setRankBangla] = useState('');
  const [rankCategory, setRankCategory] = useState<RankCategory>('OR');
  const [rankEnlistment, setRankEnlistment] = useState(true);
  const [selectedRankCategoryFilter, setSelectedRankCategoryFilter] = useState<string>('ALL');

  // Trade form
  const [isAddingTrade, setIsAddingTrade] = useState(false);
  const [editingTrade, setEditingTrade] = useState<TradeConfig | null>(null);
  const [tradeName, setTradeName] = useState('');
  const [tradeCode, setTradeCode] = useState('');
  const [tradeBangla, setTradeBangla] = useState('');
  const [tradeCategory, setTradeCategory] = useState<TradeCategory>('COMBAT');
  const [tradeDescription, setTradeDescription] = useState('');
  const [tradeEnlistment, setTradeEnlistment] = useState(true);
  const [tradeRankCategories, setTradeRankCategories] = useState<RankCategory[]>(['OR']);
  const [tradeSearchQuery, setTradeSearchQuery] = useState('');
  const [selectedTradeCategoryFilter, setSelectedTradeCategoryFilter] = useState<string>('ALL');

  if (!isAdmin) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900 border border-amber-500/30 text-center space-y-3">
        <Shield className="w-12 h-12 text-amber-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">ADMIN Access Required</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Sub Units, Ranks, and Trades structure is reserved strictly for the System Administrator.
        </p>
      </div>
    );
  }

  // --- SUB UNIT HANDLERS ---
  const handleOpenAddUnit = () => {
    setUnitName('');
    setUnitCode('');
    setUnitRole('GUN_BATTERY');
    setEditingUnit(null);
    setIsAddingUnit(true);
  };

  const handleOpenEditUnit = (u: SubUnitConfig) => {
    setUnitName(u.name);
    setUnitCode(u.code);
    setUnitRole((u.role as any) || 'GUN_BATTERY');
    setEditingUnit(u);
    setIsAddingUnit(true);
  };

  const handleSaveUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitName.trim()) return;

    if (editingUnit) {
      updateSubUnit(editingUnit.id, {
        name: unitName.trim(),
        code: unitCode.trim() || unitName.trim().toUpperCase(),
        role: unitRole,
      });
      showNotification(`Sub Unit "${unitName}" updated.`);
    } else {
      addSubUnit({
        name: unitName.trim(),
        code: unitCode.trim() || unitName.trim().toUpperCase(),
        role: unitRole,
        order: subUnitsList.length + 1,
        isActive: true,
      });
      showNotification(`Sub Unit "${unitName}" created.`);
    }
    setIsAddingUnit(false);
  };

  // --- RANK HANDLERS ---
  const handleOpenAddRank = () => {
    setRankName('');
    setRankBangla('');
    setRankCategory('OR');
    setRankEnlistment(true);
    setEditingRank(null);
    setIsAddingRank(true);
  };

  const handleOpenEditRank = (r: RankConfig) => {
    setRankName(r.name);
    setRankBangla(r.banglaName || '');
    setRankCategory(r.category);
    setRankEnlistment(r.applicableForEnlistment !== false);
    setEditingRank(r);
    setIsAddingRank(true);
  };

  const handleSaveRank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rankName.trim()) return;

    if (editingRank) {
      updateRank(editingRank.id, {
        name: rankName.trim(),
        code: rankName.trim(),
        banglaName: rankBangla.trim(),
        category: rankCategory,
        applicableForEnlistment: rankEnlistment,
      });
      showNotification(`Rank "${rankName}" updated.`);
    } else {
      addRank({
        name: rankName.trim(),
        code: rankName.trim(),
        banglaName: rankBangla.trim(),
        category: rankCategory,
        order: ranksList.length + 1,
        seniority: ranksList.length + 1,
        isActive: true,
        applicableForEnlistment: rankEnlistment,
      });
      showNotification(`Rank "${rankName}" created.`);
    }
    setIsAddingRank(false);
  };

  // --- TRADE HANDLERS ---
  const handleOpenAddTrade = () => {
    setTradeName('');
    setTradeCode('');
    setTradeBangla('');
    setTradeCategory('COMBAT');
    setTradeDescription('');
    setTradeEnlistment(true);
    setTradeRankCategories(['OR']);
    setEditingTrade(null);
    setIsAddingTrade(true);
  };

  const handleOpenEditTrade = (t: TradeConfig) => {
    setTradeName(t.name);
    setTradeCode(t.code);
    setTradeBangla(t.banglaName || '');
    setTradeCategory((t.category as TradeCategory) || 'COMBAT');
    setTradeDescription(t.description || '');
    setTradeEnlistment(t.applicableForEnlistment !== false);
    setTradeRankCategories(t.applicableRankCategories || ['OR']);
    setEditingTrade(t);
    setIsAddingTrade(true);
  };

  const handleToggleTradeRankCategory = (cat: RankCategory) => {
    setTradeRankCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSaveTrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tradeName.trim()) return;

    const finalCode = tradeCode.trim() || tradeName.trim();

    if (editingTrade) {
      updateTrade(editingTrade.id, {
        name: tradeName.trim(),
        code: finalCode,
        banglaName: tradeBangla.trim(),
        category: tradeCategory,
        description: tradeDescription.trim(),
        applicableForEnlistment: tradeEnlistment,
        applicableRankCategories: tradeRankCategories,
      });
      showNotification(`Trade "${tradeName}" updated.`);
    } else {
      addTrade({
        name: tradeName.trim(),
        code: finalCode,
        banglaName: tradeBangla.trim(),
        category: tradeCategory,
        description: tradeDescription.trim(),
        applicableForEnlistment: tradeEnlistment,
        applicableRankCategories: tradeRankCategories,
        order: tradesList.length + 1,
        isActive: true,
      });
      showNotification(`Trade "${tradeName}" created.`);
    }
    setIsAddingTrade(false);
  };

  // Filtered lists
  const filteredRanks = useMemo(() => {
    if (selectedRankCategoryFilter === 'ALL') return ranksList;
    return ranksList.filter((r) => r.category === selectedRankCategoryFilter);
  }, [ranksList, selectedRankCategoryFilter]);

  const filteredTrades = useMemo(() => {
    return tradesList.filter((t) => {
      if (selectedTradeCategoryFilter !== 'ALL' && t.category !== selectedTradeCategoryFilter) {
        return false;
      }
      if (tradeSearchQuery.trim()) {
        const q = tradeSearchQuery.toLowerCase();
        const matchesName = t.name.toLowerCase().includes(q);
        const matchesCode = t.code.toLowerCase().includes(q);
        const matchesBangla = t.banglaName ? t.banglaName.toLowerCase().includes(q) : false;
        const matchesDesc = t.description ? t.description.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesCode && !matchesBangla && !matchesDesc) return false;
      }
      return true;
    });
  }, [tradesList, selectedTradeCategoryFilter, tradeSearchQuery]);

  return (
    <div className="space-y-6">
      {/* Sub tabs navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveSubTab('RANKS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'RANKS'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white bg-slate-900'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Military Ranks ({ranksList.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('TRADES')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'TRADES'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white bg-slate-900'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Trades & Specializations ({tradesList.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('SUB_UNITS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'SUB_UNITS'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white bg-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Sub Units & Batteries ({subUnitsList.length})</span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 px-3 py-1 rounded-lg border border-emerald-800/40 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Realtime Synchronized with Cloud & Enlistment System</span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. SUB UNITS SECTION */}
      {/* ========================================================= */}
      {activeSubTab === 'SUB_UNITS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            <div>
              <h4 className="text-sm font-bold text-white">Sub Units & Batteries Configuration</h4>
              <p className="text-xs text-slate-400">
                Define the artillery batteries (HQ Bty, P Bty, Q Bty, R Bty, Workshop Detachment).
              </p>
            </div>
            <button
              onClick={handleOpenAddUnit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Sub Unit</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {subUnitsList.map((unit, idx) => (
              <div
                key={unit.id}
                className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[10px] font-mono text-slate-500 w-5">#{idx + 1}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white truncate">{unit.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-rose-400 border border-slate-700">
                        {unit.code}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 block truncate">
                      Role: {unit.role || 'GUN_BATTERY'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditUnit(unit)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Edit Sub Unit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Delete Sub Unit "${unit.name}"?`)) {
                        deleteSubUnit(unit.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                    title="Delete Sub Unit"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. MILITARY RANKS SECTION */}
      {/* ========================================================= */}
      {activeSubTab === 'RANKS' && (
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            <div>
              <h4 className="text-sm font-bold text-white">Military & Civilian Ranks Hierarchy</h4>
              <p className="text-xs text-slate-400">
                Any rank added, edited, or toggled here updates everywhere: Soldier Enlistment modal, Nominal Roll, and User Accounts.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setSelectedRankCategoryFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    selectedRankCategoryFilter === 'ALL'
                      ? 'bg-rose-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({ranksList.length})
                </button>
                {RANK_CATEGORIES.map((cat) => {
                  const count = ranksList.filter((r) => r.category === cat).length;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedRankCategoryFilter(cat)}
                      className={`px-2 py-1 rounded-lg font-medium transition-colors ${
                        selectedRankCategoryFilter === cat
                          ? 'bg-slate-800 text-rose-400 font-bold border border-slate-700'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cat} ({count})
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleOpenAddRank}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Rank</span>
              </button>
            </div>
          </div>

          {/* Ranks Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {filteredRanks.map((rank, idx) => {
              const badgeColor =
                rank.category === 'Officer'
                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                  : rank.category === 'JCO'
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : rank.category === 'Civilian'
                  ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                  : rank.category === 'RCO'
                  ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';

              const isEnlistmentEnabled = rank.applicableForEnlistment !== false;
              const isRankActive = rank.isActive !== false;

              return (
                <div
                  key={rank.id}
                  className={`p-3 rounded-xl bg-slate-900 border transition-all flex flex-col justify-between gap-2.5 text-xs ${
                    isRankActive ? 'border-slate-800 hover:border-slate-700' : 'border-slate-800/50 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-500 w-5">#{idx + 1}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-sm">{rank.name}</span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${badgeColor}`}>
                            {rank.category}
                          </span>
                        </div>
                        {rank.banglaName && (
                          <span className="text-[11px] text-slate-400 block">{rank.banglaName}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditRank(rank)}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Edit Rank Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`Delete rank "${rank.name}"?`)) {
                            deleteRank(rank.id);
                          }
                        }}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="Delete Rank"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Quick Controls: Enlistment Available + Active Status */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                    <button
                      onClick={() =>
                        updateRank(rank.id, { applicableForEnlistment: !isEnlistmentEnabled })
                      }
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded transition-colors cursor-pointer border ${
                        isEnlistmentEnabled
                          ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/50 hover:bg-emerald-900/50'
                          : 'bg-slate-800/60 text-slate-500 border-slate-700/50 hover:bg-slate-800'
                      }`}
                      title="Click to toggle availability in Enlist Soldier modal"
                    >
                      <UserCheck className="w-3 h-3" />
                      <span>{isEnlistmentEnabled ? 'Enlist: ON' : 'Enlist: OFF'}</span>
                    </button>

                    <button
                      onClick={() => updateRank(rank.id, { isActive: !isRankActive })}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded transition-colors cursor-pointer border ${
                        isRankActive
                          ? 'bg-cyan-950/50 text-cyan-300 border-cyan-800/50 hover:bg-cyan-900/50'
                          : 'bg-rose-950/50 text-rose-400 border-rose-800/50 hover:bg-rose-900/50'
                      }`}
                      title="Click to toggle active status"
                    >
                      {isRankActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      <span>{isRankActive ? 'Active' : 'Disabled'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. TRADES & SPECIALIZATIONS SECTION */}
      {/* ========================================================= */}
      {activeSubTab === 'TRADES' && (
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            <div>
              <h4 className="text-sm font-bold text-white">Military Trades & Specializations (Dynamic)</h4>
              <p className="text-xs text-slate-400">
                Manage Artillery and Armed Forces trades (Gnr, TA, OCU, DMT, E&BR, Tailor, Ck(U), etc.). You decide which rank categories can have each trade!
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={tradeSearchQuery}
                  onChange={(e) => setTradeSearchQuery(e.target.value)}
                  placeholder="Search trade..."
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 w-36 sm:w-48 font-sans"
                />
              </div>

              <button
                onClick={handleOpenAddTrade}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Trade</span>
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setSelectedTradeCategoryFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors ${
                selectedTradeCategoryFilter === 'ALL'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              All Trades ({tradesList.length})
            </button>
            {TRADE_CATEGORIES.map((cat) => {
              const count = tradesList.filter((t) => t.category === cat.key).length;
              return (
                <button
                  key={cat.key}
                  onClick={() => setSelectedTradeCategoryFilter(cat.key)}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition-colors border ${
                    selectedTradeCategoryFilter === cat.key
                      ? `${cat.color} font-bold shadow-sm`
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800'
                  }`}
                >
                  {cat.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Trades Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {filteredTrades.map((trade, idx) => {
              const catConfig = TRADE_CATEGORIES.find((c) => c.key === trade.category) || {
                key: 'OTHER',
                label: trade.category || 'OTHER',
                color: 'bg-slate-800 text-slate-300 border-slate-700',
              };

              const isTradeActive = trade.isActive !== false;
              const isTradeEnlistment = trade.applicableForEnlistment !== false;

              return (
                <div
                  key={trade.id}
                  className={`p-3 rounded-xl bg-slate-900 border transition-all flex flex-col justify-between gap-2.5 text-xs ${
                    isTradeActive ? 'border-slate-800 hover:border-slate-700' : 'border-slate-800/50 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-mono text-slate-500 w-5">#{idx + 1}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-sm font-mono truncate">
                            {trade.name}
                          </span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${catConfig.color}`}>
                            {catConfig.label}
                          </span>
                        </div>
                        {trade.banglaName && (
                          <span className="text-[11px] text-slate-400 block truncate">
                            {trade.banglaName}
                          </span>
                        )}
                        {trade.description && (
                          <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5" title={trade.description}>
                            {trade.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleOpenEditTrade(trade)}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Edit Trade"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`Delete Trade "${trade.name}"?`)) {
                            deleteTrade(trade.id);
                          }
                        }}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="Delete Trade"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Applicable Rank Categories display */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[9px] text-slate-500 font-mono">Applies to:</span>
                    {trade.applicableRankCategories && trade.applicableRankCategories.length > 0 ? (
                      trade.applicableRankCategories.map((c) => (
                        <span
                          key={c}
                          className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-950 text-slate-300 border border-slate-800"
                        >
                          {c}
                        </span>
                      ))
                    ) : (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-950 text-slate-400">
                        All Ranks
                      </span>
                    )}
                  </div>

                  {/* Quick Controls: Enlistment Available + Active Status */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                    <button
                      onClick={() =>
                        updateTrade(trade.id, { applicableForEnlistment: !isTradeEnlistment })
                      }
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded transition-colors cursor-pointer border ${
                        isTradeEnlistment
                          ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/50 hover:bg-emerald-900/50'
                          : 'bg-slate-800/60 text-slate-500 border-slate-700/50 hover:bg-slate-800'
                      }`}
                      title="Click to toggle availability in Enlist Soldier modal"
                    >
                      <UserCheck className="w-3 h-3" />
                      <span>{isTradeEnlistment ? 'Enlist: ON' : 'Enlist: OFF'}</span>
                    </button>

                    <button
                      onClick={() => updateTrade(trade.id, { isActive: !isTradeActive })}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded transition-colors cursor-pointer border ${
                        isTradeActive
                          ? 'bg-cyan-950/50 text-cyan-300 border-cyan-800/50 hover:bg-cyan-900/50'
                          : 'bg-rose-950/50 text-rose-400 border-rose-800/50 hover:bg-rose-900/50'
                      }`}
                      title="Click to toggle active status"
                    >
                      {isTradeActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      <span>{isTradeActive ? 'Active' : 'Disabled'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: SUB UNIT CREATE / EDIT */}
      {/* ========================================================= */}
      {isAddingUnit && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span>{editingUnit ? 'Edit Sub Unit' : 'Create Sub Unit'}</span>
              <button onClick={() => setIsAddingUnit(false)}>
                <X className="w-4 h-4 text-slate-400 hover:text-white" />
              </button>
            </h3>

            <form onSubmit={handleSaveUnit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Sub Unit Name *</label>
                <input
                  type="text"
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                  placeholder="e.g. S Bty, Attached Bty"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Short Code</label>
                <input
                  type="text"
                  value={unitCode}
                  onChange={(e) => setUnitCode(e.target.value)}
                  placeholder="e.g. S BTY"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Role</label>
                <select
                  value={unitRole}
                  onChange={(e) => setUnitRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="GUN_BATTERY">Gun Battery</option>
                  <option value="HQ">Headquarters</option>
                  <option value="OTHER">Other Formation</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingUnit(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-md"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: RANK CREATE / EDIT */}
      {/* ========================================================= */}
      {isAddingRank && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span>{editingRank ? 'Edit Military Rank' : 'Add Military / Civilian Rank'}</span>
              <button onClick={() => setIsAddingRank(false)}>
                <X className="w-4 h-4 text-slate-400 hover:text-white" />
              </button>
            </h3>

            <form onSubmit={handleSaveRank} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Rank Title *</label>
                <input
                  type="text"
                  value={rankName}
                  onChange={(e) => setRankName(e.target.value)}
                  placeholder="e.g. Major, Captain, Subedar, Snk, Gnr, Civilian, RCO"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Bangla Name (Optional)</label>
                <input
                  type="text"
                  value={rankBangla}
                  onChange={(e) => setRankBangla(e.target.value)}
                  placeholder="e.g. মেজর, ক্যাপ্টেন, সৈনিক, সিভিলিয়ান"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Rank Category</label>
                <select
                  value={rankCategory}
                  onChange={(e) => setRankCategory(e.target.value as RankCategory)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-semibold focus:outline-none focus:border-rose-500"
                >
                  <option value="Officer">Officer (Commissioned Officer)</option>
                  <option value="JCO">JCO (Junior Commissioned Officer)</option>
                  <option value="OR">OR (Other Rank / Soldier / Gunner)</option>
                  <option value="Civilian">Civilian (HQ Battery Non-Combatant)</option>
                  <option value="RCO">RCO (Religious Teacher)</option>
                </select>
              </div>

              {/* Enlistment checkbox */}
              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={rankEnlistment}
                    onChange={(e) => setRankEnlistment(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 bg-slate-900 border-slate-700"
                  />
                  <div>
                    <span className="font-semibold text-slate-200 block">
                      Available for Soldier Enlistment
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Show in the Rank select dropdown when RSM or Clerk enlists personnel
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingRank(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-md"
                >
                  Save Rank
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: TRADE CREATE / EDIT */}
      {/* ========================================================= */}
      {isAddingTrade && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span>{editingTrade ? 'Edit Military Trade' : 'Add Military Trade & Specialization'}</span>
              <button onClick={() => setIsAddingTrade(false)}>
                <X className="w-4 h-4 text-slate-400 hover:text-white" />
              </button>
            </h3>

            <form onSubmit={handleSaveTrade} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Trade Name / Title *</label>
                  <input
                    type="text"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    placeholder="e.g. TA, DMT, Gunner, Ck(U)"
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Short Code</label>
                  <input
                    type="text"
                    value={tradeCode}
                    onChange={(e) => setTradeCode(e.target.value)}
                    placeholder="e.g. TA, DMT, Gnr"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Bangla Name (Optional)</label>
                  <input
                    type="text"
                    value={tradeBangla}
                    onChange={(e) => setTradeBangla(e.target.value)}
                    placeholder="e.g. গানার স্পেশালিস্ট"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Trade Category</label>
                  <select
                    value={tradeCategory}
                    onChange={(e) => setTradeCategory(e.target.value as TradeCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-semibold focus:outline-none focus:border-rose-500"
                  >
                    <option value="COMBAT">Combat (Artillery / Fire control)</option>
                    <option value="TECHNICAL">Technical (Survey, MT, Optics)</option>
                    <option value="SERVICES">Services (Cook, Mess)</option>
                    <option value="SUPPORT">Support (Clerk, Tailor, Store)</option>
                    <option value="CIVILIAN">Civilian (NC(E), NC(U), Staff)</option>
                    <option value="OTHER">Other Specialization</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description / Duties</label>
                <input
                  type="text"
                  value={tradeDescription}
                  onChange={(e) => setTradeDescription(e.target.value)}
                  placeholder="e.g. Fire Direction, Artillery Computing & Survey"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Applicable Rank Categories Multi-Select Checkboxes */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Applicable Rank Categories (Which ranks can hold this trade)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['OR', 'JCO', 'RCO', 'NC(E)', 'NC(U)', 'Civilian'] as RankCategory[]).map((cat) => {
                    const isChecked = tradeRankCategories.includes(cat);
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => handleToggleTradeRankCategory(cat)}
                        className={`p-2 rounded-xl border flex items-center justify-between text-xs transition-colors cursor-pointer ${
                          isChecked
                            ? 'bg-rose-950/40 border-rose-700 text-rose-300 font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span>{cat}</span>
                        {isChecked && <Check className="w-3.5 h-3.5 text-rose-400" />}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Note: Commissioned Officers never have a trade per Army Regulations.
                </p>
              </div>

              {/* Enlistment Checkbox */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={tradeEnlistment}
                    onChange={(e) => setTradeEnlistment(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 bg-slate-900 border-slate-700"
                  />
                  <div>
                    <span className="font-semibold text-slate-200 block">
                      Available for Soldier Enlistment
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Show in the Trade dropdown when RSM or Clerk enlists personnel
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingTrade(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-md"
                >
                  Save Trade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
