import { agriStore } from "./storage";
import { ThresholdConfig, IrrigationMode } from "../types/agriculture";

let lastKnownTimestamp: string | null = null;

export async function fetchServerLatest() {
  try {
    const res = await fetch("/api/telemetry/latest");
    if (!res.ok) return null;
    
    const data = await res.json();
    if (!data.latest || data.latest.isSimulated) return null;

    // THE FIX: Only add if timestamp is genuinely new
    if (data.latest.timestamp === lastKnownTimestamp) {
      return data; // Do nothing — no update, no re-render
    }
    
    lastKnownTimestamp = data.latest.timestamp;
    agriStore.addReading(data.latest);
    return data;
  } catch {
    return null;
  }
}

export async function fetchHistoricalData() {
  try {
    const res = await fetch("/api/telemetry/history");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.readings)) {
        agriStore.bulkAddReadings(data.readings);
        if (data.readings.length > 0) {
          lastKnownTimestamp = data.readings[data.readings.length - 1].timestamp;
        }
      }
    }
  } catch {}
}

export async function sendMotorCommand(action: "START" | "STOP" | "EMERGENCY_STOP", mode?: IrrigationMode): Promise<boolean> {
  if (mode) agriStore.setIrrigationMode(mode);
  try {
    const res = await fetch("/api/motor/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, mode }),
    });
    return res.ok;
  } catch { return false; }
}

export async function syncThresholdsToServer(thresholds: Partial<ThresholdConfig>): Promise<boolean> {
  try {
    const res = await fetch("/api/thresholds", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(thresholds),
    });
    if (res.ok) {
      agriStore.saveThresholds(thresholds);
      return true;
    }
    return false;
  } catch { return false; }
}