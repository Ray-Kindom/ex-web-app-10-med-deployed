import { db, isSqlConfigured } from './index.ts';
import { users, personnel, paradeRecords, dutyRoster, auditLogs } from './schema.ts';
import { eq, desc } from 'drizzle-orm';

// In-memory fallback stores for when Cloud SQL is not configured
const inMemoryUsers = new Map<string, any>();
const inMemoryPersonnel = new Map<string, any>();
const inMemoryParadeRecords: any[] = [];
const inMemoryDutyRoster: any[] = [];
const inMemoryAuditLogs: any[] = [];

// User Helpers
export async function getOrCreateSqlUser(uid: string, email: string, name?: string, role = 'GUEST', battery = 'ALL') {
  if (!isSqlConfigured()) {
    const existing = inMemoryUsers.get(uid);
    if (existing) {
      existing.email = email;
      existing.name = name || existing.name;
      existing.updatedAt = new Date();
      return existing;
    }
    const newUser = {
      id: `user_${Date.now()}`,
      uid,
      email,
      name: name || '',
      role,
      battery,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    inMemoryUsers.set(uid, newUser);
    return newUser;
  }

  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        name: name || '',
        role,
        battery,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          name: name || '',
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0];
  } catch (error) {
    console.warn('Fallback to in-memory user due to database error:', error);
    const existing = inMemoryUsers.get(uid);
    if (existing) return existing;
    const fallbackUser = { id: `user_${Date.now()}`, uid, email, name: name || '', role, battery };
    inMemoryUsers.set(uid, fallbackUser);
    return fallbackUser;
  }
}

// Personnel Helpers
export async function getSqlPersonnelList() {
  if (!isSqlConfigured()) {
    return Array.from(inMemoryPersonnel.values());
  }

  try {
    return await db.select().from(personnel).orderBy(personnel.armyNo);
  } catch (error) {
    console.warn('Fallback to in-memory personnel due to database error');
    return Array.from(inMemoryPersonnel.values());
  }
}

