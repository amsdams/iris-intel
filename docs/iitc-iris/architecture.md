# Application Architecture

The goal is a clean, manageable app with explicit ownership, small reusable components, and feature-owned workflows.
This is the retained architecture guidance from the completed CSS, component, composition, and runtime cleanup.

## Packages And Dependencies

- `apps/iitc-iris` owns Preact UI, feature workflows, extension integration, and the injected Leaflet runtime.
- `packages/iitc-core` owns UI-independent parsing, geometry, request planning, response application, and caches.
  Keep browser, DOM, Preact, Leaflet, and extension APIs in the app.
- `apps/android-intel-spike` is a disposable native login/injection proof, outside the npm workspaces;
  phone login/persistence and manual bundled IRIS injection passed a quick feature smoke.
- Features depend on shared `ui/` primitives. Shared UI does not depend on features.
- ESLint's local `architecture/import-boundaries` rule enforces core-only dependencies, UI primitive isolation,
  and private runtime entry points. It checks imports/re-exports, literal dynamic imports, require and TypeScript
  import types, resolving relative paths before checking. Runtime entry points are consumed within their feature
  folder or by `page-map-runtime.ts`; `map-diagnostics.ts` and `map-settings-runtime.ts` have explicit type-only
  adapter exceptions. Tests may exercise runtime owners, while core/UI tests retain their dependency limits.
  Core currently has no external production dependencies; deliberate additions require an explicit rule change.
  Rule regressions run through `npm run test:architecture`, included in `npm run check`.
- Use [IITC-shaped facades](facade-pattern.md) selectively for pure domain contracts.

