import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { User } from 'firebase/auth';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut as fbSignOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  writeBatch,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import type { Program, WorkoutLog } from '../types';
import {
  getPrograms as lsGetPrograms,
  savePrograms as lsSavePrograms,
  getLogs as lsGetLogs,
  saveLogs as lsSaveLogs,
} from '../store';

// ── Context type ──────────────────────────────────────────────────────────────

interface StoreContextValue {
  user: User | null;
  authLoading: boolean;
  authError: string;
  programs: Program[];
  logs: WorkoutLog[];
  persistPrograms: (programs: Program[]) => Promise<void>;
  upsertLog: (log: WorkoutLog) => Promise<void>;
  deleteLog: (id: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  migrateFromLocalStorage: () => Promise<{ programs: number; logs: number }>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────

const googleProvider = new GoogleAuthProvider();

function programsRef(uid: string) {
  return collection(db, 'users', uid, 'programs');
}
function logsRef(uid: string) {
  return collection(db, 'users', uid, 'logs');
}

function friendlyAuthError(code: string): string {
  switch (code) {
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized in Firebase. Add "nicolasdinh.github.io" under Firebase Console → Authentication → Settings → Authorized domains.';
    case 'auth/popup-blocked':
      return 'Popup was blocked by your browser.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    default:
      return `Sign-in failed (${code}). Check the Firebase Console for details.`;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);

  // ── Auth: handle redirect result then start listener ────────────────────────
  useEffect(() => {
    // Must await redirect result before settling — Firebase won't fire
    // onAuthStateChanged with the new user until getRedirectResult resolves.
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) setAuthError('');
      })
      .catch((err) => {
        setAuthError(friendlyAuthError(err.code ?? ''));
        setAuthLoading(false);
      });

    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (!u) {
        setPrograms(lsGetPrograms());
        setLogs(lsGetLogs());
      }
    });
  }, []);

  // ── Firestore listeners ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const unsubPrograms = onSnapshot(
      programsRef(user.uid),
      (snap) => setPrograms(snap.docs.map((d) => d.data() as Program)),
      (err) => setAuthError(`Firestore error: ${err.message}`)
    );

    const unsubLogs = onSnapshot(
      logsRef(user.uid),
      (snap) => setLogs(snap.docs.map((d) => d.data() as WorkoutLog)),
      (err) => setAuthError(`Firestore error: ${err.message}`)
    );

    return () => { unsubPrograms(); unsubLogs(); };
  }, [user]);

  // ── Mutations ───────────────────────────────────────────────────────────────

  const persistPrograms = useCallback(
    async (newPrograms: Program[]) => {
      if (user) {
        const batch = writeBatch(db);
        const ref = programsRef(user.uid);
        for (const p of newPrograms) batch.set(doc(ref, p.id), p);
        const newIds = new Set(newPrograms.map((p) => p.id));
        for (const existing of programs) {
          if (!newIds.has(existing.id)) batch.delete(doc(ref, existing.id));
        }
        await batch.commit();
      } else {
        lsSavePrograms(newPrograms);
        setPrograms(newPrograms);
      }
    },
    [user, programs]
  );

  const upsertLog = useCallback(
    async (log: WorkoutLog) => {
      if (user) {
        await setDoc(doc(logsRef(user.uid), log.id), log);
      } else {
        const current = lsGetLogs();
        const idx = current.findIndex((l) => l.id === log.id);
        const updated =
          idx >= 0 ? current.map((l) => (l.id === log.id ? log : l)) : [...current, log];
        lsSaveLogs(updated);
        setLogs(updated);
      }
    },
    [user]
  );

  const deleteLog = useCallback(
    async (id: string) => {
      if (user) {
        await deleteDoc(doc(logsRef(user.uid), id));
      } else {
        const updated = lsGetLogs().filter((l) => l.id !== id);
        lsSaveLogs(updated);
        setLogs(updated);
      }
    },
    [user]
  );

  // ── Auth actions ────────────────────────────────────────────────────────────

  const signInWithGoogle = useCallback(async () => {
    setAuthError('');
    try {
      // Popup works best on desktop; redirect is more reliable on mobile
      await signInWithPopup(auth, googleProvider);
    } catch (popupErr: any) {
      if (
        popupErr.code === 'auth/popup-blocked' ||
        popupErr.code === 'auth/popup-closed-by-user'
      ) {
        // Fall back to redirect when popup is blocked
        await signInWithRedirect(auth, googleProvider);
      } else {
        setAuthError(friendlyAuthError(popupErr.code ?? ''));
      }
    }
  }, []);

  const signOut = useCallback(async () => {
    await fbSignOut(auth);
    setAuthError('');
    setPrograms(lsGetPrograms());
    setLogs(lsGetLogs());
  }, []);

  // ── Migration ───────────────────────────────────────────────────────────────

  const migrateFromLocalStorage = useCallback(async () => {
    if (!user) throw new Error('Must be signed in to migrate');
    const lsPrograms = lsGetPrograms();
    const lsLogs = lsGetLogs().filter((l) => !!l.programId);
    const batch = writeBatch(db);
    for (const p of lsPrograms) batch.set(doc(programsRef(user.uid), p.id), p);
    for (const l of lsLogs) batch.set(doc(logsRef(user.uid), l.id), l);
    await batch.commit();
    return { programs: lsPrograms.length, logs: lsLogs.length };
  }, [user]);

  // ── Value ───────────────────────────────────────────────────────────────────

  return (
    <StoreContext.Provider
      value={{
        user,
        authLoading,
        authError,
        programs,
        logs,
        persistPrograms,
        upsertLog,
        deleteLog,
        signInWithGoogle,
        signOut,
        migrateFromLocalStorage,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}
