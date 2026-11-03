import React, { useState } from 'react';
import {
  Droplets,
  Power,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  History,
  Info,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Settings2,
  Sliders,
} from 'lucide-react';
import {
  MotorState,
  IrrigationMode,
  MotorEvent,
  ThresholdConfig,
  SensorReading,
  DeviceStatus,
} from '../types/agriculture';

interface IrrigationViewProps {
  motorState: MotorState;
  irrigationMode: IrrigationMode;
  motorLogs: MotorEvent[];
  thresholds: ThresholdConfig;
  latestReading: SensorReading | null;
  deviceStatus: DeviceStatus;
  onSetMode: (mode: IrrigationMode) => void;
  onMotorCommand: (action: 'START' | 'STOP' | 'EMERGENCY_STOP') => void;
  onUpdateThresholds: (newT: Partial<ThresholdConfig>) => void;
}

export const IrrigationView: React.FC<IrrigationViewProps> = ({
  motorState,
  irrigationMode,
  motorLogs,
  thresholds,
  latestReading,
  deviceStatus,
  onSetMode,
  onMotorCommand,
  onUpdateThresholds,
}) => {
  const [manualConfirmModal, setManualConfirmModal] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<'START' | 'STOP' | null>(null);

  const handleStartRequest = () => {
    setPendingAction('START');
    setManualConfirmModal(true);
  };

  const handleStopRequest = () => {
    setPendingAction('STOP');
    setManualConfirmModal(true);
  };

  const confirmAction = () => {
    if (pendingAction) {
      if (pendingAction === 'START' && irrigationMode === 'disabled') {
        onSetMode('manual');
      }
      onMotorCommand(pendingAction);
    }
    setManualConfirmModal(false);
    setPendingAction(null);
  };

  const currentMoisture = latestReading?.soilMoisture ?? 35;
  const isRaining = latestReading?.rainDetected ?? false;

  // Active irrigation duration calculation
  const activeLog = motorLogs.find((l) => l.action === 'START' && motorState === 'ON');
  const activeSeconds = activeLog
    ? Math.max(0, Math.floor((Date.now() - new Date(activeLog.timestamp).getTime()) / 1000))
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner: Architecture & Electrical Safety Disclaimer */}
      <div className="bg-emerald-950 text-white rounded-xl p-5 border border-emerald-900 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-800 text-emerald-200 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              Autonomous ESP32 Safety Controller Architecture
            </h3>
            <p className="text-xs text-emerald-300 mt-0.5 leading-relaxed">
              The website sends authenticated commands via REST API. The ESP32 independently validates
              commands, enforces a <strong>{Math.round(thresholds.maxMotorRuntimeSeconds / 60)}-minute maximum runtime fail-safe</strong>,
              and maintains soil moisture hysteresis even if the network disconnects.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
          <button
            onClick={() => onMotorCommand('EMERGENCY_STOP')}
            className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>EMERGENCY STOP</span>
          </button>
        </div>
      </div>

      {/* Main Motor Control Room Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Live State and Controls */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
            <div>
              <span className="text-[11px] font-mono font-medium text-neutral-500 uppercase">
                Actuator Node #1
              </span>
              <h2 className="text-base font-bold text-neutral-900">
                Submersible Pump Relay (GPIO 23)
              </h2>
            </div>

            {/* Motor State Badge */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500 font-medium">Motor Status:</span>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-md tracking-wider font-mono ${
                  motorState === 'ON'
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 animate-pulse'
                    : motorState === 'ERROR'
                    ? 'bg-red-100 text-red-900 border border-red-300'
                    : motorState === 'STARTING'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                }`}
              >
                {motorState}
              </span>
            </div>
          </div>

          {/* Mode Switcher */}
          <div>
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block mb-2">
              Operational Irrigation Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* Auto */}
              <button
                onClick={() => onSetMode('auto')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  irrigationMode === 'auto'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-1 ring-emerald-500'
                    : 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs">
                  <span>Automatic Mode</span>
                  {irrigationMode === 'auto' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Triggers pump below {thresholds.minSoilMoisture}%, stops at target {thresholds.targetSoilMoisture}%.
                </p>
              </button>

              {/* Manual */}
              <button
                onClick={() => onSetMode('manual')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  irrigationMode === 'manual'
                    ? 'bg-neutral-100 border-neutral-500 text-neutral-900 ring-1 ring-neutral-500'
                    : 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs">
                  <span>Manual Mode</span>
                  {irrigationMode === 'manual' && <CheckCircle2 className="w-4 h-4 text-neutral-900" />}
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Manual start/stop controls. ESP32 safety timeout remains active.
                </p>
              </button>

              {/* Disabled */}
              <button
                onClick={() => onSetMode('disabled')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  irrigationMode === 'disabled'
                    ? 'bg-red-50 border-red-500 text-red-950 ring-1 ring-red-500'
                    : 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs">
                  <span>Disabled Mode</span>
                  {irrigationMode === 'disabled' && <AlertCircle className="w-4 h-4 text-red-600" />}
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Pumps locked OFF. Useful during maintenance or fertilizer application.
                </p>
              </button>
            </div>
          </div>

          {/* Interactive Start / Stop Controls */}
          <div className="bg-neutral-50 rounded-xl p-5 border border-neutral-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-neutral-900 block">
                Manual Command Override
              </span>
              <p className="text-xs text-neutral-500 mt-0.5">
                {motorState === 'ON'
                  ? `Pump is actively running (${activeSeconds}s elapsed).`
                  : 'Pump is idle. All safety interlocks are healthy.'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {motorState === 'ON' ? (
                <button
                  onClick={handleStopRequest}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-2"
                >
                  <Power className="w-4 h-4" />
                  <span>Stop Pump</span>
                </button>
              ) : (
                <button
                  onClick={handleStartRequest}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-2"
                >
                  <Droplets className="w-4 h-4" />
                  <span>Start Pump</span>
                </button>
              )}
            </div>
          </div>

          {/* Hysteresis & Safety Threshold Adjuster Quick Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 text-xs">
              <span className="text-neutral-500 block">Start Irrigation Trigger</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-lg font-bold font-mono text-neutral-900">
                  &lt; {thresholds.minSoilMoisture}%
                </span>
                <span className="text-[11px] text-neutral-500">Soil Deficit</span>
              </div>
            </div>

            <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 text-xs">
              <span className="text-neutral-500 block">Stop Target (Hysteresis)</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-lg font-bold font-mono text-emerald-800">
                  {thresholds.targetSoilMoisture}%
                </span>
                <span className="text-[11px] text-neutral-500">Adequate</span>
              </div>
            </div>

            <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 text-xs">
              <span className="text-neutral-500 block">Max Run Safety Timeout</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-lg font-bold font-mono text-neutral-900">
                  {Math.round(thresholds.maxMotorRuntimeSeconds / 60)} min
                </span>
                <span className="text-[11px] text-neutral-500">Auto Cutoff</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Electrical & Circuit Safety Guidance */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Electrical & Relay Safety Guidelines</span>
          </h3>

          <div className="space-y-3 text-xs text-neutral-600 leading-relaxed">
            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200/80">
              <span className="font-semibold text-neutral-900 block">Independent Motor Power Supply</span>
              <p className="mt-1 text-[11px]">
                <strong>DO NOT</strong> power a 5V or 12V submersible water pump from the ESP32’s 3.3V or
                VIN pins. Inductive motor spikes and high inrush current (&gt;800mA) will reset the ESP32 or
                destroy the AMS1117 voltage regulator. Use an external 5V/12V DC power adapter.
              </p>
            </div>

            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200/80">
              <span className="font-semibold text-neutral-900 block">Flyback Diode & Snubber</span>
              <p className="mt-1 text-[11px]">
                DC motor coils generate high-voltage reverse EMF spikes when switched off. Connect a
                <strong> 1N4007 flyback diode</strong> in reverse-parallel across the motor terminals
                (cathode to positive, anode to negative).
              </p>
            </div>

            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200/80">
              <span className="font-semibold text-neutral-900 block">Optocoupler Isolation</span>
              <p className="mt-1 text-[11px]">
                Use a 5V single-channel relay module with JD-VCC jumper removed to ensure total optical
                isolation between ESP32 GPIO 23 and the high-current relay coil circuit.
              </p>
            </div>

            <div className="p-3 bg-blue-50/80 rounded-lg border border-blue-200 text-blue-950">
              <span className="font-semibold block flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Rain Interlock Status</span>
              </span>
              <p className="mt-1 text-[11px]">
                {thresholds.pauseIrrigationOnRain ? (
                  isRaining ? (
                    <strong className="text-blue-700">
                      Rain active! Automatic irrigation is currently suspended by rain interlock.
                    </strong>
                  ) : (
                    'Rain interlock is armed. When YL-83 detects rain, automatic irrigation will pause immediately.'
                  )
                ) : (
                  'Rain interlock is disabled in settings.'
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Motor Start and Stop Event Audit Log */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-700" />
              <span>Motor Activation Audit Trail</span>
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Comprehensive timestamped log of every pump start, stop, timeout, and emergency override
            </p>
          </div>
          <span className="text-xs font-mono text-neutral-500 font-medium">
            Total recorded events: {motorLogs.length}
          </span>
        </div>

        {motorLogs.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 text-xs italic">
            No motor events recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 text-[11px] font-semibold text-neutral-500 uppercase font-mono">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">State Change</th>
                  <th className="py-2.5 px-3">Moisture</th>
                  <th className="py-2.5 px-3">Runtime</th>
                  <th className="py-2.5 px-3">Reason / Trigger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-mono text-neutral-700">
                {motorLogs.slice(0, 15).map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="py-2.5 px-3 text-neutral-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.action === 'START'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.action === 'EMERGENCY_STOP'
                            ? 'bg-red-100 text-red-800'
                            : log.action === 'TIMEOUT'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-neutral-100 text-neutral-700'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-neutral-600">
                      {log.previousState} &rarr;{' '}
                      <span className="font-bold text-neutral-900">{log.newState}</span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {log.moistureAtTrigger !== undefined ? `${log.moistureAtTrigger}%` : '-'}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {log.runtimeSeconds ? `${log.runtimeSeconds}s (${Math.round(log.runtimeSeconds / 60)}m)` : '-'}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-neutral-800 max-w-md truncate">
                      {log.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Manual Motor Action */}
      {manualConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-neutral-200 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-neutral-900">
                Confirm {pendingAction === 'START' ? 'Manual Pump Activation' : 'Pump Deactivation'}
              </h3>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              {pendingAction === 'START'
                ? `You are requesting manual activation of the irrigation motor. Soil moisture is currently ${currentMoisture}%. The ESP32 maximum safety timeout (${Math.round(thresholds.maxMotorRuntimeSeconds / 60)} minutes) will automatically stop the pump if not stopped manually.`
                : 'You are sending a manual STOP command to immediately disengage the relay.'}
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
              <button
                onClick={() => setManualConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                className={`px-4 py-2 text-xs font-bold text-white rounded-lg transition-colors shadow-xs ${
                  pendingAction === 'START' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                Confirm {pendingAction}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
