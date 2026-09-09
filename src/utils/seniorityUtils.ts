import { Personnel, RankConfig, isOfficerRank, isJCORank, isNCORank, isORRank, isRCORank, isNCERank, isNCURank, isCivilianRank } from '../types';

/**
 * Military Rank Seniority Weights for Bangladesh Army (Artillery)
 * Lower number = higher seniority.
 * Hierarchy:
 * 1. Offr (Lt Col > Maj > Capt > Lt)
 * 2. JCO (MWO > SWO > WO)
 * 3. RCO (Religious Teacher)
 * 4. NCO (Sgt > Cpl)
 * 5. OR (Lcpl > Snk / Gnr)
 * 6. NC(E)
 * 7. NC(U)
 * 8. Civilian (Dupi, Barbar, Mali, Carpenter, Civilian Staff)
 */

export const RANK_SENIORITY_MAP: Record<string, number> = {
  // Commissioned Officers (Lt Col > Maj > Capt > Lt)
  'lt col': 10,
  'lt. col': 10,
  'lieutenant colonel': 10,
  'maj': 20,
  'major': 20,
  'capt': 30,
  'captain': 30,
  'lt': 40,
  'lieutenant': 40,
  '2lt': 50,
  '2nd lt': 50,
  'second lieutenant': 50,

  // Junior Commissioned Officers (MWO > SWO > WO)
  'mwo': 100,
  'master warrant officer': 100,
  'swo': 110,
  'senior warrant officer': 110,
  'wo': 120,
  'warrant officer': 120,

  // Religious Teacher (RCO)
  'rco': 150,
  'religious teacher': 150,

  // Non-Commissioned Officers (NCO = Sgt + Cpl)
  'sgt': 200,
  'sergeant': 200,
  'hav': 200,
  'havildar': 200,
  'cpl': 210,
  'corporal': 210,
  'nk': 210,
  'naik': 210,

  // Other Ranks / Soldiers (OR = NCO + Lcpl + Snk)
  'lcpl': 220,
  'lance corporal': 220,
  'l/cpl': 220,
  'l/nk': 220,
  'lance naik': 220,
  'snk': 300,
  'sainik': 300,
  'soldier': 300,
  'gnr': 310,
  'gunner': 310,
  'snk (dmt)': 320,
  'snk(dmt)': 320,

  // Non-Combatant Enrolled - separate
  'nc(e)': 400,
  'nc (e)': 400,

  // Non-Combatant Un-enrolled - separate
  'nc(u)': 410,
  'nc (u)': 410,

  // Civilian (Dupi, Barbar, Mali, Carpenter, Civilian Staff)
  'civilian': 500,
  'civillian': 500,
  'civ': 500,
  'dupi contractor': 508,
  'dupi': 510,
  'dhobi': 510,
  'barber contractor': 518,
  'barbar': 520,
  'barber': 520,
  'tailor contractor': 524,
  'tailor': 526,
  'carpenter': 530,
  'mali': 535,
  'auto driver': 540,
};

/**
 * Normalizes rank string to find seniority score
 */
export function getRankSeniorityScore(
  rank?: string,
  trade?: string,
  ranksList?: RankConfig[]
): number {
  if (!rank && !trade) return 999;

  const cleanRank = (rank || '').trim().toLowerCase();
  const cleanTrade = (trade || '').trim().toLowerCase();

  // 1. Check distinct non-combatant & civilian categories
  if (isNCERank(rank, trade)) return 400;
  if (isNCURank(rank, trade)) return 410;
  if (isRCORank(rank, trade)) return 150;
  if (isCivilianRank(rank, trade)) {
    if (cleanTrade.includes('dupi contractor')) return 508;
    if (cleanTrade.includes('dupi') || cleanRank === 'dupi' || cleanTrade.includes('dhobi')) return 510;
    if (cleanTrade.includes('barber contractor')) return 518;
    if (cleanTrade.includes('barbar') || cleanRank === 'barbar' || cleanTrade.includes('barber')) return 520;
    if (cleanTrade.includes('tailor contractor')) return 524;
    if (cleanTrade.includes('tailor')) return 526;
    if (cleanTrade.includes('carpenter') || cleanRank === 'carpenter') return 530;
    if (cleanTrade.includes('mali') || cleanRank === 'mali') return 535;
    if (cleanTrade.includes('auto driver')) return 540;
    return 500;
  }

  // 2. Direct dictionary lookup
  if (RANK_SENIORITY_MAP[cleanRank] !== undefined) {
    return RANK_SENIORITY_MAP[cleanRank];
  }

  // 3. Fallback: check configured ranksList from Admin
  if (ranksList && Array.isArray(ranksList) && ranksList.length > 0) {
    const matched = ranksList.find(
      (r) =>
        r &&
        (r.name.toLowerCase() === cleanRank ||
          r.code?.toLowerCase() === cleanRank ||
          r.banglaName?.toLowerCase() === cleanRank)
    );
    if (matched) {
      if (matched.category === 'Officer') {
        return 10 + (matched.order || matched.seniority || 1) * 2;
      }
      if (matched.category === 'JCO') {
        return 100 + (matched.order || matched.seniority || 1) * 2;
      }
      if (matched.category === 'RCO') return 150;
      if (matched.category === 'NC(E)') return 400;
      if (matched.category === 'NC(U)') return 410;
      if (matched.category === 'OR') {
        if (['sgt', 'cpl'].some((n) => cleanRank.includes(n))) {
          return 200 + (matched.order || matched.seniority || 1);
        }
        return 300 + (matched.order || matched.seniority || 1);
      }
      if (matched.category === 'Civilian') return 500;
      return (matched.seniority || matched.order || 50) * 10;
    }
  }

  // 4. Substring matching for compound ranks (e.g., "Capt (Doctor)", "Sgt DMT")
  if (cleanRank.includes('col')) return 10;
  if (cleanRank.includes('maj')) return 20;
  if (cleanRank.includes('capt')) return 30;
  if (cleanRank.includes('2lt')) return 50;
  if (cleanRank.includes('lt')) return 40;

  if (cleanRank.includes('mwo')) return 100;
  if (cleanRank.includes('swo')) return 110;
  if (cleanRank.includes('wo')) return 120;

  if (cleanRank.includes('rco')) return 150;

  if (cleanRank.includes('sgt') || cleanRank.includes('hav')) return 200;
  if (cleanRank.includes('cpl') || cleanRank.includes('nk')) return 210;
  if (cleanRank.includes('lcpl') || cleanRank.includes('l/cpl') || cleanRank.includes('l/nk')) return 220;

  if (cleanRank.includes('snk') || cleanRank.includes('gnr') || cleanRank.includes('sainik')) return 300;

  return 999;
}

