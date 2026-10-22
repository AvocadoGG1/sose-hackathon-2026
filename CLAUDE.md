# Haxagon — SOSE Hackathon 2026

## Prompt

"Small build, huge ripple!" Build a small, niche project that makes a big impact.

- Dev phase: Oct 12–23, 2026
- Submission: GitHub repo + demo video (max 3 min) + working project
- Judging (last year): Impact 40, Function 15, Design 15, Presentation 5

## Project

A food pantry website designed for the CSUN Food Pantry. It is not integrated with the real pantry during the hackathon: use realistic mock data and keep inventory swappable (CSV/API).

- **User:** browse available food and add it to a cart. The cart warns when nutrition needs aren't met (by food group, not calories) and suggests items. Checkout removes the food from inventory.
- **Donor:** see inventory and most-needed items, and pledge food.
- **Admin:** see everything, confirm donations and view stock trends.
- **Hardware:** a donor pledges on the site and puts the food on a scale. The ESP32 reads the weight, and the pledge is marked received and added to inventory.

## Stack

| Layer    | Tech |
|----------|------|
| Frontend | React |
| Backend  | Node.js + Express (`/server`) |
| Database | Supabase |
| Hardware | ESP32 (Arduino C++), HX711 + 10 kg bar load cell, 0.96" SSD1306 I2C OLED, button, buzzer, LED |

## Team / ownership

Each person owns their area. Don't edit someone else's folders without asking.

| Person | Area |
|--------|------|
| daniel | database |
| hanna  | frontend |
| andrew | hardware (`/hardware`, `/firmware`) |
| jose   | backend |
| evan   | QA testing |
| justin | floater (frontend first, then backend/db) |

## Admin

`/admin` ("Pantry staff" on the main menu) is the staff dashboard. It's protected by one shared passcode: `ADMIN_KEY` in `server/.env`, sent as the `x-admin-key` header to `/api/admin/*` (see `server/src/keys.js` and `server/src/routes/admin.js`).

- Donations count in stock as soon as they're submitted. Staff can reject part of any donated item (`donation_items.rejected_quantity`, e.g. 1 dented can of 5); only `quantity - rejected_quantity` counts in the `inventory` view. Setting it back to 0 restores them.
- Stock never goes negative: the API refuses to reject more than is still in stock, or to reopen a cancelled pickup without enough stock, and the view clamps `total_quantity` at 0.
- Pickups go `submitted` → `picked_up` or `cancelled`. Cancelling puts the food back in stock.

## Hardware

**Scale → API:** each time a weight settles, the ESP32 (`firmware/scale_station`) sends `POST /api/scale-reading` with the header `x-scale-key: <SCALE_API_KEY>` and this body:

```json
{ "station": "intake-1", "grams": 1240 }
```

The server saves it to `scale_readings` (`station` → `device_id`) and replies `201` with the new row. The Donate page polls `GET /api/scale-reading/latest?station=intake-1` for the current weight and stores that reading's `id` as `donation_items.scale_reading_id` when the donor submits. Use a 2.4 GHz phone hotspot for Wi-Fi; Wi-Fi, the backend URL and the key go in `firmware/scale_station/secrets.h` (copy `secrets.example.h`).

**ESP32 pin map**

| Part | Connection |
|------|------------|
| Load cell red / black / green / white | HX711 E+ / E− / A+ / A− |
| HX711 VCC / GND | 3.3V / GND |
| HX711 DT / SCK | GPIO 16 / GPIO 4 |
| OLED VCC / GND | 3.3V / GND |
| OLED SDA / SCL | GPIO 21 / GPIO 22 |
| Button | GPIO 13 + GND (`INPUT_PULLUP`) |
| Buzzer | GPIO 25 / GND |
| LED | GPIO 26 → 220 Ω resistor → LED → GND |

Libraries: HX711 (Bogdan Necula), Adafruit SSD1306.

**3D printing:** `hardware/scale_plate.scad` is a parametric OpenSCAD plate (150 × 150 × 6 mm with a 5 mm spacer pad, 5.5 mm bolt holes, and 10.5 × 3 mm head recesses). Its `variant` parameter produces two parts. Print one of each in PLA on a Prusa MK4 with the pad facing up and no supports:
- `scale_plate_bottom.stl` sits pad-up on the table and bolts to the **cable end** of the load cell (the fixed end). Its underside has a "FRONT" arrow and assembly note.
- `scale_plate_top.stl` is flipped end-to-end and bolts to the other end (the free end, which takes the load). The bar's printed arrow points down.
- Both plates have 5.5 mm holes, so use whichever bolt fits each end's threads: M4x20 + washer or M5x20.
- The top plate's flat face is the food surface, debossed with the Haxagon logo. The load cell dimensions were measured with calipers (80 × 13 × 13 mm, holes 4.75 mm from the end and 15 mm apart).

## Working norms

- Work on branches and merge to `main` through pull requests.
- Build against fake data so nobody is blocked.
- Integrate early (target Oct 18). Feature freeze is Oct 21.
