export type Role =
  | 'CO'
  | 'Offr'
  | 'RSM'
  | 'BSM'
  | 'P BSM'
  | 'Q BSM'
  | 'R BSM'
  | 'HQ BSM'
  | 'Admin'
  | 'Guest';

export const isBsmRole = (role?: string): boolean => {
  if (!role) return false;
  return role === 'BSM' || role.endsWith('BSM');
};

export const OFFICER_RANKS: string[] = ['Lt Col', 'Maj', 'Capt', 'Lt'];

export const isOfficerRank = (rank?: string): boolean => {
  if (!rank) return false;
  return OFFICER_RANKS.includes(rank) || rank === '2Lt';
};

export const JCO_RANKS: string[] = ['MWO', 'SWO', 'WO'];

export const isJCORank = (rank?: string): boolean => {
  if (!rank) return false;
  return JCO_RANKS.includes(rank);
};

// NCO = Sgt + Cpl
export const NCO_RANKS: string[] = ['Sgt', 'Cpl'];

export const isNCORank = (rank?: string): boolean => {
  if (!rank) return false;
  return NCO_RANKS.includes(rank) || rank === 'Hav' || rank === 'Nk';
};

// OR = NCO (Sgt + Cpl) + Lcpl + Snk
export const OR_RANKS: string[] = ['Sgt', 'Cpl', 'Lcpl', 'Snk', 'Gnr', 'Snk (DMT)', 'SNK (DMT)'];

export const isORRank = (rank?: string): boolean => {
  if (!rank) return false;
  return OR_RANKS.includes(rank);
};

export const RCO_RANKS: string[] = ['RCO'];

export const isRCORank = (rank?: string, trade?: string): boolean => {
  if (!rank && !trade) return false;
  return rank === 'RCO' || trade === 'RCO';
};

export const NCE_RANKS: string[] = ['NC(E)'];

export const isNCERank = (rank?: string, trade?: string): boolean => {
  if (!rank && !trade) return false;
  return rank === 'NC(E)' || trade === 'NC(E)' || rank === 'NC (E)' || trade === 'NC (E)';
};

export const NCU_RANKS: string[] = ['NC(U)'];

export const isNCURank = (rank?: string, trade?: string): boolean => {
  if (!rank && !trade) return false;
  return rank === 'NC(U)' || trade === 'NC(U)' || rank === 'NC (U)' || trade === 'NC (U)';
};

export const CIVILIAN_TRADES: string[] = ['Dupi', 'Barbar', 'Mali', 'Carpenter'];

export const isCivilianRank = (rank?: string, trade?: string): boolean => {
  if (!rank && !trade) return false;
  // NC(E) and NC(U) are strictly distinct and not civilian
  if (isNCERank(rank, trade) || isNCURank(rank, trade)) return false;
  const cleanRank = (rank || '').trim().toLowerCase();
  const cleanTrade = (trade || '').trim().toLowerCase();
  return (
    cleanRank === 'civilian' ||
    cleanRank === 'civillian' ||
    cleanRank === 'civ' ||
    cleanTrade === 'civilian' ||
    cleanTrade === 'civillian' ||
    cleanTrade === 'civ' ||
    cleanRank === 'dupi' ||
    cleanRank === 'dhobi' ||
    cleanTrade === 'dupi' ||
    cleanTrade === 'dhobi' ||
    cleanRank === 'barbar' ||
    cleanRank === 'barber' ||
    cleanTrade === 'barbar' ||
    cleanTrade === 'barber' ||
    cleanRank === 'mali' ||
    cleanTrade === 'mali' ||
    cleanRank === 'carpenter' ||
    cleanTrade === 'carpenter'
  );
};

export type Battery = 'P Bty' | 'Q Bty' | 'R Bty' | 'HQ Bty';

export const ALL_BATTERIES: Battery[] = ['P Bty', 'Q Bty', 'R Bty', 'HQ Bty'];

