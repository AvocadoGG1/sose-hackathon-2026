// Dates are stored and sent as 'YYYY-MM-DD' (database and <input type="date"> both
// need that); this is only for showing them.

// '2026-10-25' -> '10/25/2026'. Anything else is returned unchanged.
export function formatDate(isoDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate ?? '')
  return match ? `${match[2]}/${match[3]}/${match[1]}` : isoDate
}
