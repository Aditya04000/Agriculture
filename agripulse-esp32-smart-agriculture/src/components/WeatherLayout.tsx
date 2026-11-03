import React, { useState } from 'react';
import {
  CloudSun,
  Sun,
  CloudRain,
  Wind,
  Compass,
  Droplets,
  Thermometer,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Clock,
  Waves,
  Eye,
  Info,
  ArrowUpRight,
  TrendingUp,
  MapPin,
} from 'lucide-react';
import { SensorReading, ThresholdConfig, AgriWeatherProfile } from '../types/agriculture';
import { INITIAL_AGRI_WEATHER } from '../utils/constants';

interface WeatherLayoutProps {
  latestReading: SensorReading | null;
  thresholds: ThresholdConfig;
}

export const WeatherLayout: React.FC<WeatherLayoutProps> = ({
  latestReading,
  thresholds,
}) => {
  const [weather] = useState<AgriWeatherProfile>(INITIAL_AGRI_WEATHER);
  const [selectedFarmZone, setSelectedFarmZone] = useState<string>('Plot 4 - Main Greenhouse');

  // Compute live comparison between DHT11 on-farm sensor and regional station
  const stationTemp = weather.currentTemp;
  const dhtTemp = latestReading?.airTemperature ?? 26.2;
  const tempDiff = Math.round((dhtTemp - stationTemp) * 10) / 10;

  const stationHum = weather.humidity;
  const dhtHum = latestReading?.humidity ?? 60.0;
  const humDiff = Math.round((dhtHum - stationHum) * 10) / 10;

  const isRainingOnFarm = latestReading?.rainDetected ?? false;

  return (
    <div className="space-y-6">
      {/* Top Banner: Agricultural Weather & Farm Microclimate Station */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800">
              <CloudSun className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium">
                <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                <span>{weather.location}</span>
                <span aria-hidden="true">·</span>
                <span>{weather.elevation}</span>
              </div>
              <h2 className="text-base font-bold text-neutral-900 mt-0.5">
                Farm Microclimate & Meteorological Forecast
              </h2>
            </div>
          </div>
          <p className="text-xs text-neutral-600 mt-2 max-w-2xl">
            Live integration of regional meteorological forecast data with real-time on-field ESP32 DHT11
            and YL-83 telemetry to guide irrigation scheduling, spray windows, and frost protection.
          </p>
        </div>

        {/* Zone Selector */}
        <div className="flex items-center gap-2 bg-neutral-100 p-1 rounded-lg border border-neutral-200 text-xs font-medium self-start md:self-auto">
          <span className="text-neutral-500 text-[11px] px-1 font-semibold">Zone:</span>
          <select
            value={selectedFarmZone}
            onChange={(e) => setSelectedFarmZone(e.target.value)}
            className="bg-white border border-neutral-300 rounded-md px-2.5 py-1 text-xs font-semibold text-neutral-800 focus:outline-hidden"
          >
            <option value="Plot 4 - Main Greenhouse">Plot 4 - Main Greenhouse (ESP32 Node)</option>
            <option value="Plot 1 - Open Field Tomatoes">Plot 1 - Open Field Tomatoes</option>
            <option value="Plot 2 - Drip Irrigation Orchard">Plot 2 - Drip Irrigation Orchard</option>
          </select>
        </div>
      </div>

      {/* Main Microclimate Cockpit Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Current Atmospheric State & Sensor Delta */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
            <div>
              <span className="text-[11px] font-mono font-medium text-neutral-400 uppercase tracking-wider block">
                Current Meteorological Conditions
              </span>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-4xl font-bold font-mono tracking-tight text-neutral-900">
                  {weather.currentTemp}°C
                </span>
                <span className="text-xs text-neutral-500 font-medium">
                  Feels like {weather.feelsLike}°C · {weather.condition}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="text-right">
                <span className="text-[10px] text-neutral-400 block uppercase">Sunrise</span>
                <span className="font-semibold text-neutral-800">{weather.sunrise}</span>
              </div>
              <div className="h-6 w-px bg-neutral-200" />
              <div className="text-right">
                <span className="text-[10px] text-neutral-400 block uppercase">Sunset</span>
                <span className="font-semibold text-neutral-800">{weather.sunset}</span>
              </div>
            </div>
          </div>

          {/* Environmental Metrics 4-Box Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200/80">
              <div className="flex items-center gap-1.5 text-neutral-500 mb-1">
                <Wind className="w-3.5 h-3.5 text-neutral-600" />
                <span>Wind Speed</span>
              </div>
              <div className="text-lg font-bold font-mono text-neutral-900">
                {weather.windSpeed} <span className="text-xs font-normal">km/h</span>
              </div>
              <div className="text-[10px] text-neutral-500 mt-0.5 font-mono">{weather.windDirection}</div>
            </div>

            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200/80">
              <div className="flex items-center gap-1.5 text-neutral-500 mb-1">
                <Waves className="w-3.5 h-3.5 text-sky-600" />
                <span>Humidity</span>
              </div>
              <div className="text-lg font-bold font-mono text-neutral-900">
                {weather.humidity}%
              </div>
              <div className="text-[10px] text-neutral-500 mt-0.5 font-mono">Dew Point: {weather.dewPoint}°C</div>
            </div>

            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200/80">
              <div className="flex items-center gap-1.5 text-neutral-500 mb-1">
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>UV Radiation</span>
              </div>
              <div className="text-lg font-bold font-mono text-neutral-900">
                {weather.uvIndex} <span className="text-xs font-normal">UV</span>
              </div>
              <div className="text-[10px] text-emerald-700 mt-0.5 font-semibold">Moderate PAR</div>
            </div>

            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200/80">
              <div className="flex items-center gap-1.5 text-neutral-500 mb-1">
                <Droplets className="w-3.5 h-3.5 text-emerald-600" />
                <span>Evaporation (ET₀)</span>
              </div>
              <div className="text-lg font-bold font-mono text-emerald-800">
                {weather.et0Today} <span className="text-xs font-normal">mm/d</span>
              </div>
              <div className="text-[10px] text-neutral-500 mt-0.5 font-mono">Crop Demand</div>
            </div>
          </div>

          {/* On-Farm ESP32 Sensor vs Regional Meteorological Comparison Callout */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>Microclimate Validation: ESP32 Node vs Regional Forecast</span>
              </h4>
              <span className="text-[11px] font-mono text-emerald-800 font-semibold">
                Node: {latestReading?.deviceId ?? 'ESP32-AGRI-01'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
              <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                <span className="text-neutral-500 text-[11px] block">Temperature Variance</span>
                <div className="flex items-baseline justify-between mt-0.5">
                  <span className="font-mono font-bold text-neutral-900">
                    Farm {dhtTemp}°C vs {stationTemp}°C
                  </span>
                  <span className={`text-[11px] font-mono font-semibold ${tempDiff >= 0 ? 'text-amber-700' : 'text-blue-700'}`}>
                    {tempDiff > 0 ? `+${tempDiff}°C` : `${tempDiff}°C`}
                  </span>
                </div>
                <span className="text-[10px] text-neutral-500">Greenhouse thermal effect</span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                <span className="text-neutral-500 text-[11px] block">Humidity Variance</span>
                <div className="flex items-baseline justify-between mt-0.5">
                  <span className="font-mono font-bold text-neutral-900">
                    Farm {dhtHum}% vs {stationHum}%
                  </span>
                  <span className="text-[11px] font-mono font-semibold text-emerald-700">
                    {humDiff > 0 ? `+${humDiff}%` : `${humDiff}%`}
                  </span>
                </div>
                <span className="text-[10px] text-neutral-500">Canopy transpiration microclimate</span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                <span className="text-neutral-500 text-[11px] block">Rain Ground Truth</span>
                <div className="flex items-baseline justify-between mt-0.5">
                  <span className="font-mono font-bold text-neutral-900">
                    {isRainingOnFarm ? 'Rain on Plate' : 'Dry Surface'}
                  </span>
                  <span className="text-[11px] font-mono text-neutral-600">
                    POP: {weather.hourly[0]?.pop ?? 10}%
                  </span>
                </div>
                <span className="text-[10px] text-neutral-500">YL-83 real-time verification</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Agricultural Decision Advisories */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Agronomic Advisory Engine</span>
          </h3>

          {/* Advisory 1: Spraying Window */}
          <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-900">Pesticide / Spray Window</span>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                OPTIMAL
              </span>
            </div>
            <p className="text-[11px] text-neutral-600 leading-relaxed mt-1">
              {weather.sprayReason}
            </p>
          </div>

          {/* Advisory 2: Irrigation Need vs Evapotranspiration */}
          <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-900">Evapotranspiration (ET₀) Demand</span>
              <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                {weather.et0Today} mm/day
              </span>
            </div>
            <p className="text-[11px] text-neutral-600 leading-relaxed mt-1">
              Daily crop water loss is moderate. With soil moisture at{' '}
              <strong>{latestReading?.soilMoisture ?? 35}%</strong>, capacitive trigger remains satisfied.
            </p>
          </div>

          {/* Advisory 3: Rain Interlock Forecast */}
          <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 space-y-1 text-blue-950">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">Precipitation Interlock</span>
              <span className="text-[10px] font-bold text-blue-800">
                {thresholds.pauseIrrigationOnRain ? 'ARMED' : 'OFF'}
              </span>
            </div>
            <p className="text-[11px] text-blue-900 leading-relaxed mt-1">
              20% rain probability today. Friday shows 70% rain probability (6.5mm expected).
              Automatic irrigation interlock will conserve reservoir reserves.
            </p>
          </div>
        </div>
      </div>

      {/* Hourly 24-Hour Forecast Strip */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-700" />
            <span>24-Hour Microclimate Forecast & Precipitation Chance</span>
          </h3>
          <span className="text-xs text-neutral-400 font-mono">Updated hourly</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 pt-2">
          {weather.hourly.map((h, i) => (
            <div
              key={i}
              className={`p-3 rounded-xl border text-center transition-all ${
                i === 0
                  ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-400/40'
                  : 'bg-neutral-50/70 border-neutral-200'
              }`}
            >
              <span className="text-[11px] font-mono text-neutral-500 block font-semibold">
                {h.time}
              </span>
              <div className="my-2 flex justify-center text-neutral-700">
                {h.icon === 'sunny' ? (
                  <Sun className="w-5 h-5 text-amber-500" />
                ) : h.icon === 'rain' ? (
                  <CloudRain className="w-5 h-5 text-blue-600" />
                ) : (
                  <CloudSun className="w-5 h-5 text-neutral-600" />
                )}
              </div>
              <span className="text-sm font-bold font-mono text-neutral-900 block">
                {h.temp}°C
              </span>
              <div className="mt-1 text-[10px] text-blue-700 font-mono font-medium">
                {h.pop}% rain
              </div>
              <div className="text-[9px] text-neutral-400 font-mono mt-0.5">
                {h.windSpeed} km/h
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5-Day Agricultural Outlook Table */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-700" />
          <span>5-Day Agro-Meteorological Outlook</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 text-[11px] font-semibold text-neutral-500 uppercase font-mono">
                <th className="py-2.5 px-3">Day / Date</th>
                <th className="py-2.5 px-3">Condition</th>
                <th className="py-2.5 px-3">High / Low Temp</th>
                <th className="py-2.5 px-3">Rain Probability</th>
                <th className="py-2.5 px-3">Expected Precip</th>
                <th className="py-2.5 px-3">Evapotranspiration (ET₀)</th>
                <th className="py-2.5 px-3">Irrigation Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-mono text-neutral-700">
              {weather.daily.map((d, idx) => (
                <tr key={idx} className="hover:bg-neutral-50/70 transition-colors">
                  <td className="py-3 px-3 font-semibold text-neutral-900 font-sans">
                    {d.day} <span className="text-neutral-400 font-normal font-mono text-[11px]">({d.date})</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="flex items-center gap-1.5 font-sans">
                      {d.icon === 'sunny' ? (
                        <Sun className="w-4 h-4 text-amber-500" />
                      ) : d.icon === 'rain' ? (
                        <CloudRain className="w-4 h-4 text-blue-600" />
                      ) : (
                        <CloudSun className="w-4 h-4 text-neutral-500" />
                      )}
                      <span>{d.condition}</span>
                    </span>
                  </td>
                  <td className="py-3 px-3 font-bold text-neutral-900">
                    {d.tempMax}°C <span className="text-neutral-400 font-normal">/ {d.tempMin}°C</span>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        d.pop > 50 ? 'bg-blue-100 text-blue-800' : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {d.pop}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-blue-700 font-semibold">
                    {d.rainMm > 0 ? `${d.rainMm} mm` : '0 mm'}
                  </td>
                  <td className="py-3 px-3 text-emerald-800 font-semibold">
                    {d.et0} mm/day
                  </td>
                  <td className="py-3 px-3 font-sans text-[11px] text-neutral-800">
                    {d.rainMm >= 5.0 ? (
                      <span className="text-blue-700 font-medium">Interlock will pause pumping</span>
                    ) : d.et0 >= 4.8 ? (
                      <span className="text-amber-800 font-medium">High deficit: Auto watering active</span>
                    ) : (
                      <span className="text-neutral-600">Normal soil capacitive check</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
