import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.resolve(__dirname, 'sensor_telemetry_db.json');

interface TelemetryPoint {
  id: string;
  deviceId: string;
  timestamp: string;
  soilMoisture: number;
  soilMoistureRaw?: number;
  airTemperature: number;
  humidity: number;
  rainDetected: boolean;
  rainSensorRaw?: number;
  rainLevelPercent: number;
  rainStatus: string;
  lightIntensity: number;
  lightSensorRaw?: number;
  probeTemperature: number;
  probeType: string;
  motorState: string;
  isSimulated?: boolean;
}

interface ServerThresholds {
  minSoilMoisture: number;
  targetSoilMoisture: number;
  minAirTemp: number;
  maxAirTemp: number;
  minHumidity: number;
  maxHumidity: number;
  pauseIrrigationOnRain: boolean;
  minLightIntensity: number;
  minProbeTemp: number;
  maxProbeTemp: number;
  maxMotorRuntimeSeconds: number;
}

const defaultThresholds: ServerThresholds = {
  minSoilMoisture: 30,
  targetSoilMoisture: 40,
  minAirTemp: 18,
  maxAirTemp: 36,
  minHumidity: 45,
  maxHumidity: 85,
  pauseIrrigationOnRain: true,
  minLightIntensity: 25,
  minProbeTemp: 15,
  maxProbeTemp: 32,
  maxMotorRuntimeSeconds: 600,
};

let readingsCache: TelemetryPoint[] = [];
let thresholdsCache: ServerThresholds = { ...defaultThresholds };
let motorStateCache = 'OFF';
let irrigationModeCache = 'auto';
let pendingCommand: string | null = null;
let lastHeartbeat = 0;
let hardwarePacketsReceived = 0;

// Load from disk
try {
  if (fs.existsSync(DB_FILE)) {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.readings)) {
      readingsCache = parsed.readings.filter((r: any) => !r.isSimulated);
    }
    if (parsed.thresholds) thresholdsCache = { ...defaultThresholds, ...parsed.thresholds };
    if (parsed.motorState) motorStateCache = parsed.motorState;
    if (parsed.irrigationMode) irrigationModeCache = parsed.irrigationMode;
  }
} catch (err) {
  console.warn('Starting fresh database:', err);
}

