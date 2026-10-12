#!/usr/bin/env python3
"""Real-browser smoke test for the public website, not a static-code audit.

Runs against deployed Cloudflare Workers in Chrome at three viewport sizes.
Never changes page content, stores credentials, or spoofs Googlebot.
"""
import json
import os
import shutil
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "https://edinburgh-walking-tour.scotlandkorea.workers.dev/"
OUT = Path(os.environ.get("EW_BROWSER_QA_OUTPUT", "/tmp/ew-browser-qa"))
OUT.mkdir(parents=True, exist_ok=True)
VIEWPORTS = (
    ("mobile", 390, 844),
    ("tablet", 820, 1180),
    ("desktop", 1366, 768),
)
results = []


def ensure(condition, message):
    if not condition:
        raise AssertionError(message)


def smoke(browser, label, width, height):
    context = browser.new_context(
        viewport={"width": width, "height": height},
        device_scale_factor=1,
        is_mobile=(label == "mobile"),
        has_touch=(label != "desktop"),
        locale="ko-KR",
    )
    page = context.new_page()
    row = {"viewport": label, "width": width, "height": height, "checks": {}}

    def passed(name, value=True):
        ensure(value, label + ": " + name)
        row["checks"][name] = "PASS"

    try:
        response = page.goto(BASE, wait_until="domcontentloaded", timeout=45000)
        passed("public HTTP 200", bool(response and response.status == 200))
        passed("main title", "에든버러 워킹투어" in page.locator(".hero h1").inner_text())
        passed("new shared header brand", page.locator(".site-header .brand span").last.inner_text().strip() == "걸어서 에든버러")
        passed("homepage title joins brand and tour", page.title() == "걸어서 에든버러 | 에든버러 워킹투어·스코틀랜드 여행정보")
        lead = page.locator("#intro .lead").inner_text()
        passed("homepage introduction joins brand, tour and travel", all(
            token in lead for token in ("걸어서 에든버러", "에든버러 워킹투어", "스코틀랜드 여행정보")
        ))
        passed("footer retains walking tour label", page.locator("footer .foot a").inner_text().strip() == "에든버러 워킹투어")
        page.locator(".site-search-toggle").wait_for(state="attached", timeout=15000)
        passed("shared search script loaded")
        hero = page.locator(".hero picture img")
        page.wait_for_function(
            "() => {const i=document.querySelector('.hero picture img'); return i && i.complete && i.naturalWidth>0}",
            timeout=25000,
        )
        passed("hero image rendered")
        # Preserve the PNG fallback but ensure capable browsers choose WebP.
        selected_hero = hero.evaluate("(img) => img.currentSrc")
        expected_image = (
            "hero-mobile-optimized.webp" if label == "mobile"
            else "hero-desktop-optimized.webp"
        )
        passed("optimized Hero photo actually selected", expected_image in selected_hero)

        if label == "mobile":
            menu = page.locator("details.mobile-menu")
            summary = menu.locator("summary")
            summary.click()
            passed("mobile menu opens", menu.get_attribute("open") is not None)
            passed("menu first link visible", menu.locator("nav a").first.is_visible())
            summary.click()
            passed("mobile menu closes", menu.get_attribute("open") is None)

        toggle = page.locator(".site-search-toggle")
        toggle.click()
        panel = page.locator(".site-search-panel")
        passed("search opens", panel.is_visible())
        field = panel.locator("input[type=search]")
        field.fill("세인트 자일스")
        page.locator(".site-search-result").first.wait_for(state="visible", timeout=25000)
        passed("site search finds St Giles")
        panel.locator(".site-search-close").click()
        passed("search closes", not panel.is_visible())

        gallery = page.locator("#tourGallery")
        first_photo = gallery.locator(".photo-card img").first
        first_photo.scroll_into_view_if_needed(timeout=15000)
        first_photo.click(timeout=15000)
        page.wait_for_function(
            "() => document.querySelector('#lightbox')?.classList.contains('open')",
            timeout=30000,
        )
        passed("gallery image opens")
        layers = page.evaluate(
            """() => {
              const layer = sel => Number(getComputedStyle(document.querySelector(sel)).zIndex);
              return {header:layer('.site-header'),photo:layer('#lightbox'),map:layer('#routeMapModal')};
            }"""
        )
        passed("photo and map above header", layers["header"] < layers["photo"] < layers["map"])
        page.locator("#lightbox button").click()
        passed("gallery image closes", not page.locator("#lightbox").evaluate(
            "(el) => el.classList.contains('open')"
        ))

        # The existing responsive design uses swipe/scroll on mobile and tablet,
        # while the desktop exposes explicit previous/next arrow controls.
        if label == "desktop":
            next_button = page.locator(".gallery-arrow.next")
            passed("desktop gallery next button visible", next_button.is_visible())
            before_scroll = gallery.evaluate("(el) => el.scrollLeft")
            next_button.click()
            page.wait_for_timeout(900)
            after_scroll = gallery.evaluate("(el) => el.scrollLeft")
            passed("desktop gallery advances", after_scroll > before_scroll)
        else:
            passed(
                "touch gallery horizontally scrollable",
                gallery.evaluate(
                    "(el) => el.scrollWidth > el.clientWidth && "
                    "['auto', 'scroll'].includes(getComputedStyle(el).overflowX)"
                ),
            )
            before_scroll = gallery.evaluate("(el) => el.scrollLeft")
            gallery.evaluate("(el) => el.scrollBy({left: el.clientWidth * .6, behavior:'instant'})")
            page.wait_for_timeout(250)
            after_scroll = gallery.evaluate("(el) => el.scrollLeft")
            passed("touch gallery track advances", after_scroll > before_scroll)

        preview = page.locator("[data-route-preview]")
        preview.scroll_into_view_if_needed(timeout=15000)
        preview.click()
        modal = page.locator("#routeMapModal")
        passed("route-map dialog opens", modal.evaluate(
            "(el) => el.classList.contains('open') && el.getAttribute('aria-hidden')==='false'"
        ))
        modal.locator(".route-map-close").click()
        passed("route-map dialog closes", not modal.evaluate(
            "(el) => el.classList.contains('open')"
        ))

        row["measurements"] = page.evaluate(
            """() => ({
              transferResourceCount: performance.getEntriesByType('resource').length,
              firstContentfulPaintMs: Math.round(performance.getEntriesByType('paint')
                 .find(x=>x.name==='first-contentful-paint')?.startTime || 0),
              documentWidth: document.documentElement.scrollWidth,
              innerWidth: innerWidth
            })"""
        )
        privacy_link = page.locator(".contact-privacy-area > .privacy-notice-link")
        passed("single home privacy notice", privacy_link.count() == 1)
        computed_gap = privacy_link.evaluate(
            "(el) => getComputedStyle(el).marginTop"
        )
        passed("privacy notice gap is 24px", computed_gap == "24px")
        if label == "mobile":
            page.locator(".contact-box").screenshot(
                path=str(OUT / "mobile-contact-privacy.png"),
                animations="disabled",
                timeout=15000,
            )
        page.evaluate("window.scrollTo(0,0)")
        page.screenshot(path=str(OUT / (label + ".png")), animations="disabled")
        # Check that the same new header appears on real interior pages
        # without renaming the Saint Andrews tour itself.
        detail = context.new_page()
        try:
            response = detail.goto(BASE + "places/st-giles.html", wait_until="domcontentloaded", timeout=30000)
            passed("St Giles page HTTP 200", bool(response and response.status == 200))
            passed("St Giles page branded header", detail.locator(".site-header .brand span").last.inner_text().strip() == "걸어서 에든버러")
            passed("St Giles original title preserved", "세인트 자일스" in detail.title())
            response = detail.goto(BASE + "st-andrews/", wait_until="domcontentloaded", timeout=30000)
            passed("St Andrews page HTTP 200", bool(response and response.status == 200))
            passed("St Andrews shared brand header", detail.locator(".site-header .brand span").last.inner_text().strip() == "걸어서 에든버러")
            passed("St Andrews tour name preserved", "세인트앤드루스 워킹투어" in detail.title())
        finally:
            detail.close()
        row["status"] = "PASS"
    except Exception as exc:
        row["status"] = "FAIL"
        row["error"] = str(exc)[:1100]
        try:
            page.screenshot(path=str(OUT / (label + "-failure.png")), full_page=False, timeout=7000)
        except Exception:
            pass
    finally:
        results.append(row)
        context.close()


def main():
    binary = (
        os.environ.get("CHROME_BIN")
        or shutil.which("google-chrome")
        or shutil.which("google-chrome-stable")
        or shutil.which("chromium")
    )
    if not binary:
        print("ERROR: system Chrome is unavailable")
        return 2
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            executable_path=binary,
            headless=True,
            args=["--no-sandbox"],
        )
        try:
            for label, width, height in VIEWPORTS:
                smoke(browser, label, width, height)
        finally:
            browser.close()
    report = {"site": BASE, "note": "Synthetic Chrome tests are not a real-phone speed benchmark", "results": results}
    (OUT / "results.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if any(row["status"] != "PASS" for row in results) else 0


if __name__ == "__main__":
    sys.exit(main())
