# IITC IRIS CSS Pretty Architecture — Track B Spike 5: Split And Move `summary-mini.css`

Status: Spike 5 Complete. `ui/summary-mini.css` successfully removed from the central manifest and deleted. Its rules were cleanly split into two domain-specific stylesheets: `ui/summary-cell-label.css` (shared by `summary-cell.tsx` and `portal-details-panel.tsx`) and `portals/portal-summary-mini-track.css` (imported by `portal-details-panel.tsx`).

Reference plans:
- `docs/iitc-iris/plans/css-pretty-architecture-plan.md` (Track B)
- `docs/iitc-iris/plans/css-refactoring/18-track-b-spike-1-ui-primitive-imports.md`
- `docs/iitc-iris/plans/css-refactoring/19-track-b-spike-2-ui-component-imports.md`
- `docs/iitc-iris/plans/css-refactoring/20-track-b-spike-3-feature-css.md`
- `docs/iitc-iris/plans/css-refactoring/21-track-b-spike-4-portal-analysis-actions.md`

---

## 1. Motivation & Split Strategy

`ui/summary-mini.css` originally coupled two distinct responsibilities:
1. **Portal health mini-track indicator:** `.iitc-iris-summary-mini-track` and `.iitc-iris-summary-mini-track > span`, used exclusively by `portal-details-panel.tsx`.
2. **Summary label typography:** `.iitc-iris-summary-cell small` and `.iitc-iris-portal-summary-cell small`, shared across generic `summary-cell.tsx` and portal-specific cells in `portal-details-panel.tsx`.

Moving `summary-mini.css` as a whole to a single component would create hidden cross-component CSS dependencies. Splitting the stylesheet decouples the health bar styles from label typography.

---

## 2. Implementation Details

### A. New Stylesheets Created
1. [`apps/iitc-iris/src/ui/summary-cell-label.css`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/summary-cell-label.css):
   ```css
   .iitc-iris-summary-cell small,
   .iitc-iris-portal-summary-cell small {
       overflow: hidden;
       color: #91a6b7;
       font-size: var(--iitc-iris-text-sm);
       text-overflow: ellipsis;
       white-space: nowrap;
   }
   ```
2. [`apps/iitc-iris/src/portals/portal-summary-mini-track.css`](file:///Users/jula/ittca/apps/iitc-iris/src/portals/portal-summary-mini-track.css):
   ```css
   .iitc-iris-summary-mini-track {
       position: relative;
       height: 3px;
       overflow: hidden;
       border-radius: 3px;
       background: rgb(128 150 165 / 18%);
   }

   .iitc-iris-summary-mini-track > span {
       position: absolute;
       inset: 0 auto 0 0;
       border-radius: inherit;
       background: var(--portal-team-color);
   }
   ```

### B. Component-Local Imports Added
- [`apps/iitc-iris/src/ui/summary-cell.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/ui/summary-cell.tsx#L2):
  `import './summary-cell-label.css';`
- [`apps/iitc-iris/src/portals/portal-details-panel.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/portals/portal-details-panel.tsx#L13-L14):
  `import '../ui/summary-cell-label.css';`
  `import './portal-summary-mini-track.css';`

### C. Central Manifest & File Cleanup
- Removed `@import url('./ui/summary-mini.css');` from [`apps/iitc-iris/src/iitc-iris.css`](file:///Users/jula/ittca/apps/iitc-iris/src/iitc-iris.css).
- Deleted `apps/iitc-iris/src/ui/summary-mini.css` (all rules migrated, zero remaining references).

---

## 3. Scope Exclusions Preserved

The following remained completely untouched:
- Numbered chunk files (`024-summary-layout.css`, `026-summary-cell.css`, etc.)
- `portal-analysis-base.css` and `styles/mobile-sheet-analysis.css`
- `ui/badge.css` and `ui/status-text.css` (central cascade preservation)
- `shell/*.css` and `layers/*.css`

---

## 4. Manifest Diff (`apps/iitc-iris/src/iitc-iris.css`)

```diff
@@ -23,7 +23,6 @@
 @import url('./ui/024-summary-layout.css');
 @import url('./ui/026-summary-cell.css');
 @import url('./portals/027-portals.css');
-@import url('./ui/summary-mini.css');
 @import url('./portals/030-portals.css');
 @import url('./portal-analysis/portal-analysis-base.css');
 @import url('./styles/034-team.css');
```

---

## 5. Import Counts Summary

| Metric | Pre-Spike 5 (Post-Spike 4) | Post-Spike 5 | Delta |
|---|---|---|---|
| **Total Imports in `iitc-iris.css`** | 76 | **75** | -1 |
| **Numbered Chunk Imports** | 65 | **65** | 0 |
| **Pretty Imports in `iitc-iris.css`** | 11 | **10** | -1 |
| **Component-Local CSS Stylesheets** | 7 | **9** (`clear-button`, `empty-state`, `diagnostics-chip`, `chip-button`, `segmented-button`, `draw-tools`, `portal-analysis-table-actions`, `summary-cell-label`, `portal-summary-mini-track`) | +2 |
| **Missing Manifest Imports** | 0 | **0** | 0 |

---

## 6. Cascade & Deduplication Verification

Verified across built output `dist/iitc-iris.css` (61.22 kB):

### A. Specificity Proof: Analysis Grid Labels
- **Analysis grid rule (`portal-analysis-base.css`):**
  `.iitc-iris-analysis-summary-grid .iitc-iris-summary-cell small`
  - Specificity: **(0, 2, 1)** (two class selectors + one element selector)
  - Byte position: 17,986
  - Sets: `font-weight: var(--iitc-iris-font-extrabold); text-transform: uppercase;`
- **Base summary label rule (`summary-cell-label.css`):**
  `.iitc-iris-summary-cell small, .iitc-iris-portal-summary-cell small`
  - Specificity: **(0, 1, 1)** (one class selector + one element selector)
  - Byte position: 54,781
  - Sets: `overflow: hidden; color: #91a6b7; font-size: var(--iitc-iris-text-sm); text-overflow: ellipsis; white-space: nowrap;`
- **Specificity Verdict:** (0, 2, 1) > (0, 1, 1) ✅ The analysis grid styling wins unconditionally by specificity regardless of position in the bundle.

### B. Output Deduplication
- `.iitc-iris-summary-cell small, .iitc-iris-portal-summary-cell small`: appears **exactly once** (byte 54,781) despite being imported by both `summary-cell.tsx` and `portal-details-panel.tsx`.
- `.iitc-iris-summary-mini-track`: appears **exactly once** (byte 54,955).
- `.iitc-iris-summary-mini-track > span`: appears **exactly once** (byte 55,069).

---

## 7. Validation Results

| Command | Status | Notes |
|---|---|---|
| `npm run lint:css` | **PASS** | Exit code 0, clean Stylelint |
| `npm run typecheck:iitc-iris` | **PASS** | Exit code 0, clean TypeScript check |
| `npm run lint:iitc-iris` | **PASS** | Exit code 0, clean ESLint check |
| `npm run test:iitc-iris` | **PASS** | Exit code 0 (60 files, 346 tests passed) |
| `npm run package:iitc-iris` | **PASS** | Exit code 0 (Chrome ZIP + Firefox XPI created) |
| `git diff --check` | **PASS** | Exit code 0, zero whitespace defects |

---

## 8. Hard Stop

Track B Spike 5 is complete. `ui/summary-mini.css` has been cleanly split and eliminated from the central manifest. No numbered CSS, shell CSS, or other manifest files were touched.
