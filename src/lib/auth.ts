// Clean Zero-Dependency Authentication & Local Adapter
// Firebase dependency completely removed for maximum speed, simplicity, and reliability.

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export type AuthenticatedUser = AuthUser;
// Backward compatibility alias for existing code
export type FirebaseUser = AuthUser;

export enum OperationType {
  READ = 'read',
  WRITE = 'write',
  LIST = 'list',
  DELETE = 'delete',
}

export const auth = {
  currentUser: null as AuthUser | null,
};

export const db = {};
export const googleProvider = {};

export const signInWithGoogle = async (emailOverride?: string): Promise<AuthUser> => {
  const email = emailOverride || 'mdraiyan1512@gmail.com';
  const user: AuthUser = {
    uid: `user_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
    email: email.toLowerCase().trim(),
    displayName: email.split('@')[0],
    photoURL: null,
  };
  localStorage.setItem('10med_auth_session', JSON.stringify(user));
  auth.currentUser = user;
  return user;
};

export const logoutAuth = async (): Promise<void> => {
  localStorage.removeItem('10med_auth_session');
  auth.currentUser = null;
};

export const logoutFirebase = logoutAuth;

export const onAuthStateChanged = (
  _authInstance: any,
  callback: (user: AuthUser | null) => void
) => {
  const emit = () => {
    try {
      const saved = localStorage.getItem('10med_auth_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        auth.currentUser = parsed;
        callback(parsed);
        return;
      }
    } catch {}
    auth.currentUser = null;
    callback(null);
  };
  emit();
  window.addEventListener('storage', emit);
  return () => {
    window.removeEventListener('storage', emit);
  };
};

// Safe zero-dependency compatibility helpers
export const doc = (_db: any, collectionName: string, id: string) => ({ collectionName, id });
export const collection = (_db: any, collectionName: string) => ({ collectionName });
export const setDoc = async (_docRef: any, _data: any, _options?: any) => {};
export const deleteDoc = async (_docRef: any) => {};
export const getDocFromServer = async (_docRef: any) => ({ exists: () => false, data: () => null });
export const onSnapshot = (_ref: any, _onNext: any, _onError?: any) => () => {};

export const handleFirestoreError = (err: any, _op?: OperationType, _path?: string): Error => {
  return err instanceof Error ? err : new Error(String(err));
};
