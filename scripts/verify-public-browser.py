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


# Target previously unreviewed interior-page rendering instead of repeating
# the already completed homepage design checks. Leave public HTML untouched.
DETAIL_SCENARIOS = (
    ("st_giles_architecture_photo", "places/st-giles-architecture.html"),
    ("st_giles_glass_six_figures_photo", "places/st-giles-stained-glass.html"),
    ("st_giles_thistle_stalls_photo", "places/st-giles-thistle-chapel.html"),
    ("vennel_grassmarket_west_castle_photo", "edinburgh/places/vennel.html"),
    ("grassmarket_story", "places/grassmarket-burke-hare.html"),
    ("grassmarket_pub_photos", "places/grassmarket-pub-names.html"),
    ("grassmarket_covenanters_memorial", "places/grassmarket-executions-covenanters.html"),
    ("royal_mile_street_photos", "places/royal-mile.html"),
    ("last_public_execution_plaque", "edinburgh/themes/execution-sites.html"),
    ("greyfriars_covenanters_prison", "places/greyfriars-old-cemetery.html"),
    ("greyfriars_martyrs_monument", "places/greyfriars-covenanter-martyrs.html"),
    ("greyfriars_kirk", "places/greyfriars-kirk.html"),
    ("victoria_street", "edinburgh/places/victoria-street.html"),
    ("st_andrews_tour", "st-andrews/"),
    ("iona", "scotland/places/iona.html"),
    ("waverley_rail", "travel/train-waverley.html"),
    ("reading_hub", "travel/reading.html"),
    ("kilt_history", "travel/explainers/scottish-kilt-history.html"),
    ("scottish_clans", "travel/explainers/scottish-clans.html"),
    ("jacobite_clan_link", "travel/destinations/jacobite-footsteps.html"),
    ("jacobite_history", "travel/explainers/who-were-the-jacobites.html"),
    ("golf_reading", "travel/explainers/why-scotland-has-so-many-golf-courses.html"),
    ("golf_travel_deep_dive", "travel/destinations/golf.html"),
    ("scott_monument", "places/scott-monument.html"),
    ("arthurs_seat", "places/arthurs-seat.html"),
    ("city_chambers", "places/royal-mile-city-chambers.html"),
    ("canongate_worlds_end", "places/canongate-worlds-end.html"),
    ("adam_smith_grave_photos", "places/canongate-adam-smith.html"),
    ("robert_fergusson_stone_poem", "places/canongate-robert-fergusson.html"),
    ("new_college", "places/new-college.html"),
    ("st_andrews_old_course", "st-andrews/old-course.html"),
    ("deacon_brodie", "places/royal-mile-deacon-brodie.html"),
    ("skye_overview", "scotland/places/isle-of-skye.html"),
    ("skye_arrival_video", "scotland/places/isle-of-skye-arrival.html"),
    ("skye_fairy_pools", "scotland/places/isle-of-skye-cuillin-fairy-pools.html"),
    ("skye_mealt_falls_kilt_rock", "scotland/places/isle-of-skye-trotternish.html"),
    ("inverness_selected_photos", "scotland/places/inverness.html"),
    ("george_street_george_iv_photos", "edinburgh/places/george-street.html"),
    ("st_andrew_square_original_photos", "edinburgh/places/st-andrew-square.html"),
    ("john_knox_house_entrance_panels", "places/john-knox-house.html"),
)


# Pages with intended photographic content must not accidentally lose all
# their article images while still passing the layout/visibility checks.
PHOTO_MINIMUMS = {
    "places/st-giles-architecture.html": 1,
    "places/st-giles-stained-glass.html": 1,
    "places/st-giles-thistle-chapel.html": 2,
    "edinburgh/places/vennel.html": 1,
    "places/greyfriars-old-cemetery.html": 3,
    "places/grassmarket-executions-covenanters.html": 1,
    "places/grassmarket-pub-names.html": 5,
    "places/royal-mile.html": 2,
    "edinburgh/themes/execution-sites.html": 1,
    "places/greyfriars-covenanter-martyrs.html": 2,
    "places/scott-monument.html": 3,
    "places/arthurs-seat.html": 1,
    "places/royal-mile-city-chambers.html": 4,
    "places/canongate-worlds-end.html": 1,
    "places/canongate-adam-smith.html": 3,
    "places/canongate-robert-fergusson.html": 4,
    "places/new-college.html": 4,
    "st-andrews/old-course.html": 3,
    "places/royal-mile-deacon-brodie.html": 3,
    "scotland/places/isle-of-skye.html": 1,
    "scotland/places/inverness.html": 3,
    "edinburgh/places/george-street.html": 2,
    "edinburgh/places/st-andrew-square.html": 1,
    "places/john-knox-house.html": 2,
}


