"""palette_swap.py — Standalone utility: dominant-hue palette remapping.

Fetches illustrations/{slug}/base.png from R2, remaps dominant hue clusters
to the supplied hex colours, and uploads the result back to R2.

Usage:
  python palette_swap.py --slug kisfiu-es-a-mese --palette "#e63946,#457b9d,#a8dadc"

Output: prints the R2 key of the new image.
CPU-only. No GPU required.
"""
import argparse
import hashlib
import io
import os
import sys

import boto3
import cv2
import numpy as np
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))


def get_r2_client():
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


def hex_to_bgr(hex_str: str) -> tuple[int, int, int]:
    h = hex_str.lstrip("#")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return b, g, r


def hex_to_hsv_hue(hex_str: str) -> int:
    """Return OpenCV hue value [0, 179] for the given hex colour."""
    b, g, r = hex_to_bgr(hex_str)
    pixel = np.uint8([[[b, g, r]]])
    hsv = cv2.cvtColor(pixel, cv2.COLOR_BGR2HSV)
    return int(hsv[0, 0, 0])


def find_dominant_hues(hsv_image: np.ndarray, k: int) -> tuple[np.ndarray, np.ndarray]:
    """K-means on the hue channel. Returns (labels, center_hues)."""
    hue_channel = hsv_image[:, :, 0].reshape(-1, 1).astype(np.float32)
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 100, 0.2)
    _, labels, centers = cv2.kmeans(
        hue_channel, k, None, criteria, 10, cv2.KMEANS_RANDOM_CENTERS
    )
    return labels.flatten(), centers.flatten()


def remap_hues(hsv_image: np.ndarray, labels: np.ndarray, target_hues: list[int]) -> np.ndarray:
    """Remap each pixel's hue according to its cluster assignment."""
    result = hsv_image.copy()
    flat_hue = result[:, :, 0].flatten().astype(np.float32)
    for cluster_idx, target_hue in enumerate(target_hues):
        mask = labels == cluster_idx
        flat_hue[mask] = float(target_hue)
    result[:, :, 0] = flat_hue.reshape(result[:, :, 0].shape).astype(np.uint8)
    return result


def palette_hash(palette: list[str]) -> str:
    return hashlib.md5(",".join(palette).encode()).hexdigest()[:8]


def main():
    parser = argparse.ArgumentParser(
        description="Remap dominant hue clusters of a tale illustration to new colours.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--slug",    required=True, help="Tale slug (e.g. kisfiu-es-a-mese)")
    parser.add_argument(
        "--palette", required=True,
        help="Comma-separated hex colours — one per dominant cluster, e.g. #e63946,#457b9d,#a8dadc",
    )
    args = parser.parse_args()

    bucket = os.getenv("R2_BUCKET")
    if not bucket:
        print("[!] R2_BUCKET not set")
        sys.exit(1)

    palette = [c.strip() for c in args.palette.split(",")]
    k = len(palette)
    if k < 1:
        print("[!] Provide at least one hex colour in --palette")
        sys.exit(1)

    s3 = get_r2_client()

    # Download base image
    src_key = f"illustrations/{args.slug}/base.png"
    print(f"[*] Downloading {src_key} …")
    try:
        obj = s3.get_object(Bucket=bucket, Key=src_key)
        img_bytes = obj["Body"].read()
    except Exception as e:
        print(f"[!] Failed to fetch {src_key}: {e}")
        sys.exit(1)

    # Decode
    arr = np.frombuffer(img_bytes, dtype=np.uint8)
    bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if bgr is None:
        print("[!] Failed to decode image")
        sys.exit(1)

    # Convert to HSV, remap hues, convert back
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    labels, centers = find_dominant_hues(hsv, k)

    # Sort cluster indices by their center hue to get a stable mapping
    sorted_clusters = sorted(range(k), key=lambda idx: centers[idx])
    target_hues_sorted = [hex_to_hsv_hue(palette[ci]) for ci in sorted_clusters]

    # Build per-pixel target hue mapping: cluster i -> target
    cluster_to_target = {}
    for rank, cluster_idx in enumerate(sorted_clusters):
        cluster_to_target[cluster_idx] = target_hues_sorted[rank]
    ordered_targets = [cluster_to_target[i] for i in range(k)]

    remapped_hsv = remap_hues(hsv, labels, ordered_targets)
    result_bgr   = cv2.cvtColor(remapped_hsv, cv2.COLOR_HSV2BGR)

    # Encode result as PNG
    ok, buf = cv2.imencode(".png", result_bgr)
    if not ok:
        print("[!] Failed to encode result image")
        sys.exit(1)
    result_bytes = buf.tobytes()

    # Upload
    phash   = palette_hash(palette)
    dst_key = f"illustrations/{args.slug}/palette_{phash}.png"
    s3.put_object(Bucket=bucket, Key=dst_key, Body=result_bytes, ContentType="image/png")
    print(dst_key)


if __name__ == "__main__":
    main()
