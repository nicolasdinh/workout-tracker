import { useState } from 'react';
import type { Split, Exercise } from '../types';
import { getSplits, saveSplits } from '../store';

function newId() {
  return crypto.randomUUID();
}

const DEFAULT_EXERCISE: Omit<Exercise, 'id'> = {
  name: '',
  targetSets: 3,
  targetReps: '8-12',
  targetRIR: 2,
};

export default function ProgramPage() {
  const [splits, setSplits] = useState<Split[]>(() => getSplits());
  const [expandedSplitId, setExpandedSplitId] = useState<string | null>(null);
  const [editingExercise, setEditingExercise] = useState<{
    splitId: string;
    exercise: Exercise;
  } | null>(null);
  const [newSplitName, setNewSplitName] = useState('');
  const [addingSplitName, setAddingSplitName] = useState(false);

  function persist(updated: Split[]) {
    setSplits(updated);
    saveSplits(updated);
  }

  function addSplit() {
    if (!newSplitName.trim()) return;
    persist([...splits, { id: newId(), name: newSplitName.trim(), exercises: [] }]);
    setNewSplitName('');
    setAddingSplitName(false);
  }

  function deleteSplit(id: string) {
    if (!confirm('Delete this split and all its exercises?')) return;
    persist(splits.filter((s) => s.id !== id));
    if (expandedSplitId === id) setExpandedSplitId(null);
  }

  function renameSplit(id: string, name: string) {
    persist(splits.map((s) => (s.id === id ? { ...s, name } : s)));
  }

  function saveExercise(splitId: string, ex: Exercise) {
    persist(
      splits.map((s) => {
        if (s.id !== splitId) return s;
        const exists = s.exercises.some((e) => e.id === ex.id);
        return {
          ...s,
          exercises: exists
            ? s.exercises.map((e) => (e.id === ex.id ? ex : e))
            : [...s.exercises, ex],
        };
      })
    );
    setEditingExercise(null);
  }

  function deleteExercise(splitId: string, exerciseId: string) {
    persist(
      splits.map((s) =>
        s.id === splitId
          ? { ...s, exercises: s.exercises.filter((e) => e.id !== exerciseId) }
          : s
      )
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Program</h1>
        <button
          onClick={() => setAddingSplitName(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + New Split
        </button>
      </div>

      {addingSplitName && (
        <div className="flex gap-2">
          <input
            autoFocus
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Split name (e.g. Push Day)"
            value={newSplitName}
            onChange={(e) => setNewSplitName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addSplit();
              if (e.key === 'Escape') { setAddingSplitName(false); setNewSplitName(''); }
            }}
          />
          <button onClick={addSplit} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg">Save</button>
          <button onClick={() => { setAddingSplitName(false); setNewSplitName(''); }} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded-lg">Cancel</button>
        </div>
      )}

      {splits.length === 0 && !addingSplitName && (
        <p className="text-center text-gray-500 dark:text-gray-400 py-12 text-sm">
          No splits yet. Create your first split to get started.
        </p>
      )}

      <div className="space-y-3">
        {splits.map((split) => (
          <SplitCard
            key={split.id}
            split={split}
            isExpanded={expandedSplitId === split.id}
            onToggle={() => setExpandedSplitId(expandedSplitId === split.id ? null : split.id)}
            onRename={(name) => renameSplit(split.id, name)}
            onDelete={() => deleteSplit(split.id)}
            onAddExercise={() =>
              setEditingExercise({ splitId: split.id, exercise: { ...DEFAULT_EXERCISE, id: newId() } })
            }
            onEditExercise={(ex) => setEditingExercise({ splitId: split.id, exercise: ex })}
            onDeleteExercise={(exId) => deleteExercise(split.id, exId)}
          />
        ))}
      </div>

      {editingExercise && (
        <ExerciseModal
          exercise={editingExercise.exercise}
          onSave={(ex) => saveExercise(editingExercise.splitId, ex)}
          onClose={() => setEditingExercise(null)}
        />
      )}
    </div>
  );
}

// ── SplitCard ─────────────────────────────────────────────────────────────────

interface SplitCardProps {
  split: Split;
  isExpanded: boolean;
  onToggle: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onAddExercise: () => void;
  onEditExercise: (ex: Exercise) => void;
  onDeleteExercise: (id: string) => void;
}

function SplitCard({
  split, isExpanded, onToggle, onRename, onDelete, onAddExercise, onEditExercise, onDeleteExercise,
}: SplitCardProps) {
  const [renaming, setRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(split.name);

  function commitRename() {
    if (nameInput.trim()) onRename(nameInput.trim());
    setRenaming(false);
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-gray-750"
        onClick={onToggle}
      >
        {renaming ? (
          <input
            autoFocus
            className="flex-1 mr-2 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') { setRenaming(false); setNameInput(split.name); }
            }}
            onBlur={commitRename}
          />
        ) : (
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">{split.name}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
              {split.exercises.length} exercise{split.exercises.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1 ml-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => { setRenaming(true); setNameInput(split.name); }}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded transition-colors"
            title="Rename"
          >
            <PencilIcon />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"
            title="Delete"
          >
            <TrashIcon />
          </button>
          <span className="ml-1 text-gray-400 dark:text-gray-500 text-xs">{isExpanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 space-y-2">
          {split.exercises.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-2">No exercises. Add one below.</p>
          )}
          {split.exercises.map((ex, i) => (
            <div key={ex.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{i + 1}. {ex.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {ex.targetSets} sets · {ex.targetReps} reps · RIR {ex.targetRIR}
                </p>
              </div>
              <div className="flex gap-1 ml-2 shrink-0">
                <button onClick={() => onEditExercise(ex)} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"><PencilIcon /></button>
                <button onClick={() => onDeleteExercise(ex.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded"><TrashIcon /></button>
              </div>
            </div>
          ))}
          <button
            onClick={onAddExercise}
            className="mt-1 w-full py-2 border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 text-gray-400 dark:text-gray-500 hover:text-blue-500 text-sm rounded-lg transition-colors"
          >
            + Add Exercise
          </button>
        </div>
      )}
    </div>
  );
}

// ── ExerciseModal ─────────────────────────────────────────────────────────────

interface ExerciseModalProps {
  exercise: Exercise;
  onSave: (ex: Exercise) => void;
  onClose: () => void;
}

function ExerciseModal({ exercise, onSave, onClose }: ExerciseModalProps) {
  const [form, setForm] = useState({ ...exercise });

  function set<K extends keyof Exercise>(key: K, value: Exercise[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSave() {
    if (!form.name.trim()) return;
    onSave({ ...form, name: form.name.trim() });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {exercise.name ? 'Edit Exercise' : 'New Exercise'}
        </h2>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Exercise Name</span>
          <input
            autoFocus
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Bench Press"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
        </label>

        <div className="grid grid-cols-3 gap-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Sets</span>
            <input
              type="number"
              min={1}
              max={20}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.targetSets}
              onChange={(e) => set('targetSets', parseInt(e.target.value) || 1)}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Reps</span>
            <input
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.targetReps}
              onChange={(e) => set('targetReps', e.target.value)}
              placeholder="8-12"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">RIR</span>
            <input
              type="number"
              min={0}
              max={10}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.targetRIR}
              onChange={(e) => set('targetRIR', parseInt(e.target.value) || 0)}
            />
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={!form.name.trim()}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-medium text-sm rounded-lg transition-colors"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium text-sm rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
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
