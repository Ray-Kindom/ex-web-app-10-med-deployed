import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  Personnel,
  UserAccount,
  Role,
  Battery,
  ParadeStatus,
  DutyAssignment,
  AuditLogItem,
  BatteryParadeSummary,
  DailyParadePoint,
  ParadePointCount,
  OutOfUnitCategory,
  ParadeTypeDefinition,
  DateWiseParadeRecord,
  ParadeRecordStatus,
  ParadeDutyAssignment,
  ParadeDutyCategory,
  DutySessionStatus,
  SystemCategory,
  SubCategoryItem,
  SubUnitConfig,
  RankConfig,
  TradeConfig,
  AuthEstablishmentItem,
  CalculationConfig,
  RankCategory,
  isOfficerRank,
  isBsmRole,
  GoogleAccessRequest,
  SystemSettings,
  DEFAULT_SYSTEM_SETTINGS,
} from '../types';
import {
  INITIAL_PERSONNEL,
  INITIAL_USERS,
  INITIAL_DUTY_ROSTER,
  INITIAL_AUDIT_LOGS,
  GUEST_USER,
} from '../data/initialData';
import { INITIAL_PARADE_POINTS } from '../data/paradePointsData';
import {
  INITIAL_SYSTEM_CATEGORIES,
  INITIAL_SUB_UNITS,
  INITIAL_RANKS,
  INITIAL_TRADES,
  INITIAL_AUTH_ESTABLISHMENT,
  INITIAL_CALCULATION_CONFIG,
} from '../data/configData';
import { calculateSimpleParadeState, SimpleParadeSummary, normalizeDutyName } from '../utils/paradeCalculations';
import {
  db,
  auth,
  signInWithGoogle,
  logoutFirebase,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  onAuthStateChanged,
  getDocFromServer,
  AuthUser,
  FirebaseUser,
  handleFirestoreError,
  OperationType,
} from '../lib/auth';
import {
  isSupabaseConfigured,
  syncAuthorizedUsersToSupabase,
  deleteAuthorizedUserFromSupabase,
  syncPersonnelToSupabase,
  fetchAuthorizedUsersFromSupabase,
  testSupabaseConnection,
  saveDutyDetailingToSupabase,
  fetchAllDutyDetailingFromSupabase,
} from '../lib/supabase';

export const MASTER_ADMIN_EMAIL = 'mdraiyan1512@gmail.com';
export const OWNER_EMAILS: string[] = ['mdraiyan1512@gmail.com'];

interface AppContextType {
  currentUser: UserAccount;
  setCurrentUser: (user: UserAccount) => void;
  switchRole: (role: Role, battery?: Battery) => void;
  isAdmin: boolean;
  isRSM: boolean;
  isGuest: boolean;
  usersList: UserAccount[];
  addUser: (user: Omit<UserAccount, 'id'>) => void;
  updateUser: (id: string, updated: Partial<UserAccount>) => void;
  deleteUser: (id: string) => void;
  personnelList: Personnel[];
  addPersonnel: (person: Omit<Personnel, 'id'>) => void;
  updatePersonnel: (id: string, updated: Partial<Personnel>) => void;
  deletePersonnel: (id: string) => void;
  updateParadeStatus: (id: string, status: ParadeStatus, statusDetails?: string) => void;
  updatePersonnelStatus?: (id: string, status: ParadeStatus, statusDetails?: string) => void;
  batchUpdateStatus: (ids: string[], status: ParadeStatus, statusDetails?: string) => void;
  dutyRoster: DutyAssignment[];
  addDutyAssignment: (assignment: Omit<DutyAssignment, 'id'>) => void;
  auditLogs: AuditLogItem[];
  addAuditLog: (action: string, details: string, category: AuditLogItem['category']) => void;
  getBatterySummaries: () => BatteryParadeSummary[];
  getRegimentalTotals: () => {
    totalPosted: number;
    totalPresent: number;
    totalDuty: number;
    totalSick: number;
    totalLeave: number;
    totalCourse: number;
    totalTempDuty: number;
    totalAttached: number;
    totalAbsent: number;
    presentPercentage: number;
  };
  getParadeSummary: (
    batteryScope?: Battery | 'Consolidated',
    date?: string,
    sessionType?: string
  ) => SimpleParadeSummary;
  activePage: string;
  setActivePage: (page: string) => void;
  selectedBatteryFilter: Battery | 'All';
  setSelectedBatteryFilter: (bty: Battery | 'All') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  customLogo: string | null;
  setCustomLogo: (logo: string | null) => void;
  notification: string | null;
  showNotification: (msg: string) => void;

  // Dynamic Categories & Sub-Categories (ADMIN FULL CONTROL)
  categoriesList: SystemCategory[];
  addCategory: (cat: Omit<SystemCategory, 'id'>) => boolean;
  updateCategory: (id: string, updated: Partial<SystemCategory>) => boolean;
  deleteCategory: (id: string) => boolean;
  addSubCategory: (categoryId: string, subCat: Omit<SubCategoryItem, 'id'>) => boolean;
  updateSubCategory: (categoryId: string, subCatId: string, updated: Partial<SubCategoryItem>) => boolean;
  deleteSubCategory: (categoryId: string, subCatId: string) => boolean;
  reorderCategories: (orderedIds: string[]) => boolean;

  // Sub Units Configuration (ADMIN FULL CONTROL)
  subUnitsList: SubUnitConfig[];
  addSubUnit: (unit: Omit<SubUnitConfig, 'id'>) => boolean;
  updateSubUnit: (id: string, updated: Partial<SubUnitConfig>) => boolean;
  deleteSubUnit: (id: string) => boolean;

  // Military Ranks Configuration (ADMIN FULL CONTROL)
  ranksList: RankConfig[];
  addRank: (rank: Omit<RankConfig, 'id'>) => boolean;
  updateRank: (id: string, updated: Partial<RankConfig>) => boolean;
  deleteRank: (id: string) => boolean;

  // Trades & Specializations Configuration (ADMIN FULL CONTROL)
  tradesList: TradeConfig[];
  addTrade: (trade: Omit<TradeConfig, 'id'>) => boolean;
  updateTrade: (id: string, updated: Partial<TradeConfig>) => boolean;
  deleteTrade: (id: string) => boolean;

  // Centralized Dynamic Lists & Helpers
  activeRanks: RankConfig[];
  enlistmentRanks: RankConfig[];
  activeTrades: TradeConfig[];
  enlistmentTrades: TradeConfig[];
  getTradesForRank: (rankName: string) => TradeConfig[];

  // AUTH / Authorized Establishment (ADMIN STRICT CONTROL ONLY)
  authEstablishmentList: AuthEstablishmentItem[];
  updateAuthEstablishment: (id: string, updated: Partial<AuthEstablishmentItem>) => boolean;
  addAuthEstablishmentItem: (item: Omit<AuthEstablishmentItem, 'id'>) => boolean;
  deleteAuthEstablishmentItem: (id: string) => boolean;

  // Calculation Engine Configuration (ADMIN FULL CONTROL)
  calculationConfig: CalculationConfig;
  updateCalculationConfig: (updated: Partial<CalculationConfig>) => boolean;

  // Daily Parade State Management
  dailyParadePoints: DailyParadePoint[];
  updateParadePointCount: (pointId: string, battery: Battery, counts: ParadePointCount) => void;
  togglePointForBattery: (pointId: string, battery: Battery, enabled: boolean) => void;
  setRsmPointSuggestion: (pointId: string, suggestion: Partial<ParadePointCount>) => void;
  addDailyParadePoint: (name: string, enabledBatteries?: Battery[], initialCounts?: ParadePointCount) => void;
  deleteDailyParadePoint: (pointId: string) => void;
  paradeBatteryStatus: Record<Battery, { status: 'Pending' | 'Confirmed'; lastUpdated: string; confirmedBy?: string }>;
  setBatteryParadeStatus: (battery: Battery, status: 'Pending' | 'Confirmed') => void;

  // Date-wise & Dynamic Parade State System
  selectedParadeDate: string;
  setSelectedParadeDate: (date: string) => void;
  paradeTypes: ParadeTypeDefinition[];
  addParadeType: (name: string, headings?: string[]) => void;
  updateParadeType: (id: string, updated: Partial<ParadeTypeDefinition>) => boolean;
  deleteParadeType: (id: string) => boolean;
  restoreParadeType: (id: string) => boolean;
  paradeRecords: Record<string, DateWiseParadeRecord>; // key: [date]_[typeId]_[battery]
  getParadeRecord: (date: string, typeId: string, battery: Battery) => DateWiseParadeRecord;
  saveParadeRecordCounts: (
    date: string,
    typeId: string,
    battery: Battery,
    counts: Record<string, ParadePointCount>,
    submitStatus?: ParadeRecordStatus
  ) => void;
  confirmBatteryParadeRecord: (date: string, typeId: string, battery: Battery) => void;
  finalizeParadeType: (date: string, typeId: string) => void;

  // Parade Duty Assignments (Heading boxes: Unit Sy, working, Fixed Duty, Others)
  paradeDutyAssignments: Record<string, ParadeDutyAssignment[]>;
  addParadeDutyAssignment: (assignment: Omit<ParadeDutyAssignment, 'id' | 'assignedAt' | 'assignedBy'>) => void;
  removeParadeDutyAssignment: (id: string, date: string, sessionType: string) => void;
  clearParadeDutyAssignments: (date: string, sessionType: string, category?: ParadeDutyCategory) => void;
  getParadeDutyAssignments: (date: string, sessionType: string, category?: ParadeDutyCategory) => ParadeDutyAssignment[];
  dutySessionStatuses: Record<string, DutySessionStatus>;
  getDutySessionStatus: (date: string, sessionType: string) => DutySessionStatus;
  saveDutySession: (date: string, sessionType: string) => void;
  editDutySession: (date: string, sessionType: string) => void;
  sendDutySessionToAdjt: (date: string, sessionType: string, notes?: string) => void;

  // Out Of Unit Management
  assignOutOfUnit: (
    personnelId: string,
    category: OutOfUnitCategory,
    details: {
      location?: string;
      startDate?: string;
      endDate?: string;
      authority?: string;
      remarks?: string;
    }
  ) => void;
  cancelOutOfUnit: (personnelId: string) => void;

  // Modal triggers
  syncNominalRollToCloud: () => Promise<void>;
  syncAllToCloud: () => Promise<{ success: boolean; count?: number; error?: string }>;
  dailyParadeModalOpen: boolean;
  setDailyParadeModalOpen: (open: boolean) => void;
  outOfUnitModalOpen: boolean;
  setOutOfUnitModalOpen: (open: boolean) => void;
  activeOutOfUnitCategory: OutOfUnitCategory;
  setActiveOutOfUnitCategory: (cat: OutOfUnitCategory) => void;

  // Authentication & Session
  isAuthenticated: boolean;
  loginWithCredentials: (username: string, password: string) => { success: boolean; error?: string };
  logout: () => Promise<void>;

  // Role Simulation & Admin Persistence
  isRealAdmin: boolean;
  isSimulating: boolean;
  realUser: UserAccount | null;
  exitSimulation: () => void;

  // Auth & Cloud Sync
  authUser: AuthUser | null;
  firebaseUser: AuthUser | null;
  isAuthReady: boolean;
  isFirebaseReady: boolean;
  cloudPermissionDenied: boolean;
  loginWithGoogle: (emailInput?: string) => Promise<{ success: boolean; error?: string; code?: string; domain?: string; isPending?: boolean }>;

  // Google Owner Approval & Whitelist
  accessRequests: GoogleAccessRequest[];
  pendingGoogleUser: { email: string; name?: string; photoURL?: string; uid?: string } | null;
  clearPendingGoogleUser: () => void;
  approveGoogleRequest: (requestId: string, role: Role, rank: string, name: string, battery?: Battery) => Promise<void>;
  rejectGoogleRequest: (requestId: string) => Promise<void>;
  preApproveGoogleUser: (email: string, name: string, rank: string, role: Role, battery?: Battery) => Promise<void>;
  revokeGoogleUserApproval: (userIdOrEmail: string) => Promise<void>;
  updateGoogleUserRole: (email: string, newRole: Role, newBattery?: Battery) => Promise<void>;
  checkPendingApprovalStatus: () => Promise<boolean>;
  isOwnerUser: boolean;

  // Master System Settings & Branding (ADMIN FULL CONTROL)
  systemSettings: SystemSettings;
  updateSystemSettings: (updated: Partial<SystemSettings>) => boolean;
  exportSystemBackup: () => void;
  importSystemBackup: (backupData: any) => boolean;
  resetSystemToDefaults: () => void;
  hasModulePermission: (moduleKey: string, userRole?: string) => boolean;
  isSupabaseReady: boolean;
  syncToSupabase: () => Promise<{ success: boolean; message: string; count?: number }>;
  syncUsersToSupabaseCloud: () => Promise<{ success: boolean; count?: number; error?: string }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PERSONNEL: '10med_personnel_v5',
  USER: '10med_currentUser_v1',
  REAL_USER: '10med_real_user_v2',
  USERS_LIST: '10med_users_v2',
  ACCESS_REQUESTS: '10med_access_requests_v1',
  DUTY: '10med_duty_v1',
  LOGS: '10med_logs_v1',
  LOGO: '10med_custom_logo_v1',
  PARADE_POINTS: '10med_parade_points_v1',
  PARADE_TYPES: '10med_parade_types_v1',
  PARADE_RECORDS: '10med_parade_records_v1',
  PARADE_DUTY_ASSIGNMENTS: '10med_parade_duty_assignments_v1',
  PARADE_DUTY_STATUSES: '10med_parade_duty_statuses_v1',
  AUTH_STATUS: '10med_auth_status_v2',
  ACTIVE_PAGE: '10med_active_page_v2',
  SYSTEM_CATEGORIES: '10med_system_categories_v1',
  SUB_UNITS: '10med_sub_units_v1',
  MILITARY_RANKS: '10med_military_ranks_v1',
  MILITARY_TRADES: '10med_military_trades_v1',
  AUTH_ESTABLISHMENT: '10med_auth_establishment_v1',
  CALCULATION_CONFIG: '10med_calc_config_v1',
  SYSTEM_SETTINGS: '10med_system_settings_v1',
};

