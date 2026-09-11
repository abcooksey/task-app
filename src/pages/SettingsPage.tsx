import { useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useSettings, useUpdateSettings } from '@/hooks/useSettings'
import { useDarkMode } from '@/hooks/useDarkMode'
import { useOnboarding } from '@/hooks/useOnboarding'
import { useNotifications } from '@/hooks/useNotifications'
import {
  exportUserData,
  downloadExportData,
  importUserData,
  validateImportFile,
} from '@/hooks/useDataExport'

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings()
  const updateSettings = useUpdateSettings()
  const { theme, setTheme } = useDarkMode()
  const { resetOnboarding } = useOnboarding()
  const { isSupported: notificationsSupported, permission, enabled: notificationsEnabled, toggleEnabled: toggleNotifications, requestPermission } = useNotifications()
  const queryClient = useQueryClient()

  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const handleExport = async () => {
    setError(null)
    setExporting(true)
    try {
      const data = await exportUserData()
      downloadExportData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setImportResult(null)
    setImporting(true)

    try {
      const data = await validateImportFile(file)
      const result = await importUserData(data)

      // Invalidate all queries to refresh data
      await queryClient.invalidateQueries()

      // Build import result message
      const parts: string[] = []
      if (result.tasks > 0) parts.push(`${result.tasks} tasks`)
      if (result.subtasks > 0) parts.push(`${result.subtasks} subtasks`)
      if (result.completions > 0) parts.push(`${result.completions} completions`)
      if (result.coinLedger > 0) parts.push(`${result.coinLedger} coin entries`)
      if (result.inventory > 0) parts.push(`${result.inventory} inventory items`)
      if (result.placements > 0) parts.push(`${result.placements} placements`)
      if (result.focusSessions > 0) parts.push(`${result.focusSessions} focus sessions`)
      if (result.houseRepairs > 0) parts.push(`${result.houseRepairs} repairs`)
      if (result.settings) parts.push('settings')
      if (result.houseState) parts.push('house state')

      const message = parts.length > 0
        ? `Imported ${parts.join(', ')}`
        : 'No data to import'

      setImportResult(message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDayBoundaryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSettings.mutate({ day_boundary_minutes: parseInt(e.target.value) })
  }

  const handleReducedMotionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings.mutate({ reduced_motion: e.target.checked })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
        Settings
      </h2>

      <div className="space-y-4">
        {/* Day boundary */}
        <section className="card p-4">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">
            Day Boundary
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            When does your day roll over? Default is 4:00 AM.
          </p>
          <select
            className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            value={settings?.day_boundary_minutes ?? 240}
            onChange={handleDayBoundaryChange}
          >
            <option value="0">Midnight (12:00 AM)</option>
            <option value="180">3:00 AM</option>
            <option value="240">4:00 AM</option>
            <option value="300">5:00 AM</option>
            <option value="360">6:00 AM</option>
          </select>
        </section>

        {/* Reduced motion */}
        <section className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">
                Reduce Motion
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Minimize animations throughout the app
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings?.reduced_motion ?? false}
                onChange={handleReducedMotionChange}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </section>

        {/* Notifications */}
        {notificationsSupported && (
          <section className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Notifications
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {permission === 'denied'
                    ? 'Blocked by browser. Enable in browser settings.'
                    : 'Get reminders for tasks with due times'}
                </p>
              </div>
              {permission === 'denied' ? (
                <span className="text-sm text-gray-400">Blocked</span>
              ) : permission === 'granted' ? (
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={notificationsEnabled}
                    onChange={(e) => toggleNotifications(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                </label>
              ) : (
                <button
                  onClick={requestPermission}
                  className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Enable
                </button>
              )}
            </div>
          </section>
        )}

        {/* Theme */}
        <section className="card p-4">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">
            Theme
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Choose your preferred color scheme
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setTheme('light')}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                theme === 'light'
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 ring-2 ring-primary-500'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Light
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 ring-2 ring-primary-500'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Dark
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                theme === 'system'
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 ring-2 ring-primary-500'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              System
            </button>
          </div>
        </section>

        {/* Export/Import */}
        <section className="card p-4 space-y-3">
          <h3 className="font-medium text-gray-900 dark:text-white">
            Data
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Backup or restore your tasks and settings
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? 'Exporting...' : 'Export JSON'}
            </button>
            <button
              onClick={handleImportClick}
              disabled={importing}
              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? 'Importing...' : 'Import JSON'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          {importResult && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg text-sm">
              {importResult}
            </div>
          )}
        </section>

        {/* Help */}
        <section className="card p-4">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">
            Help
          </h3>
          <button
            onClick={resetOnboarding}
            className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Replay Welcome Tour
          </button>
        </section>

        {/* Sign out */}
        <section className="card p-4">
          <button
            onClick={handleSignOut}
            className="w-full px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            Sign Out
          </button>
        </section>
      </div>
    </div>
  )
}
