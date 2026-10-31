import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDate, isoDateFromToday, MIN_DAYS_BEFORE_EXPIRY } from '../dates.js'
import { FOOD_GROUPS, groupsInStock, listGroups } from '../foodGroups.js'
import { useLanguage } from '../i18n.jsx'
import './Pages.css'
import './GetFood.css'
import './Checkout.css'
import './DonateFood.css'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

// which ESP32 scale this page reads (matches STATION in firmware/scale_station)
const STATION = 'intake-1'
// readings older than this are ignored, so yesterday's weight doesn't show up
const READING_MAX_AGE_MS = 10 * 60 * 1000

function secondsAgo(timestamp) {
  return Math.max(0, Math.round((Date.now() - new Date(timestamp).getTime()) / 1000))
}

// polls the scale every 2 s and returns its latest recent reading (or null).
// onNewReading runs once for each reading that arrives while the page is open
// (the ESP32 posts one every time a weight settles). Whatever reading was already
// there when the page opened doesn't count, so a leftover weight is never auto-added.
function useLatestScaleReading(onNewReading) {
  const [reading, setReading] = useState(null)
  const lastSeenIdRef = useRef(undefined) // undefined = haven't polled yet
  const onNewReadingRef = useRef(onNewReading)

  useEffect(() => {
    onNewReadingRef.current = onNewReading
  })

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const res = await fetch(`${API_BASE}/api/scale-reading/latest?station=${STATION}`)
        const data = res.ok ? await res.json() : null
        if (cancelled) return
        const fresh = data && Date.now() - new Date(data.recorded_at).getTime() < READING_MAX_AGE_MS
        setReading(fresh ? data : null)

        if (lastSeenIdRef.current === undefined) {
          lastSeenIdRef.current = data?.id ?? null
        } else if (data && data.id !== lastSeenIdRef.current) {
          lastSeenIdRef.current = data.id
          onNewReadingRef.current(data)
        }
      } catch {
        if (!cancelled) setReading(null)
      }
    }

    poll()
    const timer = setInterval(poll, 2000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  return reading
}

// foods at or below this many items count as running low
const LOW_STOCK = 2

// "We're low on": the lowest-stock foods, plus food groups with nothing left.
// Tapping a food picks it in the form. Hidden when nothing is low.
function MostNeeded({ foodItems, onPick }) {
  const { t, food } = useLanguage()
  const low = foodItems
    .filter((item) => item.total_quantity != null && item.total_quantity <= LOW_STOCK)
    .sort((a, b) => a.total_quantity - b.total_quantity)
    .slice(0, 4)
  // only groups the pantry has foods for, so donors can actually pick one
  const listedGroups = new Set(foodItems.map((item) => item.food_group).filter(Boolean))
  const stocked = new Set(groupsInStock(foodItems).map((group) => group.key))
  const emptyGroups = FOOD_GROUPS.filter((group) => listedGroups.has(group.key) && !stocked.has(group.key))

  if (low.length === 0 && emptyGroups.length === 0) return null

  return (
    <div className="most-needed">
      <span className="scale-label">{t('lowOn')}</span>
      <ul className="most-needed-list">
        {low.map((item) => (
          <li key={item.food_item_id}>
            <button type="button" onClick={() => onPick(item)}>
              {food(item.name)} <span>{item.total_quantity === 0 ? t('noneLeft') : t('left', item.total_quantity)}</span>
            </button>
          </li>
        ))}
      </ul>
      {emptyGroups.length > 0 && <p>{t('nothingLeftIn', listGroups(emptyGroups, t))}</p>}
    </div>
  )
}

const EMPTY_ENTRY ={ foodItemId: '', quantity: 1, expirationDate: '', weightGrams: '', scaleReadingId: null }

