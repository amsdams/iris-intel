# AGY Branch Structured Audit Plan

Status: planned. This audit compares `feaure/the-refactor-agy` against `feaure/the-refactor`.

## Purpose

Review the AGY refactor branch for compliance with the IITC IRIS porting doctrine and Phase 2 refactoring roadmap before
continuing or merging the work.

The audit is a code-review pass, not a new refactor pass. Findings should identify bugs, behavior changes, plan
violations, missing tests, and validation gaps. Cosmetic preferences are out of scope unless they affect maintainability
or parity debugging.

## Baseline

- Baseline branch: `feaure/the-refactor`
- Review branch: `feaure/the-refactor-agy`
- Relationship at audit planning time: AGY is 24 commits ahead and `feaure/the-refactor` has no unique commits.
- Current local caveat: uncommitted Draw Tools workflow extraction must be completed or reviewed separately before the
  committed AGY branch audit starts.

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

## Review Commands

```sh
git diff --stat feaure/the-refactor...feaure/the-refactor-agy
git diff --name-status feaure/the-refactor...feaure/the-refactor-agy
git diff feaure/the-refactor...feaure/the-refactor-agy -- apps/iitc-iris/src/content.tsx
git diff feaure/the-refactor...feaure/the-refactor-agy -- apps/iitc-iris/src
git diff feaure/the-refactor...feaure/the-refactor-agy -- docs/iitc-iris
```

## Expected Output

The audit should produce findings first, ordered by severity, with file and line references. If no blocking issues are
found, record residual risk and validation gaps before recommending the next branch action.
