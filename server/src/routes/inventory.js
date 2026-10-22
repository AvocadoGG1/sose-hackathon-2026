import { Router } from 'express'
import { supabase } from '../supabase.js'

const router = Router()

// GET /api/inventory - what's available on the Get Food page: one row
// per food item, with how much of it has been donated and not yet
// picked up. Backed by the `inventory` view (see supabase/migrations),
// which sums donation_items and doesn't subtract pickups yet.
router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('inventory').select('*').order('name')

  if (error) {
    return res.status(502).json({ error: error.message })
  }

  res.json(data)
})

export default router
