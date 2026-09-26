# Content Phase 2 Closure Audit Plan

Status: complete. The audit closed Phase 2 app-surface extraction for now and approved the first move-only source layout
checkpoint in [source-directory-layout-plan.md](source-directory-layout-plan.md).

## IITC Sources

This audit is not a behavior port. IITC-CE files are required only as guardrails if the audit touches or recommends
follow-up work in an IITC-named domain:

- `reference/ingress-intel-total-conversion/code/comm.js`
- `reference/ingress-intel-total-conversion/code/portal_detail.js`
- `reference/ingress-intel-total-conversion/code/map_data_request.js`
- `reference/ingress-intel-total-conversion/plugins/draw-tools*`

Do not inspect unrelated IITC files for this audit unless a concrete remaining `content.tsx` responsibility maps to that
domain.

## Current IRIS Sources

- `apps/iitc-iris/src/content.tsx`
- Existing app modules extracted from `content.tsx`, including `content-*actions.ts`, `content-*workflow.ts`,
  `content-*panel*.tsx`, `*-panel.tsx`, and `*-container.tsx`.
- Completed detailed plans:
  - [content-command-callbacks-extraction-plan.md](content-command-callbacks-extraction-plan.md)
  - [content-shell-extraction-plan.md](content-shell-extraction-plan.md)
  - [panel-extraction-plan.md](panel-extraction-plan.md)
  - [content-runtime-effects-extraction-plan.md](content-runtime-effects-extraction-plan.md)
- Roadmap and doctrine:
  - [index.md](index.md)
  - [../port-plan.md](../port-plan.md)
  - [../backlog.md](../backlog.md)

## Public Concepts

- Existing content/page-runtime messages and `IITC_IRIS_MESSAGES` payloads.
- Existing sheet, side-panel, primary-menu, and selected-object ids.
- Existing storage keys and persisted settings.
- Existing app module names and IITC-aligned facade names.
- Existing user-facing labels, panel names, and diagnostics copied by users for live comparison.

## Ownership/Lifecycle

This is an audit and planning slice. `content.tsx` still owns Preact state, refs, effects, browser APIs, page-runtime
message posting, storage calls, request lifecycle triggers, stale guards, mount/bootstrap behavior, and the final app
composition. Existing helper modules own only the focused pure derivation, payload building, workflow state, action
routing, or rendering responsibilities recorded in their detailed plans.

The audit may recommend a later extraction only if ownership remains narrow and explicit. Do not invent a global store,
general event bus, broad `useContentApp` hook, runtime service, dependency object, or generic effect runner.

## Hook/Plugin Visibility

No new hook, plugin, `window.plugin.*`, Leaflet.draw, external API, storage contract, or message type is exposed in this
audit. If the audit discovers that a future extraction would affect plugin/hook visibility, record it as blocked and
create a separate parity plan before implementation.

## Scope

Decide whether Phase 2 app-surface extraction should stop for now, continue with one more narrow detailed plan, or allow
the move-only source layout migration plan to begin. The expected output is documentation, not app code.

### Checkpoint 0: Baseline And Validation

- Confirm the working tree includes the merged/completed runtime-effects slice.
- Read this plan, [index.md](index.md), [../port-plan.md](../port-plan.md), and the four completed Phase 2 plans.
- Run or record the latest known validation for the completed runtime-effects slice:
  - `npm run test -w apps/iitc-iris -- --run src/content-side-panel-auto-requests.test.ts src/content-outbound-messages.test.ts src/content-mission-refresh.test.ts src/content-search-actions.test.ts`
  - `npm run typecheck:iitc-iris`
  - `npm run lint:iitc-iris`
  - `npm run package:iitc-iris`
  - `git diff --check`
- If validation fails, stop the audit and report the failing command. Do not continue into planning until failures are
  understood.

### Checkpoint 1: Remaining `content.tsx` Responsibility Inventory

Create an audit section in this file named `## Audit Notes` with a table that lists the remaining `content.tsx`
responsibilities. Use these categories unless the code has clearly changed:

- state declarations and storage-backed initializers;
- refs and scroll retention;
- memoized derived values;
- workflow hook wiring;
- command callback composition;
- message listener and storage/runtime effects;
- keyboard, COMM scroll, search preview, and portal auto-open effects;
- top-level rendered composition;
- bootstrap/mount/login-bypass behavior.

For each row, record:

- current line range or nearby symbol names;
- whether it should remain in `content.tsx`;
- whether a further extraction is justified;
- the reason, using behavior risk and ownership boundaries rather than file size alone.

