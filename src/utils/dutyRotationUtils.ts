import { Personnel, ParadeDutyAssignment, Battery } from '../types';

export interface SoldierDutyHistory {
  personnelId: string;
  hadDutyYesterday: boolean;
  yesterdayDuty?: string;
  past7DaysCount: number;
  past7DaysDuties: {
    date: string;
    sessionType: string;
    category: string;
    dutyName: string;
  }[];
  past30DaysCount: number;
  lastDutyDate?: string;
  lastDutyName?: string;
  daysSinceLastDuty: number | null; // null if never assigned
  fatigueLevel: 'fresh' | 'normal' | 'fatigued'; // fresh (0 duties in 7d), normal (1-2), fatigued (3+ or had duty yesterday)
}

/**
 * Calculates historical duty assignments and fatigue status for a soldier.
 */
export function getSoldierDutyHistory(
  personnelId: string,
  currentDateStr: string,
  allDutyAssignments: Record<string, ParadeDutyAssignment[]>
): SoldierDutyHistory {
  const curDate = new Date(currentDateStr);
  const curTime = curDate.getTime();

  // Yesterday date string
  const yDate = new Date(curDate);
  yDate.setDate(yDate.getDate() - 1);
  const yesterdayStr = yDate.toISOString().split('T')[0];

  // 7 days ago timestamp
  const sevenDaysAgoTime = curTime - 7 * 24 * 60 * 60 * 1000;
  // 30 days ago timestamp
  const thirtyDaysAgoTime = curTime - 30 * 24 * 60 * 60 * 1000;

  let hadDutyYesterday = false;
  let yesterdayDuty: string | undefined;
  const past7DaysDuties: SoldierDutyHistory['past7DaysDuties'] = [];
  let past30DaysCount = 0;
  let lastDutyDate: string | undefined;
  let lastDutyName: string | undefined;
  let latestDutyTime = -1;

  Object.entries(allDutyAssignments).forEach(([key, assignments]) => {
    if (!Array.isArray(assignments)) return;
    const [assignDate, sessionType] = key.split('_');
    if (!assignDate) return;

    const assignTime = new Date(assignDate).getTime();

    // Only consider duties up to or before currentDate
    assignments.forEach((a) => {
      if (a.personnelId !== personnelId) return;

      // Track most recent past duty
      if (assignTime < curTime && assignTime > latestDutyTime) {
        latestDutyTime = assignTime;
        lastDutyDate = assignDate;
        lastDutyName = a.dutyName;
      }

      // Check yesterday
      if (assignDate === yesterdayStr) {
        hadDutyYesterday = true;
        yesterdayDuty = a.dutyName;
      }

      // Check last 7 days (prior to or on current date)
      if (assignTime >= sevenDaysAgoTime && assignTime <= curTime) {
        past7DaysDuties.push({
          date: assignDate,
          sessionType: sessionType || 'Morning',
          category: a.category,
          dutyName: a.dutyName,
        });
      }

      // Check last 30 days
      if (assignTime >= thirtyDaysAgoTime && assignTime <= curTime) {
        past30DaysCount++;
      }
    });
  });

  const past7DaysCount = past7DaysDuties.length;
  let daysSinceLastDuty: number | null = null;
  if (latestDutyTime > 0) {
    const diffMs = curTime - latestDutyTime;
    daysSinceLastDuty = Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
  }

  let fatigueLevel: 'fresh' | 'normal' | 'fatigued' = 'normal';
  if (past7DaysCount === 0 && (!daysSinceLastDuty || daysSinceLastDuty >= 3)) {
    fatigueLevel = 'fresh';
  } else if (hadDutyYesterday || past7DaysCount >= 3) {
    fatigueLevel = 'fatigued';
  }

  return {
    personnelId,
    hadDutyYesterday,
    yesterdayDuty,
    past7DaysCount,
    past7DaysDuties,
    past30DaysCount,
    lastDutyDate,
    lastDutyName,
    daysSinceLastDuty,
    fatigueLevel,
  };
}

/**
 * Computes duty frequency table for all soldiers in a battery or regiment to assist RSM in fair rotation.
 */
export function getRegimentalDutyFrequencyStats(
  personnelList: Personnel[],
  allDutyAssignments: Record<string, ParadeDutyAssignment[]>,
  currentDateStr: string,
  batteryFilter?: Battery | 'Consolidated'
) {
  const scoped =
    !batteryFilter || batteryFilter === 'Consolidated'
      ? personnelList
      : personnelList.filter((p) => p.battery === batteryFilter);

  return scoped.map((person) => {
    const history = getSoldierDutyHistory(person.id, currentDateStr, allDutyAssignments);
    return {
      person,
      history,
    };
  }).sort((a, b) => {
    // Sort least duties first (most available/rested first)
    if (a.history.past7DaysCount !== b.history.past7DaysCount) {
      return a.history.past7DaysCount - b.history.past7DaysCount;
    }
    return (b.history.daysSinceLastDuty || 99) - (a.history.daysSinceLastDuty || 99);
  });
}
