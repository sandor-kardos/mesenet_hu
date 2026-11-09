"""focal_point.py — Automatic smart focal point detection for mobile.

Uses Computer Vision (Face detection + Frequency-Tuned Visual Saliency + Edge Energy)
to calculate the optimal (focal_x%, focal_y%) coordinate for every illustration.
This ensures mobile cropping (object-position) always focuses on the main character/subject.
"""

import json
import os
import cv2
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ILL_DIR = os.path.join(BASE_DIR, "illustrations")
JSON_PATH = os.path.join(BASE_DIR, "tales_with_images.json")

def detect_focal_point(image_path: str) -> tuple[float, float, str]:
    """Calculate the primary focal point of an image.
    Returns (x_percent, y_percent, detection_method).
    """
    img = cv2.imread(image_path)
    if img is None:
        return 50.0, 30.0, "fallback"

    h, w = img.shape[:2]

    # 1. Face detection (characters, animals, people)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(30, 30))

    if len(faces) > 0:
        # Pick the most prominent face
        fx, fy, fw, fh = max(faces, key=lambda f: f[2] * f[3])
        # Eye/head level is slightly above center of bounding box
        center_x = (fx + fw * 0.5) / w * 100.0
        center_y = (fy + fh * 0.45) / h * 100.0
        return round(center_x, 1), round(center_y, 1), "face"

    # 2. Saliency via Achanta Frequency-Tuned algorithm
    blurred = cv2.GaussianBlur(img, (5, 5), 0)
    lab = cv2.cvtColor(blurred, cv2.COLOR_BGR2LAB).astype(np.float32)
    mean_lab = np.mean(lab, axis=(0, 1))
    saliency = np.sum((lab - mean_lab) ** 2, axis=2)

    # 3. High-frequency detail / edge energy
    grad_x = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    grad_y = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
    grad = np.sqrt(grad_x**2 + grad_y**2)
    grad = cv2.GaussianBlur(grad, (9, 9), 0)

    # Normalize to [0, 1]
    sal_norm = saliency / (np.max(saliency) + 1e-6)
    grad_norm = grad / (np.max(grad) + 1e-6)

    # Visual energy map
    energy = 0.6 * sal_norm + 0.4 * grad_norm

    # Gentle portrait bias (favor upper-center 35-45% for book illustrations)
    y_coords, x_coords = np.mgrid[0:h, 0:w]
    vertical_bias = np.exp(-((y_coords - 0.38 * h) ** 2) / (2 * (0.35 * h) ** 2))
    energy *= vertical_bias

    # Center of mass of the top 20% salient energy
    threshold = np.percentile(energy, 80)
    mask = energy > threshold
    total_energy = np.sum(energy[mask])

    if total_energy > 0:
        focal_x = np.sum(x_coords[mask] * energy[mask]) / total_energy
        focal_y = np.sum(y_coords[mask] * energy[mask]) / total_energy
        pct_x = round((focal_x / w) * 100.0, 1)
        pct_y = round((focal_y / h) * 100.0, 1)
        return pct_x, pct_y, "saliency"

    return 50.0, 30.0, "default"


def process_all():
    print(f"[*] Processing focal points for tales in {JSON_PATH}...")
    if not os.path.exists(JSON_PATH):
        print(f"[!] {JSON_PATH} not found")
        return

    with open(JSON_PATH, "r", encoding="utf-8") as f:
        tales = json.load(f)

    updated = 0
    for tale in tales:
        slug = tale.get("slug")
        local_path = tale.get("local_path")

        # Find file if local_path doesn't exist
        if not local_path or not os.path.exists(local_path):
            candidate = os.path.join(ILL_DIR, f"{slug}.png")
            if os.path.exists(candidate):
                local_path = candidate
                tale["local_path"] = candidate

        if local_path and os.path.exists(local_path):
            fx, fy, method = detect_focal_point(local_path)
            focal_str = f"{fx}% {fy}%"
            tale["focal_point"] = focal_str
            tale["focal_x"] = fx
            tale["focal_y"] = fy
            print(f"  [+] {tale.get('title')} ({slug}): {focal_str} [{method}]")
            updated += 1
        else:
            tale["focal_point"] = "50% 30%"
            tale["focal_x"] = 50.0
            tale["focal_y"] = 30.0

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(tales, f, ensure_ascii=False, indent=2)

    print(f"\n[+] Successfully updated {updated} tales with smart focal points in {JSON_PATH}")


if __name__ == "__main__":
    process_all()

