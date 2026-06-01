# IITC IRIS Port Plan

Goal: build a clean IITC-compatible IRIS track with a Mini-IRIS-sized UI shell and an IITC-CE-derived core. This track
should use the same map library family as IITC-CE and avoid depending on the current IRIS map renderer while the port is
being validated.

Porting rule: prefer IITC-CE file names, public method names, data model names, and UI concepts when adding ported
behavior. Diverge only when TypeScript packaging, extension boundaries, or deliberate product decisions require it, and
document the reason in this plan near the relevant pass. Existing IRIS/Mini-IRIS names can be used as local reference
material, but they should not become the default naming source for IITC IRIS.

## Porting Doctrine

The goal is behavioral parity with IITC-CE without importing its incidental complexity. IITC IRIS should preserve IITC
concepts and seams so comparison and debugging stay cheap, while using modern TypeScript boundaries, tests, and small
modules to avoid carrying over hard-to-maintain structure.

Non-functional requirements:

- Source of truth: use `reference/IITC-CE` first for behavior, naming, request shape, lifecycle, and UI concepts. Use
  current IRIS/Mini-IRIS only as implementation reference or migration context.
- Parity before improvement: the first acceptable version of any core map workflow is the IITC-CE behavior, not a
  cleaner IRIS-style reinterpretation. Optimization, UX redesign, and architectural simplification are allowed only
  after parity is demonstrated or the divergence is documented as temporary.
- Name compatibility: keep IITC names for recognizable domains such as `comm`, `parseMsgData`, `portalDetails`,
  `getEntities`, `artifacts`, `ornaments`, `links`, `fields`, `portals`, and layer/UI concepts. Do not rename a concept
  just because a cleaner generic name exists.
- Structure freedom: do not copy IITC file layout, globals, DOM coupling, or mutation-heavy flow when those are
  incidental. A cleaner module boundary is allowed if exported names and behavior remain easy to map back to IITC.
- Parity harness first: every ported subsystem needs copied diagnostics, fixture/live comparison points, and focused
  tests before broader UI polish.
- Behavioral deltas must be explicit: if IITC IRIS intentionally differs from IITC-CE, document why in this plan and
  expose enough diagnostics to verify the impact.
- Thin runtime, tested core: request planning, parsing, decoding, classification, and derived counters should live in
  `packages/iitc-core`; the extension runtime should mostly wire Leaflet, browser APIs, and UI messages.
- Avoid “smart” rewrites before parity: simplify internals only after the equivalent IITC behavior is understood, named,
  and covered by tests or diagnostics.
- Keep user-facing UI comparable: core map workflows should look and behave close enough to IITC-CE that screenshot and
  live-state comparisons are meaningful. Debug and fixture controls can remain IITC IRIS-specific, but should stay
  visually separate.

Required process for each new subsystem:

1. Identify the IITC-CE source files under `reference/IITC-CE` and record them in the pass notes before implementing.
2. List the IITC public concepts being ported: file/module name, function names, endpoint names, data fields, UI
   pane/control names, and lifecycle events.
3. Choose IITC-aligned names at the boundary first. For example, prefer `comm.ts` plus `parseMsgData` over a cleaner but
   less traceable `plext.ts` parser name.
4. If a cleaner internal split is useful, keep a small IITC-named facade that maps directly back to the IITC source. The
   facade is the debugging contract.
5. Add tests or copied diagnostics that prove the IITC behavior before adding larger UI or architectural cleanup.
6. Document every intentional divergence in this plan with the reason, expected effect, and how to compare it against
   IITC-CE.

Naming checklist before creating a new file or exported function:

- Is there an IITC file or function with this responsibility? Use that name or an obvious TypeScript variant.
- Is the word from Intel payload terminology but not IITC module terminology, such as `plext`? Use it inside field/types
  where accurate, but prefer the IITC module concept at file/API boundaries, such as `comm`.
- Would a future debugger know where to look in `reference/IITC-CE` from this name? If not, rename or add a documented
  facade.
- Is the new name borrowed from current IRIS/Mini-IRIS? Treat that as suspect unless the pass explicitly documents why
  IITC naming is not appropriate.
- Is the divergence only for code cleanliness? Keep the IITC name at the boundary and hide the cleaner structure inside.

## Current Wrap-Up Status - 2026-05-31

IITC IRIS is in a usable parity/polish checkpoint. The extension now has the core IITC live-map path, entity rendering,
portal details, COMM, scores, inventory, passcodes, agent profile, player tracker, search, diagnostics, and a two-layer
menu model wired into one-sheet-at-a-time UI. The current build/package pass succeeded after the latest UI work:

- `npm run typecheck:iitc-iris`
- `npm run package:iitc-iris`
- Latest known artifacts:
  - `apps/iitc-iris/builds/iitc-iris-chrome-0.1.0-2026-05-31T21-21-38.zip`
  - `apps/iitc-iris/builds/iitc-iris-firefox-0.1.0-2026-05-31T21-21-38.xpi`

Recent completed progress:

- Map lifecycle: IITC-style active refill request scheduling is in place for `getEntities`; active request diagnostics now
  include entities, COMM/plexts, portal details, scores, inventory, passcodes, and other side requests so IITC/IITC IRIS
  comparisons can see overlap clearly.
- Scenario diagnostics: scenario runs are labelled more clearly, copied results include run IDs/status/snapshots, and
  scenario controls no longer invite accidental overlapping runs.
- Menu/UI shell: primary domains are `Map`, `Portal`, `Agent`, `COMM`, and `System`; secondary actions live above the
  main menu in sheets. All current sheets should have close affordances and `Esc` closes open sheets.
- Search: moved into the Map sheet, searches loaded portals first, supports coordinates, uses Nominatim with
  `polygon_geojson=1`, follows IITC-style result ordering, aligns selected-result zoom behavior, and keeps selected map
  geometry visible after the sheet closes until explicitly cleared.
- Portal details: owner and faction state are more prominent, status/level coloring follows IITC palette concepts,
  resonator health uses clearer bars, the header stays sticky while details scroll, selected portal details can use a
  cached state to avoid loading flashes, and the portal image can open larger.
- COMM: oldest/newest scrolling now behaves closer to IITC, older-message continuation requests are wired, new-message
  behavior keeps the user at the newest edge when appropriate, and message rows reduce duplicate actor/portal context
  while keeping map-linked references and diagnostic context available.
- Agent/player systems: player profile reads IITC-style page player data, inventory and passcode are separate
  Agent-domain sheets, player tracker pins/popups use faction marker imagery and the IITC IRIS dark look.
- Missions: first-pass Missions support is wired from the IITC Missions plugin concepts into the IRIS sheet model:
  `getTopMissionsInBounds`, `getTopMissionsForPortal`, and `getMissionDetails` are available from Map/Portal Missions,
  mission summaries/details parse through `packages/iitc-core/src/missions.ts`, selected mission routes draw on the map,
  route length/type/rating/duration/waypoint details are shown, and mission zoom uses IITC-style bounds with
  `DEFAULT_ZOOM` as the max zoom.
