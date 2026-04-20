import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

const ROLES = [
  {
    key: 'patient',
    label: 'Patient',
    icon: '👤',
    description: 'Book & manage appointments',
  },
  {
    key: 'doctor',
    label: 'Doctor',
    icon: '🩺',
    description: 'Manage your schedule',
  },
  {
    key: 'admin',
    label: 'Admin',
    icon: '🛡️',
    description: 'Full system access',
  },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [role, setRole] = useState('patient')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [adminCode, setAdminCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validate fields
    if (!username.trim()) {
      setError('Please enter your username.')
      return
    }
    if (!password.trim()) {
      setError('Please enter your password.')
      return
    }
    if (role === 'admin' && !adminCode.trim()) {
      setError('Admin access code is required.')
      return
    }

    setLoading(true)

    try {
      let res

      if (role === 'admin') {
        // Admin login endpoint
        res = await api.post('/auth/admin-login/', {
          username: username.trim(),
          password: password.trim(),
          special_code: adminCode.trim(),
        })
      } else {
        // Patient and Doctor use same login endpoint
        res = await api.post('/auth/login/', {
          username: username.trim(),
          password: password.trim(),
        })
      }

      // Save auth data
      login(res.data)

      // Navigate based on actual role returned from server
      const actualRole = res.data.role
      if (actualRole === 'admin') {
        navigate('/admin', { replace: true })
      } else if (actualRole === 'doctor') {
        navigate('/doctor', { replace: true })
      } else {
        navigate('/patient', { replace: true })
      }

    } catch (err) {
      const msg = err.response?.data?.error || 'Invalid username or password'
      setError(msg)
      setPassword('')
      setAdminCode('')
    } finally {
      setLoading(false)
    }
  }

  const inp = {
    width: '100%',
    padding: '11px 14px',
    border: '1.5px solid #e5e7eb',
    borderRadius: 8,
    fontSize: 14,
    color: '#000',
    fontWeight: 'bold',
    background: 'white',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f0fdf4',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <img
            src="/logo.png"
            alt="Clinic Logo"
            style={{
              width: 70, height: 70,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3px solid #16a34a',
              marginBottom: 10,
              boxShadow: '0 4px 12px rgba(22,163,74,0.2)',
            }}
            onError={e => {
              e.target.style.display = 'none'
            }}
          />
          <h1 style={{
            fontSize: 20, fontWeight: 800,
            color: '#14532d', marginBottom: 2,
          }}>
            Clinic Appointment System
          </h1>
          <p style={{ color: '#16a34a', fontSize: 13, fontWeight: 700 }}>
            Poblacion Danao Bohol
          </p>
        </div>

        {/* Login Card */}
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 24,
          border: '1px solid #e5e7eb',
          boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
        }}>

          {/* Role Selector */}
          <div style={{ marginBottom: 20 }}>
            <p style={{
              fontSize: 11, fontWeight: 700, color: '#6b7280',
              textTransform: 'uppercase', letterSpacing: 0.8,
              marginBottom: 10, textAlign: 'center',
            }}>
              Login as
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 8,
            }}>
              {ROLES.map(r => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => {
                    setRole(r.key)
                    setError('')
                    setAdminCode('')
                  }}
                  style={{
                    padding: '10px 6px',
                    border: role === r.key
                      ? '2px solid #16a34a'
                      : '2px solid #e5e7eb',
                    borderRadius: 10,
                    background: role === r.key ? '#f0fdf4' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 22 }}>{r.icon}</span>
                  <span style={{
                    fontSize: 12, fontWeight: 700,
                    color: role === r.key ? '#16a34a' : '#374151',
                  }}>
                    {r.label}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    color: role === r.key ? '#16a34a' : '#9ca3af',
                    textAlign: 'center', lineHeight: 1.3,
                  }}>
                    {r.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Active role indicator */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#f0fdf4', borderRadius: 8,
            padding: '8px 12px', marginBottom: 16,
            border: '1px solid #bbf7d0',
          }}>
            <span style={{ fontSize: 16 }}>
              {ROLES.find(r => r.key === role)?.icon}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#14532d' }}>
              Logging in as{' '}
              <strong>{ROLES.find(r => r.key === role)?.label}</strong>
            </span>
          </div>

          {/* Error message */}
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1.5px solid #fca5a5',
              borderRadius: 8,
              padding: '10px 14px',
              color: '#dc2626',
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>

            {/* Username */}
            <div style={{ marginBottom: 14 }}>
              <label style={{
                display: 'block', fontSize: 13,
                fontWeight: 700, color: '#374151', marginBottom: 6,
              }}>
                Username
              </label>
              <input
                style={inp}
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onFocus={e => e.target.style.borderColor = '#16a34a'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                autoComplete="username"
                autoCapitalize="none"
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 14 }}>
              <label style={{
                display: 'block', fontSize: 13,
                fontWeight: 700, color: '#374151', marginBottom: 6,
              }}>
                Password
              </label>
              <input
                style={inp}
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={e => e.target.style.borderColor = '#16a34a'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                autoComplete="current-password"
              />
            </div>

            {/* Admin Access Code */}
            {role === 'admin' && (
              <div style={{ marginBottom: 14 }}>
                <label style={{
                  display: 'block', fontSize: 13,
                  fontWeight: 700, color: '#374151', marginBottom: 6,
                }}>
                  🛡️ Admin Access Code
                </label>
                <input
                  style={{
                    ...inp,
                    border: '1.5px solid #16a34a',
                    background: '#f0fdf4',
                  }}
                  type="password"
                  placeholder="Enter admin access code"
                  value={adminCode}
                  onChange={e => setAdminCode(e.target.value)}
                  onFocus={e => e.target.style.borderColor = '#15803d'}
                  onBlur={e => e.target.style.borderColor = '#16a34a'}
                  autoComplete="off"
                />
                <p style={{
                  fontSize: 11, color: '#6b7280',
                  fontWeight: 600, marginTop: 4,
                }}>
                  Required for admin authentication only.
                </p>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: loading ? '#9ca3af' : '#16a34a',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontWeight: 800,
                fontSize: 15,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 6,
              }}
              onMouseEnter={e => {
                if (!loading) e.currentTarget.style.background = '#15803d'
              }}
              onMouseLeave={e => {
                if (!loading) e.currentTarget.style.background = '#16a34a'
              }}
            >
              {loading ? (
                <span>⏳ Logging in…</span>
              ) : (
                <span>
                  {ROLES.find(r => r.key === role)?.icon}{' '}
                  Login as {ROLES.find(r => r.key === role)?.label}
                </span>
              )}
            </button>
          </form>

          {/* Register link — patient only */}
          {role === 'patient' && (
            <p style={{
              textAlign: 'center', marginTop: 14,
              fontSize: 13, color: '#6b7280', fontWeight: 600,
            }}>
              No account yet?{' '}
              <Link to="/register" style={{ color: '#16a34a', fontWeight: 800 }}>
                Register here
              </Link>
            </p>
          )}

          {role === 'doctor' && (
            <p style={{
              textAlign: 'center', marginTop: 14,
              fontSize: 12, color: '#9ca3af', fontWeight: 600,
            }}>
              Doctor accounts are created by the clinic administrator.
            </p>
          )}

          {role === 'admin' && (
            <p style={{
              textAlign: 'center', marginTop: 14,
              fontSize: 12, color: '#9ca3af', fontWeight: 600,
            }}>
              Admin access requires a special authorization code.
            </p>
          )}

        </div>

        <p style={{
          textAlign: 'center', marginTop: 14,
          fontSize: 11, color: '#9ca3af', fontWeight: 600,
        }}>
          Secure & Encrypted • Poblacion Danao Bohol Clinic
        </p>

      </div>
    </div>
  )
}