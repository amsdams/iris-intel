# IITC IRIS Refactoring Roadmap

## Current State

Status: Phase 2 app-surface extraction, source layout, CSS Tracks A–C, follow-ups A–H, and component CSS ownership are complete/accepted.
The current CSS/component architecture contract and progress are in
[plan 37](css-refactoring/37-component-simplification-review.md). Component/caller review and the combined A–C implementation
are complete and smoke accepted: shared exports reduced from 23 to 20. Both subsequent styling-contract and CSS cleanup
batches are complete with passing automated checks and user acceptance.
The shared Button follow-up is also user accepted (21 exports); all 360 tests and required checks pass.
The Table/segmented/domain ownership batch and subsequent Inventory/panel organization follow-ups are implemented and
user accepted (22 shared UI exports). The content composition pass is complete: Search, Layers, Missions, and location
controls own their feature workflows; the user reported the combined smoke test passed on 2026-10-20.
Latest app checks: 391 tests, lint/typecheck, and Chrome/Firefox packaging pass; CSS lint and workbench build also passed
for the preceding organization batch. The earlier shared-domain-helper move preserved emitted JavaScript/CSS byte-for-byte.
Current handoff is in [plan 37](css-refactoring/37-component-simplification-review.md);
source grouping is recorded in [the source layout record](source-directory-layout-plan.md).
Android APK work is a separate readiness track, not a continuation of the refactor plans.
Repository cleanup is complete: only `apps/iitc-iris` and `packages/iitc-core` remain. Required images/notices and retained
  samples have active owners; clean installation, checks, workbench build, and extension packaging pass without references.

Do not assign any other refactor work unless a detailed plan names exact scope, files, stop conditions, and validation.

Likely next priorities:

1. CSS/component cleanup and the content composition pass are complete and user smoke accepted; no further batch is queued.
2. Harden the repository and runtime before APK work: reproducible builds, platform boundaries, and lifecycle ownership
   (scope below). This preparation does not depend on finding new usability issues; scrolling remains deferred.
3. Prepare for a friend-shared sideload APK, with Play/store distribution deferred.
4. Run the Android/WebView readiness spikes before creating an IRIS APK scaffold.
5. UI/CSS/mobile polish for concrete findings.
6. Backlog refinement if usage shows priorities have changed.

Do not mix refactor cleanup, UI/mobile polish, Android APK work, and feature/parity work in one branch.

## Active Work

- Repository cleanup is complete, following user approval to delete superseded code and retain its Git history.
  No implementation slice is active; platform-boundary and runtime-lifecycle hardening remain the next preparation work.
  The content composition pass is complete with passing automated checks and user smoke acceptance.
  [Plan 37](css-refactoring/37-component-simplification-review.md) records the architecture contract and handoff.

## content.tsx Composition Review

Reviewed 2026-10-20: all 1,281 lines of `src/content.tsx`, the command callbacks and message adapter, existing feature
workflows, and relevant Search/COMM/layer helpers and tests. Goal: clearer domain ownership while keeping app assembly
readable. The initial review was source-only; the user subsequently approved implementing Search and Layers together.

| Responsibility | Decision | Reason |
| --- | --- | --- |
| Search state, callbacks, debounce, selection reset, and preview effects | Implemented in `map/search/workflow.ts` | Feature owns its state and commands; app supplies messaging/navigation and routes responses. |
| Layer/highlighter state, intent refs, persistence, and message effects | Implemented in `map/layers/workflow.ts` | Feature owns settings and synchronization; app supplies messaging and still wires page-ready synchronization and diagnostics. |
| COMM state, refs, older-message retention, and new-message indicators | Keep for now | Has a real feature boundary, but involves animation-frame/scroll behavior and request retries. Revisit only for a concrete COMM change; scrolling remains deferred. |
| Shared page-message bridge, camera/entity state, auth retry, navigation, and keyboard listener | Keep in app composition | Coordinates several domains; moving it would mostly replace explicit wiring with a large dependency object. |
| Draw Tools, Portal Analysis, and Scenarios | Keep existing workflows | Already own focused feature behavior; their invocation and prop wiring belong in the app. |
| Panel JSX, defaults, bootstrap, remount, and login bypass | Keep | Existing panels already own rendering internals. A broad app hook, shell wrapper, or defaults-only extraction would add indirection. |

Implemented 2026-10-20 as one combined batch:

- Added the two domain workflows; moved seven Search commands and their 26 existing tests into `map/search/commands.*`.
  Removed the corresponding app-owned state, callbacks, effects, and imports. `content.tsx` is now 1,191 lines.
- Explicit `useSearchEffects` and `useLayerSettingsEffects` calls retain their original positions relative to the page
  listener and other app effects. Source comparison confirmed all 17 effects retain their relative registration order,
  all seven moved command bodies are unchanged, and app JSX is unchanged. No CSS or message contract changed.
- Added six real Preact lifecycle tests for Search debounce/cancellation, selection/preview/navigation, and Layers
  persistence and intent timestamps. All 388 tests, lint/typecheck, Chrome/Firefox packaging, and `git diff --check` pass.
