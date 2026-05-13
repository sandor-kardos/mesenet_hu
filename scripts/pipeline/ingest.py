"""ingest.py — Stage 1: Page ingestion.

Accepts one of:
  --folder <path>        sorted JPG/PNG images from a local folder
  --pdf    <path>        split PDF into per-page PNGs -> /tmp/mesenet_pages/
  --r2 --prefix <str>    download from R2 bucket prefix -> /tmp/mesenet_pages/

Output: pages.json  ->  [{page_number, local_path}, ...]
"""
import argparse
import json
import os
import sys

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

TMP_DIR = os.getenv("INGEST_TMP_DIR", "/tmp/mesenet_pages")
OUTPUT   = "pages.json"
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".tif", ".tiff"}


def ingest_folder(folder: str) -> list[dict]:
    files = sorted(
        f for f in os.listdir(folder)
        if os.path.splitext(f)[1].lower() in IMAGE_EXTS
    )
    if not files:
        print(f"[!] No image files found in {folder}")
        sys.exit(1)
    pages = []
    for i, fname in enumerate(files, start=1):
        pages.append({"page_number": i, "local_path": os.path.abspath(os.path.join(folder, fname))})
    return pages


def ingest_pdf(pdf_path: str) -> list[dict]:
    from pdf2image import convert_from_path

    poppler_path = os.getenv("POPPLER_PATH") or None  # e.g. C:\poppler\Library\bin

    os.makedirs(TMP_DIR, exist_ok=True)
    print(f"[*] Converting PDF -> PNG pages (300 DPI) ...")
    images = convert_from_path(pdf_path, dpi=300, grayscale=False, poppler_path=poppler_path)
    pages = []
    for i, img in enumerate(images, start=1):
        dest = os.path.join(TMP_DIR, f"page_{i:04d}.png")
        img.save(dest, "PNG")
        pages.append({"page_number": i, "local_path": dest})
        print(f"  saved page {i}/{len(images)}: {dest}")
    return pages


def ingest_r2(prefix: str) -> list[dict]:
    import boto3

    endpoint = os.getenv("R2_ENDPOINT")
    access_key = os.getenv("R2_ACCESS_KEY")
    secret_key = os.getenv("R2_SECRET_KEY")
    bucket = os.getenv("R2_BUCKET")

    if not all([endpoint, access_key, secret_key, bucket]):
        print("[!] R2 env vars not set (R2_ENDPOINT, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET)")
        sys.exit(1)

    s3 = boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
    )

    os.makedirs(TMP_DIR, exist_ok=True)
    paginator = s3.get_paginator("list_objects_v2")
    keys = []
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get("Contents", []):
            k = obj["Key"]
            if os.path.splitext(k)[1].lower() in IMAGE_EXTS:
                keys.append(k)

    if not keys:
        print(f"[!] No image objects found under prefix '{prefix}' in bucket '{bucket}'")
        sys.exit(1)

    keys.sort()
    pages = []
    for i, key in enumerate(keys, start=1):
        fname = os.path.basename(key)
        dest = os.path.join(TMP_DIR, fname)
        if not os.path.exists(dest):
            print(f"  downloading [{i}/{len(keys)}] {key} …")
            s3.download_file(bucket, key, dest)
        else:
            print(f"  skipping (already exists) [{i}/{len(keys)}] {dest}")
        pages.append({"page_number": i, "local_path": dest})

    return pages


def main():
    parser = argparse.ArgumentParser(
        description="Ingest image pages for the Mesenet OCR pipeline.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    src = parser.add_mutually_exclusive_group(required=True)
    src.add_argument("--folder", metavar="PATH", help="Folder containing JPG/PNG pages")
    src.add_argument("--pdf",    metavar="PATH", help="PDF file to split into pages")
    src.add_argument("--r2",     action="store_true", help="Download pages from Cloudflare R2")
    parser.add_argument("--prefix", metavar="STR",  help="R2 object prefix (required with --r2)")
    parser.add_argument("--output", default=OUTPUT,  help=f"Output JSON path (default: {OUTPUT})")
    args = parser.parse_args()

    if args.r2 and not args.prefix:
        parser.error("--r2 requires --prefix")

    if args.folder:
        pages = ingest_folder(args.folder)
    elif args.pdf:
        pages = ingest_pdf(args.pdf)
    else:
        pages = ingest_r2(args.prefix)

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(pages, f, ensure_ascii=False, indent=2)

    print(f"[+] pages.json written: {len(pages)} pages -> {args.output}")


if __name__ == "__main__":
    main()
