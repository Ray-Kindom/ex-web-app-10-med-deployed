import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Personnel, UserAccount, DateWiseParadeRecord } from '../types';

// Read Vite client-side environment variables or provided Supabase project credentials
const SUPABASE_URL = (
  import.meta.env.VITE_SUPABASE_URL ||
  'https://pulzsiyjvnshychyxuix.supabase.co'
).trim();

const SUPABASE_ANON_KEY = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1bHpzaXlqdm5zaHljaHl4dWl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NzgzNDAsImV4cCI6MjEwNDM1NDM0MH0.R1xAohrTO61jjTYybM8PdnV6w5RnQyhBCLI8F4Yf4VA'
).trim();

let clientInstance: SupabaseClient | null = null;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
};

export const getSupabaseClient = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) return null;
  if (!clientInstance) {
    try {
      clientInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      return null;
    }
  }
  return clientInstance;
};

export const testSupabaseConnection = async (): Promise<{
  success: boolean;
  message: string;
  url?: string;
}> => {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message: 'Supabase URL অথবা Anon Key সেট করা হয়নি। অনুগ্রহ করে .env ফাইলে VITE_SUPABASE_URL ও VITE_SUPABASE_ANON_KEY যুক্ত করুন।',
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase ক্লায়েন্ট ইনিশিয়ালাইজ করা সম্ভব হয়নি।',
    };
  }

  try {
    // Attempt a light query on authorized_users or metadata
    const { error } = await client.from('authorized_users').select('count', { count: 'exact', head: true });
    if (error && error.code !== 'PGRST116') {
      // Table might not exist yet, but connection is reached if it gave table error
      if (error.message.includes('relation "public.authorized_users" does not exist') || error.code === '42P01') {
        return {
          success: true,
          url: SUPABASE_URL,
          message: 'Supabase কানেকশন সফল! তবে প্রয়োজনীয় টেবিলগুলো এখনো তৈরি হয়নি। নিচের SQL স্ক্রিপ্টটি Supabase SQL Editor-এ রান করুন।',
        };
      }
      return {
        success: false,
        message: `Supabase ত্রুটি: ${error.message} (${error.code || ''})`,
      };
    }
    return {
      success: true,
      url: SUPABASE_URL,
      message: 'Supabase PostgreSQL ডাটাবেজ সফলভাবে সংযুক্ত রয়েছে!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `কানেকশন টেস্ট ব্যর্থ হয়েছে: ${err?.message || 'Unknown network error'}`,
    };
  }
};

/**
 * Synchronize Authorized Users (Gmail Whitelist & Admin User Accounts) to Supabase
 * Handles full reconciliation: deletes users from Supabase that are not in the local active users list,
 * and upserts all remaining active users.
 */
