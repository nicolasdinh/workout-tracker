import { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { getPrograms as lsGetPrograms, getLogs as lsGetLogs } from '../store';

export default function SettingsPage() {
  const { user, authLoading, signInWithGoogle, signOut, migrateFromLocalStorage } = useStore();
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{ programs: number; logs: number } | null>(null);
  const [migrationError, setMigrationError] = useState('');

  const lsPrograms = lsGetPrograms();
  const lsLogs = lsGetLogs().filter((l) => !!l.programId);
  const hasLocalData = lsPrograms.length > 0 || lsLogs.length > 0;

  async function handleMigrate() {
    setMigrating(true);
    setMigrationError('');
    setMigrationResult(null);
    try {
      const result = await migrateFromLocalStorage();
      setMigrationResult(result);
    } catch (e) {
      setMigrationError(e instanceof Error ? e.message : 'Migration failed');
    } finally {
      setMigrating(false);
    }
  }

  if (authLoading) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <p className="text-gray-400 text-sm text-center py-12">Loading…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>

      {/* ── Account ─────────────────────────────────────────────────────────── */}
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4 shadow-sm">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Account</h2>

        {user ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {user.photoURL && (
                <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full" />
              )}
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.displayName}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{user.email}</p>
              </div>
              <span className="ml-auto text-xs text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full">
                Synced to Cloud
              </span>
            </div>
            <button
              onClick={signOut}
              className="w-full py-2 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Sign in with Google to sync your programs and workout logs across all your devices.
            </p>
            <button
              onClick={signInWithGoogle}
              className="w-full py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <GoogleIcon />
              Sign in with Google
            </button>
          </div>
        )}
      </section>

      {/* ── Migration ────────────────────────────────────────────────────────── */}
      {user && (
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4 shadow-sm">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Import from This Browser</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Copy any programs and logs stored locally in this browser into your cloud account.
            </p>
          </div>

          {hasLocalData ? (
            <div className="space-y-3">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 py-3 text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <p>Found in this browser:</p>
                <ul className="list-disc list-inside text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
                  <li>{lsPrograms.length} program{lsPrograms.length !== 1 ? 's' : ''}</li>
                  <li>{lsLogs.length} workout log{lsLogs.length !== 1 ? 's' : ''}</li>
                </ul>
              </div>

              {migrationResult ? (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3 text-sm text-green-700 dark:text-green-400">
                  ✓ Imported {migrationResult.programs} program{migrationResult.programs !== 1 ? 's' : ''} and {migrationResult.logs} log{migrationResult.logs !== 1 ? 's' : ''} to your account.
                </div>
              ) : (
                <button
                  onClick={handleMigrate}
                  disabled={migrating}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {migrating ? 'Importing…' : 'Import to Cloud Account'}
                </button>
              )}

              {migrationError && (
                <p className="text-sm text-red-500">{migrationError}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">No local data found in this browser.</p>
          )}
        </section>
      )}

      {/* ── Storage info ─────────────────────────────────────────────────────── */}
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Storage</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {user
            ? 'Your data is stored in Firebase and synced in real-time across all signed-in devices.'
            : 'Your data is stored locally in this browser. Sign in to sync across devices.'}
        </p>
      </section>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
