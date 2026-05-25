# Work Items

This is the canonical shared worklog for IRIS, Mini-IRIS, shared runtime/engine work, packaging,
release hygiene, and deferred architecture decisions.

Use this file for cross-app planning. Keep one-off design notes in focused docs, then link them
from here when they become tracked work.

## Current Next Pickup

1. **[Mini-IRIS Bench]** Capture the small DBG matrix later: base, LVL, HP, KEY, and 3D variants.
2. **[Shared Runtime]** Continue the cross-app audit with backend/engine/domain candidates, not shared UI.
3. **[Shared Runtime]** Pause further package extraction unless smoke testing shows duplication or regressions; recent
   Mini-IRIS polish checks are stable enough to resume shared-boundary work.
4. **[Shared Runtime]** Prefer request/data/parsing/entity lifecycle extraction before UI component sharing.

## Worklog Areas

- **IRIS:** full extension app, page-world runtime, mobile ergonomics, diagnostics, draw tools, and Intel parity.
- **Mini-IRIS:** compact/mobile-first app, page-world map runtime, visual parity, and Mini-specific UX.
- **Shared Runtime / Engine:** parsers, entity/map feature builders, request policy, models, diagnostics formatting, and
  proven shared utilities.
- **Packaging / Release:** browser artifact naming, build commands, app layout, dependency maintenance, and release
  hygiene.
- **Deferred / Archive:** blocked, completed, or intentionally postponed work retained for context.

## Status Key

- `Open`
- `In Progress`
- `Done`
- `Blocked`
- `Investigating`
- `Reverted`

## IRIS Runtime Ownership And Startup Discipline

Status: `In Progress`

Goal:

- make startup, login handling, and recurring runtime behavior deliberate instead of noisy or overlapping

### Logged-out Intel startup is clear and non-intrusive

Status: `Done`

Outcome:

- detect the logged-out Intel landing page
- show IRIS guidance without replacing Intel's own login page
- suppress the full IRIS shell while logged out
- keep the logged-out mobile experience compact

Tasks:

| Task                                      | Status | Notes                                                 |
|-------------------------------------------|--------|-------------------------------------------------------|
| Detect logged-out landing page            | Done   | `initial_login_required` is implemented               |
| Show IRIS sign-in-required guidance       | Done   | helper layer only; Intel login remains primary        |
| Suppress full IRIS shell while logged out | Done   | topbar/map shell no longer mounts on the landing page |

### Coordinator-owned polling is predictable

Status: `In Progress`

Outcome:

- recurring requests should be coordinator-owned and easier to reason about

Tasks:

| Task                                                              | Status | Notes                                                                                                                                                  |
|-------------------------------------------------------------------|--------|--------------------------------------------------------------------------------------------------------------------------------------------------------|
| Coordinator session gating cleanup                                | Done   | now blocks both `expired` and `initial_login_required`                                                                                                 |
| Inventory polling freshness/in-flight cleanup                     | Done   | inventory no longer polls in the background; popup open and manual refresh now own inventory fetches                                                   |
| Reduce `getHasActiveSubscription` polling to Intel-like ownership | Done   | recurring subscription polling was removed; inventory open now relies on intercepted Intel state and explicit inventory fetches instead of a heartbeat |
| Passive fetch lifecycle ordering cleanup                          | Done   | `END` no longer lands before `SUCCESS` / `DATA`                                                                                                        |
| Keep tracking startup duplicate score/subscription burst          | Open   | only patch when ownership is clearer                                                                                                                   |

Bugs:

| Bug                                                                            | Status        | Notes                                                                    |
|--------------------------------------------------------------------------------|---------------|--------------------------------------------------------------------------|
| Initial duplicate `getHasActiveSubscription` / `getGameScore` burst on startup | Open          | later polling is single and predictable; tracked refinement, not blocker |
| Player-stats publication is still noisier than ideal                           | Investigating | materially improved, but still worth keeping disciplined                 |

### Inventory access and portal key visibility are more Intel-like

Status: `In Progress`

Outcome:

- inventory fetch ownership is now closer to Intel's click-driven flow
- inventory parsing is more deliberate and uses the same client-side derivation path for mock and live payloads
- portal details can show a key count from captured inventory
- empty or missing inventory responses are explained instead of silently reading as zero

Tasks:

| Task                                                                           | Status | Notes                                                                                                                            |
|--------------------------------------------------------------------------------|--------|----------------------------------------------------------------------------------------------------------------------------------|
| Stop background inventory polling                                              | Done   | IRIS no longer polls `getInventory`; popup open and manual refresh own the request                                               |
| Stop background subscription polling                                           | Done   | IRIS no longer runs a recurring `getHasActiveSubscription` timer; relies on intercepted Intel state plus inventory fetch flow    |
| Refactor inventory categorization out of the popup                             | Done   | parser now owns display-item derivation so mock and live inventory use the same logic                                            |
| Classify live `POWER_CUBE`, `BOOSTED_POWER_CUBE`, and `DRONE` shapes correctly | Done   | power cubes and drones are now treated as `POWERUPS` instead of weapons or disappearing                                          |
| Add portal key count to portal details                                         | Done   | portal details now shows `Keys` using recursive capsule-aware counting from captured inventory                                   |
| Clarify inventory-not-loaded vs empty-inventory UI                             | Done   | inventory popup and portal details now distinguish loading, not-yet-loaded, unavailable, and numeric states                      |
| Preserve previous inventory snapshot when Intel returns `{\"result\":[]}`      | Done   | empty inventory refreshes no longer wipe a previously captured inventory snapshot                                                |
| Refresh inventory mock against saved live payload shapes                       | Done   | mock inventory now includes realistic timed/player powerups, boosted power cube, drone, entitlement, and nested capsule contents |
| Include capsule-contained items in inventory tabs and totals                   | Done   | inventory display derivation now expands capsule contents recursively so popup totals and tabs match portal key counting         |
| Keep inventory tab bar visible while switching categories and scrolling        | Done   | inventory popup now owns the scroll area and the tab strip stays sticky instead of scrolling/clipping away                       |

Bugs:

| Bug                                                                                     | Status        | Notes                                                                                                                                                |
|-----------------------------------------------------------------------------------------|---------------|------------------------------------------------------------------------------------------------------------------------------------------------------|
| Inventory popup tabs still ignore capsule contents while portal key count includes them | Done          | display derivation now expands capsule contents, and grouping keeps capsule monikers distinct                                                        |
| Empty `getInventory` responses are ambiguous on Intel                                   | Investigating | IRIS now preserves the previous snapshot and explains the state in UI, but the underlying Intel behavior still needs more live verification          |
| Inventory tab bar can disappear after switching categories such as `ALL` or `KEYS`      | Done          | moved the tab strip into the actual inventory scroll container and kept it sticky there; long-list testing now behaves correctly in `KEYS` and `ALL` |

Improvement ideas:

| Idea                                                                                                     | Status | Notes                                                                                                                                                                               |
|----------------------------------------------------------------------------------------------------------|--------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Flatten capsule contents into derived inventory display items                                            | Done   | inventory popup totals and tabs now include capsule-contained items, aligning display derivation with recursive portal key counting                                                 |
| Use Intel-style inventory labels instead of raw enum names                                               | Done   | parser now follows the Intel item label mapping from the saved desktop reference, including labels such as `Apex Mod`, `Portal Fracker`, `Ultra Link`, and Intel-style beacon names |
| Sort grouped inventory rows by item count before name/level tiebreaks                                    | Done   | inventory popup now offers `COUNT`, `NAME`, and `RARITY` sort chips, with count-first as the default grouped view                                                                   |
| Preserve rarity through derived inventory items so chips and colours match Intel payloads                | Done   | capsules, keys, powerups, and level-backed resource items now keep payload rarity for display chips, colour selection, and rarity sorting                                           |
| Prefer level colour first, then rarity colour, before falling back to item-type colour                   | Done   | power cubes, resonators, and XMPs now use level colours, while keys, capsules, hypercubes, fireworks, and beacons use rarity colours when the payload provides it                   |
| Make category tabs data-aware instead of always showing every tab                                        | Done   | inventory tabs now hide empty categories after inventory loads and show per-category item counts                                                                                    |
| Decide whether `ENTITLEMENT` should be hidden, surfaced, or grouped separately                           | Open   | real payloads contain entitlement items; current parser intentionally ignores them                                                                                                  |
| Mark preserved inventory snapshots as stale after an empty refresh                                       | Open   | the popup now explains the preserved-snapshot behavior, but it still does not track or mark the currently displayed inventory as definitively stale/preserved                       |
| Add fixture coverage for nested capsule-derived display items                                            | Done   | parser tests now cover capsule-contained display derivation, preserved monikers, and recursive portal key counting                                                                  |
| Make `COUNT` and `RARITY` sorting span the full `ALL` list instead of staying category-first             | Done   | grouped inventory sorting is now global in `ALL`, with category only used as a final tiebreak                                                                                       |
| Expand rarity sort ordering to cover Intel values such as `VERY_COMMON`, `SPECIAL`, and `EXTREMELY_RARE` | Done   | rarity sorting now covers Intel-style values beyond just `AEGIS`, `VERY_RARE`, `RARE`, and `COMMON`                                                                                 |
| Preserve subtype-specific labels when a broad resource type maps to multiple Intel names                 | Open   | current parser lookup is mostly resource-type keyed, so item families that can differ by subtype/displayName still need a more deliberate label policy                              |
| Add lightweight inventory filtering without changing fetch ownership or parser behavior                  | Done   | popup now supports client-side name/metadata filtering for grouped inventory rows                                                                                                   |
| Keep the preserved-snapshot note truthful to the current inventory state                                 | Open   | current hint explains the behavior generically, but it is not yet gated on a tracked "showing preserved snapshot" state                                                             |

## Live Map Freshness

Status: `In Progress`

Goal:

- make IRIS map state update quickly and predictably enough that captures, link destroys, and field changes appear
  closer to Intel/IITC timing instead of waiting on incidental passive observation

### Entity refresh ownership becomes an IRIS concern

Status: `Open`

Outcome:

- IRIS should be able to request fresh `getEntities` data for the current view on its own schedule instead of relying
  only on Intel's fetch timing

Tasks:

| Task                                                                               | Status      | Notes                                                                                                                                       |
|------------------------------------------------------------------------------------|-------------|---------------------------------------------------------------------------------------------------------------------------------------------|
| Introduce a minimal IRIS-owned `getEntities` request path                          | Done        | IRIS now posts active `getEntities` requests using IITC-style `tileKeys` derived from current bounds/zoom                                   |
| Route entity refresh through a dedicated coordinator/scheduler path                | In Progress | request coordinator now owns startup, move-settle, and idle refresh; implement strict 5-request parallel limit (aligned with IITC)          |
| Preserve CSRF/version/session discipline for active entity fetches                 | Done        | active entity fetches now reuse the same guarded `safeIrisFetch` path as other Intel requests                                               |
| Implement strict concurrent request limiting                                       | Done        | limit parallel Intel requests to 5 (match IITC MAX_REQUESTS) to avoid blocking other traffic; implemented in `safeIrisFetch` via FIFO queue |
| Keep passive interception as a complementary signal, not the only freshness source | Open        | passive data is still useful, but should no longer be the sole reason the map becomes fresh                                                 |

### Viewport-driven entity freshness is deliberate

Status: `In Progress`

Outcome:

- current map bounds and zoom should drive when IRIS refreshes entities, with dedupe and backoff that stay
  understandable in logs

Tasks:

| Task                                                                   | Status | Notes                                                                                                                                                                                          |
|------------------------------------------------------------------------|--------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Refresh entities on startup after the initial map position is known    | Done   | startup catch-up now includes an active entity refresh when bounds are available                                                                                                               |
| Refresh entities after map movement settles                            | Done   | moveend now schedules a 3s settle delay before refreshing entities for the current bounds (aligned with IITC)                                                                                  |
| Add a periodic idle refresh for the current view                       | Done   | implemented adaptive idle poll: 5m for z > 12, 15m for z <= 12 (aligned with IITC)                                                                                                             |
| Gate entity refresh by zoom, in-flight state, and recent freshness     | Done   | current gate covers in-flight requests, same-coverage freshness, and zoom-dependent adaptive timers                                                                                            |
| Record enough coverage state to decide whether a new refresh is needed | Done   | uses `coverageKey` (bounds + zoom + tile count) to dedupe redundant fetches                                                                                                                    |
| Make entity refresh generation-aware after major view changes          | Done   | map moves increment an entity generation, queued stale active batches are dropped before fetch, and stale active responses are ignored while passive Intel responses still merge normally      |
| Batch tile requests to avoid massive timeouts                          | Done   | `getEntities` requests are now split into chunks of 25 tiles (aligned with IITC)                                                                                                               |
| Implement retry logic for failed entity fetches                        | Done   | coordinator now performs up to 3 retries with 5s backoff after a failed fetch                                                                                                                  |
| Reduce post-pan UI work on mobile                                      | Done   | map-state updates now no-op for identical views, `MapOverlay` skips same-view camera echoes, and ornaments build from the buffered viewport instead of all loaded portals                      |
| Prevent stale/idle refresh popup flicker during refresh                | Done   | map-stale alert now stays hidden while requests are active or an expected entity auto-refresh is due within a short grace window, so it should only appear when user action is actually useful |

### IITC-style mobile panning performance

Status: `Open`

Outcome:

- make map drag/zoom feel closer to IITC Mobile by keeping active movement mostly render-only
- avoid risky renderer swaps until simpler scheduling and visibility rules are measured
- current accepted baseline keeps portal key counts useful on map, preserves stationary IITC-level detail, and suspends
  field fill only during active mobile movement

Tasks:

