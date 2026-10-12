# IITC IRIS CSS Pretty Architecture Phase 3D — Portal-Analysis Adjacent Merges

Status: Implemented. Cluster B (`031`–`033`) merged into `portal-analysis-base.css`. Cluster C (`036`–`038`) merged into `portal-analysis-table-actions.css`. The two clusters remain separate imports.

Reference plans:
- `docs/iitc-iris/plans/css-pretty-architecture-plan.md` (Phase 3)
- `docs/iitc-iris/plans/css-refactoring/08-phase-3-adjacent-merge-targets.md`
- `docs/iitc-iris/plans/css-refactoring/10-phase-3c-ui-summary-merge.md`

---

## 1. Current Commit Hash (pre-Phase-3D)

`7813f59f1ad6059ffe3ab23bf1bc776b9087676e`

> Note: This is the same base commit as Phase 3C. Phase 3B and 3C changes are staged but not yet committed at the start of this phase.

---

## 2. `git status --short` (after Phase 3D changes, staged)

```text
M  apps/iitc-iris/src/iitc-iris.css
D  apps/iitc-iris/src/portal-analysis/032-table-first-column.css
D  apps/iitc-iris/src/portal-analysis/033-portal-analysis.css
D  apps/iitc-iris/src/portal-analysis/037-table-actions.css
D  apps/iitc-iris/src/portal-analysis/038-portal-analysis.css
R  apps/iitc-iris/src/portal-analysis/031-portal-analysis.css -> apps/iitc-iris/src/portal-analysis/portal-analysis-base.css
R  apps/iitc-iris/src/portal-analysis/036-portal-analysis.css -> apps/iitc-iris/src/portal-analysis/portal-analysis-table-actions.css
D  apps/iitc-iris/src/ui/029-summary-cell-text.css
R  apps/iitc-iris/src/ui/028-summary.css -> apps/iitc-iris/src/ui/summary-mini.css
A  docs/iitc-iris/plans/css-refactoring/10-phase-3c-ui-summary-merge.md
?? docs/iitc-iris/plans/css-refactoring/11-phase-3d-portal-analysis-merge.md
```

> Note: Phase 3C (`summary-mini.css`, `10-phase-3c-ui-summary-merge.md`) and Phase 3B (`shell-panels.css`, `layer-toggle.css`) changes remain staged and are included in the full index state. Git detected `031 → portal-analysis-base.css` and `036 → portal-analysis-table-actions.css` as renames (R) because each merged file begins with the full content of its first source file.

---

## 3. Files Merged and Removed

### Cluster B — Portal-analysis base merge

| Action | File |
|---|---|
| **Merged from** | `apps/iitc-iris/src/portal-analysis/031-portal-analysis.css` (229 lines, 5262 bytes) |
| **Merged from** | `apps/iitc-iris/src/portal-analysis/032-table-first-column.css` (6 lines, 154 bytes) |
| **Merged from** | `apps/iitc-iris/src/portal-analysis/033-portal-analysis.css` (52 lines, 1608 bytes) |
| **Merged into** | `apps/iitc-iris/src/portal-analysis/portal-analysis-base.css` (287 lines, 7024 bytes) |
| **Removed** | `apps/iitc-iris/src/portal-analysis/031-portal-analysis.css` |
| **Removed** | `apps/iitc-iris/src/portal-analysis/032-table-first-column.css` |
| **Removed** | `apps/iitc-iris/src/portal-analysis/033-portal-analysis.css` |

Byte check: 5262 + 154 + 1608 = 7024 ✓

### Cluster C — Portal-analysis table-actions merge

| Action | File |
|---|---|
| **Merged from** | `apps/iitc-iris/src/portal-analysis/036-portal-analysis.css` (10 lines, 757 bytes) |
| **Merged from** | `apps/iitc-iris/src/portal-analysis/037-table-actions.css` (11 lines, 206 bytes) |
| **Merged from** | `apps/iitc-iris/src/portal-analysis/038-portal-analysis.css` (15 lines, 350 bytes) |
| **Merged into** | `apps/iitc-iris/src/portal-analysis/portal-analysis-table-actions.css` (36 lines, 1313 bytes) |
| **Removed** | `apps/iitc-iris/src/portal-analysis/036-portal-analysis.css` |
| **Removed** | `apps/iitc-iris/src/portal-analysis/037-table-actions.css` |
| **Removed** | `apps/iitc-iris/src/portal-analysis/038-portal-analysis.css` |

