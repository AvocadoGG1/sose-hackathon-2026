// Haxagon intake scale: station firmware.
//
// Same as scale_test, plus Wi-Fi: every time a weight settles on the plate,
// it is sent to the backend as POST /api/scale-reading.
//   - OLED shows the weight (or raw HX711 counts until calibrated) and Wi-Fi state
//   - Button: short press = tare, hold 2 s = toggle raw / grams view
//   - On settle: two short beeps = saved, one long beep = not sent
//   - Auto-zero: small drift on an empty, steady plate is zeroed out on its own
//   - Serial Monitor (115200 baud) prints every reading and takes commands
//
// Serial commands (type, then Enter):
//   t        tare (zero) with the plate empty
//   c 500    calibrate: put a known 500 g item on the plate first
//   r        toggle raw / grams view
//   b        test the buzzer
//   s        send the current weight now (tests the backend connection)
//
// Copy secrets.example.h to secrets.h and fill in Wi-Fi and the backend address.
// The calibration factor is saved to flash, so it survives a reboot.
// Pins follow the wiring table in README.md (Scale hardware).

#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <HX711.h>
#include <Preferences.h>
#include "secrets.h"

const int PIN_HX_DT = 16;
const int PIN_HX_SCK = 4;
const int PIN_SDA = 21;
const int PIN_SCL = 22;
const int PIN_BUTTON = 13;
const int PIN_BUZZER = 25;

const char* STATION = "intake-1";

const uint8_t OLED_ADDR = 0x3C;
const unsigned long HOLD_MS = 2000;
const float STABLE_BAND_G = 3.0;      // reading must stay within this...
const unsigned long STABLE_MS = 1000; // ...for this long to count as settled
const float EMPTY_G = 5.0;            // below this the plate counts as empty
const float ZERO_BAND_G = 2.0;        // OLED shows anything below this as 0 g
const float NEG_WARN_G = 20.0;        // this far below zero: prompt a re-tare
const float AUTOZERO_BAND_G = 4.0;    // settled readings this close to 0 are treated as drift
const unsigned long AUTOZERO_MS = 1000; // how often auto-zero nudges the zero point

Adafruit_SSD1306 display(128, 64, &Wire, -1);
HX711 scale;
Preferences prefs;

float calFactor = 0;     // 0 = not calibrated yet
bool showRaw = false;
bool oledOk = false;

float stableRef = 0;
unsigned long stableSince = 0;
bool settled = false;
float lastGrams = 0;

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

// Posts one reading to the backend. Blocks for up to ~3 s, which is fine
// because it only runs once per settled item.
void sendReading(float grams) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("No Wi-Fi, reading not sent.");
    beep(400);
    return;
  }
  HTTPClient http;
  http.begin(API_URL);
  http.setTimeout(3000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-scale-key", SCALE_KEY);
  String body = String("{\"station\":\"") + STATION + "\",\"grams\":" + String(grams, 1) + "}";
  int code = http.POST(body);
  if (code == 201) {
    Serial.printf("Sent %.1f g -> saved.\n", grams);
    beep(60); delay(100); beep(60);
  } else {
    // Negative codes are connection errors (wrong IP, server down, firewall).
    Serial.printf("Send failed: HTTP %d %s\n", code, code > 0 ? http.getString().c_str() : "");
    beep(400);
  }
  http.end();
}

void drawScreen(float grams, long raw) {
  if (!oledOk) return;
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print(showRaw ? "RAW" : "Haxagon scale");
  display.setCursor(80, 0);
  display.print(WiFi.status() == WL_CONNECTED ? "W" : "-");
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
    Serial.println("Buzzer test.");
    beep(300);
  }
  else if (cmd == 's') sendReading(max(lastGrams, 0.0f));
  else Serial.println("Commands: t, c <grams>, r, b, s");
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
      sendReading(grams);
    }
  }
}

// Load cells drift slowly. While the plate is empty and steady, move the zero
// point a quarter of the way toward the current reading each second, so the
// drift is cancelled without a visible jump. The band is below EMPTY_G, so
// anything heavy enough to be sent is never zeroed away.
void autoZero(long raw, float grams) {
  static unsigned long lastNudge = 0;
  if (calFactor == 0 || !settled || fabs(grams) > AUTOZERO_BAND_G) return;
  if (millis() - lastNudge < AUTOZERO_MS) return;
  lastNudge = millis();
  long offset = scale.get_offset();
  scale.set_offset(offset + (raw - offset) / 4);
}

void logWifi() {
  static wl_status_t last = WL_IDLE_STATUS;
  wl_status_t now = WiFi.status();
  if (now == last) return;
  last = now;
  if (now == WL_CONNECTED) Serial.printf("Wi-Fi connected, IP %s\n", WiFi.localIP().toString().c_str());
  else Serial.println("Wi-Fi not connected (retrying in the background).");
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\nHaxagon scale station");

  pinMode(PIN_BUTTON, INPUT_PULLUP);
  pinMode(PIN_BUZZER, OUTPUT);

  // Doesn't block: the ESP32 connects (and reconnects) in the background.
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.printf("Connecting to Wi-Fi \"%s\". Backend: %s\n", WIFI_SSID, API_URL);

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
  Serial.println("Commands: t, c <grams>, r, b, s");
}

void loop() {
  handleSerial();
  handleButton();
  logWifi();

  static unsigned long lastRead = 0;
  if (millis() - lastRead < 200) return;
  lastRead = millis();

  if (!scale.is_ready()) return;
  long raw = scale.read_average(3);
  float grams = calFactor != 0 ? (raw - scale.get_offset()) / calFactor : 0;
  lastGrams = grams;

  updateSettled(calFactor != 0 ? grams : (raw - scale.get_offset()) / 100.0);
  autoZero(raw, grams);
  drawScreen(grams, raw - scale.get_offset());

  static unsigned long lastPrint = 0;
  if (millis() - lastPrint >= 500) {
    lastPrint = millis();
    Serial.printf("raw=%ld  net=%ld  grams=%.1f%s\n",
                  raw, raw - scale.get_offset(), grams, settled ? "  (settled)" : "");
  }
}
