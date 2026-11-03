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
const char* WIFI_SSID = "BIMAN";                                      
const char* WIFI_PASSWORD = "12345678";                              

const char* SERVER_TELEMETRY_URL = "http://10.5.95.26:3000/api/telemetry";
const char* DEVICE_ID = "ESP32-AGRI-01";

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

void controlBuzzer(int rawLDR) {
  unsigned long currentTime = millis();
  bool darknessDetected = isDarknessDetected(rawLDR);

  if (!darknessDetected) {
    if (buzzerState || darknessWasDetected) noTone(PIN_BUZZER);
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
    if (currentMotorState == MOTOR_ON) motorStopTime = millis();
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
    if (soilMoisture >= thresholdSoilStop) {
      setPump(false, "Target reached");
      return;
    }
    if (pauseOnRain && isRaining) {
      setPump(false, "Rain detected");
      return;
    }
  } else if (currentMotorState == MOTOR_OFF) {
    if (soilMoisture < thresholdSoilStart && (!pauseOnRain || !isRaining)) {
      setPump(true, "Auto irrigation");
    }
  }
}

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

void sendTelemetry(float soilMoisture, float airTemp, float humidity, bool rainDetected, float rainLevel, float lightIntensity, float probeTemp) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(SERVER_TELEMETRY_URL);
  http.setTimeout(3000); 
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<256> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["soilMoisture"] = round(soilMoisture * 10) / 10.0;
  doc["airTemperature"] = round(airTemp * 10) / 10.0;
  doc["humidity"] = round(humidity * 10) / 10.0;
  doc["rainDetected"] = rainDetected;
  doc["rainLevelPercent"] = round(rainLevel * 10) / 10.0;
  doc["rainStatus"] = rainDetected ? (rainLevel > 70 ? "rain" : "drizzle") : "dry";
  doc["lightIntensity"] = round(lightIntensity * 10) / 10.0;
  doc["probeTemperature"] = round(probeTemp * 10) / 10.0;
  
  const char* motorStateStr = "OFF";
  if (currentMotorState == MOTOR_ON) motorStateStr = "ON";
  doc["motorState"] = motorStateStr;

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

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  pinMode(PIN_RELAY_PUMP, OUTPUT);
  pinMode(PIN_STATUS_LED, OUTPUT);
  digitalWrite(PIN_RELAY_PUMP, HIGH); 
  digitalWrite(PIN_STATUS_LED, LOW);

  noTone(PIN_BUZZER); 
  pinMode(PIN_SOIL_MOISTURE, INPUT);
  pinMode(PIN_RAIN_ANALOG, INPUT);
  pinMode(PIN_RAIN_DIGITAL, INPUT_PULLUP);
  pinMode(PIN_LDR, INPUT);

  dht.begin();
  ds18b20Sensors.begin();
  ds18b20Sensors.setWaitForConversion(false);
  
  connectWiFi();
}

void loop() {
  unsigned long now = millis();

  int rawSoil = analogRead(PIN_SOIL_MOISTURE);
  float soilMoisture = calculateSoilMoisture(rawSoil);

  float airTemp = dht.readTemperature();
  float humidity = dht.readHumidity();
  if (isnan(airTemp)) airTemp = 0;
  if (isnan(humidity)) humidity = 0;

  int rawRain = analogRead(PIN_RAIN_ANALOG);
  float rainLevel = calculateRainLevel(rawRain);
  bool rainDigital = (digitalRead(PIN_RAIN_DIGITAL) == LOW);
  bool rainDetected = rainDigital || (rainLevel > 35.0);

  int rawLDR = analogRead(PIN_LDR);
  float lightIntensity = calculateLightIntensity(rawLDR);

  controlBuzzer(rawLDR);

  ds18b20Sensors.requestTemperatures();
  float probeTemp = ds18b20Sensors.getTempCByIndex(0);
  if (probeTemp == DEVICE_DISCONNECTED_C || probeTemp < -50.0) probeTemp = 0;

  enforceSafetyChecks(soilMoisture, rainDetected);

  if (now - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = now;

    if (WiFi.status() != WL_CONNECTED) {
      connectWiFi();
    } else {
      sendTelemetry(soilMoisture, airTemp, humidity, rainDetected, rainLevel, lightIntensity, probeTemp);
    }

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
