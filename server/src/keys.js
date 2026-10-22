import { timingSafeEqual } from 'node:crypto'

// Compares a key from a request header with the expected one in constant time.
// A missing expected key (not set in .env) never matches, so nothing is left open by accident.
export function matchesKey(given, expected) {
  if (!expected || !given) return false
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

// Staff-only routes: the Admin page sends ADMIN_KEY in the x-admin-key header.
export function requireAdminKey(req, res, next) {
  if (!matchesKey(req.get('x-admin-key'), process.env.ADMIN_KEY)) {
    return res.status(401).json({ error: 'Missing or wrong staff passcode' })
  }
  next()
}
