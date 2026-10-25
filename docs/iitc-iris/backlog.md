# Backlog And Watch Items

Unprioritized product/parity gaps and dated comparison evidence. The [roadmap](plans/index.md) owns current work;
[architecture](architecture.md) owns implementation guidance. Completed refactors below are not prerequisites to repeat.

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
| --- | --- | --- |
| Map data request lifecycle | Parked / Watch-only | 2026-06-10 fast and IITC-timing live pan scenarios validated queue refill, old wanted-response bridging, 400ms movement debounce, 1000ms download delay, cache-fresh rendering, retry recovery, and final settled completion with no partials/warnings. Remaining watch items: true stale-cache retry-exhaustion behavior and materially excessive retry volume compared with IITC-CE on the same viewport. |
| Map request retry sieve parity | Done / Watch | Ported IITC-CE `map_data_request.js` retry-sieve behavior into `packages/iitc-core/src/map-data-request.ts`: request buckets now seed `retryTotal` from the first pending tile and start scanning at the second tile, so a retry-heavy leading tile is isolated into a one-tile request instead of being skipped. Covered by `map-data-request.test.ts`. This improves poor-network/rate-limit reliability and remains unrelated to layer/highlighter toggle latency because toggles do not fetch map data. |
| Hook/plugin lifecycle | Native foundation / Public API deferred | Native layer/highlighter/menu/detail/context registries and selection facades exist. IITC public hooks, plugin setup, toolbox integration, and arbitrary plugin compatibility remain deferred. See [registry notes](features/hook-plugin-lifecycle.md). |
| Portal highlighter registry and selection model | Stable v1 / Deferred expansion | Aligned with IITC-CE's one-active-highlighter model for existing IRIS behavior: level color, needs recharge, and six explicit history selectors for visited, not visited, captured, not captured, scout controlled, and not scout controlled. Manual visual checks passed after applying the IRIS history color rule: positive states yellow, negative/target states red. Legacy `levelFill`, `healthFill`, and history layer settings are migration-only and no longer part of current layer settings. Highlighter changes now refresh existing portal marker styles in place where possible, and copied diagnostics expose active/registered highlighters plus rolling interaction timings. Key counts stay a layer. Missing resonators, high-level-only, ornament portal coloring, hide team, and other IITC plugins stay deferred. |
| Map layer registry for overlay/filter configuration | Started / Stabilized v1 | Align with IITC-CE's many-enabled-layer model. First pass adds a shared typed registry for existing layer controls, uses it for UI grouping/labels/defaults, and exposes registered layer ids/kinds/defaults in diagnostics without changing the layer set. The Display sheet owns overlays/filters as IITC-style checkbox groups; base map selection is under System → Appearance; `keyCount` is a normal boolean `Key counts` overlay. Tile debug, Draw Tools, and player tracker toggles route to their own overlay refresh paths. Core visibility now flows through named IITC-style filter descriptors, where disabled layers activate filters. Core toggles use scoped sync, secondary-overlay masks, batched removals, a visibility-only fast path when entity data has not changed, persistent Leaflet groups for whole `F`/`LN`/`P` overlay toggles, IITC-CE-style preserved layer instances for faction/level filter-only toggles, lazy status-side visible-portal counts, and a direct faction-bucket path for the common all-levels-enabled case. Click-to-pixels diagnostics found the main visual lag was the heavy copied entity-status repost after every interaction, not the Leaflet mutation itself; that status repost is now deferred until after the second animation frame. User testing reported the result felt much faster. A deeper team-subgroup topology experiment regressed faction-filter paint timing and was rolled back, so further work should be diagnostic-led rather than another grouping rewrite. |
| Layer toggle visual latency diagnostics | Done / Watch | Click-to-pixels timing is now exposed for layer/highlighter interactions: dispatch delay, runtime completion, first `requestAnimationFrame`, second `requestAnimationFrame`, and sent-to-frame timings. It explained the highlighters/core-toggle lag by showing 300-800ms paint delays despite low runtime JS, caused by immediate post-toggle entity-status copying. Keep this diagnostic path for regressions and for future decisions around highlighters, core toggles (`F`, `LN`, `P`, `RES`, `ENL`, `MAC`), and detail toggles. |
| Search hover preview | Partial | Search results now render portal/address/coordinate preview geometry on hover/focus and clear it on mouseout/blur. Broader IITC-style hover preview affordances outside the search sheet remain later. |
| Geodesic link rendering | Implemented / Partial parity | Links, fields, selection highlights, and context hit-testing use the sampled IITC geodesic path. Global Leaflet geodesic factories and full render/plugin lifecycle compatibility remain deferred; see [geodesic rendering](features/geodesic-rendering.md). |
| Long-press/right-click context | Partial | Portal and mission-waypoint right-click/mobile long-press now select the portal and open the normal selected-object details path. Link/field right-click now opens Selected -> Link/Field with object metadata, selected-object highlight, copy actions, and clickable faction-colored anchors. Plain map long-press/right-click stays in Controls for centering/copy actions. Normal portal click/tap remains lightweight selection: it highlights the Selected menu and exposes Portal/Missions sub-tabs, but does not force-open the portal sheet. Richer map-context/plugin actions remain later. |
| Portal-link navigation selection | Partial | COMM, player tracker, mission waypoint, and inventory-key portal links now use IITC-shaped `zoomToAndShowPortal` / `selectPortalByLatLng` semantics with pending selection when the target portal is not loaded. Search result selection already uses the normal portal selection path for loaded portals; broader map-context actions remain separate. |
| C.O.R.E. subscription check | Implemented / Live watch | The runtime calls `/r/getHasActiveSubscription` for Agent/Inventory state. This is an Intel capability rather than IITC-CE core parity; live auth/session and subscription transitions remain comparison work. |
| Mission endpoints | Partial | First read-only vertical slice exists: top missions in view, selected-portal missions, details, route/waypoint map overlay, elapsed diagnostics, and IITC-style persistent cache TTLs for mission details and portal mission summaries. Remaining parity: richer dialog actions, completed/progress checkmark state, distance-to-start/focus polish, uniques/history integrations, and plugin hooks. |
| Bookmarks and saved map/portal sets | Open | High-value IITC workflow still missing. Should be designed around persistent saved portals/views before broad plugin parity. |
| Keys workflows | Partial | Basic key counts and inventory parsing exist. Missing richer IITC `keys`/`keys-on-map` workflows, key search/list views, and saved key-management affordances. |
| Full render bridge payload audit | Open | Layer toggles send tiny settings messages and should not serialize thousands of entities across the extension/page bridge. Full map renders after movement may still move large entity payloads and diagnostics through the bridge. Audit where full entity payloads cross the boundary and whether serialization contributes to initial render latency. Do not attribute layer-toggle lag to bridge serialization unless click-to-pixels diagnostics prove it. |
| Draw/planning tools | Partial | Native Draw Tools v1 is stable for links and markers: IITC-compatible storage, geodesic drawn links, IITC-shaped marker icons, split layer toggles, Map -> Links/Markers management sheets, undo/delete/clear/list/center, crossed-link visualization, and IITC Draw Tools JSON import/export for supported records. Note: `merge` mode appends imported items to existing draws without geometry de-duplication (1:1 with IITC-CE `draw-tools.js` plugin behavior; unchecking `Merge` resets draws before import). Deferred: polygons, circles, Leaflet.draw edit handles/events, visible snap cleanup UX, DrawTools Opt, stock Intel `pls`, and plugin-facing `window.plugin.drawTools` / `pluginDrawTools`. |
| Link analysis layers | Open | Missing cross-links, link direction, linked portals, tidy/fly/done links, and related planning helpers. |
| Portal in-place update audit | Open | Compare IITC-CE marker update paths with IRIS data-changing entity sync. Filter-only changes now preserve existing Leaflet layer instances, and highlighter changes use style refresh, but data-changing updates can still recreate portal markers. Measure whether `setLatLng`, `setStyle`, and option mutation can replace marker recreation for portal level/health/team/history changes without breaking highlighters, labels, selection overlays, portal details, or diagnostics. This may affect map refresh smoothness, but is separate from layer-toggle lag unless visual diagnostics show entity replacement on toggle paths. |
| Portal list/count views | Stable v1 / Partial | Native `Map -> Counts`, `Map -> List`, and `Map -> Scoreboard` sheets now expose IITC-style viewport portal counts, charted level/faction distribution, sortable and filterable portal rows, AP math, key/history/mission flags, and faction metrics through `packages/iitc-core/src/portal-analysis.ts`. The v1 UI intentionally keeps IITC-comparable names/data while using IITC IRIS bottom sheets, RES/ENL/MAC ordering, and value-first summary cards. Manual live comparison against IITC's `portal-counts`, `portals-list`, and `scoreboard` plugins found no blocking mismatches for v1; remaining work is deciding whether addon columns/export actions are needed. |
| Missions/uniques/history workflows | Partial | Portal history indicators and mission discovery/details exist. Missing full completed/progress workflows, uniques, and richer history list workflows. |
| COMM history stitching parity audit | Open | Compare IITC-CE `chat.js` continuation/oldest-guid scrollback behavior with IRIS COMM loading. IRIS parses and deduplicates messages, but likely lacks IITC's robust gap-filling/history-stitching logic for older plexts. This is a COMM functional parity item, not a cause of map layer/highlighter toggle lag. |
| Map utility plugins | Partial | Browser geolocation locate action and current-location pin exist. Missing distance integration, minimap, scale bar, zoom slider, privacy view, overlay KML, and similar utility plugins. |
| COMM/player plugin ecosystem | Partial | COMM and player tracker work, but richer COMM filters/hooks, nickname plugin interactions, and player level guess are not ported. |
| Overlapping player markers | Implemented / User smoke accepted | User report (2026-10-21): several agents at a portal left only one accessible marker. IITC's `plugins/player-activity-tracker.js` and `core/code/boot.js` use OverlappingMarkerSpiderfier; the user instead chose a count marker opening an agent list, then the existing popup/history with an All agents return link. Shared app runtime groups exact last-seen coordinates after faction filtering, preserves marker/selected-agent identity through COMM refreshes, and leaves nearby positions separate. Six marker regressions and browser touch/list/history, pan, zoom, faction, map-replacement and cleanup checks pass. Grouped browser checks used three simulated agents. The user subsequently tested the grouped marker and confirmed it works (2026-10-21); live grouped-marker smoke is accepted. Platform and individual history/faction paths were not separately reported. Screen overlap between different portals is deferred. |
| Logout / account sign-out workflow | Implemented / Live verify | IITC-CE exposes `<a href="https://intel.ingress.com/logout" id="signout">sign out</a>` next to the player name in `core/code/sidebar.js`; smartphone CSS keeps it always visible. IITC IRIS adds a deliberate `Logout` action in System -> Account because it affects the whole Intel session rather than only the Agent profile panel. The action navigates to `https://intel.ingress.com/logout`, clears transient IRIS auth/login-bypass state, and lets Intel clear the browser session. It does not erase user preferences such as layers, data source, map view, shortcuts, or debug settings. Validate live in Chrome/Firefox/mobile because logout endpoint redirects/cookie behavior is browser/session dependent. |
| Dialog/sidebar/statusbar model | Diverged | IITC IRIS intentionally uses bottom sheets and a two-layer menu instead of IITC's sidebar/statusbar/dropdown model. Keep this documented as product-shell divergence. |

