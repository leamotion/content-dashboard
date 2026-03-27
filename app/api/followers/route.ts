import { NextResponse } from 'next/server';

const IG_TOKEN      = process.env.INSTAGRAM_ACCESS_TOKEN!;
const IG_ACCOUNT_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID!;
const IG_BASE       = 'https://graph.facebook.com/v19.0';

export async function GET() {
  try {
    const res  = await fetch(
      `${IG_BASE}/${IG_ACCOUNT_ID}?fields=followers_count&access_token=${IG_TOKEN}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) throw new Error(`Instagram API error: ${res.status}`);
    const data = await res.json();
    return NextResponse.json({
      value:  Number(data.followers_count ?? 0),
      change: null as number | null,
    });
  } catch (err) {
    console.error('[followers]', err);
    return NextResponse.json({ value: 0, change: null });
  }
}
