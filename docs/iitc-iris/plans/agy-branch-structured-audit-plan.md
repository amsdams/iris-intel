# AGY Branch Structured Audit Plan

Status: complete. The AGY branch was audited, blocking findings were fixed, validation was clean, and the work was
merged into `feaure/the-refactor`.

## Purpose

Review the AGY refactor branch for compliance with the IITC IRIS porting doctrine and Phase 2 refactoring roadmap before
continuing or merging the work.

The audit is a code-review pass, not a new refactor pass. Findings should identify bugs, behavior changes, plan
violations, missing tests, and validation gaps. Cosmetic preferences are out of scope unless they affect maintainability
or parity debugging.

## Baseline

- Baseline branch: `feaure/the-refactor`
- Review branch: `feaure/the-refactor-agy`
- Relationship at audit planning time: AGY is 25 commits ahead and `feaure/the-refactor` has no unique commits.
- Working tree prerequisite: start from a clean tree. Do not mix new refactor work into the audit.
- Review size at audit planning time: 82 files changed, with `content.tsx` reduced by about 3k lines and many app-side
  helper, workflow, and panel modules added.

## Outcome

- Blocking findings fixed before merge: passcode auth retry, Damrak data-source id compatibility, storage type
  ownership, Draw Tools plan wording, `port-plan.md` validation wording, and diff hygiene.
- Final validation before merge covered focused tests, full app tests, typecheck, lint, package build, and
  `git diff --check`.
- Follow-up Phase 2 work should continue from
  [content-command-callbacks-extraction-plan.md](content-command-callbacks-extraction-plan.md), not from this audit
  plan.

## IITC Sources

Use these IITC-CE areas only as behavior/naming references for domains touched by the refactor. This audit should not
attempt a fresh parity port.

- `reference/ingress-intel-total-conversion/core/code/comm.js` and related COMM UI/request behavior.
- `reference/ingress-intel-total-conversion/core/code/map_data_request.js` for map request lifecycle concepts referenced
  by diagnostics and scenario controls.
- `reference/ingress-intel-total-conversion/core/code/portal_detail.js` and selected portal lifecycle behavior.
- `reference/ingress-intel-total-conversion/plugins/draw-tools.js` for Draw Tools links/markers concepts.
- Existing IITC layer/highlighter/plugin concepts when reviewing layer, filter, and highlighter extraction naming.

If a changed module claims IITC parity or exposes an IITC-named concept not covered above, identify the exact reference
file during the audit before judging the change.

## Current IRIS Sources

Primary review surface:

- `apps/iitc-iris/src/content.tsx`
- New `apps/iitc-iris/src/content-*-actions.ts`, `content-*-workflow.ts`, `content-*-management.ts`,
  `content-*-settings.ts`, and matching tests.
- New panel/container modules under `apps/iitc-iris/src/*-panel.tsx` and `*-panel-container.tsx`.
- `apps/iitc-iris/src/content-message-adapter.ts`, `content-outbound-messages.ts`, and page-runtime message call sites.
- Changed docs under `docs/iitc-iris/`.

Secondary review surface:

- `apps/iitc-iris/src/page-map-runtime.ts`
- `apps/iitc-iris/vite.page-map.config.ts`
- Any package/build behavior touched by the branch.

## Public Concepts

The audit should preserve existing IITC IRIS public behavior and IITC-aligned naming for:

- Menu/sheet/panel IDs and persisted active sheet/side-panel settings.
- `comm`, request COMM, COMM tabs, scrolling, nicknames, and passcode submission behavior.
- Portal selection/details, selected-object panel behavior, image preview, and focus/clear actions.
- Draw Tools v1 links/markers, import/export, marker labels, delete/undo/clear, and runtime drawTools messages.
- Map camera/view commands, presets, geolocation, context target handling, and Intel URL generation.
- Scenario diagnostics, request diagnostics, lifecycle settings, layer/highlighter settings, and map status formatting.
- Portal analysis views: counts, portals list, scoreboard, sort/filter state, and copy/export behavior.

New names do not need to copy IITC file layout, but a future debugger should be able to map each public concept back to
the IITC-CE source or to a documented IITC IRIS shell divergence.

## Ownership And Lifecycle Expectations

- `content.tsx` may become smaller, but it should still own top-level Preact state, refs, browser effects, storage
  effects, page-runtime message listeners, request lifecycle triggers, and stale-response guards unless a detailed plan
  documents otherwise.
- App-side helper modules may own pure state derivation, payload construction, formatting, and callback routing.
- App-side workflow hooks may own local UI workflow state and callback wiring for one panel or one shell workflow.
- Panel modules should own rendering and event prop wiring, not fetch, storage, cancellation, or page-runtime mutation.
- `packages/iitc-core` should not gain browser, Preact, Leaflet, or app UI ownership from this branch.
- Runtime message payloads must keep the same message type, required fields, default values, and ordering-sensitive
  state transitions as the baseline unless an intentional divergence is documented.

## Hook And Plugin Visibility

- This is not a plugin API pass. Do not accept new `window.plugin.*`, `addHook`/`runHooks`, toolbox, or broad
  Leaflet.draw event exposure unless a separate feature plan explicitly justifies it.
- Existing native IITC IRIS UI hooks and Preact hooks are implementation details unless exported from a module already
  used across the app.
- Extracted hooks must not hide browser effects that make lifecycle ordering harder to compare with IITC-CE.