export const syncAuthorizedUsersToSupabase = async (
  users: UserAccount[]
): Promise<{ success: boolean; count: number; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, count: 0, error: 'Supabase configured নয়।' };
  }

  try {
    // 1. Fetch current users in Supabase to calculate difference (prune deleted users)
    const { data: existingRows, error: fetchErr } = await client
      .from('authorized_users')
      .select('id, email, name');

    if (fetchErr) {
      console.warn('Supabase fetch existing users notice:', fetchErr.message);
    }

    // Build sets of active user identifiers
    const activeEmails = new Set<string>();
    const activeIds = new Set<string>();
    const activeUsernames = new Set<string>();

    const payload = users.map((u) => {
      const userEmail = (u.email && u.email.trim().length > 0)
        ? u.email.toLowerCase().trim()
        : `${(u.username || u.id).toLowerCase().replace(/[^a-z0-9_-]/g, '_')}@10med.internal`;

      activeEmails.add(userEmail);
      if (u.email) activeEmails.add(u.email.toLowerCase().trim());
      if (u.id) activeIds.add(u.id);
      if (u.username) activeUsernames.add(u.username.toLowerCase().trim());

      return {
        id: u.id || `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        email: userEmail,
        name: u.name || u.username,
        rank: u.rank || 'Capt',
        role: u.role || 'Offr',
        assigned_battery: u.assignedBattery || (u.assignedBatteries && u.assignedBatteries[0]) || 'HQ Bty',
        is_approved: u.isApproved !== false,
        approved_by: u.approvedBy || 'Admin',
        approved_at: u.approvedAt || new Date().toISOString(),
      };
    });

    // 2. Prune rows from Supabase that were deleted locally
    if (existingRows && existingRows.length > 0) {
      const idsToDelete: string[] = [];
      const emailsToDelete: string[] = [];

      for (const row of existingRows) {
        const rowEmail = (row.email || '').toLowerCase().trim();
        const rowId = row.id;
        const rowUsername = rowEmail.endsWith('@10med.internal')
          ? rowEmail.replace('@10med.internal', '')
          : (rowEmail.split('@')[0] || '');

        const isMatch =
          (rowEmail && activeEmails.has(rowEmail)) ||
          (rowId && activeIds.has(rowId)) ||
          (rowUsername && activeUsernames.has(rowUsername));

        if (!isMatch) {
          if (rowId) idsToDelete.push(rowId);
          if (rowEmail) emailsToDelete.push(rowEmail);
        }
      }

      if (idsToDelete.length > 0) {
        await client.from('authorized_users').delete().in('id', idsToDelete);
      }
      if (emailsToDelete.length > 0) {
        await client.from('authorized_users').delete().in('email', emailsToDelete);
      }
    }

    if (payload.length === 0) {
      return { success: true, count: 0 };
    }

    // 3. Upsert current active users
    const { error } = await client
      .from('authorized_users')
      .upsert(payload, { onConflict: 'email' });

    if (error) {
      throw error;
    }

    return { success: true, count: payload.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message || 'Supabase sync failed' };
  }
};

/**
 * Delete Authorized User from Supabase by ID, email, username, or synthetic internal email
 */
export const deleteAuthorizedUserFromSupabase = async (
  userId: string,
  userEmail?: string,
  username?: string
): Promise<{ success: boolean; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase configured নয়।' };
  }

  try {
    // Delete by ID
    if (userId) {
      await client.from('authorized_users').delete().eq('id', userId);
    }

    // Delete by explicit email if available
    if (userEmail && userEmail.trim()) {
      const cleanEmail = userEmail.toLowerCase().trim();
      await client.from('authorized_users').delete().eq('email', cleanEmail);
    }

    // Delete by synthetic email and username variants
    if (username && username.trim()) {
      const cleanU = username.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '_');
      const syntheticEmail = `${cleanU}@10med.internal`;
      await client.from('authorized_users').delete().eq('email', syntheticEmail);
      await client.from('authorized_users').delete().eq('id', cleanU);
      await client.from('authorized_users').delete().eq('id', `user_${cleanU}`);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
};

/**
 * Synchronize Master Personnel to Supabase
 */
export const syncPersonnelToSupabase = async (
  personnel: Personnel[]
): Promise<{ success: boolean; count: number; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, count: 0, error: 'Supabase configured নয়।' };
  }

  try {
    const seenArmyNos = new Set<string>();
    const allRows = personnel.map((p) => {
      let armyNo = (p.snkNo || p.id).trim();
      if (seenArmyNos.has(armyNo)) {
        armyNo = `${armyNo}-${p.id}`;
      }
      seenArmyNos.add(armyNo);
      return {
        id: p.id,
        army_no: armyNo,
        rank: p.rk,
        name: p.name,
        battery: p.battery,
        trade: p.trade || 'Gnr',
        parade_status: p.status || 'Present',
        status_details: p.statusDetails || '',
        medical_category: p.medicalCategory || 'AYE',
        contact_no: p.phone || p.mobileNo || '',
        blood_group: p.bloodGroup || '',
      };
    });

    // Process in batches of 100 for safety
    const batchSize = 100;
    let successCount = 0;

    for (let i = 0; i < allRows.length; i += batchSize) {
      const chunk = allRows.slice(i, i + batchSize);

      const { error } = await client
        .from('personnel')
        .upsert(chunk, { onConflict: 'id' });

      if (error) throw error;
      successCount += chunk.length;
    }

    return { success: true, count: successCount };
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message || 'Personnel sync failed' };
  }
};

/**
 * Fetch Whitelisted Users from Supabase
 */
export const fetchAuthorizedUsersFromSupabase = async (): Promise<{
  success: boolean;
  users?: UserAccount[];
  error?: string;
}> => {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase configured নয়।' };
  }

  try {
    const { data, error } = await client
      .from('authorized_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const mapped: UserAccount[] = (data || []).map((row: any) => {
      const isInternalEmail = row.email && row.email.endsWith('@10med.internal');
      const parsedUsername = isInternalEmail 
        ? row.email.replace('@10med.internal', '') 
        : row.email ? row.email.split('@')[0] : `user_${row.id}`;

      return {
        id: row.id,
        username: parsedUsername,
        name: row.name,
        rank: row.rank,
        role: row.role,
        assignedBattery: row.assigned_battery,
        assignedBatteries:
          row.role === 'Admin' || row.role === 'CO' || row.role === 'Offr' || row.role === 'RSM'
            ? ['HQ Bty', 'P Bty', 'Q Bty', 'R Bty']
            : [row.assigned_battery],
        email: row.email,
        isApproved: row.is_approved !== false,
        approvedBy: row.approved_by,
        approvedAt: row.approved_at,
      };
    });

    return { success: true, users: mapped };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
};

/**
 * Fetch Personnel from Supabase
 */
export const fetchPersonnelFromSupabase = async (): Promise<{
  success: boolean;
  personnel?: any[];
  error?: string;
}> => {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase configured নয়।' };
  }

  try {
    const { data, error } = await client
      .from('personnel')
      .select('*')
      .limit(1000);

    if (error) throw error;
    return { success: true, personnel: data || [] };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
};

/**
 * Save Duty Detailing Assignments and Session Status to Supabase
 */
export const saveDutyDetailingToSupabase = async (
  date: string,
  sessionType: string,
  assignments: any[],
  status: string = 'Saved',
  savedBy?: string
): Promise<{ success: boolean; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase client is not configured.' };
  }

  try {
    const recordId = `duty_${date}_${sessionType}`;
    const now = new Date().toISOString();
    const payload = {
      id: recordId,
      date,
      battery: 'Consolidated',
      submitted_by: savedBy || 'RSM',
      status,
      summary: {
        sessionType,
        status,
        savedBy: savedBy || 'RSM',
        savedAt: now,
        assignments,
      },
    };

    const { error } = await client
      .from('parade_records')
      .upsert([payload], { onConflict: 'id' });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.warn('Failed to save duty detailing to Supabase:', err);
    return { success: false, error: err?.message };
  }
};

/**
 * Fetch All Saved Duty Detailings from Supabase
 */
export const fetchAllDutyDetailingFromSupabase = async (): Promise<{
  success: boolean;
  records?: Array<{
    date: string;
    sessionType: string;
    assignments: any[];
    status: any;
  }>;
  error?: string;
}> => {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase client is not configured.' };
  }

  try {
    const { data, error } = await client
      .from('parade_records')
      .select('*')
      .like('id', 'duty_%');

    if (error) throw error;

    const parsed = (data || []).map((row: any) => {
      const summary = row.summary || {};
      return {
        date: row.date,
        sessionType: summary.sessionType || 'morning',
        assignments: Array.isArray(summary.assignments) ? summary.assignments : [],
        status: {
          status: summary.status || row.status || 'Saved',
          savedAt: summary.savedAt || row.created_at,
          savedBy: summary.savedBy || row.submitted_by,
        },
      };
    });

    return { success: true, records: parsed };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
};

/**
 * SQL Schema DDL Generator for Supabase SQL Editor
 */
export const getSupabaseSchemaSql = (): string => {
  return `-- =========================================================================
-- 10 MEDIUM REGIMENT ARTILLERY - SUPABASE POSTGRESQL SCHEMA
-- Paste and run this script in the Supabase SQL Editor (supabase.com/dashboard)
-- =========================================================================

-- 1. Authorized Users (Strict Gmail Whitelist & Roles)
create table if not exists public.authorized_users (
  id text primary key,
  email text not null unique,
  name text not null,
  rank text not null default 'Capt',
  role text not null default 'Offr',
  assigned_battery text not null default 'HQ Bty',
  is_approved boolean default true,
  approved_by text default 'Master Admin',
  approved_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- Index for fast whitelist authentication checks
create index if not exists idx_auth_users_email on public.authorized_users (lower(email));

-- 2. Master Personnel (605 Soldiers & Officers)
create table if not exists public.personnel (
  id text primary key,
  army_no text not null,
  rank text not null,
  name text not null,
  battery text not null,
  trade text default 'Gnr',
  parade_status text default 'Present',
  status_details text,
  medical_category text default 'AYE',
  contact_no text,
  blood_group text,
  created_at timestamp with time zone default now()
);

create index if not exists idx_personnel_armyno on public.personnel (army_no);

create index if not exists idx_personnel_bty on public.personnel (battery);
create index if not exists idx_personnel_status on public.personnel (parade_status);

-- 3. Daily Parade Records (State by Date & Battery)
create table if not exists public.parade_records (
  id text primary key,
  date text not null,
  battery text not null,
  submitted_by text,
  status text default 'SUBMITTED',
  summary jsonb,
  created_at timestamp with time zone default now()
);

create index if not exists idx_parade_date on public.parade_records (date);

-- 4. Enable Row Level Security (RLS) & Public Read/Write for Authenticated App Service
alter table public.authorized_users enable row level security;
alter table public.personnel enable row level security;
alter table public.parade_records enable row level security;

-- Simple Access Policies (Allow read/write with anon key or authenticated user)
create policy "Allow all access to authorized_users" on public.authorized_users for all using (true) with check (true);
create policy "Allow all access to personnel" on public.personnel for all using (true) with check (true);
create policy "Allow all access to parade_records" on public.parade_records for all using (true) with check (true);

-- Insert Initial Master Admin
insert into public.authorized_users (id, email, name, rank, role, assigned_battery, is_approved, approved_by)
values 
  ('owner_admin', 'mdraiyan1512@gmail.com', 'Master Admin', 'Major', 'Admin', 'HQ Bty', true, 'System Bootstrap'),
  ('regt_admin', 'int10med2026@gmail.com', 'Regimental HQ Admin', 'Capt', 'Admin', 'HQ Bty', true, 'System Bootstrap')
on conflict (email) do nothing;
`;
};
