# IITC IRIS Refactoring Roadmap

## Current State

Status: Phase 2 app-surface extraction, source layout, and the current UI component extraction pass are complete/parked.
Do not assign more refactor work unless a detailed plan names exact scope, files, stop conditions, and validation.
Android APK work is a separate readiness track, not a continuation of the refactor plans.

No active refactor is approved right now. Before assigning AGY/Codex more refactor work, update or create one detailed
plan with exact scope, files, stop conditions, and validation.

Likely next priorities:

1. Use the app on phone/desktop and collect concrete UI/CSS/mobile pain.
2. Prepare for a friend-shared sideload APK, with Play/store distribution deferred.
3. Run the Android/WebView readiness spikes before creating an IRIS APK scaffold.
4. UI/CSS/mobile polish for concrete findings.
5. Backlog refinement if usage shows priorities have changed.

Do not mix refactor cleanup, UI/mobile polish, Android APK work, and feature/parity work in one branch.

## Active Work

None.

## Recently Completed

- Phase 1 IITC parity facades: complete.
- Phase 2 command callback extraction: complete.
- Phase 2 content shell extraction: complete.
- Phase 2 side-panel extraction: complete.
- Phase 2 runtime-effects extraction: complete.
- Phase 2 closure audit: complete; decision was to stop extracting from `content.tsx` for now.
- Typography and spacing consistency Checkpoint 1: complete; token baseline added and high-repeat CSS values migrated.
- Source layout Checkpoint 1: complete; `search` files moved into `apps/iitc-iris/src/search/`.
- Source layout Checkpoint 2: complete; `missions` files moved into `apps/iitc-iris/src/missions/`.
- Source layout Checkpoint 3: complete; `COMM` files moved into `apps/iitc-iris/src/comm/`.
- Source layout Checkpoint 4: complete; `Draw Tools` files moved into `apps/iitc-iris/src/draw-tools/`.
- Source layout Checkpoint 5: complete; `Portal Analysis` files moved into `apps/iitc-iris/src/portal-analysis/`.
- Source layout Checkpoint 6: complete; `Portals` files moved into `apps/iitc-iris/src/portals/`.
- Source layout Checkpoint 7: complete; `Layers` files moved into `apps/iitc-iris/src/layers/`.
- Source layout Checkpoint 8: complete; `Map` files moved into `apps/iitc-iris/src/map/`.
- Source layout Checkpoint 9: complete; `System` files moved into `apps/iitc-iris/src/system/`.
- Source layout Checkpoint 10: complete; `Auth` files moved into `apps/iitc-iris/src/auth/`.
- Source layout Checkpoint 11: complete; `Side Request Panel` files moved into `apps/iitc-iris/src/side-panels/`.
- Source layout Checkpoint 12: complete; `Shell And Shared App` files moved into `apps/iitc-iris/src/shell/`.

## Next Rules

- Do not continue extracting from `content.tsx` unless a new detailed plan identifies a narrow, repeated, testable
  responsibility with a clear owner.
- Do not start another source-layout move unless [source-directory-layout-plan.md](source-directory-layout-plan.md)
  is reopened with one approved folder and exact files.
- Do not start Android APK implementation until
  [android-apk-installable-plan.md](android-apk-installable-plan.md) completes the distribution decision and WebView
  runtime spikes.
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

- [ui-system-consolidation-plan.md](ui-system-consolidation-plan.md): Active source of truth for IITC IRIS UI/CSS consolidation.

Ready/Blocked:

- [android-apk-installable-plan.md](android-apk-installable-plan.md): Prove the friend-shared sideload APK path before
  scaffolding native app code; store distribution is deferred.
- [source-directory-layout-plan.md](source-directory-layout-plan.md): All Checkpoints (1 through 12) are completely done.

Superseded/Historical:

- [typography-spacing-consistency-plan.md](typography-spacing-consistency-plan.md): Superseded by `ui-system-consolidation-plan.md`.

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
- Android APK/installable app: follow [android-apk-installable-plan.md](android-apk-installable-plan.md); keep it
  separate from refactor cleanup.
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
