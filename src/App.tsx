import { useState } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import ProgramPage from './pages/ProgramPage';
import LogPage from './pages/LogPage';
import HistoryPage from './pages/HistoryPage';
import WeightPage from './pages/WeightPage';
import SettingsPage from './pages/SettingsPage';

type Tab = 'program' | 'log' | 'weight' | 'history' | 'settings';

function AppShell() {
  const [tab, setTab] = useState<Tab>('log');
  const { user, authLoading } = useStore();

  const tabs: { id: Tab; label: string }[] = [
    { id: 'program', label: 'Program' },
    { id: 'log', label: 'Log' },
    { id: 'weight', label: 'Weight' },
    { id: 'history', label: 'History' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <span className="font-bold text-gray-900 dark:text-gray-100 text-base tracking-tight">
              Workout Tracker
            </span>
            <div className="flex items-center gap-1">
              <nav className="flex gap-1">
                {tabs.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      tab === id
                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                    }`}
                  >
                    {id === 'settings' ? (
                      <span className="flex items-center gap-1">
                        {!authLoading && user ? (
                          user.photoURL
                            ? <img src={user.photoURL} alt="" className="w-5 h-5 rounded-full" />
                            : <span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold">{user.displayName?.[0]}</span>
                        ) : (
                          <GearIcon />
                        )}
                      </span>
                    ) : (
                      label
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </header>

      <main className="pb-8">
        {tab === 'program' && <ProgramPage />}
        {tab === 'log' && <LogPage />}
        {tab === 'weight' && <WeightPage />}
        {tab === 'history' && <HistoryPage />}
        {tab === 'settings' && <SettingsPage />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppShell />
    </StoreProvider>
  );
}

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
