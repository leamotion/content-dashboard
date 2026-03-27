'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

interface TimeseriesPoint {
  day:      string;
  likes:    number;
  comments: number;
  shares:   number;
  saves:    number;
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
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
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

export function EngagementChart({ data, range }: Props) {
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
      <h2 className="text-white font-semibold mb-6">Engagement Breakdown</h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={formatted}
            margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
            barCategoryGap="30%"
            barGap={2}
          >
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
              width={40}
            />

            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />

            <Legend
              wrapperStyle={{ paddingTop: '16px', fontSize: '13px', color: '#94a3b8' }}
              iconType="circle"
              iconSize={8}
            />

            <Bar dataKey="likes"    name="Likes"    fill="#f43f5e" radius={[3, 3, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="comments" name="Comments" fill="#38bdf8" radius={[3, 3, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="shares"   name="Shares"   fill="#f59e0b" radius={[3, 3, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="saves"    name="Saves"    fill="#2dd4bf" radius={[3, 3, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
