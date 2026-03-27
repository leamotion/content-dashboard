'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Post {
  post_id:         string;
  platform:        'instagram' | 'youtube';
  title:           string;
  thumbnail_url:   string | null;
  published_at:    string;
  views:           number;
  likes:           number;
  comments:        number;
  shares:          number;
  saves:           number;
  reach:           number;
  engagement_rate: number;
}

type SortKey = 'views' | 'likes' | 'shares' | 'engagement_rate';

interface Props { range: number; platform: string }

// ── Helpers ───────────────────────────────────────────────────────────────────

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'views',           label: 'Views'           },
  { value: 'likes',           label: 'Likes'           },
  { value: 'shares',          label: 'Shares'          },
  { value: 'engagement_rate', label: 'Engagement Rate' },
];

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PlatformBadge({ platform }: { platform: Post['platform'] }) {
  if (platform === 'instagram') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white shrink-0">
        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
        </svg>
        Instagram
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-600 text-white shrink-0">
      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
      </svg>
      YouTube
    </span>
  );
}

function Thumbnail({ url, title, platform }: { url: string | null; title: string; platform: Post['platform'] }) {
  const placeholderBg = platform === 'instagram'
    ? 'bg-gradient-to-br from-purple-600 to-pink-600'
    : 'bg-gradient-to-br from-red-700 to-red-500';

  if (!url) {
    return (
      <div className={`w-14 h-14 rounded-lg ${placeholderBg} flex items-center justify-center shrink-0`}>
        <span className="text-white/60 text-xs font-bold">
          {platform === 'instagram' ? 'IG' : 'YT'}
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-slate-700">
      <Image
        src={url}
        alt={title}
        fill
        sizes="56px"
        className="object-cover"
        unoptimized
      />
    </div>
  );
}

function MetricCell({ value, label, highlight }: { value: string; label: string; highlight?: boolean }) {
  return (
    <div className="text-center min-w-[64px]">
      <p className={`tabular-nums font-semibold text-sm ${highlight ? 'text-indigo-400' : 'text-white'}`}>
        {value}
      </p>
      <p className="text-slate-500 text-[11px] mt-0.5">{label}</p>
    </div>
  );
}

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-3 animate-pulse">
      <div className="w-14 h-14 rounded-lg bg-slate-700 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-slate-700 rounded w-3/4" />
        <div className="h-3 bg-slate-700 rounded w-1/3" />
      </div>
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="hidden sm:block w-14 h-8 bg-slate-700 rounded" />
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function TopPosts({ range, platform }: Props) {
  const [posts,   setPosts]   = useState<Post[]>([]);
  const [sortBy,  setSortBy]  = useState<SortKey>('views');
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetchPosts = useCallback(async (r: number, s: SortKey, p: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/posts?range=${r}&sort=${s}&platform=${p}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setPosts(await res.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPosts(range, sortBy, platform); }, [range, sortBy, platform, fetchPosts]);

  const sortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? 'Views';

  return (
    <div className="bg-slate-800 border border-slate-700/50 rounded-2xl overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-5 border-b border-slate-700/50">
        <div>
          <h2 className="text-white font-semibold">Top Performing Posts</h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Last {range} days · sorted by {sortLabel.toLowerCase()}
          </p>
        </div>

        {/* Sort dropdown */}
        <div className="relative self-start sm:self-auto">
          <label className="sr-only">Sort by</label>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortKey)}
            className="appearance-none bg-slate-700 border border-slate-600 text-white text-sm font-medium rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer hover:bg-slate-600 transition-colors"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {/* Chevron icon */}
          <svg
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"
            viewBox="0 0 20 20" fill="currentColor"
          >
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </div>
      </div>

      {/* ── Column headers (desktop) ─────────────────────────────────────────── */}
      <div className="hidden sm:flex items-center gap-4 px-5 py-2.5 bg-slate-900/40 border-b border-slate-700/30 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        <div className="w-14 shrink-0" />
        <div className="flex-1">Post</div>
        <div className="min-w-[64px] text-center">Views</div>
        <div className="min-w-[64px] text-center">Likes</div>
        <div className="min-w-[64px] text-center">Shares</div>
        <div className="min-w-[64px] text-center">Eng Rate</div>
      </div>

      {/* ── Error ────────────────────────────────────────────────────────────── */}
      {error && (
        <div className="px-5 py-4 text-red-400 text-sm">{error}</div>
      )}

      {/* ── Rows ─────────────────────────────────────────────────────────────── */}
      <div className="divide-y divide-slate-700/30">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
          : posts.length === 0
            ? (
              <div className="px-5 py-12 text-center text-slate-500 text-sm">
                No posts found for this period.
              </div>
            )
            : posts.map((post, idx) => (
              <div
                key={post.post_id}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-700/30 transition-colors group"
              >
                {/* Rank */}
                <span className="hidden lg:block w-5 text-center text-slate-600 text-xs font-semibold shrink-0">
                  {idx + 1}
                </span>

                {/* Thumbnail */}
                <Thumbnail
                  url={post.thumbnail_url}
                  title={post.title}
                  platform={post.platform}
                />

                {/* Title + meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <PlatformBadge platform={post.platform} />
                    <span className="text-slate-400 text-xs">{fmtDate(post.published_at)}</span>
                  </div>
                  <p className="text-white text-sm font-medium leading-snug line-clamp-2 group-hover:text-indigo-300 transition-colors">
                    {post.title || <span className="text-slate-500 italic">No caption</span>}
                  </p>
                </div>

                {/* Metrics */}
                <div className="hidden sm:flex items-center gap-1">
                  <MetricCell
                    value={fmtNum(post.views)}
                    label="Views"
                    highlight={sortBy === 'views'}
                  />
                  <MetricCell
                    value={fmtNum(post.likes)}
                    label="Likes"
                    highlight={sortBy === 'likes'}
                  />
                  <MetricCell
                    value={fmtNum(post.shares)}
                    label="Shares"
                    highlight={sortBy === 'shares'}
                  />
                  <MetricCell
                    value={`${Number(post.engagement_rate).toFixed(1)}%`}
                    label="Eng Rate"
                    highlight={sortBy === 'engagement_rate'}
                  />
                </div>

                {/* Mobile: single highlight metric */}
                <div className="sm:hidden text-right">
                  <p className="text-indigo-400 font-semibold text-sm tabular-nums">
                    {sortBy === 'engagement_rate'
                      ? `${Number(post.engagement_rate).toFixed(1)}%`
                      : fmtNum(Number((post as unknown as Record<string, number>)[sortBy]))}
                  </p>
                  <p className="text-slate-500 text-[11px]">{sortLabel}</p>
                </div>
              </div>
            ))
        }
      </div>
    </div>
  );
}
