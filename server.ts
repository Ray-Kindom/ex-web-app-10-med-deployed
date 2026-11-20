import dotenv from 'dotenv';
dotenv.config();
import http from 'http';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

process.on('uncaughtException', (err: any) => {
  // Prevent unhandled WebSocket / EADDRINUSE from terminating the server process
  if (err?.code === 'EADDRINUSE' || err?.message?.includes('WebSocket')) {
    console.warn('[Server Warning] Non-fatal server error:', err?.message || err);
    return;
  }
  console.error('[Server Uncaught Exception]:', err);
});

process.on('unhandledRejection', (reason: any) => {
  console.warn('[Server Unhandled Rejection]:', reason);
});

import {
  getOrCreateSqlUser,
  deleteSqlUser,
  getSqlPersonnelList,
  upsertSqlPersonnel,
  deleteSqlPersonnel,
  getSqlParadeRecords,
  insertSqlParadeRecord,
  getSqlDutyRoster,
  insertSqlDutyAssignment,
  getSqlAuditLogs,
  insertSqlAuditLog,
} from './src/db/queries.ts';
import { isSqlConfigured } from './src/db/index.ts';
import { INITIAL_USERS } from './src/data/initialData.ts';
import { supabase } from './src/supabaseClient.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE_PATH = path.join(DATA_DIR, 'users.json');
const DELETED_USERS_FILE_PATH = path.join(DATA_DIR, 'deleted_users.json');
const APP_STATE_FILE_PATH = path.join(DATA_DIR, 'app_state.json');
const PERSONNEL_FILE_PATH = path.join(DATA_DIR, 'personnel.json');
const TEAMS_FILE_PATH = path.join(DATA_DIR, 'teams.json');
const COURSES_FILE_PATH = path.join(DATA_DIR, 'courses.json');
const PARADE_RECORDS_FILE_PATH = path.join(DATA_DIR, 'parade_records.json');
const DUTY_ROSTER_FILE_PATH = path.join(DATA_DIR, 'duty_roster.json');