/**
 * Returns human-readable category badge info for display
 */
export function getRankCategoryTier(rank?: string, trade?: string): {
  tier: 'OFFICER' | 'JCO' | 'RCO' | 'NCO' | 'OR' | 'NCE' | 'NCU' | 'CIVILIAN';
  label: string;
  order: number;
} {
  if (isNCERank(rank, trade)) return { tier: 'NCE', label: 'NC(E)', order: 6 };
  if (isNCURank(rank, trade)) return { tier: 'NCU', label: 'NC(U)', order: 7 };
  if (isRCORank(rank, trade)) return { tier: 'RCO', label: 'RCO', order: 3 };
  if (isCivilianRank(rank, trade)) return { tier: 'CIVILIAN', label: 'Civilian', order: 8 };

  const score = getRankSeniorityScore(rank, trade);
  if (score < 100) return { tier: 'OFFICER', label: 'Officer', order: 1 };
  if (score < 150) return { tier: 'JCO', label: 'JCO', order: 2 };
  if (score < 200) return { tier: 'RCO', label: 'RCO', order: 3 };
  if (score < 220) return { tier: 'NCO', label: 'NCO', order: 4 };
  if (score < 400) return { tier: 'OR', label: 'OR', order: 5 };
  if (score < 410) return { tier: 'NCE', label: 'NC(E)', order: 6 };
  if (score < 420) return { tier: 'NCU', label: 'NC(U)', order: 7 };
  return { tier: 'CIVILIAN', label: 'Civilian', order: 8 };
}

/**
 * Compares two personnel by Military Seniority:
 * 1. Rank Seniority (Officer -> JCO -> NCO -> OR -> RCO -> Civilian)
 * 2. Enlistment / Commission Date (earlier is senior)
 * 3. Army Number (numeric ascending)
 * 4. Full Name (alphabetical)
 */
export function comparePersonnelSeniority(
  a: Personnel,
  b: Personnel,
  ranksList?: RankConfig[]
): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  // 1. Rank Seniority (lowest score is highest seniority)
  const scoreA = getRankSeniorityScore(a.rk, a.trade, ranksList);
  const scoreB = getRankSeniorityScore(b.rk, b.trade, ranksList);

  if (scoreA !== scoreB) {
    return scoreA - scoreB;
  }

  // 2. Same Rank: Enlistment / Commission Date (Earlier date = Senior)
  const dateA = a.enlistmentDate || a.joiningDate || a.startDate;
  const dateB = b.enlistmentDate || b.joiningDate || b.startDate;
  if (dateA && dateB && dateA !== dateB) {
    return dateA.localeCompare(dateB);
  }

  // 3. Same Rank and Date: Army / Soldier Number (snkNo)
  const snkA = (a.snkNo || '').trim();
  const snkB = (b.snkNo || '').trim();

  if (snkA && snkB && snkA !== snkB) {
    // Extract numeric portion for military numbers (e.g., BA-7592 vs BA-8324; 1243526 vs 1246224)
    const numA = parseInt(snkA.replace(/\D/g, ''), 10);
    const numB = parseInt(snkB.replace(/\D/g, ''), 10);

    if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
      return numA - numB;
    }
    return snkA.localeCompare(snkB, undefined, { numeric: true, sensitivity: 'base' });
  }

  // 4. Final tie-breaker: Name
  return (a.name || '').localeCompare(b.name || '');
}

/**
 * Pure function: returns a NEW array sorted by Military Seniority
 */
export function sortBySeniority<T extends Personnel>(
  list: T[],
  ranksList?: RankConfig[]
): T[] {
  if (!Array.isArray(list)) return [];
  return [...list].sort((a, b) => comparePersonnelSeniority(a, b, ranksList));
}
