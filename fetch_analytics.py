#!/usr/bin/env python3
"""
Content Analytics Fetcher
Pulls metrics from Instagram Graph API and YouTube Data API,
then upserts into Supabase content_analytics table.
Designed to run every 6 hours via Windows Task Scheduler.
"""

import os
import sys
import logging
import requests
import psycopg2
from datetime import datetime
from dotenv import load_dotenv

# ── Config ────────────────────────────────────────────────────────────────────

load_dotenv(os.path.join(os.path.dirname(__file__), 'setup.env.txt'))

INSTAGRAM_TOKEN      = os.environ['INSTAGRAM_ACCESS_TOKEN']
INSTAGRAM_ACCOUNT_ID = os.environ.get('INSTAGRAM_BUSINESS_ACCOUNT_ID', '')
YOUTUBE_API_KEY      = os.environ['YOUTUBE_API_KEY']
YOUTUBE_CHANNEL_ID   = os.environ['YOUTUBE_CHANNEL_ID']
DATABASE_URL         = os.environ['DATABASE_URL']

IG_BASE = 'https://graph.facebook.com/v19.0'
YT_BASE = 'https://www.googleapis.com/youtube/v3'

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s  %(levelname)-8s  %(message)s',
    handlers=[
        logging.FileHandler(
            os.path.join(os.path.dirname(__file__), 'analytics_fetch.log'),
            encoding='utf-8'
        ),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger(__name__)

# ── Instagram ─────────────────────────────────────────────────────────────────

def get_ig_account_id() -> str:
    """Return the Instagram Business Account ID.
    Uses INSTAGRAM_BUSINESS_ACCOUNT_ID env var if set (fastest),
    otherwise discovers it via the page lookup."""
    if INSTAGRAM_ACCOUNT_ID:
        log.info('Using Instagram Business Account ID from env: %s', INSTAGRAM_ACCOUNT_ID)
        return INSTAGRAM_ACCOUNT_ID

    resp = requests.get(f'{IG_BASE}/me/accounts', params={'access_token': INSTAGRAM_TOKEN}, timeout=15)
    resp.raise_for_status()
    pages = resp.json().get('data', [])

    for page in pages:
        r = requests.get(
            f'{IG_BASE}/{page["id"]}',
            params={'fields': 'instagram_business_account', 'access_token': INSTAGRAM_TOKEN},
            timeout=15,
        )
        data = r.json()
        if 'instagram_business_account' in data:
            ig_id = data['instagram_business_account']['id']
            log.info('Instagram Business Account ID: %s', ig_id)
            return ig_id

    raise RuntimeError('No Instagram Business Account found linked to any Facebook Page.')


def fetch_instagram_posts() -> list[dict]:
    ig_id = get_ig_account_id()

    resp = requests.get(
        f'{IG_BASE}/{ig_id}/media',
        params={
            'fields': 'id,caption,media_type,timestamp,thumbnail_url,media_url,permalink,like_count,comments_count',
            'limit': 25,
            'access_token': INSTAGRAM_TOKEN,
        },
        timeout=15,
    )
    resp.raise_for_status()
    media_list = resp.json().get('data', [])
    log.info('Fetched %d Instagram media objects', len(media_list))

    records = []
    for media in media_list:
        media_id   = media['id']
        media_type = media.get('media_type', 'IMAGE')

        # Insights metrics vary by media type
        if media_type in ('VIDEO', 'REEL'):
            insight_metrics = 'plays,reach,saved,shares'
        else:
            insight_metrics = 'impressions,reach,saved,shares'

        ins_resp = requests.get(
            f'{IG_BASE}/{media_id}/insights',
            params={'metric': insight_metrics, 'access_token': INSTAGRAM_TOKEN},
            timeout=15,
        )
        insights: dict[str, int] = {}
        if ins_resp.ok:
            for item in ins_resp.json().get('data', []):
                val = item.get('values', [{}])[0].get('value', 0)
                insights[item['name']] = int(val) if isinstance(val, (int, float)) else 0

        views    = insights.get('plays', insights.get('impressions', 0))
        likes    = int(media.get('like_count', 0))
        comments = int(media.get('comments_count', 0))
        shares   = insights.get('shares', 0)
        saves    = insights.get('saved', 0)
        reach    = insights.get('reach', 0)

        total_interactions = likes + comments + shares + saves
        engagement_rate    = round(total_interactions / reach * 100, 4) if reach > 0 else 0.0

        caption       = (media.get('caption') or '').replace('\n', ' ').strip()
        thumbnail_url = media.get('thumbnail_url') or media.get('media_url') or media.get('permalink', '')

        records.append({
            'platform':        'instagram',
            'post_id':         media_id,
            'title':           caption[:500],
            'thumbnail_url':   thumbnail_url,
            'published_at':    media.get('timestamp'),
            'views':           views,
            'likes':           likes,
            'comments':        comments,
            'shares':          shares,
            'saves':           saves,
            'reach':           reach,
            'engagement_rate': engagement_rate,
        })

    return records


# ── YouTube ───────────────────────────────────────────────────────────────────

def fetch_youtube_videos() -> list[dict]:
    # Step 1 – get the uploads playlist ID
    ch_resp = requests.get(
        f'{YT_BASE}/channels',
        params={'part': 'contentDetails', 'id': YOUTUBE_CHANNEL_ID, 'key': YOUTUBE_API_KEY},
        timeout=15,
    )
    ch_resp.raise_for_status()
    items = ch_resp.json().get('items', [])
    if not items:
        raise RuntimeError(f'YouTube channel not found: {YOUTUBE_CHANNEL_ID}')

    uploads_playlist = items[0]['contentDetails']['relatedPlaylists']['uploads']

    # Step 2 – list 25 most recent videos from the uploads playlist
    pl_resp = requests.get(
        f'{YT_BASE}/playlistItems',
        params={
            'part':       'contentDetails',
            'playlistId': uploads_playlist,
            'maxResults': 25,
            'key':        YOUTUBE_API_KEY,
        },
        timeout=15,
    )
    pl_resp.raise_for_status()
    video_ids = [item['contentDetails']['videoId'] for item in pl_resp.json().get('items', [])]
    log.info('Fetched %d YouTube video IDs', len(video_ids))

    if not video_ids:
        return []

    # Step 3 – get snippet + statistics for all videos in one call
    stats_resp = requests.get(
        f'{YT_BASE}/videos',
        params={
            'part': 'snippet,statistics',
            'id':   ','.join(video_ids),
            'key':  YOUTUBE_API_KEY,
        },
        timeout=15,
    )
    stats_resp.raise_for_status()

    records = []
    for video in stats_resp.json().get('items', []):
        snippet = video.get('snippet', {})
        stats   = video.get('statistics', {})

        views    = int(stats.get('viewCount',    0))
        likes    = int(stats.get('likeCount',    0))
        comments = int(stats.get('commentCount', 0))

        engagement_rate = round((likes + comments) / views * 100, 4) if views > 0 else 0.0

        thumbs        = snippet.get('thumbnails', {})
        thumbnail_url = (
            thumbs.get('maxres') or thumbs.get('high') or thumbs.get('default') or {}
        ).get('url', '')

        records.append({
            'platform':        'youtube',
            'post_id':         video['id'],
            'title':           snippet.get('title', ''),
            'thumbnail_url':   thumbnail_url,
            'published_at':    snippet.get('publishedAt'),
            'views':           views,
            'likes':           likes,
            'comments':        comments,
            'shares':          0,   # not available via Data API v3
            'saves':           0,   # not available via Data API v3
            'reach':           views,
            'engagement_rate': engagement_rate,
        })

    return records


# ── Database ──────────────────────────────────────────────────────────────────

UPSERT_SQL = """
    INSERT INTO content_analytics
        (platform, post_id, title, thumbnail_url, published_at,
         views, likes, comments, shares, saves, reach, engagement_rate, updated_at)
    VALUES
        (%(platform)s, %(post_id)s, %(title)s, %(thumbnail_url)s, %(published_at)s,
         %(views)s, %(likes)s, %(comments)s, %(shares)s, %(saves)s, %(reach)s,
         %(engagement_rate)s, NOW())
    ON CONFLICT (post_id) DO UPDATE SET
        title           = EXCLUDED.title,
        thumbnail_url   = EXCLUDED.thumbnail_url,
        views           = EXCLUDED.views,
        likes           = EXCLUDED.likes,
        comments        = EXCLUDED.comments,
        shares          = EXCLUDED.shares,
        saves           = EXCLUDED.saves,
        reach           = EXCLUDED.reach,
        engagement_rate = EXCLUDED.engagement_rate,
        updated_at      = NOW()
"""

def upsert_records(records: list[dict]) -> None:
    conn = psycopg2.connect(DATABASE_URL)
    try:
        with conn:
            with conn.cursor() as cur:
                for record in records:
                    cur.execute(UPSERT_SQL, record)
        log.info('Upserted %d records into content_analytics', len(records))
    finally:
        conn.close()


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    log.info('=== Analytics fetch started ===')

    all_records: list[dict] = []

    try:
        ig_records = fetch_instagram_posts()
        log.info('Instagram: %d posts processed', len(ig_records))
        all_records.extend(ig_records)
    except Exception as exc:
        log.error('Instagram fetch failed: %s', exc)

    try:
        yt_records = fetch_youtube_videos()
        log.info('YouTube: %d videos processed', len(yt_records))
        all_records.extend(yt_records)
    except Exception as exc:
        log.error('YouTube fetch failed: %s', exc)

    if all_records:
        upsert_records(all_records)

    log.info('=== Done – %d total records upserted ===', len(all_records))


if __name__ == '__main__':
    main()
