import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Personnel, UserAccount, DateWiseParadeRecord, ALL_BATTERIES } from '../types';

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
    // 1. Fetch current users in Supabase to calculate difference (prune deleted users) and preserve existing passwords
    const { data: existingRows, error: fetchErr } = await client
      .from('authorized_users')
      .select('id, email, name, approved_by');

    if (fetchErr) {
      console.warn('Supabase fetch existing users notice:', fetchErr.message);
    }

    const existingMetaMap = new Map<string, { by?: string; pwd?: string; u?: string }>();
    if (existingRows) {
      for (const row of existingRows) {
        if (row.approved_by && typeof row.approved_by === 'string' && row.approved_by.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(row.approved_by);
            if (row.id) existingMetaMap.set(row.id, parsed);
            if (row.email) existingMetaMap.set(row.email.toLowerCase(), parsed);
            if (parsed.u) existingMetaMap.set(parsed.u.toLowerCase(), parsed);
          } catch (e) {}
        }
      }
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

      const existingMeta =
        existingMetaMap.get(u.id) ||
        (u.email ? existingMetaMap.get(u.email.toLowerCase().trim()) : undefined) ||
        (u.username ? existingMetaMap.get(u.username.toLowerCase().trim()) : undefined);

      const finalPwd = u.password || existingMeta?.pwd || '';
      const finalU =
        u.username ||
        existingMeta?.u ||
        (userEmail.endsWith('@10med.internal')
          ? userEmail.replace('@10med.internal', '')
          : userEmail.split('@')[0]);
      const finalBy = u.approvedBy || existingMeta?.by || 'Admin';

      const userMeta = JSON.stringify({
        by: finalBy,
        pwd: finalPwd,
        u: finalU,
      });

      return {
        id: u.id || `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        email: userEmail,
        name: u.name || u.username,
        rank: u.rank || 'Capt',
        role: u.role || 'Offr',
        assigned_battery: u.assignedBattery || (u.assignedBatteries && u.assignedBatteries[0]) || 'HQ Bty',
        is_approved: u.isApproved !== false,
        approved_by: userMeta,
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

      const extraFields: Record<string, any> = {
        outOfUnitCategory: p.outOfUnitCategory,
        outOfUnitLocation: p.outOfUnitLocation,
        outOfUnitStartDate: p.outOfUnitStartDate,
        outOfUnitEndDate: p.outOfUnitEndDate,
        outOfUnitAuthority: p.outOfUnitAuthority,
        outOfUnitRemarks: p.outOfUnitRemarks,
        location: p.location,
        authority: p.authority,
        remarks: p.remarks || p.rmk,
        startDate: p.startDate,
        endDate: p.endDate,
        durationDays: p.durationDays,
        remainingDays: p.remainingDays,
        leaveType: p.leaveType,
        leaveFrom: p.leaveFrom,
        leaveTo: p.leaveTo,
        leaveAddress: p.leaveAddress,
        courseName: p.courseName,
        courseLocation: p.courseLocation,
        courseFrom: p.courseFrom,
        courseTo: p.courseTo,
        courseDuration: p.courseDuration,
        sickType: p.sickType,
        hospitalName: p.hospitalName,
        details: p.statusDetails,
      };

      const hasExtra = Object.entries(extraFields).some(
        ([k, v]) => k !== 'details' && v !== undefined && v !== null && v !== ''
      );
      const statusDetailsStr = hasExtra
        ? JSON.stringify(extraFields)
        : (p.statusDetails || '');

      return {
        id: p.id,
        army_no: armyNo,
        rank: p.rk,
        name: p.name,
        battery: p.battery,
        trade: p.trade || 'Gnr',
        parade_status: p.status || 'In Unit',
        status_details: statusDetailsStr,
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
 * Upsert a single personnel record directly to Supabase
 */
export const upsertSinglePersonnelToSupabase = async (
  p: Personnel
): Promise<{ success: boolean; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase configured নয়।' };
  try {
    const extraFields: Record<string, any> = {
      outOfUnitCategory: p.outOfUnitCategory,
      outOfUnitLocation: p.outOfUnitLocation,
      outOfUnitStartDate: p.outOfUnitStartDate,
      outOfUnitEndDate: p.outOfUnitEndDate,
      outOfUnitAuthority: p.outOfUnitAuthority,
      outOfUnitRemarks: p.outOfUnitRemarks,
      location: p.location,
      authority: p.authority,
      remarks: p.remarks || p.rmk,
      startDate: p.startDate,
      endDate: p.endDate,
      durationDays: p.durationDays,
      remainingDays: p.remainingDays,
      leaveType: p.leaveType,
      leaveFrom: p.leaveFrom,
      leaveTo: p.leaveTo,
      leaveAddress: p.leaveAddress,
      courseName: p.courseName,
      courseLocation: p.courseLocation,
      courseFrom: p.courseFrom,
      courseTo: p.courseTo,
      courseDuration: p.courseDuration,
      sickType: p.sickType,
      hospitalName: p.hospitalName,
      details: p.statusDetails,
    };

    const hasExtra = Object.entries(extraFields).some(
      ([k, v]) => k !== 'details' && v !== undefined && v !== null && v !== ''
    );
    const statusDetailsStr = hasExtra
      ? JSON.stringify(extraFields)
      : (p.statusDetails || '');

    const row = {
      id: p.id,
      army_no: (p.snkNo || p.id).trim(),
      rank: p.rk,
      name: p.name,
      battery: p.battery,
      trade: p.trade || 'Gnr',
      parade_status: p.status || 'In Unit',
      status_details: statusDetailsStr,
      medical_category: p.medicalCategory || 'AYE',
      contact_no: p.phone || p.mobileNo || '',
      blood_group: p.bloodGroup || '',
    };
    const { error } = await client.from('personnel').upsert([row], { onConflict: 'id' });
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.warn('Supabase upsertSinglePersonnel error:', err?.message);
    return { success: false, error: err?.message };
  }
};

/**
 * Batch update status for multiple personnel in Supabase
 */
export const batchUpdatePersonnelStatusInSupabase = async (
  ids: string[],
  status: string,
  statusDetails?: string
): Promise<{ success: boolean; error?: string }> => {
  const client = getSupabaseClient();
  if (!client || ids.length === 0) return { success: false, error: 'No client or IDs' };
  try {
    const { error } = await client
      .from('personnel')
      .update({
        parade_status: status,
        status_details: statusDetails || '',
      })
      .in('id', ids);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.warn('Supabase batch update status error:', err?.message);
    return { success: false, error: err?.message };
  }
};

/**
 * Delete a single personnel record from Supabase
 */
export const deleteSinglePersonnelFromSupabase = async (
  id: string,
  armyNo?: string
): Promise<{ success: boolean; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase configured নয়।' };
  try {
    let query = client.from('personnel').delete();
    if (id) {
      query = query.eq('id', id);
    } else if (armyNo) {
      query = query.eq('army_no', armyNo);
    }
    const { error } = await query;
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.warn('Supabase deleteSinglePersonnel error:', err?.message);
    return { success: false, error: err?.message };
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
        assignedBatteries:
          row.role === 'Admin' || row.role === 'CO' || row.role === 'Offr' || row.role === 'RSM'
            ? ALL_BATTERIES
            : [row.assigned_battery],
        email: row.email,
        isApproved: row.is_approved !== false,
        approvedBy: parsedApprovedBy,
        approvedAt: row.approved_at,
      };
    });

    return { success: true, users: mapped };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
};

/**
 * Verify User Credentials Directly with Supabase Database
 * Login strictly succeeds ONLY if username and password match Supabase!
 */
export const verifyUserCredentialsInSupabase = async (
  usernameOrEmail: string,
  passwordInput: string
): Promise<{ success: boolean; user?: UserAccount; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase ডাটাবেজ কানেকশন পাওয়া যায়নি।' };
  }

  try {
    const cleanInput = usernameOrEmail.trim().toLowerCase();
    const cleanPass = passwordInput.trim();

    if (!cleanInput) {
      return { success: false, error: 'অনুগ্রহ করে ইউজারনেম বা ইমেইল প্রদান করুন।' };
    }
    if (!cleanPass) {
      return { success: false, error: 'অনুগ্রহ করে পাসওয়ার্ড প্রদান করুন।' };
    }

    const { data, error } = await client
      .from('authorized_users')
      .select('*');

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return { success: false, error: 'Supabase ডাটাবেজে কোনো অনুমোদিত ইউজার পাওয়া যায়নি।' };
    }

    let matchedRow: any = null;
    let matchedUsername = '';
    let matchedPassword = '';
    let matchedApprovedBy = 'System';

    for (const row of data) {
      let rowUsername = '';
      let rowPassword = '';
      let rowApprovedBy = row.approved_by || 'System';

      if (row.approved_by && typeof row.approved_by === 'string' && row.approved_by.startsWith('{')) {
        try {
          const meta = JSON.parse(row.approved_by);
          if (meta.u) rowUsername = meta.u;
          if (meta.pwd) rowPassword = meta.pwd;
          if (meta.by) rowApprovedBy = meta.by;
        } catch (e) {}
      }

      const emailLower = (row.email || '').toLowerCase().trim();
      const idLower = (row.id || '').toLowerCase().trim();

      if (!rowUsername) {
        if (emailLower.endsWith('@10med.internal')) {
          rowUsername = emailLower.replace('@10med.internal', '');
        } else if (emailLower) {
          rowUsername = emailLower.split('@')[0];
        } else {
          rowUsername = idLower;
        }
      }

      const uLower = rowUsername.toLowerCase().trim();
      const isMatch =
        uLower === cleanInput ||
        emailLower === cleanInput ||
        idLower === cleanInput ||
        (cleanInput === 'guest' && (uLower === 'guest' || idLower.includes('guest')));

      if (isMatch) {
        matchedRow = row;
        matchedUsername = rowUsername;
        matchedPassword = rowPassword;
        matchedApprovedBy = rowApprovedBy;
        break;
      }
    }

    if (!matchedRow) {
      return {
        success: false,
        error: `ভুল ইউজারনেম! '${usernameOrEmail}' নামে Supabase ডাটাবেজে কোনো অ্যাকাউন্ট পাওয়া যায়নি।`,
      };
    }

    if (matchedRow.is_approved === false) {
      return {
        success: false,
        error: 'আপনার অ্যাকাউন্টটি Supabase ডাটাবেজে নিষ্ক্রিয় বা স্থগিত করা হয়েছে।',
      };
    }

    if (!matchedPassword) {
      return {
        success: false,
        error: 'এই ইউজারের পাসওয়ার্ড Supabase ডাটাবেজে পাওয়া যায়নি। অ্যাডমিনকে পাসওয়ার্ড রিসেট করতে বলুন।',
      };
    }

    if (cleanPass !== matchedPassword) {
      return {
        success: false,
        error: 'ভুল পাসওয়ার্ড! Supabase ডাটাবেজের তথ্যের সাথে মিলছে না।',
      };
    }

    const verifiedUser: UserAccount = {
      id: matchedRow.id,
      username: matchedUsername,
      password: matchedPassword,
      name: matchedRow.name,
      rank: matchedRow.rank,
      role: matchedRow.role,
      assignedBattery: matchedRow.assigned_battery,
      assignedBatteries:
        matchedRow.role === 'Admin' || matchedRow.role === 'CO' || matchedRow.role === 'Offr' || matchedRow.role === 'RSM'
          ? ALL_BATTERIES
          : [matchedRow.assigned_battery],
      email: matchedRow.email,
      isApproved: true,
      approvedBy: matchedApprovedBy,
      approvedAt: matchedRow.approved_at,
    };

    return { success: true, user: verifiedUser };
  } catch (err: any) {
    return {
      success: false,
      error: 'Supabase যাচাইকরণ ব্যর্থ: ' + (err?.message || 'ডাটাবেজ সংযোগে সমস্যা'),
    };
  }
};

/**
 * Fetch Personnel from Supabase
 */
export const fetchPersonnelFromSupabase = async (): Promise<{
  success: boolean;
  personnel?: Personnel[];
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
      .limit(2000);

    if (error) throw error;

    const mappedList: Personnel[] = (data || []).map((row: any) => {
      let extra: Record<string, any> = {};
      if (row.status_details && typeof row.status_details === 'string' && row.status_details.trim().startsWith('{')) {
        try {
          extra = JSON.parse(row.status_details);
        } catch (e) {}
      }

      const rawStatus = (row.parade_status || 'In Unit').trim();
      const rawDetails = extra.details || (typeof row.status_details === 'string' && !row.status_details.trim().startsWith('{') ? row.status_details : '');
      const detailsLower = (rawDetails || '').toLowerCase();
      const statusLower = rawStatus.toLowerCase();

      // Resolve outOfUnitCategory, leaveType, and normalized status
      let derivedOutOfUnitCategory: any = extra.outOfUnitCategory || undefined;
      let derivedLeaveType = extra.leaveType || undefined;
      let resolvedStatus = rawStatus;
      let location = extra.location || extra.outOfUnitLocation || undefined;
      let courseName = extra.courseName || undefined;
      let hospitalName = extra.hospitalName || undefined;

      if (!derivedOutOfUnitCategory) {
        if (rawStatus === 'Civilian' || detailsLower.includes('civilian')) {
          resolvedStatus = 'Civilian';
        } else if (rawStatus === 'P/Lve' || detailsLower.startsWith('p/lve') || detailsLower.includes('p/lve')) {
          derivedOutOfUnitCategory = 'P/Lve';
          derivedLeaveType = 'P/Lve';
          resolvedStatus = 'P/Lve';
        } else if (rawStatus === 'C/Lve' || detailsLower.startsWith('c/lve') || detailsLower.includes('c/lve')) {
          derivedOutOfUnitCategory = 'C/Lve';
          derivedLeaveType = 'C/Lve';
          resolvedStatus = 'C/Lve';
        } else if (statusLower.includes('leave')) {
          if (detailsLower.includes('p/lve')) {
            derivedOutOfUnitCategory = 'P/Lve';
            derivedLeaveType = 'P/Lve';
            resolvedStatus = 'P/Lve';
          } else {
            derivedOutOfUnitCategory = 'C/Lve';
            derivedLeaveType = 'C/Lve';
            resolvedStatus = 'C/Lve';
          }
        } else if (rawStatus === 'Course/Trg' || rawStatus === 'Course' || detailsLower.startsWith('course')) {
          derivedOutOfUnitCategory = 'Course';
          resolvedStatus = 'Course';
          if (!courseName && rawDetails.includes(':')) {
            courseName = rawDetails.split(':')[1]?.trim();
          }
        } else if (rawStatus === 'CMH/Sick' || rawStatus === 'CMH' || detailsLower.startsWith('cmh')) {
          derivedOutOfUnitCategory = 'CMH';
          resolvedStatus = 'CMH';
          if (!hospitalName && rawDetails) {
            hospitalName = rawDetails;
          }
        } else if (detailsLower.includes('ere') || detailsLower.includes('dgfi') || detailsLower.includes('bgb')) {
          derivedOutOfUnitCategory = 'ERE';
          resolvedStatus = 'ERE';
          if (!location && rawDetails) location = rawDetails;
        } else if (detailsLower.includes('mission') || detailsLower.includes('un mission') || detailsLower.includes('msn')) {
          derivedOutOfUnitCategory = 'Msn';
          resolvedStatus = 'Msn';
          if (!location && rawDetails) location = rawDetails;
        } else if (rawStatus === 'Attached Out' || detailsLower.includes('att')) {
          derivedOutOfUnitCategory = 'Att';
          resolvedStatus = 'Att';
          if (!location && rawDetails) location = rawDetails;
        } else if (detailsLower.includes('fdmn') || detailsLower.includes('হোয়াইকং')) {
          derivedOutOfUnitCategory = 'FDMN';
          resolvedStatus = 'FDMN';
          if (!location && rawDetails) location = rawDetails;
        } else if (rawStatus === 'Temp Duty' || detailsLower.includes('comd')) {
          derivedOutOfUnitCategory = 'Comd';
          resolvedStatus = 'Comd';
          if (!location && rawDetails) location = rawDetails;
        }
      }

      return {
        id: row.id,
        snkNo: row.army_no || row.id,
        rk: row.rank || 'Snk',
        name: row.name || '',
        battery: row.battery || 'HQ Bty',
        trade: row.trade || 'Gnr',
        status: resolvedStatus,
        statusDetails: rawDetails,
        medicalCategory: row.medical_category || 'AYE',
        phone: row.contact_no || '',
        mobileNo: row.contact_no || '',
        bloodGroup: row.blood_group || '',
        outOfUnitCategory: derivedOutOfUnitCategory,
        outOfUnitLocation: extra.outOfUnitLocation || location,
        outOfUnitStartDate: extra.outOfUnitStartDate || extra.startDate,
        outOfUnitEndDate: extra.outOfUnitEndDate || extra.endDate,
        outOfUnitAuthority: extra.outOfUnitAuthority || extra.authority,
        outOfUnitRemarks: extra.outOfUnitRemarks || extra.remarks,
        location: location,
        authority: extra.authority,
        remarks: extra.remarks,
        startDate: extra.startDate,
        endDate: extra.endDate,
        durationDays: extra.durationDays,
        remainingDays: extra.remainingDays,
        leaveType: derivedLeaveType,
        leaveFrom: extra.leaveFrom,
        leaveTo: extra.leaveTo,
        leaveAddress: extra.leaveAddress || location,
        courseName: courseName,
        courseLocation: extra.courseLocation,
        courseFrom: extra.courseFrom,
        courseTo: extra.courseTo,
        courseDuration: extra.courseDuration,
        sickType: extra.sickType,
        hospitalName: hospitalName,
      };
    });

    return { success: true, personnel: mappedList };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
};

/**
 * Save Date-Wise Parade Record (Draft, Submitted, Confirmed, Finalized) to Supabase
 */
export const saveParadeRecordToSupabase = async (
  record: DateWiseParadeRecord
): Promise<{ success: boolean; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase client is not configured.' };
  }

  try {
    const row = {
      id: `parade_${record.id}`,
      date: record.date,
      battery: record.battery,
      submitted_by: record.submittedBy || record.confirmedBy || 'User',
      status: record.status,
      summary: record,
    };

    const { error } = await client
      .from('parade_records')
      .upsert([row], { onConflict: 'id' });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.warn('Failed to save parade record to Supabase:', err);
    return { success: false, error: err?.message };
  }
};

/**
 * Fetch All Parade Records from Supabase
 */
export const fetchParadeRecordsFromSupabase = async (): Promise<{
  success: boolean;
  records?: Record<string, DateWiseParadeRecord>;
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
      .like('id', 'parade_%');

    if (error) throw error;

    const recordMap: Record<string, DateWiseParadeRecord> = {};
    (data || []).forEach((row: any) => {
      if (row.summary && typeof row.summary === 'object') {
        const rec = row.summary as DateWiseParadeRecord;
        const key = rec.id || row.id.replace('parade_', '');
        recordMap[key] = {
          ...rec,
          id: key,
          date: row.date || rec.date,
          battery: row.battery || rec.battery,
          status: row.status || rec.status,
        };
      }
    });

    return { success: true, records: recordMap };
  } catch (err: any) {
    console.warn('Failed to fetch parade records from Supabase:', err);
    return { success: false, error: err?.message };
  }
};

/**
 * Save generic app system state (settings, teams, parade points) to Supabase
 */
export const saveSystemStateToSupabase = async (
  key: string,
  data: any
): Promise<{ success: boolean; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase client is not configured.' };
  try {
    const row = {
      id: `state_${key}`,
      date: new Date().toISOString().split('T')[0],
      battery: 'ALL',
      submitted_by: 'System',
      status: 'Active',
      summary: data,
    };
    const { error } = await client.from('parade_records').upsert([row], { onConflict: 'id' });
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.warn(`Failed to save state_${key} to Supabase:`, err);
    return { success: false, error: err?.message };
  }
};

/**
 * Fetch generic app system state from Supabase
 */
export const fetchSystemStateFromSupabase = async (
  key: string
): Promise<{ success: boolean; data?: any; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase client is not configured.' };
  try {
    const { data, error } = await client
      .from('parade_records')
      .select('*')
      .eq('id', `state_${key}`)
      .maybeSingle();
    if (error) throw error;
    return { success: true, data: data?.summary };
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
