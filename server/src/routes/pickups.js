import { Router } from 'express'
import { supabase } from '../supabase.js'

const router = Router()

// POST /api/pickups - records a checkout from the Get Food cart: one
// `pickups` row plus one `pickup_items` row per cart line. The `inventory`
// view subtracts submitted pickups from availability.
router.post('/', async (req, res) => {
  const { items, recipientName, recipientEmail, notes } = req.body ?? {}

  if (!recipientName || !recipientEmail) {
    return res.status(400).json({ error: 'recipientName and recipientEmail are required' })
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items must be a non-empty array' })
  }

  for (const item of items) {
    if (!item || item.food_item_id == null || !Number.isInteger(item.quantity) || item.quantity <= 0) {
      return res.status(400).json({ error: 'each item needs a food_item_id and a positive integer quantity' })
    }
  }

  const foodItemIds = items.map((item) => item.food_item_id)

  const { data: available, error: inventoryError } = await supabase
    .from('inventory')
    .select('food_item_id, name, total_quantity')
    .in('food_item_id', foodItemIds)

  if (inventoryError) {
    return res.status(502).json({ error: inventoryError.message })
  }

  const availableById = new Map(available.map((row) => [row.food_item_id, row]))

  for (const item of items) {
    const row = availableById.get(item.food_item_id)
    if (!row || item.quantity > row.total_quantity) {
      return res.status(409).json({
        error: `Not enough stock for ${row?.name ?? `food item ${item.food_item_id}`} (wanted ${item.quantity}, have ${row?.total_quantity ?? 0})`,
      })
    }
  }

  const { data: pickup, error: pickupError } = await supabase
    .from('pickups')
    .insert({
      recipient_name: recipientName,
      recipient_email: recipientEmail,
      notes: notes ?? null,
      status: 'submitted',
    })
    .select()
    .single()

  if (pickupError) {
    return res.status(502).json({ error: pickupError.message })
  }

  const { error: itemsError } = await supabase.from('pickup_items').insert(
    items.map((item) => ({
      pickup_id: pickup.id,
      food_item_id: item.food_item_id,
      quantity: item.quantity,
    })),
  )

  if (itemsError) {
    return res.status(502).json({ error: itemsError.message })
  }

  res.status(201).json({ pickup_id: pickup.id })
})

export default router
