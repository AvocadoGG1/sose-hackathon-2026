import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Cart, useCart } from '../cart.js'
import { missingGroups } from '../foodGroups.js'
import FoodGroupCheck from '../FoodGroupCheck.jsx'
import './Pages.css'
import './GetFood.css'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

// this isntead of blank page if API can't be reached 
// same items as supabase, so still looks like real data (testing)
const FALLBACK_ITEMS = [
  { food_item_id: 'fallback-1', name: 'Apples', category: 'Produce', food_group: 'fruits', total_quantity: 2 },
  { food_item_id: 'fallback-2', name: 'Bread', category: 'Bakery', food_group: 'grains', total_quantity: 2 },
  { food_item_id: 'fallback-3', name: 'Canned Beans', category: 'Canned Goods', food_group: 'protein', total_quantity: 11 },
  { food_item_id: 'fallback-4', name: 'Canned Corn', category: 'Canned Goods', food_group: 'vegetables', total_quantity: 8 },
  { food_item_id: 'fallback-5', name: 'Canned Tuna', category: 'Canned Goods', food_group: 'protein', total_quantity: 6 },
  { food_item_id: 'fallback-6', name: 'Fruit Cups', category: 'Snacks', food_group: 'fruits', total_quantity: 3 },
  { food_item_id: 'fallback-7', name: 'Oatmeal', category: 'Breakfast', food_group: 'grains', total_quantity: 6 },
  { food_item_id: 'fallback-8', name: 'Pasta', category: 'Grains', food_group: 'grains', total_quantity: 9 },
  { food_item_id: 'fallback-9', name: 'Peanut Butter', category: 'Protein', food_group: 'protein', total_quantity: 1 },
  { food_item_id: 'fallback-10', name: 'Potatoes', category: 'Produce', food_group: 'vegetables', total_quantity: 4 },
  { food_item_id: 'fallback-11', name: 'Rice', category: 'Grains', food_group: 'grains', total_quantity: 14 },
  { food_item_id: 'fallback-12', name: 'Shelf-Stable Milk', category: 'Dairy', food_group: 'dairy', total_quantity: 0 },
]

// one food item: name/category, how many are left, and cart controls.
// total_quantity is null when stock isn't tracked for an item
function FoodCard({ item, qtyInCart, onAdd, onRemove, highlighted }) {
  // never show negative stock, even if the database view hasn't been updated yet
  const available = item.total_quantity == null ? null : Math.max(item.total_quantity, 0)
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
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  // loads, 'offline' if the API couldn't be reached.
  const [status, setStatus] = useState('loading')
  // cart lives in cart.js (saved to localStorage), so it survives a refresh
  // and Checkout reads the same one.
  const cartLines = useCart()
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
        // update stock numbers for anything already in the saved cart
        Cart.refreshItems(data)
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

  const cartCount = cartLines.reduce((sum, line) => sum + line.quantity, 0)

  function qtyInCart(item) {
    return cartLines.find((line) => String(line.item.food_item_id) === String(item.food_item_id))?.quantity ?? 0
  }

  function goToCheckout() {
    navigate('/checkout')
  }

  function addToCart(item) {
    Cart.add(item)
  }

  function removeFromCart(item) {
    Cart.removeOne(item.food_item_id)
  }

  // adds one item that still has stock left (accounts for what's already in the cart) to cart.
  // picks from a food group the cart is missing first; random among those, or among
  // everything once the cart covers every group.
  function recommendFood() {
    const inStock = items.filter((item) => {
      const alreadyInCart = qtyInCart(item)
      return item.total_quantity == null || item.total_quantity > alreadyInCart
    })
    if (inStock.length === 0) return

    const missing = new Set(missingGroups(cartLines, items).map((group) => group.key))
    const fillsGap = inStock.filter((item) => missing.has(item.food_group))
    const pool = fillsGap.length > 0 ? fillsGap : inStock
    const pick = pool[Math.floor(Math.random() * pool.length)]
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
          <button type="button" className="checkout-btn" onClick={goToCheckout} disabled={cartCount === 0}>
            Checkout
          </button>
        </div>
      </div>

      <FoodGroupCheck
        lines={cartLines}
        items={items}
        hint='"Recommend food" picks something from a missing group.'
      />

      {status === 'loading' ? (
        <p className="subtitle">Loading food list…</p>
      ) : (
        <ul className="food-grid">
          {items.map((item) => (
            <FoodCard
              key={item.food_item_id}
              item={item}
              qtyInCart={qtyInCart(item)}
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
