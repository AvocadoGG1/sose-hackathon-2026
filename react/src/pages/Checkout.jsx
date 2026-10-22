import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cart, useCart } from '../cart.js'
import FoodGroupCheck from '../FoodGroupCheck.jsx'
import './Pages.css'
import './Checkout.css'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

function Checkout() {
  // same cart as Get Food: [{ item, quantity }], saved to localStorage by cart.js,
  // so a refresh or direct visit still shows it.
  const lines = useCart()
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
          <h1>Pickup confirmed!</h1>
          <p className="subtitle">
            Order #{pickupId} is ready. Bring this confirmation when you pick up your food.
          </p>
          <Link to="/" className="checkout-submit-btn">
            Back to Main Menu
          </Link>
        </div>
      </section>
    )
  }

  if (lines.length === 0) {
    return (
      <section className="page checkout-page">
        <Link to="/get-food" className="back-link">
          ← Back to Get Food
        </Link>
        <h1>Checkout</h1>
        <p className="subtitle">Your cart is empty. Add some items on the Get Food page first.</p>
      </section>
    )
  }

  return (
    <section className="page checkout-page">
      <Link to="/get-food" className="back-link">
        ← Back to Get Food
      </Link>

      <h1>Checkout</h1>
      <p className="subtitle">Review your order before confirming pickup.</p>

      <ul className="checkout-list">
        {lines.map(({ item, quantity }) => (
          <li key={item.food_item_id} className="checkout-line">
            <div className="checkout-line-info">
              <h3>{item.name}</h3>
              {item.category && <span className="food-pill">{item.category}</span>}
            </div>

            <div className="checkout-line-actions">
              <div className="qty-stepper">
                <button
                  type="button"
                  onClick={() => updateQuantity(item.food_item_id, -1)}
                  aria-label={`Remove one ${item.name}`}
                >
                  −
                </button>
                <span>{quantity}</span>
                <button
                  type="button"
                  onClick={() => updateQuantity(item.food_item_id, 1)}
                  disabled={item.total_quantity != null && quantity >= item.total_quantity}
                  aria-label={`Add one more ${item.name}`}
                >
                  +
                </button>
              </div>
              <button
                type="button"
                className="checkout-remove-btn"
                onClick={() => removeLine(item.food_item_id)}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      <FoodGroupCheck
        lines={lines}
        items={inventory.length > 0 ? inventory : lines.map((line) => line.item)}
        hint={<Link to="/get-food">Go back to Get Food to add some.</Link>}
      />

      <p className="checkout-total">
        Total: {totalCount} item{totalCount === 1 ? '' : 's'}
      </p>

      <form className="checkout-form" onSubmit={submitOrder}>
        <label>
          Name
          <input
            type="text"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="Who's picking this up?"
            required
          />
        </label>

        <label>
          Email
          <input
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>

        <label>
          Notes (optional)
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything we should know?"
          />
        </label>

        {status === 'error' && <p className="checkout-error">{errorMessage}</p>}

        <button type="submit" className="checkout-submit-btn" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Confirming…' : 'Confirm pickup'}
        </button>
      </form>
    </section>
  )
}

export default Checkout
