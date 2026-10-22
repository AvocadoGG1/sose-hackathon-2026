// The Get Food cart, saved to localStorage so it survives a refresh and is shared
// between the Get Food and Checkout pages.
//
// The cart is a list of lines: [{ item, quantity }], where item is a row from
// GET /api/inventory ({ food_item_id, name, category, total_quantity, ... }).
//
// In a component:
//   const lines = useCart()        // re-renders whenever the cart changes
//   Cart.add(item)                 // one more of this item
//   Cart.removeOne(item.food_item_id)

import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'haxagon-cart'

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return Array.isArray(saved)
      ? saved.filter((line) => line?.item?.food_item_id != null && line.quantity > 0)
      : []
  } catch {
    // Nothing saved yet, bad JSON, or storage blocked (some private windows).
    return []
  }
}

let lines = load()
const listeners = new Set()

// Every change makes a new array, so React can tell the cart changed.
function setLines(next) {
  lines = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
  } catch {
    // Storage blocked or full: the cart still works, it just won't survive a refresh.
  }
  listeners.forEach((listener) => listener())
}

// Keep carts in sync when the site is open in more than one tab.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return
    lines = load()
    listeners.forEach((listener) => listener())
  })
}

const sameId = (a, b) => String(a) === String(b)

export const Cart = {
  quantityOf(foodItemId) {
    return lines.find((line) => sameId(line.item.food_item_id, foodItemId))?.quantity ?? 0
  },

  add(item) {
    if (Cart.quantityOf(item.food_item_id) === 0) {
      setLines([...lines, { item, quantity: 1 }])
    } else {
      Cart.setQuantity(item.food_item_id, Cart.quantityOf(item.food_item_id) + 1)
    }
  },

  removeOne(foodItemId) {
    Cart.setQuantity(foodItemId, Cart.quantityOf(foodItemId) - 1)
  },

  // Setting a quantity to 0 or less removes the line.
  setQuantity(foodItemId, quantity) {
    setLines(
      lines
        .map((line) => (sameId(line.item.food_item_id, foodItemId) ? { ...line, quantity } : line))
        .filter((line) => line.quantity > 0),
    )
  },

  remove(foodItemId) {
    setLines(lines.filter((line) => !sameId(line.item.food_item_id, foodItemId)))
  },

  clear() {
    setLines([])
  },

  // Swap in fresh item details (stock, expiration) after the live inventory loads,
  // and drop items that no longer exist. Don't call this with the offline example
  // items, or it would empty a real cart.
  refreshItems(items) {
    const byId = new Map(items.map((item) => [String(item.food_item_id), item]))
    setLines(
      lines
        .filter((line) => byId.has(String(line.item.food_item_id)))
        .map((line) => ({ ...line, item: byId.get(String(line.item.food_item_id)) })),
    )
  },

  // Calls listener after every change. Returns a function that stops listening.
  subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

// React hook: returns the cart lines and re-renders the component when they change.
export function useCart() {
  return useSyncExternalStore(Cart.subscribe, () => lines)
}
