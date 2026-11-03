import {
  SensorReading,
  ThresholdConfig,
  AlertItem,
  MotorEvent,
  MotorState,
  IrrigationMode,
  DeviceStatus,
  SystemStats,
} from "../types/agriculture";
import { DEFAULT_THRESHOLDS, INITIAL_DEVICE_STATUS } from "../utils/constants";

const STORAGE_KEYS = {
  THRESHOLDS: "agripulse_thresholds_v1",
  READINGS: "agripulse_readings_v4",
  ALERTS: "agripulse_alerts_v1",
  MOTOR_LOGS: "agripulse_motor_logs_v1",
  DEVICE_STATUS: "agripulse_device_status_v1",
};

export class AgricultureDataStore {
  private thresholds: ThresholdConfig;
  private readings: SensorReading[] = [];
  private alerts: AlertItem[] = [];
  private motorLogs: MotorEvent[] = [];
  private motorState: MotorState = "OFF";
  private irrigationMode: IrrigationMode = "auto";
  private deviceStatus: DeviceStatus;
  private listeners: Set<() => void> = new Set();
  private version = 0;

  constructor() {
    this.thresholds = this.loadThresholds();
    this.deviceStatus = this.loadDeviceStatus();
    this.readings = this.loadReadings();
    this.alerts = this.loadAlerts();
    this.motorLogs = this.loadMotorLogs();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.version++;
    this.listeners.forEach(fn => { try { fn(); } catch(e){} });
  }

  public getVersion(): number { return this.version; }

  // --- READINGS ---
  public addReading(reading: Omit<SensorReading, "id">) {
    if (reading.isSimulated) return;
    
    const exists = this.readings.some(r => r.timestamp === reading.timestamp && r.deviceId === reading.deviceId);
    if (exists) return;

    const fullReading: SensorReading = { ...reading, id: `r_${Date.now()}_${Math.random().toString(36).substring(2,5)}` };
    this.readings.push(fullReading);
    this.readings.sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    if (this.readings.length > 1000) this.readings = this.readings.slice(-800);
    
    this.deviceStatus.lastSeen = fullReading.timestamp;
    this.deviceStatus.online = true;
    this.deviceStatus.realPacketsReceived = (this.deviceStatus.realPacketsReceived || 0) + 1;

    if (reading.motorState === "ON" && this.motorState !== "ON") {
      this.motorState = "ON";
      this.logMotorEvent("START", "OFF", "ON", "Reported by ESP32");
    } else if (reading.motorState === "OFF" && this.motorState !== "OFF") {
      this.motorState = "OFF";
      this.logMotorEvent("STOP", "ON", "OFF", "Reported by ESP32");
    }

    this.saveReadings();
    this.notify();
  }

  public bulkAddReadings(newReadings: SensorReading[]) {
    let added = false;
    newReadings.forEach(r => {
      if (r.isSimulated) return;
      const exists = this.readings.some(e => e.timestamp === r.timestamp && e.deviceId === r.deviceId);
      if (!exists) {
        this.readings.push({ ...r, id: r.id || `h_${Date.now()}_${Math.random()}` });
        added = true;
      }
    });
    if (added) {
      this.readings.sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      if (this.readings.length > 1000) this.readings = this.readings.slice(-800);
      this.saveReadings();
      this.notify();
    }
  }

  public getLatestReading(): SensorReading | null {
    return this.readings.length > 0 ? this.readings[this.readings.length - 1] : null;
  }

  public getAllReadings(): SensorReading[] {
    return [...this.readings];
  }

  private saveReadings() {
    try { localStorage.setItem(STORAGE_KEYS.READINGS, JSON.stringify(this.readings.slice(-500))); } catch {}
  }