export type MilitaryRank =
  | 'Lt Col'
  | 'Maj'
  | 'Capt'
  | 'Lt'
  | 'MWO'
  | 'SWO'
  | 'WO'
  | 'RCO'
  | 'Sgt'
  | 'Cpl'
  | 'Lcpl'
  | 'Snk'
  | 'NC(E)'
  | 'NC(U)'
  | 'Civilian';

export const ALL_RANKS: MilitaryRank[] = [
  'Lt Col',
  'Maj',
  'Capt',
  'Lt',
  'MWO',
  'SWO',
  'WO',
  'RCO',
  'Sgt',
  'Cpl',
  'Lcpl',
  'Snk',
  'NC(E)',
  'NC(U)',
  'Civilian',
];

export type Trade =
  | 'TA'
  | 'Gnr'
  | 'OCU'
  | 'DMT'
  | 'Clk'
  | 'Ck(U)'
  | 'Ck(M)'
  | 'Tailor'
  | 'E&BR'
  | 'AEC'
  | 'Dupi'
  | 'Barbar'
  | 'Mali'
  | 'Carpenter'
  | 'NC(E)'
  | 'NC(U)'
  | 'Civilian'
  | 'RCO'
  | '-';

export const ALL_TRADES: Trade[] = [
  'TA',
  'Gnr',
  'OCU',
  'DMT',
  'Clk',
  'Ck(U)',
  'Ck(M)',
  'Tailor',
  'E&BR',
  'AEC',
];

export type OutOfUnitCategory =
  | 'ERE'
  | 'Msn'
  | 'Att'
  | 'FDMN'
  | 'CMH'
  | 'Course'
  | 'Comd'
  | 'P/Lve'
  | 'C/Lve';

export const OUT_OF_UNIT_CATEGORIES: {
  id: OutOfUnitCategory;
  label: string;
  badge: string;
  description: string;
}[] = [
  { id: 'ERE', label: 'ERE', badge: 'Extra Regt', description: 'Extra Regimental Employment (DGFI, BGB, AHQ, Cantonment)' },
  { id: 'Msn', label: 'Msn', badge: 'UN Mission', description: 'UN Peacekeeping Mission Deployment' },
  { id: 'Att', label: 'Att', badge: 'Attachment', description: 'Temporary Attachment to other Formations' },
  { id: 'FDMN', label: 'FDMN', badge: 'Field Duty', description: 'Field Duty & Field Maintenance Outstation' },
  { id: 'CMH', label: 'CMH', badge: 'Hospital', description: 'Combined Military Hospital (Admission / Review)' },
  { id: 'Course', label: 'Course', badge: 'Military Cadre', description: 'Cadres & Training Courses (AC&S, SI&T, etc.)' },
  { id: 'Comd', label: 'Comd', badge: 'Command Task', description: 'Command & Special Formation Duties' },
  { id: 'P/Lve', label: 'P/Lve', badge: 'Privilege Leave', description: 'Annual Privilege Leave' },
  { id: 'C/Lve', label: 'C/Lve', badge: 'Casual Leave', description: 'Short Casual Leave / Emergency Leave' },
];

export type ParadeStatus =
  | 'In Unit'
  | 'P/Lve'
  | 'C/Lve'
  | 'Course'
  | 'CMH'
  | 'Line Sick'
  | 'Msn'
  | 'Att'
  | 'Comd'
  | 'FDMN'
  | 'ERE'
  | 'Civilian'
  | 'AWOL'
  // Legacy aliases for backward compatibility
  | 'Present'
  | 'On Duty'
  | 'CMH/Sick'
  | 'Leave'
  | 'Course/Trg'
  | 'Temp Duty'
  | 'Attached Out'
  | 'AWOL/OSL';

export interface StatusOptionConfig {
  id: ParadeStatus;
  label: string;
  bangla: string;
  category: 'In Unit' | 'Out of Unit' | 'Strength Exclusion' | 'Off Parade';
  requiresDetails?: boolean;
  color: {
    bg: string;
    text: string;
    border: string;
    dot: string;
  };
}

