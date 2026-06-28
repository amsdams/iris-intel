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

### Progress Checkpoint - 2026-06-28

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

- Add a menu/sheet or portal-detail-section registry only if it directly helps extract a focused component from
  `content.tsx`.
- Keep lifecycle hooks/facades local and minimal until a specific native subsystem needs them.

### Future Internal Registries

Add only when current implementation needs them for refactor pressure:

- Menu/sheet registry for current Map, Agent, COMM, System, Selected, Portal, Link, and Field entries.
- Context action registry for current map, portal, link, and field long-press/right-click actions.
- Portal detail section registry for current details, keys, history, missions, and copy/export sections.
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