## Source Documents

- [port-plan.md](../port-plan.md)
- [index.md](index.md)
- [content-shell-extraction-plan.md](content-shell-extraction-plan.md)
- [panel-extraction-plan.md](panel-extraction-plan.md)
- [facade-pattern.md](facade-pattern.md)

## Audit Passes

1. Plan compliance:
   Verify the branch stays within Phase 2 app-surface extraction: behavior-preserving splits from `content.tsx`, no
   global store, no UI redesign, no browser effects in `packages/iitc-core`, and no broad facade churn.

2. Module shape:
   Review new files for clear app-side ownership. Extracted modules should own rendering, local workflow state, or
   callback wiring only. `content.tsx` should still own runtime effects, storage, request lifecycle, and page-runtime
   message boundaries unless a detailed plan explicitly says otherwise.

3. Behavioral parity risk:
   Focus on extracted auth, camera/map navigation, COMM, Draw Tools, portal selection/details, portal analysis,
   scenario, storage/settings, diagnostics, and layer/highlighter paths. Compare changed behavior against the original
   branch, not against preferred architecture.

4. Tests:
   Check whether added tests lock user-visible behavior, state transitions, payload shapes, and diagnostics. Flag tests
   that only mirror rewritten helper internals while leaving integration behavior unprotected.

5. Documentation:
   Confirm `port-plan.md`, `content-shell-extraction-plan.md`, and `panel-extraction-plan.md` accurately describe what
   the branch did. Flag claims of completion that are not backed by code or validation.

6. Validation:
   After review fixes, run focused tests for touched helpers, `npm run typecheck:iitc-iris`, `npm run lint:iitc-iris`,
   `npm run package:iitc-iris`, and `git diff --check`.

## Finding Severity

- Blocking: likely behavior regression, lifecycle/order regression, build failure, missing required runtime message
  field, incorrect persisted state behavior, or clear violation of the Phase 2 non-goals.
- High: risky ownership movement, missing test around a changed workflow, stale docs claiming completion, or extraction
  that makes parity debugging materially harder.
- Medium: local maintainability issue, weak naming boundary, test that covers implementation detail but misses the
  externally visible contract, or validation gap.
- Low: small documentation or naming cleanup that should not block continuation.

Do not report style-only findings unless they directly affect plan compliance, parity comparison, or future maintenance.

## Review Method

1. Confirm branch shape and clean tree.
2. Read the full diff stat and group files by workflow.
3. Review docs changes first so the claimed plan can be checked against code.
4. Review `content.tsx` diff for removed responsibilities and changed effect dependencies.
5. Review each extracted workflow/panel together with its test file.
6. Trace message boundaries: inbound adapter, outbound builders, `window.postMessage`, and page-runtime consumers.
7. Run validation only after code-review findings are either fixed or explicitly recorded as residual risk.

## Scope And Non-Goals

- Scope: review AGY's refactor work and the completed Draw Tools workflow extraction that now sits on the AGY branch.
- Scope: produce actionable review findings and, if requested after review, focused fixes.
- Non-goal: perform a broad architecture rewrite.
- Non-goal: expand Draw Tools beyond v1 links/markers.
- Non-goal: introduce a global store, event bus, or plugin-facing compatibility layer.
- Non-goal: redesign the Mini-IRIS-sized UI shell.
- Non-goal: resolve unrelated backlog items found while reading.

## Tests And Diagnostics To Inspect

- New and changed `apps/iitc-iris/src/*.test.ts` and `*.test.tsx` files.
- Tests for payload builders, state derivation, workflow hooks, message adapters, sorting/filtering, storage, diagnostics,
  and panel containers.
- Existing live/manual diagnostics mentioned in `port-plan.md` remain context, not a substitute for branch validation.
- If a workflow has only pure helper tests but no coverage for a changed callback/message boundary, flag that as a test
  gap.

## Divergence Policy

No behavior divergence is expected from this branch. If the audit finds a behavior change, classify it as one of:

- Bug: should be fixed before continuation.
- Intentional shell divergence: must be documented in the relevant plan or feature file.
- Acceptable app-side implementation change: must preserve the baseline user-visible behavior and message/runtime
  contract.

## Review Commands

```sh
git status --short
git rev-list --count feaure/the-refactor..feaure/the-refactor-agy
git rev-list --count feaure/the-refactor-agy..feaure/the-refactor
git diff --stat feaure/the-refactor...feaure/the-refactor-agy
git diff --name-status feaure/the-refactor...feaure/the-refactor-agy
git diff feaure/the-refactor...feaure/the-refactor-agy -- apps/iitc-iris/src/content.tsx
git diff feaure/the-refactor...feaure/the-refactor-agy -- apps/iitc-iris/src
git diff feaure/the-refactor...feaure/the-refactor-agy -- docs/iitc-iris
```

Focused validation commands should be selected from the changed workflows, then followed by:

```sh
npm run typecheck:iitc-iris
npm run lint:iitc-iris
npm run package:iitc-iris
git diff --check
```

## Expected Output

The audit response should use code-review format:

- Findings first, ordered by severity, with file and line references.
- Open questions or assumptions.
- Validation performed or still pending.
- Brief branch recommendation: continue, fix before continuing, or split/revert a specific slice.

If no blocking issues are found, say that directly and still record residual risk and validation gaps.