| Task                                                          | Status | Notes                                                                                                                                                                                                                                                                     |
|---------------------------------------------------------------|--------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Pause expensive overlay work during active map movement       | Done   | HTML marker sync now defers while the user is actively moving/zooming the map and resumes after a short settle delay                                                                                                                                                      |
| Coalesce viewport source rebuilds                             | Done   | `moveend`, `zoomend`, and portal/link/field store updates now schedule one animation-frame viewport sync instead of stacking direct calls                                                                                                                                 |
| Add debug timing for map panning hotspots                     | Done   | debug logging now reports throttled viewport sync and HTML marker sync timings/counts so mobile panning bottlenecks can be measured                                                                                                                                       |
| Surface map performance samples in Diagnostics                | Done   | latest viewport and HTML marker timing/count samples are shown in Diagnostics with zoom, per-source counts/timings, browser/device context, and a copy button for mobile testing                                                                                          |
| Skip hover hit-testing while the map is moving                | Done   | desktop hover selection now avoids spatial hit-testing during active map movement and clears the cursor while dragging                                                                                                                                                    |
| Reduce offscreen entity buffer on mobile                      | Done   | mobile viewport sync now uses a bounded viewport-relative query buffer instead of the fixed multi-kilometer desktop buffer                                                                                                                                                |
| Simplify field fill rendering without hiding entities         | Done   | field fill antialiasing is disabled to reduce polygon edge work while preserving all visible IITC-level detail                                                                                                                                                            |
| Simplify expensive paint only while actively moving           | Done   | on mobile, field fill rendering is suspended and link width/opacity are reduced during pan/zoom, then full stationary detail is restored after settle                                                                                                                     |
| Add pan frame timing diagnostics                              | Done   | Diagnostics copy now includes average/max frame time, estimated FPS, and slow-frame counts after map movement                                                                                                                                                             |
| Measure translucent field/link overdraw before deeper changes | Done   | mobile samples improved from roughly 17-18 FPS to 27 FPS when field fill was suspended during movement, confirming field overdraw as a major bottleneck                                                                                                                   |
| Add automated pan benchmark for repeatable mobile samples     | Done   | mock tools now include a debug-only Bench action with selectable zoom, runs a deterministic 3-run pan sample, and records aggregate/median results in FRAME diagnostics                                                                                                   |
| Keep Bench working after page-world migration                 | Done   | Bench now runs inside the page-world map runtime and publishes FRAME benchmark snapshots back to IRIS diagnostics                                                                                                                                                         |
| Record page-world benchmark improvement                       | Done   | page-world Bench samples show Chrome desktop at `17ms / 60fps / 0 slow`, Firefox desktop at `8ms / 122fps / 1 slow`, and Firefox mobile at `18ms / 57fps / 1 slow`; later samples restored source diagnostics                                                             |
| Tune low-zoom moving-mode link rendering                      | Open   | IRIS 0.1.6 mobile batch on Firefox 149 showed z8 Normal pan at `30ms avg / 43 slow` while `No Links` improved to `18ms avg / 3 slow`; consider thinning or hiding links while actively moving, but compare against the field option first                                 |
| Make pan benchmark path deterministic under stutter           | Done   | Bench now drives the map by requestAnimationFrame and direct center interpolation instead of animated `panBy`, avoiding path drift from queued mobile pan animations                                                                                                      |
| Add benchmark sample history or run count                     | Done   | Bench now runs 3 samples and reports run count, median average frame time, average range, and worst frame in Diagnostics copy output                                                                                                                                      |
| Define fixed benchmark scenarios for version comparisons      | Done   | `docs/PERF_BENCHMARKS.md` now defines base map, default use, labels on, draw tools on, and heavy overlay scenarios with fixed center/zoom/style/browser/run-count guidance                                                                                                |
| Compare stationary vs moving field-render modes               | Open   | IRIS 0.1.6 mobile batch on Firefox 149 showed z8 Normal pan at `30ms avg / 43 slow` while `No Fields` improved to `18ms avg / 0 slow`; field simplification/hiding is the lowest-risk first candidate because links are usually more useful for orientation while panning |
| Add overlay-hidden benchmark variant                          | Done   | Bench now supports `Base` and `No Plugins`; page-world HTML marker registries stay hidden during those runs even if marker sync fires mid-benchmark                                                                                                                       |
| Add entity-layer isolation benchmark variants                 | Done   | Bench now supports `No Links` and `No Fields`, and Batch includes those z8 pan scenarios so low-zoom core entity rendering can be separated from plugin-overlay cost                                                                                                      |
| Make batch benchmark output copyable without clipboard        | Done   | Batch now stores its report in an on-screen selectable textarea and keeps Copy/Show actions after the run because long async batches can lose browser clipboard activation                                                                                                |
| Add raster/base-map benchmark variant                         | Open   | compare normal raster tiles against a simplified/base-only map style during Bench to isolate tile compositing cost on mobile                                                                                                                                              |
| Compare RAF jump benchmark against real finger pan samples    | Open   | current Bench is deterministic but may measure `jumpTo` camera update cost; keep manual finger-pan FRAME samples as the real UX reference                                                                                                                                 |
| Restore page-world viewport/source benchmark diagnostics      | Done   | page-world data sync now publishes viewport source counts and `setData` timings back into Diagnostics; `HTML` remains intentionally absent because page-world no longer uses the old HTML marker sync path                                                                |
| Rename or remove stale HTML marker diagnostics                | Done   | Diagnostics and copied benchmark output no longer show the old HTML marker row in page-world mode; source and frame diagnostics remain visible                                                                                                                            |
| Resume label-heavy overlays after a short settle delay        | Open   | IITC updates portal names/levels after request/refresh hooks with delays; use a similar delayed path for level/key labels                                                                                                                                                 |
| Cap label-heavy HTML markers on mobile                        | Open   | keep the visible IITC-like HTML marker path, but render only on-map/near-viewport labels and cap counts before considering renderer swaps                                                                                                                                 |
| Add overlap thinning for portal level and key labels          | Open   | mirror IITC portal-level-numbers behavior: suppress lower-priority nearby labels instead of drawing every label                                                                                                                                                           |
| Gate player tracker visibility and COMM interest by zoom      | Done   | player tracker now clears overlays below z9, skips plext rebuilds while hidden, and rebuilds from the latest plext snapshot when zoom returns                                                                                                                             |
| Reprocess richer COMM plext updates in player tracker         | Done   | tracker now keys processed plexts by id plus content fingerprint, so later richer COMM markup/action data updates the map without requiring refresh                                                                                                                       |
| Profile store subscriptions and UI rerenders during pan       | Open   | identify components that rerender from `mapState` or plugin feature churn while the user is dragging                                                                                                                                                                      |
| Revisit MapLibre symbol labels only after mobile root cause   | Open   | desktop symbols worked, mobile did not; keep as a later investigation after scheduling/capping improvements are measured                                                                                                                                                  |

Risks:

| Risk                                                        | Mitigation                                                                                               |
|-------------------------------------------------------------|----------------------------------------------------------------------------------------------------------|
| Deferring overlays may make labels feel late after panning  | start with short settle delays and keep base portals/links/fields moving normally                        |
| Mobile caps may hide expected key/level labels              | prefer deterministic nearest/visible prioritization and document the rule in the work item before coding |
| Replacing HTML labels could regress mobile visibility again | keep the current HTML fallback until a symbol-layer fix is verified on mobile                            |

### Entity merge and removal behavior stays correct under faster refresh

Status: `Done`

Outcome:

- more frequent entity updates should not regress correctness, selection behavior, or cleanup

Tasks:

| Task                                                                         | Status | Notes                                                                                                       |
|------------------------------------------------------------------------------|--------|-------------------------------------------------------------------------------------------------------------|
| Review newer-data-wins rules for portals, links, and fields                  | Done   | implemented 'richer-wins' merge policy: summary updates no longer wipe detailed mod/res/ornament data       |
| Keep delete cascades reliable under repeated entity refreshes                | Done   | verified existing cascade logic; portal delete removes attached links/fields                                |
| Remove links/fields when a portal's team changes                             | Done   | `updatePortals` now triggers cleanup when a portal becomes neutral or changes teams                         |
| Decide whether selected portals need temporary preservation semantics        | Done   | implemented preservation: `cullEntities` ignores the currently selected portal                              |
| Verify artifact and ornament overlays remain coherent after entity refreshes | Done   | implemented preservation: `cullEntities` ignores portals with active artifacts                              |
| Implement periodic distance-based culling                                    | Done   | coordinator now triggers a 50km radial cull every 5 minutes to maintain performance                         |
| Implement per-tile freshness tracking                                        | Done   | store now tracks `lastSuccessAt` per `tileKey`                                                              |
| Implement surgical fetching                                                  | Done   | coordinator now only requests tiles that are stale (> 2m old), skipping already fresh tiles during pan/zoom |
| Implement age-based cache culling                                            | Done   | `cullEntities` now prunes tile freshness entries older than 1 hour                                          |
| Fix portal visibility below zoom 15                                          | Done   | implemented placeholder portal extraction from links and fields in `parseEntities`                          |
| Fix data-zoom detail level gating                                            | Done   | `getDataZoomForMapZoom` now correctly accounts for level changes even when `hasPortals` is false            |
| Ensure low-zoom marker visibility                                            | Done   | added zoom 3 interpolation points to `circle-radius` paint properties in `MapOverlay`                       |

### Freshness is observable in diagnostics

Status: `Done`

Outcome:

- entity freshness work should be easy to inspect while tuning behavior

Tasks:

| Task                                                                 | Status | Notes                                                                                                 |
|----------------------------------------------------------------------|--------|-------------------------------------------------------------------------------------------------------|
| Add explicit entity freshness status to diagnostics                  | Done   | shows Source (IRIS/Intel), Coverage, and detailed timing labels                                       |
| Log why an entity refresh was triggered or skipped                   | Done   | diagnostics now show the trigger reason (e.g. move-settle) and skip reason (e.g. cooldown, in-flight) |
| Distinguish passive entity updates from IRIS-owned refreshes in logs | Done   | UI explicitly labels IRIS vs Intel success times                                                      |

Improvement ideas:

| Idea                                                                                                       | Status | Notes                                                                                                                                      |
|------------------------------------------------------------------------------------------------------------|--------|--------------------------------------------------------------------------------------------------------------------------------------------|
| Use COMM or other high-signal events as a hint to accelerate the next entity refresh                       | Open   | good later refinement, but should follow basic viewport-driven ownership                                                                   |
| Move toward IITC-style coverage tracking instead of only time-based freshness                              | Open   | likely phase 2 after the first minimal owned refresh loop works                                                                            |
| Consider a lightweight tile/cell cache only if simpler bounds-based refresh remains too stale or too noisy | Open   | not a phase-1 requirement                                                                                                                  |
| Profile mobile post-pan delay with real data                                                               | Open   | if button latency remains, inspect `syncViewport`, plugin HTML marker sync, reverse geocoding, and immediate plext refresh after `moveend` |

## Map Interaction Extensions

Status: `Open`

Goal:

- keep the current portal click handler stable while expanding map interaction targets later

Improvement ideas:

| Idea                                                                           | Status | Notes                                                                                                    |
|--------------------------------------------------------------------------------|--------|----------------------------------------------------------------------------------------------------------|
| Add field selection to the shared map interaction model                        | Done   | implemented `FieldInfoPopup` that identifies clicked fields and displays anchors and estimated MU        |
| Add link selection to the shared map interaction model                         | Done   | implemented `LinkInfoPopup` that identifies clicked links and displays anchors and length (KM)           |
| Add artifact-specific handling after portal/field/link selection feels settled | Open   | keep artifacts separate for now; decide later whether they open portal details or their own details view |
| Expand hover feedback only if it needs richer states than a pointer cursor     | Open   | keep hover simple unless future selected targets need distinct affordances                               |

## Intel Parity Features

Status: `In Progress`

Goal:

- restore missing Intel-core behavior carefully, without guessed endpoints or unstable UX

### Intel-native portal search is only restored after real verification

Status: `Blocked`

Outcome:

- do not ship guessed Intel portal search behavior

Tasks:

| Task                                                                    | Status  | Notes                                    |
|-------------------------------------------------------------------------|---------|------------------------------------------|
| Re-check local Intel references for a real search endpoint              | Done    | local references still do not expose one |
| Keep Intel-native portal search disabled until live verification exists | Blocked | no verified live Intel request path      |

Bugs:

| Bug                                           | Status   | Notes                                   |
|-----------------------------------------------|----------|-----------------------------------------|
| Old `/r/getPortalSearch` assumption was wrong | Reverted | treat as invalid until proven otherwise |

### Mobile shell wording feels cleaner without getting heavier

Status: `Done`

Outcome:

- improve wording while preserving compact mobile layout

Tasks:

| Task                             | Status | Notes                                                                                                       |
|----------------------------------|--------|-------------------------------------------------------------------------------------------------------------|
| Rename `Comm` to `COMM`          | Done   | topbar/menu wording pass                                                                                    |
| Rename score labels              | Done   | `Global Scoreboard`, `Region Scores`                                                                        |
| Rename menu utility labels       | Done   | `Passcodes`, `Map Style`, `Diagnostics`                                                                     |
| Clean up map mode toggle wording | Done   | `Use Intel Map` / `Use IRIS Map`                                                                            |
| Add passcode result stale state  | Done   | passcode popup now marks previous success/error results stale when the input changes before the next submit |

### Search UX should explain current scope better

Status: `Done`

Outcome:

- make it clear that search currently means coordinates/location search, not Intel portal-name search

Tasks:

| Task                        | Status | Notes                                                                                                                        |
|-----------------------------|--------|------------------------------------------------------------------------------------------------------------------------------|
| Clarify search UX in topbar | Done   | placeholder and error wording now keep search scoped to place/coordinate search without implying hidden Intel portal-name UI |

Bugs:

| Bug                                               | Status | Notes                                                                              |
|---------------------------------------------------|--------|------------------------------------------------------------------------------------|
| Search can be misunderstood as portal-name search | Done   | verified current topbar wording keeps search scoped to place and coordinate lookup |

### Portal details show the portal facts we can derive confidently

Status: `In Progress`

Outcome:

- improve portal details without destabilizing mobile interaction or changing the popup model

Tasks:

| Task                                                              | Status | Notes                                                                                          |
|-------------------------------------------------------------------|--------|------------------------------------------------------------------------------------------------|
| Keep shared popup interaction model                               | Done   | no MapLibre popup migration                                                                    |
| Reorder portal sections                                           | Done   | `MODS` now appears above `RESONATORS`                                                          |
| Add links and energy summary                                      | Done   | now shows links in, links out, and energy current/max from existing store data                 |
| Compact popup layout polish                                       | Done   | keep descriptive labels; use tighter summary/details tables without changing popup ownership   |
| Fix mobile two-column layout for tables                           | Done   | summary and details tables now stay 2-column on mobile                                         |
| Enhance `parser.ts` for more detailed mod stats and history flags | Done   | capture 100% of attributes found in IITC's `entity_decode.js` (shielding, history flags, etc.) |

