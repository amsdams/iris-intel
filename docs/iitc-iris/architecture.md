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

`content.tsx` assembles the app, bridges page messages, and coordinates shared camera/entity/auth/navigation state.
Search, Layers, Missions, and location controls own their feature workflows. Their effect calls retain deliberate
registration order. COMM state and scroll/request coordination remain in app composition; revisit them for a concrete
COMM change. Draw Tools and Portal Analysis retain their existing workflows. Avoid a broad app hook or global store
that hides this wiring.

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
| Clipboard | `shell/feedback.ts`; the feedback helper already accepts an injected copy operation. Keep that seam for a future Android implementation. |
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

`map/entities/map-renderer.ts` owns portal/link/field layers, visibility filters, incremental synchronization,
highlighter style refresh, portal overlays and render diagnostics. `map/map-layers.ts` names the shared layer/pane types;
map creation still owns their allocation. Selection and portal details have their own owners below.
Renderer callbacks read the current state; disposal invalidates its render context and map-keyed resources stay separate.
`map/map-request.ts` owns map refresh generations, tile/cache/refill/render queues, fixture/live fetching, artifact
injection and map-request diagnostics. The existing pure planning, decoding and queue/cache algorithms stay in
`packages/iitc-core`. Movement and map disposal explicitly notify this page-owned controller; tile cache survives map
replacement while pending work and request identity are invalidated. `intel/intel-request.ts` holds shared page-context
CSRF/version/auth helpers, lifetime-bound endpoint transport and the shared JSON endpoint helper for panel requests.

`map/missions/missions-runtime.ts` owns mission list/detail requests, status, persistent caches and cancellation,
using `mission-overlay.ts` for geometry/navigation. `map/player-tracker/player-tracker-runtime.ts` owns player history/deduplication,
marker/trace rendering, grouped popups and refresh scheduling/cancellation. Shared COMM channel data is owned by `comm/comm-runtime.ts`; authenticated
transport is supplied by the page coordinator. Both feature instances survive map replacement: mission caches/player history
remain available while old requests, timers and markers are cleared.

`map/scores/scores-runtime.ts`, `agent/passcode/passcode-runtime.ts` and `agent/inventory/inventory-runtime.ts` own their request state,
response-to-UI adaptation and cancellation. Inventory also owns the shared subscription request and summary/key counts;
Agent Profile reads its subscription state, and map rendering reads key counts through explicit callbacks. Panel
cancellation leaves subscription work running; map disposal cancels it and resets a loading subscription to unknown.
Completed inventory/subscription state remains available across map replacement. Keep feature behavior in these modules
and composition in `page-map-runtime.ts`; no generic plugin/controller framework is required.

`comm/comm-runtime.ts` owns channel buffers, status/preview conversion, fetch/send requests and fetch cancellation.
Player Tracker polls through its explicit public-channel request/response seam, sharing the same buffer without
publishing panel status. Public panel refreshes still update Player Tracker. Channel buffers survive map replacement;
fetch cancellation and map-lifetime send guards retain their existing behavior. UI COMM state/scroll coordination
in `content.tsx` remains a separate concern.

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
