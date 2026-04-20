import axios from 'axios'

let _accessToken = null
let _refreshToken = null

export function setTokens(access, refresh) {
  _accessToken = access
  _refreshToken = refresh
  // Also save to sessionStorage so tokens survive
  // client-side navigation within the same tab
  sessionStorage.setItem('access', access)
  sessionStorage.setItem('refresh', refresh)
}

export function clearTokens() {
  _accessToken = null
  _refreshToken = null
  sessionStorage.removeItem('access')
  sessionStorage.removeItem('refresh')
  sessionStorage.removeItem('role')
  sessionStorage.removeItem('user_id')
  sessionStorage.removeItem('username')
  sessionStorage.removeItem('full_name')
}

export function getAccessToken() {
  // Restore from sessionStorage if memory was cleared
  if (!_accessToken) {
    _accessToken = sessionStorage.getItem('access')
  }
  return _accessToken
}

export function getRefreshToken() {
  if (!_refreshToken) {
    _refreshToken = sessionStorage.getItem('refresh')
  }
  return _refreshToken
}

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    const isAuthEndpoint =
      original.url?.includes('/auth/login/') ||
      original.url?.includes('/auth/admin-login/') ||
      original.url?.includes('/auth/register/') ||
      original.url?.includes('/auth/token/refresh/')

    if (
      error.response?.status === 401 &&
      !original._retry &&
      !isAuthEndpoint
    ) {
      original._retry = true
      const refresh = getRefreshToken()
      if (!refresh) {
        clearTokens()
        window.location.href = '/login'
        return Promise.reject(error)
      }
      try {
        const res = await axios.post('/api/auth/token/refresh/', { refresh })
        _accessToken = res.data.access
        sessionStorage.setItem('access', res.data.access)
        if (res.data.refresh) {
          _refreshToken = res.data.refresh
          sessionStorage.setItem('refresh', res.data.refresh)
        }
        original.headers.Authorization = `Bearer ${_accessToken}`
        return api(original)
      } catch {
        clearTokens()
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  },
)

export default api