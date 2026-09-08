import { Personnel, Battery, ParadeDutyAssignment, DailyParadePoint } from '../types';

export interface SimpleParadeSummary {
  battery: Battery | 'Consolidated';
  totalPersonnel: number; // All entries including Civilian
  civilian: number;       // Civilian non-military personnel
  ere: number;            // Extra Regimental Employment (deputation out)
  totalPosted: number;    // Total Personnel - (ERE + Civilian) = (Offr + JCO + RCO + OR + NC(E) + NC(U)) - ERE
  outOfUnit: number;      // Lve (P/Lve + C/Lve) + Course + CMH + Msn + Att + Comd + FDMN
  presentInUnit: number;  // Posted - Out of Unit
  offParade: number;      // Sum of all Detailing + Line Sick/Morning Sick
  onParade: number;       // Present in Unit - Off Parade
  detailingCount: number; // Total duty detailing assignments
  lineSick: number;       // Line Sick / Morning Sick count
  onParadePercentage: number;
  presentInUnitPercentage: number;
  outOfUnitBreakdown: {
    lve: number;          // P/Lve + C/Lve
    pLve: number;
    cLve: number;
    course: number;
    cmh: number;
    msn: number;
    att: number;
    comd: number;
    fdmn: number;
    // Backward compatibility fields
    leave: number;
    sick: number;
    tempDuty: number;
    attachedOut: number;
    awol: number;
  };
  dutyBreakdown: {
    unitSy: number;
    working: number;
    fixedDuty: number;
    others: number;
  };
}

/**
 * Checks whether a personnel is physically away from the unit (Out of Unit).
 * Out of Unit = Lve (P/Lve + C/Lve) + Course + CMH + Msn + Att + Comd + FDMN
 */
export function isPersonnelOutOfUnit(p: Personnel): boolean {
  if (
    p.outOfUnitCategory === 'P/Lve' ||
    p.outOfUnitCategory === 'C/Lve' ||
    p.outOfUnitCategory === 'Course' ||
    p.outOfUnitCategory === 'CMH' ||
    p.outOfUnitCategory === 'Msn' ||
    p.outOfUnitCategory === 'Att' ||
    p.outOfUnitCategory === 'Comd' ||
    p.outOfUnitCategory === 'FDMN' ||
    p.outOfUnitCategory === 'ERE'
  ) {
    return true;
  }
  if (
    p.status === 'Leave' ||
    p.status === 'Course/Trg' ||
    p.status === 'CMH/Sick' ||
    p.status === 'Temp Duty' ||
    p.status === 'Attached Out' ||
    p.status === 'AWOL/OSL'
  ) {
    return true;
  }
  return false;
}

/**
 * Pure, simple parade state calculation:
 * 1. Total Personnel = All Entries (including Civilian)
 * 2. Posted = Total Personnel - (ERE + Civilian) = (Offr + JCO + RCO + OR + NC(E) + NC(U)) - ERE
 * 3. Out of Unit = Lve (P/Lve + C/Lve) + Course + CMH + Msn + Att + Comd + FDMN
 * 4. Present in Unit = Posted - Out of Unit
 * 5. Off Parade = Sum of all Detailing + Line Sick/Morning Sick
 * 6. On Parade = Present in Unit - Off Parade
 */
