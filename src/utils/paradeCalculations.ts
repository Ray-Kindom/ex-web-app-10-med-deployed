import { Personnel, Battery, ALL_BATTERIES, ParadeDutyAssignment, DailyParadePoint, AuthEstablishmentItem } from '../types';

export interface SimpleParadeSummary {
  battery: Battery | 'Consolidated';
  auth: number;           // Authorized strength (638 Consolidated, or battery-specific)
  totalPersonnel: number; // All entries including Civilian
  civilian: number;       // Civilian non-military personnel
  ere: number;            // Extra Regimental Employment (deputation out)
  totalPosted: number;    // Total Personnel - (ERE + Civilian) = 563
  outOfUnit: number;      // ONLY Msn + Att (Mission & Attached) = 57
  held: number;           // Posted - Out of Unit (Msn+Att) = 506
  totalOut: number;       // Rest of Out: Leave + Course + CMH + Comd + FDMN + AWOL = 66
  presentInUnit: number;  // Held - Total Out = 440
  offParade: number;      // Detailed duty count
  onParade: number;       // Present in Unit - Off Parade = 440
  detailingCount: number; // Total duty detailing assignments
  lineSick: number;       // Line Sick / Morning Sick count
  onParadePercentage: number;
  presentInUnitPercentage: number;
  // Backward compatibility aliases
  totalOutOfUnit?: number; // alias for totalOut
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
    outOfUnitOnly: number; // msn + att
    totalOutRest: number;  // lve + course + cmh + comd + fdmn + awol
  };
  dutyBreakdown: {
    unitSy: number;
    working: number;
    fixedDuty: number;
    others: number;
  };
}

/**
 * Returns authorized establishment count for a battery or Consolidated (total 638).
 */
export function getAuthorizedEstablishment(
  batteryScope: Battery | 'Consolidated' = 'Consolidated',
  authList?: AuthEstablishmentItem[]
): number {
  if (authList && Array.isArray(authList)) {
    // 1. Check if there is a subUnit matching batteryScope
    const subUnitItem = authList.find((a) => a.subUnit === batteryScope);
    if (subUnitItem) {
      if (typeof subUnitItem.total === 'number' && subUnitItem.total > 0) return subUnitItem.total;
      if (typeof subUnitItem.authorized === 'number' && subUnitItem.authorized > 0) return subUnitItem.authorized;
    }
    if (batteryScope === 'Consolidated') {
      const unitTotal = authList.find((a) => a.subUnit === 'Total Unit' || a.subUnit === 'All' || a.id === 'auth-total');
      if (unitTotal) {
        if (typeof unitTotal.total === 'number' && unitTotal.total > 0) return unitTotal.total;
        if (typeof unitTotal.authorized === 'number' && unitTotal.authorized > 0) return unitTotal.authorized;
      }
    }

    const totalItem = authList.find((a) => a.id === 'auth-total');
    if (totalItem) {
      if (batteryScope === 'Consolidated') return totalItem.authorized || totalItem.total || 638;
      if (batteryScope === 'P Bty') return totalItem.pBty ?? 158;
      if (batteryScope === 'Q Bty') return totalItem.qBty ?? 158;
      if (batteryScope === 'R Bty') return totalItem.rBty ?? 158;
      if (batteryScope === 'HQ Bty') return totalItem.hqBty ?? 135;
      if (batteryScope === 'EME') return totalItem.eme ?? totalItem.wksp ?? 29;
    }
  }
  if (batteryScope === 'Consolidated') return 638;
  if (batteryScope === 'P Bty') return 158;
  if (batteryScope === 'Q Bty') return 158;
  if (batteryScope === 'R Bty') return 158;
  if (batteryScope === 'HQ Bty') return 135;
  if (batteryScope === 'EME') return 29;
  return 638;
}

/**
 * Checks whether a personnel is strictly in Out of Unit (Msn + Att only).
 */
export function isPersonnelOutOfUnit(p: Personnel): boolean {
  if (p.outOfUnitCategory === 'Msn' || p.outOfUnitCategory === 'Att') {
    return true;
  }
  if (p.status === 'Msn' || p.status === 'Att' || p.status === 'Attached Out') {
    return true;
  }
  return false;
}

