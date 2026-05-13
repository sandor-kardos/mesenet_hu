"""segment.py — Stage 4: Story boundary detection.

Input:  ocr_cleaned.json
Output: tales_raw.json  ->  [{title, slug, page_start, page_end, full_text}, ...]

Strategy:
  Pass 1 — Send full corpus to Claude asking ONLY for title + page boundaries.
            Response is tiny (no full_text), so it never hits token limits.
  Pass 2 — Reconstruct full_text locally by joining cleaned pages in each range.

For very large books (>200 pages) the corpus is chunked into overlapping
windows of CHUNK_PAGES pages each, with OVERLAP pages of overlap to catch
stories that span chunk boundaries. Results are merged and de-duplicated.
"""
import argparse
import json
import os
import re
import sys

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

from utils import client_claude, CLAUDE_MODEL, slugify

try:
    from json_repair import repair_json
except ImportError:
    def repair_json(x):
        return x

INPUT_DEFAULT  = "ocr_cleaned.json"
OUTPUT_DEFAULT = "tales_raw.json"
CHUNK_PAGES    = 80   # pages per chunk sent to Claude
OVERLAP        = 10   # overlap between consecutive chunks

# Claude is only asked to return boundaries — no full_text in the response.
# full_text is reconstructed locally from the cleaned pages.
SYSTEM_PROMPT = """\
You are given a sequence of pages from a public domain Hungarian folk tale book.
Identify every story (mese) in the text. A story starts with a title line \
(usually in ALL CAPS or clearly set apart) and ends just before the next title \
or end of input.

Return ONLY a valid JSON array. No markdown, no explanation, no preamble.
Each element must have EXACTLY these four fields:

[
  {
    "title": "The story title as it appears in the text",
    "slug": "lowercase-hyphen-ascii-slug",
    "page_start": <integer — the [PAGE N] number where the title appears>,
    "page_end": <integer — the last [PAGE N] that belongs to this story>
  }
]

Slugs: lowercase, hyphen-separated, ASCII only (transliterate Hungarian: á->a, é->e, í->i, ó->o, ö->o, ő->o, ú->u, ü->u, ű->u).
Do NOT include full_text. Return page numbers only.\
"""


def build_chunk(pages: list) -> str:
    parts = []
    for p in sorted(pages, key=lambda x: x["page_number"]):
        parts.append(f"[PAGE {p['page_number']}]\n{p['cleaned_text']}")
    return "\n\n".join(parts)


def call_claude(corpus: str) -> list:
    message = client_claude.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=4096,   # boundaries only — tiny response
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": corpus}],
    )
    raw = next((b.text for b in message.content if b.type == "text"), "")
    raw = re.sub(r"```(?:json)?", "", raw).strip()
    m = re.search(r"\[.*\]", raw, re.DOTALL)
    if m:
        raw = m.group(0)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return json.loads(repair_json(raw))


def merge_boundaries(all_results: list) -> list:
    """De-duplicate boundary entries from overlapping chunks by slug."""
    seen = {}
    for entry in all_results:
        slug = entry.get("slug") or slugify(entry.get("title", ""))
        entry["slug"] = slug
        if slug not in seen:
            seen[slug] = entry
        else:
            # Keep the entry with the widest page range
            existing = seen[slug]
            existing["page_start"] = min(
                existing.get("page_start") or 9999,
                entry.get("page_start") or 9999,
            )
            existing["page_end"] = max(
                existing.get("page_end") or 0,
                entry.get("page_end") or 0,
            )
    # Sort by page_start
    return sorted(seen.values(), key=lambda x: x.get("page_start") or 0)


def reconstruct_full_text(tale: dict, page_map: dict) -> str:
    """Join cleaned text for pages in [page_start, page_end]."""
    start = tale.get("page_start")
    end   = tale.get("page_end")
    if start is None or end is None:
        return ""
    parts = []
    for n in range(start, end + 1):
        text = page_map.get(n, "").strip()
        if text:
            parts.append(text)
    return "\n\n".join(parts)


def main():
    parser = argparse.ArgumentParser(
        description="Detect story boundaries and build tales_raw.json.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--input",  default=INPUT_DEFAULT,  help=f"Input JSON (default: {INPUT_DEFAULT})")
    parser.add_argument("--output", default=OUTPUT_DEFAULT, help=f"Output JSON (default: {OUTPUT_DEFAULT})")
    parser.add_argument("--chunk",  type=int, default=CHUNK_PAGES,
                        help=f"Pages per Claude call (default: {CHUNK_PAGES})")
    parser.add_argument("--overlap", type=int, default=OVERLAP,
                        help=f"Overlap between chunks (default: {OVERLAP})")
    args = parser.parse_args()

    if not client_claude:
        print("[!] ANTHROPIC_API_KEY not set")
        sys.exit(1)
    if not os.path.exists(args.input):
        print(f"[!] Input file not found: {args.input}")
        sys.exit(1)

    with open(args.input, encoding="utf-8") as f:
        pages = json.load(f)

    pages_sorted = sorted(pages, key=lambda x: x["page_number"])
    page_map = {p["page_number"]: p["cleaned_text"] for p in pages_sorted}
    total = len(pages_sorted)

    print(f"[*] {total} pages loaded — chunking into ~{args.chunk}-page windows …")

    all_boundaries = []
    step = args.chunk - args.overlap
    starts = list(range(0, total, step))

    for i, start_idx in enumerate(starts):
        end_idx   = min(start_idx + args.chunk, total)
        chunk     = pages_sorted[start_idx:end_idx]
        first_pg  = chunk[0]["page_number"]
        last_pg   = chunk[-1]["page_number"]
        print(f"  chunk {i+1}/{len(starts)}: pages {first_pg}–{last_pg} …", end=" ", flush=True)

        corpus = build_chunk(chunk)
        try:
            boundaries = call_claude(corpus)
            # Filter out entries with page numbers outside this chunk's range
            valid = [
                b for b in boundaries
                if b.get("page_start") is not None
                and first_pg <= b["page_start"] <= last_pg
            ]
            print(f"{len(valid)} stories found")
            all_boundaries.extend(valid)
        except Exception as e:
            print(f"ERROR: {e}")

    merged = merge_boundaries(all_boundaries)
    print(f"\n[*] Merged to {len(merged)} unique stories — reconstructing full_text …")

    tales = []
    for tale in merged:
        tale["full_text"] = reconstruct_full_text(tale, page_map)
        words = len(tale["full_text"].split())
        tales.append(tale)
        print(f"  • [{tale.get('page_start')}-{tale.get('page_end')}] "
              f"{tale.get('title')} ({words} words)")

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(tales, f, ensure_ascii=False, indent=2)

    print(f"\n[+] tales_raw.json written: {len(tales)} tales -> {args.output}")


if __name__ == "__main__":
    main()