Base maps stay under Leaflet ownership. `map/layers/base-layers.ts` creates OSM raster tiles or an OpenFreeMap
Dark/Positron vector layer through MapLibre’s Leaflet binding. Leaflet owns gestures, overlays, and layer removal;
the binding disposes its WebGL map when removed. The standalone MapLibre worker is bundled in XPI/ZIP/APK,
with a narrow Android asset route. Saved CARTO preferences migrate to OpenFreeMap; OSM preferences stay unchanged.
See the [OpenFreeMap integration guide](https://openfreemap.org/quick_start/).

## Source Organization And Composition

Group app features by menu/domain: `map/`, `portals/`, `agent/`, `comm/`, and `system/`; keep application coordination
in `shell/` and reusable primitives in `ui/`. A rendered panel has an explicit entry point in its component folder.
Shared domain logic belongs outside panel folders. A feature with runtime/workflow helpers groups them, its tests,
map-generated CSS and its panel inside one feature folder: `map/search/search-panel/`, `map/missions/missions-panel/`,
`map/layers/display-panel/`, `map/scores/scores-panel/`, `agent/inventory/inventory-panel/`, and
`agent/passcode/passcode-panel/`. Player Tracker keeps its runtime, marker/popup helpers, CSS and tests together in
`map/player-tracker/`. Simple panels such as Agent Profile or Help remain directly under their domain; shared
Inventory/Passcode item-list styles remain at `agent/item-list.css`. Do not create a directory solely for uniform depth.

Optional menu panels are marked in `shell/menu-registry.ts`. `shell/panel-visibility.ts` owns their local visibility
preferences (`iitc-iris:hidden-panels`), defaulting to all shown and accepting only optional ids. The System Panels
sheet changes menu access independently of drawings/map layers; navigation and restored-sheet validation share the
same visibility rule. Baseline panels always remain available.

System → About owns visible project/plugin acknowledgements and offline license disclosures. Root `CREDITS.md`
records upstream feature sources; packaging copies it and the project license with IITC, Leaflet, Preact and MapLibre
notices into the shared `licenses/` assets used by extensions and Android.

`content.tsx` assembles the app, bridges page messages, and coordinates shared camera/entity/auth state.
`shell/use-shell-navigation.ts` owns active sheet/side panel, portal-image visibility, persisted sheet transitions,
hidden-panel guards and deferred Search focus. `shell/sheet-navigation-actions.ts` applies the existing pure
navigation effects with their cancellation/setter/storage order. Navigation effects retain their former App
registration position. Pending Search focus is cancelled on replacement, navigation away and unmount. Cancellation
happens in the sheet setter, so an older pending Preact effect cannot cancel a newly requested focus frame. The message
adapter retains direct navigation setters and persistence so selection-driven updates keep their original ordering.
Search, Layers, Missions, and location controls own their feature workflows. Their effect calls retain deliberate
registration order. `comm/use-comm-ui-state.ts` owns per-channel drafts, send acknowledgment bookkeeping and
scroll/history UI actions/state. Its request/visibility and scroll effect groups register at the former App positions,
with scroll effects after Missions/Search, preserving message/effect ordering. App retains received COMM state for
bridge/auth composition and navigation; COMM transport stays in its runtime. Draw Tools and Portal Analysis retain
their existing workflows. Avoid a broad app hook or global store that hides this wiring.

App calls existing portal, clipboard, Passcode and auth actions directly and posts the existing panel/camera message
builders. State-bound UI callbacks stay in App. `content-command-callbacks.ts` retains context guards/anchor adaptation
and cross-feature menu/COMM/Missions coordination. Sheet cancellation and setter/storage ordering belong to the shell
navigation actions. Do not add an extra command layer that only forwards a feature action or builder call.

`messages.ts` owns bridge constants and envelope composition and preserves existing type imports through explicit
exports. `messages/entities.ts` owns portal/render models: `IitcIrisPortalSummary` shares common selected/rendered portal
fields while each keeps its own required/optional decorations, history and topology. `messages/map.ts` owns map settings
and diagnostic payloads; named COMM, Agent, Inventory, Scores, Passcode, Missions, Search and Draw Tools modules own
their feature payload types. Inventory uses Agent's subscription state through a type-only import. These declarations
must not depend back on the bridge or introduce runtime imports. This organization does not validate incoming JSON;
message source/contract validation remains at its runtime boundary.

`platform/storage.ts` owns the failure boundary for optional local preferences. Shell settings, page map-view
preferences, panel visibility and theme supply read/parser or write/removal operations; they retain keys, formats,
normalization, migrations and lazy defaults. Keep multi-key reads and serialization inside their existing operation
boundary. This helper does not govern session/auth storage, reported Draw Tools persistence errors or mission-cache
maintenance, which retain their feature-specific behavior.

Core `portal-analysis.ts` owns counts, portal-list/AP, scoreboard and list-summary aggregation.
`summarizeIitcPortalsList` sums the supplied rows; the app workflow selects its filtered subset and retains sorting,
state/memoization, formatting, colors and SVG geometry. Portal-list panel/control props use the core summary type.


## Feature Lifecycle Contracts

Use direct typed owners and callbacks. There is no shared feature base class, plugin registry or activation engine.
For each stateful owner, name its lifetime, work trigger, cancellation/invalidation operation, retained state and
resource cleanup in its API comment and tests. Add pause/resume methods only when the feature actually needs them.

- Menu placement, layer visibility and runtime activation are separate inputs. Hiding a menu item does not disable
  processing or erase feature data. Sheet visibility may change a feature's polling interest where already specified.
- Cancellation ends owned work; invalidation also rejects obsolete replies. A restarted request must not accept a
  previous request's reply. Keep map replacement/generation guards at the owner that can establish freshness.
- `resetReferences()` forgets indexes/snapshots only. Layer clearing removes rendered content. Map disposal ends
  map-owned resources; it does not imply deleting page history or persisted preferences.
- Cleanup releases only resources the owner created. Owners surviving map replacement read the current map through
  callbacks. Cancellation/cleanup must tolerate repeated calls without removing another owner's work.

| Owner | Lifetime / trigger | Stop or invalidate | Retained state / resource owner |
| --- | --- | --- | --- |
| Shell navigation | Mounted App; navigation or page messages | Search focus frame cancelled on replacement, leaving or unmount | Sheet preference persists; selection/request transport stays outside navigation. |
| Map requests | Page coordinator, current-map requests and per-refresh sessions | Cancel fetch/timers; generation checks and map lifetime reject obsolete work | Data-source reset invalidates the request generation; cache policy stays with the coordinator. Diagnostic helpers are stateless. |
| COMM | Page channel buffers; current-map transport and independent polling interests | Cancel fetch or dispose polling on map teardown | Buffers/history remain page-owned; hiding COMM does not suppress tracker/portal-activity consumers. |
| Player Tracker | Page history; public COMM input and layer/zoom rendering | Clear marker resources on disposal; map lifetime removes layers | History remains; hidden layers already limit tracker polling interest but do not gate all COMM processing. |
| Label/decorations | Page indexes; current-map Canvas | Reset references, clean orphans, remove layers/map in existing order | Canvas/image caches and pending image work belong to the map adapters. |
| Draw Tools | Stored drawings plus page actions; current-map rendering | Injected layer clear and map disposal | Closing/hiding the sheet retains drawings and selected layer visibility. |
| Missions | Page list/detail state and persisted caches; explicit requests | `cancelRequests()` aborts list/detail work; superseded replies are ignored | Caches remain. Existing cancellation can retain loading state; close/reopen recovery is a follow-up, not a proven dormancy contract. |

Existing regression suites cover map disposal, stale replies, label/image teardown and COMM polling interests.
Navigation adds real Preact state/effect coverage for restoration, hidden panels, cancellation order, image closure
and frame cleanup. The Missions cancellation/loading limitation is retained in the
[optional-features plan](plans/optional-features-plan.md); verify recovery before adding activation controls.

## CSS And Component Contract

1. **Dependencies point toward shared UI.** Features compose shared primitives. Shared primitives must not import
   feature modules or depend on unrelated feature styles. Shared CSS helpers have explicit consumers and dependencies;
   a feature-specific helper should stay with its feature rather than make `ui/shared` a miscellaneous collection.
2. **Appearance belongs to its owner.** A component imports its appearance, interaction states, and intrinsic responsive
   rules. The caller owns placement, surrounding gaps, and feature layout. Shell coordination and styles for map-generated
   DOM remain application/runtime responsibilities. Every central import needs a concrete infrastructure purpose.
3. **Customization is deliberate.** Use a small, documented set of variants or CSS custom properties for supported
   customization. Feature classes can control composition and domain presentation; avoid reaching into a primitive's
   internal DOM or restating its base skin. Base defaults yield to supported overrides without incidental import order,
   escalating specificity, or routine `!important`. CSS imports alone do not provide selector scoping.
4. **APIs have useful defaults.** Prefer native HTML semantics and attributes, a few meaningful variants, and children
   for content composition. Avoid combinations of flags and feature-named props that serve individual callers. Generic
   UI should not absorb feature state, request lifecycles, or domain decisions.
5. **Share a real contract.** Consolidate when actual callers share purpose, behavior, and styling responsibilities.
   Similar padding or grid declarations alone do not justify a component. Prefer an existing primitive or ordinary HTML
   when that is clearer. Fewer components is a direction, not a numeric target; a universal component with many exceptions
   is not a successful simplification.
6. **Keep tokens small and meaningful.** Reuse established typography, spacing, size, radius, and color roles. Add a token
   when repeated uses have a shared meaning, rather than turning every literal into a variable. Legitimate one-offs and
   domain colors can remain local. Token consolidation must not silently change visual density or hierarchy.
7. **Finish each migration.** Migrate affected callers together and remove replaced components, obsolete selectors,
   unused exports, and unnecessary compatibility wrappers. Verify dynamic classes and runtime-created DOM before deleting
   CSS. Keep markup, CSS, and focused tests together; avoid splitting a readable owner stylesheet into tiny fragments.
8. **Verify the visible contract.** Check affected primitives with theme foundations and explicit dependencies in the
   workbench, then their real feature composition. Preserve labels, semantics, keyboard/focus behavior, disabled/active
   states, and narrow layouts. Structural CSS checks supplement browser inspection.

`src/iitc-iris.css` centrally loads theme foundations, shell coordination, global utilities, and styles for runtime-created
map DOM. Component and feature styles are imported by their owners; shared helper styles have explicit consumers.
The semantic UI palette lives in `styles/theme.css`; `shell/ui-theme.ts` persists System/Dark/Light and follows
OS changes only in System mode. This preference is independent of the base map. Map glyphs and game level/rarity
colors retain their own palettes; light UI uses darker text roles and dark badge surfaces where necessary.
Cascade-sensitive styles stay centrally ordered where necessary. Preserve appearance, behavior, and cascade order when
changing ownership. The component workbench (`npm run dev:wb`) uses automatic discovery and generic previews.

Shared Button owns native attributes, the non-submitting default type, and the common reset; visual button families
compose it. Table supplies native table/container composition without domain behavior. SummaryCell exposes supported
custom properties instead of requiring callers to target its inner markup. Native HTML remains appropriate when a
shared component would add no useful contract. Inventory uses separate rarity/level badges, type labels, and item counts.

Single-field forms keep native `<form>` submission and use ActionButton for their submit action, aligned to the
adjacent input's height. Disable submission for empty/whitespace-only required input and while the action is busy;
use the same eligibility rule in the submit handler so keyboard submission cannot bypass it. Keep format validation
and error feedback in the feature. Review empty, ready, busy (where applicable), and error states in both UI themes;
matching components alone does not guarantee matching state behavior. No shared form component is required.
For relevant UI changes, also run `npm run test:browser`; the [browser smoke suite](../../tests/browser/README.md)
checks theme persistence, shared field/action styling, and Jump submission behavior using simulated Intel data.

## Browser And Runtime Ownership

| Boundary | Current owner / decision |
| --- | --- |
| Bundled asset URLs | `platform/assets.ts`; shared by UI callers, using extension URLs or an explicit host-provided asset base. Android serves bundled assets under a reserved Intel HTTPS path. The injected page runtime derives its own asset base from its script URL because it runs outside the extension context. |
| Clipboard | `shell/feedback.ts` owns per-area operation/timer guards; `shell/use-copy-feedback.ts` binds status and disposal to component lifetime. Clipboard and scheduling remain injectable. |
| Geolocation | `map/location-workflow.ts` supplies browser capability to `map/location-actions.ts`; the action already accepts an injected position callback. |
| Storage | `shell/storage-settings.ts` and `map/map-view.ts` retain UI/page browser access. `map/map-view-settings.ts` shares the map-view key, defaults, types, validation and parsing; `map/layers/base-layer-settings.ts` owns the base-layer key and normalization. Domain caches retain their feature lifetimes. |
| Injection, auth, transport | `content.tsx` injects the page script and bridges messages. The page runtime reads Intel cookies/version and performs authenticated requests. Keep those page-context assumptions explicit for the Android spike. |

`map/map-runtime-lifetime.ts` owns map fetch cancellation, timers, and animation callbacks. Map replacement and direct
Leaflet removal share idempotent disposal. Custom gestures remove listeners and pending callbacks. Generation and
ownership guards stop old responses or completions from mutating replacement state. Page-level message/container-ready
listeners intentionally survive map replacement. This is a focused lifetime boundary, not a claim that every effect
or browser lifecycle has been audited.

`map/map-canvas.ts` owns the Leaflet 1.9 private redraw/factory seam: synchronous redraw cancels any queued frame
before Leaflet clears its handle. Explicit entity/label/image renderers and implicit pane renderers use this adapter,
so removal can reliably cancel pending painting. Recheck this seam when upgrading Leaflet; it does not patch its global prototypes.

The page runtime composes `map/search/search-runtime.ts` (query sequencing, geocoder requests, previews and navigation),
`map/draw-tools/draw-tools-runtime.ts` (stored items, actions, highlighting and drawing), and
`map/missions/mission-overlay.ts` (route/waypoint geometry and navigation). These page-owned controllers read the
current map/entities/settings through explicit callbacks; they do not capture a replaced map or import the entry point.
Search invalidation remains in map disposal; its requests use the existing map lifetime.

`map/entities/map-renderer.ts` owns portal/link/field creation, retained identity, bucket-cache lifetime,
incremental/full render-path selection, highlighter refresh, update ordering and combined render diagnostics.
`entity-visibility.ts` owns explicit-input filter matching and changed-setting scope/secondary-work decisions; the
renderer supplies current settings. Returned plans expose read-only flags and bucket sets; only the local scope
builder mutates them. `portal-marker-style.ts` owns base appearance from portal/policy/zoom inputs;
the renderer supplies current/default zoom, retains the radius adapter and applies highlighter overrides last.

`entity-layer-sync.ts` supplies one reconciler for indexed core and overlay layers. `portal-label-overlays.ts` owns
level/key candidate selection, both indexes/snapshots and synchronization of their shared label-layer list; it uses
the existing label Canvas and collision-selection adapters. `portal-decoration-overlays.ts` owns ornament settings,
ornament/artifact specifications, indexes/snapshots and diagnostic accumulation; it uses the existing image Canvas
adapter. Labels receive filtered portals; decorations retain the full entity input. Ornament settings are read at the
existing render/timing position, and accumulated diagnostics are published after selection/drawing callbacks as before.

Both overlay owners live with the page renderer and read the current map through callbacks. `resetReferences()` forgets overlay
references without removing layers or destroying Canvas resources. Full clear removes layers before reset; context
invalidation resets references so the next overlay update removes unindexed leftovers. Map disposal retains the
existing ordered layer/map removal and reference reset. Canvas resources/caches remain map-owned, including image
load cancellation/eviction and label glyph caches. `map/map-layers.ts` names layer/pane types; map creation owns their
allocation. Selection and portal details have their own owners below.
`map/map-request-diagnostics.ts` owns diagnostic payload types, render occurrence counters/unique tile-key
accumulation and empty artifact snapshots. `map/map-request.ts` retains the latest artifact snapshot and all timing,
reset, publication and generation decisions; diagnostic helpers have no timers, network or mutable shared defaults.
`map/map-entity-transport.ts` owns map endpoint formats/decoding and fixture reads, receiving the current-map
lifetime callback and existing authenticated transport. The coordinator supplies version, signal and call timing;
endpoint-specific error/empty-result semantics remain explicit. `map/map-refresh-session.ts` owns one refresh's
fresh-cache selection, tile/render queue state, response merging, stale fallback, retry accounting and diagnostics.
It receives the page-owned cache and has no timers, network or rendering callbacks. Its queue getter is for reading;
start/apply/stale/complete methods own mutations. It requires no disposal method because it owns no async resources.
The coordinator rejects stale generations before applying a batch, and filters old-response handoffs to wanted tiles.
Artifact diagnostic writes also check the current generation, including late success/error completion.
`map/map-request.ts` owns map refresh generations, page cache and session creation, refill execution, artifact
injection and map-request diagnostics. `map/map-entity-adapter.ts` projects decoded entities and artifact results into
render payloads. It reads portal history without mutation and returns explicit updates; the coordinator applies them
at the existing fixture/cache/batch/final preparation points before publication. Artifact timestamp fallback receives
an explicit clock. Endpoint/envelope parsing stays in transport; error recovery, scheduling and diagnostic
publication stay in the coordinator.
The existing pure planning, decoding and queue/cache algorithms stay in `packages/iitc-core`. Movement and map disposal explicitly notify this page-owned controller; tile cache survives map
replacement while pending work and request identity are invalidated. `intel/intel-request.ts` holds shared page-context
CSRF/version/auth helpers, lifetime-bound endpoint transport and the shared JSON endpoint helper for panel requests.

`map/missions/missions-runtime.ts` owns mission list/detail requests, status, persistent caches and cancellation,
using `mission-overlay.ts` for geometry/navigation. `map/player-tracker/player-tracker-runtime.ts` owns player history/deduplication,
marker/trace rendering and grouped popups. Shared COMM data, polling and cancellation are owned by `comm/comm-runtime.ts`; authenticated
transport is supplied by the page coordinator. Both feature instances survive map replacement: mission caches/player history
remain available while old requests, timers and markers are cleared.

`map/scores/scores-runtime.ts`, `agent/passcode/passcode-runtime.ts` and `agent/inventory/inventory-runtime.ts` own their request state,
response-to-UI adaptation and cancellation. Inventory also owns the shared subscription request and summary/key counts;
Agent Profile reads its subscription state, and map rendering reads key counts through explicit callbacks. Panel
cancellation leaves subscription work running; map disposal cancels it and resets a loading subscription to unknown.
Completed inventory/subscription state remains available across map replacement. Keep feature behavior in these modules
and composition in `page-map-runtime.ts`; no generic plugin/controller framework is required.

`comm/comm-runtime.ts` owns channel buffers, status/preview conversion, fetch/send requests and fetch cancellation.
COMM owns interested-channel polling for the visible panel and enabled Player Tracker, using one shared public
request and publishing accepted public responses to both consumers. Player Tracker owns history/markers, not transport
or a separate poll timer. Local public/faction buffers and request cursors are tied to a mutually padded bounds area;
material changes reset them and reject old-area replies, while alerts and tracker history retain their own lifetimes.
`IITC_IRIS_COMM_VISIBILITY` explicitly synchronizes panel interest on navigation and page readiness, including switches
between side panels. Automatic deadlines are retained across foreground/history completion. Malformed endpoint
responses, including unsupported timestamps, are rejected before changing history/cursors. Shared COMM timestamp
presentation also tolerates invalid internal data without throwing. Send responses require an affirmative acknowledgment;
structured errors and unfamiliar replies retain the draft and report failure/uncertainty without automatic resend. Existing request/status payloads and stored keys remain
compatible; send metadata adds a channel-local ID and original text. UI COMM state/scroll coordination and in-memory
per-channel drafts in `comm/use-comm-ui-state.ts` remain separate; App owns the received bridge/auth state. Only confirmed delivery clears matching text; a late completion
preserves newer text and the selected channel. Pending sends survive panel closure; retries are explicit.

`comm/comm-panel/comm-filters.tsx` owns local active filters and up to eight named views in
`iitc-iris:comm-views:v1`, persisting during actions. Core `comm-views.ts` owns pure classification, filtering, portal
matching, nickname completion and safe text-link runs. Filters affect displayed messages only; Player Tracker always
receives raw public history. Filters use the existing native controls and shared Section/ControlRow/StatusText/Badge primitives, with
separate More filters and Saved views disclosures. The portal disclosure skin lives in
`ui/shared/section-summary.css`; native details/summary owns keyboard interaction. Timeline styles belong to
`comm/portal-activity.css`, with a single parent portal scrollbar. `comm/portal-activity.tsx` subscribes through additive `IITC_IRIS_PORTAL_ACTIVITY_REQUEST`
and `IITC_IRIS_PORTAL_ACTIVITY_STATUS` messages while expanded, replaying its subscription after page readiness.
The page runtime checks the current portal GUID and derives a latest-100 timeline plus total from loaded public
system events. This creates no extra fetches or polling interest. Portal matching uses GUID, falling back to exact
E6 coordinates when absent. Faction chat, complete history and authoritative ownership are outside this view.

Map requests schedule an authoritative refresh after completion: at least 5 minutes above zoom 12 and 15 minutes
otherwise, or twice the fetch duration. Periodic refresh permits the same tile plan without bypassing the cache;
movement/auth/disposal cancel its timer. `map/map-refresh-activity.ts` owns map-lifetime activity/visibility listeners:
automatic map/COMM work pauses while hidden or after 15 minutes without input; resume schedules map work after 5 seconds.
Immediate hidden-page suspension deliberately replaces IITC's short hidden idle grace period. Explicit user requests
remain available. COMM does not reconstruct authoritative portal/link/field state.

`map/map-selection-runtime.ts` owns selected portal/object state, selection overlays, portal-link navigation and
pending selection resolution. `portals/portal-details-runtime.ts` owns detail fetching/status and its twelve-entry
page-lifetime cache. Successful details update shared history, then selection promotes the shared entity and re-renders;
request abortion and selected-GUID checks reject obsolete results. `map/map-context-actions.ts` owns visible-entity
hit-testing, context payloads, click suppression and gesture installation. Existing `map-context-runtime.ts` remains
the gesture/listener cleanup helper. Inventory and Missions read selection through callbacks. Map disposal cancels
detail requests and removes gestures/layers while retaining the existing selection/cache/history lifetime.

`map/map-view.ts` owns map-view/base-layer preference serialization, URL synchronization and Intel cookies.
`agent/agent-runtime.ts` reads the current static Intel PLAYER profile and subscription snapshot for publication.
`map/map-settings-runtime.ts` owns overlay/highlighter settings and their ordered render updates; the renderer retains
geometry/style ownership. `map/map-diagnostics.ts` owns request counts, status aggregation, retained tile/interaction
snapshots and two-frame timings. Its frame callbacks use the current map lifetime; snapshots retain their existing
page lifetime. Feature snapshots are read through explicit callbacks, with no imports from the entry point.

The entry point has fallen from 6,159 to 631 lines (90%). This measures ownership moved out of the coordinator,
not code deleted from the app. It retains feature assembly, map boot/disposal, pane/layer allocation, movement and
message routing, auth-recovery coordination, and the small location/debug overlays. Further extraction needs a useful
responsibility boundary; a smaller line count alone is not a reason to split it again.

## Validation And Known Limits

The completed cleanup passed 112 core and 405 app tests, lint/typechecks including workbench sources, CSS lint,
workbench build, and Chrome/Firefox packaging on 2026-10-20. The user accepted the combined UI and runtime smoke tests;
no separate exhaustive browser, keyboard, or narrow-layout audit is claimed.

Production dependency audit had zero findings at that checkpoint. The full audit reported seven high-severity entries
tracing to one development-only `braces` advisory through Stylelint dependencies
([GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)). Recheck upstream availability before changing
that toolchain; avoid a forced major downgrade. Audit results are dated evidence, not a permanent guarantee.

Scrolling changes, further generic component consolidation, a global store, and arbitrary plugin compatibility remain
deferred. Start new work from a concrete requirement. Android login/persistence and manual injection passed a quick phone smoke; permanent auth/platform decisions remain
open; follow the [APK plan](plans/android-apk-installable-plan.md).
