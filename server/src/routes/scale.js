import { Router } from 'express'
import { matchesKey } from '../keys.js'
import { supabase } from '../supabase.js'

const router = Router()

// The ESP32 sends SCALE_API_KEY in the x-scale-key header.
function hasScaleKey(req) {
  return matchesKey(req.get('x-scale-key'), process.env.SCALE_API_KEY)
}

// POST /api/scale-reading - the ESP32 posts a settled weight.
// Body: { "station": "intake-1", "grams": 1240 }
router.post('/scale-reading', async (req, res) => {
  if (!hasScaleKey(req)) {
    return res.status(401).json({ error: 'Missing or wrong scale key' })
  }

  const { station, grams } = req.body ?? {}
  if (typeof station !== 'string' || !station || !Number.isFinite(grams) || grams < 0) {
    return res.status(400).json({ error: 'Expected { station: string, grams: number >= 0 }' })
  }

  const { data, error } = await supabase
    .from('scale_readings')
    .insert({ device_id: station, weight_grams: grams })
    .select('id, device_id, weight_grams, recorded_at')
    .single()
  if (error) throw error
  res.status(201).json(data)
})

// GET /api/scale-reading/latest?station=intake-1 - the Donate page reads the current weight.
router.get('/scale-reading/latest', async (req, res) => {
  const station = req.query.station ?? 'intake-1'
  const { data, error } = await supabase
    .from('scale_readings')
    .select('id, device_id, weight_grams, recorded_at')
    .eq('device_id', station)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!data) return res.status(404).json({ error: `No readings yet for ${station}` })
  res.json(data)
})

export default router