function loadServerParadeRecords(): Record<string, any> {
  try {
    if (fs.existsSync(PARADE_RECORDS_FILE_PATH)) {
      const content = fs.readFileSync(PARADE_RECORDS_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (err) {
    console.warn('Error reading server parade records:', err);
  }
  return {};
}

function saveServerParadeRecords(records: Record<string, any>): void {
  try {
    fs.writeFileSync(PARADE_RECORDS_FILE_PATH, JSON.stringify(records, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving server parade records:', err);
  }
}

function loadServerDutyData(): { assignments: Record<string, any[]>; statuses: Record<string, any>; rosterList: any[] } {
  try {
    if (fs.existsSync(DUTY_ROSTER_FILE_PATH)) {
      const content = fs.readFileSync(DUTY_ROSTER_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed) {
        return {
          assignments: parsed.assignments && typeof parsed.assignments === 'object' ? parsed.assignments : {},
          statuses: parsed.statuses && typeof parsed.statuses === 'object' ? parsed.statuses : {},
          rosterList: Array.isArray(parsed.rosterList) ? parsed.rosterList : [],
        };
      }
    }
  } catch (err) {
    console.warn('Error reading server duty roster:', err);
  }
  return { assignments: {}, statuses: {}, rosterList: [] };
}

function saveServerDutyData(data: { assignments?: Record<string, any[]>; statuses?: Record<string, any>; rosterList?: any[] }): void {
  try {
    const current = loadServerDutyData();
    const payload = {
      assignments: data.assignments ? { ...current.assignments, ...data.assignments } : current.assignments,
      statuses: data.statuses ? { ...current.statuses, ...data.statuses } : current.statuses,
      rosterList: Array.isArray(data.rosterList) ? data.rosterList : current.rosterList,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(DUTY_ROSTER_FILE_PATH, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving server duty data:', err);
  }
}

function loadServerCourses(): { definitions: any[]; records: any[] } {
  try {
    if (fs.existsSync(COURSES_FILE_PATH)) {
      const content = fs.readFileSync(COURSES_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed) {
        return {
          definitions: Array.isArray(parsed.definitions) ? parsed.definitions : [],
          records: Array.isArray(parsed.records) ? parsed.records : [],
        };
      }
    }
  } catch (err) {
    console.warn('Error reading server courses:', err);
  }
  return { definitions: [], records: [] };
}

function saveServerCourses(data: { definitions?: any[]; records?: any[] }): void {
  try {
    const payload = {
      definitions: Array.isArray(data.definitions) ? data.definitions : [],
      records: Array.isArray(data.records) ? data.records : [],
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(COURSES_FILE_PATH, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving server courses:', err);
  }
}

function loadServerTeams(): { activeTeams: any[]; teamHistory: any[]; deletedTeamIds: string[] } {
  try {
    if (fs.existsSync(TEAMS_FILE_PATH)) {
      const content = fs.readFileSync(TEAMS_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed) {
        return {
          activeTeams: Array.isArray(parsed.activeTeams) ? parsed.activeTeams : [],
          teamHistory: Array.isArray(parsed.teamHistory) ? parsed.teamHistory : [],
          deletedTeamIds: Array.isArray(parsed.deletedTeamIds) ? parsed.deletedTeamIds : [],
        };
      }
    }
  } catch (err) {
    console.warn('Error reading server teams:', err);
  }
  return { activeTeams: [], teamHistory: [], deletedTeamIds: [] };
}

function saveServerTeams(data: { activeTeams?: any[]; teamHistory?: any[]; deletedTeamIds?: string[] }): void {
  try {
    const payload = {
      activeTeams: Array.isArray(data.activeTeams) ? data.activeTeams : [],
      teamHistory: Array.isArray(data.teamHistory) ? data.teamHistory : [],
      deletedTeamIds: Array.isArray(data.deletedTeamIds) ? data.deletedTeamIds : [],
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(TEAMS_FILE_PATH, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving server teams:', err);
  }
}

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    console.warn('Could not create data dir:', e);
  }
}

function loadDeletedUsers(): string[] {
  try {
    if (fs.existsSync(DELETED_USERS_FILE_PATH)) {
      const content = fs.readFileSync(DELETED_USERS_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed.map((s) => String(s).toLowerCase().trim());
    }
  } catch (err) {
    console.warn('Error reading deleted users:', err);
  }
  return [];
}

function saveDeletedUser(identifiers: (string | undefined | null)[]): void {
  try {
    const existing = new Set(loadDeletedUsers());
    for (const id of identifiers) {
      if (id && String(id).trim()) {
        existing.add(String(id).toLowerCase().trim());
      }
    }
    fs.writeFileSync(DELETED_USERS_FILE_PATH, JSON.stringify(Array.from(existing), null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving deleted user:', err);
  }
}

function loadServerUsers(): any[] {
  const deletedSet = new Set(loadDeletedUsers());
  try {
    if (fs.existsSync(USERS_FILE_PATH)) {
      const content = fs.readFileSync(USERS_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (u) =>
            !deletedSet.has(String(u.id).toLowerCase()) &&
            (!u.username || !deletedSet.has(String(u.username).toLowerCase())) &&
            (!u.email || !deletedSet.has(String(u.email).toLowerCase()))
        );
      }
    }
  } catch (err) {
    console.warn('Error reading server users:', err);
  }
  // Initialize with INITIAL_USERS
  const initialFiltered = INITIAL_USERS.filter(
    (u) =>
      !deletedSet.has(String(u.id).toLowerCase()) &&
      (!u.username || !deletedSet.has(String(u.username).toLowerCase())) &&
      (!u.email || !deletedSet.has(String(u.email).toLowerCase()))
  );
  try {
    fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(initialFiltered, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error writing initial server users:', err);
  }
  return initialFiltered;
}

function saveServerUsers(users: any[]): void {
  try {
    const deletedSet = new Set(loadDeletedUsers());
    const validUsers = users.filter(
      (u) =>
        !deletedSet.has(String(u.id).toLowerCase()) &&
        (!u.username || !deletedSet.has(String(u.username).toLowerCase())) &&
        (!u.email || !deletedSet.has(String(u.email).toLowerCase()))
    );
    fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(validUsers, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving server users:', err);
  }
}

function loadServerPersonnel(): any[] {
  try {
    if (fs.existsSync(PERSONNEL_FILE_PATH)) {
      const content = fs.readFileSync(PERSONNEL_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn('Error reading server personnel:', err);
  }
  return [];
}

function saveServerPersonnel(list: any[]): void {
  try {
    fs.writeFileSync(PERSONNEL_FILE_PATH, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving server personnel:', err);
  }
}

async function startServer() {
  const app = express();

  // Support command line args (--port, --host) and environment variables
  // In AI Studio / Cloud Run, PORT is set to 8080 for nginx ingress; app must listen on port 3000
  let port = 3000;
  const portArgIdx = process.argv.indexOf('--port');
  if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
    port = parseInt(process.argv[portArgIdx + 1], 10) || 3000;
  } else if (process.env.PORT && process.env.PORT !== '8080') {
    port = parseInt(process.env.PORT, 10) || 3000;
  }

  let host = '0.0.0.0';
  const hostArgIdx = process.argv.indexOf('--host');
  if (hostArgIdx !== -1 && process.argv[hostArgIdx + 1]) {
    host = process.argv[hostArgIdx + 1];
  }

  const httpServer = http.createServer(app);

  app.use(express.json({ limit: '10mb' }));

  // Prevent browser caching of API responses across all devices and tabs
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });

  // --- API Routes ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Supabase Connection Status
  app.get('/api/supabase/status', async (req, res) => {
    try {
      const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://pulzsiyjvnshychyxuix.supabase.co').trim();
      if (!supabase) {
        return res.status(503).json({ status: 'not_configured', url: supabaseUrl });
      }
      const [usersRes, personnelRes, paradeRes, courseCadreRes, trgStateRes] = await Promise.all([
        supabase.from('authorized_users').select('id', { count: 'exact', head: true }),
        supabase.from('personnel').select('id', { count: 'exact', head: true }),
        supabase.from('parade_records').select('id', { count: 'exact', head: true }),
        supabase.from('course_cadre').select('id', { count: 'exact' }).limit(1),
        supabase.from('trg_state').select('id', { count: 'exact' }).limit(1),
      ]);
      const error = usersRes.error || personnelRes.error || paradeRes.error;
      if (error) {
        return res.status(500).json({ status: 'error', url: supabaseUrl, error: error.message });
      }
      res.json({
        status: 'connected',
        projectId: 'pulzsiyjvnshychyxuix',
        url: supabaseUrl,
        counts: {
          authorized_users: usersRes.count ?? 0,
          personnel: personnelRes.count ?? 0,
          parade_records: paradeRes.count ?? 0,
          course_cadre: courseCadreRes.error ? null : (courseCadreRes.count ?? 0),
          trg_state: trgStateRes.error ? null : (trgStateRes.count ?? 0),
        },
        tablesReady: {
          course_cadre: !courseCadreRes.error,
          trg_state: !trgStateRes.error,
        },
      });
    } catch (error: any) {
      res.status(500).json({ status: 'error', error: error?.message || 'Supabase status check failed' });
    }
  });

  // Cloud SQL Status
  app.get('/api/sql/status', async (req, res) => {
    try {
      if (!isSqlConfigured()) {
        const personnelSample = await getSqlPersonnelList();
        return res.json({
          status: 'not_configured',
          engine: 'In-Memory Mock (Cloud SQL not connected)',
          recordsCount: {
            personnel: personnelSample.length,
          },
        });
      }
      const personnelSample = await getSqlPersonnelList();
      res.json({
        status: 'connected',
        engine: 'PostgreSQL (Cloud SQL)',
        recordsCount: {
          personnel: personnelSample.length,
        },
      });
    } catch (error: any) {
      console.error('SQL status check failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Could not connect to Cloud SQL database',
        error: error?.message || 'Unknown error',
      });
    }
  });

  // Personnel API
  app.get('/api/sql/personnel', async (req, res) => {
    try {
      const list = await getSqlPersonnelList();
      res.json({ success: true, count: list.length, data: list });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/sql/personnel', async (req, res) => {
    try {
      const result = await upsertSqlPersonnel(req.body);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete('/api/sql/personnel/:armyNo', async (req, res) => {
    try {
      const result = await deleteSqlPersonnel(req.params.armyNo);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Bulk sync personnel to SQL
  app.post('/api/sql/personnel/bulk-sync', async (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ success: false, error: 'Expected items array' });
      }

      let syncedCount = 0;
      for (const item of items) {
        if (item.armyNo && item.name && item.battery && item.rank) {
          await upsertSqlPersonnel(item);
          syncedCount++;
        }
      }

      await insertSqlAuditLog(
        'SQL_BULK_SYNC',
        `Synced ${syncedCount} personnel records to Cloud SQL`,
        'DATABASE'
      );

      res.json({ success: true, syncedCount });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Parade Records API
  app.get('/api/sql/parade-records', async (req, res) => {
    try {
      const { battery, date } = req.query;
      const records = await getSqlParadeRecords(battery as string, date as string);
      res.json({ success: true, data: records });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/sql/parade-records', async (req, res) => {
    try {
      const record = await insertSqlParadeRecord(req.body);
      res.json({ success: true, data: record });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Duty Roster API
  app.get('/api/sql/duty-roster', async (req, res) => {
    try {
      const { date } = req.query;
      const roster = await getSqlDutyRoster(date as string);
      res.json({ success: true, data: roster });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/sql/duty-roster', async (req, res) => {
    try {
      const result = await insertSqlDutyAssignment(req.body);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Audit Logs API
  app.get('/api/sql/audit-logs', async (req, res) => {
    try {
      const logs = await getSqlAuditLogs(50);
      res.json({ success: true, data: logs });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/sql/audit-logs', async (req, res) => {
    try {
      const { action, details, category, userEmail, userId } = req.body;
      await insertSqlAuditLog(action, details, category, userEmail, userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // User synchronization
  app.post('/api/sql/users/sync', async (req, res) => {
    try {
      const { uid, email, name, role, battery } = req.body;
      if (!uid || !email) {
        return res.status(400).json({ success: false, error: 'uid and email required' });
      }
      const user = await getOrCreateSqlUser(uid, email, name, role, battery);
      res.json({ success: true, data: user });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // User deletion
  app.post('/api/sql/users/delete', async (req, res) => {
    try {
      const { uid, email, username } = req.body;
      if (uid) await deleteSqlUser(uid);
      if (email) await deleteSqlUser(email);
      if (username) await deleteSqlUser(username);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // --- Centralized User Accounts & State Auto-Sync APIs ---

  // 1. Get all centralized users (Supabase prioritized)
  app.get('/api/users', async (req, res) => {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('authorized_users')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          const deletedSet = new Set(loadDeletedUsers());
          const mapped = data
            .map((row: any) => {
              let parsedApprovedBy = row.approved_by || 'System Bootstrap';
              let parsedPassword = '';
              let parsedUsername = '';

              if (row.approved_by && typeof row.approved_by === 'string' && row.approved_by.startsWith('{')) {
                try {
                  const meta = JSON.parse(row.approved_by);
                  if (meta.by) parsedApprovedBy = meta.by;
                  if (meta.pwd) parsedPassword = meta.pwd;
                  if (meta.u) parsedUsername = meta.u;
                } catch (e) {}
              }

              const isInternalEmail = row.email && row.email.endsWith('@10med.internal');
              if (!parsedUsername) {
                parsedUsername = isInternalEmail
                  ? row.email.replace('@10med.internal', '')
                  : row.email ? row.email.split('@')[0] : `user_${row.id}`;
              }

              return {
                id: row.id,
                username: parsedUsername,
                password: parsedPassword,
                name: row.name,
                rank: row.rank,
                role: row.role,
                assignedBattery: row.assigned_battery,
                assignedBatteries: ['Admin', 'CO', 'Offr', 'RSM'].includes(row.role)
                  ? ['HQ Bty', 'P Bty', 'Q Bty', 'R Bty']
                  : [row.assigned_battery],
                email: row.email,
                isApproved: row.is_approved !== false,
                approvedBy: parsedApprovedBy,
                approvedAt: row.approved_at,
              };
            })
            .filter((u: any) => !deletedSet.has(String(u.id).toLowerCase()));

          return res.json({ success: true, count: mapped.length, users: mapped, source: 'supabase' });
        }
      }
      const users = loadServerUsers();
      res.json({ success: true, count: users.length, users });
    } catch (error: any) {
      const users = loadServerUsers();
      res.json({ success: true, count: users.length, users });
    }
  });

  // 2. Bulk sync users across all browsers and devices
  app.post('/api/users/sync', (req, res) => {
    try {
      const { users } = req.body;
      if (!Array.isArray(users) || users.length === 0) {
        return res.status(400).json({ success: false, error: 'Expected non-empty users array' });
      }
      saveServerUsers(users);
      res.json({ success: true, count: users.length });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 3. Upsert / update a single user (e.g. password change, profile edit)
  app.post('/api/users', (req, res) => {
    try {
      const user = req.body.user || req.body;
      if (!user || (!user.id && !user.username)) {
        return res.status(400).json({ success: false, error: 'Valid user object required' });
      }
      const current = loadServerUsers();
      const targetUsername = (user.username || '').toLowerCase();
      const targetId = user.id;

      const idx = current.findIndex(
        (u) =>
          (targetId && u.id === targetId) ||
          (targetUsername && u.username && u.username.toLowerCase() === targetUsername)
      );

      if (idx >= 0) {
        current[idx] = { ...current[idx], ...user };
      } else {
        current.push(user);
      }
      saveServerUsers(current);
      res.json({ success: true, user: idx >= 0 ? current[idx] : user, count: current.length });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 4. Delete a user (Permanently tombstones identifiers so user never resurrects)
  app.delete('/api/users/:id', (req, res) => {
    try {
      const target = (req.params.id || '').toLowerCase();
      const current = loadServerUsers();
      const targetUser = current.find(
        (u) =>
          (u.id && u.id.toLowerCase() === target) ||
          (u.username && u.username.toLowerCase() === target) ||
          (u.email && u.email.toLowerCase() === target)
      );
      if (targetUser) {
        saveDeletedUser([targetUser.id, targetUser.username, targetUser.email]);
      } else {
        saveDeletedUser([target]);
      }
      const filtered = current.filter(
        (u) =>
          u.id.toLowerCase() !== target &&
          (!u.username || u.username.toLowerCase() !== target) &&
          (!u.email || u.email.toLowerCase() !== target)
      );
      saveServerUsers(filtered);
      res.json({ success: true, count: filtered.length });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 4b. Get all deleted user identifiers (tombstones)
  app.get('/api/users/deleted', (req, res) => {
    try {
      res.json({ success: true, deleted: loadDeletedUsers() });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 5. Centralized app state sync
  app.get('/api/sync/state', (req, res) => {
    try {
      if (fs.existsSync(APP_STATE_FILE_PATH)) {
        const content = fs.readFileSync(APP_STATE_FILE_PATH, 'utf-8');
        res.json({ success: true, state: JSON.parse(content) });
      } else {
        res.json({ success: true, state: null });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/sync/state', (req, res) => {
    try {
      const { state } = req.body;
      if (state) {
        let current: any = {};
        if (fs.existsSync(APP_STATE_FILE_PATH)) {
          try {
            current = JSON.parse(fs.readFileSync(APP_STATE_FILE_PATH, 'utf-8')) || {};
          } catch (e) {}
        }
        const merged = {
          ...current,
          ...state,
          paradeRecords: {
            ...(current.paradeRecords || {}),
            ...(state.paradeRecords || {}),
          },
          paradeDutyAssignments: {
            ...(current.paradeDutyAssignments || {}),
            ...(state.paradeDutyAssignments || {}),
          },
          dutySessionStatuses: {
            ...(current.dutySessionStatuses || {}),
            ...(state.dutySessionStatuses || {}),
          },
          updatedAt: new Date().toISOString(),
        };
        fs.writeFileSync(APP_STATE_FILE_PATH, JSON.stringify(merged, null, 2), 'utf-8');
        
        // Also sync parade records and duty data to their dedicated files
        if (state.paradeRecords) {
          saveServerParadeRecords({ ...loadServerParadeRecords(), ...state.paradeRecords });
        }
        if (state.paradeDutyAssignments || state.dutySessionStatuses) {
          saveServerDutyData({
            assignments: state.paradeDutyAssignments,
            statuses: state.dutySessionStatuses,
          });
        }
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 5b. Centralized Parade Records API (Supabase prioritized)
  app.get('/api/parade-records', async (req, res) => {
    try {
      if (supabase) {
        const { data, error } = await supabase.from('parade_records').select('*');
        if (!error && Array.isArray(data) && data.length > 0) {
          const recordMap: Record<string, any> = {};
          data.forEach((row: any) => {
            if (row.id?.startsWith('duty_') || row.id?.startsWith('state_')) return;
            if (row.summary && typeof row.summary === 'object') {
              const key = row.summary.id || row.id.replace('parade_', '');
              recordMap[key] = {
                ...row.summary,
                id: key,
                date: row.date || row.summary.date,
                battery: row.battery || row.summary.battery,
                status: row.status || row.summary.status,
              };
            }
          });
          if (Object.keys(recordMap).length > 0) {
            return res.json({ success: true, count: Object.keys(recordMap).length, records: recordMap, source: 'supabase' });
          }
        }
      }
      let records = loadServerParadeRecords();
      if (fs.existsSync(APP_STATE_FILE_PATH)) {
        try {
          const appState = JSON.parse(fs.readFileSync(APP_STATE_FILE_PATH, 'utf-8')) || {};
          if (appState.paradeRecords) {
            records = { ...appState.paradeRecords, ...records };
          }
        } catch (e) {}
      }
      res.json({ success: true, count: Object.keys(records).length, records });
    } catch (error: any) {
      let records = loadServerParadeRecords();
      res.json({ success: true, count: Object.keys(records).length, records });
    }
  });

  app.post('/api/parade-records', (req, res) => {
    try {
      const { record, records } = req.body;
      const current = loadServerParadeRecords();
      if (record) {
        const recId = record.id || (record.date && record.typeId && record.battery ? `${record.date}_${record.typeId}_${record.battery}` : null);
        if (recId) {
          current[recId] = { ...record, id: recId };
        }
      }
      if (records && typeof records === 'object') {
        Object.assign(current, records);
      }
      saveServerParadeRecords(current);

      // Mirror to app_state.json
      try {
        let appState: any = {};
        if (fs.existsSync(APP_STATE_FILE_PATH)) {
          appState = JSON.parse(fs.readFileSync(APP_STATE_FILE_PATH, 'utf-8')) || {};
        }
        appState.paradeRecords = { ...(appState.paradeRecords || {}), ...current };
        fs.writeFileSync(APP_STATE_FILE_PATH, JSON.stringify(appState, null, 2), 'utf-8');
      } catch (e) {}

      res.json({ success: true, count: Object.keys(current).length });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 5c. Centralized Duty Detailing & Assignments API (Supabase prioritized)
  app.get('/api/duty-assignments', async (req, res) => {
    try {
      if (supabase) {
        const { data, error } = await supabase.from('parade_records').select('*').like('id', 'duty_%');
        if (!error && Array.isArray(data) && data.length > 0) {
          const assignments: Record<string, any[]> = {};
          const statuses: Record<string, any> = {};
          data.forEach((row: any) => {
            const summary = row.summary || {};
            const sessionType = summary.sessionType || 'morning';
            const key = `${row.date}_${sessionType}`;
            if (Array.isArray(summary.assignments) && summary.assignments.length > 0) {
              assignments[key] = summary.assignments;
            }
            if (summary.status || row.status) {
              statuses[key] = {
                status: summary.status || row.status || 'Saved',
                savedAt: summary.savedAt || row.created_at,
                savedBy: summary.savedBy || row.submitted_by,
              };
            }
          });
          return res.json({ success: true, assignments, statuses, rosterList: [], source: 'supabase' });
        }
      }
      let data = loadServerDutyData();
      if (fs.existsSync(APP_STATE_FILE_PATH)) {
        try {
          const appState = JSON.parse(fs.readFileSync(APP_STATE_FILE_PATH, 'utf-8')) || {};
          if (appState.paradeDutyAssignments) {
            data.assignments = { ...appState.paradeDutyAssignments, ...data.assignments };
          }
          if (appState.dutySessionStatuses) {
            data.statuses = { ...appState.dutySessionStatuses, ...data.statuses };
          }
        } catch (e) {}
      }
      res.json({ success: true, ...data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/duty-assignments', (req, res) => {
    try {
      const { assignments, statuses, rosterList } = req.body;
      saveServerDutyData({ assignments, statuses, rosterList });

      try {
        let appState: any = {};
        if (fs.existsSync(APP_STATE_FILE_PATH)) {
          appState = JSON.parse(fs.readFileSync(APP_STATE_FILE_PATH, 'utf-8')) || {};
        }
        if (assignments) {
          appState.paradeDutyAssignments = { ...(appState.paradeDutyAssignments || {}), ...assignments };
        }
        if (statuses) {
          appState.dutySessionStatuses = { ...(appState.dutySessionStatuses || {}), ...statuses };
        }
        fs.writeFileSync(APP_STATE_FILE_PATH, JSON.stringify(appState, null, 2), 'utf-8');
      } catch (e) {}

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 6. Centralized Personnel & Military History (Supabase prioritized)
  app.get('/api/personnel', async (req, res) => {
    try {
      if (supabase) {
        const pageSize = 1000;
        let data: any[] = [];
        let from = 0;
        let queryError: any = null;
        while (true) {
          const { data: chunk, error } = await supabase
            .from('personnel')
            .select('*')
            .range(from, from + pageSize - 1);
          if (error) {
            queryError = error;
            break;
          }
          if (!chunk || chunk.length === 0) break;
          data = data.concat(chunk);
          if (chunk.length < pageSize) break;
          from += pageSize;
        }

        if (!queryError && data.length > 0) {
          const mapped = data.map((row: any) => {
            let extra: any = {};
            if (row.status_details && typeof row.status_details === 'string' && row.status_details.trim().startsWith('{')) {
              try {
                extra = JSON.parse(row.status_details);
              } catch (e) {}
            }
            return {
              id: row.id,
              snkNo: row.army_no || row.id,
              rk: row.rank || 'Snk',
              name: row.name || '',
              battery: row.battery || 'HQ Bty',
              trade: row.trade || 'Gnr',
              status: row.parade_status || 'In Unit',
              statusDetails: extra.details || (typeof row.status_details === 'string' && !row.status_details.trim().startsWith('{') ? row.status_details : ''),
              medicalCategory: row.medical_category || 'AYE',
              phone: row.contact_no || '',
              mobileNo: row.contact_no || '',
              bloodGroup: row.blood_group || '',
              ...extra,
            };
          });
          return res.json({ success: true, count: mapped.length, data: mapped, source: 'supabase' });
        }
      }
      const list = loadServerPersonnel();
      res.json({ success: true, count: list.length, data: list, source: 'disk' });
    } catch (error: any) {
      const list = loadServerPersonnel();
      res.json({ success: true, count: list.length, data: list, source: 'fallback' });
    }
  });

  app.post('/api/personnel/bulk', (req, res) => {
    try {
      const { items } = req.body;
      if (Array.isArray(items) && items.length > 0) {
        saveServerPersonnel(items);
        return res.json({ success: true, count: items.length });
      }
      res.status(400).json({ success: false, error: 'Expected non-empty items array' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/personnel', (req, res) => {
    try {
      const person = req.body.person || req.body;
      if (!person || (!person.id && !person.snkNo)) {
        return res.status(400).json({ success: false, error: 'Valid personnel object required' });
      }
      const list = loadServerPersonnel();
      const targetId = person.id ? String(person.id).trim().toLowerCase() : '';
      const targetSnk = person.snkNo ? String(person.snkNo).trim().toLowerCase() : '';

      const idx = list.findIndex(
        (p) =>
          (targetId && p.id && String(p.id).trim().toLowerCase() === targetId) ||
          (targetSnk && p.snkNo && String(p.snkNo).trim().toLowerCase() === targetSnk) ||
          (targetId && p.snkNo && String(p.snkNo).trim().toLowerCase() === targetId) ||
          (targetSnk && p.id && String(p.id).trim().toLowerCase() === targetSnk)
      );
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...person };
      } else {
        list.unshift(person);
      }
      saveServerPersonnel(list);
      res.json({ success: true, person: idx >= 0 ? list[idx] : person, count: list.length });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete('/api/personnel/:id', (req, res) => {
    try {
      const rawTarget = String(req.params.id || '').trim().toLowerCase();
      if (!rawTarget) {
        return res.status(400).json({ success: false, error: 'Valid id required' });
      }
      const list = loadServerPersonnel();
      const filtered = list.filter((p) => {
        const idMatch = p.id && String(p.id).trim().toLowerCase() === rawTarget;
        const snkMatch = p.snkNo && String(p.snkNo).trim().toLowerCase() === rawTarget;
        const armyMatch = (p as any).armyNo && String((p as any).armyNo).trim().toLowerCase() === rawTarget;
        return !idMatch && !snkMatch && !armyMatch;
      });
      saveServerPersonnel(filtered);
      res.json({ success: true, count: filtered.length });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 7. Supabase-Only Year-Partitioned Team Management API (no hardcoded/mock fallback)
  app.get('/api/teams', async (req, res) => {
    try {
      if (!supabase) {
        return res.json({ success: true, activeTeams: [], teamHistory: [], deletedTeamIds: [], source: 'supabase', storageMode: 'none' });
      }

      // 1) Prefer dedicated public.teams table if provisioned in Supabase
      const { data: teamsRows, error: teamsErr } = await supabase
        .from('teams')
        .select('*')
        .order('year', { ascending: false })
        .order('created_at', { ascending: false });

      if (!teamsErr && Array.isArray(teamsRows)) {
        const activeTeams: any[] = [];
        const teamHistory: any[] = [];
        const deletedTeamIds: string[] = [];

        teamsRows.forEach((row: any) => {
          const parsedYear = Number(row.year) || (row.created_at ? new Date(row.created_at).getFullYear() : new Date().getFullYear());
          const item = {
            id: String(row.id),
            name: String(row.name || ''),
            year: parsedYear,
            description: row.description || '',
            memberIds: Array.isArray(row.member_ids) ? row.member_ids : [],
            snapshotMembers: Array.isArray(row.snapshot_members) ? row.snapshot_members : undefined,
            createdAt: row.created_at || new Date().toISOString(),
            updatedAt: row.updated_at || undefined,
            createdBy: row.created_by || undefined,
            isDeleted: Boolean(row.is_deleted),
            deletedAt: row.deleted_at || undefined,
            deletedBy: row.deleted_by || undefined,
          };
          if (item.isDeleted) {
            teamHistory.push(item);
            deletedTeamIds.push(item.id);
          } else {
            activeTeams.push(item);
          }
        });

        return res.json({
          success: true,
          activeTeams,
          teamHistory,
          deletedTeamIds,
          source: 'supabase',
          storageMode: 'teams_table',
        });
      }

      // 2) Automatic fallback: Year-partitioned rows inside public.parade_records (`teams_year_<YEAR>`)
      const { data: yrRows, error: yrErr } = await supabase
        .from('parade_records')
        .select('*')
        .like('id', 'teams_year_%')
        .order('date', { ascending: false });

      if (yrErr) {
        return res.json({ success: false, activeTeams: [], teamHistory: [], deletedTeamIds: [], error: yrErr.message, source: 'supabase' });
      }

      const activeTeams: any[] = [];
      const teamHistory: any[] = [];
      const deletedSet = new Set<string>();

      (yrRows || []).forEach((row: any) => {
        const s = row.summary || {};
        const rowYear = Number(s.year || row.date || String(row.id).replace('teams_year_', '')) || new Date().getFullYear();

        (Array.isArray(s.activeTeams) ? s.activeTeams : []).forEach((t: any) => {
          if (t && t.id && !t.isDeleted) {
            activeTeams.push({ ...t, year: Number(t.year) || rowYear });
          }
        });
        (Array.isArray(s.teamHistory) ? s.teamHistory : []).forEach((t: any) => {
          if (t && t.id) {
            teamHistory.push({ ...t, isDeleted: true, year: Number(t.year) || rowYear });
            deletedSet.add(String(t.id));
          }
        });
        (Array.isArray(s.deletedTeamIds) ? s.deletedTeamIds : []).forEach((id: string) => {
          if (id) deletedSet.add(String(id));
        });
      });

      res.json({
        success: true,
        activeTeams,
        teamHistory,
        deletedTeamIds: Array.from(deletedSet),
        source: 'supabase',
        storageMode: 'parade_records_yearly',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, activeTeams: [], teamHistory: [], deletedTeamIds: [], error: error.message });
    }
  });

  app.post('/api/teams', async (req, res) => {
    try {
      if (!supabase) {
        return res.status(503).json({ success: false, error: 'Supabase not configured' });
      }
      const activeTeams: any[] = Array.isArray(req.body.activeTeams) ? req.body.activeTeams : [];
      const teamHistory: any[] = Array.isArray(req.body.teamHistory) ? req.body.teamHistory : [];
      const deletedTeamIds: string[] = Array.isArray(req.body.deletedTeamIds) ? req.body.deletedTeamIds : [];

      const resolveYear = (t: any): number =>
        Number(t?.year) ||
        (t?.createdAt ? new Date(t.createdAt).getFullYear() : new Date().getFullYear()) ||
        new Date().getFullYear();

      // Check if public.teams exists
      const { error: probeErr } = await supabase.from('teams').select('id').limit(1);
      const hasTeamsTable = !probeErr;

      if (hasTeamsTable) {
        const allRows = [
          ...activeTeams.map((t) => ({
            id: t.id,
            name: t.name,
            year: resolveYear(t),
            description: t.description || '',
            member_ids: Array.isArray(t.memberIds) ? t.memberIds : [],
            snapshot_members: Array.isArray(t.snapshotMembers) ? t.snapshotMembers : null,
            is_deleted: false,
            created_by: t.createdBy || '',
            created_at: t.createdAt || new Date().toISOString(),
            updated_at: t.updatedAt || new Date().toISOString(),
            deleted_at: null,
            deleted_by: null,
          })),
          ...teamHistory.map((t) => ({
            id: t.id,
            name: t.name,
            year: resolveYear(t),
            description: t.description || '',
            member_ids: Array.isArray(t.memberIds) ? t.memberIds : [],
            snapshot_members: Array.isArray(t.snapshotMembers) ? t.snapshotMembers : null,
            is_deleted: true,
            created_by: t.createdBy || '',
            created_at: t.createdAt || new Date().toISOString(),
            updated_at: t.updatedAt || new Date().toISOString(),
            deleted_at: t.deletedAt || new Date().toISOString(),
            deleted_by: t.deletedBy || '',
          })),
        ];
        if (allRows.length > 0) {
          const { error: upsertErr } = await supabase.from('teams').upsert(allRows, { onConflict: 'id' });
          if (upsertErr) return res.status(500).json({ success: false, error: upsertErr.message });
        }
        return res.json({ success: true, storageMode: 'teams_table', count: allRows.length });
      }

      // Group strictly by year into separate `teams_year_<YEAR>` rows inside `parade_records`
      const byYear = new Map<number, { activeTeams: any[]; teamHistory: any[]; deletedTeamIds: string[] }>();
      const ensureBucket = (yr: number) => {
        if (!byYear.has(yr)) byYear.set(yr, { activeTeams: [], teamHistory: [], deletedTeamIds: [] });
        return byYear.get(yr)!;
      };

      activeTeams.forEach((t) => {
        const yr = resolveYear(t);
        ensureBucket(yr).activeTeams.push({ ...t, year: yr });
      });
      teamHistory.forEach((t) => {
        const yr = resolveYear(t);
        const bucket = ensureBucket(yr);
        bucket.teamHistory.push({ ...t, year: yr, isDeleted: true });
        if (!bucket.deletedTeamIds.includes(t.id)) bucket.deletedTeamIds.push(t.id);
      });

      // Also fetch existing teams_year_% rows so a year emptied out gets updated cleanly instead of leaving stale teams
      const { data: existingYrRows } = await supabase
        .from('parade_records')
        .select('id, date')
        .like('id', 'teams_year_%');

      (existingYrRows || []).forEach((r: any) => {
        const yr = Number(r.date || String(r.id).replace('teams_year_', ''));
        if (yr && !byYear.has(yr)) {
          byYear.set(yr, { activeTeams: [], teamHistory: [], deletedTeamIds: [] });
        }
      });

      const rowsToUpsert = Array.from(byYear.entries()).map(([yr, bucket]) => ({
        id: `teams_year_${yr}`,
        date: String(yr),
        battery: 'ALL',
        submitted_by: 'Team Management',
        status: 'Active',
        summary: {
          year: yr,
          activeTeams: bucket.activeTeams,
          teamHistory: bucket.teamHistory,
          deletedTeamIds: Array.from(new Set([...bucket.deletedTeamIds, ...deletedTeamIds.filter((dId) => bucket.teamHistory.some((h) => h.id === dId))])),
        },
      }));

      if (rowsToUpsert.length > 0) {
        const { error: upsertErr } = await supabase.from('parade_records').upsert(rowsToUpsert, { onConflict: 'id' });
        if (upsertErr) return res.status(500).json({ success: false, error: upsertErr.message });
      }

      res.json({ success: true, storageMode: 'parade_records_yearly', years: Array.from(byYear.keys()) });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete('/api/teams/:id', async (req, res) => {
    try {
      if (!supabase) {
        return res.status(503).json({ success: false, error: 'Supabase not configured' });
      }
      const targetId = String(req.params.id || '').trim();
      if (!targetId) {
        return res.status(400).json({ success: false, error: 'Team id is required' });
      }

      const { error: probeErr } = await supabase.from('teams').select('id').limit(1);
      if (!probeErr) {
        const { error: delErr } = await supabase.from('teams').delete().eq('id', targetId);
        if (delErr) return res.status(500).json({ success: false, error: delErr.message });
        return res.json({ success: true });
      }

      const { data: yrRows, error: fetchErr } = await supabase
        .from('parade_records')
        .select('*')
        .like('id', 'teams_year_%');
      if (fetchErr) return res.status(500).json({ success: false, error: fetchErr.message });

      const updates: any[] = [];
      (yrRows || []).forEach((row: any) => {
        const s = row.summary || {};
        const nextActive = (Array.isArray(s.activeTeams) ? s.activeTeams : []).filter((t: any) => t.id !== targetId);
        const nextHist = (Array.isArray(s.teamHistory) ? s.teamHistory : []).filter((t: any) => t.id !== targetId);
        const nextDel = (Array.isArray(s.deletedTeamIds) ? s.deletedTeamIds : []).filter((d: string) => d !== targetId);
        updates.push({
          ...row,
          summary: { ...s, activeTeams: nextActive, teamHistory: nextHist, deletedTeamIds: nextDel },
        });
      });

      if (updates.length > 0) {
        await supabase.from('parade_records').upsert(updates, { onConflict: 'id' });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 8. Centralized Courses & Qualifications Database Persistence (Cross-device sync)
  app.get('/api/courses', (req, res) => {
    try {
      const data = loadServerCourses();
      res.json({ success: true, ...data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/courses', (req, res) => {
    try {
      const { definitions, records } = req.body;
      saveServerCourses({ definitions, records });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 9. Supabase-Only Course Cadre API (no local/mock fallback)
  app.get('/api/course-cadre', async (req, res) => {
    try {
      if (!supabase) {
        return res.json({ success: true, records: [], source: 'supabase' });
      }
      const { data, error } = await supabase
        .from('course_cadre')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        return res.json({ success: false, records: [], error: error.message, source: 'supabase' });
      }
      res.json({ success: true, records: data || [], source: 'supabase' });
    } catch (error: any) {
      res.status(500).json({ success: false, records: [], error: error.message });
    }
  });

  app.post('/api/course-cadre', async (req, res) => {
    try {
      if (!supabase) {
        return res.status(503).json({ success: false, error: 'Supabase not configured' });
      }
      const rec = req.body;
      const row: Record<string, any> = {
        id: rec.id,
        course_id: rec.course_id || rec.courseId,
        course_name: rec.course_name || rec.courseName,
        snk_no: rec.snk_no || rec.snkNo,
        name: rec.name,
        rk: rec.rk || 'Snk',
        battery: rec.battery || 'HQ Bty',
        completion_date: rec.completion_date || rec.completionDate || '',
        location: rec.location || '',
        grade: rec.grade || 'Qualified',
        authority: rec.authority || '',
        remarks: rec.remarks || '',
      };
      const { error } = await supabase.from('course_cadre').upsert([row], { onConflict: 'id' });
      if (error) return res.status(500).json({ success: false, error: error.message });
      res.json({ success: true, record: row });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete('/api/course-cadre/:id', async (req, res) => {
    try {
      if (!supabase) {
        return res.status(503).json({ success: false, error: 'Supabase not configured' });
      }
      const { error } = await supabase.from('course_cadre').delete().eq('id', req.params.id);
      if (error) return res.status(500).json({ success: false, error: error.message });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 10. Supabase-Only Training State API (no local/mock fallback)
  app.get('/api/trg-state', async (req, res) => {
    try {
      if (!supabase) {
        return res.json({ success: true, records: [], source: 'supabase' });
      }
      const { data, error } = await supabase
        .from('trg_state')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        return res.json({ success: false, records: [], error: error.message, source: 'supabase' });
      }
      res.json({ success: true, records: data || [], source: 'supabase' });
    } catch (error: any) {
      res.status(500).json({ success: false, records: [], error: error.message });
    }
  });

  app.post('/api/trg-state', async (req, res) => {
    try {
      if (!supabase) {
        return res.status(503).json({ success: false, error: 'Supabase not configured' });
      }
      const rec = req.body;
      const row: Record<string, any> = {
        id: rec.id,
        module: rec.module,
        snk_no: rec.snk_no || rec.snkNo,
        name: rec.name,
        rk: rec.rk || 'Snk',
        battery: rec.battery || 'HQ Bty',
        grade: rec.grade || 'Qualified',
        score_details: rec.score_details || rec.scoreDetails || '',
        date: rec.date || '',
        location: rec.location || '',
        status: rec.status || 'Qualified',
        remarks: rec.remarks || '',
      };
      const { error } = await supabase.from('trg_state').upsert([row], { onConflict: 'id' });
      if (error) return res.status(500).json({ success: false, error: error.message });
      res.json({ success: true, record: row });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete('/api/trg-state/:id', async (req, res) => {
    try {
      if (!supabase) {
        return res.status(503).json({ success: false, error: 'Supabase not configured' });
      }
      const { error } = await supabase.from('trg_state').delete().eq('id', req.params.id);
      if (error) return res.status(500).json({ success: false, error: error.message });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // --- Vite Frontend Middleware ---
  if (process.env.NODE_ENV !== 'production') {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.on('error', (err: any) => {
    console.error('[Server HTTP Error]:', err?.message || err);
  });

  httpServer.listen(port, host, () => {
    console.log(`Server running on http://${host}:${port}`);
  });
}

startServer().catch((err) => {
  console.error('[Server Failed to Start]:', err);
});