- UX polish: faction colors are applied more consistently to agents/owners/actors, request elapsed/ready chips moved to
  consistent panel footers or headers, keyboard shortcuts and a shortcuts sheet exist, and map keyboard focus can be
  controlled from System settings.

Intentional divergences and accepted gaps for this checkpoint:

- IITC IRIS keeps the bottom-sheet/two-layer menu model instead of porting IITC's sidebar/dropdown/statusbar shell. This
  is a deliberate product-shell divergence; core workflows should still stay comparable.
- Fast map movement can use a shorter movement delay than IITC. Keep it as a diagnostics/product choice, but compare
  against IITC with delay settings called out in copied snapshots.
- Search selection geometry persists after closing the sheet. This is intentional for IRIS usability; IITC-style hover
  preview/clear-on-mouseout remains a parity backlog item.
- Full IITC surgical render-queue mutation and tile-by-tile wanted checks are not fully ported. The current generation
  filtering/render facade is acceptable for this UI checkpoint, but should not be mistaken for complete `MapDataRequest`
  parity.
- Retry-exhausted stale fallback is wired and diagnosed but still needs a live case that proves cached stale tiles render
  exactly like IITC.
- Missions intentionally use explicit IRIS sheet actions rather than IITC's dialog collapse/expand refresh lifecycle.
  Portal mission enrichment from `mission` / `mission50plus` is documented but parked after an early attempt caused
  confusing Map/Portal Missions source switching. IITC mission caching and progress/checkmark state are not ported yet.
- Artifact non-empty live payloads, richer player tracker plugin behavior, plugin hooks, draw tools, highlighters,
  bookmarks, portal lists, and broader planning workflows remain later passes.

### Missions Port Pass - 2026-06-01

IITC source references:

- `reference/IITC-CE/plugins/missions.js`
- `reference/IITC-CE/plugins/missions.css`
- `reference/IITC-CE/core/code/portal_marker.js` for portal detail fields `mission` and `mission50plus`
- `reference/IITC-CE/plugins/images/mission-type-*.png` and `mission-length.png` for later visual parity

Ported IITC concepts and names:

- Endpoints: `getTopMissionsInBounds`, `getTopMissionsForPortal`, `getMissionDetails`
- Parser/core facade: `packages/iitc-core/src/missions.ts` with `parseIitcTopMissionsResponse`,
  `parseIitcMissionDetailsResponse`, `decodeIitcMissionSummary`, `decodeIitcMission`,
  `decodeIitcMissionWaypoint`, `getIitcMissionBounds`, and `formatIitcMissionDuration`
- Mission domain values: sequential/non-sequential/hidden mission order, portal/field-trip waypoint target,
  waypoint objectives, rating, median completion time, unique completed players, route length, and mission bounds
- Runtime/UI wiring: `IITC_IRIS_REQUEST_MISSIONS`, `IITC_IRIS_REQUEST_MISSION_DETAILS`,
  `IITC_IRIS_MISSION_ZOOM`, and `IITC_IRIS_MISSIONS_STATUS`

Current implementation choices:

- Map Missions and Portal Missions are explicit IRIS sheet actions. Unlike IITC's dialog lifecycle, opening/collapsing
  the sheet does not automatically re-request missions; this avoids duplicate request aborts in the extension shell.
- Mission list sorting follows IITC's natural alphanumeric title sort in the runtime before display.
- Mission route rendering uses IITC plugin route colors (`#404000` and `#A6A600`) and a separate Leaflet mission pane.
- Portal waypoint buttons use the existing IRIS portal-link navigation path so a loaded portal can be selected as well
  as panned/zoomed to.

Known gaps before calling Missions parity-complete:

- IITC portal detail enrichment adds a `Missions` link only when portal details include `mission` or `mission50plus`.
  Reintroduce this carefully after the Map/Portal source switching bugs are settled.
- Portal Missions currently refreshes when the Missions sheet is already showing portal-source data and the selected
  portal changes, but unlike core portal details it is not part of every portal selection. Revisit this after comparing
  vanilla Intel mission behavior and IITC plugin behavior: decide whether Portal Missions should stay sheet-scoped,
  become a portal-detail enrichment action, or adopt a cached selection-driven model.
- IITC caches mission details for 3 days and portal mission summaries for 3 weeks. IRIS currently does not cache mission
  responses beyond current runtime state.
- IITC mission progress/checkmark state, sync, app panes/dialog behavior, mission type/length icons, distance-to-mission,
  and Create New Mission link are not ported.
- Live comparison still needs copied diagnostics for request count/source, mission order, route bounds, and portal
  mission single-result behavior.

General improvement backlog before calling this replacement-ready:

- Add a small IITC-style registry layer for highlighters/plugins before porting many one-off plugin features.
- Decompose the large `apps/iitc-iris/src/content.tsx` into focused sheets/components/hooks once behavior settles:
  suggested first cuts are `SearchSheet`, `PortalSheet`, `CommSheet`, `SystemSheet`, menu state, and keyboard shortcuts.
- Add focused tests around the new pure logic that is easy to isolate: COMM display de-duplication, search result
  ordering/grouping, portal details cached/loading state, and shortcut/menu state transitions.
- Run a visual/mobile pass with screenshots for the main sheets, portal details, COMM scrolling, selected search
  geometry, player tracker popup, and keyboard focus states.
- Continue IITC comparison passes on active requests during map movement: entity requests, `getPlexts`, portal details,
  inventory, scores, passcodes, and geocoder requests should all have expected overlap/idle behavior documented.
- Add missing known Intel/IITC-plugin request surfaces to the backlog and expose them in UI when ported:
  keep expanding beyond the already started `getHasActiveSubscription` and Missions endpoints as new IITC/plugin
  request surfaces are verified.
- Add IITC-style long-press/right-click interactions for map and portal context actions. This should work across desktop
  right click and mobile long press, with clear touch behavior that does not fight normal map panning.
- Make portal navigation from COMM, search, player tracker, inventory keys, and other portal links select the portal as
  well as pan/zoom to it. The selected portal should open the normal portal context/details path when the entity is
  loaded, and use a graceful loading/missing state when only a GUID or lat/lng is known.
- Keep reducing visible diagnostic noise in normal UI while preserving copied diagnostics for live parity reports.

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
2. IITC plugin/core foundation. Before adding many plugins, add a thin IITC-style registry/facade layer for hooks,
   highlighters, toolbox/menu entries, map context actions, layer registration, and portal detail extensions. This
   belongs after the small parity refactor and before porting plugin volume, because plugins need stable extension points
   more than they need a fully refactored UI shell.
3. Port selected IITC plugins in small vertical slices. Start with high-value plugins whose contracts exercise the new
   registry without requiring a full architecture rewrite: highlighters, bookmarks/saved views, keys workflows,
   long-press/right-click context actions, portal lists/counts, and small map utilities. Each plugin should document
   whether logic lives in `packages/iitc-core`, the extension runtime, or UI-only code.
