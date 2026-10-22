import { createClient } from '@supabase/supabase-js'

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SECRET_KEY. Add them to server/.env.',
  )
}

// Supabase sometimes accepts a request and then doesn't answer for 10+ seconds,
// while the same request sent again answers in ~0.2 s. So reads get 2.5 s and up
// to two retries instead of hanging the page. Writes get longer and are never
// retried, so a slow insert can't be saved twice.
const READ_TIMEOUT_MS = 2500
const WRITE_TIMEOUT_MS = 15000

async function fetchWithTimeout(input, init = {}) {
  const method = (init.method ?? 'GET').toUpperCase()
  const isRead = method === 'GET' || method === 'HEAD'
  const attempts = isRead ? 3 : 1

  for (let attempt = 1; ; attempt++) {
    const timeout = AbortSignal.timeout(isRead ? READ_TIMEOUT_MS : WRITE_TIMEOUT_MS)
    const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout
    try {
      return await fetch(input, { ...init, signal })
    } catch (err) {
      if (attempt >= attempts || !timeout.aborted) throw err
      console.warn(`Supabase read took over ${READ_TIMEOUT_MS / 1000} s; retrying.`)
    }
  }
}

// Server-side client using the secret key, which bypasses RLS.
// Never send this key to the browser or the ESP32.
export const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: fetchWithTimeout },
})
