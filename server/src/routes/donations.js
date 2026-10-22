import { Router } from 'express'
import { supabase } from '../supabase.js'

const router = Router()

// POST /api/donations - records a donation from the Donate Food page: one
// `donations` row plus one `donation_items` row per item. Submitted donations
// count toward the `inventory` view right away.
// Each item can carry the scale_reading_id it was weighed with on the ESP32.
router.post('/', async (req, res) => {
  const { items, donorName, donorEmail, notes } = req.body ?? {}

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items must be a non-empty array' })
  }

  for (const item of items) {
    if (!item || item.food_item_id == null || !Number.isInteger(item.quantity) || item.quantity <= 0) {
      return res.status(400).json({ error: 'each item needs a food_item_id and a positive integer quantity' })
    }
    if (item.weight_grams != null && !(Number.isFinite(item.weight_grams) && item.weight_grams >= 0)) {
      return res.status(400).json({ error: 'weight_grams must be a number >= 0' })
    }
  }

  const { data: donation, error: donationError } = await supabase
    .from('donations')
    .insert({
      donor_name: donorName || null,
      donor_email: donorEmail || null,
      notes: notes || null,
      status: 'submitted',
    })
    .select()
    .single()

  if (donationError) {
    return res.status(502).json({ error: donationError.message })
  }

  const { error: itemsError } = await supabase.from('donation_items').insert(
    items.map((item) => ({
      donation_id: donation.id,
      food_item_id: item.food_item_id,
      quantity: item.quantity,
      weight_grams: item.weight_grams ?? null,
      expiration_date: item.expiration_date || null,
      scale_reading_id: item.scale_reading_id ?? null,
    })),
  )

  if (itemsError) {
    // Don't leave an empty donation behind if its items failed.
    await supabase.from('donations').delete().eq('id', donation.id)
    return res.status(502).json({ error: itemsError.message })
  }

  res.status(201).json({ donation_id: donation.id })
})

export default router
