#!/usr/bin/env python3
"""Read-only public-site performance diagnostic, using synthetic Chrome profiles.

Results are lab estimates, NOT field Core Web Vitals or actual phone speeds.
Avoid crawler impersonation, Googlebot user agents and code/content changes.
"""
import json
import os
import shutil
import sys
import time
from urllib.request import Request, urlopen
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

BASE = "https://edinburgh-walking-tour.scotlandkorea.workers.dev"
OUT = Path(os.environ.get("EW_PERFORMANCE_OUTPUT", "/tmp/ew-public-performance"))
OUT.mkdir(parents=True, exist_ok=True)
SCENARIOS = [
    ("mobile_home_slow4g", "/", 390, 844, True),
    ("mobile_st_giles_slow4g", "/places/st-giles.html", 390, 844, True),
    ("desktop_home_unthrottled", "/", 1366, 768, False),
]
OBSERVER = r"""
(() => {
  window.__ewLabVitals = {lcpMs: null, lcpTag: null, lcpUrl: null, cls: 0};
  try {
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        window.__ewLabVitals.lcpMs = Math.round(entry.startTime);
        window.__ewLabVitals.lcpTag = entry.element?.tagName || null;
        window.__ewLabVitals.lcpUrl = entry.url || null;
      }
    }).observe({type: 'largest-contentful-paint', buffered: true});
  } catch (error) {}
  try {
    new PerformanceObserver(list => {
      for (const entry of list.getEntries())
        if (!entry.hadRecentInput) window.__ewLabVitals.cls += entry.value;
    }).observe({type: 'layout-shift', buffered: true});
  } catch (error) {}
})();
"""


def measure(browser, scenario):
    name, pathname, width, height, throttled = scenario
    context = browser.new_context(
        viewport={"width": width, "height": height},
        device_scale_factor=1,
        is_mobile=throttled,
        has_touch=throttled,
        locale="ko-KR",
        service_workers="block",
        extra_http_headers={"X-EW-QA": "Synthetic performance check"},
    )
    context.add_init_script(OBSERVER)
    page = context.new_page()
    session = context.new_cdp_session(page)
    session.send("Network.enable")
    records = {}
    by_request = {}
    errors = []

    def started(event):
        req = event.get("request", {})
        by_request[event["requestId"]] = {
            "url": req.get("url", ""),
            "resourceType": event.get("type", "Other"),
            "status": None,
            "bytes": 0,
        }

    def response_received(event):
        item = by_request.get(event["requestId"])
        if item:
            item["status"] = event.get("response", {}).get("status")
            item["mime"] = event.get("response", {}).get("mimeType")

    def finished(event):
        item = by_request.get(event["requestId"])
        if item:
            item["bytes"] = int(event.get("encodedDataLength", 0))
            records[event["requestId"]] = item

    def failed(event):
        item = by_request.get(event["requestId"])
        if item:
            errors.append({
                "url": item["url"][:170],
                "reason": event.get("errorText", "unknown"),
            })

    session.on("Network.requestWillBeSent", started)
    session.on("Network.responseReceived", response_received)
    session.on("Network.loadingFinished", finished)
    session.on("Network.loadingFailed", failed)

    # Deterministic repeatable lab profile; not an approximation of any
    # particular person's mobile carrier connection or device performance.
    if throttled:
        session.send("Network.emulateNetworkConditions", {
            "offline": False,
            "latency": 150,
            "downloadThroughput": 200000,
            "uploadThroughput": 75000,
            "connectionType": "cellular4g",
        })
        session.send("Emulation.setCPUThrottlingRate", {"rate": 4})

    url = BASE + pathname
    result = {"scenario": name, "url": url,
              "profile": "150 ms RTT, ~1.6 Mbps download, CPU 4x slowdown" if throttled
                         else "GitHub-hosted Chrome no synthetic throttling",
              "status": "PENDING"}
    try:
        response = page.goto(url, wait_until="domcontentloaded", timeout=60000)
        result["httpStatus"] = response.status if response else None
        page.wait_for_timeout(1800)
        try:
            page.wait_for_load_state("load", timeout=30000)
        except Exception:
            pass
        if pathname == "/":
            page.wait_for_function(
                "() => {const img=document.querySelector('.hero picture img'); return !!img && img.complete && img.naturalWidth>0}",
                timeout=50000,
            )
            page.wait_for_timeout(1000)
        result["metrics"] = page.evaluate(
            """() => {
                const nav = performance.getEntriesByType('navigation')[0];
                const paint = performance.getEntriesByType('paint');
                const fcp = paint.find(p => p.name === 'first-contentful-paint');
                const hero = document.querySelector('.hero picture img');
                return {
                  domContentLoadedMs: Math.round(nav?.domContentLoadedEventEnd||0),
                  loadEventMs: Math.round(nav?.loadEventEnd||0),
                  firstContentfulPaintMs: fcp ? Math.round(fcp.startTime) : null,
                  largestContentfulPaintMs: window.__ewLabVitals?.lcpMs ?? null,
                  largestContentfulPaintTag: window.__ewLabVitals?.lcpTag ?? null,
                  largestContentfulPaintUrl: window.__ewLabVitals?.lcpUrl ?? null,
                  layoutShiftScore: +(window.__ewLabVitals?.cls||0).toFixed(4),
                  heroComplete: hero ? hero.complete && hero.naturalWidth>0 : null,
                  galleryImages: document.querySelectorAll('#tourGallery img').length,
                  initialLoadedGalleryImages: [...document.querySelectorAll('#tourGallery img')]
                    .filter(img=>img.complete && img.naturalWidth>0).length,
                  horizontalOverflowPx: Math.max(0,document.documentElement.scrollWidth-innerWidth)
                };
            }"""
        )
        # First-screen network request totals only; no interaction or scroll.
        completed = [x for x in records.values() if x.get("status")]
        first_party = [x for x in completed if urlparse(x["url"]).netloc.endswith("scotlandkorea.workers.dev")]
        result["network"] = {
            "totalRequests": len(completed),
            "firstPartyRequests": len(first_party),
            "firstPartyTransferredKiB": round(sum(x["bytes"] for x in first_party) / 1024, 1),
            "firstPartyImageTransferredKiB": round(
                sum(x["bytes"] for x in first_party if x.get("resourceType") == "Image") / 1024, 1),
            "largestRequests": [
                {"path": urlparse(x["url"]).path, "type": x.get("resourceType"),
                 "httpStatus": x["status"], "transferredKiB": round(x["bytes"] / 1024, 1)}
                for x in sorted(first_party, key=lambda x: x["bytes"], reverse=True)[:10]
            ],
            "requestErrors": errors[:8],
        }
        if pathname == "/":
            # A modern browser must actually select the compact source.
            # The original PNG continues to exist as the picture fallback.
            modern = [x for x in completed
                      if x.get("resourceType") == "Image"
                      and "hero-" in x["url"] and x["url"].endswith(".webp")]
            result["network"]["optimizedHeroSelected"] = bool(modern)
            result["network"]["originalHeroPngDownloaded"] = any(
                x.get("resourceType") == "Image"
                and x["url"].endswith(".png")
                and "/assets/" in x["url"]
                for x in completed
            )
            result["network"]["firstScreenUnderOneMiB"] = (
                sum(x["bytes"] for x in first_party) < 1024 * 1024
            )
            result["status"] = (
                "PASS" if result["httpStatus"] == 200 and modern
                and not result["network"]["originalHeroPngDownloaded"] else "FAIL"
            )
        else:
            result["status"] = "PASS" if result["httpStatus"] == 200 else "FAIL"
        page.screenshot(path=str(OUT / (name+".png")), animations="disabled", timeout=15000)
    except Exception as exc:
        result["status"] = "FAIL"
        result["error"] = str(exc)[:1200]
        try:
            page.screenshot(path=str(OUT / (name+"-failure.png")), timeout=6000)
        except Exception:
            pass
    finally:
        context.close()
    return result