### Checkpoint 2: Completed Plan Consistency Review

Review the completed Phase 2 plans against the current code. Record findings under `## Audit Notes`.

Check:

- completed plans do not still point to themselves as active next work;
- implementation notes are true for current file names and helper names;
- no completed plan claims behavior that is no longer true;
- no stale AGY wording asks for already-completed checkpoints;
- `index.md` points to this audit as active while the audit is open.

If only docs are stale, update docs in the audit branch. If app code is stale or inconsistent, do not fix it unless the
fix is a very small correctness issue; otherwise create a follow-up plan.

### Checkpoint 3: Further Extraction Decision

Assess these possible next actions and record a decision for each:

- Stop Phase 2 app-surface extraction for now.
- Create one more narrow extraction plan for a concrete remaining responsibility.
- Start [source-directory-layout-plan.md](source-directory-layout-plan.md).
- Return to feature/parity backlog work.

Use these decision rules:

- Prefer stopping Phase 2 if a proposed extraction mostly reduces line count but increases indirection.
- Prefer a new extraction plan only when the remaining responsibility is pure, repeated, directly testable, and has a
  clear module owner.
- Prefer source layout work only if completed Phase 2 boundaries are stable enough that move-only imports are predictable.
- Do not recommend broad hooks, global state, general effect runners, or a folder migration mixed with logic changes.

If recommending another extraction, create a new detailed plan file using the template in [index.md](index.md), but do
not implement it. If recommending source layout work, update [source-directory-layout-plan.md](source-directory-layout-plan.md)
from `blocked` to `ready` and name the first feature folder to move.

### Checkpoint 4: Roadmap Update

Update [index.md](index.md) based on the audit result:

- If Phase 2 is done for now, mark the active Phase 2 slice as complete/parked and point to the next approved plan.
- If one more extraction is approved, point Active Review Plans to that new detailed plan.
- If source layout migration is approved, point Active Review Plans to [source-directory-layout-plan.md](source-directory-layout-plan.md)
  and record the first move-only checkpoint.

Do not leave [index.md](index.md) pointing at a completed plan as the active next slice.

## Non-Goals

- No UI, CSS, storage key, message id, panel id, or user-facing label changes.
- No app code changes unless needed for a small audit-blocking correctness issue.
- No source directory moves in this audit pass.
- No broad state management, hook consolidation, event bus, runtime service, or dependency bag.
- No package/core facade changes.
- No behavior ports or backlog feature work.

## Tests/Diagnostics

This plan is documentation-first. Code validation is used to prove the current checkpoint is stable, not to justify new
behavior. If only docs change, typecheck/lint/package are optional but the audit should record whether the latest
runtime-effects validation was run.

If app code is changed to fix an audit-blocking issue, run focused tests for that code plus the full validation listed in
Checkpoint 0.

## Divergences

None intended. If the audit recommends a behavior change, it must become a separate feature/parity plan and should not be
implemented as part of this audit.

## Validation

Documentation-only audit:

- `git diff --check`

Audit with app-code fixes:

- focused tests for touched modules;
- `npm run typecheck:iitc-iris`;
- `npm run lint:iitc-iris`;
- `npm run package:iitc-iris`;
- `git diff --check`.

## Audit Notes

### Checkpoint 0: Baseline And Validation

Baseline state:

- `content.tsx` is 1274 lines after the completed shell, panel, command-callback, and runtime-effects extraction slices.
- The working tree at audit start had documentation-plan changes only.
- Packaging produced current build artifacts, but they are ignored by git and did not add tracked changes.

Validation run during this audit:

- `npm run test -w apps/iitc-iris -- --run src/content-side-panel-auto-requests.test.ts src/content-outbound-messages.test.ts src/content-mission-refresh.test.ts src/content-search-actions.test.ts` passed: 4 files, 37 tests.
- `npm run typecheck:iitc-iris` passed.
- `npm run lint:iitc-iris` passed.
- `npm run package:iitc-iris` passed. The build wrote expected empty fallback fixtures for missing local sample files and created Chrome/Firefox packages.
- `git diff --check` passed after the audit plan updates.

### Checkpoint 1: Remaining `content.tsx` Responsibility Inventory

