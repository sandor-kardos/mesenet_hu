-- migration.sql
-- Mesenet.hu OCR Pipeline — Neon Postgres schema
-- Run once against the DATABASE_URL Neon instance.

-- Required extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────
-- Core tales table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tales (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    slug             TEXT        UNIQUE NOT NULL,
    title            TEXT        NOT NULL,
    full_text        TEXT,
    watermarked_text TEXT,
    ocr_confidence   FLOAT,
    wp_post_id       INT,
    status           TEXT        NOT NULL DEFAULT 'published',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- Watermark audit log
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS watermark_log (
    id                BIGSERIAL   PRIMARY KEY,
    tale_slug         TEXT        NOT NULL REFERENCES tales(slug) ON DELETE CASCADE,
    zwj_positions     INT[]       NOT NULL DEFAULT '{}',
    original_sentence TEXT,
    variant_sentence  TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- Scout / DMCA hits
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scout_hits (
    id            BIGSERIAL   PRIMARY KEY,
    tale_slug     TEXT        NOT NULL,
    url           TEXT        NOT NULL,
    matched_text  TEXT,
    page_title    TEXT,
    detected_at   DATE        NOT NULL DEFAULT CURRENT_DATE,
    UNIQUE (tale_slug, url)
);

-- ─────────────────────────────────────────────
-- Indices
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS tales_status_idx    ON tales (status);
CREATE INDEX IF NOT EXISTS tales_created_idx   ON tales (created_at DESC);
CREATE INDEX IF NOT EXISTS scout_slug_idx      ON scout_hits (tale_slug);