def main():
    binary = (os.environ.get("CHROME_BIN") or shutil.which("google-chrome")
              or shutil.which("google-chrome-stable") or shutil.which("chromium"))
    if not binary:
        print("ERROR: system Chrome was not found")
        return 2
    # On a publication push Cloudflare can finish after GitHub CI starts.
    # Wait for the actual public HTML to advertise the new optimized sources.
    # This deliberately avoids reporting pre-deployment measurements.
    optimized_live = False
    for _ in range(24):
        try:
            req = Request(BASE + "/", headers={
                "User-Agent": "EW-Performance-Lab/1.0",
                "Cache-Control": "no-cache",
            })
            with urlopen(req, timeout=12) as reply:
                body = reply.read().decode("utf-8", errors="replace")
            optimized_live = ('srcset="/assets/hero-mobile-optimized.webp"' in body
                              and 'srcset="/assets/hero-desktop-optimized.webp"' in body)
            if optimized_live:
                break
        except Exception as exc:
            print("Retrying public rollout check:", type(exc).__name__, flush=True)
        time.sleep(4)
    if not optimized_live:
        print("ERROR: optimized hero HTML is not yet present on public site")
        return 2
    results = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=binary,
                                             headless=True, args=["--no-sandbox"])
        try:
            for scenario in SCENARIOS:
                results.append(measure(browser, scenario))
        finally:
            browser.close()
    payload = {"note": "Synthetic lab measurements only; not real-device CWV, LCP field data, INP or PageSpeed score.",
               "scenarios": results}
    (OUT / "report.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 1 if any(r["status"] != "PASS" for r in results) else 0


if __name__ == "__main__":
    sys.exit(main())
