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
const APP_STATE_FILE_PATH = path.join(DATA_DIR, 'app_state.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    console.warn('Could not create data dir:', e);
  }
}

function loadServerUsers(): any[] {
  try {
    if (fs.existsSync(USERS_FILE_PATH)) {
      const content = fs.readFileSync(USERS_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading server users:', err);
  }
  // Initialize with INITIAL_USERS
  try {
    fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(INITIAL_USERS, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error writing initial server users:', err);
  }
  return INITIAL_USERS;
}

function saveServerUsers(users: any[]): void {
  try {
    fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving server users:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

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

  // 4. Delete a user
  app.delete('/api/users/:id', (req, res) => {
    try {
      const target = (req.params.id || '').toLowerCase();
      const current = loadServerUsers();
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
        fs.writeFileSync(APP_STATE_FILE_PATH, JSON.stringify(state, null, 2), 'utf-8');
      }
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
