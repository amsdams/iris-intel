# IITC IRIS CSS Refactor Follow-up - Phase 5

Status: Complete.

## Final Report

The migration split `apps/iitc-iris/src/iitc-iris.css` into ordered owner-directory CSS chunks while preserving the
original cascade exactly.

## Files Created

Created 90 imported CSS chunk files under existing source directories:

| Area | Files |
|------|-------|
| `apps/iitc-iris/src/auth/` | 2 |
| `apps/iitc-iris/src/comm/` | 2 |
| `apps/iitc-iris/src/draw-tools/` | 1 |
| `apps/iitc-iris/src/layers/` | 4 |
| `apps/iitc-iris/src/map/` | 11 |
| `apps/iitc-iris/src/missions/` | 3 |
| `apps/iitc-iris/src/portal-analysis/` | 6 |
| `apps/iitc-iris/src/portals/` | 14 |
| `apps/iitc-iris/src/search/` | 3 |
| `apps/iitc-iris/src/shell/` | 4 |
| `apps/iitc-iris/src/side-panels/` | 4 |
| `apps/iitc-iris/src/styles/` | 6 |
| `apps/iitc-iris/src/system/` | 9 |
| `apps/iitc-iris/src/ui/` | 21 |

Created or finalized the audit artifacts:

- `docs/iitc-iris/plans/css-refactoring/00-baseline.md`
- `docs/iitc-iris/plans/css-refactoring/01-css-inventory.md`
- `docs/iitc-iris/plans/css-refactoring/02-ownership-map.md`
- `docs/iitc-iris/plans/css-refactoring/03-migration-log.md`
- `docs/iitc-iris/plans/css-refactoring/04-verification.md`
- `docs/iitc-iris/plans/css-refactoring/05-follow-up.md`

## Files Modified

- `apps/iitc-iris/src/iitc-iris.css`
- `docs/iitc-iris/plans/css-refactor.md`
- `docs/iitc-iris/plans/css-refactoring/02-ownership-map.md`
- `docs/iitc-iris/plans/css-refactoring/03-migration-log.md`
- `docs/iitc-iris/plans/css-refactoring/04-verification.md`

## CSS Moved

All original CSS text was moved into ordered chunk files. The migration verified that concatenating the chunk files in
manifest order reconstructs the original `iitc-iris.css` exactly.

`apps/iitc-iris/src/iitc-iris.css` now contains only ordered `@import url(...)` rules.

## CSS Intentionally Left In `iitc-iris.css`

No style rules remain in `iitc-iris.css`.

It remains as the CSS entry-point/import manifest because `content.tsx` already imports this file and the extension
manifest expects the bundled CSS output.

## Ownership Decisions

The split uses the Phase 1 ownership map while prioritizing cascade preservation:

- shared primitives and component wrappers live under `src/ui/`;
- feature-prefixed selectors live under their feature directory;
- shell/sheet layout selectors live under `src/shell/`;
- root/team/foundation selectors live under `src/styles/`;
- player-tracker and Leaflet popup selectors live under `src/map/`;
- broad responsive blocks live in ordered `src/styles/*-temporary.css` chunks.

## Uncertain Ownership Cases

No selectors were deleted as unused.

Temporary chunks remain for CSS that should not be assigned more aggressively yet:

- two whole `@media` blocks kept intact to preserve responsive cascade.

## Selectors Requiring Future Review

Review the `KEEP_TEMPORARILY` rows in `02-ownership-map.md`, especially:

- `.iitc-iris-title`
- `.iitc-iris-health-track`
- `.iitc-iris-health-fill`
- `.iitc-iris-mission-details-head ...`
- `.iitc-iris-comm-context`
- `.iitc-iris-divider`
- page-runtime `.iitc-iris-innerstatus ...` selectors

Do not remove these selectors in this branch.

## Verification Results

Passed:

- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run test:iitc-iris`
- `npm run lint:css`
- `npm run package:iitc-iris`
- `git diff --check`
- CSS reconstruction check: imported chunks concatenate to the original CSS exactly
- Firefox desktop smoke test by the user

Package warnings:

- Missing fixture warnings were reported and empty fallback fixtures were written, as recorded in `04-verification.md`.
- The package command exited successfully.

## Visual And Cascade Risks

Cascade risk is low for the static CSS split because original source order is preserved by numeric import order and the
reconstruction check matched the original CSS exactly.

Visual risk remains for untested viewports/states:

- mobile/sheet-width layouts;
- unusual active/disabled/selected combinations;
- live player-tracker Leaflet popup states;
- panels not covered in the quick Firefox desktop smoke test.

## Existing Failures Or Warnings

No blocking failures remain.

Known non-blocking warning:

- package step reports missing fixture files and writes empty fallback fixtures.

## Follow-up Opportunities

Do not perform these as part of this migration branch:

- Reduce the number of chunk files once visual parity is accepted.
- Review the two remaining `styles/*-temporary.css` mobile chunks if a future pass wants to split responsive CSS by
  owner.
- Decide whether repeated numbered chunks should be consolidated per owner without changing cascade.
- Investigate no-source-evidence selectors in a separate cleanup pass.
- Add mobile/sheet-width visual verification notes.
- Consider later design-system cleanup only after this ownership migration is accepted.
- Investigate whether CSS should eventually follow component import structure, such as `import './Button.css'` from the
  component that owns the markup. Treat this as a separate loading-model change, because it can alter bundler CSS order
  and cascade behavior.

## Final Hard Stop

The CSS ownership migration is complete for this branch.

Do not perform additional CSS cleanup in this branch unless a new plan is opened.