4. UI refactor. Split the large content UI into sheets/components/hooks after the parity/plugin extension points are
   stable enough: `SearchSheet`, `PortalSheet`, `CommSheet`, `AgentSheet`, `SystemSheet`, menu state, keyboard shortcuts,
   elapsed/request chips, and common faction/portal display helpers. Keep the two-layer IRIS shell as the product
   decision unless replacement-readiness work says otherwise.
5. Larger core refactor. Do this later, after plugin behavior proves which concepts truly belong in core. The goal is to
   move stable, UI-independent IITC concepts into `packages/iitc-core` without turning core into a browser/plugin
   runtime. Good core candidates: entity decoding, map-data lifecycle, search ordering/geometry normalization, COMM
   parsing/display model, portal details normalization, inventory/key parsing, highlighter predicates, and plugin
   registry types. Poor core candidates: DOM rendering, sheet layout, browser storage, Leaflet marker instances, and
   extension messaging.

If the goal is more IITC plugins in core, do not wait for the big core refactor. First add the thin plugin/core
foundation in step 2, then port plugins one by one in step 3. As patterns repeat, promote stable pure logic into
`packages/iitc-core`; keep UI/runtime wiring in the extension. The later big core refactor should consolidate proven
patterns, not guess the architecture before plugin behavior is understood.

### Map Lifecycle Doctrine

Map lifecycle is the highest-risk part of the port. For request scheduling, tile cache, stale fallback, render queue
timing, and map-data status, IITC-CE is the contract. IITC IRIS should port the `MapDataRequest` lifecycle directly
enough that live behavior can be compared line-by-line with:

- `reference/IITC-CE/core/code/map_data_request.js`
- `reference/IITC-CE/core/code/data_cache.js`
- `reference/IITC-CE/core/code/map_data_render.js`
- `reference/IITC-CE/core/code/map_data_debug.js`
- `reference/IITC-CE/core/code/map_data_calc_tools.js`

Required map lifecycle rules:

- Use an IITC-style tile-indexed cache, not only whole-response reuse. Fresh cached tiles should enter the render queue
  as `cache-fresh`.
- On retry exhaustion, use stale cached tile data when available and count/report it as stale/out-of-date, matching IITC
  `cache-stale`; do not silently replace this with `partialTileKeys` except as a temporary documented gap.
- Preserve IITC request queue semantics: centre-first tile ordering, `MAX_REQUESTS`, `NUM_TILES_PER_REQUEST`, dynamic
  bucket sizing, retry-count-based smaller batches, request delay constants, and timeout/error retry distinction.
- Preserve IITC render queue semantics: render cached/network/stale tiles through a queue, process incrementally, and
  end the request only after the render queue is drained.
- Preserve map movement lifecycle: pause rendering on move start, refresh on move end, avoid aborting map-data requests
  merely because a newer request started, and ignore old tile responses by checking whether their tile is still wanted.
- Keep optional side requests, such as artifacts, out of the critical map-data lifecycle unless IITC-CE does otherwise.
  If sequencing differs, document it as temporary and expose diagnostics.
- Do not solve map lifecycle problems with IRIS-style broad fetch/merge/render shortcuts when an IITC lifecycle concept
  exists. Port the IITC concept first, then decide whether a cleaner implementation can preserve the same observable
  behavior.

Current map lifecycle audit:

| Area                     | IITC-CE contract                                                                                                | IITC IRIS status                                                                                                                            | Action                                                                     |
|--------------------------|-----------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------|
| Tile math/data zoom      | `map_data_calc_tools.js` tile params and adjusted data zoom                                                     | Mostly aligned in `packages/iitc-core` with tests                                                                                           | Keep validating against IITC fixtures                                      |
| Initial request batching | `MapDataRequest.processRequestQueue`: max 5 requests, up to 25 tiles, dynamic bucket sizing, centre-first order | Runtime now uses core IITC queue batch helpers for initial live request waves while limiting the initial phase to one attempt per tile before compatibility retries | Validate live timing against IITC-CE on large low-zoom and dense high-zoom views |
| Retry lifecycle          | `requeueTile`, `handleResponse`, retry limit, timeout/error distinction, smaller batches after retries          | Retry request failures now flow through the same core response-bucket classifier and queue apply path as initial failures; returned-empty placeholder recovery remains a compatibility shim | Replace returned-empty shim with IITC-derived queue behavior after live validation |
| Tile cache               | `DataCache` per tile, fresh/stale decisions                                                                     | Same-bounds live refreshes now flow through `IitcDataCache` per-tile fresh/stale decisions instead of the broad whole-response reuse shortcut | Validate cache-fresh/cache-stale behavior during live same-bounds pans and reloads |
| Stale fallback           | Retry exhaustion renders stale tile via `cache-stale` when possible                                             | Wired but unproven under live retry exhaustion; copied diagnostics now expose `cacheStaleTiles` and `cacheStaleTileKeys`                   | Park unless live copies show cached tiles still ending as partial          |
| Render queue             | `pushRenderQueue` and `processRenderQueue` incrementally render cached, network, and stale tiles                | IITC-named render queue facade handles `cache-fresh`, `ok`, and `cache-stale`; copied diagnostics now expose rendered queue tile counts/statuses, but rendering still drains to merged responses | Use live diagnostics to validate flow before surgical render mutation       |
| Move lifecycle           | `mapMoveStart` pauses render queue; old non-cancelled tile responses ignored if no longer wanted                | Milestone B started: IRIS now invalidates render generations on `movestart`, clears pending refresh timers, suppresses movement progress renders, and does not abort old map-data fetches when a new live viewport starts; stale-generation cache warming is gated off after live tests showed no benefit | Validate fast pan/zoom behavior against IITC-CE; move toward tile-by-tile wanted checks |
| Artifacts                | IITC artifact subsystem is separate from base map-data tile lifecycle                                           | Mostly aligned after deferring artifact fetch until first map render; live non-empty payload still unverified                               | Keep as documented temporary sequencing until artifact parity is validated |

Adherence summary after 2026-05-31 audit:

- Adheres: IITC tile parameters/data zoom, tile key shape, centre-first tile ordering, max request and tile-per-request
  constants, response bucket classification, timeout/server-retry/error distinction, and copied diagnostics for live
  comparison.
- Partially adheres: dynamic request batching exists in core and now drives initial live request waves; `IitcDataCache`
  and an IITC-named render queue facade now exist; retry-exhausted tiles can use stale cached payloads; progressive
  rendering still drains to merged renders instead of true IITC surgical mutation batches; retry-limit state exists and
  retry request failures use the same response-bucket path as initial failures, but returned-empty high-zoom recovery is
  still a compatibility path.
- Does not yet adhere: full `MapDataRequest` render queue drain timing and surgical map-data mutation. Movement behavior
  is closer after the Milestone B `movestart` pass, but old map-data responses are still ignored by generation rather
  than IITC's tile-by-tile wanted checks.
