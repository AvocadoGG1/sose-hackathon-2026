// Copy this file to secrets.h (same folder) and fill it in.
// secrets.h is gitignored, so the real values never get committed.

#pragma once

// 2.4 GHz only: on an iPhone hotspot, turn on "Maximize Compatibility".
const char* WIFI_SSID = "your-hotspot-name";
const char* WIFI_PASS = "your-hotspot-password";

// The laptop running the server, on the same hotspot. Use http, not https.
const char* API_URL = "http://172.20.10.2:3000/api/scale-reading";

// Must match SCALE_API_KEY in server/.env.
const char* SCALE_KEY = "paste-the-scale-key-here";
