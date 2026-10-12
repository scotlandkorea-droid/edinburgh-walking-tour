#!/usr/bin/env python3
"""Read-only public Chrome navigation journeys, distinct from homepage/photograph QA.

Test real clicks in multiple viewing contexts across mobile, tablet and desktop.
Do not write to any website. Explicitly avoid impersonating crawlers.
"""
import json
import os
import shutil
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "https://edinburgh-walking-tour.scotlandkorea.workers.dev"
OUT = Path(os.environ.get("EW_NAV_QA_OUTPUT", "/tmp/ew-navigation-qa"))
OUT.mkdir(parents=True, exist_ok=True)
VIEWPORTS = (("mobile", 390, 844), ("tablet", 820, 1180), ("desktop", 1366, 768))
RESULTS = []


def checked(condition, description):
    if not condition:
        raise AssertionError(description)


def arrive(page, path):
    response = page.goto(BASE + path, wait_until="domcontentloaded", timeout=40000)
    checked(response and response.status == 200, f"{path}: public HTTP 200")
    page.locator(".site-header .brand").wait_for(state="visible", timeout=18000)
    checked(page.locator(".site-header .brand span").last.inner_text().strip() == "걸어서 에든버러",
            f"{path}: shared header brand is missing")
    page.locator("main").wait_for(state="visible", timeout=10000)
    page.wait_for_timeout(220)
    return response


def no_document_overflow(page, label):
    state = page.evaluate("""() => ({
        innerWidth, documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth
    })""")
    delta = max(0, state["documentWidth"] - state["innerWidth"])
    checked(delta <= 2, f"{label}: document-level overflow {delta}px")
    return delta


def run_case(browser, device, width, height, name, test):
    context = browser.new_context(
        viewport={"width": width, "height": height}, device_scale_factor=1,
        is_mobile=(device == "mobile"), has_touch=(device != "desktop"), locale="ko-KR",
    )
    page = context.new_page()
    row = {"device": device, "scenario": name, "status": "PENDING", "checks": []}

    def mark(description):
        row["checks"].append(description)
        row.setdefault("overflowPx", []).append(no_document_overflow(page, f"{device} {name}"))

    try:
        test(page, mark)
        row["status"] = "PASS"
        page.screenshot(path=str(OUT / f"{device}-{name}.png"),
                        animations="disabled", timeout=14000)
    except Exception as exc:
        row["status"] = "FAIL"
        row["error"] = str(exc)[:1400]
        try:
            page.screenshot(path=str(OUT / f"{device}-{name}-failure.png"),
                            animations="disabled", timeout=9000)
        except Exception:
            pass
    finally:
        RESULTS.append(row)
        context.close()


def hubs(page, mark):
    arrive(page, "/edinburgh/places.html")
    checked(page.locator(".explore-tabs .explore-tab").count() == 3,
            "places: all three explore tabs present")
    mark("places hub accessible and responsive")
    page.locator('.explore-tabs a[href="/edinburgh/themes.html"]').click()
    page.wait_for_url("**/edinburgh/themes.html")
    checked(page.locator("main h1").inner_text().strip() == "테마로 보기",
            "themes tab goes to themes hub")
    mark("places -> themes tab")
    page.locator('.explore-tabs a[href="/edinburgh/people.html"]').click()
    page.wait_for_url("**/edinburgh/people.html")
    checked(page.locator("main h1").inner_text().strip() == "인물로 보기",
            "people tab goes to people hub")
    checked(page.locator('a[href*="burke-and-hare"]').count() == 0,
            "retired Burke and Hare must not return as a people entry")
    mark("themes -> people tab, retired entry excluded")


def people(page, mark):
    arrive(page, "/edinburgh/people/arthur-conan-doyle.html")
    checked(page.locator("main p").first.inner_text().startswith("Arthur Conan Doyle"),
            "approved Conan Doyle introduction must remain")
    mark("Conan Doyle profile and opening text")
    nav = page.locator('.people-linear-nav [href="/edinburgh/people/james-clerk-maxwell.html"]')
    nav.wait_for(state="visible", timeout=12000)
    nav.click()
    page.wait_for_url("**/edinburgh/people/james-clerk-maxwell.html")
    checked(page.locator("main").inner_text().find("맥스웰") >= 0, "people next target")
    mark("people previous/next works")


def themes(page, mark):
    arrive(page, "/edinburgh/themes/reformation.html")
    mark("Reformation theme responsive")
    page.locator('.theme-linear-nav [href="/edinburgh/themes/literary-city.html"]').click()
    page.wait_for_url("**/edinburgh/themes/literary-city.html")
    checked("문학" in page.title() or "문학" in page.locator("h1").first.inner_text(),
            "theme next target")
    mark("theme previous/next works")


