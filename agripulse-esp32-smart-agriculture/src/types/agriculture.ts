/**
 * Smart Agriculture & Automatic Irrigation System Data Types
 */

export type MotorState = 'OFF' | 'STARTING' | 'ON' | 'ERROR';
export type IrrigationMode = 'auto' | 'manual' | 'disabled';
export type ProbeType = 'soil' | 'water';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type RainStatus = 'dry' | 'drizzle' | 'rain';

export interface SensorReading {
  id: string;
  deviceId: string;
  timestamp: string; // ISO 8601
  
  // Capacitive Soil Moisture Sensor V1.2
  soilMoisture: number; // Percentage 0-100% (calibrated)
  soilMoistureRaw?: number; // Raw ADC value (e.g. 1400 wet - 3200 dry)
  
  // DHT11 Air Temperature & Humidity
  airTemperature: number; // °C
  humidity: number; // % RH
  
  // YL-83 Rain Sensor
  rainDetected: boolean;
  rainSensorRaw?: number; // Raw ADC value (e.g. 1000 wet - 4095 dry)
  rainLevelPercent: number; // Relative wetness level 0-100%
  rainStatus: RainStatus;
  
  // LDR Light Intensity Sensor
  lightIntensity: number; // Percentage 0-100% (or relative lux)
  lightSensorRaw?: number; // Raw ADC value
  
  // DS18B20 Waterproof Temperature Sensor
  probeTemperature: number; // °C
  probeType: ProbeType; // 'soil' or 'water'
  
  // Actuator feedback
  motorState: MotorState;
  
  // Flags
  isSimulated?: boolean;
}

export interface ThresholdConfig {
  // Soil Moisture
  minSoilMoisture: number; // Default: 30% (Trigger start)
  targetSoilMoisture: number; // Default: 40% (Target stop - hysteresis)
  
  // Air Temperature (DHT11)
  minAirTemp: number; // Default: 15°C
  maxAirTemp: number; // Default: 35°C
  
  // Humidity (DHT11)
  minHumidity: number; // Default: 40%
  maxHumidity: number; // Default: 85%
  
  // Rain Sensor (YL-83)
  rainThresholdRaw: number; // Default: 2500 (lower means more water detected)
  pauseIrrigationOnRain: boolean; // Auto-interlock
  
  // Light Intensity (LDR)
  minLightIntensity: number; // Default: 20%
  lowLightDurationMin: number; // Debounce minutes before alert (e.g. 5 min)
  
  // DS18B20 Waterproof Probe
  probeType: ProbeType;
  minProbeTemp: number; // Default: 12°C
  maxProbeTemp: number; // Default: 32°C
  
  // Safety & Motor Controls
  maxMotorRuntimeSeconds: number; // Default: 900s (15 min safety timeout)
  cooldownPeriodSeconds: number; // Minimum off-time between irrigation cycles
}

export interface AlertItem {
  id: string;
  title: string;
  severity: AlertSeverity;
  sensor: string;
  measuredValue: string | number;
  thresholdValue: string | number;
  unit: string;
  timestamp: string;
  recommendedAction: string;
  isRead: boolean;
  isAcknowledged: boolean;
  category: 'sensor' | 'motor' | 'system';
}

export interface MotorEvent {
  id: string;
  timestamp: string;
  action: 'START' | 'STOP' | 'EMERGENCY_STOP' | 'TIMEOUT' | 'FAULT';
  previousState: MotorState;
  newState: MotorState;
  reason: string;
  moistureAtTrigger?: number;
  runtimeSeconds?: number;
}

export interface LowLightPeriod {
  startTime: string;
  endTime?: string;
  minRecorded: number;
  durationMinutes: number;
  recovered: boolean;
}

export interface RainPeriod {
  startTime: string;
  endTime?: string;
  durationMinutes: number;
  maxWetness: number;
  active: boolean;
}

export interface HardwarePacketLogItem {
  id: string;
  timestamp: string;
  clientIp?: string;
  rawPayload: any;
  status: 'ACCEPTED' | 'REJECTED';
  soilMoisture: number;
  airTemperature: number;
  humidity: number;
  rainDetected: boolean;
  lightIntensity: number;
  probeTemperature: number;
  motorState: string;
  latencyMs?: number;
}

export interface DeviceStatus {
  deviceId: string;
  name: string;
  online: boolean;
  lastSeen: string;
  firmwareVersion: string;
  ipAddress: string;
  macAddress: string;
  wifiRssi: number; // dBm
  freeHeap: number; // Bytes
  uptimeSeconds: number;
  isDemoMode: boolean;
  isHardwareOnly: boolean;
  realPacketsReceived: number;
  lastHardwarePacketTimestamp?: string;
  sensorFaults: {
    soilMoisture: boolean;
    dht11: boolean;
    rain: boolean;
    ldr: boolean;
    ds18b20: boolean;
  };
}

export interface SystemStats {
  totalIrrigationCycles: number;
  totalWateringDurationMinutes: number;
  waterSavedGallonsEst: number;
  activeAlertCount: number;
  rainEventsCount: number;
  lowLightEventsCount: number;
}

// Weather & Microclimate Types
export interface HourlyWeather {
  time: string; // e.g. "12:00"
  temp: number; // °C
  humidity: number; // %
  pop: number; // Probability of precipitation %
  condition: string;
  icon: 'sunny' | 'cloudy' | 'rain' | 'storm' | 'windy';
  windSpeed: number; // km/h
}

export interface DailyWeather {
  day: string; // e.g. "Thu", "Fri"
  date: string; // e.g. "Oct 29"
  condition: string;
  tempMax: number;
  tempMin: number;
  pop: number; // Rain %
  rainMm: number; // Expected mm
  et0: number; // Evapotranspiration mm/day
  icon: 'sunny' | 'cloudy' | 'rain' | 'storm' | 'windy';
}

export interface AgriWeatherProfile {
  location: string;
  region: string;
  elevation: string;
  currentTemp: number; // °C
  feelsLike: number; // °C
  condition: string;
  humidity: number; // %
  windSpeed: number; // km/h
  windDirection: string;
  pressureHpa: number;
  uvIndex: number;
  dewPoint: number; // °C
  sunrise: string;
  sunset: string;
  et0Today: number; // mm/day
  hourly: HourlyWeather[];
  daily: DailyWeather[];
  sprayRecommendation: 'optimal' | 'moderate' | 'unsafe';
  sprayReason: string;
  frostRisk: 'none' | 'low' | 'moderate' | 'high';
  irrigationRecommendation: string;
}