- Combined smoke scope: Search typing/clearing, arrow/Enter/Shift+Enter selection, map preview, map-focus navigation,
  closing/reopening, and auth retry; Display overlays, highlighter/base selection, and saved settings after reload.

Final composition batch, implemented 2026-10-20 (user requested a combined smoke test at the end):

- Move Missions state, refresh/details/zoom actions, and the portal-following effect into `map/missions/workflow.ts`.
  Remove the three redundant command wrappers and cover their payloads through the workflow tests; keep sheet navigation
  and selected-portal assembly in the app. Register the effect at its original position.
- Move view input, location status, and their three actions into `map/location-workflow.ts`, reusing `location-actions.ts`
  unchanged. Preserve browser geolocation, status timers, and zoom behavior; camera state remains app-owned.
- Stop after these feature boundaries: no generic store, new message listener, COMM/scroll changes, or JSX/CSS changes.
  Validate real workflow state/effects, existing action/message tests, full app checks, packaging, and source comparison.
  Smoke Search, Display, Missions, and location controls together at the end, as requested by the user.

Validation: seven new lifecycle tests replace four command-wrapper tests, bringing the suite to 391 passing tests.
Lint/typecheck, Chrome/Firefox packaging, and `git diff --check` pass. Source comparison confirms unchanged app JSX,
bootstrap, effect order, and equivalent Missions refresh-effect behavior. `content.tsx` is now 1,141 lines.

The composition pass is complete. Shared app coordination and COMM remain in place; scrolling remains deferred.
Combined smoke scope: Search and Display checks above; Missions view/portal switching, changing the selected portal
while Missions is open, mission details/zoom and auth retry; location preset/input jumps and browser location success/denial.
The user reported smoke testing passed on 2026-10-20; no separate agent-run browser audit or per-item results are recorded.

## Before APK: Repository And Runtime Hardening

User clarified the goal on 2026-10-20: a clean repository and solid application before attempting an APK.
Initial source scan: 137 production app modules, no relative runtime import cycles, no shared-UI imports outside `ui/`,
and no browser/Leaflet/Preact references found in production `iitc-core` sources. This is not a full runtime audit.

Recommended next implementation scope:

- Reproducible, self-contained builds (complete): the root lockfile is included, CI uses Node 24 and
  `npm ci`, and required images plus notices are bundled under `apps/iitc-iris/assets/`. Samples moved unchanged into
  `docs/iitc-iris/fixtures/`. The three absent diagnostics captures and their choices were subsequently retired;
  saved fixture selections fall back to Live, and packaging removes old generated fixture output without creating fallbacks.
  Removed `apps/{iris,mini-iris}`, `packages/{core,plugin-sdk,plugins}`, their obsolete docs, and their tooling entries.
  Validation: a separate source copy with no existing dependencies or reference checkout passed `npm ci`, both workspace
  checks (112 core + 391 app tests), CSS lint, and packaging. Root test discovery also passes all 503 tests, and the
  workbench builds. Both extension payloads include exact images/notices; missing required images fail explicitly.
  Version tooling synchronizes root/app/manifest/lockfile versions; verified in isolation without creating a tag.
  Git baseline before removal: `aae62a6e896ab30aa4608562af05d4e16b0614bb` (retrieval noted in the root README).
