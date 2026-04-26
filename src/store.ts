import type { Program, WorkoutLog, LoggedSet, ProgressStatus, WeightEntry, UserSettings } from './types';

const PROGRAMS_KEY = 'wt_programs';
const LOGS_KEY = 'wt_logs';
const WEIGHT_KEY = 'wt_weight';
const SETTINGS_KEY = 'wt_settings';

// ── Programs ──────────────────────────────────────────────────────────────────

export function getPrograms(): Program[] {
  try { return JSON.parse(localStorage.getItem(PROGRAMS_KEY) ?? '[]'); } catch { return []; }
}
export function savePrograms(programs: Program[]): void {
  localStorage.setItem(PROGRAMS_KEY, JSON.stringify(programs));
}

// ── Logs ──────────────────────────────────────────────────────────────────────

export function getLogs(): WorkoutLog[] {
  try {
    const raw: WorkoutLog[] = JSON.parse(localStorage.getItem(LOGS_KEY) ?? '[]');
    return raw.filter((l) => !!l.programId);
  } catch { return []; }
}
export function saveLogs(logs: WorkoutLog[]): void {
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

// ── Weight entries ────────────────────────────────────────────────────────────

export function getWeightEntries(): WeightEntry[] {
  try { return JSON.parse(localStorage.getItem(WEIGHT_KEY) ?? '[]'); } catch { return []; }
}
export function saveWeightEntries(entries: WeightEntry[]): void {
  localStorage.setItem(WEIGHT_KEY, JSON.stringify(entries));
}

// ── User settings ─────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: UserSettings = { weightUnit: 'lbs' };

export function getSettings(): UserSettings {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') };
  } catch { return DEFAULT_SETTINGS; }
}
export function saveSettings(settings: UserSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ── Progress ─────────────────────────────────────────────────────────────────

export function getProgress(
  curr: { reps: number; weight: number },
  prev: LoggedSet | undefined
): ProgressStatus {
  if (!prev) return 'new';
  if (curr.weight > prev.weight) return 'improved';
  if (curr.weight < prev.weight) return 'declined';
  // weight is equal — reps decide
  if (curr.reps > prev.reps) return 'improved';
  if (curr.reps < prev.reps) return 'declined';
  return 'same';
}

export function getPrevSet(
  prevLog: WorkoutLog | null,
  exerciseId: string,
  setIndex: number
): LoggedSet | undefined {
  return prevLog?.sets.find((s) => s.exerciseId === exerciseId && s.setIndex === setIndex);
}

// ── Unit helpers ──────────────────────────────────────────────────────────────

export const KG_TO_LBS = 2.20462;
export const LBS_TO_KG = 0.453592;

export function toLbs(value: number, unit: 'lbs' | 'kg'): number {
  return unit === 'kg' ? parseFloat((value * KG_TO_LBS).toFixed(1)) : value;
}

export function fromLbs(valueLbs: number, unit: 'lbs' | 'kg'): number {
  return unit === 'kg' ? parseFloat((valueLbs * LBS_TO_KG).toFixed(1)) : valueLbs;
}
