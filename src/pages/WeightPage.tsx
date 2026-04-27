import { useState, useMemo } from 'react';
import type { WeightEntry } from '../types';
import { useStore } from '../context/StoreContext';
import { fromLbs, toLbs } from '../store';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function isSunday(dateStr: string): boolean {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay() === 0;
}

function getWeekMonday(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const daysFromMonday = date.getDay() === 0 ? 6 : date.getDay() - 1;
  const monday = new Date(date);
  monday.setDate(date.getDate() - daysFromMonday);
  return monday.toISOString().slice(0, 10);
}

function formatWeekRange(mondayStr: string): string {
  const [y, m, d] = mondayStr.split('-').map(Number);
  const mon = new Date(y, m - 1, d);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (dt: Date) => dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${fmt(mon)} – ${fmt(sun)}`;
}

export default function WeightPage() {
  const { weightEntries, settings, upsertWeightEntry, deleteWeightEntry } = useStore();
  const unit = settings.weightUnit;

  const sorted = useMemo(
    () => [...weightEntries].sort((a, b) => b.date.localeCompare(a.date)),
    [weightEntries]
  );

  // Weekly averages: shown once Sunday is logged OR any entry exists in a later week
  const weeklyAverages = useMemo(() => {
    const map = new Map<string, { sumLbs: number; count: number; hasSunday: boolean }>();
    for (const e of weightEntries) {
      const key = getWeekMonday(e.date);
      const w = map.get(key) ?? { sumLbs: 0, count: 0, hasSunday: false };
      map.set(key, {
        sumLbs: w.sumLbs + e.weightLbs,
        count: w.count + 1,
        hasSunday: w.hasSunday || isSunday(e.date),
      });
    }
    const result = new Map<string, number>();
    for (const [key, { sumLbs, count, hasSunday }] of map) {
      const [y, m, d] = key.split('-').map(Number);
      const sunday = new Date(y, m - 1, d + 6).toISOString().slice(0, 10);
      const hasLaterEntry = weightEntries.some((e) => e.date > sunday);
      if (hasSunday || hasLaterEntry) result.set(key, fromLbs(sumLbs / count, unit));
    }
    return result;
  }, [weightEntries, unit]);

  const [date, setDate] = useState(today);
  const [weightInput, setWeightInput] = useState('');
  const [note, setNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  const existingForDate = sorted.find((e) => e.date === date);

  function startEdit(entry: WeightEntry) {
    setEditingId(entry.id);
    setDate(entry.date);
    setWeightInput(String(fromLbs(entry.weightLbs, unit)));
    setNote(entry.note ?? '');
    setSaved(false);
  }

  function cancelEdit() {
    setEditingId(null);
    setDate(today());
    setWeightInput('');
    setNote('');
    setSaved(false);
  }

  async function handleSave() {
    const val = parseFloat(weightInput);
    if (isNaN(val) || val <= 0) return;
    setSaveError('');
    try {
      const weightLbs = toLbs(val, unit);
      const entry: import('../types').WeightEntry = {
        id: editingId ?? existingForDate?.id ?? crypto.randomUUID(),
        date,
        weightLbs,
      };
      if (note.trim()) entry.note = note.trim();
      await upsertWeightEntry(entry);
      setWeightInput('');
      setNote('');
      setEditingId(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this entry?')) return;
    await deleteWeightEntry(id);
    if (editingId === id) cancelEdit();
  }

  // Latest weight for display
  const latest = sorted[0];
  const latestDisplay = latest ? fromLbs(latest.weightLbs, unit) : null;

  // Previous entry for change delta
  const prev = sorted[1];
  const delta = latest && prev
    ? fromLbs(latest.weightLbs, unit) - fromLbs(prev.weightLbs, unit)
    : null;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-5">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Weight</h1>

      {/* ── Current weight summary ──────────────────────────────────────────── */}
      {latestDisplay !== null && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Latest</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
              {latestDisplay} <span className="text-lg font-normal text-gray-400">{unit}</span>
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatDate(latest!.date)}</p>
          </div>
          {delta !== null && (
            <div className={`text-right ${delta < 0 ? 'text-blue-500' : delta > 0 ? 'text-orange-400' : 'text-gray-400'}`}>
              <p className="text-xl font-semibold">
                {delta > 0 ? '+' : ''}{delta.toFixed(1)}
              </p>
              <p className="text-xs">vs prev</p>
            </div>
          )}
        </div>
      )}

      {/* ── Chart ──────────────────────────────────────────────────────────── */}
      {sorted.length >= 2 && <WeightChart entries={sorted} unit={unit} />}

      {/* ── Log form ───────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm space-y-3">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
          {editingId ? 'Edit Entry' : 'Log Weight'}
        </h2>

        <div className="flex gap-3 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Date</label>
            <input
              type="date"
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={date}
              onChange={(e) => { setDate(e.target.value); setSaved(false); setEditingId(null); }}
            />
          </div>
          <div className="flex-1 min-w-24">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
              Weight ({unit})
            </label>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={0.1}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={unit === 'lbs' ? '185.0' : '83.9'}
              value={weightInput}
              onChange={(e) => { setWeightInput(e.target.value); setSaved(false); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>
          <div className="flex-1 min-w-32">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Note (optional)</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. morning, after workout"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        {!editingId && existingForDate && (
          <p className="text-xs text-orange-500">
            Entry exists for this date ({fromLbs(existingForDate.weightLbs, unit)} {unit}). Saving will overwrite it.
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!weightInput.trim()}
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saved ? '✓ Saved' : editingId ? 'Update' : 'Save'}
          </button>
          {editingId && (
            <button
              onClick={cancelEdit}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded-lg"
            >
              Cancel
            </button>
          )}
        </div>
        {saveError && (
          <p className="text-sm text-red-500">{saveError}</p>
        )}
      </div>

      {/* ── History list ───────────────────────────────────────────────────── */}
      {sorted.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">History</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {sorted.map((entry, i) => {
              const display = fromLbs(entry.weightLbs, unit);
              const prevEntry = sorted[i + 1];
              const d = prevEntry ? display - fromLbs(prevEntry.weightLbs, unit) : null;
              const thisWeekKey = getWeekMonday(entry.date);
              const isLastInWeek = !prevEntry || getWeekMonday(prevEntry.date) !== thisWeekKey;
              const weekAvg = isLastInWeek ? weeklyAverages.get(thisWeekKey) : undefined;
              return (
                <div key={entry.id}>
                  <div className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {display} <span className="text-gray-400 font-normal">{unit}</span>
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {formatDate(entry.date)}{entry.note ? ` · ${entry.note}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {d !== null && (
                        <span className={`text-xs font-medium ${d < 0 ? 'text-blue-500' : d > 0 ? 'text-orange-400' : 'text-gray-400'}`}>
                          {d > 0 ? '+' : ''}{d.toFixed(1)}
                        </span>
                      )}
                      <button
                        onClick={() => startEdit(entry)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
                      >
                        <PencilIcon />
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                  {weekAvg !== undefined && (
                    <div className="flex items-center justify-between px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-100 dark:border-blue-800/40">
                      <div>
                        <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Weekly Average</p>
                        <p className="text-xs text-blue-500 dark:text-blue-400">{formatWeekRange(getWeekMonday(entry.date))}</p>
                      </div>
                      <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                        {weekAvg.toFixed(1)} <span className="text-xs font-normal">{unit}</span>
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {sorted.length === 0 && (
        <p className="text-center text-gray-400 dark:text-gray-500 py-8 text-sm">
          No entries yet. Log your first weight above.
        </p>
      )}
    </div>
  );
}

// ── SVG Line Chart ────────────────────────────────────────────────────────────

function WeightChart({ entries, unit }: { entries: WeightEntry[]; unit: 'lbs' | 'kg' }) {
  const points = useMemo(() => {
    const data = [...entries].sort((a, b) => a.date.localeCompare(b.date)).slice(-60);
    return data.map((e) => ({ date: e.date, value: fromLbs(e.weightLbs, unit) }));
  }, [entries, unit]);

  if (points.length < 2) return null;

  const W = 400, H = 100, PAD = { t: 10, r: 10, b: 24, l: 36 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const values = points.map((p) => p.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;
  const yPad = range * 0.15;
  const yMin = minV - yPad;
  const yMax = maxV + yPad;

  const xScale = (i: number) => PAD.l + (i / (points.length - 1)) * innerW;
  const yScale = (v: number) => PAD.t + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(p.value).toFixed(1)}`)
    .join(' ');

  const areaD = `${pathD} L ${xScale(points.length - 1).toFixed(1)} ${(PAD.t + innerH).toFixed(1)} L ${PAD.l.toFixed(1)} ${(PAD.t + innerH).toFixed(1)} Z`;

  // Y-axis labels: min, mid, max
  const yLabels = [yMax, (yMin + yMax) / 2, yMin];

  // X-axis: first, middle, last date labels
  const xLabelIdx = [0, Math.floor((points.length - 1) / 2), points.length - 1];

  const last = points[points.length - 1];

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
        Trend · last {points.length} entries
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="overflow-visible">
        {/* Grid lines */}
        {yLabels.map((v, i) => (
          <line
            key={i}
            x1={PAD.l} x2={W - PAD.r}
            y1={yScale(v)} y2={yScale(v)}
            stroke="currentColor" strokeOpacity="0.08" strokeWidth="1"
          />
        ))}

        {/* Y labels */}
        {yLabels.map((v, i) => (
          <text
            key={i}
            x={PAD.l - 4} y={yScale(v) + 4}
            textAnchor="end" fontSize="9" fill="currentColor" opacity="0.4"
          >
            {v.toFixed(1)}
          </text>
        ))}

        {/* X labels */}
        {xLabelIdx.map((idx) => {
          const [, m, d] = points[idx].date.split('-');
          return (
            <text
              key={idx}
              x={xScale(idx)} y={H - 4}
              textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.4"
            >
              {`${parseInt(m)}/${parseInt(d)}`}
            </text>
          );
        })}

        {/* Area fill */}
        <path d={areaD} fill="#3b82f6" fillOpacity="0.08" />

        {/* Line */}
        <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Last point dot */}
        <circle
          cx={xScale(points.length - 1)} cy={yScale(last.value)}
          r="4" fill="#3b82f6"
        />
        <text
          x={xScale(points.length - 1)} y={yScale(last.value) - 8}
          textAnchor="middle" fontSize="10" fill="#3b82f6" fontWeight="600"
        >
          {last.value.toFixed(1)}
        </text>
      </svg>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function PencilIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
}
function TrashIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>;
}
