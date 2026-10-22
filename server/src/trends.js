// Daily totals for the Admin page's trend chart. Kept apart from the route so it
// can be tested without a database.

// Days are counted in the pantry's time zone, so a 9 pm checkout lands on the right day.
export const PANTRY_TIME_ZONE = 'America/Los_Angeles'

const dayKey = (date, timeZone) =>
  // en-CA formats as YYYY-MM-DD
  new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)

// donationRows / pickupRows: [{ created_at, quantity, status }], status being the
// parent donation's or pickup's. Rejected/draft donations and cancelled pickups
// don't count. Returns one entry per day, oldest first, including empty days:
//   [{ date: '2026-10-22', donated: 12, pickedUp: 3 }, ...]
export function dailyTotals(donationRows, pickupRows, { days = 14, now = new Date(), timeZone = PANTRY_TIME_ZONE } = {}) {
  const totals = new Map()
  for (let i = days - 1; i >= 0; i--) {
    totals.set(dayKey(new Date(now.getTime() - i * 86_400_000), timeZone), { donated: 0, pickedUp: 0 })
  }

  for (const row of donationRows) {
    const day = totals.get(dayKey(new Date(row.created_at), timeZone))
    if (day && row.status === 'submitted') day.donated += row.quantity
  }
  for (const row of pickupRows) {
    const day = totals.get(dayKey(new Date(row.created_at), timeZone))
    if (day && row.status !== 'cancelled') day.pickedUp += row.quantity
  }

  return [...totals].map(([date, day]) => ({ date, ...day }))
}
