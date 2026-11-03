import {
  ThresholdConfig,
  DeviceStatus,
  AgriWeatherProfile,
} from "../types/agriculture";

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  minSoilMoisture: 30,
  targetSoilMoisture: 40,
  minAirTemp: 18,
  maxAirTemp: 36,
  minHumidity: 45,
  maxHumidity: 85,
  rainThresholdRaw: 2600,
  pauseIrrigationOnRain: true,
  minLightIntensity: 25,
  lowLightDurationMin: 5,
  probeType: "soil",
  minProbeTemp: 15,
  maxProbeTemp: 32,
  maxMotorRuntimeSeconds: 600,
  cooldownPeriodSeconds: 120,
};

export const INITIAL_DEVICE_STATUS: DeviceStatus = {
  deviceId: "ESP32-AGRI-01",
  name: "Field Greenhouse Node #1",
  online: false,
  lastSeen: "",
  firmwareVersion: "v2.4.1-agripulse",
  ipAddress: "",
  macAddress: "",
  wifiRssi: 0,
  freeHeap: 0,
  uptimeSeconds: 0,
  isDemoMode: false,
  isHardwareOnly: true,
  realPacketsReceived: 0,
  sensorFaults: {
    soilMoisture: false,
    dht11: false,
    rain: false,
    ldr: false,
    ds18b20: false,
  },
};

// Weather profile is retained only as a static reference table for forecast text,
// but WeatherLayout has been removed from navigation.
export const INITIAL_AGRI_WEATHER: AgriWeatherProfile = {
  location: "AgriPulse Test Farm - Plot 4",
  region: "Greenhouse & Microclimate Zone",
  elevation: "210 m AMSL",
  currentTemp: 0,
  feelsLike: 0,
  condition: "N/A",
  humidity: 0,
  windSpeed: 0,
  windDirection: "N/A",
  pressureHpa: 0,
  uvIndex: 0,
  dewPoint: 0,
  sunrise: "N/A",
  sunset: "N/A",
  et0Today: 0,
  sprayRecommendation: "moderate",
  sprayReason: "No regional weather station connected.",
  frostRisk: "none",
  irrigationRecommendation: "Rely on ESP32 sensor readings only.",
  hourly: [],
  daily: [],
};

export const ESP32_HARDWARE_PINS = [
  {
    sensor: "Capacitive Soil Moisture V1.2",
    pin: "GPIO 34 (ADC1_CH6)",
    type: "Analog Input (12-bit)",
    voltage: "3.3V",
    notes:
      "Corrosion-resistant capacitive probe. ADC Range: 3200 (Dry air) to 1350 (Water immersion).",
  },
  {
    sensor: "DHT11 Temp & Humidity",
    pin: "GPIO 4",
    type: "Digital Single-Wire",
    voltage: "3.3V / 5V",
    notes:
      "Requires 4.7kΩ–10kΩ pull-up resistor to 3.3V on data line. Sample rate: 1Hz.",
  },
  {
    sensor: "YL-83 Rain Sensor Plate",
    pin: "GPIO 35 (AO) / GPIO 18 (DO)",
    type: "Analog (ADC1) + Digital Interrupt",
    voltage: "3.3V",
    notes:
      "Analog pin reads surface water droplet coverage (0-4095). Digital pin triggers rain interrupt.",
  },
  {
    sensor: "LDR Light Intensity Module",
    pin: "GPIO 32 (ADC1_CH4)",
    type: "Analog Input (12-bit)",
    voltage: "3.3V",
    notes:
      "Photoresistor voltage divider. Higher light = lower resistance = higher voltage.",
  },
  {
    sensor: "DS18B20 Waterproof Probe",
    pin: "GPIO 19",
    type: "Dallas 1-Wire Digital",
    voltage: "3.3V / 5V",
    notes:
      "Requires 4.7kΩ pull-up resistor between VCC and DQ. Supports soil or water temperature.",
  },
  {
    sensor: "Relay Module (Submersible Pump)",
    pin: "GPIO 23",
    type: "Digital Output (Active LOW)",
    voltage: "5V (External supply for coil/pump)",
    notes:
      "Optocoupler isolated relay. NEVER power 12V/5V pump from ESP32 3.3V rail. Flyback diode recommended.",
  },
  {
    sensor: "Status Indicator LED",
    pin: "GPIO 2 (Onboard)",
    type: "Digital Output",
    voltage: "3.3V",
    notes:
      "Blinks on telemetry transmission; solid ON during active irrigation.",
  },
];
