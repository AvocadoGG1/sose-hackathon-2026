import express from 'express'
import cors from 'cors'
import healthRouter from './routes/health.js'
import inventoryRouter from './routes/inventory.js'
import pickupsRouter from './routes/pickups.js'

export function createApp() {
  const app = express()

  // CORS_ORIGIN is a comma-separated list, e.g. "http://localhost:5173".
  // Requests without an Origin header (like the ESP32) are always allowed.
  const origins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
  app.use(cors({ origin: origins }))
  app.use(express.json())

  app.use('/api/health', healthRouter)
  app.use('/api/inventory', inventoryRouter)
  app.use('/api/pickups', pickupsRouter)
  // routes (scale, food items, donations)

  app.use((req, res) => {
    res.status(404).json({ error: `No route for ${req.method} ${req.path}` })
  })

  // Express 5 forwards errors thrown in async handlers here.
  app.use((err, req, res, next) => {
    const status = err.status ?? 500
    if (status >= 500) console.error(err)
    res.status(status).json({ error: err.expose ? err.message : 'Internal server error' })
  })

  return app
}
