import { Router } from 'express'
import { supabase } from '../supabase.js'

const router = Router()

// GET /api/health - confirms the server is up and can reach the database.
router.get('/health', async (req, res) => {
  // A real select, not a head/count request: those don't return an error when the table is missing.
  const { error } = await supabase.from('food_items').select('id').limit(1)

  if (error) {
    return res.status(503).json({ ok: false, database: 'unreachable', error: error.message })
  }
  res.json({ ok: true, database: 'connected' })
})

export default router
