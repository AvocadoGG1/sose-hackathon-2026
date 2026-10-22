import { groupsInCart, groupsInStock, listGroups } from './foodGroups.js'
import './FoodGroupCheck.css'

// Shows which food groups the cart covers and warns about the missing ones.
// Renders nothing for an empty cart, or if the inventory has no food groups yet.
// hint: what to tell the shopper to do about a gap (differs per page).
function FoodGroupCheck({ lines, items, hint }) {
  const groups = groupsInStock(items)
  if (lines.length === 0 || groups.length === 0) return null

  const inCart = groupsInCart(lines)
  const missing = groups.filter((group) => !inCart.has(group.key))

  return (
    <div className={missing.length > 0 ? 'food-groups food-groups-warn' : 'food-groups'} role="status">
      <ul className="food-groups-list" aria-label="Food groups in your cart">
        {groups.map((group) => (
          <li key={group.key} className={inCart.has(group.key) ? 'covered' : 'missing'}>
            <span aria-hidden="true">{inCart.has(group.key) ? '✓' : '+'}</span>
            {group.label}
            <span className="visually-hidden">{inCart.has(group.key) ? ' (in cart)' : ' (missing)'}</span>
          </li>
        ))}
      </ul>
      <p>
        {missing.length > 0 ? (
          <>
            Your cart has no {listGroups(missing)} yet. {hint}
          </>
        ) : (
          'Balanced! Your cart has something from every food group we have today.'
        )}
      </p>
    </div>
  )
}

export default FoodGroupCheck
