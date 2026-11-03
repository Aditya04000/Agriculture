import React, { useState, useEffect, useRef } from "react";
import { Sidebar, DashboardView } from "./components/Sidebar";
import { Header } from "./components/Header";
import { OverviewView } from "./components/OverviewView";
import { LiveSensorsView } from "./components/LiveSensorsView";
import { SensorGraphsView } from "./components/SensorGraphsView";
import { IrrigationView } from "./components/IrrigationView";
import { ThresholdsView } from "./components/ThresholdsView";
import { AlertsView } from "./components/AlertsView";
import { HistoricalView } from "./components/HistoricalView";
import { HardwareHubView } from "./components/HardwareHubView";
import { agriStore } from "./services/storage";
import { fetchHistoricalData, fetchServerLatest, sendMotorCommand, syncThresholdsToServer } from "./services/api";
import { SensorReading, ThresholdConfig, AlertItem, MotorEvent, MotorState, IrrigationMode, DeviceStatus, SystemStats } from "./types/agriculture";

export default function App() {
  const [currentView, setCurrentView] = useState<DashboardView>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [thresholds, setThresholds] = useState<ThresholdConfig>(agriStore.getThresholds());
  const [latestReading, setLatestReading] = useState<SensorReading | null>(agriStore.getLatestReading());
  const [readings, setReadings] = useState<SensorReading[]>(agriStore.getAllReadings());
  const [alerts, setAlerts] = useState<AlertItem[]>(agriStore.getAlerts());
  const [motorLogs, setMotorLogs] = useState<MotorEvent[]>(agriStore.getMotorLogs());
  const [motorState, setMotorState] = useState<MotorState>(agriStore.getMotorState());
  const [irrigationMode, setIrrigationMode] = useState<IrrigationMode>(agriStore.getIrrigationMode());
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>(agriStore.getDeviceStatus());
  const [systemStats, setSystemStats] = useState<SystemStats>(agriStore.getSystemStats());

  const lastVersionRef = useRef(0);

  useEffect(() => {
    const unsubscribe = agriStore.subscribe(() => {
      const currentVersion = agriStore.getVersion();
      if (currentVersion === lastVersionRef.current) return;
      lastVersionRef.current = currentVersion;

      setThresholds(agriStore.getThresholds());
      setLatestReading(agriStore.getLatestReading());
      setReadings(agriStore.getAllReadings());
      setAlerts(agriStore.getAlerts());
      setMotorLogs(agriStore.getMotorLogs());
      setMotorState(agriStore.getMotorState());
      setIrrigationMode(agriStore.getIrrigationMode());
      setDeviceStatus(agriStore.getDeviceStatus());
      setSystemStats(agriStore.getSystemStats());
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetchHistoricalData();
    const interval = setInterval(fetchServerLatest, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleMotorCommand = (action: "START" | "STOP" | "EMERGENCY_STOP") => sendMotorCommand(action);
  const handleSetIrrigationMode = (mode: IrrigationMode) => sendMotorCommand("STOP", mode);
  const handleSaveThresholds = (updated: Partial<ThresholdConfig>) => syncThresholdsToServer(updated);

  return (
    <div className="min-h-screen bg-neutral-100 flex font-sans">
      <Sidebar currentView={currentView} onSelectView={setCurrentView} motorState={motorState} deviceStatus={deviceStatus} unreadAlertCount={alerts.filter(a => !a.isRead).length} isOpenMobile={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Header currentViewTitle={currentView} deviceStatus={deviceStatus} alerts={alerts} motorState={motorState} onNavigateToAlerts={() => setCurrentView("alerts")} onEmergencyStop={() => sendMotorCommand("EMERGENCY_STOP")} onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          {currentView === "overview" && (
            <OverviewView 
              latestReading={latestReading} 
              readings={readings} 
              thresholds={thresholds} 
              deviceStatus={deviceStatus} 
              motorState={motorState} 
              irrigationMode={irrigationMode} 
              alerts={alerts} 
              systemStats={systemStats} 
              onSetIrrigationMode={handleSetIrrigationMode} 
              onMotorCommand={handleMotorCommand} 
              onNavigate={setCurrentView} 
            />
          )}
          {currentView === "sensors" && <LiveSensorsView latestReading={latestReading} thresholds={thresholds} deviceStatus={deviceStatus} onUpdateThresholds={handleSaveThresholds} />}
          {currentView === "graphs" && <SensorGraphsView readings={readings} thresholds={thresholds} onUpdateThresholds={handleSaveThresholds} />}
          {currentView === "irrigation" && <IrrigationView motorState={motorState} irrigationMode={irrigationMode} motorLogs={motorLogs} thresholds={thresholds} latestReading={latestReading} deviceStatus={deviceStatus} onSetMode={handleSetIrrigationMode} onMotorCommand={handleMotorCommand} onUpdateThresholds={handleSaveThresholds} />}
          {currentView === "thresholds" && <ThresholdsView currentThresholds={thresholds} onSave={handleSaveThresholds} />}
          {currentView === "alerts" && <AlertsView alerts={alerts} onMarkRead={(id) => agriStore.markAlertRead(id)} onMarkAllRead={() => agriStore.markAllAlertsRead()} onClearAlerts={() => agriStore.clearAlerts()} />}
          {currentView === "history" && <HistoricalView readings={readings} stats={systemStats} />}
          {currentView === "hardware" && <HardwareHubView deviceStatus={deviceStatus} />}
        </main>
      </div>
    </div>
  );
}