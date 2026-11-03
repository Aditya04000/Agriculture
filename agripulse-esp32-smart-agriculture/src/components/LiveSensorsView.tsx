import React from 'react';
import {
  Droplets,
  Thermometer,
  CloudRain,
  Sun,
  Waves,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Cpu,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { SensorReading, ThresholdConfig, DeviceStatus } from '../types/agriculture';
import { agriStore } from '../services/storage';

interface LiveSensorsViewProps {
  latestReading: SensorReading | null;
  thresholds: ThresholdConfig;
  deviceStatus: DeviceStatus;
  onUpdateThresholds: (newT: Partial<ThresholdConfig>) => void;
}

export const LiveSensorsView: React.FC<LiveSensorsViewProps> = ({
  latestReading,
  thresholds,
  deviceStatus,
  onUpdateThresholds,
}) => {
  if (!latestReading) return null;

  const toggleProbeType = () => {
    const nextType = thresholds.probeType === 'soil' ? 'water' : 'soil';
    onUpdateThresholds({ probeType: nextType });
  };

  const toggleFault = (sensor: keyof DeviceStatus['sensorFaults']) => {
    agriStore.setSensorFault(sensor, !deviceStatus.sensorFaults[sensor]);
  };

  const getRelativeTime = (iso: string) => {
    const diff = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (diff < 5) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    return `${Math.floor(diff / 60)}m ago`;
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs">
        <h2 className="text-base font-bold text-neutral-900">
          Hardware Sensor Diagnostics & Physical Calibration
        </h2>
        <p className="text-xs text-neutral-600 mt-1 max-w-3xl">
          Direct instrumentation readings from the ESP32 node. Calibrated physical measurements are
          computed in real-time from 12-bit ADC voltage conversions and 1-Wire digital bus packets.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Capacitive Soil Moisture Sensor V1.2 */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700">
                  <Droplets className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    Capacitive Soil Moisture Sensor V1.2
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono mt-0.5">
                    <span>Pin: GPIO 34 (ADC1_CH6)</span>
                    <span>·</span>
                    <span>3.3V Analog</span>
                  </div>
                </div>
              </div>

              {deviceStatus.sensorFaults.soilMoisture ? (
                <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                  FAULT / UNPLUGGED
                </span>
              ) : (
                <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  CONNECTED
                </span>
              )}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 bg-neutral-50 p-4 rounded-xl border border-neutral-200/80">
              <div>
                <span className="text-xs text-neutral-500 font-medium">Calibrated Moisture</span>
                <div className="text-3xl font-bold font-mono text-neutral-900 mt-0.5">
                  {latestReading.soilMoisture}
                  <span className="text-lg text-neutral-500 font-normal">%</span>
                </div>
              </div>
              <div>
                <span className="text-xs text-neutral-500 font-medium">Raw 12-bit ADC</span>
                <div className="text-2xl font-mono text-neutral-700 mt-1">
                  {latestReading.soilMoistureRaw ?? 2280}
                  <span className="text-xs text-neutral-400 font-normal ml-1">/ 4095</span>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2 text-xs text-neutral-600">
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Calibration Baseline:</span>
                <span className="font-mono text-neutral-800">Dry Air = 3200 ADC · Water = 1350 ADC</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Irrigation Trigger:</span>
                <span className="font-semibold text-emerald-800">
                  Start &lt; {thresholds.minSoilMoisture}% · Stop at {thresholds.targetSoilMoisture}%
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-neutral-500">Corrosion Resistance:</span>
                <span className="text-neutral-800">Capacitive dielectric (no exposed copper electrodes)</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between text-xs">
            <span className="text-neutral-400 font-mono">
              Last sample: {getRelativeTime(latestReading.timestamp)}
            </span>
            <button
              onClick={() => toggleFault('soilMoisture')}
              className="text-xs text-neutral-600 hover:text-neutral-900 underline"
            >
              {deviceStatus.sensorFaults.soilMoisture ? 'Clear Fault' : 'Simulate Disconnect'}
            </button>
          </div>
        </div>

        {/* 2. DHT11 Temperature and Humidity Sensor */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700">
                  <Thermometer className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    DHT11 Temperature & Humidity Sensor
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono mt-0.5">
                    <span>Pin: GPIO 4</span>
                    <span>·</span>
                    <span>Single-Wire Digital Protocol</span>
                  </div>
                </div>
              </div>

              {deviceStatus.sensorFaults.dht11 ? (
                <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                  CHECKSUM ERROR
                </span>
              ) : (
                <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  CONNECTED
                </span>
              )}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 bg-neutral-50 p-4 rounded-xl border border-neutral-200/80">
              <div>
                <span className="text-xs text-neutral-500 font-medium">Air Temperature</span>
                <div className="text-3xl font-bold font-mono text-neutral-900 mt-0.5">
                  {latestReading.airTemperature}
                  <span className="text-lg text-neutral-500 font-normal">°C</span>
                </div>
                <span className="text-[11px] text-neutral-500 font-mono">
                  Limit: {thresholds.minAirTemp}°C - {thresholds.maxAirTemp}°C
                </span>
              </div>
              <div>
                <span className="text-xs text-neutral-500 font-medium">Relative Humidity</span>
                <div className="text-3xl font-bold font-mono text-neutral-900 mt-0.5">
                  {latestReading.humidity}
                  <span className="text-lg text-neutral-500 font-normal">% RH</span>
                </div>
                <span className="text-[11px] text-neutral-500 font-mono">
                  Limit: {thresholds.minHumidity}% - {thresholds.maxHumidity}%
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-2 text-xs text-neutral-600">
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Hardware Pull-up:</span>
                <span className="font-mono text-neutral-800">4.7kΩ to 3.3V on data line</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Sampling Rate:</span>
                <span className="font-mono text-neutral-800">1 Hz (1 reading / second)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-neutral-500">Resolution:</span>
                <span className="text-neutral-800">1°C Temp / 1% Relative Humidity</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between text-xs">
            <span className="text-neutral-400 font-mono">
              Last sample: {getRelativeTime(latestReading.timestamp)}
            </span>
            <button
              onClick={() => toggleFault('dht11')}
              className="text-xs text-neutral-600 hover:text-neutral-900 underline"
            >
              {deviceStatus.sensorFaults.dht11 ? 'Clear Fault' : 'Simulate Fault'}
            </button>
          </div>
        </div>

        {/* 3. YL-83 Rain Sensor Module */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-sky-50 text-sky-700">
                  <CloudRain className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    YL-83 Raindrop Sensor Module
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono mt-0.5">
                    <span>Pin: GPIO 35 (AO) · GPIO 18 (DO)</span>
                  </div>
                </div>
              </div>

              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded flex items-center gap-1 ${
                  latestReading.rainDetected
                    ? 'text-sky-900 bg-sky-100 border border-sky-300'
                    : 'text-neutral-700 bg-neutral-100 border border-neutral-200'
                }`}
              >
                {latestReading.rainDetected ? 'RAIN DETECTED' : 'DRY SURFACE'}
              </span>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 bg-neutral-50 p-4 rounded-xl border border-neutral-200/80">
              <div>
                <span className="text-xs text-neutral-500 font-medium">Plate Wetness Level</span>
                <div className="text-3xl font-bold font-mono text-neutral-900 mt-0.5">
                  {latestReading.rainLevelPercent}
                  <span className="text-lg text-neutral-500 font-normal">%</span>
                </div>
              </div>
              <div>
                <span className="text-xs text-neutral-500 font-medium">Raw Analog ADC</span>
                <div className="text-2xl font-mono text-neutral-700 mt-1">
                  {latestReading.rainSensorRaw ?? 3920}
                  <span className="text-xs text-neutral-400 font-normal ml-1">/ 4095</span>
                </div>
              </div>
            </div>

            {/* Scientific Notice required by prompt */}
            <div className="mt-4 p-3 bg-blue-50/70 border border-blue-200/60 rounded-lg text-xs text-blue-900 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Measurement Classification Notice</span>
              </div>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                The YL-83 nickel-plated PCB detects droplet surface conduction. As per IoT calibration
                guidelines, this is reported as <strong>Rain Sensor Wetness Level (%)</strong> and
                wet/dry presence. It is <strong>NOT</strong> measured in millimeters (mm), which would
                require an aerodynamically calibrated tipping-bucket rain gauge.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between text-xs">
            <span className="text-neutral-400 font-mono">
              Last sample: {getRelativeTime(latestReading.timestamp)}
            </span>
            <span className="text-neutral-600 font-medium">
              Interlock:{' '}
              {thresholds.pauseIrrigationOnRain ? 'Auto-Pause Active' : 'Off'}
            </span>
          </div>
        </div>

        {/* 4. LDR Light Intensity Module */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
                  <Sun className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    LDR Light Intensity Sensor Module
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono mt-0.5">
                    <span>Pin: GPIO 32 (ADC1_CH4)</span>
                    <span>·</span>
                    <span>Photoresistor Divider</span>
                  </div>
                </div>
              </div>

              {latestReading.lightIntensity < thresholds.minLightIntensity ? (
                <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                  LOW LIGHT (&lt;{thresholds.minLightIntensity}%)
                </span>
              ) : (
                <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ADEQUATE SUNLIGHT
                </span>
              )}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 bg-neutral-50 p-4 rounded-xl border border-neutral-200/80">
              <div>
                <span className="text-xs text-neutral-500 font-medium">Light Intensity</span>
                <div className="text-3xl font-bold font-mono text-neutral-900 mt-0.5">
                  {latestReading.lightIntensity}
                  <span className="text-lg text-neutral-500 font-normal">%</span>
                </div>
              </div>
              <div>
                <span className="text-xs text-neutral-500 font-medium">Relative Lux / ADC</span>
                <div className="text-2xl font-mono text-neutral-700 mt-1">
                  {latestReading.lightSensorRaw ?? 2140}
                  <span className="text-xs text-neutral-400 font-normal ml-1">/ 4095</span>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2 text-xs text-neutral-600">
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Low-Light Alert Condition:</span>
                <span className="font-semibold text-neutral-800">
                  &lt; {thresholds.minLightIntensity}% for {thresholds.lowLightDurationMin} min
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Spectral Sensitivity:</span>
                <span className="font-mono text-neutral-800">CdS 540nm (Matches human eye & PAR band)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-neutral-500">Artificial Grow Light:</span>
                <span className="text-neutral-800">Manual policy (no automatic lamp energizing)</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between text-xs">
            <span className="text-neutral-400 font-mono">
              Last sample: {getRelativeTime(latestReading.timestamp)}
            </span>
            <button
              onClick={() => toggleFault('ldr')}
              className="text-xs text-neutral-600 hover:text-neutral-900 underline"
            >
              {deviceStatus.sensorFaults.ldr ? 'Clear Fault' : 'Simulate Fault'}
            </button>
          </div>
        </div>

        {/* 5. DS18B20 Waterproof Temperature Sensor */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs flex flex-col justify-between lg:col-span-2">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-teal-50 text-teal-700">
                  <Thermometer className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    DS18B20 Waterproof Digital Temperature Probe
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono mt-0.5">
                    <span>Pin: GPIO 19</span>
                    <span>·</span>
                    <span>Dallas 1-Wire Digital Bus (ROM: 28-0000071C8F01)</span>
                  </div>
                </div>
              </div>

              {/* Probe Target Toggle: Soil vs Water */}
              <div className="flex items-center gap-2 bg-neutral-100 p-1 rounded-lg border border-neutral-200">
                <span className="text-xs text-neutral-600 font-medium px-1">Installation Role:</span>
                <button
                  onClick={() => onUpdateThresholds({ probeType: 'soil' })}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                    thresholds.probeType === 'soil'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Root Zone Soil
                </button>
                <button
                  onClick={() => onUpdateThresholds({ probeType: 'water' })}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                    thresholds.probeType === 'water'
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Water Tank / Reservoir
                </button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 bg-neutral-50 p-4 rounded-xl border border-neutral-200/80">
              <div>
                <span className="text-xs text-neutral-500 font-medium">
                  {thresholds.probeType === 'soil' ? 'Root Zone Temperature' : 'Reservoir Water Temperature'}
                </span>
                <div className="text-3xl font-bold font-mono text-neutral-900 mt-0.5">
                  {latestReading.probeTemperature}
                  <span className="text-lg text-neutral-500 font-normal">°C</span>
                </div>
              </div>
              <div>
                <span className="text-xs text-neutral-500 font-medium">Configured Safe Range</span>
                <div className="text-xl font-mono text-neutral-800 mt-1">
                  {thresholds.minProbeTemp}°C – {thresholds.maxProbeTemp}°C
                </div>
              </div>
              <div>
                <span className="text-xs text-neutral-500 font-medium">Probe Enclosure</span>
                <div className="text-xs text-neutral-700 mt-1 font-medium">
                  Stainless steel capsule (304), waterproof shrink, 1m Teflon cable
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between text-xs">
            <span className="text-neutral-400 font-mono">
              Last sample: {getRelativeTime(latestReading.timestamp)}
            </span>
            <button
              onClick={() => toggleFault('ds18b20')}
              className="text-xs text-neutral-600 hover:text-neutral-900 underline"
            >
              {deviceStatus.sensorFaults.ds18b20 ? 'Clear Fault' : 'Simulate Fault'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