def detail_smoke(browser, label, width, height):
    """Validate rendered detail layouts and local photos at each viewport.

    Treat intentional scrollable tabs/breadcrumbs as normal; only document-level
    horizontal overflow is a regression. Photos are tested after lazy loading.
    """
    context = browser.new_context(
        viewport={"width": width, "height": height},
        device_scale_factor=1,
        is_mobile=(label == "mobile"),
        has_touch=(label != "desktop"),
        locale="ko-KR",
    )
    rows = []
    try:
        for slug, path in DETAIL_SCENARIOS:
            page = context.new_page()
            row = {"viewport": label, "page": path, "checks": {}, "status": "PENDING"}
            try:
                response = page.goto(BASE + path, wait_until="domcontentloaded", timeout=45000)
                ensure(response and response.status == 200, f"{label} {path}: HTTP status")
                row["checks"]["public HTTP 200"] = "PASS"

                header = page.locator(".site-header .brand span").last
                ensure(header.inner_text().strip() == "걸어서 에든버러",
                       f"{label} {path}: shared brand")
                row["checks"]["shared header"] = "PASS"
                ensure(page.locator("main").count() == 1 and page.locator("h1").count() >= 1,
                       f"{label} {path}: missing main or H1")
                row["checks"]["article landmark and heading"] = "PASS"
                page.evaluate("() => document.fonts.ready")
                page.wait_for_timeout(280)
                if path == "travel/reading.html":
                    cards = page.locator("main .travel-story-grid a.travel-story-card")
                    ensure(cards.count() == 9, f"{label} {path}: expected nine Reading cards")
                    ensure(cards.last.get_attribute("href") ==
                           "/travel/explainers/why-scotland-has-so-many-golf-courses.html?from=reading",
                           f"{label} {path}: golf reading link missing")
                    ensure(cards.last.locator(".travel-story-no").inner_text().strip() == "09",
                           f"{label} {path}: golf reading item not numbered 09")
                    row["checks"]["nine Reading cards, golf at 09"] = "PASS"
                if path == "travel/explainers/scottish-kilt-history.html":
                    ensure(page.locator("main article h2").count() == 10,
                           f"{label} {path}: complete kilt manuscript headings missing")
                    ensure("수백 년 동안 모습과 의미가 바뀌어 온 스코틀랜드의 역사라고요." in
                           page.locator("main article").inner_text(),
                           f"{label} {path}: concluding paragraph missing")
                    ensure(page.locator("main .deep-dive-return").get_attribute("href") ==
                           "/travel/reading.html",
                           f"{label} {path}: Reading return link missing")
                    row["checks"]["complete manuscript and Reading return"] = "PASS"

                if path == "travel/explainers/scottish-clans.html":
                    ensure(page.locator("main article h2").count() == 9,
                           f"{label} {path}: expected nine complete clan sections")
                    ensure(page.locator("main article h3").count() == 6,
                           f"{label} {path}: expected six named clans")
                    ensure("그 이름들은 지금도 성벽과 지명, 타탄, 그리고 사람들의 기억 속에 남아 있습니다." in
                           page.locator("main article").inner_text(),
                           f"{label} {path}: final manuscript paragraph missing")
                    ensure(page.locator("main .deep-dive-return").get_attribute("href") ==
                           "/travel/reading.html",
                           f"{label} {path}: Reading return link missing")
                    row["checks"]["complete original clan manuscript and navigation"] = "PASS"
                if path == "travel/destinations/jacobite-footsteps.html":
                    ensure(page.locator("main a[href='/travel/explainers/scottish-clans.html']").count() == 1,
                           f"{label} {path}: related clan article link missing")
                    row["checks"]["Jacobite to clan connection"] = "PASS"
                if path == "travel/explainers/who-were-the-jacobites.html":
                    ensure(page.locator("main article h2").count() == 11,
                           f"{label} {path}: full 11-section manuscript missing")
                    ensure("돌에 새겨진 이름들은 왕이 되려 했던 한 사람의 이름보다 훨씬 많습니다." in
                           page.locator("main article").inner_text(),
                           f"{label} {path}: last paragraph of manuscript missing")
                    ensure(page.locator("main .deep-dive-return").get_attribute("href") ==
                           "/travel/destinations/jacobite-footsteps.html",
                           f"{label} {path}: return to Jacobite travel missing")
                    row["checks"]["complete Jacobite manuscript and source return"] = "PASS"
                if path == "travel/destinations/jacobite-footsteps.html":
                    panel = page.locator("main a.further-reading-box")
                    ensure(panel.count() == 1 and panel.get_attribute("href") == "/travel/explainers/who-were-the-jacobites.html",
                           f"{label} {path}: full Jacobite deep-dive box missing")
                    row["checks"]["Jacobite travel to deep dive"] = "PASS"
                if path == "travel/explainers/why-scotland-has-so-many-golf-courses.html":
                    ensure(page.locator("main article h2").count() == 8,
                           f"{label} {path}: missing eight complete golf sections")
                    ensure(page.locator("main article h3").count() == 5,
                           f"{label} {path}: missing five golf-course types")
                    ensure("골프장이 마을 밖에 따로 있는 것이 아니라, 오랫동안 마을의 풍경 안에 함께 자리 잡고 있는 것입니다." in
                           page.locator("main article").inner_text(),
                           f"{label} {path}: original manuscript conclusion missing")
                    ensure(page.locator("main .deep-dive-return").get_attribute("href") ==
                           "/travel/destinations/golf.html",
                           f"{label} {path}: return to Golf travel missing")
                    row["checks"]["complete original golf manuscript and parent link"] = "PASS"
                if path == "travel/destinations/golf.html":
                    boxes = page.locator("main a.further-reading-box")
                    ensure(boxes.count() == 1 and boxes.get_attribute("href") == "/travel/explainers/why-scotland-has-so-many-golf-courses.html",
                           f"{label} {path}: golf deep-dive panel missing")
                    row["checks"]["golf travel deep-dive panel"] = "PASS"
                def dimensions():
                    return page.evaluate("""() => ({
                        viewportWidth: innerWidth,
                        documentWidth: document.documentElement.scrollWidth,
                        bodyWidth: document.body.scrollWidth,
                        articleWidth: Math.round(document.querySelector('main')?.getBoundingClientRect().width || 0)
                    })""")
                before = dimensions()
                overflow = max(0, before["documentWidth"] - before["viewportWidth"])
                row["dimensions"] = before
                row["horizontalOverflowPx"] = overflow
                ensure(overflow <= 2, f"{label} {path}: {overflow}px document overflow")
                row["checks"]["no document horizontal overflow"] = "PASS"

                # Editorial photos may live in the article or its preceding
                # page Hero (e.g. Arthur's Seat). Ignore unrelated header icons.
                # Scroll them to trigger normal lazy loading, including externals.
                photos = page.locator("main img[src], section.hero img[src]")
                photo_count = photos.count()
                minimum = PHOTO_MINIMUMS.get(path, 0)
                ensure(photo_count >= minimum,
                       f"{label} {path}: expected at least {minimum} article images, found {photo_count}")
                row["checks"]["intended article images present"] = "PASS"
                loaded = []
                for idx in range(photo_count):
                    img = photos.nth(idx)
                    source = img.get_attribute("src") or ""
                    if not (source.startswith("/") or source.startswith("../")
                            or source.startswith("./") or source.startswith("https://")):
                        continue
                    img.scroll_into_view_if_needed(timeout=10000)
                    try:
                        img.evaluate("""img => new Promise(resolve => {
                          if (img.complete) return resolve();
                          img.addEventListener('load', resolve, {once:true});
                          img.addEventListener('error', resolve, {once:true});
                          setTimeout(resolve, 9000);
                        })""")
                    except Exception:
                        pass
                    info = img.evaluate("""img => ({
                      src: img.getAttribute('src'),
                      loaded: img.complete && img.naturalWidth > 0,
                      naturalWidth: img.naturalWidth
                    })""")
                    loaded.append(info)
                row["articlePhotos"] = {"totalArticleImages": photo_count,
                                        "tested": len(loaded),
                                        "loaded": sum(bool(i["loaded"]) for i in loaded),
                                        "failed": [i["src"] for i in loaded if not i["loaded"]]}
                ensure(all(i["loaded"] for i in loaded),
                       f"{label} {path}: article image did not load")
                row["checks"]["article images load"] = "PASS"
                if path == "places/canongate-adam-smith.html":
                    expected = {
                        "/assets/adam-smith-grave-ground-marker-20261014.avif": 650,
                        "/assets/adam-smith-grave-overview-20261014.avif": 1008,
                        "/assets/adam-smith-grave-inscription-20261014.avif": 600,
                    }
                    observed = {i["src"]: i["naturalWidth"] for i in loaded}
                    ensure(len(loaded) == 3 and observed == expected,
                           f"{label} {path}: three Adam Smith grave photos not loaded")
                    ensure(page.locator("main article h2").count() == 7,
                           f"{label} {path}: original seven headings changed")
                    ensure('잔디 바닥에 "Adam Smith"' in page.locator("main article").inner_text(),
                           f"{label} {path}: ground marker directions do not match photo")
                    row["checks"]["Adam Smith marker, grave and inscription photos"] = "PASS"
                if path == "places/canongate-robert-fergusson.html":
                    expected = {
                        "/assets/robert-fergusson-statue-canongate-20261014.avif": 900,
                        "/assets/robert-fergusson-auld-reikie-stones-20261014.avif": 1140,
                        "/assets/robert-fergusson-birth-death-stone-20261014.avif": 893,
                        "/assets/robert-fergusson-writers-museum-paving.jpg": 1152,
                    }
                    photos = {img["src"]: img["naturalWidth"] for img in loaded}
                    ensure(len(loaded) == 4 and photos == expected,
                           f"{label} {path}: three new photos or original Writers Museum paving missing")
                    article_text = page.locator("main article").inner_text()
                    ensure("정다운 사람들이 저녁이면 모여 목과 입을 축이고" in article_text and
                           "1750년 에든버러 출생, 1774년 베들럼에서 사망" in article_text,
                           f"{label} {path}: Korean translation or stone memorial not published")
                    ensure(page.locator("main article h2").count() == 5,
                           f"{label} {path}: original five story headings changed")
                    row["checks"]["statue, six engraved lines, memorial and translation"] = "PASS"
                if path == "places/st-giles-thistle-chapel.html":
                    expected_images = {
                        "/assets/st-giles-thistle-chapel-stalls-20261012.jpg?v=20261013": 833,
                        "/assets/st-giles-thistle-chapel-royal-arms-20261014.jpg": 1152,
                    }
                    published_images = {i["src"]: i["naturalWidth"] for i in loaded}
                    ensure(len(loaded) == 2 and published_images == expected_images,
                           f"{label} {path}: Thistle Chapel stalls or royal arms photo missing")
                    row["checks"]["Thistle Chapel stalls and royal arms photos published"] = "PASS"

                if path == "edinburgh/places/vennel.html":
                    expected_images = {
                        "/assets/vennel-grassmarket-west-castle-view-20261014.jpg": 1396,
                    }
                    published_images = {i["src"]: i["naturalWidth"] for i in loaded}
                    ensure(len(loaded) == 1 and published_images == expected_images,
                           f"{label} {path}: Grassmarket west castle photo not published")
                    row["checks"]["Vennel west Grassmarket castle photo published"] = "PASS"

                if path == "places/greyfriars-old-cemetery.html":
                    expected_images = {
                        "/assets/greyfriars-covenanters-prison-gate-20261013.jpg": 1152,
                        "/assets/greyfriars-covenanters-prison-plaque-20261013.jpg": 1413,
                        "/assets/greyfriars-mortsafe-20261013.jpg": 1536,
                    }
                    published_images = {i["src"]: i["naturalWidth"] for i in loaded}
                    ensure(len(loaded) == 3 and published_images == expected_images,
                           f"{label} {path}: three original Greyfriars photos not published")
                    row["checks"]["three original Greyfriars photos published"] = "PASS"

                if path == "places/greyfriars-covenanter-martyrs.html":
                    expected_images = {
                        "/assets/greyfriars-covenanter-martyrs-monument-20261013.jpg": 1536,
                        "/assets/greyfriars-covenanter-martyrs-inscription-20261013.jpg": 1536,
                    }
                    published_images = {i["src"]: i["naturalWidth"] for i in loaded}
                    ensure(len(loaded) == 2 and published_images == expected_images,
                           f"{label} {path}: two original martyrs' monument photos not published")
                    row["checks"]["two original Greyfriars martyrs photos published"] = "PASS"

                if path == "scotland/places/inverness.html":
                    expected_images = {
                        "/assets/inverness-river-ness-church-spires-20261013.jpg": 1536,
                        "/assets/inverness-castle-during-restoration-20261013.jpg": 1328,
                        "/assets/inverness-river-ness-wooded-walk-20261013.jpg": 1536,
                    }
                    published_images = {i["src"]: i["naturalWidth"] for i in loaded}
                    ensure(len(loaded) == 3 and published_images == expected_images,
                           f"{label} {path}: three original Inverness photos not published")
                    row["checks"]["three original Inverness photos published"] = "PASS"

                if path == "places/grassmarket-pub-names.html":
                    expected_photos = (
                        ("grassmarket-last-drop-exterior-20261013.jpg", 1320),
                        ("grassmarket-last-drop-entrance-plaque-20261013.jpg", 710),
                        ("grassmarket-maggie-dicksons-exterior-20261013.jpg", 1260),
                        ("grassmarket-white-hart-exterior-20261013.jpg", 1320),
                        ("grassmarket-white-hart-stag-sign-20261013.jpg", 820),
                    )
                    rendered = [(i["src"].rsplit("/", 1)[-1], i["naturalWidth"]) for i in loaded]
                    ensure(rendered == list(expected_photos),
                           f"{label} {path}: Grassmarket pub photos missing or wrong order: {rendered}")
                    ensure(page.locator("main .detail-article figure.story-photo").count() == 5,
                           f"{label} {path}: five distinct pub photo figures expected")
                    captions = page.locator("main .detail-article figure.story-photo figcaption").all_inner_texts()
                    ensure(all(k in " ".join(captions) for k in ("라스트 드롭", "매기 딕슨스", "화이트 하트")),
                           f"{label} {path}: pub figure captions missing")
                    row["checks"]["five privacy-edited Grassmarket pub photos visible in story order"] = "PASS"
                    page.screenshot(path=str(OUT / f"detail-{label}-grassmarket-pubs-full.png"),
                                    full_page=True, animations="disabled", timeout=30000)

                if path == "places/grassmarket-executions-covenanters.html":
                    expected_images = {
                        "/assets/grassmarket-covenanters-memorial-pavement-20261013.jpg": 1536,
                    }
                    published_images = {i["src"]: i["naturalWidth"] for i in loaded}
                    ensure(len(loaded) == 1 and published_images == expected_images,
                           f"{label} {path}: original Grassmarket Covenanters memorial photo not published")
                    row["checks"]["original Grassmarket memorial photo published"] = "PASS"

                if path == "places/royal-mile.html":
                    expected_images = {
                        "/assets/royal-mile-festival-flags-brightened-20261013.jpg": 1536,
                        "/assets/royal-mile.jpg": 865,
                    }
                    published_images = {i["src"]: i["naturalWidth"] for i in loaded}
                    ensure(len(loaded) == 2 and published_images == expected_images,
                           f"{label} {path}: two Royal Mile street photos not published")
                    row["checks"]["brightened flags and reused Royal Mile photo published"] = "PASS"

                if path == "edinburgh/themes/execution-sites.html":
                    expected_images = {
                        "/assets/edinburgh-last-public-execution-plaque-20261013.jpg": 1536,
                    }
                    published_images = {i["src"]: i["naturalWidth"] for i in loaded}
                    ensure(len(loaded) == 1 and published_images == expected_images,
                           f"{label} {path}: last public execution plaque photo not published")
                    row["checks"]["1864 last public execution plaque published"] = "PASS"

                if path == "edinburgh/places/george-street.html":
                    expected_images = {
                        "/assets/george-street-george-iv-east-view-20261013.jpg": 1536,
                        "/assets/george-street-george-iv-statue-20261013.jpg": 1152,
                    }
                    published_images = {i["src"]: i["naturalWidth"] for i in loaded}
                    ensure(len(loaded) == 2 and published_images == expected_images,
                           f"{label} {path}: two original George IV photos not published")
                    row["checks"]["two original George IV photos published"] = "PASS"

                if path == "edinburgh/places/st-andrew-square.html":
                    expected_images = {
                        "/assets/st-andrew-square-melville-monument-henry-dundas-20261013.jpg": 1152,
                    }
                    published_images = {i["src"]: i["naturalWidth"] for i in loaded}
                    ensure(len(loaded) == 1 and published_images == expected_images,
                           f"{label} {path}: Henry Dundas photo missing or unrelated church photo present")
                    ensure(page.locator("h1").inner_text().strip() == "세인트 앤드루스 스퀘어",
                           f"{label} {path}: long H1 title remains")
                    ensure(page.locator(".page-hero .lead").inner_text().strip() == "뉴타운은 왜 이 광장에서 시작됐을까?",
                           f"{label} {path}: subtitle missing or incorrect")
                    row["checks"]["short place title and intriguing subtitle; only monument photo published"] = "PASS"

                if path == "scotland/places/isle-of-skye-cuillin-fairy-pools.html":
                    figures = page.locator("main .detail-article > figure.story-photo.story-photo-portrait")
                    clips = figures.locator("video.fairy-pools-video")
                    ensure(figures.count() == 3 and clips.count() == 3,
                           f"{label} {path}: three Fairy Pools clips missing")
                    for idx, (name, minimum, maximum) in enumerate((
                            ("lower", 11.5, 12.5),
                            ("pools", 11.5, 12.5),
                            ("falls", 13.5, 14.5))):
                        figure = figures.nth(idx)
                        video = clips.nth(idx)
                        expected_src = f"/assets/skye-fairy-pools-{name}-20261013.mp4"
                        ensure(video.get_attribute("src") == expected_src
                               and video.get_attribute("poster") == expected_src.replace(".mp4", "-poster-20261013.jpg").replace("-20261013-poster-20261013", "-poster-20261013"),
                               f"{label} {path}: wrong Fairy Pools video/poster order")
                        ensure(video.get_attribute("controls") is not None,
                               f"{label} {path}: missing play controls")
                        ensure(figure.evaluate("(el) => el.getBoundingClientRect().width <= 461"),
                               f"{label} {path}: video wider than mobile-friendly limit")
                        video.scroll_into_view_if_needed(timeout=15000)
                        video.evaluate("(v) => {v.preload = 'metadata'; v.load()}")
                        page.wait_for_function(
                            "(idx) => {const v=document.querySelectorAll('.detail-article video.fairy-pools-video')[idx]; return v && v.readyState >= 1 && v.videoHeight >= 854}",
                            arg=idx, timeout=30000,
                        )
                        dur = video.evaluate("(v) => v.duration")
                        ensure(minimum <= dur <= maximum,
                               f"{label} {path}: edited video duration incorrect {name}: {dur}")
                    ensure("작은 폭포와 웅덩이들이" in figures.nth(0).locator("xpath=preceding-sibling::*[1]").inner_text(),
                           f"{label} {path}: lower stream video not after first pools paragraph")
                    ensure("물길을 따라 천천히" in figures.nth(1).locator("xpath=preceding-sibling::*[1]").inner_text(),
                           f"{label} {path}: pool video not after ascending watercourse")
                    ensure("시간이 허락한다면" in figures.nth(2).locator("xpath=preceding-sibling::*[1]").inner_text(),
                           f"{label} {path}: upper waterfall video not after walk farther paragraph")
                    row["checks"]["three voice-protected Fairy Pools MP4s stream in walking order"] = "PASS"
                    page.screenshot(path=str(OUT / f"detail-{label}-fairy-pools-full.png"),
                                    full_page=True, animations="disabled", timeout=18000)

                if path == "scotland/places/isle-of-skye-arrival.html":
                    castle_video = page.locator("main .detail-article video.skye-arrival-video")
                    ensure(castle_video.count() == 1,
                           f"{label} {path}: Eilean Donan Castle arrival clip missing")
                    castle_figure = castle_video.locator("xpath=parent::figure")
                    ensure("스코틀랜드 본토" in castle_figure.locator(
                           "xpath=preceding-sibling::*[1]").inner_text(),
                           f"{label} {path}: arrival clip not below mainland explanation")
                    ensure(castle_video.get_attribute("src") ==
                           "/assets/eilean-donan-castle-approach-20261013.mp4",
                           f"{label} {path}: incorrect arrival video src")
                    ensure(castle_video.get_attribute("poster") ==
                           "/assets/eilean-donan-castle-approach-poster-20261013.jpg",
                           f"{label} {path}: incorrect arrival poster")
                    ensure(castle_video.get_attribute("controls") is not None and
                           castle_video.get_attribute("autoplay") is None,
                           f"{label} {path}: arrival video play controls not correct")
                    ensure(castle_figure.evaluate("(el) => el.getBoundingClientRect().width <= 461"),
                           f"{label} {path}: arrival video too wide")
                    castle_video.scroll_into_view_if_needed(timeout=15000)
                    castle_video.evaluate("(v) => {v.preload='metadata'; v.load()}")
                    page.wait_for_function(
                        "() => {const v=document.querySelector('.detail-article video.skye-arrival-video'); return v && v.readyState>=1 && v.videoWidth===540 && v.videoHeight===960}",
                        timeout=40000,
                    )
                    duration = castle_video.evaluate("(v) => v.duration")
                    ensure(11.4 <= duration <= 11.9,
                           f"{label} {path}: castle video duration incorrect: {duration}")
                    row["checks"]["Eilean Donan mainland arrival video playable with correct poster"] = "PASS"
                    castle_figure.screenshot(
                        path=str(OUT / f"detail-{label}-eilean-donan-castle-video.png"),
                        animations="disabled", timeout=15000,
                    )

                if path == "scotland/places/isle-of-skye-arrival.html":
                    all_videos = page.locator("main .detail-article video")
                    ensure(all_videos.count() == 2,
                           f"{label} {path}: expected castle and mountain water videos only")
                    ensure(all_videos.nth(0).get_attribute("src") ==
                           "/assets/eilean-donan-castle-approach-20261013.mp4",
                           f"{label} {path}: first castle video not preserved in first position")
                    ensure(page.locator("main .detail-article video.skye-arrival-drive-video").count() == 0,
                           f"{label} {path}: duplicate second castle video remains")
                    water = page.locator("main .detail-article video.skye-mountain-water-video")
                    ensure(water.count() == 1 and water.get_attribute("src") ==
                           "/assets/skye-arrival-mountains-water-20261014.mp4",
                           f"{label} {path}: mountain waterside video missing")
                    ensure(water.get_attribute("poster") ==
                           "/assets/skye-arrival-mountains-water-poster-20261014.jpg",
                           f"{label} {path}: mountain waterside poster missing")
                    water_figure = water.locator("xpath=parent::figure")
                    ensure("스카이 브리지" in water_figure.locator(
                           "xpath=preceding-sibling::*[1]").inner_text(),
                           f"{label} {path}: mountain water video not in arrival journey")
                    ensure(water_figure.evaluate("(el) => el.getBoundingClientRect().width <= 461"),
                           f"{label} {path}: mountain water video too wide")
                    water.scroll_into_view_if_needed(timeout=14000)
                    water.evaluate("(v) => {v.preload='metadata';v.load()}")
                    page.wait_for_function(
                        "() => {const v=document.querySelector('.detail-article video.skye-mountain-water-video');return v && v.readyState >= 1 && v.videoWidth == 540 && v.videoHeight == 960}",
                        timeout=40000,
                    )
                    ensure(12 <= water.evaluate("(v)=>v.duration") <= 16,
                           f"{label} {path}: waterside video cannot play")
                    row["checks"]["original first Castle clip preserved, mountain lake second, duplicate removed"] = "PASS"

                if path == "scotland/places/isle-of-skye-trotternish.html":
                    storr_video = page.locator("main .detail-article video.storr-road-video")
                    ensure(storr_video.count() == 1,
                           f"{label} {path}: Old Man of Storr driving clip missing")
                    storr_figure = storr_video.locator("xpath=parent::figure")
                    ensure("외계 행성" in storr_figure.locator(
                           "xpath=preceding-sibling::*[1]").inner_text(),
                           f"{label} {path}: driving clip not next to Prometheus story")
                    ensure(storr_video.get_attribute("src") ==
                           "/assets/old-man-storr-road-revised-20261013.mp4",
                           f"{label} {path}: wrong road video source")
                    ensure(storr_video.get_attribute("poster") ==
                           "/assets/old-man-storr-road-revised-poster-20261013.jpg",
                           f"{label} {path}: missing video poster")
                    ensure(storr_figure.evaluate(
                           "(el) => el.getBoundingClientRect().width <= 461"),
                           f"{label} {path}: road video too wide")
                    storr_video.scroll_into_view_if_needed(timeout=12000)
                    storr_video.evaluate("(v) => {v.preload='metadata'; v.load()}")
                    page.wait_for_function(
                        "() => {const v=document.querySelector('.detail-article video.storr-road-video'); return v && v.readyState>=1 && v.videoWidth===540 && v.videoHeight===960}",
                        timeout=40000,
                    )
                    ensure(11.9 < storr_video.evaluate("(v) => v.duration") < 12.4,
                           f"{label} {path}: 12-second revised road MP4 not published")
                    row["checks"]["Revised 12-second Storr road video published without distracting sign"] = "PASS"
                    storr_figure.screenshot(path=str(OUT / f"detail-{label}-storr-road-video.png"),
                                          animations="disabled", timeout=15000)

                    figure = page.locator("main .detail-article > figure.story-photo.story-photo-portrait").filter(
                        has=page.locator("video.skye-video"))
                    video = figure.locator("video.skye-video")
                    ensure(figure.count() == 1 and video.count() == 1,
                           f"{label} {path}: Skye video figure missing")
                    ensure("킬트 록" in figure.locator("xpath=preceding-sibling::*[1]").inner_text(),
                           f"{label} {path}: video not directly after Kilt Rock paragraph")
                    ensure(figure.evaluate("(el) => el.getBoundingClientRect().width <= 461"),
                           f"{label} {path}: portrait video wider than intended")
                    expected_mp4 = "/assets/skye-mealt-falls-kilt-rock-20261013.mp4"
                    ensure(video.get_attribute("src") == expected_mp4,
                           f"{label} {path}: video is not a direct lightweight MP4")
                    ensure(video.get_attribute("controls") is not None,
                           f"{label} {path}: video controls missing")
                    video.scroll_into_view_if_needed(timeout=12000)
                    video.evaluate("(v) => {v.preload='metadata'; v.load()}")
                    page.wait_for_function(
                        "() => {const v=document.querySelector('.detail-article video.skye-video'); return v && v.readyState>=1 && v.videoWidth===540 && v.videoHeight===960}",
                        timeout=40000,
                    )
                    ensure(26.5 < video.evaluate("(v) => v.duration") < 27.2,
                           f"{label} {path}: 27s Skye clip not playable")
                    row["checks"]["27-second Skye MP4 published with controls and music"] = "PASS"
                    row["checks"]["video streamed directly without JS fragments"] = "PASS"
                    figure.screenshot(path=str(OUT / f"detail-{label}-skye-mealt-falls-video.png"),
                                    animations="disabled", timeout=15000)

                if path == "places/john-knox-house.html":
                    expected_images = {
                        "/assets/john-knox-house-james-mossman-goldsmith-20261013.jpg": 865,
                        "/assets/john-knox-house-john-knox-preacher-20261013.jpg": 865,
                    }
                    published_images = {i["src"]: i["naturalWidth"] for i in loaded}
                    ensure(len(loaded) == 2 and published_images == expected_images,
                           f"{label} {path}: two original entrance panel photos not published")
                    panels = page.locator("main .detail-article > figure.story-photo.story-photo-portrait")
                    ensure(panels.count() == 2,
                           f"{label} {path}: entrance panel figures missing")
                    expected_quotes = ("FOR QUEEN AND CROWN", "JOHN KNOX IS ABLE IN ONE HOUR")
                    for idx, expected in enumerate(expected_quotes):
                        figure = panels.nth(idx)
                        succeeding_quote = figure.locator("xpath=following-sibling::*[1]")
                        ensure(succeeding_quote.evaluate("(el) => el.tagName === 'BLOCKQUOTE'")
                               and expected in succeeding_quote.inner_text(),
                               f"{label} {path}: entrance photo not directly above matching quotation")
                        ensure(figure.evaluate("(el) => el.getBoundingClientRect().width <= 461"),
                               f"{label} {path}: portrait photo exceeds intended max width")
                    row["checks"]["entrance portraits load, match quotes and fit article"] = "PASS"
                    page.screenshot(path=str(OUT / f"detail-{label}-john-knox-house-full.png"),
                                    full_page=True, animations="disabled", timeout=18000)

                # Repeat overflow measurement after photos have loaded; images
                # can cause a layout regression that isn't present at first paint.
                after = dimensions()
                overflow_after = max(0, after["documentWidth"] - after["viewportWidth"])
                row["horizontalOverflowAfterPhotosPx"] = overflow_after
                ensure(overflow_after <= 2,
                       f"{label} {path}: {overflow_after}px overflow after images")
                row["checks"]["layout stable after article photos"] = "PASS"

                page.evaluate("window.scrollTo(0, 0)")
                page.screenshot(path=str(OUT / f"detail-{label}-{slug}.png"),
                                animations="disabled", timeout=12000)
                row["status"] = "PASS"
            except Exception as exc:
                row["status"] = "FAIL"
                row["error"] = str(exc)[:1000]
                try:
                    page.screenshot(path=str(OUT / f"detail-{label}-{slug}-failure.png"),
                                    animations="disabled", timeout=6000)
                except Exception:
                    pass
            finally:
                rows.append(row)
                page.close()
    finally:
        context.close()
    return rows


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
            detail_results = []
            for label, width, height in VIEWPORTS:
                detail_results.extend(detail_smoke(browser, label, width, height))
        finally:
            browser.close()
    report = {"site": BASE, "note": "Synthetic Chrome tests are not a real-phone speed benchmark", "results": results, "detailResults": detail_results}
    (OUT / "results.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if any(row["status"] != "PASS" for row in results + detail_results) else 0


if __name__ == "__main__":
    sys.exit(main())