## Immersive UX and Mobile Ergonomics

Status: `In Progress`

Goal:

- Achieve 100% map immersion while providing one-thumb access to all tactical tools

### Zero-Topbar immersive layout

Status: `Done`

Outcome:

- achieve 100% vertical map visibility on mobile and desktop
- move secondary utilities (Search, Geolocate) into ergonomic floating or dashboard locations

Tasks:

| Task                                   | Status | Notes                                                                                                                         |
|----------------------------------------|--------|-------------------------------------------------------------------------------------------------------------------------------|
| Remove static Topbar                   | Done   | purges screen-top chrome entirely                                                                                             |
| Implement Floating Action Button (FAB) | Done   | moved Geolocate to a fixed top-left map action so it stays clear of the bottom dock, drawers, planning bar, and mobile sheets |
| Move Location Search to Popup          | Done   | accessible via Nav Dashboard; clean full-screen input experience                                                              |
| Map interaction backdrop               | Done   | tapping anywhere on the map backdrop instantly dismisses open drawers                                                         |

### Multi-Tab Dock Drawer system

Status: `Done`

Outcome:

- granular, context-aware navigation using a 6-tab persistent bottom dock
- zero-occlusion toggling for map visuals and filters

Tasks:

| Task                              | Status | Notes                                                                                                                           |
|-----------------------------------|--------|---------------------------------------------------------------------------------------------------------------------------------|
| 6-Tab Dock Implementation         | Done   | Agent, Map, Tactical, Layers, Visuals, System tabs established                                                                  |
| Modular Drawer Architecture       | Done   | each tab logic isolated in dedicated components (`AgentTab.tsx`, etc.)                                                          |
| Thematic Button Coloring          | Done   | unique colors per dock button for peripheral visual recognition                                                                 |
| Explicit State Naming Prefixing   | Done   | refactored store to use `layerShow`, `filterShow`, and `activeVisualOverlay` prefixes                                           |
| Integrated Plugin Toggles         | Done   | highlighters and player-tracker visibility integrated directly into drawer tabs                                                 |
| Active Overlay Persistence        | Done   | `activeVisualOverlayIds` now survives hard refreshes via localStorage                                                           |
| Use user-facing drawer titles     | Done   | drawer headers now use explicit labels such as Agent, Map, Tactical, Layers, Visuals, and System instead of raw tab ids         |
| Tighten drawer height and spacing | Done   | removed the old dock-reserved bottom padding and tightened drawer header/section spacing while keeping button targets unchanged |

### Mobile browser ergonomics

Status: `In Progress`

Outcome:

- mobile browser navigation and gestures should feel deliberate instead of accidentally leaving or refreshing Intel
- keep this as a final main-IRIS polish pass before starting the larger mini-IRIS alignment work

Tasks:

| Task                                   | Status | Notes                                                                                                                   |
|----------------------------------------|--------|-------------------------------------------------------------------------------------------------------------------------|
| Back closes IRIS UI before browser nav | Done   | browser/Android Back now closes the active IRIS drawer, popup, selection, or plugin detail before falling through       |
| Contain map/drawer/popup overscroll    | Done   | IRIS root, page-world map container, popups, and drawers use overscroll containment to reduce accidental pull refresh   |
| Mobile gesture smoke test              | Open   | verify on device: map pan, drawer scroll, popup scroll, long-press info, Back close order, and browser refresh behavior |

### Faction and player styling is consistent

Status: `Done`

Outcome:

- improve faction normalization and ensure table layout is mobile-safe

Tasks:

