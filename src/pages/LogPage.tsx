import { useState, useEffect, useCallback } from 'react';
import type { Split, WorkoutLog, LoggedSet, ProgressStatus } from '../types';
import { useStore } from '../context/StoreContext';
import { getProgress, getPrevSet } from '../store';

function today() {
  return new Date().toISOString().slice(0, 10);
}

type SetDraft = { reps: string; weight: string; rir: string };
type ExerciseDraft = { exerciseId: string; sets: SetDraft[] };

function blankSet(): SetDraft {
  return { reps: '', weight: '', rir: '' };
}

function buildDraftsFromSplit(split: Split, existingLog?: WorkoutLog): ExerciseDraft[] {
  return split.exercises.map((ex) => ({
    exerciseId: ex.id,
    sets: Array.from({ length: ex.targetSets }, (_, i) => {
      const existing = existingLog?.sets.find((s) => s.exerciseId === ex.id && s.setIndex === i);
      return existing
        ? { reps: String(existing.reps), weight: String(existing.weight), rir: String(existing.rir) }
        : blankSet();
    }),
  }));
}

export default function LogPage({ onLogSaved }: { onLogSaved?: () => void }) {
  const { programs, logs, upsertLog: ctxUpsertLog } = useStore();
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [selectedSplitId, setSelectedSplitId] = useState('');
  const [logDate, setLogDate] = useState(today);
  const [drafts, setDrafts] = useState<ExerciseDraft[]>([]);
  const [prevLog, setPrevLog] = useState<WorkoutLog | null>(null);
  const [saved, setSaved] = useState(false);

  const selectedProgram = programs.find((p) => p.id === selectedProgramId);
  const availableSplits = selectedProgram?.splits ?? [];
  const selectedSplit = availableSplits.find((s) => s.id === selectedSplitId);

  useEffect(() => { setSelectedSplitId(''); }, [selectedProgramId]);

  useEffect(() => {
    if (!selectedSplit || !selectedProgramId) {
      setDrafts([]);
      setPrevLog(null);
      return;
    }
    const existing = logs.find(
      (l) => l.programId === selectedProgramId && l.splitId === selectedSplit.id && l.date === logDate
    );
    const prev = logs
      .filter((l) => l.programId === selectedProgramId && l.splitId === selectedSplit.id && l.date < logDate)
      .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
    setDrafts(buildDraftsFromSplit(selectedSplit, existing));
    setPrevLog(prev);
    setSaved(false);
  }, [selectedProgramId, selectedSplitId, logDate, selectedSplit, logs]);

  const updateSet = useCallback((exIdx: number, setIdx: number, field: keyof SetDraft, value: string) => {
    setDrafts((prev) =>
      prev.map((ex, ei) =>
        ei !== exIdx ? ex : { ...ex, sets: ex.sets.map((s, si) => si !== setIdx ? s : { ...s, [field]: value }) }
      )
    );
    setSaved(false);
  }, []);

  function addSet(exIdx: number) {
    setDrafts((prev) => prev.map((ex, i) => i === exIdx ? { ...ex, sets: [...ex.sets, blankSet()] } : ex));
  }

  function removeSet(exIdx: number) {
    setDrafts((prev) => prev.map((ex, i) =>
      i === exIdx && ex.sets.length > 1 ? { ...ex, sets: ex.sets.slice(0, -1) } : ex
    ));
  }

  async function handleSave() {
    if (!selectedSplit || !selectedProgramId) return;
    const sets: LoggedSet[] = [];
    drafts.forEach((ex) => {
      ex.sets.forEach((s, si) => {
        const reps = parseFloat(s.reps);
        const weight = parseFloat(s.weight);
        const rir = parseFloat(s.rir);
        if (!isNaN(reps) && !isNaN(weight)) {
          sets.push({ exerciseId: ex.exerciseId, setIndex: si, reps, weight, rir: isNaN(rir) ? 0 : rir });
        }
      });
    });
    const existing = logs.find(
      (l) => l.programId === selectedProgramId && l.splitId === selectedSplit.id && l.date === logDate
    );
    await ctxUpsertLog({
      id: existing?.id ?? crypto.randomUUID(),
      programId: selectedProgramId,
      splitId: selectedSplit.id,
      date: logDate,
      sets,
    });
    setSaved(true);
    onLogSaved?.();
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Log Workout</h1>

      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-36">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Program</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedProgramId}
            onChange={(e) => setSelectedProgramId(e.target.value)}
          >
            <option value="">Select program…</option>
            {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-36">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Split</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            value={selectedSplitId}
            onChange={(e) => setSelectedSplitId(e.target.value)}
            disabled={!selectedProgram}
          >
            <option value="">Select split…</option>
            {availableSplits.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Date</label>
          <input
            type="date"
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={logDate}
            onChange={(e) => setLogDate(e.target.value)}
          />
        </div>
      </div>

      {selectedSplit && prevLog && (
        <div className="text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
          Comparing against: <span className="font-medium text-gray-600 dark:text-gray-300">{formatDate(prevLog.date)}</span>
        </div>
      )}

      {programs.length === 0 && (
        <p className="text-center text-gray-400 dark:text-gray-500 py-12 text-sm">
          No programs found. Go to the <strong>Program</strong> tab to create one.
        </p>
      )}
      {programs.length > 0 && !selectedSplit && (
        <p className="text-center text-gray-400 dark:text-gray-500 py-12 text-sm">Select a program and split to start logging.</p>
      )}

      {selectedSplit && drafts.map((exDraft, exIdx) => {
        const exercise = selectedSplit.exercises.find((e) => e.id === exDraft.exerciseId);
        if (!exercise) return null;
        return (
          <div key={exDraft.exerciseId} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
              <p className="font-semibold text-gray-900 dark:text-gray-100">{exercise.name}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Target: {exercise.targetSets} sets · {exercise.targetReps} reps · RIR {exercise.targetRIR}</p>
            </div>
            <div className="px-4 py-3 space-y-2">
              <div className="grid grid-cols-[2rem_1fr_1fr_1fr_2rem] gap-2 px-1">
                {['#', 'Weight', 'Reps', 'RIR', ''].map((h, i) => (
                  <span key={i} className="text-xs font-medium text-gray-400 dark:text-gray-500 text-center">{h}</span>
                ))}
              </div>
              {exDraft.sets.map((set, setIdx) => {
                const prevSet = getPrevSet(prevLog, exercise.id, setIdx);
                const currReps = parseFloat(set.reps);
                const currWeight = parseFloat(set.weight);
                const hasValues = !isNaN(currReps) && !isNaN(currWeight);
                const status: ProgressStatus | null = hasValues
                  ? getProgress({ reps: currReps, weight: currWeight }, prevSet)
                  : null;
                return (
                  <div key={setIdx} className="grid grid-cols-[2rem_1fr_1fr_1fr_2rem] gap-2 items-center">
                    <span className="text-xs font-medium text-gray-400 dark:text-gray-500 text-center">{setIdx + 1}</span>
                    {(['weight', 'reps'] as const).map((field) => (
                      <div key={field} className="relative">
                        <input
                          type="number" inputMode={field === 'weight' ? 'decimal' : 'numeric'} min={0}
                          step={field === 'weight' ? 2.5 : 1}
                          className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={prevSet ? String(prevSet[field]) : '—'}
                          value={set[field]}
                          onChange={(e) => updateSet(exIdx, setIdx, field, e.target.value)}
                        />
                        {prevSet && (
                          <span className="absolute -top-4 left-0 right-0 text-center text-[10px] text-gray-400 dark:text-gray-500">
                            prev: {prevSet[field]}
                          </span>
                        )}
                      </div>
                    ))}
                    <input
                      type="number" inputMode="numeric" min={0} max={10}
                      className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={prevSet ? String(prevSet.rir) : '—'}
                      value={set.rir}
                      onChange={(e) => updateSet(exIdx, setIdx, 'rir', e.target.value)}
                    />
                    <div className="flex items-center justify-center text-base">
                      <ProgressIcon status={status} />
                    </div>
                  </div>
                );
              })}
              <div className="flex gap-2 pt-1">
                <button onClick={() => addSet(exIdx)} className="flex-1 py-1.5 text-xs text-gray-400 hover:text-blue-500 border border-dashed border-gray-200 dark:border-gray-600 hover:border-blue-400 rounded-lg transition-colors">+ Add Set</button>
                {exDraft.sets.length > 1 && (
                  <button onClick={() => removeSet(exIdx)} className="px-3 py-1.5 text-xs text-gray-400 hover:text-red-500 border border-dashed border-gray-200 dark:border-gray-600 hover:border-red-400 rounded-lg transition-colors">− Remove</button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {selectedSplit && (
        <div className="pt-2 pb-8">
          <button onClick={handleSave} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-sm">
            {saved ? '✓ Saved' : 'Save Workout'}
          </button>
          {saved && <p className="text-center text-sm text-green-600 dark:text-green-400 mt-2">Workout logged for {formatDate(logDate)}.</p>}
        </div>
      )}
    </div>
  );
}

function ProgressIcon({ status }: { status: ProgressStatus | null }) {
  if (!status || status === 'new') return <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>;
  if (status === 'improved') return <span className="text-green-500 text-lg leading-none">✓</span>;
  if (status === 'same') return <span className="text-orange-400 text-base leading-none">●</span>;
  return <span className="text-red-500 text-base font-bold leading-none">✗</span>;
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}
