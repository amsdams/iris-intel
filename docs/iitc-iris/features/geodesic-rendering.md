# Geodesic Rendering

IITC source references:

- `reference/ingress-intel-total-conversion/core/external/L.Geodesic.js`
- `reference/ingress-intel-total-conversion/core/code/map_data_render.js`
- `reference/ingress-intel-total-conversion/core/code/boot.js` for the `L.Geodesic.js` boot include

Ported IITC concepts and names:

- Render factories/concepts: `L.geodesicPolyline`, `L.geodesicPolygon`, link `weight: 2`, field `fillOpacity: 0.25`,
  field `stroke: false` equivalent, and non-interactive link/field map paths.
- Core map entity behavior: links and fields render as great-circle/geodesic paths, not straight projected Leaflet
  chords; selected link/field overlays and map-object context hit-testing use the same geodesic points.
- Local facade: `apps/iitc-iris/src/iitc-geodesic.ts` keeps the pure IITC geodesic conversion algorithm as
  `convertIitcGeodesicPoints`; `apps/iitc-iris/src/leaflet-geodesic.ts` exposes Leaflet-facing
  `convertIitcGeodesicLatLngs`, `createIitcGeodesicPolyline`, and `createIitcGeodesicPolygon`.

Current implementation choices:

- IITC IRIS ports the geodesic point-generation behavior without installing global `L.GeodesicPolyline`,
  `L.GeodesicPolygon`, or `L.geodesic*` factories. This is an intentional TypeScript/bundling boundary: the page map
  runtime owns rendering and does not yet expose plugin-compatible Leaflet globals.
- The port preserves IITC's longitude-offset anti-meridian handling and `segmentsCoeff: 5000` default. It uses normal
  Leaflet `Polyline`/`Polygon` instances after conversion, so pane, renderer, and selection behavior stays compatible
  with the existing IITC IRIS runtime.
- Link and field context selection now checks generated geodesic segments/polygons. This is closer to the visible path
  than the old straight-segment hit test, but still remains an IRIS context-menu implementation rather than a full IITC
  plugin hook surface.

Known gaps before calling link/field rendering parity-complete:

- The global Leaflet classes/factories from `L.Geodesic.js` are not exposed. Add them later if plugin compatibility
  requires direct `L.GeodesicPolyline` / `L.GeodesicPolygon` checks.
- Field cleanup/render-queue mutation still follows the current generation-based IITC IRIS facade documented above, not
  full IITC `Render` object lifecycle parity.

General improvement backlog before calling this replacement-ready:

- Add a small IITC-style registry layer for highlighters/plugins before porting many one-off plugin features.
- Decide plugin/core strategy for smart ports: keep endpoint parsing and domain normalization in `@iris/iitc-core`, while
  leaving app-specific sheet/menu/runtime behavior in IITC-IRIS until another app needs the same surface.
- Decompose the large `apps/iitc-iris/src/content.tsx` into focused sheets/components/hooks once behavior settles:
  suggested first cuts are `SearchSheet`, `PortalSheet`, `MissionsSheet`, `CommSheet`, `SystemSheet`, menu state, and
  keyboard shortcuts.
- Revisit mobile menu architecture after live use. Current mitigation keeps submenus to one horizontal scroll row; later
  options include icon-first submenus, an overflow "More" action, per-primary compact drawers, or promoting rarely used
  actions into their sheets instead of the tabbar.
- Add a later icon-scanning pass only after Missions stabilizes. Use icons where they reduce scan time without replacing
  text labels. Candidate areas: portal actions/detail facts, inventory item categories, passcode reward rows, search
  result types, and COMM event/action types.
- Add focused tests around the new pure logic that is easy to isolate: COMM display de-duplication, search result
  ordering/grouping, portal details cached/loading state, mission sorting, mission cache TTL behavior, selected mission
  state transitions, and shortcut/menu state transitions.
- Run a visual/mobile pass with screenshots for the main sheets, portal details, Missions, COMM scrolling, selected search
  geometry, player tracker popup, and keyboard focus states.
