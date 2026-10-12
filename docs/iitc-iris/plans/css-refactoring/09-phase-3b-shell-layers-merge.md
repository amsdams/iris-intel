# IITC IRIS CSS Pretty Architecture Phase 3B — Shell and Layers Adjacent Merge

Status: Implemented. Cluster D (shell 071/072/073) and Cluster E (layers 081/082) merged.

Reference plans:
- `docs/iitc-iris/plans/css-pretty-architecture-plan.md` (Phase 3)
- `docs/iitc-iris/plans/css-refactoring/06-pretty-architecture-baseline.md`
- `docs/iitc-iris/plans/css-refactoring/07-phase-2-renames.md`
- `docs/iitc-iris/plans/css-refactoring/08-phase-3-adjacent-merge-targets.md`

---

## 1. Current Commit Hash (pre-Phase-3B)

`56df96b6160c1a2fd5e2bfa9daaf647076593ddf`

---

## 2. `git status --short` (after Phase 3B changes)

```text
 M apps/iitc-iris/src/iitc-iris.css
 D apps/iitc-iris/src/layers/081-layers.css
 D apps/iitc-iris/src/layers/082-toggle-width.css
 D apps/iitc-iris/src/shell/071-shell.css
 D apps/iitc-iris/src/shell/072-sheet-panel-placement.css
 D apps/iitc-iris/src/shell/073-shell.css
 M docs/iitc-iris/plans/css-refactoring/08-phase-3-adjacent-merge-targets.md
?? apps/iitc-iris/src/layers/layer-toggle.css
?? apps/iitc-iris/src/shell/shell-panels.css
?? docs/iitc-iris/plans/css-refactoring/09-phase-3b-shell-layers-merge.md
```

> Note: `08-phase-3-adjacent-merge-targets.md` was already modified before this phase began (pre-existing working tree state).

---

## 3. Files Merged and Removed

### Cluster D — Shell panels merge

| Action | File |
|---|---|
| **Merged from** | `apps/iitc-iris/src/shell/071-shell.css` (103 lines, 2232 bytes) |
| **Merged from** | `apps/iitc-iris/src/shell/072-sheet-panel-placement.css` (16 lines, 354 bytes) |
| **Merged from** | `apps/iitc-iris/src/shell/073-shell.css` (29 lines, 1261 bytes) |
| **Merged into** | `apps/iitc-iris/src/shell/shell-panels.css` (148 lines, 3847 bytes) |
| **Removed** | `apps/iitc-iris/src/shell/071-shell.css` |
| **Removed** | `apps/iitc-iris/src/shell/072-sheet-panel-placement.css` |
| **Removed** | `apps/iitc-iris/src/shell/073-shell.css` |

### Cluster E — Layer toggle merge

| Action | File |
|---|---|
| **Merged from** | `apps/iitc-iris/src/layers/081-layers.css` (10 lines, 241 bytes) |
| **Merged from** | `apps/iitc-iris/src/layers/082-toggle-width.css` (7 lines, 121 bytes) |
| **Merged into** | `apps/iitc-iris/src/layers/layer-toggle.css` (17 lines, 362 bytes) |
| **Removed** | `apps/iitc-iris/src/layers/081-layers.css` |
| **Removed** | `apps/iitc-iris/src/layers/082-toggle-width.css` |

---

## 4. Exact Changed Import Lines in `apps/iitc-iris/src/iitc-iris.css`

### Cluster D replacement (at manifest line 72)

```diff
-@import url('./shell/071-shell.css');
-@import url('./shell/072-sheet-panel-placement.css');
-@import url('./shell/073-shell.css');
+@import url('./shell/shell-panels.css');
```

### Cluster E replacement (at manifest line 82, now line 80 after D shrink)

```diff
-@import url('./layers/081-layers.css');
-@import url('./layers/082-toggle-width.css');
+@import url('./layers/layer-toggle.css');
```

