import { Router } from 'express'
import { supabase } from '../supabase.js'

const router = Router()

// GET /api/health - confirms the server is up and can reach the database.
router.get('/', async (req, res) => {
  const { error } = await supabase.from('food_items').select('id', { head: true, count: 'exact' })

  if (error) {
    return res.status(503).json({ ok: false, database: 'unreachable', error: error.message })
  }
  res.json({ ok: true, database: 'connected' })
})

export default router