/**
 * Checks whether a personnel is in Total Out (Leave, Course, CMH, Comd, FDMN, AWOL).
 */
export function isPersonnelTotalOut(p: Personnel): boolean {
  if (
    p.outOfUnitCategory === 'P/Lve' ||
    p.outOfUnitCategory === 'C/Lve' ||
    p.outOfUnitCategory === 'Course' ||
    p.outOfUnitCategory === 'CMH' ||
    p.outOfUnitCategory === 'Comd' ||
    p.outOfUnitCategory === 'FDMN'
  ) {
    return true;
  }
  if (
    p.status === 'Leave' ||
    p.status === 'P/Lve' ||
    p.status === 'C/Lve' ||
    p.status === 'Course' ||
    p.status === 'Course/Trg' ||
    p.status === 'CMH' ||
    p.status === 'CMH/Sick' ||
    p.status === 'Temp Duty' ||
    p.status === 'Comd' ||
    p.status === 'FDMN' ||
    p.status === 'AWOL' ||
    p.status === 'AWOL/OSL'
  ) {
    return true;
  }
  return false;
}

/**
 * Checks whether a personnel is physically away from the unit (either Out of Unit or Total Out).
 */
export function isPersonnelAway(p: Personnel): boolean {
  return isPersonnelOutOfUnit(p) || isPersonnelTotalOut(p) || p.status === 'ERE' || p.outOfUnitCategory === 'ERE';
}

/**
 * Military Parade State Calculation:
 * 1. Auth: Regiment authorized establishment = 638 (or battery specific)
 * 2. Posted: Total Personnel - (ERE + Civilian) = 563
 * 3. Out of Unit: ONLY Msn + Att (Mission & Attached personnel) = 57
 * 4. Held: Posted - Out of Unit (Msn+Att) = 506
 * 5. Total Out: Rest of Out: Leave (P/Lve + C/Lve) + Course + CMH + Comd + FDMN + AWOL = 66
 * 6. Present in Unit: Held - Total Out = 440
 * 7. Off Parade: Detailed duty count (Duty Detailing)
 * 8. On Parade: Present in Unit - Off Parade = 440
 */
