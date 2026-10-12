# IITC IRIS CSS Pretty Architecture — Track B Spike 4: Split Portal Analysis Table Actions Safely

Status: Spike 4 Complete. `portal-analysis-table-actions.css` safely split. The cascade-sensitive `.iitc-iris-portal-list-title button` reset rule remains central in `portal-list-title-reset.css` before `portals/039-portals.css`. Level cell styles, `.iitc-iris-table-sort`, and `.iitc-iris-table-action` were moved to component-local imports in `portal-counts-panel.tsx` and `portals-list-panel.tsx`.

Reference plans:
- `docs/iitc-iris/plans/css-pretty-architecture-plan.md` (Track B)
- `docs/iitc-iris/plans/css-refactoring/18-track-b-spike-1-ui-primitive-imports.md`
- `docs/iitc-iris/plans/css-refactoring/19-track-b-spike-2-ui-component-imports.md`
- `docs/iitc-iris/plans/css-refactoring/20-track-b-spike-3-feature-css.md`

---

## 1. Context & Motivation

A naive move of `portal-analysis-table-actions.css` to a component-local import would break the cascade.

### Cascade Collision Analysis
- `portal-analysis-table-actions.css` defined:
  ```css
  .iitc-iris-portal-list-title button {
      min-width: 0;
      padding: 0;
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
  }
  ```
- Subsequent manifest stylesheet `portals/039-portals.css` styles that exact same selector at equal specificity (0, 1, 1):
  ```css
  .iitc-iris-portal-list-title button {
      overflow: hidden;
      max-width: 220px;
      color: color-mix(in srgb, var(--portal-team-color) 46%, #e8f4ff);
      font-weight: 800;
      text-align: left;
      text-overflow: ellipsis;
      white-space: nowrap;
  }
  ```
- In the original cascade, the reset executed first, and `039-portals.css` overrode `color` and `font-weight`.
- Moving the reset rule to the bundle tail (>56k bytes) would invert this precedence, overriding the team color and font-weight with `color: inherit; font: inherit`.

---

## 2. Split Strategy & Implementation

