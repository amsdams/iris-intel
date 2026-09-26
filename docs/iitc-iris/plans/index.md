# IITC IRIS Refactoring Roadmap

## Current State

Status: Phase 2 app-surface extraction is complete/parked. Continue only with optional move-only source layout
checkpoints, one domain at a time. UI/CSS/mobile polish comes after the app has been used for a while and concrete usage
pain is known.

No active refactor is approved right now. Before assigning AGY/Codex more refactor work, update or create one detailed
plan with exact scope, files, stop conditions, and validation.

Likely next priorities:

1. Move-only source layout, one feature folder at a time.
2. Use the app on phone/desktop and collect concrete UI/CSS/mobile pain.
3. UI/CSS/mobile polish for those findings.
4. Backlog refinement if usage shows priorities have changed.

Do not mix these three tracks in one branch.

## Active Work

None.

## Recently Completed

- Phase 1 IITC parity facades: complete.
- Phase 2 command callback extraction: complete.
- Phase 2 content shell extraction: complete.
- Phase 2 side-panel extraction: complete.
- Phase 2 runtime-effects extraction: complete.
- Phase 2 closure audit: complete; decision was to stop extracting from `content.tsx` for now.
- Source layout Checkpoint 1: complete; `search` files moved into `apps/iitc-iris/src/search/`.
- Source layout Checkpoint 2: complete; `missions` files moved into `apps/iitc-iris/src/missions/`.
- Source layout Checkpoint 3: complete; `COMM` files moved into `apps/iitc-iris/src/comm/`.
- Source layout Checkpoint 4: complete; `Draw Tools` files moved into `apps/iitc-iris/src/draw-tools/`.
- Source layout Checkpoint 5: complete; `Portal Analysis` files moved into `apps/iitc-iris/src/portal-analysis/`.
- Source layout Checkpoint 6: complete; `Portals` files moved into `apps/iitc-iris/src/portals/`.
- Source layout Checkpoint 7: complete; `Layers` files moved into `apps/iitc-iris/src/layers/`.
- Source layout Checkpoint 8: complete; `Map` files moved into `apps/iitc-iris/src/map/`.

## Next Rules

- Do not continue extracting from `content.tsx` unless a new detailed plan identifies a narrow, repeated, testable
  responsibility with a clear owner.
- Do not start another source-layout move until [source-directory-layout-plan.md](source-directory-layout-plan.md)
  names one approved folder and exact files.
- Do not mix layout moves with logic changes, UI changes, CSS changes, behavior changes, or additional folders.
- UI/CSS polish should be driven by app usage findings, screenshots, or specific workflow pain, not general cleanup.
- Feature or parity work should start from [../backlog.md](../backlog.md) and [../port-plan.md](../port-plan.md), then a
  fresh detailed plan if the work is non-trivial.

## AI Agent Working Rules

These rules apply to Codex, AGY/Gemini, and any other AI-assisted branch.

- Read this roadmap first. Read [../port-plan.md](../port-plan.md) for behavior/parity work. Read only the relevant
  detailed plan for the current assignment.
- If this file says there is no active work, do not improvise a refactor. Ask for or create a detailed plan first.
- Treat app-surface refactors as behavior-preserving by default. Do not rename persisted ids, message types, public panel
  ids, storage keys, user-facing labels, or IITC-aligned concepts unless the plan explicitly marks a divergence.
- Compare AGY review work against the current baseline branch and record behavior differences as bugs unless a plan
  documents them.
- Keep ownership boundaries visible: `content.tsx` owns top-level state, refs, browser/page-runtime effects, storage
  effects, request lifecycle triggers, stale-response guards, mount/bootstrap behavior, and final app composition unless
  a detailed plan says otherwise.
- Do not move browser, Preact, DOM, Leaflet, or extension runtime dependencies into `packages/iitc-core` during an app
  extraction pass.
- Tests must protect externally visible behavior: message payloads, storage compatibility, callback routing,
  lifecycle/status transitions, sorting/filtering, diagnostics, and user-visible fallback behavior.
- Every code-changing slice must finish with focused tests for touched modules, then `npm run typecheck:iitc-iris`,
  `npm run lint:iitc-iris`, `npm run package:iitc-iris`, and `git diff --check`.

## Detailed Plans

Active:

- None.

Ready/Blocked:

- [source-directory-layout-plan.md](source-directory-layout-plan.md): Checkpoints 1 through 8 are done.
  Checkpoint 9 `System` is ready as the next move-only checkpoint.

Completed Phase 2:

- [content-command-callbacks-extraction-plan.md](content-command-callbacks-extraction-plan.md)
- [content-shell-extraction-plan.md](content-shell-extraction-plan.md)
- [panel-extraction-plan.md](panel-extraction-plan.md)
- [content-runtime-effects-extraction-plan.md](content-runtime-effects-extraction-plan.md)
- [content-phase2-closure-audit-plan.md](content-phase2-closure-audit-plan.md)
- [agy-branch-structured-audit-plan.md](agy-branch-structured-audit-plan.md)

Completed Phase 1 Facades:

- [comm-facade-plan.md](comm-facade-plan.md)
- [portal-details-facade-plan.md](portal-details-facade-plan.md)
- [search-facade-plan.md](search-facade-plan.md)
- [map-data-request-facade-plan.md](map-data-request-facade-plan.md)
- [player-tracker-facade-plan.md](player-tracker-facade-plan.md)
- [portal-link-navigation-facade-plan.md](portal-link-navigation-facade-plan.md)
- [context-action-facade-plan.md](context-action-facade-plan.md)
- [request-diagnostics-facade-plan.md](request-diagnostics-facade-plan.md)

Reference:

- [facade-pattern.md](facade-pattern.md)

## Later Tracks

- Move-only source layout: continue only one domain at a time after explicit approval in
  [source-directory-layout-plan.md](source-directory-layout-plan.md). `Layers` is the next preferred candidate.
- UI/CSS/mobile polish: do after app usage. Scope by concrete findings, not broad restyling.
- Draw Tools refactoring: stay within Draw Tools v1 boundaries unless a pass explicitly ports more IITC Draw Tools
  behavior.
- Map lifecycle/state cleanup: only around validated IITC `map_data_request` behavior and documented watch items.
- Entity abstraction/global store: deferred until repeated concrete patterns justify it.

## Detailed Plan Template

Each new plan file under this directory should include:

- IITC sources: exact files/functions/plugins in `reference/ingress-intel-total-conversion`.
- Current IRIS sources: exact files/modules being changed.
- Public concepts: IITC file/module names, function names, endpoint names, data fields, UI names, and lifecycle events.
- Ownership/lifecycle: who owns state, when it is created/disposed, mutation path, cancellation behavior.
- Hook/plugin visibility: whether IITC exposes this behavior to hooks/plugins, and what IITC IRIS will expose now.
- Scope: behavior being ported or extracted in this pass, plus explicit non-goals.
- Tests/diagnostics: unit tests, fixture/live comparisons, copied diagnostics, click-to-pixels timing where relevant.
- Divergences: reason, expected effect, and how to compare against IITC-CE.
- Validation: focused tests, typecheck/lint as appropriate, `git diff --check`, and `npm run package:iitc-iris` for code
  changes.
