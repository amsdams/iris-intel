# IITC IRIS Refactoring Roadmap

## Guiding Principle

Parity first, function over form. Refactoring follows the sequence in
[backlog.md](../backlog.md), with the porting rules in [port-plan.md](../port-plan.md) as the mandatory process. Add
thin, IITC-named facades for concrete parity work before introducing broad architecture such as a global store, general
event bus, or universal entity model.

Every detailed plan must identify IITC-CE source files under `reference/ingress-intel-total-conversion`, current IRIS
implementation files, public IITC names/API concepts, ownership and lifecycle behavior, hook/plugin visibility,
tests/diagnostics, intentional divergences, and validation commands.

The current facade extraction pattern is documented in [facade-pattern.md](facade-pattern.md).

## Phase 1: Narrow IITC Parity Facades

This phase creates small, behavior-preserving landing zones for code that is compared against IITC often. Each facade
should keep IITC naming at the boundary and move only pure, stable logic first.

1. `comm` facade: parsing/display model, `getPlexts` request lifecycle, channel behavior, de-duplication diagnostics.
   See [comm-facade-plan.md](comm-facade-plan.md).
2. `portalDetails` facade: portal detail request state, cached/loading/ready/error behavior, selected portal cancellation.
   See [portal-details-facade-plan.md](portal-details-facade-plan.md).
3. `search` facade: result ordering/grouping, coordinate/address/portal normalization, preview geometry.
   See [search-facade-plan.md](search-facade-plan.md).
4. `mapDataRequest` facade: only IITC `map_data_request` parity around request planning, retry sieve behavior,
   stale-cache retry exhaustion diagnostics, and excessive retry watch items already tracked in `packages/iitc-core`.
   See [map-data-request-facade-plan.md](map-data-request-facade-plan.md).
5. `playerTracker` facade: COMM-derived player positions, refresh/cancellation policy, and map link behavior.
   See [player-tracker-facade-plan.md](player-tracker-facade-plan.md).
6. Portal-link navigation facade: `zoomToAndShowPortal`, `selectPortalByLatLng`, pending selection resolution.
   See [portal-link-navigation-facade-plan.md](portal-link-navigation-facade-plan.md).
7. Context action facade: long-press/right-click handling for portals, links, fields, and plain map actions.
   See [context-action-facade-plan.md](context-action-facade-plan.md).
8. Request diagnostics facade: copied timing/cancellation/status diagnostics used by live IITC comparisons.
   See [request-diagnostics-facade-plan.md](request-diagnostics-facade-plan.md).

## Deferred Refactors

These tracks are intentionally later. They can be planned, but implementation should wait until the Phase 1 facades have
created stable boundaries and tests.

- Content view extraction: split `apps/iitc-iris/src/content.tsx` incrementally and behavior-preserving, after its
  dependencies are behind narrow facades.
- Draw Tools refactoring: extract only within the existing Draw Tools v1 boundaries unless the pass explicitly ports
  more IITC Draw Tools behavior.
- Map lifecycle/state cleanup: adjust or extract only around validated IITC `map_data_request` behavior and documented
  watch items; avoid a general all-data-flow rewrite.
- Entity abstraction and global store: revisit only after repeated concrete patterns from IITC-named facades justify the
  scope.

## Detailed Plan Template

Each new plan file under this directory should use this structure:

- IITC sources: exact files/functions/plugins in `reference/ingress-intel-total-conversion`.
- Current IRIS sources: exact files/modules being changed.
- Public concepts: IITC file/module names, function names, endpoint names, data fields, UI names, and lifecycle events.
- Ownership/lifecycle: who owns state, when it is created/disposed, mutation path, cancellation behavior.
- Hook/plugin visibility: whether IITC exposes this behavior to hooks or plugins, and what IITC IRIS will expose now.
- Scope: behavior being ported or extracted in this pass, plus explicit non-goals.
- Tests/diagnostics: unit tests, fixture/live comparisons, copied diagnostics, click-to-pixels timing where relevant.
- Divergences: reason, expected effect, and how to compare against IITC-CE.
- Validation: focused tests, typecheck/lint as appropriate, `git diff --check`, and `npm run package:iitc-iris` for code
  changes.
