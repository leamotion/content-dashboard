import { NextResponse } from 'next/server';

const IG_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN!;
const IG_BASE  = 'https://graph.facebook.com/v19.0';

export async function GET() {
  try {
    const pagesRes = await fetch(
      `${IG_BASE}/me/accounts?access_token=${IG_TOKEN}`,
      { next: { revalidate: 3600 } },
    );
    if (!pagesRes.ok) throw new Error('Could not fetch Facebook pages');

    const pages: { data: { id: string }[] } = await pagesRes.json();

    for (const page of pages.data ?? []) {
      const igRes = await fetch(
        `${IG_BASE}/${page.id}?fields=instagram_business_account&access_token=${IG_TOKEN}`,
        { next: { revalidate: 3600 } },
      );
      const igData = await igRes.json();

      if (igData.instagram_business_account?.id) {
        const igId     = igData.instagram_business_account.id as string;
        const fRes     = await fetch(
          `${IG_BASE}/${igId}?fields=followers_count&access_token=${IG_TOKEN}`,
          { next: { revalidate: 3600 } },
        );
        const fData    = await fRes.json();
        return NextResponse.json({
          value:  Number(fData.followers_count ?? 0),
          change: null as number | null, // historical tracking not yet active
        });
      }
    }
  } catch (err) {
    console.error('[followers]', err);
  }

  return NextResponse.json({ value: 0, change: null });
}
