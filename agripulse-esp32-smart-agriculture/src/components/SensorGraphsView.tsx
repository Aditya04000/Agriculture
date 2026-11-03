import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import {
  Droplets,
  Thermometer,
  CloudRain,
  Sun,
  Waves,
  Calendar,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { SensorReading, ThresholdConfig } from '../types/agriculture';

interface SensorGraphsViewProps {
  readings: SensorReading[];
  thresholds: ThresholdConfig;
  onUpdateThresholds: (newT: Partial<ThresholdConfig>) => void;
}

type TimeRange = '1h' | '24h' | '7d' | '30d';

export const SensorGraphsView: React.FC<SensorGraphsViewProps> = ({
  readings,
  thresholds,
  onUpdateThresholds,
}) => {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('24h');
  const [activeTab, setActiveTab] = useState<'all' | 'soil' | 'temp' | 'hum' | 'rain' | 'light' | 'probe'>('all');

  // Filter dataset by selected range, or show all if none in range
  const filteredReadings = useMemo(() => {
    const now = Date.now();
    let ms = 24 * 3600 * 1000;
    if (selectedRange === '1h') ms = 3600 * 1000;
    if (selectedRange === '7d') ms = 7 * 24 * 3600 * 1000;
    if (selectedRange === '30d') ms = 30 * 24 * 3600 * 1000;

    const subset = readings.filter((r) => now - new Date(r.timestamp).getTime() <= ms);
    return subset.length > 0 ? subset : readings.slice(-50);
  }, [readings, selectedRange]);

  // Formatted data for Recharts
  const chartData = useMemo(() => {
    return filteredReadings.map((r) => {
      const d = new Date(r.timestamp);
      const timeStr =
        selectedRange === '1h'
          ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          : selectedRange === '24h'
          ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : `${d.getMonth() + 1}/${d.getDate()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

      return {
        timestamp: r.timestamp,
        time: timeStr,
        soilMoisture: r.soilMoisture,
        airTemperature: r.airTemperature,
        humidity: r.humidity,
        rainLevel: r.rainLevelPercent,
        lightIntensity: r.lightIntensity,
        probeTemperature: r.probeTemperature,
      };
    });
  }, [filteredReadings, selectedRange]);

  // Calculate statistics for the current view
  const getStats = (extractor: (r: SensorReading) => number) => {
    const vals = filteredReadings.map(extractor);
    if (vals.length === 0) return { current: 0, min: 0, max: 0, avg: 0 };
    return {
      current: vals[vals.length - 1],
      min: Math.min(...vals),
      max: Math.max(...vals),
      avg: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10,
    };
  };

  const moistureStats = getStats((r) => r.soilMoisture);
  const tempStats = getStats((r) => r.airTemperature);
  const humStats = getStats((r) => r.humidity);
  const lightStats = getStats((r) => r.lightIntensity);
  const probeStats = getStats((r) => r.probeTemperature);

  return (
    <div className="space-y-6">
      {/* Top Filter & Duration Segmented Bar */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-neutral-100 rounded-lg text-xs font-medium">
          <button onClick={() => setActiveTab('all')} className={`px-3 py-1.5 rounded-md transition-colors ${activeTab === 'all' ? 'bg-white text-emerald-900 font-semibold shadow-xs' : 'text-neutral-600 hover:text-neutral-900'}`}>All Graphs</button>
          <button onClick={() => setActiveTab('soil')} className={`px-3 py-1.5 rounded-md transition-colors ${activeTab === 'soil' ? 'bg-white text-emerald-900 font-semibold shadow-xs' : 'text-neutral-600 hover:text-neutral-900'}`}>Soil Moisture</button>
          <button onClick={() => setActiveTab('temp')} className={`px-3 py-1.5 rounded-md transition-colors ${activeTab === 'temp' ? 'bg-white text-amber-900 font-semibold shadow-xs' : 'text-neutral-600 hover:text-neutral-900'}`}>Air Temp</button>
          <button onClick={() => setActiveTab('hum')} className={`px-3 py-1.5 rounded-md transition-colors ${activeTab === 'hum' ? 'bg-white text-sky-900 font-semibold shadow-xs' : 'text-neutral-600 hover:text-neutral-900'}`}>Humidity</button>
        </div>

        <div className="flex items-center gap-1.5 self-start md:self-auto">
          <Calendar className="w-4 h-4 text-neutral-500 mr-1" />
          <div className="flex bg-neutral-100 p-1 rounded-lg border border-neutral-200 text-xs font-medium">
            <button onClick={() => setSelectedRange('1h')} className={`px-2.5 py-1 rounded-md transition-colors ${selectedRange === '1h' ? 'bg-white text-neutral-900 font-bold shadow-xs' : 'text-neutral-600 hover:text-neutral-900'}`}>1h</button>
            <button onClick={() => setSelectedRange('24h')} className={`px-2.5 py-1 rounded-md transition-colors ${selectedRange === '24h' ? 'bg-white text-neutral-900 font-bold shadow-xs' : 'text-neutral-600 hover:text-neutral-900'}`}>24h</button>
            <button onClick={() => setSelectedRange('7d')} className={`px-2.5 py-1 rounded-md transition-colors ${selectedRange === '7d' ? 'bg-white text-neutral-900 font-bold shadow-xs' : 'text-neutral-600 hover:text-neutral-900'}`}>7d</button>
            <button onClick={() => setSelectedRange('30d')} className={`px-2.5 py-1 rounded-md transition-colors ${selectedRange === '30d' ? 'bg-white text-neutral-900 font-bold shadow-xs' : 'text-neutral-600 hover:text-neutral-900'}`}>30d</button>
          </div>
        </div>
      </div>

      {/* GRAPH A: Soil Moisture Graph */}
      {(activeTab === 'all' || activeTab === 'soil') && (
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-700"><Droplets className="w-4 h-4" /></div>
                <h3 className="text-sm font-bold text-neutral-900">Soil Moisture Over Time</h3>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">Capacitive Sensor V1.2</p>
            </div>
            <div className="flex items-center gap-4 bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-200/80 text-xs font-mono">
              <div><span className="text-[10px] text-neutral-400 block uppercase">Current</span><span className="font-bold text-emerald-800">{moistureStats.current}%</span></div>
              <div><span className="text-[10px] text-neutral-400 block uppercase">Min</span><span className="font-medium text-neutral-700">{moistureStats.min}%</span></div>
              <div><span className="text-[10px] text-neutral-400 block uppercase">Avg</span><span className="font-medium text-neutral-700">{moistureStats.avg}%</span></div>
              <div><span className="text-[10px] text-neutral-400 block uppercase">Max</span><span className="font-medium text-neutral-700">{moistureStats.max}%</span></div>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="moistureAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#737373' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#737373' }} unit="%" />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '8px', fontSize: '11px' }} formatter={(val: any) => [`${val}%`, 'Soil Moisture']} />
                <ReferenceLine y={thresholds.minSoilMoisture} stroke="#dc2626" strokeDasharray="4 4" strokeWidth={2} label={{ value: `Trigger: ${thresholds.minSoilMoisture}%`, fill: '#dc2626', fontSize: 10, position: 'top' }} />
                <Area type="monotone" dataKey="soilMoisture" stroke="#059669" strokeWidth={2.5} fillOpacity={1} fill="url(#moistureAreaGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* GRAPH B: Temperature Graph */}
      {(activeTab === 'all' || activeTab === 'temp') && (
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-amber-50 text-amber-700"><Thermometer className="w-4 h-4" /></div>
                <h3 className="text-sm font-bold text-neutral-900">Air Temperature Trends</h3>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">DHT11 Sensor</p>
            </div>
            <div className="flex items-center gap-4 bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-200/80 text-xs font-mono">
              <div><span className="text-[10px] text-neutral-400 block uppercase">Current</span><span className="font-bold text-amber-800">{tempStats.current}°C</span></div>
              <div><span className="text-[10px] text-neutral-400 block uppercase">Avg</span><span className="font-medium text-neutral-700">{tempStats.avg}°C</span></div>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#737373' }} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#737373' }} unit="°C" />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '8px', fontSize: '11px' }} formatter={(val: any) => [`${val}°C`, 'Air Temperature']} />
                <Line type="monotone" dataKey="airTemperature" stroke="#d97706" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* GRAPH C: Humidity */}
      {(activeTab === 'all' || activeTab === 'hum') && (
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-sky-50 text-sky-700"><Waves className="w-4 h-4" /></div>
                <h3 className="text-sm font-bold text-neutral-900">Relative Humidity Dynamics</h3>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">DHT11 Sensor</p>
            </div>
            <div className="flex items-center gap-4 bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-200/80 text-xs font-mono">
              <div><span className="text-[10px] text-neutral-400 block uppercase">Current</span><span className="font-bold text-sky-800">{humStats.current}%</span></div>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="humGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#737373' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#737373' }} unit="%" />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '8px', fontSize: '11px' }} formatter={(val: any) => [`${val}% RH`, 'Humidity']} />
                <Area type="monotone" dataKey="humidity" stroke="#0284c7" strokeWidth={2} fillOpacity={1} fill="url(#humGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};