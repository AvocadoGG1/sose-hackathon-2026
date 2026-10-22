// Calls to the staff-only /api/admin routes. The staff passcode (ADMIN_KEY on the
// server) is kept in sessionStorage, so it's forgotten when the browser tab closes.

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const KEY_STORAGE = 'haxagon-admin-key'

// fallback for when sessionStorage is blocked (some private windows)
let memoryKey = null

export function getAdminKey() {
  try {
    return sessionStorage.getItem(KEY_STORAGE) ?? memoryKey
  } catch {
    return memoryKey
  }
}

// Pass null to sign out.
export function setAdminKey(key) {
  memoryKey = key
  try {
    if (key) sessionStorage.setItem(KEY_STORAGE, key)
    else sessionStorage.removeItem(KEY_STORAGE)
  } catch {
    // storage blocked: memoryKey still works until the page reloads
  }
}

// Thrown when the server rejects the passcode; the page goes back to the passcode screen.
export class PasscodeError extends Error {}

export async function adminFetch(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API_BASE}/api/admin${path}`, {
    method,
    headers: {
      'x-admin-key': getAdminKey() ?? '',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    setAdminKey(null)
    throw new PasscodeError('Wrong staff passcode')
  }
  if (res.status === 204) return null

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? `Request failed: ${res.status}`)
  return data
}

// Public inventory (same endpoint as Get Food), used for the stock table.
export async function fetchInventory() {
  const res = await fetch(`${API_BASE}/api/inventory`)
  if (!res.ok) throw new Error(`Inventory request failed: ${res.status}`)
  return res.json()
}