- Map lifecycle is parked as acceptable for current UI parity work. Live copies on 2026-05-31 proved per-tile fresh
  cache and render queue behavior (`cacheFreshTiles` 131/132 and 132/132, first render around 0.1s). Stale fallback is
  wired and diagnosed but remains live-unproven because the test cases did not produce retry exhaustion for previously
  cached tiles. Retry diagnostics are intentionally noisy: `retryRequests` counts retry HTTP batches and
  `retriedTileKeys` includes tiles that recovered. Treat retry volume as a bug only if retries occur for fresh cached
  tiles, cached stale tiles still end as partial, or IITC-CE comparison shows a materially different retry pattern on
  the same viewport.

## Pass 1: Scaffold - Done

- Add `packages/iitc-core` as the porting target for IITC-CE request lifecycle, zoom semantics, entity decoding, and
  renderer-facing model code.
- Add `apps/iitc-iris` as a new extension app with a minimal shell, separate build/package scripts, and vendored IITC-CE
  Leaflet assets.
- Keep the app loadable before adding entity rendering, so later regressions are easier to isolate.

Acceptance:

- `npm run typecheck:iitc-core`
- `npm run test:iitc-core`
- `npm run typecheck:iitc-iris`
- `npm run package:iitc-iris`

## Pass 2: Request Lifecycle - Done

- Port IITC tile parameter calculation, tile queueing, cache keys, and request deduping into `packages/iitc-core`.
- Use IITC-CE zoom/data-zoom behavior as the source of truth.
- Add fixture-driven tests from the existing HAR files for Amsterdam and Damrak.

Acceptance:

- The new core produces the same map-data request shapes as IITC-CE for the first Amsterdam and Damrak test views.
- Tile state transitions are covered by tests before renderer integration.

Current status:

- Tile math, zoom/data-zoom selection, request key generation, basic batching, and the live-compat batch policy are
  ported.
- The IITC same-zoom refresh skip rule is ported in core: a move does not need a new request when the new viewport
  remains inside the previously fetched data bounds.
- IITC IRIS now uses the core IITC request batch shape for the first live request wave: up to 5 concurrent requests with
  dynamically sized batches capped at 25 tiles/request. Returned-empty summary tiles are still retried as single-tile
  compatibility requests, and response merging keeps a non-empty tile payload over a later empty payload for the same
  tile.
- Live-compat retry selection now comes from `packages/iitc-core`: the runtime retries returned-empty compatibility
  tiles plus explicit IITC response retry buckets such as timeout, error, and unaccounted tiles.
- Core now has an immutable IITC tile queue state model covering queued, requested, successful, failed, stale,
  active-request, and tile-error-count state; tests cover success removal, timeout requeueing, server retry without
  error-count increments, and retry-limit fail/stale behavior.
- IITC IRIS now uses that core queue state to drive live-compat retry selection while keeping the conservative existing
  batch shape; returned-empty summary tiles are an explicit compatibility option in the core queue.
- Runtime request batch construction now goes through core queue helpers for initial and retry phases. The initial phase
  uses IITC-style concurrent request buckets; the retry phase remains conservative while live empty-tile behavior is
  validated.
- Milestone A update: initial live request waves now use `createIitcTileQueueRequestBatches` from the active queue state
  instead of fixed sequential wave construction, while preserving one initial attempt per tile before compatibility
  retries.
- Milestone A update: retry request failures now call the same core response-bucket classifier and queue apply path as
  initial request failures, matching IITC's `handleResponse(undefined, tiles, false)` shape more closely.
- Milestone A update: the live runtime no longer uses the broad same-bounds whole-response cache shortcut; same-bounds
  pans now pass through the per-tile `IitcDataCache` fresh/stale path, while exact duplicate request keys can still
  no-op.
- Milestone B update: the live runtime now listens to `movestart`, clears pending refresh timers, invalidates the active
  render generation, suppresses progress renders while the map is moving, and lets old map-data requests finish instead
  of aborting them solely because movement ended.
- Milestone B update: starting a new live viewport request no longer aborts the previous map-data request; old responses
  are ignored by generation checks. In-progress copied diagnostics now include cached first-render entities and
  non-empty cached tile keys instead of reporting an empty entity block while cached tiles are visible.
- Milestone B update: throttled progress status messages now report entity counts from the last actually rendered
  progress frame, avoiding mixed copies where fetch counters came from a newer response but ornament draw counters came
  from the previous render.
- Milestone B update: copied diagnostics now include a separate `renderQueue` block with rendered tile counts split by
  `ok`, `cache-fresh`, and `cache-stale`, plus rendered tile keys and last rendered tile status. This keeps fetch queue
  and render queue parity evidence separate before true surgical render mutation.
- Milestone B update: successful tile payloads from old non-aborted map-data responses were tested as cache warmers,
  matching IITC's split where old responses can warm cache but are not rendered unless the tile is still wanted. Live
  copies repeatedly showed `staleGenerationCacheWarmTiles: 0` while slow views correlated with high timeout retry
  volume, so stale-generation cache warming is gated off by default as a temporary IRIS divergence.
- Milestone B update: copied diagnostics keep `staleGenerationCacheWarmTiles` and `staleGenerationCacheWarmTileKeys` so
  this gated behavior can be re-enabled and measured later if IITC-style movement/download delays are ported.
- Stabilization update: System sheet now has an `IITC Delay` dev toggle. Default remains the current fast post-move
  refresh; enabling the toggle waits 3s after `moveend`, approximating IITC's movement refresh delay for live
  comparison without changing default behavior.
- Stabilization update: copied diagnostics now include `entities.timing` with cache, initial request, retry, artifact
  wait, total, and movement-delay timings. Use this before more lifecycle changes so perceived slowness can be tied to
  initial requests, retries, artifact wait, or the movement-delay setting.
- Stabilization update: System sheet now has scenario buttons for live lifecycle comparison. `Fast` and `Delay` start
  runs with the chosen movement-delay setting and a `previous` snapshot so stale pre-mode diagnostics are explicit,
  `Pan S` provides a repeatable movement action, and manual `Reload`/`In Prog`/`Done` snapshots can be copied as one JSON
  bundle with `Copy Run`. This is diagnostic UI only; it does not change map-data behavior.
- Stabilization decision: default lifecycle stays on the fast 250ms post-move refresh. The IITC-style 3s movement delay
  remains a diagnostic comparison toggle because it can reduce retry pressure on some live runs but increases perceived
  latency. Remaining lifecycle parity gaps are accepted for now: surgical render mutation is not ported, stale fallback
  is wired but live-unproven, and old responses are still generation-filtered rather than checked tile-by-tile against
  the current wanted set.
