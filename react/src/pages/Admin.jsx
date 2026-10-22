import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminFetch, fetchInventory, getAdminKey, PasscodeError, setAdminKey } from '../adminApi.js'
import { formatDate } from '../dates.js'
import { FOOD_GROUPS } from '../foodGroups.js'
import AdminTrendChart from './AdminTrendChart.jsx'
import './Pages.css'
import './Admin.css'

// Staff dashboard for the people running the pantry: pickups to hand out, stock,
// recent donations, trends and whether the scale is working.

const REFRESH_MS = 30_000
const LOW_STOCK = 2 // matches the Donate page's "We're low on"
const EXPIRING_DAYS = 7
const SCALE_ONLINE_MS = 10 * 60 * 1000
const DAY_MS = 86_400_000

const groupLabel = (key) => FOOD_GROUPS.find((group) => group.key === key)?.label ?? '—'

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function timeAgo(timestamp, now) {
  const seconds = Math.max(0, Math.round((now - new Date(timestamp).getTime()) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`
  if (seconds < 86_400) return `${Math.round(seconds / 3600)} h ago`
  return `${Math.round(seconds / 86_400)} d ago`
}

// '2026-10-25' -> whole days from today (negative = already past)
function daysUntil(date, now) {
  const [y, m, d] = date.split('-').map(Number)
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  return Math.round((new Date(y, m - 1, d) - today) / DAY_MS)
}

function itemList(items) {
  return items.map((item) => `${item.quantity}× ${item.food_items?.name ?? 'Unknown food'}`).join(', ')
}

function PasscodeScreen({ onSuccess }) {
  const [passcode, setPasscode] = useState('')
  const [status, setStatus] = useState('idle') // idle | checking | wrong | error
  const [errorMessage, setErrorMessage] = useState('')

  async function submit(event) {
    event.preventDefault()
    setStatus('checking')
    setAdminKey(passcode.trim())
    try {
      await adminFetch('/check')
      onSuccess()
    } catch (err) {
      setStatus(err instanceof PasscodeError ? 'wrong' : 'error')
      setErrorMessage(err.message)
    }
  }

  return (
    <section className="page admin-page admin-login">
      <Link to="/" className="back-link">
        ← Back to Main Menu
      </Link>
      <h1>Pantry Staff</h1>
      <p className="subtitle">Enter the staff passcode to see pickups, stock and donations.</p>
      <form className="admin-panel admin-login-form" onSubmit={submit}>
        <label htmlFor="admin-passcode">Staff passcode</label>
        <input
          id="admin-passcode"
          type="password"
          autoComplete="current-password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          required
        />
        {status === 'wrong' && <p className="admin-error">That passcode didn't work. Check ADMIN_KEY in server/.env.</p>}
        {status === 'error' && <p className="admin-error">Couldn't reach the server: {errorMessage}</p>}
        <button type="submit" className="checkout-btn" disabled={status === 'checking'}>
          {status === 'checking' ? 'Checking…' : 'Open dashboard'}
        </button>
      </form>
    </section>
  )
}

function Dashboard({ onSignOut }) {
  const [data, setData] = useState({ pickups: [], donations: [], inventory: [], trends: [], readings: [] })
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [errorMessage, setErrorMessage] = useState('')
  const [updatedAt, setUpdatedAt] = useState(null)
  const [now, setNow] = useState(() => Date.now())
  const [busyId, setBusyId] = useState(null) // the pickup/donation being changed
  const [confirmCancelId, setConfirmCancelId] = useState(null)
  // the donated item whose "rejected" count is being edited, and the typed value
  const [editingItem, setEditingItem] = useState(null) // { id, value }
  const [itemError, setItemError] = useState(null) // { id, message }

  const load = useCallback(
    () =>
      Promise.all([
        adminFetch('/pickups'),
        adminFetch('/donations'),
        fetchInventory(),
        adminFetch('/trends?days=14'),
        adminFetch('/scale-readings?limit=20'),
      ]).then(
        ([pickups, donations, inventory, trends, readings]) => {
          setData({ pickups, donations, inventory, trends, readings })
          setStatus('ready')
          setErrorMessage('')
          setUpdatedAt(Date.now())
        },
        (err) => {
          if (err instanceof PasscodeError) return onSignOut()
          setErrorMessage(err.message)
          setStatus('error')
        },
      ),
    [onSignOut],
  )

  // load now, then every 30 s; tick the clock every 10 s for the "x ago" labels
  useEffect(() => {
    load()
    const refresh = setInterval(load, REFRESH_MS)
    const clock = setInterval(() => setNow(Date.now()), 10_000)
    return () => {
      clearInterval(refresh)
      clearInterval(clock)
    }
  }, [load])

  async function setPickupStatus(id, newStatus) {
    setBusyId(`pickup-${id}`)
    try {
      await adminFetch(`/pickups/${id}`, { method: 'PATCH', body: { status: newStatus } })
      setConfirmCancelId(null)
      await load()
    } catch (err) {
      if (err instanceof PasscodeError) return onSignOut()
      setErrorMessage(err.message)
    } finally {
      setBusyId(null)
    }
  }

  // how many of one donated item are rejected (0 restores them all)
  async function saveRejected(itemId, rejectedQuantity) {
    setBusyId(`item-${itemId}`)
    setItemError(null)
    try {
      await adminFetch(`/donation-items/${itemId}`, { method: 'PATCH', body: { rejected_quantity: rejectedQuantity } })
      setEditingItem(null)
      await load()
    } catch (err) {
      if (err instanceof PasscodeError) return onSignOut()
      // e.g. "Only 2 Canned Beans are still in stock..." shown right under that item
      setItemError({ id: itemId, message: err.message })
    } finally {
      setBusyId(null)
    }
  }

  const { pickups, donations, inventory, trends, readings } = data
  // oldest first: whoever has waited longest is handed out first
  const waiting = pickups.filter((p) => p.status === 'submitted').sort((a, b) => a.created_at.localeCompare(b.created_at))
  const history = pickups.filter((p) => p.status !== 'submitted')
  const itemsInStock = inventory.reduce((sum, item) => sum + Math.max(item.total_quantity ?? 0, 0), 0)
  const donationsThisWeek = donations.filter(
    (d) => d.status === 'submitted' && now - new Date(d.created_at).getTime() < 7 * DAY_MS,
  ).length
  const expiring = inventory.filter(
    (item) => item.earliest_expiration && item.total_quantity > 0 && daysUntil(item.earliest_expiration, now) <= EXPIRING_DAYS,
  )
  const stock = [...inventory].sort((a, b) => (a.total_quantity ?? 0) - (b.total_quantity ?? 0) || a.name.localeCompare(b.name))

  // latest reading per scale
  const scales = Object.values(
    readings.reduce((latest, reading) => {
      if (!latest[reading.device_id]) latest[reading.device_id] = reading
      return latest
    }, {}),
  )

  return (
    <section className="page admin-page">
      <div className="admin-topbar">
        <Link to="/" className="back-link">
          ← Back to Main Menu
        </Link>
        <div className="admin-refresh">
          <span>{updatedAt ? `Updated ${timeAgo(updatedAt, now)}` : 'Loading…'}</span>
          <button type="button" className="admin-btn" onClick={load}>
            Refresh
          </button>
          <button type="button" className="admin-btn admin-btn-quiet" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </div>

      <h1>Pantry Dashboard</h1>

      {errorMessage && <p className="admin-error">{errorMessage}</p>}

      {status === 'loading' ? (
        <p className="subtitle">Loading…</p>
      ) : (
        <>
          <ul className="admin-tiles">
            <li className="admin-panel">
              <span className="admin-tile-label">Pickups waiting</span>
              <span className="admin-tile-value">{waiting.length}</span>
            </li>
            <li className="admin-panel">
              <span className="admin-tile-label">Items in stock</span>
              <span className="admin-tile-value">{itemsInStock}</span>
            </li>
            <li className="admin-panel">
              <span className="admin-tile-label">Donations, last 7 days</span>
              <span className="admin-tile-value">{donationsThisWeek}</span>
            </li>
            <li className="admin-panel">
              <span className="admin-tile-label">Expiring within {EXPIRING_DAYS} days</span>
              <span className="admin-tile-value">{expiring.length}</span>
            </li>
          </ul>

          <section className="admin-section">
            <h2>Pickups waiting</h2>
            {waiting.length === 0 ? (
              <p className="admin-empty">No pickups waiting. New checkouts from Get Food show up here.</p>
            ) : (
              <ul className="admin-list">
                {waiting.map((pickup) => (
                  <li key={pickup.id} className="admin-panel admin-row">
                    <div className="admin-row-main">
                      <h3>
                        #{pickup.id} {pickup.recipient_name}
                      </h3>
                      <p className="admin-meta">
                        {pickup.recipient_email} · ordered {formatTime(pickup.created_at)} ({timeAgo(pickup.created_at, now)})
                      </p>
                      <p>{itemList(pickup.pickup_items)}</p>
                      {pickup.notes && <p className="admin-note">“{pickup.notes}”</p>}
                    </div>
                    <div className="admin-row-actions">
                      {confirmCancelId === pickup.id ? (
                        <>
                          <span className="admin-meta">Cancel? The food goes back into stock.</span>
                          <button
                            type="button"
                            className="admin-btn admin-btn-danger"
                            disabled={busyId === `pickup-${pickup.id}`}
                            onClick={() => setPickupStatus(pickup.id, 'cancelled')}
                          >
                            Yes, cancel
                          </button>
                          <button type="button" className="admin-btn admin-btn-quiet" onClick={() => setConfirmCancelId(null)}>
                            Keep it
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="checkout-btn"
                            disabled={busyId === `pickup-${pickup.id}`}
                            onClick={() => setPickupStatus(pickup.id, 'picked_up')}
                          >
                            Mark picked up
                          </button>
                          <button type="button" className="admin-btn admin-btn-quiet" onClick={() => setConfirmCancelId(pickup.id)}>
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="admin-section">
            <h2>Stock</h2>
            <div className="admin-panel admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Food</th>
                    <th>Food group</th>
                    <th className="num">In stock</th>
                    <th className="num">Donated weight</th>
                    <th>Earliest best-before</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.map((item) => {
                    const left = item.total_quantity ?? 0
                    const days = item.earliest_expiration ? daysUntil(item.earliest_expiration, now) : null
                    return (
                      <tr key={item.food_item_id}>
                        <td>
                          {item.name}
                          {item.category && <span className="admin-muted"> · {item.category}</span>}
                        </td>
                        <td>{groupLabel(item.food_group)}</td>
                        <td className="num">{left}</td>
                        <td className="num">{Number(item.total_weight_grams) > 0 ? `${Number(item.total_weight_grams).toLocaleString()} g` : '—'}</td>
                        <td>{item.earliest_expiration ? formatDate(item.earliest_expiration) : '—'}</td>
                        <td>
                          <div className="admin-pills">
                            {left <= 0 && <span className="admin-pill pill-bad">Out of stock</span>}
                            {left > 0 && left <= LOW_STOCK && <span className="admin-pill pill-warn">Low</span>}
                            {left > 0 && days != null && days < 0 && <span className="admin-pill pill-bad">Expired</span>}
                            {left > 0 && days != null && days >= 0 && days <= EXPIRING_DAYS && (
                              <span className="admin-pill pill-warn">Expires in {days} d</span>
                            )}
                            {left > LOW_STOCK && (days == null || days > EXPIRING_DAYS) && <span className="admin-pill pill-good">OK</span>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="admin-section">
            <h2>Last 14 days</h2>
            <div className="admin-panel">
              <AdminTrendChart data={trends} />
            </div>
          </section>

          <section className="admin-section">
            <h2>Recent donations</h2>
            {donations.length === 0 ? (
              <p className="admin-empty">No donations yet.</p>
            ) : (
              <ul className="admin-list">
                {donations.map((donation) => {
                  const allRejected = donation.donation_items.every((item) => item.rejected_quantity >= item.quantity)
                  return (
                    <li key={donation.id} className={allRejected ? 'admin-panel admin-row admin-row-rejected' : 'admin-panel admin-row'}>
                      <div className="admin-row-main">
                        <h3>
                          #{donation.id} {donation.donor_name || 'Anonymous'}
                          {allRejected && <span className="admin-pill pill-bad">All rejected</span>}
                        </h3>
                        <p className="admin-meta">
                          {formatTime(donation.created_at)}
                          {donation.donor_email && ` · ${donation.donor_email}`}
                        </p>
                        <ul className="admin-donation-items">
                          {donation.donation_items.map((item) => {
                            const name = item.food_items?.name ?? 'Unknown food'
                            const editing = editingItem?.id === item.id
                            const busy = busyId === `item-${item.id}`
                            return (
                              <li key={item.id}>
                                <div className="admin-item-line">
                                  <span>
                                    {item.quantity}× {name}
                                    {item.weight_grams != null && ` · ${Number(item.weight_grams)} g`}
                                    {item.scale_reading_id != null && <span className="admin-pill pill-scale">scale</span>}
                                    {item.expiration_date && <span className="admin-muted"> · best before {formatDate(item.expiration_date)}</span>}
                                    {item.rejected_quantity > 0 && (
                                      <span className="admin-pill pill-bad">{item.rejected_quantity} rejected</span>
                                    )}
                                  </span>

                                  {editing ? (
                                    <form
                                      className="admin-reject-form"
                                      onSubmit={(e) => {
                                        e.preventDefault()
                                        saveRejected(item.id, Number(editingItem.value))
                                      }}
                                    >
                                      <label htmlFor={`reject-${item.id}`}>Rejected</label>
                                      <input
                                        id={`reject-${item.id}`}
                                        type="number"
                                        min="0"
                                        max={item.quantity}
                                        step="1"
                                        value={editingItem.value}
                                        onChange={(e) => setEditingItem({ id: item.id, value: e.target.value })}
                                        required
                                      />
                                      <span className="admin-muted">of {item.quantity}</span>
                                      <button type="submit" className="admin-btn" disabled={busy}>
                                        Save
                                      </button>
                                      <button
                                        type="button"
                                        className="admin-btn admin-btn-quiet"
                                        onClick={() => {
                                          setEditingItem(null)
                                          setItemError(null)
                                        }}
                                      >
                                        Cancel
                                      </button>
                                    </form>
                                  ) : (
                                    <span className="admin-item-actions">
                                      <button
                                        type="button"
                                        className="admin-link-btn"
                                        onClick={() => {
                                          setEditingItem({ id: item.id, value: String(item.rejected_quantity || 1) })
                                          setItemError(null)
                                        }}
                                      >
                                        {item.rejected_quantity > 0 ? 'Change rejected' : 'Reject some'}
                                      </button>
                                      {item.rejected_quantity > 0 && (
                                        <button type="button" className="admin-link-btn" disabled={busy} onClick={() => saveRejected(item.id, 0)}>
                                          Restore all
                                        </button>
                                      )}
                                    </span>
                                  )}
                                </div>
                                {itemError?.id === item.id && <p className="admin-error admin-item-error">{itemError.message}</p>}
                              </li>
                            )
                          })}
                        </ul>
                        {donation.notes && <p className="admin-note">“{donation.notes}”</p>}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className="admin-section">
            <h2>Scale</h2>
            {scales.length === 0 ? (
              <p className="admin-empty">No scale readings yet. Readings appear when food settles on the scale (or from npm run fake-scale).</p>
            ) : (
              <ul className="admin-list">
                {scales.map((reading) => {
                  const online = now - new Date(reading.recorded_at).getTime() < SCALE_ONLINE_MS
                  return (
                    <li key={reading.device_id} className="admin-panel admin-row">
                      <div className="admin-row-main">
                        <h3>
                          {reading.device_id}
                          <span className={online ? 'admin-pill pill-good' : 'admin-pill pill-quiet'}>
                            {online ? 'Active' : 'Idle'}
                          </span>
                        </h3>
                        <p className="admin-meta">
                          Last reading {Number(reading.weight_grams)} g, {timeAgo(reading.recorded_at, now)}. Active means a
                          reading in the last 10 minutes.
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <details className="admin-section admin-history">
            <summary>
              <h2>Pickup history ({history.length})</h2>
            </summary>
            {history.length === 0 ? (
              <p className="admin-empty">Picked-up and cancelled pickups show up here.</p>
            ) : (
              <ul className="admin-list">
                {history.map((pickup) => (
                  <li key={pickup.id} className="admin-panel admin-row">
                    <div className="admin-row-main">
                      <h3>
                        #{pickup.id} {pickup.recipient_name}
                        <span className={pickup.status === 'picked_up' ? 'admin-pill pill-good' : 'admin-pill pill-quiet'}>
                          {pickup.status === 'picked_up' ? 'Picked up' : 'Cancelled'}
                        </span>
                      </h3>
                      <p className="admin-meta">ordered {formatTime(pickup.created_at)}</p>
                      <p>{itemList(pickup.pickup_items)}</p>
                    </div>
                    <div className="admin-row-actions">
                      <button
                        type="button"
                        className="admin-btn admin-btn-quiet"
                        disabled={busyId === `pickup-${pickup.id}`}
                        onClick={() => setPickupStatus(pickup.id, 'submitted')}
                      >
                        Move back to waiting
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </details>
        </>
      )}
    </section>
  )
}

function Admin() {
  const [signedIn, setSignedIn] = useState(() => Boolean(getAdminKey()))

  const signOut = useCallback(() => {
    setAdminKey(null)
    setSignedIn(false)
  }, [])

  return signedIn ? <Dashboard onSignOut={signOut} /> : <PasscodeScreen onSuccess={() => setSignedIn(true)} />
}

export default Admin
