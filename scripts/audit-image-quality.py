"""Report actual image dimensions and indicative sharpness, without modifying images.

The Laplacian score is NOT a quality verdict: texture, depth of field,
motion and denoising all affect it. Compare related images cautiously.
"""
from pathlib import Path
from PIL import Image, ImageFilter, ImageStat, ImageOps
import math

roots = (Path("assets"), Path("images"))
paths = sorted(p for root in roots for p in root.rglob("*") if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"})
attention = (
    "edited", "deacon-brodie", "city-chambers", "new-college", "princes-street-gardens",
    "scott-monument", "ab75b4", "ef5aaf", "isle-of-skye",
    "robert-fergusson-writers", "heart-of-midlothian",
)
flagged = []
for path in paths:
    try:
        with Image.open(path) as original:
            original.load()
            width, height = original.size
            photo = ImageOps.exif_transpose(original).convert("RGB")
            photo.thumbnail((960, 960), Image.Resampling.LANCZOS)
            grayscale = ImageOps.grayscale(photo)
            lap = grayscale.filter(ImageFilter.Kernel((3,3),[0,1,0,1,-4,1,0,1,0],scale=1,offset=128))
            stat = ImageStat.Stat(lap)
            # Subtract 128 before computing the rms contrast of the Laplacian.
            energy = math.sqrt(stat.var[0] + (stat.mean[0]-128)**2)
            # Pillow calls JPEGs with MPF headers "MPO"; their first image is JPEG.
            format = "JPEG" if original.format == "MPO" else original.format
            suffix = path.suffix.lower()
            expected = "JPEG" if suffix in {".jpg", ".jpeg"} else suffix[1:].upper()
            mismatch = format.upper() != expected
            candidate = any(q in str(path).lower() for q in attention)
            if candidate or mismatch:
                print(f"IMAGE | {path} | {width}x{height} | {format} | "
                      f"{path.stat().st_size//1024} KiB | indicative-edge={energy:.1f}" +
                      (" | EXTENSION MISMATCH" if mismatch else ""))
            if mismatch:
                flagged.append(str(path))
    except Exception as error:
        print(f"IMAGE OPEN ERROR | {path} | {type(error).__name__}")

# Compare each Brodie edit with its surviving source thumbnail.
# A high difference indicates content/reconstruction edits, not just sharpening.
from PIL import ImageChops
for stem in ("deacon-brodie-house-cafe", "deacon-brodie-tavern", "deacon-brodie-cabinet"):
    original_path=Path("assets")/(stem+".webp")
    edited_path=Path("assets")/(stem+"-edited.png")
    if not original_path.exists() or not edited_path.exists():
        continue
    with Image.open(original_path) as original, Image.open(edited_path) as edited:
        source=ImageOps.exif_transpose(original).convert("RGB")
        current=ImageOps.exif_transpose(edited).convert("RGB")
        previous_size=source.size
        # Downsample both to the same 256-pixel reference, avoiding false
        # comparisons caused by different original pixel dimensions.
        source=source.resize((256,192) if source.width>source.height else (192,256),Image.Resampling.LANCZOS)
        current=current.resize(source.size,Image.Resampling.LANCZOS)
        delta=ImageStat.Stat(ImageChops.difference(source,current))
        mean_absolute_diff=sum(delta.mean)/3
        print(f"BRODIE COMPARISON | {stem} | source={previous_size} "
              f"| edited={edited.size} | edited/source-scale={edited.width/previous_size[0]:.2f} "
              f"| low-resolution-colour-diff={mean_absolute_diff:.1f}/255 "
              "| interpret only with visual confirmation")

print(f"CHECKED | {len(paths)} image files | {len(flagged)} format mismatches")
print("Quality scores are indicative only; no image has been re-encoded or replaced.")
