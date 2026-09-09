import { UserAccount } from '../types';

/**
 * Server and Database Auto-Sync for User Accounts
 * Ensures that all browsers, tabs, and devices share the exact same user accounts and passwords.
 */

export async function fetchServerUsers(): Promise<UserAccount[] | null> {
  try {
    const res = await fetch('/api/users');
    if (!res.ok) return null;
    const json = await res.json();
    if (json.success && Array.isArray(json.users) && json.users.length > 0) {
      return json.users as UserAccount[];
    }
  } catch (err) {
    console.warn('[serverUserSync] Failed to fetch users from server:', err);
  }
  return null;
}

export async function syncUsersToServer(users: UserAccount[]): Promise<boolean> {
  try {
    const res = await fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users }),
    });
    if (!res.ok) return false;
    const json = await res.json();
    return !!json.success;
  } catch (err) {
    console.warn('[serverUserSync] Failed to sync users to server:', err);
    return false;
  }
}

export async function saveUserToServer(user: UserAccount): Promise<boolean> {
  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user }),
    });
    if (!res.ok) return false;
    const json = await res.json();
    return !!json.success;
  } catch (err) {
    console.warn('[serverUserSync] Failed to save user to server:', err);
    return false;
  }
}

export async function deleteUserFromServer(idOrUsername: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(idOrUsername)}`, {
      method: 'DELETE',
    });
    if (!res.ok) return false;
    const json = await res.json();
    return !!json.success;
  } catch (err) {
    console.warn('[serverUserSync] Failed to delete user from server:', err);
    return false;
  }
}

export async function fetchServerAppState(): Promise<any | null> {
  try {
    const res = await fetch('/api/sync/state');
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.state : null;
  } catch (err) {
    console.warn('[serverUserSync] Failed to fetch server app state:', err);
    return null;
  }
}

export async function saveServerAppState(state: any): Promise<boolean> {
  try {
    const res = await fetch('/api/sync/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state }),
    });
    if (!res.ok) return false;
    const json = await res.json();
    return !!json.success;
  } catch (err) {
    console.warn('[serverUserSync] Failed to save server app state:', err);
    return false;
  }
}
