'use client';

import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

interface SparkPoint { value: number }

interface KPICardProps {
  label:     string;
  value:     number;
  change:    number | null;
  sparkline: SparkPoint[];
  format?:   'compact' | 'percent';
}

function fmt(value: number, format: 'compact' | 'percent'): string {
  if (format === 'percent') return `${value.toFixed(1)}%`;
  if (value >= 1_000_000)   return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)       return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

export function KPICard({ label, value, change, sparkline, format = 'compact' }: KPICardProps) {
  const isPositive  = change === null || change >= 0;
  const strokeColor = isPositive ? '#34d399' : '#f87171';
  // Gradient IDs must be unique per card to avoid SVG conflicts
  const gradId      = `sg-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-5 flex flex-col gap-4 hover:border-slate-600 transition-colors duration-150">

      {/* Label */}
      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider truncate">
        {label}
      </p>

      {/* Value + change */}
      <div>
        <p className="text-white text-3xl font-bold tabular-nums leading-none">
          {fmt(value, format)}
        </p>

        {change !== null ? (
          <div
            className={`flex items-center gap-1 mt-2 text-sm font-semibold ${
              isPositive ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            <span>{isPositive ? '↑' : '↓'}</span>
            <span>{Math.abs(change).toFixed(1)}%</span>
            <span className="text-slate-500 text-xs font-normal ml-1">vs prev</span>
          </div>
        ) : (
          <p className="text-slate-600 text-xs mt-2">No comparison yet</p>
        )}
      </div>

      {/* Sparkline */}
      <div className="h-14 -mx-1">
        {sparkline.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkline} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={strokeColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={strokeColor} stopOpacity={0}   />
                </linearGradient>
              </defs>
              <Tooltip
                contentStyle={{
                  background:   '#1e293b',
                  border:       '1px solid #334155',
                  borderRadius: '8px',
                  fontSize:     '12px',
                  color:        '#f8fafc',
                  padding:      '4px 10px',
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(v: any) => [fmt(Number(v), format), label]}
                labelFormatter={() => ''}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={strokeColor}
                strokeWidth={2}
                fill={`url(#${gradId})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-end pb-1">
            <p className="text-slate-600 text-xs">Not enough data yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
