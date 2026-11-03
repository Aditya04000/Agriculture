import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  sensorModel: string;
  value: number | string;
  unit: string;
  rawADC?: number;
  rawLabel?: string;
  status: 'normal' | 'warning' | 'critical' | 'inactive';
  statusText: string;
  thresholdLabel: string;
  min?: number;
  max?: number;
  avg?: number;
  icon: React.ReactNode;
  accentColor?: string;
  onClick?: () => void;
  subValue?: string;
  isFaulty?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  sensorModel,
  value,
  unit,
  rawADC,
  rawLabel = 'Raw ADC',
  status,
  statusText,
  thresholdLabel,
  min,
  max,
  avg,
  icon,
  onClick,
  subValue,
  isFaulty,
}) => {
  const getStatusBadge = () => {
    if (isFaulty) {
      return (
        <span className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
          FAULT / UNPLUGGED
        </span>
      );
    }
    switch (status) {
      case 'critical':
        return (
          <span className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
            {statusText}
          </span>
        );
      case 'warning':
        return (
          <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
            {statusText}
          </span>
        );
      case 'normal':
      default:
        return (
          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
            {statusText}
          </span>
        );
    }
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-neutral-200 p-5 shadow-xs hover:border-neutral-300 transition-all ${
        onClick ? 'cursor-pointer hover:shadow-sm' : ''
      }`}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[11px] font-mono font-medium text-neutral-500 uppercase tracking-wide block">
            {sensorModel}
          </span>
          <h3 className="text-sm font-semibold text-neutral-900 mt-0.5">{title}</h3>
        </div>
        <div className="p-2 rounded-lg bg-neutral-100 text-neutral-700">{icon}</div>
      </div>

      {/* Main Metric Value */}
      <div className="mt-4 flex items-baseline justify-between">
        <div className="flex items-baseline gap-1.5">
          {isFaulty ? (
            <span className="text-2xl font-bold font-mono text-red-600">ERR_DISCONN</span>
          ) : (
            <>
              <span className="text-3xl font-bold font-mono tracking-tight text-neutral-900 tabular-nums">
                {value}
              </span>
              <span className="text-sm font-semibold text-neutral-600">{unit}</span>
            </>
          )}
        </div>
        <div>{getStatusBadge()}</div>
      </div>

      {subValue && !isFaulty && (
        <div className="mt-1 text-xs text-neutral-500 font-medium">{subValue}</div>
      )}

      {/* Threshold and Raw ADC Meta */}
      <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
        <div className="truncate">
          <span className="text-neutral-400">Limit: </span>
          <span className="font-medium text-neutral-700">{thresholdLabel}</span>
        </div>

        {rawADC !== undefined && !isFaulty && (
          <div className="font-mono text-[11px] text-neutral-600 bg-neutral-50 px-1.5 py-0.5 rounded border border-neutral-200">
            {rawLabel}: <span className="tabular-nums font-semibold">{rawADC}</span>
          </div>
        )}
      </div>

      {/* Mini Aggregates (Min / Max / Avg) */}
      {(min !== undefined || max !== undefined || avg !== undefined) && !isFaulty && (
        <div className="mt-2.5 grid grid-cols-3 gap-1 pt-2 border-t border-neutral-100 text-[10px] text-neutral-500 text-center font-mono">
          <div>
            <span className="text-neutral-400 block text-[9px] uppercase">Min</span>
            <span className="tabular-nums font-medium text-neutral-800">
              {min !== undefined ? `${min}${unit}` : '-'}
            </span>
          </div>
          <div>
            <span className="text-neutral-400 block text-[9px] uppercase">Avg</span>
            <span className="tabular-nums font-medium text-neutral-800">
              {avg !== undefined ? `${avg}${unit}` : '-'}
            </span>
          </div>
          <div>
            <span className="text-neutral-400 block text-[9px] uppercase">Max</span>
            <span className="tabular-nums font-medium text-neutral-800">
              {max !== undefined ? `${max}${unit}` : '-'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
