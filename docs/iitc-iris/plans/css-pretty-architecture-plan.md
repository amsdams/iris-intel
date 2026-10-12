# IITC IRIS CSS Pretty Architecture Plan

## Plan Dashboard

Status: Track A, Track B, and Track C Complete.
- Track A (Pretty owner files consolidation) is complete (`docs/iitc-iris/plans/css-refactoring/14-track-a-final-report.md`).
- Track B (Component-local CSS imports for named stylesheets) is complete (`docs/iitc-iris/plans/css-refactoring/24-track-b-closeout-report.md`).
- Track C (Component folder layout co-location and numbered CSS path cleanup) is complete (`docs/iitc-iris/plans/css-refactoring/34-track-c-final-audit.md`).
- Numbered CSS filenames have been eliminated from `apps/iitc-iris/src/`.
- Further CSS consolidation remains optional and needs a fresh plan before implementation.

Goal: turn the cascade-preserving numbered chunk split into a human-friendly CSS architecture while keeping behavior and
visual output unchanged.

Desired end direction: component-local CSS imports, such as `import './button.css'`, where safe.

Status of sequencing:
1. Track A: pretty owner files while keeping the single CSS entry point. (COMPLETE)
2. Track B: component-local CSS imports for isolated and explicitly shared component styles. (COMPLETE FOR NAMED CSS)
3. Track C: co-located component directory layout and descriptive CSS path cleanup. (COMPLETE)

## Background

The earlier CSS migration split `apps/iitc-iris/src/iitc-iris.css` into numbered owner-directory chunks:

```text
apps/iitc-iris/src/iitc-iris.css
apps/iitc-iris/src/ui/002-ui.css
apps/iitc-iris/src/search/006-search.css
...
```

The numbers preserved the original monolithic cascade. That was deliberately safe, but not the final pleasant
architecture.

This plan first made the CSS easier to read while preserving the original loading model, then proved the component-local
loading model for named CSS, then co-located UI components and removed numbered CSS filenames. Further CSS work should
start from concrete UI findings or from a fresh consolidation plan.

## Non-goals

- Do not redesign UI.
- Do not change selectors.
- Do not change declaration values.
- Do not add new component-local CSS imports without an approved Track B/Track C follow-up plan.
- Do not remove selectors because they appear unused.
- Do not merge semantically different CSS merely because declarations look similar.
- Do not change TSX imports except in an approved Track C or numbered-CSS migration slice.

## Target Shape After Track A

`apps/iitc-iris/src/iitc-iris.css` remains the single entry point, but imports stable owner files:

```css
@import url('./styles/globals.css');
@import url('./styles/team.css');
@import url('./ui/ui.css');
@import url('./ui/panel.css');
@import url('./search/search.css');
@import url('./portals/portals.css');
@import url('./portal-analysis/portal-analysis.css');
@import url('./map/map.css');
@import url('./map/player-tracker.css');
@import url('./styles/mobile.css');
```

Exact file names should follow the final ownership map and cascade analysis, not this example blindly.

## Required Safety Rule

Every consolidation step must prove one of these:

- the concatenated CSS output is byte-for-byte equivalent to the pre-step CSS output; or
- the diff is limited to documented file/import naming and preserves effective cascade order.

If this cannot be proven, stop and keep the numbered chunk files.

## Phase 0 - Establish A Pretty-Architecture Baseline

Allowed changes:

- Create/update a future baseline note under `docs/iitc-iris/plans/css-refactoring/` or a new plan-specific folder.

Required checks:

- Save the current imported CSS concatenation as the comparison baseline.
- Record all current CSS imports from `apps/iitc-iris/src/iitc-iris.css`.
- Record current package output size for `dist/iitc-iris.css`.
- Run:
    - `npm run lint:css`
    - `npm run package:iitc-iris`
    - `git diff --check`

Hard stop after Phase 0.

## Phase 1 - Classify Numbered Chunks By Merge Safety

Create a table:

| Current chunk | Owner | Proposed file | Merge safety | Reason |
|---------------|-------|---------------|--------------|--------|

Classification:

- `SINGLE_CHUNK_OWNER`: safe candidate for immediate rename.
- `ADJACENT_SAME_OWNER`: safe candidate for merge if chunks are adjacent in import order.
- `INTERLEAVED_OWNER`: requires cascade analysis before merge.
- `RESPONSIVE_MIXED`: keep in `styles/mobile.css` or split only after mobile cascade review.
- `TEMPORARY_REVIEW`: leave as-is until ownership is clearer.

Hard stop after the classification table is complete.

## Phase 2 - Rename Single-Chunk Owners

Scope:

- Rename only owner files that appear exactly once in the manifest.
- Preserve the same import position.

Example:

```text
draw-tools/089-draw-tools.css -> draw-tools/draw-tools.css
```

Validation:

