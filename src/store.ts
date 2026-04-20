import type { Program, WorkoutLog, LoggedSet, ProgressStatus } from './types';

const PROGRAMS_KEY = 'wt_programs';
const LOGS_KEY = 'wt_logs';

// ── Programs ──────────────────────────────────────────────────────────────────

export function getPrograms(): Program[] {
  try {
    return JSON.parse(localStorage.getItem(PROGRAMS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function savePrograms(programs: Program[]): void {
  localStorage.setItem(PROGRAMS_KEY, JSON.stringify(programs));
}

// ── Logs ──────────────────────────────────────────────────────────────────────

export function getLogs(): WorkoutLog[] {
  try {
    const raw: WorkoutLog[] = JSON.parse(localStorage.getItem(LOGS_KEY) ?? '[]');
    // Drop any logs from the old schema that lack programId
    return raw.filter((l) => !!l.programId);
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
 * Returns the most recent log for the given program+split that occurred
 * strictly before `beforeDate`. Used for week-over-week comparison.
 */
export function getPreviousLog(
  programId: string,
  splitId: string,
  beforeDate: string
): WorkoutLog | null {
  const logs = getLogs()
    .filter((l) => l.programId === programId && l.splitId === splitId && l.date < beforeDate)
    .sort((a, b) => b.date.localeCompare(a.date));
  return logs[0] ?? null;
}

/**
 * Returns the log for this program+split on this exact date, if it exists.
 */
export function getLogForDate(
  programId: string,
  splitId: string,
  date: string
): WorkoutLog | undefined {
  return getLogs().find(
    (l) => l.programId === programId && l.splitId === splitId && l.date === date
  );
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