- Player Tracker MVP: IITC IRIS now has live faction-split player tracker toggles (`PTR`, `PTE`, `PTM`) fed from `/r/getPlexts` all-COMM
  data. Core history reduction lives in `packages/iitc-core/src/player-tracker.ts` and follows IITC
  `player-activity-tracker.js` behavior for the three-hour history window, z9 visibility gate, ignored destroyed
  link/field messages, same-time portal grouping, averaged event coordinates, faction marker pins, and dashed magenta
  traces. The tracker pane is non-blocking so normal portal selection is not swallowed by the overlay; marker popups
  remain available on marker hits. Copied diagnostics expose player/event/marker/trace counts and latest COMM time. Full IITC plugin parity is
  still intentionally out of scope: search integration, ctrl/cmd nickname centering, add-ons, and OMS-grade co-located
  marker behavior remain later work.
- COMM parity note: IRIS stores and previews COMM oldest-to-newest like IITC `comm.renderData`, and continuation fetches
  now pass IITC's `ascendingTimestampOrder` write semantics through to storage. This keeps the visible order and GUID
  continuity comparable against stock IITC.
- Large initial tile plans are executed across all 25-tile request batches in waves of up to five concurrent requests,
  instead of stopping after only the first concurrent wave. This fixes low-zoom views such as z10 where the plan can
  contain more than 125 tiles.
- Placeholder-mode timeout retries now use the IITC-style per-tile retry limit, and final exhausted low-zoom placeholder
  tiles are reported as partial coverage instead of hard request failures.
- Runtime fetch cancellation is explicit: pan/zoom and data-source changes abort the active `getEntities` request, and
  core queue state can mark obsolete queued/requested tiles as stale instead of letting old responses race the newest
  map view.
- IITC IRIS keeps the core same-zoom refresh-skip helper for tests/reference, but the live runtime now favors
  tile-indexed `IitcDataCache` decisions over whole-response reuse when a pan stays inside fetched padded bounds.
- Response merge, tile-return diagnostics, requested-tile response classification, and IITC-style request response
  buckets now live in `packages/iitc-core` with tests, so the runtime no longer owns richer-payload merging, empty-tile
  detection, unaccounted-tile detection, or recovered-tile accounting.
- Response bucket diagnostic accumulation now also lives in `packages/iitc-core`, so live retry/timeout/error accounting
  is immutable and tested outside the page runtime.
- The remaining shim exists around returned-empty summary tile recovery: the core queue has IITC-style active request
  accounting, tile-specific retry/error counters, response bucket classification, and stale marking, but the runtime
  still performs explicit single-tile empty recovery until live parity is validated.
- IITC-named `IitcDataCache` and render queue facades now exist in `packages/iitc-core`. The runtime stores successful
  tile payloads, renders fresh cached tiles as `cache-fresh`, and can render retry-exhausted cached payloads as
  `cache-stale`.
- Important lifecycle gap: stale fallback is partially ported but not yet fully validated against IITC-CE. IITC IRIS
  has copied `cache-fresh`/`cache-stale` tile diagnostics and no longer uses the broad whole-response cache shortcut,
  but retry exhaustion with stale cached payloads still needs live validation before the gap can be considered closed.
- Important performance/parity gap: live z15 views can still take tens of seconds when many summary tiles timeout and
  recover, even with `successTiles === requestedTiles` and no partials. IITC IRIS now renders the merged live response
  progressively after initial batches and throttled retry progress, closer to IITC-CE's render queue behavior; copied
  diagnostics include final elapsed time and first visible render timing. Continue comparing against IITC-CE on the same
  viewport for retry count, timeout tile pattern, stale/partial data use, and whether remaining delay comes from
  cache/stale fallback or retry policy.
- The compatibility retry policy should remain while validating live parity, but the intended replacement is a closer
  IITC-CE-derived request queue in `packages/iitc-core`, not permanent ad hoc runtime policy.

## Pass 3: Entity Decode - Partial

- Port IITC-CE map entity parsing into `packages/iitc-core`.
- Preserve IITC concepts and names where they make comparison easier: portals, links, fields, ornaments, artifacts,
  shards, events.
- Decode fixtures from `docs/har` and `docs/update-map` without rendering concerns mixed in.

IITC-CE source references:

- `reference/IITC-CE/core/code/map_data_render.js`
- `reference/IITC-CE/core/code/portal_marker.js`
- `reference/IITC-CE/core/code/ornaments.js`
- `reference/IITC-CE/core/code/sidebar.js` and IITC's `window.artifact` setup path for artifact lifecycle.

Acceptance:

- Fixture counts by entity type match IITC-CE for the same request responses.
- Ornament and artifact identifiers are exposed distinctly enough for UI styling checks.

Current status:

- Portals, links, fields, placeholder portals, fake field-edge link filtering, and ornament IDs are decoded.
- Fixture tests cover low-zoom placeholder behavior and zoom-15 summary/ornament behavior.
- Artifact brief decoding is wired with a synthetic parser test, but live artifact behavior is unverified because Intel
  is not currently returning artifact portal payloads in the available test responses.
- Artifact brief normalization for renderer-facing fragment/target entries now lives behind the IITC-named
  `packages/iitc-core/src/artifact.ts` facade; IITC IRIS renders the core artifact entry shape directly.
- IITC IRIS fetches `/r/getArtifactPortals` in live mode as an IITC-style artifact subsystem request, independent of the
  `AR` visual layer toggle. Returned IITC-shaped `guid -> portal summary` artifact responses are normalized into
  renderable entities, injected into the rendered portal set, and reported with endpoint status/count/type diagnostics
  in copied debug JSON. The New Jersey Orion HAR captured during setup returned `{"result":{}}`, so non-empty live
  artifact payloads still need validation.
- Shard and event decoding still need dedicated live fixtures and tests.

## Pass 4: Leaflet Rendering - Partial

- Add portal, link, field, ornament, artifact, shard, and event layers using Leaflet primitives compatible with IITC-CE.
- Match IITC zoom visibility rules first, then refine visual styling.
- Keep renderer state independent from request lifecycle state.

IITC-CE source references:

- `reference/IITC-CE/core/code/map_data_render.js`
- `reference/IITC-CE/core/code/ornaments.js`
- `reference/IITC-CE/core/code/portal_marker.js`
- `reference/IITC-CE/core/code/portal_detail_display.js` for artifact display conventions.

Acceptance:

- IITC IRIS and IITC-CE show the same entity categories at comparable Amsterdam/Damrak zoom levels.
- Hard refreshes do not randomly hide links or fields once data is available.

Current status:

- Typed npm Leaflet is bundled into `iitc-iris`.
- Fields, links, placeholder portals, real portals, level fill, health fill, ornaments, level labels, and IITC-style
  artifact/shard marker icons render.
- Core IITC-style entity filters are available in the dock: unclaimed/placeholder portals, portal levels 1-8, and
  Resistance/Enlightened/Machina faction filters. The faction filters apply to portals, links, and fields, matching
  IITC-CE's default overlay semantics; ornament and artifact overlays remain independent IITC-style overlays when their
  own `OR`/`AR` layers are enabled.
