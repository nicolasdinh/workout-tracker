import type { Split, WorkoutLog, LoggedSet, ProgressStatus } from './types';

const SPLITS_KEY = 'wt_splits';
const LOGS_KEY = 'wt_logs';

// ── Splits ────────────────────────────────────────────────────────────────────

export function getSplits(): Split[] {
  try {
    return JSON.parse(localStorage.getItem(SPLITS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function saveSplits(splits: Split[]): void {
  localStorage.setItem(SPLITS_KEY, JSON.stringify(splits));
}

// ── Logs ──────────────────────────────────────────────────────────────────────

export function getLogs(): WorkoutLog[] {
  try {
    return JSON.parse(localStorage.getItem(LOGS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function saveLogs(logs: WorkoutLog[]): void {
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

export function upsertLog(log: WorkoutLog): void {
  const logs = getLogs();
  const idx = logs.findIndex((l) => l.id === log.id);
  if (idx >= 0) {
    logs[idx] = log;
  } else {
    logs.push(log);
  }
  saveLogs(logs);
}

export function deleteLog(id: string): void {
  saveLogs(getLogs().filter((l) => l.id !== id));
}

/**
 * Returns the most recent log for the given split that occurred strictly
 * before `beforeDate` (YYYY-MM-DD). Used for week-over-week comparison.
 */
export function getPreviousLog(splitId: string, beforeDate: string): WorkoutLog | null {
  const logs = getLogs()
    .filter((l) => l.splitId === splitId && l.date < beforeDate)
    .sort((a, b) => b.date.localeCompare(a.date));
  return logs[0] ?? null;
}

/**
 * Returns the log for this split on this exact date, if it exists.
 */
export function getLogForDate(splitId: string, date: string): WorkoutLog | undefined {
  return getLogs().find((l) => l.splitId === splitId && l.date === date);
}

// ── Progress ─────────────────────────────────────────────────────────────────

export function getProgress(
  curr: { reps: number; weight: number },
  prev: LoggedSet | undefined
): ProgressStatus {
  if (!prev) return 'new';
  const weightDown = curr.weight < prev.weight;
  const repsDown = curr.reps < prev.reps;
  const weightUp = curr.weight > prev.weight;
  const repsUp = curr.reps > prev.reps;
  if (weightDown || repsDown) return 'declined';
  if (weightUp || repsUp) return 'improved';
  return 'same';
}

export function getPrevSet(
  prevLog: WorkoutLog | null,
  exerciseId: string,
  setIndex: number
): LoggedSet | undefined {
  return prevLog?.sets.find(
    (s) => s.exerciseId === exerciseId && s.setIndex === setIndex
  );
}
