import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api/axios'

export default function RegisterPage() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    password: '',
    confirm_password: '',
    role: 'patient',
    patient_id: '',
    date_of_birth: '',
    contact_number: '',
    address: '',
    blood_type: '',
    allergies: '',
    emergency_contact: '',
    specialization: '',
  })

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [apiError, setApiError] = useState('')

  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

  const update = (field, value) => {
    setForm(f => ({ ...f, [field]: value }))
    // Clear error for this field when user types
    if (errors[field]) {
      setErrors(e => ({ ...e, [field]: '' }))
    }
  }

  // Validate username — no spaces, only letters/numbers/@/./+/-/_
  const validateUsername = (username) => {
    const valid = /^[a-zA-Z0-9@.+\-_]+$/.test(username)
    if (!valid) {
      return 'Username can only contain letters, numbers, and @/./+/-/_ characters. No spaces allowed.'
    }
    if (username.length < 3) {
      return 'Username must be at least 3 characters.'
    }
    return ''
  }

  const validate = () => {
    const newErrors = {}

    if (!form.first_name.trim()) newErrors.first_name = 'First name is required.'
    if (!form.last_name.trim()) newErrors.last_name = 'Last name is required.'

    if (!form.username.trim()) {
      newErrors.username = 'Username is required.'
    } else {
      const usernameError = validateUsername(form.username.trim())
      if (usernameError) newErrors.username = usernameError
    }

    if (!form.email.trim()) {
      newErrors.email = 'Email is required.'
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = 'Please enter a valid email address.'
    }

    if (!form.password) {
      newErrors.password = 'Password is required.'
    } else if (form.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.'
    }

    if (!form.confirm_password) {
      newErrors.confirm_password = 'Please confirm your password.'
    } else if (form.password !== form.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match.'
    }

    if (form.role === 'patient') {
      if (!form.patient_id.trim()) {
        newErrors.patient_id = 'Patient ID is required.'
      } else if (!/^\d+$/.test(form.patient_id.trim())) {
        newErrors.patient_id = 'Patient ID must be numbers only.'
      }
      if (!form.date_of_birth) {
        newErrors.date_of_birth = 'Date of birth is required.'
      }
    }

    if (form.role === 'doctor') {
      if (!form.specialization.trim()) {
        newErrors.specialization = 'Specialization is required.'
      }
    }

    return newErrors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setApiError('')
    setSuccess('')

    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setLoading(true)

    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      }

      if (form.role === 'patient') {
        payload.patient_id = form.patient_id.trim()
        // Always send date in YYYY-MM-DD format
        payload.date_of_birth = form.date_of_birth
        payload.contact_number = form.contact_number.trim()
        payload.address = form.address.trim()
        payload.blood_type = form.blood_type
        payload.allergies = form.allergies.trim()
        payload.emergency_contact = form.emergency_contact.trim()
      }

      if (form.role === 'doctor') {
        payload.specialization = form.specialization.trim()
      }

      await api.post('/auth/register/', payload)

      setSuccess(
        'Registration successful! A confirmation email has been sent to ' +
        form.email + '. You can now log in.'
      )

      // Clear form
      setForm({
        first_name: '', last_name: '', username: '', email: '',
        password: '', confirm_password: '', role: 'patient',
        patient_id: '', date_of_birth: '', contact_number: '',
        address: '', blood_type: '', allergies: '',
        emergency_contact: '', specialization: '',
      })
      setErrors({})

      // Redirect to login after 3 seconds
      setTimeout(() => navigate('/login'), 3000)

    } catch (err) {
      const data = err.response?.data
      if (typeof data === 'object' && data !== null) {
        // Map backend errors to field errors
        const mapped = {}
        for (const [key, val] of Object.entries(data)) {
          mapped[key] = Array.isArray(val) ? val.join(' ') : String(val)
        }
        setErrors(mapped)
        setApiError('Please fix the errors below and try again.')
      } else {
        setApiError('Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const inp = (hasError) => ({
    width: '100%',
    padding: '11px 14px',
    border: `1.5px solid ${hasError ? '#ef4444' : '#e5e7eb'}`,
    borderRadius: 8,
    fontSize: 14,
    color: '#000',
    fontWeight: 'bold',
    background: 'white',
    outline: 'none',
    boxSizing: 'border-box',
  })

  const FieldError = ({ field }) =>
    errors[field] ? (
      <div style={{
        fontSize: 12, color: '#dc2626', fontWeight: 700,
        marginTop: 4, display: 'flex', alignItems: 'center', gap: 4,
      }}>
        ⚠️ {errors[field]}
      </div>
    ) : null

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f0fdf4',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '24px 20px',
    }}>
      <div style={{ width: '100%', maxWidth: 520 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img src="/logo.png" alt="Clinic Logo"
            style={{
              width: 68, height: 68, borderRadius: '50%',
              objectFit: 'cover', border: '3px solid #16a34a',
              marginBottom: 10,
              boxShadow: '0 4px 12px rgba(22,163,74,0.2)',
            }}
            onError={e => { e.target.style.display = 'none' }}
          />
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#14532d', marginBottom: 2 }}>
            Create Account
          </h1>
          <p style={{ color: '#16a34a', fontSize: 13, fontWeight: 700 }}>
            Poblacion Danao Bohol Clinic
          </p>
        </div>

        {/* Success message */}
        {success && (
          <div style={{
            background: '#d1fae5', border: '1.5px solid #16a34a',
            borderRadius: 10, padding: '14px 16px', marginBottom: 20,
            color: '#065f46', fontWeight: 700, fontSize: 14,
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <span style={{ fontSize: 18 }}>✅</span>
            <div>
              {success}
              <div style={{ fontSize: 12, marginTop: 4, fontWeight: 600 }}>
                Redirecting to login in 3 seconds…
              </div>
            </div>
          </div>
        )}

        {/* API error */}
        {apiError && (
          <div style={{
            background: '#fef2f2', border: '1.5px solid #fca5a5',
            borderRadius: 10, padding: '12px 16px', marginBottom: 20,
            color: '#dc2626', fontWeight: 700, fontSize: 13,
          }}>
            ⚠️ {apiError}
          </div>
        )}

        {/* Form card */}
        <div style={{
          background: 'white', borderRadius: 16,
          padding: 24, border: '1px solid #e5e7eb',
          boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
        }}>

          <form onSubmit={handleSubmit} noValidate>

            {/* Role selector */}
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'block', fontSize: 13,
                fontWeight: 700, color: '#374151', marginBottom: 8,
              }}>
                Register as *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { value: 'patient', label: 'Patient', icon: '👤' },
                  { value: 'doctor', label: 'Doctor', icon: '🩺' },
                ].map(r => (
                  <button key={r.value} type="button"
                    onClick={() => update('role', r.value)}
                    style={{
                      padding: '12px 8px',
                      border: form.role === r.value
                        ? '2px solid #16a34a'
                        : '2px solid #e5e7eb',
                      borderRadius: 10,
                      background: form.role === r.value ? '#f0fdf4' : 'white',
                      cursor: 'pointer',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: 4,
                      transition: 'all 0.15s',
                    }}>
                    <span style={{ fontSize: 24 }}>{r.icon}</span>
                    <span style={{
                      fontSize: 13, fontWeight: 700,
                      color: form.role === r.value ? '#16a34a' : '#374151',
                    }}>
                      {r.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* First + Last Name */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                  First Name *
                </label>
                <input style={inp(errors.first_name)} type="text"
                  placeholder="e.g. Juan"
                  value={form.first_name}
                  onChange={e => update('first_name', e.target.value)}
                  onFocus={e => e.target.style.borderColor = '#16a34a'}
                  onBlur={e => e.target.style.borderColor = errors.first_name ? '#ef4444' : '#e5e7eb'} />
                <FieldError field="first_name" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                  Last Name *
                </label>
                <input style={inp(errors.last_name)} type="text"
                  placeholder="e.g. Dela Cruz"
                  value={form.last_name}
                  onChange={e => update('last_name', e.target.value)}
                  onFocus={e => e.target.style.borderColor = '#16a34a'}
                  onBlur={e => e.target.style.borderColor = errors.last_name ? '#ef4444' : '#e5e7eb'} />
                <FieldError field="last_name" />
              </div>
            </div>

            {/* Username */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                Username *
              </label>
              <input style={inp(errors.username)} type="text"
                placeholder="e.g. juandelacruz (no spaces)"
                value={form.username}
                onChange={e => update('username', e.target.value)}
                onFocus={e => e.target.style.borderColor = '#16a34a'}
                onBlur={e => e.target.style.borderColor = errors.username ? '#ef4444' : '#e5e7eb'}
                autoCapitalize="none"
                autoComplete="username" />
              <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, marginTop: 4 }}>
                ⚠️ No spaces allowed. Use letters, numbers, or underscores only.
                Example: <strong>juan_delacruz</strong> or <strong>juandc2024</strong>
              </div>
              <FieldError field="username" />
            </div>

            {/* Email */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                Email *
              </label>
              <input style={inp(errors.email)} type="email"
                placeholder="e.g. juan@email.com"
                value={form.email}
                onChange={e => update('email', e.target.value)}
                onFocus={e => e.target.style.borderColor = '#16a34a'}
                onBlur={e => e.target.style.borderColor = errors.email ? '#ef4444' : '#e5e7eb'}
                autoComplete="email" />
              <FieldError field="email" />
            </div>

            {/* Password */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                  Password *
                </label>
                <input style={inp(errors.password)} type="password"
                  placeholder="Min 6 characters"
                  value={form.password}
                  onChange={e => update('password', e.target.value)}
                  onFocus={e => e.target.style.borderColor = '#16a34a'}
                  onBlur={e => e.target.style.borderColor = errors.password ? '#ef4444' : '#e5e7eb'}
                  autoComplete="new-password" />
                <FieldError field="password" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                  Confirm Password *
                </label>
                <input style={inp(errors.confirm_password)} type="password"
                  placeholder="Re-enter password"
                  value={form.confirm_password}
                  onChange={e => update('confirm_password', e.target.value)}
                  onFocus={e => e.target.style.borderColor = '#16a34a'}
                  onBlur={e => e.target.style.borderColor = errors.confirm_password ? '#ef4444' : '#e5e7eb'}
                  autoComplete="new-password" />
                <FieldError field="confirm_password" />
              </div>
            </div>

            {/* Patient-specific fields */}
            {form.role === 'patient' && (
              <>
                <div style={{
                  background: '#f0fdf4', borderRadius: 8,
                  padding: '12px 14px', marginBottom: 14,
                  border: '1px solid #bbf7d0',
                  fontSize: 12, color: '#065f46', fontWeight: 700,
                }}>
                  👤 Patient Information
                </div>

                {/* Patient ID */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                    Patient ID * <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>(numbers only)</span>
                  </label>
                  <input style={inp(errors.patient_id)} type="text"
                    placeholder="e.g. 1001"
                    value={form.patient_id}
                    onChange={e => {
                      // Only allow numbers
                      const val = e.target.value.replace(/[^0-9]/g, '')
                      update('patient_id', val)
                    }}
                    onFocus={e => e.target.style.borderColor = '#16a34a'}
                    onBlur={e => e.target.style.borderColor = errors.patient_id ? '#ef4444' : '#e5e7eb'}
                    inputMode="numeric" />
                  <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, marginTop: 4 }}>
                    Your unique Patient ID assigned by the clinic. Numbers only.
                  </div>
                  <FieldError field="patient_id" />
                </div>

                {/* Date of Birth */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                    Date of Birth *
                  </label>
                  <input style={inp(errors.date_of_birth)} type="date"
                    value={form.date_of_birth}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={e => update('date_of_birth', e.target.value)}
                    onFocus={e => e.target.style.borderColor = '#16a34a'}
                    onBlur={e => e.target.style.borderColor = errors.date_of_birth ? '#ef4444' : '#e5e7eb'} />
                  <FieldError field="date_of_birth" />
                </div>

                {/* Contact + Blood Type */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                      Contact Number
                    </label>
                    <input style={inp(false)} type="text"
                      placeholder="e.g. 09123456789"
                      value={form.contact_number}
                      onChange={e => update('contact_number', e.target.value)}
                      onFocus={e => e.target.style.borderColor = '#16a34a'}
                      onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                      Blood Type
                    </label>
                    <select style={{
                      ...inp(false),
                      cursor: 'pointer',
                    }}
                      value={form.blood_type}
                      onChange={e => update('blood_type', e.target.value)}
                      onFocus={e => e.target.style.borderColor = '#16a34a'}
                      onBlur={e => e.target.style.borderColor = '#e5e7eb'}>
                      <option value="">-- Select --</option>
                      {bloodTypes.map(bt => (
                        <option key={bt} value={bt}>{bt}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Address */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                    Address
                  </label>
                  <input style={inp(false)} type="text"
                    placeholder="e.g. Barangay Poblacion, Danao, Bohol"
                    value={form.address}
                    onChange={e => update('address', e.target.value)}
                    onFocus={e => e.target.style.borderColor = '#16a34a'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
                </div>

                {/* Allergies */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                    Allergies
                  </label>
                  <input style={inp(false)} type="text"
                    placeholder="e.g. Penicillin, Peanuts (leave blank if none)"
                    value={form.allergies}
                    onChange={e => update('allergies', e.target.value)}
                    onFocus={e => e.target.style.borderColor = '#16a34a'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
                </div>

                {/* Emergency contact */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                    Emergency Contact
                  </label>
                  <input style={inp(false)} type="text"
                    placeholder="e.g. Maria Dela Cruz — 09123456789"
                    value={form.emergency_contact}
                    onChange={e => update('emergency_contact', e.target.value)}
                    onFocus={e => e.target.style.borderColor = '#16a34a'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
                </div>
              </>
            )}

            {/* Doctor-specific fields */}
            {form.role === 'doctor' && (
              <>
                <div style={{
                  background: '#f0fdf4', borderRadius: 8,
                  padding: '12px 14px', marginBottom: 14,
                  border: '1px solid #bbf7d0',
                  fontSize: 12, color: '#065f46', fontWeight: 700,
                }}>
                  🩺 Doctor Information
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                    Specialization *
                  </label>
                  <input style={inp(errors.specialization)} type="text"
                    placeholder="e.g. General Medicine, Surgery, Pediatrics"
                    value={form.specialization}
                    onChange={e => update('specialization', e.target.value)}
                    onFocus={e => e.target.style.borderColor = '#16a34a'}
                    onBlur={e => e.target.style.borderColor = errors.specialization ? '#ef4444' : '#e5e7eb'} />
                  <FieldError field="specialization" />
                </div>
              </>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              style={{
                width: '100%', padding: '13px',
                background: loading ? '#9ca3af' : '#16a34a',
                color: 'white', border: 'none', borderRadius: 10,
                fontWeight: 800, fontSize: 15,
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: 8, transition: 'background 0.2s',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#15803d' }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#16a34a' }}>
              {loading ? '⏳ Creating account…' : '✅ Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#6b7280', fontWeight: 600 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#16a34a', fontWeight: 800 }}>
              Login here
            </Link>
          </p>
        </div>

        <p style={{ textAlign: 'center', marginTop: 14, fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>
          Secure & Encrypted • Poblacion Danao Bohol Clinic
        </p>
      </div>
    </div>
  )
}