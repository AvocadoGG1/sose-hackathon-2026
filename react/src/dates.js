// Dates are stored and sent as 'YYYY-MM-DD' (database and <input type="date"> both
// need that); this is only for showing them.

// Donated food must have at least this many days before its best-before date
// (the server checks the same rule).
export const MIN_DAYS_BEFORE_EXPIRY = 2

// Today plus `days`, as 'YYYY-MM-DD' in the browser's local time.
export function isoDateFromToday(days) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// '2026-10-25' -> '10/25/2026'. Anything else is returned unchanged.
export function formatDate(isoDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate ?? '')
  return match ? `${match[2]}/${match[3]}/${match[1]}` : isoDate
}
