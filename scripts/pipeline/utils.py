"""Shared utilities for the Mesenet OCR pipeline.

Copied from scripts/importer/mese_import.py to avoid cross-folder imports.
All secrets read from scripts/pipeline/.env (or environment).
"""
import io
import json
import os
import re
import sys

import anthropic
import requests
from dotenv import load_dotenv

try:
    from json_repair import repair_json
except ImportError:
    def repair_json(x):
        return x

ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(ENV_PATH)

ANTHROPIC_API_KEY  = os.getenv("ANTHROPIC_API_KEY")
GEMINI_API_KEY     = os.getenv("GEMINI_API_KEY")
GEMINI_IMAGE_MODEL = os.getenv("GEMINI_IMAGE_MODEL", "imagen-3.0-generate-001")
WP_BASE_URL        = os.getenv("WP_BASE_URL", "").rstrip("/")
WP_USERNAME        = os.getenv("WP_USERNAME")
WP_APP_PASSWORD    = os.getenv("WP_APP_PASSWORD")
CLAUDE_MODEL       = os.getenv("PIPELINE_CLAUDE_MODEL", "claude-haiku-4-5")

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

client_claude = (
    anthropic.Anthropic(api_key=ANTHROPIC_API_KEY, timeout=600.0)
    if ANTHROPIC_API_KEY
    else None
)


def slugify(t: str) -> str:
    """Lowercase, hyphen-separated, ASCII slug. Transliterates Hungarian chars."""
    t = t.lower()
    t = t.translate(str.maketrans("áéíóöőúüű", "aeiooouuu"))
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")


def normalize_age_group(val) -> str:
    if not val:
        return "4-6"
    val = str(val).strip()
    if val in ("0-3", "4-6", "7+"):
        return val
    m = re.match(r"(\d+)", val)
    if m:
        n = int(m.group(1))
        if n <= 3:
            return "0-3"
        if n <= 6:
            return "4-6"
        return "7+"
    return "4-6"


def normalize_mood(val) -> str:
    if not val:
        return "Könnyed"
    val = str(val).strip()
    if val in ("Könnyed", "Kalandos", "Komoly"):
        return val
    v = val.lower()
    if any(k in v for k in ("kaland", "izgalm", "action", "adventure")):
        return "Kalandos"
    if any(k in v for k in ("komoly", "serious", "tanulság", "mély")):
        return "Komoly"
    return "Könnyed"


def normalize_collection(val) -> str:
    if not val:
        return "Modern Mese"
    val = str(val).strip()
    valid = ["Benedek Elek", "Grimm", "La Fontaine", "Magyar Népmese", "Modern Mese"]
    if val in valid:
        return val
    v = val.lower()
    if "benedek" in v:
        return "Benedek Elek"
    if "grimm" in v:
        return "Grimm"
    if "fontaine" in v:
        return "La Fontaine"
    if "népmese" in v or "nepmese" in v:
        return "Magyar Népmese"
    return "Modern Mese"


def build_image_prompt(scene: str, title: str) -> str:
    prompt_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "..", "importer", "image_prompt.txt",
    )
    try:
        with open(prompt_path, "r", encoding="utf-8") as f:
            base_prompt = f.read()
    except FileNotFoundError:
        base_prompt = "A classic European folk-tale book illustration. SCENE: {scene}"
    scene_text = (scene if scene else title) or "A fairy-tale countryside scene"
    return base_prompt.replace("{scene}", scene_text)


def check_duplicate(slug: str):
    """Return existing WP post id if slug already exists, else None."""
    try:
        r = requests.get(
            f"{WP_BASE_URL}/wp-json/wp/v2/mese?slug={slug}",
            auth=(WP_USERNAME, WP_APP_PASSWORD),
            timeout=15,
        )
        if r.status_code == 200 and r.json():
            return r.json()[0]["id"]
    except Exception as e:
        print(f"[!] check_duplicate error: {e}")
    return None


