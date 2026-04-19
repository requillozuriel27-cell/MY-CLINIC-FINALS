import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useWebSocket } from '../hooks/useWebSocket'
import api from '../api/axios'
import LogoutModal from '../components/LogoutModal'
import ConfirmModal from '../components/ConfirmModal'
import NotificationBell from '../components/NotificationBell'
import MessagingPanel from '../components/MessagingPanel'

// ── Add Medical Record by Patient Name ──
function AddMedicalRecord() {
  const [nameQuery, setNameQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [recordTitle, setRecordTitle] = useState('')
  const [recordData, setRecordData] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState('')
  const [saveError, setSaveError] = useState('')

  const handleSearch = async (e) => {
    e?.preventDefault()
    if (!nameQuery.trim() || nameQuery.trim().length < 2) {
      setSearchError('Please type at least 2 characters.')
      return
    }
    setSearchError('')
    setSearching(true)
    setSearchResults([])
    setSelectedPatient(null)
    setSaveSuccess('')
    setSaveError('')
    try {
      const res = await api.get(
        `/patients/search/?q=${encodeURIComponent(nameQuery.trim())}`
      )
      setSearchResults(res.data.results || [])
      if ((res.data.results || []).length === 0) {
        setSearchError(`No patient found matching "${nameQuery}".`)
      }
    } catch (err) {
      setSearchError(
        err.response?.data?.error || 'Search failed. Please try again.'
      )
    } finally {
      setSearching(false)
    }
  }

  const selectPatient = (item) => {
    setSelectedPatient(item.patient)
    setSearchResults([])
    setNameQuery(
      item.patient.first_name
        ? `${item.patient.first_name} ${item.patient.last_name}`.trim()
        : item.patient.username
    )
    setSaveSuccess('')
    setSaveError('')
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!selectedPatient) {
      setSaveError('Please search and select a patient first.')
      return
    }
    if (!recordTitle.trim() || !recordData.trim()) {
      setSaveError('Record title and data are required.')
      return
    }
    setSaving(true)
    setSaveSuccess('')
    setSaveError('')
    try {
      await api.post('/records/create/', {
        patient: selectedPatient.id,
        record_title: recordTitle.trim(),
        data: recordData.trim(),
      })
      const patientName = selectedPatient.first_name
        ? `${selectedPatient.first_name} ${selectedPatient.last_name}`.trim()
        : selectedPatient.username
      setSaveSuccess(
        `✅ Medical record saved for ${patientName}. They can now view it in their dashboard.`
      )
      setRecordTitle('')
      setRecordData('')
      setSelectedPatient(null)
      setNameQuery('')
    } catch (err) {
      const d = err.response?.data
      setSaveError(
        typeof d === 'object'
          ? Object.values(d).flat().join(' ')
          : 'Failed to save. Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  const inp = {
    width: '100%', padding: '10px 14px',
    border: '1.5px solid #e5e7eb', borderRadius: 8,
    fontSize: 14, color: '#000', fontWeight: 'bold', background: 'white',
  }

  return (
    <div>
      {saveSuccess && (
        <div className="alert-success" style={{ marginBottom: 16 }}>
          {saveSuccess}
        </div>
      )}
      {saveError && (
        <div className="alert-error" style={{ marginBottom: 16 }}>
          {saveError}
        </div>
      )}

      {/* STEP 1 — Search patient by name */}
      <div style={{
        background: '#f9fafb', borderRadius: 10,
        padding: 16, marginBottom: 20,
        border: '1px solid #e5e7eb',
      }}>
        <div style={{
          fontWeight: 700, fontSize: 13, color: '#14532d',
          marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{
            background: '#16a34a', color: 'white',
            borderRadius: '50%', width: 22, height: 22,
            display: 'inline-flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 12, fontWeight: 700,
          }}>1</span>
          Search Patient by Name
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            style={inp}
            type="text"
            placeholder="Type patient name e.g. Jane, Juan Dela Cruz…"
            value={nameQuery}
            onChange={e => {
              setNameQuery(e.target.value)
              setSearchError('')
              if (selectedPatient) setSelectedPatient(null)
            }}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
            onFocus={e => e.target.style.borderColor = '#16a34a'}
            onBlur={e => e.target.style.borderColor = '#e5e7eb'}
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            className="btn-primary"
            style={{ padding: '10px 18px', whiteSpace: 'nowrap' }}
          >
            {searching ? '⏳' : '🔍 Search'}
          </button>
        </div>

        {searchError && (
          <div style={{
            marginTop: 8, fontSize: 13,
            color: '#dc2626', fontWeight: 700,
          }}>
            {searchError}
          </div>
        )}

        {/* Dropdown results */}
        {searchResults.length > 0 && (
          <div style={{
            marginTop: 8, border: '1px solid #e5e7eb',
            borderRadius: 8, overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            background: 'white',
          }}>
            {searchResults.map((item) => (
              <div
                key={item.patient.id}
                onClick={() => selectPatient(item)}
                style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid #f3f4f6',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: '#d1fae5', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0,
                }}>
                  👤
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#000' }}>
                    {item.patient.first_name} {item.patient.last_name}
                  </div>
                  <div style={{
                    fontSize: 12, color: '#6b7280',
                    fontWeight: 600, marginTop: 2,
                  }}>
                    @{item.patient.username}
                    {item.patient.patient_profile?.patient_id && (
                      <span style={{
                        marginLeft: 8, background: '#dcfce7',
                        color: '#166534', fontSize: 11, fontWeight: 700,
                        padding: '1px 8px', borderRadius: 999,
                      }}>
                        ID: {item.patient.patient_profile.patient_id}
                      </span>
                    )}
                  </div>
                </div>
                <span style={{
                  fontSize: 11, color: '#16a34a', fontWeight: 700,
                  padding: '3px 10px', background: '#f0fdf4',
                  borderRadius: 999, border: '1px solid #bbf7d0',
                }}>
                  Select ✓
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Selected patient confirmation */}
        {selectedPatient && (
          <div style={{
            marginTop: 10, padding: '10px 14px',
            background: '#d1fae5', borderRadius: 8,
            border: '1.5px solid #16a34a',
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>✅</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#000' }}>
                  {selectedPatient.first_name} {selectedPatient.last_name}
                </div>
                <div style={{ fontSize: 12, color: '#065f46', fontWeight: 600 }}>
                  @{selectedPatient.username}
                  {selectedPatient.patient_profile?.patient_id && (
                    <span style={{ marginLeft: 6 }}>
                      • Patient ID: {selectedPatient.patient_profile.patient_id}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedPatient(null)
                setNameQuery('')
                setSaveError('')
              }}
              style={{
                background: 'none', border: 'none',
                cursor: 'pointer', color: '#065f46',
                fontSize: 18, fontWeight: 700,
              }}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* STEP 2 — Fill record */}
      <div style={{
        background: '#f9fafb', borderRadius: 10,
        padding: 16, border: '1px solid #e5e7eb',
        opacity: selectedPatient ? 1 : 0.5,
        transition: 'opacity 0.2s',
      }}>
        <div style={{
          fontWeight: 700, fontSize: 13, color: '#14532d',
          marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{
            background: selectedPatient ? '#16a34a' : '#9ca3af',
            color: 'white', borderRadius: '50%',
            width: 22, height: 22,
            display: 'inline-flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 12, fontWeight: 700,
          }}>2</span>
          Fill Medical Record Details
          {!selectedPatient && (
            <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>
              — select a patient first
            </span>
          )}
        </div>

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label style={{ fontWeight: 700, fontSize: 13, color: '#374151' }}>
              Record Title *
            </label>
            <input
              style={inp}
              type="text"
              placeholder="e.g. Blood Test Results, Diagnosis, Checkup Notes"
              value={recordTitle}
              required
              disabled={!selectedPatient}
              onChange={e => setRecordTitle(e.target.value)}
              onFocus={e => e.target.style.borderColor = '#16a34a'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          <div className="form-group">
            <label style={{ fontWeight: 700, fontSize: 13, color: '#374151' }}>
              Record Data *
            </label>
            <textarea
              style={{
                ...inp,
                resize: 'vertical',
                minHeight: 140,
                lineHeight: 1.6,
                fontFamily: 'inherit',
              }}
              placeholder={
                'Enter medical record details here…\n\nExample:\nDiagnosis: Hypertension\nBlood Pressure: 140/90\nPrescription: Amlodipine 5mg\nNotes: Reduce salt intake.'
              }
              value={recordData}
              required
              disabled={!selectedPatient}
              onChange={e => setRecordData(e.target.value)}
              onFocus={e => e.target.style.borderColor = '#16a34a'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
            <div style={{
              fontSize: 11, color: '#9ca3af',
              marginTop: 4, fontWeight: 600,
            }}>
              🔒 This data will be encrypted before saving.
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || !selectedPatient}
            style={{
              width: '100%', padding: '12px',
              background: selectedPatient ? '#16a34a' : '#9ca3af',
              color: 'white', border: 'none', borderRadius: 8,
              fontWeight: 700, fontSize: 15,
              cursor: selectedPatient ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s',
            }}
          >
            {saving
              ? '⏳ Saving…'
              : selectedPatient
                ? `💾 Save Record for ${selectedPatient.first_name || selectedPatient.username}`
                : '💾 Save Encrypted Record'
            }
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Search Patient Records Component ──
function SearchPatientRecords() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)
  const [expandedPatient, setExpandedPatient] = useState(null)

  const handleSearch = async (e) => {
    e?.preventDefault()
    if (!query.trim() || query.trim().length < 2) {
      setError('Please enter at least 2 characters.')
      return
    }
    setError('')
    setSearching(true)
    setSearched(false)
    setResults([])
    setExpandedPatient(null)
    try {
      const res = await api.get(
        `/patients/search/?q=${encodeURIComponent(query.trim())}`
      )
      setResults(res.data.results || [])
      setSearched(true)
      if (res.data.results?.length === 1) setExpandedPatient(0)
    } catch (err) {
      setError(err.response?.data?.error || 'Search failed.')
      setSearched(true)
    } finally {
      setSearching(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input
          type="text"
          placeholder="Type patient name or ID number…"
          value={query}
          onChange={e => { setQuery(e.target.value); setError('') }}
          onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
          style={{
            flex: 1, padding: '10px 14px',
            border: '1.5px solid #e5e7eb', borderRadius: 8,
            fontSize: 14, color: '#000', fontWeight: 'bold',
            background: 'white', outline: 'none',
          }}
          onFocus={e => e.target.style.borderColor = '#16a34a'}
          onBlur={e => e.target.style.borderColor = '#e5e7eb'}
        />
        <button
          onClick={handleSearch}
          disabled={searching}
          className="btn-primary"
          style={{ padding: '10px 18px', whiteSpace: 'nowrap' }}
        >
          {searching ? '⏳' : '🔍 Search'}
        </button>
      </div>

      <p style={{
        fontSize: 12, color: '#9ca3af',
        fontWeight: 600, marginBottom: 12,
      }}>
        Search by first name, last name, username, or patient ID number
      </p>

      {error && <div className="alert-error">{error}</div>}

      {searched && results.length === 0 && !error && (
        <div style={{
          textAlign: 'center', padding: 24,
          color: '#9ca3af', fontSize: 13, fontWeight: 600,
          background: '#f9fafb', borderRadius: 8,
          border: '1px solid #e5e7eb',
        }}>
          No patient found matching <strong>"{query}"</strong>
        </div>
      )}

      {results.map((item, idx) => (
        <div key={item.patient.id} style={{
          border: '1px solid #e5e7eb', borderRadius: 10,
          marginBottom: 12, overflow: 'hidden',
        }}>
          <div
            onClick={() => setExpandedPatient(expandedPatient === idx ? null : idx)}
            style={{
              padding: '14px 16px',
              background: expandedPatient === idx ? '#f0fdf4' : 'white',
              cursor: 'pointer',
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: expandedPatient === idx
                ? '1px solid #e5e7eb' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: '#d1fae5', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 20,
              }}>👤</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#000' }}>
                  {item.patient.first_name} {item.patient.last_name}
                </div>
                <div style={{
                  fontSize: 12, color: '#6b7280', fontWeight: 600,
                }}>
                  @{item.patient.username}
                  {item.patient.patient_profile?.patient_id && (
                    <span style={{
                      marginLeft: 8, background: '#dcfce7',
                      color: '#166534', fontSize: 11, fontWeight: 700,
                      padding: '1px 8px', borderRadius: 999,
                    }}>
                      ID: {item.patient.patient_profile.patient_id}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{
                background: '#f0fdf4', color: '#16a34a',
                fontSize: 12, fontWeight: 700,
                padding: '3px 10px', borderRadius: 999,
                border: '1px solid #bbf7d0',
              }}>
                {item.total_records} record{item.total_records !== 1 ? 's' : ''}
              </span>
              <span style={{ color: '#9ca3af', fontSize: 18 }}>
                {expandedPatient === idx ? '▲' : '▼'}
              </span>
            </div>
          </div>

          {expandedPatient === idx && (
            <div style={{ padding: 16, background: 'white' }}>

              {/* Patient info grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: 12, marginBottom: 16,
                background: '#f9fafb', borderRadius: 8, padding: 14,
              }}>
                {[
                  ['Full Name', `${item.patient.first_name} ${item.patient.last_name}`],
                  ['Username', `@${item.patient.username}`],
                  ['Email', item.patient.email],
                  ['Patient ID', item.patient.patient_profile?.patient_id || '—'],
                  ['Date of Birth', item.patient.patient_profile?.date_of_birth || '—'],
                  ['Blood Type', item.patient.patient_profile?.blood_type || '—'],
                  ['Contact', item.patient.patient_profile?.contact_number || '—'],
                  ['Address', item.patient.patient_profile?.address || '—'],
                  ['Allergies', item.patient.patient_profile?.allergies || '—'],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div style={{
                      fontSize: 10, color: '#9ca3af',
                      fontWeight: 700, textTransform: 'uppercase',
                      marginBottom: 2,
                    }}>{label}</div>
                    <div style={{
                      fontSize: 13, color: '#000', fontWeight: 'bold',
                    }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* Records list */}
              <div style={{
                fontWeight: 700, fontSize: 14,
                color: '#111827', marginBottom: 10,
              }}>
                📋 Medical Records ({item.total_records})
              </div>

              {item.medical_records.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: 16,
                  color: '#9ca3af', fontSize: 13, fontWeight: 600,
                  background: '#f9fafb', borderRadius: 8,
                  border: '1px dashed #e5e7eb',
                }}>
                  No medical records yet.
                </div>
              ) : (
                item.medical_records.map(r => (
                  <div key={r.id} style={{
                    border: '1px solid #e5e7eb', borderRadius: 8,
                    padding: 14, marginBottom: 10, background: '#fafafa',
                  }}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', marginBottom: 8,
                    }}>
                      <span style={{
                        fontWeight: 700, fontSize: 14, color: '#000',
                      }}>
                        📄 {r.record_title}
                      </span>
                      <span style={{
                        fontSize: 11, color: '#9ca3af', fontWeight: 600,
                      }}>
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{
                      fontSize: 13, color: '#000', fontWeight: 'bold',
                      whiteSpace: 'pre-wrap', lineHeight: 1.7,
                      background: 'white', padding: 10,
                      borderRadius: 6, border: '1px solid #f0f0f0',
                    }}>
                      {r.data}
                    </div>
                    <div style={{
                      fontSize: 11, color: '#9ca3af',
                      marginTop: 8, fontWeight: 600,
                    }}>
                      Added by: {r.created_by_name}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Main Admin Dashboard ──
export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('Overview')
  const [showLogout, setShowLogout] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [stats, setStats] = useState({})
  const [users, setUsers] = useState([])
  const [appointments, setAppointments] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('')
  const [apptSearch, setApptSearch] = useState('')
  const [apptStatusFilter, setApptStatusFilter] = useState('')
  const [cancelTarget, setCancelTarget] = useState(null)
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [deactivateTarget, setDeactivateTarget] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [actionMsg, setActionMsg] = useState('')
  const [resetUserId, setResetUserId] = useState(null)
  const [resetUsername, setResetUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [resetMsg, setResetMsg] = useState('')
  const [resetError, setResetError] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  const handleWsNotif = useCallback((data) => {
    if (data.type === 'initial_notifications') setNotifications(data.notifications || [])
    else if (data.message) setNotifications(prev => [data, ...prev])
  }, [])
  useWebSocket(user?.user_id, handleWsNotif)

  const loadNotifications = useCallback(async () => {
    try { const r = await api.get('/notifications/'); setNotifications(r.data) } catch (_) {}
  }, [])
  const loadStats = useCallback(async () => {
    try { const r = await api.get('/appointments/stats/overview/'); setStats(r.data) } catch (_) {}
  }, [])
  const loadUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (userSearch) params.append('search', userSearch)
      if (userRoleFilter) params.append('role', userRoleFilter)
      const r = await api.get(`/users/?${params}`)
      setUsers(r.data)
    } catch (_) {}
  }, [userSearch, userRoleFilter])
  const loadAppointments = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (apptSearch) params.append('search', apptSearch)
      if (apptStatusFilter) params.append('status', apptStatusFilter)
      const r = await api.get(`/appointments/?${params}`)
      setAppointments(r.data)
    } catch (_) {}
  }, [apptSearch, apptStatusFilter])

  useEffect(() => {
    loadNotifications(); loadStats(); loadAppointments()
  }, [])
  useEffect(() => {
    if (tab === 'Users') loadUsers()
  }, [tab, userSearch, userRoleFilter])
  useEffect(() => {
    if (tab === 'Appointments' || tab === 'Overview') loadAppointments()
  }, [tab, apptSearch, apptStatusFilter])

  const confirmCancel = async () => {
    if (!cancelTarget) return
    try {
      await api.post(`/appointments/${cancelTarget}/cancel/`)
      setActionMsg('Appointment cancelled. Both patient and doctor have been notified.')
      loadAppointments(); loadStats()
    } catch (_) {}
    setCancelTarget(null)
  }

  const confirmConfirm = async () => {
    if (!confirmTarget) return
    try {
      await api.post(`/appointments/${confirmTarget}/confirm/`)
      setActionMsg('Appointment confirmed. Patient has been notified.')
      loadAppointments(); loadStats()
    } catch (err) {
      setActionMsg(err.response?.data?.error || 'Failed to confirm.')
    }
    setConfirmTarget(null)
  }

  const handleStatusChange = async (apptId, newStatus) => {
    try {
      await api.post(`/appointments/${apptId}/update-status/`, { status: newStatus })
      setActionMsg(`Status updated to "${newStatus}".`)
      loadAppointments(); loadStats()
    } catch (err) {
      setActionMsg(err.response?.data?.error || 'Failed to update status.')
    }
  }

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return
    try { await api.post(`/users/${deactivateTarget.id}/deactivate/`); loadUsers() } catch (_) {}
    setDeactivateTarget(null)
  }

  const restoreUser = async (id) => {
    try { await api.post(`/users/${id}/restore/`); loadUsers() } catch (_) {}
  }

  const openResetPassword = (u) => {
    setResetUserId(u.id); setResetUsername(u.username)
    setNewPassword(''); setResetMsg(''); setResetError('')
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setResetMsg(''); setResetError(''); setResetLoading(true)
    try {
      const res = await api.post(`/users/${resetUserId}/reset-password/`, {
        new_password: newPassword,
      })
      setResetMsg(res.data.message); setNewPassword('')
    } catch (err) {
      setResetError(err.response?.data?.error || 'Failed to reset password.')
    } finally { setResetLoading(false) }
  }

  const handleLogout = async () => {
    await logout(); navigate('/login', { replace: true })
  }

  const statusBadge = (s) => {
    const colors = {
      pending: 'badge-pending', confirmed: 'badge-confirmed',
      cancelled: 'badge-cancelled', completed: 'badge-completed',
    }
    return <span className={`badge ${colors[s] || 'badge-pending'}`}>{s}</span>
  }

  const bold = { color: '#000', fontWeight: 'bold' }

  const AppointmentActions = ({ a }) => (
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
      {a.status === 'pending' && (
        <button className="btn-primary"
          style={{ padding: '3px 10px', fontSize: 12, background: '#16a34a' }}
          onClick={() => setConfirmTarget(a.id)}>
          ✓ Confirm
        </button>
      )}
      {(a.status === 'pending' || a.status === 'confirmed') && (
        <button className="btn-danger"
          style={{ padding: '3px 10px', fontSize: 12 }}
          onClick={() => setCancelTarget(a.id)}>
          ✕ Cancel
        </button>
      )}
      <select value={a.status}
        onChange={e => handleStatusChange(a.id, e.target.value)}
        style={{
          fontSize: 12, padding: '3px 6px',
          border: '1px solid #e5e7eb', borderRadius: 6,
          color: '#000', fontWeight: 'bold',
          background: 'white', cursor: 'pointer',
        }}>
        <option value="pending">Pending</option>
        <option value="confirmed">Confirmed</option>
        <option value="cancelled">Cancelled</option>
        <option value="completed">Completed</option>
      </select>
    </div>
  )

  const sidebarItems = [
    { label: 'Overview', icon: '📊' },
    { label: 'Users', icon: '👥' },
    { label: 'Appointments', icon: '📅' },
    { label: 'Records', icon: '📋' },
    { label: 'Messages', icon: '💬' },
  ]

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">🏥 Admin Panel<br />
          <span style={{ fontSize: 12, opacity: 0.75, fontWeight: 400 }}>
            {user?.full_name || user?.username}
          </span>
        </div>
        <nav className="sidebar-nav">
          {sidebarItems.map(item => (
            <a key={item.label} href="#"
              className={tab === item.label ? 'active' : ''}
              onClick={e => { e.preventDefault(); setTab(item.label) }}>
              {item.icon} {item.label}
            </a>
          ))}
        </nav>
        <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
          <button onClick={() => setShowLogout(true)}
            style={{
              background: 'rgba(255,255,255,0.1)', color: 'white',
              border: 'none', borderRadius: 8, padding: '10px 16px',
              width: '100%', fontWeight: 700, fontSize: 14,
              cursor: 'pointer', textAlign: 'left',
            }}>
            🚪 Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 24,
          flexWrap: 'wrap', gap: 12,
        }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827' }}>
            {tab === 'Overview' ? 'Admin Dashboard' : tab}
          </h1>
          <NotificationBell notifications={notifications} onMarkRead={loadNotifications} />
        </div>

        {actionMsg && (
          <div className="alert-success" style={{ marginBottom: 16 }}>
            {actionMsg}
            <button onClick={() => setActionMsg('')}
              style={{
                float: 'right', background: 'none', border: 'none',
                cursor: 'pointer', fontWeight: 700, color: '#065f46',
              }}>✕</button>
          </div>
        )}

        {/* OVERVIEW */}
        {tab === 'Overview' && (
          <>
            <div className="stats-grid">
              {[
                ['Total Patients', stats.total_patients, '#16a34a'],
                ['Total Doctors', stats.total_doctors, '#16a34a'],
                ['Total Appointments', stats.total_appointments, '#16a34a'],
                ['Pending', stats.pending, '#f59e0b'],
                ['Confirmed', stats.confirmed, '#16a34a'],
                ['Cancelled', stats.cancelled, '#dc2626'],
              ].map(([label, val, color]) => (
                <div className="stat-card" key={label}>
                  <div className="stat-number" style={{ color }}>{val ?? '—'}</div>
                  <div className="stat-label">{label}</div>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="card-title">📅 Recent Appointments</div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Patient</th><th>Doctor</th>
                      <th>Date</th><th>Time</th>
                      <th>Status</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.slice(0, 10).map(a => (
                      <tr key={a.id}>
                        <td style={bold}>{a.patient_name}</td>
                        <td style={bold}>Dr. {a.doctor_name}</td>
                        <td style={bold}>{a.date}</td>
                        <td style={bold}>{a.time}</td>
                        <td>{statusBadge(a.status)}</td>
                        <td><AppointmentActions a={a} /></td>
                      </tr>
                    ))}
                    {appointments.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af' }}>
                          No appointments
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* USERS */}
        {tab === 'Users' && (
          <div className="card">
            <div className="card-title">👥 Manage Users</div>
            <div className="search-bar">
              <input type="text" placeholder="Search users…"
                value={userSearch} style={bold}
                onChange={e => setUserSearch(e.target.value)} />
              <select value={userRoleFilter}
                style={{ ...bold, maxWidth: 160 }}
                onChange={e => setUserRoleFilter(e.target.value)}>
                <option value="">All Roles</option>
                <option value="patient">Patients</option>
                <option value="doctor">Doctors</option>
                <option value="admin">Admins</option>
              </select>
              <button className="btn-primary" onClick={loadUsers}>Search</button>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: selectedUser ? '1fr 320px' : '1fr',
              gap: 20,
            }}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Username</th><th>Full Name</th>
                      <th>Role</th><th>Status</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td style={{ ...bold, cursor: 'pointer', color: '#16a34a' }}
                          onClick={() => setSelectedUser(u)}>
                          {u.username}
                        </td>
                        <td style={bold}>{u.first_name} {u.last_name}</td>
                        <td>
                          <span className={`badge ${
                            u.role === 'doctor' ? 'badge-confirmed' :
                            u.role === 'admin' ? 'badge-completed' : 'badge-pending'
                          }`}>{u.role}</span>
                        </td>
                        <td>
                          <span className={`badge ${
                            u.is_active ? 'badge-active' : 'badge-inactive'
                          }`}>
                            {u.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {u.is_active ? (
                            <button className="btn-danger"
                              style={{ padding: '4px 10px', fontSize: 12 }}
                              onClick={() => setDeactivateTarget(u)}>
                              Deactivate
                            </button>
                          ) : (
                            <button className="btn-outline"
                              style={{ padding: '4px 10px', fontSize: 12 }}
                              onClick={() => restoreUser(u.id)}>
                              Restore
                            </button>
                          )}
                          <button
                            style={{
                              padding: '4px 10px', fontSize: 12,
                              background: '#fef3c7', color: '#92400e',
                              border: '1px solid #fcd34d', borderRadius: 6,
                              cursor: 'pointer', fontWeight: 700,
                            }}
                            onClick={() => openResetPassword(u)}>
                            🔑 Reset PW
                          </button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: '#9ca3af' }}>
                          No users found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {selectedUser && (
                <div style={{
                  border: '1px solid #e5e7eb', borderRadius: 10,
                  padding: 20, background: '#fafafa',
                }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', marginBottom: 16,
                  }}>
                    <span style={{ fontWeight: 700, fontSize: 16, color: '#000' }}>
                      User Detail
                    </span>
                    <button onClick={() => setSelectedUser(null)}
                      style={{
                        background: 'none', border: 'none',
                        fontSize: 18, cursor: 'pointer', color: '#6b7280',
                      }}>✕</button>
                  </div>
                  {[
                    ['Username', selectedUser.username],
                    ['Full Name', `${selectedUser.first_name} ${selectedUser.last_name}`],
                    ['Email', selectedUser.email],
                    ['Role', selectedUser.role],
                    ['Status', selectedUser.is_active ? 'Active' : 'Inactive'],
                    selectedUser.specialization && ['Specialization', selectedUser.specialization],
                    selectedUser.patient_profile?.patient_id && ['Patient ID', selectedUser.patient_profile.patient_id],
                  ].filter(Boolean).map(([label, val]) => (
                    <div key={label} style={{ marginBottom: 10 }}>
                      <div style={{
                        fontSize: 11, color: '#6b7280',
                        fontWeight: 700, textTransform: 'uppercase',
                      }}>{label}</div>
                      <div style={{
                        fontSize: 14, color: '#000',
                        fontWeight: 'bold', marginTop: 2,
                      }}>{val}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* APPOINTMENTS */}
        {tab === 'Appointments' && (
          <div className="card">
            <div className="card-title">📅 All Appointments</div>
            <div className="search-bar">
              <input type="text" placeholder="Search by patient or doctor…"
                value={apptSearch} style={bold}
                onChange={e => setApptSearch(e.target.value)} />
              <select value={apptStatusFilter}
                style={{ ...bold, maxWidth: 160 }}
                onChange={e => setApptStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
              <button className="btn-primary" onClick={loadAppointments}>Search</button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Patient</th><th>Doctor</th>
                    <th>Date</th><th>Time</th>
                    <th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map(a => (
                    <tr key={a.id}>
                      <td style={bold}>{a.patient_name}</td>
                      <td style={bold}>Dr. {a.doctor_name}</td>
                      <td style={bold}>{a.date}</td>
                      <td style={bold}>{a.time}</td>
                      <td>{statusBadge(a.status)}</td>
                      <td><AppointmentActions a={a} /></td>
                    </tr>
                  ))}
                  {appointments.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af' }}>
                        No appointments found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* RECORDS */}
        {tab === 'Records' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 20,
          }}>
            <div className="card">
              <div className="card-title">🔍 Search Patient Records</div>
              <SearchPatientRecords />
            </div>
            <div className="card">
              <div className="card-title">➕ Add Medical Record</div>
              <AddMedicalRecord />
            </div>
          </div>
        )}

        {/* MESSAGES */}
        {tab === 'Messages' && (
          <MessagingPanel currentUserId={user?.user_id} />
        )}
      </main>

      {/* MODALS */}
      {showLogout && (
        <LogoutModal onConfirm={handleLogout} onCancel={() => setShowLogout(false)} />
      )}
      {cancelTarget && (
        <ConfirmModal title="Cancel Appointment"
          message="Cancel this appointment? Both patient and doctor will be notified."
          onConfirm={confirmCancel} onCancel={() => setCancelTarget(null)} />
      )}
      {confirmTarget && (
        <ConfirmModal title="Confirm Appointment"
          message="Confirm this appointment? The patient will be notified."
          onConfirm={confirmConfirm} onCancel={() => setConfirmTarget(null)}
          danger={false} />
      )}
      {deactivateTarget && (
        <ConfirmModal title="Deactivate User"
          message={`Deactivate "${deactivateTarget.username}"? They cannot log in.`}
          onConfirm={confirmDeactivate} onCancel={() => setDeactivateTarget(null)} />
      )}

      {resetUserId && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>🔑 Reset Password</h2>
            <p>Set a new password for <strong>{resetUsername}</strong>.</p>
            {resetMsg && <div className="alert-success">{resetMsg}</div>}
            {resetError && <div className="alert-error">{resetError}</div>}
            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label>New Password (min 6 characters)</label>
                <input type="password" placeholder="Enter new password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required minLength={6}
                  style={{ color: '#000', fontWeight: 'bold' }} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary"
                  onClick={() => {
                    setResetUserId(null)
                    setResetMsg('')
                    setResetError('')
                  }}>
                  Close
                </button>
                <button type="submit" className="btn-primary" disabled={resetLoading}>
                  {resetLoading ? 'Resetting…' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}