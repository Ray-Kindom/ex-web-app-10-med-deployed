import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Battery, ALL_BATTERIES } from '../../types';
import { getRegimentalDutyFrequencyStats } from '../../utils/dutyRotationUtils';
import {
  RotateCcw,
  X,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';

interface DutyRotationStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: string;
  initialBattery?: Battery | 'Consolidated';
}

export const DutyRotationStatsModal: React.FC<DutyRotationStatsModalProps> = ({
  isOpen,
  onClose,
  currentDate,
  initialBattery = 'Consolidated',
}) => {
  const { personnelList, paradeDutyAssignments } = useApp();
  const [selectedBattery, setSelectedBattery] = useState<Battery | 'Consolidated'>(initialBattery);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFatigue, setFilterFatigue] = useState<'all' | 'fresh' | 'fatigued'>('all');

  const statsList = useMemo(() => {
    return getRegimentalDutyFrequencyStats(
      personnelList,
      paradeDutyAssignments,
      currentDate,
      selectedBattery
    );
  }, [personnelList, paradeDutyAssignments, currentDate, selectedBattery]);

  const filteredStats = useMemo(() => {
    let list = statsList;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        ({ person }) =>
          person.name.toLowerCase().includes(q) ||
          person.snkNo.toLowerCase().includes(q) ||
          person.rk.toLowerCase().includes(q)
      );
    }

    if (filterFatigue === 'fresh') {
      list = list.filter(({ history }) => history.fatigueLevel === 'fresh');
    } else if (filterFatigue === 'fatigued') {
      list = list.filter(({ history }) => history.fatigueLevel === 'fatigued');
    }

    return list;
  }, [statsList, searchQuery, filterFatigue]);

  // Overall metric summary
  const summary = useMemo(() => {
    let freshCount = 0;
    let normalCount = 0;
    let fatiguedCount = 0;
    let hadYesterdayCount = 0;

    statsList.forEach(({ history }) => {
      if (history.fatigueLevel === 'fresh') freshCount++;
      else if (history.fatigueLevel === 'fatigued') fatiguedCount++;
      else normalCount++;

      if (history.hadDutyYesterday) hadYesterdayCount++;
    });

    return {
      total: statsList.length,
      freshCount,
      normalCount,
      fatiguedCount,
      hadYesterdayCount,
    };
  }, [statsList]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-200">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Fair Duty Rotation & Rest Audit (ডিউটি সমবন্টন ও ক্লান্তি নিরীক্ষা)
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  RSM Control
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                সৈনিকদের বিগত ৭ ও ৩০ দিনের ডিউটি ইতিহাস, একটানা ডিউটি এলার্ট এবং বিশ্রাম নিশ্চিতকরণ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Summary Strip */}
        <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Total Troops</span>
            <span className="text-base font-bold text-white">{summary.total}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
            <span className="text-emerald-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Rested / Fresh (0 in 7d)</span>
            </span>
            <span className="text-base font-bold text-emerald-400">{summary.freshCount}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-center justify-between">
            <span className="text-amber-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Duty Yesterday (গতকাল)</span>
            </span>
            <span className="text-base font-bold text-amber-400">{summary.hadYesterdayCount}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-center justify-between">
            <span className="text-rose-300 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Fatigued (3+ in 7d)</span>
            </span>
            <span className="text-base font-bold text-rose-400">{summary.fatiguedCount}</span>
          </div>
        </div>

        {/* Filters & Battery Selector Bar */}
        <div className="p-3 bg-slate-900/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedBattery('Consolidated')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedBattery === 'Consolidated'
                  ? 'bg-amber-600 text-white shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              All Batteries ({personnelList.length})
            </button>
            {ALL_BATTERIES.map((bty) => (
              <button
                key={bty}
                onClick={() => setSelectedBattery(bty)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  selectedBattery === bty
                    ? 'bg-amber-600 text-white shadow'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {bty}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Fatigue Filter */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setFilterFatigue('all')}
                className={`px-2 py-1 rounded text-[11px] font-semibold ${
                  filterFatigue === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterFatigue('fresh')}
                className={`px-2 py-1 rounded text-[11px] font-semibold ${
                  filterFatigue === 'fresh'
                    ? 'bg-emerald-600 text-white'
                    : 'text-emerald-400 hover:bg-emerald-950/40'
                }`}
              >
                Fresh First
              </button>
              <button
                onClick={() => setFilterFatigue('fatigued')}
                className={`px-2 py-1 rounded text-[11px] font-semibold ${
                  filterFatigue === 'fatigued'
                    ? 'bg-rose-600 text-white'
                    : 'text-rose-400 hover:bg-rose-950/40'
                }`}
              >
                Fatigued Alert
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-48 sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search soldier..."
                className="w-full pl-8 pr-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Scrollable Table */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="bg-slate-950/90 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
                <th className="py-2.5 px-3">Army No / Snk No</th>
                <th className="py-2.5 px-2">Rank & Name</th>
                <th className="py-2.5 px-2">Battery</th>
                <th className="py-2.5 px-2 text-center">Duty Status</th>
                <th className="py-2.5 px-2 text-center">Past 7 Days</th>
                <th className="py-2.5 px-2 text-center">Past 30 Days</th>
                <th className="py-2.5 px-3">Last Assigned Duty</th>
                <th className="py-2.5 px-3 text-center">Rotation Guidance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredStats.map(({ person, history }) => {
                const isFatigued = history.fatigueLevel === 'fatigued';
                const isFresh = history.fatigueLevel === 'fresh';

                return (
                  <tr
                    key={person.id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      history.hadDutyYesterday ? 'bg-amber-950/15' : ''
                    }`}
                  >
                    <td className="py-2 px-3 font-mono font-bold text-slate-200">
                      {person.snkNo}
                    </td>
                    <td className="py-2 px-2">
                      <div className="font-semibold text-white">
                        {person.rk} {person.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {person.trade || 'GD'}
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] font-bold">
                        {person.battery}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          person.status === 'Present'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : person.status === 'On Duty'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {person.status}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span
                        className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                          history.past7DaysCount === 0
                            ? 'text-emerald-400 bg-emerald-500/10'
                            : history.past7DaysCount >= 3
                            ? 'text-rose-400 bg-rose-500/10'
                            : 'text-slate-300 bg-slate-800'
                        }`}
                      >
                        {history.past7DaysCount} duties
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center font-mono text-slate-400">
                      {history.past30DaysCount}
                    </td>
                    <td className="py-2 px-3">
                      {history.lastDutyName ? (
                        <div>
                          <div className="font-semibold text-slate-200">
                            {history.lastDutyName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            <span>{history.lastDutyDate}</span>
                            {history.daysSinceLastDuty !== null && (
                              <span className="text-amber-400">
                                ({history.daysSinceLastDuty}d ago)
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">No recent record</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {history.hadDutyYesterday ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          <span>Duty Yesterday ({history.yesterdayDuty || 'Guard'})</span>
                        </span>
                      ) : isFresh ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Fully Rested • Recommended</span>
                        </span>
                      ) : isFatigued ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                          <AlertTriangle className="w-3 h-3 text-rose-400" />
                          <span>High Frequency • Rotate</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-mono">Normal Rotation</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>
            Showing <strong className="text-white">{filteredStats.length}</strong> soldiers
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold cursor-pointer"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};
