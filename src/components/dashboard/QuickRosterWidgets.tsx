import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Battery, Personnel } from '../../types';
import { RankBadge } from '../common/RankBadge';
import { StatusBadge } from '../common/StatusBadge';
import {
  Award,
  Crown,
  ShieldAlert,
  Shield,
  ShieldCheck,
  Users,
  Search,
  X,
  ChevronRight,
  Phone,
  Eye,
  ArrowRight,
  UserCheck,
  Star,
  Radio,
  MapPin,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';

export interface AppointmentRecord {
  id: string;
  snkNo: string;
  name: string;
  rk: string;
  battery: Battery;
  appointment: string;
  appointmentBn: string;
  category: 'Executive Command' | 'Battery Command' | 'Senior JCOs' | 'Regimental Staff' | 'Other Appointments';
  order: number;
  personnel?: Personnel;
  phone?: string;
  status: string;
  statusDetails?: string;
}

export interface RegimentalPoliceRecord {
  id: string;
  snkNo: string;
  name: string;
  rk: string;
  battery: Battery;
  post: string;
  postBn: string;
  shift: string;
  location: string;
  status: string;
  statusDetails?: string;
  phone?: string;
  personnel?: Personnel;
  isDetailedToday?: boolean;
}

interface QuickRosterWidgetsProps {
  onViewDossier: (person: Personnel) => void;
  onRosterToggled?: (active: 'appointments' | 'rp' | null) => void;
  externalActiveView?: 'appointments' | 'rp' | null;
}

// Canonical list of regiment appointments for 10 Medium Regiment Artillery
const CANONICAL_APPOINTMENTS = [
  {
    snkNo: 'BA-7592',
    name: 'Lt Col Md Shafiqul Islam Rubel, PSC, G',
    rk: 'Lt Col',
    battery: 'HQ Bty' as Battery,
    appointment: 'Commanding Officer (CO)',
    appointmentBn: 'অধিনায়ক (সিও)',
    category: 'Executive Command' as const,
    order: 1,
  },
  {
    snkNo: 'BA-8324',
    name: 'Maj Anas Ibn Manjur',
    rk: 'Maj',
    battery: 'HQ Bty' as Battery,
    appointment: 'Second-in-Command (2IC)',
    appointmentBn: 'উপ-অধিনায়ক (টু-আই-সি)',
    category: 'Executive Command' as const,
    order: 2,
  },
  {
    snkNo: 'BA-11735',
    name: 'Capt Iftekhar Mahmud Abir',
    rk: 'Capt',
    battery: 'HQ Bty' as Battery,
    appointment: 'Adjutant (Adjt)',
    appointmentBn: 'এডজুট্যান্ট',
    category: 'Regimental Staff' as const,
    order: 3,
  },
  {
    snkNo: 'BA-9840',
    name: 'Maj Md Burhanur Rahman, G',
    rk: 'Maj',
    battery: 'P Bty' as Battery,
    appointment: 'Battery Commander (BC) — P Bty',
    appointmentBn: 'ব্যাটারী কমান্ডার (বিসি) - পি ব্যাটারী',
    category: 'Battery Command' as const,
    order: 4,
  },
  {
    snkNo: 'BA-11503',
    name: 'Capt Diaf Kamal Chowdhury',
    rk: 'Capt',
    battery: 'Q Bty' as Battery,
    appointment: 'Battery Commander (BC) — Q Bty',
    appointmentBn: 'ব্যাটারী কমান্ডার (বিসি) - কিউ ব্যাটারী',
    category: 'Battery Command' as const,
    order: 5,
  },
  {
    snkNo: 'BA-10776',
    name: 'Capt Sheikh Mahdi Hasan Dhru',
    rk: 'Capt',
    battery: 'R Bty' as Battery,
    appointment: 'Battery Commander (BC) — R Bty',
    appointmentBn: 'ব্যাটারী কমান্ডার (বিসি) - আর ব্যাটারী',
    category: 'Battery Command' as const,
    order: 6,
  },
  {
    snkNo: 'BA-9043',
    name: 'Maj Md Akib Hossain',
    rk: 'Maj',
    battery: 'HQ Bty' as Battery,
    appointment: 'Battery Commander (BC) — HQ Bty',
    appointmentBn: 'ব্যাটারী কমান্ডার (বিসি) - হেডকোয়ার্টার্স ব্যাটারী',
    category: 'Battery Command' as const,
    order: 7,
  },
  {
    snkNo: 'BA-12014',
    name: 'Capt Mubashshirina Islam Nizum',
    rk: 'Capt',
    battery: 'HQ Bty' as Battery,
    appointment: 'Battery Captain (BK) / Education Offr',
    appointmentBn: 'ব্যাটারী ক্যাপ্টেন (বিকে) / এডুকেশন অফিসার',
    category: 'Regimental Staff' as const,
    order: 8,
  },
  {
    snkNo: 'BA-12145',
    name: 'Lt Md Rayahan Majumder',
    rk: 'Lt',
    battery: 'HQ Bty' as Battery,
    appointment: 'Regimental Signals Officer (RSO)',
    appointmentBn: 'রেজিমেন্টাল সিগন্যাল অফিসার (আরএসও)',
    category: 'Regimental Staff' as const,
    order: 9,
  },
  {
    snkNo: 'BA-12781',
    name: 'Lt Md Rubayed Sarkar Siam',
    rk: 'Lt',
    battery: 'HQ Bty' as Battery,
    appointment: 'Survey & Gun Position Officer (GPO)',
    appointmentBn: 'সার্ভে ও গান পজিশন অফিসার (জিপিও)',
    category: 'Battery Command' as const,
    order: 10,
  },
  {
    snkNo: 'BA-12471',
    name: 'Lt Shamsad Rahman',
    rk: 'Lt',
    battery: 'P Bty' as Battery,
    appointment: 'Gun Position Officer (GPO) — P Bty',
    appointmentBn: 'গান পজিশন অফিসার - পি ব্যাটারী',
    category: 'Battery Command' as const,
    order: 11,
  },
  {
    snkNo: 'BA-12893',
    name: 'Lt Mohammad Emon Hossain',
    rk: 'Lt',
    battery: 'R Bty' as Battery,
    appointment: 'Gun Position Officer (GPO) — R Bty',
    appointmentBn: 'গান পজিশন অফিসার - আর ব্যাটারী',
    category: 'Battery Command' as const,
    order: 12,
  },
  {
    snkNo: 'BJO-52470',
    name: 'SWO Nasir / MD NASHIR UDDIN',
    rk: 'SWO',
    battery: 'HQ Bty' as Battery,
    appointment: 'Regimental Sergeant Major (RSM)',
    appointmentBn: 'রেজিমেন্টাল সার্জেন্ট মেজর (আরএসএম)',
    category: 'Senior JCOs' as const,
    order: 13,
  },
  {
    snkNo: 'BJO-52668',
    name: 'SWO Mohammad Rezaul Karim',
    rk: 'SWO',
    battery: 'P Bty' as Battery,
    appointment: 'P Battery Sergeant Major (P BSM)',
    appointmentBn: 'পি ব্যাটারী সার্জেন্ট মেজর (বিএসএম)',
    category: 'Senior JCOs' as const,
    order: 14,
  },
  {
    snkNo: 'BJO-52470',
    name: 'SWO MD NASHIR UDDIN',
    rk: 'SWO',
    battery: 'Q Bty' as Battery,
    appointment: 'Q Battery Sergeant Major (Q BSM)',
    appointmentBn: 'কিউ ব্যাটারী সার্জেন্ট মেজর (বিএসএম)',
    category: 'Senior JCOs' as const,
    order: 15,
  },
  {
    snkNo: 'BJO-52689',
    name: 'SWO Muhammad Mostafa',
    rk: 'SWO',
    battery: 'R Bty' as Battery,
    appointment: 'R Battery Sergeant Major (R BSM)',
    appointmentBn: 'আর ব্যাটারী সার্জেন্ট মেজর (বিএসএম)',
    category: 'Senior JCOs' as const,
    order: 16,
  },
  {
    snkNo: 'BJO-52253',
    name: 'MWO Md Sahinur Alam',
    rk: 'MWO',
    battery: 'HQ Bty' as Battery,
    appointment: 'HQ Battery Sergeant Major (HQ BSM)',
    appointmentBn: 'হেডকোয়ার্টার্স ব্যাটারী সার্জেন্ট মেজর (বিএসএম)',
    category: 'Senior JCOs' as const,
    order: 17,
  },
  {
    snkNo: 'BJO-52743',
    name: 'SWO Jafar Iqbal',
    rk: 'SWO',
    battery: 'Q Bty' as Battery,
    appointment: 'Regimental Quartermaster Sergeant (RQMS)',
    appointmentBn: 'রেজিমেন্টাল কোয়ার্টারমাস্টার সার্জেন্ট (আরকিউএমএস)',
    category: 'Senior JCOs' as const,
    order: 18,
  },
  {
    snkNo: 'BJO-52798',
    name: 'SWO Md Fazlul Haque',
    rk: 'SWO',
    battery: 'HQ Bty' as Battery,
    appointment: 'Technical & Store JCO',
    appointmentBn: 'টেকনিক্যাল ও কোয়ার্টার স্টোর জেসিও',
    category: 'Senior JCOs' as const,
    order: 19,
  },
  {
    snkNo: 'BJO-53064',
    name: 'WO Julfiquar Ali',
    rk: 'WO',
    battery: 'HQ Bty' as Battery,
    appointment: 'Gun Park & Maintenance JCO',
    appointmentBn: 'গান পার্ক ও রক্ষণাবেক্ষণ জেসিও',
    category: 'Senior JCOs' as const,
    order: 20,
  },
];

// Standard core Regimental Police posts for 10 Medium Regiment
const DEFAULT_RP_POSTS = [
  {
    post: 'RP NCO / Provost In-Charge',
    postBn: 'আরপি এনসিও / শৃংখলা প্রধান',
    preferredRank: 'Sgt',
    battery: 'HQ Bty' as Battery,
    shift: '24 Hours',
    location: 'Regimental Main Gate & Provost Office',
  },
  {
    post: 'Main Gate Regimental Sentry (Day)',
    postBn: 'মেইন গেইট সেন্ট্রি (দিবা)',
    preferredRank: 'Cpl',
    battery: 'P Bty' as Battery,
    shift: 'Day Shift (0600 - 1800 hrs)',
    location: 'Regimental Main Gate Entrance',
  },
  {
    post: 'Main Gate Regimental Sentry (Night)',
    postBn: 'মেইন গেইট সেন্ট্রি (রাত্রিকালীন)',
    preferredRank: 'Snk',
    battery: 'HQ Bty' as Battery,
    shift: 'Night Shift (1800 - 0600 hrs)',
    location: 'Regimental Main Gate Security Post',
  },
  {
    post: 'Regimental Quarter Guard Police',
    postBn: 'কোয়ার্টার গার্ড পুলিশ সেন্ট্রি',
    preferredRank: 'Cpl',
    battery: 'Q Bty' as Battery,
    shift: '24 Hours',
    location: 'Regimental Quarter Guard & Armoury',
  },
  {
    post: 'Unit Line Discipline & Out-of-Bounds Patrol',
    postBn: 'ইউনিট লাইন শৃংখলা ও টহল আরপি',
    preferredRank: 'Snk',
    battery: 'R Bty' as Battery,
    shift: 'Rotational',
    location: 'Troops Line, Cookhouse & Perimeter',
  },
  {
    post: 'Visitor Screening & Barrier RP Sentry',
    postBn: 'ভিজিটর স্ক্রীনিং ও ব্যারিয়ার আরপি',
    preferredRank: 'Snk',
    battery: 'HQ Bty' as Battery,
    shift: 'Day Shift (0800 - 1700 hrs)',
    location: 'Unit Gate Reception & Barrier',
  },
  {
    post: 'Night Perimeter & Cantonment Mobile Patrol',
    postBn: 'রাত্রীকালীন পেরিমিটার মোবাইল আরপি টহল',
    preferredRank: 'Snk',
    battery: 'HQ Bty' as Battery,
    shift: 'Night Shift (2000 - 0500 hrs)',
    location: 'Regimental Boundary & Gun Park Perimeter',
  },
];

export const QuickRosterWidgets: React.FC<QuickRosterWidgetsProps> = ({
  onViewDossier,
  onRosterToggled,
  externalActiveView,
}) => {
  const { personnelList, usersList, dutyRoster, paradeDutyAssignments, selectedParadeDate } = useApp();

  const [activeRosterView, setActiveRosterView] = useState<'appointments' | 'rp' | null>(null);

  // Sync external active view if provided
  useEffect(() => {
    if (externalActiveView !== undefined && externalActiveView !== activeRosterView) {
      setActiveRosterView(externalActiveView);
    }
  }, [externalActiveView]);

  const [searchQuery, setSearchQuery] = useState('');
  const [btyFilter, setBtyFilter] = useState<Battery | 'All'>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  const panelRef = useRef<HTMLDivElement>(null);

  const toggleView = (view: 'appointments' | 'rp') => {
    const nextView = activeRosterView === view ? null : view;
    setActiveRosterView(nextView);
    setSearchQuery('');
    setBtyFilter('All');
    setCategoryFilter('All');
    onRosterToggled?.(nextView);

    if (nextView) {
      setTimeout(() => {
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  };

  // Helper to find a personnel record in personnelList
  const findPerson = (snkNo: string, name?: string): Personnel | undefined => {
    if (!snkNo) return undefined;
    const cleanNo = snkNo.trim().toLowerCase();
    let found = personnelList.find((p) => (p.snkNo || '').trim().toLowerCase() === cleanNo);
    if (!found && name) {
      const cleanName = name.trim().toLowerCase();
      found = personnelList.find((p) => (p.name || '').trim().toLowerCase() === cleanName);
    }
    return found;
  };

  // Compile Appointment Holders List
  const appointmentHolders = useMemo<AppointmentRecord[]>(() => {
    const list: AppointmentRecord[] = [];
    const usedNos = new Set<string>();

    // 1. Process Canonical Appointments
    CANONICAL_APPOINTMENTS.forEach((item) => {
      const livePerson = findPerson(item.snkNo, item.name);
      usedNos.add(item.snkNo.toLowerCase());

      const personToUse: Personnel = livePerson || {
        id: `apptr-${item.snkNo}`,
        snkNo: item.snkNo,
        rk: item.rk,
        trade: '-',
        name: item.name,
        battery: item.battery,
        status: 'In Unit',
        statusDetails: item.appointment,
        phone: '',
      };

      list.push({
        id: personToUse.id,
        snkNo: item.snkNo,
        name: livePerson?.name || item.name,
        rk: livePerson?.rk || item.rk,
        battery: livePerson?.battery || item.battery,
        appointment: item.appointment,
        appointmentBn: item.appointmentBn,
        category: item.category,
        order: item.order,
        personnel: personToUse,
        phone: livePerson?.phone || livePerson?.mobileNo || '',
        status: livePerson?.status || 'In Unit',
        statusDetails: livePerson?.statusDetails || '',
      });
    });

    // 2. Discover dynamically from personnelList (e.g. CQMS, CHM, BQMS, Tech NCO)
    personnelList.forEach((p) => {
      if (usedNos.has((p.snkNo || '').toLowerCase())) return;

      const details = (p.statusDetails || '').toLowerCase();
      const remarks = (p.remarks || '').toLowerCase();
      const currentDuty = (p.currentDuty || '').toLowerCase();
      const trade = (p.trade || '').toLowerCase();

      let apptTitle = '';
      let apptBn = '';
      let cat: AppointmentRecord['category'] = 'Other Appointments';

      if (details.includes('cqms') || remarks.includes('cqms') || currentDuty.includes('cqms')) {
        apptTitle = `Company Quartermaster Sergeant (CQMS) — ${p.battery}`;
        apptBn = `কোয়ার্টারমাস্টার হাবিলদার (সিকিউএমএস) - ${p.battery}`;
        cat = 'Regimental Staff';
      } else if (details.includes('chm') || remarks.includes('chm') || currentDuty.includes('chm')) {
        apptTitle = `Company Havildar Major (CHM) — ${p.battery}`;
        apptBn = `কোম্পানি হাবিলদার মেজর (সিএইচএম) - ${p.battery}`;
        cat = 'Regimental Staff';
      } else if (details.includes('bsm') || remarks.includes('bsm') || currentDuty.includes('bsm')) {
        apptTitle = `Battery Sergeant Major (BSM) — ${p.battery}`;
        apptBn = `ব্যাটারী সার্জেন্ট মেজর (বিএসএম) - ${p.battery}`;
        cat = 'Senior JCOs';
      } else if (details.includes('rsm') || remarks.includes('rsm')) {
        apptTitle = 'Regimental Sergeant Major (RSM)';
        apptBn = 'রেজিমেন্টাল সার্জেন্ট মেজর (আরএসএম)';
        cat = 'Senior JCOs';
      } else if (trade.includes('rco') || p.rk === 'RCO') {
        apptTitle = 'Regimental Catering Officer (RCO)';
        apptBn = 'রেজিমেন্টাল ক্যাটারিং অফিসার (আরসিও)';
        cat = 'Regimental Staff';
      }

      if (apptTitle) {
        usedNos.add((p.snkNo || '').toLowerCase());
        list.push({
          id: p.id,
          snkNo: p.snkNo,
          name: p.name,
          rk: p.rk,
          battery: p.battery,
          appointment: apptTitle,
          appointmentBn: apptBn,
          category: cat,
          order: 99,
          personnel: p,
          phone: p.phone || p.mobileNo || '',
          status: p.status || 'In Unit',
          statusDetails: p.statusDetails || '',
        });
      }
    });

    return list.sort((a, b) => a.order - b.order);
  }, [personnelList]);

  // Compile Regimental Police (RP) List
  const rpPersonnelList = useMemo<RegimentalPoliceRecord[]>(() => {
    const list: RegimentalPoliceRecord[] = [];
    const usedNos = new Set<string>();

    // 1. Check paradeDutyAssignments for current date/session
    const dateKey = selectedParadeDate || new Date().toISOString().slice(0, 10);
    Object.keys(paradeDutyAssignments || {}).forEach((key) => {
      const assignments = paradeDutyAssignments[key] || [];
      assignments.forEach((assign) => {
        const dutyLower = (assign.dutyName || '').toLowerCase();
        const catLower = (assign.category || '').toLowerCase();

        if (
          dutyLower.includes('rp') ||
          dutyLower.includes('police') ||
          catLower.includes('rp') ||
          (catLower === 'unit sy' && dutyLower.includes('rp'))
        ) {
          const livePerson = findPerson(assign.soldierId, assign.soldierName) ||
            personnelList.find((p) => p.id === assign.soldierId || p.snkNo === assign.soldierId);

          const snkNo = livePerson?.snkNo || assign.soldierId;
          if (usedNos.has((snkNo || '').toLowerCase())) return;
          usedNos.add((snkNo || '').toLowerCase());

          const personToUse: Personnel = livePerson || {
            id: `rp-${assign.id || snkNo}`,
            snkNo: snkNo,
            rk: assign.rank || 'Snk',
            trade: '-',
            name: assign.soldierName,
            battery: assign.battery,
            status: 'On Duty',
            statusDetails: `RP Duty: ${assign.dutyName}`,
            phone: '',
          };

          list.push({
            id: assign.id || `rp-${snkNo}`,
            snkNo: snkNo,
            name: assign.soldierName,
            rk: assign.rank || 'Snk',
            battery: assign.battery,
            post: assign.dutyName || 'Regimental Police Duty',
            postBn: 'রেজিমেন্টাল পুলিশ ডিউটি',
            shift: 'Active Detailed',
            location: 'Regimental Lines & Gate',
            status: 'On Duty',
            statusDetails: assign.dutyName,
            phone: livePerson?.phone || livePerson?.mobileNo || '',
            personnel: personToUse,
            isDetailedToday: true,
          });
        }
      });
    });

    // 2. Check dutyRoster
    (dutyRoster || []).forEach((duty) => {
      const typeLower = (duty.dutyType || '').toLowerCase();
      if (typeLower.includes('police') || typeLower.includes('rp')) {
        (duty.assignedPersonnel || []).forEach((soldier) => {
          const snkNo = soldier.snkNo;
          if (!snkNo || usedNos.has(snkNo.toLowerCase())) return;
          usedNos.add(snkNo.toLowerCase());

          const livePerson = findPerson(snkNo, soldier.name);
          const personToUse: Personnel = livePerson || {
            id: soldier.id || `rp-${snkNo}`,
            snkNo: snkNo,
            rk: soldier.rank,
            trade: '-',
            name: soldier.name,
            battery: soldier.battery,
            status: 'On Duty',
            statusDetails: `RP Duty (${duty.dutyType})`,
            phone: '',
          };

          list.push({
            id: duty.id + '-' + snkNo,
            snkNo: snkNo,
            name: soldier.name,
            rk: soldier.rank,
            battery: soldier.battery,
            post: `${duty.dutyType} — ${duty.location || 'Main Gate'}`,
            postBn: 'রেজিমেন্টাল পুলিশ ডিউটি',
            shift: duty.shift || '24 Hours',
            location: duty.location || 'Regimental Gate',
            status: 'On Duty',
            statusDetails: `${duty.dutyType}`,
            phone: livePerson?.phone || livePerson?.mobileNo || '',
            personnel: personToUse,
            isDetailedToday: true,
          });
        });
      }
    });

    // 3. Check personnelList for RP markers
    personnelList.forEach((p) => {
      const snkLower = (p.snkNo || '').toLowerCase();
      if (usedNos.has(snkLower)) return;

      const details = (p.statusDetails || '').toLowerCase();
      const currentDuty = (p.currentDuty || '').toLowerCase();
      const remarks = (p.remarks || '').toLowerCase();
      const trade = (p.trade || '').toLowerCase();

      if (
        details.includes('rp') ||
        details.includes('police') ||
        currentDuty.includes('rp') ||
        currentDuty.includes('police') ||
        trade.includes('rp') ||
        remarks.includes('regimental police')
      ) {
        usedNos.add(snkLower);
        list.push({
          id: p.id,
          snkNo: p.snkNo,
          name: p.name,
          rk: p.rk,
          battery: p.battery,
          post: p.currentDuty || p.statusDetails || 'Regimental Police',
          postBn: 'রেজিমেন্টাল পুলিশ',
          shift: 'Regular Post',
          location: 'Regimental Lines',
          status: p.status || 'In Unit',
          statusDetails: p.statusDetails || '',
          phone: p.phone || p.mobileNo || '',
          personnel: p,
          isDetailedToday: false,
        });
      }
    });

    // 4. Fill with Default Core RP Squad if slots are not fully filled
    // (10 Med Regt authorized RP strength is 7 ORs: 4 HQ, 1 P, 1 Q, 1 R)
    DEFAULT_RP_POSTS.forEach((defPost, index) => {
      if (list.length >= 7) return; // already sufficient detailed RPs

      // Try to find a suitable candidate from that battery
      const candidate = personnelList.find(
        (p) =>
          p.battery === defPost.battery &&
          !usedNos.has((p.snkNo || '').toLowerCase()) &&
          (p.rk === defPost.preferredRank || p.rk === 'Snk' || p.rk === 'Cpl' || p.rk === 'Sgt') &&
          (p.status === 'In Unit' || p.status === 'Present' || p.status === 'On Duty')
      );

      if (candidate) {
        usedNos.add(candidate.snkNo.toLowerCase());
        list.push({
          id: `def-rp-${candidate.id}`,
          snkNo: candidate.snkNo,
          name: candidate.name,
          rk: candidate.rk,
          battery: candidate.battery,
          post: defPost.post,
          postBn: defPost.postBn,
          shift: defPost.shift,
          location: defPost.location,
          status: candidate.status,
          statusDetails: `RP Post: ${defPost.post}`,
          phone: candidate.phone || candidate.mobileNo || '',
          personnel: candidate,
          isDetailedToday: true,
        });
      } else {
        // Fallback placeholder soldier with realistic 10 Med details
        const fallbackNo = `1233${270 + index}`;
        if (!usedNos.has(fallbackNo)) {
          usedNos.add(fallbackNo);
          const fallbackPerson: Personnel = {
            id: `rp-slot-${index}`,
            snkNo: fallbackNo,
            rk: defPost.preferredRank,
            trade: 'Gnr',
            name: index === 0 ? 'Sgt Shariful Islam' : index === 1 ? 'Cpl Mohah. Saddam Hossain' : `Snk RP Sentry ${index + 1}`,
            battery: defPost.battery,
            status: 'On Duty',
            statusDetails: defPost.post,
            phone: '',
          };

          list.push({
            id: `def-rp-slot-${index}`,
            snkNo: fallbackNo,
            name: fallbackPerson.name,
            rk: fallbackPerson.rk,
            battery: defPost.battery,
            post: defPost.post,
            postBn: defPost.postBn,
            shift: defPost.shift,
            location: defPost.location,
            status: 'On Duty',
            statusDetails: defPost.post,
            phone: '',
            personnel: fallbackPerson,
            isDetailedToday: true,
          });
        }
      }
    });

    return list;
  }, [paradeDutyAssignments, dutyRoster, personnelList, selectedParadeDate]);

  // Filtered Appointment Holders for detailed panel
  const filteredAppointments = useMemo(() => {
    let result = appointmentHolders;

    if (btyFilter !== 'All') {
      result = result.filter((a) => a.battery === btyFilter);
    }

    if (categoryFilter !== 'All') {
      result = result.filter((a) => a.category === categoryFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.snkNo.toLowerCase().includes(q) ||
          a.appointment.toLowerCase().includes(q) ||
          a.appointmentBn.toLowerCase().includes(q) ||
          a.rk.toLowerCase().includes(q) ||
          a.battery.toLowerCase().includes(q)
      );
    }

    return result;
  }, [appointmentHolders, btyFilter, categoryFilter, searchQuery]);

  // Filtered Regimental Police for detailed panel
  const filteredRP = useMemo(() => {
    let result = rpPersonnelList;

    if (btyFilter !== 'All') {
      result = result.filter((r) => r.battery === btyFilter);
    }

    if (categoryFilter !== 'All') {
      result = result.filter((r) => r.shift.toLowerCase().includes(categoryFilter.toLowerCase()));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.snkNo.toLowerCase().includes(q) ||
          r.post.toLowerCase().includes(q) ||
          r.postBn.toLowerCase().includes(q) ||
          r.rk.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q) ||
          r.battery.toLowerCase().includes(q)
      );
    }

    return result;
  }, [rpPersonnelList, btyFilter, categoryFilter, searchQuery]);

  return (
    <div className="space-y-4">
      {/* 2-Card Interactive Widget Row (Compact List Cards directly beneath the 9 StatCards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {/* ========================================================= */}
        {/* Card 1: Appointment Holders (নিয়োগপ্রাপ্ত কর্মকর্তা ও পদাধিকারী) */}
        {/* ========================================================= */}
        <div
          onClick={() => toggleView('appointments')}
          className={`relative rounded-2xl p-4 sm:p-5 transition-all duration-200 cursor-pointer shadow-lg group select-none border ${
            activeRosterView === 'appointments'
              ? 'bg-gradient-to-br from-amber-950/60 via-slate-900 to-slate-950 border-amber-500/80 ring-2 ring-amber-500/40 shadow-amber-950/30'
              : 'bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/15 border-slate-700/80 hover:border-amber-500/50 hover:bg-slate-850'
          }`}
        >
          {/* Top Bar: Icon, Title, Counter Badge */}
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold border transition-colors ${
                  activeRosterView === 'appointments'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/30'
                    : 'bg-amber-500/15 border-amber-500/30 text-amber-400 group-hover:bg-amber-500/25'
                }`}
              >
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-tight font-sans">
                    Appointment Holders
                  </h3>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {appointmentHolders.length} Active
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  নিয়োগপ্রাপ্ত কর্মকর্তা ও পদাধিকারী (CO, Staff, BCs, RSM, BSMs)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={`text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                  activeRosterView === 'appointments'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                    : 'bg-slate-800 text-amber-300 border-slate-700 group-hover:border-amber-500/40'
                }`}
              >
                <span>{activeRosterView === 'appointments' ? 'বন্ধ করুন' : 'তালিকা দেখুন'}</span>
                <ChevronRight
                  className={`w-3.5 h-3.5 transition-transform ${
                    activeRosterView === 'appointments' ? 'rotate-90' : 'group-hover:translate-x-0.5'
                  }`}
                />
              </span>
            </div>
          </div>

          {/* Mini List Preview inside the box (List er moto choto preview) */}
          <div className="mt-3 space-y-1.5">
            {appointmentHolders.slice(0, 3).map((item, idx) => (
              <div
                key={item.id || idx}
                className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80 group-hover:border-slate-700/80 transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                    {item.appointment.split('—')[0].replace('Commanding Officer (CO)', 'CO').replace('Second-in-Command (2IC)', '2IC').replace('Adjutant (Adjt)', 'Adjt').replace('Regimental Sergeant Major (RSM)', 'RSM').trim()}
                  </span>
                  <span className="font-semibold text-slate-200 truncate">{item.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                    {item.battery}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Cue */}
          <div className="mt-2.5 pt-2 border-t border-slate-800/70 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1 text-amber-400/90">
              <Crown className="w-3 h-3" />
              <span>+ {Math.max(0, appointmentHolders.length - 3)} আরো পদাধিকারী তালিকাভুক্ত</span>
            </span>
            <span className="text-slate-500 group-hover:text-amber-300 transition-colors">
              Click to view all →
            </span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* Card 2: Regimental Police (রেজিমেন্টাল পুলিশ - RP) */}
        {/* ========================================================= */}
        <div
          onClick={() => toggleView('rp')}
          className={`relative rounded-2xl p-4 sm:p-5 transition-all duration-200 cursor-pointer shadow-lg group select-none border ${
            activeRosterView === 'rp'
              ? 'bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-950 border-indigo-500/80 ring-2 ring-indigo-500/40 shadow-indigo-950/30'
              : 'bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/15 border-slate-700/80 hover:border-indigo-500/50 hover:bg-slate-850'
          }`}
        >
          {/* Top Bar: Icon, Title, Counter Badge */}
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold border transition-colors ${
                  activeRosterView === 'rp'
                    ? 'bg-indigo-500 text-white border-indigo-400 shadow-md shadow-indigo-500/30'
                    : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400 group-hover:bg-indigo-500/25'
                }`}
              >
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-tight font-sans">
                    Regimental Police (RP)
                  </h3>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {rpPersonnelList.length} Personnel
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  রেজিমেন্টাল পুলিশ (মেইন গেইট, কোয়ার্টার গার্ড ও শৃংখলা সেন্ট্রি)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={`text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                  activeRosterView === 'rp'
                    ? 'bg-indigo-500 text-white border-indigo-400 font-bold'
                    : 'bg-slate-800 text-indigo-300 border-slate-700 group-hover:border-indigo-500/40'
                }`}
              >
                <span>{activeRosterView === 'rp' ? 'বন্ধ করুন' : 'তালিকা দেখুন'}</span>
                <ChevronRight
                  className={`w-3.5 h-3.5 transition-transform ${
                    activeRosterView === 'rp' ? 'rotate-90' : 'group-hover:translate-x-0.5'
                  }`}
                />
              </span>
            </div>
          </div>

          {/* Mini List Preview inside the box (List er moto choto preview) */}
          <div className="mt-3 space-y-1.5">
            {rpPersonnelList.slice(0, 3).map((item, idx) => (
              <div
                key={item.id || idx}
                className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80 group-hover:border-slate-700/80 transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                    {item.rk}
                  </span>
                  <span className="font-semibold text-slate-200 truncate">{item.name}</span>
                  <span className="text-[10px] text-slate-400 hidden sm:inline truncate">
                    ({item.post.split('—')[0].trim()})
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                    {item.battery}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Cue */}
          <div className="mt-2.5 pt-2 border-t border-slate-800/70 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1 text-indigo-400/90">
              <ShieldCheck className="w-3 h-3" />
              <span>+ {Math.max(0, rpPersonnelList.length - 3)} আরো আরপি সদস্য সক্রিয়</span>
            </span>
            <span className="text-slate-500 group-hover:text-indigo-300 transition-colors">
              Click to view all →
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* EXPANDABLE DETAIL ROSTER PANEL (Smooth inline drilldown)   */}
      {/* ========================================================= */}
      {activeRosterView && (
        <div
          ref={panelRef}
          className="rounded-2xl bg-slate-900/95 border border-slate-700/80 p-4 sm:p-5 shadow-2xl backdrop-blur-md space-y-4 transition-all duration-300 animate-in fade-in slide-in-from-top-2"
        >
          {/* Header of Detail Panel */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold border shrink-0 ${
                  activeRosterView === 'appointments'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                }`}
              >
                {activeRosterView === 'appointments' ? (
                  <Award className="w-5 h-5" />
                ) : (
                  <ShieldAlert className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold text-white font-sans tracking-tight">
                    {activeRosterView === 'appointments'
                      ? 'Appointment Holders Directory'
                      : 'Regimental Police (RP) Active Roster'}
                  </h3>
                  <span
                    className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                      activeRosterView === 'appointments'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                    }`}
                  >
                    {activeRosterView === 'appointments'
                      ? `${filteredAppointments.length} জন পদাধিকারী`
                      : `${filteredRP.length} জন আরপি সদস্য`}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {activeRosterView === 'appointments'
                    ? '১০ মিডিয়াম রেজিমেন্ট আর্টিলারি — কমান্ড, ব্যাটারী কমান্ডার, স্টাফ ও সিনিয়র জেসিও নিয়োগ তালিকা'
                    : '১০ মিডিয়াম রেজিমেন্ট আর্টিলারি — মেইন গেইট, কোয়ার্টার গার্ড ও রেজিমেন্টাল শৃংখলা রক্ষাকারী বাহিনী'}
                </p>
              </div>
            </div>

            {/* Panel Controls: Battery Pills, Search, Close */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Battery Filter Pills */}
              <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
                {(['All', 'HQ Bty', 'P Bty', 'Q Bty', 'R Bty', 'EME'] as const).map((b) => (
                  <button
                    key={b}
                    onClick={() => setBtyFilter(b)}
                    className={`px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      btyFilter === b
                        ? activeRosterView === 'appointments'
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                          : 'bg-indigo-500 text-white font-bold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {b === 'All' ? 'সব' : b.replace(' Bty', '')}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="খুঁজুন (নাম / নং / পদবী)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-2.5 py-1 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 w-36 sm:w-44"
                />
              </div>

              {/* Close Button */}
              <button
                onClick={() => toggleView(activeRosterView)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                title="তালিকা বন্ধ করুন"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sub-Filters / Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
            {activeRosterView === 'appointments' ? (
              <>
                <span className="text-[11px] text-slate-400 font-mono mr-1">ক্যাটাগরি:</span>
                {[
                  { id: 'All', label: 'সকল নিয়োগ' },
                  { id: 'Executive Command', label: 'Executive Command' },
                  { id: 'Battery Command', label: 'Battery Commanders' },
                  { id: 'Senior JCOs', label: 'Senior JCOs (RSM/BSM)' },
                  { id: 'Regimental Staff', label: 'Staff & Key Roles' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all cursor-pointer whitespace-nowrap border ${
                      categoryFilter === cat.id
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                        : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </>
            ) : (
              <>
                <span className="text-[11px] text-slate-400 font-mono mr-1">শিফট / পোস্ট:</span>
                {[
                  { id: 'All', label: 'সকল আরপি পোস্ট' },
                  { id: '24 Hours', label: '24 Hours Duty' },
                  { id: 'Day', label: 'Day Shift' },
                  { id: 'Night', label: 'Night Shift' },
                  { id: 'Gate', label: 'Main Gate Sentry' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all cursor-pointer whitespace-nowrap border ${
                      categoryFilter === cat.id
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-bold'
                        : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Content Tables */}
          {activeRosterView === 'appointments' ? (
            /* ================= APPOINTMENTS TABLE ================= */
            filteredAppointments.length === 0 ? (
              <div className="py-8 text-center space-y-1.5">
                <p className="text-sm text-slate-400 font-medium">কোনো পদাধিকারী পাওয়া যায়নি</p>
                <p className="text-xs text-slate-500">ফিল্টার অথবা অনুসন্ধান পরিবর্তন করুন</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3">সেনা নং / BA No</th>
                      <th className="py-2.5 px-3">র‍্যাংক ও নাম</th>
                      <th className="py-2.5 px-3">অ্যাসাইনকৃত অ্যাপয়েন্টমেন্ট (Appointment)</th>
                      <th className="py-2.5 px-3">ব্যাটারী</th>
                      <th className="py-2.5 px-3">বর্তমান প্যারেড স্টেটাস</th>
                      <th className="py-2.5 px-3">যোগাযোগ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {filteredAppointments.map((item, idx) => {
                      const person = item.personnel;
                      return (
                        <tr
                          key={item.id || idx}
                          className="hover:bg-slate-800/40 transition-colors group"
                        >
                          {/* SL */}
                          <td className="py-2.5 px-3 text-center text-slate-500 font-mono text-[11px]">
                            {idx + 1}
                          </td>

                          {/* Army / BA No */}
                          <td className="py-2.5 px-3 font-mono font-bold text-amber-300">
                            {item.snkNo}
                          </td>

                          {/* Rank & Name */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <RankBadge rank={item.rk} size="sm" />
                              {person ? (
                                <button
                                  type="button"
                                  onClick={() => onViewDossier(person)}
                                  className="font-semibold text-white hover:text-amber-300 hover:underline cursor-pointer text-left transition-colors"
                                  title="ক্লিক করে ডসিয়ার দেখুন"
                                >
                                  {item.name}
                                </button>
                              ) : (
                                <span className="font-semibold text-white">{item.name}</span>
                              )}
                            </div>
                          </td>

                          {/* Appointment Title */}
                          <td className="py-2.5 px-3">
                            <div className="space-y-0.5">
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-medium text-xs">
                                <Award className="w-3 h-3 text-amber-400" />
                                <span>{item.appointment}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 pl-1">{item.appointmentBn}</div>
                            </div>
                          </td>

                          {/* Battery */}
                          <td className="py-2.5 px-3">
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                              {item.battery}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-2.5 px-3">
                            <StatusBadge status={item.status} details={item.statusDetails} size="sm" />
                          </td>

                          {/* Contact */}
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                            {item.phone ? (
                              <div className="flex items-center gap-1 text-slate-300">
                                <Phone className="w-3 h-3 text-emerald-400" />
                                <span>{item.phone}</span>
                              </div>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            /* ================= REGIMENTAL POLICE TABLE ================= */
            filteredRP.length === 0 ? (
              <div className="py-8 text-center space-y-1.5">
                <p className="text-sm text-slate-400 font-medium">কোনো আরপি সদস্য পাওয়া যায়নি</p>
                <p className="text-xs text-slate-500">ফিল্টার অথবা অনুসন্ধান পরিবর্তন করুন</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3">সেনা নং</th>
                      <th className="py-2.5 px-3">র‍্যাংক ও নাম</th>
                      <th className="py-2.5 px-3">আরপি পোস্ট ও দায়িত্ব (RP Duty Post)</th>
                      <th className="py-2.5 px-3">ব্যাটারী</th>
                      <th className="py-2.5 px-3">শিফট / সময়সূচী</th>
                      <th className="py-2.5 px-3">ডিউটি লোকেশন</th>
                      <th className="py-2.5 px-3">স্টেটাস</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {filteredRP.map((item, idx) => {
                      const person = item.personnel;
                      return (
                        <tr
                          key={item.id || idx}
                          className="hover:bg-slate-800/40 transition-colors group"
                        >
                          {/* SL */}
                          <td className="py-2.5 px-3 text-center text-slate-500 font-mono text-[11px]">
                            {idx + 1}
                          </td>

                          {/* Snk No */}
                          <td className="py-2.5 px-3 font-mono font-bold text-indigo-300">
                            {item.snkNo}
                          </td>

                          {/* Rank & Name */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <RankBadge rank={item.rk} size="sm" />
                              {person ? (
                                <button
                                  type="button"
                                  onClick={() => onViewDossier(person)}
                                  className="font-semibold text-white hover:text-indigo-300 hover:underline cursor-pointer text-left transition-colors"
                                  title="ক্লিক করে ডসিয়ার দেখুন"
                                >
                                  {item.name}
                                </button>
                              ) : (
                                <span className="font-semibold text-white">{item.name}</span>
                              )}
                            </div>
                          </td>

                          {/* RP Post */}
                          <td className="py-2.5 px-3">
                            <div className="space-y-0.5">
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-medium text-xs">
                                <Shield className="w-3 h-3 text-indigo-400" />
                                <span>{item.post}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 pl-1">{item.postBn}</div>
                            </div>
                          </td>

                          {/* Battery */}
                          <td className="py-2.5 px-3">
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                              {item.battery}
                            </span>
                          </td>

                          {/* Shift */}
                          <td className="py-2.5 px-3 font-mono text-[11px]">
                            <span className="inline-flex items-center gap-1 text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                              <Clock className="w-3 h-3 text-indigo-400" />
                              <span>{item.shift}</span>
                            </span>
                          </td>

                          {/* Location */}
                          <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                              <span className="truncate max-w-[150px]">{item.location}</span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-2.5 px-3">
                            <StatusBadge status={item.status} details={item.statusDetails} size="sm" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};
