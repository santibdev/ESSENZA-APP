import { useAuthStore } from './stores/auth'

const apiUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1'

async function request(path, options = {}) {
  const auth = useAuthStore()
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  }

  if (auth.user?.token) {
    headers['Authorization'] = `Bearer ${auth.user.token}`
  }

  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers
  })

  if (response.status === 401) {
    auth.logout()
    window.location.reload()
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw error
  }

  return { data: await response.json().catch(() => ({})) }
}

export default {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, data, options) => request(path, { ...options, method: 'POST', body: JSON.stringify(data) }),
  put: (path, data, options) => request(path, { ...options, method: 'PUT', body: JSON.stringify(data) }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' })
}
