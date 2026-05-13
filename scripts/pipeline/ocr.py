"""ocr.py — Stage 2: OCR each page.

Input:  pages.json
Output: ocr_raw.json  ->  [{page_number, raw_text, confidence, source}, ...]

Primary:  Google Cloud Vision DOCUMENT_TEXT_DETECTION
          (set GOOGLE_APPLICATION_CREDENTIALS to service-account JSON path)
Fallback: pytesseract, lang=hun+   (used when confidence < 0.70 or Vision fails)

Prints per page: [page N] source=vision|tesseract confidence=0.XX
"""
import argparse
import json
import os
import sys

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

CONFIDENCE_THRESHOLD = float(os.getenv("OCR_CONFIDENCE_THRESHOLD", "0.70"))

# Configure pytesseract executable path (required on Windows)
_tesseract_cmd = os.getenv("TESSERACT_CMD")
if _tesseract_cmd:
    import pytesseract as _pt
    _pt.pytesseract.tesseract_cmd = _tesseract_cmd
INPUT_DEFAULT  = "pages.json"
OUTPUT_DEFAULT = "ocr_raw.json"


def vision_ocr(image_path: str) -> tuple[str, float]:
    """Return (text, confidence) using Google Cloud Vision."""
    from google.cloud import vision

    client = vision.ImageAnnotatorClient()
    with open(image_path, "rb") as f:
        content = f.read()
    image = vision.Image(content=content)
    response = client.document_text_detection(image=image)

    if response.error.message:
        raise RuntimeError(f"Vision API error: {response.error.message}")

    annotation = response.full_text_annotation
    text = annotation.text or ""
    confidence = annotation.pages[0].confidence if annotation.pages else 0.0
    return text, confidence


def tesseract_ocr(image_path: str) -> tuple[str, float]:
    """Return (text, confidence) using pytesseract."""
    import pytesseract
    from PIL import Image

    img = Image.open(image_path)
    data = pytesseract.image_to_data(img, lang="hun+", output_type=pytesseract.Output.DICT)
    confidences = [int(c) for c in data["conf"] if str(c) != "-1" and int(c) >= 0]
    text_parts = [
        data["text"][i]
        for i in range(len(data["text"]))
        if str(data["conf"][i]) != "-1" and data["text"][i].strip()
    ]
    confidence = (sum(confidences) / len(confidences) / 100.0) if confidences else 0.0
    text = " ".join(text_parts)
    return text, confidence


def process_page(page: dict) -> dict:
    page_num = page["page_number"]
    path = page["local_path"]

    source = "vision"
    text = ""
    confidence = 0.0

    # Try Google Vision first if credentials are available
    creds = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if creds and os.path.exists(creds):
        try:
            text, confidence = vision_ocr(path)
        except Exception as e:
            print(f"  [!] Vision API failed for page {page_num}: {e} — falling back to tesseract")
            confidence = 0.0  # force fallback

    if not creds or not os.path.exists(creds or ""):
        confidence = 0.0  # no credentials -> go straight to tesseract

    if confidence < CONFIDENCE_THRESHOLD:
        source = "tesseract"
        try:
            text, confidence = tesseract_ocr(path)
        except Exception as e:
            print(f"  [!] Tesseract failed for page {page_num}: {e}")
            text = ""
            confidence = 0.0

    print(f"[page {page_num}] source={source} confidence={confidence:.2f}")
    return {
        "page_number": page_num,
        "raw_text":    text,
        "confidence":  round(confidence, 4),
        "source":      source,
    }


def main():
    parser = argparse.ArgumentParser(
        description="OCR each page listed in pages.json.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--input",  default=INPUT_DEFAULT,  help=f"Input JSON (default: {INPUT_DEFAULT})")
    parser.add_argument("--output", default=OUTPUT_DEFAULT, help=f"Output JSON (default: {OUTPUT_DEFAULT})")
    parser.add_argument(
        "--resume", action="store_true",
        help="Skip pages already present in output file (resume interrupted run)",
    )
    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(f"[!] Input file not found: {args.input}")
        sys.exit(1)

    with open(args.input, encoding="utf-8") as f:
        pages = json.load(f)

    # Resume support: load already-processed page numbers
    done_pages = set()
    results = []
    if args.resume and os.path.exists(args.output):
        with open(args.output, encoding="utf-8") as f:
            results = json.load(f)
        done_pages = {r["page_number"] for r in results}
        print(f"[*] Resuming — {len(done_pages)} pages already processed")

    for page in pages:
        if page["page_number"] in done_pages:
            continue
        result = process_page(page)
        results.append(result)

        # Write incrementally so progress survives interruptions
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(sorted(results, key=lambda r: r["page_number"]), f, ensure_ascii=False, indent=2)

    print(f"[+] ocr_raw.json written: {len(results)} pages -> {args.output}")


if __name__ == "__main__":
    main()
