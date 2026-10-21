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
| Backend  | Python |
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

## Hardware

**Scale → API:** the ESP32 sends `POST /api/scale-reading` with a secret key header and this body:

```json
{ "station": "intake-1", "grams": 1240 }
```

The backend attaches the reading to the donor's active pledge. Use a 2.4 GHz phone hotspot for Wi-Fi.

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