def get_term(tax: str, val: str, auto_create: bool = False):
    if not val:
        return None
    try:
        auth = (WP_USERNAME, WP_APP_PASSWORD)
        r = requests.get(
            f"{WP_BASE_URL}/wp-json/wp/v2/{tax}?search={val}",
            auth=auth, timeout=15,
        )
        if r.status_code == 200 and r.json():
            return r.json()[0]["id"]
        if auto_create:
            r2 = requests.post(
                f"{WP_BASE_URL}/wp-json/wp/v2/{tax}",
                json={"name": val}, auth=auth, timeout=15,
            )
            if r2.status_code in (200, 201):
                print(f"[+] Created new {tax} term: '{val}'")
                return r2.json()["id"]
    except Exception as e:
        print(f"[!] Term lookup failed ({tax}={val}): {e}")
    return None


def get_tags(tags: list) -> list:
    ids = []
    auth = (WP_USERNAME, WP_APP_PASSWORD)
    for t in tags:
        try:
            r = requests.get(
                f"{WP_BASE_URL}/wp-json/wp/v2/story_tag?search={t}",
                auth=auth, timeout=15,
            )
            if r.json():
                ids.append(r.json()[0]["id"])
            else:
                r = requests.post(
                    f"{WP_BASE_URL}/wp-json/wp/v2/story_tag",
                    json={"name": t}, auth=auth, timeout=15,
                )
                ids.append(r.json()["id"])
        except Exception:
            pass
    return ids


# --- image optimisation -------------------------------------------------------
IMG_MAX_SIDE = 1200      # longest side in px; story illustrations are 3:4 (896x1200)
IMG_WEBP_QUALITY = 85


IMG_WM_PAYLOAD = b"mesenet1"      # 8 bytes hidden in every image (invisible watermark)
IMG_WM_METHOD = "dwtDctSvd"
IMG_WM_SCALES = [0, 120, 120]     # tuned: survives WebP q85 on 8/8 test illustrations, ~32 dB PSNR, not visible


def _embed_invisible_watermark(im):
    """Frequency-domain watermark (survives WebP re-encoding, unlike LSB). Returns a PIL image."""
    import cv2
    import numpy as np
    from imwatermark import WatermarkEncoder

    enc = WatermarkEncoder()
    enc.set_watermark("bytes", IMG_WM_PAYLOAD)
    bgr = cv2.cvtColor(np.array(im.convert("RGB")), cv2.COLOR_RGB2BGR)
    out = enc.encode(bgr, IMG_WM_METHOD, scales=IMG_WM_SCALES)
    from PIL import Image
    return Image.fromarray(cv2.cvtColor(out, cv2.COLOR_BGR2RGB))


def read_invisible_watermark(raw: bytes) -> bytes:
    """Decode the hidden payload from image bytes (for verification / proving ownership)."""
    import cv2
    import numpy as np
    from imwatermark import WatermarkDecoder
    from PIL import Image

    im = Image.open(io.BytesIO(raw)).convert("RGB")
    bgr = cv2.cvtColor(np.array(im), cv2.COLOR_RGB2BGR)
    return WatermarkDecoder("bytes", len(IMG_WM_PAYLOAD) * 8).decode(bgr, IMG_WM_METHOD, scales=IMG_WM_SCALES)


def optimize_image(raw: bytes, max_side: int = IMG_MAX_SIDE, quality: int = IMG_WEBP_QUALITY,
                   watermark: bool = True) -> bytes:
    """Downscale (never upscale), embed the invisible watermark, re-encode as WebP.

    The watermark is embedded after resizing and before WebP encoding, then verified on the
    encoded bytes. If it cannot be embedded or verified a warning is printed, the image is still returned.
    """
    from PIL import Image

    with Image.open(io.BytesIO(raw)) as im:
        im.load()
        if im.mode not in ("RGB", "RGBA"):
            im = im.convert("RGBA" if "A" in im.getbands() else "RGB")
        if max(im.size) > max_side:
            im = im.resize(
                (round(im.width * max_side / max(im.size)), round(im.height * max_side / max(im.size))),
                Image.LANCZOS,
            )
        if watermark:
            try:
                im = _embed_invisible_watermark(im)
            except Exception as e:
                print(f"[!] Invisible watermark not embedded ({e}) — pip install invisible-watermark")
                watermark = False
        out = io.BytesIO()
        im.save(out, format="WEBP", quality=quality, method=6)
        data = out.getvalue()

    if watermark:
        try:
            if read_invisible_watermark(data) != IMG_WM_PAYLOAD:
                print("[!] Invisible watermark did NOT survive WebP encoding for this image")
        except Exception as e:
            print(f"[!] Invisible watermark verification failed: {e}")
    return data