export const PRIMARY_PARADE_STATUSES: StatusOptionConfig[] = [
  {
    id: 'In Unit',
    label: 'In Unit (Default / On Parade)',
    bangla: 'ইউনিটে উপস্থিত (ডিউটি না থাকলে On Parade)',
    category: 'In Unit',
    color: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-400' }
  },
  {
    id: 'P/Lve',
    label: 'P/Lve (Privilege Leave)',
    bangla: 'বাৎসরিক ছুটি (পি/লিভ)',
    category: 'Out of Unit',
    requiresDetails: true,
    color: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30', dot: 'bg-purple-400' }
  },
  {
    id: 'C/Lve',
    label: 'C/Lve (Casual Leave)',
    bangla: 'নৈমিত্তিক ছুটি (সি/লিভ)',
    category: 'Out of Unit',
    requiresDetails: true,
    color: { bg: 'bg-fuchsia-500/15', text: 'text-fuchsia-400', border: 'border-fuchsia-500/30', dot: 'bg-fuchsia-400' }
  },
  {
    id: 'Course',
    label: 'Course',
    bangla: 'সামরিক ক্যাডার / কোর্স',
    category: 'Out of Unit',
    requiresDetails: true,
    color: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30', dot: 'bg-cyan-400' }
  },
  {
    id: 'CMH',
    label: 'CMH',
    bangla: 'সিএমএইচ ভর্তি / রিভিউ',
    category: 'Out of Unit',
    requiresDetails: true,
    color: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-400' }
  },
  {
    id: 'Line Sick',
    label: 'Line Sick',
    bangla: 'লাইন সিক / কোয়ার্টার সিক (Off Parade)',
    category: 'Off Parade',
    requiresDetails: true,
    color: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30', dot: 'bg-orange-400' }
  },
  {
    id: 'FDMN',
    label: 'FDMN (Field Duty)',
    bangla: 'ফিল্ড ডিউটি / হোয়াইকং ক্যাম্প',
    category: 'Out of Unit',
    requiresDetails: true,
    color: { bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500/30', dot: 'bg-indigo-400' }
  },
  {
    id: 'Comd',
    label: 'Comd',
    bangla: 'কমান্ড টাস্ক / হেডকোয়ার্টার ডিউটি',
    category: 'Out of Unit',
    requiresDetails: true,
    color: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', dot: 'bg-blue-400' }
  },
  {
    id: 'Att',
    label: 'Att (Attachment)',
    bangla: 'সংযুক্ত / ফরমেশন এটাচমেন্ট',
    category: 'Out of Unit',
    requiresDetails: true,
    color: { bg: 'bg-teal-500/15', text: 'text-teal-400', border: 'border-teal-500/30', dot: 'bg-teal-400' }
  },
  {
    id: 'Msn',
    label: 'Msn (UN Mission)',
    bangla: 'জাতিসংঘ শান্তিরক্ষা মিশন',
    category: 'Out of Unit',
    requiresDetails: true,
    color: { bg: 'bg-sky-500/15', text: 'text-sky-400', border: 'border-sky-500/30', dot: 'bg-sky-400' }
  },
  {
    id: 'ERE',
    label: 'ERE (Extra Regt)',
    bangla: 'ইআরই (DGFI, BGB, AHQ - নন-পোস্টেড)',
    category: 'Strength Exclusion',
    requiresDetails: true,
    color: { bg: 'bg-violet-500/15', text: 'text-violet-400', border: 'border-violet-500/30', dot: 'bg-violet-400' }
  },
  {
    id: 'Civilian',
    label: 'Civilian Staff',
    bangla: 'বেসামরিক কর্মকর্তা / কর্মচারী (নন-পোস্টেড)',
    category: 'Strength Exclusion',
    color: { bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/30', dot: 'bg-slate-400' }
  },
  {
    id: 'AWOL',
    label: 'AWOL / OSL',
    bangla: 'অননুমোদিত অনুপস্থিত (ওএসএল)',
    category: 'Out of Unit',
    requiresDetails: true,
    color: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30', dot: 'bg-rose-400' }
  },
];

export function normalizePersonnelStatus(
  status?: string,
  outOfUnitCategory?: string,
  rk?: string,
  trade?: string,
  statusDetails?: string
): ParadeStatus {
  if (rk === 'Civilian' || trade === 'Civilian' || status === 'Civilian') return 'Civilian';
  if (outOfUnitCategory === 'ERE' || status === 'ERE') return 'ERE';
  if (outOfUnitCategory === 'FDMN' || status === 'FDMN') return 'FDMN';
  if (outOfUnitCategory === 'P/Lve' || status === 'P/Lve') return 'P/Lve';
  if (outOfUnitCategory === 'C/Lve' || status === 'C/Lve') return 'C/Lve';
  if (outOfUnitCategory === 'Course' || status === 'Course' || status === 'Course/Trg') return 'Course';
  if (outOfUnitCategory === 'CMH' || status === 'CMH') return 'CMH';
  if (status === 'Line Sick' || (statusDetails && statusDetails.toLowerCase().includes('line sick'))) return 'Line Sick';
  if (outOfUnitCategory === 'Msn' || status === 'Msn') return 'Msn';
  if (outOfUnitCategory === 'Att' || status === 'Att' || status === 'Attached Out') return 'Att';
  if (outOfUnitCategory === 'Comd' || status === 'Comd') return 'Comd';
  if (status === 'AWOL' || status === 'AWOL/OSL') return 'AWOL';

  // Legacy mappings:
  if (status === 'Leave') return 'P/Lve';
  if (status === 'CMH/Sick') return 'CMH';
  if (status === 'Temp Duty') return 'Comd';
  if (status === 'Present' || status === 'On Duty') return 'In Unit';

  return (status as ParadeStatus) || 'In Unit';
}

export interface Personnel {
  id: string;
  snkNo: string;
  batch?: string; // e.g. 88 Recruit Batch, 42 BMA, 2024 Batch
  rk: MilitaryRank | string;
  trade: Trade | string;
  name: string;
  battery: Battery;
  status: ParadeStatus;
  statusDetails?: string;
  startDate?: string;
  endDate?: string;
  durationDays?: number;
  location?: string;
  authority?: string;
  rmk?: string;
  remarks?: string;
  phone?: string;
  mobileNo?: string;
  bloodGroup?: string;
  enlistmentDate?: string;
  joiningDate?: string; // Joining Dt in unit
  enlistmentSource?: 'Posted In from Other Unit' | 'Joined after Training' | 'Re-enlistment' | 'Direct Entry';
  previousUnit?: string;
  medicalCategory?: 'AYE' | 'BEE' | 'CEE';
  currentDuty?: string;
  nokName?: string;
  nokContact?: string;
  // Out of unit category assignment
  outOfUnitCategory?: OutOfUnitCategory;
  outOfUnitLocation?: string;
  outOfUnitStartDate?: string;
  outOfUnitEndDate?: string;
  outOfUnitAuthority?: string;
  outOfUnitRemarks?: string;
  // Extended state details
  leaveType?: 'P/Lve' | 'C/Lve';
  leaveFrom?: string;
  leaveTo?: string;
  leaveAddress?: string;
  courseName?: string;
  courseLocation?: string;
  courseFrom?: string;
  courseTo?: string;
  courseDuration?: string;
  sickType?: 'CMH' | 'Sic';
  hospitalName?: string;
  diagnosis?: string;
  admissionDate?: string;
  reviewDate?: string;
  comdAssignment?: string;
  comdLocation?: string;
  comdFrom?: string;
  comdTo?: string;
  comdAuthority?: string;
}

export interface ParadePointCount {
  offr: number;
  jco: number;
  or: number;
}

export interface DailyParadePoint {
  id: string;
  name: string;
  order: number;
  isActive: boolean;
  category?: string;
  enabledBatteries: Battery[]; // Which batteries have this row enabled
  counts: {
    'HQ Bty': ParadePointCount;
    'P Bty': ParadePointCount;
    'Q Bty': ParadePointCount;
    'R Bty': ParadePointCount;
  };
  rsmSuggested?: ParadePointCount;
  lockedByRsm?: Record<string, boolean>;
  rsmSuggestedCounts?: Record<string, ParadePointCount>;
  lastUpdated?: Record<string, string>;
  rsmFixedAt?: Record<string, string>;
}

export type ParadeSessionType = 'Morning' | 'Second Period' | 'Games' | 'Roll Call' | string;

export type ParadeRecordStatus =
  | 'Draft'
  | 'Saved'
  | 'Submitted'
  | 'Pending RSM Confirmation'
  | 'Edited by RSM'
  | 'Confirmed'
  | 'Finalized'
  | 'Sent to Adjt';

export interface DutySessionStatus {
  status: 'Draft' | 'Saved' | 'Sent to Adjt';
  savedAt?: string;
  savedBy?: string;
  sentToAdjtAt?: string;
  sentToAdjtBy?: string;
  notes?: string;
}

export interface ParadeTypeDefinition {
  id: string;
  name: string;
  order: number;
  isActive: boolean;
  headings?: string[]; // Heading ids/names associated
  createdAt?: string;
  createdBy?: 'Admin' | 'RSM' | string;
  createdByName?: string;
  isDeleted?: boolean;
  deleted?: boolean;
  status?: 'active' | 'deleted' | string;
  deletedAt?: string;
  deletedBy?: string;
  deletedByRole?: 'Admin' | 'RSM' | string;
}

export type ParadeDutyCategory = 'Unit Sy' | 'working' | 'Fixed Duty' | 'Others';

export interface ParadeDutyAssignment {
  id: string;
  personnelId: string;
  snkNo: string; // Army No
  name: string;
  rank: string;
  battery: Battery;
  category: ParadeDutyCategory;
  dutyName: string;
  date: string;
  sessionType: string;
  assignedAt?: string;
  assignedBy?: string;
  location?: string;
  dutyTime?: string;
  weaponOrAmmo?: string;
  remarks?: string;
}

export interface DateWiseParadeRecord {
  id: string; // [date]_[typeId]_[battery]
  date: string; // YYYY-MM-DD
  typeId: string; // e.g. 'Morning', 'Second Period', etc.
  battery: Battery;
  status: ParadeRecordStatus;
  counts: Record<string, ParadePointCount>; // pointId -> { offr, jco, or }
  lastUpdated: string;
  updatedBy?: string;
  submittedAt?: string;
  submittedBy?: string;
  confirmedAt?: string;
  confirmedBy?: string;
  finalizedAt?: string;
  finalizedBy?: string;
  editedByRsm?: boolean;
}

export interface BatteryParadeSummary {
  battery: Battery;
  posted: number;
  present: number;
  onDuty: number;
  sick: number;
  leave: number;
  course: number;
  tempDuty: number;
  attached: number;
  absent: number;
  submissionStatus: 'Pending' | 'Submitted' | 'Verified' | 'Approved';
  lastUpdated: string;
  submittedBy?: string;
}

export interface UserAccount {
  id: string;
  username: string;
  password?: string;
  name: string;
  snkNo?: string;
  rank: string;
  role: Role;
  accessLevel?: string;
  assignedBattery?: Battery;
  assignedBatteries?: Battery[];
  email?: string;
  avatar?: string;
  lastLogin?: string;
  isApproved?: boolean;
  approvedAt?: string;
  approvedBy?: string;
}

export interface GoogleAccessRequest {
  id: string;
  email: string;
  name: string;
  photoURL?: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  assignedRole?: Role;
  assignedRank?: string;
  assignedBattery?: Battery;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface DutyAssignment {
  id: string;
  dutyType: 'Quarter Guard' | 'Regimental Police' | 'Duty NCO' | 'Duty Officer' | 'Cookhouse I/C' | 'Armoury Guard' | 'Main Gate';
  assignedPersonnel: {
    id: string;
    snkNo: string;
    name: string;
    rank: string;
    battery: Battery;
  }[];
  date: string;
  shift: 'Day' | 'Night' | '24 Hours';
  location: string;
  status: 'Scheduled' | 'Active' | 'Relieved';
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  action: string;
  performedBy: string;
  role: Role;
  details: string;
  category: 'PARADE_STATE' | 'PERSONNEL' | 'SYSTEM' | 'SECURITY';
}

export type RankCategory = 'Officer' | 'JCO' | 'OR' | 'RCO' | 'NC(E)' | 'NC(U)' | 'Civilian';

export interface SubCategoryItem {
  id: string;
  name: string;
  order: number;
  isActive: boolean;
  isCalculated?: boolean;
  contributesToTotalOut?: boolean;
  contributesToOffParade?: boolean;
  contributesToOnParade?: boolean;
  applicableSubUnits?: string[]; // e.g. ['HQ Bty', 'P Bty', 'Q Bty', 'R Bty', 'WKSP'] or empty for all
  applicableRankCategories?: RankCategory[];
  description?: string;
  counts?: Record<string, ParadePointCount>; // Optional default/sample counts
}

export interface SystemCategory {
  id: string;
  name: string;
  code?: string;
  order: number;
  isActive: boolean;
  type: 'PARADE_STATE' | 'OUT_OF_UNIT' | 'DUTY_ROSTER' | 'ADMINISTRATIVE' | 'GENERAL';
  assignedParadeStates: string[]; // e.g. ['Morning', 'Second Period', 'Games', 'Roll Call']
  applicableSubUnits: string[]; // e.g. ['HQ Bty', 'P Bty', 'Q Bty', 'R Bty'] or ['ALL']
  applicableRankCategories: RankCategory[];
  subCategories: SubCategoryItem[];
  description?: string;
}

export interface SubUnitConfig {
  id: string;
  code: Battery | string;
  name: string;
  order: number;
  isActive: boolean;
  commanderTitle?: string;
  description?: string;
  role?: 'HQ' | 'GUN_BATTERY' | 'OTHER' | string;
}

export interface RankConfig {
  id: string;
  name: string;
  code: string;
  category: RankCategory;
  order: number;
  seniority: number;
  isActive: boolean;
  banglaName?: string;
  applicableForEnlistment?: boolean; // Whether available when enlisting soldiers
  description?: string;
}

export type TradeCategory = 'COMBAT' | 'TECHNICAL' | 'SERVICES' | 'SUPPORT' | 'CIVILIAN' | 'OTHER';

export interface TradeConfig {
  id: string;
  name: string; // e.g. 'Gnr', 'TA', 'OCU', 'DMT', 'E&BR', 'Tailor', etc.
  code: string;
  order: number;
  isActive: boolean;
  category?: TradeCategory | string;
  applicableRankCategories?: RankCategory[]; // e.g. ['OR', 'Civilian', 'RCO']
  applicableForEnlistment?: boolean; // Whether available when enlisting soldiers
  description?: string;
  banglaName?: string;
}

export interface AuthEstablishmentItem {
  id: string;
  category: RankCategory | 'Total' | string;
  authorized?: number;
  hqBty?: number;
  pBty?: number;
  qBty?: number;
  rBty?: number;
  wksp?: number;
  notes?: string;
  subUnit?: string;
  offr?: number;
  jco?: number;
  or?: number;
  total?: number;
}

export interface CalculationConfig {
  id: string;
  totalOutCategories: string[]; // Category or subcategory IDs/names contributing to TOTAL OUT
  offParadeCategories: string[]; // Category or subcategory IDs/names contributing to OFF PARADE
  onParadeFormula: 'POSTED_MINUS_ALL' | 'DIRECT_MUSTER' | string;
  autoCalculateOffParade?: boolean;
  autoCalculateOnParade?: boolean;
  strictDiscrepancyCheck?: boolean;
  totalOutFormula?: string;
  offParadeFormula?: string;
  lastUpdated?: string;
  updatedBy?: string;
}

export interface SystemSettings {
  unitName: string;
  unitMotto: string;
  tagline: string;
  station: string;
  coName?: string;
  supportContact?: string;
  allowGuestMode: boolean;
  allowPasskeyLogin: boolean;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  requireGoogleApproval: boolean;
  modulePermissions?: Record<string, Record<string, boolean>>;
  lastUpdated?: string;
  updatedBy?: string;
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  unitName: '10 MED REGT ARTY',
  unitMotto: 'Born Destroyer',
  tagline: 'Smart Dashboard & Parade State System',
  station: 'Savar Cantonment',
  coName: 'Commanding Officer',
  supportContact: 'Regimental Headquarters',
  allowGuestMode: true,
  allowPasskeyLogin: true,
  maintenanceMode: false,
  maintenanceMessage: 'রেজিমেন্টের সিস্টেম আপডেট ও সিকিউরিটি রক্ষণাবেক্ষণ চলছে। শুধুমাত্র অথরাইজড অ্যাডমিনদের প্রবেশাধিকার রয়েছে।',
  requireGoogleApproval: true,
  modulePermissions: {
    Admin: {
      main_dashboard: true,
      battery_dashboard: true,
      parade_state: true,
      master_personnel: true,
      duty_detail: true,
      roll_simulator: true,
      out_of_unit: true,
      admin_panel: true,
    },
    CO: {
      main_dashboard: true,
      battery_dashboard: true,
      parade_state: true,
      master_personnel: true,
      duty_detail: true,
      roll_simulator: true,
      out_of_unit: true,
      admin_panel: false,
    },
    Offr: {
      main_dashboard: true,
      battery_dashboard: true,
      parade_state: true,
      master_personnel: true,
      duty_detail: true,
      roll_simulator: true,
      out_of_unit: true,
      admin_panel: false,
    },
    RSM: {
      main_dashboard: true,
      rsm_dashboard: true,
      battery_dashboard: true,
      parade_state: true,
      master_personnel: true,
      duty_detail: true,
      roll_simulator: true,
      out_of_unit: true,
      admin_panel: false,
    },
    BSM: {
      main_dashboard: false,
      battery_dashboard: true,
      parade_state: true,
      master_personnel: true,
      duty_detail: true,
      roll_simulator: false,
      out_of_unit: false,
      admin_panel: false,
    },
    'P BSM': {
      main_dashboard: false,
      battery_dashboard: true,
      parade_state: true,
      master_personnel: true,
      duty_detail: true,
      roll_simulator: false,
      out_of_unit: false,
      admin_panel: false,
    },
    'Q BSM': {
      main_dashboard: false,
      battery_dashboard: true,
      parade_state: true,
      master_personnel: true,
      duty_detail: true,
      roll_simulator: false,
      out_of_unit: false,
      admin_panel: false,
    },
    'R BSM': {
      main_dashboard: false,
      battery_dashboard: true,
      parade_state: true,
      master_personnel: true,
      duty_detail: true,
      roll_simulator: false,
      out_of_unit: false,
      admin_panel: false,
    },
    'HQ BSM': {
      main_dashboard: false,
      battery_dashboard: true,
      parade_state: true,
      master_personnel: true,
      duty_detail: true,
      roll_simulator: false,
      out_of_unit: false,
      admin_panel: false,
    },
    Guest: {
      main_dashboard: true,
      battery_dashboard: true,
      parade_state: true,
      master_personnel: true,
      duty_detail: true,
      roll_simulator: true,
      out_of_unit: true,
      admin_panel: true,
    },
  },
};

