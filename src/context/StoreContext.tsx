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
import type { Program, WorkoutLog, WeightEntry, UserSettings } from '../types';
import {
  getPrograms as lsGetPrograms,
  savePrograms as lsSavePrograms,
  getLogs as lsGetLogs,
  saveLogs as lsSaveLogs,
  getWeightEntries as lsGetWeight,
  saveWeightEntries as lsSaveWeight,
  getSettings as lsGetSettings,
  saveSettings as lsSaveSettings,
} from '../store';

// ── Context type ──────────────────────────────────────────────────────────────

interface StoreContextValue {
  user: User | null;
  authLoading: boolean;
  authError: string;
  programs: Program[];
  logs: WorkoutLog[];
  weightEntries: WeightEntry[];
  settings: UserSettings;
  persistPrograms: (programs: Program[]) => Promise<void>;
  upsertLog: (log: WorkoutLog) => Promise<void>;
  deleteLog: (id: string) => Promise<void>;
  upsertWeightEntry: (entry: WeightEntry) => Promise<void>;
  deleteWeightEntry: (id: string) => Promise<void>;
  saveSettings: (s: UserSettings) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  migrateFromLocalStorage: () => Promise<{ programs: number; logs: number; weight: number }>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

// ── Firestore refs ────────────────────────────────────────────────────────────

const googleProvider = new GoogleAuthProvider();

const programsRef = (uid: string) => collection(db, 'users', uid, 'programs');
const logsRef     = (uid: string) => collection(db, 'users', uid, 'logs');
const weightRef   = (uid: string) => collection(db, 'users', uid, 'weight');
const settingsDoc = (uid: string) => doc(db, 'users', uid, 'meta', 'settings');

// ── Error helpers ─────────────────────────────────────────────────────────────

function friendlyAuthError(err: any): string {
  const code: string = err?.code ?? '';
  const message: string = err?.message ?? String(err);
  switch (code) {
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized in Firebase. Add "nicolasdinh.github.io" under Firebase Console → Authentication → Settings → Authorized domains.';
    case 'auth/popup-blocked':
      return 'Popup was blocked by your browser. Trying redirect instead…';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    default:
      return code ? `Sign-in error (${code}): ${message}` : `Sign-in error: ${message}`;
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser]                   = useState<User | null>(null);
  const [authLoading, setAuthLoading]     = useState(true);
  const [authError, setAuthError]         = useState('');
  const [programs, setPrograms]           = useState<Program[]>([]);
  const [logs, setLogs]                   = useState<WorkoutLog[]>([]);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [settings, setSettings]           = useState<UserSettings>(() => lsGetSettings());

  // ── Auth ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => { if (result?.user) setAuthError(''); })
      .catch((err) => { setAuthError(friendlyAuthError(err)); setAuthLoading(false); });

    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (!u) {
        setPrograms(lsGetPrograms());
        setLogs(lsGetLogs());
        setWeightEntries(lsGetWeight());
        setSettings(lsGetSettings());
      }
    });
  }, []);

  // ── Firestore listeners ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const unsubs = [
      onSnapshot(programsRef(user.uid),
        (s) => setPrograms(s.docs.map((d) => d.data() as Program)),
        (e) => setAuthError(`Firestore error: ${e.message}`)
      ),
      onSnapshot(logsRef(user.uid),
        (s) => setLogs(s.docs.map((d) => d.data() as WorkoutLog)),
        (e) => setAuthError(`Firestore error: ${e.message}`)
      ),
      onSnapshot(weightRef(user.uid),
        (s) => setWeightEntries(s.docs.map((d) => d.data() as WeightEntry)),
        (e) => setAuthError(`Firestore error: ${e.message}`)
      ),
      onSnapshot(settingsDoc(user.uid),
        (s) => { if (s.exists()) setSettings(s.data() as UserSettings); },
        () => {}
      ),
    ];

    return () => unsubs.forEach((u) => u());
  }, [user]);

  // ── Mutations ───────────────────────────────────────────────────────────────

  const persistPrograms = useCallback(async (newPrograms: Program[]) => {
    if (user) {
      const batch = writeBatch(db);
      const ref = programsRef(user.uid);
      for (const p of newPrograms) batch.set(doc(ref, p.id), p);
      const newIds = new Set(newPrograms.map((p) => p.id));
      for (const e of programs) if (!newIds.has(e.id)) batch.delete(doc(ref, e.id));
      await batch.commit();
    } else {
      lsSavePrograms(newPrograms);
      setPrograms(newPrograms);
    }
  }, [user, programs]);

  const upsertLog = useCallback(async (log: WorkoutLog) => {
    if (user) {
      await setDoc(doc(logsRef(user.uid), log.id), log);
    } else {
      const current = lsGetLogs();
      const idx = current.findIndex((l) => l.id === log.id);
      const updated = idx >= 0 ? current.map((l) => l.id === log.id ? log : l) : [...current, log];
      lsSaveLogs(updated);
      setLogs(updated);
    }
  }, [user]);

  const deleteLog = useCallback(async (id: string) => {
    if (user) {
      await deleteDoc(doc(logsRef(user.uid), id));
    } else {
      const updated = lsGetLogs().filter((l) => l.id !== id);
      lsSaveLogs(updated);
      setLogs(updated);
    }
  }, [user]);

  const upsertWeightEntry = useCallback(async (entry: WeightEntry) => {
    if (user) {
      await setDoc(doc(weightRef(user.uid), entry.id), entry);
    } else {
      const current = lsGetWeight();
      const idx = current.findIndex((e) => e.id === entry.id);
      const updated = idx >= 0 ? current.map((e) => e.id === entry.id ? entry : e) : [...current, entry];
      lsSaveWeight(updated);
      setWeightEntries(updated);
    }
  }, [user]);

  const deleteWeightEntry = useCallback(async (id: string) => {
    if (user) {
      await deleteDoc(doc(weightRef(user.uid), id));
    } else {
      const updated = lsGetWeight().filter((e) => e.id !== id);
      lsSaveWeight(updated);
      setWeightEntries(updated);
    }
  }, [user]);

  const saveSettings = useCallback(async (s: UserSettings) => {
    setSettings(s);
    if (user) {
      await setDoc(settingsDoc(user.uid), s);
    } else {
      lsSaveSettings(s);
    }
  }, [user]);

  // ── Auth actions ────────────────────────────────────────────────────────────

  const signInWithGoogle = useCallback(async () => {
    setAuthError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
        await signInWithRedirect(auth, googleProvider);
      } else {
        setAuthError(friendlyAuthError(err));
      }
    }
  }, []);

  const signOut = useCallback(async () => {
    await fbSignOut(auth);
    setAuthError('');
    setPrograms(lsGetPrograms());
    setLogs(lsGetLogs());
    setWeightEntries(lsGetWeight());
    setSettings(lsGetSettings());
  }, []);

  // ── Migration ───────────────────────────────────────────────────────────────

  const migrateFromLocalStorage = useCallback(async () => {
    if (!user) throw new Error('Must be signed in to migrate');
    const lsPrograms = lsGetPrograms();
    const lsLogs = lsGetLogs().filter((l) => !!l.programId);
    const lsWeight = lsGetWeight();
    const batch = writeBatch(db);
    for (const p of lsPrograms) batch.set(doc(programsRef(user.uid), p.id), p);
    for (const l of lsLogs) batch.set(doc(logsRef(user.uid), l.id), l);
    for (const w of lsWeight) batch.set(doc(weightRef(user.uid), w.id), w);
    await batch.commit();
    return { programs: lsPrograms.length, logs: lsLogs.length, weight: lsWeight.length };
  }, [user]);

  // ── Value ───────────────────────────────────────────────────────────────────

  return (
    <StoreContext.Provider value={{
      user, authLoading, authError,
      programs, logs, weightEntries, settings,
      persistPrograms, upsertLog, deleteLog,
      upsertWeightEntry, deleteWeightEntry, saveSettings,
      signInWithGoogle, signOut, migrateFromLocalStorage,
    }}>
      {children}
    </StoreContext.Provider>
  );
}
