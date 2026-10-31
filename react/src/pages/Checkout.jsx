import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cart, useCart } from '../cart.js'
import FoodGroupCheck from '../FoodGroupCheck.jsx'
import { useLanguage } from '../i18n.jsx'
import './Pages.css'
import './Checkout.css'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

function Checkout() {
  // same cart as Get Food: [{ item, quantity }], saved to localStorage by cart.js,
  // so a refresh or direct visit still shows it.
  const lines = useCart()
  const { t, food } = useLanguage()
  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('idle') // idle | submitting | done | error
  const [errorMessage, setErrorMessage] = useState('')
  const [pickupId, setPickupId] = useState(null)
  // inventory, only for the food-group check (which groups are in stock to suggest)
  const [inventory, setInventory] = useState([])

  useEffect(() => {
    let cancelled = false
    fetch(`${API_BASE}/api/inventory`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) setInventory(data)
      })
      .catch(() => {
        // offline: the check falls back to the cart's own items and just skips the warning
      })
    return () => {
      cancelled = true
    }
  }, [])

  const totalCount = lines.reduce((sum, line) => sum + line.quantity, 0)

  function updateQuantity(foodItemId, delta) {
    Cart.setQuantity(foodItemId, Cart.quantityOf(foodItemId) + delta)
  }

  function removeLine(foodItemId) {
    Cart.remove(foodItemId)
  }

  async function submitOrder(event) {
    event.preventDefault()
    setStatus('submitting')
    setErrorMessage('')

    try {
      const res = await fetch(`${API_BASE}/api/pickups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: lines.map((line) => ({
            food_item_id: line.item.food_item_id,
            quantity: line.quantity,
          })),
          recipientName,
          recipientEmail,
          notes: notes || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Request failed: ${res.status}`)

      setPickupId(data.pickup_id)
      setStatus('done')
      Cart.clear()
    } catch (err) {
      setErrorMessage(err.message)
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <section className="page checkout-page">
        <div className="checkout-confirmation">
          <h1>{t('pickupConfirmed')}</h1>
          <p className="subtitle">{t('orderReady', pickupId)}</p>
          <Link to="/" className="checkout-submit-btn">
            {t('backToMenuPlain')}
          </Link>
        </div>
      </section>
    )
  }

  if (lines.length === 0) {
    return (
      <section className="page checkout-page">
        <Link to="/get-food" className="back-link">
          {t('backToGetFood')}
        </Link>
        <h1>{t('checkout')}</h1>
        <p className="subtitle">{t('cartEmpty')}</p>
      </section>
    )
  }

  return (
    <section className="page checkout-page">
      <Link to="/get-food" className="back-link">
        {t('backToGetFood')}
      </Link>

      <h1>{t('checkout')}</h1>
      <p className="subtitle">{t('reviewOrder')}</p>

      <h2 className="visually-hidden">{t('yourCart')}</h2>
      <ul className="checkout-list">
        {lines.map(({ item, quantity }) => (
          <li key={item.food_item_id} className="checkout-line">
            <div className="checkout-line-info">
              <h3>{food(item.name)}</h3>
              {item.category && <span className="food-pill">{food(item.category)}</span>}
            </div>

            <div className="checkout-line-actions">
              <div className="qty-stepper">
                <button
                  type="button"
                  onClick={() => updateQuantity(item.food_item_id, -1)}
                  aria-label={t('removeOne', food(item.name))}
                >
                  −
                </button>
                <span>{quantity}</span>
                <button
                  type="button"
                  onClick={() => updateQuantity(item.food_item_id, 1)}
                  disabled={item.total_quantity != null && quantity >= item.total_quantity}
                  aria-label={t('addOneMore', food(item.name))}
                >
                  +
                </button>
              </div>
              <button
                type="button"
                className="checkout-remove-btn"
                onClick={() => removeLine(item.food_item_id)}
              >
                {t('remove')}
              </button>
            </div>
          </li>
        ))}
      </ul>

      <FoodGroupCheck
        lines={lines}
        items={inventory.length > 0 ? inventory : lines.map((line) => line.item)}
        hint={<Link to="/get-food">{t('goBackToAdd')}</Link>}
      />

      <p className="checkout-total">
        {t('total', totalCount)}
      </p>

      <form className="checkout-form" onSubmit={submitOrder}>
        <label>
          {t('name')}
          <input
            type="text"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder={t('namePlaceholder')}
            required
          />
        </label>

        <label>
          {t('email')}
          <input
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder={t('emailPlaceholder')}
            required
          />
        </label>

        <label>
          {t('notesOptional')}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('notesPlaceholder')}
          />
        </label>

        {status === 'error' && (
          <p className="checkout-error" role="alert">
            {errorMessage}
          </p>
        )}

        <button type="submit" className="checkout-submit-btn" disabled={status === 'submitting'}>
          {status === 'submitting' ? t('confirming') : t('confirmPickup')}
        </button>
      </form>
    </section>
  )
}

export default Checkout
