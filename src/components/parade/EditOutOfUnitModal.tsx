import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Personnel, OutOfUnitCategory, OUT_OF_UNIT_CATEGORIES } from '../../types';
import { UnitLogo } from '../common/UnitLogo';
import {
  X,
  Lock,
  Edit3,
  MapPin,
  Calendar,
  Clock,
  FileText,
  Save,
  AlertCircle,
  CheckCircle2,
  Shield,
  Hash,
  Award,
  User,
  Building2,
} from 'lucide-react';

interface EditOutOfUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  personnel: Personnel | null;
}

export const EditOutOfUnitModal: React.FC<EditOutOfUnitModalProps> = ({
  isOpen,
  onClose,
  personnel,
}) => {
  const { assignOutOfUnit, showNotification, isGuest, currentUser } = useApp();

  // Determine initial category
  const getInitialCategory = (p: Personnel): OutOfUnitCategory => {
    if (p.outOfUnitCategory) return p.outOfUnitCategory;
    if (p.leaveType === 'P/Lve') return 'P/Lve';
    if (p.leaveType === 'C/Lve') return 'C/Lve';
    if (p.status === 'CMH/Sick') return 'CMH';
    if (p.status === 'Course/Trg') return 'Course';
    if (p.status === 'Attached Out') return 'Att';
    return 'Comd';
  };

  const [category, setCategory] = useState<OutOfUnitCategory>('Comd');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [durationDays, setDurationDays] = useState<number | ''>('');
  const [authority, setAuthority] = useState('');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (personnel && isOpen) {
      const initialCat = getInitialCategory(personnel);
      setCategory(initialCat);

      const loc =
        personnel.outOfUnitLocation ||
        personnel.location ||
        personnel.leaveAddress ||
        personnel.courseName ||
        personnel.hospitalName ||
        personnel.comdAssignment ||
        '';
      setLocation(loc);

      const start =
        personnel.outOfUnitStartDate ||
        personnel.startDate ||
        personnel.leaveFrom ||
        personnel.courseFrom ||
        personnel.admissionDate ||
        personnel.comdFrom ||
        new Date().toISOString().split('T')[0];
      setStartDate(start);

      const end =
        personnel.outOfUnitEndDate ||
        personnel.endDate ||
        personnel.leaveTo ||
        personnel.courseTo ||
        personnel.comdTo ||
        '';
      setEndDate(end);

      const auth =
        personnel.outOfUnitAuthority ||
        personnel.authority ||
        personnel.comdAuthority ||
        '';
      setAuthority(auth);

      const rmk =
        personnel.outOfUnitRemarks ||
        personnel.remarks ||
        personnel.rmk ||
        personnel.diagnosis ||
        '';
      setRemarks(rmk);

      // Duration
      if (personnel.durationDays) {
        setDurationDays(personnel.durationDays);
      } else if (start && end) {
        const d1 = new Date(start).getTime();
        const d2 = new Date(end).getTime();
        if (!isNaN(d1) && !isNaN(d2) && d2 >= d1) {
          setDurationDays(Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1));
        } else {
          setDurationDays('');
        }
      } else {
        setDurationDays('');
      }
    }
  }, [personnel, isOpen]);

  if (!isOpen || !personnel) return null;

  const isLeave = category === 'P/Lve' || category === 'C/Lve';

  // Date change handlers with automatic duration calculation
  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (val && endDate) {
      const d1 = new Date(val).getTime();
      const d2 = new Date(endDate).getTime();
      if (!isNaN(d1) && !isNaN(d2) && d2 >= d1) {
        setDurationDays(Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1));
      }
    }
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    if (startDate && val) {
      const d1 = new Date(startDate).getTime();
      const d2 = new Date(val).getTime();
      if (!isNaN(d1) && !isNaN(d2) && d2 >= d1) {
        setDurationDays(Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1));
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) {
      showNotification('গেস্ট মোডে তথ্য পরিবর্তন করা যাবে না (View-Only)।');
      return;
    }

    // Rule: For leave (ছুটি), address is not mandatory, but start date and joining date are mandatory!
    if (isLeave) {
      if (!startDate) {
        showNotification('ছুটির ক্ষেত্রে শুরুর তারিখ (Start Date) বাধ্যতামূলক।');
        return;
      }
      if (!endDate) {
        showNotification('ছুটির ক্ষেত্রে যোগদানের তারিখ (Joining Date) বাধ্যতামূলক।');
        return;
      }
    } else {
      if (!startDate) {
        showNotification('শুরুর তারিখ (Start Date) প্রদান করুন।');
        return;
      }
    }

    assignOutOfUnit(personnel.id, category, {
      location: location.trim() || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      authority: authority.trim() || undefined,
      remarks: remarks.trim() || undefined,
    });

    showNotification(
      `${personnel.rk} ${personnel.name}-এর আউট অব ইউনিট তথ্য [${category}] সফলভাবে আপডেট করা হয়েছে।`
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UnitLogo size="sm" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-amber-400" />
                  <span>আউট অব ইউনিট তথ্য পরিবর্তন (Update Out of Unit)</span>
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  RSM / Admin Management
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                {personnel.rk} {personnel.name} ({personnel.snkNo}) — {personnel.battery}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Locked Basic Information Notice Banner */}
        <div className="px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-[11px] text-amber-300">
          <span className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              <strong>বেসিক তথ্য লক করা:</strong> মূল ডাটাবেসের পরিচয় অক্ষুণ্ণ রাখতে নাম, পদবি এবং সৈনিক নম্বর এখানে অপরিবর্তনযোগ্য।
            </span>
          </span>
          <span className="text-amber-400/70 text-[10px] hidden sm:inline font-mono">
            (মূল ডাটাবেস পরিবর্তন করতে রেজিমেন্ট নমিনাল রোলে যান)
          </span>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs font-sans">
          {/* Section 1: Locked Identity Fields (Read-Only) */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-slate-500" />
                <span>স্থায়ী সার্ভিস তথ্য (Locked Soldier Identity — Read Only)</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                Database Protected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Army No (Locked) */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                  <Hash className="w-3 h-3 text-slate-500" />
                  <span>সৈনিক নম্বর (Army No)</span>
                </label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-mono font-bold cursor-not-allowed">
                  <Lock className="w-3 h-3 text-slate-500 shrink-0" />
                  <span>{personnel.snkNo}</span>
                </div>
              </div>

              {/* Rank (Locked) */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                  <Award className="w-3 h-3 text-slate-500" />
                  <span>পদবি (Rank)</span>
                </label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-amber-300 font-mono font-bold cursor-not-allowed">
                  <Lock className="w-3 h-3 text-slate-500 shrink-0" />
                  <span>{personnel.rk}</span>
                </div>
              </div>

              {/* Name (Locked) */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-500" />
                  <span>সৈনিকের নাম (Full Name)</span>
                </label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white font-medium cursor-not-allowed truncate">
                  <Lock className="w-3 h-3 text-slate-500 shrink-0" />
                  <span className="truncate">{personnel.name}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400 font-mono">
              <span>Battery: <strong className="text-slate-200">{personnel.battery}</strong></span>
              <span>•</span>
              <span>Trade: <strong className="text-cyan-300">{personnel.trade || '-'}</strong></span>
              <span>•</span>
              <span>Blood Group: <strong className="text-rose-400">{personnel.bloodGroup || 'O+'}</strong></span>
            </div>
          </div>

          {/* Section 2: Editable Out of Unit Fields (Location, Duration, Dates, Authority, Remarks) */}
          <div className="space-y-4">
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-1.5">
              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              <span>পরিবর্তনযোগ্য ফিল্ডসমূহ (Editable Out of Unit Details)</span>
            </div>

            {/* Category Selector */}
            <div className="space-y-1.5">
              <label className="text-slate-200 font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-rose-400" />
                  <span>আউট অব ইউনিট ক্যাটাগরি (Category) *</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  {isLeave ? 'ছুটি নির্বাচন করা হয়েছে' : 'ডিউটি / প্রশিক্ষণ / অন্যান্য'}
                </span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as OutOfUnitCategory)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-semibold text-xs focus:border-amber-500 focus:outline-none cursor-pointer"
              >
                <option value="P/Lve">P/Lve (বাৎসরিক ছুটি - Annual Leave)</option>
                <option value="C/Lve">C/Lve (নৈমিত্তিক ছুটি - Casual Leave)</option>
                <option value="Course">Course (কোর্স / প্রশিক্ষণ)</option>
                <option value="CMH">CMH (সিএমএইচ ভর্তি)</option>
                <option value="FDMN">FDMN (হোয়াইকং ফিল্ড ডিউটি)</option>
                <option value="Comd">Comd (কমান্ড / ফরমেশন ডিউটি)</option>
                <option value="Att">Att (সংযুক্ত / Attachment)</option>
                <option value="Msn">Msn (জাতিসংঘ শান্তিরক্ষা মিশন)</option>
                <option value="ERE">ERE (নন-পোস্টেড / ERE)</option>
              </select>
            </div>

            {/* Location / Destination / Address */}
            <div className="space-y-1.5">
              <label className="text-slate-200 font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>
                    {isLeave ? 'ছুটির ঠিকানা (Leave Address)' : 'স্থান / ক্যাম্প / হাসপাতাল (Location / Destination)'}
                  </span>
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    isLeave
                      ? 'bg-slate-800 text-emerald-300 border border-slate-700'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isLeave ? 'ঐচ্ছিক (ঠিকানা বাধ্যতামূলক নয়)' : 'স্থান / ক্যাম্প'}
                </span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={
                  isLeave
                    ? 'e.g. নিজ গ্রাম, ডাকঘর, জেলা (বাধ্যতামূলক নয়)'
                    : category === 'CMH'
                    ? 'e.g. CMH Savar (Ward 4)'
                    : category === 'Course'
                    ? 'e.g. ARTC&S Halishahar, Chittagong'
                    : category === 'FDMN'
                    ? 'e.g. হোয়াইকং ক্যাম্প / ক্যাম্প-২৩'
                    : 'e.g. HQ 24 Inf Div, Savar Cantt'
                }
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-amber-500 focus:outline-none"
              />
              {isLeave && (
                <p className="text-[11px] text-slate-400">
                  * ছুটির ক্ষেত্রে ঠিকানা দেওয়া বাধ্যতামূলক নয়; আপনি ফাঁকাও রাখতে পারেন।
                </p>
              )}
            </div>

            {/* Dates & Duration Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Start Date */}
              <div className="space-y-1.5">
                <label className="text-slate-200 font-semibold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>শুরুর তারিখ (Start Date) *</span>
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                />
                <span className="text-[10px] text-rose-400 font-mono">* বাধ্যতামূলক</span>
              </div>

              {/* End Date / Joining Date */}
              <div className="space-y-1.5">
                <label className="text-slate-200 font-semibold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {isLeave ? 'যোগদানের তারিখ (Joining Date) *' : 'শেষের তারিখ (End Date)'}
                  </span>
                </label>
                <input
                  type="date"
                  required={isLeave}
                  value={endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl bg-slate-950 border text-white font-mono text-xs focus:outline-none ${
                    isLeave
                      ? 'border-emerald-500/80 focus:border-emerald-400'
                      : 'border-slate-700 focus:border-amber-500'
                  }`}
                />
                <span className={`text-[10px] font-mono ${isLeave ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                  {isLeave ? '* যোগদানের তারিখ বাধ্যতামূলক' : 'ঐচ্ছিক / আনুমানিক'}
                </span>
              </div>

              {/* Duration Days */}
              <div className="space-y-1.5">
                <label className="text-slate-200 font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>দিন সংখ্যা (Days)</span>
                  </span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={durationDays}
                  onChange={(e) =>
                    handleDurationChange(e.target.value ? parseInt(e.target.value, 10) : '')
                  }
                  placeholder="স্বয়ংক্রিয় গণনা"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono font-bold text-xs focus:border-amber-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 font-mono">তারিখ অনুযায়ী স্বয়ংক্রিয়</span>
              </div>
            </div>

            {/* Authority & Remarks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Authority */}
              <div className="space-y-1.5">
                <label className="text-slate-200 font-semibold flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>অনুমোদন / আদেশ নং (Authority / DO Part II)</span>
                </label>
                <input
                  type="text"
                  value={authority}
                  onChange={(e) => setAuthority(e.target.value)}
                  placeholder="e.g. 10 Med DO-II/2026/14 or AHQ Ltr"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Remarks */}
              <div className="space-y-1.5">
                <label className="text-slate-200 font-semibold flex items-center gap-1">
                  <span>মন্তব্য / কারণ (Remarks & Notes)</span>
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. পারিবারিক জরুরী প্রয়োজনে মঞ্জুরকৃত"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
            >
              বাতিল (Cancel)
            </button>
            <button
              type="submit"
              disabled={isGuest}
              className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-950/50 cursor-pointer transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>আপডেট সংরক্ষণ করুন (Save Updates)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
