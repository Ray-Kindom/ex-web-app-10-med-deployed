import React, { useState, useMemo, useEffect } from 'react';
import {
  Personnel,
  ParadeStatus,
  isNCERank,
  isCivilianRank,
  ServiceActivityRecord,
  ServiceActivityType,
  ParadeDutyAssignment,
} from '../../types';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';
import { RankBadge } from '../common/RankBadge';
import { UnitLogo } from '../common/UnitLogo';
import {
  X,
  User,
  Shield,
  Activity,
  Heart,
  Phone,
  Calendar,
  Building,
  CheckCircle,
  FileText,
  Clock,
  AlertCircle,
  Tent,
  GraduationCap,
  HeartPulse,
  PlaneTakeoff,
  Globe,
  Plus,
  Trash2,
  Printer,
  Search,
  Filter,
  Award,
  ChevronDown,
  ChevronUp,
  MapPin,
  Compass,
  Check,
} from 'lucide-react';

interface PersonnelDossierModalProps {
  person: Personnel | null;
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'history' | 'duty' | 'profile' | 'medical';

export const PersonnelDossierModal: React.FC<PersonnelDossierModalProps> = ({
  person,
  isOpen,
  onClose,
}) => {
  const {
    updateParadeStatus,
    currentUser,
    paradeDutyAssignments,
    addPersonnelActivity,
    deletePersonnelActivity,
    isGuest,
  } = useApp();

  const [activeTab, setActiveTab] = useState<TabType>('history');
  const [selectedStatus, setSelectedStatus] = useState<ParadeStatus>(person?.status || 'In Unit');
  const [statusReason, setStatusReason] = useState<string>(person?.statusDetails || '');
  const [isEditingStatus, setIsEditingStatus] = useState<boolean>(false);

  // Activity filter & search states
  const [activityFilter, setActivityFilter] = useState<'All' | ServiceActivityType | 'Duty'>('All');
  const [activitySearch, setActivitySearch] = useState<string>('');
  const [isAddActivityOpen, setIsAddActivityOpen] = useState<boolean>(false);

  // Add Activity Form states
  const [newType, setNewType] = useState<ServiceActivityType>('Duty');
  const [newTitle, setNewTitle] = useState('');
  const [newSubType, setNewSubType] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEndDate, setNewEndDate] = useState('');
  const [newTimeSlot, setNewTimeSlot] = useState('');
  const [newDurationDays, setNewDurationDays] = useState<number | ''>('');
  const [newAuthority, setNewAuthority] = useState('');
  const [newRemarks, setNewRemarks] = useState('');
  const [newWeapon, setNewWeapon] = useState('');

  // Sync state whenever person changes
  useEffect(() => {
    if (person) {
      setSelectedStatus(person.status || 'In Unit');
      setStatusReason(person.statusDetails || '');
      setIsEditingStatus(false);
    }
  }, [person]);

  const isCoReadOnly = currentUser.role === 'CO';
  const canEdit = !isGuest && currentUser.role !== 'Guest';

