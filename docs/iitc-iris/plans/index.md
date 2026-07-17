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

Status: complete. The first pass established stable, tested seams for the IITC-facing behavior we compare most often.

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

## Phase 1 Review

What we learned:

- Facades work best when they extract a narrow decision or transformation, not a whole feature. The successful slices
  moved parsing, planning, matching, state shaping, diagnostics, and bounded cache behavior into `packages/iitc-core`.
- Runtime ownership stayed clear. Fetch execution, AbortController cancellation, Leaflet rendering, DOM events,
  `window.postMessage`, stale-response guards, and React/Preact state remained in `apps/iitc-iris`.
- The useful boundary is usually a typed plan or state object. Examples include COMM request planning, portal-link
  navigation plans, map context payload plans, and active request diagnostics snapshots.
- Tests are most valuable when they lock extracted contracts, including surprising current behavior such as coordinate
  tolerance, request diagnostic rounding, and pending portal-selection shape.
- Symmetry matters, but exact symmetry is not always the right goal. Facades should share naming and responsibility
  levels, while still reflecting the real lifecycle of each domain.

Use another facade later only when at least one of these is true:

- The code maps directly to an IITC source file, plugin, endpoint, or named lifecycle concept.
- The behavior is pure enough to test without browser globals, Leaflet objects, DOM nodes, timers, or fetch.
- The extraction gives parity work a clearer comparison point or removes duplicated request/state/diagnostic shaping.
- A larger refactor would otherwise have to understand an unstable app-runtime detail.

Do not create more facades just to reduce file size. If the next work is mostly JSX, local interaction state, or visual
composition, prefer an app-side component/module split.

Before starting Phase 2:

- Keep lint/typecheck/package validation clean after each slice.
- Run a root export review for `@iris/iitc-core` and stop exporting helpers that are purely internal when no app import
  or documented facade contract needs them.
- Keep each Phase 2 PR scoped to one view, panel, or runtime lifecycle concern. Avoid mixing component extraction with
  behavior changes.
- Capture any live IITC comparison notes in the relevant facade plan before changing behavior built on top of it.

## Phase 2: App Surface Extraction

Goal: reduce the size and coupling of `apps/iitc-iris/src/content.tsx` without changing behavior. Phase 1 made this
safer by moving the main parity-sensitive behavior behind tested core facades.

Order of work:

1. Content shell split: extract top-level view state helpers and message-handling adapters from `content.tsx` while
   keeping rendered markup unchanged.
2. Panel extraction: move COMM, inventory, missions, portal details, search, Draw Tools, and diagnostics panels into
   focused app modules one at a time.
3. Shared app hooks/helpers: extract reusable clipboard/status timeout, sheet/menu, keyboard shortcut, and map command
   helpers only after at least two panels need the same behavior.
4. Runtime message adapters: introduce small app-side adapters for message posting/handling where repeated message
   assembly remains in `content.tsx`. Keep these adapters separate from core facades.

Non-goals for Phase 2:

- Do not introduce a global store.
- Do not redesign the UI while extracting modules.
- Do not move browser effects into `packages/iitc-core`.
- Do not change facade contracts unless a focused parity bug requires it.

## Later Refactors

These tracks are intentionally later. They can be planned, but implementation should wait until Phase 2 has made the app
surface smaller and easier to reason about.

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
