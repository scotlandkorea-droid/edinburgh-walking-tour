#!/usr/bin/env python3
"""Build reproducible WebP delivery copies of the existing homepage Hero photos.

Do NOT change the originals, image geometry, crop, editorial images or display.
The original PNGs remain the safe fallback and remain available for OG sharing.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PAIRS = [
    (
        ROOT / "assets/ab75b4d57bc76a4b8ce8d532e05cf08119800cc3381112669064a9110390bfc7 (1).png",
        ROOT / "assets/hero-mobile-optimized.webp",
    ),
    (
        ROOT / "assets/ef5aaf4cfaf9f16155eb5ee1cd41d106619e0101e5cda928c3643511b0087258.png",
        ROOT / "assets/hero-desktop-optimized.webp",
    ),
]
QUALITY = 92
for original, destination in PAIRS:
    if not original.is_file():
        raise SystemExit(f"Original photo missing: {original}")
    with Image.open(original) as photo:
        photo.load()
        pixels = photo.convert("RGBA" if "A" in photo.getbands() else "RGB")
        before_size = photo.size
        destination.parent.mkdir(parents=True, exist_ok=True)
        pixels.save(destination, format="WEBP", quality=QUALITY, method=6, exact=True)
    with Image.open(destination) as generated:
        generated.load()
        if generated.size != before_size or generated.format != "WEBP":
            raise SystemExit(f"Image size/encoding changed: {destination}")
    original_bytes = original.stat().st_size
    output_bytes = destination.stat().st_size
    saved = (1-output_bytes/original_bytes)*100
    print(f"{original.name} -> {destination.name}: "
          f"{before_size[0]}x{before_size[1]} "
          f"{original_bytes:,} bytes -> {output_bytes:,} bytes "
          f"({saved:.1f}% smaller)")
    if output_bytes >= original_bytes * 0.80:
        raise SystemExit(
            f"WebP delivery copy does not deliver meaningful savings: {destination}"
        )
print("Original photos untouched; delivery copies verified.")
