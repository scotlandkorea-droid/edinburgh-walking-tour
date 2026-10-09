"""One-time, atomic cleanup of four JPEG photographs saved with .png names.

The photo bytes themselves are copied unchanged. After updating all tracked
public references, old URLs are preserved as Worker 301 redirects. No image
is re-encoded; every copy is SHA-256 compared before old files are deleted.
"""
from __future__ import annotations
import hashlib
import json
import subprocess
from pathlib import Path

renames = {
    "assets/city-chambers-courtyard-18363.png": "assets/city-chambers-courtyard-18363.jpg",
    "assets/city-chambers-front-18362.png": "assets/city-chambers-front-18362.jpg",
    "assets/new-college/john-knox-statue-final.png": "assets/new-college/john-knox-statue-final.jpg",
    "assets/new-college/new-college-courtyard.png": "assets/new-college/new-college-courtyard.jpg",
}

def replace_once(text: str, before: str, after: str, file: str) -> str:
    if text.count(before) != 1:
        raise ValueError(f"{file}: expected one match, got {text.count(before)}: {before[:65]}")
    return text.replace(before, after)

# Verify every input is the expected JPEG, and that no destination is occupied.
original_bytes = {}
for old, new in renames.items():
    old_path, new_path = Path(old), Path(new)
    if not old_path.is_file() or new_path.exists():
        raise RuntimeError(f"Unexpected file state: {old} -> {new}")
    data = old_path.read_bytes()
    if data[:3] != b"\xff\xd8\xff" or data[-2:] != b"\xff\xd9":
        raise RuntimeError(f"Source is not a complete JPEG: {old}")
    original_bytes[old] = data

textual_suffixes = {".html", ".css", ".js", ".mjs", ".json", ".jsonc", ".xml", ".md", ".txt"}
tracked = [x.decode("utf-8") for x in
           subprocess.check_output(["git", "ls-files", "-z"]).split(b"\x00") if x]
pending = {}
for filename in tracked:
    p = Path(filename)
    if (p.suffix.lower() not in textual_suffixes
            or filename.startswith(("scripts/", ".github/"))
            or filename in ("worker.js", "wrangler.jsonc")):
        continue
    original = p.read_text(encoding="utf-8")
    updated = original
    for old, new in renames.items():
        updated = updated.replace(old, new)
    if updated != original:
        pending[filename] = updated

# The public image references cannot be silently forgotten.
affected_pages = [p for p in pending if p.endswith(".html")]
if not affected_pages:
    raise RuntimeError("No public HTML image references found; refusing to migrate")

# One shared place/asset redirect registry, rather than four ad-hoc handlers.
worker = Path("worker.js").read_text(encoding="utf-8")
worker = replace_once(worker, "legacyPlaceRedirects", "legacyRedirects", "worker.js")
worker = worker.replace("legacyPlaceRedirects", "legacyRedirects")
anchor = '        "/scotland/places/melrose-abbey.html": "/scotland/places/melrose.html"'
redirect_rows = ",\n" + ",\n".join(
    f'        "/{old}": "/{new}"' for old, new in renames.items()
)
worker = replace_once(worker, anchor, anchor + redirect_rows, "worker.js")
pending["worker.js"] = worker

wrangler = Path("wrangler.jsonc").read_text(encoding="utf-8")
anchor = '      "/assets/site.css",'
prefix = "".join(f'      "/{old}",\n' for old in renames)
wrangler = replace_once(wrangler, anchor, prefix + anchor, "wrangler.jsonc")
pending["wrangler.jsonc"] = wrangler

audit = Path("scripts/audit-site.mjs").read_text(encoding="utf-8")
anchor = "  '/scotland/index.html'\n]);"
new_urls = ",\n" + ",\n".join(f"  '/{old}'" for old in renames)
audit = replace_once(audit, anchor,
                     "  '/scotland/index.html'" + new_urls + "\n]);",
                     "scripts/audit-site.mjs")

# Check the actual Worker responses, not merely data-table membership.
needle = "console.log('Audited ' + pages.length"
test_code = """
// Test legacy JPEG-format correction as a real Worker GET/HEAD redirect.
const {default: routingWorker}=await import(
  'data:text/javascript;base64,'+Buffer.from(workerSource).toString('base64'));
const photoRedirects=new Map([
""" + ",\n".join(
    f'  ["/{old}", "/{new}"]' for old, new in renames.items()
) + """
]);
for(const [from,to] of photoRedirects){
  if(!existing.has(to)) issues.push('missing corrected image '+to);
  for(const method of ['GET','HEAD']){
    const response=await routingWorker.fetch(
      new Request('https://example.test'+from+'?image-test=1',{method}),
      {ASSETS:{fetch:()=>{throw Error('Unexpected asset fetch on redirect')}}}
    );
    const destination=new URL(response.headers.get('location'));
    if(response.status!==301||destination.pathname!==to||
       destination.search!=='?image-test=1')
      issues.push('photo redirect failed: '+method+' '+from);
  }
}
console.log('Photo redirects: '+photoRedirects.size+' legacy URLs tested for GET/HEAD');
"""
audit = replace_once(audit, needle, test_code + "\n" + needle,
                     "scripts/audit-site.mjs")
pending["scripts/audit-site.mjs"] = audit

# Treat future mismatched extensions as a build failure.
quality = Path("scripts/audit-image-quality.py").read_text(encoding="utf-8")
anchor = 'if mismatches:\n    raise SystemExit'
quality = replace_once(quality, anchor,
    'if flagged:\n    raise SystemExit(f"FAIL: {len(flagged)} image extensions do not match their real format")\n'
    + anchor, "scripts/audit-image-quality.py")
pending["scripts/audit-image-quality.py"] = quality

# All text replacements have been prepared and validated before any write.
for filename, updated in pending.items():
    if not updated:
        raise RuntimeError("Unexpected empty output for " + filename)
    Path(filename).write_text(updated, encoding="utf-8")

for old, new in renames.items():
    Path(new).write_bytes(original_bytes[old])
    if hashlib.sha256(Path(new).read_bytes()).digest() != hashlib.sha256(original_bytes[old]).digest():
        raise RuntimeError("Byte-for-byte image copy failed: " + new)

for old in renames:
    Path(old).unlink()

for filename, content in pending.items():
    if Path(filename).read_text(encoding="utf-8") != content:
        raise RuntimeError("Text file write verification failed: " + filename)

for filename in tracked:
    p = Path(filename)
    if (p.suffix.lower() not in textual_suffixes or not p.exists() or
        filename.startswith(("scripts/", ".github/")) or filename == "worker.js"):
        continue
    text = p.read_text(encoding="utf-8")
    for old in renames:
        if old in text:
            raise RuntimeError("Old image reference remains: " + filename + " " + old)

print(f"BYTE-IDENTICAL JPEG RENAMES: {len(renames)}")
for old, new in renames.items():
    print(f"IMAGE MIGRATED: {old} -> {new} ({len(original_bytes[old])} identical bytes)")
print("UPDATED TEXT REFERENCES:", len(pending), "files; HTML pages:", len(affected_pages))
print("Public old URLs use 301 redirects; no layout, photo content or prose changed.")