## Cross-Cutting Product And Runtime Backlog

These items are broader than any single feature port. Keep them here instead of inside feature-specific notes such as
geodesic rendering.

### Optional Additional Features (Deferred, 2026-10-21)

Consider **System → Additional features** to reduce menu clutter and accommodate future built-in tools. The intended
distinction is baseline Intel/IITC functionality versus additions, rather than making every panel optional. Keep
selected-object details, essential navigation/settings, regional Scores, Passcode, and Missions in the baseline;
Missions is an upstream plugin but need not be optional in IRIS. Candidate optional additions: Counts, Portals List,
portal Scoreboard (distinct from regional Scores), and Draw Tools Links/Markers. Final inventory/defaults are undecided.
Reuse the menu registry and persist choices; preserve existing users' availability, saved data, and preferences.
Navigation, shortcuts, and other entry points must agree, with a safe fallback when an open panel becomes unavailable.
Decide panel visibility versus whole-feature shutdown explicitly: hiding a panel should not silently change overlays
or erase drawings, and background work/shared dependencies need separate lifecycle decisions. This does not imply
installable IITC plugins or a general plugin engine. No implementation is queued for this session.

### Existing Product And Runtime Items

| Area | Status | Notes |
| --- | --- | --- |
| Plugin/core strategy for smart ports | Open | Keep endpoint parsing, normalization, and reusable pure logic in `@iris/iitc-core`; keep app-specific sheet/menu/runtime behavior in IITC IRIS until another app needs the same surface. Promote patterns into core after implemented IITC IRIS behavior proves they are stable. Do not let deferred/reference plugins drive the first contracts. |
| Internal IITC-style registry layer | Native foundation implemented | Layer, highlighter, menu, portal-detail-section, context-action, and selection boundaries exist. Add registries only for repeated metadata or a real handoff; broad plugin compatibility stays deferred. |
| `content.tsx` decomposition | Complete / Reopen for need | Search, Layers, Missions, and location workflows own their feature state/actions; content assembles the app and shared coordination. COMM/scroll changes remain deferred. See [architecture](architecture.md). |
| Runtime request lifecycle helpers | Focused pass complete | Map fetches, timers, frames, gestures, and replacement cleanup have explicit lifetime ownership and tested stale-completion guards. Broader lifecycle work needs a concrete finding. |
| Mobile menu architecture | Watch | Current mitigation keeps submenus to one horizontal scroll row. Later options include icon-first submenus, overflow actions, per-primary compact drawers, or promoting rarely used actions into sheets instead of the tabbar. |
| Icon scanning pass | Deferred | Add icons only where they reduce scan time without replacing text labels. Candidate areas: portal actions/detail facts, inventory item categories, passcode reward rows, search result types, and COMM event/action types. Wait until Missions stabilizes. |
| Focused pure-logic tests | Review for concrete gaps | Existing core/app and workflow suites cover many of the originally proposed helper tests. Check current coverage before adding tests for a specific missing contract. |
| Visual/mobile pass | Open | Capture screenshots and mobile checks for main sheets, portal details, Missions, COMM scrolling, selected search geometry, player tracker popup, and keyboard focus states. |
| Browser geolocation follow-up | Partial | Map -> Controls has a user-triggered Locate action using IITC's max zoom 13 behavior plus current-location pin/accuracy circle. Distance-to-portal and mission distance-to-start should remain later plugin-style smart ports after live comparison against IITC. |
| Login/auth recovery | Stabilized v1 / Watch | IITC boot treats missing `PLAYER.nickname` as the login/account boundary. IRIS also centralizes post-boot auth classification for map data, portal details, COMM, scores, missions, inventory, passcode, subscription, and search-like requests. Live-test expired sessions across Chrome/Firefox and decide whether automatic background retries should pause while a login prompt is active. |
| Auth recovery implementation notes | Stabilized v1 | Missing Intel version and missing page `PLAYER` are auth/bootstrap failures. Login recovery reloads `/intel`, uses a short session bypass so IRIS does not immediately remount over Intel sign-in, and clears the bypass when Intel's authenticated dashboard bootstrap appears. While auth/bootstrap failure is active for live map data, automatic entity refresh and player-tracker COMM polling pause; explicit Retry clears the pause. Panels show consistent `Intel login required` copy while raw errors stay diagnostic. |
| Auth recovery validation | Dated evidence / Watch | The 2026-06-02 auth recovery checkpoint passed its focused checks and packaging. Current commands and the latest cleanup verification are recorded in the README and roadmap; live expired-session comparison remains separate. |
| Sheet/menu stabilization | Stabilized v1 | 2026-06-03 pass made primary menu clicks and keyboard shortcuts share the same toggle model; active primary closes back to map, inactive primary opens the default sheet. Portal selection auto-opens details once per selected portal, manual close stays closed until another portal is selected. COMM channel switching follows IITC `chat.chooseTab` more closely by rendering cached data immediately and refreshing `getPlexts`; clicking the active channel is a no-op. Compact close/clear buttons use the shared header action group, uppercase `X`, and explicit labels. |
| Active side-request comparison | Open | Continue IITC comparison passes for entity requests, `getPlexts`, portal details, inventory, scores, passcodes, and geocoder requests during map movement so expected overlap/idle behavior is documented. |
| Missing request surfaces | Open | Keep expanding beyond started `getHasActiveSubscription` and Missions endpoints as known Intel/IITC-plugin request surfaces are verified. Expose them in UI only when ported. |
| Context actions | Partial | Continue IITC-style long-press/right-click interactions. Portal context selects the portal and opens normal selected-object details. Link/field context opens Selected -> Link/Field sheets with metadata, selected-object highlight, copy actions, and faction-colored clickable anchor rows. Plain map context stays in Controls for centering/copy actions. Richer plugin context actions remain later. |
| Portal-link navigation | Partial | COMM, search, player tracker, inventory keys, and other portal links should select the portal as well as pan/zoom. 2026-06-05 aligned runtime/UI boundary names with IITC concepts: `zoomToAndShowPortal` and `selectPortalByLatLng`. Pending GUID/lat/lng selections resolve when matching entity data arrives. |
| Diagnostic noise | Open | Keep reducing visible diagnostic noise in normal UI while preserving copied diagnostics for live parity reports. |

