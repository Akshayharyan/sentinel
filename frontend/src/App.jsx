
import { useEffect, useState } from 'react'
import {
  Activity,
  Globe,
  ShieldCheck,
  AlertTriangle,
  Plus,
  RefreshCw,
  Trash2,
  X,
  Clock3,
} from 'lucide-react'
import {
  getMonitors,
  createMonitor,
  deleteMonitor,
} from './services/api'

function App() {
  const [monitors, setMonitors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [siteName, setSiteName] = useState('')
  const [siteUrl, setSiteUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  async function loadMonitors(showSpinner = true) {
    if (showSpinner) setLoading(true)

    try {
      const data = await getMonitors()
      setMonitors(data)
      setError('')
    } catch (err) {
      setError(
        err.message ||
          'Unable to load monitors. Check that the backend is running.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadMonitors()
  }, [])

  async function handleRefresh() {
    setRefreshing(true)
    setMessage('')
    await loadMonitors(false)
  }

  async function handleAddMonitor(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    let normalizedUrl = siteUrl.trim()

    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`
    }

    try {
      new URL(normalizedUrl)
    } catch {
      setError('Please enter a valid website URL.')
      return
    }

    setSaving(true)

    try {
      const payload = {
        name: siteName.trim() || new URL(normalizedUrl).hostname,
        url: normalizedUrl,
        check_interval_seconds: 60,
      }

      await createMonitor(payload)
      await loadMonitors(false)

      setSiteName('')
      setSiteUrl('')
      setShowForm(false)
      setMessage('Monitor created successfully.')
    } catch (err) {
      setError(
        err.message ||
          'Could not create the monitor. Check the backend response.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteMonitor(monitor) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${monitor.name}"?`
    )

    if (!confirmed) return

    setError('')
    setMessage('')

    try {
      await deleteMonitor(monitor.id)

      setMonitors((current) =>
        current.filter((item) => item.id !== monitor.id)
      )

      setMessage(`${monitor.name} was deleted.`)
    } catch (err) {
      setError(err.message || 'Could not delete this monitor.')
    }
  }

  const stats = [
    {
      label: 'Total Monitors',
      value: monitors.length,
      description: 'Websites in your account',
      icon: Globe,
      color: 'text-blue-300',
      bg: 'bg-blue-400/10',
    },
    {
      label: 'Operational',
      value: '—',
      description: 'Live status integration pending',
      icon: ShieldCheck,
      color: 'text-emerald-300',
      bg: 'bg-emerald-400/10',
    },
    {
      label: 'Experiencing Issues',
      value: '—',
      description: 'Live status integration pending',
      icon: AlertTriangle,
      color: 'text-red-300',
      bg: 'bg-red-400/10',
    },
    {
      label: 'Avg. Response Time',
      value: '—',
      description: 'Waiting for check history',
      icon: Activity,
      color: 'text-violet-300',
      bg: 'bg-violet-400/10',
    },
  ]

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-200 md:flex">
      {/* Sidebar */}
      <aside className="flex shrink-0 flex-col border-b border-white/10 bg-[#0c111d] p-5 md:min-h-screen md:w-64 md:border-r md:border-b-0">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-400 p-2 text-slate-950">
            <ShieldCheck size={25} />
          </div>

          <div>
            <h1 className="text-xl font-bold text-white">Sentinel</h1>
            <p className="text-xs text-slate-500">Website monitoring</p>
          </div>
        </div>

        <p className="mb-3 mt-10 text-xs uppercase tracking-widest text-slate-500">
          Workspace
        </p>

        <div className="flex flex-wrap gap-2 md:flex-col">
          <button className="flex w-full items-center gap-3 rounded-xl bg-emerald-400/10 px-4 py-3 text-left text-sm text-emerald-300">
            <Activity size={18} />
            Overview
          </button>

          <button
            onClick={() =>
              document
                .getElementById('monitors')
                ?.scrollIntoView({ behavior: 'smooth' })
            }
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <Globe size={18} />
            Monitors
          </button>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm text-slate-300">
            <Activity size={16} className="text-emerald-300" />
            Monitoring API
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                error ? 'bg-red-400' : loading ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
            />
            <span className={error ? 'text-red-300' : 'text-emerald-300'}>
              {error ? 'Check connection' : loading ? 'Connecting...' : 'Connected'}
            </span>
          </div>

          <p className="mt-2 break-all text-xs leading-5 text-slate-500">
            http://127.0.0.1:8000
          </p>
        </div>

        <div className="mt-auto hidden pt-8 text-xs text-slate-600 md:block">
          <div className="border-t border-white/10 pt-4">
            Sentinel · Website reliability
          </div>
        </div>
      </aside>

      {/* Main dashboard */}
      <main className="min-w-0 flex-1 p-5 sm:p-8 lg:p-10">
        <header className="mb-9 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-xs text-slate-500">
              Workspace / Overview
            </p>

            <h2 className="text-3xl font-semibold tracking-tight text-white">
              Dashboard
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Monitor your websites and detect downtime.
            </p>
          </div>

          <button
            onClick={() => {
              setShowForm(true)
              setError('')
              setMessage('')
            }}
            className="flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-[#07120e] transition hover:bg-emerald-300"
          >
            <Plus size={17} />
            Add monitor
          </button>
        </header>

        {/* Feedback messages */}
        {error && (
          <div className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-300">
            <span className="break-words">{error}</span>
            <button onClick={() => setError('')} aria-label="Dismiss error">
              <X size={16} />
            </button>
          </div>
        )}

        {message && (
          <div className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-300">
            <span>{message}</span>
            <button
              onClick={() => setMessage('')}
              aria-label="Dismiss message"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Statistics */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ label, value, description, icon: Icon, color, bg }) => (
            <div
              key={label}
              className="rounded-2xl border border-white/[0.08] bg-[#101725] p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-slate-400">{label}</p>

                <div className={`rounded-xl p-2 ${bg} ${color}`}>
                  <Icon size={19} />
                </div>
              </div>

              <p className="mt-5 text-3xl font-semibold text-white">
                {loading && label === 'Total Monitors' ? '…' : value}
              </p>

              <p className="mt-2 text-xs text-slate-500">{description}</p>
            </div>
          ))}
        </section>

        {/* Monitor list */}
        <section
          id="monitors"
          className="mt-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101725]"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] p-5 sm:px-6">
            <div>
              <h3 className="font-semibold text-white">Website monitors</h3>
              <p className="mt-1 text-xs text-slate-500">
                Live monitor configuration from your database
              </p>
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={refreshing ? 'animate-spin' : ''}
              />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <RefreshCw
                size={24}
                className="mx-auto animate-spin text-emerald-300"
              />
              <p className="mt-4 text-sm text-slate-400">
                Loading monitors from Sentinel API...
              </p>
            </div>
          ) : error && monitors.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <AlertTriangle size={30} className="mx-auto text-red-300" />
              <p className="mt-3 text-sm text-slate-300">
                Could not load your monitors.
              </p>
              <button
                onClick={handleRefresh}
                className="mt-4 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
              >
                Try again
              </button>
            </div>
          ) : monitors.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Globe size={36} className="mx-auto text-slate-600" />
              <h4 className="mt-4 font-medium text-white">
                No monitors found
              </h4>
              <p className="mt-2 text-sm text-slate-500">
                Add your first website to start monitoring.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-[#07120e] hover:bg-emerald-300"
              >
                <Plus size={16} />
                Add your first monitor
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-white/[0.02] text-xs text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Website</th>
                    <th className="px-6 py-4 font-medium">Check interval</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Created</th>
                    <th className="px-6 py-4 font-medium">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.06]">
                  {monitors.map((monitor) => (
                    <tr
                      key={monitor.id}
                      className="transition hover:bg-white/[0.02]"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                            <Globe size={17} className="text-slate-400" />
                          </div>

                          <div className="min-w-0">
                            <p className="font-medium text-slate-200">
                              {monitor.name}
                            </p>
                            <a
                              href={monitor.url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 block max-w-xs truncate text-xs text-slate-500 hover:text-emerald-300"
                            >
                              {monitor.url}
                            </a>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-2 text-slate-300">
                          <Clock3 size={14} className="text-slate-500" />
                          {monitor.check_interval_seconds}s
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-2 rounded-full bg-slate-400/10 px-3 py-1 text-xs text-slate-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                          Awaiting status
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-400">
                        {monitor.created_at
                          ? new Date(monitor.created_at).toLocaleDateString()
                          : '—'}
                      </td>

                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleDeleteMonitor(monitor)}
                          title={`Delete ${monitor.name}`}
                          aria-label={`Delete ${monitor.name}`}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-red-400/10 hover:text-red-300"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] px-6 py-4">
            <p className="text-xs text-slate-500">
              {monitors.length} monitor{monitors.length === 1 ? '' : 's'} in your database
            </p>
            <p className="text-xs text-slate-600">
              Health status integration comes next
            </p>
          </div>
        </section>

        <footer className="mt-8 text-xs text-slate-600">
          Sentinel · Website reliability, made visible.
        </footer>
      </main>

      {/* Add monitor modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleAddMonitor}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#101725] p-6 shadow-2xl"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Add a monitor
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Add a website to your monitoring list.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/5"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <label
              htmlFor="siteName"
              className="mb-2 block text-sm text-slate-300"
            >
              Monitor name
            </label>
            <input
              id="siteName"
              value={siteName}
              onChange={(event) => setSiteName(event.target.value)}
              placeholder="My website"
              className="mb-5 w-full rounded-xl border border-white/10 bg-[#0b111d] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-400/60"
            />

            <label
              htmlFor="siteUrl"
              className="mb-2 block text-sm text-slate-300"
            >
              Website URL
            </label>
            <input
              id="siteUrl"
              required
              type="text"
              value={siteUrl}
              onChange={(event) => setSiteUrl(event.target.value)}
              placeholder="https://example.com"
              className="mb-6 w-full rounded-xl border border-white/10 bg-[#0b111d] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-400/60"
            />

            <p className="mb-5 text-xs leading-5 text-slate-500">
              New monitors will use the default 60-second check interval.
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={saving}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-[#07120e] hover:bg-emerald-300 disabled:opacity-50"
              >
                {saving && (
                  <RefreshCw size={15} className="animate-spin" />
                )}
                {saving ? 'Adding...' : 'Add monitor'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}


export default App