- Ornament rendering honors IITC's `excludedOrnaments`, `knownOrnaments`, and `ingress.intelmap.layergroupdisplayed`
  localStorage settings through the IITC-named `packages/iitc-core/src/ornaments.ts` facade for known ornament sublayers
  such as `Anomaly`, `Scouting`, `Battle`, `Beacons`, `Fracker`, and `Shards`, so ornaments hidden in IITC's default
  layer configuration are not drawn in IITC IRIS either.
- IITC IRIS uses IITC core stock ornament marker images for common anomaly/scouting/battle/beacon/fracker/shard IDs
  currently seen in fixtures/HARs, while retaining IITC-style sublayer classification for those groups in
  `packages/iitc-core/src/ornaments.ts`.
- Dynamic ornament IDs are supported by exact known-ID mappings plus IITC-style prefix classification for future `ap*`,
  `sc*_p`, `peBB_*`, `peBR_*`, winner `peBN_*`, `peFRACK`, `peLOOK`, and other `pe*` beacon IDs; unknown IDs still
  render through IITC's stock marker image URL.
- Copied diagnostics include drawn/hidden ornament marker counts and ornament type counts, making IITC ornament
  exclusion and visual parity checks easier.
- Optional detail styling now has an explicit render policy: level fill, health fill, and level labels only draw when
  detailed portal data is available at zoom 14+ and the matching layer toggle is enabled. Ornament and artifact overlays
  follow IITC-CE more closely and can draw at any zoom when their data is available and their layer toggle is enabled.
  Base fields, links, and portals remain independent of that policy.
- Base renderer styling is closer to IITC-CE: team-coloured portal fills, IITC portal radius/weight scaling, 0.25 field
  fill opacity, full-opacity links, orange neutral portals, and text-only portal level labels with simple overlap
  thinning.
- Artifact rendering is wired with IITC's marker image convention (`{type}_shard.png` and `{type}_shard_target.png`) and
  can use either artifact briefs from `getEntities` or the live `/r/getArtifactPortals` endpoint. The `AR` toggle
  controls marker visibility only, not whether the endpoint is fetched, but non-empty live Intel data still needs
  validation with a real artifact fixture or HAR.
- Layer ordering and visual parity are only approximate.
- Shard, event, portal label polish, and plugin/highlighter parity are not done.
- Visual comparisons against an IITC-CE install with plugins enabled must account for plugin overlays. For example,
  Player Tracker markers are expected to appear in IITC-CE but not IITC IRIS until plugin parity work starts.

## Pass 5: Comparison UI - Started

- Add a Mini-IRIS-style control surface for fixture/mock mode, free search, current request state, and entity counts.
- Include a compact diagnostic view for zoom, data zoom, tile count, request count, and decoded entity totals.

Acceptance:

- Amsterdam and Damrak can be selected from fixtures.
- Free search can be used for other places without changing fixture behavior.

Current status:

- The System sheet shows zoom, data zoom, summary availability, tile span, fetch state, entity totals,
  real/placeholder/ornament portal counts, and copy-to-clipboard diagnostics. Earlier versions used a floating debug
  dock; that UI has been moved into the System sheet so map-first use has no permanent top-left debug panel.
- Copied diagnostics include IITC-style request response buckets (`serverRetryTileKeys`, `timeoutTileKeys`,
  `errorTileKeys`, `responseRetryTileKeys`, and `queueDelayReasons`) so slow-network retries can be separated from
  returned-empty tile recovery.
- Copied diagnostics also include core queue-state counters so the immutable queue model can be compared against the
  current live runtime loop before it replaces scheduling.
- Copied diagnostics include `partialTileKeys` and `queue.partialTiles` for low-zoom placeholder tiles that exhausted
  timeout retries without becoming hard request failures. These should eventually become `staleTiles` once per-tile
  stale-payload fallback is ported.
- Copied diagnostics include `elapsedMs` and `elapsedSeconds`; these are useful for trend comparison, but exact parity
  with IITC still depends on matching all request lifecycle timing semantics.
- Copied diagnostics include `entities.artifactFetch` so artifact-event tests can tell whether `/r/getArtifactPortals`
  was disabled, empty, ready, errored, or blocked by login HTML.
- Per-tile cached renders explicitly report cache-fresh/cache-stale diagnostics, so copied snapshots do not mix the
  current tile plan with stale queue counters from the previous network fetch.
- Copied diagnostics and the System sheet now show entity source (`live`, `cache`, or `fixture`) so pan/zoom lifecycle
  tests can distinguish network fetches from cached same-bounds renders.
- The dock replaces entity diagnostic snapshots on each status message instead of partially merging them, preventing
  stale retry/source/queue fields from leaking across live/cache/fixture transitions.
- The System sheet has fixed Amsterdam and Damrak view presets for repeatable IITC/IITC IRIS comparisons.
- The System sheet can jump to arbitrary comparison views from `lat,lng,z` text, Intel map URLs with `ll` and `z`, or IITC-CE
  portal links with `pll`.
- The floating map-controls panel has 25%-viewport pan buttons and +/- zoom buttons; these use the same Leaflet
  `setView` path as presets and therefore exercise the same move/zoom request lifecycle as mouse interaction.
- The dock can copy the current view back out as an Intel URL.
- The floating map-controls panel has base-map switches for CartoDB Dark Matter, CartoDB Positron, and OpenStreetMap,
  with the selected base map persisted for repeatable visual comparisons.
- Layer toggles are persisted; the default comparison view enables only fields, links, and portals while leaving level
  fill, health fill, ornaments, artifacts, labels, and tile debug off.
- Base map, core/detail layer toggles, side-system tabs, and pan/zoom controls live outside the debug/comparison
  controls. The data-source switch now lives in the System sheet because it is comparison/fixture infrastructure rather
  than IITC-style map UI.
- Current layer toggles:
    - `F`: fields.
    - `LN`: links.
    - `P`: portals.
    - `U`: unclaimed and placeholder portals.
    - `L1`..`L8`: portal levels 1 through 8.
    - `RES`, `ENL`, `MAC`: faction filters for portals, links, and fields.
    - `LF`: portal body fill by IITC level colours, matching IITC-CE's `Level Color` highlighter behavior, including
      neutral portals with an orange outline and level-coloured body.
    - `HF`: portal body fill by recharge status, matching IITC-CE's `Needs Recharge (Health)` highlighter behavior.
    - `OR`: ornament image overlays.
    - `AR`: artifact rings.
    - `LV`: portal level labels.
    - `T`: tile debug rectangles.
- Optional portal styling (`LF`, `HF`, `LV`) only renders when detailed portal data is available at zoom 14+; toggles
  may be enabled in the dock but still hidden in low-zoom placeholder mode. `OR` and `AR` follow IITC-CE overlay
  behavior and can render at any zoom when their data is available.
- The System sheet has a data-source switch for live Intel data, bundled Amsterdam z10/z14 fixtures, and a Damrak z15
  fixture extracted from an IITC HAR. Fixture mode renders deterministic saved `getEntities` responses and jumps to the
  matching view.
- Copied diagnostics include `renderPolicy`, so comparison snapshots show whether optional detail overlays were eligible
  to render.
