import {
  Personnel,
  ServiceActivityRecord,
  ServiceActivityType,
  ParadeStatus,
  OutOfUnitCategory,
} from '../types';

/**
 * Creates unique ID for historical service activity records
 */
export const generateActivityId = (prefix = 'act'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
};

/**
 * Formats a clean ISO date string (YYYY-MM-DD)
 */
export const getCleanDate = (dateStr?: string): string => {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch (e) {}
  return new Date().toISOString().split('T')[0];
};

/**
 * Calculates duration in days between two YYYY-MM-DD dates inclusive
 */
export const calculateDurationDays = (startDate?: string, endDate?: string): number | undefined => {
  if (!startDate || !endDate) return undefined;
  const d1 = new Date(startDate).getTime();
  const d2 = new Date(endDate).getTime();
  if (isNaN(d1) || isNaN(d2) || d2 < d1) return undefined;
  return Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
};

/**
 * Resolves default military time slot for duty sessions
 */
export const resolveDutyTimeSlot = (sessionType: string, customTime?: string): string => {
  if (customTime && customTime.trim()) return customTime.trim();
  const lower = (sessionType || '').toLowerCase();
  if (lower.includes('morning') || lower.includes('১ম')) return '0600 - 1200 HRS';
  if (lower.includes('second') || lower.includes('২য়') || lower.includes('afternoon')) return '1200 - 1800 HRS';
  if (lower.includes('night') || lower.includes('games') || lower.includes('guard')) return '1800 - 0600 HRS';
  return '24-Hour Duty';
};

/**
 * Creates a specific Duty Service Activity Record for parade/unit duty detailing
 */
export const createDutyActivityRecord = (params: {
  dutyName: string;
  category?: string;
  date: string;
  sessionType: string;
  timeSlot?: string;
  location?: string;
  weaponOrAmmo?: string;
  authority?: string;
  remarks?: string;
  assignedBy?: string;
}): ServiceActivityRecord => {
  const timeSlot = resolveDutyTimeSlot(params.sessionType, params.timeSlot);
  return {
    id: generateActivityId('duty'),
    type: 'Duty',
    title: params.dutyName || 'Regimental Duty / Sy Guard',
    subType: params.category || 'Parade Duty',
    startDate: getCleanDate(params.date),
    endDate: getCleanDate(params.date),
    timeSlot,
    durationDays: 1,
    location: params.location || 'Unit Premise & Guard Post',
    weaponOrAmmo: params.weaponOrAmmo,
    authority: params.authority || `Parade Detailing (${params.sessionType})`,
    remarks: params.remarks || `Detailed by ${params.assignedBy || 'RSM'}`,
    recordedAt: new Date().toISOString(),
    recordedBy: params.assignedBy || 'RSM',
    status: 'Completed',
  };
};

/**
 * Analyzes previous and updated personnel records to automatically detect diffs and generate
 * permanent military career activity ledger records (duty status, camp changes, courses, medical, etc.).
 */
