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

Latest working slice:

- Native context action registry for existing map, link, and field long-press/right-click actions. This directly supports
  the backlog's `Long-press/right-click context` and `Context actions` partial items, and the port plan's registry/facade
  foundation entry.
- Small local selection lifecycle facade for selected portal/link/field view derivation and content-side context selection
  effects. This is the first lifecycle-facade slice needed before splitting selected-object UI out of `content.tsx`.
- Both pieces stay app-local. Do not introduce arbitrary plugin context menus, public hooks, or external plugin setup yet.

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

### Context Action Registry

Status: started / first slice implemented.

- `apps/iitc-iris/src/context-action-registry.ts` describes current map, link, and field context targets plus current copy
  and center actions.
- The content UI now reads context panel labels, object labels, distance labels, action labels, titles, and action
  visibility from this registry.
- This registry exists to make current long-press/right-click behavior easier to extract from `content.tsx`. It is not a
  plugin context-menu API yet.
- `apps/iitc-iris/src/context-action-registry.test.ts` locks current target order, action order, labels, and target/action
  visibility.

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

- Context action registry is now the active focused slice because current map, link, and field context labels/actions are
  still embedded in `content.tsx`, and the backlog tracks long-press/right-click context actions as partial.
- Keep lifecycle hooks/facades local and minimal until a specific native subsystem needs them.

Recommended next slice after context actions:

- Selection lifecycle facade is now covered by the following checkpoint.
- Do not expose public `window.addHook` / `window.runHooks` or a broad plugin setup sequence as part of that step.

### Progress Checkpoint - 2026-06-28 18:25 UTC

Implemented the fourth internal registry/facade slice:

- New context action registry now removes duplicated map/link/field context target and action metadata from `content.tsx`.
- New selection lifecycle facade now centralizes content-side selected portal/link/field view derivation plus portal/context
  selection effects.
- Current user-facing selected-object behavior is unchanged: portal context opens Portal details, link/field context opens
  the corresponding Selected details sheet, and plain map context stays in Controls.
- Deferred/reference plugins did not shape these APIs.

Validation:

- `npm run test -w apps/iitc-iris -- --run src/selection-lifecycle.test.ts src/context-action-registry.test.ts src/portal-detail-section-registry.test.ts src/menu-registry.test.ts src/highlighter-registry.test.ts src/layer-registry.test.ts`
- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris` passed with existing warnings only.
- `npm run package:iitc-iris` passed with existing missing-fixture fallback warnings.
- `git diff --check`

Latest package artifacts from this checkpoint:

- `apps/iitc-iris/builds/iitc-iris-chrome-0.1.0-2026-06-28T18-25-41.zip`
- `apps/iitc-iris/builds/iitc-iris-firefox-0.1.0-2026-06-28T18-25-41.xpi`

Recommended next slice:

- Stop adding registries for now unless a concrete extraction needs one. The useful next implementation step is a narrow
  selected-object UI extraction that consumes `selection-lifecycle.ts`, `menu-registry.ts`, `portal-detail-section-registry.ts`,
  and `context-action-registry.ts`.
- Keep lifecycle hooks/facades local and minimal until another native subsystem needs them.

### Future Internal Registries

Add only when current implementation needs them for refactor pressure:

- Request/status registry for panel request categories if it simplifies auth/cancellation UI.

## Phase 2: Lifecycle Facades For Refactor

Use lifecycle facades to decouple native modules after registries are stable enough:

- Selection: first local facade is implemented in `apps/iitc-iris/src/selection-lifecycle.ts`; use it as the boundary when
  splitting selected-object UI.
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
