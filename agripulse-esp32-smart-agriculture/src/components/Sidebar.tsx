import React from 'react';
import {
  LayoutDashboard,
  Activity,
  LineChart,
  Droplets,
  Sliders,
  Bell,
  History,
  Cpu,
  X,
  CheckCircle2,
} from 'lucide-react';
import { MotorState, DeviceStatus } from '../types/agriculture';

export type DashboardView =
  | 'overview'
  | 'sensors'
  | 'graphs'
  | 'irrigation'
  | 'thresholds'
  | 'alerts'
  | 'history'
  | 'hardware';

interface SidebarProps {
  currentView: DashboardView;
  onSelectView: (view: DashboardView) => void;
  motorState: MotorState;
  deviceStatus: DeviceStatus;
  unreadAlertCount: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  motorState,
  deviceStatus,
  unreadAlertCount,
  isOpenMobile,
  onCloseMobile,
}) => {
  const navItems: { id: DashboardView; label: string; icon: React.ReactNode; badge?: number | string }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'sensors',
      label: 'Live Sensors',
      icon: <Activity className="w-4 h-4" />,
    },
    {
      id: 'graphs',
      label: 'Sensor Graphs',
      icon: <LineChart className="w-4 h-4" />,
    },
    {
      id: 'irrigation',
      label: 'Irrigation Control',
      icon: <Droplets className="w-4 h-4" />,
      badge: motorState === 'ON' ? 'ACTIVE' : undefined,
    },
    {
      id: 'thresholds',
      label: 'Threshold Settings',
      icon: <Sliders className="w-4 h-4" />,
    },
    {
      id: 'alerts',
      label: 'Alerts & Events',
      icon: <Bell className="w-4 h-4" />,
      badge: unreadAlertCount > 0 ? unreadAlertCount : undefined,
    },
    {
      id: 'history',
      label: 'Historical Reports',
      icon: <History className="w-4 h-4" />,
    },
    {
      id: 'hardware',
      label: 'ESP32 & API Hub',
      icon: <Cpu className="w-4 h-4" />,
    },
  ];

  const handleSelect = (view: DashboardView) => {
    onSelectView(view);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-neutral-900/40 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 bg-neutral-900 text-neutral-200 flex flex-col border-r border-neutral-800 transition-transform duration-200 ease-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Lockup */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold shadow-xs">
              🌱
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white block leading-none">
                AgriPulse IoT
              </span>
              <span className="text-[11px] text-emerald-400 font-medium block mt-1">
                ESP32 Smart Agriculture
              </span>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1 text-neutral-400 hover:text-white rounded-md"
            aria-label="Close Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                    : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={isActive ? 'text-white' : 'text-neutral-400'}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tabular-nums ${
                      typeof item.badge === 'string'
                        ? 'bg-emerald-400/20 text-emerald-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Hardware Status Card */}
        <div className="p-3 border-t border-neutral-800 text-xs">
          <div className="bg-neutral-800/80 rounded-lg p-3 border border-neutral-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-neutral-400 text-[11px]">Motor Status</span>
              <span
                className={`font-semibold tabular-nums text-[11px] px-1.5 py-0.5 rounded ${
                  motorState === 'ON'
                    ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/60'
                    : motorState === 'ERROR'
                    ? 'bg-red-900/60 text-red-300 border border-red-700/60'
                    : 'bg-neutral-700 text-neutral-300'
                }`}
              >
                {motorState}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-neutral-400">Node Link</span>
              <span className="text-emerald-400 flex items-center gap-1 font-mono">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                {deviceStatus.online ? 'Sync Active' : 'Offline'}
              </span>
            </div>

            <div className="pt-1 border-t border-neutral-700 text-[10px] text-neutral-400 flex justify-between font-mono">
              <span>{deviceStatus.deviceId}</span>
              <span>{deviceStatus.firmwareVersion}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};