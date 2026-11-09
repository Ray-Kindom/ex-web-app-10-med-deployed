import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
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
  const PORT = 3000;

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

  // 1. Get all centralized users
  app.get('/api/users', (req, res) => {
    try {
      const users = loadServerUsers();
      res.json({ success: true, count: users.length, users });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
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

  // 5b. Centralized Parade Records API
  app.get('/api/parade-records', (req, res) => {
    try {
      let records = loadServerParadeRecords();
      // Also check if app_state has more records
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
      res.status(500).json({ success: false, error: error.message });
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

  // 5c. Centralized Duty Detailing & Assignments API
  app.get('/api/duty-assignments', (req, res) => {
    try {
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

  // 6. Centralized Personnel & Military History Server Disk Persistence
  app.get('/api/personnel', (req, res) => {
    try {
      const list = loadServerPersonnel();
      res.json({ success: true, count: list.length, data: list });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
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

  // 7. Centralized Custom Teams & Team History Database Persistence
  app.get('/api/teams', (req, res) => {
    try {
      const data = loadServerTeams();
      res.json({ success: true, ...data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/teams', (req, res) => {
    try {
      const { activeTeams, teamHistory, deletedTeamIds } = req.body;
      saveServerTeams({
        activeTeams: Array.isArray(activeTeams) ? activeTeams : [],
        teamHistory: Array.isArray(teamHistory) ? teamHistory : [],
        deletedTeamIds: Array.isArray(deletedTeamIds) ? deletedTeamIds : [],
      });
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

  // --- Vite Frontend Middleware ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
