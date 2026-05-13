"""watermark.py — Stage 6: Digital watermarking.

Input:  tales_enriched.json
Output: tales_watermarked.json  +  watermark_log.json

Two-layer watermarking per tale:
  1. Zero-width joiner (U+200D) inserted after every 37th word in full_text
  2. One randomly chosen sentence is rewritten to an unusual word order via Claude

watermark_log.json tracks:
  {tale_slug, zwj_positions, variant_sentence, original_sentence}
"""
import argparse
import json
import os
import random
import re
import sys

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

from utils import client_claude, CLAUDE_MODEL

INPUT_DEFAULT       = "tales_enriched.json"
OUTPUT_DEFAULT      = "tales_watermarked.json"
LOG_DEFAULT         = "watermark_log.json"

ZWJ = "\u200d"
ZWJ_INTERVAL = 37

REWRITE_PROMPT = (
    "Rewrite this Hungarian sentence in unusual but grammatically correct word order. "
    "Return only the rewritten sentence."
)


def insert_zwj(text: str) -> tuple[str, list[int]]:
    """Insert ZWJ after every ZWJ_INTERVAL-th word. Returns (watermarked_text, positions)."""
    words = text.split(" ")
    positions = []
    result = []
    for i, word in enumerate(words, start=1):
        if i % ZWJ_INTERVAL == 0:
            result.append(word + ZWJ)
            positions.append(i)
        else:
            result.append(word)
    return " ".join(result), positions


def pick_sentence(text: str) -> str | None:
    """Pick a random sentence of reasonable length (>= 5 words) from the text."""
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    candidates = [s.strip() for s in sentences if len(s.split()) >= 5]
    return random.choice(candidates) if candidates else None


def rewrite_sentence(sentence: str) -> str:
    message = client_claude.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=512,
        messages=[{"role": "user", "content": f"{REWRITE_PROMPT}\n\n{sentence}"}],
    )
    return next((b.text for b in message.content if b.type == "text"), sentence).strip()


def load_log(path: str) -> dict:
    """Load existing watermark log keyed by slug."""
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            entries = json.load(f)
        return {e["tale_slug"]: e for e in entries}
    return {}


def save_log(log: dict, path: str):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(list(log.values()), f, ensure_ascii=False, indent=2)


def main():
    parser = argparse.ArgumentParser(
        description="Apply digital watermarks to enriched tales.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--input",  default=INPUT_DEFAULT,  help=f"Input JSON (default: {INPUT_DEFAULT})")
    parser.add_argument("--output", default=OUTPUT_DEFAULT, help=f"Output JSON (default: {OUTPUT_DEFAULT})")
    parser.add_argument("--log",    default=LOG_DEFAULT,    help=f"Watermark log JSON (default: {LOG_DEFAULT})")
    parser.add_argument("--resume", action="store_true",    help="Skip slugs already in output file")
    args = parser.parse_args()

    if not client_claude:
        print("[!] ANTHROPIC_API_KEY not set")
        sys.exit(1)

    if not os.path.exists(args.input):
        print(f"[!] Input file not found: {args.input}")
        sys.exit(1)

    with open(args.input, encoding="utf-8") as f:
        tales = json.load(f)

    log = load_log(args.log)

    done_slugs = set()
    results = []
    if args.resume and os.path.exists(args.output):
        with open(args.output, encoding="utf-8") as f:
            results = json.load(f)
        done_slugs = {r["slug"] for r in results}
        print(f"[*] Resuming — {len(done_slugs)} tales already watermarked")

    for i, tale in enumerate(tales, start=1):
        slug = tale.get("slug", f"tale-{i}")

        if slug in done_slugs:
            print(f"  skipping (done): {slug}")
            continue

        print(f"[*] Watermarking [{i}/{len(tales)}]: {tale.get('title', slug)} …")

        full_text = tale.get("full_text", "")

        # Layer 1: ZWJ
        wm_text, positions = insert_zwj(full_text)

        # Layer 2: sentence rewrite
        original_sentence = pick_sentence(full_text)
        variant_sentence  = ""
        if original_sentence:
            try:
                variant_sentence = rewrite_sentence(original_sentence)
                print(f"  original : {original_sentence[:80]}…")
                print(f"  variant  : {variant_sentence[:80]}…")
            except Exception as e:
                print(f"  [!] Sentence rewrite failed: {e}")
                variant_sentence = original_sentence

        log[slug] = {
            "tale_slug":         slug,
            "zwj_positions":     positions,
            "original_sentence": original_sentence or "",
            "variant_sentence":  variant_sentence,
        }

        watermarked_tale = dict(tale)
        watermarked_tale["watermarked_text"] = wm_text
        results.append(watermarked_tale)

        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        save_log(log, args.log)

    print(f"[+] tales_watermarked.json written: {len(results)} tales -> {args.output}")
    print(f"[+] watermark_log.json written -> {args.log}")


if __name__ == "__main__":
    main()
