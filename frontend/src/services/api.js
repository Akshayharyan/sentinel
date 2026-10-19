
const API_BASE_URL = 'http://localhost:8000'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    let message = `API error: ${response.status}`

    try {
      const data = await response.json()

      if (typeof data.detail === 'string') {
        message = data.detail
      } else if (data.detail) {
        message = JSON.stringify(data.detail)
      }

    } catch {
      // Keep the default error message if the response is not JSON.
    }

    throw new Error(message)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

export const signup = (payload) =>
  request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const login = (payload) =>
  request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const logout = () =>
  request('/auth/logout', {
    method: 'POST',
  })

export const getCurrentUser = () => request('/auth/me')

// Get all registered monitors.
export const getMonitors = () => request('/monitors')

// Get the latest status and check count for every monitor.
export const getMonitorStatus = () =>
  request('/monitors/status')

// Create a new website monitor.
export const createMonitor = (monitor) =>
  request('/monitors', {
    method: 'POST',
    body: JSON.stringify(monitor),
  })

// Delete a monitor.
export const deleteMonitor = (monitorId) =>
  request(`/monitors/${encodeURIComponent(monitorId)}`, {
    method: 'DELETE',
  })

// Manually check a website immediately.
export const checkMonitor = (monitorId) =>
  request(
    `/monitors/${encodeURIComponent(monitorId)}/check`,
    { method: 'POST' }
  )

// Get the recent check history for a monitor.
export const getMonitorHistory = (monitorId) =>
  request(
    `/monitors/${encodeURIComponent(monitorId)}/history`
  )

// Get uptime, successful/failed checks, and average response time.
export const getMonitorStats = (monitorId, hours = 24) => {
  const validHours = Math.max(1, Math.min(8760, Number(hours) || 24))

  return request(
    `/monitors/${encodeURIComponent(monitorId)}/stats?hours=${validHours}`
  )
}
