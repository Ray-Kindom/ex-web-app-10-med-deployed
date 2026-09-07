// Clean Zero-Dependency Authentication & Local Adapter
// Firebase dependency completely removed for maximum speed, simplicity, and reliability.

export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export type AuthenticatedUser = FirebaseUser;

export enum OperationType {
  READ = 'read',
  WRITE = 'write',
  LIST = 'list',
  DELETE = 'delete',
}

export const auth = {
  currentUser: null as FirebaseUser | null,
};

export const db = {};

export const googleProvider = {};

export const signInWithGoogle = async (emailOverride?: string): Promise<FirebaseUser> => {
  const email = emailOverride || 'mdraiyan1512@gmail.com';
  const user: FirebaseUser = {
    uid: `user_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
    email: email.toLowerCase().trim(),
    displayName: email.split('@')[0],
    photoURL: null,
  };
  localStorage.setItem('10med_auth_session', JSON.stringify(user));
  return user;
};

export const logoutFirebase = async (): Promise<void> => {
  localStorage.removeItem('10med_auth_session');
};

export const onAuthStateChanged = (
  _authInstance: any,
  callback: (user: FirebaseUser | null) => void
) => {
  const emit = () => {
    try {
      const saved = localStorage.getItem('10med_auth_session');
      if (saved) {
        callback(JSON.parse(saved));
        return;
      }
    } catch {}
    callback(null);
  };
  emit();
  window.addEventListener('storage', emit);
  return () => {
    window.removeEventListener('storage', emit);
  };
};

// No-op compatibility stubs so legacy calls don't crash
export const doc = (_db: any, collectionName: string, id: string) => ({ collectionName, id });
export const collection = (_db: any, collectionName: string) => ({ collectionName });
export const setDoc = async (_docRef: any, _data: any, _options?: any) => {};
export const deleteDoc = async (_docRef: any) => {};
export const getDocFromServer = async (_docRef: any) => ({ exists: () => false, data: () => null });
export const onSnapshot = (_ref: any, _onNext: any, _onError?: any) => () => {};

export const handleFirestoreError = (err: any, _op: OperationType, _path: string): Error => {
  return err instanceof Error ? err : new Error(String(err));
};