- Concatenate imports before and after; CSS output must match exactly.
- `npm run lint:css`
- `npm run package:iitc-iris`
- `git diff --check`

Hard stop after this phase.

## Phase 3 - Merge Adjacent Same-Owner Chunks

Scope:

- Merge only chunks that are adjacent in the import manifest and have the same owner.
- Preserve internal order exactly.

Validation:

- Concatenated CSS output must match exactly.
- `npm run lint:css`
- `npm run package:iitc-iris`
- `git diff --check`

Hard stop after this phase.

## Phase 4 - Handle Interleaved Owner Chunks

For each owner with interleaved chunks, decide one of:

- keep numbered files;
- create an owner file with ordered internal sections and keep import position using a documented anchor;
- move shared overriding rules into an explicit later file such as `ui/overrides.css`;
- defer to Track B planning.

Do not merge interleaved chunks unless cascade equivalence is proven.

Validation:

- CSS output equivalence or documented effective-order proof.
- `npm run lint:css`
- `npm run package:iitc-iris`
- `git diff --check`

Hard stop after this phase.

## Phase 5 - Consolidate Broad Responsive CSS

Current broad mobile chunks may become:

- `styles/mobile.css`, if keeping a global responsive layer is clearer; or
- owner-local responsive files, only if cascade order remains provable.

Default recommendation:

- Prefer `styles/mobile.css` for the first pretty architecture pass.
- Leave owner-local responsive splitting for Track B or later visual-polish work.

Validation:

- CSS output equivalence or documented effective-order proof.
- Desktop smoke test.
- Mobile/sheet-width smoke test.
- `npm run lint:css`
- `npm run package:iitc-iris`
- `git diff --check`

## Phase 6 - Final Verification And Report

Required verification:

- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run test:iitc-iris`
- `npm run lint:css`
- `npm run package:iitc-iris`
- `git diff --check`
- CSS output/cascade comparison
- Firefox desktop smoke test
- Mobile or narrow-width sheet smoke test

Final report must record:

- final CSS file list;
- files renamed;
- files merged;
- files intentionally left numbered;
- responsive strategy;
- known cascade risks;
- visual verification performed;
- remaining Track B candidates.

## Track B - Component-Local CSS Import Migration (Complete for Named CSS)

Track B investigated and proved the component-local CSS import model across Spikes 1 through 6 (documented in `docs/iitc-iris/plans/css-refactoring/24-track-b-closeout-report.md`).

Key conclusions established by Track B:
- **Viable for isolated & explicitly shared styles:** Component-local CSS imports (`import './name.css'`) are fully viable for UI primitives and feature components that own their styling or explicitly declare shared dependencies (`clear-button`, `empty-state`, `diagnostics-chip`, `chip-button`, `segmented-button`, `draw-tools`, `portal-analysis-table-actions`, `summary-cell-label`, `portal-summary-mini-track`).
- **Bundler deduplication works cleanly:** Vite automatically deduplicates CSS imported by multiple TSX modules, emitting single rule blocks with zero output inflation.
- **Foundations, shell layout, and responsive layers stay central:** `styles/globals.css`, `shell/shell.css`, `shell/shell-panels.css`, `styles/mobile-dock-panels.css`, and `styles/mobile-sheet-analysis.css` must remain in `iitc-iris.css` to govern application-level geometry and responsive overrides.
- **Cascade-sensitive shared styles stay central:** Stylesheets whose base selectors compose with equal-specificity caller-provided classes (`badge.css`, `status-text.css`, `portal-list-title-reset.css`, `layer-toggle.css`) must remain in the central manifest to prevent cascade-order inversion.

Track B is closed out for named CSS. Remaining modularization proceeds to Track C or numbered chunk consolidation.

## Track C - Component Folder Layout And CSS Path Cleanup

Track C is complete. It co-located UI components into component folders, preserved public imports through `index.ts`
barrels, moved safe CSS beside components, kept cascade-sensitive CSS centrally loaded, and removed numbered CSS
filenames from `apps/iitc-iris/src/`.

Final audit:

- `docs/iitc-iris/plans/css-refactoring/34-track-c-final-audit.md`

Example target:

```text
apps/iitc-iris/src/ui/badge/
├── badge.tsx
├── badge.css
├── badge.test.tsx
└── index.ts
```

Track C deliberately did not merge CSS files. `apps/iitc-iris/src/iitc-iris.css` remains the ordered manifest for
global, shared, responsive, and cascade-sensitive styles.

## Done Criteria

Track A, Track B, and Track C are done. Track C completion means:

- selected UI components live in co-located folders;
- existing import paths continue to work through per-component `index.ts` files;
- no CSS selectors or declarations changed;
- central named CSS remains central for the reasons documented in Track B closeout;
- numbered CSS filenames have been eliminated from `apps/iitc-iris/src/`;
- all static checks, tests, package build, and diff check pass;
- the final audit records intentional central-loaded CSS and next-session guidance.