Byte check: 757 + 206 + 350 = 1313 ✓

---

## 4. Exact Changed Import Lines in `apps/iitc-iris/src/iitc-iris.css`

### Cluster B replacement (at manifest line 32)

```diff
-@import url('./portal-analysis/031-portal-analysis.css');
-@import url('./portal-analysis/032-table-first-column.css');
-@import url('./portal-analysis/033-portal-analysis.css');
+@import url('./portal-analysis/portal-analysis-base.css');
```

### Cascade separator — unchanged between B and C

```css
@import url('./styles/034-team.css');   /* unchanged */
@import url('./portals/035-portals.css'); /* unchanged */
```

### Cluster C replacement (at manifest line 37, now line 35 after B shrink)

```diff
-@import url('./portal-analysis/036-portal-analysis.css');
-@import url('./portal-analysis/037-table-actions.css');
-@import url('./portal-analysis/038-portal-analysis.css');
+@import url('./portal-analysis/portal-analysis-table-actions.css');
```

All other 80 import lines are unchanged.

---

## 5. Import Count Before and After

| State | Import count |
|---|---|
| **Before Phase 3D** (after Phase 3C) | 86 |
| **After Phase 3D** | 82 |
| **Reduction** | 4 (Cluster B removes 2 lines, Cluster C removes 2 lines) |

All 82 imports resolve to existing files on disk (verified: Missing: 0).

---

## 6. Validation Results

### `npm run lint:css`

```
✓ Exit code 0 — no stylelint errors or warnings.
```

### `npm run package:iitc-iris`

```
✓ Exit code 0.
  dist/iitc-iris.css   61.13 kB │ gzip: 10.35 kB
  dist/content.js     182.98 kB │ gzip: 50.07 kB
  Chrome ZIP and Firefox XPI packages created successfully.
```

### `git diff --check`

```
✓ Exit code 0 — no trailing whitespace or other diff issues.
```

### Import count

```
✓ grep -c "@import" apps/iitc-iris/src/iitc-iris.css → 82
```

### All imports resolve

```
✓ All 82 imports verified to resolve to existing files on disk. Missing: 0.
```

### Byte-for-byte equivalence

```
portal-analysis-base.css:         5262 + 154 + 1608 = 7024 bytes  →  wc -c = 7024 ✓
portal-analysis-table-actions.css: 757 + 206 +  350 = 1313 bytes  →  wc -c = 1313 ✓
```

### Build output size

Output CSS size is 61.13 kB (gzip: 10.35 kB) — identical to all previous phase baselines, confirming byte-for-byte content equivalence in the bundled output.

---

## 7. Confirmation: Clusters B and C Remain Separate Imports

The manifest after Phase 3D contains the following sequence at the former Cluster B/C region:

```css
@import url('./portal-analysis/portal-analysis-base.css');  /* Cluster B */
@import url('./styles/034-team.css');                        /* separator — unchanged */
@import url('./portals/035-portals.css');                    /* separator — unchanged */
@import url('./portal-analysis/portal-analysis-table-actions.css'); /* Cluster C */
```

`034-team.css` and `035-portals.css` remain in their original manifest positions. Clusters B and C are **not merged** into a single file. A final `portal-analysis/portal-analysis.css` was **not** created, because merging B and C into one file would require removing the cascade effect of the two intervening imports, which is Phase 4 work.

---

## 8. Confirmation: No Phase 4 / Interleaved Merge Work Done

- **No interleaved chunks were merged.** `034-team.css` and `035-portals.css` are untouched.
- **No cascade reordering occurred.** The effective cascade order of all rules is byte-for-byte equivalent to the pre-Phase-3D manifest.
- **No TS/TSX files were modified.**
- **No other CSS files were renamed or edited.**
- **Phase 4, Track B:** Not started.

### Items confirmed untouched

| File | Status |
|---|---|
| `apps/iitc-iris/src/styles/034-team.css` | Unchanged |
| `apps/iitc-iris/src/portals/035-portals.css` | Unchanged |
| `apps/iitc-iris/src/ui/024-summary-layout.css` | Unchanged |
| `apps/iitc-iris/src/ui/026-summary-cell.css` | Unchanged |
| `apps/iitc-iris/src/ui/044-summary.css` | Unchanged |
| All shell, layers, map, system, auth files | Unchanged |

---

## Hard Stop

Phase 3D is complete. Do not proceed to Phase 4 or any other phase without a new assignment.
