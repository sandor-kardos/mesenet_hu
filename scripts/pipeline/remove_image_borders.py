"""remove_image_borders.py — Automatic detection and removal of AI-generated borders/frames.

Scans all illustrations, finds solid or near-solid white/black margins or borders,
crops tightly to the actual full-bleed artwork, and saves the borderless result.
"""

import os
import glob
import cv2
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ILL_DIR = os.path.join(BASE_DIR, "illustrations")

def trim_borders(image_path: str, threshold: int = 242) -> bool:
    """Detect and remove borders/frames from an image.
    Returns True if a border was cropped, False otherwise.
    """
    img = cv2.imread(image_path)
    if img is None:
        return False

    orig_h, orig_w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Detect white/light borders (>= threshold) or pure black borders (<= 15)
    is_border = (gray >= threshold) | (gray <= 15)

    # Rows and columns where actual content exists
    content_rows = np.where(~np.all(is_border, axis=1))[0]
    content_cols = np.where(~np.all(is_border, axis=0))[0]

    if len(content_rows) == 0 or len(content_cols) == 0:
        return False

    top = int(content_rows[0])
    bottom = int(content_rows[-1] + 1)
    left = int(content_cols[0])
    right = int(content_cols[-1] + 1)

    # Check if a meaningful border exists (at least 6px on any side)
    border_detected = (top >= 6) or (orig_h - bottom >= 6) or (left >= 6) or (orig_w - right >= 6)

    if not border_detected:
        return False

    print(f"  [-] Trimming border on {os.path.basename(image_path)}: top={top}px, bottom={orig_h - bottom}px, left={left}px, right={orig_w - right}px")

    cropped = img[top:bottom, left:right]

    # Resize back to original target dimensions using high-quality Lanczos interpolation
    clean_img = cv2.resize(cropped, (orig_w, orig_h), interpolation=cv2.INTER_LANCZOS4)

    # Save back
    cv2.imwrite(image_path, clean_img)
    return True


def run():
    print(f"[*] Scanning illustrations in {ILL_DIR} for borders/frames...")
    files = glob.glob(os.path.join(ILL_DIR, "*.png"))
    trimmed_count = 0

    for path in sorted(files):
        try:
            if trim_borders(path):
                trimmed_count += 1
        except Exception as e:
            print(f"  [!] Error processing {os.path.basename(path)}: {e}")

    print(f"\n[+] Finished: {trimmed_count} images had borders removed and were converted to seamless full-bleed artwork!")


if __name__ == "__main__":
    run()