export function calculateSimpleParadeState(
  personnelList: Personnel[],
  dutyAssignments: ParadeDutyAssignment[],
  batteryScope: Battery | 'Consolidated' = 'Consolidated',
  lineSickOrPoints?: number | DailyParadePoint[],
  authList?: AuthEstablishmentItem[]
): SimpleParadeSummary {
  // 1. Filter personnel by battery scope
  const scopedPersonnel =
    batteryScope === 'Consolidated'
      ? personnelList
      : personnelList.filter((p) => p.battery === batteryScope);

  const totalPersonnel = scopedPersonnel.length;

  // 2. Authorized establishment (Consolidated = 638)
  const auth = getAuthorizedEstablishment(batteryScope, authList);

  // 3. Count Civilian & ERE
  let civilian = 0;
  let ere = 0;

  scopedPersonnel.forEach((p) => {
    const isCiv =
      p.status === 'Civilian' ||
      p.rk === 'Civilian' ||
      p.trade === 'Civilian' ||
      (typeof p.rk === 'string' && p.rk.toLowerCase().includes('civ'));
    if (isCiv) {
      civilian++;
    } else if (p.status === 'ERE' || p.outOfUnitCategory === 'ERE') {
      ere++;
    }
  });

  // Posted = Total Personnel - (ERE + Civilian) = 563
  const totalPosted = Math.max(0, totalPersonnel - (ere + civilian));

  // 4. Breakdown calculation:
  // Out of Unit: ONLY Msn + Att
  // Total Out: Leave (P/Lve + C/Lve) + Course + CMH + Comd + FDMN + AWOL
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
    // Skip Civilians and ERE since they are already removed from Posted
    const isCiv =
      p.status === 'Civilian' ||
      p.rk === 'Civilian' ||
      p.trade === 'Civilian' ||
      (typeof p.rk === 'string' && p.rk.toLowerCase().includes('civ'));
    if (isCiv || p.status === 'ERE' || p.outOfUnitCategory === 'ERE') return;

    if (p.status === 'P/Lve' || p.outOfUnitCategory === 'P/Lve' || (p.status === 'Leave' && p.leaveType !== 'C/Lve')) {
      pLve++;
    } else if (p.status === 'C/Lve' || p.outOfUnitCategory === 'C/Lve' || (p.status === 'Leave' && p.leaveType === 'C/Lve')) {
      cLve++;
    } else if (p.status === 'Course' || p.outOfUnitCategory === 'Course' || p.status === 'Course/Trg') {
      course++;
    } else if (p.status === 'CMH' || p.outOfUnitCategory === 'CMH' || p.status === 'CMH/Sick') {
      cmh++;
    } else if (p.status === 'Msn' || p.outOfUnitCategory === 'Msn') {
      msn++;
    } else if (p.status === 'Att' || p.outOfUnitCategory === 'Att' || p.status === 'Attached Out') {
      att++;
    } else if (p.status === 'FDMN' || p.outOfUnitCategory === 'FDMN') {
      fdmn++;
    } else if (
      p.status === 'Comd' ||
      p.outOfUnitCategory === 'Comd' ||
      Boolean(p.comdAssignment) ||
      p.statusDetails?.toLowerCase().includes('comd') ||
      (p.status === 'Temp Duty' && p.outOfUnitCategory !== 'FDMN')
    ) {
      comd++;
    } else if (p.status === 'AWOL' || p.status === 'AWOL/OSL') {
      awol++;
    }

    if (
      p.status === 'Line Sick' ||
      p.statusDetails?.toLowerCase().includes('line sick') ||
      p.statusDetails?.toLowerCase().includes('morning sick') ||
      p.statusDetails?.toLowerCase().includes('sick in qtr')
    ) {
      personnelLineSick++;
    }
  });

  const lve = pLve + cLve;

  // New Logic Definitions:
  // Out of Unit: ONLY Msn + Att = 57
  const outOfUnit = msn + att;

  // Held: Posted - Out of Unit (Msn+Att) = 506
  const held = Math.max(0, totalPosted - outOfUnit);

  // Total Out: Leave + Course + CMH + Comd + FDMN + AWOL = 66
  const totalOut = lve + course + cmh + comd + fdmn + awol;

  // Present in Unit: Held - Total Out = 440
  const presentInUnit = Math.max(0, held - totalOut);

  // Duty Detailing count
  const scopedDuties =
    batteryScope === 'Consolidated'
      ? dutyAssignments
      : dutyAssignments.filter((d) => d.battery === batteryScope);

  const detailingCount = scopedDuties.length;

  // Line Sick / Morning Sick calculation
  let lineSick = personnelLineSick;
  if (typeof lineSickOrPoints === 'number') {
    lineSick = lineSickOrPoints;
  } else if (Array.isArray(lineSickOrPoints)) {
    const sickPoint = lineSickOrPoints.find(
      (pt) => pt && pt.name && pt.name.toLowerCase().includes('sick')
    );
    if (sickPoint && sickPoint.counts) {
      if (batteryScope === 'Consolidated') {
        const batteries: Battery[] = ALL_BATTERIES;
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

  // Off Parade (Duty Detailing) = Pure count of personnel detailed to duties
  const offParade = detailingCount;

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

  // On Parade = Present in Unit - Off Parade
  const onParade = Math.max(0, presentInUnit - offParade);

  const onParadePercentage =
    presentInUnit > 0 ? Math.round((onParade / presentInUnit) * 100) : 0;
  const presentInUnitPercentage =
    totalPosted > 0 ? Math.round((presentInUnit / totalPosted) * 100) : 0;

  return {
    battery: batteryScope,
    auth,
    totalPersonnel,
    civilian,
    ere,
    totalPosted,
    outOfUnit,
    held,
    totalOut,
    totalOutOfUnit: totalOut,
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
      outOfUnitOnly: outOfUnit,
      totalOutRest: totalOut,
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