export function calculateSimpleParadeState(
  personnelList: Personnel[],
  dutyAssignments: ParadeDutyAssignment[],
  batteryScope: Battery | 'Consolidated' = 'Consolidated',
  lineSickOrPoints?: number | DailyParadePoint[]
): SimpleParadeSummary {
  // 1. Filter personnel by battery scope
  const scopedPersonnel =
    batteryScope === 'Consolidated'
      ? personnelList
      : personnelList.filter((p) => p.battery === batteryScope);

  const totalPersonnel = scopedPersonnel.length;

  // 2. Count Civilian & ERE
  let civilian = 0;
  let ere = 0;

  scopedPersonnel.forEach((p) => {
    const isCiv =
      p.rk === 'Civilian' ||
      p.trade === 'Civilian' ||
      (typeof p.rk === 'string' && p.rk.toLowerCase().includes('civ'));
    if (isCiv) {
      civilian++;
    } else if (p.outOfUnitCategory === 'ERE') {
      ere++;
    }
  });

  // Posted = Total Personnel - (ERE + Civilian)
  const totalPosted = Math.max(0, totalPersonnel - (ere + civilian));

  // 3. Count Out of Unit strictly for posted strength:
  // Out of Unit = Lve (P/Lve + C/Lve) + Course + CMH + Msn + Att + Comd + FDMN
  let pLve = 0;
  let cLve = 0;
  let course = 0;
  let cmh = 0;
  let msn = 0;
  let att = 0;
  let comd = 0;
  let fdmn = 0;
  let awol = 0;
  let personnelLineSick = 0;

  scopedPersonnel.forEach((p) => {
    // Skip Civilians and ERE from Out of Unit since they are already removed from Posted
    const isCiv =
      p.rk === 'Civilian' ||
      p.trade === 'Civilian' ||
      (typeof p.rk === 'string' && p.rk.toLowerCase().includes('civ'));
    if (isCiv || p.outOfUnitCategory === 'ERE') return;

    if (p.outOfUnitCategory === 'P/Lve') {
      pLve++;
    } else if (p.outOfUnitCategory === 'C/Lve') {
      cLve++;
    } else if (p.status === 'Leave') {
      pLve++;
    } else if (p.outOfUnitCategory === 'Course' || p.status === 'Course/Trg') {
      course++;
    } else if (p.outOfUnitCategory === 'CMH' || p.status === 'CMH/Sick') {
      cmh++;
    } else if (p.outOfUnitCategory === 'Msn') {
      msn++;
    } else if (p.outOfUnitCategory === 'Att' || p.status === 'Attached Out') {
      att++;
    } else if (p.outOfUnitCategory === 'Comd' || p.status === 'Temp Duty') {
      comd++;
    } else if (p.outOfUnitCategory === 'FDMN') {
      fdmn++;
    } else if (p.status === 'AWOL/OSL') {
      awol++;
    }

    if (
      p.statusDetails?.toLowerCase().includes('line sick') ||
      p.statusDetails?.toLowerCase().includes('morning sick') ||
      p.statusDetails?.toLowerCase().includes('sick in qtr')
    ) {
      personnelLineSick++;
    }
  });

  const lve = pLve + cLve;
  const outOfUnit = lve + course + cmh + msn + att + comd + fdmn + awol;

  // 4. Present in the Unit = Posted - Out of Unit
  const presentInUnit = Math.max(0, totalPosted - outOfUnit);

  // 5. Duty Detailing count
  const scopedDuties =
    batteryScope === 'Consolidated'
      ? dutyAssignments
      : dutyAssignments.filter((d) => d.battery === batteryScope);

  const detailingCount = scopedDuties.length;

  // 6. Line Sick / Morning Sick calculation
  let lineSick = personnelLineSick;
  if (typeof lineSickOrPoints === 'number') {
    lineSick = lineSickOrPoints;
  } else if (Array.isArray(lineSickOrPoints)) {
    const sickPoint = lineSickOrPoints.find(
      (pt) => pt && pt.name && pt.name.toLowerCase().includes('sick')
    );
    if (sickPoint && sickPoint.counts) {
      if (batteryScope === 'Consolidated') {
        const batteries: Battery[] = ['HQ Bty', 'P Bty', 'Q Bty', 'R Bty'];
        lineSick = batteries.reduce((acc, b) => {
          const c = sickPoint.counts[b];
          return acc + (c ? (c.offr || 0) + (c.jco || 0) + (c.or || 0) : 0);
        }, 0);
      } else {
        const c = sickPoint.counts[batteryScope];
        lineSick = c ? (c.offr || 0) + (c.jco || 0) + (c.or || 0) : 0;
      }
    }
  }

  // 7. Off Parade = Sum of all Detailing + Line Sick/Morning Sick
  const offParade = detailingCount + lineSick;

  let unitSy = 0;
  let working = 0;
  let fixedDuty = 0;
  let others = 0;

  scopedDuties.forEach((d) => {
    if (d.category === 'Unit Sy') unitSy++;
    else if (d.category === 'working') working++;
    else if (d.category === 'Fixed Duty') fixedDuty++;
    else others++;
  });

  // 8. On Parade = Present in Unit - Off Parade
  const onParade = Math.max(0, presentInUnit - offParade);

  const onParadePercentage =
    presentInUnit > 0 ? Math.round((onParade / presentInUnit) * 100) : 0;
  const presentInUnitPercentage =
    totalPosted > 0 ? Math.round((presentInUnit / totalPosted) * 100) : 0;

  return {
    battery: batteryScope,
    totalPersonnel,
    civilian,
    ere,
    totalPosted,
    outOfUnit,
    presentInUnit,
    offParade,
    onParade,
    detailingCount,
    lineSick,
    onParadePercentage,
    presentInUnitPercentage,
    outOfUnitBreakdown: {
      lve,
      pLve,
      cLve,
      course,
      cmh,
      msn,
      att,
      comd,
      fdmn,
      leave: lve,
      sick: cmh,
      tempDuty: comd,
      attachedOut: att,
      awol,
    },
    dutyBreakdown: {
      unitSy,
      working,
      fixedDuty,
      others,
    },
  };
}

/**
 * Normalizes duty names so that equivalent designations (e.g. Regt Guard and Quarter Guard)
 * map to a single unified standard heading.
 */
export function normalizeDutyName(name: string): string {
  if (!name) return 'General';
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();

  // Quarter Guard / Regt Guard variations (in artillery units Regt Guard is stationed at Quarter Guard)
  if (
    lower === 'regt guard' ||
    lower === 'regt. guard' ||
    lower === 'regimental guard' ||
    lower === 'regt gd' ||
    lower === 'quarter guard' ||
    lower === 'quarter gd' ||
    lower === 'qtr guard' ||
    lower === 'qtr. guard' ||
    lower === 'qtr gd' ||
    lower === 'q guard' ||
    lower === 'q-guard' ||
    lower === 'qguard' ||
    lower.includes('quarter guard') ||
    lower.includes('qtr guard') ||
    lower.includes('regt guard') ||
    lower.includes('regimental guard')
  ) {
    return 'Quarter Guard';
  }

  // Kot Guard / Kote Guard
  if (
    lower === 'kot guard' ||
    lower === 'kote guard' ||
    lower === 'kot' ||
    lower === 'kote' ||
    lower === 'kote gd'
  ) {
    return 'Kot Guard';
  }

  // Main Gate Guard
  if (lower === 'main gate' || lower === 'main gate guard' || lower === 'main gate gd') {
    return 'Main Gate Guard';
  }

  // Magazine Guard
  if (lower === 'magazine' || lower === 'magazine guard' || lower === 'mag guard') {
    return 'Magazine Guard';
  }

  // RP Duty
  if (lower === 'rp' || lower === 'rp duty' || lower === 'regimental police') {
    return 'RP Duty';
  }

  return trimmed;
}
