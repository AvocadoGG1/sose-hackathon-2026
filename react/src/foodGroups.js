// Food-group check for the cart (project spec: warn when nutrition needs aren't met
// by food group, not calories). Groups follow USDA MyPlate; each food's group comes
// from food_items.food_group via GET /api/inventory.

export const FOOD_GROUPS = [
  { key: 'grains', label: 'Grains' },
  { key: 'protein', label: 'Protein' },
  { key: 'vegetables', label: 'Vegetables' },
  { key: 'fruits', label: 'Fruits' },
  { key: 'dairy', label: 'Dairy' },
]

// Groups the pantry can actually offer right now (at least one item in stock).
// No point warning about dairy if there's no dairy to add.
export function groupsInStock(items) {
  const keys = new Set(
    items
      .filter((item) => item.food_group && (item.total_quantity == null || item.total_quantity > 0))
      .map((item) => item.food_group),
  )
  return FOOD_GROUPS.filter((group) => keys.has(group.key))
}

// Keys of the groups already covered by the cart.
export function groupsInCart(lines) {
  return new Set(lines.map((line) => line.item.food_group).filter(Boolean))
}

// In-stock groups the cart doesn't have yet.
export function missingGroups(lines, items) {
  const inCart = groupsInCart(lines)
  return groupsInStock(items).filter((group) => !inCart.has(group.key))
}

// "fruits", "fruits and dairy", "protein, fruits and dairy"
export function listGroups(groups) {
  const names = groups.map((group) => group.label.toLowerCase())
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}