// Helper to strip undefined values so Firestore does not throw serialization error
function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) return null as any;
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForFirestore(item)).filter((item) => item !== undefined) as any;
  }
  if (typeof obj === 'object') {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj as any)) {
      if (value !== undefined) {
        clean[key] = sanitizeForFirestore(value);
      }
    }
    return clean as any;
  }
  return obj;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Local states initialized from localStorage cache or initial seed
  const [usersList, setUsersList] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS_LIST);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        /* fallback */
      }
    }
    return INITIAL_USERS;
  });

  const [currentUser, setCurrentUserState] = useState<UserAccount>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USER);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        /* fallback */
      }
    }
    return INITIAL_USERS[0]; // Default to CO
  });

  // The genuinely authenticated user account (prior to any role simulation)
  const [realUser, setRealUser] = useState<UserAccount | null>(() => {
    const savedReal = localStorage.getItem(STORAGE_KEYS.REAL_USER);
    if (savedReal) {
      try {
        return JSON.parse(savedReal);
      } catch (e) {
        /* fallback */
      }
    }
    const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (
          u &&
          (u.role === 'Admin' ||
            (u.email && u.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) ||
            u.username?.toLowerCase() === 'admin' ||
            u.role === 'Guest' ||
            u.username?.toLowerCase() === 'guest')
        ) {
          return u;
        }
      } catch (e) {}
    }
    return null;
  });

  // Dynamic Categories & Sub-Categories (Database-Driven, controlled by Admin)
  const [categoriesList, setCategoriesList] = useState<SystemCategory[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SYSTEM_CATEGORIES);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((cat) => ({
            ...cat,
            subCategories: Array.isArray(cat?.subCategories) ? cat.subCategories : [],
            applicableSubUnits: Array.isArray(cat?.applicableSubUnits) ? cat.applicableSubUnits : [],
            applicableRankCategories: Array.isArray(cat?.applicableRankCategories) ? cat.applicableRankCategories : [],
            assignedParadeStates: Array.isArray(cat?.assignedParadeStates) ? cat.assignedParadeStates : [],
          }));
        }
      } catch (e) {}
    }
    return INITIAL_SYSTEM_CATEGORIES;
  });

  // Sub Units & Batteries Configuration
  const [subUnitsList, setSubUnitsList] = useState<SubUnitConfig[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SUB_UNITS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return INITIAL_SUB_UNITS;
  });

  // Military Ranks Configuration
  const [ranksList, setRanksList] = useState<RankConfig[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MILITARY_RANKS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return INITIAL_RANKS;
  });

  // Trades & Specializations Configuration
  const [tradesList, setTradesList] = useState<TradeConfig[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MILITARY_TRADES);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return INITIAL_TRADES;
  });

  // Authorized Establishment (AUTH) - Strictly Admin
  const [authEstablishmentList, setAuthEstablishmentList] = useState<AuthEstablishmentItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AUTH_ESTABLISHMENT);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return INITIAL_AUTH_ESTABLISHMENT;
  });

  // Calculation Engine Configuration (Total Out, Off Parade, On Parade Rules)
  const [calculationConfig, setCalculationConfig] = useState<CalculationConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CALCULATION_CONFIG);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return INITIAL_CALCULATION_CONFIG;
  });

  // Master System Configuration & Branding (ADMIN STRICT CONTROL)
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SYSTEM_SETTINGS);
    if (saved) {
      try {
        return { ...DEFAULT_SYSTEM_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {}
    }
    return DEFAULT_SYSTEM_SETTINGS;
  });

  // Role permissions & Simulation State
  // Guest Demo Mode - Completely Read-Only
  const isGuest = Boolean(
    currentUser.role === 'Guest' ||
    realUser?.role === 'Guest' ||
    currentUser.username?.toLowerCase() === 'guest' ||
    realUser?.username?.toLowerCase() === 'guest'
  );

  // isRealAdmin stays true for the genuine logged-in Administrator regardless of simulated role
  const isRealAdmin = !isGuest && Boolean(
    realUser?.role === 'Admin' ||
    (realUser?.email && OWNER_EMAILS.some((o) => o.toLowerCase() === realUser.email!.toLowerCase())) ||
    realUser?.username?.toLowerCase() === 'admin' ||
    (currentUser.email && OWNER_EMAILS.some((o) => o.toLowerCase() === currentUser.email!.toLowerCase()) && !realUser) ||
    (!realUser && currentUser.role === 'Admin')
  );

  // Active when a genuine Admin or Guest is currently simulating another role
  const isSimulating = Boolean(
    (isRealAdmin && (currentUser.role !== 'Admin' || (realUser && currentUser.id !== realUser.id))) ||
    (isGuest && currentUser.id !== GUEST_USER.id)
  );

  const exitSimulation = () => {
    if (isGuest) {
      setCurrentUserState(GUEST_USER);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(GUEST_USER));
      setActivePage('main_dashboard');
      showNotification('GUEST — VIEW ONLY: মূল ড্যাশবোর্ডে ফিরে আসা হয়েছে।');
      return;
    }
    if (!isRealAdmin) return;
    const adminUser = realUser || usersList.find((u) => u.role === 'Admin') || INITIAL_USERS.find((u) => u.role === 'Admin');
    if (adminUser) {
      setCurrentUserState(adminUser);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(adminUser));
      setActivePage('admin_panel');
      showNotification('এডমিন মোডে ফিরে আসা হয়েছে। রোল সিমুলেশন বন্ধ হয়েছে।');
      addAuditLog('Role Switch', `Admin exited simulation mode and returned to Admin panel`, 'SECURITY');
    }
  };

  const isAdmin =
    !isGuest &&
    (currentUser.role === 'Admin' ||
      (currentUser.email && OWNER_EMAILS.some((o) => o.toLowerCase() === currentUser.email!.toLowerCase())) ||
      isRealAdmin);
  const isRSM = !isGuest && currentUser.role === 'RSM';


  const [personnelList, setPersonnelList] = useState<Personnel[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PERSONNEL);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        /* fallback */
      }
    }
    return INITIAL_PERSONNEL;
  });

  const [dutyRoster, setDutyRoster] = useState<DutyAssignment[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DUTY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        /* fallback */
      }
    }
    return INITIAL_DUTY_ROSTER;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LOGS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        /* fallback */
      }
    }
    return INITIAL_AUDIT_LOGS;
  });

  const [dailyParadePoints, setDailyParadePoints] = useState<DailyParadePoint[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PARADE_POINTS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        /* fallback */
      }
    }
    return INITIAL_PARADE_POINTS;
  });

  // Google Access Requests & Pending Approval State
  const [accessRequests, setAccessRequests] = useState<GoogleAccessRequest[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACCESS_REQUESTS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });

  const [pendingGoogleUser, setPendingGoogleUser] = useState<{
    email: string;
    name?: string;
    photoURL?: string;
    uid?: string;
  } | null>(() => {
    const saved = localStorage.getItem('10med_pending_google_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return null;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACCESS_REQUESTS, JSON.stringify(accessRequests));
  }, [accessRequests]);

  useEffect(() => {
    if (pendingGoogleUser) {
      localStorage.setItem('10med_pending_google_user', JSON.stringify(pendingGoogleUser));
    } else {
      localStorage.removeItem('10med_pending_google_user');
    }
  }, [pendingGoogleUser]);

  // Session Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.AUTH_STATUS) === 'true';
  });

  const [activePage, setActivePage] = useState<string>(() => {
    const isAuth = localStorage.getItem(STORAGE_KEYS.AUTH_STATUS) === 'true';
    if (!isAuth) return 'login';
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_PAGE);
    return saved && saved !== 'login' ? saved : 'main_dashboard';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AUTH_STATUS, isAuthenticated ? 'true' : 'false');
    if (isAuthenticated && activePage !== 'login') {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PAGE, activePage);
    }
  }, [isAuthenticated, activePage]);
  const [selectedBatteryFilter, setSelectedBatteryFilter] = useState<Battery | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customLogo, setCustomLogoState] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEYS.LOGO);
  });
  const [notification, setNotification] = useState<string | null>(null);

  // Firebase Auth state
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isFirebaseReady, setIsFirebaseReady] = useState<boolean>(false);
  const [cloudPermissionDenied, setCloudPermissionDenied] = useState<boolean>(false);

  // Performance & Stability guard references (Prevents infinite re-render loops & write floods)
  const seededCollectionsRef = useRef<Record<string, boolean>>({});
  const lastSyncedAuthUidRef = useRef<string | null>(null);
  const usersListRef = useRef(usersList);
  usersListRef.current = usersList;
  const accessRequestsRef = useRef(accessRequests);
  accessRequestsRef.current = accessRequests;

  // Modals
  const [dailyParadeModalOpen, setDailyParadeModalOpen] = useState<boolean>(false);
  const [outOfUnitModalOpen, setOutOfUnitModalOpen] = useState<boolean>(false);
  const [activeOutOfUnitCategory, setActiveOutOfUnitCategory] = useState<OutOfUnitCategory>('Msn');

  // Safe helper to sync to Firestore with structured error handling
  const syncDoc = (promiseOrFn: (() => Promise<any>) | Promise<any>, description?: string) => {
    try {
      const p = typeof promiseOrFn === 'function' ? promiseOrFn() : promiseOrFn;
      p?.then?.(() => {
        setCloudPermissionDenied(false);
      })?.catch?.((err: any) => {
        if (err?.code === 'permission-denied' || String(err).includes('permission-denied')) {
          setCloudPermissionDenied(true);
        } else {
          console.error(`[Cloud Sync] Write error for: ${description}`, err);
        }
      });
    } catch (e: any) {
      if (e?.code === 'permission-denied' || String(e).includes('permission-denied')) {
        setCloudPermissionDenied(true);
      } else {
        console.error(`[Cloud Sync] Sync exception:`, e);
      }
    }
  };

  // Battery Parade Confirmation & Status Tracking
  const [paradeBatteryStatus, setParadeBatteryStatusState] = useState<
    Record<Battery, { status: 'Pending' | 'Confirmed'; lastUpdated: string; confirmedBy?: string }>
  >(() => {
    const saved = localStorage.getItem('10med_parade_bty_status_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      'P Bty': { status: 'Pending', lastUpdated: 'Today 06:30' },
      'Q Bty': { status: 'Pending', lastUpdated: 'Today 06:30' },
      'R Bty': { status: 'Pending', lastUpdated: 'Today 06:30' },
      'HQ Bty': { status: 'Pending', lastUpdated: 'Today 06:30' },
    };
  });

  const setBatteryParadeStatus = (battery: Battery, status: 'Pending' | 'Confirmed') => {
    if (isGuest) {
      showNotification('গেস্ট মোডে কোনো ব্যাটারি প্যারেড স্ট্যাটাস পরিবর্তন করা যাবে না (GUEST — VIEW ONLY)।');
      return;
    }
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dateStr = `${String(now.getDate()).padStart(2, '0')} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][now.getMonth()]}`;
    const updated = {
      ...paradeBatteryStatus,
      [battery]: {
        status,
        lastUpdated: `${dateStr} ${timeStr}`,
        confirmedBy: status === 'Confirmed' ? `${currentUser.rank} ${currentUser.name} (RSM)` : undefined,
      },
    };
    setParadeBatteryStatusState(updated);
    localStorage.setItem('10med_parade_bty_status_v1', JSON.stringify(updated));
    showNotification(`${battery} Parade State status set to ${status}`);
    addAuditLog(
      'Parade State Status Changed',
      `${battery} marked as ${status} by ${currentUser.rank} ${currentUser.name}`,
      'PARADE_STATE'
    );
    // Sync to Firestore settings/parade_battery_status safely
    syncDoc(
      setDoc(
        doc(db, 'settings', 'parade_battery_status'),
        sanitizeForFirestore(updated),
        { merge: true }
      ),
      'save parade battery status'
    );
  };

  // Date-wise & Dynamic Parade State System
  const [selectedParadeDate, setSelectedParadeDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  const DEFAULT_PARADE_TYPES: ParadeTypeDefinition[] = [
    { id: 'Morning', name: 'Morning', order: 1, isActive: true, createdBy: 'Admin', createdAt: '2026-01-01T00:00:00.000Z', isDeleted: false },
    { id: 'Second Period', name: 'Second Period', order: 2, isActive: true, createdBy: 'Admin', createdAt: '2026-01-01T00:00:00.000Z', isDeleted: false },
    { id: 'Games', name: 'Games', order: 3, isActive: true, createdBy: 'Admin', createdAt: '2026-01-01T00:00:00.000Z', isDeleted: false },
  ];

  const [paradeTypes, setParadeTypes] = useState<ParadeTypeDefinition[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PARADE_TYPES);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed
            .filter((p: ParadeTypeDefinition) => p.id !== 'Roll Call' && p.name !== 'Roll Call')
            .map((p: ParadeTypeDefinition) => {
              const lower = (p.name || p.id || '').toLowerCase();
              const isCore = lower === 'morning' || lower === 'second period' || lower === 'games';
              return {
                ...p,
                createdBy: isCore ? 'Admin' : 'RSM',
                isDeleted: p.isDeleted || p.deleted || false,
              };
            });
          if (filtered.length > 0) return filtered;
        }
      } catch (e) {}
    }
    return DEFAULT_PARADE_TYPES;
  });

  const [paradeRecords, setParadeRecords] = useState<Record<string, DateWiseParadeRecord>>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PARADE_RECORDS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {};
  });

  const getParadeRecord = (date: string, typeId: string, battery: Battery): DateWiseParadeRecord => {
    const recordId = `${date}_${typeId}_${battery}`;
    if (paradeRecords[recordId]) {
      return paradeRecords[recordId];
    }
    // Fallback initialize from live points
    const initCounts: Record<string, ParadePointCount> = {};
    dailyParadePoints.forEach((pt) => {
      initCounts[pt.id] = { ...(pt.counts[battery] || { offr: 0, jco: 0, or: 0 }) };
    });

    return {
      id: recordId,
      date,
      typeId,
      battery,
      status: 'Draft',
      counts: initCounts,
      lastUpdated: 'Not submitted',
    };
  };

  const saveParadeRecordCounts = (
    date: string,
    typeId: string,
    battery: Battery,
    counts: Record<string, ParadePointCount>,
    submitStatus?: ParadeRecordStatus
  ) => {
    if (isGuest) {
      showNotification('গেস্ট মোডে কোনো প্যারেড স্টেট পরিবর্তন বা সংরক্ষণ করা যাবে না (GUEST — VIEW ONLY)।');
      return;
    }
    const isOfficerOrCo =
      currentUser.role === 'CO' ||
      currentUser.role === 'Offr' ||
      (currentUser.role as string) === '2IC' ||
      (currentUser.role as string) === 'Officer' ||
      isOfficerRank(currentUser.rank);
    if (isOfficerOrCo && !isAdmin) {
      showNotification('Permission Denied: Officers and CO have View-Only access to Parade States.');
      return;
    }

    const recordId = `${date}_${typeId}_${battery}`;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const isRsm = currentUser.role === 'RSM' || currentUser.role === 'Admin';
    const existing = getParadeRecord(date, typeId, battery);

    let nextStatus = submitStatus || existing.status;
    if (isRsm && existing.status !== 'Draft' && existing.status !== 'Finalized') {
      nextStatus = 'Edited by RSM';
    }

    const updatedRecord: DateWiseParadeRecord = {
      ...existing,
      id: recordId,
      date,
      typeId,
      battery,
      counts,
      status: nextStatus,
      lastUpdated: `${date} ${timeStr}`,
      updatedBy: `${currentUser.rank} ${currentUser.name} (${currentUser.role})`,
      editedByRsm: isRsm ? true : existing.editedByRsm,
      submittedAt: submitStatus === 'Submitted' ? `${date} ${timeStr}` : existing.submittedAt,
      submittedBy: submitStatus === 'Submitted' ? `${currentUser.rank} ${currentUser.name}` : existing.submittedBy,
    };

    setParadeRecords((prev) => {
      const next = { ...prev, [recordId]: updatedRecord };
      localStorage.setItem(STORAGE_KEYS.PARADE_RECORDS, JSON.stringify(next));
      return next;
    });

    // Also sync to Firestore safely
    syncDoc(
      setDoc(
        doc(db, 'parade_records', recordId),
        sanitizeForFirestore(updatedRecord),
        { merge: true }
      ),
      'save parade record'
    );

    showNotification(`${battery} ${typeId} Parade State saved (${nextStatus}).`);
    addAuditLog(
      'Parade State Record Saved',
      `${battery} ${typeId} on ${date} saved by ${currentUser.rank} ${currentUser.name}`,
      'PARADE_STATE'
    );
  };

  const confirmBatteryParadeRecord = (date: string, typeId: string, battery: Battery) => {
    if (isGuest) {
      showNotification('গেস্ট মোডে কোনো প্যারেড স্টেট কনফার্ম করা যাবে না (GUEST — VIEW ONLY)।');
      return;
    }
    const isOfficerOrCo =
      currentUser.role === 'CO' ||
      currentUser.role === 'Offr' ||
      (currentUser.role as string) === '2IC' ||
      (currentUser.role as string) === 'Officer' ||
      isOfficerRank(currentUser.rank);
    if (isOfficerOrCo && !isAdmin) {
      showNotification('Permission Denied: Officers and CO have View-Only access to Parade States.');
      return;
    }

    const recordId = `${date}_${typeId}_${battery}`;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const existing = getParadeRecord(date, typeId, battery);

    const isCurrentlyConfirmed = existing.status === 'Confirmed';
    const newStatus: ParadeRecordStatus = isCurrentlyConfirmed ? 'Pending RSM Confirmation' : 'Confirmed';

    const updatedRecord: DateWiseParadeRecord = {
      ...existing,
      status: newStatus,
      confirmedAt: newStatus === 'Confirmed' ? `${date} ${timeStr}` : undefined,
      confirmedBy: newStatus === 'Confirmed' ? `${currentUser.rank} ${currentUser.name} (RSM)` : undefined,
    };

    setParadeRecords((prev) => {
      const next = { ...prev, [recordId]: updatedRecord };
      localStorage.setItem(STORAGE_KEYS.PARADE_RECORDS, JSON.stringify(next));
      return next;
    });

    syncDoc(
      setDoc(
        doc(db, 'parade_records', recordId),
        sanitizeForFirestore(updatedRecord),
        { merge: true }
      ),
      'confirm parade record'
    );

    showNotification(`${battery} ${typeId} State ${newStatus === 'Confirmed' ? 'Confirmed by RSM' : 'set to Pending'}.`);
  };

  const finalizeParadeType = (date: string, typeId: string) => {
    if (isGuest) {
      showNotification('গেস্ট মোডে কোনো প্যারেড স্টেট ফাইনাল করা যাবে না (GUEST — VIEW ONLY)।');
      return;
    }
    const isOfficerOrCo =
      currentUser.role === 'CO' ||
      currentUser.role === 'Offr' ||
      (currentUser.role as string) === '2IC' ||
      (currentUser.role as string) === 'Officer' ||
      isOfficerRank(currentUser.rank);
    if (isOfficerOrCo && !isAdmin) {
      showNotification('Permission Denied: Officers and CO have View-Only access to Parade States.');
      return;
    }

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const batteries: Battery[] = ['HQ Bty', 'P Bty', 'Q Bty', 'R Bty'];
    
    setParadeRecords((prev) => {
      const next = { ...prev };
      batteries.forEach((bty) => {
        const recordId = `${date}_${typeId}_${bty}`;
        const existing = getParadeRecord(date, typeId, bty);
        const updated: DateWiseParadeRecord = {
          ...existing,
          status: 'Finalized',
          finalizedAt: `${date} ${timeStr}`,
          finalizedBy: `${currentUser.rank} ${currentUser.name} (RSM)`,
        };
        next[recordId] = updated;
        syncDoc(
          setDoc(
            doc(db, 'parade_records', recordId),
            sanitizeForFirestore(updated),
            { merge: true }
          ),
          'finalize parade record'
        );
      });
      localStorage.setItem(STORAGE_KEYS.PARADE_RECORDS, JSON.stringify(next));
      return next;
    });

    showNotification(`10 Med Regt ${typeId} Parade State for ${date} has been Finalized!`);
    addAuditLog(
      'Parade State Finalized',
      `${typeId} Parade State on ${date} formally finalized by ${currentUser.rank} ${currentUser.name}`,
      'PARADE_STATE'
    );
  };

  // --- PARADE DUTY ASSIGNMENTS (Unit Sy, working, Fixed Duty, Others) ---
  const [paradeDutyAssignments, setParadeDutyAssignments] = useState<
    Record<string, ParadeDutyAssignment[]>
  >(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PARADE_DUTY_ASSIGNMENTS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {};
  });

  const getParadeDutyAssignments = (
    date: string,
    sessionType: string,
    category?: ParadeDutyCategory
  ): ParadeDutyAssignment[] => {
    const key = `${date}_${sessionType}`;
    const list = paradeDutyAssignments[key] || [];
    const normalizedList = list.map((a) => ({
      ...a,
      dutyName: normalizeDutyName(a.dutyName || 'General'),
    }));
    if (category) {
      return normalizedList.filter((a) => a.category === category);
    }
    return normalizedList;
  };

  const addParadeDutyAssignment = (
    assignment: Omit<ParadeDutyAssignment, 'id' | 'assignedAt' | 'assignedBy'>
  ) => {
    const key = `${assignment.date}_${assignment.sessionType}`;
    const id = `${assignment.personnelId}_${assignment.category}_${Date.now()}`;
    const normalizedDuty = normalizeDutyName(assignment.dutyName || 'General');
    const newRecord: ParadeDutyAssignment = {
      ...assignment,
      dutyName: normalizedDuty,
      id,
      assignedAt: new Date().toISOString(),
      assignedBy: `${currentUser.rank} ${currentUser.name}`,
    };

    setParadeDutyAssignments((prev) => {
      const existing = prev[key] || [];
      // If already assigned to the exact same category, update their duty or prevent duplicate
      const filtered = existing.filter(
        (a) => !(a.personnelId === assignment.personnelId && a.category === assignment.category)
      );
      const next = { ...prev, [key]: [...filtered, newRecord] };
      localStorage.setItem(STORAGE_KEYS.PARADE_DUTY_ASSIGNMENTS, JSON.stringify(next));
      return next;
    });

    syncDoc(
      setDoc(
        doc(db, 'parade_duty_assignments', key),
        sanitizeForFirestore({
          date: assignment.date,
          sessionType: assignment.sessionType,
          assignments: [
            ...(paradeDutyAssignments[key] || []).filter(
              (a) => !(a.personnelId === assignment.personnelId && a.category === assignment.category)
            ),
            newRecord,
          ],
        }),
        { merge: true }
      ),
      'add parade duty assignment'
    );
  };

  const removeParadeDutyAssignment = (id: string, date: string, sessionType: string) => {
    const key = `${date}_${sessionType}`;
    const userDisplay = `${currentUser.rank} ${currentUser.name}`;
    let updatedAssignments: ParadeDutyAssignment[] = [];
    setParadeDutyAssignments((prev) => {
      const existing = prev[key] || [];
      const filtered = existing.filter((a) => a.id !== id);
      updatedAssignments = filtered;
      const next = { ...prev, [key]: filtered };
      localStorage.setItem(STORAGE_KEYS.PARADE_DUTY_ASSIGNMENTS, JSON.stringify(next));
      return next;
    });

    // Auto-sync removal with Supabase Cloud
    const currentStatus = dutySessionStatuses[key]?.status || 'Draft';
    saveDutyDetailingToSupabase(date, sessionType, updatedAssignments, currentStatus, userDisplay).catch(() => {});

    syncDoc(
      setDoc(
        doc(db, 'parade_duty_assignments', key),
        sanitizeForFirestore({
          date,
          sessionType,
          assignments: updatedAssignments,
        }),
        { merge: true }
      ),
      'remove parade duty assignment'
    );
  };

  const clearParadeDutyAssignments = (
    date: string,
    sessionType: string,
    category?: ParadeDutyCategory
  ) => {
    const key = `${date}_${sessionType}`;
    const userDisplay = `${currentUser.rank} ${currentUser.name}`;
    let updatedAssignments: ParadeDutyAssignment[] = [];
    setParadeDutyAssignments((prev) => {
      const existing = prev[key] || [];
      const nextList = category ? existing.filter((a) => a.category !== category) : [];
      updatedAssignments = nextList;
      const next = { ...prev, [key]: nextList };
      localStorage.setItem(STORAGE_KEYS.PARADE_DUTY_ASSIGNMENTS, JSON.stringify(next));
      return next;
    });

    // Auto-sync cleared category with Supabase Cloud
    const currentStatus = dutySessionStatuses[key]?.status || 'Draft';
    saveDutyDetailingToSupabase(date, sessionType, updatedAssignments, currentStatus, userDisplay).catch(() => {});

    syncDoc(
      setDoc(
        doc(db, 'parade_duty_assignments', key),
        sanitizeForFirestore({
          date,
          sessionType,
          assignments: updatedAssignments,
        }),
        { merge: true }
      ),
      'clear parade duty assignments'
    );
  };

  // --- DUTY DETAILING WORKFLOW STATUS (Draft, Saved, Sent to Adjt) ---
  const [dutySessionStatuses, setDutySessionStatuses] = useState<
    Record<string, DutySessionStatus>
  >(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PARADE_DUTY_STATUSES);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {};
  });

  const getDutySessionStatus = (date: string, sessionType: string): DutySessionStatus => {
    const key = `${date}_${sessionType}`;
    return dutySessionStatuses[key] || { status: 'Draft' };
  };

  const saveDutySession = (date: string, sessionType: string) => {
    const key = `${date}_${sessionType}`;
    const userDisplay = `${currentUser.rank} ${currentUser.name}`;
    const now = new Date().toISOString();
    const existing = dutySessionStatuses[key] || { status: 'Draft' };
    const updated: DutySessionStatus = {
      ...existing,
      status: 'Saved',
      savedAt: now,
      savedBy: userDisplay,
    };

    setDutySessionStatuses((prev) => {
      const next = { ...prev, [key]: updated };
      localStorage.setItem(STORAGE_KEYS.PARADE_DUTY_STATUSES, JSON.stringify(next));
      return next;
    });

    // Save directly to Supabase Cloud Database (parade_records table)
    const currentAssignments = paradeDutyAssignments[key] || [];
    saveDutyDetailingToSupabase(date, sessionType, currentAssignments, 'Saved', userDisplay).then((res) => {
      if (res.success) {
        console.log(`[Supabase] Duty detailing auto-saved to cloud for ${date} (${sessionType})`);
      } else {
        console.warn('[Supabase] Note: Local save succeeded, cloud note:', res.error);
      }
    });

    syncDoc(
      setDoc(
        doc(db, 'parade_duty_assignments', key),
        sanitizeForFirestore({
          date,
          sessionType,
          status: 'Saved',
          savedAt: now,
          savedBy: userDisplay,
        }),
        { merge: true }
      ),
      'save duty session status'
    );

    addAuditLog(
      'Saved Duty Detailing',
      `Saved duty detailing for ${sessionType} session on ${date} by ${userDisplay}`,
      'PARADE_STATE'
    );

    showNotification(`✅ Duty Detailing for ${sessionType} saved to Cloud & Local (সংরক্ষিত হয়েছে)`);
  };

  const editDutySession = (date: string, sessionType: string) => {
    const key = `${date}_${sessionType}`;
    const userDisplay = `${currentUser.rank} ${currentUser.name}`;
    const existing = dutySessionStatuses[key] || { status: 'Draft' };
    const updated: DutySessionStatus = {
      ...existing,
      status: 'Draft',
    };

    setDutySessionStatuses((prev) => {
      const next = { ...prev, [key]: updated };
      localStorage.setItem(STORAGE_KEYS.PARADE_DUTY_STATUSES, JSON.stringify(next));
      return next;
    });

    const currentAssignments = paradeDutyAssignments[key] || [];
    saveDutyDetailingToSupabase(date, sessionType, currentAssignments, 'Draft', userDisplay).catch(() => {});

    syncDoc(
      setDoc(
        doc(db, 'parade_duty_assignments', key),
        sanitizeForFirestore({
          date,
          sessionType,
          status: 'Draft',
        }),
        { merge: true }
      ),
      'edit duty session status'
    );

    addAuditLog(
      'Edit Duty Detailing',
      `Unlocked edit mode for ${sessionType} duty detailing on ${date} by ${userDisplay}`,
      'PARADE_STATE'
    );

    showNotification(`✏️ Edit mode enabled for ${sessionType} duty detailing (এডিট মোড সক্রিয়)`);
  };

  const sendDutySessionToAdjt = (date: string, sessionType: string, notes?: string) => {
    if (isGuest) {
      showNotification('গেস্ট মোডে অ্যাডজুট্যান্টের নিকট প্রেরণ করা যাবে না (GUEST — VIEW ONLY)।');
      return;
    }
    const key = `${date}_${sessionType}`;
    const userDisplay = `${currentUser.rank} ${currentUser.name}`;
    const now = new Date().toISOString();
    const existing = dutySessionStatuses[key] || { status: 'Draft' };
    const updated: DutySessionStatus = {
      ...existing,
      status: 'Sent to Adjt',
      sentToAdjtAt: now,
      sentToAdjtBy: userDisplay,
      notes: notes || undefined,
    };

    setDutySessionStatuses((prev) => {
      const next = { ...prev, [key]: updated };
      localStorage.setItem(STORAGE_KEYS.PARADE_DUTY_STATUSES, JSON.stringify(next));
      return next;
    });

    const currentAssignments = paradeDutyAssignments[key] || [];
    saveDutyDetailingToSupabase(date, sessionType, currentAssignments, 'Sent to Adjt', userDisplay).then((res) => {
      if (res.success) {
        console.log(`[Supabase] Duty detailing submitted to Adjt on cloud for ${date} (${sessionType})`);
      }
    });

    syncDoc(
      setDoc(
        doc(db, 'parade_duty_assignments', key),
        sanitizeForFirestore({
          date,
          sessionType,
          status: 'Sent to Adjt',
          sentToAdjtAt: now,
          sentToAdjtBy: userDisplay,
          notes: notes || null,
        }),
        { merge: true }
      ),
      'send duty session to adjt'
    );

    addAuditLog(
      'Sent to Adjt',
      `Dispatched ${sessionType} duty detailing & parade state for ${date} to Adjutant by ${userDisplay}. Notes: ${notes || 'None'}`,
      'PARADE_STATE'
    );

    showNotification(`🎖️ Duty Detailing & Parade State sent to Adjutant successfully (অ্যাডজুট্যান্টের নিকট প্রেরিত হয়েছে)!`);
  };

  const addParadeType = (name: string, headings?: string[]) => {
    if (isGuest) {
      showNotification('গেস্ট মোডে নতুন প্যারেড টাইপ তৈরি করা যাবে না (GUEST — VIEW ONLY)।');
      return;
    }
    if (isBsmRole(currentUser.role)) {
      showNotification('Permission Denied: BSM cannot create new Parade State types. Only RSM or Admin can create parade types.');
      addAuditLog('Unauthorized Access Attempt', `${currentUser.name} (BSM) attempted to create parade type`, 'SECURITY');
      return;
    }
    const isRsm = currentUser.role === 'RSM';
    if (!isAdmin && !isRsm) {
      showNotification('Permission Denied: Only ADMIN or RSM has permission to create new Parade State types.');
      addAuditLog('Unauthorized Access Attempt', `${currentUser.name} (${currentUser.role}) attempted to create parade type`, 'SECURITY');
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) return;

    // Any newly created parade type is strictly created by/for RSM
    const creatorRole: 'RSM' = 'RSM';

    const newType: ParadeTypeDefinition = {
      id: trimmed,
      name: trimmed,
      order: paradeTypes.length + 1,
      isActive: true,
      headings: headings || ['OFFR', 'JCO', 'OR'],
      createdAt: new Date().toISOString(),
      createdBy: creatorRole,
      createdByName: `${currentUser.rank} ${currentUser.name} (RSM)`,
      isDeleted: false,
      deleted: false,
      status: 'active',
    };

    const updated = [...paradeTypes, newType];
    setParadeTypes(updated);
    localStorage.setItem(STORAGE_KEYS.PARADE_TYPES, JSON.stringify(updated));

    syncDoc(
      setDoc(
        doc(db, 'parade_types', newType.id),
        sanitizeForFirestore(newType),
        { merge: true }
      ),
      'save parade type'
    );

    showNotification(`New Parade State Type "${trimmed}" created by RSM.`);
    addAuditLog(
      'Parade Type Created',
      `New Parade State type "${trimmed}" created by ${currentUser.name} (RSM)`,
      'PARADE_STATE'
    );
  };

  const updateParadeType = (id: string, updated: Partial<ParadeTypeDefinition>): boolean => {
    if (isGuest) {
      showNotification('গেস্ট মোডে প্যারেড টাইপ সম্পাদনা করা যাবে না (GUEST — VIEW ONLY)।');
      return false;
    }
    if (isBsmRole(currentUser.role)) {
      showNotification('Permission Denied: BSM cannot modify Parade State types.');
      return false;
    }
    if (!isAdmin) {
      showNotification('Permission Denied: Only ADMIN has permission to modify Parade State types.');
      addAuditLog('Unauthorized Access Attempt', `${currentUser.name} (${currentUser.role}) attempted to edit parade type`, 'SECURITY');
      return false;
    }
    const next = paradeTypes.map((t) => (t.id === id ? { ...t, ...updated } : t));
    setParadeTypes(next);
    localStorage.setItem(STORAGE_KEYS.PARADE_TYPES, JSON.stringify(next));
    syncDoc(setDoc(doc(db, 'parade_types', id), sanitizeForFirestore(updated), { merge: true }), 'update parade type');
    showNotification(`Parade State "${id}" updated by ADMIN.`);
    addAuditLog('Parade Type Updated', `Parade State "${id}" updated by ADMIN`, 'PARADE_STATE');
    return true;
  };

  const deleteParadeType = (id: string): boolean => {
    if (isGuest) {
      showNotification('গেস্ট মোডে প্যারেড টাইপ মুছে ফেলা যাবে না (GUEST — VIEW ONLY)।');
      return false;
    }
    if (isBsmRole(currentUser.role)) {
      showNotification('Permission Denied: BSM cannot delete Parade State types. Only Admin or RSM can delete parade types.');
      addAuditLog('Unauthorized Access Attempt', `${currentUser.name} (BSM) attempted to delete parade type`, 'SECURITY');
      return false;
    }
    const targetType = paradeTypes.find((t) => t.id === id || t.name === id);
    if (!targetType) return false;

    const isDefaultType = ['Morning', 'Second Period', 'Games'].includes(targetType.name) || ['Morning', 'Second Period', 'Games'].includes(targetType.id);
    const hasPermission = (currentUser.role === 'RSM' || isAdmin) && !isDefaultType;

    if (!hasPermission) {
      if (isDefaultType) {
        showNotification('মূল প্যারেড স্টেট (Morning, Second Period, Games) ডিলিট করা যাবে না।');
      } else {
        showNotification('Permission Denied: শুধুমাত্র RSM নতুন তৈরি করা প্যারেড স্টেট ডিলিট করতে পারবেন।');
      }
      addAuditLog(
        'Unauthorized Delete Attempt',
        `${currentUser.name} (${currentUser.role}) attempted to delete parade type "${targetType.name}" (Created by: ${targetType.createdBy || 'RSM'})`,
        'SECURITY'
      );
      return false;
    }

    // Soft-Delete / Archive: Preserve the record in database with deleted = true
    const nowIso = new Date().toISOString();
    const deletedByRole: 'Admin' | 'RSM' = 'RSM';
    const updatedType: ParadeTypeDefinition = {
      ...targetType,
      isDeleted: true,
      deleted: true,
      status: 'deleted',
      deletedAt: nowIso,
      deletedBy: `${currentUser.rank} ${currentUser.name}`,
      deletedByRole,
    };

    const next = paradeTypes.map((t) => (t.id === targetType.id ? updatedType : t));
    setParadeTypes(next);
    localStorage.setItem(STORAGE_KEYS.PARADE_TYPES, JSON.stringify(next));

    syncDoc(
      setDoc(
        doc(db, 'parade_types', targetType.id),
        sanitizeForFirestore(updatedType),
        { merge: true }
      ),
      'soft delete parade type'
    );

    showNotification(`Parade State "${targetType.name}" archived/deleted by ${deletedByRole}.`);
    addAuditLog(
      'Parade Type Archived',
      `Parade State "${targetType.name}" archived/soft-deleted by ${currentUser.name} (${deletedByRole})`,
      'PARADE_STATE'
    );
    return true;
  };

  const restoreParadeType = (id: string): boolean => {
    if (isGuest) {
      showNotification('গেস্ট মোডে প্যারেড টাইপ পুনরুদ্ধার করা যাবে না (GUEST — VIEW ONLY)।');
      return false;
    }
    if (!isAdmin) {
      showNotification('Permission Denied: Only ADMIN can restore archived Parade States.');
      return false;
    }
    const targetType = paradeTypes.find((t) => t.id === id || t.name === id);
    if (!targetType) return false;

    const restored: ParadeTypeDefinition = {
      ...targetType,
      isDeleted: false,
      deleted: false,
      status: 'active',
    };

    const next = paradeTypes.map((t) => (t.id === targetType.id ? restored : t));
    setParadeTypes(next);
    localStorage.setItem(STORAGE_KEYS.PARADE_TYPES, JSON.stringify(next));

    syncDoc(
      setDoc(
        doc(db, 'parade_types', targetType.id),
        sanitizeForFirestore(restored),
        { merge: true }
      ),
      'restore parade type'
    );

    showNotification(`Parade State "${targetType.name}" restored by ADMIN.`);
    addAuditLog(
      'Parade Type Restored',
      `Parade State "${targetType.name}" restored by ADMIN`,
      'PARADE_STATE'
    );
    return true;
  };

  // 1. Dynamic Categories & Sub-Categories (ADMIN FULL CONTROL)
  const addCategory = (cat: Omit<SystemCategory, 'id'>): boolean => {
    if (!isAdmin) {
      showNotification('Access Denied: Only ADMIN has permission to add categories.');
      addAuditLog('Unauthorized Category Attempt', `${currentUser.name} (${currentUser.role}) attempted to create category ${cat.name}`, 'SECURITY');
      return false;
    }
    const newId = 'cat-' + Date.now();
    const newCat: SystemCategory = {
      ...cat,
      id: newId,
      order: cat.order ?? (categoriesList.length + 1),
      subCategories: cat.subCategories || [],
    };
    const updated = [...categoriesList, newCat];
    setCategoriesList(updated);
    localStorage.setItem(STORAGE_KEYS.SYSTEM_CATEGORIES, JSON.stringify(updated));
    syncDoc(setDoc(doc(db, 'system_categories', newId), sanitizeForFirestore(newCat)), 'add category');
    showNotification(`Main Category "${newCat.name}" created successfully by ADMIN.`);
    addAuditLog('Category Created', `ADMIN created category ${newCat.name}`, 'SYSTEM');
    return true;
  };

  const updateCategory = (id: string, updated: Partial<SystemCategory>): boolean => {
    if (!isAdmin) {
      showNotification('Access Denied: Only ADMIN has permission to edit categories.');
      addAuditLog('Unauthorized Category Attempt', `${currentUser.name} (${currentUser.role}) attempted to edit category ${id}`, 'SECURITY');
      return false;
    }
    const next = categoriesList.map((c) => (c.id === id ? { ...c, ...updated } : c));
    setCategoriesList(next);
    localStorage.setItem(STORAGE_KEYS.SYSTEM_CATEGORIES, JSON.stringify(next));
    syncDoc(setDoc(doc(db, 'system_categories', id), sanitizeForFirestore(updated), { merge: true }), 'update category');
    showNotification(`Category updated successfully by ADMIN.`);
    addAuditLog('Category Updated', `ADMIN updated category ${id}`, 'SYSTEM');
    return true;
  };

  const deleteCategory = (id: string): boolean => {
    if (!isAdmin) {
      showNotification('Access Denied: Only ADMIN has permission to delete categories.');
      addAuditLog('Unauthorized Category Attempt', `${currentUser.name} (${currentUser.role}) attempted to delete category ${id}`, 'SECURITY');
      return false;
    }
    const target = categoriesList.find((c) => c.id === id);
    const next = categoriesList.filter((c) => c.id !== id);
    setCategoriesList(next);
    localStorage.setItem(STORAGE_KEYS.SYSTEM_CATEGORIES, JSON.stringify(next));
    syncDoc(deleteDoc(doc(db, 'system_categories', id)), 'delete category');
    showNotification(`Category "${target?.name || id}" deleted by ADMIN.`);
    addAuditLog('Category Deleted', `ADMIN deleted category ${target?.name || id}`, 'SYSTEM');
    return true;
  };

  const addSubCategory = (categoryId: string, subCat: Omit<SubCategoryItem, 'id'>): boolean => {
    if (!isAdmin) {
      showNotification('Access Denied: Only ADMIN has permission to add sub-categories.');
      addAuditLog('Unauthorized Sub-category Attempt', `${currentUser.name} (${currentUser.role}) attempted to add sub-category ${subCat.name}`, 'SECURITY');
      return false;
    }
    const subId = 'sub-' + Date.now();
    const newSub: SubCategoryItem = {
      ...subCat,
      id: subId,
      order: subCat.order ?? 99,
    };
    const next = categoriesList.map((c) => {
      if (c.id === categoryId) {
        return {
          ...c,
          subCategories: [...c.subCategories, newSub],
        };
      }
      return c;
    });
    setCategoriesList(next);
    localStorage.setItem(STORAGE_KEYS.SYSTEM_CATEGORIES, JSON.stringify(next));
    const targetCat = next.find((c) => c.id === categoryId);
    if (targetCat) {
      syncDoc(setDoc(doc(db, 'system_categories', categoryId), sanitizeForFirestore(targetCat), { merge: true }), 'add sub category');
    }
    showNotification(`Sub-category "${newSub.name}" added to ${targetCat?.name} by ADMIN.`);
    addAuditLog('Sub-Category Added', `ADMIN added sub-category ${newSub.name} to ${targetCat?.name}`, 'SYSTEM');
    return true;
  };

  const updateSubCategory = (categoryId: string, subCatId: string, updated: Partial<SubCategoryItem>): boolean => {
    if (!isAdmin) {
      showNotification('Access Denied: Only ADMIN has permission to edit sub-categories.');
      addAuditLog('Unauthorized Sub-category Attempt', `${currentUser.name} (${currentUser.role}) attempted to edit sub-category ${subCatId}`, 'SECURITY');
      return false;
    }
    const next = categoriesList.map((c) => {
      if (c.id === categoryId) {
        return {
          ...c,
          subCategories: c.subCategories.map((s) => (s.id === subCatId ? { ...s, ...updated } : s)),
        };
      }
      return c;
    });
    setCategoriesList(next);
    localStorage.setItem(STORAGE_KEYS.SYSTEM_CATEGORIES, JSON.stringify(next));
    const targetCat = next.find((c) => c.id === categoryId);
    if (targetCat) {
      syncDoc(setDoc(doc(db, 'system_categories', categoryId), sanitizeForFirestore(targetCat), { merge: true }), 'update sub category');
    }
    showNotification(`Sub-category updated by ADMIN.`);
    addAuditLog('Sub-Category Updated', `ADMIN updated sub-category ${subCatId}`, 'SYSTEM');
    return true;
  };

  const deleteSubCategory = (categoryId: string, subCatId: string): boolean => {
    if (!isAdmin) {
      showNotification('Access Denied: Only ADMIN has permission to delete sub-categories.');
      addAuditLog('Unauthorized Sub-category Attempt', `${currentUser.name} (${currentUser.role}) attempted to delete sub-category ${subCatId}`, 'SECURITY');
      return false;
    }
    const next = categoriesList.map((c) => {
      if (c.id === categoryId) {
        return {
          ...c,
          subCategories: c.subCategories.filter((s) => s.id !== subCatId),
        };
      }
      return c;
    });
    setCategoriesList(next);
    localStorage.setItem(STORAGE_KEYS.SYSTEM_CATEGORIES, JSON.stringify(next));
    const targetCat = next.find((c) => c.id === categoryId);
    if (targetCat) {
      syncDoc(setDoc(doc(db, 'system_categories', categoryId), sanitizeForFirestore(targetCat), { merge: true }), 'delete sub category');
    }
    showNotification(`Sub-category deleted by ADMIN.`);
    addAuditLog('Sub-Category Deleted', `ADMIN deleted sub-category ${subCatId}`, 'SYSTEM');
    return true;
  };

  const reorderCategories = (orderedIds: string[]): boolean => {
    if (!isAdmin) {
      showNotification('Access Denied: Only ADMIN has permission to reorder categories.');
      return false;
    }
    const map = new Map<string, SystemCategory>(categoriesList.map((c) => [c.id, c]));
    const reordered: SystemCategory[] = [];
    orderedIds.forEach((id, idx) => {
      const item = map.get(id);
      if (item) {
        reordered.push({ ...item, order: idx + 1 });
      }
    });
    setCategoriesList(reordered);
    localStorage.setItem(STORAGE_KEYS.SYSTEM_CATEGORIES, JSON.stringify(reordered));
    reordered.forEach((c) => {
      syncDoc(setDoc(doc(db, 'system_categories', c.id), sanitizeForFirestore(c), { merge: true }), 'reorder category');
    });
    showNotification(`Categories reordered by ADMIN.`);
    return true;
  };

  // 2. Sub Units Configuration (ADMIN FULL CONTROL)
  const addSubUnit = (unit: Omit<SubUnitConfig, 'id'>): boolean => {
    if (!isAdmin) {
      showNotification('Access Denied: Only ADMIN has permission to add sub-units.');
      return false;
    }
    const newId = 'unit-' + Date.now();
    const newUnit: SubUnitConfig = { ...unit, id: newId };
    const next = [...subUnitsList, newUnit];
    setSubUnitsList(next);
    localStorage.setItem(STORAGE_KEYS.SUB_UNITS, JSON.stringify(next));
    syncDoc(setDoc(doc(db, 'sub_units', newId), sanitizeForFirestore(newUnit)), 'add sub unit');
    showNotification(`Sub Unit "${newUnit.name}" added by ADMIN.`);
    addAuditLog('Sub Unit Added', `ADMIN created sub unit ${newUnit.name}`, 'SYSTEM');
    return true;
  };

  const updateSubUnit = (id: string, updated: Partial<SubUnitConfig>): boolean => {
    if (!isAdmin) {
      showNotification('Access Denied: Only ADMIN has permission to edit sub-units.');
      return false;
    }
    const next = subUnitsList.map((u) => (u.id === id ? { ...u, ...updated } : u));
    setSubUnitsList(next);
    localStorage.setItem(STORAGE_KEYS.SUB_UNITS, JSON.stringify(next));
    syncDoc(setDoc(doc(db, 'sub_units', id), sanitizeForFirestore(updated), { merge: true }), 'update sub unit');
    showNotification(`Sub Unit updated by ADMIN.`);
    addAuditLog('Sub Unit Updated', `ADMIN updated sub unit ${id}`, 'SYSTEM');
    return true;
  };

  const deleteSubUnit = (id: string): boolean => {
    if (!isAdmin) {
      showNotification('Access Denied: Only ADMIN has permission to delete sub-units.');
      return false;
    }
    const next = subUnitsList.filter((u) => u.id !== id);
    setSubUnitsList(next);
    localStorage.setItem(STORAGE_KEYS.SUB_UNITS, JSON.stringify(next));
    syncDoc(deleteDoc(doc(db, 'sub_units', id)), 'delete sub unit');
    showNotification(`Sub Unit deleted by ADMIN.`);
    addAuditLog('Sub Unit Deleted', `ADMIN deleted sub unit ${id}`, 'SYSTEM');
    return true;
  };

  // 3. Military Ranks Configuration (ADMIN FULL CONTROL)
  const addRank = (rank: Omit<RankConfig, 'id'>): boolean => {
    if (!isAdmin) {
      showNotification('Access Denied: Only ADMIN has permission to add military ranks.');
      return false;
    }
    const newId = 'rk-' + Date.now();
    const newRank: RankConfig = { ...rank, id: newId };
    const next = [...ranksList, newRank];
    setRanksList(next);
    localStorage.setItem(STORAGE_KEYS.MILITARY_RANKS, JSON.stringify(next));
    syncDoc(setDoc(doc(db, 'military_ranks', newId), sanitizeForFirestore(newRank)), 'add rank');
    showNotification(`Military Rank "${newRank.name}" added by ADMIN.`);
    addAuditLog('Rank Added', `ADMIN created rank ${newRank.name}`, 'SYSTEM');
    return true;
  };

  const updateRank = (id: string, updated: Partial<RankConfig>): boolean => {
    if (!isAdmin) {
      showNotification('Access Denied: Only ADMIN has permission to edit military ranks.');
      return false;
    }
    const next = ranksList.map((r) => (r.id === id ? { ...r, ...updated } : r));
    setRanksList(next);
    localStorage.setItem(STORAGE_KEYS.MILITARY_RANKS, JSON.stringify(next));
    syncDoc(setDoc(doc(db, 'military_ranks', id), sanitizeForFirestore(updated), { merge: true }), 'update rank');
    showNotification(`Rank updated by ADMIN.`);
    addAuditLog('Rank Updated', `ADMIN updated rank ${id}`, 'SYSTEM');
    return true;
  };

  const deleteRank = (id: string): boolean => {
    if (!isAdmin) {
      showNotification('Access Denied: Only ADMIN has permission to delete military ranks.');
      return false;
    }
    const next = ranksList.filter((r) => r.id !== id);
    setRanksList(next);
    localStorage.setItem(STORAGE_KEYS.MILITARY_RANKS, JSON.stringify(next));
    syncDoc(deleteDoc(doc(db, 'military_ranks', id)), 'delete rank');
    showNotification(`Rank deleted by ADMIN.`);
    addAuditLog('Rank Deleted', `ADMIN deleted rank ${id}`, 'SYSTEM');
    return true;
  };

  // 3b. Military Trades & Specializations (ADMIN FULL CONTROL)
  const addTrade = (trade: Omit<TradeConfig, 'id'>): boolean => {
    if (!isAdmin) {
      showNotification('Access Denied: Only ADMIN has permission to add trades.');
      return false;
    }
    const newId = 'trd-' + Date.now();
    const newTrade: TradeConfig = {
      ...trade,
      id: newId,
      isActive: trade.isActive ?? true,
      applicableForEnlistment: trade.applicableForEnlistment ?? true,
    };
    const next = [...tradesList, newTrade];
    setTradesList(next);
    localStorage.setItem(STORAGE_KEYS.MILITARY_TRADES, JSON.stringify(next));
    syncDoc(setDoc(doc(db, 'military_trades', newId), sanitizeForFirestore(newTrade)), 'add trade');
    showNotification(`Trade "${newTrade.name}" added by ADMIN.`);
    addAuditLog('Trade Added', `ADMIN created trade ${newTrade.name} (${newTrade.code})`, 'SYSTEM');
    return true;
  };

  const updateTrade = (id: string, updated: Partial<TradeConfig>): boolean => {
    if (!isAdmin) {
      showNotification('Access Denied: Only ADMIN has permission to edit trades.');
      return false;
    }
    const next = tradesList.map((t) => (t.id === id ? { ...t, ...updated } : t));
    setTradesList(next);
    localStorage.setItem(STORAGE_KEYS.MILITARY_TRADES, JSON.stringify(next));
    syncDoc(setDoc(doc(db, 'military_trades', id), sanitizeForFirestore(updated), { merge: true }), 'update trade');
    showNotification(`Trade updated by ADMIN.`);
    addAuditLog('Trade Updated', `ADMIN updated trade ${id}`, 'SYSTEM');
    return true;
  };

  const deleteTrade = (id: string): boolean => {
    if (!isAdmin) {
      showNotification('Access Denied: Only ADMIN has permission to delete trades.');
      return false;
    }
    const next = tradesList.filter((t) => t.id !== id);
    setTradesList(next);
    localStorage.setItem(STORAGE_KEYS.MILITARY_TRADES, JSON.stringify(next));
    syncDoc(deleteDoc(doc(db, 'military_trades', id)), 'delete trade');
    showNotification(`Trade deleted by ADMIN.`);
    addAuditLog('Trade Deleted', `ADMIN deleted trade ${id}`, 'SYSTEM');
    return true;
  };

  // Helper dynamic lists for Ranks & Trades (Auto-updated throughout entire app)
  const activeRanks = React.useMemo(() => {
    return [...ranksList]
      .filter((r) => r.isActive !== false)
      .sort((a, b) => a.order - b.order);
  }, [ranksList]);

  const enlistmentRanks = React.useMemo(() => {
    return [...ranksList]
      .filter((r) => r.isActive !== false && r.applicableForEnlistment !== false)
      .sort((a, b) => a.order - b.order);
  }, [ranksList]);

  const activeTrades = React.useMemo(() => {
    return [...tradesList]
      .filter((t) => t.isActive !== false)
      .sort((a, b) => a.order - b.order);
  }, [tradesList]);

  const enlistmentTrades = React.useMemo(() => {
    return [...tradesList]
      .filter((t) => t.isActive !== false && t.applicableForEnlistment !== false)
      .sort((a, b) => a.order - b.order);
  }, [tradesList]);

  const getTradesForRank = React.useCallback((rankName: string): TradeConfig[] => {
    if (!rankName || isOfficerRank(rankName)) {
      return [{
        id: 'trd-none',
        name: '-',
        code: '-',
        order: 0,
        isActive: true,
        category: 'CIVILIAN',
        description: 'Commissioned Officer (No Trade)',
      }];
    }

    const rankItem = ranksList.find(
      (r) => r.name.toLowerCase() === rankName.toLowerCase() || r.code.toLowerCase() === rankName.toLowerCase()
    );
    const cat = rankItem?.category || 'OR';

    const filtered = tradesList.filter((t) => {
      if (t.isActive === false) return false;
      if (!t.applicableRankCategories || t.applicableRankCategories.length === 0) return true;
      return t.applicableRankCategories.includes(cat);
    });

    return filtered.length > 0
      ? filtered.sort((a, b) => a.order - b.order)
      : tradesList.filter((t) => t.isActive !== false).sort((a, b) => a.order - b.order);
  }, [ranksList, tradesList]);

  // 4. Authorized Establishment (AUTH) - STRICT ADMIN CONTROL ONLY
  const updateAuthEstablishment = (id: string, updated: Partial<AuthEstablishmentItem>): boolean => {
    if (!isAdmin) {
      showNotification('Security Violation: Only ADMIN has permission to modify Authorized Establishment.');
      addAuditLog('Establishment Violation Attempt', `${currentUser.name} (${currentUser.role}) attempted to alter Auth Establishment`, 'SECURITY');
      return false;
    }
    const next = authEstablishmentList.map((item) => (item.id === id ? { ...item, ...updated } : item));
    setAuthEstablishmentList(next);
    localStorage.setItem(STORAGE_KEYS.AUTH_ESTABLISHMENT, JSON.stringify(next));
    syncDoc(setDoc(doc(db, 'auth_establishment', id), sanitizeForFirestore(updated), { merge: true }), 'update auth est');
    showNotification(`Authorized Establishment updated by ADMIN.`);
    addAuditLog('Auth Establishment Updated', `ADMIN updated authorized numbers for ${id}`, 'SYSTEM');
    return true;
  };

  const addAuthEstablishmentItem = (item: Omit<AuthEstablishmentItem, 'id'>): boolean => {
    if (!isAdmin) {
      showNotification('Security Violation: Only ADMIN has permission to add establishment items.');
      return false;
    }
    const newId = 'auth-' + Date.now();
    const newItem: AuthEstablishmentItem = { ...item, id: newId };
    const next = [...authEstablishmentList, newItem];
    setAuthEstablishmentList(next);
    localStorage.setItem(STORAGE_KEYS.AUTH_ESTABLISHMENT, JSON.stringify(next));
    syncDoc(setDoc(doc(db, 'auth_establishment', newId), sanitizeForFirestore(newItem)), 'add auth est item');
    showNotification(`Establishment row added by ADMIN.`);
    return true;
  };

  const deleteAuthEstablishmentItem = (id: string): boolean => {
    if (!isAdmin) {
      showNotification('Security Violation: Only ADMIN has permission to delete establishment items.');
      return false;
    }
    const next = authEstablishmentList.filter((a) => a.id !== id);
    setAuthEstablishmentList(next);
    localStorage.setItem(STORAGE_KEYS.AUTH_ESTABLISHMENT, JSON.stringify(next));
    syncDoc(deleteDoc(doc(db, 'auth_establishment', id)), 'delete auth est item');
    showNotification(`Establishment row removed by ADMIN.`);
    return true;
  };

  // 5. Calculation Engine Configuration (ADMIN FULL CONTROL)
  const updateCalculationConfig = (updated: Partial<CalculationConfig>): boolean => {
    if (!isAdmin) {
      showNotification('Security Violation: Only ADMIN can configure calculation engine rules.');
      addAuditLog('Calculation Rule Violation Attempt', `${currentUser.name} (${currentUser.role}) attempted to alter calculation configuration`, 'SECURITY');
      return false;
    }
    const next: CalculationConfig = {
      ...calculationConfig,
      ...updated,
      lastUpdated: new Date().toISOString(),
      updatedBy: `${currentUser.rank} ${currentUser.name} (ADMIN)`,
    };
    setCalculationConfig(next);
    localStorage.setItem(STORAGE_KEYS.CALCULATION_CONFIG, JSON.stringify(next));
    syncDoc(setDoc(doc(db, 'calculation_config', next.id), sanitizeForFirestore(next), { merge: true }), 'update calc config');
    showNotification(`Parade State Calculation Rules updated by ADMIN.`);
    addAuditLog('Calculation Rules Updated', `ADMIN updated calculation engine rules`, 'SYSTEM');
    return true;
  };


  // Sync to localStorage for offline cache
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS_LIST, JSON.stringify(usersList));
  }, [usersList]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PERSONNEL, JSON.stringify(personnelList));
  }, [personnelList]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DUTY, JSON.stringify(dutyRoster));
  }, [dutyRoster]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PARADE_POINTS, JSON.stringify(dailyParadePoints));
  }, [dailyParadePoints]);

  // Firebase Auth listener with Owner Approval enforcement (Runs ONCE on mount with refs to avoid re-render loops)
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user && user.email) {
        const emailLower = user.email.toLowerCase();
        const isOwner = OWNER_EMAILS.some((o) => o.toLowerCase() === emailLower);
        const currentUsers = usersListRef.current;
        const currentReqs = accessRequestsRef.current;

        // Check if explicitly approved in usersList
        const existingApproved = currentUsers.find(
          (u) => u.email?.toLowerCase() === emailLower && u.isApproved !== false
        );

        // Check if access request was approved
        const approvedReq = currentReqs.find(
          (r) => r.email.toLowerCase() === emailLower && r.status === 'approved'
        );

        if (isOwner || existingApproved || approvedReq) {
          setIsAuthenticated(true);
          setPendingGoogleUser(null);
          localStorage.removeItem('10med_pending_google_user');

          let acct: UserAccount;
          if (isOwner) {
            const roleToUse: Role = existingApproved?.role || approvedReq?.assignedRole || 'Admin';
            const rankToUse: string = existingApproved?.rank || approvedReq?.assignedRank || 'Owner / Admin';
            const batToUse: Battery = existingApproved?.assignedBattery || approvedReq?.assignedBattery || 'HQ Bty';
            acct = {
              id: user.uid,
              username: existingApproved?.username || 'owner',
              name: existingApproved?.name || user.displayName || 'Regiment Owner',
              rank: rankToUse,
              role: roleToUse,
              assignedBattery: batToUse,
              assignedBatteries: existingApproved?.assignedBatteries || ['HQ Bty', 'P Bty', 'Q Bty', 'R Bty'],
              email: user.email,
              avatar: user.photoURL || existingApproved?.avatar || undefined,
              isApproved: true,
              approvedBy: 'System / Owner',
              approvedAt: existingApproved?.approvedAt || new Date().toISOString(),
              lastLogin: new Date().toISOString(),
            };
          } else if (existingApproved) {
            acct = {
              ...existingApproved,
              avatar: user.photoURL || existingApproved.avatar,
              isApproved: true,
              lastLogin: new Date().toISOString(),
            };
          } else {
            acct = {
              id: user.uid,
              username: user.email.split('@')[0],
              name: approvedReq?.name || user.displayName || 'Authorized Personnel',
              rank: approvedReq?.assignedRank || 'Capt',
              role: approvedReq?.assignedRole || 'Offr',
              assignedBattery: approvedReq?.assignedBattery || 'HQ Bty',
              assignedBatteries:
                approvedReq?.assignedRole === 'CO' || approvedReq?.assignedRole === 'Admin' || approvedReq?.assignedRole === 'Offr' || approvedReq?.assignedRole === 'RSM'
                  ? ['HQ Bty', 'P Bty', 'Q Bty', 'R Bty']
                  : [approvedReq?.assignedBattery || 'HQ Bty'],
              email: user.email,
              avatar: user.photoURL || undefined,
              isApproved: true,
              approvedBy: approvedReq?.reviewedBy || 'Owner',
              approvedAt: approvedReq?.reviewedAt || new Date().toISOString(),
              lastLogin: new Date().toISOString(),
            };
          }

          if (lastSyncedAuthUidRef.current !== user.uid) {
            lastSyncedAuthUidRef.current = user.uid;
            setCurrentUserState(acct);
            setRealUser(acct);
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(acct));
            localStorage.setItem(STORAGE_KEYS.REAL_USER, JSON.stringify(acct));
            localStorage.setItem(STORAGE_KEYS.AUTH_STATUS, 'true');

            setUsersList((prev) => {
              const filtered = prev.filter((u) => u.email?.toLowerCase() !== emailLower && u.id !== user.uid);
              return [acct, ...filtered];
            });
            syncDoc(setDoc(doc(db, 'users', user.uid), sanitizeForFirestore(acct), { merge: true }), 'sync approved user');
          }
        } else {
          // Not approved! Enforce access block and terminate unauthorized session
          setIsAuthenticated(false);
          setPendingGoogleUser(null);
          localStorage.removeItem('10med_pending_google_user');
          localStorage.removeItem(STORAGE_KEYS.AUTH_STATUS);

          try {
            logoutFirebase();
          } catch (e) {}

          if (lastSyncedAuthUidRef.current !== 'pending_' + user.uid) {
            lastSyncedAuthUidRef.current = 'pending_' + user.uid;
            const reqDoc: GoogleAccessRequest = {
              id: user.uid,
              email: user.email,
              name: user.displayName || user.email.split('@')[0],
              photoURL: user.photoURL || undefined,
              requestedAt: new Date().toISOString(),
              status: 'pending',
            };
            syncDoc(setDoc(doc(db, 'access_requests', user.uid), sanitizeForFirestore(reqDoc), { merge: true }), 'save pending access request');
          }
        }
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Cloud Database Initialization & Supabase Whitelist Bootstrap
  useEffect(() => {
    setIsFirebaseReady(true);
    setCloudPermissionDenied(false);
    if (isSupabaseConfigured()) {
      fetchAuthorizedUsersFromSupabase()
        .then((res) => {
          if (res.success && res.users && res.users.length > 0) {
            setUsersList((prev) => {
              const existingEmails = new Set(prev.map((u) => u.email?.toLowerCase()).filter(Boolean));
              const newFromSupabase = res.users.filter(
                (u) => u.email && !existingEmails.has(u.email.toLowerCase())
              );
              return [...prev, ...newFromSupabase];
            });
          }
        })
        .catch((e) => console.warn('Supabase bootstrap note:', e));

      // Auto-load any previously saved Duty Detailing from Supabase Cloud
      fetchAllDutyDetailingFromSupabase()
        .then((res) => {
          if (res.success && res.records && res.records.length > 0) {
            setParadeDutyAssignments((prev) => {
              const next = { ...prev };
              res.records!.forEach((r) => {
                const key = `${r.date}_${r.sessionType}`;
                if (r.assignments && r.assignments.length > 0) {
                  next[key] = r.assignments;
                }
              });
              localStorage.setItem(STORAGE_KEYS.PARADE_DUTY_ASSIGNMENTS, JSON.stringify(next));
              return next;
            });

            setDutySessionStatuses((prev) => {
              const next = { ...prev };
              res.records!.forEach((r) => {
                const key = `${r.date}_${r.sessionType}`;
                if (r.status) {
                  next[key] = r.status;
                }
              });
              localStorage.setItem(STORAGE_KEYS.PARADE_DUTY_STATUSES, JSON.stringify(next));
              return next;
            });
          }
        })
        .catch((e) => console.warn('Supabase duty load note:', e));
    }
  }, []);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification((curr) => (curr === msg ? null : curr));
    }, 4000);
  };

  const isOwnerUser = Boolean(
    (firebaseUser?.email && OWNER_EMAILS.some((o) => o.toLowerCase() === firebaseUser.email!.toLowerCase())) ||
    (currentUser?.email && OWNER_EMAILS.some((o) => o.toLowerCase() === currentUser.email!.toLowerCase())) ||
    (realUser?.email && OWNER_EMAILS.some((o) => o.toLowerCase() === realUser.email!.toLowerCase()))
  );

  const clearPendingGoogleUser = () => {
    setPendingGoogleUser(null);
    localStorage.removeItem('10med_pending_google_user');
  };

  const loginWithGoogle = async (emailInput?: string): Promise<{
    success: boolean;
    error?: string;
    code?: string;
    domain?: string;
    isPending?: boolean;
  }> => {
    try {
      const user = await signInWithGoogle(emailInput);
      if (!user || !user.email) {
        return { success: false, error: 'গুগল অ্যাকাউন্ট থেকে কোনো ইমেইল পাওয়া যায়নি।' };
      }
      const emailLower = user.email.toLowerCase();
      const isOwner = OWNER_EMAILS.some((o) => o.toLowerCase() === emailLower);

      if (systemSettings.maintenanceMode && !isOwner) {
        const isAdminAcct = usersList.some(
          (u) => u.email?.toLowerCase() === emailLower && u.role === 'Admin'
        );
        if (!isAdminAcct) {
          return {
            success: false,
            error:
              systemSettings.maintenanceMessage ||
              'সিস্টেমে ইমার্জেন্সি রক্ষণাবেক্ষণ চলছে। শুধুমাত্র অ্যাডমিন লগইন অনুমোদিত।',
          };
        }
      }

      // Check if user is already approved in usersList
      let existingUser = usersList.find((u) => u.email?.toLowerCase() === emailLower);
      let isExplicitlyApproved = existingUser && existingUser.isApproved !== false;

      // Check if existing access request is approved
      const existingReq = accessRequests.find((r) => r.email.toLowerCase() === emailLower);
      const isReqApproved = existingReq?.status === 'approved';

      // If not approved yet, check Supabase authorized_users table if configured
      if (!isOwner && !isExplicitlyApproved && !isReqApproved && isSupabaseConfigured()) {
        try {
          const suRes = await fetchAuthorizedUsersFromSupabase();
          if (suRes.success && suRes.users) {
            const foundInSupabase = suRes.users.find((u) => u.email?.toLowerCase() === emailLower);
            if (foundInSupabase) {
              existingUser = foundInSupabase;
              isExplicitlyApproved = true;
            }
          }
        } catch (suErr) {
          console.warn('Supabase whitelist check error:', suErr);
        }
      }

      if (isOwner || isExplicitlyApproved || isReqApproved) {
        const userRole: Role = existingUser?.role || existingReq?.assignedRole || (isOwner ? 'Admin' : 'Offr');
        const userRank: string = existingUser?.rank || existingReq?.assignedRank || (isOwner ? 'Owner / Admin' : 'Capt');
        const userBattery: Battery =
          existingUser?.assignedBattery || existingReq?.assignedBattery || 'HQ Bty';

        const activeAcct: UserAccount = {
          id: user.uid,
          username: existingUser?.username || user.email.split('@')[0],
          name:
            existingUser?.name || existingReq?.name || user.displayName || (isOwner ? 'Regiment Owner' : 'Authorized Personnel'),
          rank: userRank,
          role: userRole,
          assignedBattery: userBattery,
          assignedBatteries:
            userRole === 'Admin' || userRole === 'CO' || userRole === 'Offr' || userRole === 'RSM'
              ? ['HQ Bty', 'P Bty', 'Q Bty', 'R Bty']
              : [userBattery],
          email: user.email,
          avatar: user.photoURL || existingUser?.avatar || undefined,
          isApproved: true,
          approvedBy: isOwner ? 'System / Owner' : (existingUser?.approvedBy || existingReq?.reviewedBy || 'Owner'),
          approvedAt: existingUser?.approvedAt || new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        };

        setCurrentUserState(activeAcct);
        setRealUser(activeAcct);
        setIsAuthenticated(true);
        setPendingGoogleUser(null);
        localStorage.removeItem('10med_pending_google_user');
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(activeAcct));
        localStorage.setItem(STORAGE_KEYS.REAL_USER, JSON.stringify(activeAcct));
        localStorage.setItem(STORAGE_KEYS.AUTH_STATUS, 'true');

        setUsersList((prev) => {
          const filtered = prev.filter((u) => u.email?.toLowerCase() !== emailLower && u.id !== user.uid);
          return [activeAcct, ...filtered];
        });
        syncDoc(setDoc(doc(db, 'users', user.uid), sanitizeForFirestore(activeAcct), { merge: true }), 'sync google user');

        if (activeAcct.role === 'CO') setActivePage('co_dashboard');
        else if (activeAcct.role === 'Offr') setActivePage('offr_dashboard');
        else if (activeAcct.role === 'RSM') setActivePage('rsm_dashboard');
        else if (activeAcct.role === 'Admin') setActivePage('admin_panel');
        else if (isBsmRole(activeAcct.role)) setActivePage('battery_dashboard');
        else setActivePage('main_dashboard');

        showNotification(`স্বাগতম! ${activeAcct.rank} ${activeAcct.name} (${activeAcct.role}) হিসেবে সফলভাবে লগইন হয়েছে।`);
        addAuditLog('Google Auth Login', `User approved & authenticated: ${user.email}`, 'SECURITY');
        return { success: true };
      }

      // STRICT SECURITY ENFORCEMENT:
      // If the email is NOT in the authorized whitelist, terminate session immediately
      try {
        await logoutFirebase();
      } catch (authErr) {
        console.warn('Firebase logout on unauthorized user:', authErr);
      }

      // Record access request in background for audit & admin approval visibility
      const newReq: GoogleAccessRequest = {
        id: user.uid,
        email: user.email,
        name: user.displayName || user.email.split('@')[0],
        photoURL: user.photoURL || undefined,
        requestedAt: new Date().toISOString(),
        status: existingReq?.status === 'rejected' ? 'rejected' : 'pending',
      };

      setAccessRequests((prev) => {
        const filtered = prev.filter((r) => r.email.toLowerCase() !== emailLower && r.id !== user.uid);
        return [newReq, ...filtered];
      });
      syncDoc(setDoc(doc(db, 'access_requests', user.uid), sanitizeForFirestore(newReq), { merge: true }), 'save access request');

      setIsAuthenticated(false);
      setPendingGoogleUser(null);
      localStorage.removeItem('10med_pending_google_user');
      localStorage.removeItem(STORAGE_KEYS.AUTH_STATUS);

      const unauthorizedMsg = `অননুমোদিত জিমেইল অ্যাকাউন্ট (${user.email})! এই জিমেইলটি সিস্টেমে অনুমোদিত তালিকায় নেই। শুধুমাত্র কমান্ডিং অথরিটি কর্তৃক পূর্বানুমোদিত জিমেইল দিয়ে সিস্টেমে প্রবেশ করা সম্ভব।`;
      showNotification(unauthorizedMsg);
      return {
        success: false,
        isPending: false,
        code: 'auth/unauthorized-user',
        error: unauthorizedMsg,
      };
    } catch (err: any) {
      const code = err?.code || 'auth/unknown';
      const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';
      if (code === 'auth/unauthorized-domain') {
        const msg = `ডোমেইন সিকিউরিটি বার্তা: বর্তমান ডোমেইনটি (${currentDomain}) কনসোলে অনুমোদিত নয়।`;
        showNotification(msg);
        return {
          success: false,
          code: 'auth/unauthorized-domain',
          error: msg,
          domain: currentDomain,
        };
      }
      if (code !== 'auth/popup-closed-by-user') {
        showNotification(`Google Sign-In: ${err?.message || 'Authentication failed'}`);
      }
      return {
        success: false,
        code,
        error: err?.message || 'Authentication failed',
      };
    }
  };

  const approveGoogleRequest = async (
    requestId: string,
    role: Role,
    rank: string,
    name: string,
    battery?: Battery
  ) => {
    const targetReq = accessRequests.find((r) => r.id === requestId);
    if (!targetReq) return;

    const assignedBat = battery || (isBsmRole(role) ? ((role.split(' ')[0] + ' Bty') as Battery) : 'HQ Bty');
    const updatedReq: GoogleAccessRequest = {
      ...targetReq,
      name: name || targetReq.name,
      status: 'approved',
      assignedRole: role,
      assignedRank: rank,
      assignedBattery: assignedBat,
      reviewedBy: currentUser.email || 'Owner',
      reviewedAt: new Date().toISOString(),
    };

    setAccessRequests((prev) => prev.map((r) => (r.id === requestId ? updatedReq : r)));
    syncDoc(setDoc(doc(db, 'access_requests', requestId), sanitizeForFirestore(updatedReq), { merge: true }), 'approve request');

    const approvedUser: UserAccount = {
      id: requestId,
      username: targetReq.email.split('@')[0],
      name: name || targetReq.name,
      rank: rank,
      role: role,
      assignedBattery: assignedBat,
      assignedBatteries:
        role === 'Admin' || role === 'CO' || role === 'Offr' || role === 'RSM'
          ? ['HQ Bty', 'P Bty', 'Q Bty', 'R Bty']
          : [assignedBat],
      email: targetReq.email,
      avatar: targetReq.photoURL,
      isApproved: true,
      approvedBy: currentUser.email || 'Owner',
      approvedAt: new Date().toISOString(),
      lastLogin: 'Never',
    };

    setUsersList((prev) => {
      const filtered = prev.filter((u) => u.email?.toLowerCase() !== targetReq.email.toLowerCase() && u.id !== requestId);
      return [approvedUser, ...filtered];
    });
    syncDoc(setDoc(doc(db, 'users', requestId), sanitizeForFirestore(approvedUser), { merge: true }), 'add approved user');

    showNotification(`গুগল অ্যাকাউন্ট (${targetReq.email}) সফলভাবে অনুমোদিত হয়েছে। পদবি: ${rank}, রোল: ${role}`);
    addAuditLog('Owner Approval', `Owner approved Google user ${targetReq.email} as ${rank} (${role})`, 'SECURITY');
  };

  const rejectGoogleRequest = async (requestId: string) => {
    const targetReq = accessRequests.find((r) => r.id === requestId);
    if (!targetReq) return;

    const updatedReq: GoogleAccessRequest = {
      ...targetReq,
      status: 'rejected',
      reviewedBy: currentUser.email || 'Owner',
      reviewedAt: new Date().toISOString(),
    };

    setAccessRequests((prev) => prev.map((r) => (r.id === requestId ? updatedReq : r)));
    syncDoc(setDoc(doc(db, 'access_requests', requestId), sanitizeForFirestore(updatedReq), { merge: true }), 'reject request');

    setUsersList((prev) =>
      prev.map((u) => (u.email?.toLowerCase() === targetReq.email.toLowerCase() ? { ...u, isApproved: false } : u))
    );

    showNotification(`গুগল অ্যাকাউন্ট (${targetReq.email})-এর অনুরোধ প্রত্যাখ্যান করা হয়েছে।`);
    addAuditLog('Owner Rejection', `Owner rejected Google user ${targetReq.email}`, 'SECURITY');
  };

  const preApproveGoogleUser = async (
    email: string,
    name: string,
    rank: string,
    role: Role,
    battery?: Battery
  ) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      showNotification('অনুগ্রহ করে সঠিক জিমেইল অ্যাড্রেস লিখুন।');
      return;
    }

    const assignedBat = battery || (isBsmRole(role) ? ((role.split(' ')[0] + ' Bty') as Battery) : 'HQ Bty');
    const newId = `approved_${Date.now()}`;
    const approvedUser: UserAccount = {
      id: newId,
      username: cleanEmail.split('@')[0],
      name: name.trim() || cleanEmail.split('@')[0],
      rank: rank,
      role: role,
      assignedBattery: assignedBat,
      assignedBatteries:
        role === 'Admin' || role === 'CO' || role === 'Offr' || role === 'RSM'
          ? ['HQ Bty', 'P Bty', 'Q Bty', 'R Bty']
          : [assignedBat],
      email: cleanEmail,
      isApproved: true,
      approvedBy: currentUser.email || 'Owner',
      approvedAt: new Date().toISOString(),
      lastLogin: 'Never',
    };

    setUsersList((prev) => {
      const filtered = prev.filter((u) => u.email?.toLowerCase() !== cleanEmail);
      return [approvedUser, ...filtered];
    });
    syncDoc(setDoc(doc(db, 'users', newId), sanitizeForFirestore(approvedUser), { merge: true }), 'pre-approve user');

    if (isSupabaseConfigured()) {
      syncAuthorizedUsersToSupabase([approvedUser]).catch((e) => console.warn('Supabase sync pre-approve error:', e));
    }

    const preApprovedReq: GoogleAccessRequest = {
      id: newId,
      email: cleanEmail,
      name: name.trim() || cleanEmail.split('@')[0],
      requestedAt: new Date().toISOString(),
      status: 'approved',
      assignedRole: role,
      assignedRank: rank,
      assignedBattery: assignedBat,
      reviewedBy: currentUser.email || 'Owner',
      reviewedAt: new Date().toISOString(),
    };
    setAccessRequests((prev) => {
      const filtered = prev.filter((r) => r.email.toLowerCase() !== cleanEmail);
      return [preApprovedReq, ...filtered];
    });
    syncDoc(setDoc(doc(db, 'access_requests', newId), sanitizeForFirestore(preApprovedReq), { merge: true }), 'pre-approve request');

    showNotification(`জিমেইল (${cleanEmail}) সফলভাবে অগ্রিম অনুমোদন করা হয়েছে।`);
    addAuditLog('Pre-Approve Google Email', `Owner pre-approved ${cleanEmail} as ${rank} (${role})`, 'SECURITY');
  };

  const revokeGoogleUserApproval = async (userIdOrEmail: string) => {
    const clean = userIdOrEmail.toLowerCase();
    let revokedUserObj: UserAccount | undefined;
    setUsersList((prev) =>
      prev.map((u) => {
        if (u.id === userIdOrEmail || u.email?.toLowerCase() === clean) {
          const rev = { ...u, isApproved: false };
          revokedUserObj = rev;
          return rev;
        }
        return u;
      })
    );
    if (revokedUserObj && isSupabaseConfigured()) {
      syncAuthorizedUsersToSupabase([revokedUserObj]).catch((e) => console.warn('Supabase sync revoke error:', e));
    }
    setAccessRequests((prev) =>
      prev.map((r) => {
        if (r.id === userIdOrEmail || r.email.toLowerCase() === clean) {
          return { ...r, status: 'rejected' };
        }
        return r;
      })
    );
    showNotification(`ব্যবহারকারীর অ্যাক্সেস অনুমোদন প্রত্যাহার করা হয়েছে।`);
    addAuditLog('Revoke Google Access', `Access revoked for ${userIdOrEmail}`, 'SECURITY');
  };

  const updateGoogleUserRole = async (email: string, newRole: Role, newBattery?: Battery) => {
    const cleanEmail = email.trim().toLowerCase();
    const assignedBat =
      newBattery || (isBsmRole(newRole) ? ((newRole.split(' ')[0] + ' Bty') as Battery) : 'HQ Bty');

    let updatedAccountForSupabase: UserAccount | undefined;
    setUsersList((prev) => {
      const match = prev.find((u) => u.email?.toLowerCase() === cleanEmail);
      if (match) {
        const updated: UserAccount = {
          ...match,
          role: newRole,
          assignedBattery: assignedBat,
          assignedBatteries:
            newRole === 'CO' || newRole === 'Admin' || newRole === 'Offr' || newRole === 'RSM'
              ? ['HQ Bty', 'P Bty', 'Q Bty', 'R Bty']
              : [assignedBat],
        };
        updatedAccountForSupabase = updated;
        if (currentUser.email?.toLowerCase() === cleanEmail) {
          setCurrentUserState(updated);
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated));
        }
        syncDoc(setDoc(doc(db, 'users', match.id), sanitizeForFirestore(updated), { merge: true }), 'update user role');
        return prev.map((u) => (u.id === match.id ? updated : u));
      } else {
        const newId = `user_${Date.now()}`;
        const newAcct: UserAccount = {
          id: newId,
          username: cleanEmail.split('@')[0],
          name: cleanEmail.split('@')[0],
          rank: newRole === 'Admin' ? 'Admin' : isBsmRole(newRole) ? 'Sgt' : 'Capt',
          role: newRole,
          assignedBattery: assignedBat,
          assignedBatteries:
            newRole === 'CO' || newRole === 'Admin' || newRole === 'Offr' || newRole === 'RSM'
              ? ['HQ Bty', 'P Bty', 'Q Bty', 'R Bty']
              : [assignedBat],
          email: cleanEmail,
          isApproved: true,
          approvedBy: currentUser.email || 'Owner',
          approvedAt: new Date().toISOString(),
          lastLogin: 'Never',
        };
        updatedAccountForSupabase = newAcct;
        if (currentUser.email?.toLowerCase() === cleanEmail) {
          setCurrentUserState(newAcct);
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newAcct));
        }
        syncDoc(setDoc(doc(db, 'users', newId), sanitizeForFirestore(newAcct), { merge: true }), 'create user role');
        return [newAcct, ...prev];
      }
    });

    if (updatedAccountForSupabase && isSupabaseConfigured()) {
      syncAuthorizedUsersToSupabase([updatedAccountForSupabase]).catch((e) => console.warn('Supabase sync role error:', e));
    }

    setAccessRequests((prev) =>
      prev.map((r) => {
        if (r.email.toLowerCase() === cleanEmail) {
          const updatedReq: GoogleAccessRequest = {
            ...r,
            status: 'approved',
            assignedRole: newRole,
            assignedBattery: assignedBat,
          };
          syncDoc(setDoc(doc(db, 'access_requests', r.id), sanitizeForFirestore(updatedReq), { merge: true }), 'update req role');
          return updatedReq;
        }
        return r;
      })
    );

    showNotification(`গুগল ব্যবহারকারীর রোল পরিবর্তন করে "${newRole}" করা হয়েছে।`);
    addAuditLog('Role Update', `Changed role for ${cleanEmail} to ${newRole}`, 'SECURITY');
  };

  const checkPendingApprovalStatus = async (): Promise<boolean> => {
    if (!pendingGoogleUser?.email) return false;
    const emailLower = pendingGoogleUser.email.toLowerCase();

    if (OWNER_EMAILS.some((o) => o.toLowerCase() === emailLower)) {
      const existing = usersList.find((u) => u.email?.toLowerCase() === emailLower);
      const chosenRole: Role = existing?.role || 'Admin';
      const chosenRank: string = existing?.rank || 'Owner / Admin';
      const chosenBat: Battery = existing?.assignedBattery || 'HQ Bty';
      const ownerAcct: UserAccount = {
        id: pendingGoogleUser.uid || 'u-owner',
        username: existing?.username || 'owner',
        name: existing?.name || pendingGoogleUser.name || 'Regiment Owner',
        rank: chosenRank,
        role: chosenRole,
        assignedBattery: chosenBat,
        assignedBatteries: existing?.assignedBatteries || ['HQ Bty', 'P Bty', 'Q Bty', 'R Bty'],
        email: pendingGoogleUser.email,
        avatar: pendingGoogleUser.photoURL,
        isApproved: true,
        approvedBy: 'System / Owner',
        approvedAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };
      setCurrentUserState(ownerAcct);
      setRealUser(ownerAcct);
      setIsAuthenticated(true);
      setPendingGoogleUser(null);
      localStorage.removeItem('10med_pending_google_user');
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(ownerAcct));
      localStorage.setItem(STORAGE_KEYS.REAL_USER, JSON.stringify(ownerAcct));
      localStorage.setItem(STORAGE_KEYS.AUTH_STATUS, 'true');
      setActivePage('admin_panel');
      showNotification('ওনার হিসেবে প্রবেশাধিকার উন্মুক্ত করা হয়েছে!');
      return true;
    }

    try {
      if (pendingGoogleUser.uid) {
        const docSnap = await getDocFromServer(doc(db, 'access_requests', pendingGoogleUser.uid));
        if (docSnap.exists()) {
          const reqData = docSnap.data() as GoogleAccessRequest;
          if (reqData.status === 'approved') {
            const assignedBat = reqData.assignedBattery || 'HQ Bty';
            const approvedAcct: UserAccount = {
              id: pendingGoogleUser.uid,
              username: pendingGoogleUser.email.split('@')[0],
              name: reqData.name || pendingGoogleUser.name || 'Authorized Personnel',
              rank: reqData.assignedRank || 'Capt',
              role: reqData.assignedRole || 'Offr',
              assignedBattery: assignedBat,
              assignedBatteries:
                reqData.assignedRole === 'CO' || reqData.assignedRole === 'Admin' || reqData.assignedRole === 'Offr' || reqData.assignedRole === 'RSM'
                  ? ['HQ Bty', 'P Bty', 'Q Bty', 'R Bty']
                  : [assignedBat],
              email: pendingGoogleUser.email,
              avatar: pendingGoogleUser.photoURL,
              isApproved: true,
              approvedBy: reqData.reviewedBy || 'Owner',
              approvedAt: reqData.reviewedAt || new Date().toISOString(),
              lastLogin: new Date().toISOString(),
            };
            setCurrentUserState(approvedAcct);
            setRealUser(approvedAcct);
            setIsAuthenticated(true);
            setPendingGoogleUser(null);
            localStorage.removeItem('10med_pending_google_user');
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(approvedAcct));
            localStorage.setItem(STORAGE_KEYS.REAL_USER, JSON.stringify(approvedAcct));
            localStorage.setItem(STORAGE_KEYS.AUTH_STATUS, 'true');

            if (approvedAcct.role === 'CO') setActivePage('co_dashboard');
            else if (approvedAcct.role === 'Offr') setActivePage('offr_dashboard');
            else if (approvedAcct.role === 'RSM') setActivePage('rsm_dashboard');
            else if (approvedAcct.role === 'Admin') setActivePage('admin_panel');
            else if (isBsmRole(approvedAcct.role)) setActivePage('battery_dashboard');
            else setActivePage('main_dashboard');

            showNotification('আপনার অ্যাকাউন্টটি ওনার কর্তৃক অনুমোদিত হয়েছে! সিস্টেমে স্বাগতম।');
            return true;
          }
        }
      }
    } catch (e) {
      console.warn('Could not fetch doc from server:', e);
    }

    const localReq = accessRequests.find((r) => r.email.toLowerCase() === emailLower);
    const localApprovedUser = usersList.find((u) => u.email?.toLowerCase() === emailLower && u.isApproved !== false);

    if (localApprovedUser || localReq?.status === 'approved') {
      const assignedRole = localApprovedUser?.role || localReq?.assignedRole || 'Offr';
      const assignedRank = localApprovedUser?.rank || localReq?.assignedRank || 'Capt';
      const assignedBat = localApprovedUser?.assignedBattery || localReq?.assignedBattery || 'HQ Bty';
      const approvedAcct: UserAccount = {
        id: localApprovedUser?.id || localReq?.id || pendingGoogleUser.uid || `u-${Date.now()}`,
        username: pendingGoogleUser.email.split('@')[0],
        name: localApprovedUser?.name || localReq?.name || pendingGoogleUser.name || 'Authorized Personnel',
        rank: assignedRank,
        role: assignedRole,
        assignedBattery: assignedBat,
        assignedBatteries:
          assignedRole === 'CO' || assignedRole === 'Admin' || assignedRole === 'Offr' || assignedRole === 'RSM'
            ? ['HQ Bty', 'P Bty', 'Q Bty', 'R Bty']
            : [assignedBat],
        email: pendingGoogleUser.email,
        avatar: pendingGoogleUser.photoURL,
        isApproved: true,
        lastLogin: new Date().toISOString(),
      };
      setCurrentUserState(approvedAcct);
      setRealUser(approvedAcct);
      setIsAuthenticated(true);
      setPendingGoogleUser(null);
      localStorage.removeItem('10med_pending_google_user');
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(approvedAcct));
      localStorage.setItem(STORAGE_KEYS.REAL_USER, JSON.stringify(approvedAcct));
      localStorage.setItem(STORAGE_KEYS.AUTH_STATUS, 'true');

      if (approvedAcct.role === 'CO') setActivePage('co_dashboard');
      else if (approvedAcct.role === 'Offr') setActivePage('offr_dashboard');
      else if (approvedAcct.role === 'RSM') setActivePage('rsm_dashboard');
      else if (approvedAcct.role === 'Admin') setActivePage('admin_panel');
      else if (isBsmRole(approvedAcct.role)) setActivePage('battery_dashboard');
      else setActivePage('main_dashboard');

      showNotification('আপনার অ্যাকাউন্টটি অনুমোদিত হয়েছে! সিস্টেমে স্বাগতম।');
      return true;
    }

    showNotification('আপনার অ্যাকাউন্টটি এখনও ওনারের অনুমোদনের অপেক্ষায় রয়েছে।');
    return false;
  };

  const loginWithCredentials = (
    usernameInput: string,
    passwordInput: string
  ): { success: boolean; error?: string } => {
    const cleanU = usernameInput.trim().toLowerCase();
    const cleanP = passwordInput.trim();

    if (!cleanU) {
      return { success: false, error: 'অনুগ্রহ করে ইউজারনেম প্রদান করুন।' };
    }
    if (!cleanP) {
      return { success: false, error: 'অনুগ্রহ করে পাসওয়ার্ড প্রদান করুন।' };
    }

    // Look up user by username or email (case-insensitive)
    const user =
      (cleanU === 'guest' ? GUEST_USER : null) ||
      usersList.find((u) => u.username.toLowerCase() === cleanU || u.email?.toLowerCase() === cleanU) ||
      INITIAL_USERS.find((u) => u.username.toLowerCase() === cleanU || u.email?.toLowerCase() === cleanU);

    if (!user) {
      return { success: false, error: 'ভুল ইউজারনেম! এই ইউজারনেমে কোনো অ্যাকাউন্ট পাওয়া যায়নি।' };
    }

    // Check system access policies
    if (user.role === 'Guest' || cleanU === 'guest') {
      if (!systemSettings.allowGuestMode) {
        return { success: false, error: 'গেস্ট মোড অ্যাডমিন কর্তৃক সাময়িকভাবে বন্ধ রাখা হয়েছে।' };
      }
    } else if (user.role !== 'Admin' && cleanU !== 'admin') {
      if (!systemSettings.allowPasskeyLogin) {
        return {
          success: false,
          error: 'পাসকি দিয়ে সরাসরি লগইন বর্তমানে নিষ্ক্রিয় রয়েছে। অনুগ্রহ করে অনুমোদিত গুগল সাইন-ইন ব্যবহার করুন।',
        };
      }
      if (systemSettings.maintenanceMode) {
        return {
          success: false,
          error:
            systemSettings.maintenanceMessage ||
            'সিস্টেমে ইমার্জেন্সি রক্ষণাবেক্ষণ চলছে। শুধুমাত্র অ্যাডমিন লগইন অনুমোদিত।',
        };
      }
    }

    // Password verification: Admin default is admin123; Guest default is guest123
    let validPassword = user.password;
    if (!validPassword) {
      if (
        user.role === 'Admin' ||
        user.username.toLowerCase() === 'admin' ||
        (user.email && OWNER_EMAILS.some((o) => o.toLowerCase() === user.email!.toLowerCase()))
      ) {
        validPassword = 'admin123';
      } else if (user.role === 'Guest' || user.username.toLowerCase() === 'guest') {
        validPassword = 'guest123';
      } else {
        return { success: false, error: 'এই ব্যবহারকারীর জন্য পাসওয়ার্ড এখনও সেট করা হয়নি! অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।' };
      }
    }

    if (cleanP !== validPassword) {
      return { success: false, error: 'ভুল পাসওয়ার্ড! অনুগ্রহ করে সঠিক পাসওয়ার্ড প্রদান করুন।' };
    }

    // Login successful
    setCurrentUserState(user);
    setRealUser(user);
    setIsAuthenticated(true);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    localStorage.setItem(STORAGE_KEYS.REAL_USER, JSON.stringify(user));
    localStorage.setItem(STORAGE_KEYS.AUTH_STATUS, 'true');

    // Route to designated dashboard based on role
    if (user.role === 'CO') {
      setActivePage('co_dashboard');
    } else if (user.role === 'Offr') {
      setActivePage('offr_dashboard');
    } else if (user.role === 'RSM') {
      setActivePage('rsm_dashboard');
    } else if (user.role === 'Admin') {
      setActivePage('admin_panel');
    } else if (isBsmRole(user.role)) {
      const bty =
        user.assignedBattery ||
        (user.role === 'P BSM'
          ? 'P Bty'
          : user.role === 'Q BSM'
          ? 'Q Bty'
          : user.role === 'R BSM'
          ? 'R Bty'
          : user.role === 'HQ BSM'
          ? 'HQ Bty'
          : 'P Bty');
      setSelectedBatteryFilter(bty);
      setActivePage('battery_dashboard');
    } else {
      setActivePage('main_dashboard');
    }

    showNotification(`স্বাগতম! ${user.rank} ${user.name} (${user.role}) হিসেবে সফলভাবে লগইন হয়েছে।`);
    addAuditLog('User Login', `User ${user.name} (${user.role}) authenticated successfully`, 'SECURITY');
    return { success: true };
  };

  const logout = async () => {
    try {
      if (firebaseUser) {
        await logoutFirebase();
      }
    } catch (err: any) {
      console.warn('Firebase logout warning:', err);
    }
    setIsAuthenticated(false);
    setRealUser(null);
    setPendingGoogleUser(null);
    localStorage.removeItem('10med_pending_google_user');
    localStorage.removeItem(STORAGE_KEYS.REAL_USER);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.AUTH_STATUS);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_PAGE);
    setActivePage('login');
    showNotification('সফলভাবে লগআউট সম্পন্ন হয়েছে।');
    addAuditLog('Logout', `User ${currentUser.name} signed out`, 'SECURITY');
  };

  const setCustomLogo = (logo: string | null) => {
    setCustomLogoState(logo);
    if (logo) {
      localStorage.setItem(STORAGE_KEYS.LOGO, logo);
      addAuditLog('Logo Updated (Admin)', 'Admin updated unit heraldic logo', 'SECURITY');
    } else {
      localStorage.removeItem(STORAGE_KEYS.LOGO);
      addAuditLog('Logo Reset (Admin)', 'Admin restored default unit logo', 'SECURITY');
    }
    // Sync to Firestore settings
    syncDoc(
      setDoc(
        doc(db, 'settings', 'regiment_settings'),
        sanitizeForFirestore({ customLogo: logo, unitName: '10 Med Regt Arty', updatedAt: new Date().toISOString() }),
        { merge: true }
      ),
      'save settings'
    );
  };

  const syncNominalRollToCloud = async () => {
    try {
      showNotification('Supabase PostgreSQL ডাটাবেজে ৬০৬ জন সদস্য সিঙ্ক করা হচ্ছে...');
      const res = await syncPersonnelToSupabase(INITIAL_PERSONNEL);
      if (res.success) {
        setPersonnelList(INITIAL_PERSONNEL);
        setCloudPermissionDenied(false);
        showNotification('সফলভাবে ৬০৬ জন সদস্য Supabase ডাটাবেজে সিঙ্ক হয়েছে!');
      } else {
        showNotification('Supabase সিঙ্ক নোট: ' + (res.error || 'ব্যর্থ হয়েছে'));
      }
    } catch (e: any) {
      showNotification('সিঙ্ক ত্রুটি: ' + (e?.message || 'ব্যর্থ হয়েছে'));
    }
  };

  const syncAllToCloud = async (): Promise<{ success: boolean; count?: number; error?: string }> => {
    try {
      showNotification('রেজিমেন্টের সকল ডাটা Supabase PostgreSQL ক্লাউডে সিঙ্ক করা হচ্ছে...');
      const pRes = await syncPersonnelToSupabase(personnelList);
      const uRes = await syncAuthorizedUsersToSupabase(usersList);

      const total = (pRes.count || 0) + (uRes.count || 0);
      setCloudPermissionDenied(false);
      addAuditLog('Cloud Full Sync', `Pushed ${personnelList.length} personnel & ${usersList.length} users to Supabase`, 'SYSTEM');
      showNotification(`সফলভাবে ${personnelList.length} জন সদস্য ও অনুমোদিত ইউজার Supabase ক্লাউডে সিঙ্ক হয়েছে!`);
      return { success: true, count: total };
    } catch (e: any) {
      console.error('Error syncing all to cloud:', e);
      showNotification('ক্লাউড সিঙ্ক এরর: ' + (e?.message || 'Failed'));
      return { success: false, error: e?.message || 'Sync failed' };
    }
  };

  const [isSupabaseReady, setIsSupabaseReady] = useState<boolean>(isSupabaseConfigured());

  const syncToSupabase = async (): Promise<{ success: boolean; message: string; count?: number }> => {
    if (!isSupabaseConfigured()) {
      const msg = 'Supabase কনফিগারেশন সেট করা হয়নি। অনুগ্রহ করে .env ফাইলে VITE_SUPABASE_URL এবং VITE_SUPABASE_ANON_KEY সেট করুন।';
      showNotification(msg);
      return { success: false, message: msg };
    }
    showNotification('Supabase PostgreSQL ডাটাবেজে সিঙ্ক শুরু হচ্ছে...');
    try {
      const [pRes, uRes] = await Promise.all([
        syncPersonnelToSupabase(personnelList),
        syncAuthorizedUsersToSupabase(usersList),
      ]);

      if (pRes.success && uRes.success) {
        const total = pRes.count + uRes.count;
        const msg = `সফলভাবে ${pRes.count} জন সৈন্য এবং ${uRes.count} জন ইউজার Supabase-এ সিঙ্ক সম্পন্ন হয়েছে!`;
        showNotification(msg);
        addAuditLog('Supabase Cloud Sync', `Synchronized ${pRes.count} personnel and ${uRes.count} authorized accounts`, 'SYSTEM');
        return { success: true, count: total, message: msg };
      } else {
        const err = pRes.error || uRes.error || 'Supabase সিঙ্ক ব্যর্থ হয়েছে।';
        showNotification(`Supabase ত্রুটি: ${err}`);
        return { success: false, message: err };
      }
    } catch (err: any) {
      const msg = `Supabase সিঙ্ক ব্যর্থ: ${err?.message || 'Unknown error'}`;
      showNotification(msg);
      return { success: false, message: msg };
    }
  };

  const syncUsersToSupabaseCloud = async (): Promise<{ success: boolean; count?: number; error?: string }> => {
    try {
      if (!isSupabaseConfigured()) {
        const msg = 'Supabase কনফিগারেশন পাওয়া যায়নি।';
        showNotification(msg);
        return { success: false, error: msg };
      }
      showNotification('ইউজার তালিকা Supabase ক্লাউডে সিঙ্ক করা হচ্ছে...');
      const res = await syncAuthorizedUsersToSupabase(usersList);
      if (res.success) {
        showNotification(`সফলভাবে ${res.count} জন ইউজার Supabase-এ সিঙ্ক সম্পন্ন হয়েছে!`);
        addAuditLog('Supabase Users Sync', `Synchronized ${res.count} user accounts to Supabase`, 'SYSTEM');
        return { success: true, count: res.count };
      } else {
        showNotification(`সিঙ্ক ত্রুটি: ${res.error || 'ব্যর্থ হয়েছে'}`);
        return { success: false, error: res.error };
      }
    } catch (err: any) {
      const msg = err?.message || 'Supabase Users sync failed';
      showNotification(`সিঙ্ক ত্রুটি: ${msg}`);
      return { success: false, error: msg };
    }
  };

  const updateSystemSettings = (updated: Partial<SystemSettings>): boolean => {
    if (isGuest) {
      showNotification('Guest mode is view-only. You cannot make any changes.');
      return false;
    }
    setSystemSettings((prev) => {
      const next: SystemSettings = {
        ...prev,
        ...updated,
        lastUpdated: new Date().toISOString(),
        updatedBy: currentUser.name || currentUser.username,
      };
      localStorage.setItem(STORAGE_KEYS.SYSTEM_SETTINGS, JSON.stringify(next));
      syncDoc(
        setDoc(
          doc(db, 'settings', 'regiment_settings'),
          sanitizeForFirestore({ systemSettings: next, unitName: next.unitName }),
          { merge: true }
        ),
        'update system settings'
      );
      return next;
    });
    addAuditLog('SYSTEM_SETTINGS_UPDATE', `Updated system configuration: ${Object.keys(updated).join(', ')}`, 'SYSTEM');
    showNotification('সিস্টেম সেটিংস সফলভাবে আপডেট করা হয়েছে।');
    return true;
  };

  const exportSystemBackup = () => {
    const fullBackup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      exportedBy: currentUser.name || currentUser.username,
      regiment: systemSettings.unitName,
      systemSettings,
      personnelList,
      usersList,
      categoriesList,
      subUnitsList,
      ranksList,
      tradesList,
      authEstablishmentList,
      calculationConfig,
      dailyParadePoints,
      paradeTypes,
      paradeRecords,
      paradeDutyAssignments,
      dutySessionStatuses,
      accessRequests,
      auditLogs,
      customLogo,
    };
    const jsonStr = JSON.stringify(fullBackup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanUnit = (systemSettings.unitName || '10_MED_REGT').replace(/[^a-zA-Z0-9]/g, '_');
    a.download = `${cleanUnit}_BACKUP_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addAuditLog('SYSTEM_BACKUP_EXPORT', 'Exported complete database JSON backup', 'SYSTEM');
    showNotification('পূর্ণাঙ্গ ডাটাবেজ ব্যাকআপ ফাইল ডাউনলোড সম্পন্ন হয়েছে।');
  };

  const importSystemBackup = (backupData: any): boolean => {
    if (isGuest) {
      showNotification('Guest mode is view-only.');
      return false;
    }
    if (!backupData || typeof backupData !== 'object') {
      showNotification('অকার্যকর ফাইল ফরম্যাট!');
      return false;
    }
    try {
      if (backupData.systemSettings) {
        setSystemSettings(backupData.systemSettings);
        localStorage.setItem(STORAGE_KEYS.SYSTEM_SETTINGS, JSON.stringify(backupData.systemSettings));
      }
      if (Array.isArray(backupData.personnelList)) {
        setPersonnelList(backupData.personnelList);
        localStorage.setItem(STORAGE_KEYS.PERSONNEL, JSON.stringify(backupData.personnelList));
      }
      if (Array.isArray(backupData.usersList)) {
        setUsersList(backupData.usersList);
        localStorage.setItem(STORAGE_KEYS.USERS_LIST, JSON.stringify(backupData.usersList));
      }
      if (Array.isArray(backupData.categoriesList)) {
        setCategoriesList(backupData.categoriesList);
        localStorage.setItem(STORAGE_KEYS.SYSTEM_CATEGORIES, JSON.stringify(backupData.categoriesList));
      }
      if (Array.isArray(backupData.subUnitsList)) {
        setSubUnitsList(backupData.subUnitsList);
        localStorage.setItem(STORAGE_KEYS.SUB_UNITS, JSON.stringify(backupData.subUnitsList));
      }
      if (Array.isArray(backupData.ranksList)) {
        setRanksList(backupData.ranksList);
        localStorage.setItem(STORAGE_KEYS.MILITARY_RANKS, JSON.stringify(backupData.ranksList));
      }
      if (Array.isArray(backupData.tradesList)) {
        setTradesList(backupData.tradesList);
        localStorage.setItem(STORAGE_KEYS.MILITARY_TRADES, JSON.stringify(backupData.tradesList));
      }
      if (Array.isArray(backupData.authEstablishmentList)) {
        setAuthEstablishmentList(backupData.authEstablishmentList);
        localStorage.setItem(STORAGE_KEYS.AUTH_ESTABLISHMENT, JSON.stringify(backupData.authEstablishmentList));
      }
      if (backupData.calculationConfig) {
        setCalculationConfig(backupData.calculationConfig);
        localStorage.setItem(STORAGE_KEYS.CALCULATION_CONFIG, JSON.stringify(backupData.calculationConfig));
      }
      if (Array.isArray(backupData.dailyParadePoints)) {
        setDailyParadePoints(backupData.dailyParadePoints);
        localStorage.setItem(STORAGE_KEYS.PARADE_POINTS, JSON.stringify(backupData.dailyParadePoints));
      }
      if (Array.isArray(backupData.paradeTypes)) {
        setParadeTypes(backupData.paradeTypes);
        localStorage.setItem(STORAGE_KEYS.PARADE_TYPES, JSON.stringify(backupData.paradeTypes));
      }
      if (backupData.paradeRecords && typeof backupData.paradeRecords === 'object') {
        setParadeRecords(backupData.paradeRecords);
        localStorage.setItem(STORAGE_KEYS.PARADE_RECORDS, JSON.stringify(backupData.paradeRecords));
      }
      if (backupData.customLogo) {
        setCustomLogoState(backupData.customLogo);
        localStorage.setItem(STORAGE_KEYS.LOGO, backupData.customLogo);
      }
      addAuditLog('SYSTEM_BACKUP_RESTORE', 'Restored complete database from backup file', 'SYSTEM');
      showNotification('ব্যাকআপ সফলভাবে রিস্টোর করা হয়েছে!');
      return true;
    } catch (e: any) {
      showNotification('রিস্টোর ত্রুটি: ' + e.message);
      return false;
    }
  };

  const resetSystemToDefaults = () => {
    if (isGuest) {
      showNotification('Guest mode is view-only.');
      return;
    }
    setSystemSettings(DEFAULT_SYSTEM_SETTINGS);
    setPersonnelList(INITIAL_PERSONNEL);
    setUsersList(INITIAL_USERS);
    setCategoriesList(INITIAL_SYSTEM_CATEGORIES);
    setSubUnitsList(INITIAL_SUB_UNITS);
    setRanksList(INITIAL_RANKS);
    setTradesList(INITIAL_TRADES);
    setAuthEstablishmentList(INITIAL_AUTH_ESTABLISHMENT);
    setCalculationConfig(INITIAL_CALCULATION_CONFIG);
    setDailyParadePoints(INITIAL_PARADE_POINTS);
    setCustomLogoState(null);

    localStorage.setItem(STORAGE_KEYS.SYSTEM_SETTINGS, JSON.stringify(DEFAULT_SYSTEM_SETTINGS));
    localStorage.setItem(STORAGE_KEYS.PERSONNEL, JSON.stringify(INITIAL_PERSONNEL));
    localStorage.setItem(STORAGE_KEYS.USERS_LIST, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEYS.SYSTEM_CATEGORIES, JSON.stringify(INITIAL_SYSTEM_CATEGORIES));
    localStorage.setItem(STORAGE_KEYS.SUB_UNITS, JSON.stringify(INITIAL_SUB_UNITS));
    localStorage.setItem(STORAGE_KEYS.MILITARY_RANKS, JSON.stringify(INITIAL_RANKS));
    localStorage.setItem(STORAGE_KEYS.MILITARY_TRADES, JSON.stringify(INITIAL_TRADES));
    localStorage.setItem(STORAGE_KEYS.AUTH_ESTABLISHMENT, JSON.stringify(INITIAL_AUTH_ESTABLISHMENT));
    localStorage.setItem(STORAGE_KEYS.CALCULATION_CONFIG, JSON.stringify(INITIAL_CALCULATION_CONFIG));
    localStorage.setItem(STORAGE_KEYS.PARADE_POINTS, JSON.stringify(INITIAL_PARADE_POINTS));
    localStorage.removeItem(STORAGE_KEYS.LOGO);

    addAuditLog('FACTORY_RESET', 'System was restored to factory defaults', 'SYSTEM');
    showNotification('সিস্টেম ফ্যাক্টরি ডিফল্ট-এ সফলভাবে ফিরিয়ে নেওয়া হয়েছে।');
  };

  const addAuditLog = (action: string, details: string, category: AuditLogItem['category']) => {
    const newLog: AuditLogItem = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      action,
      performedBy: `${currentUser.rank} ${currentUser.name} (${currentUser.role})`,
      role: currentUser.role,
      details,
      category,
    };
    // Optimistic local update
    setAuditLogs((prev) => [newLog, ...prev.slice(0, 99)]);
    // Firestore append-only write (Immutable)
    syncDoc(setDoc(doc(db, 'audit_logs', newLog.id), sanitizeForFirestore(newLog)), 'audit log');
  };

  const setCurrentUser = (user: UserAccount) => {
    setCurrentUserState(user);
    addAuditLog('User Session Changed', `Switched active profile to ${user.name} (${user.role})`, 'SECURITY');
  };

  const switchRole = (role: Role, battery?: Battery) => {
    if (!isRealAdmin && !isGuest) {
      showNotification('শুধুমাত্র এডমিন এবং গেস্ট সিমুলেটর ব্যবহার করতে পারেন।');
      return;
    }
    const matchingUser =
      usersList.find((u) => u.role === role) ||
      INITIAL_USERS.find((u) => u.role === role) ||
      (isBsmRole(role)
        ? usersList.find((u) => isBsmRole(u.role)) || INITIAL_USERS.find((u) => isBsmRole(u.role))
        : null);
    if (matchingUser) {
      let defaultBty: Battery | undefined = battery || matchingUser.assignedBattery;
      if (!defaultBty) {
        if (role === 'P BSM' || role === 'BSM') defaultBty = 'P Bty';
        else if (role === 'Q BSM') defaultBty = 'Q Bty';
        else if (role === 'R BSM') defaultBty = 'R Bty';
        else if (role === 'HQ BSM') defaultBty = 'HQ Bty';
      }
      const updatedUser: UserAccount = {
        ...matchingUser,
        role,
        assignedBattery: defaultBty,
      };
      setCurrentUserState(updatedUser);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));

      // Auto-route to corresponding role dashboard
      if (role === 'CO') {
        setActivePage('co_dashboard');
      } else if (role === 'Offr') {
        setActivePage('offr_dashboard');
      } else if (role === 'RSM') {
        setActivePage('rsm_dashboard');
      } else if (role === 'Admin') {
        setActivePage('admin_panel');
      } else if (isBsmRole(role)) {
        if (defaultBty) setSelectedBatteryFilter(defaultBty);
        setActivePage('battery_dashboard');
      } else {
        setActivePage('main_dashboard');
      }

      showNotification(
        isGuest
          ? `GUEST — VIEW ONLY: রোল সিমুলেশন পরিবর্তিত হয়েছে ${role}${updatedUser.assignedBattery ? ` (${updatedUser.assignedBattery})` : ''}`
          : `সিমুলেশন মোড: সক্রিয় রোল পরিবর্তিত হয়েছে ${role}${updatedUser.assignedBattery ? ` (${updatedUser.assignedBattery})` : ''}`
      );
      if (!isGuest) {
        addAuditLog('Role Switch', `Admin switched simulation view mode to ${role}`, 'SECURITY');
      }
    }
  };

  const addUser = (user: Omit<UserAccount, 'id'>) => {
    if (isGuest) {
      showNotification('গেস্ট মোডে নতুন ইউজার যোগ করা যাবে না (GUEST — VIEW ONLY)।');
      return;
    }
    const newId = 'u-' + Date.now();
    const newUser: UserAccount = {
      ...user,
      id: newId,
      assignedBattery:
        user.assignedBatteries && user.assignedBatteries.length > 0 ? user.assignedBatteries[0] : user.assignedBattery,
      lastLogin: 'Never',
    };
    setUsersList((prev) => [...prev, newUser]);
    showNotification(`User account @${newUser.username} (${newUser.rank} ${newUser.name}) created successfully.`);
    addAuditLog(
      'User Created (Admin)',
      `Created user @${newUser.username} with role ${newUser.role} & assigned btys: ${
        newUser.assignedBatteries?.join(', ') || 'All'
      }`,
      'SECURITY'
    );
    // Sync to Firestore
    syncDoc(setDoc(doc(db, 'users', newId), sanitizeForFirestore(newUser)), 'add user');

    // Sync to Supabase Cloud for cross-browser persistence
    if (isSupabaseConfigured()) {
      syncAuthorizedUsersToSupabase([newUser]).catch((e) =>
        console.warn('Supabase sync error on addUser:', e)
      );
    }
  };

  const updateUser = (id: string, updated: Partial<UserAccount>) => {
    if (isGuest) {
      showNotification('গেস্ট মোডে ইউজার তথ্য পরিবর্তন করা যাবে না (GUEST — VIEW ONLY)।');
      return;
    }
    let finalUpdated: UserAccount | null = null;
    setUsersList((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          finalUpdated = { ...u, ...updated };
          if (currentUser.id === id || (currentUser.email && u.email && currentUser.email.toLowerCase() === u.email.toLowerCase())) {
            setCurrentUserState(finalUpdated);
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(finalUpdated));
          }
          return finalUpdated;
        }
        return u;
      })
    );
    showNotification(`User account updated successfully.`);
    addAuditLog('User Updated (Admin)', `Modified user settings for ID ${id}`, 'SECURITY');
    // Sync to Firestore
    if (finalUpdated) {
      syncDoc(setDoc(doc(db, 'users', id), sanitizeForFirestore(finalUpdated), { merge: true }), 'update user');
      const uEmail = (finalUpdated as UserAccount).email;
      if (uEmail) {
        setAccessRequests((prev) =>
          prev.map((r) => {
            if (r.email.toLowerCase() === uEmail.toLowerCase()) {
              const updatedReq: GoogleAccessRequest = {
                ...r,
                assignedRole: (finalUpdated as UserAccount).role,
                assignedRank: (finalUpdated as UserAccount).rank,
                assignedBattery: (finalUpdated as UserAccount).assignedBattery,
              };
              syncDoc(setDoc(doc(db, 'access_requests', r.id), sanitizeForFirestore(updatedReq), { merge: true }), 'sync user to req');
              return updatedReq;
            }
            return r;
          })
        );
      }

      // Sync updated user to Supabase Cloud for cross-browser persistence
      if (isSupabaseConfigured()) {
        syncAuthorizedUsersToSupabase([finalUpdated]).catch((e) =>
          console.warn('Supabase sync error on updateUser:', e)
        );
      }
    }
  };

  const deleteUser = (id: string) => {
    if (isGuest) {
      showNotification('গেস্ট মোডে ইউজার মুছে ফেলা যাবে না (GUEST — VIEW ONLY)।');
      return;
    }
    const target = usersList.find((u) => u.id === id);
    if (!target) return;
    if (target.id === currentUser.id) {
      showNotification('Cannot delete your currently active user account.');
      return;
    }
    setUsersList((prev) => prev.filter((u) => u.id !== id));
    showNotification(`User @${target.username} (${target.name}) removed.`);
    addAuditLog('User Deleted (Admin)', `Deleted user account @${target.username} (${target.name})`, 'SECURITY');
    // Delete from Firestore
    syncDoc(deleteDoc(doc(db, 'users', id)), 'delete user');

    // Delete from Supabase Cloud for cross-browser persistence
    if (isSupabaseConfigured()) {
      deleteAuthorizedUserFromSupabase(target.id, target.email, target.username).catch((e) =>
        console.warn('Supabase delete error on deleteUser:', e)
      );
    }
  };

  const addPersonnel = (person: Omit<Personnel, 'id'>) => {
    if (isGuest) {
      showNotification('গেস্ট মোডে নতুন সৈন্য অন্তর্ভুক্তি করা যাবে না (GUEST — VIEW ONLY)।');
      return;
    }
    const newId = (personnelList.length + 1).toString();
    const newPerson: Personnel = { ...person, id: newId };
    setPersonnelList((prev) => [newPerson, ...prev]);
    showNotification(`Soldier ${newPerson.rk} ${newPerson.name} (${newPerson.snkNo}) enlisted successfully.`);
    addAuditLog(
      'Personnel Enlisted',
      `${currentUser.role} enlisted ${newPerson.rk} ${newPerson.name} (${newPerson.snkNo}) to ${newPerson.battery}`,
      'PERSONNEL'
    );
    // Write to Firestore
    syncDoc(setDoc(doc(db, 'personnel', newId), sanitizeForFirestore(newPerson)), 'add personnel');
  };

  const updatePersonnel = (id: string, updated: Partial<Personnel>) => {
    if (isGuest) {
      showNotification('গেস্ট মোডে সৈন্যের তথ্য পরিবর্তন করা যাবে না (GUEST — VIEW ONLY)।');
      return;
    }
    let updatedRecord: Personnel | null = null;
    setPersonnelList((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          updatedRecord = { ...p, ...updated };
          return updatedRecord;
        }
        return p;
      })
    );
    showNotification(`Personnel record updated successfully.`);
    addAuditLog('Personnel Updated', `Modified record for ID: ${id}`, 'PERSONNEL');
    // Write to Firestore
    if (updatedRecord) {
      syncDoc(setDoc(doc(db, 'personnel', id), sanitizeForFirestore(updatedRecord), { merge: true }), 'update personnel');
    }
  };

  const deletePersonnel = (id: string) => {
    if (isGuest) {
      showNotification('গেস্ট মোডে সৈন্যের রেকর্ড মুছে ফেলা যাবে না (GUEST — VIEW ONLY)।');
      return;
    }
    const target = personnelList.find((p) => p.id === id);
    if (target) {
      setPersonnelList((prev) => prev.filter((p) => p.id !== id));
      showNotification(`Record for ${target.rk} ${target.name} removed from active roll.`);
      addAuditLog('Personnel Deleted', `Deleted ${target.rk} ${target.name} (${target.snkNo})`, 'PERSONNEL');
      // Delete from Firestore
      syncDoc(deleteDoc(doc(db, 'personnel', id)), 'delete personnel');
    }
  };

  const updateParadeStatus = (id: string, status: ParadeStatus, statusDetails?: string) => {
    if (isGuest) {
      showNotification('গেস্ট মোডে প্যারেড স্ট্যাটাস পরিবর্তন করা যাবে না (GUEST — VIEW ONLY)।');
      return;
    }
    let updatedDoc: Partial<Personnel> | null = null;
    setPersonnelList((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const nextDetails = statusDetails ?? (status === 'Present' ? undefined : p.statusDetails);
          const nextCategory = status === 'Present' ? undefined : p.outOfUnitCategory;
          updatedDoc = {
            status,
            statusDetails: nextDetails,
            outOfUnitCategory: nextCategory,
          };
          return {
            ...p,
            ...updatedDoc,
          };
        }
        return p;
      })
    );
    const target = personnelList.find((p) => p.id === id);
    if (target) {
      showNotification(`Status for ${target.name} set to ${status}`);
      addAuditLog(
        'Parade Status Change',
        `Marked ${target.rk} ${target.name} (${target.snkNo}) as ${status}`,
        'PARADE_STATE'
      );
    }
    // Write to Firestore
    if (updatedDoc) {
      syncDoc(setDoc(doc(db, 'personnel', id), sanitizeForFirestore(updatedDoc), { merge: true }), 'update parade status');
    }
  };

  const batchUpdateStatus = (ids: string[], status: ParadeStatus, statusDetails?: string) => {
    if (isGuest) {
      showNotification('গেস্ট মোডে প্যারেড স্ট্যাটাস পরিবর্তন করা যাবে না (GUEST — VIEW ONLY)।');
      return;
    }
    setPersonnelList((prev) =>
      prev.map((p) => {
        if (ids.includes(p.id)) {
          return {
            ...p,
            status,
            statusDetails: statusDetails ?? (status === 'Present' ? undefined : p.statusDetails),
            outOfUnitCategory: status === 'Present' ? undefined : p.outOfUnitCategory,
          };
        }
        return p;
      })
    );
    showNotification(`Updated ${ids.length} soldiers to ${status}`);
    addAuditLog('Batch Status Update', `Updated ${ids.length} records to ${status}`, 'PARADE_STATE');
    // Batch sync to Firestore
    ids.forEach((id) => {
      syncDoc(
        setDoc(
          doc(db, 'personnel', id),
          sanitizeForFirestore({
            status,
            statusDetails: statusDetails ?? null,
            outOfUnitCategory: status === 'Present' ? null : undefined,
          }),
          { merge: true }
        ),
        'batch update status'
      );
    });
  };

  // Out Of Unit Handlers
  const assignOutOfUnit = (
    personnelId: string,
    category: OutOfUnitCategory,
    details: {
      location?: string;
      startDate?: string;
      endDate?: string;
      authority?: string;
      remarks?: string;
    }
  ) => {
    if (isGuest) {
      showNotification('গেস্ট মোডে আউটার ইউনিট এসাইন করা যাবে না (GUEST — VIEW ONLY)।');
      return;
    }
    let paradeStatus: ParadeStatus = 'Temp Duty';
    if (category === 'CMH') paradeStatus = 'CMH/Sick';
    else if (category === 'P/Lve' || category === 'C/Lve') paradeStatus = 'Leave';
    else if (category === 'Course') paradeStatus = 'Course/Trg';
    else if (category === 'Att') paradeStatus = 'Attached Out';
    else paradeStatus = 'Temp Duty';

    const patch: Partial<Personnel> = {
      status: paradeStatus,
      outOfUnitCategory: category,
      outOfUnitLocation: details.location,
      outOfUnitStartDate: details.startDate,
      outOfUnitEndDate: details.endDate,
      outOfUnitAuthority: details.authority,
      outOfUnitRemarks: details.remarks,
      statusDetails: `${category} - ${details.location || details.remarks || 'Out of Unit'}`,
    };

    setPersonnelList((prev) =>
      prev.map((p) => {
        if (p.id === personnelId) {
          return {
            ...p,
            ...patch,
          };
        }
        return p;
      })
    );

    const person = personnelList.find((p) => p.id === personnelId);
    showNotification(`Assigned ${person?.rk} ${person?.name} to [${category}] (${details.location || 'Out of Unit'})`);
    addAuditLog(
      'Out Of Unit Assignment',
      `Assigned ${person?.rk} ${person?.name} (${person?.battery}) to ${category}: ${details.location || ''}`,
      'PARADE_STATE'
    );
    // Sync to Firestore
    syncDoc(setDoc(doc(db, 'personnel', personnelId), sanitizeForFirestore(patch), { merge: true }), 'assign out of unit');
  };

  const cancelOutOfUnit = (personnelId: string) => {
    if (isGuest) {
      showNotification('গেস্ট মোডে আউটার ইউনিট বাতিল করা যাবে না (GUEST — VIEW ONLY)।');
      return;
    }
    const patch: Record<string, any> = {
      status: 'Present',
      outOfUnitCategory: null,
      outOfUnitLocation: null,
      outOfUnitStartDate: null,
      outOfUnitEndDate: null,
      outOfUnitAuthority: null,
      outOfUnitRemarks: null,
      statusDetails: null,
    };

    setPersonnelList((prev) =>
      prev.map((p) => {
        if (p.id === personnelId) {
          return {
            ...p,
            status: 'Present',
            outOfUnitCategory: undefined,
            outOfUnitLocation: undefined,
            outOfUnitStartDate: undefined,
            outOfUnitEndDate: undefined,
            outOfUnitAuthority: undefined,
            outOfUnitRemarks: undefined,
            statusDetails: undefined,
          };
        }
        return p;
      })
    );

    const person = personnelList.find((p) => p.id === personnelId);
    showNotification(`Cancelled Out-of-Unit status for ${person?.rk} ${person?.name} - Returned to Unit Present.`);
    addAuditLog(
      'Out Of Unit Cancelled',
      `Returned ${person?.rk} ${person?.name} (${person?.battery}) to Present status in Unit`,
      'PARADE_STATE'
    );
    // Sync to Firestore
    syncDoc(setDoc(doc(db, 'personnel', personnelId), patch, { merge: true }), 'cancel out of unit');
  };

  // Daily Parade State Management Handlers
  const updateParadePointCount = (pointId: string, battery: Battery, counts: ParadePointCount) => {
    if (isGuest) {
      showNotification('গেস্ট মোডে প্যারেড পয়েন্ট কাউন্ট পরিবর্তন করা যাবে না (GUEST — VIEW ONLY)।');
      return;
    }
    let updatedPt: DailyParadePoint | null = null;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const isRsmEditor = currentUser.role === 'RSM' || currentUser.role === 'Admin';

    setDailyParadePoints((prev) =>
      prev.map((pt) => {
        if (pt.id === pointId) {
          const nextLocked = { ...(pt.lockedByRsm || {}) };
          const nextRsmFixedAt = { ...(pt.rsmFixedAt || {}) };
          if (isRsmEditor) {
            nextLocked[battery] = true;
            nextRsmFixedAt[battery] = timeStr;
          }

          updatedPt = {
            ...pt,
            counts: {
              ...pt.counts,
              [battery]: counts,
            },
            lastUpdated: {
              ...(pt.lastUpdated || {}),
              [battery]: timeStr,
            },
            lockedByRsm: nextLocked,
            rsmFixedAt: nextRsmFixedAt,
          };
          return updatedPt;
        }
        return pt;
      })
    );
    // Sync to Firestore
    if (updatedPt) {
      syncDoc(setDoc(doc(db, 'parade_points', pointId), sanitizeForFirestore(updatedPt), { merge: true }), 'update parade point count');
    }
  };

  const togglePointForBattery = (pointId: string, battery: Battery, enabled: boolean) => {
    if (isGuest) {
      showNotification('গেস্ট মোডে কোনো পরিবর্তন করা যাবে না (GUEST — VIEW ONLY)।');
      return;
    }
    let updatedPt: DailyParadePoint | null = null;
    setDailyParadePoints((prev) =>
      prev.map((pt) => {
        if (pt.id === pointId) {
          const current = pt.enabledBatteries || ['HQ Bty', 'P Bty', 'Q Bty', 'R Bty'];
          const updated = enabled
            ? Array.from(new Set([...current, battery]))
            : current.filter((b) => b !== battery);
          updatedPt = {
            ...pt,
            enabledBatteries: updated,
          };
          return updatedPt;
        }
        return pt;
      })
    );
    showNotification(`Updated parade point visibility for ${battery}`);
    // Sync to Firestore
    if (updatedPt) {
      syncDoc(setDoc(doc(db, 'parade_points', pointId), sanitizeForFirestore(updatedPt), { merge: true }), 'toggle point battery');
    }
  };

  const setRsmPointSuggestion = (pointId: string, suggestion: Partial<ParadePointCount>) => {
    if (isGuest) {
      showNotification('গেস্ট মোডে কোনো পরিবর্তন করা যাবে না (GUEST — VIEW ONLY)।');
      return;
    }
    let updatedPt: DailyParadePoint | null = null;
    setDailyParadePoints((prev) =>
      prev.map((pt) => {
        if (pt.id === pointId) {
          updatedPt = {
            ...pt,
            rsmSuggested: { ...pt.rsmSuggested, ...suggestion },
          };
          return updatedPt;
        }
        return pt;
      })
    );
    showNotification(`RSM point suggestion updated.`);
    // Sync to Firestore
    if (updatedPt) {
      syncDoc(setDoc(doc(db, 'parade_points', pointId), sanitizeForFirestore(updatedPt), { merge: true }), 'set rsm suggestion');
    }
  };

  const addDailyParadePoint = (name: string, enabledBatteries?: Battery[], initialCounts?: ParadePointCount) => {
    if (isGuest) {
      showNotification('গেস্ট মোডে নতুন প্যারেড পয়েন্ট যোগ করা যাবে না (GUEST — VIEW ONLY)।');
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) return;
    const newId = 'pt-' + Date.now();
    const defaultCount = initialCounts || { offr: 0, jco: 0, or: 0 };
    const newPoint: DailyParadePoint = {
      id: newId,
      name: trimmed,
      order: dailyParadePoints.length + 1,
      isActive: true,
      enabledBatteries: enabledBatteries || ['HQ Bty', 'P Bty', 'Q Bty', 'R Bty'],
      counts: {
        'HQ Bty': { ...defaultCount },
        'P Bty': { ...defaultCount },
        'Q Bty': { ...defaultCount },
        'R Bty': { ...defaultCount },
      },
    };
    setDailyParadePoints((prev) => [...prev, newPoint]);
    showNotification(`Added new Daily Parade point: "${trimmed}"`);
    addAuditLog('Parade Point Added', `Added parade duty point "${trimmed}"`, 'PARADE_STATE');
    // Sync to Firestore
    syncDoc(setDoc(doc(db, 'parade_points', newId), sanitizeForFirestore(newPoint)), 'add parade point');
  };

  const deleteDailyParadePoint = (pointId: string) => {
    if (isGuest) {
      showNotification('গেস্ট মোডে প্যারেড পয়েন্ট মুছে ফেলা যাবে না (GUEST — VIEW ONLY)।');
      return;
    }
    const target = dailyParadePoints.find((p) => p.id === pointId);
    setDailyParadePoints((prev) => prev.filter((p) => p.id !== pointId));
    showNotification(`Parade point "${target?.name}" removed.`);
    addAuditLog('Parade Point Removed', `Removed point "${target?.name}"`, 'PARADE_STATE');
    // Delete from Firestore
    syncDoc(deleteDoc(doc(db, 'parade_points', pointId)), 'delete parade point');
  };

  const toggleDailyParadePointActive = (pointId: string, active: boolean) => {
    if (isGuest) {
      showNotification('গেস্ট মোডে প্যারেড পয়েন্ট পরিবর্তন করা যাবে না (GUEST — VIEW ONLY)।');
      return;
    }
    setDailyParadePoints((prev) =>
      prev.map((p) => (p.id === pointId ? { ...p, isActive: active } : p))
    );
    // Sync to Firestore
    syncDoc(setDoc(doc(db, 'parade_points', pointId), { isActive: active }, { merge: true }), 'toggle parade point active');
  };

  const addDutyAssignment = (assignment: Omit<DutyAssignment, 'id'>) => {
    if (isGuest) {
      showNotification('গেস্ট মোডে ডিউটি রোস্টার পরিবর্তন করা যাবে না (GUEST — VIEW ONLY)।');
      return;
    }
    const newAssignment: DutyAssignment = {
      ...assignment,
      id: 'duty-' + Date.now(),
    };
    setDutyRoster((prev) => [newAssignment, ...prev]);
    showNotification(`New duty roster created for ${assignment.dutyType}`);
    addAuditLog('Duty Assigned', `Scheduled ${assignment.dutyType} on ${assignment.date}`, 'PARADE_STATE');
    // Sync to Firestore
    syncDoc(setDoc(doc(db, 'duty_roster', newAssignment.id), sanitizeForFirestore(newAssignment)), 'add duty assignment');
  };

  const getBatterySummaries = (): BatteryParadeSummary[] => {
    const batteries: Battery[] = ['HQ Bty', 'P Bty', 'Q Bty', 'R Bty'];
    return batteries.map((bty) => {
      const btyMembers = personnelList.filter((p) => p.battery === bty);
      const posted = btyMembers.length;
      const present = btyMembers.filter((p) => p.status === 'Present').length;
      const onDuty = btyMembers.filter((p) => p.status === 'On Duty').length;
      const sick = btyMembers.filter((p) => p.status === 'CMH/Sick').length;
      const leave = btyMembers.filter((p) => p.status === 'Leave').length;
      const course = btyMembers.filter((p) => p.status === 'Course/Trg').length;
      const tempDuty = btyMembers.filter((p) => p.status === 'Temp Duty').length;
      const attached = btyMembers.filter((p) => p.status === 'Attached Out').length;
      const absent = btyMembers.filter((p) => p.status === 'AWOL/OSL').length;

      const btyStatus = paradeBatteryStatus[bty] || { status: 'Pending', lastUpdated: '0630 HRS' };

      return {
        battery: bty,
        posted,
        present,
        onDuty,
        sick,
        leave,
        course,
        tempDuty,
        attached,
        absent,
        submissionStatus: btyStatus.status === 'Confirmed' ? 'Approved' : 'Pending',
        lastUpdated: btyStatus.lastUpdated || '0630 HRS',
        submittedBy:
          bty === 'P Bty'
            ? 'SWO Jafor (BSM)'
            : bty === 'Q Bty'
            ? 'WO Hamid (BSM)'
            : bty === 'R Bty'
            ? 'WO Aminul (BSM)'
            : 'SWO Nasir (RSM)',
      };
    });
  };

  const getRegimentalTotals = () => {
    const totalPosted = personnelList.length;
    const totalPresent = personnelList.filter((p) => p.status === 'Present').length;
    const totalDuty = personnelList.filter((p) => p.status === 'On Duty').length;
    const totalSick = personnelList.filter((p) => p.status === 'CMH/Sick').length;
    const totalLeave = personnelList.filter((p) => p.status === 'Leave').length;
    const totalCourse = personnelList.filter((p) => p.status === 'Course/Trg').length;
    const totalTempDuty = personnelList.filter((p) => p.status === 'Temp Duty').length;
    const totalAttached = personnelList.filter((p) => p.status === 'Attached Out').length;
    const totalAbsent = personnelList.filter((p) => p.status === 'AWOL/OSL').length;
    const effectivePresent = totalPresent + totalDuty;
    const presentPercentage = totalPosted > 0 ? Math.round((effectivePresent / totalPosted) * 100) : 0;

    return {
      totalPosted,
      totalPresent,
      totalDuty,
      totalSick,
      totalLeave,
      totalCourse,
      totalTempDuty,
      totalAttached,
      totalAbsent,
      presentPercentage,
    };
  };

  const getParadeSummary = (
    batteryScope: Battery | 'Consolidated' = 'Consolidated',
    date: string = selectedParadeDate,
    sessionType: string = 'Morning'
  ): SimpleParadeSummary => {
    const rawDuty = getParadeDutyAssignments(date, sessionType);
    return calculateSimpleParadeState(personnelList, rawDuty, batteryScope);
  };

  const hasModulePermission = (moduleKey: string, userRole?: string): boolean => {
    const role = userRole || currentUser.role;
    // Master Regimental Admin has absolute access to everything
    if (role === 'Admin' || isRealAdmin) return true;

    // Normalization for role-specific dashboard views
    let normalizedModule = moduleKey;
    if (moduleKey === 'co_dashboard' || moduleKey === 'offr_dashboard' || moduleKey === 'rsm_dashboard') {
      normalizedModule = 'main_dashboard';
    }

    const permissions = systemSettings?.modulePermissions;
    if (!permissions) return true;

    // Find permissions for current role
    let rolePerms = permissions[role];
    if (!rolePerms && isBsmRole(role)) {
      rolePerms = permissions['BSM'] || permissions['P BSM'];
    }

    if (rolePerms) {
      if (typeof rolePerms[moduleKey] === 'boolean') {
        return rolePerms[moduleKey];
      }
      if (typeof rolePerms[normalizedModule] === 'boolean') {
        return rolePerms[normalizedModule];
      }
    }

    return true;
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        switchRole,
        isAdmin,
        isRSM,
        isGuest,
        usersList,
        addUser,
        updateUser,
        deleteUser,
        personnelList,
        addPersonnel,
        updatePersonnel,
        deletePersonnel,
        updateParadeStatus,
        updatePersonnelStatus: updateParadeStatus,
        batchUpdateStatus,
        dutyRoster,
        addDutyAssignment,
        auditLogs,
        addAuditLog,
        getBatterySummaries,
        getRegimentalTotals,
        getParadeSummary,
        activePage,
        setActivePage,
        selectedBatteryFilter,
        setSelectedBatteryFilter,
        searchQuery,
        setSearchQuery,
        customLogo,
        setCustomLogo,
        notification,
        showNotification,

        // Dynamic Categories & Sub-Categories (ADMIN CONTROL)
        categoriesList,
        addCategory,
        updateCategory,
        deleteCategory,
        addSubCategory,
        updateSubCategory,
        deleteSubCategory,
        reorderCategories,

        // Sub Units (ADMIN CONTROL)
        subUnitsList,
        addSubUnit,
        updateSubUnit,
        deleteSubUnit,

        // Military Ranks (ADMIN CONTROL)
        ranksList,
        addRank,
        updateRank,
        deleteRank,

        // Trades & Specializations (ADMIN CONTROL)
        tradesList,
        addTrade,
        updateTrade,
        deleteTrade,

        // Centralized Dynamic Lists & Helpers
        activeRanks,
        enlistmentRanks,
        activeTrades,
        enlistmentTrades,
        getTradesForRank,

        // Authorized Establishment (ADMIN CONTROL)
        authEstablishmentList,
        updateAuthEstablishment,
        addAuthEstablishmentItem,
        deleteAuthEstablishmentItem,

        // Calculation Engine Configuration (ADMIN CONTROL)
        calculationConfig,
        updateCalculationConfig,

        dailyParadePoints,
        updateParadePointCount,
        togglePointForBattery,
        setRsmPointSuggestion,
        addDailyParadePoint,
        deleteDailyParadePoint,
        toggleDailyParadePointActive,
        paradeBatteryStatus,
        setBatteryParadeStatus,

        // Date-wise & Dynamic Parade State System
        selectedParadeDate,
        setSelectedParadeDate,
        paradeTypes,
        addParadeType,
        updateParadeType,
        deleteParadeType,
        restoreParadeType,
        paradeRecords,
        getParadeRecord,
        saveParadeRecordCounts,
        confirmBatteryParadeRecord,
        finalizeParadeType,

        // Parade Duty Assignments (Unit Sy, working, Fixed Duty, Others)
        paradeDutyAssignments,
        getParadeDutyAssignments,
        addParadeDutyAssignment,
        removeParadeDutyAssignment,
        clearParadeDutyAssignments,
        dutySessionStatuses,
        getDutySessionStatus,
        saveDutySession,
        editDutySession,
        sendDutySessionToAdjt,

        assignOutOfUnit,
        cancelOutOfUnit,
        syncNominalRollToCloud,
        syncAllToCloud,

        dailyParadeModalOpen,
        setDailyParadeModalOpen,
        outOfUnitModalOpen,
        setOutOfUnitModalOpen,
        activeOutOfUnitCategory,
        setActiveOutOfUnitCategory,

        isAuthenticated,
        loginWithCredentials,

        isRealAdmin,
        isSimulating,
        realUser,
        exitSimulation,

        authUser: firebaseUser,
        firebaseUser,
        isAuthReady: isFirebaseReady,
        isFirebaseReady,
        cloudPermissionDenied,
        loginWithGoogle,
        logout,

        // Owner-Approval Google Auth
        isOwnerUser,
        accessRequests,
        pendingGoogleUser,
        approveGoogleRequest,
        rejectGoogleRequest,
        preApproveGoogleUser,
        revokeGoogleUserApproval,
        updateGoogleUserRole,
        clearPendingGoogleUser,
        checkPendingApprovalStatus,

        // Master System Settings & Backup (ADMIN FULL CONTROL)
        systemSettings,
        updateSystemSettings,
        exportSystemBackup,
        importSystemBackup,
        resetSystemToDefaults,
        hasModulePermission,

        // Supabase Integration
        isSupabaseReady,
        syncToSupabase,
        syncUsersToSupabaseCloud,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
