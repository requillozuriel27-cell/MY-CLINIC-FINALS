import { createContext, useContext, useState, useEffect } from 'react'
import api, { setTokens, clearTokens, getRefreshToken, getAccessToken } from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // On page load — check sessionStorage for existing session
    // sessionStorage survives client-side navigation
    // but is wiped when the browser tab is closed
    const access = sessionStorage.getItem('access')
    const role = sessionStorage.getItem('role')
    const user_id = sessionStorage.getItem('user_id')
    const username = sessionStorage.getItem('username')
    const full_name = sessionStorage.getItem('full_name')

    if (access && role && user_id) {
      setUser({
        role,
        user_id: parseInt(user_id),
        username,
        full_name,
      })
    }
    setLoading(false)
  }, [])

  const login = (data) => {
    // Save to memory AND sessionStorage
    setTokens(data.access, data.refresh)
    sessionStorage.setItem('role', data.role)
    sessionStorage.setItem('user_id', String(data.user_id))
    sessionStorage.setItem('username', data.username)
    sessionStorage.setItem('full_name', data.full_name || data.username)

    setUser({
      role: data.role,
      user_id: data.user_id,
      username: data.username,
      full_name: data.full_name || data.username,
    })
  }

  const logout = async () => {
    try {
      const refresh = getRefreshToken()
      if (refresh) await api.post('/auth/logout/', { refresh })
    } catch (_) {}
    clearTokens()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}