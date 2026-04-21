import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useWebSocket } from '../hooks/useWebSocket'
import api from '../api/axios'
import LogoutModal from '../components/LogoutModal'
import ConfirmModal from '../components/ConfirmModal'
import NotificationBell from '../components/NotificationBell'
import MessagingPanel from '../components/MessagingPanel'

// Debounce hook
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ── Records Tab Component ──
function RecordsTab({ doctorId }) {
  const [nameQuery, setNameQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [records, setRecords] = useState([])
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)

  // Create form
  const [showForm, setShowForm] = useState(false)
  const [diagnosis, setDiagnosis] = useState('')
  const [notes, setNotes] = useState('')
  const [prescription, setPrescription] = useState('')
  const [recordTitle, setRecordTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState('')
  const [saveError, setSaveError] = useState('')

  const debouncedQuery = useDebounce(nameQuery, 500)

  // Auto search with debounce
  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.trim().length < 2) {
      setSearchResults([])
      setSearchError('')
      return
    }
    if (selectedPatient) return
    doSearch(debouncedQuery.trim())
  }, [debouncedQuery])

  const doSearch = async (q) => {
    setSearching(true)
    setSearchResults([])
    setSearchError('')
    try {
      const res = await api.get(
        `/patients/search/?q=${encodeURIComponent(q)}`
      )
      const results = res.data.results || []
      setSearchResults(results)
      if (results.length === 0) {
        setSearchError(`No patients found matching "${q}".`)
      }
    } catch (err) {
      setSearchError('Search failed. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  const selectPatient = async (item) => {
    setSelectedPatient(item.patient)
    setSearchResults([])
    setNameQuery(
      item.patient.first_name
        ? `${item.patient.first_name} ${item.patient.last_name}`.trim()
        : item.patient.username
    )
    setSearchError('')
    setCurrentPage(1)
    loadRecords(item.patient.id, 1)
  }

  const loadRecords = async (patientId, page = 1) => {
    setLoadingRecords(true)
    try {
      const res = await api.get(
        `/records/?patient_id=${patientId}&page=${page}`
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

  const handleSaveRecord = async (e) => {
    e.preventDefault()
    if (!selectedPatient) return
    setSaving(true)
    setSaveSuccess('')
    setSaveError('')
    try {
      await api.post('/records/create/', {
        patient: selectedPatient.id,
        record_title: recordTitle.trim() || 'Medical Record',
        diagnosis: diagnosis.trim(),
        notes: notes.trim(),
        prescription: prescription.trim(),
      })
      const name = selectedPatient.first_name
        ? `${selectedPatient.first_name} ${selectedPatient.last_name}`.trim()
        : selectedPatient.username
      setSaveSuccess(`✅ Record saved for ${name}. Patient has been notified.`)
      setDiagnosis('')
      setNotes('')
      setPrescription('')
      setRecordTitle('')
      setShowForm(false)
      loadRecords(selectedPatient.id, 1)
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

  const clearSelection = () => {
    setSelectedPatient(null)
    setNameQuery('')
    setRecords([])
    setShowForm(false)
    setSaveSuccess('')
    setSaveError('')
    setSearchError('')
  }

  const inp = {
    width: '100%', padding: '10px 14px',
    border: '1.5px solid #e5e7eb', borderRadius: 8,
    fontSize: 14, color: '#000', fontWeight: 'bold', background: 'white',
  }

  return (
    <div>
      {/* Search section */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">🔍 Search Patient</div>

        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                style={inp}
                type="text"
                placeholder="Type patient name e.g. Jane, Juan…"
                value={nameQuery}
                onChange={e => {
                  setNameQuery(e.target.value)
                  setSearchError('')
                  if (selectedPatient) clearSelection()
                }}
                onFocus={e => e.target.style.borderColor = '#16a34a'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
              {searching && (
                <span style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 12, color: '#9ca3af', fontWeight: 600,
                }}>
                  Searching…
                </span>
              )}
              {nameQuery && nameQuery !== debouncedQuery && !searching && (
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
              onClick={() => doSearch(nameQuery.trim())}
              disabled={searching}
              className="btn-primary"
              style={{ padding: '10px 18px', whiteSpace: 'nowrap' }}
            >
              {searching ? '⏳' : '🔍 Search'}
            </button>
          </div>

          <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, marginTop: 5 }}>
            Auto-searches after you stop typing (500ms debounce)
          </p>

          {searchError && !selectedPatient && (
            <div style={{
              marginTop: 8, fontSize: 13, color: '#dc2626', fontWeight: 700,
            }}>
              {searchError}
            </div>
          )}

          {/* Dropdown results */}
          {searchResults.length > 0 && (
            <div style={{
              position: 'absolute', left: 0, right: 90,
              top: '100%', zIndex: 100,
              border: '1px solid #e5e7eb', borderRadius: 8,
              overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              background: 'white', marginTop: 4,
            }}>
              <div style={{
                padding: '7px 14px', background: '#f0fdf4',
                borderBottom: '1px solid #e5e7eb',
                fontSize: 11, color: '#16a34a', fontWeight: 700,
              }}>
                {searchResults.length} patient{searchResults.length !== 1 ? 's' : ''} found
              </div>
              {searchResults.map(item => (
                <div
                  key={item.patient.id}
                  onClick={() => selectPatient(item)}
                  style={{
                    padding: '11px 14px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10,
                    borderBottom: '1px solid #f3f4f6',
                    background: 'white', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: '#d1fae5', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: 16,
                  }}>👤</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#000' }}>
                      {item.patient.first_name} {item.patient.last_name}
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>
                      @{item.patient.username}
                      {item.patient.patient_profile?.patient_id && (
                        <span style={{
                          marginLeft: 6, background: '#dcfce7',
                          color: '#166534', fontSize: 10,
                          fontWeight: 700, padding: '1px 6px', borderRadius: 999,
                        }}>
                          ID: {item.patient.patient_profile.patient_id}
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, color: '#16a34a', fontWeight: 700,
                    padding: '2px 8px', background: '#f0fdf4',
                    borderRadius: 999, border: '1px solid #bbf7d0',
                  }}>
                    Select ✓
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected patient */}
        {selectedPatient && (
          <div style={{
            marginTop: 12, padding: '10px 14px',
            background: '#d1fae5', borderRadius: 8,
            border: '1.5px solid #16a34a',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>✅</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#000' }}>
                  {selectedPatient.first_name} {selectedPatient.last_name}
                </div>
                <div style={{ fontSize: 12, color: '#065f46', fontWeight: 600 }}>
                  @{selectedPatient.username}
                  {selectedPatient.patient_profile?.patient_id && (
                    <span style={{ marginLeft: 6 }}>
                      • ID: {selectedPatient.patient_profile.patient_id}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={clearSelection}
              style={{
                background: 'none', border: 'none',
                cursor: 'pointer', color: '#065f46', fontSize: 18,
              }}
            >✕</button>
          </div>
        )}
      </div>

      {/* Records section — only shown after patient selected */}
      {selectedPatient && (
        <>
          {saveSuccess && (
            <div className="alert-success" style={{ marginBottom: 12 }}>
              {saveSuccess}
              <button onClick={() => setSaveSuccess('')}
                style={{ float: 'right', background: 'none', border: 'none',
                  cursor: 'pointer', fontWeight: 700, color: '#065f46' }}>✕</button>
            </div>
          )}

          <div className="card">
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 16,
            }}>
              <div className="card-title" style={{ marginBottom: 0 }}>
                📋 Medical Records
                <span style={{
                  marginLeft: 8, fontSize: 12, color: '#6b7280', fontWeight: 600,
                }}>
                  ({totalRecords} total)
                </span>
              </div>
              <button
                onClick={() => { setShowForm(!showForm); setSaveError('') }}
                className="btn-primary"
                style={{ padding: '7px 16px', fontSize: 13 }}
              >
                {showForm ? '✕ Close Form' : '➕ Create Record'}
              </button>
            </div>

            {/* Create record form */}
            {showForm && (
              <div style={{
                background: '#f0fdf4', borderRadius: 10,
                padding: 16, marginBottom: 20,
                border: '1.5px solid #16a34a',
              }}>
                <div style={{
                  fontWeight: 700, fontSize: 14, color: '#14532d', marginBottom: 14,
                }}>
                  📝 New Record for {selectedPatient.first_name} {selectedPatient.last_name}
                </div>

                {saveError && <div className="alert-error">{saveError}</div>}

                <form onSubmit={handleSaveRecord}>
                  <div className="form-group">
                    <label style={{ fontWeight: 700, fontSize: 13, color: '#374151' }}>
                      Record Title
                    </label>
                    <input
                      style={{
                        width: '100%', padding: '10px 14px',
                        border: '1.5px solid #e5e7eb', borderRadius: 8,
                        fontSize: 14, color: '#000', fontWeight: 'bold', background: 'white',
                      }}
                      type="text"
                      placeholder="e.g. Initial Checkup, Follow-up Visit"
                      value={recordTitle}
                      onChange={e => setRecordTitle(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontWeight: 700, fontSize: 13, color: '#374151' }}>
                      Diagnosis *
                    </label>
                    <textarea
                      style={{
                        width: '100%', padding: '10px 14px',
                        border: '1.5px solid #e5e7eb', borderRadius: 8,
                        fontSize: 14, color: '#000', fontWeight: 'bold',
                        background: 'white', minHeight: 80, resize: 'vertical',
                      }}
                      placeholder="Enter diagnosis…"
                      value={diagnosis}
                      required
                      onChange={e => setDiagnosis(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontWeight: 700, fontSize: 13, color: '#374151' }}>
                      Prescription
                    </label>
                    <textarea
                      style={{
                        width: '100%', padding: '10px 14px',
                        border: '1.5px solid #e5e7eb', borderRadius: 8,
                        fontSize: 14, color: '#000', fontWeight: 'bold',
                        background: 'white', minHeight: 80, resize: 'vertical',
                      }}
                      placeholder="Enter prescription / medicines…"
                      value={prescription}
                      onChange={e => setPrescription(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontWeight: 700, fontSize: 13, color: '#374151' }}>
                      Notes
                    </label>
                    <textarea
                      style={{
                        width: '100%', padding: '10px 14px',
                        border: '1.5px solid #e5e7eb', borderRadius: 8,
                        fontSize: 14, color: '#000', fontWeight: 'bold',
                        background: 'white', minHeight: 70, resize: 'vertical',
                      }}
                      placeholder="Additional notes or instructions…"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                    />
                  </div>

                  <div style={{
                    fontSize: 11, color: '#9ca3af', marginBottom: 12, fontWeight: 600,
                  }}>
                    🔒 All fields are encrypted before saving.
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary"
                    style={{ width: '100%', padding: 12, fontSize: 15 }}
                  >
                    {saving ? '⏳ Saving…' : '💾 Save Record'}
                  </button>
                </form>
              </div>
            )}

            {/* Records list */}
            {loadingRecords ? (
              <div style={{
                textAlign: 'center', padding: 24,
                color: '#9ca3af', fontSize: 13, fontWeight: 600,
              }}>
                Loading records…
              </div>
            ) : records.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: 24,
                color: '#9ca3af', fontSize: 13, fontWeight: 600,
                background: '#f9fafb', borderRadius: 8,
                border: '1px dashed #e5e7eb',
              }}>
                No medical records yet for this patient.
                <br />
                <span style={{ fontSize: 12 }}>
                  Click "➕ Create Record" to add the first one.
                </span>
              </div>
            ) : (
              <>
                {records.map(r => (
                  <div key={r.id} style={{
                    border: '1px solid #e5e7eb', borderRadius: 8,
                    padding: 14, marginBottom: 10, background: '#fafafa',
                  }}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', marginBottom: 10,
                    }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#000' }}>
                        📄 {r.record_title}
                      </span>
                      <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>
                        {new Date(r.created_at).toLocaleDateString('en-PH', {
                          year: 'numeric', month: 'long', day: 'numeric',
                        })}
                      </span>
                    </div>

                    {r.diagnosis && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{
                          fontSize: 10, color: '#16a34a', fontWeight: 700,
                          textTransform: 'uppercase', marginBottom: 3,
                        }}>
                          Diagnosis
                        </div>
                        <div style={{
                          fontSize: 13, color: '#000', fontWeight: 'bold',
                          whiteSpace: 'pre-wrap', lineHeight: 1.6,
                          background: 'white', padding: 8,
                          borderRadius: 6, border: '1px solid #f0f0f0',
                        }}>
                          {r.diagnosis}
                        </div>
                      </div>
                    )}

                    {r.prescription && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{
                          fontSize: 10, color: '#2563eb', fontWeight: 700,
                          textTransform: 'uppercase', marginBottom: 3,
                        }}>
                          Prescription
                        </div>
                        <div style={{
                          fontSize: 13, color: '#000', fontWeight: 'bold',
                          whiteSpace: 'pre-wrap', lineHeight: 1.6,
                          background: 'white', padding: 8,
                          borderRadius: 6, border: '1px solid #f0f0f0',
                        }}>
                          {r.prescription}
                        </div>
                      </div>
                    )}

                    {r.notes && (
                      <div>
                        <div style={{
                          fontSize: 10, color: '#9ca3af', fontWeight: 700,
                          textTransform: 'uppercase', marginBottom: 3,
                        }}>
                          Notes
                        </div>
                        <div style={{
                          fontSize: 13, color: '#000', fontWeight: 'bold',
                          whiteSpace: 'pre-wrap', lineHeight: 1.6,
                          background: 'white', padding: 8,
                          borderRadius: 6, border: '1px solid #f0f0f0',
                        }}>
                          {r.notes}
                        </div>
                      </div>
                    )}

                    {/* Legacy data field */}
                    {!r.diagnosis && r.data && (
                      <div style={{
                        fontSize: 13, color: '#000', fontWeight: 'bold',
                        whiteSpace: 'pre-wrap', lineHeight: 1.6,
                      }}>
                        {r.data}
                      </div>
                    )}
                  </div>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: 10, marginTop: 16,
                  }}>
                    <button
                      onClick={() => loadRecords(selectedPatient.id, currentPage - 1)}
                      disabled={currentPage === 1}
                      className="btn-secondary"
                      style={{ padding: '6px 14px', fontSize: 13 }}
                    >
                      ← Prev
                    </button>
                    <span style={{
                      fontSize: 13, fontWeight: 700, color: '#374151',
                    }}>
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => loadRecords(selectedPatient.id, currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="btn-secondary"
                      style={{ padding: '6px 14px', fontSize: 13 }}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Empty state — no patient selected */}
      {!selectedPatient && (
        <div style={{
          textAlign: 'center', padding: 40,
          color: '#9ca3af', fontSize: 14, fontWeight: 600,
          background: 'white', borderRadius: 10,
          border: '1px solid #e5e7eb',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          Search for a patient above to view or create their medical records.
        </div>
      )}
    </div>
  )
}

// ── Main Doctor Dashboard ──
export default function DoctorDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('Schedule')
  const [showLogout, setShowLogout] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [appointments, setAppointments] = useState([])
  const [patients, setPatients] = useState([])
  const [cancelTarget, setCancelTarget] = useState(null)
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [patientPrescriptions, setPatientPrescriptions] = useState([])
  const [prescForm, setPrescForm] = useState({
    diagnosis: '', medicines: '', notes: '', appointment: ''
  })
  const [prescError, setPrescError] = useState('')
  const [prescSuccess, setPrescSuccess] = useState('')
  const [savingPresc, setSavingPresc] = useState(false)
  const [actionMsg, setActionMsg] = useState('')

  const handleWsNotif = useCallback((data) => {
    if (data.type === 'initial_notifications') setNotifications(data.notifications || [])
    else if (data.message) setNotifications(prev => [data, ...prev])
  }, [])
  useWebSocket(user?.user_id, handleWsNotif)

  const loadNotifications = useCallback(async () => {
    try { const r = await api.get('/notifications/'); setNotifications(r.data) } catch (_) {}
  }, [])
  const loadAppointments = useCallback(async () => {
    try { const r = await api.get('/appointments/'); setAppointments(r.data) } catch (_) {}
  }, [])
  const loadPatients = useCallback(async () => {
    try { const r = await api.get('/users/?role=patient'); setPatients(r.data) } catch (_) {}
  }, [])

  useEffect(() => {
    loadNotifications(); loadAppointments(); loadPatients()
  }, [])

  const loadPatientPrescriptions = async (patientId) => {
    try {
      const r = await api.get(`/prescriptions/?patient_id=${patientId}`)
      setPatientPrescriptions(r.data)
    } catch (_) {}
  }

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient)
    loadPatientPrescriptions(patient.id)
    setPrescForm({ diagnosis: '', medicines: '', notes: '', appointment: '' })
    setPrescError(''); setPrescSuccess('')
  }

  const handleSavePrescription = async (e) => {
    e.preventDefault()
    if (!selectedPatient) return
    setPrescError(''); setPrescSuccess(''); setSavingPresc(true)
    try {
      await api.post('/prescriptions/create/', {
        patient: selectedPatient.id,
        diagnosis: prescForm.diagnosis,
        medicines: prescForm.medicines,
        notes: prescForm.notes,
        appointment: prescForm.appointment || null,
      })
      setPrescSuccess('Prescription saved. Patient has been notified.')
      setPrescForm({ diagnosis: '', medicines: '', notes: '', appointment: '' })
      loadPatientPrescriptions(selectedPatient.id)
    } catch (err) {
      const d = err.response?.data
      setPrescError(typeof d === 'object' ? Object.values(d).flat().join(' ') : 'Failed.')
    } finally { setSavingPresc(false) }
  }

  const confirmCancel = async () => {
    if (!cancelTarget) return
    try {
      await api.post(`/appointments/${cancelTarget}/cancel/`)
      setActionMsg('Appointment cancelled. Patient has been notified.')
      loadAppointments()
    } catch (_) {}
    setCancelTarget(null)
  }

  const confirmConfirm = async () => {
    if (!confirmTarget) return
    try {
      await api.post(`/appointments/${confirmTarget}/confirm/`)
      setActionMsg('Appointment confirmed. Patient has been notified.')
      loadAppointments()
    } catch (err) {
      setActionMsg(err.response?.data?.error || 'Failed to confirm.')
    }
    setConfirmTarget(null)
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

  const today = new Date()
  const next3Days = [0, 1, 2, 3].map(i => {
    const d = new Date(today); d.setDate(today.getDate() + i)
    return d.toISOString().split('T')[0]
  })
  const scheduleAppointments = appointments.filter(a => next3Days.includes(a.date))

  const ActionButtons = ({ appointment: a }) => (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {a.status === 'pending' && (
        <button className="btn-primary"
          style={{ padding: '4px 12px', fontSize: 12, background: '#16a34a' }}
          onClick={() => setConfirmTarget(a.id)}>
          ✓ Confirm
        </button>
      )}
      {(a.status === 'pending' || a.status === 'confirmed') && (
        <button className="btn-danger"
          style={{ padding: '4px 12px', fontSize: 12 }}
          onClick={() => setCancelTarget(a.id)}>
          ✕ Cancel
        </button>
      )}
    </div>
  )

  const sidebarItems = [
    { label: 'Schedule', icon: '📆' },
    { label: 'Patients', icon: '👥' },
    { label: 'Records', icon: '📋' },
    { label: 'Appointments', icon: '📅' },
    { label: 'Messages', icon: '💬' },
  ]

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">🏥 Clinic System<br />
          <span style={{ fontSize: 12, opacity: 0.75, fontWeight: 400 }}>
            Dr. {user?.full_name || user?.username}
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
            {tab === 'Schedule'
              ? `Dr. ${user?.full_name || user?.username} — Schedule`
              : tab}
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

        {/* Schedule */}
        {tab === 'Schedule' && (
          <div className="card">
            <div className="card-title">📆 Today & Next 3 Days</div>
            {scheduleAppointments.length === 0 ? (
              <p style={{ color: '#9ca3af', fontWeight: 600, fontSize: 14 }}>
                No upcoming appointments in the next 3 days.
              </p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th><th>Time</th><th>Patient</th>
                      <th>Status</th><th>Notes</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduleAppointments.map(a => (
                      <tr key={a.id}>
                        <td>{a.date}</td>
                        <td>{a.time}</td>
                        <td>{a.patient_name}</td>
                        <td>{statusBadge(a.status)}</td>
                        <td>{a.notes || '—'}</td>
                        <td><ActionButtons appointment={a} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Patients + Prescriptions */}
        {tab === 'Patients' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: selectedPatient ? '1fr 1.4fr' : '1fr',
            gap: 20,
          }}>
            <div className="card">
              <div className="card-title">👥 Assigned Patients</div>
              {patients.length === 0 ? (
                <p style={{ color: '#9ca3af', fontWeight: 600, fontSize: 14 }}>
                  No assigned patients yet.
                </p>
              ) : (
                patients.map(p => (
                  <div key={p.id} onClick={() => handleSelectPatient(p)}
                    style={{
                      padding: '12px 14px', borderRadius: 8,
                      border: `1px solid ${selectedPatient?.id === p.id ? '#16a34a' : '#e5e7eb'}`,
                      marginBottom: 10, cursor: 'pointer',
                      background: selectedPatient?.id === p.id ? '#f0fdf4' : 'white',
                    }}>
                    <div style={{ fontWeight: 700, color: '#000', fontSize: 14 }}>
                      {p.first_name} {p.last_name}
                      <span style={{ color: '#6b7280', fontWeight: 600 }}>
                        {' '}(@{p.username})
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 'bold' }}>
                      {p.email}
                    </div>
                  </div>
                ))
              )}
            </div>

            {selectedPatient && (
              <div className="card">
                <div className="card-title">
                  💊 Prescriptions — {selectedPatient.first_name} {selectedPatient.last_name}
                </div>
                {prescError && <div className="alert-error">{prescError}</div>}
                {prescSuccess && <div className="alert-success">{prescSuccess}</div>}
                <form onSubmit={handleSavePrescription}>
                  <div className="form-group">
                    <label>Diagnosis *</label>
                    <textarea rows={3} placeholder="Enter diagnosis…" required
                      value={prescForm.diagnosis}
                      onChange={e => setPrescForm(f => ({ ...f, diagnosis: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Medicines *</label>
                    <textarea rows={3} placeholder="One medicine per line…" required
                      value={prescForm.medicines}
                      onChange={e => setPrescForm(f => ({ ...f, medicines: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Notes</label>
                    <input type="text" placeholder="Additional instructions…"
                      value={prescForm.notes}
                      onChange={e => setPrescForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                  <button type="submit" className="btn-primary" disabled={savingPresc}>
                    {savingPresc ? 'Saving…' : '💾 Save Prescription'}
                  </button>
                </form>

                {patientPrescriptions.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>
                      Previous Prescriptions
                    </div>
                    {patientPrescriptions.map(p => (
                      <div key={p.id} style={{
                        border: '1px solid #e5e7eb', borderRadius: 8,
                        padding: 12, marginBottom: 8, background: '#fafafa',
                      }}>
                        <div style={{ fontWeight: 700, color: '#000', fontSize: 13 }}>
                          {p.diagnosis}
                        </div>
                        <div style={{
                          fontSize: 12, color: '#374151', fontWeight: 'bold',
                          whiteSpace: 'pre-line', marginTop: 4,
                        }}>{p.medicines}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6, fontWeight: 'bold' }}>
                          {new Date(p.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Records tab — uses separate component */}
        {tab === 'Records' && (
          <RecordsTab doctorId={user?.user_id} />
        )}

        {/* All Appointments */}
        {tab === 'Appointments' && (
          <div className="card">
            <div className="card-title">📅 All My Appointments</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Patient</th><th>Date</th><th>Time</th>
                    <th>Status</th><th>Notes</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map(a => (
                    <tr key={a.id}>
                      <td>{a.patient_name}</td>
                      <td>{a.date}</td>
                      <td>{a.time}</td>
                      <td>{statusBadge(a.status)}</td>
                      <td>{a.notes || '—'}</td>
                      <td><ActionButtons appointment={a} /></td>
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
        )}

        {tab === 'Messages' && (
          <MessagingPanel currentUserId={user?.user_id} />
        )}
      </main>

      {showLogout && (
        <LogoutModal onConfirm={handleLogout} onCancel={() => setShowLogout(false)} />
      )}
      {cancelTarget && (
        <ConfirmModal title="Cancel Appointment"
          message="Cancel this appointment? The patient will be notified."
          onConfirm={confirmCancel} onCancel={() => setCancelTarget(null)} />
      )}
      {confirmTarget && (
        <ConfirmModal title="Confirm Appointment"
          message="Confirm this appointment? The patient will be notified."
          onConfirm={confirmConfirm} onCancel={() => setConfirmTarget(null)}
          danger={false} />
      )}
    </div>
  )
}