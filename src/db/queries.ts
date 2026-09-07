import { db } from './index.ts';
import { users, personnel, paradeRecords, dutyRoster, auditLogs } from './schema.ts';
import { eq, desc } from 'drizzle-orm';

// User Helpers
export async function getOrCreateSqlUser(uid: string, email: string, name?: string, role = 'GUEST', battery = 'ALL') {
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
    console.error('Error in getOrCreateSqlUser:', error);
    throw new Error('Database operation failed', { cause: error });
  }
}

// Personnel Helpers
export async function getSqlPersonnelList() {
  try {
    return await db.select().from(personnel).orderBy(personnel.armyNo);
  } catch (error) {
    console.error('Error in getSqlPersonnelList:', error);
    throw new Error('Database operation failed', { cause: error });
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
    return result[0];
  } catch (error) {
    console.error('Error in upsertSqlPersonnel:', error);
    throw new Error('Database operation failed', { cause: error });
  }
}

export async function deleteSqlPersonnel(armyNo: string) {
  try {
    await db.delete(personnel).where(eq(personnel.armyNo, armyNo));
    return { success: true };
  } catch (error) {
    console.error('Error in deleteSqlPersonnel:', error);
    throw new Error('Database operation failed', { cause: error });
  }
}

// Parade Records Helpers
export async function getSqlParadeRecords(battery?: string, date?: string) {
  try {
    let query = db.select().from(paradeRecords);
    if (battery && battery !== 'ALL') {
      return await query.where(eq(paradeRecords.battery, battery)).orderBy(desc(paradeRecords.createdAt));
    }
    return await query.orderBy(desc(paradeRecords.createdAt)).limit(100);
  } catch (error) {
    console.error('Error in getSqlParadeRecords:', error);
    throw new Error('Database operation failed', { cause: error });
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
  try {
    const result = await db
      .insert(paradeRecords)
      .values(data)
      .returning();
    return result[0];
  } catch (error) {
    console.error('Error in insertSqlParadeRecord:', error);
    throw new Error('Database operation failed', { cause: error });
  }
}

// Duty Roster Helpers
export async function getSqlDutyRoster(date?: string) {
  try {
    let query = db.select().from(dutyRoster);
    if (date) {
      return await query.where(eq(dutyRoster.dutyDate, date));
    }
    return await query.orderBy(desc(dutyRoster.createdAt)).limit(150);
  } catch (error) {
    console.error('Error in getSqlDutyRoster:', error);
    throw new Error('Database operation failed', { cause: error });
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
  try {
    const result = await db
      .insert(dutyRoster)
      .values(data)
      .returning();
    return result[0];
  } catch (error) {
    console.error('Error in insertSqlDutyAssignment:', error);
    throw new Error('Database operation failed', { cause: error });
  }
}

// Audit Logs Helpers
export async function insertSqlAuditLog(action: string, details: string, category = 'GENERAL', userEmail?: string, userId?: string) {
  try {
    await db.insert(auditLogs).values({
      action,
      details,
      category,
      userEmail: userEmail || '',
      userId: userId || '',
    });
  } catch (error) {
    console.error('Error in insertSqlAuditLog:', error);
    // Audit log failures should not crash the caller
  }
}

export async function getSqlAuditLogs(limitCount = 50) {
  try {
    return await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limitCount);
  } catch (error) {
    console.error('Error in getSqlAuditLogs:', error);
    throw new Error('Database operation failed', { cause: error });
  }
}