export async function upsertSqlPersonnel(data: {
  armyNo: string;
  rank: string;
  name: string;
  battery: string;
  trade?: string;
  paradeStatus?: string;
  statusDetails?: string;
  bloodGroup?: string;
  phone?: string;
}) {
  const record = {
    id: data.armyNo,
    armyNo: data.armyNo,
    rank: data.rank,
    name: data.name,
    battery: data.battery,
    trade: data.trade || 'GD',
    paradeStatus: data.paradeStatus || 'PRESENT',
    statusDetails: data.statusDetails || '',
    bloodGroup: data.bloodGroup || '',
    phone: data.phone || '',
    updatedAt: new Date(),
    createdAt: new Date(),
  };
  inMemoryPersonnel.set(data.armyNo, record);

  if (!isSqlConfigured()) {
    return record;
  }

  try {
    const result = await db
      .insert(personnel)
      .values({
        armyNo: data.armyNo,
        rank: data.rank,
        name: data.name,
        battery: data.battery,
        trade: data.trade || 'GD',
        paradeStatus: data.paradeStatus || 'PRESENT',
        statusDetails: data.statusDetails || '',
        bloodGroup: data.bloodGroup || '',
        phone: data.phone || '',
      })
      .onConflictDoUpdate({
        target: personnel.armyNo,
        set: {
          rank: data.rank,
          name: data.name,
          battery: data.battery,
          trade: data.trade || 'GD',
          paradeStatus: data.paradeStatus || 'PRESENT',
          statusDetails: data.statusDetails || '',
          bloodGroup: data.bloodGroup || '',
          phone: data.phone || '',
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0] || record;
  } catch (error) {
    console.warn('Database operation failed in upsertSqlPersonnel, saved in-memory');
    return record;
  }
}

export async function deleteSqlPersonnel(armyNo: string) {
  inMemoryPersonnel.delete(armyNo);
  if (!isSqlConfigured()) {
    return { success: true };
  }

  try {
    await db.delete(personnel).where(eq(personnel.armyNo, armyNo));
    return { success: true };
  } catch (error) {
    console.warn('Database operation failed in deleteSqlPersonnel, deleted from in-memory');
    return { success: true };
  }
}

// Parade Records Helpers
export async function getSqlParadeRecords(battery?: string, date?: string) {
  if (!isSqlConfigured()) {
    let list = [...inMemoryParadeRecords];
    if (battery && battery !== 'ALL') {
      list = list.filter((r) => r.battery === battery);
    }
    if (date) {
      list = list.filter((r) => r.date === date);
    }
    return list;
  }

  try {
    let query = db.select().from(paradeRecords);
    if (battery && battery !== 'ALL') {
      return await query.where(eq(paradeRecords.battery, battery)).orderBy(desc(paradeRecords.createdAt));
    }
    return await query.orderBy(desc(paradeRecords.createdAt)).limit(100);
  } catch (error) {
    console.warn('Fallback to in-memory parade records due to database error');
    return inMemoryParadeRecords;
  }
}

export async function insertSqlParadeRecord(data: {
  date: string;
  battery: string;
  totalPosted: number;
  present: number;
  duty: number;
  sick: number;
  leave: number;
  course: number;
  attOut: number;
  attIn: number;
  absent: number;
  others: number;
  submittedBy?: string;
  status?: string;
}) {
  const record = {
    id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    ...data,
    createdAt: new Date(),
  };
  inMemoryParadeRecords.unshift(record);

  if (!isSqlConfigured()) {
    return record;
  }

  try {
    const result = await db
      .insert(paradeRecords)
      .values(data)
      .returning();
    return result[0] || record;
  } catch (error) {
    console.warn('Database operation failed in insertSqlParadeRecord, saved in-memory');
    return record;
  }
}

// Duty Roster Helpers
export async function getSqlDutyRoster(date?: string) {
  if (!isSqlConfigured()) {
    if (date) {
      return inMemoryDutyRoster.filter((d) => d.dutyDate === date);
    }
    return [...inMemoryDutyRoster].slice(0, 150);
  }

  try {
    let query = db.select().from(dutyRoster);
    if (date) {
      return await query.where(eq(dutyRoster.dutyDate, date));
    }
    return await query.orderBy(desc(dutyRoster.createdAt)).limit(150);
  } catch (error) {
    console.warn('Fallback to in-memory duty roster due to database error');
    return inMemoryDutyRoster;
  }
}

export async function insertSqlDutyAssignment(data: {
  personnelArmyNo: string;
  personnelName: string;
  rank: string;
  battery: string;
  dutyName: string;
  location?: string;
  dutyDate: string;
  shift?: string;
  assignedBy?: string;
}) {
  const record = {
    id: `duty_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    ...data,
    createdAt: new Date(),
  };
  inMemoryDutyRoster.unshift(record);

  if (!isSqlConfigured()) {
    return record;
  }

  try {
    const result = await db
      .insert(dutyRoster)
      .values(data)
      .returning();
    return result[0] || record;
  } catch (error) {
    console.warn('Database operation failed in insertSqlDutyAssignment, saved in-memory');
    return record;
  }
}

// Audit Logs Helpers
export async function insertSqlAuditLog(action: string, details: string, category = 'GENERAL', userEmail?: string, userId?: string) {
  const record = {
    id: `audit_${Date.now()}`,
    action,
    details,
    category,
    userEmail: userEmail || '',
    userId: userId || '',
    createdAt: new Date(),
  };
  inMemoryAuditLogs.unshift(record);

  if (!isSqlConfigured()) {
    return;
  }

  try {
    await db.insert(auditLogs).values({
      action,
      details,
      category,
      userEmail: userEmail || '',
      userId: userId || '',
    });
  } catch (error) {
    console.warn('Database operation failed in insertSqlAuditLog');
  }
}

export async function getSqlAuditLogs(limitCount = 50) {
  if (!isSqlConfigured()) {
    return inMemoryAuditLogs.slice(0, limitCount);
  }

  try {
    return await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limitCount);
  } catch (error) {
    console.warn('Fallback to in-memory audit logs');
    return inMemoryAuditLogs.slice(0, limitCount);
  }
}
