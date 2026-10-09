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
    "greyfriars-bobby-fountain", "elephant-house",
)
flagged = []
for path in paths:
    try:
        with Image.open(path) as original:
            original.load()
            width, height = original.size
            # EXIF orientation changes visible pixels when a file is decoded.
            # Report only orientation, never shooting date, device or location.
            exif=original.getexif()
            if exif:
                print(f"EXIF ORIENTATION | {path} | value={exif.get(274, 1)} "
                      f"| tag-count={len(exif)}")
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
            if max(width,height) < 850:
                print(f"SMALL SOURCE | {path} | {width}x{height} | "
                      "may look soft when enlarged above its native dimensions")
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

# Check whether the bigger Greyfriars Bobby fountain photo depicts the same crop.
with Image.open("assets/greyfriars-bobby-fountain.webp") as small, Image.open("assets/greyfriars-bobby-fountain.jpg") as big:
    a=small.convert("RGB").resize((256,300),Image.Resampling.LANCZOS)
    b=big.convert("RGB").resize((256,300),Image.Resampling.LANCZOS)
    stat=ImageStat.Stat(ImageChops.difference(a,b))
    delta=sum(stat.mean)/3
    print(f"FOUNTAIN COMPARISON | webp={small.size} jpeg={big.size} "
          f"| colour-diff={delta:.1f}/255")

# Cross-check the actual dimensions against declared HTML img width/height.
# This is a report, not an automatic resizer or an assertion of blur.
from html.parser import HTMLParser
from urllib.parse import unquote, urlsplit

class ImageRefs(HTMLParser):
    def __init__(self):
        super().__init__()
        self.images=[]
    def handle_starttag(self, tag, attrs):
        if tag != "img": return
        attr=dict(attrs)
        if attr.get("src"):
            self.images.append(attr)

used=0
mismatches=[]
undersized=[]
for page in sorted(Path(".").rglob("*.html")):
    if any(part.startswith(".") for part in page.parts) or "node_modules" in page.parts:
        continue
    parser=ImageRefs()
    parser.feed(page.read_text(encoding="utf-8"))
    for attrs in parser.images:
        source=attrs.get("src","")
        if not source.startswith("/") or source.startswith("//"): continue
        target=Path(unquote(urlsplit(source).path).lstrip("/"))
        if not target.exists(): continue
        try:
            with Image.open(target) as img:
                actual_width,actual_height=img.size
        except Exception: continue
        used+=1
        try:
            declared_width=int(attrs.get("width") or 0)
            declared_height=int(attrs.get("height") or 0)
        except (ValueError,TypeError): continue
        if not declared_width or not declared_height: continue
        ratio_declared=declared_width/declared_height
        ratio_actual=actual_width/actual_height
        if abs(ratio_declared/ratio_actual-1)>0.02:
            mismatches.append((str(page),str(target),
                f"declared {declared_width}x{declared_height}, actual {actual_width}x{actual_height}"))
        if max(declared_width/actual_width,declared_height/actual_height)>1.35:
            undersized.append((str(page),str(target),
                f"declared {declared_width}x{declared_height}, actual {actual_width}x{actual_height}"))

print(f"HTML IMAGE USE | {used} local <img> tags, {len(mismatches)} aspect mismatches, "
      f"{len(undersized)} sources smaller than declared size")
for page,asset,detail in mismatches:
    print(f"ASPECT REVIEW | {page} | {asset} | {detail}")
for page,asset,detail in undersized:
    print(f"DIMENSION REVIEW | {page} | {asset} | {detail}")

print(f"CHECKED | {len(paths)} image files | {len(flagged)} format mismatches")
print("Quality scores are indicative only; no image has been re-encoded or replaced.")
# Incorrect HTML aspect ratios can cause visible layout shifts and distortion.
# Treat them as regressions; intentionally smaller source sizes remain warnings.
if mismatches:
    raise SystemExit(f"FAIL: {len(mismatches)} HTML image aspect ratios differ from source files")
print("HTML photo aspect check: PASS")
