# Mesenet.hu v3.0 OCR Pipeline

Clean-room ingestion pipeline for public domain scanned folk tale books.
Replaces URL scraping with OCR-based content extraction.

> **Legal source note:** Source material consists exclusively of public domain
> scanned books. No live website scraping is performed by this pipeline.
> See `scripts/importer/mese_import.py` for the separate URL-scraping workflow.

---

## Run order

```
ingest.py → ocr.py → cleanup.py → segment.py → enrich.py →
watermark.py → generate_images.py → publish.py
```

`palette_swap.py` and `scout.py` run independently of the main pipeline.

---

## Quick start

```bash
# 1. Install dependencies (preferably in a virtualenv)
pip install -r requirements.txt

# System dependencies (Ubuntu/Debian)
sudo apt install tesseract-ocr tesseract-ocr-hun poppler-utils

# 2. Configure environment
cp .env.example .env
# Edit .env — fill in all required keys

# 3. Run the migration against your Neon database
psql "$DATABASE_URL" -f migration.sql

# 4. Ingest pages
python ingest.py --pdf /path/to/book.pdf
# or: python ingest.py --folder /path/to/pages/
# or: python ingest.py --r2 --prefix scans/book-title/

# 5. OCR
python ocr.py --resume

# 6. Clean up OCR text
python cleanup.py --resume

# 7. Segment into individual tales
python segment.py

# 8. Enrich with Claude
python enrich.py --resume

# 9. Watermark
python watermark.py --resume

# 10. Generate illustrations
python generate_images.py

# 11. Publish
python publish.py --dry-run    # preview only
python publish.py              # publish to WP + Neon
```

---

## Scripts

| Script | Input | Output | Description |
|--------|-------|--------|-------------|
| `ingest.py` | folder / PDF / R2 | `pages.json` | Collect and number source pages |
| `ocr.py` | `pages.json` | `ocr_raw.json` | Google Vision → pytesseract fallback |
| `cleanup.py` | `ocr_raw.json` | `ocr_cleaned.json` | Claude OCR error correction |
| `segment.py` | `ocr_cleaned.json` | `tales_raw.json` | Story boundary detection |
| `enrich.py` | `tales_raw.json` | `tales_enriched.json` | Claude metadata + formatting |
| `watermark.py` | `tales_enriched.json` | `tales_watermarked.json` + `watermark_log.json` | ZWJ + sentence variant watermarks |
| `generate_images.py` | `tales_enriched.json` | `tales_with_images.json` | Gemini Imagen → R2 |
| `publish.py` | `tales_with_images.json` | `publish_log.json` | WP REST API + Neon Postgres upsert |
| `palette_swap.py` | R2 `base.png` | R2 `palette_{hash}.png` | CPU-only hue remapping |
| `scout.py` | `watermark_log.json` | `scout_hits.json` + DMCA notices | Watermark enforcement |

---

## Environment variables

### Required

| Variable | Used by | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | cleanup, segment, enrich, watermark, scout | Anthropic API key |
| `GEMINI_API_KEY` | generate_images | Google Gemini API key |
| `GEMINI_IMAGE_MODEL` | generate_images | Imagen model name (default: `imagen-3.0-generate-001`) |
| `GOOGLE_APPLICATION_CREDENTIALS` | ocr | Path to Google Cloud service account JSON |
| `R2_ENDPOINT` | ingest, generate_images, publish, palette_swap | Cloudflare R2 endpoint URL |
| `R2_ACCESS_KEY` | ingest, generate_images, publish, palette_swap | R2 access key |
| `R2_SECRET_KEY` | ingest, generate_images, publish, palette_swap | R2 secret key |
| `R2_BUCKET` | ingest, generate_images, publish, palette_swap | R2 bucket name |
| `DATABASE_URL` | publish | Neon Postgres connection string |
| `WP_BASE_URL` | enrich, publish | WordPress site URL (no trailing slash) |
| `WP_USERNAME` | publish | WordPress username |
| `WP_APP_PASSWORD` | publish | WordPress application password |

### For scout.py

| Variable | Description |
|----------|-------------|
| `GOOGLE_API_KEY` | Google API key (Custom Search enabled) |
| `GOOGLE_CSE_ID` | Programmable Search Engine ID |
| `SCOUT_OWN_DOMAIN` | Domain excluded from hit detection (default: `mesenet.hu`) |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `PIPELINE_CLAUDE_MODEL` | `claude-haiku-4-5` | Override Claude model for all pipeline steps |
| `OCR_CONFIDENCE_THRESHOLD` | `0.70` | Minimum Vision API confidence before tesseract fallback |
| `INGEST_TMP_DIR` | `/tmp/mesenet_pages` | Temp directory for PDF/R2 page images |

---

## Idempotency

Every script that writes output JSON supports `--resume` to skip already-processed
items. Re-running any step will not duplicate data:

- `ocr.py --resume` — skips pages already in `ocr_raw.json`
- `cleanup.py --resume` — skips pages already in `ocr_cleaned.json`
- `enrich.py --resume` — skips slugs already in `tales_enriched.json`
- `watermark.py --resume` — skips slugs already in `tales_watermarked.json`
- `generate_images.py` — skips tales whose `r2_key` is already set (use `--force` to regenerate)
- `publish.py --resume` — skips slugs already in `publish_log.json`

---

## Shared utilities

`utils.py` contains functions copied from `scripts/importer/mese_import.py`:

- `slugify` — transliterates Hungarian characters, returns ASCII slug
- `normalize_age_group`, `normalize_mood`, `normalize_collection`
- `build_image_prompt` — reads `scripts/importer/image_prompt.txt`
- `check_duplicate`, `get_term`, `get_tags`
- `upload_media`, `upload_to_wp`

The original `mese_import.py` is untouched and continues to work independently.

---

## Database schema

Run `migration.sql` once to create all tables:

```sql
-- tables: tales, watermark_log, scout_hits
psql "$DATABASE_URL" -f migration.sql
```

---

## Standalone utilities

### palette_swap.py

Remap dominant hue clusters of any illustration without regenerating it:

```bash
python palette_swap.py --slug harom-kiskacsa --palette "#e63946,#457b9d,#a8dadc"
# prints: illustrations/harom-kiskacsa/palette_a1b2c3d4.png
```

### scout.py

Run weekly (e.g. via cron) to detect unauthorised copies of watermarked content:

```bash
python scout.py
# HIT: https://example.com/copied-tale — DMCA notice saved.
```

DMCA notices are saved to `dmca_notices/{slug}_{date}.txt`.
