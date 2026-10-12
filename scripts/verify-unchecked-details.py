#!/usr/bin/env python3
"""Browser QA for a separate, not-yet-reviewed group of published detail pages.

This is not a content comparison, a redesign, or a crawler-identity test.
"""
import json
import os
import shutil
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "https://edinburgh-walking-tour.scotlandkorea.workers.dev"
OUT = Path(os.environ.get("EW_UNCHECKED_OUTPUT", "/tmp/ew-unchecked-detail-qa"))
OUT.mkdir(parents=True, exist_ok=True)

VIEWPORTS = (
    ("mobile", 390, 844),
    ("tablet", 820, 1180),
    ("desktop", 1366, 768),
)

# Excludes the 15 detail pages already passed in the existing browser workflow.
SCENARIOS = (
    ("st_giles", "/places/st-giles.html", 0),
    ("thistle_chapel", "/places/st-giles-thistle-chapel.html", 0),
    ("greyfriars_bobby", "/places/greyfriars-bobby.html", 1),
    ("heart_midlothian", "/places/royal-mile-heart-midlothian.html", 1),
    ("canongate_kirk", "/places/canongate-kirk-stories.html", 8),
    ("robert_fergusson", "/places/canongate-robert-fergusson.html", 1),
    ("glencoe_three_ways", "/scotland/places/glencoe-three-ways.html", 0),
    ("kelvingrove", "/scotland/places/glasgow/kelvingrove.html", 0),
    ("falkland_palace", "/scotland/places/falkland-palace.html", 0),
    ("pitlochry", "/scotland/places/pitlochry.html", 0),
    ("st_andrews_cathedral", "/st-andrews/st-andrews-cathedral.html", 0),
    ("fife_coastal_sections", "/travel/fife-coastal-path-sections.html", 0),
    ("melrose", "/scotland/places/melrose.html", 0),
)


def require(condition, text):
    if not condition:
        raise AssertionError(text)


def inspect_page(context, viewport, slug, path, minimum_photos):
    page = context.new_page()
    row = {"viewport": viewport, "path": path, "slug": slug, "status": "PENDING"}
    try:
        response = page.goto(BASE + path, wait_until="domcontentloaded", timeout=42000)
        require(response and response.status == 200, "public HTTP status is not 200")
        page.locator("main").wait_for(state="visible", timeout=12000)
        require(page.locator("main").count() == 1, "missing or multiple main landmarks")
        h1 = page.locator("h1")
        require(h1.count() == 1 and bool(h1.first.inner_text().strip()), "missing H1")
        row["heading"] = h1.first.inner_text().strip()
        brand = page.locator(".site-header .brand span").last
        require(brand.inner_text().strip() == "걸어서 에든버러", "shared brand mismatch")
        page.evaluate("() => document.fonts.ready")
        page.wait_for_timeout(220)

        def measure_overflow():
            return page.evaluate("""() => Math.max(0,
              document.documentElement.scrollWidth - window.innerWidth,
              document.body.scrollWidth - window.innerWidth)""")

        initial = measure_overflow()
        require(initial <= 2, f"document horizontal overflow before photos: {initial}px")
        row["overflowBeforePx"] = initial

        images = page.locator("main img[src], section.hero img[src], .detail-intro img[src], .page-hero img[src]")
        num_images = images.count()
        row["expectedAtLeast"] = minimum_photos
        row["imageCount"] = num_images
        require(num_images >= minimum_photos,
                f"expected {minimum_photos} photos; found {num_images}")
        checked = []
        for i in range(num_images):
            img = images.nth(i)
            source = img.get_attribute("src") or ""
            if source.startswith("data:") or source.startswith("blob:"):
                continue
            img.scroll_into_view_if_needed(timeout=12000)
            img.evaluate("""img => new Promise(done => {
                if (img.complete) return done();
                img.addEventListener('load', done, {once:true});
                img.addEventListener('error', done, {once:true});
                setTimeout(done, 8500);
            })""")
            record = img.evaluate("""img => ({
                src: img.getAttribute('src'),
                loaded: img.complete && img.naturalWidth > 0,
                width: img.naturalWidth
            })""")
            checked.append(record)
        row["imagesChecked"] = len(checked)
        row["imagesLoaded"] = sum(bool(x["loaded"]) for x in checked)
        row["imagesFailed"] = [x["src"] for x in checked if not x["loaded"]]
        require(not row["imagesFailed"],
                "some photos failed loading: " + repr(row["imagesFailed"]))
        after = measure_overflow()
        require(after <= 2, f"document horizontal overflow after photos: {after}px")
        row["overflowAfterPx"] = after

        # Only inspect genuinely visible links; intentional scrolling story tabs are allowed.
        row["internalLinkCount"] = page.locator("main a[href^='/']").count()
        row["status"] = "PASS"
    except Exception as ex:
        row["status"] = "FAIL"
        row["error"] = str(ex)[:1000]
        try:
            page.screenshot(path=str(OUT / f"error-{viewport}-{slug}.png"),
                            animations="disabled", timeout=10000)
        except Exception:
            pass
    finally:
        page.close()
    return row


def main():
    chrome = (os.environ.get("CHROME_BIN") or shutil.which("google-chrome")
              or shutil.which("google-chrome-stable") or shutil.which("chromium"))
    if not chrome:
        print("ERROR: system Chrome not found")
        return 2

    results = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            executable_path=chrome, headless=True, args=["--no-sandbox"])
        try:
            for name, width, height in VIEWPORTS:
                context = browser.new_context(
                    viewport={"width": width, "height": height},
                    device_scale_factor=1,
                    is_mobile=(name == "mobile"),
                    has_touch=(name != "desktop"),
                    locale="ko-KR",
                )
                try:
                    for slug, path, minimum in SCENARIOS:
                        results.append(inspect_page(context, name, slug, path, minimum))
                finally:
                    context.close()
        finally:
            browser.close()

    summary = {
        "site": BASE,
        "scope": "13 previously unchecked detail pages; original content unchanged",
        "results": results,
        "passed": sum(x["status"] == "PASS" for x in results),
        "failed": sum(x["status"] != "PASS" for x in results),
    }
    (OUT / "results.json").write_text(
        json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 1 if summary["failed"] else 0


if __name__ == "__main__":
    sys.exit(main())