def dual_context(page, mark):
    path = "/places/canongate-adam-smith.html"
    arrive(page, path + "#place-nav")
    page.wait_for_function("""() => {
      const nav=document.querySelector('.page-nav[data-nav-system="place"]');
      return nav && getComputedStyle(nav).display!=='none';
    }""", timeout=15000)
    checked(not page.locator(".story-series-tabs.tour-context-only").is_visible(),
            "place browsing must hide the tour story tabs")
    checked(page.locator(".place-map-link-row a").is_visible(),
            "map link must remain visible in place context")
    links=page.locator('.page-nav[data-nav-system="place"] a[href$="#place-nav"]')
    checked(links.count() > 0, "place next/previous must preserve #place-nav")
    mark("Canongate place context hides tour-only tabs and retains map")
    page.goto(BASE + path + "#tour-nav", wait_until="domcontentloaded", timeout=40000)
    page.wait_for_function("""() => {
      const tabs=document.querySelector('.story-series-tabs');
      return tabs && getComputedStyle(tabs).display!=='none';
    }""", timeout=15000)
    checked(page.locator(".story-series-tabs").is_visible(),
            "tour browsing must show story tabs")
    checked(page.locator(".story-series-tabs .story-series-tab").count() >= 4,
            "tour story tabs should remain available")
    mark("Canongate tour context restores story tabs")


def st_andrews(page, mark):
    arrive(page, "/st-andrews/st-andrews-castle.html")
    tabs = page.locator('.story-series-tabs[aria-label="세인트앤드루스 워킹투어 목록"]')
    checked(tabs.locator(".story-series-tab").count() >= 9,
            "St Andrews should list the walking tour chapters")
    mark("St Andrews chapter list responsive")
    tabs.locator('a[href="/st-andrews/st-andrews-cathedral.html"]').click()
    page.wait_for_url("**/st-andrews/st-andrews-cathedral.html*")
    checked("대성당" in page.locator("h1").first.inner_text(), "St Andrews cathedral navigation")
    mark("St Andrews chapter navigation works")


def glasgow(page, mark):
    arrive(page, "/scotland/places/glasgow/glasgow-university.html")
    checked(page.locator(".story-series-tabs .story-series-tab").count() >= 10,
            "Glasgow walking chapters absent")
    mark("Glasgow chapter list responsive")
    page.locator('a.story-next[href="/scotland/places/glasgow/kelvingrove.html"]').click()
    page.wait_for_url("**/scotland/places/glasgow/kelvingrove.html*")
    checked("켈빈그로브" in page.locator("h1").first.inner_text(), "Glasgow next article")
    mark("Glasgow next article works")


def travel(page, mark):
    arrive(page, "/travel/destinations/highlands.html")
    mark("Highlands chapter responsive")
    page.locator('a[rel="next"][href="/travel/destinations/skye-islands.html"]').click()
    page.wait_for_url("**/travel/destinations/skye-islands.html")
    checked("스카이" in page.locator("h1").first.inner_text(), "travel next chapter")
    mark("travel destination next article works")


JOURNEYS = (
    ("explore_hubs", hubs),
    ("people_next", people),
    ("theme_next", themes),
    ("canongate_context", dual_context),
    ("st_andrews_chapters", st_andrews),
    ("glasgow_chapters", glasgow),
    ("travel_destinations", travel),
)


def main():
    browser_bin = (os.environ.get("CHROME_BIN") or shutil.which("google-chrome")
                   or shutil.which("google-chrome-stable") or shutil.which("chromium"))
    if not browser_bin:
        print("ERROR: system Chrome unavailable")
        return 2
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=browser_bin, headless=True,
                                     args=["--no-sandbox"])
        try:
            for device, width, height in VIEWPORTS:
                for name, journey in JOURNEYS:
                    run_case(browser, device, width, height, name, journey)
        finally:
            browser.close()
    report = {
        "site": BASE,
        "purpose": "Real public-browser navigation and responsive smoke check; no site changes",
        "screens": RESULTS,
        "summary": {
            "passed": sum(row["status"] == "PASS" for row in RESULTS),
            "failed": sum(row["status"] != "PASS" for row in RESULTS)
        }
    }
    (OUT / "results.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n",
                                      encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if report["summary"]["failed"] else 0


if __name__ == "__main__":
    sys.exit(main())