### A. Central Reset Preservation
1. Created [`apps/iitc-iris/src/portal-analysis/portal-list-title-reset.css`](file:///Users/jula/ittca/apps/iitc-iris/src/portal-analysis/portal-list-title-reset.css) containing strictly the title button reset:
   ```css
   .iitc-iris-portal-list-title button {
       min-width: 0;
       padding: 0;
       border: 0;
       background: transparent;
       color: inherit;
       font: inherit;
   }
   ```
2. Replaced the manifest import in [`apps/iitc-iris/src/iitc-iris.css`](file:///Users/jula/ittca/apps/iitc-iris/src/iitc-iris.css#L31) to import `./portal-analysis/portal-list-title-reset.css` at the exact same cascade slot immediately preceding `./portals/039-portals.css`.

### B. Pruned Local Stylesheet
Pruned [`apps/iitc-iris/src/portal-analysis/portal-analysis-table-actions.css`](file:///Users/jula/ittca/apps/iitc-iris/src/portal-analysis/portal-analysis-table-actions.css) to only contain:
- `.iitc-iris-portal-analysis .iitc-iris-level-0` through `.level-8`
- `.iitc-iris-table-sort`
- `.iitc-iris-table-action`

### C. Component-Local Imports Added
Imported `portal-analysis-table-actions.css` in every component that emits these classes:
1. [`apps/iitc-iris/src/portal-analysis/portal-counts-panel.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/portal-analysis/portal-counts-panel.tsx): emits `.iitc-iris-level-${level.level}` cells.
2. [`apps/iitc-iris/src/portal-analysis/portals-list-panel.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/portal-analysis/portals-list-panel.tsx): emits level cells, `.iitc-iris-table-sort`, and `.iitc-iris-table-action`.

Bundler deduplication verified: only one copy of each rule is emitted in `dist/iitc-iris.css`.

---

## 3. Explicit Exclusions Kept Central

The following stylesheets were untouched:
- `portal-analysis-base.css`: desktop layout with mobile overrides in `styles/mobile-sheet-analysis.css`.
- `styles/mobile-sheet-analysis.css`: media-query mobile sheet overrides.
- `shell/*.css`: global shell and layout docking architecture.
- `layers/layer-toggle.css`: shared across `src/layers/layers-panel.tsx` and `src/system/system-controls-panel.tsx` / `system-diagnostics-panel.tsx`. Composes with later `.iitc-iris-layer-toggle-active` rules in `084-layers.css` and `086-layers.css`.
- `badge.css`: composes with specialized badges.
- `status-text.css`: composes with caller warning/compare styling.
- All numbered CSS files.

---

## 4. Manifest Diff (`apps/iitc-iris/src/iitc-iris.css`)

```diff
@@ -28,7 +28,7 @@
 @import url('./portal-analysis/portal-analysis-base.css');
 @import url('./styles/034-team.css');
 @import url('./portals/035-portals.css');
-@import url('./portal-analysis/portal-analysis-table-actions.css');
+@import url('./portal-analysis/portal-list-title-reset.css');
 @import url('./portals/039-portals.css');
 @import url('./missions/040-missions.css');
 @import url('./portals/041-portals.css');
```

---

## 5. Import Counts Summary

| Metric | Pre-Spike 4 (Post-Spike 3) | Post-Spike 4 | Delta |
|---|---|---|---|
| **Total Imports in `iitc-iris.css`** | 76 | **76** | 0 (replaced actions with reset) |
| **Numbered Chunk Imports** | 65 | **65** | 0 |
| **Pretty Imports in `iitc-iris.css`** | 11 | **11** | 0 |
| **Component-Local CSS Stylesheets** | 6 | **7** (`clear-button`, `empty-state`, `diagnostics-chip`, `chip-button`, `segmented-button`, `draw-tools`, `portal-analysis-table-actions`) | +1 |
| **Missing Manifest Imports** | 0 | **0** | 0 |

---

## 6. Cascade Order & Deduplication Verification

Verified across the bundled output `dist/iitc-iris.css` (61.22 kB):

### Cascade Order for `.iitc-iris-portal-list-title button`
1. **Byte 23,649:**
   ```css
   .iitc-iris-portal-list-title button{min-width:0;padding:0;border:0;background:transparent;color:inherit;font:inherit}
   ```
   *(from `portal-list-title-reset.css`)*
2. **Byte 23,766:**
   ```css
   .iitc-iris-portal-list-title button{overflow:hidden;max-width:220px;color:color-mix(in srgb,var(--portal-team-color) 46%, #e8f4ff);font-weight:800;text-align:left;text-overflow:ellipsis;white-space:nowrap}
   ```
   *(from `portals/039-portals.css`)*

**Verdict:** 23,649 < 23,766. Reset executes before the richer rule; the team color and font-weight remain intact.

### Rule Deduplication in Output
- `.iitc-iris-portal-analysis .iitc-iris-level-8`: count **1** (byte 59,654)
- `.iitc-iris-portal-analysis .iitc-iris-level-0`: count **1** (byte 60,262)
- `.iitc-iris-table-sort, .iitc-iris-table-action`: count **1** (byte 60,338)
- `.iitc-iris-table-sort`: count **1** (byte 60,422)
- `.iitc-iris-table-action`: count **1** (byte 60,479)

---

## 7. Validation Results

| Command | Status | Notes |
|---|---|---|
| `npm run lint:css` | **PASS** | Exit code 0, clean Stylelint |
| `npm run typecheck:iitc-iris` | **PASS** | Exit code 0, clean TypeScript check |
| `npm run lint:iitc-iris` | **PASS** | Exit code 0, clean ESLint check |
| `npm run test:iitc-iris` | **PASS** | Exit code 0 (60 files, 346 tests passed) |
| `npm run package:iitc-iris` | **PASS** | Exit code 0 (Chrome ZIP + Firefox XPI created) |
| `git diff --check` | **PASS** | Exit code 0, clean whitespace |

---

## 8. Hard Stop

Track B Spike 4 is complete. Only `portal-analysis-table-actions.css` was split and moved component-locally. All other feature, shell, and manifest stylesheets remain in their established positions.
