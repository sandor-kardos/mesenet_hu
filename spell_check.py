import json
import os
import re
import sys
import anthropic
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Load API key from pipeline .env
_env = Path(__file__).parent / "scripts/pipeline/.env"
for _line in _env.read_text(encoding="utf-8").splitlines():
    if _line.strip() and not _line.startswith("#") and "=" in _line:
        _k, _v = _line.split("=", 1)
        os.environ.setdefault(_k.strip(), _v.strip())

INPUT_FILE = "tales_watermarked.json"
REPORT_FILE = "spell_check_report.txt"
OUTPUT_FILE = "tales_spell_corrected.json"
MODEL = "claude-haiku-4-5-20251001"

CHECK_PROMPT = (
    "Helyesírási hibákat talál-e ebben a szövegben? "
    "Csak a hibákat listázd, formátum: ERROR: [szó] → [javítás]"
)


def strip_html(text: str) -> str:
    return re.sub(r"<[^>]+>", "", text)


def parse_errors(response: str) -> list[tuple[str, str]]:
    """Parse ERROR: [word] → [fix] lines into (wrong, correct) pairs."""
    pairs = []
    for line in response.splitlines():
        line = line.strip()
        if not line.startswith("ERROR:"):
            continue
        # Strip "ERROR:" prefix then split on →
        rest = line[len("ERROR:"):].strip()
        if "→" in rest:
            wrong, fix = rest.split("→", 1)
            wrong = wrong.strip().strip("[]")
            fix = fix.strip().strip("[]")
            if wrong and fix:
                pairs.append((wrong, fix))
    return pairs


def check_and_correct(client: anthropic.Anthropic, full_text: str) -> tuple[list[str], str]:
    """
    Returns:
      - list of raw ERROR: lines for the report
      - corrected full_text with replacements applied
    """
    clean_text = strip_html(full_text).strip()
    if not clean_text:
        return [], full_text

    message = client.messages.create(
        model=MODEL,
        max_tokens=2048,
        messages=[{"role": "user", "content": f"{CHECK_PROMPT}\n\n{clean_text}"}],
    )

    response = message.content[0].text.strip()
    error_lines = [l.strip() for l in response.splitlines() if l.strip().startswith("ERROR:")]
    pairs = parse_errors(response)

    corrected = full_text
    for wrong, fix in pairs:
        # Replace whole-word occurrences only, case-sensitive
        corrected = re.sub(r'\b' + re.escape(wrong) + r'\b', fix, corrected)

    return error_lines, corrected


def main():
    client = anthropic.Anthropic()

    with open(INPUT_FILE, encoding="utf-8") as f:
        tales = json.load(f)

    report_lines = []
    total_errors = 0
    corrected_tales = []

    for i, tale in enumerate(tales, 1):
        title = tale.get("title", f"Tale #{i}")
        full_text = tale.get("full_text", "")

        print(f"[{i}/{len(tales)}] Checking: {title}")

        error_lines, corrected_text = check_and_correct(client, full_text)

        corrected_tale = dict(tale)
        corrected_tale["full_text"] = corrected_text
        corrected_tales.append(corrected_tale)

        if error_lines:
            report_lines.append(f"\n=== {title} ===")
            report_lines.extend(error_lines)
            total_errors += len(error_lines)
            print(f"  -> {len(error_lines)} error(s) fixed")
        else:
            print(f"  -> No errors found")

    report_lines.append(f"\n\n--- TOTAL ERRORS: {total_errors} across {len(tales)} tales ---")

    with open(REPORT_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(report_lines))

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(corrected_tales, f, ensure_ascii=False, indent=2)

    print(f"\nDone.")
    print(f"  Report  -> {REPORT_FILE} ({total_errors} errors)")
    print(f"  Fixed   -> {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
