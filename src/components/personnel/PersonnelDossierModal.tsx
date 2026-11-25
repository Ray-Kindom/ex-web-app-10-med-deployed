import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { Personnel, ServiceActivityRecord, ServiceActivityType } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
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
  RefreshCw,
  Plus,
  Trash2,
} from 'lucide-react';

interface PersonnelDossierModalProps {
  person: Personnel | null;
  isOpen: boolean;
  onClose: () => void;
}

type DossierTab = 'all' | 'courses' | 'training' | 'leave' | 'duties';

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

  const targetPersonId = activePerson?.id || '';
  const targetPersonSnk = activePerson?.snkNo || '';
  const modalPersonKey = isOpen ? (person?.id || person?.snkNo || '') : '';

  const loadDossier = useCallback(async () => {
    if (!targetPersonId) return;
    setIsLoadingDossier(true);
    try {
      const res = await fetchPersonnelDossierFromSupabase(targetPersonId, targetPersonSnk);
      setDossierData(res);
    } catch (err) {
      console.warn('Failed to fetch dossier from Supabase:', err);
    } finally {
      setIsLoadingDossier(false);
    }
  }, [targetPersonId, targetPersonSnk]);

  // Reset tab only when modal opens or a different soldier is selected
  useEffect(() => {
    if (isOpen && modalPersonKey) {
      setActiveTab('all');
      setIsAddActivityOpen(false);
    }
  }, [isOpen, modalPersonKey]);

  // Fetch dossier data without resetting the active tab
  useEffect(() => {
    if (isOpen && targetPersonId) {
      loadDossier();
    }
  }, [isOpen, targetPersonId, loadDossier]);

  // Merge activities cleanly (deduplicating by id and avoiding duplicate current status entries)
  const mergedActivities = useMemo(() => {
    if (!activePerson) return [];
    const byId = new Map<string, ServiceActivityRecord>();

    const addIfUnique = (rec: ServiceActivityRecord) => {
      if (!rec || byId.has(rec.id)) return;
      byId.set(rec.id, rec);
    };

    (dossierData?.activities || []).forEach(addIfUnique);
    (dossierData?.freshActivityHistory || []).forEach(addIfUnique);
    (activePerson.activityHistory || []).forEach(addIfUnique);

    const st = (activePerson.status || '').trim();
    const cat = activePerson.outOfUnitCategory;
    if (st && st !== 'In Unit' && st !== 'Present' && st !== 'Civilian') {
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

  // 1. Courses & Cadres (deduplicated against ongoing course info)
  const ongoingCourseInfo = useMemo(() => {
    if (!activePerson) return null;
    if (
      activePerson.courseName ||
      activePerson.status === 'Course' ||
      activePerson.outOfUnitCategory === 'Course'
    ) {
      return parseMilitaryCourseInfo(activePerson);
    }
    return null;
  }, [activePerson]);

  const coursesList = useMemo(() => {
    const dbCourses = dossierData?.courses || [];
    const courseActs = mergedActivities.filter(
      (a) =>
        a.type === 'Course' &&
        a.sourceTable !== 'course_cadre' &&
        !(
          ongoingCourseInfo &&
          a.id.startsWith('current_state_') &&
          a.title.toLowerCase().includes((ongoingCourseInfo.courseName || '').toLowerCase())
        ) &&
        !dbCourses.some(
          (c) =>
            c.courseName.toLowerCase().trim() === a.title.replace(/^Course:\s*/i, '').toLowerCase().trim() &&
            (!a.startDate || c.completionDate === a.startDate)
        )
    );
    return {
      dbCourses,
      activityCourses: courseActs,
      total: dbCourses.length + courseActs.length + (ongoingCourseInfo ? 1 : 0),
    };
  }, [dossierData, mergedActivities, ongoingCourseInfo]);

  // 2. Trainings
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

  // 3. Leaves
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

  const leaveSummary = useMemo(() => {
    let pLve = 0;
    let cLve = 0;
    let niPass = 0;
    let days = 0;
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
      if (typeof l.durationDays === 'number' && l.durationDays > 0) {
        days += l.durationDays;
      } else if (l.startDate && l.endDate) {
        const d1 = new Date(l.startDate).getTime();
        const d2 = new Date(l.endDate).getTime();
        if (!isNaN(d1) && !isNaN(d2) && d2 >= d1) {
          days += Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
        }
      }
    });
    return { pLve, cLve, niPass, days };
  }, [leavesList]);

  // 4. Duties
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

  // 5. Other Deployments / Out-of-Unit / General Events
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
    { id: 'all', label: 'সব তথ্য' },
    { id: 'courses', label: 'কোর্স ও ক্যাডার', count: coursesList.total },
    { id: 'training', label: 'প্রশিক্ষণ', count: trainingsList.total },
    { id: 'leave', label: 'ছুটি', count: leavesList.length },
    { id: 'duties', label: 'ডিউটি ও অন্যান্য', count: dutiesList.length + otherActivitiesList.length },
  ];

  const showSection = (tab: DossierTab) => activeTab === 'all' || activeTab === tab;

  // Neutral surface helpers
  const cardBg = isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800';
  const sectionBg = isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-slate-950/60 border-slate-800';
  const mutedText = isLight ? 'text-slate-500' : 'text-slate-400';
  const primaryText = isLight ? 'text-slate-900' : 'text-slate-100';
  const inputCls = `w-full rounded-lg px-2.5 py-1.5 border text-xs focus:outline-none focus:border-slate-500 ${
    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
  }`;

  const showCurrentStateBar =
    (activePerson.status && activePerson.status !== 'Present' && activePerson.status !== 'In Unit') ||
    locationText ||
    dateText;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div
        className={`relative w-full max-w-4xl border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
          isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
        }`}
      >
        {/* Minimal Header */}
        <div
          className={`px-5 py-3 border-b flex items-center justify-between shrink-0 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
          }`}
        >
          <h3 className={`text-sm sm:text-base font-bold ${primaryText}`}>
            সৈনিক ডসিয়ার (Soldier Dossier)
          </h3>

          <div className="flex items-center gap-1.5">
            {!isGuest && (
              <button
                type="button"
                onClick={() => setIsAddActivityOpen((prev) => !prev)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors inline-flex items-center gap-1 cursor-pointer ${
                  isAddActivityOpen
                    ? isLight
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-100 text-slate-900 border-slate-100'
                    : isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>নতুন এন্ট্রি</span>
              </button>
            )}
            <button
              type="button"
              onClick={loadDossier}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-600 border-slate-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="রিফ্রেশ করুন"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDossier ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-600 border-slate-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="প্রিন্ট করুন"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-600 border-slate-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="বন্ধ করুন"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Clean Soldier Identity & Key Info (No Duplicate Cards) */}
        <div
          className={`px-5 py-3.5 border-b space-y-3 shrink-0 ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded border ${
                  isLight ? 'bg-slate-100 text-slate-800 border-slate-300' : 'bg-slate-800 text-slate-200 border-slate-700'
                }`}>
                  {activePerson.snkNo}
                </span>
                <span className={`text-base font-bold ${primaryText}`}>
                  {activePerson.rk} {activePerson.trade ? `(${activePerson.trade})` : ''} {activePerson.name}
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded border ${
                  isLight ? 'bg-slate-50 text-slate-700 border-slate-200' : 'bg-slate-800/70 text-slate-300 border-slate-700'
                }`}>
                  {activePerson.battery}
                </span>
              </div>
            </div>

            <StatusBadge
              status={activePerson.status}
              outOfUnitCategory={activePerson.outOfUnitCategory}
              details={activePerson.statusDetails}
              size="md"
            />
          </div>

          {/* Single Compact Key-Value Strip (No Repetition) */}
          <div
            className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-x-4 gap-y-2 pt-2.5 border-t text-xs ${
              isLight ? 'border-slate-100' : 'border-slate-800/80'
            }`}
          >
            <div>
              <div className={`text-[10px] ${mutedText}`}>রক্তের গ্রুপ</div>
              <div className={`font-mono font-semibold ${primaryText}`}>{activePerson.bloodGroup || '-'}</div>
            </div>
            <div>
              <div className={`text-[10px] ${mutedText}`}>মেডিকেল ক্যাটাগরি</div>
              <div className={`font-mono font-semibold ${primaryText}`}>{activePerson.medicalCategory || 'AYE'}</div>
            </div>
            <div>
              <div className={`text-[10px] ${mutedText}`}>ব্যাচ / ভর্তি</div>
              <div className={`font-mono ${primaryText}`}>
                {activePerson.batch || '-'}
                {activePerson.enlistmentDate ? ` • ${activePerson.enlistmentDate}` : ''}
              </div>
            </div>
            <div>
              <div className={`text-[10px] ${mutedText}`}>মোবাইল নম্বর</div>
              <div className={`font-mono ${primaryText}`}>{activePerson.phone || activePerson.mobileNo || '-'}</div>
            </div>
            <div>
              <div className={`text-[10px] ${mutedText}`}>জরুরি অভিভাবক (NOK)</div>
              <div className={`truncate ${primaryText}`} title={activePerson.nokName || ''}>
                {activePerson.nokName || '-'}
                {(activePerson.nokContact || activePerson.emergencyContact)
                  ? ` (${activePerson.nokContact || activePerson.emergencyContact})`
                  : ''}
              </div>
            </div>
            <div>
              <div className={`text-[10px] ${mutedText}`}>পূর্ববর্তী ইউনিট / মন্তব্য</div>
              <div className={`truncate ${primaryText}`} title={activePerson.previousUnit || activePerson.remarks || ''}>
                {activePerson.previousUnit || activePerson.remarks || activePerson.rmk || '-'}
              </div>
            </div>
          </div>

          {/* Compact Current Location/Out-of-Unit line only when relevant */}
          {showCurrentStateBar && (
            <div
              className={`px-3 py-1.5 rounded-lg border text-[11px] flex items-center gap-4 flex-wrap ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}
            >
              <span>
                <strong className={mutedText}>অবস্থান:</strong> {locationText || 'In Unit'}
              </span>
              {(dateText || endDateText) && (
                <span className="font-mono">
                  <strong className={mutedText}>তারিখ:</strong> {dateText || '-'} থেকে {endDateText || '-'}
                  {activePerson.durationDays ? ` (${activePerson.durationDays} দিন)` : ''}
                </span>
              )}
              {(activePerson.outOfUnitAuthority || activePerson.authority) && (
                <span>
                  <strong className={mutedText}>আদেশ:</strong> {activePerson.outOfUnitAuthority || activePerson.authority}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Simple Single Tab Bar (Replaces Redundant Summary Strip + Tab Bar) */}
        <div
          className={`px-5 py-2 border-b flex items-center gap-1.5 overflow-x-auto shrink-0 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-slate-800'
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
                    ? isLight
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-100 text-slate-900 border-slate-100'
                    : isLight
                    ? 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <span>{t.label}</span>
                {t.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${
                      isActive
                        ? isLight
                          ? 'bg-slate-700 text-white'
                          : 'bg-slate-300 text-slate-900'
                        : isLight
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-slate-800 text-slate-400'
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
          {/* Quick Add Form */}
          {isAddActivityOpen && !isGuest && (
            <form onSubmit={handleQuickAddActivity} className={`p-3.5 rounded-lg border space-y-3 ${sectionBg}`}>
              <div className="flex items-center justify-between">
                <span className={`font-bold text-xs ${primaryText}`}>নতুন কার্যক্রম / ছুটি যুক্ত করুন</span>
                <button
                  type="button"
                  onClick={() => setIsAddActivityOpen(false)}
                  className={`${mutedText} hover:opacity-100 cursor-pointer`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className={`block text-[11px] font-medium mb-1 ${mutedText}`}>ক্যাটাগরি</label>
                  <select
                    value={actType}
                    onChange={(e) => {
                      const val = e.target.value as ServiceActivityType;
                      setActType(val);
                      setActSubType(val === 'Leave' ? 'P/Lve' : val);
                    }}
                    className={inputCls}
                  >
                    <option value="Leave">ছুটি (Leave / Chuti)</option>
                    <option value="Training">প্রশিক্ষণ (Training)</option>
                    <option value="Course">কোর্স / ক্যাডার (Course)</option>
                    <option value="FDMN Camp">FDMN ক্যাম্প</option>
                    <option value="CMH">CMH / মেডিকেল</option>
                    <option value="Duty">ডিউটি (Duty)</option>
                    <option value="Promotion">প্রমোশন (Promotion)</option>
                    <option value="Award">পুরস্কার (Award)</option>
                    <option value="General">অন্যান্য (General)</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-[11px] font-medium mb-1 ${mutedText}`}>ধরন / উপ-শিরোনাম</label>
                  {actType === 'Leave' ? (
                    <select value={actSubType} onChange={(e) => setActSubType(e.target.value)} className={inputCls}>
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
                      className={inputCls}
                    />
                  )}
                </div>

                <div>
                  <label className={`block text-[11px] font-medium mb-1 ${mutedText}`}>শিরোনাম / বিবরণ</label>
                  <input
                    type="text"
                    value={actTitle}
                    onChange={(e) => setActTitle(e.target.value)}
                    placeholder={actType === 'Leave' ? 'e.g. বাৎসরিক ছুটি' : 'কার্যক্রমের শিরোনাম...'}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className={`block text-[11px] font-medium mb-1 ${mutedText}`}>শুরুর তারিখ *</label>
                  <input type="date" required value={actStartDate} onChange={(e) => setActStartDate(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={`block text-[11px] font-medium mb-1 ${mutedText}`}>শেষ তারিখ</label>
                  <input type="date" value={actEndDate} onChange={(e) => setActEndDate(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={`block text-[11px] font-medium mb-1 ${mutedText}`}>স্থান / ঠিকানা</label>
                  <input type="text" value={actLocation} onChange={(e) => setActLocation(e.target.value)} placeholder="স্থান..." className={inputCls} />
                </div>
                <div>
                  <label className={`block text-[11px] font-medium mb-1 ${mutedText}`}>আদেশ (Authority)</label>
                  <input type="text" value={actAuthority} onChange={(e) => setActAuthority(e.target.value)} placeholder="Authority..." className={inputCls} />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={actRemarks}
                  onChange={(e) => setActRemarks(e.target.value)}
                  placeholder="মন্তব্য (ঐচ্ছিক)..."
                  className={inputCls}
                />
                <button
                  type="submit"
                  className={`px-4 py-1.5 rounded-lg font-semibold cursor-pointer shrink-0 ${
                    isLight ? 'bg-slate-900 hover:bg-slate-800 text-white' : 'bg-slate-100 hover:bg-white text-slate-900'
                  }`}
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          )}

          {/* Section 1: Courses & Cadres */}
          {showSection('courses') && (
            <div className={`p-3.5 rounded-lg border space-y-2 ${sectionBg}`}>
              <div className="flex items-center justify-between">
                <h4 className={`text-xs font-bold ${primaryText}`}>কোর্স ও ক্যাডার তালিকা (Courses & Cadres)</h4>
                <span className={`text-[11px] font-mono ${mutedText}`}>{coursesList.total} টি</span>
              </div>

              {coursesList.total === 0 ? (
                <div className={`text-[11px] py-2 ${mutedText}`}>কোনো কোর্স বা ক্যাডার রেকর্ড পাওয়া যায়নি।</div>
              ) : (
                <div className={`divide-y rounded-lg border ${cardBg} ${isLight ? 'divide-slate-100' : 'divide-slate-800'}`}>
                  {ongoingCourseInfo && (
                    <div className="px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div>
                        <div className={`font-semibold text-xs ${primaryText}`}>
                          {ongoingCourseInfo.courseName}{' '}
                          <span className="text-[10px] font-mono font-normal px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 ml-1">
                            চলমান
                          </span>
                        </div>
                        <div className={`text-[11px] ${mutedText}`}>
                          {ongoingCourseInfo.place} • মেয়াদ: {ongoingCourseInfo.durationWeek} সপ্তাহ
                        </div>
                      </div>
                      <div className={`text-[11px] font-mono shrink-0 ${mutedText}`}>
                        {ongoingCourseInfo.startDate} - {ongoingCourseInfo.endDate}
                      </div>
                    </div>
                  )}

                  {coursesList.dbCourses.map((c) => (
                    <div key={c.id} className="px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-semibold text-xs ${primaryText}`}>{c.courseName}</span>
                          {c.grade && c.grade !== '—' && (
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                                isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              {c.grade}
                            </span>
                          )}
                        </div>
                        <div className={`text-[11px] flex items-center gap-2 flex-wrap ${mutedText}`}>
                          {c.location && <span>{c.location}</span>}
                          {c.remarks && <span>• {c.remarks}</span>}
                        </div>
                      </div>
                      <div className={`text-[11px] font-mono shrink-0 ${mutedText}`}>
                        {c.completionDate || '—'}
                      </div>
                    </div>
                  ))}

                  {coursesList.activityCourses.map((a) => (
                    <div key={a.id} className="px-3 py-2 flex items-center justify-between gap-2">
                      <div>
                        <div className={`font-semibold text-xs ${primaryText}`}>{a.title}</div>
                        <div className={`text-[11px] ${mutedText}`}>
                          {a.location || '-'} {a.authority ? `• ${a.authority}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`font-mono text-[11px] ${mutedText}`}>
                          {a.startDate}{a.endDate ? ` - ${a.endDate}` : ''}
                        </span>
                        {!isGuest && a.sourceTable === 'manual' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteActivity(a.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
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

          {/* Section 2: Training State */}
          {showSection('training') && (
            <div className={`p-3.5 rounded-lg border space-y-2 ${sectionBg}`}>
              <div className="flex items-center justify-between">
                <h4 className={`text-xs font-bold ${primaryText}`}>প্রশিক্ষণ রেকর্ডসমূহ (RET, IPFT, Firing)</h4>
                <span className={`text-[11px] font-mono ${mutedText}`}>{trainingsList.total} টি</span>
              </div>

              {trainingsList.total === 0 ? (
                <div className={`text-[11px] py-2 ${mutedText}`}>কোনো প্রশিক্ষণ রেকর্ড পাওয়া যায়নি।</div>
              ) : (
                <div className={`divide-y rounded-lg border ${cardBg} ${isLight ? 'divide-slate-100' : 'divide-slate-800'}`}>
                  {trainingsList.dbTrainings.map((t) => {
                    const isIpft = t.module === 'IPFT';
                    const ipftResult = isIpft ? getIpftResultCategory(t) : null;
                    const displayStatus = isIpft ? ipftResult : t.status;
                    return (
                      <div key={t.id} className="px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-semibold text-xs ${primaryText}`}>{t.module}</span>
                            {(t.biannual || t.boardName) && (
                              <span className={`text-[11px] font-mono ${mutedText}`}>
                                ({[t.biannual, t.boardName].filter(Boolean).join(' • ')})
                              </span>
                            )}
                            {!isIpft && t.grade && <span className={`text-[11px] font-medium ${primaryText}`}>• {t.grade}</span>}
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${
                                displayStatus === 'Failed' || displayStatus === 'Re-test'
                                  ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                                  : isLight
                                  ? 'bg-slate-100 text-slate-700 border-slate-200'
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              {displayStatus}
                            </span>
                          </div>
                          {(t.scoreDetails || t.remarks) && (
                            <div className={`text-[11px] ${mutedText}`}>
                              {[t.scoreDetails, t.remarks].filter(Boolean).join(' • ')}
                            </div>
                          )}
                        </div>
                        <div className={`text-[11px] font-mono shrink-0 sm:text-right ${mutedText}`}>
                          <div>{t.date || '-'}</div>
                          {t.location && <div>{t.location}</div>}
                        </div>
                      </div>
                    );
                  })}

                  {trainingsList.activityTrainings.map((a) => (
                    <div key={a.id} className="px-3 py-2 flex items-center justify-between gap-2">
                      <div>
                        <div className={`font-semibold text-xs ${primaryText}`}>{a.title}</div>
                        <div className={`text-[11px] ${mutedText}`}>{a.remarks || a.location}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`font-mono text-[11px] ${mutedText}`}>{a.startDate}</span>
                        {!isGuest && (
                          <button
                            type="button"
                            onClick={() => handleDeleteActivity(a.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
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

          {/* Section 3: Leave / Chuti */}
          {showSection('leave') && (
            <div className={`p-3.5 rounded-lg border space-y-2 ${sectionBg}`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h4 className={`text-xs font-bold ${primaryText}`}>ছুটি ও নাইট পাস (Leave History)</h4>
                <span className={`text-[11px] font-mono ${mutedText}`}>
                  P/Lve: {leaveSummary.pLve} • C/Lve: {leaveSummary.cLve} • Ni Pass: {leaveSummary.niPass} • মোট {leavesList.length} বার
                  {leaveSummary.days > 0 ? ` (${leaveSummary.days} দিন)` : ''}
                </span>
              </div>

              {leavesList.length === 0 ? (
                <div className={`text-[11px] py-2 ${mutedText}`}>কোনো ছুটির রেকর্ড পাওয়া যায়নি।</div>
              ) : (
                <div className={`divide-y rounded-lg border ${cardBg} ${isLight ? 'divide-slate-100' : 'divide-slate-800'}`}>
                  {leavesList.map((l) => (
                    <div key={l.id} className="px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${
                              isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {l.subType || 'Leave'}
                          </span>
                          <span className={`font-semibold text-xs ${primaryText}`}>{l.title}</span>
                          {l.durationDays && (
                            <span className={`text-[11px] font-mono ${mutedText}`}>({l.durationDays} দিন)</span>
                          )}
                          {l.status === 'Active' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-medium">
                              ছুটিতে আছেন
                            </span>
                          )}
                        </div>
                        {(l.location || l.authority || l.remarks) && (
                          <div className={`text-[11px] ${mutedText}`}>
                            {[l.location, l.authority ? `আদেশ: ${l.authority}` : '', l.remarks].filter(Boolean).join(' • ')}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[11px] font-mono ${mutedText}`}>
                          {l.startDate || '-'}{l.endDate ? ` - ${l.endDate}` : ''}
                        </span>
                        {!isGuest && l.sourceTable === 'manual' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteActivity(l.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
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

          {/* Section 4: Duties & Other Activities */}
          {showSection('duties') && (
            <div className={`p-3.5 rounded-lg border space-y-2 ${sectionBg}`}>
              <div className="flex items-center justify-between">
                <h4 className={`text-xs font-bold ${primaryText}`}>ডিউটি ও অন্যান্য কার্যক্রম (Duties & Other)</h4>
                <span className={`text-[11px] font-mono ${mutedText}`}>
                  {dutiesList.length + otherActivitiesList.length} টি
                </span>
              </div>

              {dutiesList.length === 0 && otherActivitiesList.length === 0 ? (
                <div className={`text-[11px] py-2 ${mutedText}`}>কোনো ডিউটি বা অতিরিক্ত কার্যক্রম পাওয়া যায়নি।</div>
              ) : (
                <div className={`divide-y rounded-lg border ${cardBg} ${isLight ? 'divide-slate-100' : 'divide-slate-800'}`}>
                  {dutiesList.map((d) => (
                    <div key={d.id} className="px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                              isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            ডিউটি ({d.category})
                          </span>
                          <span className={`font-semibold text-xs ${primaryText}`}>{d.dutyName}</span>
                          <span className={`text-[11px] ${mutedText}`}>• {d.sessionType}</span>
                        </div>
                        {(d.location || d.dutyTime || d.weaponOrAmmo) && (
                          <div className={`text-[11px] ${mutedText}`}>
                            {[d.location, d.dutyTime, d.weaponOrAmmo ? `অস্ত্র: ${d.weaponOrAmmo}` : '']
                              .filter(Boolean)
                              .join(' • ')}
                          </div>
                        )}
                      </div>
                      <div className={`text-[11px] font-mono shrink-0 ${mutedText}`}>{d.date || '-'}</div>
                    </div>
                  ))}

                  {otherActivitiesList.map((a) => (
                    <div key={a.id} className="px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                              isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {a.type}
                          </span>
                          <span className={`font-semibold text-xs ${primaryText}`}>{a.title}</span>
                          {a.status && <span className={`text-[11px] ${mutedText}`}>• {a.status}</span>}
                        </div>
                        {(a.location || a.authority || a.remarks) && (
                          <div className={`text-[11px] ${mutedText}`}>
                            {[a.location, a.authority ? `আদেশ: ${a.authority}` : '', a.remarks]
                              .filter(Boolean)
                              .join(' • ')}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[11px] font-mono ${mutedText}`}>
                          {a.startDate || '-'}{a.endDate ? ` - ${a.endDate}` : ''}
                        </span>
                        {!isGuest && a.sourceTable === 'manual' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteActivity(a.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
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
        </div>
      </div>
    </div>
  );
};
