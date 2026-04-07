import { useState } from 'react';
import ProgramPage from './pages/ProgramPage';
import LogPage from './pages/LogPage';
import HistoryPage from './pages/HistoryPage';

type Tab = 'program' | 'log' | 'history';

export default function App() {
  const [tab, setTab] = useState<Tab>('log');
  const [historyKey, setHistoryKey] = useState(0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top nav */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <span className="font-bold text-gray-900 dark:text-gray-100 text-base tracking-tight">
              Workout Tracker
            </span>
            <nav className="flex gap-1">
              {(
                [
                  { id: 'program', label: 'Program' },
                  { id: 'log', label: 'Log' },
                  { id: 'history', label: 'History' },
                ] as { id: Tab; label: string }[]
              ).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    tab === id
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="pb-8">
        {tab === 'program' && <ProgramPage />}
        {tab === 'log' && (
          <LogPage
            onLogSaved={() => setHistoryKey((k) => k + 1)}
          />
        )}
        {tab === 'history' && <HistoryPage refreshKey={historyKey} />}
      </main>
    </div>
  );
}
