import React, { useMemo } from "react";
import {
  Droplets,
  Thermometer,
  CloudRain,
  Sun,
  ShieldCheck,
  Power,
  Info,
  Waves,
} from "lucide-react";
import {
  SensorReading,
  ThresholdConfig,
  DeviceStatus,
  MotorState,
  IrrigationMode,
  AlertItem,
  SystemStats,
} from "../types/agriculture";
import { MetricCard } from "./MetricCard";
import { DashboardView } from "./Sidebar";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface OverviewViewProps {
  latestReading: SensorReading | null;
  readings: SensorReading[];
  thresholds: ThresholdConfig;
  deviceStatus: DeviceStatus;
  motorState: MotorState;
  irrigationMode: IrrigationMode;
  alerts: AlertItem[];
  systemStats: SystemStats;
  onSetIrrigationMode: (mode: IrrigationMode) => void;
  onMotorCommand: (action: "START" | "STOP" | "EMERGENCY_STOP") => void;
  onNavigate: (view: DashboardView) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  latestReading,
  readings,
  thresholds,
  deviceStatus,
  motorState,
  irrigationMode,
  alerts,
  systemStats,
  onSetIrrigationMode,
  onMotorCommand,
  onNavigate,
}) => {
  
  // Calculate Rain Events
  const rainEvents = useMemo(() => {
    const events: {
      startTime: string;
      endTime: string | null;
      durationMins: number;
      waterProvidedLiters: number;
      moistureBefore: number;
      moistureAfter: number | null;
      isActive: boolean;
    }[] = [];

    let currentEvent: typeof events[0] | null = null;

    for (let i = 0; i < readings.length; i++) {
      const r = readings[i];
      const prev = i > 0 ? readings[i - 1] : null;

      if (r.rainDetected) {
        if (!currentEvent) {
          currentEvent = {
            startTime: r.timestamp,
            endTime: null,
            durationMins: 0,
            waterProvidedLiters: 0,
            moistureBefore: prev ? prev.soilMoisture : r.soilMoisture,
            moistureAfter: null,
            isActive: true,
          };
        }
      } else if (!r.rainDetected && currentEvent) {
        const startMs = new Date(currentEvent.startTime).getTime();
        const endMs = new Date(r.timestamp).getTime();
        const diffMins = Math.max(1, Math.round((endMs - startMs) / 60000));
        
        currentEvent.endTime = r.timestamp;
        currentEvent.durationMins = diffMins;
        currentEvent.waterProvidedLiters = diffMins * 5;
        currentEvent.moistureAfter = r.soilMoisture;
        currentEvent.isActive = false;
        
        events.push(currentEvent);
        currentEvent = null;
      }
    }

    if (currentEvent) {
      const startMs = new Date(currentEvent.startTime).getTime();
      const nowMs = Date.now();
      const diffMins = Math.max(1, Math.round((nowMs - startMs) / 60000));
      currentEvent.durationMins = diffMins;
      currentEvent.waterProvidedLiters = diffMins * 5;
      events.push(currentEvent);
    }

    return events.slice(-4).reverse();
  }, [readings]);

  // Chart data strictly for Rain vs Soil Moisture
  const rainChartData = useMemo(() => {
    return readings.slice(-50).map(r => ({
      time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      wetness: r.rainLevelPercent,
      moisture: r.soilMoisture,
    }));
  }, [readings]);

  // Empty state
  if (!latestReading) {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-neutral-200 rounded-xl p-8 shadow-xs text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-neutral-900 text-emerald-400 flex items-center justify-center">
            <span className="w-7 h-7 animate-pulse">📡</span>
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-900">Waiting for ESP32 telemetry…</h2>
          </div>
          <button onClick={() => onNavigate("hardware")} className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg">
            View Arduino Firmware & Wiring &rarr;
          </button>
        </div>
      </div>
    );
  }

  const recentWindow = readings.slice(-48);
  const moistureVals = recentWindow.map((r) => r.soilMoisture);
  const tempVals = recentWindow.map((r) => r.airTemperature);
  const humVals = recentWindow.map((r) => r.humidity);
  const lightVals = recentWindow.map((r) => r.lightIntensity);
  const probeVals = recentWindow.map((r) => r.probeTemperature);

  const calcMin = (arr: number[]) => arr.length ? Math.min(...arr) : undefined;
  const calcMax = (arr: number[]) => arr.length ? Math.max(...arr) : undefined;
  const calcAvg = (arr: number[]) => arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : undefined;

  const soilStatus = latestReading.soilMoisture < thresholds.minSoilMoisture ? "critical" : latestReading.soilMoisture > thresholds.targetSoilMoisture + 25 ? "warning" : "normal";
  const airTempStatus = latestReading.airTemperature > thresholds.maxAirTemp || latestReading.airTemperature < thresholds.minAirTemp ? "warning" : "normal";
  const humStatus = latestReading.humidity > thresholds.maxHumidity || latestReading.humidity < thresholds.minHumidity ? "warning" : "normal";
  const lightStatus = latestReading.lightIntensity < thresholds.minLightIntensity ? "warning" : "normal";
  const probeStatus = latestReading.probeTemperature > thresholds.maxProbeTemp || latestReading.probeTemperature < thresholds.minProbeTemp ? "warning" : "normal";
  const unreadAlerts = alerts.filter((a) => !a.isRead);

  const miniChartData = readings.slice(-24).map((r) => ({
    time: new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    moisture: r.soilMoisture,
    temp: r.airTemperature,
  }));

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {unreadAlerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-800 shrink-0"><Info className="w-5 h-5" /></div>
            <div>
              <h4 className="text-sm font-semibold text-amber-900">{unreadAlerts[0].title}</h4>
              <p className="text-xs text-amber-800 mt-0.5">{unreadAlerts[0].sensor}: Measured {unreadAlerts[0].measuredValue}{unreadAlerts[0].unit} (Limit: {unreadAlerts[0].thresholdValue})</p>
            </div>
          </div>
          <button onClick={() => onNavigate("alerts")} className="px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-200/80 hover:bg-amber-200 rounded-lg">Review ({unreadAlerts.length})</button>
        </div>
      )}

      {/* Irrigation Control Hub */}
      <div className="bg-neutral-900 text-white rounded-2xl p-6 border border-neutral-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-medium text-emerald-400 uppercase tracking-wider">Irrigation Actuator</span>
            <span className="text-neutral-500">·</span>
            <span className="text-xs text-neutral-400">Relay GPIO 23</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl lg:text-4xl font-bold font-mono tracking-tight">{motorState}</span>
              <span className={`w-3 h-3 rounded-full ${motorState === "ON" ? "bg-emerald-400 animate-ping" : "bg-neutral-600"}`} />
            </div>
            <div className="h-8 w-px bg-neutral-800" />
            <div className="text-xs">
              <span className="text-neutral-400 block">Mode</span>
              <span className="font-semibold text-emerald-300 capitalize">{irrigationMode}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex bg-neutral-800 p-1 rounded-xl border border-neutral-700 text-xs font-medium">
            <button onClick={() => onSetIrrigationMode("auto")} className={`px-3 py-1.5 rounded-lg transition-colors ${irrigationMode === "auto" ? "bg-emerald-600 text-white font-semibold" : "text-neutral-400"}`}>Auto</button>
            <button onClick={() => onSetIrrigationMode("manual")} className={`px-3 py-1.5 rounded-lg transition-colors ${irrigationMode === "manual" ? "bg-neutral-200 text-neutral-900 font-semibold" : "text-neutral-400"}`}>Manual</button>
            <button onClick={() => onSetIrrigationMode("disabled")} className={`px-3 py-1.5 rounded-lg transition-colors ${irrigationMode === "disabled" ? "bg-red-900/60 text-red-200 font-semibold" : "text-neutral-400"}`}>Disabled</button>
          </div>
          {motorState === "ON" ? (
            <button onClick={() => onMotorCommand("STOP")} className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-2"><Power className="w-4 h-4" /><span>Stop Pump</span></button>
          ) : (
            <button onClick={() => { if (irrigationMode === "disabled") onSetIrrigationMode("manual"); onMotorCommand("START"); }} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-2"><Droplets className="w-4 h-4" /><span>Start Pump</span></button>
          )}
          <button onClick={() => onMotorCommand("EMERGENCY_STOP")} className="px-4 py-2.5 bg-red-600/80 hover:bg-red-600 text-white font-bold text-xs rounded-xl border border-red-500/50 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /><span>E-Stop</span></button>
        </div>
      </div>

      {/* Sensor Metric Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-600">Real-Time Environmental Telemetry</h2>
          <button onClick={() => onNavigate("sensors")} className="text-xs font-semibold text-emerald-800 hover:underline">Sensor Details & Calibration &rarr;</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard title="Soil Moisture" sensorModel="Capacitive Sensor V1.2" value={latestReading.soilMoisture} unit="%" rawADC={latestReading.soilMoistureRaw} rawLabel="ADC1_CH6" status={soilStatus} statusText={soilStatus === "critical" ? "LOW DEFICIT" : soilStatus === "warning" ? "SATURATED" : "OPTIMAL"} thresholdLabel={`Trigger: <${thresholds.minSoilMoisture}% · Stop: ${thresholds.targetSoilMoisture}%`} min={calcMin(moistureVals)} max={calcMax(moistureVals)} avg={calcAvg(moistureVals)} icon={<Droplets className="w-5 h-5 text-emerald-600" />} onClick={() => onNavigate("graphs")} isFaulty={deviceStatus.sensorFaults.soilMoisture} />
          <MetricCard title="Air Temperature" sensorModel="DHT11 Temp Module" value={latestReading.airTemperature} unit="°C" rawLabel="Pin 4" status={airTempStatus} statusText={latestReading.airTemperature > thresholds.maxAirTemp ? "EXCESS HEAT" : latestReading.airTemperature < thresholds.minAirTemp ? "CHILL" : "NORMAL"} thresholdLabel={`${thresholds.minAirTemp}°C – ${thresholds.maxAirTemp}°C`} min={calcMin(tempVals)} max={calcMax(tempVals)} avg={calcAvg(tempVals)} icon={<Thermometer className="w-5 h-5 text-amber-600" />} onClick={() => onNavigate("graphs")} isFaulty={deviceStatus.sensorFaults.dht11} />
          <MetricCard title="Relative Humidity" sensorModel="DHT11 Humidity Module" value={latestReading.humidity} unit="%" rawLabel="Pin 4" status={humStatus} statusText={latestReading.humidity > thresholds.maxHumidity ? "HIGH (FUNGI RISK)" : latestReading.humidity < thresholds.minHumidity ? "DRY AIR" : "NOMINAL"} thresholdLabel={`${thresholds.minHumidity}% – ${thresholds.maxHumidity}%`} min={calcMin(humVals)} max={calcMax(humVals)} avg={calcAvg(humVals)} icon={<Waves className="w-5 h-5 text-sky-600" />} onClick={() => onNavigate("graphs")} isFaulty={deviceStatus.sensorFaults.dht11} />
          <MetricCard title="Rain Sensor Status" sensorModel="YL-83 Raindrop Module" value={latestReading.rainDetected ? "DETECTED" : "DRY"} unit="" subValue={`Surface Plate Wetness: ${latestReading.rainLevelPercent}%`} rawADC={latestReading.rainSensorRaw} rawLabel="ADC1_CH7" status={latestReading.rainDetected ? "warning" : "normal"} statusText={latestReading.rainStatus === "rain" ? "ACTIVE RAIN" : latestReading.rainStatus === "drizzle" ? "LIGHT DRIZZLE" : "DRY SURFACE"} thresholdLabel={thresholds.pauseIrrigationOnRain ? "Interlock Enabled (Pause)" : "No Interlock"} icon={<CloudRain className="w-5 h-5 text-blue-600" />} onClick={() => onNavigate("graphs")} isFaulty={deviceStatus.sensorFaults.rain} />
          <MetricCard title="Light Intensity" sensorModel="LDR Photoresistor" value={latestReading.lightIntensity} unit="%" rawADC={latestReading.lightSensorRaw} rawLabel="ADC1_CH4" status={lightStatus} statusText={lightStatus === "warning" ? "LOW LIGHT" : "ADEQUATE"} thresholdLabel={`Min Threshold: ${thresholds.minLightIntensity}%`} min={calcMin(lightVals)} max={calcMax(lightVals)} avg={calcAvg(lightVals)} icon={<Sun className="w-5 h-5 text-amber-500" />} onClick={() => onNavigate("graphs")} isFaulty={deviceStatus.sensorFaults.ldr} />
          <MetricCard title={`Probe Temp (${thresholds.probeType === "soil" ? "Root Zone" : "Reservoir"})`} sensorModel="DS18B20 1-Wire Probe" value={latestReading.probeTemperature} unit="°C" rawLabel="OneWire 19" status={probeStatus} statusText={probeStatus === "warning" ? "TEMP ALERT" : "OPTIMAL"} thresholdLabel={`${thresholds.minProbeTemp}°C – ${thresholds.maxProbeTemp}°C`} min={calcMin(probeVals)} max={calcMax(probeVals)} avg={calcAvg(probeVals)} icon={<Thermometer className="w-5 h-5 text-teal-600" />} onClick={() => onNavigate("graphs")} isFaulty={deviceStatus.sensorFaults.ds18b20} />
        </div>
      </div>

      {/* Recent Trends Chart */}
      {miniChartData.length > 1 && (
        <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Recent Environmental Dynamics</h3>
              <p className="text-xs text-neutral-500">Soil moisture percentage vs ambient air temperature correlation</p>
            </div>
            <button onClick={() => onNavigate("graphs")} className="text-xs font-semibold text-emerald-800 hover:underline">View Full Graphs &rarr;</button>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={miniChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="moistureGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#059669" stopOpacity={0.25} /><stop offset="95%" stopColor="#059669" stopOpacity={0.0} /></linearGradient>
                  <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#d97706" stopOpacity={0.2} /><stop offset="95%" stopColor="#d97706" stopOpacity={0.0} /></linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#737373" }} interval={3} />
                <YAxis tick={{ fontSize: 10, fill: "#737373" }} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e5e5e5", borderRadius: "8px", fontSize: "11px" }} />
                <Area type="monotone" dataKey="moisture" name="Soil Moisture (%)" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#moistureGrad)" />
                <Area type="monotone" dataKey="temp" name="Air Temp (°C)" stroke="#d97706" strokeWidth={2} fillOpacity={1} fill="url(#tempGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* --- RAIN ANALYTICS SECTION (MOVED TO BOTTOM & FULL WIDTH) --- */}
      <div className="pt-4 border-t border-neutral-200">
        <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-600 mb-4">Rainfall Analytics & Impact</h2>
        
        <div className="space-y-6">
          {/* Rain History Log (Full Width) */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CloudRain className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-neutral-900">Rainfall Events & Water Provided</h3>
              </div>
              <span className="text-xs font-mono bg-blue-50 text-blue-800 px-2 py-1 rounded border border-blue-200">
                Total Saved: {systemStats.waterSavedGallonsEst} Gal
              </span>
            </div>

            {rainEvents.length === 0 ? (
              <div className="text-center py-8 text-neutral-500 text-xs italic">No rain events recorded yet.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {rainEvents.map((ev, idx) => (
                  <div key={idx} className={`p-4 rounded-xl border ${ev.isActive ? 'bg-blue-50 border-blue-300' : 'bg-neutral-50 border-neutral-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${ev.isActive ? 'bg-blue-600 animate-pulse' : 'bg-neutral-400'}`} />
                        <span className="text-xs font-bold text-neutral-900">{ev.isActive ? 'Raining Now' : 'Completed Rain Event'}</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">{ev.durationMins} mins</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <span className="text-[10px] text-neutral-500 uppercase block font-semibold">Start Time</span>
                        <span className="text-xs font-mono text-neutral-800">{new Date(ev.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-500 uppercase block font-semibold">End Time</span>
                        <span className="text-xs font-mono text-neutral-800">{ev.endTime ? new Date(ev.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ongoing'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-500 uppercase block font-semibold">Water Provided</span>
                        <span className="text-xs font-mono font-bold text-blue-700">{ev.waterProvidedLiters} L</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-500 uppercase block font-semibold">Moisture Boost</span>
                        <span className="text-xs font-mono text-emerald-700">{ev.moistureBefore}% {ev.moistureAfter !== null ? `→ ${ev.moistureAfter}%` : ''}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live Rain Chart (Full Width) */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-neutral-900 mb-1">Rain vs Soil Moisture Correlation</h3>
            <p className="text-xs text-neutral-500 mb-4">Visualizes surface wetness (blue) directly against root soil moisture (green).</p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={rainChartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rainColor" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
                    <linearGradient id="soilColor" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.4} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#999' }} minTickGap={20} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#999' }} />
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #eee' }} />
                  <Area type="monotone" dataKey="wetness" name="Rain Wetness %" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#rainColor)" />
                  <Area type="monotone" dataKey="moisture" name="Soil Moisture %" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#soilColor)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};