export const createPersonnelChangeActivities = (
  prevRecord: Personnel,
  updatedFields: Partial<Personnel>,
  recordedBy = 'System Hook'
): ServiceActivityRecord[] => {
  const activities: ServiceActivityRecord[] = [];
  const today = getCleanDate();
  const existingActivities = prevRecord.activityHistory || [];

  // Helper to check if a very similar activity already exists today to prevent duplicates
  const isDuplicateActivity = (type: ServiceActivityType, title: string, startDate?: string): boolean => {
    return existingActivities.some(
      (a) =>
        a.type === type &&
        a.title.toLowerCase().trim() === title.toLowerCase().trim() &&
        (a.startDate === startDate || a.startDate === today)
    );
  };

  // 1. Status / Parade Status Changes
  const oldStatus = prevRecord.status;
  const newStatus = updatedFields.status;

  if (newStatus && newStatus !== oldStatus) {
    if (newStatus === 'In Unit' || newStatus === 'Present') {
      // Soldier returned to Unit from outstation, hospital, course, or leave
      const wasOut = oldStatus && oldStatus !== 'In Unit' && oldStatus !== 'Present';
      if (wasOut) {
        const title = `Returned to Unit (ইউনিটে প্রত্যাবর্তন)`;
        if (!isDuplicateActivity('General', title, today)) {
          activities.push({
            id: generateActivityId('ret'),
            type: 'General',
            title,
            subType: 'Unit Return',
            startDate: today,
            location: 'Unit Premise (Ramu Cantt / HQ)',
            authority: updatedFields.authority || 'Unit Daily Routine',
            remarks: `Returned to active unit strength from ${oldStatus} (${prevRecord.location || prevRecord.statusDetails || 'Outstation'}).`,
            recordedAt: new Date().toISOString(),
            recordedBy,
            status: 'Completed',
          });
        }
      }
    } else if (newStatus === 'FDMN' || updatedFields.outOfUnitCategory === 'FDMN') {
      // FDMN Camp Deployment
      const loc = updatedFields.outOfUnitLocation || updatedFields.location || 'Whykong Camp, Teknaf';
      const start = getCleanDate(updatedFields.outOfUnitStartDate || updatedFields.startDate || today);
      const end = updatedFields.outOfUnitEndDate || updatedFields.endDate;
      const duration = updatedFields.durationDays || calculateDurationDays(start, end) || 90;
      const title = `FDMN Camp Duty: ${loc}`;

      if (!isDuplicateActivity('FDMN Camp', title, start)) {
        activities.push({
          id: generateActivityId('fdmn'),
          type: 'FDMN Camp',
          title,
          subType: 'FDMN Deployment',
          startDate: start,
          endDate: end,
          durationDays: duration,
          location: loc,
          authority: updatedFields.outOfUnitAuthority || updatedFields.authority || 'HQ 10 Med Regt Arty',
          remarks: updatedFields.outOfUnitRemarks || updatedFields.remarks || 'Field Security & Rohingya Camp Operational Duty',
          recordedAt: new Date().toISOString(),
          recordedBy,
          status: 'Active',
        });
      }
    } else if (newStatus === 'Course' || updatedFields.outOfUnitCategory === 'Course') {
      // Military Course / Cadre
      const courseName = updatedFields.courseName || updatedFields.location || 'Military Training Cadre';
      const loc = updatedFields.courseLocation || updatedFields.location || 'Artillery Centre & School (AC&S)';
      const start = getCleanDate(updatedFields.courseFrom || updatedFields.startDate || today);
      const end = updatedFields.courseTo || updatedFields.endDate;
      const duration = updatedFields.durationDays || calculateDurationDays(start, end) || 30;
      const title = `Course: ${courseName}`;

      if (!isDuplicateActivity('Course', title, start)) {
        activities.push({
          id: generateActivityId('crs'),
          type: 'Course',
          title,
          subType: 'Training Cadre',
          startDate: start,
          endDate: end,
          durationDays: duration,
          location: loc,
          authority: updatedFields.authority || 'AHQ Trg Dte Part II Order',
          remarks: updatedFields.remarks || `Attending military cadre/course: ${courseName}`,
          recordedAt: new Date().toISOString(),
          recordedBy,
          status: 'Active',
        });
      }
    } else if (newStatus === 'CMH' || updatedFields.outOfUnitCategory === 'CMH') {
      // CMH Admission / Medical Review
      const hospital = updatedFields.hospitalName || updatedFields.location || 'CMH Cox\'s Bazar / CMH Dhaka';
      const diag = updatedFields.diagnosis || 'Medical Admission / Observation';
      const start = getCleanDate(updatedFields.admissionDate || updatedFields.startDate || today);
      const end = updatedFields.reviewDate || updatedFields.endDate;
      const duration = updatedFields.durationDays || calculateDurationDays(start, end) || 7;
      const title = `CMH Admission: ${diag}`;

      if (!isDuplicateActivity('CMH', title, start)) {
        activities.push({
          id: generateActivityId('cmh'),
          type: 'CMH',
          title,
          subType: 'Hospitalization',
          startDate: start,
          endDate: end,
          durationDays: duration,
          location: hospital,
          authority: updatedFields.authority || 'Regimental Medical Officer (RMO)',
          remarks: updatedFields.remarks || `Admitted to ${hospital}. Diagnosis: ${diag}`,
          recordedAt: new Date().toISOString(),
          recordedBy,
          status: 'Active',
        });
      }
    } else if (newStatus === 'P/Lve' || newStatus === 'C/Lve' || updatedFields.outOfUnitCategory === 'P/Lve' || updatedFields.outOfUnitCategory === 'C/Lve') {
      // Leave (P/Lve & C/Lve)
      const lveType = newStatus === 'C/Lve' || updatedFields.outOfUnitCategory === 'C/Lve' ? 'C/Lve' : 'P/Lve';
      const start = getCleanDate(updatedFields.leaveFrom || updatedFields.startDate || today);
      const end = updatedFields.leaveTo || updatedFields.endDate;
      const duration = updatedFields.durationDays || calculateDurationDays(start, end) || (lveType === 'P/Lve' ? 15 : 5);
      const title = lveType === 'P/Lve' ? 'Privilege Leave (বাৎসরিক ছুটি)' : 'Casual Leave (নৈমিত্তিক ছুটি)';

      if (!isDuplicateActivity('Leave', title, start)) {
        activities.push({
          id: generateActivityId('lve'),
          type: 'Leave',
          title,
          subType: lveType,
          startDate: start,
          endDate: end,
          durationDays: duration,
          location: updatedFields.leaveAddress || updatedFields.location || 'Home Address',
          authority: updatedFields.authority || 'CO / Adjutant Approved',
          remarks: updatedFields.remarks || `Proceeded on ${lveType} for ${duration} days`,
          recordedAt: new Date().toISOString(),
          recordedBy,
          status: 'Active',
        });
      }
    } else if (newStatus === 'Att' || updatedFields.outOfUnitCategory === 'Att') {
      // Attachment to other formation
      const loc = updatedFields.location || updatedFields.outOfUnitLocation || 'External Formation HQ';
      const start = getCleanDate(updatedFields.startDate || updatedFields.outOfUnitStartDate || today);
      const end = updatedFields.endDate || updatedFields.outOfUnitEndDate;
      const duration = updatedFields.durationDays || calculateDurationDays(start, end);
      const title = `Attachment: ${loc}`;

      if (!isDuplicateActivity('Att', title, start)) {
        activities.push({
          id: generateActivityId('att'),
          type: 'Att',
          title,
          subType: 'Attached Out',
          startDate: start,
          endDate: end,
          durationDays: duration,
          location: loc,
          authority: updatedFields.outOfUnitAuthority || updatedFields.authority || 'Formation Part II Order',
          remarks: updatedFields.outOfUnitRemarks || updatedFields.remarks || 'Temporary duty attachment',
          recordedAt: new Date().toISOString(),
          recordedBy,
          status: 'Active',
        });
      }
    } else if (newStatus === 'Msn' || updatedFields.outOfUnitCategory === 'Msn') {
      // UN Peacekeeping Mission
      const loc = updatedFields.location || updatedFields.outOfUnitLocation || 'UN Mission Area';
      const start = getCleanDate(updatedFields.startDate || updatedFields.outOfUnitStartDate || today);
      const end = updatedFields.endDate || updatedFields.outOfUnitEndDate;
      const title = `UN Peacekeeping Mission: ${loc}`;

      if (!isDuplicateActivity('Msn', title, start)) {
        activities.push({
          id: generateActivityId('msn'),
          type: 'Msn',
          title,
          subType: 'UN Mission',
          startDate: start,
          endDate: end,
          durationDays: 365,
          location: loc,
          authority: updatedFields.outOfUnitAuthority || updatedFields.authority || 'AHQ MO Dte',
          remarks: 'United Nations Peacekeeping Operations Deployment',
          recordedAt: new Date().toISOString(),
          recordedBy,
          status: 'Active',
        });
      }
    } else if (newStatus === 'Comd' || updatedFields.outOfUnitCategory === 'Comd') {
      // Command Task
      const task = updatedFields.comdAssignment || updatedFields.location || 'Special Command Task';
      const start = getCleanDate(updatedFields.comdFrom || updatedFields.startDate || today);
      const end = updatedFields.comdTo || updatedFields.endDate;
      const title = `Command Task: ${task}`;

      if (!isDuplicateActivity('Comd', title, start)) {
        activities.push({
          id: generateActivityId('cmd'),
          type: 'Comd',
          title,
          subType: 'Command Task',
          startDate: start,
          endDate: end,
          location: updatedFields.comdLocation || updatedFields.location || 'Formation Area',
          authority: updatedFields.comdAuthority || updatedFields.authority || 'Div / Bde Task Order',
          remarks: updatedFields.remarks || task,
          recordedAt: new Date().toISOString(),
          recordedBy,
          status: 'Active',
        });
      }
    } else if (newStatus === 'Line Sick') {
      // Line Sick / Quarter Sick
      const title = `Line Sick: ${updatedFields.diagnosis || 'Rest in Lines'}`;
      if (!isDuplicateActivity('CMH', title, today)) {
        activities.push({
          id: generateActivityId('sic'),
          type: 'CMH',
          title,
          subType: 'Line Sick',
          startDate: today,
          location: 'Unit Lines / MI Room',
          authority: 'RMO Order',
          remarks: updatedFields.remarks || 'Excused parade & heavy duty (Quarter Sick)',
          recordedAt: new Date().toISOString(),
          recordedBy,
          status: 'Active',
        });
      }
    }
  }

  // 2. Rank Promotion Detection
  if (updatedFields.rk && updatedFields.rk !== prevRecord.rk) {
    const title = `Rank Promotion: ${prevRecord.rk} ➔ ${updatedFields.rk}`;
    if (!isDuplicateActivity('Promotion', title, today)) {
      activities.push({
        id: generateActivityId('prm'),
        type: 'Promotion',
        title,
        subType: 'Promotion',
        startDate: today,
        authority: updatedFields.authority || 'Unit Part II Order / AHQ Record Office',
        remarks: `Promoted from ${prevRecord.rk} to ${updatedFields.rk} in 10 Med Regt Arty`,
        recordedAt: new Date().toISOString(),
        recordedBy,
        status: 'Completed',
      });
    }
  }

  // 3. Sub-Unit / Battery Transfer Detection
  if (updatedFields.battery && updatedFields.battery !== prevRecord.battery) {
    const title = `Battery Transfer: ${prevRecord.battery} ➔ ${updatedFields.battery}`;
    if (!isDuplicateActivity('General', title, today)) {
      activities.push({
        id: generateActivityId('trf'),
        type: 'General',
        title,
        subType: 'Internal Posting',
        startDate: today,
        authority: updatedFields.authority || 'CO Regimental Order',
        remarks: `Sub-unit posted from ${prevRecord.battery} to ${updatedFields.battery}`,
        recordedAt: new Date().toISOString(),
        recordedBy,
        status: 'Completed',
      });
    }
  }

  // 4. Trade / Specialization Change Detection
  if (updatedFields.trade && updatedFields.trade !== prevRecord.trade) {
    const title = `Trade Qualification: ${prevRecord.trade} ➔ ${updatedFields.trade}`;
    if (!isDuplicateActivity('General', title, today)) {
      activities.push({
        id: generateActivityId('trd'),
        type: 'General',
        title,
        subType: 'Trade Qualification',
        startDate: today,
        authority: updatedFields.authority || 'AHQ Artillery Dte',
        remarks: `Regimental trade qualification updated to ${updatedFields.trade}`,
        recordedAt: new Date().toISOString(),
        recordedBy,
        status: 'Completed',
      });
    }
  }

  // 5. Medical Category Change Detection
  if (updatedFields.medicalCategory && updatedFields.medicalCategory !== prevRecord.medicalCategory) {
    const title = `Medical Category: ${prevRecord.medicalCategory || 'AYE'} ➔ ${updatedFields.medicalCategory}`;
    if (!isDuplicateActivity('CMH', title, today)) {
      activities.push({
        id: generateActivityId('med'),
        type: 'CMH',
        title,
        subType: 'Medical Board',
        startDate: today,
        location: 'CMH Medical Board',
        authority: 'Classified Specialist / Medical Board',
        remarks: `Medical classification updated to Category ${updatedFields.medicalCategory}`,
        recordedAt: new Date().toISOString(),
        recordedBy,
        status: 'Completed',
      });
    }
  }

  // 6. Direct Course assignment update without status change
  if (
    updatedFields.courseName &&
    updatedFields.courseName !== prevRecord.courseName &&
    newStatus !== 'Course'
  ) {
    const title = `Course: ${updatedFields.courseName}`;
    const start = getCleanDate(updatedFields.courseFrom || today);
    if (!isDuplicateActivity('Course', title, start)) {
      activities.push({
        id: generateActivityId('crs_field'),
        type: 'Course',
        title,
        subType: 'Training Cadre',
        startDate: start,
        endDate: updatedFields.courseTo,
        location: updatedFields.courseLocation || 'Artillery Centre & School (AC&S)',
        authority: updatedFields.authority || 'Trg Part II Order',
        remarks: updatedFields.remarks || `Course details: ${updatedFields.courseName}`,
        recordedAt: new Date().toISOString(),
        recordedBy,
        status: 'Active',
      });
    }
  }

  // 7. Direct Hospital diagnosis update without status change
  if (
    updatedFields.diagnosis &&
    updatedFields.diagnosis !== prevRecord.diagnosis &&
    newStatus !== 'CMH'
  ) {
    const title = `CMH Admission: ${updatedFields.diagnosis}`;
    const start = getCleanDate(updatedFields.admissionDate || today);
    if (!isDuplicateActivity('CMH', title, start)) {
      activities.push({
        id: generateActivityId('cmh_field'),
        type: 'CMH',
        title,
        subType: 'Hospitalization',
        startDate: start,
        endDate: updatedFields.reviewDate,
        location: updatedFields.hospitalName || 'CMH',
        authority: 'RMO',
        remarks: updatedFields.remarks || updatedFields.diagnosis,
        recordedAt: new Date().toISOString(),
        recordedBy,
        status: 'Active',
      });
    }
  }

  return activities;
};

/**
 * Applies the automatic history hook to a personnel record when an update occurs.
 * Automatically prepends any newly detected activities into `activityHistory`.
 */
export const applyPersonnelHistoryHook = (
  prevRecord: Personnel,
  updatedFields: Partial<Personnel>,
  recordedBy = 'System Hook'
): Personnel => {
  // Generate diff activities
  const newActivities = createPersonnelChangeActivities(prevRecord, updatedFields, recordedBy);

  // Merge activity histories safely
  let combinedHistory = updatedFields.activityHistory || prevRecord.activityHistory || [];
  if (newActivities.length > 0) {
    const seenIds = new Set(combinedHistory.map((a) => a.id));
    const uniqueNew = newActivities.filter((a) => !seenIds.has(a.id));
    combinedHistory = [...uniqueNew, ...combinedHistory];
  }

  return {
    ...prevRecord,
    ...updatedFields,
    activityHistory: combinedHistory,
  };
};
