import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';

function pctChange(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Number((((curr - prev) / prev) * 100).toFixed(1));
}

const ALLOWED_PLATFORMS = new Set(['all', 'instagram', 'youtube']);

export async function GET(req: NextRequest) {
  const range = Math.min(
    Math.max(Number(req.nextUrl.searchParams.get('range') ?? 30), 1),
    365,
  );
  const platform = ALLOWED_PLATFORMS.has(req.nextUrl.searchParams.get('platform') ?? '')
    ? (req.nextUrl.searchParams.get('platform') ?? 'all')
    : 'all';

  const client = await getClient();
  try {
    // Run sequentially — pg.Client is a single connection
    const currentRes = await client.query(
      `SELECT
         COALESCE(SUM(views),  0)::bigint                        AS total_views,
         COALESCE(SUM(reach),  0)::bigint                        AS total_reach,
         COALESCE(ROUND(AVG(engagement_rate)::numeric, 2), 0)    AS avg_engagement,
         COALESCE(SUM(shares), 0)::bigint                        AS total_shares,
         COALESCE(SUM(saves),  0)::bigint                        AS total_saves
       FROM content_analytics
       WHERE published_at >= NOW() - make_interval(days => $1)
         AND ($2 = 'all' OR platform = $2)`,
      [range, platform],
    );

    const prevRes = await client.query(
      `SELECT
         COALESCE(SUM(views),  0)::bigint                        AS total_views,
         COALESCE(SUM(reach),  0)::bigint                        AS total_reach,
         COALESCE(ROUND(AVG(engagement_rate)::numeric, 2), 0)    AS avg_engagement,
         COALESCE(SUM(shares), 0)::bigint                        AS total_shares,
         COALESCE(SUM(saves),  0)::bigint                        AS total_saves
       FROM content_analytics
       WHERE published_at >= NOW() - make_interval(days => $1 * 2)
         AND published_at <  NOW() - make_interval(days => $1)
         AND ($2 = 'all' OR platform = $2)`,
      [range, platform],
    );

    const sparklineRes = await client.query(
      `SELECT
         TO_CHAR(published_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')    AS day,
         COALESCE(SUM(views),    0)::bigint                        AS views,
         COALESCE(SUM(reach),    0)::bigint                        AS reach,
         COALESCE(ROUND(AVG(engagement_rate)::numeric, 4), 0)      AS engagement_rate,
         COALESCE(SUM(likes),    0)::bigint                        AS likes,
         COALESCE(SUM(comments), 0)::bigint                        AS comments,
         COALESCE(SUM(shares),   0)::bigint                        AS shares,
         COALESCE(SUM(saves),    0)::bigint                        AS saves
       FROM content_analytics
       WHERE published_at >= NOW() - make_interval(days => $1)
         AND ($2 = 'all' OR platform = $2)
       GROUP BY TO_CHAR(published_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')
       ORDER BY day ASC`,
      [range, platform],
    );

    const c = currentRes.rows[0];
    const p = prevRes.rows[0];
    const s = sparklineRes.rows;

    return NextResponse.json({
      viewers: {
        value:     Number(c.total_views),
        change:    pctChange(Number(c.total_views),    Number(p.total_views)),
        sparkline: s.map(r => ({ value: Number(r.views) })),
      },
      reach: {
        value:     Number(c.total_reach),
        change:    pctChange(Number(c.total_reach),    Number(p.total_reach)),
        sparkline: s.map(r => ({ value: Number(r.reach) })),
      },
      engagement: {
        value:     Number(c.avg_engagement),
        change:    pctChange(Number(c.avg_engagement), Number(p.avg_engagement)),
        sparkline: s.map(r => ({ value: Number(r.engagement_rate) })),
      },
      shares: {
        value:     Number(c.total_shares),
        change:    pctChange(Number(c.total_shares),   Number(p.total_shares)),
        sparkline: s.map(r => ({ value: Number(r.shares) })),
      },
      saves: {
        value:     Number(c.total_saves),
        change:    pctChange(Number(c.total_saves),    Number(p.total_saves)),
        sparkline: s.map(r => ({ value: Number(r.saves) })),
      },
      timeseries: s.map(r => ({
        day:            String(r.day).slice(0, 10),
        views:          Number(r.views),
        reach:          Number(r.reach),
        likes:          Number(r.likes),
        comments:       Number(r.comments),
        shares:         Number(r.shares),
        saves:          Number(r.saves),
        engagementRate: Number(r.engagement_rate),
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[analytics]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await client.end();
  }
}