| Responsibility | Current location | Keep in `content.tsx`? | Further extraction justified? | Reason |
|---|---:|---|---|---|
| Bootstrap helpers and constants | `injectScript`, default state constants, type aliases around lines 160-207 | Yes | No | Small content-script boot helpers are tied to DOM injection and app root ownership. Extracting them would not reduce behavior risk. |
| State declarations and storage-backed initializers | `App` state block around lines 210-334 | Yes | Not now | This is top-level app ownership. Some defaults could move into factory helpers later, but current values are single-use and coupled to app state shape. Extraction would mainly hide initialization. |
| Refs and scroll/intent tracking | refs around lines 250-256 | Yes | No | These refs coordinate browser timing, scroll retention, and `performance.now()` intent tracking. Their ownership is deliberately in `content.tsx`. |
| Memoized derived values | map plan/status/selection/auth values around lines 335-396 and 728-747 | Mostly yes | No broad extraction | Existing pure helpers already cover map status, selection, diagnostics, and auth text. Remaining composition chooses which app states to pass together. |
| Workflow hook wiring | portal analysis, Draw Tools, and scenarios around lines 342-354, 603-641, and 705-727 | Yes | No | Hook internals are already extracted. `content.tsx` should remain the wiring point where top-level state and callbacks meet. |
| Command callback composition | callbacks around lines 399-793 | Yes | No broad extraction | Command helper modules exist. Remaining wrappers close over current state, setters, refs, and browser APIs. Further extraction would require large dependency bags, repeating the earlier stop condition. |
| Auth retry composition | `retryAuthRequest` around lines 560-580 | Yes | No | The existing inline comment remains accurate: extracting this would require many state values and callbacks and reduce clarity. |
| Message listener and storage/runtime effects | effects around lines 795-895 | Yes | No broad extraction | Message adapters and pure payload/decision helpers are extracted. Effects still own `window`, storage, timers, and state setters as planned. |
| Portal mission and search debounce effects | effects around lines 898-919 | Yes | No | Pure decisions are extracted; runtime ownership remains correctly inline. |
| Search preview, COMM scroll, and keyboard effects | effects around lines 921-984 | Yes | Maybe later, not now | These are browser/UI interaction effects with refs, animation frames, and keyboard event ownership. No repeated pure boundary is obvious. |
| Top-level rendered composition | JSX around lines 991-1217 | Yes | No current panel extraction | Panels and containers are already extracted. Remaining JSX is app composition and prop wiring. Moving it now would create a broad app shell abstraction without clear behavior benefit. |
| Bootstrap/mount/login-bypass behavior | lines 1219-1274 | Yes | No | Content-script lifecycle and login bypass are browser/DOM-owned and small enough to keep local. |

### Checkpoint 2: Completed Plan Consistency Review

- [content-command-callbacks-extraction-plan.md](content-command-callbacks-extraction-plan.md) is complete and correctly records the deliberate stop conditions around `retryAuthRequest`, `closeSidePanel`, layer settings, and highlighter intent timing.
- [content-shell-extraction-plan.md](content-shell-extraction-plan.md) is complete and points follow-up work toward broader app-surface plans rather than unfinished shell checkpoints.
- [panel-extraction-plan.md](panel-extraction-plan.md) is complete; its follow-up now points to this closure audit instead of the already-completed runtime-effects plan.
- [content-runtime-effects-extraction-plan.md](content-runtime-effects-extraction-plan.md) is complete and records all checkpoints as done.
- [index.md](index.md) no longer points to the completed runtime-effects plan as active next work.

No app-code inconsistencies were found during this audit.

### Checkpoint 3: Further Extraction Decision

Decision:

- Stop Phase 2 app-surface extraction for now.
- Do not create another `content.tsx` extraction plan at this time.
- Approve [source-directory-layout-plan.md](source-directory-layout-plan.md) as the next refactor, starting with the
  `search` move-only checkpoint.
- Return to feature/parity backlog work after the first move-only layout checkpoint is reviewed, unless that review shows
  import churn is too high.

Reasoning:

- The remaining `content.tsx` weight is mostly top-level orchestration: state ownership, refs, runtime effects, callback
  closure wiring, and final app composition.
- Further extraction would mostly reduce line count while adding indirection or dependency bags.
- The completed Phase 2 boundaries are now stable enough for a cautious move-only folder pass.
- `search` is the lowest-risk first folder because it has a small surface and focused tests.

### Checkpoint 4: Roadmap Update

- [index.md](index.md) marks Phase 2 app-surface extraction as complete/parked for now.
- [source-directory-layout-plan.md](source-directory-layout-plan.md) is now ready, with Checkpoint 1 approved for the
  `search` folder.
