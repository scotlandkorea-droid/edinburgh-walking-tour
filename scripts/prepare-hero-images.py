#!/usr/bin/env python3
"""Build reproducible WebP delivery copies of the existing homepage Hero photos.

Do NOT change the originals, image geometry, crop, editorial images or display.
The original PNGs remain the safe fallback and remain available for OG sharing.
"""
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageStat
import math

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
    # Independent visual quality check: only decoded pixel differences.
    with Image.open(original) as original_img, Image.open(destination) as webp_img:
        source_rgb = original_img.convert("RGB")
        output_rgb = webp_img.convert("RGB")
        rms = ImageStat.Stat(ImageChops.difference(source_rgb, output_rgb)).rms
        mse = sum(v * v for v in rms) / 3
        psnr = 10 * math.log10(255 * 255 / mse) if mse else float("inf")
        print(f"Decoded RGB quality comparison: {psnr:.2f} dB PSNR")
        if psnr < 32.0:
            raise SystemExit(f"Image quality requires manual review: {destination} PSNR {psnr:.1f}")
        preview_dir = Path("/tmp/ew-hero-preview")
        preview_dir.mkdir(parents=True, exist_ok=True)
        # Match identical pixels: column one original, column two WebP.
        width, height = before_size
        top_crop = (0, 0, width, height)
        detail_crop = (
            round(width * .18),
            round(height * (.61 if 'mobile' in destination.name else .30)),
            round(width * .82),
            round(height * (.94 if 'mobile' in destination.name else .76)),
        )
        panel_width = 640
        whole_height = round(height / width * panel_width)
        whole_height = min(whole_height, 820)
        top_height = whole_height
        detail_height = 360
        sheet = Image.new("RGB", (panel_width * 2, top_height + detail_height + 68), "white")
        d = ImageDraw.Draw(sheet)
        d.text((20, 16), "Original PNG (preserved)", fill=(25, 25, 25))
        d.text((panel_width + 20, 16), "WebP quality=92 (delivery copy)", fill=(25, 25, 25))
        for column, image in enumerate((source_rgb, output_rgb)):
            whole = image.copy()
            whole.thumbnail((panel_width, top_height))
            sheet.paste(whole, (column * panel_width + (panel_width-whole.width)//2, 45))
            detail = image.crop(detail_crop)
            detail.thumbnail((panel_width, detail_height))
            sheet.paste(detail, (column * panel_width + (panel_width-detail.width)//2, top_height + 52))
        sheet.save(preview_dir / (destination.stem + "-compare.png"), format="PNG")

print("Original photos untouched; delivery copies verified.")
