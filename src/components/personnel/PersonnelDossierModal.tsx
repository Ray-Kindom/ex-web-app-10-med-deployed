import React from 'react';
import { useApp } from '../../context/AppContext';
import { Personnel } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { RankBadge } from '../common/RankBadge';
import { UnitLogo } from '../common/UnitLogo';
import { parseMilitaryCourseInfo } from '../../utils/courseUtils';
import {
  X,
  Printer,
  Shield,
  Heart,
  Phone,
  GraduationCap,
} from 'lucide-react';

interface PersonnelDossierModalProps {
  person: Personnel | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PersonnelDossierModal: React.FC<PersonnelDossierModalProps> = ({
  person,
  isOpen,
  onClose,
}) => {
  const { theme } = useApp();
  const isLight = theme === 'light';

  if (!isOpen || !person) return null;

  const courseDetails =
    person.courseName || person.status === 'Course' || person.outOfUnitCategory === 'Course'
      ? parseMilitaryCourseInfo(person)
      : null;

  const locationText =
    person.outOfUnitLocation ||
    person.location ||
    person.leaveAddress ||
    person.hospitalName ||
    person.statusDetails;

  const dateText =
    person.outOfUnitStartDate ||
    person.startDate ||
    person.leaveFrom ||
    person.courseFrom ||
    person.admissionDate;

  const endDateText =
    person.outOfUnitEndDate ||
    person.endDate ||
    person.leaveTo ||
    person.courseTo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className={`relative w-full max-w-2xl border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
      }`}>
        
        {/* Header: Clean & Simple */}
        <div className={`px-5 py-3.5 border-b flex items-center justify-between ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
        }`}>
          <div className="flex items-center gap-2.5">
            <UnitLogo size="sm" />
            <div>
              <h3 className={`text-sm sm:text-base font-bold tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>
                সৈনিক ডসিয়ার (Soldier Dossier)
              </h3>
              <p className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                10 Medium Regiment Artillery
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer border ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
              }`}
              title="প্রিন্ট করুন / Print"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer border ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border-slate-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border-slate-700'
              }`}
              title="বন্ধ করুন"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Soldier Banner: Identity at a glance */}
        <div className={`px-5 py-3.5 border-b flex items-center justify-between gap-3 flex-wrap ${
          isLight ? 'bg-slate-100/70 border-slate-200' : 'bg-slate-950/60 border-slate-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-700 to-amber-600 flex items-center justify-center font-mono font-bold text-sm text-white shadow border border-white/20 shrink-0">
              {person.rk.slice(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-base font-bold font-sans ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {person.name}
                </span>
                <RankBadge rank={person.rk} trade={person.trade} size="sm" />
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold border ${
                  isLight
                    ? 'bg-white text-slate-700 border-slate-300'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  {person.battery}
                </span>
              </div>
              <div className={`text-xs font-mono font-bold mt-0.5 ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>
                সৈনিক নং: {person.snkNo}
              </div>
            </div>
          </div>

          <StatusBadge
            status={person.status}
            outOfUnitCategory={person.outOfUnitCategory}
            details={person.statusDetails}
            size="md"
          />
        </div>

        {/* Scrollable Content: Direct, Simple & Clean */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          
          {/* Section 1: Basic & Service Info (2-col/3-col grid) */}
          <div className={`p-3.5 rounded-xl border space-y-2 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'
          }`}>
            <h4 className={`text-[11px] font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 ${
              isLight ? 'text-slate-700' : 'text-slate-400'
            }`}>
              <Shield className="w-3.5 h-3.5 text-rose-500" />
              <span>মূল পরিচিতি ও সার্ভিস তথ্য (Basic & Service Info)</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 font-sans">
              <div className={`p-2.5 rounded-lg border ${
                isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800/80'
              }`}>
                <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>সৈনিক নম্বর</div>
                <div className={`font-mono font-bold text-xs mt-0.5 ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>{person.snkNo}</div>
              </div>

              <div className={`p-2.5 rounded-lg border ${
                isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800/80'
              }`}>
                <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>পদবি ও নাম</div>
                <div className={`font-semibold text-xs mt-0.5 truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{person.rk} {person.name}</div>
              </div>

              <div className={`p-2.5 rounded-lg border ${
                isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800/80'
              }`}>
                <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>ব্যাটারি</div>
                <div className={`font-semibold text-xs mt-0.5 ${isLight ? 'text-rose-700' : 'text-rose-300'}`}>{person.battery}</div>
              </div>

              <div className={`p-2.5 rounded-lg border ${
                isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800/80'
              }`}>
                <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>ট্রেড (Trade)</div>
                <div className={`font-semibold text-xs mt-0.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{person.trade || 'Gnr'}</div>
              </div>

              <div className={`p-2.5 rounded-lg border ${
                isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800/80'
              }`}>
                <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>রিক্রুট ব্যাচ (Batch)</div>
                <div className={`font-semibold text-xs mt-0.5 ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>{person.batch || '-'}</div>
              </div>

              <div className={`p-2.5 rounded-lg border ${
                isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800/80'
              }`}>
                <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>ভর্তির তারিখ (Enlistment)</div>
                <div className={`font-mono text-xs mt-0.5 ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>{person.enlistmentDate || '-'}</div>
              </div>
            </div>
          </div>

          {/* Section 2: Medical & Current State */}
          <div className={`p-3.5 rounded-xl border space-y-2 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'
          }`}>
            <h4 className={`text-[11px] font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 ${
              isLight ? 'text-slate-700' : 'text-slate-400'
            }`}>
              <Heart className="w-3.5 h-3.5 text-emerald-500" />
              <span>মেডিকেল ও বর্তমান স্টেটাস (Medical & Current State)</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 font-sans">
              <div className={`p-2.5 rounded-lg border ${
                isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800/80'
              }`}>
                <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>রক্তের গ্রুপ (Blood Group)</div>
                <div className={`font-mono font-bold text-xs mt-0.5 ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>{person.bloodGroup || 'O+'}</div>
              </div>

              <div className={`p-2.5 rounded-lg border ${
                isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800/80'
              }`}>
                <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>মেডিকেল ক্যাটাগরি</div>
                <div className={`font-mono font-bold text-xs mt-0.5 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>{person.medicalCategory || 'AYE'}</div>
              </div>

              <div className={`p-2.5 rounded-lg border ${
                isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800/80'
              }`}>
                <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>বর্তমান অবস্থান / বিবরণ</div>
                <div className={`font-semibold text-xs mt-0.5 truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{locationText || 'In Unit'}</div>
              </div>

              {(dateText || endDateText) && (
                <div className={`p-2.5 rounded-lg border col-span-2 ${
                  isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800/80'
                }`}>
                  <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>তারিখ ও মেয়াদ</div>
                  <div className={`font-mono text-xs mt-0.5 ${isLight ? 'text-amber-800 font-semibold' : 'text-amber-300'}`}>
                    {dateText || '-'} থেকে {endDateText || '-'} {person.durationDays ? `(মোট ${person.durationDays} দিন)` : ''}
                  </div>
                </div>
              )}

              {(person.authority || person.outOfUnitAuthority) && (
                <div className={`p-2.5 rounded-lg border ${
                  isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800/80'
                }`}>
                  <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>কর্তৃপক্ষ / আদেশ</div>
                  <div className={`font-semibold text-xs mt-0.5 truncate ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>{person.outOfUnitAuthority || person.authority}</div>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Course Qualification (if any) */}
          {courseDetails && (
            <div className={`p-3.5 rounded-xl border space-y-2 ${
              isLight ? 'bg-cyan-50/60 border-cyan-200' : 'bg-slate-950/70 border-cyan-900/40'
            }`}>
              <h4 className={`text-[11px] font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 ${
                isLight ? 'text-cyan-800' : 'text-cyan-400'
              }`}>
                <GraduationCap className="w-3.5 h-3.5" />
                <span>সামরিক কোর্স / ক্যাডার (Course Qualification)</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 font-sans">
                <div className={`p-2.5 rounded-lg border ${
                  isLight ? 'bg-white border-cyan-200 shadow-2xs' : 'bg-slate-900 border-slate-800/80'
                }`}>
                  <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>কোর্সের নাম</div>
                  <div className={`font-semibold text-xs mt-0.5 ${isLight ? 'text-cyan-800' : 'text-cyan-300'}`}>{courseDetails.courseName}</div>
                </div>
                <div className={`p-2.5 rounded-lg border ${
                  isLight ? 'bg-white border-cyan-200 shadow-2xs' : 'bg-slate-900 border-slate-800/80'
                }`}>
                  <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>স্থান</div>
                  <div className={`font-semibold text-xs mt-0.5 truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{courseDetails.place}</div>
                </div>
                <div className={`p-2.5 rounded-lg border ${
                  isLight ? 'bg-white border-cyan-200 shadow-2xs' : 'bg-slate-900 border-slate-800/80'
                }`}>
                  <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>মেয়াদ</div>
                  <div className={`font-mono font-bold text-xs mt-0.5 ${isLight ? 'text-amber-800' : 'text-amber-300'}`}>{courseDetails.durationWeek} সপ্তাহ</div>
                </div>
                <div className={`p-2.5 rounded-lg border ${
                  isLight ? 'bg-white border-cyan-200 shadow-2xs' : 'bg-slate-900 border-slate-800/80'
                }`}>
                  <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>শুরু ও শেষ</div>
                  <div className={`font-mono text-xs mt-0.5 ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>{courseDetails.startDate} - {courseDetails.endDate}</div>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Contact & Emergency */}
          <div className={`p-3.5 rounded-xl border space-y-2 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'
          }`}>
            <h4 className={`text-[11px] font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 ${
              isLight ? 'text-slate-700' : 'text-slate-400'
            }`}>
              <Phone className="w-3.5 h-3.5 text-blue-500" />
              <span>যোগাযোগ ও জরুরি তথ্য (Contact & Emergency)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 font-sans">
              <div className={`p-2.5 rounded-lg border ${
                isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800/80'
              }`}>
                <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>মোবাইল নম্বর</div>
                <div className={`font-mono font-semibold text-xs mt-0.5 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>{person.phone || person.mobileNo || '-'}</div>
              </div>

              <div className={`p-2.5 rounded-lg border ${
                isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800/80'
              }`}>
                <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>জরুরি অভিভাবক (NOK Name)</div>
                <div className={`font-semibold text-xs mt-0.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{person.nokName || '-'}</div>
              </div>

              <div className={`p-2.5 rounded-lg border ${
                isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800/80'
              }`}>
                <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>অভিভাবকের যোগাযোগ নম্বর</div>
                <div className={`font-mono text-xs mt-0.5 ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>{person.nokContact || person.emergencyContact || '-'}</div>
              </div>

              <div className={`p-2.5 rounded-lg border ${
                isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800/80'
              }`}>
                <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>পূর্ববর্তী ইউনিট / মন্তব্য</div>
                <div className={`font-semibold text-xs mt-0.5 truncate ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>{person.previousUnit || person.remarks || person.rmk || '-'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer: Minimal & Clean */}
        <div className={`px-5 py-3 border-t flex items-center justify-between gap-3 text-xs ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
        }`}>
          <span className={`font-mono text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
            10 MED REGT ARTY • DOSSIER
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer border inline-flex items-center gap-1.5 ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold transition-colors cursor-pointer shadow-sm"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
