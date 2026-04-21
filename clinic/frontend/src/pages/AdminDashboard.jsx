import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useWebSocket } from '../hooks/useWebSocket'
import api from '../api/axios'
import LogoutModal from '../components/LogoutModal'
import ConfirmModal from '../components/ConfirmModal'
import NotificationBell from '../components/NotificationBell'
import MessagingPanel from '../components/MessagingPanel'

// ── Debounce hook ──
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ── Admin Records — Search Only (Read-Only) ──
function AdminRecordsTab() {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [searchError, setSearchError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [records, setRecords] = useState([])
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)

  const debouncedQuery = useDebounce(query, 500)

  // Auto search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.trim().length < 2) {
      setSearchResults([])
      setSearchError('')
      setHasSearched(false)
      return
    }
    if (selectedPatient) return
    doSearch(debouncedQuery.trim())
  }, [debouncedQuery])

  const doSearch = async (q) => {
    setSearching(true)
    setSearchResults([])
    setSearchError('')
    setHasSearched(false)
    try {
      const res = await api.get(
        `/patients/search/?q=${encodeURIComponent(q)}`
      )
      const results = res.data.results || []
      setSearchResults(results)
      setHasSearched(true)
      if (results.length === 0) {
        setSearchError(
          `No patient found matching "${q}". Make sure the name is spelled correctly.`
        )
      }
    } catch (err) {
      setHasSearched(true)
      setSearchError(
        err.response?.data?.error ||
        'Search failed. Please check your connection and try again.'
      )
    } finally {
      setSearching(false)
    }
  }

  const handleManualSearch = () => {
    const q = query.trim()
    if (!q || q.length < 2) {
      setSearchError('Please type at least 2 characters.')
      return
    }
    setSelectedPatient(null)
    setRecords([])
    doSearch(q)
  }

  const selectPatient = async (item) => {
    setSelectedPatient(item.patient)
    setSearchResults([])
    setQuery(
      item.patient.first_name
        ? `${item.patient.first_name} ${item.patient.last_name}`.trim()
        : item.patient.username
    )
    setSearchError('')
    setCurrentPage(1)
    loadPatientRecords(item.patient.id, 1)
  }

  const loadPatientRecords = async (patientUserId, page = 1) => {
    setLoadingRecords(true)
    setRecords([])
    try {
      const res = await api.get(
        `/records/?patient_user_id=${patientUserId}&page=${page}`
      )
      setRecords(res.data.results || [])
      setTotalPages(res.data.total_pages || 1)
      setTotalRecords(res.data.count || 0)
      setCurrentPage(page)
    } catch (_) {
      setRecords([])
    } finally {
      setLoadingRecords(false)
    }
  }

  const clearSelection = () => {
    setSelectedPatient(null)
    setQuery('')
    setRecords([])
    setSearchResults([])
    setSearchError('')
    setHasSearched(false)
  }

  return (
    <div>
      {/* Admin read-only notice */}
      <div style={{
        background: '#fef3c7',
        border: '1px solid #fcd34d',
        borderRadius: 8,
        padding: '10px 16px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 13,
        fontWeight: 700,
        color: '#92400e',
      }}>
        <span style={{ fontSize: 16 }}>🛡️</span>
        Admin View — Read Only. Search a patient by name to view their records.
      </div>

      {/* Search section */}
      <div className="card">
        <div className="card-title">🔍 Search Patient Records</div>

        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                placeholder="Type patient name e.g. Jane, Juan Dela Cruz…"
                value={query}
                onChange={e => {
                  setQuery(e.target.value)
                  setSearchError('')
                  if (selectedPatient) {
                    setSelectedPatient(null)
                    setRecords([])
                  }
                }}
                onKeyDown={e => { if (e.key === 'Enter') handleManualSearch() }}
                style={{
                  width: '100%', padding: '11px 14px',
                  border: '1.5px solid #e5e7eb', borderRadius: 8,
                  fontSize: 14, color: '#000', fontWeight: 'bold',
                  background: 'white', outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#16a34a'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
              {/* Indicators */}
              {searching && (
                <span style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 12, color: '#9ca3af', fontWeight: 600,
                }}>
                  Searching…
                </span>
              )}
              {query && query !== debouncedQuery && !searching && (
                <span style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 11, color: '#9ca3af', fontWeight: 600,
                }}>
                  typing…
                </span>
              )}
            </div>
            <button
              onClick={handleManualSearch}
              disabled={searching}
              className="btn-primary"
              style={{ padding: '10px 20px', whiteSpace: 'nowrap' }}
            >
              {searching ? '⏳' : '🔍 Search'}
            </button>
          </div>

          <p style={{
            fontSize: 11, color: '#9ca3af', fontWeight: 600, marginTop: 6,
          }}>
            Auto-searches after you stop typing (500ms) •
            Search by first name, last name, username, or patient ID
          </p>

          {/* Error message */}
          {searchError && !selectedPatient && (
            <div style={{
              marginTop: 10, padding: '10px 14px',
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 8, fontSize: 13, color: '#dc2626', fontWeight: 700,
            }}>
              ⚠️ {searchError}
            </div>
          )}

          {/* Search results dropdown */}
          {searchResults.length > 0 && !selectedPatient && (
            <div style={{
              position: 'absolute', left: 0, right: 100,
              top: 52, zIndex: 200,
              border: '1px solid #e5e7eb', borderRadius: 10,
              overflow: 'hidden',
              boxShadow: '0 8px 28px rgba(0,0,0,0.12)',
              background: 'white',
            }}>
              {/* Results header */}
              <div style={{
                padding: '8px 14px',
                background: '#f0fdf4',
                borderBottom: '1px solid #e5e7eb',
                fontSize: 11, color: '#16a34a', fontWeight: 700,
              }}>
                {searchResults.length} patient{searchResults.length !== 1 ? 's' : ''} found
                — click a name to view their records
              </div>

              {searchResults.map(item => (
                <div
                  key={item.patient.id}
                  onClick={() => selectPatient(item)}
                  style={{
                    padding: '13px 16px',
                    borderBottom: '1px solid #f3f4f6',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: 'white', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%',
                    background: '#d1fae5',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 20, flexShrink: 0,
                  }}>👤</div>

                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#000' }}>
                      {item.patient.first_name} {item.patient.last_name}
                    </div>
                    <div style={{
                      fontSize: 12, color: '#6b7280', fontWeight: 600, marginTop: 2,
                    }}>
                      @{item.patient.username}
                      {item.patient.email && (
                        <span style={{ marginLeft: 8 }}>• {item.patient.email}</span>
                      )}
                      {item.patient.patient_profile?.patient_id && (
                        <span style={{
                          marginLeft: 8, background: '#dcfce7', color: '#166534',
                          fontSize: 11, fontWeight: 700,
                          padding: '1px 8px', borderRadius: 999,
                        }}>
                          ID: {item.patient.patient_profile.patient_id}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Record count + select */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{
                      background: '#f0fdf4', color: '#16a34a',
                      fontSize: 11, fontWeight: 700,
                      padding: '2px 10px', borderRadius: 999,
                      border: '1px solid #bbf7d0',
                    }}>
                      {item.total_records} record{item.total_records !== 1 ? 's' : ''}
                    </span>
                    <span style={{
                      fontSize: 11, color: '#16a34a', fontWeight: 700,
                    }}>
                      View Records →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected patient confirmation */}
        {selectedPatient && (
          <div style={{
            marginTop: 14, padding: '12px 16px',
            background: '#d1fae5', borderRadius: 10,
            border: '1.5px solid #16a34a',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: '#16a34a',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 20,
              }}>👤</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#000' }}>
                  {selectedPatient.first_name} {selectedPatient.last_name}
                </div>
                <div style={{ fontSize: 12, color: '#065f46', fontWeight: 600 }}>
                  @{selectedPatient.username}
                  {selectedPatient.patient_profile?.patient_id && (
                    <span style={{ marginLeft: 8 }}>
                      • Patient ID: {selectedPatient.patient_profile.patient_id}
                    </span>
                  )}
                  {selectedPatient.email && (
                    <span style={{ marginLeft: 8 }}>• {selectedPatient.email}</span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={clearSelection}
              style={{
                background: 'rgba(0,0,0,0.08)', border: 'none',
                borderRadius: 8, padding: '6px 12px',
                cursor: 'pointer', color: '#065f46',
                fontWeight: 700, fontSize: 13,
              }}
            >
              ✕ Clear
            </button>
          </div>
        )}
      </div>

      {/* Default empty state — no patient selected yet */}
      {!selectedPatient && !hasSearched && (
        <div style={{
          textAlign: 'center', padding: '40px 20px',
          color: '#9ca3af', fontSize: 14, fontWeight: 600,
          background: 'white', borderRadius: 10,
          border: '1px solid #e5e7eb', marginTop: 16,
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
            Search for a patient to view their records
          </div>
          <div style={{ fontSize: 13 }}>
            Type a patient name in the search box above.
            <br />Records will appear here after you select a patient.
          </div>
        </div>
      )}

      {/* Patient records */}
      {selectedPatient && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 16,
          }}>
            <div className="card-title" style={{ marginBottom: 0 }}>
              📋 Medical Records — {selectedPatient.first_name} {selectedPatient.last_name}
              <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginLeft: 8 }}>
                ({totalRecords} total)
              </span>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 700,
              padding: '4px 12px', borderRadius: 999,
              background: '#fef3c7', color: '#92400e',
              border: '1px solid #fcd34d',
            }}>
              🛡️ View Only
            </span>
          </div>

          {/* Patient info grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12, marginBottom: 20,
            background: '#f9fafb', borderRadius: 8, padding: 14,
            border: '1px solid #e5e7eb',
          }}>
            {[
              ['Full Name', `${selectedPatient.first_name} ${selectedPatient.last_name}`],
              ['Username', `@${selectedPatient.username}`],
              ['Email', selectedPatient.email || '—'],
              ['Patient ID', selectedPatient.patient_profile?.patient_id || '—'],
              ['Date of Birth', selectedPatient.patient_profile?.date_of_birth || '—'],
              ['Blood Type', selectedPatient.patient_profile?.blood_type || '—'],
              ['Contact', selectedPatient.patient_profile?.contact_number || '—'],
              ['Address', selectedPatient.patient_profile?.address || '—'],
              ['Allergies', selectedPatient.patient_profile?.allergies || '—'],
            ].map(([label, val]) => (
              <div key={label}>
                <div style={{
                  fontSize: 9, color: '#9ca3af', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3,
                }}>{label}</div>
                <div style={{ fontSize: 13, color: '#000', fontWeight: 'bold' }}>
                  {val}
                </div>
              </div>
            ))}
          </div>

          {/* Records list */}
          {loadingRecords ? (
            <div style={{
              textAlign: 'center', padding: 24,
              color: '#9ca3af', fontSize: 13, fontWeight: 600,
            }}>
              ⏳ Loading records…
            </div>
          ) : records.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: 24,
              color: '#9ca3af', fontSize: 13, fontWeight: 600,
              background: '#f9fafb', borderRadius: 8,
              border: '1px dashed #e5e7eb',
            }}>
              No medical records found for this patient.
            </div>
          ) : (
            <>
              {records.map(r => (
                <div key={r.id} style={{
                  border: '1px solid #e5e7eb', borderRadius: 10,
                  padding: 16, marginBottom: 12, background: '#fafafa',
                }}>
                  {/* Record header */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'flex-start', marginBottom: 12,
                    paddingBottom: 10,
                    borderBottom: '1px solid #f0f0f0',
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#000' }}>
                        📄 {r.record_title}
                      </div>
                      <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, marginTop: 2 }}>
                        Added by: {r.created_by_name}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11, color: '#9ca3af', fontWeight: 600,
                      background: '#f3f4f6', padding: '3px 10px', borderRadius: 999,
                    }}>
                      {new Date(r.created_at).toLocaleDateString('en-PH', {
                        year: 'numeric', month: 'long', day: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Diagnosis */}
                  {r.diagnosis && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{
                        fontSize: 10, color: '#16a34a', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
                      }}>Diagnosis</div>
                      <div style={{
                        fontSize: 13, color: '#000', fontWeight: 'bold',
                        whiteSpace: 'pre-wrap', lineHeight: 1.7,
                        background: 'white', padding: 10,
                        borderRadius: 6, border: '1px solid #e5e7eb',
                      }}>
                        {r.diagnosis}
                      </div>
                    </div>
                  )}

                  {/* Prescription */}
                  {r.prescription && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{
                        fontSize: 10, color: '#2563eb', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
                      }}>Prescription</div>
                      <div style={{
                        fontSize: 13, color: '#000', fontWeight: 'bold',
                        whiteSpace: 'pre-wrap', lineHeight: 1.7,
                        background: 'white', padding: 10,
                        borderRadius: 6, border: '1px solid #e5e7eb',
                      }}>
                        {r.prescription}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {r.notes && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{
                        fontSize: 10, color: '#9ca3af', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
                      }}>Notes</div>
                      <div style={{
                        fontSize: 13, color: '#000', fontWeight: 'bold',
                        whiteSpace: 'pre-wrap', lineHeight: 1.7,
                        background: 'white', padding: 10,
                        borderRadius: 6, border: '1px solid #e5e7eb',
                      }}>
                        {r.notes}
                      </div>
                    </div>
                  )}

                  {/* Legacy data field */}
                  {!r.diagnosis && r.data && (
                    <div>
                      <div style={{
                        fontSize: 10, color: '#9ca3af', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
                      }}>Record Data</div>
                      <div style={{
                        fontSize: 13, color: '#000', fontWeight: 'bold',
                        whiteSpace: 'pre-wrap', lineHeight: 1.7,
                        background: 'white', padding: 10,
                        borderRadius: 6, border: '1px solid #e5e7eb',
                      }}>
                        {r.data}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 12, marginTop: 16,
                }}>
                  <button
                    onClick={() => loadPatientRecords(selectedPatient.id, currentPage - 1)}
                    disabled={currentPage === 1}
                    className="btn-secondary"
                    style={{ padding: '7px 16px', fontSize: 13 }}
                  >
                    ← Previous
                  </button>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => loadPatientRecords(selectedPatient.id, currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="btn-secondary"
                    style={{ padding: '7px 16px', fontSize: 13 }}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
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

  const debouncedUserSearch = useDebounce(userSearch, 400)
  const debouncedApptSearch = useDebounce(apptSearch, 400)

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
      if (debouncedUserSearch) params.append('search', debouncedUserSearch)
      if (userRoleFilter) params.append('role', userRoleFilter)
      const r = await api.get(`/users/?${params}`)
      setUsers(r.data)
    } catch (_) {}
  }, [debouncedUserSearch, userRoleFilter])
  const loadAppointments = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (debouncedApptSearch) params.append('search', debouncedApptSearch)
      if (apptStatusFilter) params.append('status', apptStatusFilter)
      const r = await api.get(`/appointments/?${params}`)
      setAppointments(r.data)
    } catch (_) {}
  }, [debouncedApptSearch, apptStatusFilter])

  useEffect(() => {
    loadNotifications(); loadStats(); loadAppointments()
  }, [])
  useEffect(() => {
    if (tab === 'Users') loadUsers()
  }, [tab, debouncedUserSearch, userRoleFilter])
  useEffect(() => {
    if (tab === 'Appointments' || tab === 'Overview') loadAppointments()
  }, [tab, debouncedApptSearch, apptStatusFilter])

  const confirmCancel = async () => {
    if (!cancelTarget) return
    try {
      await api.post(`/appointments/${cancelTarget}/cancel/`)
      setActionMsg('Appointment cancelled. Both patient and doctor notified.')
      loadAppointments(); loadStats()
    } catch (_) {}
    setCancelTarget(null)
  }

  const confirmConfirm = async () => {
    if (!confirmTarget) return
    try {
      await api.post(`/appointments/${confirmTarget}/confirm/`)
      setActionMsg('Appointment confirmed. Patient notified.')
      loadAppointments(); loadStats()
    } catch (err) {
      setActionMsg(err.response?.data?.error || 'Failed.')
    }
    setConfirmTarget(null)
  }

  const handleStatusChange = async (apptId, newStatus) => {
    try {
      await api.post(`/appointments/${apptId}/update-status/`, { status: newStatus })
      setActionMsg(`Status updated to "${newStatus}".`)
      loadAppointments(); loadStats()
    } catch (err) {
      setActionMsg(err.response?.data?.error || 'Failed.')
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
      setResetError(err.response?.data?.error || 'Failed.')
    } finally { setResetLoading(false) }
  }

  const handleLogout = async () => {
    await logout(); navigate('/login', { replace: true })
  }

  const statusBadge = (s) => {
    const map = {
      pending: 'badge-pending', confirmed: 'badge-confirmed',
      cancelled: 'badge-cancelled', completed: 'badge-completed',
    }
    return <span className={`badge ${map[s] || 'badge-pending'}`}>{s}</span>
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
          alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12,
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
              style={{ float: 'right', background: 'none', border: 'none',
                cursor: 'pointer', fontWeight: 700, color: '#065f46' }}>✕</button>
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
              <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
                <input type="text" placeholder="Search users…"
                  value={userSearch} style={{ ...bold, width: '100%' }}
                  onChange={e => setUserSearch(e.target.value)} />
                {userSearch && userSearch !== debouncedUserSearch && (
                  <span style={{
                    position: 'absolute', right: 10, top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 11, color: '#9ca3af', fontWeight: 600,
                  }}>typing…</span>
                )}
              </div>
              <select value={userRoleFilter} style={{ ...bold, maxWidth: 160 }}
                onChange={e => setUserRoleFilter(e.target.value)}>
                <option value="">All Roles</option>
                <option value="patient">Patients</option>
                <option value="doctor">Doctors</option>
                <option value="admin">Admins</option>
              </select>
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
              <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
                <input type="text" placeholder="Search by patient or doctor…"
                  value={apptSearch} style={{ ...bold, width: '100%' }}
                  onChange={e => setApptSearch(e.target.value)} />
                {apptSearch && apptSearch !== debouncedApptSearch && (
                  <span style={{
                    position: 'absolute', right: 10, top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 11, color: '#9ca3af', fontWeight: 600,
                  }}>typing…</span>
                )}
              </div>
              <select value={apptStatusFilter} style={{ ...bold, maxWidth: 160 }}
                onChange={e => setApptStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
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

        {/* RECORDS — Read only, search only */}
        {tab === 'Records' && <AdminRecordsTab />}

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
                  }}>Close</button>
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