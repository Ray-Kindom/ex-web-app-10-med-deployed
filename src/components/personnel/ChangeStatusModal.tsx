import React, { useState, useEffect } from 'react';
import {
  Personnel,
  ParadeStatus,
  PRIMARY_PARADE_STATUSES,
  normalizePersonnelStatus,
} from '../../types';
import { useApp } from '../../context/AppContext';
import {
  X,
  Calendar,
  MapPin,
  Clock,
  Shield,
  FileText,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface ChangeStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  personnel: Personnel | null;
}

export const ChangeStatusModal: React.FC<ChangeStatusModalProps> = ({
  isOpen,
  onClose,
  personnel,
}) => {
  const { updateParadeStatus, isGuest } = useApp();

  const [status, setStatus] = useState<ParadeStatus>('In Unit');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [durationDays, setDurationDays] = useState<number | ''>('');
  const [authority, setAuthority] = useState('');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (personnel && isOpen) {
      const normalized = normalizePersonnelStatus(
        personnel.status,
        personnel.outOfUnitCategory,
        personnel.rk,
        personnel.trade,
        personnel.statusDetails
      );
      setStatus(normalized);
      setLocation(personnel.location || personnel.outOfUnitLocation || '');
      setStartDate(
        personnel.startDate ||
          personnel.outOfUnitStartDate ||
          personnel.leaveFrom ||
          personnel.courseFrom ||
          personnel.comdFrom ||
          new Date().toISOString().split('T')[0]
      );
      setEndDate(
        personnel.endDate ||
          personnel.outOfUnitEndDate ||
          personnel.leaveTo ||
          personnel.courseTo ||
          personnel.comdTo ||
          ''
      );
      setAuthority(
        personnel.authority ||
          personnel.outOfUnitAuthority ||
          personnel.comdAuthority ||
          ''
      );
      setRemarks(
        personnel.remarks ||
          personnel.outOfUnitRemarks ||
          personnel.rmk ||
          ''
      );

      if (personnel.durationDays) {
        setDurationDays(personnel.durationDays);
      } else if (personnel.outOfUnitStartDate && personnel.outOfUnitEndDate) {
        const d1 = new Date(personnel.outOfUnitStartDate).getTime();
        const d2 = new Date(personnel.outOfUnitEndDate).getTime();
        if (!isNaN(d1) && !isNaN(d2)) {
          setDurationDays(Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1));
        }
      } else {
        setDurationDays('');
      }
    }
  }, [personnel, isOpen]);

  // Recalculate duration when startDate or endDate changes
  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (val && endDate) {
      const d1 = new Date(val).getTime();
      const d2 = new Date(endDate).getTime();
      if (!isNaN(d1) && !isNaN(d2) && d2 >= d1) {
        setDurationDays(Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
      }
    }
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    if (startDate && val) {
      const d1 = new Date(startDate).getTime();
      const d2 = new Date(val).getTime();
      if (!isNaN(d1) && !isNaN(d2) && d2 >= d1) {
        setDurationDays(Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
      }
    }
  };

  const handleDurationChange = (val: number | '') => {
    setDurationDays(val);
    if (typeof val === 'number' && val > 0 && startDate) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + val - 1);
      setEndDate(d.toISOString().split('T')[0]);
    }
  };

  if (!isOpen || !personnel) return null;

  const currentOption = PRIMARY_PARADE_STATUSES.find((s) => s.id === status);
  const requiresDetails = currentOption?.requiresDetails || false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) return;

    if (status === 'Leave') {
      if (!startDate) {
        alert('ছুটির ক্ষেত্রে শুরুর তারিখ (Start Date) বাধ্যতামূলক।');
        return;
      }
      if (!endDate) {
        alert('ছুটির ক্ষেত্রে যোগদানের তারিখ (Joining Date) বাধ্যতামূলক।');
        return;
      }
    }

    updateParadeStatus(personnel.id, status, {
      location: requiresDetails ? location : undefined,
      startDate: requiresDetails ? startDate : undefined,
      endDate: requiresDetails ? endDate : undefined,
      durationDays: requiresDetails && typeof durationDays === 'number' ? durationDays : undefined,
      authority: requiresDetails ? authority : undefined,
      remarks: requiresDetails ? remarks : undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 font-bold text-sm">
              {personnel.rk}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white leading-none">
                  {personnel.name}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 font-mono text-slate-300 border border-slate-700">
                  {personnel.snkNo}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 font-mono text-rose-300 border border-rose-900/40">
                  {personnel.battery}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                প্যারেড ও উপস্থিতি স্ট্যাটাস হালনাগাদ (Update Status & Details)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status Selection Grid */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
              স্ট্যাটাস নির্বাচন করুন (Select Status)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRIMARY_PARADE_STATUSES.map((opt) => {
                const isSelected = status === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setStatus(opt.id)}
                    className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? `${opt.color.bg} ${opt.color.border} border-2 shadow-lg`
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${opt.color.dot}`}
                        />
                        {opt.id}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 line-clamp-2">
                      {opt.bangla}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Formula Rule Info Box */}
          <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 text-xs text-slate-300 flex items-start gap-3">
            <Shield className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-white block">
                {status === 'In Unit'
                  ? 'ইউনিটে উপস্থিতি (In Unit / Normal Duty)'
                  : status === 'Line Sick'
                  ? 'লাইন সিক (Line Sick - Off Parade)'
                  : status === 'ERE' || status === 'Civilian'
                  ? 'নন-পোস্টেড (Posted Strength থেকে সরাসরি বাদ)'
                  : `ইউনিটের বাইরে (${status} - Out of Unit)`}
              </span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                {status === 'In Unit' &&
                  'সৈন্য ইউনিটে উপস্থিত থাকবেন। কোনো ডিউটি/গার্ডে নিযুক্ত না থাকলে তিনি স্বয়ংক্রিয়ভাবে On Parade থাকবেন।'}
                {status === 'Line Sick' &&
                  'সৈন্য ইউনিটের ভেতর থাকলেও প্যারেডে নামতে পারবেন না (Off Parade = Detailing Duties + Line Sick)।'}
                {(status === 'ERE' || status === 'Civilian') &&
                  'এই কর্মী Out of Unit-এ অন্তর্ভুক্ত হবেন না; বরং ইউনিটের Posted Strength থেকেই সরাসরি বাদ যাবেন (Posted = Total - ERE - Civilian)।'}
                {status !== 'In Unit' &&
                  status !== 'Line Sick' &&
                  status !== 'ERE' &&
                  status !== 'Civilian' &&
                  `${status} কর্মীকে Out of Unit হিসেবে গণনা করা হবে এবং Present in Unit থেকে বিয়োগ হবে (Present = Posted - Out of Unit)।`}
              </p>
            </div>
          </div>

          {/* Additional Fields for Out-of-Unit or Line-Sick or ERE */}
          {requiresDetails && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  স্থান, সময়কাল ও বিবরণ (Duration & Location Details)
                </span>
                {durationDays && (
                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    মেয়াদ: {durationDays} দিন ({durationDays} Days)
                  </span>
                )}
              </div>

              {/* Location Input */}
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">
                  {status === 'Leave'
                    ? 'ছুটির ঠিকানা (Leave Address - ঐচ্ছিক / Not Mandatory)'
                    : 'লোকেশন / ক্যাম্প / ইনস্টিটিউট (Location / Camp)'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder={
                      status === 'FDMN'
                        ? 'e.g. হোয়াইকং ক্যাম্প / ক্যাম্প-২৩'
                        : status === 'CMH'
                        ? 'e.g. CMH ঢাকা (ওয়ার্ড ৩)'
                        : status === 'Course'
                        ? 'e.g. ARTC&S হালিশহর / SI&T জালালাবাদ'
                        : status === 'ERE'
                        ? 'e.g. DGFI / BGB / AHQ'
                        : status === 'Comd'
                        ? 'e.g. HQ 24 Inf Div'
                        : 'e.g. নিজ গ্রাম, ডাকঘর, জেলা (ঐচ্ছিক)'
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Date Pickers and Duration Calculation */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {status === 'Leave' ? 'শুরুর তারিখ (Start Date) *' : 'শুরুর তারিখ (Start Date)'}
                  </label>
                  <input
                    type="date"
                    required={status === 'Leave'}
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {status === 'Leave' ? 'যোগদানের তারিখ (Joining Date) *' : 'শেষের তারিখ (End Date)'}
                  </label>
                  <input
                    type="date"
                    required={status === 'Leave'}
                    value={endDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    দিন সংখ্যা (Duration Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={durationDays}
                    onChange={(e) =>
                      handleDurationChange(
                        e.target.value ? parseInt(e.target.value, 10) : ''
                      )
                    }
                    placeholder="স্বয়ংক্রিয় গণনা"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Authority and Remarks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">
                    অনুমোদন / আদেশ নং (Authority / Part II Order)
                  </label>
                  <input
                    type="text"
                    value={authority}
                    onChange={(e) => setAuthority(e.target.value)}
                    placeholder="e.g. BMA/Trg/2026/04"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">
                    মন্তব্য (Remarks)
                  </label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="e.g. জরুরী কারণে মঞ্জুরকৃত"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              বাতিল (Cancel)
            </button>
            <button
              type="submit"
              disabled={isGuest}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 transition-all shadow-lg shadow-rose-600/20 disabled:opacity-50 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              সংরক্ষণ করুন (Save Status)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
