import { pgTable, serial, text, integer, timestamp, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table linked to Firebase Auth UID
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name'),
  role: varchar('role', { length: 50 }).default('GUEST'),
  battery: varchar('battery', { length: 50 }).default('ALL'),
  isApproved: integer('is_approved').default(0), // 1 for approved, 0 for pending
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Personnel / Nominal Roll table
export const personnel = pgTable('personnel', {
  id: serial('id').primaryKey(),
  armyNo: varchar('army_no', { length: 50 }).notNull().unique(),
  rank: varchar('rank', { length: 50 }).notNull(),
  name: text('name').notNull(),
  battery: varchar('battery', { length: 50 }).notNull(),
  trade: varchar('trade', { length: 50 }).default('GD'),
  paradeStatus: varchar('parade_status', { length: 50 }).default('PRESENT'),
  statusDetails: text('status_details'),
  bloodGroup: varchar('blood_group', { length: 10 }),
  phone: varchar('phone', { length: 30 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Parade Daily Roll Call / State Records
export const paradeRecords = pgTable('parade_records', {
  id: serial('id').primaryKey(),
  date: varchar('date', { length: 20 }).notNull(), // YYYY-MM-DD
  battery: varchar('battery', { length: 50 }).notNull(),
  totalPosted: integer('total_posted').default(0),
  present: integer('present').default(0),
  duty: integer('duty').default(0),
  sick: integer('sick').default(0),
  leave: integer('leave').default(0),
  course: integer('course').default(0),
  attOut: integer('att_out').default(0),
  attIn: integer('att_in').default(0),
  absent: integer('absent').default(0),
  others: integer('others').default(0),
  submittedBy: text('submitted_by'),
  status: varchar('status', { length: 50 }).default('SUBMITTED'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Duty Roster table
export const dutyRoster = pgTable('duty_roster', {
  id: serial('id').primaryKey(),
  personnelArmyNo: varchar('personnel_army_no', { length: 50 }).notNull(),
  personnelName: text('personnel_name'),
  rank: varchar('rank', { length: 50 }),
  battery: varchar('battery', { length: 50 }),
  dutyName: text('duty_name').notNull(),
  location: text('location'),
  dutyDate: varchar('duty_date', { length: 20 }).notNull(),
  shift: varchar('shift', { length: 50 }).default('DAY'),
  status: varchar('status', { length: 50 }).default('ASSIGNED'),
  assignedBy: text('assigned_by'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Audit Log table
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: text('user_id'),
  userEmail: text('user_email'),
  action: text('action').notNull(),
  details: text('details'),
  category: varchar('category', { length: 50 }).default('SYSTEM'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relationships
export const usersRelations = relations(users, () => ({}));

export const personnelRelations = relations(personnel, ({ many }) => ({
  duties: many(dutyRoster),
}));

export const dutyRosterRelations = relations(dutyRoster, ({ one }) => ({
  person: one(personnel, {
    fields: [dutyRoster.personnelArmyNo],
    references: [personnel.armyNo],
  }),
}));
