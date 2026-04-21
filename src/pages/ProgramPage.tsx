import { useState } from 'react';
import type { Program, Split, Exercise } from '../types';
import { useStore } from '../context/StoreContext';

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
  const { programs, persistPrograms } = useStore();
  const [expandedProgramId, setExpandedProgramId] = useState<string | null>(null);
  const [expandedSplitId, setExpandedSplitId] = useState<string | null>(null);
  const [editingExercise, setEditingExercise] = useState<{
    programId: string;
    splitId: string;
    exercise: Exercise;
  } | null>(null);
  const [addingProgramName, setAddingProgramName] = useState(false);
  const [newProgramName, setNewProgramName] = useState('');

  function persist(updated: Program[]) {
    persistPrograms(updated);
  }

  // ── Program CRUD ────────────────────────────────────────────────────────────

  function addProgram() {
    if (!newProgramName.trim()) return;
    persist([...programs, { id: newId(), name: newProgramName.trim(), splits: [] }]);
    setNewProgramName('');
    setAddingProgramName(false);
  }

  function deleteProgram(id: string) {
    if (!confirm('Delete this program and all its splits and exercises?')) return;
    persist(programs.filter((p) => p.id !== id));
    if (expandedProgramId === id) setExpandedProgramId(null);
  }

  function renameProgram(id: string, name: string) {
    persist(programs.map((p) => (p.id === id ? { ...p, name } : p)));
  }

  // ── Split CRUD ──────────────────────────────────────────────────────────────

  function addSplit(programId: string, name: string) {
    persist(
      programs.map((p) =>
        p.id === programId
          ? { ...p, splits: [...p.splits, { id: newId(), name, exercises: [] }] }
          : p
      )
    );
  }

  function deleteSplit(programId: string, splitId: string) {
    if (!confirm('Delete this split and all its exercises?')) return;
    persist(
      programs.map((p) =>
        p.id === programId
          ? { ...p, splits: p.splits.filter((s) => s.id !== splitId) }
          : p
      )
    );
    if (expandedSplitId === splitId) setExpandedSplitId(null);
  }

  function renameSplit(programId: string, splitId: string, name: string) {
    persist(
      programs.map((p) =>
        p.id === programId
          ? { ...p, splits: p.splits.map((s) => (s.id === splitId ? { ...s, name } : s)) }
          : p
      )
    );
  }

  // ── Exercise CRUD ───────────────────────────────────────────────────────────

  function saveExercise(programId: string, splitId: string, ex: Exercise) {
    persist(
      programs.map((p) => {
        if (p.id !== programId) return p;
        return {
          ...p,
          splits: p.splits.map((s) => {
            if (s.id !== splitId) return s;
            const exists = s.exercises.some((e) => e.id === ex.id);
            return {
              ...s,
              exercises: exists
                ? s.exercises.map((e) => (e.id === ex.id ? ex : e))
                : [...s.exercises, ex],
            };
          }),
        };
      })
    );
    setEditingExercise(null);
  }

  function deleteExercise(programId: string, splitId: string, exerciseId: string) {
    persist(
      programs.map((p) =>
        p.id !== programId
          ? p
          : {
              ...p,
              splits: p.splits.map((s) =>
                s.id !== splitId
                  ? s
                  : { ...s, exercises: s.exercises.filter((e) => e.id !== exerciseId) }
              ),
            }
      )
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Programs</h1>
        <button
          onClick={() => setAddingProgramName(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + New Program
        </button>
      </div>

      {addingProgramName && (
        <div className="flex gap-2">
          <input
            autoFocus
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Program name (e.g. PPL, 5/3/1)"
            value={newProgramName}
            onChange={(e) => setNewProgramName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addProgram();
              if (e.key === 'Escape') { setAddingProgramName(false); setNewProgramName(''); }
            }}
          />
          <button onClick={addProgram} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg">Save</button>
          <button onClick={() => { setAddingProgramName(false); setNewProgramName(''); }} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded-lg">Cancel</button>
        </div>
      )}

      {programs.length === 0 && !addingProgramName && (
        <p className="text-center text-gray-500 dark:text-gray-400 py-12 text-sm">
          No programs yet. Create your first program to get started.
        </p>
      )}

      <div className="space-y-3">
        {programs.map((program) => (
          <ProgramCard
            key={program.id}
            program={program}
            isExpanded={expandedProgramId === program.id}
            expandedSplitId={expandedSplitId}
            onToggle={() => setExpandedProgramId(expandedProgramId === program.id ? null : program.id)}
            onRename={(name) => renameProgram(program.id, name)}
            onDelete={() => deleteProgram(program.id)}
            onAddSplit={(name) => addSplit(program.id, name)}
            onDeleteSplit={(splitId) => deleteSplit(program.id, splitId)}
            onRenameSplit={(splitId, name) => renameSplit(program.id, splitId, name)}
            onToggleSplit={(splitId) => setExpandedSplitId(expandedSplitId === splitId ? null : splitId)}
            onAddExercise={(splitId) =>
              setEditingExercise({ programId: program.id, splitId, exercise: { ...DEFAULT_EXERCISE, id: newId() } })
            }
            onEditExercise={(splitId, ex) => setEditingExercise({ programId: program.id, splitId, exercise: ex })}
            onDeleteExercise={(splitId, exId) => deleteExercise(program.id, splitId, exId)}
          />
        ))}
      </div>

      {editingExercise && (
        <ExerciseModal
          exercise={editingExercise.exercise}
          onSave={(ex) => saveExercise(editingExercise.programId, editingExercise.splitId, ex)}
          onClose={() => setEditingExercise(null)}
        />
      )}
    </div>
  );
}

// ── ProgramCard ───────────────────────────────────────────────────────────────

interface ProgramCardProps {
  program: Program;
  isExpanded: boolean;
  expandedSplitId: string | null;
  onToggle: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onAddSplit: (name: string) => void;
  onDeleteSplit: (id: string) => void;
  onRenameSplit: (id: string, name: string) => void;
  onToggleSplit: (id: string) => void;
  onAddExercise: (splitId: string) => void;
  onEditExercise: (splitId: string, ex: Exercise) => void;
  onDeleteExercise: (splitId: string, exId: string) => void;
}

function ProgramCard({
  program, isExpanded, expandedSplitId, onToggle, onRename, onDelete,
  onAddSplit, onDeleteSplit, onRenameSplit, onToggleSplit,
  onAddExercise, onEditExercise, onDeleteExercise,
}: ProgramCardProps) {
  const [renaming, setRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(program.name);
  const [addingSplit, setAddingSplit] = useState(false);
  const [newSplitName, setNewSplitName] = useState('');

  function commitRename() {
    if (nameInput.trim()) onRename(nameInput.trim());
    setRenaming(false);
  }

  function commitAddSplit() {
    if (!newSplitName.trim()) return;
    onAddSplit(newSplitName.trim());
    setNewSplitName('');
    setAddingSplit(false);
  }

  const splitCount = program.splits.length;
  const exerciseCount = program.splits.reduce((n, s) => n + s.exercises.length, 0);

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
              if (e.key === 'Escape') { setRenaming(false); setNameInput(program.name); }
            }}
            onBlur={commitRename}
          />
        ) : (
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">{program.name}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
              {splitCount} split{splitCount !== 1 ? 's' : ''} · {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1 ml-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => { setRenaming(true); setNameInput(program.name); }} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded transition-colors" title="Rename"><PencilIcon /></button>
          <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors" title="Delete"><TrashIcon /></button>
          <span className="ml-1 text-gray-400 dark:text-gray-500 text-xs">{isExpanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 space-y-2">
          {program.splits.length === 0 && !addingSplit && (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-1">No splits yet.</p>
          )}
          {program.splits.map((split) => (
            <SplitCard
              key={split.id}
              split={split}
              isExpanded={expandedSplitId === split.id}
              onToggle={() => onToggleSplit(split.id)}
              onRename={(name) => onRenameSplit(split.id, name)}
              onDelete={() => onDeleteSplit(split.id)}
              onAddExercise={() => onAddExercise(split.id)}
              onEditExercise={(ex) => onEditExercise(split.id, ex)}
              onDeleteExercise={(exId) => onDeleteExercise(split.id, exId)}
            />
          ))}
          {addingSplit ? (
            <div className="flex gap-2 pt-1">
              <input
                autoFocus
                className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Split name (e.g. Push Day)"
                value={newSplitName}
                onChange={(e) => setNewSplitName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitAddSplit();
                  if (e.key === 'Escape') { setAddingSplit(false); setNewSplitName(''); }
                }}
              />
              <button onClick={commitAddSplit} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg">Add</button>
              <button onClick={() => { setAddingSplit(false); setNewSplitName(''); }} className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm rounded-lg">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setAddingSplit(true)} className="w-full py-2 border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 text-gray-400 dark:text-gray-500 hover:text-blue-500 text-sm rounded-lg transition-colors">
              + Add Split
            </button>
          )}
        </div>
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

function SplitCard({ split, isExpanded, onToggle, onRename, onDelete, onAddExercise, onEditExercise, onDeleteExercise }: SplitCardProps) {
  const [renaming, setRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(split.name);

  function commitRename() {
    if (nameInput.trim()) onRename(nameInput.trim());
    setRenaming(false);
  }

  return (
    <div className="border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-750">
      <div className="flex items-center justify-between px-3 py-2.5 cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700" onClick={onToggle}>
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
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{split.name}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{split.exercises.length} exercise{split.exercises.length !== 1 ? 's' : ''}</span>
          </div>
        )}
        <div className="flex items-center gap-1 ml-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => { setRenaming(true); setNameInput(split.name); }} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"><PencilIcon /></button>
          <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-500 rounded"><TrashIcon /></button>
          <span className="ml-1 text-gray-400 dark:text-gray-500 text-xs">{isExpanded ? '▲' : '▼'}</span>
        </div>
      </div>
      {isExpanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-3 py-2 space-y-1">
          {split.exercises.length === 0 && <p className="text-xs text-gray-400 dark:text-gray-500 py-1">No exercises.</p>}
          {split.exercises.map((ex, i) => (
            <div key={ex.id} className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <div className="min-w-0">
                <p className="text-sm text-gray-800 dark:text-gray-200">{i + 1}. {ex.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{ex.targetSets} sets · {ex.targetReps} reps · RIR {ex.targetRIR}</p>
              </div>
              <div className="flex gap-1 ml-2 shrink-0">
                <button onClick={() => onEditExercise(ex)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"><PencilIcon /></button>
                <button onClick={() => onDeleteExercise(ex.id)} className="p-1 text-gray-400 hover:text-red-500 rounded"><TrashIcon /></button>
              </div>
            </div>
          ))}
          <button onClick={onAddExercise} className="mt-1 w-full py-1.5 border border-dashed border-gray-200 dark:border-gray-600 hover:border-blue-400 text-gray-400 hover:text-blue-500 text-xs rounded-lg transition-colors">
            + Add Exercise
          </button>
        </div>
      )}
    </div>
  );
}

// ── ExerciseModal ─────────────────────────────────────────────────────────────

function ExerciseModal({ exercise, onSave, onClose }: { exercise: Exercise; onSave: (ex: Exercise) => void; onClose: () => void }) {
  const [form, setForm] = useState({ ...exercise });

  function set<K extends keyof Exercise>(key: K, value: Exercise[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{exercise.name ? 'Edit Exercise' : 'New Exercise'}</h2>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Exercise Name</span>
          <input
            autoFocus
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Bench Press"
            onKeyDown={(e) => e.key === 'Enter' && form.name.trim() && onSave({ ...form, name: form.name.trim() })}
          />
        </label>
        <div className="grid grid-cols-3 gap-3">
          {(['targetSets', 'targetReps', 'targetRIR'] as const).map((field) => (
            <label key={field} className="block space-y-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {field === 'targetSets' ? 'Sets' : field === 'targetReps' ? 'Reps' : 'RIR'}
              </span>
              <input
                type={field === 'targetReps' ? 'text' : 'number'}
                min={0}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form[field]}
                onChange={(e) =>
                  set(field, field === 'targetReps' ? e.target.value : (parseInt(e.target.value) || 0))
                }
                placeholder={field === 'targetReps' ? '8-12' : undefined}
              />
            </label>
          ))}
        </div>
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => form.name.trim() && onSave({ ...form, name: form.name.trim() })}
            disabled={!form.name.trim()}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-medium text-sm rounded-lg transition-colors"
          >Save</button>
          <button onClick={onClose} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium text-sm rounded-lg transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function PencilIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
}
function TrashIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>;
}
