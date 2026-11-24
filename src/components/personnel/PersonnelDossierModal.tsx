import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { Personnel, ServiceActivityRecord, ServiceActivityType, formatRankTradeName } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { RankBadge } from '../common/RankBadge';
import { UnitLogo } from '../common/UnitLogo';
import { parseMilitaryCourseInfo } from '../../utils/courseUtils';
import { getIpftResultCategory } from '../../data/trgStateData';
import {
  fetchPersonnelDossierFromSupabase,
  PersonnelDossierSupabaseResult,
  DossierDutyRecord,
} from '../../lib/supabase';
import {
  X,
  Printer,
  Shield,
  Heart,
  Phone,
  GraduationCap,
  Target,
  Calendar,
  MapPin,
  Briefcase,
  Award,
  RefreshCw,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  PlaneTakeoff,
} from 'lucide-react';

interface PersonnelDossierModalProps {
  person: Personnel | null;
  isOpen: boolean;
  onClose: () => void;
}

type DossierTab = 'all' | 'training' | 'courses' | 'leave' | 'duties';

export const PersonnelDossierModal: React.FC<PersonnelDossierModalProps> = ({
  person,
  isOpen,
  onClose,
}) => {
  const {
    personnelList,
    paradeDutyAssignments,
    addPersonnelActivity,
    deletePersonnelActivity,
    isGuest,
    theme,
  } = useApp();
  const isLight = theme === 'light';

  const activePerson = useMemo(() => {
    if (!person) return null;
    return (
      personnelList.find(
        (p) =>
          p.id === person.id ||
          (p.snkNo && person.snkNo && p.snkNo.trim().toLowerCase() === person.snkNo.trim().toLowerCase())
      ) || person
    );
  }, [personnelList, person]);

  const [activeTab, setActiveTab] = useState<DossierTab>('all');
  const [isLoadingDossier, setIsLoadingDossier] = useState(false);
  const [dossierData, setDossierData] = useState<PersonnelDossierSupabaseResult | null>(null);

  // Quick Add Activity Form
  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);
  const [actType, setActType] = useState<ServiceActivityType>('Leave');
  const [actSubType, setActSubType] = useState('P/Lve');
  const [actTitle, setActTitle] = useState('');
  const [actStartDate, setActStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [actEndDate, setActEndDate] = useState('');
  const [actLocation, setActLocation] = useState('');
  const [actAuthority, setActAuthority] = useState('');
  const [actRemarks, setActRemarks] = useState('');

  const loadDossier = useCallback(async () => {
    if (!activePerson) return;
    setIsLoadingDossier(true);
    try {
      const res = await fetchPersonnelDossierFromSupabase(activePerson.id, activePerson.snkNo);
      setDossierData(res);
    } catch (err) {
      console.warn('Failed to fetch dossier from Supabase:', err);
    } finally {
      setIsLoadingDossier(false);
    }
  }, [activePerson]);

  useEffect(() => {
    if (isOpen && activePerson) {
      setActiveTab('all');
      setIsAddActivityOpen(false);
      loadDossier();
    }
  }, [isOpen, activePerson?.id, loadDossier]);

  // Merge all activities from Supabase `personnel.status_details.activityHistory` + local state + current active state
  const mergedActivities = useMemo(() => {
    if (!activePerson) return [];
    const byId = new Map<string, ServiceActivityRecord>();

    const addIfUnique = (rec: ServiceActivityRecord) => {
      if (!rec) return;
      const key = rec.id;
      if (!byId.has(key)) {
        byId.set(key, rec);
      }
    };

    (dossierData?.activities || []).forEach(addIfUnique);
    (dossierData?.freshActivityHistory || []).forEach(addIfUnique);
    (activePerson.activityHistory || []).forEach(addIfUnique);

    // Ensure currently active Leave / Course / Out-of-Unit status appears even if not yet in history
    const st = (activePerson.status || '').trim();
    const cat = activePerson.outOfUnitCategory;
    if (
      st &&
      st !== 'In Unit' &&
      st !== 'Present' &&
      st !== 'Civilian'
    ) {
      const start =
        activePerson.leaveFrom ||
        activePerson.courseFrom ||
        activePerson.outOfUnitStartDate ||
        activePerson.startDate ||
        activePerson.admissionDate ||
        activePerson.comdFrom ||
        '';
      const end =
        activePerson.leaveTo ||
        activePerson.courseTo ||
        activePerson.outOfUnitEndDate ||
        activePerson.endDate ||
        activePerson.reviewDate ||
        activePerson.comdTo ||
        undefined;
      const loc =
        activePerson.leaveAddress ||
        activePerson.courseLocation ||
        activePerson.hospitalName ||
        activePerson.outOfUnitLocation ||
        activePerson.location ||
        activePerson.statusDetails;

      const isLeave = st === 'P/Lve' || st === 'C/Lve' || st === 'Leave' || cat === 'P/Lve' || cat === 'C/Lve';
      const isCourse = st === 'Course' || st === 'Course/Trg' || cat === 'Course';

      const alreadyRepresented = Array.from(byId.values()).some((a) => {
        if (isLeave && a.type === 'Leave' && (!start || a.startDate === start)) return true;
        if (isCourse && a.type === 'Course' && (!start || a.startDate === start)) return true;
        if (!isLeave && !isCourse && a.status === 'Active' && (a.subType === st || a.type === st)) return true;
        return false;
      });

      if (!alreadyRepresented) {
        const derivedType: ServiceActivityType = isLeave
          ? 'Leave'
          : isCourse
          ? 'Course'
          : st === 'CMH' || st === 'CMH/Sick' || st === 'Line Sick' || cat === 'CMH'
          ? 'CMH'
          : st === 'FDMN' || cat === 'FDMN'
          ? 'FDMN Camp'
          : st === 'Att' || st === 'Attached Out' || cat === 'Att'
          ? 'Att'
          : st === 'Msn' || cat === 'Msn'
          ? 'Msn'
          : st === 'Comd' || st === 'Temp Duty' || cat === 'Comd'
          ? 'Comd'
          : st === 'ERE' || cat === 'ERE'
          ? 'ERE'
          : 'General';

        addIfUnique({
          id: `current_state_${activePerson.id}_${st}`,
          type: derivedType,
          subType: cat || st,
          title: isLeave
            ? st === 'C/Lve' || cat === 'C/Lve'
              ? 'Casual Leave (নৈমিত্তিক ছুটি)'
              : 'Privilege Leave (বাৎসরিক ছুটি)'
            : isCourse
            ? activePerson.courseName || loc || 'Military Course / Cadre'
            : `${st}${loc ? `: ${loc}` : ''}`,
          startDate: start || new Date().toISOString().split('T')[0],
          endDate: end,
          durationDays: activePerson.durationDays,
          location: loc,
          authority: activePerson.outOfUnitAuthority || activePerson.authority,
          remarks: activePerson.outOfUnitRemarks || activePerson.remarks,
          status: 'Active',
          recordedAt: new Date().toISOString(),
          recordedBy: 'Current State',
        });
      }
    }

    return Array.from(byId.values()).sort((a, b) => {
      const da = a.startDate || a.recordedAt || '';
      const db = b.startDate || b.recordedAt || '';
      return db.localeCompare(da);
    });
  }, [activePerson, dossierData]);

  // 1. Courses (from Supabase `course_cadre` + non-duplicate Course activities + current course info)
  const coursesList = useMemo(() => {
    const dbCourses = dossierData?.courses || [];
    const courseActs = mergedActivities.filter(
      (a) =>
        a.type === 'Course' &&
        a.sourceTable !== 'course_cadre' &&
        !dbCourses.some(
          (c) =>
            c.courseName.toLowerCase().trim() === a.title.replace(/^Course:\s*/i, '').toLowerCase().trim() &&
            (!a.startDate || c.completionDate === a.startDate)
        )
    );
    return {
      dbCourses,
      activityCourses: courseActs,
      total: dbCourses.length + courseActs.length,
    };
  }, [dossierData, mergedActivities]);

  // 2. Trainings (from Supabase `trg_state` + non-duplicate Training activities)
  const trainingsList = useMemo(() => {
    const dbTrainings = dossierData?.trainings || [];
    const trgActs = mergedActivities.filter(
      (a) =>
        a.type === 'Training' &&
        a.sourceTable !== 'trg_state' &&
        !dbTrainings.some((t) => `act_trg_${t.id}` === a.id)
    );
    return {
      dbTrainings,
      activityTrainings: trgActs,
      total: dbTrainings.length + trgActs.length,
    };
  }, [dossierData, mergedActivities]);

  // 3. Leaves / Chuti (P/Lve, C/Lve, Ni Pass, Leave)
  const leavesList = useMemo(() => {
    return mergedActivities.filter(
      (a) =>
        a.type === 'Leave' ||
        a.subType === 'P/Lve' ||
        a.subType === 'C/Lve' ||
        a.subType === 'Ni Pass' ||
        a.title.toLowerCase().includes('leave') ||
        a.title.toLowerCase().includes('ni pass') ||
        a.title.toLowerCase().includes('night pass') ||
        a.title.includes('ছুটি') ||
        a.title.includes('নাইট পাস')
    );
  }, [mergedActivities]);

  const leaveTypeBreakdown = useMemo(() => {
    let pLve = 0;
    let cLve = 0;
    let niPass = 0;
    leavesList.forEach((l) => {
      const sub = (l.subType || '').toLowerCase();
      const title = (l.title || '').toLowerCase();
      if (sub === 'ni pass' || title.includes('ni pass') || title.includes('night pass') || title.includes('নাইট পাস')) {
        niPass++;
      } else if (sub === 'c/lve' || title.includes('casual')) {
        cLve++;
      } else {
        pLve++;
      }
    });
    return { pLve, cLve, niPass };
  }, [leavesList]);

  const totalLeaveDays = useMemo(() => {
    return leavesList.reduce((acc, item) => {
      if (typeof item.durationDays === 'number' && item.durationDays > 0) {
        return acc + item.durationDays;
      }
      if (item.startDate && item.endDate) {
        const d1 = new Date(item.startDate).getTime();
        const d2 = new Date(item.endDate).getTime();
        if (!isNaN(d1) && !isNaN(d2) && d2 >= d1) {
          return acc + Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
        }
      }
      return acc;
    }, 0);
  }, [leavesList]);

  // 4. Duties (merge Supabase `parade_records` `duty_%` + AppContext `paradeDutyAssignments`)
  const dutiesList = useMemo(() => {
    if (!activePerson) return [];
    const map = new Map<string, DossierDutyRecord>();
    const lowerId = (activePerson.id || '').trim().toLowerCase();
    const lowerSnk = (activePerson.snkNo || '').trim().toLowerCase();

    (dossierData?.duties || []).forEach((d) => {
      const dedupKey = `${d.date}_${d.sessionType}_${d.dutyName}`.toLowerCase();
      if (!map.has(dedupKey)) map.set(dedupKey, d);
    });

    Object.values(paradeDutyAssignments || {}).forEach((list) => {
      if (!Array.isArray(list)) return;
      list.forEach((a) => {
        const aId = String(a.personnelId || '').trim().toLowerCase();
        const aSnk = String(a.snkNo || '').trim().toLowerCase();
        if ((lowerId && aId === lowerId) || (lowerSnk && aSnk === lowerSnk)) {
          const dedupKey = `${a.date}_${a.sessionType}_${a.dutyName}`.toLowerCase();
          if (!map.has(dedupKey)) {
            map.set(dedupKey, {
              id: a.id,
              date: a.date,
              sessionType: a.sessionType,
              dutyName: a.dutyName,
              category: a.category,
              location: a.location,
              dutyTime: a.dutyTime,
              weaponOrAmmo: a.weaponOrAmmo,
              remarks: a.remarks,
              assignedBy: a.assignedBy,
            });
          }
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [activePerson, dossierData, paradeDutyAssignments]);

  // 5. Other Out-of-Unit & Career Events (FDMN, CMH, Att, Msn, Comd, ERE, Promotion, Award, General, plus Duty logs not in dutiesList)
  const otherActivitiesList = useMemo(() => {
    return mergedActivities.filter(
      (a) =>
        a.type !== 'Course' &&
        a.type !== 'Training' &&
        a.type !== 'Leave' &&
        a.subType !== 'P/Lve' &&
        a.subType !== 'C/Lve' &&
        !(a.type === 'Duty' && a.sourceTable === 'duty_roster')
    );
  }, [mergedActivities]);

  if (!isOpen || !activePerson) return null;

  const courseDetails =
    activePerson.courseName ||
    activePerson.status === 'Course' ||
    activePerson.outOfUnitCategory === 'Course'
      ? parseMilitaryCourseInfo(activePerson)
      : null;

  const locationText =
    activePerson.outOfUnitLocation ||
    activePerson.location ||
    activePerson.leaveAddress ||
    activePerson.hospitalName ||
    activePerson.statusDetails;

  const dateText =
    activePerson.outOfUnitStartDate ||
    activePerson.startDate ||
    activePerson.leaveFrom ||
    activePerson.courseFrom ||
    activePerson.admissionDate;

  const endDateText =
    activePerson.outOfUnitEndDate ||
    activePerson.endDate ||
    activePerson.leaveTo ||
    activePerson.courseTo;

  const handleQuickAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest || !activePerson) return;

    let durationDays: number | undefined = undefined;
    if (actStartDate && actEndDate) {
      const d1 = new Date(actStartDate).getTime();
      const d2 = new Date(actEndDate).getTime();
      if (!isNaN(d1) && !isNaN(d2) && d2 >= d1) {
        durationDays = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
      }
    }

    const defaultTitle =
      actType === 'Leave'
        ? actSubType === 'Ni Pass'
          ? 'Night Pass (নাইট পাস)'
          : actSubType === 'C/Lve'
          ? 'Casual Leave (নৈমিত্তিক ছুটি)'
          : 'Privilege Leave (বাৎসরিক ছুটি)'
        : actTitle.trim() || `${actType} Activity`;

    addPersonnelActivity(activePerson.id, {
      type: actType,
      subType: actSubType || actType,
      title: actTitle.trim() || defaultTitle,
      startDate: actStartDate,
      endDate: actEndDate || undefined,
      durationDays,
      location: actLocation.trim() || undefined,
      authority: actAuthority.trim() || undefined,
      remarks: actRemarks.trim() || undefined,
      status: 'Completed',
      sourceTable: 'manual',
    });

    setActTitle('');
    setActEndDate('');
    setActLocation('');
    setActAuthority('');
    setActRemarks('');
    setIsAddActivityOpen(false);
    setTimeout(loadDossier, 500);
  };

  const handleDeleteActivity = (activityId: string) => {
    if (isGuest || !activePerson) return;
    deletePersonnelActivity(activePerson.id, activityId);
    setTimeout(loadDossier, 400);
  };

  const tabItems: { id: DossierTab; label: string; count?: number }[] = [
    { id: 'all', label: 'সকল কার্যক্রম' },
    { id: 'training', label: 'প্রশিক্ষণ (Trg)', count: trainingsList.total },
    { id: 'courses', label: 'কোর্স ও ক্যাডার', count: coursesList.total },
    { id: 'leave', label: 'ছুটি (Chuti)', count: leavesList.length },
    { id: 'duties', label: 'ডিউটি ও অন্যান্য', count: dutiesList.length + otherActivitiesList.length },
  ];

  const showSection = (tab: DossierTab) => activeTab === 'all' || activeTab === tab;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/65 backdrop-blur-xs animate-fadeIn">
      <div
        className={`relative w-full max-w-4xl border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
          isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
        }`}
      >
        {/* Header */}
        <div
          className={`px-5 py-3.5 border-b flex items-center justify-between shrink-0 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <UnitLogo size="sm" />
            <div>
              <h3
                className={`text-sm sm:text-base font-bold tracking-wide ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}
              >
                সৈনিক ডসিয়ার ও সম্পূর্ণ কার্যক্রম (360° Soldier Dossier)
              </h3>
              <p className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                10 Medium Regiment Artillery • Interconnected Database Ledger
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadDossier}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer border ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
              }`}
              title="ডাটাবেজ থেকে রিফ্রেশ করুন"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingDossier ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
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
              type="button"
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

        {/* Soldier Banner */}
        <div
          className={`px-5 py-3 border-b flex items-center justify-between gap-3 flex-wrap shrink-0 ${
            isLight ? 'bg-slate-100/70 border-slate-200' : 'bg-slate-950/60 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-700 to-amber-600 flex items-center justify-center font-mono font-bold text-sm text-white shadow border border-white/20 shrink-0">
              {activePerson.rk.slice(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-base font-bold font-sans ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {activePerson.name}
                </span>
                <RankBadge rank={activePerson.rk} trade={activePerson.trade} size="sm" />
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold border ${
                    isLight
                      ? 'bg-white text-slate-700 border-slate-300'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {activePerson.battery}
                </span>
              </div>
              <div className={`text-xs font-mono font-bold mt-0.5 ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>
                সৈনিক নং: {activePerson.snkNo}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {!isGuest && (
              <button
                type="button"
                onClick={() => setIsAddActivityOpen((prev) => !prev)}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>নতুন এন্ট্রি / ছুটি</span>
              </button>
            )}
            <StatusBadge
              status={activePerson.status}
              outOfUnitCategory={activePerson.outOfUnitCategory}
              details={activePerson.statusDetails}
              size="md"
            />
          </div>
        </div>

        {/* Interconnected Activity Filter Tabs */}
        <div
          className={`px-4 sm:px-5 py-2 border-b flex items-center gap-1.5 overflow-x-auto shrink-0 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'
          }`}
        >
          {tabItems.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors inline-flex items-center gap-1.5 cursor-pointer border ${
                  isActive
                    ? 'bg-rose-600 text-white border-rose-500 shadow-xs'
                    : isLight
                    ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <span>{t.label}</span>
                {t.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : isLight
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Quick Add Activity / Leave Form */}
          {isAddActivityOpen && !isGuest && (
            <form
              onSubmit={handleQuickAddActivity}
              className={`p-3.5 rounded-xl border space-y-3 ${
                isLight ? 'bg-emerald-50/70 border-emerald-200' : 'bg-emerald-950/20 border-emerald-500/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-bold text-xs flex items-center gap-1.5 ${isLight ? 'text-emerald-900' : 'text-emerald-300'}`}>
                  <Plus className="w-4 h-4" />
                  <span>সৈনিকের নতুন কার্যক্রম / ছুটি / পুরস্কার রেকর্ড করুন</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddActivityOpen(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium mb-1 opacity-80">ক্যাটাগরি</label>
                  <select
                    value={actType}
                    onChange={(e) => {
                      const val = e.target.value as ServiceActivityType;
                      setActType(val);
                      setActSubType(val === 'Leave' ? 'P/Lve' : val);
                    }}
                    className={`w-full rounded-lg p-2 border text-xs ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  >
                    <option value="Leave">ছুটি (Leave / Chuti)</option>
                    <option value="Training">প্রশিক্ষণ (Training)</option>
                    <option value="Course">কোর্স / ক্যাডার (Course)</option>
                    <option value="FDMN Camp">FDMN ক্যাম্প</option>
                    <option value="CMH">CMH / মেডিকেল</option>
                    <option value="Duty">ডিউটি (Duty)</option>
                    <option value="Promotion">প্রমোশন (Promotion)</option>
                    <option value="Award">পুরস্কার / প্রশংসা (Award)</option>
                    <option value="General">অন্যান্য (General)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium mb-1 opacity-80">ধরন / উপ-শিরোনাম</label>
                  {actType === 'Leave' ? (
                    <select
                      value={actSubType}
                      onChange={(e) => setActSubType(e.target.value)}
                      className={`w-full rounded-lg p-2 border text-xs ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                      }`}
                    >
                      <option value="P/Lve">P/Lve (বাৎসরিক ছুটি)</option>
                      <option value="C/Lve">C/Lve (নৈমিত্তিক ছুটি)</option>
                      <option value="Ni Pass">Ni Pass (নাইট পাস)</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={actSubType}
                      onChange={(e) => setActSubType(e.target.value)}
                      placeholder="e.g. RET / IPFT / Guard"
                      className={`w-full rounded-lg p-2 border text-xs ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                      }`}
                    />
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium mb-1 opacity-80">বিবরণ / শিরোনাম</label>
                  <input
                    type="text"
                    value={actTitle}
                    onChange={(e) => setActTitle(e.target.value)}
                    placeholder={actType === 'Leave' ? 'e.g. বাৎসরিক ছুটি (২০২৬)' : 'কার্যক্রমের শিরোনাম...'}
                    className={`w-full rounded-lg p-2 border text-xs ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium mb-1 opacity-80">শুরুর তারিখ *</label>
                  <input
                    type="date"
                    required
                    value={actStartDate}
                    onChange={(e) => setActStartDate(e.target.value)}
                    className={`w-full rounded-lg p-2 border text-xs ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1 opacity-80">শেষ তারিখ</label>
                  <input
                    type="date"
                    value={actEndDate}
                    onChange={(e) => setActEndDate(e.target.value)}
                    className={`w-full rounded-lg p-2 border text-xs ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1 opacity-80">স্থান / ঠিকানা</label>
                  <input
                    type="text"
                    value={actLocation}
                    onChange={(e) => setActLocation(e.target.value)}
                    placeholder="স্থান বা ছুটির ঠিকানা..."
                    className={`w-full rounded-lg p-2 border text-xs ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1 opacity-80">আদেশ / মন্তব্য</label>
                  <input
                    type="text"
                    value={actAuthority}
                    onChange={(e) => setActAuthority(e.target.value)}
                    placeholder="Authority / Part II..."
                    className={`w-full rounded-lg p-2 border text-xs ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={actRemarks}
                  onChange={(e) => setActRemarks(e.target.value)}
                  placeholder="অতিরিক্ত মন্তব্য (ঐচ্ছিক)..."
                  className={`flex-1 rounded-lg p-2 border text-xs ${
                    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                  }`}
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer shrink-0"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          )}

          {/* Interconnected Activity Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              type="button"
              onClick={() => setActiveTab('training')}
              className={`text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                isLight ? 'bg-emerald-50/70 border-emerald-200 hover:bg-emerald-100/70' : 'bg-emerald-950/20 border-emerald-500/30 hover:bg-emerald-950/35'
              }`}
            >
              <div className={`text-[10px] font-semibold uppercase ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                প্রশিক্ষণ (Trg State)
              </div>
              <div className="text-lg font-mono font-bold mt-0.5">{trainingsList.total} টি</div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('courses')}
              className={`text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                isLight ? 'bg-cyan-50/70 border-cyan-200 hover:bg-cyan-100/70' : 'bg-cyan-950/20 border-cyan-500/30 hover:bg-cyan-950/35'
              }`}
            >
              <div className={`text-[10px] font-semibold uppercase ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>
                কোর্স ও ক্যাডার
              </div>
              <div className="text-lg font-mono font-bold mt-0.5">{coursesList.total} টি</div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('leave')}
              className={`text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                isLight ? 'bg-purple-50/70 border-purple-200 hover:bg-purple-100/70' : 'bg-purple-950/20 border-purple-500/30 hover:bg-purple-950/35'
              }`}
            >
              <div className={`text-[10px] font-semibold uppercase ${isLight ? 'text-purple-700' : 'text-purple-400'}`}>
                ছুটি (Leave / Chuti)
              </div>
              <div className="text-lg font-mono font-bold mt-0.5">
                {leavesList.length} বার {totalLeaveDays > 0 ? <span className="text-xs font-normal opacity-80">({totalLeaveDays} দিন)</span> : null}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('duties')}
              className={`text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                isLight ? 'bg-amber-50/70 border-amber-200 hover:bg-amber-100/70' : 'bg-amber-950/20 border-amber-500/30 hover:bg-amber-950/35'
              }`}
            >
              <div className={`text-[10px] font-semibold uppercase ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                ডিউটি ও অন্যান্য
              </div>
              <div className="text-lg font-mono font-bold mt-0.5">
                {dutiesList.length + otherActivitiesList.length} টি
              </div>
            </button>
          </div>

          {/* Overview Basic & Medical Sections (only on 'all' tab) */}
          {activeTab === 'all' && (
            <>
              {/* Section 1: Basic & Service Info */}
              <div
                className={`p-3.5 rounded-xl border space-y-2 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'
                }`}
              >
                <h4
                  className={`text-[11px] font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 ${
                    isLight ? 'text-slate-700' : 'text-slate-400'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 text-rose-500" />
                  <span>মূল পরিচিতি ও সার্ভিস তথ্য (Basic & Service Info)</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 font-sans">
                  <div
                    className={`p-2.5 rounded-lg border ${
                      isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800/80'
                    }`}
                  >
                    <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>সৈনিক নম্বর</div>
                    <div className={`font-mono font-bold text-xs mt-0.5 ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>
                      {activePerson.snkNo}
                    </div>
                  </div>

                  <div
                    className={`p-2.5 rounded-lg border ${
                      isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800/80'
                    }`}
                  >
                    <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>পদবি, ট্রেড ও নাম</div>
                    <div className={`font-semibold text-xs mt-0.5 truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {formatRankTradeName(activePerson.rk, activePerson.trade, activePerson.name)}
                    </div>
                  </div>

                  <div
                    className={`p-2.5 rounded-lg border ${
                      isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800/80'
                    }`}
                  >
                    <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>ব্যাটারি</div>
                    <div className={`font-semibold text-xs mt-0.5 ${isLight ? 'text-rose-700' : 'text-rose-300'}`}>
                      {activePerson.battery}
                    </div>
                  </div>

                  <div
                    className={`p-2.5 rounded-lg border ${
                      isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800/80'
                    }`}
                  >
                    <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>ট্রেড (Trade)</div>
                    <div className={`font-semibold text-xs mt-0.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                      {activePerson.trade || 'Gnr'}
                    </div>
                  </div>

                  <div
                    className={`p-2.5 rounded-lg border ${
                      isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800/80'
                    }`}
                  >
                    <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>রিক্রুট ব্যাচ (Batch)</div>
                    <div className={`font-semibold text-xs mt-0.5 ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                      {activePerson.batch || '-'}
                    </div>
                  </div>

                  <div
                    className={`p-2.5 rounded-lg border ${
                      isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800/80'
                    }`}
                  >
                    <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>ভর্তির তারিখ (Enlistment)</div>
                    <div className={`font-mono text-xs mt-0.5 ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                      {activePerson.enlistmentDate || '-'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Medical & Current State */}
              <div
                className={`p-3.5 rounded-xl border space-y-2 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'
                }`}
              >
                <h4
                  className={`text-[11px] font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 ${
                    isLight ? 'text-slate-700' : 'text-slate-400'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5 text-emerald-500" />
                  <span>মেডিকেল ও বর্তমান স্টেটাস (Medical & Current State)</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 font-sans">
                  <div
                    className={`p-2.5 rounded-lg border ${
                      isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800/80'
                    }`}
                  >
                    <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>রক্তের গ্রুপ</div>
                    <div className={`font-mono font-bold text-xs mt-0.5 ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>
                      {activePerson.bloodGroup || 'O+'}
                    </div>
                  </div>

                  <div
                    className={`p-2.5 rounded-lg border ${
                      isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800/80'
                    }`}
                  >
                    <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>মেডিকেল ক্যাটাগরি</div>
                    <div className={`font-mono font-bold text-xs mt-0.5 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                      {activePerson.medicalCategory || 'AYE'}
                    </div>
                  </div>

                  <div
                    className={`p-2.5 rounded-lg border ${
                      isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800/80'
                    }`}
                  >
                    <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>বর্তমান অবস্থান / বিবরণ</div>
                    <div className={`font-semibold text-xs mt-0.5 truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {locationText || 'In Unit'}
                    </div>
                  </div>

                  {(dateText || endDateText) && (
                    <div
                      className={`p-2.5 rounded-lg border col-span-2 ${
                        isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800/80'
                      }`}
                    >
                      <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>তারিখ ও মেয়াদ</div>
                      <div className={`font-mono text-xs mt-0.5 ${isLight ? 'text-amber-800 font-semibold' : 'text-amber-300'}`}>
                        {dateText || '-'} থেকে {endDateText || '-'}{' '}
                        {activePerson.durationDays ? `(মোট ${activePerson.durationDays} দিন)` : ''}
                      </div>
                    </div>
                  )}

                  {(activePerson.authority || activePerson.outOfUnitAuthority) && (
                    <div
                      className={`p-2.5 rounded-lg border ${
                        isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800/80'
                      }`}
                    >
                      <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>কর্তৃপক্ষ / আদেশ</div>
                      <div className={`font-semibold text-xs mt-0.5 truncate ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                        {activePerson.outOfUnitAuthority || activePerson.authority}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Section 3: Training State Records (from Supabase `trg_state`) */}
          {showSection('training') && (
            <div
              className={`p-3.5 rounded-xl border space-y-2.5 ${
                isLight ? 'bg-emerald-50/40 border-emerald-200' : 'bg-slate-950/70 border-emerald-900/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <h4
                  className={`text-[11px] font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 ${
                    isLight ? 'text-emerald-800' : 'text-emerald-400'
                  }`}
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>প্রশিক্ষণ রেকর্ডসমূহ (Training State — RET, IPFT, Grenade, Firing)</span>
                </h4>
                <span className="text-[11px] font-mono font-bold opacity-80">{trainingsList.total} টি</span>
              </div>

              {trainingsList.total === 0 ? (
                <div className={`text-[11px] py-3 text-center rounded-lg border border-dashed ${
                  isLight ? 'border-emerald-200 text-slate-500 bg-white/70' : 'border-slate-800 text-slate-500 bg-slate-900/40'
                }`}>
                  এই সৈনিকের কোনো প্রশিক্ষণ (RET / IPFT / Firing) রেকর্ড পাওয়া যায়নি।
                </div>
              ) : (
                <div className="space-y-2">
                  {trainingsList.dbTrainings.map((t) => {
                    const isIpft = t.module === 'IPFT';
                    const ipftResult = isIpft ? getIpftResultCategory(t) : null;
                    const displayGrade = isIpft ? ipftResult : t.grade;
                    const displayStatus = isIpft ? ipftResult : t.status;
                    return (
                    <div
                      key={t.id}
                      className={`p-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                        isLight ? 'bg-white border-emerald-200' : 'bg-slate-900 border-slate-800'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                            {t.module}
                          </span>
                          {t.biannual && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                              {t.biannual}
                            </span>
                          )}
                          {t.boardName && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-500/15 text-slate-300 border border-slate-600/40">
                              {t.boardName}
                            </span>
                          )}
                          {!isIpft && <span className="font-bold text-xs">{displayGrade}</span>}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${
                            displayStatus === 'Distinction'
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              : displayStatus === 'Failed' || displayStatus === 'Re-test'
                              ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                              : displayStatus === 'Not Appeared' || displayStatus === 'Pending'
                              ? 'bg-slate-500/15 text-slate-300 border-slate-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}>
                            {displayStatus}
                          </span>
                        </div>
                        {t.scoreDetails && (
                          <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                            {t.scoreDetails}
                          </div>
                        )}
                        {t.remarks && (
                          <div className="text-[10px] text-slate-400 italic">{t.remarks}</div>
                        )}
                      </div>
                      <div className="text-[11px] sm:text-right font-mono shrink-0 space-y-0.5 text-slate-400">
                        <div className="flex items-center sm:justify-end gap-1">
                          <Calendar className="w-3 h-3 text-emerald-400" />
                          <span>{t.date || '-'}</span>
                        </div>
                        {t.location && (
                          <div className="flex items-center sm:justify-end gap-1">
                            <MapPin className="w-3 h-3" />
                            <span>{t.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    );
                  })}
                  {trainingsList.activityTrainings.map((a) => (
                    <div
                      key={a.id}
                      className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 ${
                        isLight ? 'bg-white border-emerald-200' : 'bg-slate-900 border-slate-800'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs">{a.title}</div>
                        <div className="text-[11px] text-slate-400">{a.remarks || a.location}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-[11px] text-slate-400">{a.startDate}</span>
                        {!isGuest && (
                          <button
                            type="button"
                            onClick={() => handleDeleteActivity(a.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 4: Courses & Cadres (from Supabase `course_cadre` + current course) */}
          {showSection('courses') && (
            <div
              className={`p-3.5 rounded-xl border space-y-2.5 ${
                isLight ? 'bg-cyan-50/50 border-cyan-200' : 'bg-slate-950/70 border-cyan-900/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <h4
                  className={`text-[11px] font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 ${
                    isLight ? 'text-cyan-800' : 'text-cyan-400'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>সামরিক কোর্স ও ক্যাডার তালিকা (Courses & Cadres)</span>
                </h4>
                <span className="text-[11px] font-mono font-bold opacity-80">{coursesList.total} টি</span>
              </div>

              {courseDetails && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5 font-sans">
                  <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-cyan-200' : 'bg-slate-900 border-slate-800'}`}>
                    <div className="text-[10px] text-slate-400">চলমান কোর্স</div>
                    <div className={`font-semibold text-xs mt-0.5 ${isLight ? 'text-cyan-800' : 'text-cyan-300'}`}>
                      {courseDetails.courseName}
                    </div>
                  </div>
                  <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-cyan-200' : 'bg-slate-900 border-slate-800'}`}>
                    <div className="text-[10px] text-slate-400">স্থান</div>
                    <div className="font-semibold text-xs mt-0.5 truncate">{courseDetails.place}</div>
                  </div>
                  <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-cyan-200' : 'bg-slate-900 border-slate-800'}`}>
                    <div className="text-[10px] text-slate-400">মেয়াদ</div>
                    <div className="font-mono font-bold text-xs mt-0.5 text-amber-400">
                      {courseDetails.durationWeek} সপ্তাহ
                    </div>
                  </div>
                  <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-cyan-200' : 'bg-slate-900 border-slate-800'}`}>
                    <div className="text-[10px] text-slate-400">তারিখ</div>
                    <div className="font-mono text-xs mt-0.5">
                      {courseDetails.startDate} - {courseDetails.endDate}
                    </div>
                  </div>
                </div>
              )}

              {coursesList.total === 0 ? (
                <div className={`text-[11px] py-3 text-center rounded-lg border border-dashed ${
                  isLight ? 'border-cyan-200 text-slate-500 bg-white/70' : 'border-slate-800 text-slate-500 bg-slate-900/40'
                }`}>
                  এই সৈনিকের সম্পন্নকৃত কোনো কোর্স বা ক্যাডার রেকর্ড পাওয়া যায়নি।
                </div>
              ) : (
                <div className="space-y-2">
                  {coursesList.dbCourses.map((c) => (
                    <div
                      key={c.id}
                      className={`p-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                        isLight ? 'bg-white border-cyan-200' : 'bg-slate-900 border-slate-800'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-bold text-xs ${isLight ? 'text-cyan-900' : 'text-cyan-300'}`}>
                            {c.courseName}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                            {c.grade}
                          </span>
                        </div>
                        <div className={`text-[11px] flex items-center gap-3 flex-wrap ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                          {c.location && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {c.location}
                            </span>
                          )}
                          {c.authority && <span>আদেশ: {c.authority}</span>}
                        </div>
                        {c.remarks && <div className="text-[10px] text-slate-400 italic">{c.remarks}</div>}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1 shrink-0">
                        <Calendar className="w-3 h-3 text-cyan-400" />
                        <span>{c.completionDate || '-'}</span>
                      </div>
                    </div>
                  ))}
                  {coursesList.activityCourses.map((a) => (
                    <div
                      key={a.id}
                      className={`p-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                        isLight ? 'bg-white border-cyan-200' : 'bg-slate-900 border-slate-800'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-bold text-xs ${isLight ? 'text-cyan-900' : 'text-cyan-300'}`}>
                            {a.title}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                            {a.status || 'Completed'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {a.location || '-'} {a.authority ? `• ${a.authority}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-[11px] text-slate-400">
                          {a.startDate}{a.endDate ? ` ➔ ${a.endDate}` : ''}
                        </span>
                        {!isGuest && a.sourceTable === 'manual' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteActivity(a.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 5: Leave / Chuti History */}
          {showSection('leave') && (
            <div
              className={`p-3.5 rounded-xl border space-y-2.5 ${
                isLight ? 'bg-purple-50/40 border-purple-200' : 'bg-slate-950/70 border-purple-900/40'
              }`}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h4
                  className={`text-[11px] font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 ${
                    isLight ? 'text-purple-800' : 'text-purple-400'
                  }`}
                >
                  <PlaneTakeoff className="w-3.5 h-3.5" />
                  <span>ছুটি ও নাইট পাস ইতিহাস (P/Lve, C/Lve & Ni Pass)</span>
                </h4>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30">
                    P/Lve: {leaveTypeBreakdown.pLve}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-fuchsia-500/15 text-fuchsia-400 border border-fuchsia-500/30">
                    C/Lve: {leaveTypeBreakdown.cLve}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                    Ni Pass: {leaveTypeBreakdown.niPass}
                  </span>
                  <span className="text-[11px] font-mono font-bold opacity-80 ml-1">
                    মোট {leavesList.length} বার {totalLeaveDays > 0 ? `(${totalLeaveDays} দিন)` : ''}
                  </span>
                </div>
              </div>

              {leavesList.length === 0 ? (
                <div className={`text-[11px] py-3 text-center rounded-lg border border-dashed ${
                  isLight ? 'border-purple-200 text-slate-500 bg-white/70' : 'border-slate-800 text-slate-500 bg-slate-900/40'
                }`}>
                  এই সৈনিকের কোনো ছুটির (P/Lve বা C/Lve) রেকর্ড এখনো লিপিবদ্ধ নেই।
                </div>
              ) : (
                <div className="space-y-2">
                  {leavesList.map((l) => (
                    <div
                      key={l.id}
                      className={`p-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                        isLight ? 'bg-white border-purple-200' : 'bg-slate-900 border-slate-800'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30">
                            {l.subType || 'Leave'}
                          </span>
                          <span className="font-bold text-xs">{l.title}</span>
                          {l.durationDays && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              {l.durationDays} দিন
                            </span>
                          )}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                            l.status === 'Active'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {l.status === 'Active' ? 'ছুটিতে আছেন' : l.status === 'Returned' ? 'যোগদান করেছেন' : 'সম্পন্ন'}
                          </span>
                        </div>
                        <div className={`text-[11px] flex items-center gap-3 flex-wrap ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                          {l.location && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {l.location}
                            </span>
                          )}
                          {l.authority && <span>আদেশ: {l.authority}</span>}
                        </div>
                        {l.remarks && <div className="text-[10px] text-slate-400 italic">{l.remarks}</div>}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-purple-400" />
                          <span>
                            {l.startDate || '-'} {l.endDate ? `➔ ${l.endDate}` : ''}
                          </span>
                        </div>
                        {!isGuest && l.sourceTable === 'manual' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteActivity(l.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 6: Duties & Out-of-Unit / Career Timeline */}
          {showSection('duties') && (
            <div
              className={`p-3.5 rounded-xl border space-y-2.5 ${
                isLight ? 'bg-amber-50/40 border-amber-200' : 'bg-slate-950/70 border-amber-900/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <h4
                  className={`text-[11px] font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 ${
                    isLight ? 'text-amber-800' : 'text-amber-400'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>ডিউটি রোস্টার, ক্যাম্প ও অন্যান্য কার্যক্রম (Duties, Deployments & Career)</span>
                </h4>
                <span className="text-[11px] font-mono font-bold opacity-80">
                  {dutiesList.length + otherActivitiesList.length} টি
                </span>
              </div>

              {dutiesList.length === 0 && otherActivitiesList.length === 0 ? (
                <div className={`text-[11px] py-3 text-center rounded-lg border border-dashed ${
                  isLight ? 'border-amber-200 text-slate-500 bg-white/70' : 'border-slate-800 text-slate-500 bg-slate-900/40'
                }`}>
                  কোনো ডিউটি বা অতিরিক্ত ক্যারিয়ার কার্যক্রম রেকর্ড পাওয়া যায়নি।
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Duties from Duty Detailing */}
                  {dutiesList.map((d) => (
                    <div
                      key={d.id}
                      className={`p-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                        isLight ? 'bg-white border-amber-200' : 'bg-slate-900 border-slate-800'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            ডিউটি ({d.category})
                          </span>
                          <span className="font-bold text-xs">{d.dutyName}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                            {d.sessionType}
                          </span>
                        </div>
                        <div className={`text-[11px] flex items-center gap-3 flex-wrap ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                          {d.location && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {d.location}
                            </span>
                          )}
                          {d.dutyTime && (
                            <span className="inline-flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3" />
                              {d.dutyTime}
                            </span>
                          )}
                          {d.weaponOrAmmo && <span>অস্ত্র: {d.weaponOrAmmo}</span>}
                        </div>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1 shrink-0">
                        <Calendar className="w-3 h-3 text-amber-400" />
                        <span>{d.date || '-'}</span>
                      </div>
                    </div>
                  ))}

                  {/* Other Career / Out-of-Unit Activities */}
                  {otherActivitiesList.map((a) => (
                    <div
                      key={a.id}
                      className={`p-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                            {a.type}
                          </span>
                          <span className="font-bold text-xs">{a.title}</span>
                          {a.status && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                              {a.status}
                            </span>
                          )}
                        </div>
                        <div className={`text-[11px] flex items-center gap-3 flex-wrap ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                          {a.location && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {a.location}
                            </span>
                          )}
                          {a.authority && <span>আদেশ: {a.authority}</span>}
                        </div>
                        {a.remarks && <div className="text-[10px] text-slate-400 italic">{a.remarks}</div>}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {a.startDate || '-'} {a.endDate ? `➔ ${a.endDate}` : ''}
                          </span>
                        </div>
                        {!isGuest && a.sourceTable === 'manual' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteActivity(a.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 7: Contact & Emergency (only on 'all' tab) */}
          {activeTab === 'all' && (
            <div
              className={`p-3.5 rounded-xl border space-y-2 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'
              }`}
            >
              <h4
                className={`text-[11px] font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 ${
                  isLight ? 'text-slate-700' : 'text-slate-400'
                }`}
              >
                <Phone className="w-3.5 h-3.5 text-blue-500" />
                <span>যোগাযোগ ও জরুরি তথ্য (Contact & Emergency)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 font-sans">
                <div
                  className={`p-2.5 rounded-lg border ${
                    isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800/80'
                  }`}
                >
                  <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>মোবাইল নম্বর</div>
                  <div className={`font-mono font-semibold text-xs mt-0.5 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                    {activePerson.phone || activePerson.mobileNo || '-'}
                  </div>
                </div>

                <div
                  className={`p-2.5 rounded-lg border ${
                    isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800/80'
                  }`}
                >
                  <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>জরুরি অভিভাবক (NOK Name)</div>
                  <div className={`font-semibold text-xs mt-0.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                    {activePerson.nokName || '-'}
                  </div>
                </div>

                <div
                  className={`p-2.5 rounded-lg border ${
                    isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800/80'
                  }`}
                >
                  <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>অভিভাবকের যোগাযোগ নম্বর</div>
                  <div className={`font-mono text-xs mt-0.5 ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                    {activePerson.nokContact || activePerson.emergencyContact || '-'}
                  </div>
                </div>

                <div
                  className={`p-2.5 rounded-lg border ${
                    isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800/80'
                  }`}
                >
                  <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>পূর্ববর্তী ইউনিট / মন্তব্য</div>
                  <div className={`font-semibold text-xs mt-0.5 truncate ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                    {activePerson.previousUnit || activePerson.remarks || activePerson.rmk || '-'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`px-5 py-3 border-t flex items-center justify-between gap-3 text-xs shrink-0 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
          }`}
        >
          <span className="font-mono text-[11px] text-slate-500 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>10 MED REGT ARTY • INTERCONNECTED DOSSIER</span>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
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
              type="button"
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