All other 85 import lines are unchanged. The comment line on line 1 is unchanged.

---

## 5. Import Count Before and After

| State | Import count |
|---|---|
| **Before Phase 3B** | 90 |
| **After Phase 3B** | 87 |
| **Reduction** | 3 (Cluster D removes 2 lines, Cluster E removes 1 line) |

All 87 imports resolve to existing files on disk (verified by shell check).

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
✓ grep -c "@import" apps/iitc-iris/src/iitc-iris.css → 87
```

### All imports resolve

```
✓ All 87 imports verified to resolve to existing files on disk. 0 missing.
```

### `git diff --name-status` (vs HEAD)

```
M   apps/iitc-iris/src/iitc-iris.css
D   apps/iitc-iris/src/layers/081-layers.css
D   apps/iitc-iris/src/layers/082-toggle-width.css
D   apps/iitc-iris/src/shell/071-shell.css
D   apps/iitc-iris/src/shell/072-sheet-panel-placement.css
D   apps/iitc-iris/src/shell/073-shell.css
M   docs/iitc-iris/plans/css-refactoring/08-phase-3-adjacent-merge-targets.md
?? apps/iitc-iris/src/layers/layer-toggle.css
?? apps/iitc-iris/src/shell/shell-panels.css
?? docs/iitc-iris/plans/css-refactoring/09-phase-3b-shell-layers-merge.md
```

This matches the expected scope: only shell 071/072/073 replaced by `shell-panels.css`, layers 081/082 replaced by `layer-toggle.css`, `iitc-iris.css` modified, and the Phase 3B doc created. The `08-phase-3-adjacent-merge-targets.md` modification was pre-existing before this phase.

---

## 7. Confirmation: No UI Summary or Portal-Analysis Merges Performed

- **Cluster A** (`ui/028-summary.css` + `ui/029-summary-cell-text.css` → `ui/summary-mini.css`): **NOT merged in this phase.**
- **Cluster B** (`portal-analysis/031` + `032` + `033` → `portal-analysis-base.css`): **NOT merged in this phase.**
- **Cluster C** (`portal-analysis/036` + `037` + `038` → `portal-analysis-table-actions.css`): **NOT merged in this phase.**
- **Phase 4 cascade analysis**: Not performed. Not started.
- **No TS/TSX files were modified.**
- **No selectors, declarations, or cascade order were altered.**

---

## 8. Concerns and Follow-Up Notes

### Cascade safety

Both merges are cascade-safe:
- Cluster D: three directly adjacent files with no foreign imports between them. Content (tab-bar, sheet-layer placement, sheet-layer overrides) is thematically tight.
- Cluster E: two directly adjacent small files. Content (layer toggle base and min-width rules) is thematically identical.
- The merged file takes the manifest position of the first file in each cluster; no cascade reordering occurred.

### Name reservation

- `shell/shell.css` remains reserved for `003-shell.css` when it is eventually renamed in a future phase. `shell-panels.css` deliberately avoids that name.
- `layers/layers.css` remains reserved for the full layers consolidation (requires Phase 4 for `084` and `086` which are interleaved). `layer-toggle.css` deliberately avoids that name.

### Pre-existing working tree state

The `docs/iitc-iris/plans/css-refactoring/08-phase-3-adjacent-merge-targets.md` file had a pre-existing uncommitted modification before Phase 3B began. It is not part of this phase's changes.

### Build output size

Output CSS size is 61.13 kB (gzip: 10.35 kB), unchanged from Phase 2 baseline — confirming byte-for-byte content equivalence in the bundled output.

### Deferred (not in scope)

- Clusters A, B, C: deferred per assignment scope.
- Phase 3C, Phase 4, Phase 5, Phase 6: not started.
- Track B (component-local CSS imports): not started.

---

## Hard Stop

Phase 3B is complete. Do not proceed to Phase 3C, Phase 4, or any other phase without a new assignment.