  private loadReadings(): SensorReading[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.READINGS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed.filter((r: SensorReading) => !r.isSimulated);
      }
    } catch {}
    return [];
  }

  // --- THRESHOLDS ---
  public getThresholds(): ThresholdConfig { return { ...this.thresholds }; }
  public saveThresholds(t: Partial<ThresholdConfig>) {
    this.thresholds = { ...this.thresholds, ...t };
    localStorage.setItem(STORAGE_KEYS.THRESHOLDS, JSON.stringify(this.thresholds));
    this.notify();
  }
  private loadThresholds(): ThresholdConfig {
    try { const s = localStorage.getItem(STORAGE_KEYS.THRESHOLDS); if (s) return { ...DEFAULT_THRESHOLDS, ...JSON.parse(s) }; } catch {}
    return { ...DEFAULT_THRESHOLDS };
  }

  // --- DEVICE STATUS ---
  public getDeviceStatus(): DeviceStatus { return { ...this.deviceStatus }; }
  private loadDeviceStatus(): DeviceStatus {
    try { const s = localStorage.getItem(STORAGE_KEYS.DEVICE_STATUS); if (s) return { ...INITIAL_DEVICE_STATUS, ...JSON.parse(s) }; } catch {}
    return { ...INITIAL_DEVICE_STATUS };
  }

  // --- MOTOR ---
  public getMotorState(): MotorState { return this.motorState; }
  public getIrrigationMode(): IrrigationMode { return this.irrigationMode; }
  public setIrrigationMode(mode: IrrigationMode) { this.irrigationMode = mode; this.notify(); }
  public getMotorLogs(): MotorEvent[] { return [...this.motorLogs]; }
  private logMotorEvent(action: MotorEvent["action"], prev: MotorState, next: MotorState, reason: string) {
    this.motorLogs.unshift({ id: `m_${Date.now()}`, timestamp: new Date().toISOString(), action, previousState: prev, newState: next, reason });
    if (this.motorLogs.length > 100) this.motorLogs = this.motorLogs.slice(0, 100);
    localStorage.setItem(STORAGE_KEYS.MOTOR_LOGS, JSON.stringify(this.motorLogs));
  }
  private loadMotorLogs(): MotorEvent[] {
    try { const s = localStorage.getItem(STORAGE_KEYS.MOTOR_LOGS); if (s) return JSON.parse(s); } catch {}
    return [];
  }

  // --- ALERTS ---
  public getAlerts(): AlertItem[] { return [...this.alerts]; }
  public addAlert(data: Omit<AlertItem, "id" | "timestamp" | "isRead" | "isAcknowledged">) {
    this.alerts.unshift({ ...data, id: `a_${Date.now()}`, timestamp: new Date().toISOString(), isRead: false, isAcknowledged: false });
    if (this.alerts.length > 50) this.alerts = this.alerts.slice(0, 50);
    localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(this.alerts));
    this.notify();
  }
  public markAlertRead(id: string) { const a = this.alerts.find(x => x.id === id); if (a) { a.isRead = true; this.notify(); } }
  public markAllAlertsRead() { this.alerts.forEach(a => a.isRead = true); this.notify(); }
  public clearAlerts() { this.alerts = []; this.notify(); }
  private loadAlerts(): AlertItem[] {
    try { const s = localStorage.getItem(STORAGE_KEYS.ALERTS); if (s) return JSON.parse(s); } catch {}
    return [];
  }

  // --- STATS WITH RAIN CALCULATION ---
  public getSystemStats(): SystemStats {
    const cycles = this.motorLogs.filter(l => l.action === "START").length;
    const totalRuntimeSec = this.motorLogs.reduce((acc, curr) => acc + (curr.runtimeSeconds || 0), 0);
    
    let rainEventsCount = 0;
    let rainDurationSeconds = 0;
    let prevRain = false;

    for (const r of this.readings) {
      if (r.rainDetected) {
        rainDurationSeconds += 5; // Each packet is approx 5 seconds
        if (!prevRain) rainEventsCount++;
        prevRain = true;
      } else {
        prevRain = false;
      }
    }

    const rainMinutes = Math.round(rainDurationSeconds / 60);
    
    // Assume pump runs at 5 Liters per minute
    const LITERS_PER_MINUTE = 5; 
    const waterSavedLiters = rainMinutes * LITERS_PER_MINUTE;
    const waterSavedGallons = Math.round(waterSavedLiters * 0.264172);

    return {
      totalIrrigationCycles: cycles,
      totalWateringDurationMinutes: Math.round(totalRuntimeSec / 60),
      waterSavedGallonsEst: waterSavedGallons,
      activeAlertCount: this.alerts.filter(a => !a.isRead).length,
      rainEventsCount: rainEventsCount,
      lowLightEventsCount: 0,
    };
  }
}

export const agriStore = new AgricultureDataStore();