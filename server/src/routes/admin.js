import { Router } from 'express'
import { supabase } from '../supabase.js'
import { dailyTotals } from '../trends.js'

// Staff-only routes for the Admin page. Mounted behind requireAdminKey in app.js,
// so every request here already has a valid x-admin-key.
const router = Router()

const PICKUP_STATUSES = ['submitted', 'picked_up', 'cancelled']

// Turns "12" into 12; anything else (abc, 1.5, -3) into null.
function parseId(value) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

// Current stock per food: Map(food_item_id -> { name, total_quantity }).
async function stockFor(foodItemIds) {
  const { data, error } = await supabase
    .from('inventory')
    .select('food_item_id, name, total_quantity')
    .in('food_item_id', foodItemIds)
  if (error) throw error
  return new Map(data.map((row) => [row.food_item_id, row]))
}

// GET /api/admin/check - lets the Admin page test a passcode (204 = it worked).
router.get('/check', (req, res) => {
  res.status(204).end()
})

// GET /api/admin/pickups - latest 50 pickups (any status) with their items.
router.get('/pickups', async (req, res) => {
  const { data, error } = await supabase
    .from('pickups')
    .select('id, recipient_name, recipient_email, notes, status, created_at, pickup_items(quantity, food_items(name, category))')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return res.status(502).json({ error: error.message })
  res.json(data)
})

// PATCH /api/admin/pickups/:id { status } - mark picked up, cancel (returns the stock), or reopen.
router.patch('/pickups/:id', async (req, res) => {
  const id = parseId(req.params.id)
  const { status } = req.body ?? {}
  if (!id) return res.status(400).json({ error: 'pickup id must be a positive whole number' })
  if (!PICKUP_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${PICKUP_STATUSES.join(', ')}` })
  }

  const { data: pickup, error: findError } = await supabase
    .from('pickups')
    .select('id, status, pickup_items(food_item_id, quantity)')
    .eq('id', id)
    .maybeSingle()
  if (findError) return res.status(502).json({ error: findError.message })
  if (!pickup) return res.status(404).json({ error: `No pickup #${id}` })

  // A cancelled pickup gave its food back. Reopening it takes the food again,
  // so only allow that if it's still in stock (otherwise stock would go negative).
  if (pickup.status === 'cancelled' && status !== 'cancelled') {
    let stock
    try {
      stock = await stockFor(pickup.pickup_items.map((item) => item.food_item_id))
    } catch (err) {
      return res.status(502).json({ error: err.message })
    }
    for (const item of pickup.pickup_items) {
      const row = stock.get(item.food_item_id)
      if (!row || item.quantity > row.total_quantity) {
        return res.status(409).json({
          error: `Can't reopen pickup #${id}: it needs ${item.quantity} ${row?.name ?? 'items'}, but only ${row?.total_quantity ?? 0} are in stock now.`,
        })
      }
    }
  }

  const { data, error } = await supabase.from('pickups').update({ status }).eq('id', id).select('id, status').single()
  if (error) return res.status(502).json({ error: error.message })
  res.json(data)
})

// GET /api/admin/donations - latest 50 donations with their items.
router.get('/donations', async (req, res) => {
  const { data, error } = await supabase
    .from('donations')
    .select(
      'id, donor_name, donor_email, notes, status, created_at, donation_items(id, quantity, rejected_quantity, weight_grams, expiration_date, scale_reading_id, food_items(name, category))',
    )
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return res.status(502).json({ error: error.message })
  res.json(data)
})

// PATCH /api/admin/donation-items/:id { rejected_quantity } - how many of one donated
// item staff rejected (dented, expired, opened...). Those drop out of stock; setting it
// back to 0 restores them. Rejecting more than is still in stock is refused, because
// the rest has already been picked up and stock would go negative.
router.patch('/donation-items/:id', async (req, res) => {
  const id = parseId(req.params.id)
  const rejected = req.body?.rejected_quantity
  if (!id) return res.status(400).json({ error: 'donation item id must be a positive whole number' })
  if (!Number.isInteger(rejected) || rejected < 0) {
    return res.status(400).json({ error: 'rejected_quantity must be a whole number, 0 or more' })
  }

  const { data: item, error: findError } = await supabase
    .from('donation_items')
    .select('id, food_item_id, quantity, rejected_quantity, food_items(name)')
    .eq('id', id)
    .maybeSingle()
  if (findError) return res.status(502).json({ error: findError.message })
  if (!item) return res.status(404).json({ error: `No donation item #${id}` })

  const name = item.food_items?.name ?? 'items'
  if (rejected > item.quantity) {
    return res.status(400).json({ error: `Only ${item.quantity} ${name} were donated, so at most ${item.quantity} can be rejected.` })
  }

  const extra = rejected - item.rejected_quantity
  if (extra > 0) {
    let stock
    try {
      stock = await stockFor([item.food_item_id])
    } catch (err) {
      return res.status(502).json({ error: err.message })
    }
    const inStock = stock.get(item.food_item_id)?.total_quantity ?? 0
    if (extra > inStock) {
      return res.status(409).json({
        error: `Only ${inStock} ${name} are still in stock (the rest were picked up), so you can reject at most ${item.rejected_quantity + inStock} here.`,
      })
    }
  }

  const { data, error } = await supabase
    .from('donation_items')
    .update({ rejected_quantity: rejected })
    .eq('id', id)
    .select('id, quantity, rejected_quantity')
    .single()
  if (error) return res.status(502).json({ error: error.message })
  res.json(data)
})

// GET /api/admin/trends?days=14 - items donated vs picked up per day.
router.get('/trends', async (req, res) => {
  const days = Math.min(Math.max(parseId(req.query.days) ?? 14, 1), 90)
  // one extra day of margin; dailyTotals drops anything outside the window
  const since = new Date(Date.now() - (days + 1) * 86_400_000).toISOString()

  const [donated, pickedUp] = await Promise.all([
    supabase.from('donation_items').select('quantity, rejected_quantity, created_at, donations(status)').gte('created_at', since),
    supabase.from('pickup_items').select('quantity, created_at, pickups(status)').gte('created_at', since),
  ])
  const error = donated.error ?? pickedUp.error
  if (error) return res.status(502).json({ error: error.message })

  res.json(
    dailyTotals(
      // rejected items never reached the shelves, so they don't count as donated
      donated.data.map((row) => ({
        created_at: row.created_at,
        quantity: row.quantity - (row.rejected_quantity ?? 0),
        status: row.donations?.status,
      })),
      pickedUp.data.map((row) => ({ created_at: row.created_at, quantity: row.quantity, status: row.pickups?.status })),
      { days },
    ),
  )
})

// GET /api/admin/scale-readings?limit=10 - latest readings from every scale.
router.get('/scale-readings', async (req, res) => {
  const limit = Math.min(parseId(req.query.limit) ?? 10, 50)
  const { data, error } = await supabase
    .from('scale_readings')
    .select('id, device_id, weight_grams, recorded_at')
    .order('recorded_at', { ascending: false })
    .limit(limit)

  if (error) return res.status(502).json({ error: error.message })
  res.json(data)
})

export default router
