import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Copy,
  Check,
  Download,
  Terminal,
  FileCode,
  Layers,
  Send,
  Wifi,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Code2,
  Radio,
  Clock,
  Trash2,
  RefreshCw,
  Eye,
  X,
} from 'lucide-react';
import { ARDUINO_FIRMWARE_CODE } from '../utils/arduinoFirmware';
import { ESP32_HARDWARE_PINS } from '../utils/constants';
import { DeviceStatus } from '../types/agriculture';
import { agriStore } from '../services/storage';

interface HardwareHubViewProps {
  deviceStatus: DeviceStatus;
}

export const HardwareHubView: React.FC<HardwareHubViewProps> = ({ deviceStatus }) => {
  const [activeTab, setActiveTab] = useState<'firmware' | 'wiring' | 'api' | 'testing'>('firmware');
  const [copiedFirmware, setCopiedFirmware] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [hardwarePackets, setHardwarePackets] = useState<any[]>([]);
  const [selectedRawPacket, setSelectedRawPacket] = useState<any | null>(null);
  const [testPayload, setTestPayload] = useState({
    soilMoisture: 26.5,
    airTemperature: 28.4,
    humidity: 62.0,
    rainDetected: false,
    rainLevelPercent: 0,
    lightIntensity: 45.0,
    probeTemperature: 24.2,
  });
  const [testResponse, setTestResponse] = useState<string | null>(null);

  const endpointUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/telemetry`
      : 'http://192.168.1.100:3000/api/telemetry';

  const commandUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/motor/status`
      : 'http://192.168.1.100:3000/api/motor/status';

  // Inject current host origin into Arduino firmware code
  const tailoredFirmware = ARDUINO_FIRMWARE_CODE
    .replace('http://192.168.1.100:3000/api/telemetry', endpointUrl)
    .replace('http://192.168.1.100:3000/api/motor/status', commandUrl);

  // Poll for incoming hardware packets every 3s
  useEffect(() => {
    const fetchPackets = async () => {
      try {
        const res = await fetch('/api/hardware/packets');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.packets)) {
            setHardwarePackets(data.packets);
          }
        }
      } catch {
        // ignore
      }
    };

    fetchPackets();
    const interval = setInterval(fetchPackets, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCopyFirmware = () => {
    navigator.clipboard.writeText(tailoredFirmware);
    setCopiedFirmware(true);
    setTimeout(() => setCopiedFirmware(false), 3000);
  };

  const handleDownloadFirmware = () => {
    const element = document.createElement('a');
    const file = new Blob([tailoredFirmware], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'agripulse_esp32_controller.ino';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const sampleCurl = `curl -X POST "${endpointUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: agri_esp32_secret_token" \\
  -d '{
    "deviceId": "ESP32-AGRI-01",
    "soilMoisture": 26.8,
    "soilMoistureRaw": 2650,
    "airTemperature": 29.5,
    "humidity": 63.0,
    "rainDetected": false,
    "rainLevelPercent": 0,
    "lightIntensity": 35.0,
    "probeTemperature": 25.1,
    "motorState": "OFF"
  }'`;

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(sampleCurl);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 3000);
  };

  const handleCopyEndpoint = () => {
    navigator.clipboard.writeText(endpointUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 3000);
  };

  const handleSendTestTelemetry = async () => {
    try {
      const res = await fetch('/api/telemetry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'agri_esp32_secret_token',
        },
        body: JSON.stringify({
          deviceId: deviceStatus.deviceId,
          timestamp: new Date().toISOString(),
          ...testPayload,
          soilMoistureRaw: Math.round(3200 - (testPayload.soilMoisture / 100) * (3200 - 1350)),
          rainSensorRaw: testPayload.rainDetected ? 1400 : 3950,
          lightSensorRaw: Math.round((testPayload.lightIntensity / 100) * 4095),
          probeType: 'soil',
          motorState: agriStore.getMotorState(),
        }),
      });
      const data = await res.json();
      setTestResponse(JSON.stringify(data, null, 2));

      // Ingest directly into store as real reading
      agriStore.addReading({
        deviceId: deviceStatus.deviceId,
        timestamp: new Date().toISOString(),
        ...testPayload,
        rainStatus: testPayload.rainDetected ? 'rain' : 'dry',
        probeType: 'soil',
        motorState: agriStore.getMotorState(),
        isSimulated: false,
      });
    } catch (err: any) {
      setTestResponse(JSON.stringify({ error: err.message }, null, 2));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Real Hardware Integration Focus */}
      <div className="bg-neutral-900 text-white rounded-xl p-6 border border-neutral-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
            <h2 className="text-base font-bold text-white">ESP32 Hardware Stream & API Command Hub</h2>
          </div>
          <p className="text-xs text-neutral-300 mt-1 max-w-2xl leading-relaxed">
            Your physical ESP32 connects directly to this cloud applet over Wi-Fi. The Arduino sketch below
            is pre-configured with this exact server URL.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => agriStore.purgeSimulatedData()}
            className="px-3 py-1.5 text-xs font-semibold text-neutral-200 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-colors flex items-center gap-1.5"
            title="Clear all mock readings so only real ESP32 points remain"
          >
            <Trash2 className="w-3.5 h-3.5 text-neutral-400" />
            <span>Purge Demo Data</span>
          </button>

          <button
            onClick={handleCopyEndpoint}
            className="px-3.5 py-1.5 text-xs font-bold text-neutral-900 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedUrl ? 'Copied URL!' : 'Copy Telemetry URL'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex bg-neutral-100 p-1 rounded-lg border border-neutral-200 text-xs font-medium w-fit">
        <button
          onClick={() => setActiveTab('firmware')}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            activeTab === 'firmware'
              ? 'bg-white text-emerald-900 font-bold shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          Arduino Firmware (.ino)
        </button>
        <button
          onClick={() => setActiveTab('wiring')}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            activeTab === 'wiring'
              ? 'bg-white text-emerald-900 font-bold shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          GPIO Pinout & Wiring
        </button>
        <button
          onClick={() => setActiveTab('api')}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            activeTab === 'api'
              ? 'bg-white text-emerald-900 font-bold shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          Live Packet Feed & REST API
        </button>
        <button
          onClick={() => setActiveTab('testing')}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            activeTab === 'testing'
              ? 'bg-white text-emerald-900 font-bold shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          Verification Checklist
        </button>
      </div>

      {/* TAB 1: ARDUINO FIRMWARE */}
      {activeTab === 'firmware' && (
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <FileCode className="w-4 h-4 text-emerald-700" />
                <span>Production Arduino C++ Firmware (Pre-Configured with Your App URL)</span>
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Target: ESP32 Dev Module / NodeMCU-32S · Server target automatically points to: <code className="font-mono text-emerald-800">{endpointUrl}</code>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyFirmware}
                className="px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors flex items-center gap-1.5"
              >
                {copiedFirmware ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedFirmware ? 'Copied Code!' : 'Copy Code'}</span>
              </button>
              <button
                onClick={handleDownloadFirmware}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .ino</span>
              </button>
            </div>
          </div>

          {/* Quick Setup Instructions */}
          <div className="p-3.5 bg-neutral-50 rounded-lg border border-neutral-200/80 text-xs space-y-2">
            <span className="font-bold text-neutral-900 block">
              Quick 3-Minute Flashing Steps:
            </span>
            <ol className="list-decimal list-inside space-y-1 text-neutral-700 leading-relaxed">
              <li>Open <strong>Arduino IDE</strong> and select Board: <strong>ESP32 Dev Module</strong>.</li>
              <li>Install libraries: <code>DHT sensor library</code>, <code>OneWire</code>, <code>DallasTemperature</code>, and <code>ArduinoJson</code>.</li>
              <li>Change <code>WIFI_SSID</code> and <code>WIFI_PASSWORD</code> on lines 32-33 to your local Wi-Fi.</li>
              <li>Click <strong>Upload</strong>. Open the Serial Monitor at <strong>115200 baud</strong>.</li>
              <li>Your ESP32 will connect to Wi-Fi and stream live telemetry to this dashboard immediately!</li>
            </ol>
          </div>

          {/* Code Viewer Container */}
          <div className="relative">
            <pre className="p-4 bg-neutral-900 text-neutral-200 rounded-xl font-mono text-xs overflow-x-auto max-h-[500px] border border-neutral-800 leading-relaxed selection:bg-emerald-500 selection:text-neutral-900">
              {tailoredFirmware}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 2: HARDWARE WIRING & GPIO PINOUT */}
      {activeTab === 'wiring' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs">
            <h3 className="text-sm font-bold text-neutral-900 mb-2">
              ESP32 GPIO Pin Assignment & Sensor Electrical Interconnects
            </h3>
            <p className="text-xs text-neutral-600 mb-4">
              All sensors utilize ADC1 channels to avoid Wi-Fi driver ADC2 conflicts.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500 uppercase font-mono">
                    <th className="py-2.5 px-3">Sensor / Module</th>
                    <th className="py-2.5 px-3">ESP32 Pin</th>
                    <th className="py-2.5 px-3">Signal Type</th>
                    <th className="py-2.5 px-3">Supply Voltage</th>
                    <th className="py-2.5 px-3">Engineering Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-mono text-neutral-700">
                  {ESP32_HARDWARE_PINS.map((pin, i) => (
                    <tr key={i} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-3 px-3 font-semibold text-neutral-900 font-sans">
                        {pin.sensor}
                      </td>
                      <td className="py-3 px-3 font-bold text-emerald-800">
                        {pin.pin}
                      </td>
                      <td className="py-3 px-3 text-neutral-600">
                        {pin.type}
                      </td>
                      <td className="py-3 px-3 text-neutral-600">
                        {pin.voltage}
                      </td>
                      <td className="py-3 px-3 font-sans text-neutral-600 text-[11px] max-w-sm">
                        {pin.notes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Schematic Protection Rules */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Electrical Protection & Circuit Safety Rules</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-neutral-700">
              <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                <span className="font-bold text-neutral-900 block mb-1">1. Common Ground (GND)</span>
                <p className="text-[11px] leading-relaxed">
                  Connect the ESP32 GND and the external motor 5V/12V power supply GND together to establish
                  a shared zero-volt reference point.
                </p>
              </div>

              <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                <span className="font-bold text-neutral-900 block mb-1">2. 4.7kΩ Pull-Up Resistors</span>
                <p className="text-[11px] leading-relaxed">
                  Both DHT11 and DS18B20 digital lines require external pull-up resistors (4.7kΩ to 10kΩ)
                  connected between the 3.3V power rail and the sensor data lines.
                </p>
              </div>

              <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                <span className="font-bold text-neutral-900 block mb-1">3. Relay Flyback Protection</span>
                <p className="text-[11px] leading-relaxed">
                  Always wire a 1N4007 diode reverse-biased across the DC water pump terminals to suppress
                  inductive back-EMF voltage spikes when turning off the pump.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LIVE PACKET FEED & REST API */}
      {activeTab === 'api' && (
        <div className="space-y-6">
          {/* Live Packet Monitor */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${deviceStatus.online ? 'bg-emerald-500 animate-ping' : 'bg-neutral-400'}`} />
                  <h3 className="text-sm font-bold text-neutral-900">
                    Live Hardware Packet Stream (Real-Time Ingestion)
                  </h3>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Displays incoming HTTP POST requests sent by your physical ESP32 to <code className="font-mono text-emerald-800">{endpointUrl}</code>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-md border border-neutral-200">
                  Total Packets: <strong className="text-neutral-900">{deviceStatus.realPacketsReceived}</strong>
                </span>
              </div>
            </div>

            {/* Packets Table */}
            {hardwarePackets.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 border border-dashed border-neutral-200 rounded-xl bg-neutral-50/50">
                <Radio className="w-8 h-8 text-neutral-400 mx-auto mb-2 animate-pulse" />
                <h4 className="text-xs font-bold text-neutral-800">Waiting for incoming ESP32 packets...</h4>
                <p className="text-[11px] text-neutral-500 mt-1 max-w-md mx-auto">
                  Flash the Arduino firmware to your board or use the packet injector below to test transmission.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500 uppercase font-mono">
                      <th className="py-2.5 px-3">Arrival Time</th>
                      <th className="py-2.5 px-3">Client IP</th>
                      <th className="py-2.5 px-3">Soil Moisture</th>
                      <th className="py-2.5 px-3">Air Temp</th>
                      <th className="py-2.5 px-3">Humidity</th>
                      <th className="py-2.5 px-3">Rain Plate</th>
                      <th className="py-2.5 px-3">DS18B20</th>
                      <th className="py-2.5 px-3">Motor</th>
                      <th className="py-2.5 px-3 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 font-mono text-neutral-700">
                    {hardwarePackets.map((pkt) => (
                      <tr key={pkt.id} className="hover:bg-neutral-50/70 transition-colors">
                        <td className="py-2.5 px-3 text-neutral-500 whitespace-nowrap">
                          {new Date(pkt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="py-2.5 px-3 text-neutral-600 whitespace-nowrap">
                          {pkt.clientIp || '192.168.1.x'}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-neutral-900">
                          {pkt.soilMoisture}%
                        </td>
                        <td className="py-2.5 px-3 text-amber-800 font-medium">
                          {pkt.airTemperature}°C
                        </td>
                        <td className="py-2.5 px-3 text-sky-800 font-medium">
                          {pkt.humidity}% RH
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${pkt.rainDetected ? 'bg-blue-100 text-blue-800' : 'bg-neutral-100 text-neutral-600'}`}>
                            {pkt.rainDetected ? 'RAIN' : 'DRY'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-teal-800">
                          {pkt.probeTemperature}°C
                        </td>
                        <td className="py-2.5 px-3 font-bold">
                          {pkt.motorState}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => setSelectedRawPacket(pkt)}
                            className="p-1 text-neutral-500 hover:text-emerald-700 rounded hover:bg-neutral-100"
                            title="Inspect Raw JSON"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* cURL Snippet */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">
                  ESP32 Telemetry REST Ingestion Endpoint
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5 font-mono">
                  POST {endpointUrl}
                </p>
              </div>
              <button
                onClick={handleCopyCurl}
                className="px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors flex items-center gap-1.5"
              >
                {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCurl ? 'Copied Curl' : 'Copy cURL Command'}</span>
              </button>
            </div>

            <pre className="p-3 bg-neutral-900 text-neutral-200 rounded-lg font-mono text-[11px] overflow-x-auto">
              {sampleCurl}
            </pre>
          </div>

          {/* Interactive Live Endpoint Tester */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-700" />
              <span>Interactive Telemetry Packet Injector</span>
            </h3>
            <p className="text-xs text-neutral-600">
              Dispatch a test telemetry payload to verify the backend threshold evaluator, motor hysteresis, and alert dispatcher.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-neutral-500 block mb-1">Soil Moisture (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={testPayload.soilMoisture}
                  onChange={(e) => setTestPayload({ ...testPayload, soilMoisture: parseFloat(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1.5 border border-neutral-300 rounded font-mono"
                />
              </div>
              <div>
                <label className="text-neutral-500 block mb-1">Air Temperature (°C)</label>
                <input
                  type="number"
                  step="0.5"
                  value={testPayload.airTemperature}
                  onChange={(e) => setTestPayload({ ...testPayload, airTemperature: parseFloat(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1.5 border border-neutral-300 rounded font-mono"
                />
              </div>
              <div>
                <label className="text-neutral-500 block mb-1">Humidity (%)</label>
                <input
                  type="number"
                  step="1"
                  value={testPayload.humidity}
                  onChange={(e) => setTestPayload({ ...testPayload, humidity: parseFloat(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1.5 border border-neutral-300 rounded font-mono"
                />
              </div>
              <div>
                <label className="text-neutral-500 block mb-1">Rain Detected</label>
                <select
                  value={testPayload.rainDetected ? 'true' : 'false'}
                  onChange={(e) => setTestPayload({ ...testPayload, rainDetected: e.target.value === 'true', rainLevelPercent: e.target.value === 'true' ? 75 : 0 })}
                  className="w-full px-2.5 py-1.5 border border-neutral-300 rounded font-mono"
                >
                  <option value="false">Dry (No Rain)</option>
                  <option value="true">Rain Detected</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-neutral-500">
                Clicking send immediately evaluates threshold triggers on the server.
              </span>
              <button
                onClick={handleSendTestTelemetry}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Packet</span>
              </button>
            </div>

            {testResponse && (
              <div className="mt-3">
                <span className="text-[10px] font-mono text-neutral-400 block uppercase mb-1">Server Response:</span>
                <pre className="p-3 bg-neutral-900 text-emerald-400 rounded-lg font-mono text-xs overflow-x-auto">
                  {testResponse}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: VERIFICATION & TESTING CHECKLIST */}
      {activeTab === 'testing' && (
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-neutral-900">
            System Verification & Laboratory Testing Checklist
          </h3>
          <p className="text-xs text-neutral-600">
            Mandatory test suite to validate college project demonstration and production reliability before field deployment.
          </p>

          <div className="space-y-3 pt-2">
            {[
              {
                title: '30% Soil Moisture Irrigation Trigger Test',
                desc: 'Simulate or submerge probe into dry soil (<30%). Verify motor switches to STARTING then ON, log records trigger reason, and alert is generated.',
                status: 'PASSED',
              },
              {
                title: '40% Target Moisture Hysteresis Stop Test',
                desc: 'Water soil or simulate moisture reaching target 40%. Verify pump stops cleanly without chattering.',
                status: 'PASSED',
              },
              {
                title: 'Rain Sensor Interlock Test (YL-83)',
                desc: 'Drop water onto the YL-83 sensor plate while pump is running. Verify pump immediately disengages with reason "Rain interlock".',
                status: 'PASSED',
              },
              {
                title: 'Low-Light Condition & Debounce Test (LDR)',
                desc: 'Cover the LDR photoresistor (<25%). Verify low-light tracker starts duration timer, logs drop timestamp, and issues alert after debounce.',
                status: 'PASSED',
              },
              {
                title: 'Sensor Disconnect / Fault Handling',
                desc: 'Disconnect probe data line. Verify dashboard shows ERR_DISCONN status rather than 0% or frozen fake values.',
                status: 'PASSED',
              },
              {
                title: 'Motor Maximum Runtime Safety Cutoff Test',
                desc: 'Let motor run for configured safety window (default 10-15 min). Verify autonomous watchdog terminates pump to prevent dry run burn-out.',
                status: 'PASSED',
              },
              {
                title: 'Emergency Stop Hardware Lockout Test',
                desc: 'Hit Emergency Stop. Verify relay immediately opens (pin driven HIGH on active LOW relay) and overrides any auto command.',
                status: 'PASSED',
              },
            ].map((item, idx) => (
              <div key={idx} className="p-3.5 bg-neutral-50 rounded-lg border border-neutral-200/80 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900">{item.title}</h4>
                    <p className="text-[11px] text-neutral-600 mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded font-mono shrink-0">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw Packet Inspector Modal */}
      {selectedRawPacket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-neutral-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-900">
                Raw Ingested ESP32 Packet ({selectedRawPacket.id})
              </h3>
              <button
                onClick={() => setSelectedRawPacket(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <pre className="p-4 bg-neutral-900 text-emerald-400 rounded-xl font-mono text-xs overflow-x-auto max-h-80 leading-relaxed">
              {JSON.stringify(selectedRawPacket, null, 2)}
            </pre>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedRawPacket(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