## Runtime Policy Notes

| Area | Policy / Follow-up |
| --- | --- |
| Permission/manifest audit | Review geolocation, clipboard, downloads, host permissions, and browser-specific behavior before release packaging. Keep permission prompts tied to clear user actions. |
| Live auth failure UX | Align `auth` and login-required states across entities, missions, inventory, passcodes, scores, search/geocoder, portal details, and subscription checks. |
| Logout policy | Sign-out is implemented as an explicit user action; preserve persistent IRIS preferences. Live session verification remains open, as recorded above. |
| Map data cancellation | Movement invalidates render generations; older responses can still satisfy currently wanted tiles. Map disposal aborts owned fetches. Entity fetches are not panel-transient; see [map lifecycle](features/map-lifecycle.md). |
| Auth recovery cancellation | Live automatic entity refresh and player-tracker COMM polling pause while auth recovery is active; explicit Retry clears the pause. |
| Portal selection cancellation | Selecting or clearing a portal cancels in-flight portal details for the previous portal. Cached details may remain visible until the new portal enters loading/ready state. |
| Panel request cancellation | Sheet close or switch to non-side-panel sheets cancels transient panel requests via `IITC_IRIS_CANCEL_PANEL_REQUESTS` for portal details, COMM, scores, passcodes, inventory, missions, and mission details. Map data and subscription status are intentionally not panel-transient. |
| Missions source switch | Switching view/portal missions cancels active mission list and detail requests. |
| Hidden request policy | Subscription status may continue while hidden because it feeds Agent/Inventory state. Search workflow owns debounce and selection/preview cleanup; verify geocoder request cancellation for a concrete lifecycle change. Decide COMM close/reopen retention only during a COMM change. |
| Cache policy matrix | Document every cache, TTL, key, invalidation rule, memory-only vs persistent storage, and when stale data is acceptable. Include map tile/entity cache, portal details, missions, inventory-derived key counts, search, COMM, scores, and subscription status. |

