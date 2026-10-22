// Pretends to be the ESP32 scale, for testing without the hardware.
// Sends the same request the firmware sends when a weight settles:
//   POST /api/scale-reading  x-scale-key: SCALE_API_KEY  { station, grams }
//
// Run from server/ while the server is running (npm run dev):
//   npm run fake-scale               type a weight + Enter for each item, q to quit
//   npm run fake-scale -- 412 250    send these weights, 4 s apart (like swapping items)
//
// Readings are saved to the real scale_readings table, like real ones.

import readline from 'node:readline'

const API_URL = process.env.SCALE_API_URL ?? `http://localhost:${process.env.PORT ?? 3000}`
const STATION = process.env.SCALE_STATION ?? 'intake-1'
const KEY = process.env.SCALE_API_KEY

if (!KEY) {
  console.error('SCALE_API_KEY is missing. Add it to server/.env (the server needs the same value).')
  process.exit(1)
}

async function send(grams) {
  try {
    const res = await fetch(`${API_URL}/api/scale-reading`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-scale-key': KEY },
      body: JSON.stringify({ station: STATION, grams }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.status === 201) {
      console.log(`Sent ${grams} g -> saved as reading #${data.id}`)
    } else {
      console.log(`Sent ${grams} g -> HTTP ${res.status}: ${data.error ?? 'no details'}`)
    }
  } catch (err) {
    console.log(`Couldn't reach ${API_URL}. Is the server running (npm run dev)? (${err.cause?.code ?? err.message})`)
  }
}

console.log(`Fake scale "${STATION}" -> ${API_URL}`)

const weights = process.argv.slice(2).map(Number)

if (weights.length > 0) {
  for (const [i, grams] of weights.entries()) {
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, 4000))
    await send(grams)
  }
} else {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '> ' })
  console.log('Type a weight in grams and press Enter, as if it just settled on the scale. q to quit.')
  // input can end while a send is in flight (Ctrl+D, or piped input), so only prompt while open
  let open = true
  rl.on('close', () => {
    open = false
  })
  rl.prompt()
  for await (const raw of rl) {
    const line = raw.trim()
    if (line === 'q') break
    const grams = Number(line)
    if (line === '' || !Number.isFinite(grams) || grams < 0) {
      console.log('Enter a number of grams, e.g. 412')
    } else {
      await send(grams)
    }
    if (open) rl.prompt()
  }
  rl.close()
}