- Visual parity comparisons should use the dock's viewport P/L/F counts and copied `entities.viewport` block; total
  fetched counts include padded request bounds and placeholder support entities.
- Mock controls and place-name geocoding are not yet implemented in IITC IRIS.

## Pass 6: Portal Selection and Details - Started

- Port IITC-like portal selection as the next comparison surface before broader side request/UI systems.
- Keep the first pass narrow: click/select a portal, render the selected portal highlight, expose selected
  GUID/title/team/level in the dock or innerstatus row, clear selection, and preserve selection across entity refreshes
  when the selected portal is still present.
- Add a portal details panel after the selection baseline is stable. The details panel should start with title, team,
  level, health, resonators, mods, owner, ornaments, artifacts, and basic link/field context where the decoded data
  supports it.
- Align core map UI with IITC-CE for comparison: selected portal details should live in an IITC-like side panel, while
  Mini-IRIS-style debug/copy controls stay collapsed in the comparison dock.
- Use portal selection/details to validate richer entity decoding and to anchor later COMM, inventory, artifact, and
  ornament comparisons.

IITC-CE source references:

- `reference/IITC-CE/core/code/portal_detail.js`
- `reference/IITC-CE/core/code/portal_detail_display.js`
- `reference/IITC-CE/core/code/portal_detail_display_tools.js`

Acceptance:

- Selecting the same portal in IITC-CE and IITC IRIS produces visually comparable selected-marker behavior.
- Selection remains coherent after pan/zoom refreshes and per-tile cached renders.
- Copied diagnostics include selected portal identity and enough selected-portal data to compare against IITC details.

Current status:

- First selection baseline is in progress: visible portal markers are clickable, the selected portal gets a separate
  orange Leaflet highlight ring, the compact innerstatus row shows the selected portal, selection can be cleared, and
  copied diagnostics include `selectedPortal`.
- A compact selected-portal summary row now uses the currently decoded map entity data: image, title, team, level,
  health, resonator count, mission flag, ornament/artifact counts, and basic link/field context from decoded map
  links/fields.
- Selecting a portal now starts a `/r/getPortalDetails` request. `packages/iitc-core` parses the IITC-shaped details
  response into owner, mods, resonators, history flags, mission flag, and derived mitigation; IITC IRIS exposes request
  status and parsed detail data in the selected row and copied diagnostics.
- A compact portal details panel now renders as a separate IITC-like right-side selected portal panel instead of
  expanding the main comparison dock. It shows a faction-colored shell, owner, mitigation, history flags, stable mod
  slots, a portal-centered resonator layout, selected link/field context, and safe portal actions for zoom/copy
  link/copy GUID.
- The first pass intentionally does not yet include verified IITC resonator compass-slot parity, deploy/recharge/link
  action wiring, inventory key counts, or IITC plugin/highlighter interactions.

## Pass 7: IITC Side Request/UI Systems - Started

- Port IITC side systems that require their own request lifecycle and UI, after portal selection is available as a
  stable anchor.
- Suggested order:
    - COMM: `/r/getPlexts` request lifecycle, `comm.parseMsgData`-style parsing, filters, message list, map-linked
      portal/player references where available.
    - Scores: request behavior, faction score display, checkpoint/cycle status.
    - Passcodes: request/submit flow, feedback states, history/errors if IITC exposes them.
    - Inventory: request lifecycle, item/key parsing, grouping/filtering, counts, and a dedicated panel.
    - Additional IITC request surfaces and plugin-derived UI can be added after these core systems are validated.

IITC-CE source references:

- `reference/IITC-CE/core/code/comm.js`
- `reference/IITC-CE/core/code/chat.js`
- `reference/IITC-CE/core/code/sidebar.js`
- `reference/IITC-CE/core/code/entity_decode.js` for extended portal history bits in `getEntities`.
- `reference/IITC-CE/plugins/highlight-portal-history.js` for visited/captured/scout-controlled highlighter behavior.
- `reference/IITC-CE/plugins/keys-on-map.js` and `reference/IITC-CE/plugins/keys.js` for key-count map labels.

Acceptance:

- Each side system has an explicit copied diagnostic block for request state, elapsed time, error/auth state, and
  decoded counts.
- UI panels are compact enough to compare with IITC without relying on the debug dock.
- Request behavior is documented where it intentionally differs from IITC-CE.

Current status:

- A compact IITC IRIS side-panel shell now exists for COMM, Scores, Passcodes, and Inventory. The panels persist their
  open/closed state, show explicit request state, and copied diagnostics include a `sidePanels` block.
- The COMM panel can issue `/r/getPlexts` requests for IITC-style `all`, `faction`, and `alerts` channels and reports
  status, elapsed time, auth/error state, bounds, response count, added count, stored message count, older-message
  continuation, and compact message previews parsed through `packages/iitc-core/src/comm.ts`. The parser and channel
  state deliberately follow IITC-CE `comm.parseMsgData`, `_genPostData`, `_writeDataToHash`, and render-markup semantics
  for team normalization, public/secure/alert categories, sender/player extraction, auto messages, narrowcasts, dedupe,
  timestamp continuation, transformed markup, map-linked portal references, and nickname-click insertion into chat
  input. Send-plext support is implemented for `all` and `faction` but still needs live user verification; plugin hook
  equivalents for nickname clicks are not ported yet.
- COMM is good enough to unblock other UI panels. Remaining COMM work is polish/live verification rather than a blocker:
  send-plext verification, plugin hook compatibility, and richer interaction can be deferred.
- Scores now has first-pass core wiring. The panel requests IITC-CE core endpoints `getGameScore` and
  `getRegionScoreDetails`, displays global faction MU totals/percentages plus compact regional score diagnostics, and
  includes the scores state in copied dock diagnostics. Remaining work is the richer IITC region scoreboard view
  (checkpoint table/chart/timers/top-agent details) and live validation against Intel responses.
- UI polish pass: selected portal details now use compact IITC-like stat cells, health/resonator energy bars, richer
  resonator owner display, and less cramped history/mitigation details. COMM now keeps normal request diagnostics out of
  the way unless debug/error state is active and uses denser message rows with stronger portal/player affordances. Scores
  now has global and regional ENL/RES split bars plus top-agent previews when Intel returns them.
- Follow-up polish moved portal facts below mods and collapsed panel request diagnostics into hoverable request chips for
  COMM, Scores, and Inventory so live-use panels stay focused while raw endpoint context remains available for testing.
- The request chips now live in panel footers. Inventory has a more dedicated layout for item totals, selected-portal key
  counts, top item rows, and top key rows now that live inventory responses have been observed working.
- UI shell now uses a two-layer bottom menu and a one-sheet-at-a-time model on desktop and mobile. The primary layer is
  `Map`, `Portal`, `Agent`, `COMM`, and `System`; the secondary layer exposes domain actions such as `Layers`, `View`,
  `Scores`, `Search`, `Profile`, `Inventory`, `Passcode`, COMM tabs, and diagnostics. This keeps the map-first
  Mini-IRIS feel while leaving room for IITC-style side systems without adding a permanent crowded toolbar.
