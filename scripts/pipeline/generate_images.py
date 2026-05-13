"""generate_images.py — Stage 7: Gemini Imagen illustration generation.

Input:  tales_enriched.json  (or tales_watermarked.json via --input)
Output: tales_with_images.json  — same objects with r2_key (or local_path) added

R2 mode  (default):  uploads to Cloudflare R2  illustrations/{slug}/base.png
Local mode (--local-output <dir>):  saves PNGs to <dir>/{slug}.png, skips R2.
    local_path is recorded in each tale; a later run without --local-output
    will upload any local_path files that are missing an r2_key.

Idempotent: tales that already have r2_key / local_path are skipped unless
--force is given.
"""
import argparse
import io
import json
import os
import sys
import time

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

from utils import GEMINI_API_KEY, GEMINI_IMAGE_MODEL

INPUT_DEFAULT  = "tales_enriched.json"
OUTPUT_DEFAULT = "tales_with_images.json"


# ── R2 helpers ────────────────────────────────────────────────────────────────

def get_r2_client():
    import boto3
    endpoint   = os.getenv("R2_ENDPOINT")
    access_key = os.getenv("R2_ACCESS_KEY")
    secret_key = os.getenv("R2_SECRET_KEY")
    if not all([endpoint, access_key, secret_key]):
        print("[!] R2 env vars not set (R2_ENDPOINT, R2_ACCESS_KEY, R2_SECRET_KEY)")
        sys.exit(1)
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
    )


def r2_object_exists(s3, bucket: str, key: str) -> bool:
    try:
        s3.head_object(Bucket=bucket, Key=key)
        return True
    except Exception:
        return False


def upload_to_r2(s3, bucket: str, key: str, data: bytes):
    s3.put_object(Bucket=bucket, Key=key, Body=data, ContentType="image/png")
    print(f"  [+] Uploaded to R2: {key}")


# ── Gemini Imagen ─────────────────────────────────────────────────────────────

FALLBACK_PROMPT = (
    "A classic European folk-tale book illustration. FULL BLEED vertical artwork. "
    "Vintage storybook aesthetic. 2D flat vector art with watercolor textures. "
    "Bright, luminous, cheerful, and well-lit daytime color palette. Soft, warm lighting. "
    "NO TEXT anywhere. NO frame, NO vertical lines, NO pillars, NO borders on the sides, "
    "NO margins. Ensure a seamless full-bleed image extending perfectly to the very edges."
)

# Hardcoded prompt overrides for tales that repeatedly trigger the safety filter.
# These replace the image_prompt from the JSON at generation time.
SLUG_PROMPT_OVERRIDES = {
    "az-ozike": (
        "A gentle golden fawn with soft doe eyes standing in a sun-dappled enchanted forest, "
        "surrounded by glowing fireflies and colorful wildflowers, delicate watercolor storybook "
        "illustration style, warm pastel tones, magical fairy tale atmosphere, children's book art"
    ),
    "a-szomoru-kiralkiskisasszony": (
        "A beautiful young princess in an elegant rose-gold gown standing in a blooming royal garden "
        "at golden hour, surrounded by butterflies and blossoming flowers, her long flowing hair adorned "
        "with a floral crown, classic fairy tale illustration, soft luminous lighting, painterly storybook style"
    ),
    "talados-mesek": (
        "A cheerful young traveler sitting beneath a glowing lantern at a crossroads in a whimsical "
        "moonlit forest, surrounded by floating question mark shapes made of sparkles and stars, an owl "
        "perched nearby with a knowing smile, playful storybook illustration, rich jewel tones, magical mystery atmosphere"
    ),
}


def _call_imagen(client, model_name: str, prompt: str, max_retries: int = 6):
    """Call Imagen with exponential backoff on 429 / quota errors."""
    from google.genai import types
    from google.genai.errors import ClientError

    delay = 15  # seconds — start conservatively for 10 req/min quota
    for attempt in range(1, max_retries + 1):
        try:
            return client.models.generate_images(
                model=model_name,
                prompt=prompt,
                config=types.GenerateImagesConfig(aspect_ratio="3:4", number_of_images=1),
            )
        except ClientError as e:
            if e.status_code == 429 and attempt < max_retries:
                # Extract retry-after hint from error message if present
                import re
                m = re.search(r"retry in ([\d.]+)s", str(e))
                wait = float(m.group(1)) + 5 if m else delay
                print(f"  [rate limit] 429 on attempt {attempt} — waiting {wait:.0f}s ...")
                time.sleep(wait)
                delay = min(delay * 2, 120)
            else:
                raise
    return None  # unreachable


