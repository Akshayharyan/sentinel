const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

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

// Authentication
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

// Monitors
export const getMonitors = () => request('/monitors')

export const getMonitorStatus = () =>
  request('/monitors/status')

export const createMonitor = (monitor) =>
  request('/monitors', {
    method: 'POST',
    body: JSON.stringify(monitor),
  })

export const deleteMonitor = (monitorId) =>
  request(`/monitors/${encodeURIComponent(monitorId)}`, {
    method: 'DELETE',
  })

// Manually check a website immediately
export const checkMonitor = (monitorId) =>
  request(`/monitors/${encodeURIComponent(monitorId)}/check`, {
    method: 'POST',
  })

// Monitoring history and statistics
export const getMonitorHistory = (monitorId) =>
  request(`/monitors/${encodeURIComponent(monitorId)}/history`)

export const getMonitorStats = (monitorId, hours = 24) => {
  const validHours = Math.max(
    1,
    Math.min(8760, Number(hours) || 24)
  )

  return request(
    `/monitors/${encodeURIComponent(monitorId)}/stats?hours=${validHours}`
  )
}