function persistToDisk() {
  try {
    const data = {
      readings: readingsCache.slice(-1000),
      thresholds: thresholdsCache,
      motorState: motorStateCache,
      irrigationMode: irrigationModeCache,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(express.json());

  // CORS & Network Setup
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-API-Key');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });

  // 1. POST Telemetry (From ESP32)
  app.post('/api/telemetry', (req: Request, res: Response) => {
    const body = req.body;
    if (!body || typeof body.soilMoisture !== 'number') {
      return res.status(400).json({ error: 'Invalid telemetry payload.' });
    }

    lastHeartbeat = Date.now();
    hardwarePacketsReceived++;
    
    const newReading: TelemetryPoint = {
      id: `esp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      deviceId: body.deviceId || 'ESP32-AGRI-01',
      timestamp: body.timestamp || new Date().toISOString(),
      soilMoisture: Number(body.soilMoisture),
      soilMoistureRaw: body.soilMoistureRaw ? Number(body.soilMoistureRaw) : undefined,
      airTemperature: Number(body.airTemperature ?? 0),
      humidity: Number(body.humidity ?? 0),
      rainDetected: Boolean(body.rainDetected),
      rainSensorRaw: body.rainSensorRaw ? Number(body.rainSensorRaw) : undefined,
      rainLevelPercent: Number(body.rainLevelPercent ?? 0),
      rainStatus: body.rainStatus || (body.rainDetected ? 'rain' : 'dry'),
      lightIntensity: Number(body.lightIntensity ?? 0),
      lightSensorRaw: body.lightSensorRaw ? Number(body.lightSensorRaw) : undefined,
      probeTemperature: Number(body.probeTemperature ?? 0),
      probeType: body.probeType || 'soil',
      motorState: body.motorState || motorStateCache,
      isSimulated: false,
    };

    readingsCache.push(newReading);
    if (readingsCache.length > 2000) {
      readingsCache = readingsCache.slice(-1500);
    }

    // Handle Automated Motor Logic
    let dispatchCommand: string | null = pendingCommand;
    pendingCommand = null;

    if (irrigationModeCache === 'auto') {
      if (motorStateCache === 'OFF' && newReading.soilMoisture < thresholdsCache.minSoilMoisture) {
        if (!thresholdsCache.pauseIrrigationOnRain || !newReading.rainDetected) {
          motorStateCache = 'ON';
          dispatchCommand = 'START_PUMP';
        }
      } else if (motorStateCache === 'ON') {
        if (newReading.soilMoisture >= thresholdsCache.targetSoilMoisture) {
          motorStateCache = 'OFF';
          dispatchCommand = 'STOP_PUMP';
        } else if (thresholdsCache.pauseIrrigationOnRain && newReading.rainDetected) {
          motorStateCache = 'OFF';
          dispatchCommand = 'STOP_PUMP';
        }
      }
    }

    persistToDisk();

    return res.status(200).json({
      status: 'acknowledged',
      command: dispatchCommand,
      mode: irrigationModeCache,
    });
  });

  // 2. Latest Reading
  app.get('/api/telemetry/latest', (req: Request, res: Response) => {
    const latest = readingsCache.length > 0 ? readingsCache[readingsCache.length - 1] : null;
    return res.json({
      latest,
      motorState: motorStateCache,
      irrigationMode: irrigationModeCache,
      online: lastHeartbeat > 0 && Date.now() - lastHeartbeat < 15000,
      hardwarePacketsReceived,
    });
  });

  // 3. History
  app.get('/api/telemetry/history', (req: Request, res: Response) => {
    return res.json({ readings: readingsCache.slice(-1000) });
  });

  // 4. Thresholds
  app.get('/api/thresholds', (req: Request, res: Response) => res.json(thresholdsCache));
  app.put('/api/thresholds', (req: Request, res: Response) => {
    thresholdsCache = { ...thresholdsCache, ...req.body };
    persistToDisk();
    return res.json({ success: true, thresholds: thresholdsCache });
  });

  // 5. Motor Commands (Dashboard -> ESP32)
  app.get('/api/motor/status', (req: Request, res: Response) => {
    const cmd = pendingCommand;
    pendingCommand = null; // Clear command once fetched by ESP32
    return res.json({ 
      motorState: motorStateCache, 
      irrigationMode: irrigationModeCache, 
      command: cmd 
    });
  });

  app.post('/api/motor/command', (req: Request, res: Response) => {
    const { action, mode } = req.body;
    
    if (mode && ['auto', 'manual', 'disabled'].includes(mode)) {
      irrigationModeCache = mode;
    }
    
    if (action === 'START') {
      motorStateCache = 'ON';
      pendingCommand = 'START_PUMP';
    } else if (action === 'STOP') {
      motorStateCache = 'OFF';
      pendingCommand = 'STOP_PUMP';
    } else if (action === 'EMERGENCY_STOP') {
      motorStateCache = 'OFF';
      pendingCommand = 'EMERGENCY_STOP';
    }
    
    persistToDisk();
    return res.json({ success: true, motorState: motorStateCache, irrigationMode: irrigationModeCache });
  });

  // --- VITE MIDDLEWARE ---
  const isProduction = process.env.NODE_ENV === 'production';
  const distDir = path.resolve(__dirname, 'dist');

  if (isProduction && fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (req: Request, res: Response) => res.sendFile(path.resolve(distDir, 'index.html')));
  } else {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }

  // CRITICAL: '0.0.0.0' allows ESP32 to connect over Wi-Fi
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AgriPulse] Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => { console.error(err); process.exit(1); });