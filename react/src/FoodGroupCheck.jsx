import { groupsInCart, groupsInStock, listGroups } from './foodGroups.js'
import { useLanguage } from './i18n.jsx'
import './FoodGroupCheck.css'

// Shows which food groups the cart covers and warns about the missing ones.
// Renders nothing for an empty cart, or if the inventory has no food groups yet.
// hint: what to tell the shopper to do about a gap (differs per page).
function FoodGroupCheck({ lines, items, hint }) {
  const { t } = useLanguage()
  const groups = groupsInStock(items)
  if (lines.length === 0 || groups.length === 0) return null

  const inCart = groupsInCart(lines)
  const missing = groups.filter((group) => !inCart.has(group.key))

  return (
    <div className={missing.length > 0 ? 'food-groups food-groups-warn' : 'food-groups'} role="status">
      <ul className="food-groups-list" aria-label={t('groupsInCart')}>
        {groups.map((group) => (
          <li key={group.key} className={inCart.has(group.key) ? 'covered' : 'missing'}>
            <span aria-hidden="true">{inCart.has(group.key) ? '✓' : '+'}</span>
            {t(`group.${group.key}`)}
            <span className="visually-hidden">{inCart.has(group.key) ? t('inCart') : t('missing')}</span>
          </li>
        ))}
      </ul>
      <p>
        {missing.length > 0 ? (
          <>
            {t('cartMissing', listGroups(missing, t))} {hint}
          </>
        ) : (
          t('balanced')
        )}
      </p>
    </div>
  )
}

export default FoodGroupCheck
