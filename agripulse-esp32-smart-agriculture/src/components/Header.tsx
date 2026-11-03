import React, { useState } from "react";
import { AlertTriangle, ShieldAlert, Wifi, WifiOff, Copy, Check, Cpu } from "lucide-react";
import { DeviceStatus, AlertItem, MotorState } from "../types/agriculture";

interface HeaderProps {
  currentViewTitle: string;
  deviceStatus: DeviceStatus;
  alerts: AlertItem[];
  motorState: MotorState;
  onNavigateToAlerts: () => void;
  onEmergencyStop: () => void;
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentViewTitle,
  deviceStatus,
  alerts,
  motorState,
  onNavigateToAlerts,
  onEmergencyStop,
  onOpenMobileMenu,
}) => {
  const unreadAlerts = alerts.filter((a) => !a.isRead).length;
  const [copied, setCopied] = useState(false);

  const endpointUrl = typeof window !== "undefined" ? `${window.location.origin}/api/telemetry` : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(endpointUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 lg:px-8 py-3.5 transition-colors">
      <div className="flex items-center justify-between gap-4">
        
        {/* Left Side: Menu & Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 text-neutral-600 hover:text-neutral-900 rounded-md hover:bg-neutral-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div>
            <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium">
              <span>AgriPulse</span>
              <span>/</span>
              <span className="text-emerald-800 font-semibold">{deviceStatus.name}</span>
            </div>
            <h1 className="text-lg lg:text-xl font-bold tracking-tight text-neutral-900 leading-tight">
              {currentViewTitle}
            </h1>
          </div>
        </div>

        {/* Right Side: Clean ESP32 Status, Alerts, E-Stop */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          
          {/* Compact ESP32 Status */}
          <div className="hidden sm:flex items-center gap-2 bg-neutral-100 border border-neutral-200 rounded-lg px-3 py-1.5">
            <Cpu className={`w-4 h-4 ${deviceStatus.online ? "text-emerald-600" : "text-neutral-400"}`} />
            <span className="text-xs font-semibold text-neutral-800">
              {deviceStatus.deviceId}
            </span>
            <div className="w-px h-4 bg-neutral-300 mx-1" />
            <span className="text-xs font-mono font-bold text-emerald-700">
              {deviceStatus.realPacketsReceived} Pkts
            </span>
            <button 
              onClick={handleCopy} 
              className="ml-1 text-neutral-400 hover:text-emerald-700 transition-colors"
              title="Copy Telemetry URL"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <button
            onClick={onNavigateToAlerts}
            className="relative p-2 text-neutral-600 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <AlertTriangle className={`w-5 h-5 ${unreadAlerts > 0 ? "text-amber-600" : "text-neutral-500"}`} />
            {unreadAlerts > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-bold text-white bg-amber-600 rounded-full tabular-nums">
                {unreadAlerts}
              </span>
            )}
          </button>

          <button
            onClick={onEmergencyStop}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all shadow-xs ${
              motorState === "ON"
                ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
                : "bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">EMERGENCY STOP</span>
          </button>
        </div>
      </div>
    </header>
  );
};