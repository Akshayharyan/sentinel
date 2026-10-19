
import { useCallback, useEffect, useState } from 'react'
import {
  Activity,
  Globe,
  ShieldCheck,
  AlertTriangle,
  Plus,
  RefreshCw,
  Trash2,
  X,
  CheckCircle2,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import {
  getMonitors,
  getMonitorStatus,
  createMonitor,
  deleteMonitor,
  checkMonitor,
  getMonitorHistory,
  getMonitorStats,
  getCurrentUser,
  login,
  logout,
  signup,
} from './services/api'

function App() {
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  })
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [monitors, setMonitors] = useState([])
  const [monitorStatuses, setMonitorStatuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [siteName, setSiteName] = useState('')
  const [siteUrl, setSiteUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedMonitor, setSelectedMonitor] = useState(null)
  const [monitorHistory, setMonitorHistory] = useState([])
  const [monitorStats, setMonitorStats] = useState(null)
  const [historyHours, setHistoryHours] = useState(24)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [checkingMonitor, setCheckingMonitor] = useState(false)

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setAuthChecked(true))
  }, [])

  const loadDashboard = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true)

    try {
      const [monitorData, statusData] = await Promise.all([
        getMonitors(),
        getMonitorStatus(),
      ])

      setMonitors(monitorData)
      setMonitorStatuses(statusData.monitors ?? [])
      setError('')
    } catch (err) {
      setError(
        err.message ||
          'Unable to load monitoring data. Check that the backend is running.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (!user) return undefined
    loadDashboard()

    const intervalId = window.setInterval(() => {
      loadDashboard(false)
    }, 30000)

    return () => window.clearInterval(intervalId)
  }, [loadDashboard, user])

  async function handleAuthSubmit(event) {
    event.preventDefault()
    setAuthLoading(true)
    setAuthError('')

    try {
      const authenticatedUser =
        authMode === 'login'
          ? await login({
              email: authForm.email,
              password: authForm.password,
            })
          : await signup(authForm)
      setUser(authenticatedUser)
      setAuthForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
      })
    } catch (err) {
      setAuthError(err.message || 'Authentication failed.')
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleLogout() {
    await logout()
    setUser(null)
    setSelectedMonitor(null)
    setMonitors([])
    setMonitorStatuses([])
  }

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090d16] text-slate-300">
        <RefreshCw className="animate-spin text-emerald-300" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="sentinel-auth flex min-h-screen items-center justify-center px-4 text-slate-200">
        <form
          onSubmit={handleAuthSubmit}
          className="sentinel-auth-card w-full max-w-md rounded-2xl border p-6 shadow-2xl"
        >
          <div className="mb-8 flex items-center gap-3">
            <div className="rounded-xl bg-emerald-400 p-2 text-slate-950">
              <ShieldCheck size={25} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Sentinel</h1>
              <p className="text-xs text-slate-500">Website monitoring</p>
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-white">
            {authMode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {authMode === 'login'
              ? 'Sign in to view your monitors.'
              : 'Start monitoring your websites securely.'}
          </p>
          {authError && (
            <p className="mt-5 rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-300">
              {authError}
            </p>
          )}
          {authMode === 'signup' && (
            <input
              required
              value={authForm.name}
              onChange={(event) =>
                setAuthForm({ ...authForm, name: event.target.value })
              }
              placeholder="Name"
              className="sentinel-input mt-5 w-full rounded-xl border border-white/10 bg-[#0b111d] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600"
            />
          )}
          <input
            required
            type="email"
            value={authForm.email}
            onChange={(event) =>
              setAuthForm({ ...authForm, email: event.target.value })
            }
            placeholder="Email"
            className="sentinel-input mt-4 w-full rounded-xl border border-white/10 bg-[#0b111d] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600"
          />
          <input
            required
            minLength={authMode === 'signup' ? 8 : 1}
            type="password"
            value={authForm.password}
            onChange={(event) =>
              setAuthForm({ ...authForm, password: event.target.value })
            }
            placeholder="Password"
            className="sentinel-input mt-4 w-full rounded-xl border border-white/10 bg-[#0b111d] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600"
          />
          {authMode === 'signup' && (
            <input
              required
              minLength={8}
              type="password"
              value={authForm.password_confirmation}
              onChange={(event) =>
                setAuthForm({
                  ...authForm,
                  password_confirmation: event.target.value,
                })
              }
              placeholder="Confirm password"
              className="sentinel-input mt-4 w-full rounded-xl border border-white/10 bg-[#0b111d] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600"
            />
          )}
          <button
            disabled={authLoading}
            className="sentinel-primary mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-[#07120e] hover:bg-emerald-300 disabled:opacity-50"
          >
            {authLoading && <RefreshCw size={15} className="animate-spin" />}
            {authMode === 'login' ? 'Log in' : 'Sign up'}
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode(authMode === 'login' ? 'signup' : 'login')
              setAuthError('')
            }}
            className="mt-5 w-full text-sm text-slate-400 hover:text-emerald-300"
          >
            {authMode === 'login'
              ? 'Need an account? Sign up'
              : 'Already have an account? Log in'}
          </button>
        </form>
      </div>
    )
  }

  async function handleRefresh() {
    setRefreshing(true)
    setMessage('')
    await loadDashboard(false)
  }

  async function handleAddMonitor(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    let normalizedUrl = siteUrl.trim()

    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`
    }

    let parsedUrl

    try {
      parsedUrl = new URL(normalizedUrl)

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol')
      }
    } catch {
      setError('Please enter a valid website URL.')
      return
    }

    setSaving(true)

    try {
      const payload = {
        name: siteName.trim() || parsedUrl.hostname,
        url: normalizedUrl,
        check_interval_seconds: 60,
      }

      await createMonitor(payload)
      await loadDashboard(false)

      setSiteName('')
      setSiteUrl('')
      setShowForm(false)
      setMessage('Monitor created successfully.')
    } catch (err) {
      setError(
        err.message || 'Could not create the monitor. Please try again.'
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

      setMonitorStatuses((current) =>
        current.filter((item) => item.id !== monitor.id)
      )
      if (selectedMonitor?.id === monitor.id) {
        setSelectedMonitor(null)
      }

      setMessage(`${monitor.name} was deleted.`)
    } catch (err) {
      setError(err.message || 'Could not delete this monitor.')
    }
  }

  async function loadMonitorDetails(monitor, hours = historyHours) {
    setDetailLoading(true)
    setDetailError('')

    try {
      const [historyData, statsData] = await Promise.all([
        getMonitorHistory(monitor.id),
        getMonitorStats(monitor.id, hours),
      ])

      setMonitorHistory(historyData.history ?? [])
      setMonitorStats(statsData)
    } catch (err) {
      setDetailError(err.message || 'Could not load monitor details.')
    } finally {
      setDetailLoading(false)
    }
  }

  async function openMonitorDetails(monitor) {
    setSelectedMonitor(monitor)
    setHistoryHours(24)
    await loadMonitorDetails(monitor, 24)
  }

  async function handleCheckMonitor() {
    if (!selectedMonitor) return

    setCheckingMonitor(true)
    setDetailError('')

    try {
      await checkMonitor(selectedMonitor.id)
      await Promise.all([
        loadDashboard(false),
        loadMonitorDetails(selectedMonitor, historyHours),
      ])
      setMessage(`${selectedMonitor.name} was checked successfully.`)
    } catch (err) {
      setDetailError(err.message || 'Could not check this monitor.')
    } finally {
      setCheckingMonitor(false)
    }
  }

  // Match each monitor with its latest status from the backend.
  const statusById = new Map(
    monitorStatuses.map((item) => [item.id, item])
  )

  const operationalCount = monitorStatuses.filter(
    (item) => item.status === 'UP'
  ).length

  const downCount = monitorStatuses.filter(
    (item) => item.status === 'DOWN'
  ).length

  const unknownCount = monitors.filter(
    (monitor) => !statusById.has(monitor.id) ||
      statusById.get(monitor.id)?.status === 'UNKNOWN'
  ).length

  const responseTimes = monitorStatuses
    .filter(
      (item) =>
        item.status_code !== null &&
        item.response_time_ms !== null &&
        item.response_time_ms !== undefined
    )
    .map((item) => Number(item.response_time_ms))
    .filter(Number.isFinite)

  const averageResponseTime =
    responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) /
        responseTimes.length
      : null

  const stats = [
    {
      label: 'Total Monitors',
      value: monitors.length,
      description: 'Websites in your database',
      icon: Globe,
      color: 'text-blue-300',
      bg: 'bg-blue-400/10',
    },
    {
      label: 'Operational',
      value: operationalCount,
      description: 'Latest check reports UP',
      icon: ShieldCheck,
      color: 'text-emerald-300',
      bg: 'bg-emerald-400/10',
    },
    {
      label: 'Experiencing Issues',
      value: downCount,
      description:
        unknownCount > 0
          ? `${unknownCount} awaiting a successful recorded check`
          : 'Latest check reports DOWN',
      icon: AlertTriangle,
      color: 'text-red-300',
      bg: 'bg-red-400/10',
    },
    {
      label: 'Avg. Response Time',
      value:
        averageResponseTime === null
          ? '—'
          : `${Math.round(averageResponseTime)} ms`,
      description: 'Average of latest recorded response times',
      icon: Activity,
      color: 'text-violet-300',
      bg: 'bg-violet-400/10',
    },
  ]

  function formatDate(value) {
    if (!value) return 'Never'

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return '—'

    return date.toLocaleString()
  }

  function getStatusStyle(status) {
    switch (status) {
      case 'UP':
        return {
          wrapper: 'bg-emerald-400/10 text-emerald-300',
          dot: 'bg-emerald-400',
          label: 'UP',
        }

      case 'DOWN':
        return {
          wrapper: 'bg-red-400/10 text-red-300',
          dot: 'bg-red-400',
          label: 'DOWN',
        }
      default:
        return {
          wrapper: 'bg-slate-400/10 text-slate-300',
          dot: 'bg-slate-400',
          label: 'UNKNOWN',
        }
    }
  }

  const chartData = [...monitorHistory]
    .filter(
      (item) =>
        item.response_time_ms !== null &&
        item.response_time_ms !== undefined &&
        Number.isFinite(Number(item.response_time_ms))
    )
    .sort((a, b) => new Date(a.checked_at) - new Date(b.checked_at))
    .map((item) => ({
      time: new Date(item.checked_at).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      responseTime: Number(item.response_time_ms),
    }))

  return (
    <div className="sentinel-shell min-h-screen text-slate-200 md:flex">
      {/* Sidebar */}
      <aside className="sentinel-sidebar flex shrink-0 flex-col border-b border-white/10 p-5 md:min-h-screen md:w-64 md:border-r md:border-b-0">
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
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex w-full items-center gap-3 rounded-xl bg-emerald-400/10 px-4 py-3 text-left text-sm text-emerald-300"
          >
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
                error
                  ? 'bg-red-400'
                  : loading
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
              }`}
            />

            <span
              className={
                error ? 'text-red-300' : 'text-emerald-300'
              }
            >
              {error
                ? 'Connection error'
                : loading
                  ? 'Connecting...'
                  : 'Connected'}
            </span>
          </div>

          <p className="mt-2 break-all text-xs leading-5 text-slate-500">
            http://localhost:8000
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Refreshes every 30 seconds
          </p>
        </div>

        <div className="mt-6 border-t border-white/10 pt-4">
          <p className="truncate text-sm text-slate-300">{user.name}</p>
          <p className="truncate text-xs text-slate-500">{user.email}</p>
          <button
            onClick={handleLogout}
            className="mt-3 text-xs text-slate-400 hover:text-red-300"
          >
            Log out
          </button>
        </div>

        <div className="mt-auto hidden pt-8 text-xs text-slate-600 md:block">
          <div className="border-t border-white/10 pt-4">
            Sentinel · Website reliability
          </div>
        </div>
      </aside>

      {/* Main dashboard */}
      <main className="sentinel-main min-w-0 flex-1 p-5 sm:p-8 lg:p-10">
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
            className="sentinel-primary flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-[#07120e] transition hover:bg-emerald-300"
          >
            <Plus size={17} />
            Add monitor
          </button>
        </header>

        {/* Feedback messages */}
        {error && (
          <div className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-300">
            <span className="break-words">{error}</span>
            <button
              onClick={() => setError('')}
              aria-label="Dismiss error"
            >
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

        {/* Live statistics */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(
            ({ label, value, description, icon: Icon, color, bg }) => (
              <div
                key={label}
                className="sentinel-surface rounded-2xl border p-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-slate-400">{label}</p>

                  <div className={`rounded-xl p-2 ${bg} ${color}`}>
                    <Icon size={19} />
                  </div>
                </div>

                <p className="mt-5 text-3xl font-semibold text-white">
                  {loading ? '…' : value}
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  {description}
                </p>
              </div>
            )
          )}
        </section>

        {/* Monitor list */}
        <section
          id="monitors"
          className="sentinel-surface mt-6 overflow-hidden rounded-2xl border"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] p-5 sm:px-6">
            <div>
              <h3 className="font-semibold text-white">
                Website monitors
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Latest status and check information from Sentinel API
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
                Loading monitoring data...
              </p>
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
                className="sentinel-primary mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-[#07120e] hover:bg-emerald-300"
              >
                <Plus size={16} />
                Add your first monitor
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-white/[0.02] text-xs text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Website</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Response</th>
                    <th className="px-6 py-4 font-medium">Last checked</th>
                    <th className="px-6 py-4 font-medium">Checks</th>
                    <th className="px-6 py-4 font-medium">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.06]">
                  {monitors.map((monitor) => {
                    const status = statusById.get(monitor.id)
                    const statusStyle = getStatusStyle(status?.status)

                    return (
                      <tr
                        key={monitor.id}
                        className="transition hover:bg-white/[0.02]"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                              <Globe
                                size={17}
                                className="text-slate-400"
                              />
                            </div>

                            <div className="min-w-0">
                              <button
                                onClick={() => openMonitorDetails(monitor)}
                                className="text-left font-medium text-slate-200 hover:text-emerald-300"
                              >
                                {monitor.name}
                              </button>
                              <a
                                href={monitor.url}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 flex max-w-xs items-center gap-1 truncate text-xs text-slate-500 hover:text-emerald-300"
                              >
                                <span className="truncate">
                                  {monitor.url}
                                </span>
                                <ExternalLink
                                  size={12}
                                  className="shrink-0"
                                />
                              </a>
                              <p className="mt-1 text-xs text-slate-600">
                                Every {monitor.check_interval_seconds}s
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${statusStyle.wrapper}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`}
                            />
                            {statusStyle.label}
                          </span>
                          {status?.status_code != null && (
                            <p className="mt-1 text-xs text-slate-500">
                              HTTP {status.status_code}
                            </p>
                          )}
                        </td>

                        <td className="px-6 py-4 text-slate-300">
                          {status?.response_time_ms != null
                            ? `${Math.round(Number(status.response_time_ms))} ms`
                            : '—'}
                        </td>

                        <td className="px-6 py-4 text-xs text-slate-400">
                          {formatDate(status?.last_checked_at)}
                        </td>

                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-2 text-slate-300">
                            <CheckCircle2
                              size={14}
                              className="text-emerald-300"
                            />
                            {status?.total_checks ?? 0}
                          </span>
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
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] px-6 py-4">
            <p className="text-xs text-slate-500">
              {monitors.length} monitor
              {monitors.length === 1 ? '' : 's'} in your database
            </p>
            <p className="text-xs text-slate-600">
              Refreshes every 30 seconds
            </p>
          </div>
        </section>

        <footer className="mt-8 text-xs text-slate-600">
          Sentinel · Website reliability, made visible.
        </footer>
      </main>

      {selectedMonitor && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-[#090d16]">
          <main className="min-h-screen p-5 sm:p-8 lg:p-10">
            <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
              <div>
                <button
                  onClick={() => setSelectedMonitor(null)}
                  className="mb-4 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-300"
                >
                  <ArrowLeft size={16} />
                  Back to overview
                </button>
                <p className="mb-2 text-xs text-slate-500">
                  Workspace / Monitors / Details
                </p>
                <h2 className="text-3xl font-semibold tracking-tight text-white">
                  {selectedMonitor.name}
                </h2>
                <a
                  href={selectedMonitor.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex max-w-full items-center gap-1 break-all text-sm text-slate-400 hover:text-emerald-300"
                >
                  {selectedMonitor.url}
                  <ExternalLink size={13} />
                </a>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleCheckMonitor}
                  disabled={checkingMonitor}
                  className="flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-[#07120e] hover:bg-emerald-300 disabled:opacity-50"
                >
                  <RefreshCw
                    size={15}
                    className={checkingMonitor ? 'animate-spin' : ''}
                  />
                  Check now
                </button>
                <button
                  onClick={() =>
                    loadMonitorDetails(selectedMonitor, historyHours)
                  }
                  disabled={detailLoading}
                  className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-50"
                >
                  <RefreshCw size={15} />
                  Refresh details
                </button>
              </div>
            </header>

            {detailError && (
              <div className="mb-5 rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-300">
                {detailError}
              </div>
            )}

            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-400">
                Uptime, response-time history, and check results
              </p>
              <label className="flex items-center gap-2 text-sm text-slate-500">
                Period
                <select
                  value={historyHours}
                  onChange={(event) => {
                    const hours = Number(event.target.value)
                    setHistoryHours(hours)
                    loadMonitorDetails(selectedMonitor, hours)
                  }}
                  className="rounded-lg border border-white/10 bg-[#101725] px-3 py-2 text-slate-300 outline-none"
                >
                  <option value={24}>24 hours</option>
                  <option value={168}>7 days</option>
                  <option value={720}>30 days</option>
                </select>
              </label>
            </div>

            {detailLoading ? (
              <div className="rounded-2xl border border-white/[0.08] bg-[#101725] py-20 text-center">
                <RefreshCw
                  size={24}
                  className="mx-auto animate-spin text-emerald-300"
                />
                <p className="mt-4 text-sm text-slate-400">
                  Loading monitor details...
                </p>
              </div>
            ) : (
              <>
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    ['Uptime', monitorStats?.uptime_percentage == null ? '—' : `${monitorStats.uptime_percentage}%`],
                    ['Total checks', monitorStats?.total_checks ?? 0],
                    ['Successful checks', monitorStats?.successful_checks ?? 0],
                    ['Average response', monitorStats?.average_response_time_ms == null ? '—' : `${Math.round(monitorStats.average_response_time_ms)} ms`],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-white/[0.08] bg-[#101725] p-5"
                    >
                      <p className="text-sm text-slate-400">{label}</p>
                      <p className="mt-4 text-3xl font-semibold text-white">
                        {value}
                      </p>
                    </div>
                  ))}
                </section>

                <section className="mt-6 rounded-2xl border border-white/[0.08] bg-[#101725] p-5 sm:p-6">
                  <h3 className="font-semibold text-white">
                    Response-time history
                  </h3>
                  {chartData.length === 0 ? (
                    <p className="py-16 text-center text-sm text-slate-500">
                      No response-time history is available for this period.
                    </p>
                  ) : (
                    <div className="mt-5 h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid stroke="#ffffff12" vertical={false} />
                          <XAxis
                            dataKey="time"
                            tick={{ fill: '#64748b', fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            unit=" ms"
                            tick={{ fill: '#64748b', fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              background: '#101725',
                              border: '1px solid #ffffff1a',
                              borderRadius: 12,
                            }}
                            labelStyle={{ color: '#cbd5e1' }}
                          />
                          <Line
                            type="monotone"
                            dataKey="responseTime"
                            name="Response time"
                            stroke="#34d399"
                            strokeWidth={2}
                            dot={{ r: 3, fill: '#34d399' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </section>

                <section className="mt-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101725]">
                  <div className="border-b border-white/[0.08] p-5">
                    <h3 className="font-semibold text-white">Recent checks</h3>
                  </div>
                  <div className="divide-y divide-white/[0.06]">
                    {monitorHistory.length === 0 ? (
                      <p className="p-6 text-sm text-slate-500">
                        No checks have been recorded yet.
                      </p>
                    ) : (
                      monitorHistory.slice(0, 10).map((check) => {
                        const statusStyle = getStatusStyle(
                          check.is_up ? 'UP' : 'DOWN'
                        )
                        return (
                          <div
                            key={check.id}
                            className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`h-2 w-2 rounded-full ${statusStyle.dot}`}
                              />
                              <span className="text-sm text-slate-300">
                                {statusStyle.label}
                              </span>
                              <span className="text-xs text-slate-500">
                                {formatDate(check.checked_at)}
                              </span>
                            </div>
                            <span className="text-sm text-slate-400">
                              {check.response_time_ms == null
                                ? '—'
                                : `${Math.round(Number(check.response_time_ms))} ms`}
                            </span>
                          </div>
                        )
                      })
                    )}
                  </div>
                </section>
              </>
            )}
          </main>
        </div>
      )}

      {/* Add monitor modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleAddMonitor}
            className="sentinel-auth-card w-full max-w-md rounded-2xl border p-6 shadow-2xl"
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
