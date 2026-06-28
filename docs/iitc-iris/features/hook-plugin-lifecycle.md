# Internal Registry And Lifecycle Facades

Goal: establish thin IITC-shaped registries and lifecycle facades for current IITC IRIS features so UI and core refactors
have stable boundaries. This is not currently a push to support arbitrary external IITC plugins or to port more
reference plugins. External/plugin compatibility remains a possible later benefit.

## Current Intent

- Keep existing IITC IRIS behavior good enough while making it easier to split `content.tsx` and `page-map-runtime.ts`.
- Move current hard-coded feature lists and extension points behind typed registries where they already help implemented
  behavior.
- Use IITC names and concepts at the boundary when they make comparison easier, but keep the implementation app-local
  until a broader plugin runtime is justified.
- Let current implemented features use the registries first. Deferred/reference plugins should not drive the first
  registry contracts.

## Architecture

The foundation has three narrow pieces:

1. **Registries:** Typed metadata for existing highlighters, layers, menu/sheet actions, context actions, and portal
   detail sections.
2. **Lifecycle facades:** Small IITC-named functions/events for internal subsystem communication, such as
   `portalSelected`, `mapDataRefreshEnd`, `portalAdded`, `linkAdded`, and `fieldAdded`.
3. **Setup sequence:** A local lifecycle for native IITC IRIS feature setup. Do not expose a `window` plugin bridge until
   internal contracts are stable and a real use case needs it.

## Phase 1: Current Feature Registries

### Layer Registry

Status: started.

- `apps/iitc-iris/src/layer-registry.ts` describes existing boolean layer controls, defaults, UI groups, and diagnostics.
- Existing Display sheet and layer diagnostics already use this registry.
- Next useful step: move more runtime overlay/filter ownership metadata behind registry entries where it reduces
  duplicated routing logic.

### Portal Highlighter Registry

Status: started / first slice implemented.

- `apps/iitc-iris/src/highlighter-registry.ts` describes current highlighters: none, level color, needs recharge, and
  the explicit history highlighters.
- The content UI reads highlighter labels/titles from this registry.
- The page-map runtime reads highlighter style callbacks and level/health fill flags from this registry.
- This is intentionally a native registry, not `window.addPortalHighlighter` yet.
- `apps/iitc-iris/src/highlighter-registry.test.ts` locks the current ids, legacy normalization, level/health fill flags,
  and history color rule.

### Menu / Sheet Registry

Status: started / first slice implemented.

- `apps/iitc-iris/src/menu-registry.ts` describes current primary menus, sheet ids, side panels, selected-object sheet
  ownership, labels, titles, and shortcut labels.
- The content UI now reads stored-sheet validation, side-panel ids, primary-menu routing, and most primary/secondary tab
  rendering from this registry.
- COMM channel tabs and portal-mission sheet behavior remain component-local because they depend on live request state and
  mission source.
- This is intentionally a native registry, not a plugin menu API.
- `apps/iitc-iris/src/menu-registry.test.ts` locks current menu order, sheet ids, side-panel order, selected sheet
  ownership, and primary-menu ownership.

### Portal Detail Section Registry

Status: started / first slice implemented.

- `apps/iitc-iris/src/portal-detail-section-registry.ts` describes current selected portal detail sections: Mods,
  Resonators, and Facts.
- The content UI now reads portal detail section ids, labels, and default open state from this registry.
- Section body rendering remains in `content.tsx`; this slice only moves metadata needed for persisted open/closed state
  and detail-section wrappers.
- This is intentionally a native registry, not `window.addPortalDetail` or a reference-plugin section API.
- `apps/iitc-iris/src/portal-detail-section-registry.test.ts` locks current section ids, labels, default open state, and
  stored-id validation.

### Progress Checkpoint - 2026-06-28 15:21 UTC

Implemented the first internal registry/facade slice:

- Existing layer registry remains the source for layer defaults, Display grouping, and diagnostics.
- New portal highlighter registry now removes duplicated highlighter definitions from `content.tsx` and
  `page-map-runtime.ts`.
- Current user-facing highlighter behavior is unchanged; this is a boundary cleanup for later UI/core refactors.
- Deferred/reference plugins did not shape this API.

Validation:

