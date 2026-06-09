# Backlog And Replacement Readiness

### Menu Symbol Guidance

The two-layer menu can use symbols, but do not use ASCII art or decorative Unicode pictures as the primary navigation
language. They are inconsistent across browsers/fonts, can shift compact button layout, and often produce weak screen
reader output unless every button is carefully labelled.

Current recommendation:

- Keep short text labels for primary domains until the menu hierarchy stabilizes: `Map`, `Portal`, `Agent`, `COMM`,
  `System`.
- Use concise text/abbreviations for dense layer toggles where IITC already does this well: `F`, `LN`, `P`, `L1`..`L8`,
  `RES`, `ENL`, `MAC`, `VIS`, `CAP`, `KEY`.
- If the primary menu needs icons later, prefer a small controlled monochrome SVG icon set or an installed icon library
  over raw Unicode. Every icon-only button must keep `title` and `aria-label`, and the visible icon should be treated as
  presentation rather than the source of meaning.
- Unicode is acceptable for a few universal controls where glyph rendering is stable and already familiar, such as `+`,
  `-`, `x`, or arrow-like pan controls, but avoid emoji, box art, and multi-character ASCII images in the menu.

### Unprioritized IITC Parity Backlog

These findings are intentionally not prioritized yet; they capture missing IITC concepts so later planning can choose
what to port natively and what to leave out.

| Area | Status | Notes |
|------|--------|-------|
| Hook/plugin lifecycle | Open | IITC has `addHook`/`runHooks`, plugin setup, toolbox entries, dialogs, panes, layer chooser integration, and portal highlighter registration. IITC IRIS currently has fixed native systems and should add thin registries before porting many plugin concepts. |
| Portal highlighter framework | Open | Add an IITC-style highlighter registry before adding more highlighters. Likely first native highlighters: high level, missing resonators, needs recharge, portal history, ornaments, and hide team. |
| Search hover preview | Partial | Search results now render portal/address/coordinate preview geometry on hover/focus and clear it on mouseout/blur. Broader IITC-style hover preview affordances outside the search sheet remain later. |
| Geodesic link rendering | Open | Long links are currently drawn as straight Leaflet polylines in projected map space. IITC/Intel-style long links should render as sampled geodesic/great-circle arcs, with selected-link highlight and link hit-testing using the same sampled geometry. Plan as two passes: minimal sampler/threshold correctness first, then segment-count/diagnostic/performance tuning. |
| Long-press/right-click context | Partial | Portal and mission-waypoint right-click/mobile long-press now select the portal and open the normal portal sheet/details path. Link/field right-click and map long-press/right-click now open View context with object metadata, selected-object highlight, copy actions, and clickable faction-colored anchors. Normal portal click/tap remains lightweight selection: it highlights the Portal menu and exposes Details/Missions sub-tabs, but does not force-open the portal sheet. Portal menu stays portal-only; a generic Selection menu remains later. Richer map-context/plugin actions remain later. |
| Portal-link navigation selection | Partial | COMM, player tracker, mission waypoint, and inventory-key portal links now use IITC-shaped `zoomToAndShowPortal` / `selectPortalByLatLng` semantics with pending selection when the target portal is not loaded. Search result selection already uses the normal portal selection path for loaded portals; broader map-context actions remain separate. |
| C.O.R.E. subscription check | Open | Current IRIS/Mini-IRIS use `/r/getHasActiveSubscription` to track Intel inventory access, show C.O.R.E. status, and gate inventory polling/UI. IITC-CE reference core does not use this endpoint, so port it as an Intel capability rather than IITC core parity. |
| Mission endpoints | Partial | First read-only vertical slice exists: top missions in view, selected-portal missions, details, route/waypoint map overlay, elapsed diagnostics, and IITC-style persistent cache TTLs for mission details and portal mission summaries. Remaining parity: richer dialog actions, completed/progress checkmark state, distance-to-start/focus polish, uniques/history integrations, and plugin hooks. |
| Bookmarks and saved map/portal sets | Open | High-value IITC workflow still missing. Should be designed around persistent saved portals/views before broad plugin parity. |
| Keys workflows | Partial | Basic key counts and inventory parsing exist. Missing richer IITC `keys`/`keys-on-map` workflows, key search/list views, and saved key-management affordances. |
| Draw/planning tools | Partial | Native Draw Tools v1 is stable for links and markers: IITC-compatible storage, geodesic drawn links, IITC-shaped marker icons, split layer toggles, Map -> Links/Markers management sheets, undo/delete/clear/list/center, crossed-link visualization, and IITC Draw Tools JSON import/export for supported records. Deferred: polygons, circles, Leaflet.draw edit handles/events, visible snap cleanup UX, DrawTools Opt, stock Intel `pls`, and plugin-facing `window.plugin.drawTools` / `pluginDrawTools`. |
| Link analysis layers | Open | Missing cross-links, link direction, linked portals, tidy/fly/done links, and related planning helpers. |
| Portal list/count views | Partial | Native `Map -> Counts`, `Map -> List`, and `Map -> Scoreboard` sheets now expose IITC-style viewport portal counts, sortable portal rows, AP math, key/history/mission flags, and faction metrics through `packages/iitc-core/src/portal-analysis.ts`. Remaining comparison work: verify live values against IITC's `portal-counts`, `portals-list`, and `scoreboard` plugins and decide whether addon columns/export actions are needed. |
| Missions/uniques/history workflows | Partial | Portal history indicators and mission discovery/details exist. Missing full completed/progress workflows, uniques, and richer history list workflows. |
| Map utility plugins | Partial | Browser geolocation locate action and current-location pin exist. Missing distance integration, minimap, scale bar, zoom slider, privacy view, overlay KML, and similar utility plugins. |
| COMM/player plugin ecosystem | Partial | COMM and player tracker work, but richer COMM filters/hooks, nickname plugin interactions, and player level guess are not ported. |
| Dialog/sidebar/statusbar model | Diverged | IITC IRIS intentionally uses bottom sheets and a two-layer menu instead of IITC's sidebar/statusbar/dropdown model. Keep this documented as product-shell divergence. |

## Pass 8: Replacement Readiness - Not Started

- Compare IITC IRIS, Mini-IRIS, current IRIS, and IITC-CE on the same views.
- Document mismatches as intentional differences or blockers.
- Only then decide which current IRIS code can be retired or replaced.

Acceptance:

- A documented comparison table exists for the core zoom/entity cases.
- Remaining gaps are tracked as explicit work items instead of renderer surprises.
