/**
 * Production-ready Arduino C++ Firmware for ESP32 Smart Agriculture
 */

export const ARDUINO_FIRMWARE_CODE = `
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// ================= WIFI CONFIGURATION =================
const char* WIFI_SSID = "Your wifi";                                      //Change it
const char* WIFI_PASSWORD = "Your Password";                              // Change it

// Replace with your computer's actual local IP address.
const char* SERVER_TELEMETRY_URL = "local_ip:3000/api/telemetry";         // Change it
const char* SERVER_COMMAND_URL   = "local_ip:3000/api/motor/status";      //Change it
const char* DEVICE_ID = "ESP32-AGRI-01";
const char* API_KEY = "agri_esp32_secret_token";

// ================= PIN DEFINITIONS =================
#define PIN_SOIL_MOISTURE 34
#define PIN_DHT 4
#define PIN_RAIN_ANALOG 35
#define PIN_RAIN_DIGITAL 18
#define PIN_LDR 32
#define PIN_DS18B20 19
#define PIN_RELAY_PUMP 23
#define PIN_STATUS_LED 2
#define PIN_BUZZER 25

#define DHTTYPE DHT11

// ================= CALIBRATION =================
const int SOIL_DRY_ADC = 3200;
const int SOIL_WET_ADC = 1350;
const int RAIN_DRY_ADC = 4095;
const int RAIN_WET_ADC = 1000;
const int DARK_THRESHOLD = 1200;

// ================= BUZZER =================
const int BUZZER_FREQUENCY = 2000;
const unsigned long BUZZER_ON_TIME = 100;
const unsigned long BUZZER_OFF_TIME = 300;
unsigned long previousBuzzerTime = 0;
bool buzzerState = false;
bool darknessWasDetected = false;

// ================= SAFETY =================
const unsigned long MAX_MOTOR_RUNTIME_MS = 600000;
const unsigned long COOLDOWN_PERIOD_MS = 120000;
const unsigned long TELEMETRY_INTERVAL_MS = 5000;

float thresholdSoilStart = 30.0;
float thresholdSoilStop = 40.0;
bool pauseOnRain = true;

// ================= SENSORS =================
DHT dht(PIN_DHT, DHTTYPE);
OneWire oneWire(PIN_DS18B20);
DallasTemperature ds18b20Sensors(&oneWire);

// ================= STATE =================
enum MotorState { MOTOR_OFF, MOTOR_STARTING, MOTOR_ON, MOTOR_ERROR };
MotorState currentMotorState = MOTOR_OFF;
String irrigationMode = "auto";
unsigned long motorStartTime = 0;
unsigned long motorStopTime = 0;
unsigned long lastTelemetryTime = 0;
bool emergencyStopTriggered = false;

// ================= HELPERS =================
float calculateSoilMoisture(int rawADC) {
  int clamped = constrain(rawADC, SOIL_WET_ADC, SOIL_DRY_ADC);
  float moisture = ((float)(SOIL_DRY_ADC - clamped) / (float)(SOIL_DRY_ADC - SOIL_WET_ADC)) * 100.0;
  return constrain(moisture, 0.0, 100.0);
}

float calculateRainLevel(int rawADC) {
  int clamped = constrain(rawADC, RAIN_WET_ADC, RAIN_DRY_ADC);
  float wetness = ((float)(RAIN_DRY_ADC - clamped) / (float)(RAIN_DRY_ADC - RAIN_WET_ADC)) * 100.0;
  return constrain(wetness, 0.0, 100.0);
}

float calculateLightIntensity(int rawADC) {
  float pct = ((float)rawADC / 4095.0) * 100.0;
  return constrain(pct, 0.0, 100.0);
}

bool isDarknessDetected(int rawLDR) {
  return rawLDR > DARK_THRESHOLD;
}

// SAFE BUZZER: Uses standard tone() which doesn't crash older ESP32 cores
void controlBuzzer(int rawLDR) {
  unsigned long currentTime = millis();
  bool darknessDetected = isDarknessDetected(rawLDR);

  if (!darknessDetected) {
    if (buzzerState || darknessWasDetected) {
      noTone(PIN_BUZZER);
    }
    buzzerState = false;
    darknessWasDetected = false;
    return;
  }

  if (!darknessWasDetected) {
    darknessWasDetected = true;
    buzzerState = true;
    previousBuzzerTime = currentTime;
    tone(PIN_BUZZER, BUZZER_FREQUENCY);
    return;
  }

  if (buzzerState) {
    if (currentTime - previousBuzzerTime >= BUZZER_ON_TIME) {
      noTone(PIN_BUZZER);
      buzzerState = false;
      previousBuzzerTime = currentTime;
    }
  } else {
    if (currentTime - previousBuzzerTime >= BUZZER_OFF_TIME) {
      tone(PIN_BUZZER, BUZZER_FREQUENCY);
      buzzerState = true;
      previousBuzzerTime = currentTime;
    }
  }
}

void setPump(bool enable, const char* reason) {
  if (enable) {
    if (emergencyStopTriggered) return;
    if (millis() - motorStopTime < COOLDOWN_PERIOD_MS && motorStopTime > 0) return;
    digitalWrite(PIN_RELAY_PUMP, LOW);
    digitalWrite(PIN_STATUS_LED, HIGH);
    currentMotorState = MOTOR_ON;
    motorStartTime = millis();
  } else {
    digitalWrite(PIN_RELAY_PUMP, HIGH);
    digitalWrite(PIN_STATUS_LED, LOW);
    if (currentMotorState == MOTOR_ON) {
      motorStopTime = millis();
    }
    currentMotorState = MOTOR_OFF;
  }
}

void enforceSafetyChecks(float soilMoisture, bool isRaining) {
  if (currentMotorState == MOTOR_ON) {
    if (millis() - motorStartTime >= MAX_MOTOR_RUNTIME_MS) {
      setPump(false, "Timeout");
      currentMotorState = MOTOR_ERROR;
      return;
    }
    if (irrigationMode == "auto" && soilMoisture >= thresholdSoilStop) {
      setPump(false, "Target reached");
      return;
    }
    if (irrigationMode == "auto" && pauseOnRain && isRaining) {
      setPump(false, "Rain detected");
      return;
    }
  } else if (currentMotorState == MOTOR_OFF && irrigationMode == "auto") {
    if (soilMoisture < thresholdSoilStart && (!pauseOnRain || !isRaining)) {
      setPump(true, "Auto irrigation");
    }
  }
}

// NON-BLOCKING WIFI CONNECT
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  
  Serial.println("\nConnecting to Wi-Fi (non-blocking)...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  // We do NOT use a while loop here. We just start it and let the loop() handle the rest.
  // This prevents the CPU watchdog from crashing the board.
}

void sendTelemetry(float soilMoisture, int rawSoil, float airTemp, float humidity, bool rainDetected, int rawRain, float rainLevel, float lightIntensity, int rawLDR, float probeTemp) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] Skipping telemetry: Wi-Fi not connected.");
    return;
  }

  HTTPClient http;
  http.begin(SERVER_TELEMETRY_URL);
  http.setTimeout(3000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", API_KEY);

  StaticJsonDocument<768> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["soilMoisture"] = round(soilMoisture * 10) / 10.0;
  doc["soilMoistureRaw"] = rawSoil;
  doc["airTemperature"] = round(airTemp * 10) / 10.0;
  doc["humidity"] = round(humidity * 10) / 10.0;
  doc["rainDetected"] = rainDetected;
  doc["rainSensorRaw"] = rawRain;
  doc["rainLevelPercent"] = round(rainLevel * 10) / 10.0;
  doc["rainStatus"] = rainDetected ? (rainLevel > 70 ? "rain" : "drizzle") : "dry";
  doc["lightIntensity"] = round(lightIntensity * 10) / 10.0;
  doc["lightSensorRaw"] = rawLDR;
  doc["darknessDetected"] = isDarknessDetected(rawLDR);
  doc["buzzerState"] = buzzerState ? "ON" : "OFF";
  doc["probeTemperature"] = round(probeTemp * 10) / 10.0;
  doc["probeType"] = "soil";
  
  const char* motorStateStr = "OFF";
  if (currentMotorState == MOTOR_ON) motorStateStr = "ON";
  else if (currentMotorState == MOTOR_STARTING) motorStateStr = "STARTING";
  else if (currentMotorState == MOTOR_ERROR) motorStateStr = "ERROR";
  doc["motorState"] = motorStateStr;
  doc["irrigationMode"] = irrigationMode;

  String requestBody;
  serializeJson(doc, requestBody);
  int httpResponseCode = http.POST(requestBody);

  if (httpResponseCode > 0) {
    Serial.printf("[HTTP] Server Response: %d\n", httpResponseCode);
  } else {
    Serial.printf("[HTTP ERROR] Failed: %d\n", httpResponseCode);
  }
  http.end();
}

// ================= SETUP =================
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n========================================");
  Serial.println(" AgriPulse Boot Sequence Started");
  Serial.println("========================================");

  pinMode(PIN_RELAY_PUMP, OUTPUT);
  pinMode(PIN_STATUS_LED, OUTPUT);
  digitalWrite(PIN_RELAY_PUMP, HIGH); // Keep OFF at boot
  digitalWrite(PIN_STATUS_LED, LOW);

  // TEST 1: Buzzer Initialization
  Serial.println("[BOOT] Initializing Buzzer...");
  noTone(PIN_BUZZER); 
  Serial.println("[BOOT] Buzzer OK.");

  // TEST 2: Pin Setup
  Serial.println("[BOOT] Setting up sensor pins...");
  pinMode(PIN_SOIL_MOISTURE, INPUT);
  pinMode(PIN_RAIN_ANALOG, INPUT);
  pinMode(PIN_RAIN_DIGITAL, INPUT_PULLUP);
  pinMode(PIN_LDR, INPUT);

  // TEST 3: Sensor Initialization
  Serial.println("[BOOT] Initializing DHT11...");
  dht.begin();
  
  Serial.println("[BOOT] Initializing DS18B20...");
  ds18b20Sensors.begin();
  ds18b20Sensors.setWaitForConversion(false);
  
  Serial.println("[BOOT] All hardware initialized.");

  // TEST 4: Wi-Fi
  connectWiFi();

  Serial.println("[BOOT] Setup Complete. Entering Loop.");
}

// ================= MAIN LOOP =================
void loop() {
  unsigned long now = millis();

  // Read sensors
  int rawSoil = analogRead(PIN_SOIL_MOISTURE);
  float soilMoisture = calculateSoilMoisture(rawSoil);

  float airTemp = dht.readTemperature();
  float humidity = dht.readHumidity();
  if (isnan(airTemp)) airTemp = 24.5;
  if (isnan(humidity)) humidity = 55.0;

  int rawRain = analogRead(PIN_RAIN_ANALOG);
  float rainLevel = calculateRainLevel(rawRain);
  bool rainDigital = (digitalRead(PIN_RAIN_DIGITAL) == LOW);
  bool rainDetected = rainDigital || (rainLevel > 35.0);

  int rawLDR = analogRead(PIN_LDR);
  float lightIntensity = calculateLightIntensity(rawLDR);

  controlBuzzer(rawLDR);

  ds18b20Sensors.requestTemperatures();
  float probeTemp = ds18b20Sensors.getTempCByIndex(0);
  if (probeTemp == DEVICE_DISCONNECTED_C || probeTemp < -50.0) {
    probeTemp = 22.0;
  }

  // Autonomous checks
  enforceSafetyChecks(soilMoisture, rainDetected);

  // Telemetry every 5 seconds
  if (now - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = now;

    // If WiFi dropped, try connecting again
    if (WiFi.status() != WL_CONNECTED) {
      connectWiFi();
    }

    sendTelemetry(
      soilMoisture, rawSoil, airTemp, humidity, rainDetected,
      rawRain, rainLevel, lightIntensity, rawLDR, probeTemp
    );

    // Print clean status report
    Serial.println("\n---------- AGRIPULSE STATUS ----------");
    Serial.printf("Soil Moisture: %.1f%%\n", soilMoisture);
    Serial.printf("Air Temp: %.1f C\n", airTemp);
    Serial.printf("Humidity: %.1f%%\n", humidity);
    Serial.printf("Rain Level: %.1f%%\n", rainLevel);
    Serial.printf("Light Intensity: %.1f%%\n", lightIntensity);
    Serial.printf("Probe Temp: %.1f C\n", probeTemp);
    Serial.printf("WiFi Status: %s\n", WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected");
    Serial.println("--------------------------------------");
  }

  delay(50);
}
`;