- `npm run test -w apps/iitc-iris -- --run src/highlighter-registry.test.ts src/layer-registry.test.ts`
- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris` passed with existing warnings only.
- `npm run package:iitc-iris`
- `git diff --check`

Latest package artifacts from this checkpoint:

- `apps/iitc-iris/builds/iitc-iris-chrome-0.1.0-2026-06-28T15-21-40.zip`
- `apps/iitc-iris/builds/iitc-iris-firefox-0.1.0-2026-06-28T15-21-40.xpi`

Recommended next slice:

- Menu/sheet registry was the next focused registry slice because the current tabs and stored-sheet helpers duplicated
  sheet ownership metadata in `content.tsx`; this is now covered by the following checkpoint.
- Keep lifecycle hooks/facades local and minimal until a specific native subsystem needs them.

### Progress Checkpoint - 2026-06-28 16:09 UTC

Implemented the second internal registry/facade slice:

- New menu/sheet registry now removes duplicated primary-menu, sheet-id, side-panel, and selected-object tab metadata
  from `content.tsx`.
- Current user-facing menu behavior is unchanged; portal missions and COMM channel tabs remain explicitly wired where
  they depend on live component state.
- Deferred/reference plugins did not shape this API.

Validation:

- `npm run test -w apps/iitc-iris -- --run src/menu-registry.test.ts src/highlighter-registry.test.ts src/layer-registry.test.ts`
- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris` passed with existing warnings only.
- `npm run package:iitc-iris` passed with existing missing-fixture fallback warnings.
- `git diff --check`

Latest package artifacts from this checkpoint:

- `apps/iitc-iris/builds/iitc-iris-chrome-0.1.0-2026-06-28T16-09-18.zip`
- `apps/iitc-iris/builds/iitc-iris-firefox-0.1.0-2026-06-28T16-09-18.xpi`

Recommended next slice:

- Portal-detail-section registry was the next focused registry slice because selected portal details had persisted
  section metadata embedded in `content.tsx`; this is now covered by the following checkpoint.
- Keep lifecycle hooks/facades local and minimal until a specific native subsystem needs them.

### Progress Checkpoint - 2026-06-28 17:17 UTC

Implemented the third internal registry/facade slice:

- New portal detail section registry now removes duplicated selected portal detail section ids, labels, and default-open
  metadata from `content.tsx`.
- Current user-facing selected portal detail behavior is unchanged; Mods, Resonators, and Facts still render in place.
- Deferred/reference plugins did not shape this API.

Validation:

- `npm run test -w apps/iitc-iris -- --run src/portal-detail-section-registry.test.ts src/menu-registry.test.ts src/highlighter-registry.test.ts src/layer-registry.test.ts`
- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris` passed with existing warnings only.
- `npm run package:iitc-iris` passed with existing missing-fixture fallback warnings.
- `git diff --check`

Latest package artifacts from this checkpoint:

- `apps/iitc-iris/builds/iitc-iris-chrome-0.1.0-2026-06-28T17-17-44.zip`
- `apps/iitc-iris/builds/iitc-iris-firefox-0.1.0-2026-06-28T17-17-44.xpi`

Recommended next slice:

- Consider a context action registry only if it directly helps extract map, portal, link, and field long-press/right-click
  action handling from `content.tsx` or `page-map-runtime.ts`.
- Keep lifecycle hooks/facades local and minimal until a specific native subsystem needs them.

### Future Internal Registries

Add only when current implementation needs them for refactor pressure:

- Context action registry for current map, portal, link, and field long-press/right-click actions.
- Request/status registry for panel request categories if it simplifies auth/cancellation UI.

## Phase 2: Lifecycle Facades For Refactor

Use lifecycle facades to decouple native modules after registries are stable enough:

- Selection: route selected portal/link/field changes through a small lifecycle boundary before splitting selected-object
  UI.
- Rendering: expose internal `portalAdded`, `linkAdded`, and `fieldAdded` events only if Draw Tools, labels, or future
  overlays need them during extraction.
- UI: let extracted sheets subscribe to stable app state or lifecycle events instead of importing broad content-level
  state.

## Explicitly Deferred

- Broad `window.plugin.*` support.
- Public `window.addHook` / `window.runHooks` / `window.addPortalHighlighter` bridge.
- Porting arbitrary reference plugins.
- Treating `packages/plugins` as the design source for IITC IRIS before deciding whether those packages are legacy,
  reusable, or app-specific.

## IITC-CE Source References

- `reference/ingress-intel-total-conversion/core/code/hooks.js`
- `reference/ingress-intel-total-conversion/core/code/portal_highlighter.js`
- `reference/ingress-intel-total-conversion/core/code/portal_detail_display.js`