- Passcodes are now wired as a core Intel panel using IITC's `redeemReward` request shape. The panel sanitizes printable
  passcodes, posts `/r/redeemReward`, and displays AP/XM/other/item rewards with endpoint diagnostics in the footer.
  Passcode redemption is now its own Agent-domain menu item and opens in the same bottom sheet style as the other side
  systems. Live reward formatting can be refined further after testing real passcode responses.
- Inventory is core Intel API parity for IITC IRIS because it is backed by Intel's `/r/getInventory` endpoint. Port the
  request lifecycle and parser directly from IITC/Intel behavior into the IITC IRIS code path; do not depend on or copy
  the existing IRIS inventory implementation. Plugin-like inventory extensions, player tracker, draw tools, and richer
  key overlays can be classified separately after the core inventory panel works.
- First-pass history/key overlays are intentionally low risk and IITC-aligned: the Layers sheet has tri-state controls
  for captured, visited, scout-controlled, and key count (`off`, `on`, `invert`). The runtime styles portals using
  extended `getEntities` history bits when present, remembered `/r/getPortalDetails` history data, and `/r/getInventory`
  key counts by GUID, following IITC behavior from `core/code/entity_decode.js`, `plugins/highlight-portal-history.js`,
  `plugins/keys.js`, and `plugins/keys-on-map.js`. Inverted history modes treat missing history as a target
  (`VIS!` means not known visited, `CAP!` means not known captured, and `SC!` means not known scout-controlled). This
  pass does not add bulk history fetching or hide/filter behavior; broader plugin/highlighter parity remains later work.
- The System sheet now owns app-level comparison/debug controls: copied diagnostics, Intel URL copy, fixture/live data
  source, view presets, jump input, and debug rows. This is an intentional product-shell divergence from IITC-CE’s
  sidebar/dropdown placement, kept separate from core map workflows so visual map comparisons remain meaningful.
- Map data request lifecycle now follows IITC-CE's active refill model: initial requests keep up to five active
  `getEntities` calls, each completed response immediately opens a slot for the next queued batch, and tile
  timeout/error retries are requeued through the same flow up to the IITC retry limit. This replaces the earlier
  wave-barrier behavior where IRIS waited for all active requests in a wave before starting more work.
- Search is now a Map-domain sheet rather than a floating panel. It searches loaded portals first, accepts coordinates,
  and uses Nominatim/OpenStreetMap geocoding on confirmed search with IITC-style result ordering: portal matches,
  coordinate matches, then geocoder results in service order. Geocoder requests include `polygon_geojson=1`; selected
  polygon/bounds results render a red preview layer and fit the view with IITC-aligned max zoom behavior. Remaining
  search parity gap: IITC previews result geometry on hover and removes it on mouseout, while IITC IRIS currently draws
  geometry on selection.
- COMM scrolling now follows the IITC mental model more closely: the message list is oldest-to-newest, scrolling to the
  older edge requests continuation messages, and new messages keep the user at the newest edge when appropriate.
- Player tracker popups and pins are closer to IITC's plugin: Resistance/Enlightened use IITC marker images, popup
  content shows nickname, age, portal link, and previous locations, and styling now follows the IITC IRIS dark sheet/map
  look instead of a default white Leaflet popup.
- Agent profile reads the page `PLAYER` data that IITC uses for level/AP/XM/invite/progress style details and exposes it
  under the Agent menu. Inventory and Passcode are separate Agent-domain sheets.
- Active request diagnostics now include `getEntities`, `getPlexts`, portal details, scores, inventory, passcodes, and
  other side requests so IITC vs IITC IRIS comparisons can see when non-entity work overlaps map movement or rendering.
- Missions first pass is now a native, read-only smart-port of IITC's missions plugin: `Map -> Missions` calls
  `/r/getTopMissionsInBounds`, `Portal -> Missions` calls `/r/getTopMissionsForPortal`, details call
  `/r/getMissionDetails`, and selected mission routes/waypoints render on the map.

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
| Search hover preview | Open | IITC renders geocoder/portal result geometry on hover and clears it on mouseout. IITC IRIS currently renders selection geometry only. |
| Long-press/right-click context | Open | Port IITC-style context interactions for map and portal actions. Support desktop right click and mobile long press without breaking map drag/pan gestures. |
| Portal-link navigation selection | Open | Navigating from COMM, search, player tracker, inventory keys, or other portal links should also select the portal and open/prepare the normal portal details context when possible. |
| C.O.R.E. subscription check | Open | Current IRIS/Mini-IRIS use `/r/getHasActiveSubscription` to track Intel inventory access, show C.O.R.E. status, and gate inventory polling/UI. IITC-CE reference core does not use this endpoint, so port it as an Intel capability rather than IITC core parity. |
| Mission endpoints | Partial | First read-only vertical slice exists: top missions in view, selected-portal missions, details, route/waypoint map overlay, and elapsed diagnostics. Remaining parity: persistent IITC-style mission caches, richer dialog actions, completed/progress state, uniques/history integrations, and plugin hooks. |
| Bookmarks and saved map/portal sets | Open | High-value IITC workflow still missing. Should be designed around persistent saved portals/views before broad plugin parity. |
| Keys workflows | Partial | Basic key counts and inventory parsing exist. Missing richer IITC `keys`/`keys-on-map` workflows, key search/list views, and saved key-management affordances. |
| Draw/planning tools | Open | IITC `draw-tools` concepts are not ported: lines, polygons, circles, import/export, and planning interactions. This should be a dedicated pass. |
| Link analysis layers | Open | Missing cross-links, link direction, linked portals, tidy/fly/done links, and related planning helpers. |
| Portal list/count views | Open | Missing IITC-style viewport portal tables, portal counts, and analysis lists. |
| Missions/uniques/history workflows | Partial | Portal history indicators and mission discovery/details exist. Missing full completed/progress workflows, uniques, and richer history list workflows. |
| Map utility plugins | Open | Missing user location, minimap, scale bar, zoom slider, privacy view, overlay KML, and similar utility plugins. |
| COMM/player plugin ecosystem | Partial | COMM and player tracker work, but richer COMM filters/hooks, nickname plugin interactions, and player level guess are not ported. |
| Dialog/sidebar/statusbar model | Diverged | IITC IRIS intentionally uses bottom sheets and a two-layer menu instead of IITC's sidebar/statusbar/dropdown model. Keep this documented as product-shell divergence. |

## Pass 8: Replacement Readiness - Not Started

- Compare IITC IRIS, Mini-IRIS, current IRIS, and IITC-CE on the same views.
- Document mismatches as intentional differences or blockers.
- Only then decide which current IRIS code can be retired or replaced.

Acceptance:

- A documented comparison table exists for the core zoom/entity cases.
- Remaining gaps are tracked as explicit work items instead of renderer surprises.
