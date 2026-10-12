# IITC IRIS CSS Pretty Architecture — Track B Spike 3: Feature CSS Move & Audit

Status: Spike 3 Complete. `draw-tools.css` moved to component-local import in `draw-tools-panel.tsx`. Candidate feature stylesheets audited and preserved in the central manifest due to shared usage, composition, and mobile responsive cascade overrides.

Reference plans:
- `docs/iitc-iris/plans/css-pretty-architecture-plan.md` (Track B)
- `docs/iitc-iris/plans/css-refactoring/18-track-b-spike-1-ui-primitive-imports.md`
- `docs/iitc-iris/plans/css-refactoring/19-track-b-spike-2-ui-component-imports.md`

---

## 1. Feature Candidate Under Move: `draw-tools.css`

### Implementation
- **Removed from manifest:** `@import url('./draw-tools/draw-tools.css');` removed from [`apps/iitc-iris/src/iitc-iris.css`](file:///Users/jula/ittca/apps/iitc-iris/src/iitc-iris.css).
- **Added to owning component:** `import './draw-tools.css';` added to [`apps/iitc-iris/src/draw-tools/draw-tools-panel.tsx`](file:///Users/jula/ittca/apps/iitc-iris/src/draw-tools/draw-tools-panel.tsx).

### Cross-Runtime Verification: `page-map-runtime.ts` Usage of `.iitc-iris-draw-tools-marker`
- **Finding:** `.iitc-iris-draw-tools-marker` is used in [`apps/iitc-iris/src/page-map-runtime.ts`](file:///Users/jula/ittca/apps/iitc-iris/src/page-map-runtime.ts#L1285) (`createIitcDrawToolsMarkerIcon()`) for Leaflet DivIcons on the map.
- **Safety Proof:**
  1. `draw-tools-panel.tsx` is statically imported by `src/map/map-controls-panel-container.tsx` (`IitcIrisDrawToolsPanel`).
  2. `map-controls-panel-container.tsx` is statically imported by `src/content.tsx` (`IitcIrisMapControlsPanelContainer`).
  3. `content.tsx` is the primary entry point for `content.js` and `iitc-iris.css`.
  4. The browser extension manifest (`manifest.json`) injects `dist/iitc-iris.css` into the Intel Ingress page context (`*://intel.ingress.com/*`).
  5. Both `content.js` (UI rendering) and `page-map-runtime.js` (map markers) share the exact same DOM and stylesheet context on the page.
  6. Therefore, `draw-tools.css` is bundled into `dist/iitc-iris.css` and injected onto the page whenever IITC IRIS is loaded, guaranteeing the marker styles are available when `page-map-runtime.ts` renders markers.
  7. Furthermore, `draw-tools-panel.tsx` is an integral tab within map controls and is always loaded whenever draw tools are available.

---

## 2. Audit of Nearby Feature Candidates (Preserved in Manifest)

The remaining feature and layout stylesheets in `iitc-iris.css` were audited and intentionally kept in the central manifest:

### A. `layers/layer-toggle.css` (Do Not Move)
- **Root selectors:** `.iitc-iris-layer-toggle`, `.iitc-iris-layer-toggle-active`
- **Ownership:** Shared across layers (`src/layers/layers-panel.tsx`) and system controls (`src/system/system-controls-panel.tsx`, `src/system/system-diagnostics-panel.tsx`). No single owning component.
- **Cascade Risk:** It composes with later numbered rules (e.g. `084-layers.css`, `086-layers.css`).
- **Decision:** **RETAINED IN MANIFEST**. Not a component-isolated stylesheet.

### B. `portal-analysis/portal-analysis-base.css` & `portal-analysis-table-actions.css` (Do Not Move)
- **Root selectors:** `.iitc-iris-portal-analysis-table`, action row selectors
- **Cascade Risk:** `styles/mobile-sheet-analysis.css` (line 67 of `iitc-iris.css`) contains explicit mobile media query overrides for `.iitc-iris-portal-analysis-table` (e.g. padding, scroll, layout).
- **Hazard:** Moving `portal-analysis` CSS to component-local imports causes it to bundle at the tail (>56k bytes), *after* `styles/mobile-sheet-analysis.css`. This risks overriding mobile responsive rules on narrow viewport layouts.
- **Decision:** **RETAINED IN MANIFEST**. Preserves desktop-then-mobile responsive cascade order.

### C. `shell/shell.css` & `shell/shell-panels.css` (Do Not Move)
- **Role:** Foundational global layout, shell root placement, dock container sizing, and sheet loading-model styling (`.iitc-iris-shell`, `.iitc-iris-sheet`, dock panels).
- **Decision:** **RETAINED IN MANIFEST**. Shell CSS is global architecture, not component-local UI styling.

### D. `ui/badge.css` & `ui/status-text.css` (Preserved Exclusions)
- **`badge.css`:** Retained in manifest (Spike 1 decision; composes with specialized badges).
- **`status-text.css`:** Retained in manifest (Spike 2 correction; composes with caller warning/compare styling).

---

## 3. Manifest Diff (`apps/iitc-iris/src/iitc-iris.css`)

```diff
@@ -74,6 +74,5 @@
 @import url('./layers/086-layers.css');
 @import url('./missions/087-missions.css');
 @import url('./map/088-player-tracker.css');
-@import url('./draw-tools/draw-tools.css');
 @import url('./map/090-player-tracker.css');
```

---

## 4. Component Diff (`apps/iitc-iris/src/draw-tools/draw-tools-panel.tsx`)

```diff
@@ -1,6 +1,7 @@
 import {StatusText} from '../ui/status-text';
 import {h} from 'preact';
 import {useState} from 'preact/hooks';
+import './draw-tools.css';
 import {
   DRAW_TOOLS_DEFAULT_COLOR,
   DRAW_TOOLS_MARKER_PRESETS,
```

---

## 5. Import Counts Summary

| Metric | Pre-Spike 3 (Post-Spike 2) | Post-Spike 3 | Delta |
|---|---|---|---|
| **Total Imports in `iitc-iris.css`** | 77 | **76** | -1 |
| **Numbered Chunk Imports** | 65 | **65** | 0 |
| **Pretty Imports in `iitc-iris.css`** | 12 | **11** | -1 |
| **Component-Local CSS Stylesheets** | 5 | **6** (`clear-button`, `empty-state`, `diagnostics-chip`, `chip-button`, `segmented-button`, `draw-tools`) | +1 |
| **Missing Manifest Imports** | 0 | **0** | 0 |

---

## 6. CSS Output & Cascade Order Observations

Built CSS bundle: `dist/iitc-iris.css` (61.13 kB / 61,134 bytes).

### Selector Position & Deduplication Check

| Selector | Byte Position in `dist/iitc-iris.css` | Rule Count in Output |
|---|---|---|
| `.iitc-iris-draw-tools-marker{` | 56,305 | **1** (single instance) |
| `.iitc-iris-draw-tools-marker svg{` | 56,377 | **1** (single instance) |
| `.iitc-iris-draw-tools-list{` | 57,060 | **1** (single instance) |
| `.iitc-iris-draw-tools-level-chip` | 59,193 | **2** (selector + chip rule) |
| `.iitc-iris-draw-tools-team-chip` | 59,226 | **2** (selector + chip rule) |
| `.iitc-iris-draw-tools-import-merge{` | 60,509 | **1** (single instance) |

### Key Cascade Relations
- `.iitc-iris-badge` (position 1,770) appears well before `.iitc-iris-draw-tools-level-chip` (position 59,193) ✅.
- `draw-tools.css` was already positioned near the end of `iitc-iris.css` (at line 77 of 79, before `090-player-tracker.css`). Moving it to the tail does not alter its cascade relationship with other feature panels.

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

Track B Spike 3 is complete. Only `draw-tools.css` was moved. No other feature CSS, numbered CSS, badge CSS, status-text CSS, summary CSS, or panel CSS was touched.