  // 1. Collect all duty detailing assignments for this soldier from all dates & sessions
  const soldierDutyAssignments = useMemo(() => {
    if (!person) return [];
    const list: ParadeDutyAssignment[] = [];
    (Object.values(paradeDutyAssignments) as ParadeDutyAssignment[][]).forEach((assignments) => {
      if (Array.isArray(assignments)) {
        assignments.forEach((a) => {
          if (a.personnelId === person.id || a.snkNo === person.snkNo) {
            list.push(a);
          }
        });
      }
    });
    return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [paradeDutyAssignments, person]);

  // 2. Synthesize unified career activities from activityHistory + duty detailing + existing profile fields
  const allActivities: ServiceActivityRecord[] = useMemo(() => {
    if (!person) return [];
    const records: ServiceActivityRecord[] = [];
    const seenIds = new Set<string>();

    // A. Explicit activityHistory records
    if (person.activityHistory && Array.isArray(person.activityHistory)) {
      person.activityHistory.forEach((rec) => {
        if (!seenIds.has(rec.id)) {
          seenIds.add(rec.id);
          records.push(rec);
        }
      });
    }

    // B. Real duty assignments from duty detailing sessions
    soldierDutyAssignments.forEach((duty) => {
      const dutyId = `duty_${duty.id || duty.date + '_' + duty.dutyName}`;
      if (!seenIds.has(dutyId)) {
        seenIds.add(dutyId);
        records.push({
          id: dutyId,
          type: 'Duty',
          title: duty.dutyName || 'Guard / Security Duty',
          subType: duty.category || 'Unit Sy',
          startDate: duty.date,
          endDate: duty.date,
          timeSlot: duty.dutyTime || (duty.sessionType === 'Morning' ? '0600 - 1200 HRS' : '1800 - 0600 HRS'),
          durationDays: 1,
          location: duty.location || `${person.battery} Guard Post`,
          weaponOrAmmo: duty.weaponOrAmmo,
          authority: `Duty Roster (${duty.sessionType})`,
          remarks: duty.remarks || `Detailed by ${duty.assignedBy || 'RSM'}`,
          recordedAt: duty.assignedAt || new Date().toISOString(),
          recordedBy: duty.assignedBy || 'RSM',
          status: 'Completed',
        });
      }
    });

    // C. Synthesize from profile fields if not already present
    // 1. FDMN Camp
    if (
      person.outOfUnitCategory === 'FDMN' ||
      (person.statusDetails || '').toLowerCase().includes('fdmn') ||
      (person.location || '').toLowerCase().includes('camp') ||
      (person.outOfUnitLocation || '').toLowerCase().includes('হোয়াইকং')
    ) {
      const fdmnId = `synth_fdmn_${person.id}`;
      if (!seenIds.has(fdmnId)) {
        seenIds.add(fdmnId);
        records.push({
          id: fdmnId,
          type: 'FDMN Camp',
          title: 'FDMN Camp Duty (হোয়াইকং রোহিঙ্গা ক্যাম্প)',
          subType: 'FDMN Security',
          startDate: person.outOfUnitStartDate || person.startDate || '2026-06-01',
          endDate: person.outOfUnitEndDate || person.endDate || '2026-09-30',
          durationDays: person.durationDays || 90,
          location: person.outOfUnitLocation || person.location || 'Whykong Camp, Cox\'s Bazar',
          authority: person.outOfUnitAuthority || person.authority || 'HQ 10 Med Regt Arty',
          remarks: person.outOfUnitRemarks || person.remarks || 'Field Security & Boundary Patrolling',
          recordedAt: new Date().toISOString(),
          recordedBy: 'Unit HQ',
          status: person.outOfUnitCategory === 'FDMN' ? 'Active' : 'Completed',
        });
      }
    }

    // 2. Military Course / Cadre
    if (person.courseName || person.status === 'Course' || person.outOfUnitCategory === 'Course') {
      const courseId = `synth_course_${person.id}`;
      if (!seenIds.has(courseId)) {
        seenIds.add(courseId);
        records.push({
          id: courseId,
          type: 'Course',
          title: person.courseName || 'Artillery Cadre / Military Course',
          subType: 'Training Cadre',
          startDate: person.courseFrom || person.startDate || '2026-05-15',
          endDate: person.courseTo || person.endDate || '2026-07-15',
          durationDays: person.durationDays || 45,
          location: person.courseLocation || 'Artillery Centre & School (AC&S)',
          authority: person.authority || 'AHQ Trg Dte',
          remarks: person.remarks || 'Standard Artillery Instruction Course',
          recordedAt: new Date().toISOString(),
          recordedBy: 'Trg Branch',
          status: person.outOfUnitCategory === 'Course' ? 'Active' : 'Completed',
        });
      }
    }

    // 3. CMH / Hospitalization
    if (person.hospitalName || person.admissionDate || person.status === 'CMH' || person.outOfUnitCategory === 'CMH') {
      const cmhId = `synth_cmh_${person.id}`;
      if (!seenIds.has(cmhId)) {
        seenIds.add(cmhId);
        records.push({
          id: cmhId,
          type: 'CMH',
          title: `CMH Admission: ${person.diagnosis || 'Medical Observation'}`,
          subType: 'Inpatient Hospitalization',
          startDate: person.admissionDate || person.startDate || '2026-08-10',
          endDate: person.reviewDate || person.endDate,
          durationDays: person.durationDays || 7,
          location: person.hospitalName || 'CMH Cox\'s Bazar / CMH Dhaka',
          authority: person.authority || 'Medical Officer (RMO)',
          remarks: person.diagnosis || person.remarks || 'Admitted for treatment & clinical recovery',
          recordedAt: new Date().toISOString(),
          recordedBy: 'RMO / CMH',
          status: person.outOfUnitCategory === 'CMH' ? 'Active' : 'Completed',
        });
      }
    }

    // 4. Leave (P/Lve & C/Lve)
    if (person.leaveFrom || person.leaveType || person.outOfUnitCategory === 'P/Lve' || person.outOfUnitCategory === 'C/Lve') {
      const leaveId = `synth_leave_${person.id}`;
      if (!seenIds.has(leaveId)) {
        seenIds.add(leaveId);
        const lveType = person.leaveType || (person.outOfUnitCategory as any) || 'P/Lve';
        records.push({
          id: leaveId,
          type: 'Leave',
          title: `${lveType === 'P/Lve' ? 'Privilege Leave (বাৎসরিক ছুটি)' : 'Casual Leave (নৈমিত্তিক ছুটি)'}`,
          subType: lveType,
          startDate: person.leaveFrom || person.startDate || '2026-04-01',
          endDate: person.leaveTo || person.endDate || '2026-04-15',
          durationDays: person.durationDays || 15,
          location: person.leaveAddress || 'Home Address / District',
          authority: person.authority || 'CO / Adjutant Approved',
          remarks: person.remarks || 'Regular Annual Leave Roster',
          recordedAt: new Date().toISOString(),
          recordedBy: 'Bty Commander',
          status: (person.outOfUnitCategory === 'P/Lve' || person.outOfUnitCategory === 'C/Lve') ? 'Active' : 'Completed',
        });
      }
    }

    // 5. UN Mission
    if (person.outOfUnitCategory === 'Msn') {
      const msnId = `synth_msn_${person.id}`;
      if (!seenIds.has(msnId)) {
        seenIds.add(msnId);
        records.push({
          id: msnId,
          type: 'Msn',
          title: 'UN Peacekeeping Mission Deployment',
          subType: 'UN Mission',
          startDate: person.outOfUnitStartDate || '2025-01-01',
          endDate: person.outOfUnitEndDate || '2026-01-01',
          durationDays: 365,
          location: person.outOfUnitLocation || 'BANBATT (DR Congo / Central Africa)',
          authority: person.outOfUnitAuthority || 'AHQ MO Dte',
          remarks: 'United Nations Peacekeeper',
          recordedAt: new Date().toISOString(),
          status: 'Active',
        });
      }
    }

    // 6. Attachment (Att)
    if (person.outOfUnitCategory === 'Att') {
      const attId = `synth_att_${person.id}`;
      if (!seenIds.has(attId)) {
        seenIds.add(attId);
        records.push({
          id: attId,
          type: 'Att',
          title: 'Attachment to External Formation',
          subType: 'Attached Out',
          startDate: person.outOfUnitStartDate || '2026-03-01',
          endDate: person.outOfUnitEndDate,
          location: person.outOfUnitLocation || 'External Unit / Div HQ',
          authority: person.outOfUnitAuthority || 'Formation Part II Order',
          remarks: person.outOfUnitRemarks || 'Temporary duty attachment',
          recordedAt: new Date().toISOString(),
          status: 'Active',
        });
      }
    }

    // 7. Enlistment & Joining Milestone
    if (person.enlistmentDate) {
      const enId = `milestone_enlist_${person.id}`;
      if (!seenIds.has(enId)) {
        seenIds.add(enId);
        records.push({
          id: enId,
          type: 'General',
          title: 'Military Enlistment / শপথ গ্রহণ',
          subType: 'Enlistment',
          startDate: person.enlistmentDate,
          location: person.previousUnit || 'Artillery Centre & School',
          authority: 'AHQ AG Branch',
          remarks: `Joined service as ${person.rk} (${person.batch || 'Regular Recruit'})`,
          recordedAt: person.enlistmentDate,
          status: 'Completed',
        });
      }
    }

    // Sort by Start Date descending
    return records.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
  }, [person, soldierDutyAssignments]);

  // Filtered activities based on user filter & search
  const filteredActivities = useMemo(() => {
    let list = allActivities;
    if (activityFilter !== 'All') {
      if (activityFilter === 'Duty') {
        list = list.filter((a) => a.type === 'Duty');
      } else {
        list = list.filter((a) => a.type === activityFilter);
      }
    }

    if (activitySearch.trim()) {
      const q = activitySearch.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.subType || '').toLowerCase().includes(q) ||
          (a.location || '').toLowerCase().includes(q) ||
          (a.authority || '').toLowerCase().includes(q) ||
          (a.timeSlot || '').toLowerCase().includes(q) ||
          (a.remarks || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [allActivities, activityFilter, activitySearch]);

  // Statistics Summary
  const careerStats = useMemo(() => {
    let totalDutyCount = 0;
    let totalCampCount = 0;
    let totalCampDays = 0;
    let totalCourseCount = 0;
    let totalCmhCount = 0;
    let totalCmhDays = 0;
    let totalLeaveDays = 0;
    let totalMsnAttCount = 0;

    allActivities.forEach((a) => {
      if (a.type === 'Duty') {
        totalDutyCount++;
      } else if (a.type === 'FDMN Camp') {
        totalCampCount++;
        totalCampDays += a.durationDays || 0;
      } else if (a.type === 'Course') {
        totalCourseCount++;
      } else if (a.type === 'CMH') {
        totalCmhCount++;
        totalCmhDays += a.durationDays || 0;
      } else if (a.type === 'Leave') {
        totalLeaveDays += a.durationDays || 0;
      } else if (a.type === 'Msn' || a.type === 'Att') {
        totalMsnAttCount++;
      }
    });

    return {
      totalDutyCount,
      totalCampCount,
      totalCampDays,
      totalCourseCount,
      totalCmhCount,
      totalCmhDays,
      totalLeaveDays,
      totalMsnAttCount,
    };
  }, [allActivities]);

  const handleSaveStatus = () => {
    if (!person) return;
    updateParadeStatus(person.id, selectedStatus, statusReason);
    setIsEditingStatus(false);
  };

  const handleCreateActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!person || !newTitle.trim()) return;

    addPersonnelActivity(person.id, {
      type: newType,
      title: newTitle.trim(),
      subType: newSubType.trim() || undefined,
      location: newLocation.trim() || undefined,
      startDate: newStartDate,
      endDate: newEndDate || undefined,
      timeSlot: newTimeSlot.trim() || undefined,
      durationDays: typeof newDurationDays === 'number' ? newDurationDays : undefined,
      authority: newAuthority.trim() || undefined,
      remarks: newRemarks.trim() || undefined,
      weaponOrAmmo: newWeapon.trim() || undefined,
      status: 'Active',
    });

    // Reset Form
    setNewTitle('');
    setNewSubType('');
    setNewLocation('');
    setNewEndDate('');
    setNewTimeSlot('');
    setNewDurationDays('');
    setNewAuthority('');
    setNewRemarks('');
    setNewWeapon('');
    setIsAddActivityOpen(false);
  };

  const getActivityTypeBadge = (type: ServiceActivityType) => {
    switch (type) {
      case 'Duty':
        return {
          icon: Shield,
          bg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
          label: 'ডিউটি শিফট',
        };
      case 'FDMN Camp':
        return {
          icon: Tent,
          bg: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
          label: 'ক্যাম্প পোস্টিং',
        };
      case 'Course':
        return {
          icon: GraduationCap,
          bg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
          label: 'কোর্স / ক্যাডার',
        };
      case 'CMH':
        return {
          icon: HeartPulse,
          bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          label: 'সিএমএইচ / হাসপাতাল',
        };
      case 'Leave':
        return {
          icon: PlaneTakeoff,
          bg: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
          label: 'অনুমোদিত ছুটি',
        };
      case 'Msn':
        return {
          icon: Globe,
          bg: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
          label: 'জাতিসংঘ মিশন',
        };
      case 'Att':
        return {
          icon: Compass,
          bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          label: 'ফরমেশন এটাচমেন্ট',
        };
      case 'Promotion':
      case 'Award':
        return {
          icon: Award,
          bg: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
          label: 'পদোন্নতি / সম্মাননা',
        };
      default:
        return {
          icon: Activity,
          bg: 'bg-slate-700/50 text-slate-300 border-slate-600',
          label: 'সাধারণ রেকর্ড',
        };
    }
  };

  if (!isOpen || !person) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Banner */}
        <div className="relative px-5 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <UnitLogo size="sm" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-wide font-sans truncate">
                  সৈনিক মিলিটারি ক্যারিয়ার ডসিয়ার ও সার্ভিস লেজার
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 shrink-0">
                  10 MED REGT
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono truncate">
                Official Military Service Record & Continuous Activity Log
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => window.print()}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700"
              title="প্রিন্ট করুন / Print Dossier"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-700"
              title="বন্ধ করুন"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Soldier Identity Banner */}
        <div className="px-5 py-3.5 bg-slate-950/90 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-700 to-amber-600 flex items-center justify-center font-mono font-bold text-base text-white shadow-md border border-white/20 shrink-0">
              {person.rk.slice(0, 3)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-base sm:text-lg font-bold text-white font-sans truncate">
                  {person.name}
                </h4>
                <RankBadge rank={person.rk} trade={person.trade} size="sm" />
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400 flex-wrap mt-0.5">
                <span className="text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                  সৈনিক নং: {person.snkNo}
                </span>
                <span>•</span>
                <span className="text-rose-300 font-semibold">{person.battery}</span>
                <span>•</span>
                <span className="text-slate-300">ট্রেড: {person.trade || 'Gnr'}</span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">রক্তের গ্রুপ: {person.bloodGroup || 'O+'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
            <StatusBadge
              status={person.status}
              outOfUnitCategory={person.outOfUnitCategory}
              details={person.statusDetails}
              size="md"
            />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-2 bg-slate-950/50 border-b border-slate-800 flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3.5 py-2 border-b-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-rose-500 text-rose-400 bg-rose-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>ক্যারিয়ার ও সার্ভিস হিস্ট্রি ({allActivities.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('duty')}
            className={`flex items-center gap-1.5 px-3.5 py-2 border-b-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'duty'
                ? 'border-rose-500 text-rose-400 bg-rose-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>ডিউটি শিফট ও সময় লগ ({soldierDutyAssignments.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-1.5 px-3.5 py-2 border-b-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-rose-500 text-rose-400 bg-rose-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>মিলিটারি বায়োডাটা</span>
          </button>
          <button
            onClick={() => setActiveTab('medical')}
            className={`flex items-center gap-1.5 px-3.5 py-2 border-b-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'medical'
                ? 'border-rose-500 text-rose-400 bg-rose-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>মেডিকেল ও স্বাস্থ্য</span>
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: CAREER SERVICE LEDGER & HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {/* Top Summary Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-950/80 border border-indigo-900/40 space-y-1">
                  <div className="flex items-center justify-between text-indigo-400">
                    <span className="text-[10px] uppercase font-mono font-bold">মোট ডিউটি শিফট</span>
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xl font-mono font-bold text-white">
                    {careerStats.totalDutyCount} টি
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">সময় ও শিফট ট্র্যাকড</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-teal-900/40 space-y-1">
                  <div className="flex items-center justify-between text-teal-400">
                    <span className="text-[10px] uppercase font-mono font-bold">ক্যাম্প পোস্টিং</span>
                    <Tent className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xl font-mono font-bold text-white">
                    {careerStats.totalCampDays > 0 ? `${careerStats.totalCampDays} দিন` : `${careerStats.totalCampCount} বার`}
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">হোয়াইকং ও এফডিএমএন</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-cyan-900/40 space-y-1">
                  <div className="flex items-center justify-between text-cyan-400">
                    <span className="text-[10px] uppercase font-mono font-bold">কোর্স ও ক্যাডার</span>
                    <GraduationCap className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xl font-mono font-bold text-white">
                    {careerStats.totalCourseCount} টি
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">প্রশিক্ষণ সম্পন্ন</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-900/40 space-y-1">
                  <div className="flex items-center justify-between text-amber-400">
                    <span className="text-[10px] uppercase font-mono font-bold">সিএমএইচ ভর্তি</span>
                    <HeartPulse className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xl font-mono font-bold text-white">
                    {careerStats.totalCmhDays > 0 ? `${careerStats.totalCmhDays} দিন` : `${careerStats.totalCmhCount} বার`}
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">হাসপাতাল রেকর্ড</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-purple-900/40 space-y-1">
                  <div className="flex items-center justify-between text-purple-400">
                    <span className="text-[10px] uppercase font-mono font-bold">অনুমোদিত ছুটি</span>
                    <PlaneTakeoff className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xl font-mono font-bold text-white">
                    {careerStats.totalLeaveDays} দিন
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">পি/লিভ ও সি/লিভ</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-blue-900/40 space-y-1">
                  <div className="flex items-center justify-between text-blue-400">
                    <span className="text-[10px] uppercase font-mono font-bold">মিশন ও এটাচ</span>
                    <Globe className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xl font-mono font-bold text-white">
                    {careerStats.totalMsnAttCount} বার
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">UN Msn & Att</p>
                </div>
              </div>

              {/* Action and Filtering Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                {/* Category Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  {[
                    { id: 'All', label: 'সব হিস্ট্রি' },
                    { id: 'Duty', label: 'ডিউটি ও সময়' },
                    { id: 'FDMN Camp', label: 'ক্যাম্প' },
                    { id: 'Course', label: 'কোর্স' },
                    { id: 'CMH', label: 'সিএমএইচ' },
                    { id: 'Leave', label: 'ছুটি' },
                    { id: 'Msn', label: 'মিশন' },
                    { id: 'Att', label: 'সংযুক্ত' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setActivityFilter(cat.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        activityFilter === cat.id
                          ? 'bg-rose-600 text-white font-bold shadow-sm'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="খুঁজুন (স্থান, দায়িত্ব, অর্ডার)..."
                      value={activitySearch}
                      onChange={(e) => setActivitySearch(e.target.value)}
                      className="pl-8 pr-2.5 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500 w-40 sm:w-48"
                    />
                  </div>

                  {canEdit && (
                    <button
                      onClick={() => setIsAddActivityOpen((prev) => !prev)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-rose-950/40 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isAddActivityOpen ? 'বাতিল' : 'নতুন রেকর্ড যোগ'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Add New Career Record Form (Accordion) */}
              {isAddActivityOpen && (
                <form
                  onSubmit={handleCreateActivity}
                  className="p-4 rounded-xl bg-slate-950/90 border border-rose-500/40 space-y-3.5 shadow-xl animate-in fade-in"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-rose-400 uppercase font-mono flex items-center gap-1.5">
                      <Plus className="w-4 h-4" />
                      <span>সৈনিকের ক্যারিয়ারে নতুন অ্যাক্টিভিটি / ডিউটি / ক্যাম্প রেকর্ড যোগ করুন</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddActivityOpen(false)}
                      className="text-slate-400 hover:text-white text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
                        অ্যাক্টিভিটি টাইপ (Activity Type) *
                      </label>
                      <select
                        value={newType}
                        onChange={(e) => setNewType(e.target.value as ServiceActivityType)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                      >
                        <option value="Duty">🛡️ Duty (ডিউটি ও সময়কাল)</option>
                        <option value="FDMN Camp">⛺ FDMN Camp (হোয়াইকং ক্যাম্প)</option>
                        <option value="Course">🎓 Military Course (সামরিক কোর্স ও ক্যাডার)</option>
                        <option value="CMH">🏥 CMH (সিএমএইচ ভর্তি ও চিকিৎসা)</option>
                        <option value="Leave">✈️ Leave (বাৎসরিক/নৈমিত্তিক ছুটি)</option>
                        <option value="Msn">🌐 UN Mission (শান্তিরক্ষা মিশন)</option>
                        <option value="Att">📌 Attachment (ফরমেশন সংযুক্তি)</option>
                        <option value="ERE">🏢 ERE (বহিঃস্থ কর্মসংস্থান)</option>
                        <option value="Comd">🧭 Command Task (কমান্ড দায়িত্ব)</option>
                        <option value="Promotion">🎖️ Promotion (পদোন্নতি)</option>
                        <option value="Award">🏆 Award / Reward (পুরস্কার / সম্মাননা)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
                        শিরোনাম / বিষয়ের নাম (Title / Details) *
                      </label>
                      <input
                        type="text"
                        required
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="যেমন: Quarter Guard 2nd Relief, হোয়াইকং ক্যাম্প নিরাপত্তা, Basic Gunner Cadre"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
                        স্থান / ক্যাম্প / হাসপাতাল (Location / Camp)
                      </label>
                      <input
                        type="text"
                        value={newLocation}
                        onChange={(e) => setNewLocation(e.target.value)}
                        placeholder="যেমন: Whykong Camp, CMH Dhaka, AC&S"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
                        শুরুর তারিখ (Start Date) *
                      </label>
                      <input
                        type="date"
                        required
                        value={newStartDate}
                        onChange={(e) => setNewStartDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
                        সমাপ্তির তারিখ (End Date)
                      </label>
                      <input
                        type="date"
                        value={newEndDate}
                        onChange={(e) => setNewEndDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
                        ডিউটি সময় / শিফট (Time Slot / Hours)
                      </label>
                      <input
                        type="text"
                        value={newTimeSlot}
                        onChange={(e) => setNewTimeSlot(e.target.value)}
                        placeholder="যেমন: 0600 - 1200 HRS, 2200 - 0200 HRS"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
                        মোট দিন / মেয়াদ (Duration Days)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={newDurationDays}
                        onChange={(e) =>
                          setNewDurationDays(e.target.value ? Number(e.target.value) : '')
                        }
                        placeholder="যেমন: 90 (ক্যাম্প) / 15 (ছুটি)"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
                        অনুমোদন / পার্ট-২ আদেশ (Authority / Order)
                      </label>
                      <input
                        type="text"
                        value={newAuthority}
                        onChange={(e) => setNewAuthority(e.target.value)}
                        placeholder="যেমন: Unit Part II Order 14/2026"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    {newType === 'Duty' && (
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
                          ইস্যুকৃত অস্ত্র / গোলাবারুদ (Weapon & Ammo)
                        </label>
                        <input
                          type="text"
                          value={newWeapon}
                          onChange={(e) => setNewWeapon(e.target.value)}
                          placeholder="যেমন: BD-08 Rifle (Butt 42), 20 Rds"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                        />
                      </div>
                    )}

                    <div className={newType === 'Duty' ? 'sm:col-span-2' : 'sm:col-span-3'}>
                      <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
                        মন্তব্য / গ্রেডিং / ফলাফল (Remarks / Result)
                      </label>
                      <input
                        type="text"
                        value={newRemarks}
                        onChange={(e) => setNewRemarks(e.target.value)}
                        placeholder="যেমন: Grade A (Distinction), সফলভাবে ডিউটি সম্পন্ন, সুস্থ হয়ে ইউনিটে ফেরত"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsAddActivityOpen(false)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-rose-950/40"
                    >
                      রেকর্ড সংরক্ষণ করুন (Save Activity)
                    </button>
                  </div>
                </form>
              )}

              {/* Career Timeline List */}
              <div className="space-y-2.5">
                {filteredActivities.length === 0 ? (
                  <div className="py-12 text-center space-y-2 rounded-xl bg-slate-950/40 border border-slate-800">
                    <Activity className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-sm text-slate-400 font-medium">
                      কোনো অ্যাক্টিভিটি হিস্ট্রি রেকর্ড পাওয়া যায়নি।
                    </p>
                    <p className="text-xs text-slate-500 font-mono">
                      (No career activities matching the filter)
                    </p>
                  </div>
                ) : (
                  filteredActivities.map((act) => {
                    const badge = getActivityTypeBadge(act.type);
                    const Icon = badge.icon;
                    return (
                      <div
                        key={act.id}
                        className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all space-y-2"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className={`p-2 rounded-xl border shrink-0 mt-0.5 ${badge.bg}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h5 className="text-xs sm:text-sm font-bold text-white font-sans truncate">
                                  {act.title}
                                </h5>
                                <span className={`text-[10px] font-mono px-2 py-0.2 rounded border font-semibold ${badge.bg}`}>
                                  {badge.label}
                                </span>
                                {act.status === 'Active' && (
                                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    বর্তমানে চলমান (Active)
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 flex-wrap mt-1">
                                {act.startDate && (
                                  <span className="flex items-center gap-1 text-slate-300">
                                    <Calendar className="w-3 h-3 text-slate-500" />
                                    <span>
                                      {act.startDate} {act.endDate && act.endDate !== act.startDate ? `থেকে ${act.endDate}` : ''}
                                    </span>
                                  </span>
                                )}
                                {act.timeSlot && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-1 text-amber-300 font-bold bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/20">
                                      <Clock className="w-3 h-3 text-amber-400" />
                                      <span>সময়: {act.timeSlot}</span>
                                    </span>
                                  </>
                                )}
                                {act.durationDays ? (
                                  <>
                                    <span>•</span>
                                    <span className="text-teal-300 font-semibold">
                                      মোট {act.durationDays} দিন
                                    </span>
                                  </>
                                ) : null}
                                {act.location && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-1 text-slate-300">
                                      <MapPin className="w-3 h-3 text-rose-400" />
                                      <span>{act.location}</span>
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-start shrink-0">
                            {act.authority && (
                              <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                {act.authority}
                              </span>
                            )}
                            {canEdit && act.id.startsWith('act_') && (
                              <button
                                onClick={() => deletePersonnelActivity(person.id, act.id)}
                                className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                                title="রেকর্ড মুছে ফেলুন"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Additional Meta / Remarks / Weapon details */}
                        {(act.remarks || act.weaponOrAmmo) && (
                          <div className="pt-1.5 border-t border-slate-900 flex items-center justify-between text-xs text-slate-400 font-sans gap-2 flex-wrap">
                            {act.remarks && (
                              <div className="italic text-slate-300">
                                <span className="font-semibold not-italic text-slate-400">মন্তব্য: </span>
                                {act.remarks}
                              </div>
                            )}
                            {act.weaponOrAmmo && (
                              <div className="font-mono text-[10px] text-amber-300/90 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                <span>অস্ত্র: {act.weaponOrAmmo}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: DETAILED DUTY ROSTER & SHIFT LOG */}
          {activeTab === 'duty' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase font-mono flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <span>ডিউটি রোস্টার ও শিফট লগবুক (Detailed Duty Log)</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 font-sans">
                    সৈনিক কত তারিখে কোন শিফটে কয়টা থেকে কয়টা পর্যন্ত ডিউটি করেছেন তার পূর্ণাঙ্গ রেজিস্টার।
                  </p>
                </div>
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  মোট {soldierDutyAssignments.length} টি ডিউটি সম্পন্ন
                </span>
              </div>

              {soldierDutyAssignments.length === 0 ? (
                <div className="py-12 text-center space-y-1.5 rounded-xl bg-slate-950/40 border border-slate-800">
                  <Clock className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400 font-medium">
                    এই সৈনিকের নামে এখনো কোনো ডিউটি রোস্টার বিস্তারিত করা হয়নি।
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    (Duty Detailing থেকে ডিউটি অ্যাসাইন করলে তা স্বয়ংক্রিয়ভাবে এখানে লগ হবে)
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="text-[11px] font-mono uppercase bg-slate-950 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">তারিখ (Date)</th>
                        <th className="py-2.5 px-3">সেশন (Session)</th>
                        <th className="py-2.5 px-3">ডিউটি নাম (Duty Name)</th>
                        <th className="py-2.5 px-3">সময়কাল / শিফট (Hours)</th>
                        <th className="py-2.5 px-3">পোস্ট / স্থান (Location)</th>
                        <th className="py-2.5 px-3">অস্ত্র / গোলাবারুদ</th>
                        <th className="py-2.5 px-3">বিস্তারিতকারী</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono bg-slate-950/40">
                      {soldierDutyAssignments.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-amber-400 whitespace-nowrap">{d.date}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">
                              {d.sessionType}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-sans font-bold text-white whitespace-nowrap">
                            {d.dutyName}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 text-[11px]">
                              {d.dutyTime || (d.sessionType === 'Morning' ? '0600 - 1200 HRS' : '1800 - 0600 HRS')}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-sans text-slate-300 whitespace-nowrap">
                            {d.location || `${person.battery} Guard Post`}
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-amber-300 whitespace-nowrap">
                            {d.weaponOrAmmo || '-'}
                          </td>
                          <td className="py-2.5 px-3 font-sans text-slate-400 text-[11px] whitespace-nowrap">
                            {d.assignedBy || 'RSM'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MILITARY BIO-DATA & PROFILE */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              {/* Current Parade State Section */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-mono">
                    <Clock className="w-3.5 h-3.5 text-rose-400" />
                    <span>বর্তমান প্যারেড স্টেটাস (Today's Parade Status)</span>
                  </span>

                  {!isEditingStatus && !isCoReadOnly && canEdit && (
                    <button
                      onClick={() => setIsEditingStatus(true)}
                      className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                    >
                      স্টেটাস পরিবর্তন করুন
                    </button>
                  )}
                </div>

                {!isEditingStatus ? (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <StatusBadge
                      status={person.status}
                      outOfUnitCategory={person.outOfUnitCategory}
                      details={person.statusDetails}
                      size="lg"
                    />
                    <span className="text-xs text-slate-400 font-mono">
                      Verified for 0630 HRS Roll Call
                    </span>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-slate-900 border border-rose-900/60 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(
                        [
                          'In Unit',
                          'P/Lve',
                          'C/Lve',
                          'CMH',
                          'Course',
                          'FDMN',
                          'Att',
                          'Comd',
                        ] as ParadeStatus[]
                      ).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setSelectedStatus(st)}
                          className={`p-2 rounded-lg text-xs font-medium border text-left transition-all cursor-pointer ${
                            selectedStatus === st
                              ? 'bg-rose-600 text-white border-rose-500 shadow-md font-bold'
                              : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1 font-medium">
                        মন্তব্য / স্থান বিবরণ (Location / Remarks):
                      </label>
                      <input
                        type="text"
                        value={statusReason}
                        onChange={(e) => setStatusReason(e.target.value)}
                        placeholder="স্থান, ছুটির ঠিকানা বা কারণ লিখুন..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        onClick={() => setIsEditingStatus(false)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-medium cursor-pointer"
                      >
                        বাতিল
                      </button>
                      <button
                        onClick={handleSaveStatus}
                        className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-900/40 cursor-pointer"
                      >
                        সংরক্ষণ করুন
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bio-Data Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-blue-400" />
                    <span>সামরিক পরিচিতি ও সার্ভিস তথ্য</span>
                  </span>

                  <div className="space-y-2 pt-1 font-sans">
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">রেজিমেন্ট:</span>
                      <span className="font-semibold text-slate-200">10 Medium Regt Arty</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">সৈনিক নম্বর:</span>
                      <span className="font-bold font-mono text-amber-400">{person.snkNo}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">বর্তমান পদবী:</span>
                      <span className="font-semibold text-slate-200">{person.rk}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">ট্রেড ক্লাসিফিকেশন:</span>
                      <span className="font-semibold text-slate-200">{person.trade || 'Gnr'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">দায়িত্বপ্রাপ্ত ব্যাটারি:</span>
                      <span className="font-semibold font-mono text-rose-400">{person.battery}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">রিক্রুট / ব্যাচ:</span>
                      <span className="font-semibold text-slate-300">{person.batch || 'Regular Artillery Batch'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">ভর্তির তারিখ (Enlistment):</span>
                      <span className="font-semibold font-mono text-slate-200">{person.enlistmentDate || 'On Record'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">ইউনিটে যোগদান (Joining):</span>
                      <span className="font-semibold font-mono text-slate-200">{person.joiningDate || person.enlistmentDate || 'On Record'}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-400" />
                    <span>ব্যক্তিগত ও যোগাযোগ তথ্য</span>
                  </span>

                  <div className="space-y-2 pt-1 font-sans">
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">মোবাইল নম্বর:</span>
                      <span className="font-mono font-semibold text-emerald-400">{person.phone || person.mobileNo || 'Not Listed'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">অভিভাবক / NOK:</span>
                      <span className="font-semibold text-slate-200">{person.nokName || 'On Regimental File'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">NOK যোগাযোগ:</span>
                      <span className="font-mono text-slate-300">{person.nokContact || 'On Record'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">পূর্ববর্তী ইউনিট:</span>
                      <span className="font-semibold text-slate-300">{person.previousUnit || 'Artillery Centre'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">ভর্তির উৎস:</span>
                      <span className="font-semibold text-slate-300">{person.enlistmentSource || 'Direct Entry'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">বিশেষ মন্তব্য:</span>
                      <span className="text-slate-300 italic">{person.remarks || person.rmk || 'Nil'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MEDICAL & PHYSICAL RECORD */}
          {activeTab === 'medical' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-400" />
                    <span>মেডিকেল ক্লাসিফিকেশন</span>
                  </span>

                  <div className="space-y-2 pt-1 font-sans">
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">রক্তের গ্রুপ:</span>
                      <span className="font-bold text-rose-400 font-mono text-sm">{person.bloodGroup || 'O+'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">মেডিকেল ক্যাটাগরি:</span>
                      <span className="font-bold text-emerald-400 font-mono text-sm">
                        {person.medicalCategory || 'AYE (SHAPE-1)'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">শারীরিক ফিটনেস:</span>
                      <span className="font-semibold text-emerald-400">Fit for Active Field Service</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">সর্বশেষ স্বাস্থ্য পরীক্ষা:</span>
                      <span className="font-semibold text-slate-300 font-mono">Annual Review Complete</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                    <HeartPulse className="w-3.5 h-3.5 text-amber-400" />
                    <span>সিএমএইচ ও হাসপাতাল ইতিহাস</span>
                  </span>

                  <div className="space-y-2 pt-1 font-sans">
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">মোট সিএমএইচ ভর্তি:</span>
                      <span className="font-bold text-amber-400 font-mono">{careerStats.totalCmhCount} বার</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">হাসপাতালে মোট দিন:</span>
                      <span className="font-bold text-amber-400 font-mono">{careerStats.totalCmhDays} দিন</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">রেফারেন্স হাসপাতাল:</span>
                      <span className="font-semibold text-slate-300">{person.hospitalName || 'CMH Cox\'s Bazar / CMH Dhaka'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">পূর্ববর্তী রোগ বিবরণ:</span>
                      <span className="text-slate-300 italic">{person.diagnosis || 'None Reported / Clear'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="text-slate-400 font-mono flex items-center gap-2">
            <span>Dossier ID: 10MED-{person.snkNo}</span>
            <span>•</span>
            <span className="text-emerald-400">Career Ledger Active</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors cursor-pointer border border-slate-700"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors cursor-pointer border border-slate-700"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
