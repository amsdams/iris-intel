# IITC IRIS CSS Pretty Architecture Plan

## Plan Dashboard

Status: Proposed future plan. Do not start until the current CSS ownership migration branch is accepted.

Goal: turn the cascade-preserving numbered chunk split into a human-friendly CSS architecture while keeping behavior and
visual output unchanged.

Desired end direction: component-local CSS imports, such as `import './button.css'`, where safe.

Important sequencing:

1. Track A: pretty owner files while keeping the single CSS entry point.
2. Track B: investigate component-local CSS imports as a separate loading-model change.

Do not jump directly to Track B in this plan. Track B changes when and how the bundler orders CSS, which can alter the
cascade even if selector text is unchanged.

## Background

The current CSS migration split `apps/iitc-iris/src/iitc-iris.css` into numbered owner-directory chunks:

```text
apps/iitc-iris/src/iitc-iris.css
apps/iitc-iris/src/ui/002-ui.css
apps/iitc-iris/src/search/006-search.css
...
```

The numbers preserve the original monolithic cascade. This was deliberately safe, but not the final pleasant
architecture.

This plan makes the CSS easier to read and maintain without changing the loading model yet.

## Non-goals

- Do not redesign UI.
- Do not change selectors.
- Do not change declaration values.
- Do not convert to component-local CSS imports yet.
- Do not remove selectors because they appear unused.
- Do not merge semantically different CSS merely because declarations look similar.
- Do not change TSX imports except in the later Track B investigation plan.

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

## Track B - Future Component-Local CSS Import Investigation

Track B is the desired long-term direction but should be planned separately.

Questions for Track B:

- Which UI primitives can safely import their own CSS?
- Which feature panels can safely import their CSS?
- What remains global in `iitc-iris.css`?
- How does Vite order CSS imported from TSX modules?
- Can package output remain equivalent enough to trust?
- What visual checks are required after changing the CSS loading model?

Track B should start with a spike, not a migration:

1. Pick one low-risk component with isolated CSS.
2. Move its CSS import from `iitc-iris.css` to the component module.
3. Compare package CSS output and visual behavior.
4. Decide whether component-local imports are viable for the broader app.

## Track C - Future Component Folder Layout

If Track B proves that component-local CSS imports are safe, consider moving stable components into co-located folders.

Example target:

```text
apps/iitc-iris/src/ui/badge/
├── badge.tsx
├── badge.css
├── badge.test.tsx
└── index.ts
```

This can make ownership clearer because markup, styles, tests, and exports live together.

Start with small UI primitives before feature panels:

- `Badge`
- `EmptyState`
- `ClearButton`
- `ChipButton`
- `SegmentedButton`

Do not combine this with Track A. Component folder layout is a source-layout refactor, and component-local CSS imports are
a loading-model refactor. Each should have its own approval and validation.

## Done Criteria

Track A is done when:

- numbered chunks are reduced where safe;
- remaining numbered chunks have documented cascade reasons;
- broad responsive CSS has a named strategy;
- the CSS entry manifest is understandable;
- all static checks pass;
- smoke verification passes;
- Track B and Track C candidates are documented without being implemented.
