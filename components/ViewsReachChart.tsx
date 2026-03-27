'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

interface TimeseriesPoint {
  day:   string;
  views: number;
  reach: number;
}

interface Props {
  data:  TimeseriesPoint[];
  range: number;
}

function fmtDate(dateStr: string, range: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  if (range <= 7) {
    return d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function fmtY(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm shadow-xl">
      <p className="text-slate-400 mb-2 font-medium">{label}</p>
      {payload.map((entry: { name: string; value: number; color: string }) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-slate-300 capitalize">{entry.name}</span>
          <span className="ml-auto text-white font-semibold tabular-nums pl-4">
            {Number(entry.value).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ViewsReachChart({ data, range }: Props) {
  if (data.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-6 flex items-center justify-center h-80">
        <p className="text-slate-500 text-sm">No data for this period</p>
      </div>
    );
  }

  const tickInterval = Math.max(0, Math.floor(data.length / 7) - 1);
  const formatted    = data.map(d => ({ ...d, label: fmtDate(d.day, range) }));

  return (
    <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-6">
      <h2 className="text-white font-semibold mb-6">Views &amp; Reach</h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formatted} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="gradViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}    />
              </linearGradient>
              <linearGradient id="gradReach" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#a78bfa" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#a78bfa" stopOpacity={0}    />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

            <XAxis
              dataKey="label"
              interval={tickInterval}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              dy={8}
            />
            <YAxis
              tickFormatter={fmtY}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={48}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              wrapperStyle={{ paddingTop: '16px', fontSize: '13px', color: '#94a3b8' }}
              iconType="circle"
              iconSize={8}
            />

            {/* Reach behind Views so both remain visible */}
            <Area
              type="monotone"
              dataKey="reach"
              name="Reach"
              stroke="#a78bfa"
              strokeWidth={2}
              fill="url(#gradReach)"
              dot={false}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="views"
              name="Views"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#gradViews)"
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
