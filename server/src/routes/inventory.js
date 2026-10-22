import { Router } from 'express'
import { supabase } from '../supabase.js'

const router = Router()

// GET /api/inventory - what's available on the Get Food page: one row
// per food item, with how much of it has been donated and not yet
// picked up. Backed by the `inventory` view (see supabase/schema.sql),
// which subtracts pickups and rejected items and never goes below 0.
router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('inventory').select('*').order('name')

  if (error) {
    return res.status(502).json({ error: error.message })
  }

  res.json(data)
})

export default router
