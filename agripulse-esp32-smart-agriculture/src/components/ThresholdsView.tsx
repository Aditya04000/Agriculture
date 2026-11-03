import React, { useState } from 'react';
import {
  Sliders,
  Check,
  RotateCcw,
  AlertCircle,
  Droplets,
  Thermometer,
  CloudRain,
  Sun,
  ShieldCheck,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { ThresholdConfig } from '../types/agriculture';
import { DEFAULT_THRESHOLDS } from '../utils/constants';

interface ThresholdsViewProps {
  currentThresholds: ThresholdConfig;
  onSave: (updated: ThresholdConfig) => void;
}

export const ThresholdsView: React.FC<ThresholdsViewProps> = ({
  currentThresholds,
  onSave,
}) => {
  const [form, setForm] = useState<ThresholdConfig>({ ...currentThresholds });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    // Soil Moisture validation
    if (form.minSoilMoisture < 5 || form.minSoilMoisture > 80) {
      errs.minSoilMoisture = 'Minimum soil moisture must be between 5% and 80%.';
    }
    if (form.targetSoilMoisture <= form.minSoilMoisture) {
      errs.targetSoilMoisture = 'Target stop moisture must be greater than minimum start trigger (hysteresis).';
    }
    if (form.targetSoilMoisture > 95) {
      errs.targetSoilMoisture = 'Target stop moisture cannot exceed 95%.';
    }

    // Air Temperature validation
    if (form.minAirTemp < -10 || form.minAirTemp > 45) {
      errs.minAirTemp = 'Minimum temperature must be between -10°C and 45°C.';
    }
    if (form.maxAirTemp <= form.minAirTemp) {
      errs.maxAirTemp = 'Maximum temperature must be higher than minimum temperature.';
    }

    // Humidity validation
    if (form.minHumidity < 10 || form.minHumidity > 80) {
      errs.minHumidity = 'Minimum relative humidity must be between 10% and 80%.';
    }
    if (form.maxHumidity <= form.minHumidity || form.maxHumidity > 99) {
      errs.maxHumidity = 'Maximum relative humidity must exceed minimum and be ≤ 99%.';
    }

    // Light Intensity validation
    if (form.minLightIntensity < 1 || form.minLightIntensity > 90) {
      errs.minLightIntensity = 'Minimum light intensity must be between 1% and 90%.';
    }
    if (form.lowLightDurationMin < 1 || form.lowLightDurationMin > 120) {
      errs.lowLightDurationMin = 'Low-light duration filter must be between 1 and 120 minutes.';
    }

    // DS18B20 Probe validation
    if (form.minProbeTemp < 0 || form.minProbeTemp > 45) {
      errs.minProbeTemp = 'Probe minimum temperature must be between 0°C and 45°C.';
    }
    if (form.maxProbeTemp <= form.minProbeTemp) {
      errs.maxProbeTemp = 'Probe maximum temperature must be higher than minimum.';
    }

    // Safety Motor Runtime validation
    if (form.maxMotorRuntimeSeconds < 60 || form.maxMotorRuntimeSeconds > 3600) {
      errs.maxMotorRuntimeSeconds = 'Safety timeout must be between 60s (1 min) and 3600s (60 min).';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave(form);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    }
  };

  const handleCancel = () => {
    setForm({ ...currentThresholds });
    setErrors({});
  };

  const handleResetDefaults = () => {
    setForm({ ...DEFAULT_THRESHOLDS });
    setErrors({});
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-neutral-900">
            Agricultural Thresholds & Hysteresis Rules
          </h2>
          <p className="text-xs text-neutral-600 mt-1 max-w-2xl leading-relaxed">
            Configure dynamic autonomous rules for soil irrigation, temperature stress alarms, humidity bounds,
            and safety limits. All thresholds are stored persistently and synced to the ESP32 controller.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetDefaults}
          className="px-3.5 py-1.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset to Defaults</span>
        </button>
      </div>

      {/* Success Notification Banner */}
      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 flex items-center gap-3 text-emerald-900 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <span className="text-sm font-bold block">Threshold settings saved successfully!</span>
            <span className="text-xs text-emerald-800">
              New parameters are now active across the autonomous state machine and ESP32 sync bus.
            </span>
          </div>
        </div>
      )}

      {/* Threshold Configuration Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* SECTION 1: Soil Moisture & Automatic Irrigation Rules */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-100">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                1. Soil Moisture & Automatic Irrigation Hysteresis
              </h3>
              <p className="text-xs text-neutral-500">
                Initial Rule: IF soil moisture &lt; 30%, THEN request irrigation until target is satisfied.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Start Moisture Threshold */}
            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1">
                Irrigation Trigger Threshold (Start Pump)
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  step="0.5"
                  value={form.minSoilMoisture}
                  onChange={(e) => setForm({ ...form, minSoilMoisture: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-l-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
                />
                <span className="px-3 py-2 text-xs font-semibold bg-neutral-100 border border-l-0 border-neutral-300 rounded-r-lg text-neutral-600">
                  % Moisture
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                When soil moisture drops below this value, the ESP32 initiates automatic watering. (Default: 30%)
              </p>
              {errors.minSoilMoisture && (
                <p className="text-[11px] text-red-600 mt-1 font-medium">{errors.minSoilMoisture}</p>
              )}
            </div>

            {/* Target Stop Moisture Threshold */}
            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1">
                Target Moisture Threshold (Stop Pump)
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  step="0.5"
                  value={form.targetSoilMoisture}
                  onChange={(e) => setForm({ ...form, targetSoilMoisture: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-l-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
                />
                <span className="px-3 py-2 text-xs font-semibold bg-neutral-100 border border-l-0 border-neutral-300 rounded-r-lg text-neutral-600">
                  % Moisture
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                Hysteresis target. Prevents rapid on/off cycling by continuing to water until this target is reached. (Default: 40%)
              </p>
              {errors.targetSoilMoisture && (
                <p className="text-[11px] text-red-600 mt-1 font-medium">{errors.targetSoilMoisture}</p>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: DHT11 Air Temperature & Humidity Bounds */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-100">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <Thermometer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                2. Air Temperature & Relative Humidity Limits (DHT11)
              </h3>
              <p className="text-xs text-neutral-500">
                Generates actionable greenhouse alarms when ambient conditions leave the healthy vegetative window.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Min Temp */}
            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1">
                Minimum Air Temperature Limit
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  step="0.5"
                  value={form.minAirTemp}
                  onChange={(e) => setForm({ ...form, minAirTemp: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-l-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
                />
                <span className="px-3 py-2 text-xs font-semibold bg-neutral-100 border border-l-0 border-neutral-300 rounded-r-lg text-neutral-600">
                  °C
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                Triggers frost / cold chill alert if temperature drops below this level. (Default: 18°C)
              </p>
              {errors.minAirTemp && (
                <p className="text-[11px] text-red-600 mt-1 font-medium">{errors.minAirTemp}</p>
              )}
            </div>

            {/* Max Temp */}
            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1">
                Maximum Air Temperature Limit
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  step="0.5"
                  value={form.maxAirTemp}
                  onChange={(e) => setForm({ ...form, maxAirTemp: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-l-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
                />
                <span className="px-3 py-2 text-xs font-semibold bg-neutral-100 border border-l-0 border-neutral-300 rounded-r-lg text-neutral-600">
                  °C
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                Triggers heat stress warning to open louvers or deploy shade curtains. (Default: 36°C)
              </p>
              {errors.maxAirTemp && (
                <p className="text-[11px] text-red-600 mt-1 font-medium">{errors.maxAirTemp}</p>
              )}
            </div>

            {/* Min Humidity */}
            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1">
                Minimum Relative Humidity
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  step="1"
                  value={form.minHumidity}
                  onChange={(e) => setForm({ ...form, minHumidity: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-l-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
                />
                <span className="px-3 py-2 text-xs font-semibold bg-neutral-100 border border-l-0 border-neutral-300 rounded-r-lg text-neutral-600">
                  % RH
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                Warns of excessive vapor pressure deficit (VPD) and desiccation risk. (Default: 45%)
              </p>
              {errors.minHumidity && (
                <p className="text-[11px] text-red-600 mt-1 font-medium">{errors.minHumidity}</p>
              )}
            </div>

            {/* Max Humidity */}
            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1">
                Maximum Relative Humidity
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  step="1"
                  value={form.maxHumidity}
                  onChange={(e) => setForm({ ...form, maxHumidity: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-l-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
                />
                <span className="px-3 py-2 text-xs font-semibold bg-neutral-100 border border-l-0 border-neutral-300 rounded-r-lg text-neutral-600">
                  % RH
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                Warns of high fungal sporulation risk (powdery mildew / blight). (Default: 85%)
              </p>
              {errors.maxHumidity && (
                <p className="text-[11px] text-red-600 mt-1 font-medium">{errors.maxHumidity}</p>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 3: Rain Interlock & YL-83 Parameters */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-100">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
              <CloudRain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                3. Rain Detection & Irrigation Interlock (YL-83)
              </h3>
              <p className="text-xs text-neutral-500">
                Automatic suspension of irrigation cycles during natural rainfall.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Auto Rain Interlock Toggle */}
            <div className="flex items-start gap-3 p-4 bg-neutral-50 rounded-xl border border-neutral-200/80">
              <input
                type="checkbox"
                id="pauseOnRain"
                checked={form.pauseIrrigationOnRain}
                onChange={(e) => setForm({ ...form, pauseIrrigationOnRain: e.target.checked })}
                className="mt-1 w-4 h-4 text-emerald-600 rounded border-neutral-300 focus:ring-emerald-500"
              />
              <div>
                <label htmlFor="pauseOnRain" className="text-xs font-bold text-neutral-900 cursor-pointer block">
                  Automatic Rain Interlock (Pause Irrigation)
                </label>
                <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">
                  When enabled, any rain registered by the YL-83 plate will immediately stop running pumps
                  and suppress automatic watering to conserve reservoir water.
                </p>
              </div>
            </div>

            {/* Rain Sensitivity ADC Trigger */}
            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1">
                Analog Rain Detection Trigger Limit
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  step="50"
                  value={form.rainThresholdRaw}
                  onChange={(e) => setForm({ ...form, rainThresholdRaw: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-l-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
                />
                <span className="px-3 py-2 text-xs font-semibold bg-neutral-100 border border-l-0 border-neutral-300 rounded-r-lg text-neutral-600">
                  ADC Raw
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                ADC values below this threshold represent droplet conductivity. (Default: 2600 ADC)
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 4: Light Intensity & Low-Light Debounce */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-100">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                4. Sunlight & Low-Light Alert Settings (LDR)
              </h3>
              <p className="text-xs text-neutral-500">
                Tracks daily photoperiod and detects prolonged shade or abnormal overcast.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1">
                Minimum Light Intensity Threshold
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  step="1"
                  value={form.minLightIntensity}
                  onChange={(e) => setForm({ ...form, minLightIntensity: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-l-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
                />
                <span className="px-3 py-2 text-xs font-semibold bg-neutral-100 border border-l-0 border-neutral-300 rounded-r-lg text-neutral-600">
                  % Light
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                Alert threshold for inadequate photosynthetic light. (Default: 25%)
              </p>
              {errors.minLightIntensity && (
                <p className="text-[11px] text-red-600 mt-1 font-medium">{errors.minLightIntensity}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1">
                Debounce Duration Filter Before Alert
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  step="1"
                  value={form.lowLightDurationMin}
                  onChange={(e) => setForm({ ...form, lowLightDurationMin: parseInt(e.target.value, 10) || 1 })}
                  className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-l-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
                />
                <span className="px-3 py-2 text-xs font-semibold bg-neutral-100 border border-l-0 border-neutral-300 rounded-r-lg text-neutral-600">
                  Minutes
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                Prevents false alerts from temporary passing clouds. (Default: 5 min)
              </p>
              {errors.lowLightDurationMin && (
                <p className="text-[11px] text-red-600 mt-1 font-medium">{errors.lowLightDurationMin}</p>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 5: DS18B20 Waterproof Probe Limits */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-100">
            <div className="p-2 rounded-lg bg-teal-50 text-teal-700">
              <Thermometer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                5. DS18B20 Waterproof Probe Thresholds
              </h3>
              <p className="text-xs text-neutral-500">
                Applies to either Root Zone Soil or Reservoir Tank depending on probe installation role.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1">
                Minimum Probe Temperature
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  step="0.5"
                  value={form.minProbeTemp}
                  onChange={(e) => setForm({ ...form, minProbeTemp: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-l-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
                />
                <span className="px-3 py-2 text-xs font-semibold bg-neutral-100 border border-l-0 border-neutral-300 rounded-r-lg text-neutral-600">
                  °C
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                Warns if root temperature drops too low for nutrient uptake. (Default: 15°C)
              </p>
              {errors.minProbeTemp && (
                <p className="text-[11px] text-red-600 mt-1 font-medium">{errors.minProbeTemp}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1">
                Maximum Probe Temperature
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  step="0.5"
                  value={form.maxProbeTemp}
                  onChange={(e) => setForm({ ...form, maxProbeTemp: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-l-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
                />
                <span className="px-3 py-2 text-xs font-semibold bg-neutral-100 border border-l-0 border-neutral-300 rounded-r-lg text-neutral-600">
                  °C
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                Warns of thermal root death or anaerobic bacterial blooms in reservoir. (Default: 32°C)
              </p>
              {errors.maxProbeTemp && (
                <p className="text-[11px] text-red-600 mt-1 font-medium">{errors.maxProbeTemp}</p>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 6: Safety Hardware Protections */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-100">
            <div className="p-2 rounded-lg bg-neutral-900 text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                6. Hardware Safety Timeout & Relay Safeguards
              </h3>
              <p className="text-xs text-neutral-500">
                Fail-safe parameters enforced independently in ESP32 firmware.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1">
                Maximum Motor Continuous Runtime (Safety Kill)
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  step="30"
                  value={form.maxMotorRuntimeSeconds}
                  onChange={(e) => setForm({ ...form, maxMotorRuntimeSeconds: parseInt(e.target.value, 10) || 60 })}
                  className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-l-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
                />
                <span className="px-3 py-2 text-xs font-semibold bg-neutral-100 border border-l-0 border-neutral-300 rounded-r-lg text-neutral-600">
                  Seconds ({Math.round(form.maxMotorRuntimeSeconds / 60)} min)
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                Hard safety limit. If the pump runs continuously for this duration, it is forcibly killed.
              </p>
              {errors.maxMotorRuntimeSeconds && (
                <p className="text-[11px] text-red-600 mt-1 font-medium">{errors.maxMotorRuntimeSeconds}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1">
                Minimum Motor Cooldown Interval
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  step="10"
                  value={form.cooldownPeriodSeconds}
                  onChange={(e) => setForm({ ...form, cooldownPeriodSeconds: parseInt(e.target.value, 10) || 30 })}
                  className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-l-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
                />
                <span className="px-3 py-2 text-xs font-semibold bg-neutral-100 border border-l-0 border-neutral-300 rounded-r-lg text-neutral-600">
                  Seconds
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                Protects the DC pump motor and relay contacts from thermal overload between cycles.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Save & Cancel */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
          <button
            type="button"
            onClick={handleCancel}
            className="px-5 py-2.5 text-xs font-semibold text-neutral-700 hover:text-neutral-900 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-xl transition-colors"
          >
            Cancel Changes
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Threshold Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
