-- Run this once in Supabase SQL Editor to create the content_analytics table

CREATE TABLE IF NOT EXISTS content_analytics (
    id              BIGSERIAL       PRIMARY KEY,
    platform        TEXT            NOT NULL,
    post_id         TEXT            NOT NULL UNIQUE,
    title           TEXT,
    thumbnail_url   TEXT,
    published_at    TIMESTAMPTZ,
    views           BIGINT          DEFAULT 0,
    likes           BIGINT          DEFAULT 0,
    comments        BIGINT          DEFAULT 0,
    shares          BIGINT          DEFAULT 0,
    saves           BIGINT          DEFAULT 0,
    reach           BIGINT          DEFAULT 0,
    engagement_rate NUMERIC(8, 4)   DEFAULT 0,
    updated_at      TIMESTAMPTZ     DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ca_platform     ON content_analytics (platform);
CREATE INDEX IF NOT EXISTS idx_ca_published_at ON content_analytics (published_at DESC);
