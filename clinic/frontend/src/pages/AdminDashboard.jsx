import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useWebSocket } from '../hooks/useWebSocket'
import api from '../api/axios'
import LogoutModal from '../components/LogoutModal'
import ConfirmModal from '../components/ConfirmModal'
import NotificationBell from '../components/NotificationBell'
import MessagingPanel from '../components/MessagingPanel'

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ── Admin Records Search (Read Only) ──
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
      const res = await api.get(`/patients/search/?q=${encodeURIComponent(q)}`)
      const results = res.data.results || []
      setSearchResults(results)
      setHasSearched(true)
      if (results.length === 0) {
        setSearchError(`No patient found matching "${q}".`)
      }
    } catch (err) {
      setHasSearched(true)
      setSearchError(err.response?.data?.error || 'Search failed.')
    } finally {
      setSearching(false)
    }
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
      const res = await api.get(`/records/?patient_user_id=${patientUserId}&page=${page}`)
      const data = res.data
      if (Array.isArray(data)) {
        setRecords(data)
        setTotalPages(1)
        setTotalRecords(data.length)
      } else {
        setRecords(data.results || [])
        setTotalPages(data.total_pages || 1)
        setTotalRecords(data.count || 0)
        setCurrentPage(page)
      }
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
      <div style={{
        background: '#fef3c7', border: '1px solid #fcd34d',
        borderRadius: 8, padding: '10px 16px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 13, fontWeight: 700, color: '#92400e',
      }}>
        <span>🛡️</span>
        Admin View — Read Only. Search a patient by name to view their records.
      </div>

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
                  if (selectedPatient) { setSelectedPatient(null); setRecords([]) }
                }}
                onKeyDown={e => { if (e.key === 'Enter') doSearch(query.trim()) }}
                style={{
                  width: '100%', padding: '11px 14px',
                  border: '1.5px solid #e5e7eb', borderRadius: 8,
                  fontSize: 14, color: '#000', fontWeight: 'bold',
                  background: 'white', outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = '#16a34a'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
              {searching && (
                <span style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 12, color: '#9ca3af', fontWeight: 600,
                }}>Searching…</span>
              )}
            </div>
            <button onClick={() => doSearch(query.trim())} disabled={searching}
              className="btn-primary" style={{ padding: '10px 20px', whiteSpace: 'nowrap' }}>
              {searching ? '⏳' : '🔍 Search'}
            </button>
          </div>
          <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, marginTop: 6 }}>
            Auto-searches after you stop typing (500ms)
          </p>

          {searchError && !selectedPatient && (
            <div style={{
              marginTop: 10, padding: '10px 14px',
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 8, fontSize: 13, color: '#dc2626', fontWeight: 700,
            }}>⚠️ {searchError}</div>
          )}

          {searchResults.length > 0 && !selectedPatient && (
            <div style={{
              position: 'absolute', left: 0, right: 100, top: 52,
              zIndex: 200, border: '1px solid #e5e7eb', borderRadius: 10,
              overflow: 'hidden', boxShadow: '0 8px 28px rgba(0,0,0,0.12)',
              background: 'white',
            }}>
              <div style={{
                padding: '8px 14px', background: '#f0fdf4',
                borderBottom: '1px solid #e5e7eb',
                fontSize: 11, color: '#16a34a', fontWeight: 700,
              }}>
                {searchResults.length} patient{searchResults.length !== 1 ? 's' : ''} found
              </div>
              {searchResults.map(item => (
                <div key={item.patient.id} onClick={() => selectPatient(item)}
                  style={{
                    padding: '13px 16px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 12,
                    borderBottom: '1px solid #f3f4f6', background: 'white',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: '#d1fae5', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: 18,
                  }}>👤</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#000' }}>
                      {item.patient.first_name} {item.patient.last_name}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                      @{item.patient.username}
                      {item.patient.patient_profile?.patient_id && (
                        <span style={{
                          marginLeft: 8, background: '#dcfce7', color: '#166534',
                          fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 999,
                        }}>ID: {item.patient.patient_profile.patient_id}</span>
                      )}
                    </div>
                  </div>
                  <span style={{
                    background: '#f0fdf4', color: '#16a34a',
                    fontSize: 11, fontWeight: 700, padding: '3px 10px',
                    borderRadius: 999, border: '1px solid #bbf7d0',
                  }}>
                    {item.total_records} records →
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedPatient && (
          <div style={{
            marginTop: 14, padding: '12px 16px',
            background: '#d1fae5', borderRadius: 10,
            border: '1.5px solid #16a34a',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%', background: '#16a34a',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
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
                </div>
              </div>
            </div>
            <button onClick={clearSelection}
              style={{
                background: 'rgba(0,0,0,0.08)', border: 'none',
                borderRadius: 8, padding: '6px 12px',
                cursor: 'pointer', color: '#065f46', fontWeight: 700, fontSize: 13,
              }}>✕ Clear</button>
          </div>
        )}
      </div>

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
          </div>
        </div>
      )}

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
              fontSize: 11, fontWeight: 700, padding: '4px 12px',
              borderRadius: 999, background: '#fef3c7', color: '#92400e',
              border: '1px solid #fcd34d',
            }}>🛡️ View Only</span>
          </div>

          {loadingRecords ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#9ca3af', fontSize: 13, fontWeight: 600 }}>
              ⏳ Loading records…
            </div>
          ) : records.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: 16, color: '#9ca3af',
              fontSize: 13, fontWeight: 600, background: '#f9fafb',
              borderRadius: 8, border: '1px dashed #e5e7eb',
            }}>No medical records found for this patient.</div>
          ) : (
            <>
              {records.map(r => (
                <div key={r.id} style={{
                  border: '1px solid #e5e7eb', borderRadius: 10,
                  padding: 16, marginBottom: 12, background: '#fafafa',
                }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'flex-start', marginBottom: 8,
                    paddingBottom: 8, borderBottom: '1px solid #f0f0f0',
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#000' }}>
                        📄 {r.record_title}
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, marginTop: 2 }}>
                        Added by: {r.created_by_name}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {r.diagnosis && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 10, color: '#16a34a', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Diagnosis</div>
                      <div style={{ fontSize: 13, color: '#000', fontWeight: 'bold', whiteSpace: 'pre-wrap', lineHeight: 1.6, background: 'white', padding: 8, borderRadius: 6, border: '1px solid #e5e7eb' }}>{r.diagnosis}</div>
                    </div>
                  )}
                  {r.prescription && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 10, color: '#2563eb', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Prescription</div>
                      <div style={{ fontSize: 13, color: '#000', fontWeight: 'bold', whiteSpace: 'pre-wrap', lineHeight: 1.6, background: 'white', padding: 8, borderRadius: 6, border: '1px solid #e5e7eb' }}>{r.prescription}</div>
                    </div>
                  )}
                  {r.notes && (
                    <div>
                      <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Notes</div>
                      <div style={{ fontSize: 13, color: '#000', fontWeight: 'bold', whiteSpace: 'pre-wrap', lineHeight: 1.6, background: 'white', padding: 8, borderRadius: 6, border: '1px solid #e5e7eb' }}>{r.notes}</div>
                    </div>
                  )}
                  {!r.diagnosis && r.data && (
                    <div style={{ fontSize: 13, color: '#000', fontWeight: 'bold', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{r.data}</div>
                  )}
                </div>
              ))}
              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 16 }}>
                  <button onClick={() => loadPatientRecords(selectedPatient.id, currentPage - 1)}
                    disabled={currentPage === 1} className="btn-secondary" style={{ padding: '7px 16px', fontSize: 13 }}>← Previous</button>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Page {currentPage} of {totalPages}</span>
                  <button onClick={() => loadPatientRecords(selectedPatient.id, currentPage + 1)}
                    disabled={currentPage === totalPages} className="btn-secondary" style={{ padding: '7px 16px', fontSize: 13 }}>Next →</button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Email Notifications Tab ──