- Browser geolocation is started: Map -> Controls has a user-triggered Locate action that requests browser location,
  pans/zooms with IITC's max zoom 13 behavior, and draws a current-location pin with an accuracy circle. Follow-up:
  keep distance-to-portal and mission distance-to-start as later plugin-style smart ports. They should be revisited
  after the base current-location behavior has had more live comparison time against IITC.
- Login-expiry/auth recovery UX first pass is started. IITC's boot behavior treats missing `PLAYER.nickname` as the
  login/account boundary; IRIS additionally centralizes post-boot Intel request auth classification and shows a shared
  map-level Login/Retry recovery prompt when map data, portal details, COMM, scores, missions, inventory, passcode, or
  subscription requests report `auth`. Follow-up: live-test expired sessions across Chrome/Firefox and decide whether to
  pause automatic background retries while the login prompt is active.
- Follow-up fix from live testing: missing Intel version and missing page `PLAYER` are now treated as auth/bootstrap
  failures for UI recovery. This avoids empty-map / "waiting for Intel version" states after cleared browser storage or
  expired sessions.
- Follow-up fix from live testing: the Login recovery action reloads the current Intel `/intel` page when already there,
  instead of assigning the same URL and appearing inert.
- Follow-up fix from live testing: the Login recovery action now sets a short session bypass before reload/navigation so
  IITC IRIS does not immediately remount over Intel's own sign-in/account page.
- Follow-up fix from live testing: the login bypass now polls and clears itself once Intel's authenticated dashboard
  bootstrap script appears, so IITC IRIS can remount automatically after successful original Intel login.
- Auth hardening: while an auth/bootstrap failure is active for live map data, automatic entity refresh and player-tracker
  COMM polling are paused. Explicit Retry clears the pause and attempts the current request again; successful map data
  status clears the auth pause.
- Auth UX polish: raw auth/bootstrap errors such as `missing csrftoken` are no longer shown as primary user-facing sheet
  text. Panels show a consistent "Intel login required" message and keep the raw error in diagnostic/title context.
- Auth UX polish: affected panels now include compact inline Login/Retry actions in addition to the global map-level
  recovery banner, so recovery is available without opening System diagnostics.
- Auth recovery stabilization - 2026-06-02:
  - User-facing auth recovery is now split into one clear surface per panel: the panel header owns status plus
    Login/Retry actions, while the body/footer only explains which data is blocked.
  - Side-panel header status collapses nested auth states into `auth`, including COMM send auth, Scores region auth,
    Missions details auth, Inventory subscription auth, and Agent missing/subscription auth. This avoids panels showing
    `idle` while a child request is actually waiting for Intel login.
  - Panel headers now use a shared right-aligned action group for status chips, inline auth buttons, and close buttons.
    Status chips and inline auth controls are explicitly sized to the same 18px control height.
  - Panel refresh remains manual by product choice for now. Map pan/zoom should not automatically re-request Missions,
    COMM, Scores, Inventory, Passcode, or Search. Later polish may add a non-requesting "view changed / refresh
    available" hint for Missions or COMM.
  - Latest auth stabilization validation passed:
    `npm run typecheck:iitc-iris`,
    `npm run test --workspace @iris/iitc-core -- missions.test.ts`,
    and `npm run package:iitc-iris`.
    Latest artifacts:
    `apps/iitc-iris/builds/iitc-iris-chrome-0.1.0-2026-06-02T17-39-23.zip` and
    `apps/iitc-iris/builds/iitc-iris-firefox-0.1.0-2026-06-02T17-39-23.xpi`.
- Sheet/menu stabilization - 2026-06-03:
  - Primary menu clicks and keyboard shortcuts now share the same toggle model: selecting the active primary sheet closes
    back to the map, while selecting it from the map opens the default sheet for that domain.
  - Portal selection still auto-opens portal details once per selected portal, but manually closing details keeps the
    sheet closed until a different portal is selected.
  - COMM channel selection follows IITC's `chat.chooseTab` model more closely: switching channels renders cached
    channel data from runtime memory immediately, then refreshes `getPlexts`; clicking the active channel is a no-op and
    explicit reload remains on the Refresh button.
  - Compact sheet close/clear buttons use the shared header action group, uppercase `X`, and explicit `aria-label`
    values.
