# Navigation maintenance rule

This file records the operational rule for title changes and previous/next navigation.

- `assets/navigation-data.js` is the single source for numbered-series navigation labels.
- `name` is the canonical/full item title.
- `navName` is an optional shorter previous/next navigation label. Keep the canonical `name` on hub-story cards and on the page; abbreviate only the navigation surface when long titles are unnecessary.
- `tabName` is an optional tab-only label. It falls back to `navName`, then `name`.
- When a manuscript or page title is edited, the same task must review the matching navigation-data record. The user should not need to separately request updates to tabs or previous/next cards.
- Shared JavaScript rebuilds numbered-series tabs and previous/next labels from central `tabName`/`navName`. Hub-story cards continue to display the canonical full `name`. Do not hand-patch individual cards.
- Do not insert page-specific `<br>`, shrink one page's font, or use `text-wrap: balance` to force a title to fit. Titles wrap naturally inside the text column; arrow columns stay fixed.
- After a title/navigation change, audit numbering, duplicate URLs, first/last-card placement, and mobile → tablet → desktop rendering.
- Full manuscripts are not shortened automatically. Only navigation labels are shortened when the editorial decision explicitly calls for it.


## Context hash and actual anchor rules

- `#tour-nav` and `#place-nav` are intentional navigation-context markers read from `location.hash` by `assets/navigation-system.js`. They select walking-tour order versus place-browsing order. They do **not** require corresponding HTML `id` attributes and must not be “fixed” by inventing anchor targets or removing the fragment.
- Real scroll anchors must have a matching element ID on the target page. These include homepage `#tour`, `#explore`, `#walked`, `#guide`, `#travel`, `#contact`, and place-directory `#edinburgh`, `#scotland`, and regional anchors such as `#edinburgh-1`, `#edinburgh-4`, `#edinburgh-5`.
- When changing cross-page links, validate the target page's actual `id` values first, then preserve the existing navigation-context marker if present. Do not treat an unknown fragment as a broken anchor without checking whether shared JavaScript interprets it.
- Structural audit on 2026-10-08: 199 site HTML files and 2,812 cross-page fragment references were examined; no missing target was found among the recognized context markers and verified scroll anchors. This was a static source audit, **not** a live browser or mobile/tablet/PC verification.

## Automatic impact rule

A title change is treated as a navigation-impacting change whenever the page belongs to a numbered series. The required review set is: page title/H1 as intended, central series record, series tabs, hub card, previous/next cards, and responsive wrapping.

## Previous/next navigation invariant

All bottom previous/next roles use one shared one-tier reading pattern while keeping each role's sequence and labels intact.

- A walking tour, B numbered series, C place browsing, theme/people role navigation, and travel navigation all use the same stemmed left/right arrow form.
- The visible card content is one tier only: previous is `← title`, next is `title →`. Do not add a separate `이전/다음` kicker row unless the user explicitly approves a new design.
- B numbered-series cards show the number and title in one visible tier (`← 01 제목` / `03 제목 →`), with fixed number and flexible title columns in shared CSS. The number must not become a separate `이전 이야기/다음 이야기` metadata row.
- Numbered detail bottom cards (`story-series-nav` and `detail-series-nav`) use one shared CSS system. The arrow is absolutely positioned so it does not consume a text column. Inside each card, the sequence number and title are separate columns: the number stays in its own fixed-width column and every wrapped title line begins on the same title start line. The left card group is anchored left; the right card group is anchored right while the wrapped title itself stays aligned to its title column. Do not create page-specific wrapping fixes or temporary test classes.
- Travel cards use the same one-tier form. If a travel sequence already has a meaningful number, keep it inline before the title; do not add `이전 글/다음 글` as a separate row.
- C place-browse cards remain `← place name` / `place name →`.
- Theme/people cards remain `← title` / `title →`; do not add `이전 테마/다음 테마` or `이전 인물/다음 인물`.
- Previous-card content groups anchor left and next-card content groups anchor right. In numbered B-series, wrapped titles within either group align left at the beginning of their title column; other navigation roles retain their approved left/right title alignment. Titles use normal white-space with `word-break: keep-all`, `overflow-wrap: normal`, and `text-wrap: wrap`, so Korean titles wrap only at valid spaces.
- Wide screens (720px and above): arrow cell 20px, visible arrow 21px, font-weight 400.
- Mobile/tablet-narrow (719px and below): arrow cell 16px, visible arrow 19px, font-weight 400.
- Do not add a separate extra-small arrow size below 340px.
- B-series may render the visible arrow through CSS pseudo-elements, but its apparent size, weight and breakpoint must stay equal to the other roles.
- All bottom navigation roles share `min-height:65px` and `padding-block:16px` in the existing shared CSS. One-line labels stay compact, two lines are approximately 72px, longer titles grow naturally, and paired cards match heights via the same grid row. Role-specific horizontal padding, arrows and numbering remain preserved. The hub-to-navigation vertical spacing remains the approved 38px.
- Static fallback and runtime output must never coexist as duplicate visible navigation. A page may belong to multiple contexts (for example numbered-series/tour and place browsing), so the runtime replacement step must remove every pre-existing bottom `.page-nav[data-nav-system]` that is not one of the incoming runtime nodes. Static fallbacks exist only for pre-JS/no-JS safety; after runtime selection there must be one active navigation surface.
- Shared UI assets are served with revalidation so stale query-string versions do not preserve an old navigation appearance indefinitely.
- Asset cache revalidation must be configured in **both** `worker.js` (`revalidateAssets`) and `wrangler.jsonc` (`assets.run_worker_first`). Cloudflare serves a matched static asset before Worker code unless its path matches `run_worker_first`. Keep the seven shared asset routes synchronized: `site.css`, `site-header.js`, `navigation-system.js`, `navigation-data.js`, `tour-course-data.js`, `search-data.js`, and `tour-map.js`. Do not send all pages and images through the Worker for this purpose.


