// Haxagon intake scale: bench test.
//
// Checks every part on its own before the Wi-Fi firmware exists:
//   - OLED shows the weight (or raw HX711 counts until calibrated)
//   - Button: short press = tare, hold 2 s = toggle raw / grams view
//   - LED lights and the buzzer beeps once when the reading settles
//   - Serial Monitor (115200 baud) prints every reading and takes commands
//
// Serial commands (type, then Enter):
//   t        tare (zero) with the plate empty
//   c 500    calibrate: put a known 500 g item on the plate first
//   r        toggle raw / grams view
//   b        test the buzzer and LED
//
// The calibration factor is saved to flash, so it survives a reboot.
// Pins follow the map in CLAUDE.md.

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <HX711.h>
#include <Preferences.h>

const int PIN_HX_DT = 16;
const int PIN_HX_SCK = 4;
const int PIN_SDA = 21;
const int PIN_SCL = 22;
const int PIN_BUTTON = 13;
const int PIN_BUZZER = 25;
const int PIN_LED = 26;

const uint8_t OLED_ADDR = 0x3C;
const unsigned long HOLD_MS = 2000;
const float STABLE_BAND_G = 3.0;      // reading must stay within this...
const unsigned long STABLE_MS = 1000; // ...for this long to count as settled
const float EMPTY_G = 5.0;            // below this the plate counts as empty
const float ZERO_BAND_G = 2.0;        // OLED shows anything below this as 0 g
const float NEG_WARN_G = 20.0;        // this far below zero: prompt a re-tare

Adafruit_SSD1306 display(128, 64, &Wire, -1);
HX711 scale;
Preferences prefs;

float calFactor = 0;     // 0 = not calibrated yet
bool showRaw = false;
bool oledOk = false;

float stableRef = 0;
unsigned long stableSince = 0;
bool settled = false;

void beep(int ms) {
  tone(PIN_BUZZER, 2000, ms);
}

void doTare() {
  scale.tare(20);
  Serial.println("Tared.");
  beep(60);
}

void doCalibrate(float knownGrams) {
  if (knownGrams <= 0) {
    Serial.println("Usage: c <grams>, e.g. c 500");
    return;
  }
  long counts = scale.read_average(20) - scale.get_offset();
  if (abs(counts) < 1000) {
    Serial.println("Barely any signal. Is the weight on the plate? Check the load cell wires.");
    return;
  }
  calFactor = counts / knownGrams;
  scale.set_scale(calFactor);
  prefs.putFloat("cal", calFactor);
  showRaw = false;
  Serial.printf("Calibrated. Factor = %.2f counts per gram (saved).\n", calFactor);
  beep(60); delay(100); beep(60);
}

void drawScreen(float grams, long raw) {
  if (!oledOk) return;
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print(showRaw ? "RAW" : "Haxagon scale");
  if (settled && calFactor != 0) {
    display.setCursor(104, 0);
    display.print("OK");
  }

  display.setTextSize(2);
  display.setCursor(0, 24);
  bool tareHint = false;
  if (showRaw || calFactor == 0) {
    display.print(raw);
  } else {
    // Small wobble around zero shows as 0. A big negative means the scale
    // was zeroed with something on it, so show 0 and ask for a re-tare.
    tareHint = grams <= -NEG_WARN_G;
    display.printf("%.0f g", grams < ZERO_BAND_G ? 0.0f : grams);
  }

  display.setTextSize(1);
  display.setCursor(0, 56);
  if (calFactor == 0) display.print("Not calibrated: c <g>");
  else if (tareHint) display.print("Empty? Tap to tare");
  else display.print("Tap=tare  Hold=raw");
  display.display();
}

void handleSerial() {
  if (!Serial.available()) return;
  String line = Serial.readStringUntil('\n');
  line.trim();
  if (line.length() == 0) return;
  char cmd = tolower(line[0]);
  if (cmd == 't') doTare();
  else if (cmd == 'c') doCalibrate(line.substring(1).toFloat());
  else if (cmd == 'r') { showRaw = !showRaw; Serial.println(showRaw ? "Raw view." : "Grams view."); }
  else if (cmd == 'b') {
    Serial.println("Buzzer + LED test.");
    digitalWrite(PIN_LED, HIGH); beep(300); delay(500); digitalWrite(PIN_LED, LOW);
  }
  else Serial.println("Commands: t, c <grams>, r, b");
}

void handleButton() {
  static bool wasDown = false;
  static unsigned long downAt = 0;
  static bool holdFired = false;
  bool down = digitalRead(PIN_BUTTON) == LOW;

  if (down && !wasDown) { downAt = millis(); holdFired = false; }
  if (down && !holdFired && millis() - downAt >= HOLD_MS) {
    showRaw = !showRaw;
    holdFired = true;
    Serial.println(showRaw ? "Button hold: raw view." : "Button hold: grams view.");
    beep(150);
  }
  if (!down && wasDown && !holdFired && millis() - downAt > 30) {
    Serial.println("Button tap: tare.");
    doTare();
  }
  wasDown = down;
}

void updateSettled(float grams) {
  if (fabs(grams - stableRef) > STABLE_BAND_G) {
    stableRef = grams;
    stableSince = millis();
    settled = false;
  } else if (!settled && millis() - stableSince >= STABLE_MS) {
    settled = true;
    if (calFactor != 0 && grams > EMPTY_G) {
      Serial.printf("Settled at %.0f g\n", grams);
      beep(100);
    }
  }
  digitalWrite(PIN_LED, settled && calFactor != 0 && grams > EMPTY_G);
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\nHaxagon scale bench test");

  pinMode(PIN_BUTTON, INPUT_PULLUP);
  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);

  Wire.begin(PIN_SDA, PIN_SCL);
  oledOk = display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR);
  if (!oledOk) Serial.println("OLED not found at 0x3C. Check SDA/SCL and power.");

  scale.begin(PIN_HX_DT, PIN_HX_SCK);
  if (!scale.wait_ready_timeout(2000)) {
    Serial.println("HX711 not responding. Check DT=16, SCK=4, VCC and GND.");
  }

  prefs.begin("scale", false);
  calFactor = prefs.getFloat("cal", 0);
  if (calFactor != 0) {
    scale.set_scale(calFactor);
    Serial.printf("Loaded calibration factor %.2f\n", calFactor);
  } else {
    Serial.println("No calibration yet. Tare empty, then put a known weight on and type: c <grams>");
  }
  doTare();
  Serial.println("Commands: t, c <grams>, r, b");
}

void loop() {
  handleSerial();
  handleButton();

  static unsigned long lastRead = 0;
  if (millis() - lastRead < 200) return;
  lastRead = millis();

  if (!scale.is_ready()) return;
  long raw = scale.read_average(3);
  float grams = calFactor != 0 ? (raw - scale.get_offset()) / calFactor : 0;

  updateSettled(calFactor != 0 ? grams : (raw - scale.get_offset()) / 100.0);
  drawScreen(grams, raw - scale.get_offset());

  static unsigned long lastPrint = 0;
  if (millis() - lastPrint >= 500) {
    lastPrint = millis();
    Serial.printf("raw=%ld  net=%ld  grams=%.1f%s\n",
                  raw, raw - scale.get_offset(), grams, settled ? "  (settled)" : "");
  }
} 
