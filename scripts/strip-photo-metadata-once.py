"""One-time lossless removal of EXIF and XMP from four verified JPEG files.

Do not re-encode photographs. Prove byte-for-byte identical decoded RGB
pixels, dimensions and orientation before writing any file.
"""
from io import BytesIO
from pathlib import Path
from PIL import Image

PHOTOS = [
    Path("assets/heart-of-midlothian.jpg"),
    Path("assets/princes-street-gardens/20160602_143215.jpg"),
    Path("assets/princes-street-gardens/20180626_152029.jpg"),
    Path("assets/robert-fergusson-writers-museum-paving.jpg"),
]

def remove_exif_xmp(data):
    assert data[:2] == b"\xff\xd8", "Not JPEG"
    out = bytearray(data[:2])
    pos = 2
    removed = []
    while pos < len(data):
        segment_begin = pos
        if data[pos] != 0xff:
            raise ValueError("Unexpected marker before JPEG image data")
        while pos < len(data) and data[pos] == 0xff:
            pos += 1
        if pos >= len(data):
            raise ValueError("Truncated JPEG marker")
        marker = data[pos]
        pos += 1
        if marker in (0xd9, 0xda):
            out.extend(data[segment_begin:])
            break
        if marker in (0x01, *range(0xd0, 0xd8)):
            out.extend(data[segment_begin:pos])
            continue
        if pos + 2 > len(data):
            raise ValueError("Truncated JPEG segment header")
        length = int.from_bytes(data[pos:pos+2], "big")
        if length < 2 or pos + length > len(data):
            raise ValueError("Invalid JPEG segment size")
        payload = data[pos+2:pos+length]
        if marker == 0xe1 and (
            payload.startswith(b"Exif\x00\x00")
            or payload.startswith(b"http://ns.adobe.com/xap/1.0/\x00")
        ):
            removed.append("EXIF" if payload.startswith(b"Exif") else "XMP")
        else:
            out.extend(data[segment_begin:pos+length])
        pos += length
    return bytes(out), removed

replacements = {}
for photo in PHOTOS:
    original = photo.read_bytes()
    with Image.open(BytesIO(original)) as img:
        if img.format not in ("JPEG", "MPO"):
            raise ValueError("Unexpected image type: " + str(photo))
        orientation = img.getexif().get(274, 1)
        if orientation != 1:
            raise ValueError("Unsafe EXIF orientation: " + str(photo))
        img.load()
        width_height = img.size
        old_pixels = img.convert("RGB").tobytes()
    cleaned, removed = remove_exif_xmp(original)
    if not removed:
        print("ALREADY CLEAN: " + str(photo))
        continue
    with Image.open(BytesIO(cleaned)) as img:
        img.load()
        if img.size != width_height:
            raise ValueError("Dimensions changed: " + str(photo))
        if img.getexif():
            raise ValueError("EXIF remained: " + str(photo))
        if img.convert("RGB").tobytes() != old_pixels:
            raise ValueError("Decoded pixels changed: " + str(photo))
    replacements[photo] = cleaned
    print(f"VERIFIED PIXEL IDENTICAL: {photo} | removed {','.join(removed)} "
          f"| {len(original)-len(cleaned)} metadata bytes")

# Nothing changes unless all candidate photographs have passed all tests.
for photo, cleaned in replacements.items():
    photo.write_bytes(cleaned)
print(f"SUCCESS: {len(replacements)} JPEGs scrubbed losslessly; no re-encoding.")
