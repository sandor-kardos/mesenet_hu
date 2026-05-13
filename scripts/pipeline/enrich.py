"""enrich.py — Stage 5: Claude narrative enrichment.

Input:  tales_raw.json
Output: tales_enriched.json  ->  full story objects with all metadata fields

Uses the same system prompt as scripts/importer/mese_import.py (prompt.txt).
One API call per tale. Model: claude-haiku-4-5.
"""
import argparse
import json
import os
import re
import sys

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

from utils import client_claude, CLAUDE_MODEL, build_image_prompt, slugify

try:
    from json_repair import repair_json
except ImportError:
    def repair_json(x):
        return x

INPUT_DEFAULT   = "tales_raw.json"
OCR_RAW_DEFAULT = "ocr_raw.json"
OUTPUT_DEFAULT  = "tales_enriched.json"

ENFORCEMENT = (
    "KRITIKUS SZABÁLY: A szöveget SZÓRÓL SZÓRA meg kell tartani. "
    "TILOS összefoglalni, rövidíteni, vagy bármilyen mondatot kihagyni. "
    "Csak a Synchron-Súgó emoji dialógus formázást add hozzá. "
    "A JSON content mezőjében az ÖSSZES bekezdés szerepeljen <p> tagekben. "
    "Ha a forrásszövegben 20 bekezdés van, a content-ben is 20 <p> tag legyen."
)


def load_prompt() -> str:
    prompt_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "..", "importer", "prompt.txt",
    )
    with open(prompt_path, "r", encoding="utf-8") as f:
        return f.read()


def parse_claude_response(text: str) -> dict:
    json_match = re.search(r"\{.*\}", text, re.DOTALL)
    text = json_match.group(0) if json_match else text.replace("```json", "").replace("```", "").strip()
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return json.loads(repair_json(text))


def enrich_tale(tale: dict, system_prompt: str) -> dict:
    raw_text = tale.get("full_text", "")
    message = client_claude.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=32000,
        system=system_prompt,
        messages=[{
            "role": "user",
            "content": f"{ENFORCEMENT}\n\nForrásszöveg (minden szót meg kell tartani):\n\n{raw_text}",
        }],
    )
    result_text = next((b.text for b in message.content if b.type == "text"), "")
    if not result_text:
        raise ValueError("No text returned from Claude.")

    data = parse_claude_response(result_text)
    data["image_prompt"] = build_image_prompt(data.get("scene_description"), data.get("title"))

    # Preserve pipeline-specific fields
    data.setdefault("slug", tale.get("slug") or slugify(data.get("title", "mese")))
    data["full_text"]   = raw_text
    data["page_start"]  = tale.get("page_start")
    data["page_end"]    = tale.get("page_end")
    return data


def compute_ocr_confidence(tale: dict, ocr_by_page: dict) -> float | None:
    start = tale.get("page_start")
    end   = tale.get("page_end")
    if start is None or end is None or not ocr_by_page:
        return None
    confs = [ocr_by_page[p] for p in range(start, end + 1) if p in ocr_by_page]
    return round(sum(confs) / len(confs), 4) if confs else None


def main():
    parser = argparse.ArgumentParser(
        description="Enrich segmented tales with Claude (narrative + metadata).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--input",   default=INPUT_DEFAULT,   help=f"Input JSON (default: {INPUT_DEFAULT})")
    parser.add_argument("--ocr-raw", default=OCR_RAW_DEFAULT, help=f"OCR confidence source (default: {OCR_RAW_DEFAULT})")
    parser.add_argument("--output",  default=OUTPUT_DEFAULT,  help=f"Output JSON (default: {OUTPUT_DEFAULT})")
    parser.add_argument("--resume",  action="store_true",     help="Skip slugs already in output file")
    args = parser.parse_args()

    if not client_claude:
        print("[!] ANTHROPIC_API_KEY not set")
        sys.exit(1)

    if not os.path.exists(args.input):
        print(f"[!] Input file not found: {args.input}")
        sys.exit(1)

    system_prompt = load_prompt()

    with open(args.input, encoding="utf-8") as f:
        tales = json.load(f)

    # Load OCR confidence data if available
    ocr_by_page = {}
    if os.path.exists(args.ocr_raw):
        with open(args.ocr_raw, encoding="utf-8") as f:
            for item in json.load(f):
                ocr_by_page[item["page_number"]] = item["confidence"]

    REQUIRED_FIELDS = {"mood", "age_group", "reading_time", "hero_image", "question_1"}

    done_slugs = set()
    results = []
    if args.resume and os.path.exists(args.output):
        with open(args.output, encoding="utf-8") as f:
            loaded = json.load(f)
        # Keep only complete entries; re-queue incomplete ones
        for r in loaded:
            missing = [k for k in REQUIRED_FIELDS if not r.get(k)]
            if missing:
                print(f"  [!] Incomplete entry '{r['slug']}' (missing: {missing}) — will re-enrich")
            else:
                results.append(r)
                done_slugs.add(r["slug"])
        print(f"[*] Resuming — {len(done_slugs)} complete, {len(loaded)-len(done_slugs)} will be retried")

    for i, tale in enumerate(tales, start=1):
        slug = tale.get("slug") or slugify(tale.get("title", f"tale-{i}"))
        if slug in done_slugs:
            print(f"  skipping (done): {slug}")
            continue

        print(f"[*] Enriching [{i}/{len(tales)}]: {tale.get('title', slug)} …")
        try:
            enriched = enrich_tale(tale, system_prompt)
        except Exception as e:
            print(f"[!] Failed to enrich '{slug}': {e}")
            continue

        enriched["ocr_confidence"] = compute_ocr_confidence(tale, ocr_by_page)
        results.append(enriched)

        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"[+] tales_enriched.json written: {len(results)} tales -> {args.output}")


if __name__ == "__main__":
    main()