def upload_media(img, slug: str, alt_text: str = "", title_text: str = "", description: str = ""):
    """Upload image to WP media.

    img: raw bytes/bytearray OR a Gemini generated-image object.
    """
    if img is None:
        print("[!] No image — skipping media upload.")
        return None

    print("[*] Uploading image to WordPress...")
    try:
        if isinstance(img, (bytes, bytearray)):
            b = bytes(img)
        elif hasattr(img, "image") and hasattr(img.image, "image_bytes"):
            b = img.image.image_bytes
        else:
            buf = io.BytesIO()
            img.image.save(buf, format="PNG")
            b = buf.getvalue()

        ext, mime = "png", "image/png"
        try:
            optimized = optimize_image(b)
            print(f"[+] Image optimised: {len(b)//1024} KB -> {len(optimized)//1024} KB (WebP)")
            b, ext, mime = optimized, "webp", "image/webp"
        except Exception as e:
            print(f"[!] Image optimisation failed ({e}); uploading original")

        r = requests.post(
            f"{WP_BASE_URL}/wp-json/wp/v2/media",
            data=b,
            auth=(WP_USERNAME, WP_APP_PASSWORD),
            headers={
                "Content-Disposition": f"attachment; filename={slug}.{ext}",
                "Content-Type": mime,
            },
            timeout=60,
        )
        r.raise_for_status()
        media_id = r.json()["id"]
        print(f"[+] Image uploaded — ID: {media_id}")

        meta = {}
        if alt_text:    meta["alt_text"]    = alt_text
        if title_text:  meta["title"]       = title_text
        if description: meta["description"] = description

        if meta:
            requests.post(
                f"{WP_BASE_URL}/wp-json/wp/v2/media/{media_id}",
                json=meta,
                auth=(WP_USERNAME, WP_APP_PASSWORD),
                timeout=15,
            )
            print("[+] Image meta updated (alt, title, description)")

        return media_id

    except Exception as e:
        print(f"[!] Upload Error: {e}")
        return None


def upload_to_wp(data: dict, mid=None, update_id=None, source_url=None) -> int:
    print("[*] CMS Layer Synchronization...")
    content = f"<div class='mese-body'>{data.get('content')}</div>"
    if data.get("focal_point"):
        content += (
            f"\n<div id='mese-focal-point' style='display: none;'>"
            f"{data['focal_point']}</div>"
        )
    if data.get("image_prompt"):
        content += (
            f"\n<div id='mese-hidden-image-prompt' style='display: none;'>"
            f"{data['image_prompt']}</div>"
        )

    payload = {
        "title":   data.get("title"),
        "slug":    data.get("slug"),
        "content": content,
        "status":  data.get("status", "publish"),
        "acf": {
            "hero_image":      data.get("hero_image"),
            "reading_time":    data.get("reading_time"),
            "question_1":      data.get("question_1"),
            "question_2":      data.get("question_2"),
            "question_3":      data.get("question_3"),
            "seo_alt_text":    data.get("seo_alt_text"),
            "seo_title":       data.get("seo_title"),
            "seo_description": data.get("seo_description"),
            "source_url":      source_url,
        },
    }

    if mid:
        payload["featured_media"] = mid

    age  = get_term("age_group",  normalize_age_group(data.get("age_group")),   auto_create=True)
    mood = get_term("mood",       normalize_mood(data.get("mood")),              auto_create=True)
    coll = get_term("collection", normalize_collection(data.get("collection")), auto_create=True)
    tags = get_tags(data.get("tags", []))

    if age:  payload["age_group"]  = [age]
    if mood: payload["mood"]       = [mood]
    if coll: payload["collection"] = [coll]
    if tags: payload["story_tag"]  = tags

    url = f"{WP_BASE_URL}/wp-json/wp/v2/mese"
    if update_id:
        url = f"{url}/{update_id}"
        print(f"[*] Updating existing story ID: {update_id}")

    r = requests.post(url, json=payload, auth=(WP_USERNAME, WP_APP_PASSWORD), timeout=30)
    r.raise_for_status()
    post_id = r.json()["id"]
    print(f"[+] Draft saved: {WP_BASE_URL}/wp-admin/post.php?post={post_id}&action=edit")
    return post_id
