"""scout.py — Watermark enforcement scout (weekly cron).

Reads watermark_log.json. For each tale, queries Google Custom Search API
for the variant sentence. Hits outside mesenet.hu trigger:
  - An entry appended to scout_hits.json
  - A DMCA notice saved to dmca_notices/{slug}_{date}.txt
  - A console message: HIT: {url} — DMCA notice saved.

Environment variables required:
  GOOGLE_API_KEY   — Google API key with Custom Search enabled
  GOOGLE_CSE_ID    — Programmable Search Engine ID
"""
import argparse
import json
import os
import sys
from datetime import date

import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

from utils import client_claude, CLAUDE_MODEL

LOG_DEFAULT        = "watermark_log.json"
HITS_DEFAULT       = "scout_hits.json"
DMCA_DIR_DEFAULT   = "dmca_notices"
OWN_DOMAIN         = os.getenv("SCOUT_OWN_DOMAIN", "mesenet.hu")
GOOGLE_API_KEY     = os.getenv("GOOGLE_API_KEY")
GOOGLE_CSE_ID      = os.getenv("GOOGLE_CSE_ID")


def google_search(query: str) -> list[dict]:
    if not GOOGLE_API_KEY or not GOOGLE_CSE_ID:
        print("[!] GOOGLE_API_KEY or GOOGLE_CSE_ID not set — skipping search")
        return []
    try:
        r = requests.get(
            "https://www.googleapis.com/customsearch/v1",
            params={"key": GOOGLE_API_KEY, "cx": GOOGLE_CSE_ID, "q": query},
            timeout=15,
        )
        r.raise_for_status()
        return r.json().get("items", [])
    except Exception as e:
        print(f"  [!] Search error: {e}")
        return []


def is_own_domain(url: str) -> bool:
    return OWN_DOMAIN in url


def generate_dmca_notice(tale_slug: str, infringing_url: str, matched_text: str) -> str:
    prompt = (
        f"Generate a formal DMCA takedown notice for the following situation:\n"
        f"- Copyright holder: Mesenet.hu\n"
        f"- Infringing URL: {infringing_url}\n"
        f"- Matched content (excerpt): {matched_text[:300]}\n"
        f"- Tale identifier: {tale_slug}\n\n"
        "The notice should include: identification of the copyrighted work, "
        "identification of the infringing material, contact information placeholder, "
        "good faith statement, and accuracy statement. "
        "Use formal legal language. Return only the notice text."
    )
    try:
        message = client_claude.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        return next((b.text for b in message.content if b.type == "text"), "")
    except Exception as e:
        print(f"  [!] DMCA generation failed: {e}")
        return (
            f"DMCA Takedown Notice\n\n"
            f"Infringing URL: {infringing_url}\n"
            f"Tale: {tale_slug}\n"
            f"Matched excerpt: {matched_text[:200]}\n\n"
            "Please remove the infringing content immediately."
        )


def load_hits(path: str) -> list:
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return []


def save_hits(hits: list, path: str):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(hits, f, ensure_ascii=False, indent=2)


def main():
    parser = argparse.ArgumentParser(
        description="Scout for watermarked content outside mesenet.hu and generate DMCA notices.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--log",      default=LOG_DEFAULT,      help=f"Watermark log (default: {LOG_DEFAULT})")
    parser.add_argument("--hits",     default=HITS_DEFAULT,     help=f"Hits output JSON (default: {HITS_DEFAULT})")
    parser.add_argument("--dmca-dir", default=DMCA_DIR_DEFAULT, help=f"DMCA notices dir (default: {DMCA_DIR_DEFAULT})")
    args = parser.parse_args()

    if not os.path.exists(args.log):
        print(f"[!] Watermark log not found: {args.log}")
        sys.exit(1)

    with open(args.log, encoding="utf-8") as f:
        log_entries = json.load(f)

    os.makedirs(args.dmca_dir, exist_ok=True)
    hits = load_hits(args.hits)
    existing_urls = {h["url"] for h in hits}
    today = date.today().isoformat()

    for entry in log_entries:
        slug             = entry.get("tale_slug", "unknown")
        variant_sentence = entry.get("variant_sentence", "").strip()

        if not variant_sentence:
            print(f"  [skip] {slug}: no variant sentence")
            continue

        print(f"[*] Searching for watermark: {slug}")
        # Quote the sentence for an exact-match search
        query = f'"{variant_sentence}"'
        results = google_search(query)

        for item in results:
            url   = item.get("link", "")
            title = item.get("title", "")

            if is_own_domain(url):
                continue
            if url in existing_urls:
                continue

            print(f"HIT: {url} — generating DMCA notice …")

            notice = generate_dmca_notice(slug, url, variant_sentence)
            notice_path = os.path.join(args.dmca_dir, f"{slug}_{today}.txt")
            with open(notice_path, "w", encoding="utf-8") as f:
                f.write(notice)

            hit = {
                "url":          url,
                "slug":         slug,
                "matched_text": variant_sentence,
                "date":         today,
                "page_title":   title,
            }
            hits.append(hit)
            existing_urls.add(url)
            save_hits(hits, args.hits)

            print(f"HIT: {url} — DMCA notice saved.")

    print(f"[+] Scout complete. {len(hits)} total hits recorded.")


if __name__ == "__main__":
    main()
