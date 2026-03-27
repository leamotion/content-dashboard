'use client';

import { useState, useEffect, useCallback } from 'react';
import { KPICard }           from './KPICard';
import { ViewsReachChart }   from './ViewsReachChart';
import { EngagementChart }   from './EngagementChart';
import { TopPosts }          from './TopPosts';

// ── Types ─────────────────────────────────────────────────────────────────────

type Range    = 7 | 14 | 30 | 90;
type Platform = 'all' | 'instagram' | 'youtube';

interface KPI {
  value:     number;
  change:    number | null;
  sparkline: { value: number }[];
}

interface TimeseriesPoint {
  day:            string;
  views:          number;
  reach:          number;
  likes:          number;
  comments:       number;
  shares:         number;
  saves:          number;
  engagementRate: number;
}

interface AnalyticsData {
  viewers:    KPI;
  reach:      KPI;
  engagement: KPI;
  shares:     KPI;
  saves:      KPI;
  timeseries: TimeseriesPoint[];
}

interface FollowersData {
  value:  number;
  change: number | null;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-5 h-44 flex flex-col gap-4 animate-pulse">
      <div className="h-3 w-24 bg-slate-700 rounded" />
      <div className="h-8 w-28 bg-slate-700 rounded" />
      <div className="h-3 w-16 bg-slate-700 rounded" />
      <div className="h-14 bg-slate-700/50 rounded-lg" />
    </div>
  );
}

// ── Control button ────────────────────────────────────────────────────────────

function Btn({
  active, onClick, children, activeClass,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  activeClass?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
        active
          ? (activeClass ?? 'bg-indigo-600 text-white shadow')
          : 'text-slate-400 hover:text-white hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function Dashboard() {
  const [range,     setRange]     = useState<Range>(30);
  const [platform,  setPlatform]  = useState<Platform>('all');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [followers, setFollowers] = useState<FollowersData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const fetchData = useCallback(async (r: Range, p: Platform) => {
    setLoading(true);
    setError(null);
    try {
      const [analyticsRes, followersRes] = await Promise.all([
        fetch(`/api/analytics?range=${r}&platform=${p}`),
        fetch('/api/followers'),
      ]);
      if (!analyticsRes.ok) throw new Error(`Analytics error: ${analyticsRes.status}`);

      const [a, f]: [AnalyticsData, FollowersData] = await Promise.all([
        analyticsRes.json(),
        followersRes.ok ? followersRes.json() : { value: 0, change: null },
      ]);

      setAnalytics(a);
      setFollowers(f);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(range, platform); }, [range, platform, fetchData]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-[1600px] mx-auto px-6 py-10">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Content Analytics</h1>
            <p className="text-slate-400 text-sm mt-1">
              Instagram &amp; YouTube · refreshed every 6 hours
            </p>
          </div>

          {/* Controls: platform filter + range selector */}
          <div className="flex flex-wrap items-center gap-2 self-start">

            {/* Platform filter */}
            <div className="flex bg-slate-800 border border-slate-700 rounded-xl p-1 gap-1">
              <Btn
                active={platform === 'all'}
                onClick={() => setPlatform('all')}
              >
                All
              </Btn>
              <Btn
                active={platform === 'instagram'}
                onClick={() => setPlatform('instagram')}
                activeClass="bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow"
              >
                <span className="flex items-center gap-1.5">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                  Instagram
                </span>
              </Btn>
              <Btn
                active={platform === 'youtube'}
                onClick={() => setPlatform('youtube')}
                activeClass="bg-red-600 text-white shadow"
              >
                <span className="flex items-center gap-1.5">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
                  </svg>
                  YouTube
                </span>
              </Btn>
            </div>

            {/* Range selector */}
            <div className="flex bg-slate-800 border border-slate-700 rounded-xl p-1 gap-1">
              {([7, 14, 30, 90] as Range[]).map(r => (
                <Btn key={r} active={range === r} onClick={() => setRange(r)}>
                  {r}d
                </Btn>
              ))}
            </div>

          </div>
        </div>

        {/* ── Error ─────────────────────────────────────────────────────────── */}
        {error && (
          <div className="mb-6 px-4 py-3 bg-red-900/30 border border-red-700/60 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* ── KPI Grid ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {loading || !analytics ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <KPICard
                label="Unique Viewers"
                value={analytics.viewers.value}
                change={analytics.viewers.change}
                sparkline={analytics.viewers.sparkline}
              />
              <KPICard
                label="Reach"
                value={analytics.reach.value}
                change={analytics.reach.change}
                sparkline={analytics.reach.sparkline}
              />
              <KPICard
                label="Engagement Rate"
                value={analytics.engagement.value}
                change={analytics.engagement.change}
                sparkline={analytics.engagement.sparkline}
                format="percent"
              />
              <KPICard
                label="Followers"
                value={followers?.value ?? 0}
                change={followers?.change ?? null}
                sparkline={[]}
              />
              <KPICard
                label="Shares"
                value={analytics.shares.value}
                change={analytics.shares.change}
                sparkline={analytics.shares.sparkline}
              />
              <KPICard
                label="Saves"
                value={analytics.saves.value}
                change={analytics.saves.change}
                sparkline={analytics.saves.sparkline}
              />
            </>
          )}
        </div>

        {/* ── Charts ────────────────────────────────────────────────────────── */}
        {!loading && analytics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <ViewsReachChart data={analytics.timeseries} range={range} />
            <EngagementChart data={analytics.timeseries} range={range} />
          </div>
        )}
        {loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            {[0, 1].map(i => (
              <div
                key={i}
                className="bg-slate-800 border border-slate-700/50 rounded-2xl h-80 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* ── Top Posts ─────────────────────────────────────────────────────── */}
        <div className="mt-4">
          <TopPosts range={range} platform={platform} />
        </div>

      </div>
    </div>
  );
}