- Continue IITC comparison passes on active requests during map movement: entity requests, `getPlexts`, portal details,
  inventory, scores, passcodes, and geocoder requests should all have expected overlap/idle behavior documented.
- Add missing known Intel/IITC-plugin request surfaces to the backlog and expose them in UI when ported:
  keep expanding beyond the already started `getHasActiveSubscription` and Missions endpoints as new IITC/plugin
  request surfaces are verified.
- Continue IITC-style long-press/right-click interactions for map and portal context actions. Portal context now works
  across desktop right click and mobile long press by selecting the portal and opening the normal portal sheet/details
  path. Link/field context now opens the Controls sheet with object metadata, selected-object highlighting, copy actions,
  and faction-colored clickable anchor rows that jump/select anchor portals. Plain map context events expose a compact
  Controls-sheet action row for centering the map and copying coordinates or an Intel URL. The Portal menu remains
  portal-only for now; a generic Selection menu for portal/link/field objects remains a later design decision.
- Make portal navigation from COMM, search, player tracker, inventory keys, and other portal links select the portal as
  well as pan/zoom to it. The selected portal should open the normal portal context/details path when the entity is
  loaded, and use a graceful loading/missing state when only a GUID or lat/lng is known.
  - Portal-link/navigation contract pass - 2026-06-05: runtime and UI boundary names now follow IITC concepts more
    closely with `zoomToAndShowPortal` and `selectPortalByLatLng`. Portal links keep a pending GUID/lat/lng selection
    when the target portal is not currently loaded, then select the portal through the normal details path when matching
    entity data arrives. Portal context interactions now use the same selected-portal details path; richer map-context
    actions remain a later pass.
- Keep reducing visible diagnostic noise in normal UI while preserving copied diagnostics for live parity reports.

Runtime policy notes to settle:

- Permission/manifest audit: review geolocation, clipboard, downloads, host permissions, and browser-specific behavior
  before release packaging. Keep permission prompts tied to clear user actions.
- Live auth failure UX: align `auth` and login-required states across entities, missions, inventory, passcodes, scores,
  search/geocoder, portal details, and subscription checks.
- Request cancellation policy first pass:
  - Map data: map move, live/fixture data-source switch, and generation changes abort or ignore stale `getEntities`
    work. Entity fetches are not cancelled just because a sheet closes.
  - Auth recovery: live automatic entity refresh and player-tracker COMM polling pause while auth recovery is active;
    explicit Retry clears the pause.
  - Portal selection: selecting/clearing a portal cancels in-flight portal details for the previous portal. Cached
    details may remain visible until the new portal enters loading/ready state.
  - Sheet close / switch to non-side-panel sheets: transient panel requests are cancelled via
    `IITC_IRIS_CANCEL_PANEL_REQUESTS` for portal details, COMM, scores, passcodes, inventory, missions, and mission
    details. Map data and subscription status are intentionally not treated as panel-transient.
  - Source switch inside Missions: switching view/portal missions cancels active mission list and detail requests.
  - Requests that may continue while hidden: subscription status can continue because it feeds Agent/Inventory state and
    is short-lived; search/geocoder is local to the map/search overlay and should get its own cancellation policy later.
  Follow-up: verify live request diagnostics for aborted panel requests and decide whether closing COMM should preserve
  or cancel older-message requests when the user immediately reopens COMM.
- Refactor caution: `content.tsx` and `page-map-runtime.ts` are large enough to slow safe edits. Do not do a broad split
  before lifecycle behavior stabilizes; after request cancellation policy settles, do targeted extraction around auth
  recovery helpers, request/panel status helpers, side-panel header/actions, and runtime request lifecycle helpers.
- Targeted cleanup started: pure panel/auth/subscription status formatting moved from `content.tsx` into
  `apps/iitc-iris/src/ui-status.ts`. Keep the next cleanup similarly narrow: side-panel header/action rendering first,
  then runtime request lifecycle helpers once live cancellation behavior is validated.
- Cache policy matrix: document every cache, TTL, key, invalidation rule, memory-only vs persistent storage, and when
  stale data is acceptable. Include map tile/entity cache, portal details, missions, inventory-derived key counts, search,
  COMM, scores, and subscription status.