function EmailNotificationsTab() {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [targetGroup, setTargetGroup] = useState('all')
  const [specificUserId, setSpecificUserId] = useState('')
  const [users, setUsers] = useState([])
  const [sending, setSending] = useState(false)
  const [sendSuccess, setSendSuccess] = useState('')
  const [sendError, setSendError] = useState('')
  const [logs, setLogs] = useState([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [activeTab, setActiveTab] = useState('compose')

  const loadUsers = useCallback(async () => {
    try {
      const res = await api.get('/users/')
      setUsers(res.data.filter(u => u.email && u.role !== 'admin'))
    } catch (_) {}
  }, [])

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true)
    try {
      const res = await api.get('/email-notifications/logs/')
      setLogs(res.data)
    } catch (_) {}
    setLoadingLogs(false)
  }, [])

  useEffect(() => {
    loadUsers()
    loadLogs()
  }, [])

  const handleSend = async (e) => {
    e.preventDefault()
    setSendSuccess('')
    setSendError('')
    setSending(true)

    try {
      const payload = {
        subject: subject.trim(),
        message: message.trim(),
        target_group: targetGroup,
      }
      if (targetGroup === 'specific' && specificUserId) {
        payload.specific_user_id = parseInt(specificUserId)
      }

      const res = await api.post('/email-notifications/send/', payload)
      setSendSuccess(res.data.message)
      setSubject('')
      setMessage('')
      setTargetGroup('all')
      setSpecificUserId('')
      // Refresh logs after 2 seconds
      setTimeout(() => loadLogs(), 2000)
    } catch (err) {
      const d = err.response?.data
      if (err.response?.status === 429) {
        setSendError('⚠️ Rate limit exceeded. Please wait before sending more emails.')
      } else {
        setSendError(
          typeof d === 'object'
            ? Object.values(d).flat().join(' ')
            : 'Failed to send. Please check your email configuration.'
        )
      }
    } finally {
      setSending(false)
    }
  }

  const statusColor = (s) => {
    const map = {
      pending: '#f59e0b',
      sending: '#3b82f6',
      completed: '#16a34a',
      failed: '#dc2626',
      partial: '#f97316',
    }
    return map[s] || '#9ca3af'
  }

  const statusBg = (s) => {
    const map = {
      pending: '#fef3c7',
      sending: '#dbeafe',
      completed: '#d1fae5',
      failed: '#fee2e2',
      partial: '#ffedd5',
    }
    return map[s] || '#f3f4f6'
  }

  const inp = {
    width: '100%', padding: '10px 14px',
    border: '1.5px solid #e5e7eb', borderRadius: 8,
    fontSize: 14, color: '#000', fontWeight: 'bold', background: 'white',
  }

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20 }}>
        {[
          { key: 'compose', label: '✉️ Compose Email', },
          { key: 'history', label: '📋 Send History', },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{
              padding: '10px 20px', fontWeight: 700, fontSize: 14,
              border: '1px solid #e5e7eb', cursor: 'pointer',
              background: activeTab === t.key ? '#16a34a' : 'white',
              color: activeTab === t.key ? 'white' : '#374151',
              borderRadius: t.key === 'compose' ? '8px 0 0 8px' : '0 8px 8px 0',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Compose */}
      {activeTab === 'compose' && (
        <div className="card">
          <div className="card-title">✉️ Send Email Notification</div>
          <p style={{ fontSize: 13, color: '#6b7280', fontWeight: 600, marginBottom: 16 }}>
            Send email notifications to users. Emails are sent in the background
            and will not block the system.
          </p>

          {sendSuccess && (
            <div className="alert-success" style={{ marginBottom: 16 }}>
              {sendSuccess}
              <button onClick={() => setSendSuccess('')}
                style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: '#065f46' }}>✕</button>
            </div>
          )}
          {sendError && (
            <div className="alert-error" style={{ marginBottom: 16 }}>
              {sendError}
              <button onClick={() => setSendError('')}
                style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: '#991b1b' }}>✕</button>
            </div>
          )}

          <form onSubmit={handleSend}>
            {/* Target group selector */}
            <div className="form-group">
              <label style={{ fontWeight: 700, fontSize: 13, color: '#374151' }}>
                Send To *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {[
                  { value: 'all', label: '👥 All Users', desc: 'Everyone' },
                  { value: 'patients', label: '👤 Patients', desc: 'Patients only' },
                  { value: 'doctors', label: '🩺 Doctors', desc: 'Doctors only' },
                  { value: 'specific', label: '🎯 Specific', desc: 'One person' },
                ].map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => { setTargetGroup(opt.value); setSpecificUserId('') }}
                    style={{
                      padding: '10px 8px', border: targetGroup === opt.value ? '2px solid #16a34a' : '2px solid #e5e7eb',
                      borderRadius: 8, background: targetGroup === opt.value ? '#f0fdf4' : 'white',
                      cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
                    }}>
                    <div style={{ fontSize: 14 }}>{opt.label}</div>
                    <div style={{ fontSize: 10, color: targetGroup === opt.value ? '#16a34a' : '#9ca3af', fontWeight: 600, marginTop: 2 }}>
                      {opt.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Specific user selector */}
            {targetGroup === 'specific' && (
              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: 13, color: '#374151' }}>
                  Select User *
                </label>
                <select style={inp} value={specificUserId}
                  onChange={e => setSpecificUserId(e.target.value)} required>
                  <option value="">-- Select a user --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} (@{u.username}) — {u.role} — {u.email}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Subject */}
            <div className="form-group">
              <label style={{ fontWeight: 700, fontSize: 13, color: '#374151' }}>
                Subject *
              </label>
              <input style={inp} type="text"
                placeholder="e.g. Clinic Schedule Update, Important Health Notice"
                value={subject} required
                onChange={e => setSubject(e.target.value)}
                onFocus={e => e.target.style.borderColor = '#16a34a'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
            </div>

            {/* Message */}
            <div className="form-group">
              <label style={{ fontWeight: 700, fontSize: 13, color: '#374151' }}>
                Message *
              </label>
              <textarea style={{ ...inp, minHeight: 160, resize: 'vertical', lineHeight: 1.7, fontFamily: 'inherit' }}
                placeholder="Type your message here…&#10;&#10;Example:&#10;Dear Patient,&#10;&#10;We would like to inform you that the clinic will be closed on April 25, 2026 due to a holiday. Please reschedule your appointments accordingly.&#10;&#10;Thank you."
                value={message} required
                onChange={e => setMessage(e.target.value)}
                onFocus={e => e.target.style.borderColor = '#16a34a'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, fontWeight: 600 }}>
                The clinic name and contact info will be automatically added to the email footer.
              </div>
            </div>

            {/* Preview */}
            {subject && message && (
              <div style={{
                background: '#f9fafb', border: '1px solid #e5e7eb',
                borderRadius: 8, padding: 16, marginBottom: 16,
              }}>
                <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>
                  Email Preview
                </div>
                <div style={{ fontSize: 13, color: '#374151', fontWeight: 700, marginBottom: 4 }}>
                  Subject: {subject}
                </div>
                <div style={{ fontSize: 13, color: '#000', fontWeight: 'bold', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                  {message}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8, fontWeight: 600, borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
                  ── Poblacion Danao Bohol Clinic
                  {'\n'}This is an official notification from the clinic admin.
                </div>
              </div>
            )}

            <button type="submit" disabled={sending}
              style={{
                width: '100%', padding: '13px',
                background: sending ? '#9ca3af' : '#16a34a',
                color: 'white', border: 'none', borderRadius: 10,
                fontWeight: 800, fontSize: 15, cursor: sending ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
              }}>
              {sending ? '⏳ Sending in background…' : '📧 Send Email Notification'}
            </button>
          </form>
        </div>
      )}

      {/* History */}
      {activeTab === 'history' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>📋 Email Send History</div>
            <button onClick={loadLogs} className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }}>
              🔄 Refresh
            </button>
          </div>

          {loadingLogs ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#9ca3af', fontSize: 13, fontWeight: 600 }}>
              Loading logs…
            </div>
          ) : logs.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: 24, color: '#9ca3af',
              fontSize: 13, fontWeight: 600, background: '#f9fafb',
              borderRadius: 8, border: '1px dashed #e5e7eb',
            }}>
              No emails sent yet.
            </div>
          ) : (
            logs.map(log => (
              <div key={log.id} style={{
                border: '1px solid #e5e7eb', borderRadius: 10,
                padding: 16, marginBottom: 12, background: '#fafafa',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#000' }}>
                      {log.subject}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginTop: 2 }}>
                      Sent by: {log.sent_by_name} •
                      Target: {log.target_group === 'specific' ? `Specific (${log.specific_user_name || '—'})` : log.target_group} •
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: '4px 12px',
                    borderRadius: 999, background: statusBg(log.status),
                    color: statusColor(log.status), textTransform: 'capitalize',
                    whiteSpace: 'nowrap',
                  }}>
                    {log.status}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 16, fontSize: 12, fontWeight: 700 }}>
                  <span style={{ color: '#374151' }}>
                    📊 Total: {log.total_recipients}
                  </span>
                  <span style={{ color: '#16a34a' }}>
                    ✅ Sent: {log.success_count}
                  </span>
                  {log.failed_count > 0 && (
                    <span style={{ color: '#dc2626' }}>
                      ❌ Failed: {log.failed_count}
                    </span>
                  )}
                  {log.completed_at && (
                    <span style={{ color: '#9ca3af' }}>
                      Completed: {new Date(log.completed_at).toLocaleTimeString()}
                    </span>
                  )}
                </div>

                {log.error_message && (
                  <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 700, marginTop: 6 }}>
                    Error: {log.error_message}
                  </div>
                )}

                <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginTop: 8, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {log.message.length > 120 ? log.message.slice(0, 120) + '…' : log.message}
                </div>
              </div>
            ))
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

  useEffect(() => { loadNotifications(); loadStats(); loadAppointments() }, [])
  useEffect(() => { if (tab === 'Users') loadUsers() }, [tab, debouncedUserSearch, userRoleFilter])
  useEffect(() => { if (tab === 'Appointments' || tab === 'Overview') loadAppointments() }, [tab, debouncedApptSearch, apptStatusFilter])

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
      const res = await api.post(`/users/${resetUserId}/reset-password/`, { new_password: newPassword })
      setResetMsg(res.data.message); setNewPassword('')
    } catch (err) {
      setResetError(err.response?.data?.error || 'Failed.')
    } finally { setResetLoading(false) }
  }

  const handleLogout = async () => { await logout(); navigate('/login', { replace: true }) }

  const statusBadge = (s) => {
    const map = { pending: 'badge-pending', confirmed: 'badge-confirmed', cancelled: 'badge-cancelled', completed: 'badge-completed' }
    return <span className={`badge ${map[s] || 'badge-pending'}`}>{s}</span>
  }

  const bold = { color: '#000', fontWeight: 'bold' }

  const AppointmentActions = ({ a }) => (
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
      {a.status === 'pending' && (
        <button className="btn-primary"
          style={{ padding: '3px 10px', fontSize: 12, background: '#16a34a' }}
          onClick={() => setConfirmTarget(a.id)}>✓ Confirm</button>
      )}
      {(a.status === 'pending' || a.status === 'confirmed') && (
        <button className="btn-danger"
          style={{ padding: '3px 10px', fontSize: 12 }}
          onClick={() => setCancelTarget(a.id)}>✕ Cancel</button>
      )}
      <select value={a.status} onChange={e => handleStatusChange(a.id, e.target.value)}
        style={{ fontSize: 12, padding: '3px 6px', border: '1px solid #e5e7eb', borderRadius: 6, color: '#000', fontWeight: 'bold', background: 'white', cursor: 'pointer' }}>
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
    { label: 'Email', icon: '✉️' },
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
            style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: 8, padding: '10px 16px', width: '100%', fontWeight: 700, fontSize: 14, cursor: 'pointer', textAlign: 'left' }}>
            🚪 Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827' }}>
            {tab === 'Overview' ? 'Admin Dashboard' : tab === 'Email' ? 'Email Notifications' : tab}
          </h1>
          <NotificationBell notifications={notifications} onMarkRead={loadNotifications} />
        </div>

        {actionMsg && (
          <div className="alert-success" style={{ marginBottom: 16 }}>
            {actionMsg}
            <button onClick={() => setActionMsg('')}
              style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: '#065f46' }}>✕</button>
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
                  <thead><tr><th>Patient</th><th>Doctor</th><th>Date</th><th>Time</th><th>Status</th><th>Actions</th></tr></thead>
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
                      <tr><td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af' }}>No appointments</td></tr>
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
                <input type="text" placeholder="Search users…" value={userSearch}
                  style={{ ...bold, width: '100%' }} onChange={e => setUserSearch(e.target.value)} />
                {userSearch && userSearch !== debouncedUserSearch && (
                  <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>typing…</span>
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
            <div style={{ display: 'grid', gridTemplateColumns: selectedUser ? '1fr 320px' : '1fr', gap: 20 }}>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Username</th><th>Full Name</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td style={{ ...bold, cursor: 'pointer', color: '#16a34a' }} onClick={() => setSelectedUser(u)}>{u.username}</td>
                        <td style={bold}>{u.first_name} {u.last_name}</td>
                        <td><span className={`badge ${u.role === 'doctor' ? 'badge-confirmed' : u.role === 'admin' ? 'badge-completed' : 'badge-pending'}`}>{u.role}</span></td>
                        <td><span className={`badge ${u.is_active ? 'badge-active' : 'badge-inactive'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                        <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {u.is_active ? (
                            <button className="btn-danger" style={{ padding: '4px 10px', fontSize: 12 }}
                              onClick={() => setDeactivateTarget(u)}>Deactivate</button>
                          ) : (
                            <button className="btn-outline" style={{ padding: '4px 10px', fontSize: 12 }}
                              onClick={() => restoreUser(u.id)}>Restore</button>
                          )}
                          <button style={{ padding: '4px 10px', fontSize: 12, background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}
                            onClick={() => openResetPassword(u)}>🔑 Reset PW</button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', color: '#9ca3af' }}>No users found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {selectedUser && (
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 20, background: '#fafafa' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <span style={{ fontWeight: 700, fontSize: 16, color: '#000' }}>User Detail</span>
                    <button onClick={() => setSelectedUser(null)}
                      style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6b7280' }}>✕</button>
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
                      <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
                      <div style={{ fontSize: 14, color: '#000', fontWeight: 'bold', marginTop: 2 }}>{val}</div>
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
                <input type="text" placeholder="Search by patient or doctor…" value={apptSearch}
                  style={{ ...bold, width: '100%' }} onChange={e => setApptSearch(e.target.value)} />
                {apptSearch && apptSearch !== debouncedApptSearch && (
                  <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>typing…</span>
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
                <thead><tr><th>Patient</th><th>Doctor</th><th>Date</th><th>Time</th><th>Status</th><th>Actions</th></tr></thead>
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
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af' }}>No appointments found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'Records' && <AdminRecordsTab />}
        {tab === 'Email' && <EmailNotificationsTab />}
        {tab === 'Messages' && <MessagingPanel currentUserId={user?.user_id} />}
      </main>

      {showLogout && <LogoutModal onConfirm={handleLogout} onCancel={() => setShowLogout(false)} />}
      {cancelTarget && (
        <ConfirmModal title="Cancel Appointment"
          message="Cancel this appointment? Both patient and doctor will be notified."
          onConfirm={confirmCancel} onCancel={() => setCancelTarget(null)} />
      )}
      {confirmTarget && (
        <ConfirmModal title="Confirm Appointment"
          message="Confirm this appointment? The patient will be notified."
          onConfirm={confirmConfirm} onCancel={() => setConfirmTarget(null)} danger={false} />
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
                  value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  required minLength={6} style={{ color: '#000', fontWeight: 'bold' }} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary"
                  onClick={() => { setResetUserId(null); setResetMsg(''); setResetError('') }}>Close</button>
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