| Task                                                                      | Status | Notes                                                                                                                 |
|---------------------------------------------------------------------------|--------|-----------------------------------------------------------------------------------------------------------------------|
| Fix mobile two-column layout for tables                                   | Done   | summary and details tables now stay 2-column on mobile                                                                |
| Refactor `normalizeTeam` logic                                            | Done   | strictly improved mapping for ENLIGHTENED, RESISTANCE, and NEUTRAL (M)                                                |
| Add time to player actions in player tracker popup                        | Done   | display time for each action in the recent actions list                                                               |
| Add team color to player name in player tracker popup                     | Done   | player name now uses faction color in the popup                                                                       |
| Add Guess player level to    player tracker popup  (Could be a plugin)    | Todo   | use highest resonator level used by player                                                                            |
| Maybe add divider between iris-status-indicator-group items in status bar | Done   | implemented visual dividers between status groups in UI bar                                                           |
| Bring back proper mod colors (common green, etc)                          | Done   | updated INGRESS_MOD_RARITY to use IITC-CE scheme (#49EBC3, #B68BFF, #F781FF) and implemented getModRarityColor helper |

Bugs:

| Bug                                                                   | Status   | Notes                                                  |
|-----------------------------------------------------------------------|----------|--------------------------------------------------------|
| MapLibre portal popup experiment broke mobile portal clicks           | Reverted | experiment reverted; shared `PortalInfoPopup` restored |
| Player-tracker popup behavior was affected during the same experiment | Reverted | resolved by reverting the experiment                   |

### Map state is persistent and context-aware

Status: `Done`

Outcome:

- map location and zoom survive page reloads
- map center is translated into a human-readable address
- Intel search jumps are synchronized to the IRIS state

Tasks:

| Task                                               | Status | Notes                                                                                                                                        |
|----------------------------------------------------|--------|----------------------------------------------------------------------------------------------------------------------------------------------|
| Persist map state to localStorage                  | Done   | lat, lng, and zoom are now persistent                                                                                                        |
| Implement reverse geocoding                        | Done   | uses Nominatim API with 1s debounce and precision throttling                                                                                 |
| Sync Intel search moves                            | Done   | hooked Google Maps `idle` event to capture search jumps                                                                                      |
| Visualize address status in Diagnostics Popup      | Done   | shows stale/resolving states and a debounce countdown                                                                                        |
| Persist resolved address and geocode metadata      | Done   | top-level persistence ensures "instant" UI on reload                                                                                         |
| Enable/Disable Map Rotation and Pitch              | Done   | add setting to store; integrated into "Map Style" popup                                                                                      |
| Fix map zoom "bounce" effect                       | Done   | removed rounding/zoom-floor and added snap-prevention                                                                                        |
| Keep persisted `mapState` authoritative on startup | Done   | split Intel startup position from later Intel sync so reload now prefers persisted camera without using `lastResolvedLatLng` as camera state |

Bugs:

| Bug                                                                     | Status | Notes                                                                                                                                  |
|-------------------------------------------------------------------------|--------|----------------------------------------------------------------------------------------------------------------------------------------|
| Viewport missions popup can stay stuck on "Move the map once" after pan | Done   | preserving existing `mapState.bounds` when sync updates arrive without bounds keeps viewport missions available after pan/startup sync |

### Portal details show richer derived stats after targeted investigation

Status: `Open`

Outcome:

- investigate whether more Intel-like derived portal stats can be shown safely

Tasks:

| Task                                                    | Status | Notes                                                             |
|---------------------------------------------------------|--------|-------------------------------------------------------------------|
| Investigate shielding/mitigation summary from mod stats | Open   | possible if shield stats are reliable in current payloads         |
| Investigate AP gain presentation                        | Open   | needs a clear definition; not a native portal-details field today |
| Investigate hack-rate or hacks-per-minute presentation  | Open   | needs confirmation of available mod/stat inputs before adding     |

### Deferred refactor notes for missions and startup sync

Status: `Open`

Outcome:

- keep follow-up architecture ideas visible without treating them as active bugfix work

Tasks:

| Task                               | Status | Notes                                                                                                                                                                                                  |
|------------------------------------|--------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Refactor missions state model      | Open   | separate viewport missions, portal missions, selected mission details, and rendered route ownership more explicitly if missions behavior grows more complex                                            |
| Rework missions popup request flow | Open   | consider dedupe/caching/open-trigger discipline if repeated popup-driven requests become noisy or harder to reason about                                                                               |
| Simplify startup sync ownership    | Open   | current startup behavior is improved, but persisted IRIS state, Intel startup cookies, Intel idle sync, and entity fallback still deserve a clearer long-term contract if another concrete bug appears |

### Deferred refactor notes for map/render/store boundaries

Status: `Open`

Outcome:

- capture medium-sized cleanup ideas before they turn into bug-driven emergency work

Tasks:

| Task                                                                     | Status | Notes                                                                                                                                                                                                                                                                                                                             |
|--------------------------------------------------------------------------|--------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Split map sync store actions by intent                                   | Open   | separate bounded viewport updates, unbounded Intel sync updates, and startup restore so camera/bounds ownership is explicit instead of inferred from optional params                                                                                                                                                              |
| Review IRIS persisted location/startup map-state ownership               | Done   | IRIS now defaults to the same Amsterdam camera as Mini-IRIS, ignores null-island/low-zoom Intel startup fallbacks, and checks actual persisted `iris-settings` mapState before allowing Intel startup cookies to override the initial camera                                                                                   |
| Clamp IRIS page-world camera to Intel-compatible zoom                    | Done   | page-world MapLibre now uses the same low-zoom floor as the Intel bridge, and camera messages are clamped before they update the store or move the Intel map so globe-level zoom cannot bounce back to a stale/unpredictable location                            |
| Make plugin HTML markers a first-class rendering path                    | Done   | page-world runtime now owns marker-style plugin rendering for player tracker pins, while generic plugin GeoJSON remains in normal MapLibre sources                                                                                                                                                                                |
| Isolate reverse-geocode state into a dedicated module or slice           | Open   | `discoveredLocation`, `lastResolvedLatLng`, `addressStatus`, and debounce timing are coherent now but still spread across the main UI slice                                                                                                                                                                                       |
| Tighten IRIS message-type contracts for map sync                         | Open   | startup Intel position, later Intel sync, and IRIS-owned camera moves now differ semantically and should stay explicit in the bridge protocol                                                                                                                                                                                     |
| Extract MapLibre interaction handler logic behind a helper               | Done   | page-world runtime now owns rotation/pitch and interaction setup directly; the old extension-world handler-internals issue disappeared with `MapOverlay` removal                                                                                                                                                                  |
| Keep mock fixtures out of release bundles                                | Open   | debug mock fixtures currently ship because JSON fixtures are imported by runtime code; later cleanup should gate mocks behind a dev-only build flag or separate debug-only entry path, and sanitize captured payloads so player-specific metadata (for example `playerData.nickname`) is not kept unless required for UI behavior |
| Stage entity relationship cleanup before any full entity-store rewrite   | Open   | keep the current split `portals`/`links`/`fields` model for now, but incrementally add relationship-aware cleanup: portal delete and team changes now remove attached links/fields; later investigate storing field anchor portal ids or secondary indexes before considering a broader normalized graph refactor                 |
| Investigate heuristic stale-portal repair from link/field contradictions | Open   | debug-only first: detect links or fields whose team contradicts currently stored anchor portal teams; if reliable, consider an opt-in inferred-team repair path instead of silently rewriting portal teams                                                                                                                        |

### Plugin overlay and highlighter baseline is partially implemented

Status: `In Progress`

Outcome:

- four map-overlay plugins now exist in the local plugin architecture
- plugin feature ownership is per-plugin instead of one shared overwrite bucket
- highlighter semantics are still IRIS-specific and not yet aligned with an IITC-style "selected highlighter" contract

Tasks:

| Task                                                                          | Status | Notes                                                                                                                                                                                                          |
|-------------------------------------------------------------------------------|--------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Add portal level fill plugin                                                  | Done   | basic point overlay with Ingress level colours exists                                                                                                                                                          |
| Add portal health fill plugin                                                 | Done   | basic point overlay using health thresholds exists                                                                                                                                                             |
| Add portal level labels plugin                                                | Done   | HTML label markers exist for portal levels                                                                                                                                                                     |
| Add portal key count labels plugin                                            | Done   | inventory-backed key labels exist using recursive capsule-aware key counting                                                                                                                                   |
| Merge plugin-rendered features per plugin instead of last-writer-wins         | Done   | `PluginManager` now stores plugin features by plugin id and publishes a merged collection                                                                                                                      |
| Extend plugin SDK with portal level/health and inventory access               | Done   | plugin API now exposes enough state for the current overlay plugins                                                                                                                                            |
| Load the new plugins in the extension runtime                                 | Done   | all four plugins are currently registered at startup                                                                                                                                                           |
| Let plugins declare safer defaults and lightweight capability hints           | Done   | manifests can now mark overlay plugins as default-off and label-heavy without forcing a single-highlighter model                                                                                               |
| Keep label-heavy plugin markers hidden until closer zoom                      | Done   | level-label and key-count overlays now publish no features below z14, keeping low-zoom views and plugin source counts cleaner                                                                                  |
| Remove generic popup behavior from non-interactive label overlays             | Done   | portal key counts and level labels no longer open the plugin feature popup                                                                                                                                     |
| Rename overlay plugins to clearer `Fill` / `Labels` names and align ids/paths | Done   | renamed to `portal-level-fill`, `portal-health-fill`, and `portal-key-count-labels`; directory names, ids, and imports now match                                                                               |
| Pre-aggregate portal key count labels                                         | Done   | key labels now use pre-aggregated inventory key counts instead of recursively recounting capsules per portal; mobile currently uses the same HTML marker path as portal level labels for visibility            |
| Move portal key count labels off HTML markers                                 | Open   | MapLibre symbol labels worked on desktop but did not appear on mobile; revisit later with mobile-specific rendering/profiling before replacing the visible HTML marker fallback                                |
| Add on-map mock tools bar                                                     | Done   | when mock tools are enabled in Diagnostics, a compact top-of-map bar exposes artifact, ornament, inventory, key, and passcode mock toggles without reopening popups                                            |
| Investigate responsive horizontal overflow                                    | Done   | mock tools and bottom dock now use inset-based fixed positioning with internal horizontal scrolling instead of 50%/translate centering, reducing page-level overflow risk on fold/tablet and sub-1279px widths |
| Add heavy mock key inventory for loaded portals                               | Done   | diagnostics mock tools can now load 500 portal keys distributed across currently loaded portals, split between loose keys and a mock capsule for key-overlay performance testing                               |
| Add debug-only mock artifacts flow for local testing                          | Done   | diagnostics can now synthesize artifact data from currently loaded portals and clear it again without relying on live events                                                                                   |
| Add `Artifacts` and `Ornaments` filter toggles                                | Done   | artifacts now have an explicit filter toggle, and ornaments now parse from portal entity payloads into a separate overlay layer with its own filter toggle                                                     |
| Add debug-only mock ornaments flow for local testing                          | Done   | diagnostics can now add and clear mock ornament overlays without overwriting live ornament data on portals                                                                                                     |
| Add a local ornament label map for IITC-known ids                             | Done   | portal details now map the IITC-known anomaly, beacon, battle, reward, shard, and scouting ornament ids to friendly labels while unknown ids still fall back to raw codes                                      |
| Expand ornament mock data to cover all locally known ids                      | Done   | diagnostics mock ornaments now distribute the full local known-id set across currently loaded portals instead of only a couple of placeholder values                                                           |
| Align artifact and ornament ring colours closer to IITC                       | Done   | ornaments now use IITC-like event yellow instead of a generic white ring; artifact rings are slightly larger/stronger while full stock icon rendering remains future work                                      |
| Polish artifact ring visibility                                               | Done   | artifact rings now use a subtle magenta fill plus stronger zoom-scaled magenta strokes in the page-world runtime                                                                                               |
| Polish ornament ring visibility                                               | Done   | ornament rings now use a subtle yellow fill plus stronger zoom-scaled yellow strokes in the page-world runtime                                                                                                 |
| Polish mission route and waypoint visibility                                  | Done   | mission routes and waypoints now use stronger zoom-scaled orange paint in the page-world runtime                                                                                                               |
| Implement a Single Highlighter selection model                                | Open   | align with IITC by allowing users to select one active highlighter (e.g. "Highlight weak portals")                                                                                                             |
| Separate plugin HTML markers from generic GeoJSON point rendering             | Done   | page-world runtime now splits player tracker marker points into DOM pins while leaving generic plugin GeoJSON point/line features in normal MapLibre sources                                                   |
| Render artifact and ornament overlays with IITC-style stock icons             | Open   | IITC uses `marker_images/{ornament}.png`, `{type}_shard.png`, and `{type}_shard_target.png`; IRIS still uses MapLibre ring approximations for now                                                              |
| Add visibility/zoom guardrails for label-heavy plugins                        | Done   | level/key label plugins subscribe to map zoom and clear their generated feature sets below z14                                                                                                                 |
| Move remaining label-heavy HTML marker plugins to MapLibre symbol layers      | Open   | portal level labels may eventually need the same treatment if mobile panning still suffers with that overlay enabled                                                                                           |
| Align label-heavy overlay scheduling with IITC Mobile                         | Open   | portal level/key labels should update after movement settles and avoid full marker churn while the map is actively panning                                                                                     |
| Add IITC-style label overlap thinning                                         | Open   | portal level labels already have an IITC reference implementation; adapt the same priority/overlap approach for key labels before trying another renderer                                                      |

Bugs:

| Bug                                                                  | Status        | Notes                                                                                                                       |
|----------------------------------------------------------------------|---------------|-----------------------------------------------------------------------------------------------------------------------------|
| New plugins auto-enable on first load even when they add map clutter | Done          | overlay/highlighter plugins can now opt into safer default-off startup via manifest metadata                                |
| Level and recharge overlays can stack visually on the same portal    | Investigating | current IRIS model allows concurrent overlays; this may be acceptable, but it needs an explicit product decision            |
| HTML marker rendering is coupled to `MapOverlay` internals           | Done          | resolved by removing `MapOverlay`; planned marker pins and player tracker pins now render from page-world marker registries |

### Entity cleanup and endpoint diagnostics are more relationship-aware

Status: `In Progress`

Outcome:

- store enough relationship data to clean up stale geometry more safely
- make endpoint timing easier to inspect during runtime debugging

Tasks:

| Task                                                | Status | Notes                                                                                                                   |
|-----------------------------------------------------|--------|-------------------------------------------------------------------------------------------------------------------------|
| Preserve field anchor portal ids from `getEntities` | Done   | field points now retain `portalId` instead of only lat/lng                                                              |
| Remove links attached to a deleted portal           | Done   | store cascade now removes dependent links when a portal GUID is deleted                                                 |
| Remove fields anchored to a deleted portal          | Done   | field cleanup now uses stored anchor portal ids                                                                         |
| Remove links/fields when a portal's team changes    | Done   | `updatePortals` now triggers cleanup when a portal becomes neutral or changes teams                                     |
| Add regression coverage for portal-delete cascades  | Done   | Vitest covers both link and field cleanup when a portal is deleted                                                      |
| Show endpoint next-refresh timing in status UI      | Done   | polled endpoints now expose `next auto refresh`, while `entities` is labeled event-driven                               |
| Keep endpoint ordering stable but useful            | Done   | expanded status and diagnostics now sort active first, then auto-refresh by due time, then event-driven, then on-demand |

## Draw Tools Plugin

Status: `In Progress`

Goal:

- add a draw-tools style planning plugin inspired by community references, especially the breunigs lineage and
  `quick-draw-links`

### Draw tools scope is defined from real community references

Status: `Done`

Outcome:

- define the real feature baseline before implementation, instead of guessing from memory

Tasks:

| Task                                | Status | Notes                                                                                                             |
|-------------------------------------|--------|-------------------------------------------------------------------------------------------------------------------|
| Review `draw-tools-plus` reference  | Done   | confirms helper API for polyline, polygon, circle, marker; not the main planning UX                               |
| Review `quick-draw-links` reference | Done   | confirms richer planning UX: portal-to-portal links, move/copy, crosslinks, great circles, fields, storage/export |
| Decide primary reference            | Done   | `quick-draw-links` should drive planning workflow; `draw-tools-plus` is secondary inspiration only                |

### Draw tools baseline supports portal planning first

Status: `Open`

Outcome:

- provide a planning workflow for hypothetical links and shapes without coupling it into Intel-core UI

Tasks:

| Task                                                                      | Status      | Notes                                                                                                                                                                                                                                                                                        |
|---------------------------------------------------------------------------|-------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Add a plugin entrypoint and toolbar/menu affordance                       | Done        | `planned-links` remains the stable plugin id, but the user-facing plugin is now named Draw Tools because it includes links and markers                                                                                                                                                       |
| Add first mobile-safe planning toolbar                                    | Done        | Map drawer now exposes Plan mode and a compact cyan planning bar with anchor status, Done, Undo, and Clear                                                                                                                                                                                   |
| Split link and marker drawing modes                                       | Done        | Map drawer exposes separate Links and Markers tools so marker portal taps no longer create unintended planned links                                                                                                                                                                          |
| Toggle planned drawing visibility by type                                 | Done        | Map drawer exposes persisted Vis Links and Vis Marks toggles                                                                                                                                                                                                                                 |
| Auto-show the active planned item type when entering a draw mode          | Done        | opening the Links tool enables Vis Links and opening the Markers tool enables Vis Marks, so the active drawing mode is visible even if that planned type was hidden earlier                                                                                                                  |
| Support planned link creation between portals                             | Done        | in Links mode, tapping portals builds a transient path preview and Add Link/Add Links saves adjacent dashed cyan planned links to avoid event yellow                                                                                                                                         |
| Require explicit confirmation for planned links                           | Done        | link planning now matches the INTEL-style source/destination flow and avoids creating accidental links while selecting portals                                                                                                                                                               |
| Support multi-portal link path previews                                   | Done        | link planning uses an in-progress portal path array, so selecting A, B, C previews A-B and B-C before saving                                                                                                                                                                                 |
| Make destructive planning actions more deliberate                         | Done        | Clear now requires a second confirmation tap and only clears the active Links or Markers mode                                                                                                                                                                                                |
| Scope planning undo to the active drawing mode                            | Done        | Undo in Links mode removes the last planned link, while Undo in Markers mode removes the last planned marker                                                                                                                                                                                 |
| Show selected portal feedback in marker mode                              | Done        | Marker mode reuses the planning highlight ring so the currently selected marker target is visible on the map                                                                                                                                                                                 |
| Align planning portal taps with normal portal selection                   | Done        | planned links now route through the same `iris:portal:click` bridge as portal info, then branch by planning mode                                                                                                                                                                             |
| Support baseline planned-link removal                                     | Done        | baseline supports mode-scoped Undo and Clear from the planning bar                                                                                                                                                                                                                           |
| Persist planned links locally                                             | Done        | saved planned links now survive refresh via `iris-settings`; in-progress planning mode and anchor stay transient                                                                                                                                                                             |
| Show crossing links against a hypothetical link                           | Done        | planned links now mark currently loaded crossing Intel links with red dashed overlays, excluding shared-endpoint links                                                                                                                                                                       |
| Improve mobile portal selection for planning                              | In Progress | planning mode now uses a larger portal hit radius for mouse/device-toolbar clicks and touch taps; still needs real mobile verification                                                                                                                                                       |
| Keep core map interaction Firefox-safe                                    | Done        | click, touch, contextmenu, and hover now resolve from plain coordinates plus IRIS store/spatial index data; keep `queryRenderedFeatures` out of production selection unless a separate debug probe proves it is safe                                                                         |
| Support IITC-style long-press portal selection                            | Done        | explicit touch-hold detection opens portal info directly, matching IITC's tap-hold intent without depending on browser `contextmenu` or MapLibre rendered-feature queries                                                                                                                    |
| Add diagnostics-only `queryRenderedFeatures` POC                          | Done        | direct content-world probes remain diagnostic only; Firefox desktop still throws permission errors before features can be cloned, confirming production should not depend on extension-world `queryRenderedFeatures`                                                                         |
| Test page-world MapLibre runtime for `queryRenderedFeatures`              | Done        | MAIN-world MapLibre runtime can render plain-JSON IRIS portal/link/field GeoJSON and query rendered features on Firefox desktop/mobile and Chrome desktop without permission errors                                                                                                          |
| Test visible page-world map runtime interaction                           | Done        | PAGE VISIBLE exposes the page-world MapLibre runtime as a small floating pane, initializes from the current IRIS camera/data/layers snapshot, can be hidden again, and returns portal/link/field selection messages                                                                          |
| Prove page-world click can drive extension selection UI                   | Done        | PAGE VISIBLE click posts plain `{kind,id}` selection messages back to extension UI; portal, link, and field selections open the existing popup flows on Chrome/Firefox desktop                                                                                                               |
| Extract page-world map runtime protocol                                   | Done        | page-world commands, diagnostic results, and selection messages now share typed constants/interfaces before the migration grows beyond the POC                                                                                                                                               |
| Rename page-world runtime out of POC module path                          | Done        | manifest-loaded MAIN-world runtime now lives at `src/content/page-map-runtime.ts`; obsolete page-runtime POC buttons have been removed from Diagnostics                                                                                                                                      |
| Add page-world camera sync protocol                                       | Done        | page-world moveend sends camera and viewport bounds back to the extension UI, which feeds the existing `IRIS_MOVE_MAP` coordinator path                                                                                                                                                      |
| Add page-world source sync protocol                                       | Done        | IRIS overlay and diagnostics can send plain-JSON portal/link/field source updates without forcing a query probe or camera jump                                                                                                                                                               |
| Add page-world layer visibility sync protocol                             | Done        | Links and Fields visibility changes sync into the page-world runtime and update MapLibre layer visibility directly                                                                                                                                                                           |
| Add page-world snapshot sync protocol                                     | Done        | diagnostics and IRIS overlay send camera, source data, layer visibility, selected features, tiles, and visual overlay data through one plain-JSON snapshot path                                                                                                                              |
| Automatically mirror IRIS state into page-world runtime                   | Done        | IRIS overlay sends an initial snapshot, then uses split updates: camera-only for map movement, data-only for entity/visual changes, layer-only for visibility, selection-only for highlights, and tiles-only for map theme changes                                                           |
| Test page-world runtime as full viewport map surface                      | Done        | page-world runtime now runs as the normal full-viewport IRIS map surface above native INTEL UI but below IRIS controls                                                                                                                                                                       |
| Add page-world selected feature and map-theme sync                        | Done        | page-world runtime receives selected portal/link/field feature collections for white highlights and updates raster base tiles when the IRIS map theme changes                                                                                                                                |
| Load live entities after moving in page-world full map                    | Done        | page-world moveend sends camera plus viewport bounds through the existing `IRIS_MOVE_MAP` request-coordinator path so far pans can trigger settled entity tile fetches                                                                                                                       |
| Add page-world visual overlay parity                                      | Done        | page-world full mode now receives and renders planned links/markers/crossings, artifacts, ornaments, mission route/waypoints, plugin GeoJSON line/point features, plugin label markers, and player tracker pins                                                                              |
| Make page-world runtime the default IRIS map surface                      | Done        | normal IRIS startup now promotes the MAIN-world runtime to full map mode by default; the extension-world `MapOverlay` is no longer mounted as a fallback                                                                                                                                     |
| Keep Tact and layer filters functional in page-world mode                 | Done        | page-world source snapshots now apply team, level, health, visited, captured, scanned, links, and fields filters before updating GeoJSON sources                                                                                                                                             |
| Keep draw-tool portal clicks separate from portal info in page-world mode | Done        | portal clicks now feed `selectPlanningPortal` while planning mode is active, instead of opening portal details and blocking link creation                                                                                                                                                    |
| Remove planned marker labels from page-world mode                         | Done        | planned markers render as coloured dots only for now; labels can be redesigned later without blocking the migration                                                                                                                                                                          |
| Align page-world map styling with existing IRIS renderer expectations     | Done        | portal/link/field faction colours now come from the active IRIS theme, and page-world portal opacity, field opacity, link opacity, portal stroke styling, and first-pass secondary overlays are the active baseline                                                                          |
| Finish page-world theme-settings parity                                   | Done        | map tile theme sync uses MapLibre `setTiles`, app theme changes rebuild themed portal/link/field source colours, split sync paths were code-reviewed, and repeated style switching stays covered by normal smoke testing                                                                     |
| Support planned item selection in page-world mode                         | Done        | page-world clicks can now select planned links/markers for Delete, while link-planning mode still prioritizes portal clicks for creating links                                                                                                                                               |
| Keep level/health fill aligned with portal faction colour                 | Done        | page-world portal level/health highlighters now colour the portal fill while keeping the stroke/ring faction-coloured from the active theme                                                                                                                                                  |
| Restore old click-vs-info behavior in page-world mode                     | Done        | normal page-world portal/link/field clicks select the target without opening info immediately; contextmenu/right-click opens the existing info panel directly                                                                                                                                |
| Verify player tracker rendering in page-world mode                        | Done        | page-world player tracker is visible with active tracker data; remaining work is styling/stacking parity rather than basic rendering                                                                                                                                                         |
| Refine page-world player tracker styling and co-located players           | In Progress | player tracker now uses page-world DOM pins with labels, COMM-like recent actions, mock co-located players, cluster-first expansion, and center-collapse behavior; mobile smoke and fuller OMS-style polish remain                                                                           |
| Make player tracker recent actions read like COMM messages                | Done        | player tracker popup recent actions now use COMM-like timestamp/message rows, player/team colour, portal/link emphasis, and clickable portal markup                                                                                                                                          |
| Add page-world long-press/contextmenu info open                           | Done        | contextmenu/right-click opens info directly; Firefox Mobile long-press is tracked separately because browser contextmenu does not trigger reliably there                                                                                                                                     |
| Support page-world mobile long-press info open                            | Done        | page-world runtime now has explicit single-touch hold detection with movement cancellation and click suppression; Firefox Mobile smoke test passed                                                                                                                                           |
| Verify repeated theme/map-style switching in page-world mode              | Done        | code-level verification confirms repeated map-style changes use `syncTiles` without data rebuilds, while app theme changes rebuild source snapshots for themed colours; latest build/type/lint checks cover the path, with visual smoke still useful during browser testing                  |
| Polish secondary overlay styling in page-world mode                       | Open        | compare plugin GeoJSON, plugin labels, planned items, and player tracker pins against IITC expectations; artifacts, ornaments, and mission overlays have had first-pass polish                                                                                                               |
| Restore page-world source/update diagnostics                              | Done        | page-world source updates now publish viewport totals, per-source feature counts, and `setData` timings through the diagnostics store; Bench still owns frame timing                                                                                                                         |
| Remove remaining page-world diagnostic naming/noise                       | Done        | removed the old probe point/layer, renamed runtime source/layer ids from `iris-poc-*` to `iris-map-*`, normalized diagnostic result labels to `MAP ...`, dropped unused POC debug CSS, and renamed the old queryRenderedFeatures probe log                                                   |
| Decide whether page-world map runtime is worth a larger migration         | Done        | page-world runtime is now the default IRIS map surface; camera, source, layer, interaction, and benchmark ownership use the plain-JSON bridge                                                                                                                                                |
| Migrate page-world source/layer updates                                   | Done        | production overlay snapshots now push filtered plain-JSON portals, links, fields, ornaments, artifacts, selected features, draw tools, plugin features, and player tracker data                                                                                                              |
| Migrate page-world interaction events                                     | Done        | page-world map emits plain camera, selection, contextmenu, draw-tool, and benchmark messages back to extension UI without exposing MapLibre feature objects across worlds                                                                                                                    |
| Retire duplicate content-world MapLibre runtime after migration           | Done        | page-world rendering owns the normal map surface, diagnostics, interaction, draw tools, and marker pins; the old `MapOverlay` fallback is no longer mounted                                                                                                                                  |
| Remove old `MapOverlay` reference implementation                          | Done        | deleted the unmounted extension-world renderer after page-world source sync, selection, diagnostics, theme switching, draw tools, and pin rendering were covered                                                                                                                             |
| Keep page-world migration notes in tracked docs                           | Done        | `docs/PAGE_WORLD_MAP_RUNTIME.md` is now an active tracked-doc candidate again, while benchmark details continue to live in `docs/PERF_BENCHMARKS.md`                                                                                                                                         |
| Document IITC marker pin parity                                           | Done        | IITC Draw Tools uses Leaflet marker pins with coloured SVG div icons and a purple default; IITC Player Activity Tracker uses faction pin icons while its trail lines are magenta/dashed; both register markers with OverlappingMarkerSpiderfier                                              |
| Scope MapLibre Marker pin experiment                                      | Done        | tested `maplibregl.Marker` DOM pins for planned markers first, then player tracker; page-world ownership works for the baseline and follow-up work is now focused on co-located markers and richer UX                                                                                        |
| Preserve planned marker portal snapping semantics                         | Done        | planned marker pins still use existing portal-anchored planned-marker snapshot data; later IITC snap-to-nearest-portal behavior can be considered only if free placement is added                                                                                                            |
| Prototype planned marker pins with MapLibre Marker                        | Done        | page-world DOM pins render planned markers from the existing planned-feature snapshot; the old visible GeoJSON circle marker layer has been removed, while source data remains for draw-tool state                                                                                           |
| Prototype player tracker pins with MapLibre Marker                        | Done        | page-world runtime splits player marker points from plugin GeoJSON and renders them as faction-coloured DOM pins with labels; clicking a pin opens the existing player tracker popup, while tracker trails remain line layers                                                                |
| Extract shared DOM pin styling helpers                                    | Done        | planned marker and player tracker pins now share page-world marker root, pin body, and pin core styling helpers instead of duplicating inline setup                                                                                                                                          |
| Investigate co-located marker spread/spider behavior                      | In Progress | player tracker pins now cluster identical/near-identical coordinates first; clicking a cluster expands to deterministic circle/spiral offsets, and the center cluster marker becomes the collapse control; mobile smoke looks okay, while full OMS-style animation/legs remain later options |
| Add mock co-located player tracker pins                                   | Done        | mock tools can load 8 player tracker pins on one loaded portal so the deterministic spread behavior can be tested without waiting for rare live COMM data                                                                                                                                    |
| Fix MapLibre Marker pins lagging behind mobile pan                        | Watch       | appears after loading a new XPI on mobile without refreshing the Intel page; normal refreshed-page testing could not reproduce it, so treat as stale runtime/page reload behavior unless it appears after refresh                                                                            |
| Decide marker renderer ownership                                          | Done        | baseline pins now belong to the page-world runtime; selection returns plain JSON through the page-world protocol, avoiding extension-world `queryRenderedFeatures` for production selection                                                                                                  |
| Add marker pin acceptance checks                                          | Done        | desktop and mobile smoke are good for planned pins, player tracker pins, popup open, panning, style switching, planned-link portal taps, and co-located cluster expand/collapse                                                                                                              |
| Profile DOM marker count before expanding pin usage                       | Open        | before moving more overlays to DOM markers, record marker counts and pan feel on desktop/mobile so pins do not quietly reintroduce HTML-marker churn                                                                                                                                         |
| Consider CSS class extraction for page-world pins                         | Open        | current page-world pin styles are centralized in helpers; if pin variants grow, move static style into injected CSS/classes and keep helpers for dynamic colour/selection state                                                                                                              |
| Expand player tracker popup with previous locations                       | Open        | current popup shows latest portal and recent actions; later carry enough player history to show an IITC-like previous-location list                                                                                                                                                          |
| Gate player activity popup behind secondary interaction                   | Done        | page-world player pins no longer open activity details on normal click/tap; right-click/context menu and mobile long-press open the Player Last Activity popup                                                                                                                               |
| Decide whether crosslink display should also compare against drawn links  | Open        | `quick-draw-links` supports existing, drawn, or both                                                                                                                                                                                                                                         |
| Support moving or copying links from one anchor portal to another         | Open        | useful for fast route/plan variants if interaction model stays understandable on mobile                                                                                                                                                                                                      |
| Support selecting and deleting individual planned items                   | Done        | tapping a saved planned link or marker selects it, highlights it, and enables Delete in the planning bar                                                                                                                                                                                     |
| Use Firefox-safe planned item hit testing                                 | Done        | planned links and markers now use screen-space geometry selection instead of MapLibre `queryRenderedFeatures`, avoiding Firefox extension permission errors                                                                                                                                  |
| Support editing individual planned items                                  | Open        | marker color/label edits and link move/copy remain future work                                                                                                                                                                                                                               |

### Draw tools baseline supports non-link geometry carefully

Status: `Open`

Outcome:

- add the geometry that is useful for planning without turning the plugin into a cluttered desktop-only tool

Tasks:

| Task                                                        | Status        | Notes                                                                                                                               |
|-------------------------------------------------------------|---------------|-------------------------------------------------------------------------------------------------------------------------------------|
| Support polygon or field-style drawing                      | Open          | reference plugin derives fields from drawn links; need to decide direct polygon drawing vs derived fields                           |
| Support circle drawing                                      | Open          | useful for radius-based planning and crossing-link inspection                                                                       |
| Support portal marker placement                             | In Progress   | Marker mode can add persisted white/red/blue/green markers to the selected portal; item-level select/delete and labels still needed |
| Decide whether a separate shard/arrow tool is really needed | Investigating | user idea is plausible, but reference evidence is weaker than for links/circles/markers                                             |
| Keep mobile interaction compact                             | Open          | avoid a desktop-heavy control surface                                                                                               |

### Draw tools data and project workflow are durable

Status: `Open`

Outcome:

- drawings should survive reloads and support project-style planning

Tasks:

| Task                                            | Status | Notes                                                                                                                           |
|-------------------------------------------------|--------|---------------------------------------------------------------------------------------------------------------------------------|
| Decide storage model for drawn items            | Done   | planned links and markers persist in IRIS settings for the baseline; named project storage remains a separate future feature    |
| Support store/restore of named projects         | Open   | explicit named project save/restore is part of the reference value and remains separate from the new baseline JSON backup       |
| Support export of drawn-plan data               | Done   | Map drawer Draw Tools Backup exports planned links and markers as JSON                                                          |
| Decide whether import is needed in the baseline | Done   | baseline import exists now; it supports merge/replace from compact `iris-draw-tools` JSON or a full `iris-settings` JSON object |

Bugs:

| Bug                                                   | Status | Notes                                                                                                                                               |
|-------------------------------------------------------|--------|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| Tool scope can sprawl quickly on mobile               | Open   | link planning is clear; too many modes will make the UI heavy fast                                                                                  |
| Crosslink logic depends on visible map state and zoom | Open   | reference plugin warns that visible range and zoom affect crosslink detection                                                                       |
| Mobile portal selection for planning is inconsistent  | Open   | link planning now uses explicit source/destination confirmation, but real mobile selection still needs verification against normal portal info taps |

## Data Contracts And Persistence

Status: `In Progress`

Goal:

- improve type safety, parser confidence, storage boundaries, and bridge discipline

### Payload typing is stronger in cast-heavy domains

Status: `In Progress`

Tasks:

| Task                | Status | Notes                                                                                                                         |
|---------------------|--------|-------------------------------------------------------------------------------------------------------------------------------|
| Payload typing pass | Done   | all primary Intel entities (portals, links, fields, details, plexts, missions, scores, passcodes) now use strict tuple typing |

### Storage boundaries are clearer

Status: `Done`

Outcome:

- ensure critical settings survive sessions

Tasks:

| Task                               | Status | Notes                                                                                 |
|------------------------------------|--------|---------------------------------------------------------------------------------------|
| Storage boundary design pass       | Done   | added allowRotation and allowPitch to persisted state                                 |
| Prefix-based state property naming | Done   | refactored store to use `layerShow`, `filterShow`, and `activeVisualOverlay` prefixes |

## Diagnostics and Observability

Status: `In Progress`

Goal:

- improve visibility into runtime behavior and user interactions

### User interaction logging

Status: `Done`

Outcome:

- capture and visualize user map interactions to help debug state sync and performance

Tasks:

| Task                                               | Status | Notes            |
|----------------------------------------------------|--------|------------------|
| Log map panning events                             | Done   | won't do for now |
| Log map zoom events                                | Done   | won't do for now |
| Visualize interaction history in Diagnostics Popup | Done   | won't do for now |

## Semantic UI Cleanup

Status: `Done`

Goal:

- move semantic colors and UI semantics into clearer shared modules

### UI components follow a CSS-first styling policy

Status: `Done`

Outcome:

- eliminate inline `style={{...}}` blocks for static layout and design
- improve reusability and theming consistency across the monorepo
- enable advanced CSS features (hover, active, media queries) for all components
- standardize popup positioning and padding
- introduce generalized design system for inputs, buttons, and choice items

Tasks:

| Task                                                     | Status | Notes                                                                                                                                                                                                                                                                                                                                                                           |
|----------------------------------------------------------|--------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Add className support to base Popup component            | Done   | verified in Diagnostics and Map themes                                                                                                                                                                                                                                                                                                                                          |
| Refactor Diagnostics Popup to pure CSS                   | Done   | migrated to debug.css                                                                                                                                                                                                                                                                                                                                                           |
| Refactor Portal Info Popup to pure CSS                   | Done   | migrated to portal.css; uses CSS variables for faction/level colors                                                                                                                                                                                                                                                                                                             |
| Refactor COMM / Passcode Popups to pure CSS              | Done   | migrated to comm.css and passcodes.css                                                                                                                                                                                                                                                                                                                                          |
| Refactor Inventory / Missions Popups to pure CSS         | Done   | migrated to inventory.css and missions.css                                                                                                                                                                                                                                                                                                                                      |
| Standardize common utility classes in base.css           | Done   | added flex, gap, margin, and text utilities                                                                                                                                                                                                                                                                                                                                     |
| Standardize input and button styling                     | Done   | introduced .iris-input and .iris-button in base.css                                                                                                                                                                                                                                                                                                                             |
| Add shared floating panel and compact control primitives | Done   | introduced CSS-first primitives for floating glass panels, horizontal scroll rows, and compact pill controls; mock tools and planning bar now consume them without changing the visual design                                                                                                                                                                                   |
| Generalize choice item styling                           | Done   | introduced .iris-choice-item for boxed interactive labels                                                                                                                                                                                                                                                                                                                       |
| Generalize popup styling in base.css                     | Done   | base `.iris-popup` handles standard padding and variables                                                                                                                                                                                                                                                                                                                       |
| Unify popup width and centering                          | Done   | all major popups use `iris-popup-center iris-popup-medium`                                                                                                                                                                                                                                                                                                                      |
| Fix inconsistent popup internal padding                  | Done   | moved padding to .iris-popup-content; standardized internal spacing for major domains                                                                                                                                                                                                                                                                                           |
| Revisit portal/link/field popup content density          | Done   | tightened portal/link/field table spacing, image height, and section gaps while preserving all detail sections and the shared popup interaction model                                                                                                                                                                                                                           |
| Add mobile bottom-sheet popup presentation               | Done   | popups keep existing content but become constrained bottom sheets on small screens with internal scrolling and mobile dragging disabled                                                                                                                                                                                                                                         |
| Tighten portal popup mobile density                      | Done   | portal/link/field details keep all sections while using shorter images, tighter spacing, and two-column mod/resonator grids on mobile                                                                                                                                                                                                                                           |
| Close drawer after launching popup content               | Done   | drawer actions that open popups now dismiss the drawer so mobile bottom-sheet popups are immediately visible; map visibility toggle stays in place                                                                                                                                                                                                                              |
| Decide mobile popup focus/minimize model                 | Open   | choose between one-primary-popup focus, minimized popup chips, or explicit user-managed stacking; keep COMM independent if it should remain a persistent activity surface                                                                                                                                                                                                       |
| Tune mobile bottom-sheet height                          | Done   | mobile popup sheets now use a slightly taller 72dvh/640px cap after adding the shared sheet handle                                                                                                                                                                                                                                                                              |
| Add mobile bottom-sheet handle affordance                | Done   | shared `Popup` now renders a mobile-only sheet handle using the centralized popup shell and `base.css`                                                                                                                                                                                                                                                                          |
| Label shared close controls                              | Done   | popup and drawer close buttons now expose explicit labels/titles and consistent focus/hover styling                                                                                                                                                                                                                                                                             |
| Add primary-popup focus behavior on mobile               | Open   | only implement after the focus model is chosen; likely close other primary popups when opening stats/portal/link/field details while leaving COMM as a separate decision                                                                                                                                                                                                        |
| Add portal popup action row                              | Done   | portal details now expose Center Map, Copy Coords, Copy Address when resolved, and Missions when available below History so core portal facts keep priority                                                                                                                                                                                                                     |
| Extract popup action row primitive                       | Done   | added shared `PopupActionRow` and `PopupActionButton`; portal details use the shared primitive while link/field/player/plugin details can adopt it when they gain comparable actions                                                                                                                                                                                            |
| Extract table primitives                                 | Done   | added shared scroll/table/sticky-header classes; Inventory and Region checkpoint history now share table behavior while keeping density-specific padding local                                                                                                                                                                                                                  |
| Extract toolbar and segmented control primitives         | Done   | added shared toolbar, segmented filter, compact header action, square nav-control, and list-action modifiers; COMM filters, Inventory sort/category controls, inventory/COMM refresh, Navigation popup buttons, and plugin toggles now share interaction styling                                                                                                                |
| Visual smoke test shared control primitives              | Done   | desktop smoke passed for shared controls after the stateful-control pass; COMM tabs/refresh, Inventory refresh/sort/category/table, Navigation buttons, debug copy, passcode submit, plugin toggles, planning controls, drawer toggles, and Export controls use the shared state styling well enough to pause the epic                                                          |
| Migrate export plugin controls off inline styles         | Done   | export-data plugin format buttons now use shared segmented controls, checkboxes use shared checkbox styling, and download uses the shared popup action button default                                                                                                                                                                                                           |
| Review map-control UI primitives                         | Done   | navigation popup now uses CSS-first nav row/grid/button primitives, location search moved static layout/result styling into shared CSS, drawer backdrop inline layout moved to CSS, and planning/mock/geolocate controls already consume existing shared classes; pan regression from the old unhandled `IRIS_PAN_MAP` path was fixed by using the working `IRIS_MOVE_MAP` path |
| Add reset rotation/pitch control                         | Done   | Navigation popup now includes a Reset Pitch/Rotation action that asks the page-world map runtime to jump bearing and pitch back to 0                                                                                                                                                                                                                                            |
| Review mobile back/escape close behavior                 | Done   | Escape now closes the top IRIS surface in order: drawer first, then visible popup/sheet, then selection/plugin/mission details; browser-back history interception is intentionally deferred until the mobile focus model is chosen                                                                                                                                              |
| Add mobile browser Back close behavior                   | Open   | medium-risk follow-up: on mobile, browser Back should close the active IRIS drawer/bottom sheet before normal page navigation; requires history/popstate coordination so it does not trap users or fight Intel URL state                                                                                                                                                        |
| Decide mobile pull-to-refresh behavior                   | Open   | mobile page pull-down can refresh the Intel page and wipe transient UI context; decide whether to allow native refresh, prevent overscroll/pull-to-refresh on the IRIS map surface, or only prevent it while drawers/bottom sheets/planning tools are active                                                                                                                    |
| Extract drawer UI primitives                             | Done   | drawer-first pass added shared `DrawerSection` and `DrawerButton` controls and migrated Agent, System, Layers, Map, Tactical, and Visuals tabs; desktop and Chrome device-emulation smoke looked good                                                                                                                                                                           |
| Visual smoke test drawer primitives on real mobile       | Done   | real mobile smoke looked fine for drawer button sizing, scroll groups, active states, tap behavior, and close/outside-close behavior; follow-up fixed search GO button styling to better match restrained marker/planning controls                                                                                                                                              |
| Normalize drawer button sizing on mobile                 | Done   | drawer grid buttons now fill equal-width cells with a shared minimum height and safer label wrapping, while horizontal scroll groups keep their compact behavior                                                                                                                                                                                                                |
| Review UI font size and color consistency                | Done   | P2 pass normalized obvious drawer/status alert hard-coded text colors onto shared text/accent/error tokens after the shared-control pass; track future inconsistencies as specific UI items                                                                                                                                                                                     |
| Plan shared UI element styling layer                     | Done   | shared naming now covers buttons, inputs, checkbox/radio labels, floating panels, compact controls, choice items, popup actions, and list rows/actions; missions and planned markers now consume shared list primitives while keeping domain-specific layout locally                                                                                                            |
| Add planned marker navigation list                       | Done   | Map drawer now lists planned markers sorted by distance from current map center; tapping a marker selects/recenters it, labels can be edited inline, and delete requires a confirmation tap                                                                                                                                                                                     |
| Add Draw Tools backup import/export                      | Done   | Map drawer now exposes Draw Tools Backup with JSON export plus merge/replace import; import accepts either the compact `iris-draw-tools` backup format or a full `iris-settings` JSON object and enables Draw Tools visibility after restore                                                                                                                                    |
| Move Draw Tools backup controls lower in Map drawer      | Done   | Draw Tools Backup now sits below the planned marker list so map navigation and marker overview stay higher in the Map drawer                                                                                                                                                                                                                                                    |
| Decide marker list placement                             | Open   | current first version lives directly in the Map drawer; consider moving behind a Markers button, collapsing by default, or showing it only while marker planning is active                                                                                                                                                                                                      |
| Refine planned marker edit/delete controls               | Open   | evaluate whether inline Edit/Delete is too busy in the drawer; possible follow-ups include row details, swipe/actions menu, or a compact marker details sheet                                                                                                                                                                                                                   |
| Add marker list sort/filter controls                     | Open   | distance sort is the first default; consider label/name sort, color filter, and search if marker counts grow                                                                                                                                                                                                                                                                    |

### Shared UI primitives pause point

Status: `Paused`

Notes:

- shared UI primitives are stable enough to stop this pass and bump version after normal extension smoke testing
- completed coverage includes popup shells/actions, drawer sections/buttons, list rows/actions, compact pills, segmented
  controls, tables, inputs, checkboxes/radios, floating panels, mobile bottom sheets, and stateful hover/active/disabled
  behavior
- remaining UI cleanup is intentionally deferred rather than blocking the version bump:
    - optional detail-row/key-value primitive for Diagnostics, portal/link/field details, and plugin feature details
    - optional CSS size audit for unused selectors, repeated variables, and source-vs-bundle growth
    - continuing semantic color cleanup for remaining hard-coded/debug/topbar colors
    - mobile popup focus/back behavior decisions
    - planned marker list placement and edit/delete polish

### Map layer and filter toggles update immediately

Status: `Done`

Notes:

- fixed a stale viewport sync path where drawer layer toggles and portal history filters updated store state but did not
  rebuild MapLibre sources until the next pan/zoom
- fixed the same stale update pattern for plugin-rendered MapLibre visual fills; level/health fill overlays now update
  the `plugin-features` source immediately when visual overlay state changes
- added a Tactical Drawer Clear All action that resets faction, level, health, and portal-history filters to their
  show-all defaults
- tightened mobile drawer presentation by removing unused bottom padding, using safe-area padding, and switching drawer
  headers to explicit user-facing labels

### Semantic colors are shared instead of locally improvised

Status: `In Progress`

Tasks:

| Task                                                | Status      | Notes                                                                                                                                                                                                                 |
|-----------------------------------------------------|-------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Formal semantic color module                        | In Progress | shared theme tokens now separate `LEVELS`, `ITEM_RARITY`, `MOD_RARITY`, and item-type semantics; continuing to normalize naming and usage boundaries                                                                  |
| Reduce hard-coded semantic colors in CSS/components | In Progress | portal details, inventory, passcode rewards, and status surfaces now use shared semantic tokens for common success/warning/error/muted/accent/purple states; continue migrating remaining one-off debug/topbar values |

## Engineering Standards and Design Patterns

Status: `In Progress`

Goal:

- ensure codebase consistency, maintainability, and performance through strictly followed patterns

### Core UI and Styling Principles

Status: `Done`

Outcome:

- predictable, themeable, and mobile-ready UI components
- consistent pattern for inputs, buttons, and boxed choice items

Tasks:

| Task                     | Status | Notes                                                                                                                                                                            |
|--------------------------|--------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| CSS-First Styling Policy | Done   | prefer CSS classes and variables over inline `style` objects; latest review moved session/status semantic colors and the status progress/LED styling out of JSX into CSS classes |
| Mobile-First Layouts     | Done   | assume narrow screens; use 90vw width and centering for small viewports                                                                                                          |
| Centered Modal Pattern   | Done   | major interactions (Comm, Inventory, Missions) use a centered modal feel                                                                                                         |
| Theme variable usage     | Done   | define dynamic properties in `base.css` to satisfy IDE and maintain consistency                                                                                                  |
| Choice Item Pattern      | Done   | standardized boxed labels with consistent hover/active feedback                                                                                                                  |

### Architectural Patterns

Status: `In Progress`

Outcome:

- clean boundaries between interception, state, and presentation layers

Tasks:

| Task                     | Status | Notes                                                                            |
|--------------------------|--------|----------------------------------------------------------------------------------|
| Zustand for Global State | Done   | centralized stores in `@iris/core`; component-level selectors                    |
| Service-Lite Logic Layer | Done   | extracted pure business logic (merging, cascading deletes) into `EntityLogic.ts` |
| Centralized Data Parsers | Done   | all domain parsers migrated to `@iris/core`                                      |
| Message-based IPC        | Done   | content script communicates with interceptor via standard `postMessage` protocol |
| Surgical Interception    | Done   | intercept network traffic without modifying Intel's internal logic               |
| Type-Safe Domain Models  | Done   | moved all Intel types to `intel-types.ts`; strictly typing all incoming payloads |

### Repository Documentation Hygiene

Status: `Open`

Outcome:

- keep contributor-facing repository docs and ignore rules accurate after the IRIS/Page-world/UI migration work

Tasks:

| Task                                              | Status | Notes                                                                                                                                                                       |
|---------------------------------------------------|--------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Audit `.gitignore` and local-only generated files | Done   | `.gitignore` now explicitly unignores the active docs kept under `docs/` while leaving captured payloads, local error dumps, builds, and private Draw Tools backups ignored |
| Review stale top-level markdown docs              | Done   | README package artifact names now include version placeholders and the stale `MapOverlay` plugin-roadmap wording was replaced with page-world overlay polish                |
| Review stale docs markdown                        | Done   | docs index now points at the active architecture/page-world/performance/worklog docs, and the page-world runtime doc reflects the completed mobile long-press work          |

### Linting and Code Quality

Status: `Done`

Outcome:

- automated verification of CSS health and standards
- normalized CSS across the monorepo

Tasks:

| Task                                        | Status | Notes                                                          |
|---------------------------------------------|--------|----------------------------------------------------------------|
| Add Stylelint to monorepo                   | Done   | established root `.stylelintrc.json` and `.stylelintignore`    |
| Standardize CSS properties and colors       | Done   | full pass with `stylelint --fix` to normalize hex and notation |
| Replace deprecated `word-break: break-word` | Done   | migrated to `overflow-wrap: anywhere` in all domains           |
| Include CSS linting in CI/release           | Done   | integrated into `npm run lint` and verified in GitHub Actions  |

### Dependency Maintenance

Status: `Open`

Outcome:

- keep runtime, build, and lint dependencies current without mixing safe patch updates with larger migration work

Tasks:

| Task                                                      | Status | Notes                                                                                                                                                                                                                                                    |
|-----------------------------------------------------------|--------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Review outdated npm dependencies                          | Done   | latest review shows `npm audit --workspaces` reports 0 vulnerabilities; only major migrations remain after the patch/minor update pass                                                                                                                   |
| Apply low-risk patch/minor dependency updates             | Done   | updated tracked manifests for `preact` 10.29.1, `vite-plugin-web-extension` 4.5.1, `vitest` 4.1.6, `@types/chrome` 0.1.42, `typescript-eslint`/parser/plugin 8.59.3, `eslint-plugin-react-hooks` 7.1.1, `globals` 17.6.0, and `stylelint` 17.11.1        |
| Migrate mini-IRIS packaging to `archiver` 8               | Done   | `build-zip.cjs` now uses the ESM `ZipArchive` import path; `npm run package:mini-iris` creates fresh `.zip` and `.xpi` packages successfully                                                                                                             |
| Make extension package output names explicit              | Done   | mini-IRIS writes `apps/mini-iris/builds/mini-iris-chrome-<version>-<timestamp>.zip` and `mini-iris-firefox-<version>-<timestamp>.xpi`; IRIS writes `apps/iris/builds/iris-chrome-<version>-<timestamp>.zip` and `iris-firefox-<version>-<timestamp>.xpi` |
| Include version number in packaged artifact names         | Done   | IRIS and mini-IRIS package scripts now include package version in ZIP/XPI filenames, e.g. `iris-chrome-0.1.7-<timestamp>.zip`, `iris-firefox-0.1.7-<timestamp>.xpi`, and `mini-iris-chrome-1.0.32-<timestamp>.zip`                                       |
| Align product build/package/release commands              | Done   | root commands now use the same product-level shape for IRIS and mini-IRIS: `build:*` creates unpacked `dist` output, `package:*` creates ZIP/XPI artifacts, and `release:*` aliases the product package flow                                             |
| Align mini-IRIS artifact names by browser platform        | Done   | mini-IRIS now mirrors the IRIS package naming shape with explicit browser targets and per-browser package commands: `package:chrome`, `package:firefox`, `mini-iris-chrome-<version>-<timestamp>.zip`, and `mini-iris-firefox-<version>-<timestamp>.xpi` |
| Keep only current release package artifacts               | Done   | IRIS and mini-IRIS package scripts now clear their `builds/` output folder before writing new ZIP/XPI artifacts, so `npm run release:*` leaves only the latest packaged build instead of accumulating historical artifacts                       |
| Migrate shared state to `zustand` 5                       | Done   | `@iris/core` now uses the vanilla store API plus a Preact-compatible `useSyncExternalStore` hook so tests and Preact builds avoid a React runtime dependency                                                                                             |
| Migrate map rendering to `maplibre-gl` 5                  | Done   | manifests now target `maplibre-gl` 5.24.0; builds pass for IRIS Chrome/Firefox plus mini-IRIS, desktop/mobile smoke tests passed, and IRIS 0.1.3 benchmark samples were recorded; follow-up panning/selection work remains separate                      |
| Migrate TypeScript to 6.0.3                               | Done   | root/core/IRIS/mini-IRIS now target `typescript` 6.0.3; root tsconfig uses `moduleResolution: "Bundler"` and core has an explicit scoped tsconfig with GeoJSON types; typecheck/test/lint/builds pass                                                    |
| Evaluate remaining major dependency migrations separately | Done   | `archiver`, `zustand`, `maplibre-gl`, and `typescript` major migrations are complete; continue normal dependency review in future lifecycle passes                                                                                                       |

## Shared Runtime And Package Boundaries

Status: `In Progress`

Goal:

- keep IRIS and Mini-IRIS aligned through proven shared backend/engine/domain code
- avoid turning Mini-IRIS into a second full IRIS shell
- avoid package splits until the boundary and build/release costs are clear

Principles:

- Shared code should start with non-UI logic: parsers, typed models, entity/map feature builders,
  diagnostics formatting, request freshness helpers, mock data generators, and request policy.
- App shells should stay app-owned until there are repeated call sites and clear ownership.
- Keep app shells under `apps/` and shared backend/engine/domain logic under `packages/`.

Near-term order:

1. Inventory/display derivation: compare IRIS's richer inventory parser/grouping/display derivation with Mini-IRIS's
   compact needs, then move only reusable data helpers into `packages/core`.
2. Map style/domain constants: continue consolidating canonical Intel/Ingress constants and derive non-default theme
   variants without making app UI themes shared.
3. Live update pipeline: reduce perceived COMM-to-map lag with targeted, throttled refreshes from actionable plexts
   before considering broader polling.
4. Diagnostics/bench formatting: keep copied bench/readout fields aligned through shared formatting helpers where
   duplication becomes concrete.
5. Page-world map protocol helpers: share typed protocol helpers only after IRIS and Mini-IRIS call sites stabilize.
6. Package chopping: split more packages only after shared usage and bundle/build costs are clear.

Live update pipeline sketch:

- Parse actionable portal GUIDs from COMM/plext activity such as capture, deploy, destroy, recharge, mod deploy, link,
  and field events.
- Queue dirty portal IDs with short debounce, dedupe, per-portal cooldown, and low concurrency.
- Refresh affected portals through targeted portal-details/getPortal requests where useful, prioritizing selected and
  visible portals.
- For link/field/capture/destroy events, schedule a small delayed entity refresh for current bounds or affected area
  because portal details may not contain full topology.
- Keep ordinary polling conservative; this is a freshness hint path, not a new always-on heavy refresh loop.

Tasks:

| Task                                                          | Status      | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
|---------------------------------------------------------------|-------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Define shared-vs-app ownership boundaries                     | In Progress | first concrete rule is proven engine helpers can move to `packages/core`; app runtime protocols, UI shells, and product-specific orchestration stay app-owned until both call sites stabilize                                                                                                                                                                                                                                                                                                     |
| Identify first shared backend/engine extraction candidates    | In Progress | extracted candidates already include antimeridian-safe map geometry, plain entity GeoJSON builders, endpoint formatting helpers, shared endpoint request gate logic, shared COMM plext request contract, shared player tracker history reduction, shared map style constants, shared inventory display derivation, COMM portal refresh hints, and neutral diagnostic formatting helpers; remaining candidates stay audit-only until reuse is proven                                                        |
| Decide app/package layout for IRIS and mini-IRIS              | Done        | full IRIS now lives in `apps/iris` beside `apps/mini-iris`; reusable backend/engine/domain packages remain under `packages/`                                                                                                                                                                                                                                                                                                                                                                      |
| Smoke test unpacked IRIS after app layout move                | Done        | manual Chrome smoke against the moved `apps/iris` build looked good after typecheck/lint/test/build/package validation                                                                                                                                                                                                                                                                                                                                                                            |
| Audit inventory/display derivation for shared core use        | Done        | moved reusable inventory category lists, grouped display rows, category counts, sort modes, and grouped-item filtering into `packages/core`; IRIS and Mini-IRIS keep their app-owned popup/dock UI and color decisions                                                                                                                                                                                                                                                                            |
| Design COMM-driven targeted portal refresh pipeline           | Done        | core now extracts recent portal/link coordinate activity hints from COMM; IRIS uses the shared hints for existing bounded entity refreshes, and Mini-IRIS resolves hints to known portals, batch-caps/in-flight-guards portal-details refreshes, and resyncs the map when refreshed details arrive                                                                                                                                                                                                |
| Derive non-default IRIS themes from INGRESS defaults          | Done        | DEBUG, CYBER, and SOFTER now use a small theme-variant helper that deep-merges explicit readability/accent overrides onto the canonical INGRESS palette, with rarity aliases kept in sync                                                                                                                                                                                                                                                                                                         |
| Extract shared antimeridian-safe map geometry                 | Done        | moved wrapped line/polygon geometry into `packages/core` and switched IRIS plus Mini-IRIS render feature builders to the shared helper                                                                                                                                                                                                                                                                                                                                                            |
| Extract shared plain entity GeoJSON builders                  | Done        | moved common portal point, wrapped link line, wrapped field polygon, and FeatureCollection helpers into `packages/core`; app-specific filters, colours, selection, 3D extrusion, and plugin/planning features stay local                                                                                                                                                                                                                                                                          |
| Extract shared event/artifact map point builders              | Done        | moved pure artifact and ornament point feature construction into `packages/core`; IRIS and Mini-IRIS still own visibility filters, layer properties, labels, colours, and event/shard UI semantics                                                                                                                                                                                                                                                                                                |
| Extract shared endpoint/diagnostic formatting helpers         | Done        | moved countdown, relative-time, endpoint stale status, endpoint sorting, and Mini-IRIS compact endpoint badge label helpers into `packages/core`; stores, queues, diagnostics UI, and styling remain app-owned                                                                                                                                                                                                                                                                                    |
| Extract shared COMM plext request contract                    | Done        | moved plext request bounds/message construction into `packages/core`; IRIS and Mini-IRIS now post the same typed `IRIS_PLEXTS_REQUEST` shape while keeping app-specific scheduling/freshness policy local                                                                                                                                                                                                                                                                                         |
| Extract shared extension request message builders             | Done        | moved stable portal-details, inventory, game-score, and region-score message constructors into `packages/core`; apps still own when to request, cooldowns, endpoint scheduling, and UI actions                                                                                                                                                                                                                                                                                                    |
| Extract shared player tracker history reducer                 | Done        | moved COMM markup-to-player-history reduction into `packages/core`; full IRIS player-tracker plugin and Mini-IRIS now share movement parsing while keeping rendering, zoom gates, polling, and UI local                                                                                                                                                                                                                                                                                           |
| Align IRIS and Mini-IRIS diagnostics copy/read order          | Done        | Mini-IRIS DBG now keeps human-readable fields first and aligns copied bench field names/order with IRIS around environment, z/mode, items, visible counts, sources, frame stats, render/query, and toggles; shared core helpers now format neutral diagnostic counts/timings and browser/environment labels while app-specific bench line assembly stays app-owned                                                                                                                                |
| Smoke test cross-app diagnostics comparison                   | Done        | copied IRIS Diagnostics and Mini-IRIS DBG bench outputs compare cleanly around environment, viewport/rendered counts, sources, and frame/network context; Mini-IRIS keeps the historical `items` bench label for sample continuity                                                                                                                                                                                                                                                                |
| Align player tracker freshness policy                         | Done        | shared core now owns the 3h history window, max displayed trail events, z9 visibility floor, tick interval, and pruning helper; IRIS and Mini-IRIS keep rendering/polling local but use the same stale-history cleanup semantics                                                                                                                                                                                                                                                                    |
| Refine viewport-scoped COMM cache and small-pan merge policy  | Open        | current IRIS fix replaces the COMM window on fresh current-view fetches to avoid stale far-away messages after globe jumps; later consider bounds/region buckets or small-pan append/merge so returning to a recent area can reuse local COMM history without showing unrelated regions                                                                                                                                                                                                           |
| Audit remaining non-UI shared runtime candidates              | Open        | keep as an audit list, not an extraction mandate: plext debug snapshot formatting, level display derivation, event/shard/artifact visibility classification, portal-details merge policy, topology freshness policy, mock data generators, persistence schema helpers, and any remaining app-specific extension protocol builders                                                                                                                                                                    |
| Extract shared COMM hint portal resolver if policy stabilizes | Done        | moved the pure coordinate/name resolver into `packages/core`; IRIS and Mini-IRIS still own request timing, refresh caps, pending guards, cooldowns, and logging                                                                                                                                                                                                                                                                                                                                   |
| Extract keyed cooldown/pending/batch-cap primitive            | Done        | moved the pure keyed refresh batch selector into `packages/core`; IRIS and Mini-IRIS use it for COMM-driven portal-detail refreshes while keeping hint resolution, timers, request posting, and endpoint logs local                                                                                                                                                                                                                                                                               |
| Extract shared plext debug snapshot formatter                 | Open        | Mini-IRIS currently owns raw/parsed COMM debug copy; consider core only if full IRIS needs equivalent raw/parsed plext snapshots, and keep sensitive-data copy actions app-owned                                                                                                                                                                                                                                                                                                                  |
| Extract shared portal health bucket derivation                | Done        | moved the 25/50/75/100 portal-health filter bucket helper into `packages/core`; IRIS feature builders and page-world snapshot filtering now share the same bucket semantics while UI labels and filters remain app-owned                                                                                                                                                                                                                                                                          |
| Extract shared bounds/E6 helpers                              | Done        | moved E6 conversion, finite-bounds validation, longitude normalization, and antimeridian-aware bounds containment into `packages/core`; app request timing and map runtime protocols remain local                                                                                                                                                                                                                                                                                                  |
| Extract shared entity tile request payload builder            | Done        | moved Intel `getEntities` tile-key/data-zoom/coverage-key generation into `packages/core`; IRIS still owns when to request entities, per-tile freshness, batching, retries, and endpoint diagnostics                                                                                                                                                                                                                                                                                              |
| Extract shared map camera validation helpers                  | Done        | moved finite lat/lng/zoom and null-island/fallback camera validation into `packages/core`; IRIS persisted startup camera checks and Mini-IRIS saved map-state loading now share the same guardrails                                                                                                                                                                                                                                                                                                |
| Extract shared portal-details mitigation link-count helper    | Done        | moved portal-details link-count preparation into `packages/core`; IRIS and Mini-IRIS now parse portal details through the same helper so mitigation input stays aligned while each app keeps request timing, selection updates, and logging local                                                                                                                                                                                                                                                    |
| Extract shared safe storage helpers                           | Done        | moved defensive localStorage string/JSON/boolean reads and writes into `packages/core`; Mini-IRIS preference/map-state persistence and IRIS startup camera restore now share the same blocked-storage and invalid-JSON fallback behavior                                                                                                                                                                                                                                                               |
| Extract shared benchmark frame aggregation helpers            | Done        | moved frame-sample accumulation and multi-run benchmark aggregation math into `packages/core`; IRIS and Mini-IRIS keep RAF scheduling, benchmark controls, copy text, and UI display local                                                                                                                                                                                                                                                                                                        |
| Extract shared endpoint activity log formatting               | Done        | moved request/success/error activity messages and Mini-IRIS compact `NET endpoint` log text into `packages/core`; endpoint stores, telemetry state, retention, and UI rendering stay app-owned                                                                                                                                                                                                                                                                                                    |
| Extract shared endpoint request gate helper                   | Done        | moved the pure in-flight/cooldown/freshness/queued request gate into `packages/core`; Mini-IRIS request queue now uses it at enqueue and execution time, while IRIS can adopt it later where coordinator policy matches                                                                                                                                                                                                                                                                             |
| Defer package chopping until boundaries are proven            | Open        | only split packages after shared usage and bundle/build costs are measured                                                                                                                                                                                                                                                                                                                                                                                                                        |

## IRIS Performance And Architecture Review Follow-ups

Status: `Done`

Why:

- page-world rendering, entity refresh ownership, and MapLibre Marker pins are now stable enough to review cross-cutting
  performance risks instead of only chasing feature regressions
- recent benchmarks improved substantially, but remaining mobile lag risk is likely architectural: request bursts, full
  source rebuilds, plugin feature churn, crossing detection work, and UI/store rerenders
- the external review agreed with local findings on spatial indexing, GeoJSON/source rebuild cost, and diagnostics; the
  priorities below are adjusted to the current IRIS page-world architecture rather than the older mini-IRIS renderer
  paths

Tasks:

| Task                                                          | Status  | Notes                                                                                                                                                                                                                                                                                                            |
|---------------------------------------------------------------|---------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Keep strict Intel request limiting verified                   | Done    | `safeIrisFetch` already applies a FIFO concurrency limit of 5 and entity requests are chunked; keep this covered when changing request scheduling so large pans do not starve other Intel traffic                                                                                                                |
| Disable or fix default portal-name debug logging              | Done    | `portal-names` is now opt-in, removes its stats item on teardown, and unsubscribes from portal updates; this avoids default hot-path console spam and stale subscriptions                                                                                                                                        |
| Split or memoize page-world GeoJSON/source sync by domain     | Done    | portal, link, field, selection, planned, plugin, artifact, ornament, mission, and visual filter/theme updates now patch only affected sources with a short debounce; link/field visibility no longer empties source data                                                                                         |
| Add `rbush.load()` path for `SpatialIndex.syncAll`            | Done    | full index rebuilds now bulk load prebuilt portal/link/field bbox items and keep the tracker map valid for later incremental removes/updates; covered by focused `SpatialIndex` tests                                                                                                                            |
| Reduce overlay rerenders from map-state camera sync           | Done    | `IRISOverlay` no longer subscribes to `mapState` for rendering just to forward camera changes; a direct store subscription now posts debounced page-runtime camera sync during movement                                                                                                                          |
| Reduce overlay rerenders from entity source sync              | Done    | portal/link/field source sync now uses direct store subscriptions to post page-runtime patches, so entity refreshes do not rerender the full overlay tree just to forward map data                                                                                                                               |
| Avoid hidden popup subscriptions                              | Done    | selection info popups, mission details, and plugin feature details now mount only when active instead of subscribing to store slices while returning `null`                                                                                                                                                      |
| Profile remaining Zustand/UI rerenders during pan             | Done    | Diagnostics now records lightweight render samples for the overlay/dock/status/planning/mock surfaces and main-thread long task/event-loop spikes; copied bench output includes `LONGTASK` and `UIRENDER` lines before broader selector refactors                                                                |
| Add planned-link crossing prefiltering                        | Done    | planned-link crossing detection now precomputes loaded-link bounding boxes only when saved planned links exist, then skips exact segment checks when segment bounds cannot overlap                                                                                                                               |
| Standardize domain error reporting into Diagnostics           | Done    | inventory, plext, and portal-details parser failures, active request failures, and page-world runtime task failures now report recoverable domain errors into Diagnostics without changing normal recovery behavior                                                                                              |
| Investigate multi-popup crash with heavy UI open              | Blocked | deferred until a fresh Chrome `Oh snap` reproduction is available; popup render sampling now includes those heavy popups, and Diagnostics samples map/entity/perf counters once per second instead of subscribing live to its own counters and map movement                                                      |
| Add optional message sequence IDs for diagnostics             | Blocked | deferred until request/response tracing becomes the next concrete blocker; current diagnostics already cover domain errors, source timings, long tasks, UI renders, entity generations, and plugin mix                                                                                                           |
| Add stronger benchmark variants for comparison                | Done    | mock tools Bench now supports `Normal`, `Base`, `No Plugins`, `No Links`, and `No Fields`; copied frame diagnostics include the variant so map-engine baseline, plugin-overlay, and entity-layer costs can be compared cleanly                                                                                   |
| Keep current source counts visible in patch benchmarks        | Done    | page-world diagnostics now keep current portal/link/field/artifact/ornament/plugin/planned source counts while `sourceSetDataMs` still reports only the latest patch timing                                                                                                                                      |
| Add mock player activity plexts for tracker testing           | Done    | mock tools now include an `Activity` action that injects 10 mock player activity plexts across nearby loaded portals via the same store path as COMM; player tracker rebuilds from current plexts on update/setup so cleared mock activity cannot reappear after pan without dropping existing live COMM history |
| Add plugin overlay composition diagnostics                    | Done    | copied Diagnostics output now includes a `PLUGIN` line with total/rendered/html/label/player/highlight/line/fill/point/interactive counts so overlay-heavy samples can identify the active plugin mix                                                                                                            |
| Fix low-zoom globe-wrap link/field rendering                  | Done    | render feature builders now split antimeridian-crossing links and field polygons into render-safe geometry so they draw along the short path without changing selection/storage geometry                                                                                                                         |
| Guard tile coverage generation against invalid/extreme bounds | Done    | entity coverage generation now rejects non-finite bounds, clamps WebMercator lat/tile ranges, handles antimeridian-crossing bounds, caps extreme tile lists at 1024, and reports diagnostics through endpoint metadata instead of risking a runaway loop                                                         |
| Investigate package split only after measuring bundle cost    | Blocked | an `@iris/types` or `@iris/utils` split may help later, but it is deferred until plugin bundle size or package-boundary cost is a measured issue                                                                                                                                                                 |
| Consider selected-in-view nudge for IRIS popups               | Open    | Mini-IRIS nudges the map when selection details open/close so the selected object stays visible above the bottom panel; evaluate the same behavior for full IRIS later                                                                                                                                           |
| Consider smooth jump behavior for explicit IRIS jumps         | Open    | Mini-IRIS uses `flyTo` for explicit portal jumps while IRIS mostly uses `jumpTo`; evaluate only for user-triggered jumps, not ordinary selection                                                                                                                                                                 |
| Consider MapLibre style-image player pins for IRIS            | Open    | Mini-IRIS now renders player activity as team-coloured `addImage`/symbol-layer pins above map entities; evaluate replacing IRIS player marker rendering with the same source/layer approach later                                                                                                                |
| Improve entity refresh after live COMM activity               | Done    | recent COMM messages with portal/link coordinates now use shared refresh hints; IRIS schedules a capped targeted portal-details refresh for known visible portals plus a short, coalesced current-view entity refresh for topology with dedicated cooldowns to avoid extra request pressure                      |

## Mini-IRIS Page-World Alignment

Status: `Done`

Goal:

- keep mini-IRIS stable and compact while moving it toward the same page-world runtime discipline as IRIS
- share proven backend/engine/domain components without turning mini-IRIS into a second full IRIS shell
- avoid package splits until repeated cross-app duplication proves a durable boundary

Principles:

- Preserve mini-IRIS as the compact/mobile-first app.
- Extract shared logic only after comparing both call sites.
- Prefer shared parsers, entity/map feature builders, diagnostics formatting, request policy, mock data generators, and
  typed models before shared GUI surfaces.
- Prefer native MapLibre APIs for Mini-IRIS map selection, context menus, and gesture hooks in the page-world runtime;
  keep the content-world side as a compact UI/data bridge.
- Keep app-specific UI composition in `apps/iris` and `apps/mini-iris` until component ownership is obvious.

Non-goals:

- Do not add a full IRIS diagnostics popup; keep `DBG` compact and map-focused.
- Do not add a Mini-IRIS plugin system yet; reuse proven helpers without hosting arbitrary plugins.
- Do not chase full drawer/sidebar parity; keep Mini-IRIS bottom-dock and mobile-first.
- Do not extract shared UI components just because surfaces look similar; wait for stable call sites.
- Do not migrate full planning/draw-tools into Mini-IRIS yet.
- Do not add heavy always-on overlays; keep labels, keys, player trails, diagnostics, and visual modes opt-in or
  zoom-gated.
- Do not split packages based on theory; start with low-risk shared logic only when both apps already need it.

Tasks:

| Task                                                                          | Status | Notes                                                                                                                                                                                                                                                                              |
|-------------------------------------------------------------------------------|--------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Audit mini-IRIS vs IRIS runtime overlap                                       | Done   | map ownership was the first proven overlap; Mini-IRIS now uses a compact page-world MapLibre runtime and content-world UI bridge                                                                                                                                                   |
| Define compact mini-IRIS non-goals                                            | Done   | non-goals now keep Mini-IRIS compact: no full diagnostics popup, plugin system, broad UI parity, draw-tools migration, heavy always-on overlays, or theory-driven package split                                                                                                    |
| Migrate mini-IRIS map runtime toward page-world discipline                    | Done   | page-world runtime owns MapLibre, rendered-feature selection, explicit mobile touch-hold selection, camera, sources, players, selection highlights, style, and 3D toggles                                                                                                          |
| Smoke test Mini-IRIS page-world map interactions                              | Done   | desktop Chrome and mobile testing confirmed map load, portal selection, drawer details, right-click details, and long-press details after the page-world migration                                                                                                                 |
| Add compact Mini-IRIS diagnostics/bench surface                               | Done   | `DBG` map tool opens compact entity/source counts, frame stats, render timing, active toggles, and copyable one-line bench output without adding a full IRIS diagnostics popup                                                                                                     |
| Allow Mini-IRIS DBG alongside dock panels                                     | Done   | diagnostics now uses independent open state so `DBG` can remain visible while COMM, inventory, player, scores, or selection panels are open                                                                                                                                        |
| Preserve Mini-IRIS faction ring with level/health toggles                     | Done   | page-world portal styling now keeps a faction-coloured stroke/ring while level colouring and health opacity affect the fill                                                                                                                                                        |
| Match IRIS portal HP colour ramp in Mini-IRIS                                 | Done   | HP mode now uses the same yellow/orange/red/magenta recharge semantics as full IRIS while preserving the faction-coloured stroke/ring                                                                                                                                              |
| Make Mini-IRIS secondary interactions open popups directly                    | Done   | page-world contextmenu/right-click and mobile long-press now send a details intent so the compact selection/details drawer opens directly                                                                                                                                          |
| Tune Mini-IRIS explicit portal jump behavior                                  | Done   | explicit portal jumps now use a shorter `easeTo` page-world command instead of a long `flyTo`; geolocation keeps the existing `flyTo` behavior                                                                                                                                     |
| Normalize Mini-IRIS font usage                                                | Done   | Mini-IRIS now sets a single root UI font stack with tabular numerals; diagnostics and entity details inherit it, while only the copyable bench line uses a dedicated monospace stack                                                                                               |
| Add Mini-IRIS inventory mocks                                                 | Done   | mock source patterns now publish generated inventory into the shared store so the inventory dock can exercise keys, capsules, resonators, weapons, mods, powerups, and viruses without live C.O.R.E. inventory                                                                     |
| Hide/show Mini-IRIS event and shard inventory items                           | Done   | inventory check accepted for now; keep compact defaults aligned with IRIS behavior for special/event inventory categories and revisit with live Mini-IRIS inventory testing if needed                                                                                              |
| Replace Mini-IRIS player activity pulse with pin marker                       | Done   | Mini-IRIS player activity now uses a compact static team-coloured pin marker and no longer runs a per-frame pulse loop for player points                                                                                                                                           |
| Align Mini-IRIS portal/link/field styling with IRIS                           | Done   | Mini-IRIS, IRIS, and bundled overlay plugins now share core Ingress default colours for teams, levels/resos/XMPs, item rarity, mod rarity, item types, keys/XM/tracker, health, artifacts, ornaments, portal history, and base entity style constants while preserving Mini toggles |
| Review Machina map and text colours across IRIS and Mini-IRIS                 | Open   | expected default is red-aligned Machina styling; Mini-IRIS currently appears purple for pins and IRIS appears grey in at least one smoke test, so compare team colour constants, portal pins, links, fields, and player/activity markers                                           |
| Review 'soft', 'cyber' and 'debug' colors. can we use RGB to HSL and formulas | Open   | discover if we can create a formula toCyber and toSofter and apply them to all INTEL INGRESS colors when switching themes                                                                                                                                                            |
| Review neutral portal map colours across IRIS and Mini-IRIS                   | Done   | default neutral portal styling now uses a grey body with a white stroke/ring in both IRIS page-world rendering and Mini-IRIS, while selected state still uses the existing stronger white selection ring                                                                                |
| Review Intel-like default portal level sizing                                 | Open   | consider using portal size/prominence to reflect portal level by default, closer to stock Intel behavior, while keeping explicit LVL colour overlays opt-in and checking readability/performance at low zooms                                      |
| Add Mini-IRIS event and shard map overlays                                    | Done   | Mini-IRIS now requests `getArtifactPortals`, parses artifacts through core, renders compact event/shard rings from live portal/artifact data, and exposes `EVT`/`SHD` overlay toggles without adding a full layer drawer                                                           |
| Add Mini-IRIS mock event and shard overlays                                   | Done   | `Src` mock patterns now attach deterministic event ornaments and shard/target artifacts so `EVT`/`SHD` overlays can be tested without live anomaly data                                                                                                                            |
| Validate Mini-IRIS COMM-to-map refresh polish                                 | Done   | live DBG/raw plext testing confirmed actionable COMM markup now produces portal refresh hints, capped portal-detail requests, map resyncs, and readable pending/cooldown logs                                                                                                      |
| Align Mini-IRIS compact inventory category colours                            | Done   | inventory category counts now use one neutral colour so compact totals do not imply item level, rarity, or subtype; item-specific colours remain a future detail-view concern                                                                                                      |
| Recheck Mini-IRIS app-facing polish before deeper extraction                  | Done   | live update path, styling parity, special inventory visibility, and IRIS pickup-later items are tracked; deeper shared candidates remain audit items, not immediate extraction work                                                                                                |

## Snapshot And Reference Sources

Active tracker:

- [`docs/WORK_ITEMS.md`](docs/WORK_ITEMS.md)
- IITC Draw Tools
  reference: <https://raw.githubusercontent.com/IITC-CE/ingress-intel-total-conversion/master/plugins/draw-tools.js>
- IITC Player Activity Tracker
  reference: <https://raw.githubusercontent.com/IITC-CE/ingress-intel-total-conversion/master/plugins/player-activity-tracker.js>