Release and quality backlog:

- Mobile ergonomics pass: check sheet height, sticky headers/footers, map gestures, long-press conflicts, keyboard
  shortcuts on mobile browsers, and whether dense panels remain usable in portrait.
- Accessibility baseline: verify focus order, Escape behavior, button labels/titles, reduced-motion expectations, and
  color contrast for faction, rarity, mission, warning, and disabled states.
- Release checklist: record exact build/package commands, artifact naming, smoke-test routes, fixture locations, and the
  minimum live-Intel checks before sharing a package.
- Dirty worktree policy: keep the current discipline explicit in the plan. Do not reset user changes; inspect touched
  files before cleanup/refactor; keep generated artifacts and unrelated edits separate from behavior changes.

Cleanup assessment:

- A code cleanup pass is useful but not required before wrapping this checkpoint. The highest-value cleanup is extracting
  the oversized content UI into smaller modules; that is a refactor risk and should be done as its own pass after current
  testing, not mixed into the wrap-up. A low-risk cleanup pass can still scan for stale debug text, unused labels, and
  inconsistent close/elapsed affordances before a release build.

Long-term refactor/plugin sequence after the current parity checkpoint:

1. Small IITC parity refactor. Keep this narrow and behavior-preserving. Extract IITC-named facades and pure helpers for
   code we compare against IITC often: `comm`, `portalDetails`, `search`, `mapDataRequest`, `playerTracker`, portal-link
   navigation, long-press/right-click context handling, and request diagnostics. Add focused tests where helpers are
   pure. Do this before larger UI cleanup so later smart-ports have stable IITC-shaped landing zones.
2. Fresh IITC reference audit for unknown unknowns. Before assuming the current backlog is complete, reread
   `reference/ingress-intel-total-conversion/core/code` and categorize `reference/ingress-intel-total-conversion/plugins` against IITC IRIS. Produce a concrete
   missing-parity table with IITC source file/plugin, IRIS status, importance, and recommended pass. This should catch
   subtle core rendering/lifecycle gaps and high-value plugin workflows that the current plan only knows about from
   prior porting work.
3. IITC plugin/core foundation. Before adding many plugins, add a thin IITC-style registry/facade layer for hooks,
   highlighters, toolbox/menu entries, map context actions, layer registration, and portal detail extensions. This
   belongs after the small parity refactor and before porting plugin volume, because plugins need stable extension points
   more than they need a fully refactored UI shell.
4. Port selected IITC plugins in small vertical slices. Start with high-value plugins whose contracts exercise the new
   registry without requiring a full architecture rewrite: highlighters, bookmarks/saved views, keys workflows,
   long-press/right-click context actions, portal lists/counts, and small map utilities. Each plugin should document
   whether logic lives in `packages/iitc-core`, the extension runtime, or UI-only code.
5. UI refactor. Split the large content UI into sheets/components/hooks after the parity/plugin extension points are
   stable enough: `SearchSheet`, `PortalSheet`, `CommSheet`, `AgentSheet`, `SystemSheet`, menu state, keyboard shortcuts,
   elapsed/request chips, and common faction/portal display helpers. Keep the two-layer IRIS shell as the product
   decision unless replacement-readiness work says otherwise.
6. Larger core refactor. Do this later, after plugin behavior proves which concepts truly belong in core. The goal is to
   move stable, UI-independent IITC concepts into `packages/iitc-core` without turning core into a browser/plugin
   runtime. Good core candidates: entity decoding, map-data lifecycle, search ordering/geometry normalization, COMM
   parsing/display model, portal details normalization, inventory/key parsing, highlighter predicates, and plugin
   registry types. Poor core candidates: DOM rendering, sheet layout, browser storage, Leaflet marker instances, and
   extension messaging.

If the goal is more IITC plugins in core, do not wait for the big core refactor. First add the thin plugin/core
foundation in step 2, then port plugins one by one in step 3. As patterns repeat, promote stable pure logic into
`packages/iitc-core`; keep UI/runtime wiring in the extension. The later big core refactor should consolidate proven
patterns, not guess the architecture before plugin behavior is understood.