def generate_hero_image(prompt: str, rate_delay: float = 7.0):
    """Same logic as mese_import.py generate_hero_image(). rate_delay: seconds to
    sleep after a successful call to stay under the per-minute quota."""
    from google import genai as google_genai

    client = google_genai.Client(api_key=GEMINI_API_KEY)
    model_name = (
        GEMINI_IMAGE_MODEL
        if GEMINI_IMAGE_MODEL.startswith("models/")
        else f"models/{GEMINI_IMAGE_MODEL}"
    )

    print(f"  prompt: {prompt[:100]}...")
    res = _call_imagen(client, model_name, prompt)
    time.sleep(rate_delay)  # respect quota regardless of outcome

    if res and res.generated_images:
        return res.generated_images[0]

    print("  [!] Safety filter triggered — retrying with fallback prompt ...")
    res2 = _call_imagen(client, model_name, FALLBACK_PROMPT)
    time.sleep(rate_delay)

    if res2 and res2.generated_images:
        return res2.generated_images[0]

    print("  [!] Fallback also blocked. Skipping image.")
    return None


def image_to_bytes(img) -> bytes:
    if hasattr(img, "image") and hasattr(img.image, "image_bytes"):
        return img.image.image_bytes
    buf = io.BytesIO()
    img.image.save(buf, format="PNG")
    return buf.getvalue()


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Generate Gemini Imagen illustrations (R2 or local output).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--input",        default=INPUT_DEFAULT,  help=f"Input JSON (default: {INPUT_DEFAULT})")
    parser.add_argument("--output",       default=OUTPUT_DEFAULT, help=f"Output JSON (default: {OUTPUT_DEFAULT})")
    parser.add_argument("--local-output", metavar="DIR",          help="Save PNGs locally instead of uploading to R2")
    parser.add_argument("--force",        action="store_true",    help="Re-generate even if image already exists")
    parser.add_argument("--rate-limit",   type=float, default=7.0, metavar="SEC",
                        help="Seconds to wait between Imagen calls (default: 7 — fits 10 req/min quota)")
    args = parser.parse_args()

    if not GEMINI_API_KEY:
        print("[!] GEMINI_API_KEY not set")
        sys.exit(1)

    if not os.path.exists(args.input):
        print(f"[!] Input file not found: {args.input}")
        sys.exit(1)

    local_mode = bool(args.local_output)

    # R2 setup — only required when not in local mode
    s3     = None
    bucket = None
    if not local_mode:
        bucket = os.getenv("R2_BUCKET")
        if not bucket:
            print("[!] R2_BUCKET not set. Use --local-output <dir> to save locally instead.")
            sys.exit(1)
        s3 = get_r2_client()
    else:
        os.makedirs(args.local_output, exist_ok=True)
        print(f"[*] Local mode — saving PNGs to: {os.path.abspath(args.local_output)}")

    with open(args.input, encoding="utf-8") as f:
        tales = json.load(f)

    # Load existing output for idempotency
    done_slugs = {}
    if os.path.exists(args.output) and not args.force:
        with open(args.output, encoding="utf-8") as f:
            existing = json.load(f)
        for r in existing:
            if local_mode and r.get("local_path") and os.path.exists(r["local_path"]):
                done_slugs[r["slug"]] = r
            elif not local_mode and r.get("r2_key"):
                done_slugs[r["slug"]] = r

    results = []
    for i, tale in enumerate(tales, start=1):
        slug         = tale.get("slug", f"tale-{i}")
        image_prompt = SLUG_PROMPT_OVERRIDES.get(slug) or tale.get("image_prompt", "")

        # Carry over previously completed data
        if slug in done_slugs and not args.force:
            print(f"  skipping (done): {slug}")
            merged = dict(tale)
            merged.update({k: v for k, v in done_slugs[slug].items() if k in ("r2_key", "local_path")})
            results.append(merged)
            continue

        if not image_prompt:
            print(f"  [!] No image_prompt for '{slug}' — skipping")
            tale.setdefault("r2_key", None)
            results.append(tale)
            continue

        print(f"\n[*] Generating [{i}/{len(tales)}]: {tale.get('title', slug)}")
        img = generate_hero_image(image_prompt, rate_delay=args.rate_limit)

        if img:
            data = image_to_bytes(img)

            if local_mode:
                local_path = os.path.abspath(os.path.join(args.local_output, f"{slug}.png"))
                with open(local_path, "wb") as f:
                    f.write(data)
                print(f"  [+] Saved: {local_path}")
                tale["local_path"] = local_path
                tale.setdefault("r2_key", None)
            else:
                r2_key = f"illustrations/{slug}/base.png"
                # Also upload any pending local_path files
                if tale.get("local_path") and os.path.exists(tale["local_path"]):
                    with open(tale["local_path"], "rb") as f:
                        upload_to_r2(s3, bucket, r2_key, f.read())
                else:
                    upload_to_r2(s3, bucket, r2_key, data)
                tale["r2_key"] = r2_key
        else:
            tale.setdefault("r2_key", None)
            tale.setdefault("local_path", None)

        results.append(tale)

        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)

    # Final write — fill in any tales not yet in results
    slugs_done = {r["slug"] for r in results}
    for tale in tales:
        if tale["slug"] not in slugs_done:
            results.append(tale)

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    generated = sum(1 for r in results if (r.get("local_path") or r.get("r2_key")))
    print(f"\n[+] tales_with_images.json written: {len(results)} tales, {generated} with images -> {args.output}")


if __name__ == "__main__":
    main()