## Approved numbered-detail titles 2026-10-08

The following approved **canonical page titles** remain unchanged in <title>, H1, hub-story cards and search results. Under the newer 2026-10-10 compact-navigation decision, numbered upper tabs and previous/next cards may use distinct `tabName` and `navName` aliases; those short navigation labels do not rename the pages.

- Greyfriars 04: `언약도 감옥`
- Greyfriars 06: `알렉산더 헨더슨`
- Greyfriars 07: `언약도 순교자들`
- Falkland 06: `리처드 카메론 생가`
- Glasgow 11: `켈빈그로브 공원 · 미술관·박물관`

Glencoe 03 keeps `해그리드 오두막은 어디 갔을까?` as its original article H1, canonical title and hub-story title, while its top numbered tab and bottom previous/next label use the approved shorter `해그리드 오두막`. Do not add an “영화 속 …” prefix.

When one of these titles changes, update the central `navigation-data.js` record first, then keep page metadata/H1, hub cards, tabs, search data, and static previous/next fallbacks consistent.


## Automatically generated internal site search

- `assets/search-data.js` is the **only browser-loaded search index**. Do not manually edit it; GitHub Actions regenerates it on `main` when HTML pages, navigation classifications, the generator or curation change.
- `scripts/build-search-index.mjs` scans actual site HTML and extracts H1, meta description, section headings, and a bounded body excerpt. New pages are discovered automatically; search results keep a single URL per page.
- `scripts/search-curation.json` stores only human-selected aliases, the intentionally short titles and exceptional type labels, plus the one virtual Scotland hub link. Existing public titles and alternative names must survive regeneration; obsolete historical titles must not be reintroduced.
- `.assetsignore` excludes `scripts/`, so the generator and curation do not ship to visitors. Search data is loaded lazily by `assets/site-header.js`, not on every page load.
- The source of truth is HTML; never reintroduce a second hand-maintained page-by-page search inventory. All existing HTML pages, including `noindex` pages and manuscript placeholders, remain eligible for internal search. `noindex` controls external search-engine indexing, not the website search. The GitHub workflow checks coverage of every HTML page and all approved name variants. Google Docs manuscripts update the actual HTML only when published. GitHub generation success does not prove Cloudflare deployment or live search UI behaviour.


## CSS cleanup safety (2026-10-09)

- Before removing CSS, compare selector classes against all site HTML and shared JavaScript using the read-only `scripts/report-css-inventory.mjs`. The report is an inventory, **not** automatic permission to delete: Leaflet creates classes at runtime, and some generic classes are reserved for future manuscript components.
- Removed source-unreferenced rules for `.route-map-compass`, `.text-link`, `.place-chip`, `.place-pending`, `.page-nav-next-only`, `.page-nav-prev-only`, `.page-nav-empty` and `.nav-label`. The active `.place-strip > a` styling is preserved. The CSS audit and search/navigation/privacy checks passed.
- Do not bulk-delete legacy CSS while actual public mobile/tablet/PC visual verification remains unavailable. Confirm all active classes and role-specific fallbacks before any next removal.


## Latest numbered-detail navigation labels and card size (2026-10-10)

- On numbered detail pages, use `name` for the original article/page title and hub-story card, `navName` for concise previous/next titles, and `tabName` for concise numbered upper tabs. These are distinct purposes, not three competing manuscripts.
- The current shared source sets short `navName` and `tabName` on 41 numbered-series items. Examples: Glencoe 03 `해그리드 오두막`, Edinburgh Castle 07 `전쟁포로 감옥`, Glencoe 02 `글렌코 학살`, Glasgow 11 `켈빈그로브 박물관`. Preserve numbering, destinations, canonical URLs and original titles. `World’s End` navigation tab is `월드 엔드`; the full English original may remain inside the article.
- The upper numbered tabs keep their horizontal scroll on narrow screens and wrap on wide screens, with a maximum tab width 170px, ellipsis for an unusually long label, and accessible original title on the link. Do not remove/hide tabs as a workaround for length; shorten labels in `navigation-data.js` first.
- Prev/next cards now share one adaptive minimum height 65px (not a fixed height) and 16px block padding. Paired cards remain equal height; long titles still wrap. Do not reintroduce the older 72px common minimum or type-by-type 60/68/70/92/96px overrides. The 38px vertical gap to the preceding 'all items' button is unchanged.
- Source commits for this change: `6570f4e9d897f8b9b6222ee61d75015e0f9824a9` (CSS), `7317fb3fef9b5d8cd3c49b56501f9c49ce08f850` (41 labels), `ad0c1c4c7b9362244699467f318491336ab363a3` and `cec76adb42a2bcfc7abd4eeb0d66f6f3981353e7` (runtime/loader versions), `c76edb86728966e2f6594bc22ba6297b2459ebd9` (protect hub-card titles). Run actual public mobile → tablet → desktop visual checks separately from GitHub CI.
