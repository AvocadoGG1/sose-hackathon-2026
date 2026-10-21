import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import './Pages.css'
import './GetFood.css'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

// this isntead of blank page if API can't be reached 
// same items as supabase, so still looks like real data (testing)
const FALLBACK_ITEMS = [
  { food_item_id: 'fallback-1', name: 'Rice', category: 'Grains', total_quantity: 5 },
  { food_item_id: 'fallback-2', name: 'Pasta', category: 'Grains', total_quantity: 5 },
  { food_item_id: 'fallback-3', name: 'Canned Beans', category: 'Canned Goods', total_quantity: 5 },
  { food_item_id: 'fallback-4', name: 'Canned Corn', category: 'Canned Goods', total_quantity: 5 },
  { food_item_id: 'fallback-5', name: 'Peanut Butter', category: 'Protein', total_quantity: 5 },
  { food_item_id: 'fallback-6', name: 'Apples', category: 'Produce', total_quantity: 5 },
  { food_item_id: 'fallback-7', name: 'Potatoes', category: 'Produce', total_quantity: 5 },
  { food_item_id: 'fallback-8', name: 'Bread', category: 'Bakery', total_quantity: 5 },
]

// one food item: name/category, how many are left, and cart controls.
// total_quantity is null when stock isn't tracked for an item
function FoodCard({ item, qtyInCart, onAdd, onRemove, highlighted }) {
  const available = item.total_quantity ?? null
  const maxedOut = available !== null && qtyInCart >= available

  return (
    <li className={highlighted ? 'food-card recommend-highlight' : 'food-card'}>
      <div className="food-card-top">
        <h3>{item.name}</h3>
        {item.category && <span className="food-pill">{item.category}</span>}
      </div>

      <p className="food-meta">
        {available !== null ? `${available} available` : 'Stock unknown'}
        {item.earliest_expiration && ` · best before ${item.earliest_expiration}`}
      </p>

      <div className="food-card-actions">
        {qtyInCart > 0 ? (
          // already in the cart - show a +/- stepper instead of  Add button.
          <div className="qty-stepper">
            <button type="button" onClick={() => onRemove(item)} aria-label={`Remove one ${item.name}`}>
              −
            </button>
            <span>{qtyInCart}</span>
            <button
              type="button"
              onClick={() => onAdd(item)}
              disabled={maxedOut}
              aria-label={`Add one more ${item.name}`}
            >
              +
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="add-btn"
            onClick={() => onAdd(item)}
            disabled={available === 0}
          >
            {available === 0 ? 'Out of stock' : 'Add to cart'}
          </button>
        )}
      </div>
    </li>
  )
}

function GetFood() {
  const [items, setItems] = useState([])
  // loads, 'offline' if the API couldn't be reached.
  const [status, setStatus] = useState('loading')
  const [cart, setCart] = useState({})
  // food_item_id of the card to briefly highlight after "Recommend food".
  const [recommendedId, setRecommendedId] = useState(null)

  // loads food list on mount 
  useEffect(() => {
    let cancelled = false

    fetch(`${API_BASE}/api/inventory`)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        setItems(data)
        setStatus('ready')
      })
      .catch(() => {
        if (cancelled) return
        setItems(FALLBACK_ITEMS)
        setStatus('offline')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const cartCount = useMemo(
    () => Object.values(cart).reduce((sum, qty) => sum + qty, 0),
    [cart],
  )

  function addToCart(item) {
    setCart((prev) => ({ ...prev, [item.food_item_id]: (prev[item.food_item_id] ?? 0) + 1 }))
  }

  function removeFromCart(item) {
    setCart((prev) => {
      const next = { ...prev }
      const qty = (next[item.food_item_id] ?? 0) - 1
      // drop the key entirely at zero
      if (qty <= 0) {
        delete next[item.food_item_id]
      } else {
        next[item.food_item_id] = qty
      }
      return next
    })
  }

  // adds one random item that still has stock left (accounts for what's already in the cart) to cart.
  function recommendFood() {
    const inStock = items.filter((item) => {
      const alreadyInCart = cart[item.food_item_id] ?? 0
      return item.total_quantity === null || item.total_quantity > alreadyInCart
    })
    if (inStock.length === 0) return

    const pick = inStock[Math.floor(Math.random() * inStock.length)]
    addToCart(pick)

    // highlights recommended ard
    setRecommendedId(pick.food_item_id)
    setTimeout(() => setRecommendedId((current) => (current === pick.food_item_id ? null : current)), 1600)
  }

  return (
    <section className="page food-page">
      <Link to="/" className="back-link">
        ← Back to Main Menu
      </Link>

      <h1>Get Food</h1>
      <p className="subtitle">Browse what's available and build your cart.</p>
    {/* checks for server */}
      {status === 'offline' && (
        <p className="offline-banner">
          Can't reach the server right now — showing example items instead.
        </p>
      )}

      <div className="food-toolbar">
        <button type="button" className="recommend-btn" onClick={recommendFood} disabled={status === 'loading'}>
          Recommend food
        </button>

        <div className="cart-summary">
          <span>Cart: {cartCount} item{cartCount === 1 ? '' : 's'}</span>
          {/* TODO - disabled until checkout page is done */}
          <button type="button" className="checkout-btn" disabled title="Checkout isn't built yet">
            Checkout
          </button>
        </div>
      </div>

      {status === 'loading' ? (
        <p className="subtitle">Loading food list…</p>
      ) : (
        <ul className="food-grid">
          {items.map((item) => (
            <FoodCard
              key={item.food_item_id}
              item={item}
              qtyInCart={cart[item.food_item_id] ?? 0}
              onAdd={addToCart}
              onRemove={removeFromCart}
              highlighted={recommendedId === item.food_item_id}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

export default GetFood
