import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useWebSocket } from '../hooks/useWebSocket'
import api from '../api/axios'
import LogoutModal from '../components/LogoutModal'
import ConfirmModal from '../components/ConfirmModal'
import NotificationBell from '../components/NotificationBell'
import MessagingPanel from '../components/MessagingPanel'

export default function PatientDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('Dashboard')
  const [showLogout, setShowLogout] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [appointments, setAppointments] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [records, setRecords] = useState([])
  const [recordsPage, setRecordsPage] = useState(1)
  const [recordsTotalPages, setRecordsTotalPages] = useState(1)
  const [recordsTotal, setRecordsTotal] = useState(0)
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [doctors, setDoctors] = useState([])
  const [cancelTarget, setCancelTarget] = useState(null)
  const [booking, setBooking] = useState({
    doctor: '', date: '', time: '', notes: ''
  })
  const [bookError, setBookError] = useState('')
  const [bookSuccess, setBookSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  // WebSocket notifications
  const handleWsNotif = useCallback((data) => {
    if (data.type === 'initial_notifications') {
      setNotifications(data.notifications || [])
    } else if (data.notif_type || data.message) {
      setNotifications(prev => [data, ...prev])
    }
  }, [])
  useWebSocket(user?.user_id, handleWsNotif, 'notifications')

  const loadNotifications = useCallback(async () => {
    try {
      const r = await api.get('/notifications/')
      setNotifications(r.data)
    } catch (_) {}
  }, [])

  const loadAppointments = useCallback(async () => {
    try {
      const r = await api.get('/appointments/')
      setAppointments(r.data)
    } catch (_) {}
  }, [])

  const loadPrescriptions = useCallback(async () => {
    try {
      const r = await api.get('/prescriptions/')
      setPrescriptions(r.data)
    } catch (_) {}
  }, [])

  // Fixed — handles paginated response correctly
  const loadRecords = useCallback(async (page = 1) => {
    setLoadingRecords(true)
    try {
      const r = await api.get(`/records/?page=${page}`)
      const data = r.data

      // Handle both paginated and plain array responses safely
      if (Array.isArray(data)) {
        // Old format — plain array
        setRecords(data)
        setRecordsTotalPages(1)
        setRecordsTotal(data.length)
      } else if (data && Array.isArray(data.results)) {
        // New format — paginated object
        setRecords(data.results)
        setRecordsTotalPages(data.total_pages || 1)
        setRecordsTotal(data.count || 0)
        setRecordsPage(page)
      } else {
        setRecords([])
      }
    } catch (_) {
      setRecords([])
    } finally {
      setLoadingRecords(false)
    }
  }, [])

  const loadDoctors = useCallback(async () => {
    try {
      const r = await api.get('/users/?role=doctor')
      setDoctors(r.data)
    } catch (_) {}
  }, [])

  useEffect(() => {
    loadNotifications()
    loadAppointments()
    loadDoctors()
  }, [])

  useEffect(() => {
    if (tab === 'Prescriptions') loadPrescriptions()
    if (tab === 'Records') loadRecords(1)
  }, [tab])

  const handleBook = async (e) => {
    e.preventDefault()
    setBookError(''); setBookSuccess(''); setLoading(true)
    try {
      await api.post('/appointments/book/', {
        doctor: parseInt(booking.doctor),
        date: booking.date,
        time: booking.time,
        notes: booking.notes,
      })
      setBookSuccess('Appointment booked! The doctor has been notified.')
      setBooking({ doctor: '', date: '', time: '', notes: '' })
      loadAppointments()
    } catch (err) {
      const d = err.response?.data
      if (typeof d === 'object') {
        setBookError(Object.values(d).flat().join(' '))
      } else {
        setBookError('Booking failed. Please try again.')
      }
    } finally {
      setLoading(false) }
  }

  const confirmCancel = async () => {
    if (!cancelTarget) return
    try {
      await api.post(`/appointments/${cancelTarget}/cancel/`)
      loadAppointments()
    } catch (_) {}
    setCancelTarget(null)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const statusBadge = (s) => {
    const map = {
      pending: 'badge-pending',
      confirmed: 'badge-confirmed',
      cancelled: 'badge-cancelled',
      completed: 'badge-completed',
    }
    return <span className={`badge ${map[s] || 'badge-pending'}`}>{s}</span>
  }

  const sidebarItems = [
    { label: 'Dashboard', icon: '🏠' },
    { label: 'Appointments', icon: '📅' },
    { label: 'Prescriptions', icon: '💊' },
    { label: 'Records', icon: '📋' },
    { label: 'Messages', icon: '💬' },
  ]

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">🏥 Clinic System<br />
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
        {/* Top bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 24,
          flexWrap: 'wrap', gap: 12,
        }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827' }}>
            {tab === 'Dashboard'
              ? `Welcome, ${user?.full_name || user?.username}`
              : tab}
          </h1>
          <NotificationBell
            notifications={notifications}
            onMarkRead={loadNotifications}
          />
        </div>

        {/* ── DASHBOARD ── */}
        {tab === 'Dashboard' && (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-number">{appointments.length}</div>
                <div className="stat-label">Total Appointments</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">
                  {appointments.filter(a => a.status === 'pending').length}
                </div>
                <div className="stat-label">Pending</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">
                  {appointments.filter(a => a.status === 'confirmed').length}
                </div>
                <div className="stat-label">Confirmed</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">
                  {notifications.filter(n => !n.is_read).length}
                </div>
                <div className="stat-label">Unread Notifications</div>
              </div>
            </div>

            {/* Quick book */}
            <div className="card">
              <div className="card-title">📅 Quick Book Appointment</div>
              {bookError && <div className="alert-error">{bookError}</div>}
              {bookSuccess && <div className="alert-success">{bookSuccess}</div>}
              <form onSubmit={handleBook}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Select Doctor *</label>
                    <select value={booking.doctor} required
                      onChange={e => setBooking(b => ({ ...b, doctor: e.target.value }))}>
                      <option value="">-- Choose a doctor --</option>
                      {doctors.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.first_name} {d.last_name}
                          {d.specialization ? ` — ${d.specialization}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Date *</label>
                    <input type="date" required value={booking.date}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => setBooking(b => ({ ...b, date: e.target.value }))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Time *</label>
                    <input type="time" required value={booking.time}
                      onChange={e => setBooking(b => ({ ...b, time: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Notes</label>
                    <input type="text" placeholder="Reason for visit (optional)"
                      value={booking.notes}
                      onChange={e => setBooking(b => ({ ...b, notes: e.target.value }))} />
                  </div>
                </div>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Booking…' : '📅 Book Appointment'}
                </button>
              </form>
            </div>

            {/* Recent appointments */}
            <div className="card">
              <div className="card-title">📋 Recent Appointments</div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Doctor</th><th>Date</th>
                      <th>Time</th><th>Status</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.slice(0, 5).map(a => (
                      <tr key={a.id}>
                        <td>Dr. {a.doctor_name}</td>
                        <td>{a.date}</td>
                        <td>{a.time}</td>
                        <td>{statusBadge(a.status)}</td>
                        <td>
                          {(a.status === 'pending' || a.status === 'confirmed') ? (
                            <button className="btn-danger"
                              style={{ padding: '4px 12px', fontSize: 12 }}
                              onClick={() => setCancelTarget(a.id)}>
                              Cancel
                            </button>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                    {appointments.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: '#9ca3af' }}>
                          No appointments yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── APPOINTMENTS ── */}
        {tab === 'Appointments' && (
          <div className="card">
            <div className="card-title">📅 My Appointments</div>

            {bookError && <div className="alert-error">{bookError}</div>}
            {bookSuccess && <div className="alert-success">{bookSuccess}</div>}

            <details style={{ marginBottom: 20 }}>
              <summary style={{
                cursor: 'pointer', fontWeight: 700,
                color: '#16a34a', fontSize: 14, marginBottom: 12,
              }}>
                + Book New Appointment
              </summary>
              <div style={{ marginTop: 12 }}>
                <form onSubmit={handleBook}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Doctor *</label>
                      <select value={booking.doctor} required
                        onChange={e => setBooking(b => ({ ...b, doctor: e.target.value }))}>
                        <option value="">-- Choose a doctor --</option>
                        {doctors.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.first_name} {d.last_name}
                            {d.specialization ? ` — ${d.specialization}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Date *</label>
                      <input type="date" required value={booking.date}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={e => setBooking(b => ({ ...b, date: e.target.value }))} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Time *</label>
                      <input type="time" required value={booking.time}
                        onChange={e => setBooking(b => ({ ...b, time: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>Notes</label>
                      <input type="text" placeholder="Reason (optional)"
                        value={booking.notes}
                        onChange={e => setBooking(b => ({ ...b, notes: e.target.value }))} />
                    </div>
                  </div>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Booking…' : 'Book Appointment'}
                  </button>
                </form>
              </div>
            </details>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Doctor</th><th>Specialization</th>
                    <th>Date</th><th>Time</th>
                    <th>Status</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map(a => (
                    <tr key={a.id}>
                      <td>Dr. {a.doctor_name}</td>
                      <td>{a.doctor_specialization || '—'}</td>
                      <td>{a.date}</td>
                      <td>{a.time}</td>
                      <td>{statusBadge(a.status)}</td>
                      <td>
                        {(a.status === 'pending' || a.status === 'confirmed') ? (
                          <button className="btn-danger"
                            style={{ padding: '4px 12px', fontSize: 12 }}
                            onClick={() => setCancelTarget(a.id)}>
                            Cancel
                          </button>
                        ) : '—'}
                      </td>
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

        {/* ── PRESCRIPTIONS ── */}
        {tab === 'Prescriptions' && (
          <div className="card">
            <div className="card-title">💊 My Prescriptions</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Doctor</th><th>Diagnosis</th>
                    <th>Medicines</th><th>Notes</th><th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {prescriptions.map(p => (
                    <tr key={p.id}>
                      <td>Dr. {p.doctor_name}</td>
                      <td>{p.diagnosis}</td>
                      <td style={{ whiteSpace: 'pre-line' }}>{p.medicines}</td>
                      <td>{p.notes || '—'}</td>
                      <td>{new Date(p.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {prescriptions.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: '#9ca3af' }}>
                        No prescriptions yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── RECORDS ── */}
        {tab === 'Records' && (
          <div className="card">
            <div className="card-title">📋 My Medical Records</div>
            <p style={{
              fontSize: 13, color: '#6b7280',
              marginBottom: 16, fontWeight: 600,
            }}>
              Your medical records are encrypted and read-only.
            </p>

            {loadingRecords ? (
              <div style={{
                textAlign: 'center', padding: 32,
                color: '#9ca3af', fontSize: 14, fontWeight: 600,
              }}>
                ⏳ Loading your records…
              </div>
            ) : records.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: 32,
                color: '#9ca3af', fontSize: 14, fontWeight: 600,
                background: '#f9fafb', borderRadius: 8,
                border: '1px dashed #e5e7eb',
              }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
                No medical records found.
                <br />
                <span style={{ fontSize: 12 }}>
                  Records added by your doctor will appear here.
                </span>
              </div>
            ) : (
              <>
                {records.map(r => (
                  <div key={r.id} style={{
                    border: '1px solid #e5e7eb', borderRadius: 10,
                    padding: 16, marginBottom: 14, background: '#fafafa',
                  }}>
                    {/* Record header */}
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'flex-start', marginBottom: 12,
                      paddingBottom: 10, borderBottom: '1px solid #f0f0f0',
                    }}>
                      <div>
                        <div style={{
                          fontWeight: 700, fontSize: 15, color: '#000',
                        }}>
                          📄 {r.record_title}
                        </div>
                        <div style={{
                          fontSize: 12, color: '#9ca3af',
                          fontWeight: 600, marginTop: 2,
                        }}>
                          Added by: {r.created_by_name}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 11, color: '#9ca3af', fontWeight: 600,
                        background: '#f3f4f6', padding: '3px 10px',
                        borderRadius: 999, whiteSpace: 'nowrap',
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
                          textTransform: 'uppercase', letterSpacing: 0.5,
                          marginBottom: 4,
                        }}>Diagnosis</div>
                        <div style={{
                          fontSize: 14, color: '#000', fontWeight: 'bold',
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
                          textTransform: 'uppercase', letterSpacing: 0.5,
                          marginBottom: 4,
                        }}>Prescription</div>
                        <div style={{
                          fontSize: 14, color: '#000', fontWeight: 'bold',
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
                      <div>
                        <div style={{
                          fontSize: 10, color: '#9ca3af', fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: 0.5,
                          marginBottom: 4,
                        }}>Notes</div>
                        <div style={{
                          fontSize: 14, color: '#000', fontWeight: 'bold',
                          whiteSpace: 'pre-wrap', lineHeight: 1.7,
                          background: 'white', padding: 10,
                          borderRadius: 6, border: '1px solid #e5e7eb',
                        }}>
                          {r.notes}
                        </div>
                      </div>
                    )}

                    {/* Legacy data — old records before new fields */}
                    {!r.diagnosis && r.data && (
                      <div>
                        <div style={{
                          fontSize: 10, color: '#9ca3af', fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: 0.5,
                          marginBottom: 4,
                        }}>Record Data</div>
                        <div style={{
                          fontSize: 14, color: '#000', fontWeight: 'bold',
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
                {recordsTotalPages > 1 && (
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: 12, marginTop: 16,
                  }}>
                    <button
                      onClick={() => loadRecords(recordsPage - 1)}
                      disabled={recordsPage === 1}
                      className="btn-secondary"
                      style={{ padding: '7px 16px', fontSize: 13 }}>
                      ← Previous
                    </button>
                    <span style={{
                      fontSize: 13, fontWeight: 700, color: '#374151',
                    }}>
                      Page {recordsPage} of {recordsTotalPages}
                    </span>
                    <button
                      onClick={() => loadRecords(recordsPage + 1)}
                      disabled={recordsPage === recordsTotalPages}
                      className="btn-secondary"
                      style={{ padding: '7px 16px', fontSize: 13 }}>
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── MESSAGES ── */}
        {tab === 'Messages' && (
          <MessagingPanel currentUserId={user?.user_id} />
        )}
      </main>

      {/* Modals */}
      {showLogout && (
        <LogoutModal
          onConfirm={handleLogout}
          onCancel={() => setShowLogout(false)}
        />
      )}
      {cancelTarget && (
        <ConfirmModal
          title="Cancel Appointment"
          message="Are you sure you want to cancel this appointment? The doctor and admin will be notified."
          onConfirm={confirmCancel}
          onCancel={() => setCancelTarget(null)}
        />
      )}
    </div>
  )
}