import { createApp } from './app.js'

const port = Number(process.env.PORT ?? 3000)

// Listen on all interfaces so the ESP32 can reach this machine over the LAN.
createApp().listen(port, '0.0.0.0', () => {
  console.log(`API listening on http://localhost:${port}`)
})
