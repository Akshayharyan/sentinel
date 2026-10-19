
const API_BASE_URL = 'http://127.0.0.1:8000'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `API error: ${response.status}`)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

// Get all monitors
export const getMonitors = () => request('/monitors')

// Create a new monitor
export const createMonitor = (monitor) =>
  request('/monitors', {
    method: 'POST',
    body: JSON.stringify(monitor),
  })

// Delete a monitor
export const deleteMonitor = (monitorId) =>
  request(`/monitors/${monitorId}`, {
    method: 'DELETE',
  })

// Get monitor status
export const getMonitorStatus = () => request('/monitors/status')

// Manually check a monitor
export const checkMonitor = (monitorId) =>
  request(`/monitors/${monitorId}/check`, {
    method: 'POST',
  })

// Get monitor history
export const getMonitorHistory = (monitorId) =>
  request(`/monitors/${monitorId}/history`)

// Get monitor statistics
export const getMonitorStats = (monitorId, hours = 24) =>
  request(`/monitors/${monitorId}/stats?hours=${hours}`)
