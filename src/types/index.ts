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

export const OFFICER_RANKS: string[] = ['Lt Col', 'Maj', 'Capt', 'Lt', '2Lt'];

export const isOfficerRank = (rank?: string): boolean => {
  if (!rank) return false;
  return OFFICER_RANKS.includes(rank);
};

export const JCO_RANKS: string[] = ['MWO', 'SWO', 'WO'];

export const isJCORank = (rank?: string): boolean => {
  if (!rank) return false;
  return JCO_RANKS.includes(rank);
};

export const OR_RANKS: string[] = ['Sgt', 'Cpl', 'Lcpl', 'Snk', 'Gnr', 'SNK DMT)'];

export const isORRank = (rank?: string): boolean => {
  if (!rank) return false;
  return OR_RANKS.includes(rank);
};

export const isCivilianRank = (rank?: string, trade?: string): boolean => {
  if (!rank) return false;
  return rank === 'Civilian' || rank === 'NC(E)' || rank === 'NC(U)' || trade === 'Civilian' || trade === 'NC(E)';
};

export const isRCORank = (rank?: string, trade?: string): boolean => {
  if (!rank) return false;
  return rank === 'RCO' || trade === 'RCO';
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
  | 'Sgt'
  | 'Cpl'
  | 'Lcpl'
  | 'Snk'
  | 'Civilian'
  | 'RCO'
  | 'NC(E)'
  | 'NC(U)';

export const ALL_RANKS: MilitaryRank[] = [
  'Lt Col',
  'Maj',
  'Capt',
  'Lt',
  'MWO',
  'SWO',
  'WO',
  'Sgt',
  'Cpl',
  'Lcpl',
  'Snk',
  'Civilian',
  'RCO',
  'NC(E)',
];

export type Trade =
  | 'Gnr'
  | 'TA'
  | 'OCU'
  | 'DMT'
  | 'E&BR'
  | 'Tailor'
  | 'Ck(U)'
  | 'Ck(M)'
  | 'NC(E)'
  | 'NC(U)'
  | 'Civilian'
  | 'RCO'
  | '-';

export const ALL_TRADES: Trade[] = [
  'Gnr',
  'TA',
  'OCU',
  'DMT',
  'E&BR',
  'Tailor',
  'Ck(U)',
  'Ck(M)',
  'NC(E)',
  'NC(U)',
  'Civilian',
  'RCO',
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
  | 'Present'
  | 'On Duty'
  | 'CMH/Sick'
  | 'Leave'
  | 'Course/Trg'
  | 'Temp Duty'
  | 'Attached Out'
  | 'AWOL/OSL';

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
  rmk?: string;
  phone?: string;
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

export type RankCategory = 'Officer' | 'JCO' | 'OR' | 'Civilian' | 'RCO';

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

