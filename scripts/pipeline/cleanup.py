"""cleanup.py — Stage 3: Claude-based OCR text cleanup.

Input:  ocr_raw.json
Output: ocr_cleaned.json  ->  [{page_number, raw_text, cleaned_text, confidence}, ...]

One API call per page, sequential. Model: claude-haiku-4-5.
"""
import argparse
import json
import os
import sys

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

from utils import client_claude, CLAUDE_MODEL

INPUT_DEFAULT  = "ocr_raw.json"
OUTPUT_DEFAULT = "ocr_cleaned.json"

SYSTEM_PROMPT = (
    "You are a Hungarian literary editor. Your task:\n"
    "1. Fix OCR errors in the input text\n"
    "2. Modernise archaic Hungarian spelling to contemporary standard\n"
    "3. Fix punctuation without altering sentence structure\n"
    "4. Preserve the original folk tale voice and rhythm\n"
    "5. Return ONLY the cleaned text. No commentary, no preamble."
)


def clean_page(raw_text: str) -> str:
    if not raw_text.strip():
        return ""
    message = client_claude.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": raw_text}],
    )
    return next((b.text for b in message.content if b.type == "text"), "").strip()


def main():
    parser = argparse.ArgumentParser(
        description="Clean OCR text with Claude (hungarian literary editor).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--input",  default=INPUT_DEFAULT,  help=f"Input JSON (default: {INPUT_DEFAULT})")
    parser.add_argument("--output", default=OUTPUT_DEFAULT, help=f"Output JSON (default: {OUTPUT_DEFAULT})")
    parser.add_argument(
        "--resume", action="store_true",
        help="Skip pages already present in output file",
    )
    args = parser.parse_args()

    if not client_claude:
        print("[!] ANTHROPIC_API_KEY not set")
        sys.exit(1)

    if not os.path.exists(args.input):
        print(f"[!] Input file not found: {args.input}")
        sys.exit(1)

    with open(args.input, encoding="utf-8") as f:
        pages = json.load(f)

    done_pages = set()
    results = []
    if args.resume and os.path.exists(args.output):
        with open(args.output, encoding="utf-8") as f:
            results = json.load(f)
        done_pages = {r["page_number"] for r in results}
        print(f"[*] Resuming — {len(done_pages)} pages already cleaned")

    for page in pages:
        pn = page["page_number"]
        if pn in done_pages:
            continue

        print(f"[*] Cleaning page {pn}/{len(pages)} …")
        cleaned = clean_page(page["raw_text"])
        results.append({
            "page_number":  pn,
            "raw_text":     page["raw_text"],
            "cleaned_text": cleaned,
            "confidence":   page["confidence"],
        })

        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(sorted(results, key=lambda r: r["page_number"]), f, ensure_ascii=False, indent=2)

    print(f"[+] ocr_cleaned.json written: {len(results)} pages -> {args.output}")


if __name__ == "__main__":
    main()
