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
| Map data request lifecycle | Parked / Watch-only | 2026-06-10 fast and IITC-timing live pan scenarios validated queue refill, old wanted-response bridging, 400ms movement debounce, 1000ms download delay, cache-fresh rendering, retry recovery, and final settled completion with no partials/warnings. Remaining watch items: true stale-cache retry-exhaustion behavior and materially excessive retry volume compared with IITC-CE on the same viewport. |
| Map request retry sieve parity | Open | Targeted code read found IITC-CE `map_data_request.js` dynamically shrinks request buckets under retry pressure by summing tile retry counts and breaking the bucket when `retryTotal > MAX_TILE_RETRIES`, which can isolate a repeatedly failing tile into a single-tile request. IRIS `packages/iitc-core/src/map-data-request.ts` has `createIitcTileQueueRequestBatches` and request batch options, but does not yet port this inner sieve logic. Porting it should improve poor-network/rate-limit reliability, but it is not expected to affect layer/highlighter toggle latency because toggles do not fetch map data. |
| Hook/plugin lifecycle | Open | IITC has `addHook`/`runHooks`, plugin setup, toolbox entries, dialogs, panes, layer chooser integration, and portal highlighter registration. IITC IRIS currently has fixed native systems and should add thin registries before porting many plugin concepts. |
| Portal highlighter registry and selection model | Stable v1 / Deferred expansion | Aligned with IITC-CE's one-active-highlighter model for existing IRIS behavior: level color, needs recharge, and six explicit history selectors for visited, not visited, captured, not captured, scout controlled, and not scout controlled. Manual visual checks passed after applying the IRIS history color rule: positive states yellow, negative/target states red. Legacy `levelFill`, `healthFill`, and history layer settings are migration-only and no longer part of current layer settings. Highlighter changes now refresh existing portal marker styles in place where possible, and copied diagnostics expose active/registered highlighters plus rolling interaction timings. Key counts stay a layer. Missing resonators, high-level-only, ornament portal coloring, hide team, and other IITC plugins stay deferred. |
| Map layer registry for overlay/filter configuration | Started / Latency WIP | Align with IITC-CE's many-enabled-layer model. First pass adds a shared typed registry for existing layer controls, uses it for UI grouping/labels/defaults, and exposes registered layer ids/kinds/defaults in diagnostics without changing the layer set. Tile debug, Draw Tools, and player tracker toggles route to their own overlay refresh paths. Core visibility now flows through named IITC-style filter descriptors, where disabled layers activate filters. Core toggles use scoped sync, secondary-overlay masks, batched removals, a visibility-only fast path when entity data has not changed, persistent Leaflet groups for whole `F`/`LN`/`P` overlay toggles, and IITC-CE-style preserved layer instances for faction/level filter-only toggles. Measured JS timings improved, but manual comparison still reports IRIS visual latency behind IITC-CE. Next WIP is click-to-pixels/paint diagnostics before more optimization; only then decide whether to tune dispatch, renderer invalidation, or team/level membership buckets. |
| Layer toggle visual latency diagnostics | Open | Add click-to-pixels timing for layer/highlighter interactions: content click/send time, page-runtime receive/start time, runtime completion, first `requestAnimationFrame`, and second `requestAnimationFrame`. Current `interactionUpdates` prove JS/runtime work is often low, but do not prove when pixels visibly change. This is the primary next step for explaining lag in highlighters, core toggles (`F`, `LN`, `P`, `RES`, `ENL`, `MAC`), and detail toggles before further render-path edits. |
| Search hover preview | Partial | Search results now render portal/address/coordinate preview geometry on hover/focus and clear it on mouseout/blur. Broader IITC-style hover preview affordances outside the search sheet remain later. |
| Geodesic link rendering | Open | Long links are currently drawn as straight Leaflet polylines in projected map space. IITC/Intel-style long links should render as sampled geodesic/great-circle arcs, with selected-link highlight and link hit-testing using the same sampled geometry. Plan as two passes: minimal sampler/threshold correctness first, then segment-count/diagnostic/performance tuning. |
| Long-press/right-click context | Partial | Portal and mission-waypoint right-click/mobile long-press now select the portal and open the normal portal sheet/details path. Link/field right-click and map long-press/right-click now open View context with object metadata, selected-object highlight, copy actions, and clickable faction-colored anchors. Normal portal click/tap remains lightweight selection: it highlights the Portal menu and exposes Details/Missions sub-tabs, but does not force-open the portal sheet. Portal menu stays portal-only; a generic Selection menu remains later. Richer map-context/plugin actions remain later. |
| Portal-link navigation selection | Partial | COMM, player tracker, mission waypoint, and inventory-key portal links now use IITC-shaped `zoomToAndShowPortal` / `selectPortalByLatLng` semantics with pending selection when the target portal is not loaded. Search result selection already uses the normal portal selection path for loaded portals; broader map-context actions remain separate. |
| C.O.R.E. subscription check | Open | Current IRIS/Mini-IRIS use `/r/getHasActiveSubscription` to track Intel inventory access, show C.O.R.E. status, and gate inventory polling/UI. IITC-CE reference core does not use this endpoint, so port it as an Intel capability rather than IITC core parity. |
| Mission endpoints | Partial | First read-only vertical slice exists: top missions in view, selected-portal missions, details, route/waypoint map overlay, elapsed diagnostics, and IITC-style persistent cache TTLs for mission details and portal mission summaries. Remaining parity: richer dialog actions, completed/progress checkmark state, distance-to-start/focus polish, uniques/history integrations, and plugin hooks. |
| Bookmarks and saved map/portal sets | Open | High-value IITC workflow still missing. Should be designed around persistent saved portals/views before broad plugin parity. |
| Keys workflows | Partial | Basic key counts and inventory parsing exist. Missing richer IITC `keys`/`keys-on-map` workflows, key search/list views, and saved key-management affordances. |
| Full render bridge payload audit | Open | Layer toggles send tiny settings messages and should not serialize thousands of entities across the extension/page bridge. Full map renders after movement may still move large entity payloads and diagnostics through the bridge. Audit where full entity payloads cross the boundary and whether serialization contributes to initial render latency. Do not attribute layer-toggle lag to bridge serialization unless click-to-pixels diagnostics prove it. |
| Draw/planning tools | Partial | Native Draw Tools v1 is stable for links and markers: IITC-compatible storage, geodesic drawn links, IITC-shaped marker icons, split layer toggles, Map -> Links/Markers management sheets, undo/delete/clear/list/center, crossed-link visualization, and IITC Draw Tools JSON import/export for supported records. Deferred: polygons, circles, Leaflet.draw edit handles/events, visible snap cleanup UX, DrawTools Opt, stock Intel `pls`, and plugin-facing `window.plugin.drawTools` / `pluginDrawTools`. |
| Link analysis layers | Open | Missing cross-links, link direction, linked portals, tidy/fly/done links, and related planning helpers. |
| Portal in-place update audit | Open | Compare IITC-CE marker update paths with IRIS data-changing entity sync. Filter-only changes now preserve existing Leaflet layer instances, and highlighter changes use style refresh, but data-changing updates can still recreate portal markers. Measure whether `setLatLng`, `setStyle`, and option mutation can replace marker recreation for portal level/health/team/history changes without breaking highlighters, labels, selection overlays, portal details, or diagnostics. This may affect map refresh smoothness, but is separate from layer-toggle lag unless visual diagnostics show entity replacement on toggle paths. |
| Portal list/count views | Stable v1 / Partial | Native `Map -> Counts`, `Map -> List`, and `Map -> Scoreboard` sheets now expose IITC-style viewport portal counts, charted level/faction distribution, sortable and filterable portal rows, AP math, key/history/mission flags, and faction metrics through `packages/iitc-core/src/portal-analysis.ts`. The v1 UI intentionally keeps IITC-comparable names/data while using IITC IRIS bottom sheets, RES/ENL/MAC ordering, and value-first summary cards. Manual live comparison against IITC's `portal-counts`, `portals-list`, and `scoreboard` plugins found no blocking mismatches for v1; remaining work is deciding whether addon columns/export actions are needed. |
| Missions/uniques/history workflows | Partial | Portal history indicators and mission discovery/details exist. Missing full completed/progress workflows, uniques, and richer history list workflows. |
| COMM history stitching parity audit | Open | Compare IITC-CE `chat.js` continuation/oldest-guid scrollback behavior with IRIS COMM loading. IRIS parses and deduplicates messages, but likely lacks IITC's robust gap-filling/history-stitching logic for older plexts. This is a COMM functional parity item, not a cause of map layer/highlighter toggle lag. |
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
