# IITC IRIS CSS Migration Log - Phase 3

Status: CSS migration implemented for static review.

## Migration Strategy

The migration uses ordered chunk files instead of one large owner file per feature.

Reason: a simple owner-grouped split would reorder CSS across feature/UI boundaries. To preserve the original cascade,
`apps/iitc-iris/src/iitc-iris.css` is now an import manifest whose imports are ordered by the original monolithic
stylesheet order. Each imported chunk lives under the owning source directory identified by the Phase 1 ownership map.

The split is intentionally mechanical:

- selector text is unchanged;
- declaration text is unchanged;
- comments inside moved ranges are preserved;
- source order is preserved by manifest import order;
- whole broad responsive `@media` blocks are kept in ordered temporary chunks under `apps/iitc-iris/src/styles/`;
- no TS/TSX imports were changed.

## Files Created

CSS files after migration:

| Area | Files |
|------|-------|
| `auth` | 2 |
| `comm` | 2 |
| `draw-tools` | 1 |
| `layers` | 4 |
| `map` | 11 |
| `missions` | 3 |
| `portal-analysis` | 6 |
| `portals` | 14 |
| `search` | 3 |
| `shell` | 4 |
| `side-panels` | 4 |
| `styles` | 6 |
| `system` | 9 |
| `ui` | 21 |

Total imported chunk files: 90.

`apps/iitc-iris/src/iitc-iris.css` remains the single CSS entry point and now contains only ordered `@import url(...)`
statements.

## Cascade Preservation

Cascade preservation method:

1. Save the original `apps/iitc-iris/src/iitc-iris.css`.
2. Split the CSS into contiguous chunks by proposed owner while preserving original order.
3. Write the chunks into owner directories with numeric prefixes.
4. Replace `iitc-iris.css` with ordered imports.
5. Concatenate every imported chunk in manifest order and compare it with the original CSS.

Verification result:

```text
reconstructed CSS matches original
```

This proves the imported chunk contents, when read in manifest order, reproduce the original stylesheet exactly.

## Temporary Chunks

Temporary chunks are under `apps/iitc-iris/src/styles/*-temporary.css`.

After the follow-up cleanup, only two temporary chunks remain:

- `apps/iitc-iris/src/styles/068-temporary.css`
- `apps/iitc-iris/src/styles/075-temporary.css`

Both contain broad mobile `@media (width <= 760px)` blocks spanning several UI and feature owners. They are intentionally
kept intact to avoid responsive cascade drift.

The other temporary chunks from the initial mechanical split were moved to clearer owner directories without changing
their numeric import positions.

## Entry Point

`apps/iitc-iris/src/iitc-iris.css` now begins:

```css
/* IITC IRIS CSS entry point. Ordered imports preserve the original monolithic cascade. */
@import url('./styles/001-globals.css');
@import url('./ui/002-ui.css');
@import url('./shell/003-shell.css');
```

The rest of the file is the ordered import manifest.

## Verification Run During Migration

| Check | Command/method | Result | Evidence | Status |
|-------|----------------|--------|----------|--------|
| Typecheck | `npm run typecheck:iitc-iris` | Passed | `tsc --noEmit` exited 0. | PASS |
| App lint | `npm run lint:iitc-iris` | Passed | `eslint src` exited 0. | PASS |
| Tests | `npm run test:iitc-iris` | Passed | 60 test files and 346 tests passed. | PASS |
| CSS lint | `npm run lint:css` | Passed | `stylelint '**/*.css'` exited 0 after import notation was changed to `url(...)`. | PASS |
| Package | `npm run package:iitc-iris` | Passed | Built `dist/iitc-iris.css` at 61.13 kB and created Chrome ZIP / Firefox XPI. | PASS |
| Diff hygiene | `git diff --check` | Passed | Command produced no output. | PASS |
| Cascade reconstruction | Concatenate imported chunks in manifest order and compare with saved original CSS | Passed | `reconstructed CSS matches original`. | PASS |

Package warnings:

```text
IITC IRIS: missing fixture /Users/jula/ittca/docs/iris/update-map-samples/get-entities-z10.json; wrote empty fallback /Users/jula/ittca/apps/iitc-iris/dist/fixtures/get-entities-z10.json
IITC IRIS: missing fixture /Users/jula/ittca/docs/iris/update-map-samples/get-entities-z14.json; wrote empty fallback /Users/jula/ittca/apps/iitc-iris/dist/fixtures/get-entities-z14.json
IITC IRIS: missing fixture /Users/jula/ittca/docs/iris/update-map-samples/get-entities-damrak-iitc-z15.json; wrote empty fallback /Users/jula/ittca/apps/iitc-iris/dist/fixtures/get-entities-damrak-iitc-z15.json
```

The package command exited successfully despite those existing fixture fallback warnings.

## Visual Verification

Not performed by Codex in this pass.

The user requested to verify after code changes. Phase 4 should record the user's visual/browser verification results.

## Known Tradeoff

The chunked split creates more CSS files than a hand-authored final architecture. This is deliberate for the first
migration: it preserves cascade exactly and makes later consolidation reviewable as a separate follow-up instead of
mixing layout moves with behavioral risk.