- Dependency/deprecation review (2026-10-20): refreshed compatible direct/transitive dependencies, including Preact
  10.29.8, Vite 6.4.4, Vitest 4.1.12, Stylelint 17.16, and TypeScript ESLint 8.72; Node definitions now match Node 24.
  Upgraded ESLint to 10.13 and its native `defineConfig`, removing the unused JSX lint plugin (Hooks checks remain).
  Replaced 18 deprecated Preact attribute/event type aliases and enabled `@typescript-eslint/no-deprecated` as an error.
  The newer lint rules also removed redundant assignments and preserved original causes when wrapping request errors.
  No packages in the resulting lockfile are marked deprecated. This checks APIs annotated `@deprecated` in available
  type definitions; it is not an exhaustive browser/runtime compatibility audit.
  Validation: clean cached `npm ci`, both workspace checks (503 tests), CSS lint, workbench build, and Chrome/Firefox
  packaging pass. Production dependency audit: zero findings. Full audit: seven high-severity entries, all tracing to
  one unpatched development-only `braces` advisory through Stylelint's glob dependencies
  ([GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)). Recheck when an upstream fix is published;
  do not apply npm's proposed downgrade to Stylelint 7 or suppress the advisory. Current lint patterns are repository-owned.
  Preact 11, TypeScript 7, Vite 8, Vitest 5, and the newer Chrome type-definition line remain separate migration work;
  Vite 6.4 still receives security patches ([support policy](https://vite.dev/releases)). No browser smoke test requested.
- Platform boundaries: `map/missions-panel/missions-panel.tsx` calls `chrome.runtime.getURL` directly, while
  `shell/storage-settings.ts` has two guarded resolution paths. Consolidate asset resolution behind one clear owner;
  inventory injection, clipboard, geolocation, storage, and auth seams before choosing Android replacements.
- Runtime lifecycle: review ownership of requests, timers, DOM listeners, and Leaflet resources around map replacement.
  `page-map-runtime.ts` removes the previous map without one disposal owner; `map/map-context-runtime.ts` installs
  listeners and timers without returning cleanup. Prove remount/cancellation behavior with lifecycle tests before
  changing runtime boundaries. Extract cohesive responsibilities only when this improves ownership/testability.

Keep this separate from Android scaffolding and visual changes. Stop when a fresh checkout builds consistently,
platform assumptions have explicit owners, and the reviewed lifecycle paths have cleanup and meaningful tests.
The existing APK plan still governs later WebView auth/injection proofs; none has been performed by this source scan.

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
- Track A CSS pretty architecture consolidation: complete (`14-track-a-final-report.md`).
- Track B CSS component-local imports (named CSS migration): complete (`css-refactoring/24-track-b-closeout-report.md`).
- Track C CSS/component folder architecture: complete (`css-refactoring/34-track-c-final-audit.md`).
- Gate 0 and CSS architecture follow-ups A–H: complete with user smoke acceptance (`css-refactoring/35-css-architecture-followups.md`).
- Component CSS ownership: complete with user smoke acceptance; 10 central infrastructure imports (`css-refactoring/36-component-css-ownership-plan.md`).

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
- For future CSS architecture work, follow the currently approved detailed plan exactly. Do not use exploratory notes or completed closeout reports as approval to move CSS or files.
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

Current / Proposed:

- [css-refactoring/37-component-simplification-review.md](css-refactoring/37-component-simplification-review.md): Completed and user accepted: A–C, both cleanup batches, and shared Button; retained architecture contract.
- [css-pretty-architecture-plan.md](css-pretty-architecture-plan.md): Progress dashboard and historical CSS migration roadmap; use plan 37 for current architecture guidance.

Completed CSS Follow-Ups And Ownership:

- [css-refactoring/34-track-c-final-audit.md](css-refactoring/34-track-c-final-audit.md): Completed Track C audit.
- [css-refactoring/35-css-architecture-followups.md](css-refactoring/35-css-architecture-followups.md): Accepted Gate 0 and A–H cleanup record.
- [css-refactoring/36-component-css-ownership-plan.md](css-refactoring/36-component-css-ownership-plan.md): Accepted loading migration, ownership inventory, and validation record.

Completed Track C (Component Folder Layout And CSS Path Cleanup):

- [css-refactoring/25-track-c-component-colocation-plan.md](css-refactoring/25-track-c-component-colocation-plan.md): Track C source-layout plan.
- [css-refactoring/26-track-c-group-a-implementation.md](css-refactoring/26-track-c-group-a-implementation.md): Group A UI primitive co-location.
- [css-refactoring/27-track-c-group-b-segmented-controls.md](css-refactoring/27-track-c-group-b-segmented-controls.md): Group B segmented controls.
- [css-refactoring/28-track-c-group-c-ui-helpers.md](css-refactoring/28-track-c-group-c-ui-helpers.md): Group C UI helper co-location.
- [css-refactoring/29-track-c-group-d-remaining-ui-components.md](css-refactoring/29-track-c-group-d-remaining-ui-components.md): Group D remaining UI components.
- [css-refactoring/30-track-c-group-e-ui-css-path-cleanup.md](css-refactoring/30-track-c-group-e-ui-css-path-cleanup.md): Group E UI CSS path cleanup.
- [css-refactoring/31-track-c-group-f-small-domain-css-path-cleanup.md](css-refactoring/31-track-c-group-f-small-domain-css-path-cleanup.md): Group F small-domain CSS path cleanup.
- [css-refactoring/32-track-c-group-g-map-css-path-cleanup.md](css-refactoring/32-track-c-group-g-map-css-path-cleanup.md): Group G map CSS path cleanup.
- [css-refactoring/33-track-c-group-h-portals-css-path-cleanup.md](css-refactoring/33-track-c-group-h-portals-css-path-cleanup.md): Group H portals CSS path cleanup.

Completed Track B (Named CSS Component-Local Imports):

- [css-refactoring/23-track-b-final-named-css-audit.md](css-refactoring/23-track-b-final-named-css-audit.md): Final classification and retention audit for all remaining central named CSS.
- [css-refactoring/24-track-b-closeout-report.md](css-refactoring/24-track-b-closeout-report.md): Track B closeout report marking named-CSS component-local import migration complete.

Ready/Blocked:

- [android-apk-installable-plan.md](android-apk-installable-plan.md): Prove the friend-shared sideload APK path before
  scaffolding native app code; store distribution is deferred.
- [source-directory-layout-plan.md](source-directory-layout-plan.md): All Checkpoints (1 through 12) are completely done.

Superseded/Historical:

- [ui-system-consolidation-plan.md](ui-system-consolidation-plan.md): Parked after Assignment 4; do not continue this
  consolidation track unless it is reopened with a new user-approved scope.
- [css-ownership.md](css-ownership.md): Exploratory draft only. It is not an approved ownership map and must not be used
  as a migration contract.
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
