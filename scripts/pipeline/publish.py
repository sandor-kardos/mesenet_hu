"""publish.py — Stage 8: Publish tales to WordPress + Neon Postgres.

Input:  tales_with_images.json  (falls back to tales_watermarked.json if not found)
Output: publish_log.json  ->  [{slug, wp_post_id, r2_key, published_at}, ...]

For each tale:
  1. Download image bytes from R2 (if r2_key is set)
  2. Upload image to WordPress media library
  3. Upsert WordPress post (check_duplicate -> update or create)
  4. Upsert record in Neon Postgres tales table

Idempotent: existing entries are updated, not duplicated.
"""
import argparse
import json
import os
import sys
from datetime import datetime, timezone

import boto3
import psycopg2
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

from utils import (
    check_duplicate,
    upload_media,
    upload_to_wp,
)

INPUT_PRIMARY   = "tales_with_images.json"
INPUT_FALLBACK  = "tales_watermarked.json"
OUTPUT_DEFAULT  = "publish_log.json"

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS tales (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            TEXT UNIQUE NOT NULL,
    title           TEXT NOT NULL,
    full_text       TEXT,
    watermarked_text TEXT,
    ocr_confidence  FLOAT,
    wp_post_id      INT,
    status          TEXT DEFAULT 'published',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
"""

UPSERT_SQL = """
INSERT INTO tales (slug, title, full_text, watermarked_text, ocr_confidence, wp_post_id, status)
VALUES (%s, %s, %s, %s, %s, %s, 'published')
ON CONFLICT (slug) DO UPDATE SET
    title            = EXCLUDED.title,
    full_text        = EXCLUDED.full_text,
    watermarked_text = EXCLUDED.watermarked_text,
    ocr_confidence   = EXCLUDED.ocr_confidence,
    wp_post_id       = EXCLUDED.wp_post_id,
    status           = EXCLUDED.status;
"""


def get_db_conn():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("[!] DATABASE_URL not set")
        sys.exit(1)
    return psycopg2.connect(db_url)


def get_r2_client():
    endpoint   = os.getenv("R2_ENDPOINT")
    access_key = os.getenv("R2_ACCESS_KEY")
    secret_key = os.getenv("R2_SECRET_KEY")
    if not all([endpoint, access_key, secret_key]):
        return None
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
    )


def download_from_r2(s3, bucket: str, key: str) -> bytes | None:
    try:
        obj = s3.get_object(Bucket=bucket, Key=key)
        return obj["Body"].read()
    except Exception as e:
        print(f"  [!] R2 download failed ({key}): {e}")
        return None


def upsert_db(conn, tale: dict, wp_post_id: int):
    with conn.cursor() as cur:
        cur.execute(
            UPSERT_SQL,
            (
                tale.get("slug"),
                tale.get("title"),
                tale.get("full_text"),
                tale.get("watermarked_text"),
                tale.get("ocr_confidence"),
                wp_post_id,
            ),
        )
    conn.commit()


def load_publish_log(path: str) -> dict:
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            entries = json.load(f)
        return {e["slug"]: e for e in entries}
    return {}


def save_publish_log(log: dict, path: str):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(list(log.values()), f, ensure_ascii=False, indent=2)


def main():
    parser = argparse.ArgumentParser(
        description="Publish enriched tales to WordPress and Neon Postgres.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--input", default=None,
        help=f"Input JSON (default: {INPUT_PRIMARY}, fallback: {INPUT_FALLBACK})",
    )
    parser.add_argument("--output", default=OUTPUT_DEFAULT, help=f"Output log JSON (default: {OUTPUT_DEFAULT})")
    parser.add_argument("--dry-run", action="store_true",   help="Parse and validate only; do not publish")
    parser.add_argument("--resume",  action="store_true",   help="Skip slugs already in publish_log.json")
    args = parser.parse_args()

    # Resolve input file
    if args.input:
        input_path = args.input
    elif os.path.exists(INPUT_PRIMARY):
        input_path = INPUT_PRIMARY
    elif os.path.exists(INPUT_FALLBACK):
        print(f"[*] {INPUT_PRIMARY} not found — falling back to {INPUT_FALLBACK}")
        input_path = INPUT_FALLBACK
    else:
        print(f"[!] Neither {INPUT_PRIMARY} nor {INPUT_FALLBACK} found")
        sys.exit(1)

    with open(input_path, encoding="utf-8") as f:
        tales = json.load(f)

    print(f"[*] Loaded {len(tales)} tales from {input_path}")

    if args.dry_run:
        for t in tales:
            print(f"  dry-run: {t.get('slug')} — {t.get('title')}")
        print("[+] Dry run complete — nothing published")
        return

    # Init DB
    conn = get_db_conn()
    with conn.cursor() as cur:
        cur.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")
        cur.execute(CREATE_TABLE_SQL)
    conn.commit()

    # Init R2
    bucket = os.getenv("R2_BUCKET")
    s3 = get_r2_client()

    log = load_publish_log(args.output)
    done_slugs = set(log.keys()) if args.resume else set()

    for i, tale in enumerate(tales, start=1):
        slug = tale.get("slug", f"tale-{i}")

        if slug in done_slugs:
            print(f"  skipping (already published): {slug}")
            continue

        print(f"\n[*] Publishing [{i}/{len(tales)}]: {tale.get('title', slug)}")

        # 1. Get image bytes from R2
        img_bytes = None
        r2_key = tale.get("r2_key")
        if r2_key and s3 and bucket:
            img_bytes = download_from_r2(s3, bucket, r2_key)

        # 2. Upload image to WP media
        media_id = None
        if img_bytes:
            media_id = upload_media(
                img_bytes,
                slug,
                alt_text    = tale.get("seo_alt_text", ""),
                title_text  = tale.get("title", ""),
                description = tale.get("seo_description", ""),
            )

        # 3. Upsert WP post (check for existing by slug)
        existing_id = check_duplicate(slug)
        wp_post_id = upload_to_wp(tale, mid=media_id, update_id=existing_id)

        # 4. Upsert Postgres
        upsert_db(conn, tale, wp_post_id)
        print(f"  [+] DB upserted: {slug}")

        published_at = datetime.now(timezone.utc).isoformat()
        log[slug] = {
            "slug":         slug,
            "wp_post_id":   wp_post_id,
            "r2_key":       r2_key,
            "published_at": published_at,
        }
        save_publish_log(log, args.output)

    conn.close()
    print(f"\n[+] publish_log.json written: {len(log)} entries -> {args.output}")


if __name__ == "__main__":
    main()
