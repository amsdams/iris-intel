# IITC IRIS CSS Verification - Phase 4

Status: Complete for this migration pass.

## Static Verification

| Check | Command/method | Result | Evidence | Status |
|-------|----------------|--------|----------|--------|
| Typecheck | `npm run typecheck:iitc-iris` | Passed | `tsc --noEmit` exited 0. | PASS |
| Lint | `npm run lint:iitc-iris` | Passed | `eslint src` exited 0. | PASS |
| Tests | `npm run test:iitc-iris` | Passed | 60 test files and 346 tests passed. | PASS |
| CSS lint | `npm run lint:css` | Passed | `stylelint '**/*.css'` exited 0. | PASS |
| Production package | `npm run package:iitc-iris` | Passed | Built CSS/JS bundles and produced ZIP/XPI packages. | PASS |
| Diff hygiene | `git diff --check` | Passed | Command produced no output. | PASS |
| CSS cascade reconstruction | Concatenate imported chunks and compare to saved original CSS | Passed | `reconstructed CSS matches original`. | PASS |

## Package Artifacts

Latest artifacts from this pass:

```text
apps/iitc-iris/builds/iitc-iris-chrome-0.1.0-2026-10-07T21-24-30.zip
apps/iitc-iris/builds/iitc-iris-firefox-0.1.0-2026-10-07T21-24-30.xpi
```

Package warnings:

```text
IITC IRIS: missing fixture /Users/jula/ittca/docs/iris/update-map-samples/get-entities-z10.json; wrote empty fallback /Users/jula/ittca/apps/iitc-iris/dist/fixtures/get-entities-z10.json
IITC IRIS: missing fixture /Users/jula/ittca/docs/iris/update-map-samples/get-entities-z14.json; wrote empty fallback /Users/jula/ittca/apps/iitc-iris/dist/fixtures/get-entities-z14.json
IITC IRIS: missing fixture /Users/jula/ittca/docs/iris/update-map-samples/get-entities-damrak-iitc-z15.json; wrote empty fallback /Users/jula/ittca/apps/iitc-iris/dist/fixtures/get-entities-damrak-iitc-z15.json
```

The package command exited successfully despite these existing fixture fallback warnings.

## Import Verification

`apps/iitc-iris/src/iitc-iris.css` is still the single CSS entry point imported by `content.tsx`. It now contains only
ordered `@import url(...)` rules.

The package build produced:

```text
dist/iitc-iris.css   61.13 kB │ gzip: 10.35 kB
```

This matches the baseline package output size from before the split.

## Visual Verification

Status: PASS.

Method:

- User smoke-tested the migrated extension on Firefox desktop after the CSS split.

Result:

- No visual or functional smoke-test problems reported.

Limitations:

- This was a quick desktop Firefox smoke test, not an exhaustive panel/state/mobile comparison.
- Mobile/sheet-width visual verification remains a useful follow-up if the branch is kept.

## Final Status

Phase 4 is complete for this migration pass.