function DonateFood() {
  const { t, food: foodName, code } = useLanguage()
  const [foodItems, setFoodItems] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | offline | submitting | done | error
  const [errorMessage, setErrorMessage] = useState('')
  // shown under the form when a best-before date is too close
  const [dateError, setDateError] = useState('')
  const [donationId, setDonationId] = useState(null)

  // the item being filled in, and the list of items already added to this donation
  const [entry, setEntry] = useState(EMPTY_ENTRY)
  const [donationItems, setDonationItems] = useState([])
  const [donorName, setDonorName] = useState('')
  const [donorEmail, setDonorEmail] = useState('')
  const [notes, setNotes] = useState('')
  // short message after the scale adds or fills in something
  const [scaleMessage, setScaleMessage] = useState('')

  const scaleReading = useLatestScaleReading(handleNewReading)

  // food list for the dropdown (same endpoint as Get Food)
  useEffect(() => {
    let cancelled = false

    fetch(`${API_BASE}/api/inventory`)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        setFoodItems(data)
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('offline')
      })

    return () => {
      cancelled = true
    }
  }, [])

  function updateEntry(changes) {
    setEntry((prev) => ({ ...prev, ...changes }))
  }

  function applyScaleWeight() {
    updateEntry({ weightGrams: String(Number(scaleReading.weight_grams)), scaleReadingId: scaleReading.id })
  }

  // best-before dates earlier than this are refused (no food that's about to expire)
  const earliestBestBefore = isoDateFromToday(MIN_DAYS_BEFORE_EXPIRY)
  const tooSoonMessage = t('tooSoon', formatDate(earliestBestBefore, code))
  const expiresTooSoon = (date) => Boolean(date) && date < earliestBestBefore

  function findFood(foodItemId) {
    return foodItems.find((item) => String(item.food_item_id) === foodItemId)
  }

  function pushItem(fromEntry, food) {
    setDonationItems((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        food,
        quantity: Number(fromEntry.quantity) || 1,
        expirationDate: fromEntry.expirationDate,
        weightGrams: fromEntry.weightGrams === '' ? null : Number(fromEntry.weightGrams),
        scaleReadingId: fromEntry.scaleReadingId,
      },
    ])
    setEntry(EMPTY_ENTRY)
  }

  function addItem(event) {
    event.preventDefault()
    if (expiresTooSoon(entry.expirationDate)) {
      setDateError(tooSoonMessage)
      return
    }
    const food = findFood(entry.foodItemId)
    if (food) pushItem(entry, food)
  }

  // a weight just settled on the scale: if a food is already chosen, add it to the
  // list straight away; otherwise fill in the weight and wait for the food.
  function handleNewReading(reading) {
    if (status === 'submitting' || status === 'done') return
    const weightGrams = String(Number(reading.weight_grams))
    const food = findFood(entry.foodItemId)

    if (food && expiresTooSoon(entry.expirationDate)) {
      // don't auto-add food that's about to expire; keep the weight in case the date was a typo
      updateEntry({ weightGrams, scaleReadingId: reading.id })
      setDateError(tooSoonMessage)
      setScaleMessage(t('weighedTooSoon', weightGrams, foodName(food.name)))
    } else if (food) {
      pushItem({ ...entry, weightGrams, scaleReadingId: reading.id }, food)
      setScaleMessage(t('scaleAdded', foodName(food.name), weightGrams))
    } else {
      updateEntry({ weightGrams, scaleReadingId: reading.id })
      setScaleMessage(t('scaleWeighed', weightGrams))
    }
  }

  function removeItem(key) {
    setDonationItems((prev) => prev.filter((item) => item.key !== key))
  }

  async function submitDonation(event) {
    event.preventDefault()
    setStatus('submitting')
    setErrorMessage('')

    try {
      const res = await fetch(`${API_BASE}/api/donations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: donationItems.map((item) => ({
            food_item_id: item.food.food_item_id,
            quantity: item.quantity,
            weight_grams: item.weightGrams,
            expiration_date: item.expirationDate || null,
            scale_reading_id: item.scaleReadingId,
          })),
          donorName,
          donorEmail,
          notes: notes || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Request failed: ${res.status}`)

      setDonationId(data.donation_id)
      setStatus('done')
    } catch (err) {
      setErrorMessage(err.message)
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <section className="page checkout-page">
        <div className="checkout-confirmation">
          <h1>{t('thankYou')}</h1>
          <p className="subtitle">{t('donationReceived', donationId)}</p>
          <Link to="/" className="checkout-submit-btn">
            {t('backToMenuPlain')}
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="page food-page">
      <Link to="/" className="back-link">
        {t('backToMenu')}
      </Link>

      <h1>{t('donateFood')}</h1>
      <p className="subtitle">{t('donateSubtitle')}</p>

      {status === 'offline' && (
        <p className="offline-banner">{t('offlineDonate')}</p>
      )}

      <MostNeeded
        foodItems={foodItems}
        onPick={(item) => updateEntry({ foodItemId: String(item.food_item_id) })}
      />

      <div className="scale-panel">
        <span className="scale-label">{t('scale')}</span>
        {scaleReading ? (
          <>
            <span className="scale-weight">{Number(scaleReading.weight_grams)} g</span>
            <span className="scale-age">{t('secondsAgo', secondsAgo(scaleReading.recorded_at))}</span>
            <button type="button" className="checkout-btn" onClick={applyScaleWeight}>
              {t('useThisWeight')}
            </button>
          </>
        ) : (
          <span className="scale-age">{t('placeOnScale')}</span>
        )}
        {scaleMessage && (
          <p className="scale-message" role="status">
            {scaleMessage}
          </p>
        )}
      </div>

      <form className="checkout-form donate-entry" onSubmit={addItem}>
        <label>
          {t('food')}
          <select
            value={entry.foodItemId}
            onChange={(e) => updateEntry({ foodItemId: e.target.value })}
            required
            disabled={status === 'loading' || status === 'offline'}
          >
            <option value="">{status === 'loading' ? t('loading') : t('chooseItem')}</option>
            {foodItems.map((item) => (
              <option key={item.food_item_id} value={String(item.food_item_id)}>
                {foodName(item.name)}
              </option>
            ))}
          </select>
        </label>

        <div className="donate-row">
          <label>
            {t('quantity')}
            <input
              type="number"
              min="1"
              step="1"
              value={entry.quantity}
              onChange={(e) => updateEntry({ quantity: e.target.value })}
              required
            />
          </label>

          <label>
            {t('weightOptional')}
            <input
              type="number"
              min="0"
              step="0.1"
              value={entry.weightGrams}
              // typing a weight by hand means it didn't come from the scale
              onChange={(e) => updateEntry({ weightGrams: e.target.value, scaleReadingId: null })}
              placeholder={scaleReading ? t('useScaleAbove') : ''}
            />
          </label>

          <label>
            {t('bestBeforeOptional')}
            <input
              type="date"
              min={earliestBestBefore}
              value={entry.expirationDate}
              onChange={(e) => {
                e.target.setCustomValidity('')
                setDateError('')
                updateEntry({ expirationDate: e.target.value })
              }}
              // the browser blocks dates before `min`; show our message instead of its generic one
              onInvalid={(e) => {
                e.target.setCustomValidity(tooSoonMessage)
                setDateError(tooSoonMessage)
              }}
            />
          </label>
        </div>

        {dateError && (
          <p className="checkout-error" role="alert">
            {dateError}
          </p>
        )}

        <button type="submit" className="recommend-btn donate-add-btn" disabled={status === 'loading' || status === 'offline'}>
          {t('addToDonation')}
        </button>
      </form>

      {donationItems.length > 0 && (
        <>
          <h2 className="visually-hidden">{t('itemsInDonation')}</h2>
          <ul className="checkout-list donate-list">
            {donationItems.map((item) => (
              <li key={item.key} className="checkout-line">
                <div className="checkout-line-info">
                  <h3>{foodName(item.food.name)}</h3>
                  {item.food.category && <span className="food-pill">{foodName(item.food.category)}</span>}
                </div>
                <div className="checkout-line-actions">
                  <span className="donate-line-meta">
                    ×{item.quantity}
                    {item.weightGrams != null && ` · ${item.weightGrams} g`}
                    {item.scaleReadingId != null && t('fromScale')}
                    {item.expirationDate && ` · ${t('bestBefore', formatDate(item.expirationDate, code))}`}
                  </span>
                  <button type="button" className="checkout-remove-btn" onClick={() => removeItem(item.key)}>
                    {t('remove')}
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <form className="checkout-form" onSubmit={submitDonation}>
            <label>
              {t('yourNameOptional')}
              <input type="text" value={donorName} onChange={(e) => setDonorName(e.target.value)} />
            </label>

            <label>
              {t('emailOptional')}
              <input
                type="email"
                value={donorEmail}
                onChange={(e) => setDonorEmail(e.target.value)}
                placeholder={t('emailPlaceholder')}
              />
            </label>

            <label>
              {t('notesOptional')}
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>

            {status === 'error' && (
              <p className="checkout-error" role="alert">
                {errorMessage}
              </p>
            )}

            <button type="submit" className="checkout-submit-btn" disabled={status === 'submitting'}>
              {status === 'submitting' ? t('submitting') : t('submitDonation')}
            </button>
          </form>
        </>
      )}
    </section>
  )
}

export default DonateFood
