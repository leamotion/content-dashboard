import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';

const ALLOWED_SORTS: Record<string, string> = {
  views:           'views',
  likes:           'likes',
  shares:          'shares',
  engagement_rate: 'engagement_rate',
};

const ALLOWED_PLATFORMS = new Set(['all', 'instagram', 'youtube']);

export async function GET(req: NextRequest) {
  const range = Math.min(
    Math.max(Number(req.nextUrl.searchParams.get('range') ?? 30), 1),
    365,
  );
  const sortKey  = req.nextUrl.searchParams.get('sort') ?? 'views';
  const col      = ALLOWED_SORTS[sortKey] ?? 'views';
  const platform = ALLOWED_PLATFORMS.has(req.nextUrl.searchParams.get('platform') ?? '')
    ? (req.nextUrl.searchParams.get('platform') ?? 'all')
    : 'all';

  const client = await getClient();
  try {
    const res = await client.query(
      `SELECT
         post_id,
         platform,
         title,
         thumbnail_url,
         published_at,
         views,
         likes,
         comments,
         shares,
         saves,
         reach,
         engagement_rate
       FROM content_analytics
       WHERE published_at >= NOW() - make_interval(days => $1)
         AND ($2 = 'all' OR platform = $2)
       ORDER BY ${col} DESC NULLS LAST
       LIMIT 25`,
      [range, platform],
    );
    return NextResponse.json(res.rows);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[posts]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await client.end();
  }
}