## Release And Quality Backlog

- Firefox distribution: the current XPI is an unsigned development archive. Before offering persistent installation
  in ordinary Firefox Release/Beta, add Mozilla signing (listed or unlisted); decide extension version/update
  delivery separately from stable GitHub artifact names. APK signing does not sign the XPI. See
  [Mozilla signing requirements](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/).
- Message boundary: `event.source === window` excludes other windows but does not authenticate other scripts in the
  Intel page. Keep credentials out of the protocol; add payload guards/stronger message types when changing
  consequential paths. An explicit target origin can restrict delivery but cannot isolate same-page scripts.
  No exploit was demonstrated by the 2026-10-21 source review; a wholesale protocol rewrite is not queued.
- CI hardening implemented (2026-10-25): unsigned/PR calls receive no signing secrets; the reusable Android workflow
  restricts signing to main/version-tag push or manual runs. All external actions are pinned to verified upstream
  release commits with version comments; checkouts do not retain credentials and default tokens are read-only.
  Local actionlint and trigger/secret-boundary checks pass; confirm the next GitHub Actions run after pushing.
  Review upstream release changes when updating pins. No previous secret leak was established.
- Mobile ergonomics pass: shared landscape height/clipping and request-body scrolling repaired (2026-10-25), with
  browser coverage of 17 sheets across three landscape sizes and portrait; the user reports it is “a lot better”.
  Individual sheet acceptance remains unspecified. Follow up on keyboard-open landscape and populated portal details.
  Continue checking keyboard overlap, sticky headers/footers, map gestures, long-press conflicts, mobile keyboard
  shortcuts, and dense-panel usability when concrete findings arise.
- Accessibility baseline: verify focus order, Escape behavior, button labels/titles, reduced-motion expectations, and
  color contrast for faction, rarity, mission, warning, and disabled states.
- Release checklist: record exact build/package commands, artifact naming, smoke-test routes, sample locations, and the
  minimum live-Intel checks before sharing a package.
- Dirty worktree policy: keep the current discipline explicit in the plan. Do not reset user changes; inspect touched
  files before cleanup/refactor; keep generated artifacts and unrelated edits separate from behavior changes.
- Repository, component/CSS, and content-composition cleanup are complete. Reopen for a concrete finding; avoid
  another broad cleanup pass as a release prerequisite.

## Future Parity And Plugin Work

The native registry/facade, component, and content-composition passes are complete. Reopen architectural work for a
concrete need rather than repeating the old extraction sequence. Keep UI/browser effects in the app and promote proven
pure contracts into core as described by the [facade pattern](facade-pattern.md).

A fresh IITC reference audit can refine missing parity when feature work resumes. Arbitrary plugin compatibility,
a global store, and a larger core redesign remain deferred. The earlier replacement comparison against IRIS/Mini-IRIS
is retired: those apps were removed after IITC IRIS superseded them. Future comparisons target IITC-CE and current IRIS.
