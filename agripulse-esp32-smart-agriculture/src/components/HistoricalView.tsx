import React, { useState, useMemo } from 'react';
import {
  Download,
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Droplets,
  CloudRain,
  Clock,
  RotateCcw,
  FileSpreadsheet,
} from 'lucide-react';
import { SensorReading, SystemStats } from '../types/agriculture';

interface HistoricalViewProps {
  readings: SensorReading[];
  stats: SystemStats;
}

export const HistoricalView: React.FC<HistoricalViewProps> = ({
  readings,
  stats,
}) => {
  const [rangeFilter, setRangeFilter] = useState<'1h' | '24h' | '7d' | '30d' | 'custom'>('24h');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 20;

  // Filter readings by range & search term
  const filteredData = useMemo(() => {
    const now = Date.now();
    let minTime = now - 24 * 3600 * 1000;

    if (rangeFilter === '1h') minTime = now - 3600 * 1000;
    else if (rangeFilter === '7d') minTime = now - 7 * 24 * 3600 * 1000;
    else if (rangeFilter === '30d') minTime = now - 30 * 24 * 3600 * 1000;
    else if (rangeFilter === 'custom' && customStart) {
      minTime = new Date(customStart).getTime();
    }

    let maxTime = now;
    if (rangeFilter === 'custom' && customEnd) {
      maxTime = new Date(customEnd).getTime();
    }

    return readings
      .filter((r) => {
        const t = new Date(r.timestamp).getTime();
        const matchesTime = t >= minTime && t <= maxTime;
        if (!matchesTime) return false;

        if (searchTerm.trim() !== '') {
          const s = searchTerm.toLowerCase();
          const matchDate = r.timestamp.toLowerCase().includes(s);
          const matchMotor = r.motorState.toLowerCase().includes(s);
          const matchRain = r.rainStatus.toLowerCase().includes(s);
          return matchDate || matchMotor || matchRain;
        }

        return true;
      })
      .reverse(); // Newest first
  }, [readings, rangeFilter, customStart, customEnd, searchTerm]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  // Aggregate stats over filtered records
  const aggregates = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        soil: { min: 0, max: 0, avg: 0 },
        airTemp: { min: 0, max: 0, avg: 0 },
        humidity: { min: 0, max: 0, avg: 0 },
        light: { min: 0, max: 0, avg: 0 },
        probeTemp: { min: 0, max: 0, avg: 0 },
        rainDurationMin: 0,
      };
    }

    const calc = (vals: number[]) => ({
      min: Math.min(...vals),
      max: Math.max(...vals),
      avg: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10,
    });

    const rainPoints = filteredData.filter((r) => r.rainDetected).length;
    // Each record represents roughly an interval
    const estRainMin = Math.round(rainPoints * 5);

    return {
      soil: calc(filteredData.map((r) => r.soilMoisture)),
      airTemp: calc(filteredData.map((r) => r.airTemperature)),
      humidity: calc(filteredData.map((r) => r.humidity)),
      light: calc(filteredData.map((r) => r.lightIntensity)),
      probeTemp: calc(filteredData.map((r) => r.probeTemperature)),
      rainDurationMin: estRainMin,
    };
  }, [filteredData]);

  // CSV Export Generation
  const exportToCSV = () => {
    if (filteredData.length === 0) return;

    const headers = [
      'Timestamp_ISO',
      'Date_Time',
      'Soil_Moisture_Pct',
      'Soil_Moisture_Raw_ADC',
      'Air_Temperature_C',
      'Relative_Humidity_Pct',
      'Rain_Detected',
      'Rain_Plate_Wetness_Pct',
      'Rain_Sensor_Raw_ADC',
      'Light_Intensity_Pct',
      'DS18B20_Probe_Temp_C',
      'DS18B20_Type',
      'Motor_State',
      'Is_Simulated',
    ];

    const rows = filteredData.map((r) => [
      r.timestamp,
      `"${new Date(r.timestamp).toLocaleString()}"`,
      r.soilMoisture,
      r.soilMoistureRaw ?? '',
      r.airTemperature,
      r.humidity,
      r.rainDetected ? 'TRUE' : 'FALSE',
      r.rainLevelPercent,
      r.rainSensorRaw ?? '',
      r.lightIntensity,
      r.probeTemperature,
      r.probeType,
      r.motorState,
      r.isSimulated ? 'TRUE' : 'FALSE',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `agripulse_telemetry_export_${new Date().toISOString().substring(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & CSV Export */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-neutral-900">
            Historical Sensor Telemetry & Analytical Reports
          </h2>
          <p className="text-xs text-neutral-600 mt-1">
            Complete database of timestamped environmental observations, watering runtimes, and daily min/max/average statistics.
          </p>
        </div>

        <button
          onClick={exportToCSV}
          className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors flex items-center gap-2 shadow-xs"
        >
          <Download className="w-4 h-4" />
          <span>Export Dataset (CSV)</span>
        </button>
      </div>

      {/* Aggregate Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-xs">
          <span className="text-[10px] uppercase font-mono text-neutral-400 block">Soil Moisture</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-sm font-bold text-neutral-900 font-mono">
              Avg: {aggregates.soil.avg}%
            </span>
          </div>
          <div className="text-[10px] text-neutral-500 font-mono mt-1">
            Min: {aggregates.soil.min}% · Max: {aggregates.soil.max}%
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-xs">
          <span className="text-[10px] uppercase font-mono text-neutral-400 block">Air Temperature</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-sm font-bold text-neutral-900 font-mono">
              Avg: {aggregates.airTemp.avg}°C
            </span>
          </div>
          <div className="text-[10px] text-neutral-500 font-mono mt-1">
            Min: {aggregates.airTemp.min}°C · Max: {aggregates.airTemp.max}°C
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-xs">
          <span className="text-[10px] uppercase font-mono text-neutral-400 block">Relative Humidity</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-sm font-bold text-neutral-900 font-mono">
              Avg: {aggregates.humidity.avg}%
            </span>
          </div>
          <div className="text-[10px] text-neutral-500 font-mono mt-1">
            Min: {aggregates.humidity.min}% · Max: {aggregates.humidity.max}%
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-xs">
          <span className="text-[10px] uppercase font-mono text-neutral-400 block">Light Intensity</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-sm font-bold text-neutral-900 font-mono">
              Avg: {aggregates.light.avg}%
            </span>
          </div>
          <div className="text-[10px] text-neutral-500 font-mono mt-1">
            Min: {aggregates.light.min}% · Max: {aggregates.light.max}%
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-xs">
          <span className="text-[10px] uppercase font-mono text-neutral-400 block">Watering Cycles</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-sm font-bold text-emerald-800 font-mono">
              {stats.totalIrrigationCycles} Cycles
            </span>
          </div>
          <div className="text-[10px] text-neutral-500 font-mono mt-1">
            Total: {stats.totalWateringDurationMinutes} min run
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-xs">
          <span className="text-[10px] uppercase font-mono text-neutral-400 block">Rain Duration Est.</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-sm font-bold text-blue-700 font-mono">
              {aggregates.rainDurationMin} min
            </span>
          </div>
          <div className="text-[10px] text-neutral-500 font-mono mt-1">
            {stats.rainEventsCount} Precipitation events
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Time Horizon */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          <div className="flex bg-neutral-100 p-1 rounded-lg border border-neutral-200 text-xs font-medium">
            <button
              onClick={() => setRangeFilter('1h')}
              className={`px-3 py-1 rounded-md transition-colors ${
                rangeFilter === '1h' ? 'bg-white text-neutral-900 font-bold shadow-xs' : 'text-neutral-600'
              }`}
            >
              1h
            </button>
            <button
              onClick={() => setRangeFilter('24h')}
              className={`px-3 py-1 rounded-md transition-colors ${
                rangeFilter === '24h' ? 'bg-white text-neutral-900 font-bold shadow-xs' : 'text-neutral-600'
              }`}
            >
              24h
            </button>
            <button
              onClick={() => setRangeFilter('7d')}
              className={`px-3 py-1 rounded-md transition-colors ${
                rangeFilter === '7d' ? 'bg-white text-neutral-900 font-bold shadow-xs' : 'text-neutral-600'
              }`}
            >
              7d
            </button>
            <button
              onClick={() => setRangeFilter('30d')}
              className={`px-3 py-1 rounded-md transition-colors ${
                rangeFilter === '30d' ? 'bg-white text-neutral-900 font-bold shadow-xs' : 'text-neutral-600'
              }`}
            >
              30d
            </button>
            <button
              onClick={() => setRangeFilter('custom')}
              className={`px-3 py-1 rounded-md transition-colors ${
                rangeFilter === 'custom' ? 'bg-white text-neutral-900 font-bold shadow-xs' : 'text-neutral-600'
              }`}
            >
              Custom
            </button>
          </div>

          {rangeFilter === 'custom' && (
            <div className="flex items-center gap-2 text-xs">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2 py-1 border border-neutral-300 rounded-md text-xs font-mono"
              />
              <span className="text-neutral-400">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2 py-1 border border-neutral-300 rounded-md text-xs font-mono"
              />
            </div>
          )}
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search date, motor, rain..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
          />
        </div>
      </div>

      {/* Historical Telemetry Data Table */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50/80 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500 uppercase font-mono">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Soil Moisture</th>
                <th className="py-3 px-4">Air Temp</th>
                <th className="py-3 px-4">Humidity</th>
                <th className="py-3 px-4">Rain Sensor</th>
                <th className="py-3 px-4">Light Level</th>
                <th className="py-3 px-4">DS18B20 Probe</th>
                <th className="py-3 px-4">Motor Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-mono text-neutral-700">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-400 italic font-sans text-xs">
                    No historical observations match the specified filters.
                  </td>
                </tr>
              ) : (
                paginatedData.map((row) => (
                  <tr key={row.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-2.5 px-4 text-neutral-500 whitespace-nowrap">
                      {new Date(row.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span className="font-bold text-neutral-900">{row.soilMoisture}%</span>
                      {row.soilMoistureRaw && (
                        <span className="text-[10px] text-neutral-400 ml-1.5">({row.soilMoistureRaw} ADC)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap text-amber-800 font-medium">
                      {row.airTemperature}°C
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap text-sky-800 font-medium">
                      {row.humidity}% RH
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          row.rainDetected
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        {row.rainStatus.toUpperCase()} ({row.rainLevelPercent}%)
                      </span>
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap text-neutral-800">
                      {row.lightIntensity}%
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap text-teal-800">
                      {row.probeTemperature}°C
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          row.motorState === 'ON'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        {row.motorState}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-neutral-200 flex items-center justify-between text-xs text-neutral-500">
          <div>
            Showing <span className="font-semibold text-neutral-800 font-mono">
              {filteredData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
            </span> to <span className="font-semibold text-neutral-800 font-mono">
              {Math.min(currentPage * itemsPerPage, filteredData.length)}
            </span> of <span className="font-semibold text-neutral-800 font-mono">{filteredData.length}</span> records
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-md border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-neutral-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-md border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
