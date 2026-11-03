import React, { useState } from 'react';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Trash2,
  Volume2,
  VolumeX,
  ShieldAlert,
  Clock,
  Filter,
} from 'lucide-react';
import { AlertItem, AlertSeverity } from '../types/agriculture';
import { agriStore } from '../services/storage';

interface AlertsViewProps {
  alerts: AlertItem[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClearAlerts: () => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  alerts,
  onMarkRead,
  onMarkAllRead,
  onClearAlerts,
}) => {
  const [severityFilter, setSeverityFilter] = useState<'all' | AlertSeverity>('all');
  const [browserNotificationEnabled, setBrowserNotificationEnabled] = useState(false);

  const requestBrowserPermission = async () => {
    if (!('Notification' in window)) {
      alert('Browser notifications are not supported in this environment.');
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      setBrowserNotificationEnabled(true);
      new Notification('AgriPulse Alerts Enabled', {
        body: 'You will receive desktop notifications when soil or sensor thresholds are violated.',
        icon: '🌱',
      });
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (severityFilter === 'all') return true;
    return a.severity === severityFilter;
  });

  const getSeverityBadge = (sev: AlertSeverity) => {
    switch (sev) {
      case 'critical':
        return (
          <span className="text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            CRITICAL
          </span>
        );
      case 'warning':
        return (
          <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            WARNING
          </span>
        );
      case 'info':
      default:
        return (
          <span className="text-[11px] font-bold text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            INFO
          </span>
        );
    }
  };

  const unreadCount = alerts.filter((a) => !a.isRead).length;

  return (
    <div className="space-y-6">
      {/* Top Banner and Quick Controls */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-700" />
            <h2 className="text-base font-bold text-neutral-900">
              Agricultural Alerts & Notifications Center
            </h2>
          </div>
          <p className="text-xs text-neutral-600 mt-1">
            Live notification stream featuring rate-limiting cooldowns, deduplication, and automated
            recovery notifications.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={requestBrowserPermission}
            className="px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors flex items-center gap-1.5"
            title="Enable native browser push notifications"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Enable Push Notifications</span>
          </button>

          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mark All Read</span>
            </button>
          )}

          <button
            onClick={onClearAlerts}
            className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Clear all alerts"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 bg-neutral-100 p-1 rounded-lg text-xs font-medium w-fit border border-neutral-200">
        <button
          onClick={() => setSeverityFilter('all')}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            severityFilter === 'all'
              ? 'bg-white text-neutral-900 font-bold shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          All ({alerts.length})
        </button>
        <button
          onClick={() => setSeverityFilter('critical')}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            severityFilter === 'critical'
              ? 'bg-red-600 text-white font-bold shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          Critical ({alerts.filter((a) => a.severity === 'critical').length})
        </button>
        <button
          onClick={() => setSeverityFilter('warning')}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            severityFilter === 'warning'
              ? 'bg-amber-600 text-white font-bold shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          Warning ({alerts.filter((a) => a.severity === 'warning').length})
        </button>
        <button
          onClick={() => setSeverityFilter('info')}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            severityFilter === 'info'
              ? 'bg-sky-600 text-white font-bold shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          Info ({alerts.filter((a) => a.severity === 'info').length})
        </button>
      </div>

      {/* Alerts Stream List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center text-neutral-500">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2 opacity-80" />
            <h4 className="text-sm font-semibold text-neutral-800">No active alerts</h4>
            <p className="text-xs text-neutral-500 mt-1">
              All environmental sensor values are operating within configured safe parameters.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              onClick={() => onMarkRead(alert.id)}
              className={`bg-white rounded-xl border p-5 transition-all cursor-pointer ${
                !alert.isRead
                  ? 'border-neutral-300 shadow-xs ring-1 ring-emerald-500/30'
                  : 'border-neutral-200 opacity-90'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div className="mt-0.5">{getSeverityBadge(alert.severity)}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-neutral-900">{alert.title}</h3>
                      {!alert.isRead && (
                        <span className="w-2 h-2 rounded-full bg-emerald-600" title="Unread" />
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 font-mono mt-0.5">
                      <span>Source: {alert.sensor}</span>
                      <span>·</span>
                      <span>Measured: {alert.measuredValue}{alert.unit}</span>
                      <span>·</span>
                      <span>Threshold: {alert.thresholdValue}</span>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-neutral-400 font-mono whitespace-nowrap self-start sm:self-auto flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(alert.timestamp).toLocaleString()}</span>
                </div>
              </div>

              {/* Recommended Action Box */}
              <div className="mt-3.5 pt-3 border-t border-neutral-100 flex items-start gap-2 text-xs text-neutral-700 bg-neutral-50/70 p-2.5 rounded-lg">
                <span className="font-semibold text-emerald-900 shrink-0">Recommended Action:</span>
                <span className="leading-relaxed">{alert.recommendedAction}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
