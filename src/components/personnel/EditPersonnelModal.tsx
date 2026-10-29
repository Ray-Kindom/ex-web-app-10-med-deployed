import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Personnel, Battery } from '../../types';
import { UnitLogo } from '../common/UnitLogo';
import { X, Edit2, Shield, User, Hash, Award, Building2, Phone, Heart, Save, ChevronDown, ChevronUp } from 'lucide-react';

interface EditPersonnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  personnel: Personnel | null;
}

export const EditPersonnelModal: React.FC<EditPersonnelModalProps> = ({
  isOpen,
  onClose,
  personnel,
}) => {
  const { updatePersonnel, ranksList, tradesList, subUnitsList, showNotification, isGuest, theme } = useApp();
  const isLight = theme === 'light';

  // 6 Core Regimental Nominal Profile Fields
  const [snkNo, setSnkNo] = useState('');
  const [rank, setRank] = useState('');
  const [trade, setTrade] = useState('');
  const [name, setName] = useState('');
  const [battery, setBattery] = useState<Battery>('P Bty');
  const [bloodGroup, setBloodGroup] = useState('O+');

  // Secondary Optional Details
  const [showSecondaryDetails, setShowSecondaryDetails] = useState(false);
  const [medicalCategory, setMedicalCategory] = useState<'AYE' | 'BEE' | 'CEE'>('AYE');
  const [mobileNo, setMobileNo] = useState('');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (personnel) {
      setSnkNo(personnel.snkNo || '');
      setRank(personnel.rk || '');
      setTrade(personnel.trade || 'GD');
      setName(personnel.name || '');
      setBattery(personnel.battery || 'P Bty');
      setBloodGroup(personnel.bloodGroup || 'O+');
      setMedicalCategory(personnel.medicalCategory || 'AYE');
      setMobileNo(personnel.mobileNo || personnel.phone || '');
      setRemarks(personnel.remarks || personnel.rmk || '');
    }
  }, [personnel]);

  if (!isOpen || !personnel) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) {
      showNotification('গেস্ট মোডে তথ্য পরিবর্তন করা যাবে না (View-Only)।');
      return;
    }
    if (!name.trim() || !snkNo.trim()) {
      showNotification('অনুগ্রহ করে নাম এবং বিএ/সৈনিক নম্বর পূরণ করুন।');
      return;
    }

    const cleanedPhone = mobileNo.trim() || undefined;
    const cleanedRemarks = remarks.trim() || undefined;

    updatePersonnel(personnel.id, {
      snkNo: snkNo.trim(),
      rk: rank,
      trade: trade.trim(),
      name: name.trim(),
      battery,
      bloodGroup: bloodGroup.trim(),
      medicalCategory,
      mobileNo: cleanedPhone,
      phone: cleanedPhone,
      remarks: cleanedRemarks,
      rmk: cleanedRemarks,
    });

    showNotification(`${rank} ${name} (${snkNo})-এর স্থায়ী তথ্য সফলভাবে আপডেট করা হয়েছে।`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className={`relative w-full max-w-2xl border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-700/80 text-white'
      }`}>
        {/* Modal Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-slate-800'
        }`}>
          <div className="flex items-center gap-3">
            <UnitLogo size="sm" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-base sm:text-lg font-bold tracking-wide flex items-center gap-1.5 ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}>
                  <Edit2 className="w-4 h-4 text-rose-500" />
                  <span>সৈনিকের তথ্য পরিবর্তন (Edit Soldier Profile)</span>
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-600 dark:text-rose-300 font-bold border border-rose-500/30">
                  ID #{personnel.id}
                </span>
              </div>
              <p className={`text-xs font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {personnel.rk} {personnel.name} ({personnel.snkNo}) — 10 Med Regt Arty
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900' : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice Banner */}
        <div className={`px-6 py-2.5 border-b flex items-center justify-between text-[11px] ${
          isLight ? 'bg-slate-100/80 border-slate-200 text-slate-700' : 'bg-slate-950/70 border-slate-800 text-slate-300'
        }`}>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            রেজিমেন্টাল মাস্টার ডাটাবেস: এই ৬টি স্থায়ী তথ্যের পরিবর্তন সরাসরি সংরক্ষণ হবে
          </span>
          <span className={`text-[10px] hidden sm:inline font-mono ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
            (প্যারেড স্টেট সময় অনুযায়ী প্যারেড থেকে নির্ধারিত হয়)
          </span>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs font-sans">
          {/* Section: The 6 Core Soldier Fields */}
          <div className="space-y-4">
            <div className={`text-xs font-bold text-rose-500 uppercase tracking-wider flex items-center gap-2 border-b pb-1.5 ${
              isLight ? 'border-slate-200' : 'border-slate-800'
            }`}>
              <span>মূল ৬টি রেজিমেন্টাল সার্ভিস তথ্য (Core Nominal Fields)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 1. বিএ নাম্বার বা সৈনিক নাম্বার */}
              <div className="space-y-1.5">
                <label className={`font-semibold flex items-center justify-between ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>
                  <span className="flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-rose-500" />
                    <span>১. বিএ / সৈনিক নম্বর (Army / BA No) *</span>
                  </span>
                </label>
                <input
                  type="text"
                  value={snkNo}
                  onChange={(e) => setSnkNo(e.target.value)}
                  placeholder="e.g. 1445021 or BA-8921"
                  required
                  className={`w-full px-3 py-2.5 rounded-xl border font-mono font-bold text-sm focus:border-rose-500 focus:outline-none ${
                    isLight ? 'bg-white border-slate-300 text-slate-900 shadow-sm' : 'bg-slate-950 border-slate-700 text-white'
                  }`}
                />
              </div>

              {/* 2. র্যাংক */}
              <div className="space-y-1.5">
                <label className={`font-semibold flex items-center justify-between ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>
                  <span className="flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    <span>২. র‍্যাংক (Military Rank) *</span>
                  </span>
                </label>
                <select
                  value={rank}
                  onChange={(e) => setRank(e.target.value)}
                  className={`w-full px-3 py-2.5 rounded-xl border font-mono font-bold text-xs focus:border-rose-500 focus:outline-none cursor-pointer ${
                    isLight ? 'bg-white border-slate-300 text-amber-700 shadow-sm' : 'bg-slate-950 border-slate-700 text-amber-300'
                  }`}
                >
                  {(ranksList || []).map((r) => (
                    <option key={r.id} value={r.abbreviation || r.name}>
                      {r.name} ({r.abbreviation})
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. ট্রেড */}
              <div className="space-y-1.5">
                <label className={`font-semibold flex items-center justify-between ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-cyan-500" />
                    <span>৩. ট্রেড (Trade)</span>
                  </span>
                </label>
                <select
                  value={trade}
                  onChange={(e) => setTrade(e.target.value)}
                  className={`w-full px-3 py-2.5 rounded-xl border font-mono font-semibold text-xs focus:border-rose-500 focus:outline-none cursor-pointer ${
                    isLight ? 'bg-white border-slate-300 text-cyan-800 shadow-sm' : 'bg-slate-950 border-slate-700 text-cyan-300'
                  }`}
                >
                  <option value="-">- (Officer / No Trade)</option>
                  {(tradesList || []).map((t) => (
                    <option key={t.id} value={t.abbreviation || t.name}>
                      {t.name} ({t.abbreviation})
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. ফুল নাম */}
              <div className="space-y-1.5">
                <label className={`font-semibold flex items-center justify-between ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-500" />
                    <span>৪. ফুল নাম (Full Name) *</span>
                  </span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="সৈনিকের পুরো নাম লিখুন"
                  required
                  className={`w-full px-3 py-2.5 rounded-xl border font-medium text-xs focus:border-rose-500 focus:outline-none ${
                    isLight ? 'bg-white border-slate-300 text-slate-900 shadow-sm' : 'bg-slate-950 border-slate-700 text-white'
                  }`}
                />
              </div>

              {/* 5. কোন ব্যাটারি */}
              <div className="space-y-1.5">
                <label className={`font-semibold flex items-center justify-between ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-purple-500" />
                    <span>৫. কোন ব্যাটারি (Battery) *</span>
                  </span>
                </label>
                <select
                  value={battery}
                  onChange={(e) => setBattery(e.target.value as Battery)}
                  className={`w-full px-3 py-2.5 rounded-xl border font-mono font-semibold text-xs focus:border-rose-500 focus:outline-none cursor-pointer ${
                    isLight ? 'bg-white border-slate-300 text-slate-900 shadow-sm' : 'bg-slate-950 border-slate-700 text-white'
                  }`}
                >
                  {(subUnitsList || []).map((su) => (
                    <option key={su.id} value={su.code || su.name}>
                      {su.code || su.name}
                    </option>
                  ))}
                  <option value="Civilian">Civilian (No Battery)</option>
                </select>
              </div>

              {/* 6. ব্লাড গ্রুপ */}
              <div className="space-y-1.5">
                <label className={`font-semibold flex items-center justify-between ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>
                  <span className="flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    <span>৬. ব্লাড গ্রুপ (Blood Group) *</span>
                  </span>
                </label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className={`w-full px-3 py-2.5 rounded-xl border font-mono font-bold text-xs focus:border-rose-500 focus:outline-none cursor-pointer ${
                    isLight ? 'bg-white border-slate-300 text-rose-600 shadow-sm' : 'bg-slate-950 border-slate-700 text-rose-400'
                  }`}
                >
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Collapsible Secondary Fields */}
          <div className={`pt-2 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <button
              type="button"
              onClick={() => setShowSecondaryDetails(!showSecondaryDetails)}
              className={`flex items-center justify-between w-full py-2 transition-colors text-xs font-semibold cursor-pointer ${
                isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>অতিরিক্ত তথ্য (মেডিকেল ক্যাটাগরি, মোবাইল ও রিমার্কস - ঐচ্ছিক)</span>
              {showSecondaryDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showSecondaryDetails && (
              <div className={`mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t animate-fadeIn ${
                isLight ? 'border-slate-200' : 'border-slate-800/60'
              }`}>
                {/* Medical Category */}
                <div className="space-y-1.5">
                  <label className={`font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Medical Category</label>
                  <select
                    value={medicalCategory}
                    onChange={(e) => setMedicalCategory(e.target.value as 'AYE' | 'BEE' | 'CEE')}
                    className={`w-full px-3 py-2 rounded-xl border font-mono text-xs focus:border-rose-500 focus:outline-none ${
                      isLight ? 'bg-white border-slate-300 text-slate-900 shadow-sm' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  >
                    <option value="AYE">AYE (Fit for All Duties)</option>
                    <option value="BEE">BEE (Temporary Low Medical)</option>
                    <option value="CEE">CEE (Permanent Low Medical)</option>
                  </select>
                </div>

                {/* Mobile Number */}
                <div className="space-y-1.5">
                  <label className={`font-semibold flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    <Phone className={`w-3.5 h-3.5 ${isLight ? 'text-slate-400' : 'text-slate-400'}`} />
                    <span>Mobile Number</span>
                  </label>
                  <input
                    type="text"
                    value={mobileNo}
                    onChange={(e) => setMobileNo(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className={`w-full px-3 py-2 rounded-xl border font-mono text-xs focus:border-rose-500 focus:outline-none ${
                      isLight ? 'bg-white border-slate-300 text-slate-900 shadow-sm' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  />
                </div>

                {/* Remarks */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className={`font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Remarks & Notes</label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={2}
                    placeholder="Additional regimental notes..."
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:border-rose-500 focus:outline-none resize-none ${
                      isLight ? 'bg-white border-slate-300 text-slate-900 shadow-sm' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className={`pt-4 border-t flex items-center justify-end gap-3 ${
            isLight ? 'border-slate-200' : 'border-slate-800'
          }`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              Cancel (বাতিল)
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-950/50 cursor-pointer transition-all"
            >
              <Save className="w-4 h-4" />
              <span>পরিবর্তন সংরক্ষণ করুন (Save Changes)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

