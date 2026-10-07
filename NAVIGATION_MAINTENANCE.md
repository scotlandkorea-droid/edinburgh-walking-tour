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

## Previous/next arrow visual invariant

All bottom previous/next roles share the same arrow token even when their card layouts remain role-specific.

- Wide screens (720px and above): arrow cell 20px, visible arrow 21px, font-weight 400.
- Mobile/tablet-narrow (719px and below): arrow cell 16px, visible arrow 19px, font-weight 400.
- Do not add a separate extra-small arrow size below 340px.
- A walking tour, B numbered series, C place browsing, theme/people role navigation, and travel navigation all use the same stemmed left/right arrow form.
- For two-tier cards (meta/kicker above a destination title), the arrow is vertically centered on the destination-title row only, not on the combined meta + title block and not on the full card. One-, two-, and three-line titles must keep the arrow centered on the title block.
- For roles that use two-tier copy, previous-card text is left-aligned and next-card text is right-aligned. Destination titles use normal white-space with `word-break: keep-all`, so multi-word Korean titles wrap only at valid spaces when needed. One-tier roles (C place-browse and theme/people) must not gain `이전 장소/다음 장소`, `이전 테마/다음 테마`, or `이전 인물/다음 인물` labels unless the user explicitly approves that design change.
- The shared two-tier alignment applies only to roles that actually have a kicker/meta row, currently B numbered-series and travel previous/next. C place-browse, theme/people role navigation, and walking-tour cards are one-tier and keep the original simple form `← title` / `title →` without added `이전/다음` role labels.
- B-series may render the visible arrow through CSS pseudo-elements, but its apparent size, weight and breakpoint must stay equal to the other roles.
- Card height, padding, labels and information hierarchy remain role-specific; arrow unification must not flatten those differences.
- Static fallback and runtime output must never coexist as duplicate visible navigation. A page may belong to multiple contexts (for example numbered-series/tour and place browsing), so the runtime replacement step must remove every pre-existing bottom `.page-nav[data-nav-system]` that is not one of the incoming runtime nodes, even when its system key is different. Static fallbacks exist only for pre-JS/no-JS safety; after runtime selection there must be one active navigation surface.
- Shared UI assets are served with revalidation so stale query-string versions do not preserve an old navigation appearance indefinitely.

