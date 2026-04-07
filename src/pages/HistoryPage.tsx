import { useState } from 'react';
import type { WorkoutLog, Split, ProgressStatus } from '../types';
import { getLogs, getSplits, deleteLog, getProgress } from '../store';

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function weekLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  // Monday of that week
  const day = dt.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day);
  const mon = new Date(dt);
  mon.setDate(dt.getDate() + diff);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return `${mon.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${sun.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

function weekKey(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  const mon = new Date(dt);
  mon.setDate(dt.getDate() + diff);
  return mon.toISOString().slice(0, 10);
}

type WeekGroup = {
  key: string;
  label: string;
  logs: WorkoutLog[];
};

function groupByWeek(logs: WorkoutLog[]): WeekGroup[] {
  const map = new Map<string, WorkoutLog[]>();
  for (const log of logs) {
    const key = weekKey(log.date);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(log);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, logs]) => ({
      key,
      label: weekLabel(logs[0].date),
      logs: logs.sort((a, b) => b.date.localeCompare(a.date)),
    }));
}

export default function HistoryPage({ refreshKey }: { refreshKey?: number }) {
  const [logs, setLogs] = useState<WorkoutLog[]>(() => getLogs());
  const [splits] = useState<Split[]>(() => getSplits());
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Re-read logs when refreshKey changes (after a save on LogPage)
  const [lastKey, setLastKey] = useState(refreshKey);
  if (refreshKey !== lastKey) {
    setLastKey(refreshKey);
    setLogs(getLogs());
  }

  const weeks = groupByWeek(logs);

  function getSplitName(id: string) {
    return splits.find((s) => s.id === id)?.name ?? 'Unknown Split';
  }

  function getSplit(id: string): Split | undefined {
    return splits.find((s) => s.id === id);
  }

  function handleDelete(logId: string) {
    if (!confirm('Delete this workout log?')) return;
    deleteLog(logId);
    setLogs(getLogs());
    if (expandedLogId === logId) setExpandedLogId(null);
  }

  // Get the previous log for a given log (the one just before it, same split)
  function getPrevLogForLog(log: WorkoutLog): WorkoutLog | null {
    const sameSplit = logs
      .filter((l) => l.splitId === log.splitId && l.date < log.date)
      .sort((a, b) => b.date.localeCompare(a.date));
    return sameSplit[0] ?? null;
  }

  if (logs.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">History</h1>
        <p className="text-center text-gray-400 dark:text-gray-500 py-12 text-sm">
          No workouts logged yet. Head to the <strong>Log</strong> tab to record your first session.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">History</h1>

      {weeks.map((week) => (
        <div key={week.key}>
          <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
            Week of {week.label}
          </h2>
          <div className="space-y-2">
            {week.logs.map((log) => {
              const split = getSplit(log.splitId);
              const prevLog = getPrevLogForLog(log);
              const isExpanded = expandedLogId === log.id;

              // Progress summary counts
              let improved = 0, same = 0, declined = 0;
              if (prevLog && split) {
                for (const ex of split.exercises) {
                  const currSets = log.sets.filter((s) => s.exerciseId === ex.id);
                  for (const cs of currSets) {
                    const ps = prevLog.sets.find(
                      (s) => s.exerciseId === ex.id && s.setIndex === cs.setIndex
                    );
                    if (!ps) continue;
                    const status = getProgress({ reps: cs.reps, weight: cs.weight }, ps);
                    if (status === 'improved') improved++;
                    else if (status === 'same') same++;
                    else if (status === 'declined') declined++;
                  }
                }
              }
              const totalCompared = improved + same + declined;

              return (
                <div key={log.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
                  {/* Log header */}
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 select-none"
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                  >
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                        {getSplitName(log.splitId)}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatDate(log.date)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Progress badges */}
                      {totalCompared > 0 && (
                        <div className="flex gap-1.5 text-xs">
                          {improved > 0 && <span className="text-green-500 font-medium">✓{improved}</span>}
                          {same > 0 && <span className="text-orange-400 font-medium">●{same}</span>}
                          {declined > 0 && <span className="text-red-500 font-medium">✗{declined}</span>}
                        </div>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(log.id); }}
                        className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 rounded transition-colors"
                        title="Delete log"
                      >
                        <TrashIcon />
                      </button>
                      <span className="text-gray-300 dark:text-gray-600 text-xs">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && split && (
                    <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 space-y-4">
                      {split.exercises.map((ex) => {
                        const exSets = log.sets.filter((s) => s.exerciseId === ex.id);
                        if (exSets.length === 0) return null;

                        return (
                          <div key={ex.id}>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{ex.name}</p>
                            <div className="space-y-1">
                              {/* Header row */}
                              <div className="grid grid-cols-[2rem_1fr_1fr_1fr_2rem] gap-2 px-1 mb-1">
                                <span className="text-[10px] font-medium text-gray-400 text-center">#</span>
                                <span className="text-[10px] font-medium text-gray-400 text-center">Weight</span>
                                <span className="text-[10px] font-medium text-gray-400 text-center">Reps</span>
                                <span className="text-[10px] font-medium text-gray-400 text-center">RIR</span>
                                <span></span>
                              </div>
                              {exSets
                                .sort((a, b) => a.setIndex - b.setIndex)
                                .map((cs) => {
                                  const ps = prevLog?.sets.find(
                                    (s) => s.exerciseId === ex.id && s.setIndex === cs.setIndex
                                  );
                                  const status: ProgressStatus = getProgress(
                                    { reps: cs.reps, weight: cs.weight },
                                    ps
                                  );
                                  return (
                                    <div
                                      key={cs.setIndex}
                                      className="grid grid-cols-[2rem_1fr_1fr_1fr_2rem] gap-2 items-center"
                                    >
                                      <span className="text-xs text-gray-400 text-center">{cs.setIndex + 1}</span>
                                      <div className="text-center">
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{cs.weight}</span>
                                        {ps && ps.weight !== cs.weight && (
                                          <span className="text-[10px] text-gray-400 ml-1">({ps.weight})</span>
                                        )}
                                      </div>
                                      <div className="text-center">
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{cs.reps}</span>
                                        {ps && ps.reps !== cs.reps && (
                                          <span className="text-[10px] text-gray-400 ml-1">({ps.reps})</span>
                                        )}
                                      </div>
                                      <span className="text-sm text-gray-500 dark:text-gray-400 text-center">{cs.rir}</span>
                                      <div className="flex justify-center">
                                        <ProgressIcon status={status} hasPrev={!!ps} />
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        );
                      })}
                      {prevLog && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 pt-1">
                          Compared against: {formatDate(prevLog.date)}
                          {' '}· Previous values shown in parentheses.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProgressIcon({ status, hasPrev }: { status: ProgressStatus; hasPrev: boolean }) {
  if (!hasPrev || status === 'new') return <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>;
  if (status === 'improved') return <span className="text-green-500 text-base leading-none" title="Progress">✓</span>;
  if (status === 'same') return <span className="text-orange-400 text-base leading-none" title="No change">●</span>;
  if (status === 'declined') return <span className="text-red-500 text-base font-bold leading-none" title="Declined">✗</span>;
  return null;
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}
