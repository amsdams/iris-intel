# IITC IRIS CSS Refactor - Phase 0 Baseline

Status: Complete for Phase 0.

Baseline date: 2026-10-07.

## Scope

This baseline records the current state before CSS ownership analysis and migration. Application source files were not
modified during this phase.

Canonical CSS source:

- `apps/iitc-iris/src/iitc-iris.css`

Canonical artifact directory:

- `docs/iitc-iris/plans/css-refactoring/`

## Git State

Current commit:

```text
a8d946df6ab3c35db4d85232d05b967d04be8159
```

Working tree status from `git status --short`:

```text
AM docs/iitc-iris/plans/css-ownership.md
A  docs/iitc-iris/plans/css-refactor-new.md
AM docs/iitc-iris/plans/css-refactor.md
 M docs/iitc-iris/plans/index.md
 M docs/iitc-iris/plans/ui-system-consolidation-plan.md
?? docs/iitc-iris/plans/css-refactoring/
?? jl.sh
```

Diff summary from `git diff --stat` before writing this canonical baseline:

```text
docs/iitc-iris/plans/css-ownership.md              | 2726 ++++++++++++++++++++
docs/iitc-iris/plans/css-refactor.md               |  127 +-
docs/iitc-iris/plans/index.md                      |   27 +-
.../plans/ui-system-consolidation-plan.md          |    7 +-
4 files changed, 2866 insertions(+), 21 deletions(-)
```

Diff hygiene:

| Check | Command/method | Result | Evidence | Status |
|-------|----------------|--------|----------|--------|
| Diff whitespace | `git diff --check` | Passed | Command produced no output. | PASS |

## CSS Statistics

| Metric | Result | Command/method | Notes |
|--------|--------|----------------|-------|
| CSS source lines | 3431 | `wc -l apps/iitc-iris/src/iitc-iris.css` | Exact line count. |
| `@media` rules | 2 | `rg -n "^@media" apps/iitc-iris/src/iitc-iris.css` | Lines 2490 and 2771. |
| `@keyframes` rules | 0 | `rg -n "^@keyframes" apps/iitc-iris/src/iitc-iris.css` | No matches. |
| `@supports` rules | 0 | `rg -n "^@supports" apps/iitc-iris/src/iitc-iris.css` | No matches. |
| Custom property declarations | 38 | `rg -n "^\\s*--iitc-iris-[a-z0-9-]+:" apps/iitc-iris/src/iitc-iris.css` | Counts repeated assignments. |
| Unique custom property names | 34 | Derived from the same custom-property declaration output. | Full list belongs in Phase 1 inventory. |
| Selector/rule count | NOT VERIFIED | Deferred to Phase 1 parser inventory. | Simple `grep "^\\."` counting is not reliable. |

## CSS Import And Loading

CSS references found with:

```text
rg -n "iitc-iris.css|\.css'|\.css\"" apps/iitc-iris/src apps/iitc-iris -g "*.ts" -g "*.tsx" -g "*.js" -g "*.json"
```

Output:

```text
apps/iitc-iris/src/content.tsx:3:import './iitc-iris.css';
apps/iitc-iris/src/content.tsx:3:import './iitc-iris.css';
apps/iitc-iris/manifest.json:15:      "css": ["iitc-iris.css", "leaflet.css"],
apps/iitc-iris/manifest.json:21:      "resources": ["page-map-runtime.js", "leaflet.css", "fixtures/*.json", "images/*.png"],
```

The duplicated `content.tsx` result is from searching overlapping roots (`apps/iitc-iris/src` and `apps/iitc-iris`).

## Commands And Verification

| Check | Command/method | Result | Evidence | Status |
|-------|----------------|--------|----------|--------|
| Current commit | `git rev-parse HEAD` | `a8d946df6ab3c35db4d85232d05b967d04be8159` | Exact command output recorded above. | PASS |
| Working tree | `git status --short` | Dirty with planning artifacts and `jl.sh`. | Exact command output recorded above. | PASS |
| Diff hygiene | `git diff --check` | Passed. | No output. | PASS |
| CSS line count | `wc -l apps/iitc-iris/src/iitc-iris.css` | 3431 | Exact command output recorded above. | PASS |
| At-rules | `rg -n "^@media"`, `rg -n "^@keyframes"`, `rg -n "^@supports"` | 2 media, 0 keyframes, 0 supports. | Exact summary recorded above. | PASS |
| CSS variables | `rg -n "^\\s*--iitc-iris-[a-z0-9-]+:" apps/iitc-iris/src/iitc-iris.css` | 38 declarations, 34 unique names. | Exact summary recorded above. | PASS |
| CSS loading | `rg -n "iitc-iris.css\|\\.css'\|\\.css\\\""` with TS/JS/JSON globs | Imported by `content.tsx`; listed in manifest with `leaflet.css`. | Exact output recorded above. | PASS |
| Typecheck | `npm run typecheck:iitc-iris` | Passed. | `tsc --noEmit` completed with exit code 0. | PASS |
| Lint | `npm run lint:iitc-iris` | Passed. | `eslint src` completed with exit code 0. | PASS |
| Tests | `npm run test:iitc-iris` | Passed. | 60 test files passed; 346 tests passed. | PASS |
| CSS lint | `npm run lint:css` | Passed. | `stylelint '**/*.css'` completed with exit code 0. | PASS |
| Package | `npm run package:iitc-iris` | Passed with fixture fallback warnings. | Chrome ZIP and Firefox XPI were created. | PASS |

Package artifacts created by `npm run package:iitc-iris`:

```text
apps/iitc-iris/builds/iitc-iris-chrome-0.1.0-2026-10-07T20-43-02.zip
apps/iitc-iris/builds/iitc-iris-firefox-0.1.0-2026-10-07T20-43-02.xpi
```

Package warnings:

```text
IITC IRIS: missing fixture /Users/jula/ittca/docs/iris/update-map-samples/get-entities-z10.json; wrote empty fallback /Users/jula/ittca/apps/iitc-iris/dist/fixtures/get-entities-z10.json
IITC IRIS: missing fixture /Users/jula/ittca/docs/iris/update-map-samples/get-entities-z14.json; wrote empty fallback /Users/jula/ittca/apps/iitc-iris/dist/fixtures/get-entities-z14.json
IITC IRIS: missing fixture /Users/jula/ittca/docs/iris/update-map-samples/get-entities-damrak-iitc-z15.json; wrote empty fallback /Users/jula/ittca/apps/iitc-iris/dist/fixtures/get-entities-damrak-iitc-z15.json
```

The package command still exited successfully.

## Known Existing Conditions

- The working tree is intentionally dirty with planning artifacts from this refactor setup.
- `jl.sh` is untracked and unrelated to the CSS refactor.
- The package step reports missing fixture warnings and writes empty fallback fixture files into `dist`, but still passes.
- Selector/rule counting is deferred to the Phase 1 parser inventory because line-based grep counting is misleading.

## Exit Criteria

- Baseline information that can be established has been recorded.
- Exact commands are recorded for all `PASS` rows.
- Unavailable or unreliable metrics are marked `NOT VERIFIED` instead of guessed.
- No application source files were modified in Phase 0.

Phase 0 is complete. Proceed to Phase 1 only from this canonical baseline.
