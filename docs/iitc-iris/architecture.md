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

Base maps stay under Leaflet ownership. `map/base-layers.ts` creates OSM raster tiles or an OpenFreeMap
Dark/Positron vector layer through MapLibre’s Leaflet binding. Leaflet owns gestures, overlays, and layer removal;
the binding disposes its WebGL map when removed. The standalone MapLibre worker is bundled in XPI/ZIP/APK,
with a narrow Android asset route. Saved CARTO preferences migrate to OpenFreeMap; OSM preferences stay unchanged.
See the [OpenFreeMap integration guide](https://openfreemap.org/quick_start/).

## Source Organization And Composition

Group app features by menu/domain: `map/`, `portals/`, `agent/`, `comm/`, and `system/`; keep application coordination
in `shell/` and reusable primitives in `ui/`. A rendered panel has an explicit entry point in its component folder.
Shared domain logic belongs outside panel folders, such as `map/search/`, `map/layers/`, and `map/missions/`.
Do not create a component or directory solely to satisfy a uniform file count.

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
Cascade-sensitive styles stay centrally ordered where necessary. Preserve appearance, behavior, and cascade order when
changing ownership. The component workbench (`npm run dev:wb`) uses automatic discovery and generic previews.

Shared Button owns native attributes, the non-submitting default type, and the common reset; visual button families
compose it. Table supplies native table/container composition without domain behavior. SummaryCell exposes supported
custom properties instead of requiring callers to target its inner markup. Native HTML remains appropriate when a
shared component would add no useful contract. Inventory uses separate rarity/level badges, type labels, and item counts.

## Browser And Runtime Ownership

| Boundary | Current owner / decision |
| --- | --- |
| Bundled asset URLs | `platform/assets.ts`; shared by UI callers, using extension URLs or an explicit host-provided asset base. Android serves bundled assets under a reserved Intel HTTPS path. The injected page runtime derives its own asset base from its script URL because it runs outside the extension context. |
| Clipboard | `shell/feedback.ts`; the feedback helper already accepts an injected copy operation. Keep that seam for a future Android implementation. |
| Geolocation | `map/location-workflow.ts` supplies browser capability to `map/location-actions.ts`; the action already accepts an injected position callback. |
| Storage | `shell/storage-settings.ts` owns UI preference keys; the page runtime owns map/domain caches and IITC-compatible settings. Preserve these separate lifetimes and persisted formats. |
| Injection, auth, transport | `content.tsx` injects the page script and bridges messages. The page runtime reads Intel cookies/version and performs authenticated requests. Keep those page-context assumptions explicit for the Android spike. |

`map/map-runtime-lifetime.ts` owns map fetch cancellation, timers, and animation callbacks. Map replacement and direct
Leaflet removal share idempotent disposal. Custom gestures remove listeners and pending callbacks. Generation and
ownership guards stop old responses or completions from mutating replacement state. Page-level message/container-ready
listeners intentionally survive map replacement. This is a focused lifetime boundary, not a claim that every effect
or browser lifecycle has been audited.

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
