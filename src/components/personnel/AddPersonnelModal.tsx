import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  MilitaryRank,
  Trade,
  Battery,
  ParadeStatus,
  isOfficerRank,
  ALL_RANKS,
  ALL_TRADES,
  ALL_BATTERIES,
} from '../../types';
import { UnitLogo } from '../common/UnitLogo';
import { X, UserPlus, Shield, UserCheck, Calendar, Hash, Award, Building2 } from 'lucide-react';

interface AddPersonnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBattery?: Battery;
}

export const AddPersonnelModal: React.FC<AddPersonnelModalProps> = ({
  isOpen,
  onClose,
  defaultBattery,
}) => {
  const {
    addPersonnel,
    currentUser,
    ranksList,
    tradesList,
    subUnitsList,
    enlistmentRanks,
    getTradesForRank,
  } = useApp();

  const isAuthorized =
    currentUser.role === 'RSM' ||
    currentUser.role === 'Admin' ||
    currentUser.role === 'CO' ||
    currentUser.role.includes('BSM');

  // Dynamic rank options from Admin configuration
  const availableRanks = React.useMemo(() => {
    const list = enlistmentRanks && Array.isArray(enlistmentRanks) && enlistmentRanks.length > 0
      ? enlistmentRanks
      : (ranksList || []).filter((r) => r && r.isActive !== false);
    return list.length > 0 ? list : [{ id: 'snk', name: 'Snk', code: 'Snk', category: 'OR' as const, order: 1, seniority: 1, isActive: true }];
  }, [enlistmentRanks, ranksList]);

  // Dynamic battery options from Admin configuration
  const availableBatteries = React.useMemo(() => {
    const activeUnits = (subUnitsList || []).filter((u) => u && u.isActive !== false);
    return activeUnits.length > 0 ? activeUnits.map((u) => (u.code || u.name) as Battery) : ALL_BATTERIES;
  }, [subUnitsList]);

  const [snkNo, setSnkNo] = useState('');
  const [batch, setBatch] = useState('');
  const [name, setName] = useState('');
  const [rk, setRk] = useState<MilitaryRank | string>('Snk');

  // Dynamic trades for current rank
  const availableTrades = React.useMemo(() => {
    if (getTradesForRank) {
      const tr = getTradesForRank(rk);
      if (Array.isArray(tr)) return tr;
    }
    return (tradesList || []).filter((t) => t && t.isActive !== false);
  }, [getTradesForRank, rk, tradesList]);

  const [trade, setTrade] = useState<Trade | string>('Gnr');
  const [battery, setBattery] = useState<Battery>(
    defaultBattery || (currentUser.assignedBattery as Battery) || 'HQ Bty'
  );
  const [joiningDate, setJoiningDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [enlistmentSource, setEnlistmentSource] = useState<
    'Posted In from Other Unit' | 'Joined after Training' | 'Re-enlistment' | 'Direct Entry'
  >('Joined after Training');
  const [previousUnit, setPreviousUnit] = useState('');
  const [status, setStatus] = useState<ParadeStatus>('In Unit');
  const [statusDetails, setStatusDetails] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [medicalCategory, setMedicalCategory] = useState<'AYE' | 'BEE' | 'CEE'>('AYE');
  const [nokName, setNokName] = useState('');
  const [phone, setPhone] = useState('');

  // Auto handle officer trade (Officers have NO trade per Bangladesh Army regulations)
  const isOffr = isOfficerRank(rk);

  useEffect(() => {
    if (isOfficerRank(rk)) {
      setTrade('-');
    } else {
      if (trade === '-' || !availableTrades.some((t) => t.name === trade)) {
        setTrade(availableTrades[0]?.name || 'Gnr');
      }
    }
  }, [rk, availableTrades]);

  useEffect(() => {
    if (defaultBattery) {
      setBattery(defaultBattery);
    } else if (currentUser.assignedBattery) {
      setBattery(currentUser.assignedBattery as Battery);
    }
  }, [defaultBattery, currentUser.assignedBattery, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!snkNo.trim() || !name.trim()) {
      alert('Please fill Soldier / BA No and Soldier Name');
      return;
    }

    addPersonnel({
      snkNo: snkNo.trim(),
      batch: batch.trim() || undefined,
      name: name.trim(),
      rk,
      trade: isOffr ? '-' : trade,
      battery,
      joiningDate,
      enlistmentSource,
      previousUnit: previousUnit.trim() || undefined,
      status,
      statusDetails: statusDetails.trim() || undefined,
      bloodGroup,
      medicalCategory,
      nokName: nokName.trim() || undefined,
      phone: phone.trim() || undefined,
      mobileNo: phone.trim() || undefined,
    });

    // Reset fields
    setSnkNo('');
    setBatch('');
    setName('');
    setStatusDetails('');
    setPreviousUnit('');
    setNokName('');
    setPhone('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UnitLogo size="sm" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-wide">
                  Enlist Soldier / নতুন সৈনিক তালিকাভুক্তকরণ
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Nominal Roll Entry
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {/* Section 1: Core Identification */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-3">
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-rose-400" />
              <span>Primary Identification & Bio</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Soldier No / BA No (No) *
                </label>
                <div className="relative">
                  <Hash className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    required
                    value={snkNo}
                    onChange={(e) => setSnkNo(e.target.value)}
                    placeholder="e.g. 1243507 / BA-9921"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-white font-mono focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Batch / Course *
                </label>
                <div className="relative">
                  <Award className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    required
                    value={batch}
                    onChange={(e) => setBatch(e.target.value)}
                    placeholder="e.g. 88 Recruit Batch / 42 BMA"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Full Name (Name) *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Md. Shamsur Rahman"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Rank, Trade, Battery & Joining Date */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-3">
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Rank, Trade & Unit Posting Information</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Rank (র‍্যাঙ্ক) *
                </label>
                <select
                  value={rk}
                  onChange={(e) => setRk(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-medium focus:outline-none focus:border-rose-500"
                >
                  {(availableRanks || []).map((rankOption) => (
                    <option key={rankOption.id} value={rankOption.name}>
                      {rankOption.name} {rankOption.banglaName ? `(${rankOption.banglaName})` : ''} - {rankOption.category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-300 font-semibold">
                    Trade (ট্রেড) *
                  </label>
                  {isOffr && (
                    <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                      Offr (No Trade)
                    </span>
                  )}
                </div>
                {isOffr ? (
                  <input
                    type="text"
                    disabled
                    value="-"
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2 text-slate-400 italic cursor-not-allowed font-mono text-center"
                  />
                ) : (
                  <select
                    value={trade}
                    onChange={(e) => setTrade(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono focus:outline-none focus:border-rose-500"
                  >
                    {(availableTrades || []).map((tradeOption) => (
                      <option key={tradeOption.id} value={tradeOption.name}>
                        {tradeOption.name} {tradeOption.banglaName ? `(${tradeOption.banglaName})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Battery (ব্যাটারি) *
                </label>
                <select
                  value={battery}
                  onChange={(e) => setBattery(e.target.value as Battery)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono focus:outline-none focus:border-rose-500"
                >
                  {(availableBatteries || []).map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                  {!availableBatteries.includes('Civilian') && (
                    <option value="Civilian">Civilian (No Battery)</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Joining Dt (যোগদান তারিখ) *
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="date"
                    required
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-2.5 py-2 text-white font-mono focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Enlistment Category / Source
                </label>
                <select
                  value={enlistmentSource}
                  onChange={(e) => setEnlistmentSource(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="Joined after Training">Joined after Basic / Recruit Training</option>
                  <option value="Posted In from Other Unit">Posted In from Other Unit / Formation</option>
                  <option value="Re-enlistment">Re-enlistment / Recall</option>
                  <option value="Direct Entry">Direct Entry / Commission</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Previous Unit / Training Center
                </label>
                <input
                  type="text"
                  value={previousUnit}
                  onChange={(e) => setPreviousUnit(e.target.value)}
                  placeholder="e.g. ARTC&S Halishahar / 18 Field Regt Arty"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Initial Status & Medical */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Parade Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ParadeStatus)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500"
              >
                <option value="In Unit">In Unit (স্বাভাবিক ডিউটি / উপস্থিত)</option>
                <option value="P/Lve">P/Lve (বাৎসরিক ছুটি)</option>
                <option value="C/Lve">C/Lve (নৈমিত্তিক ছুটি)</option>
                <option value="Course">Course (কোর্স / প্রশিক্ষণ)</option>
                <option value="CMH">CMH (সিএমএইচ ভর্তি)</option>
                <option value="Line Sick">Line Sick (লাইন সিক - Off Parade)</option>
                <option value="FDMN">FDMN (হোয়াইকং ফিল্ড ডিউটি)</option>
                <option value="Comd">Comd (কমান্ড / ফরমেশন টাস্ক)</option>
                <option value="Att">Att (সংযুক্ত / Attachment)</option>
                <option value="Msn">Msn (জাতিসংঘ শান্তিরক্ষা মিশন)</option>
                <option value="ERE">ERE (নন-পোস্টেড)</option>
                <option value="Civilian">Civilian Staff (বেসামরিক কর্মী)</option>
                <option value="AWOL">AWOL (অননুমোদিত অনুপস্থিত)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Blood Group
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500 font-mono"
              >
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Medical Category
              </label>
              <select
                value={medicalCategory}
                onChange={(e) => setMedicalCategory(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500 font-mono"
              >
                <option value="AYE">AYE (Fit Field Duty)</option>
                <option value="BEE">BEE (Sedentary/Restricted)</option>
                <option value="CEE">CEE (Hospitalized/Temp Unfit)</option>
              </select>
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <p className="text-[11px] text-slate-400">
              Enlisting as: <span className="text-white font-medium">{currentUser.rank} {currentUser.name} ({currentUser.role})</span>
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-rose-900/40 transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Enlist Soldier</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

