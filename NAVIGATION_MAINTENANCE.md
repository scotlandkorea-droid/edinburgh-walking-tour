# Navigation maintenance rule

This file records the operational rule for title changes and previous/next navigation.

- `assets/navigation-data.js` is the single source for numbered-series navigation labels.
- `name` is the canonical/full item title.
- `navName` is an optional shorter navigation label. Use it when a long article title should remain intact but hub/previous/next labels need to be shorter.
- `tabName` is an optional tab-only label. It falls back to `navName`, then `name`.
- When a manuscript or page title is edited, the same task must review the matching navigation-data record. The user should not need to separately request updates to tabs or previous/next cards.
- Shared JavaScript rebuilds numbered-series tabs, hub-card labels, and previous/next labels from the central data. Do not hand-patch individual cards.
- Do not insert page-specific `<br>`, shrink one page's font, or use `text-wrap: balance` to force a title to fit. Titles wrap naturally inside the text column; arrow columns stay fixed.
- After a title/navigation change, audit numbering, duplicate URLs, first/last-card placement, and mobile → tablet → desktop rendering.
- Full manuscripts are not shortened automatically. Only navigation labels are shortened when the editorial decision explicitly calls for it.

## Automatic impact rule

A title change is treated as a navigation-impacting change whenever the page belongs to a numbered series. The required review set is: page title/H1 as intended, central series record, series tabs, hub card, previous/next cards, and responsive wrapping.

## Previous/next navigation invariant

All bottom previous/next roles use one shared one-tier reading pattern while keeping each role's sequence and labels intact.

- A walking tour, B numbered series, C place browsing, theme/people role navigation, and travel navigation all use the same stemmed left/right arrow form.
- The visible card content is one tier only: previous is `← title`, next is `title →`. Do not add a separate `이전/다음` kicker row unless the user explicitly approves a new design.
- B numbered-series cards keep the sequence number inline with the title, e.g. `← 01 제목` / `03 제목 →`. The number must not be moved into a separate `이전 이야기/다음 이야기` row.
- Travel cards use the same one-tier form. If a travel sequence already has a meaningful number, keep it inline before the title; do not add `이전 글/다음 글` as a separate row.
- C place-browse cards remain `← place name` / `place name →`.
- Theme/people cards remain `← title` / `title →`; do not add `이전 테마/다음 테마` or `이전 인물/다음 인물`.
- Previous-card text is left-aligned and next-card text is right-aligned. Titles use normal white-space with `word-break: keep-all`, `overflow-wrap: normal`, and `text-wrap: wrap`, so Korean titles wrap only at valid spaces.
- Wide screens (720px and above): arrow cell 20px, visible arrow 21px, font-weight 400.
- Mobile/tablet-narrow (719px and below): arrow cell 16px, visible arrow 19px, font-weight 400.
- Do not add a separate extra-small arrow size below 340px.
- B-series may render the visible arrow through CSS pseudo-elements, but its apparent size, weight and breakpoint must stay equal to the other roles.
- Card height and padding may remain role-specific; unification must not invent new information hierarchy.
- Static fallback and runtime output must never coexist as duplicate visible navigation. A page may belong to multiple contexts (for example numbered-series/tour and place browsing), so the runtime replacement step must remove every pre-existing bottom `.page-nav[data-nav-system]` that is not one of the incoming runtime nodes. Static fallbacks exist only for pre-JS/no-JS safety; after runtime selection there must be one active navigation surface.
- Shared UI assets are served with revalidation so stale query-string versions do not preserve an old navigation appearance indefinitely.


## Approved numbered-detail titles 2026-10-08

For the titles below, the approved short form is the canonical page title itself, not only a navigation alias. Keep page <title>, H1, hub card, series tab, search title, and previous/next label consistent from the central `navigation-data.js` name.

- Greyfriars 04: `언약도 감옥`
- Greyfriars 06: `알렉산더 헨더슨`
- Greyfriars 07: `언약도 순교자들`
- Falkland 06: `리처드 카메론 생가`
- Glasgow 11: `켈빈그로브 공원 · 미술관·박물관`

Glencoe 03 remains `해그리드 오두막은 어디 갔을까?` everywhere. Do not add an “영화 속 …” prefix.

When one of these titles changes, update the central `navigation-data.js` record first, then keep page metadata/H1, hub cards, tabs, search data, and static previous/next fallbacks consistent.
