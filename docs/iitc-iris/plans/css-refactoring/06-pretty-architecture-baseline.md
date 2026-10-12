# IITC IRIS CSS Pretty Architecture Baseline and Classification (Phase 0 & Phase 1)

Status: Phase 0 and Phase 1 complete. Baseline established and 90 numbered CSS chunks classified by merge safety.

Reference Plan: `docs/iitc-iris/plans/css-pretty-architecture-plan.md`

---

## 1. Current Git Commit and Working Tree Status

- **Current git commit:** `6ba7d9e921b14a61cddbf91878f03f6772374581`
- **Working tree status (`git status --short`):**
```text
?? docs/iitc-iris/plans/css-refactoring/06-pretty-architecture-baseline.md
```

---

## 2. Full Current Import List from `apps/iitc-iris/src/iitc-iris.css`

Below is the complete, ordered list of all 90 `@import url(...)` statements from `apps/iitc-iris/src/iitc-iris.css`:

```css
/* IITC IRIS CSS entry point. Ordered imports preserve the original monolithic cascade. */
@import url('./styles/001-globals.css');
@import url('./ui/002-ui.css');
@import url('./shell/003-shell.css');
@import url('./map/004-map.css');
@import url('./ui/005-badge.css');
@import url('./search/006-search.css');
@import url('./ui/007-ui.css');
@import url('./search/008-search.css');
@import url('./ui/009-ui.css');
@import url('./search/010-search.css');
@import url('./map/011-map.css');
@import url('./system/012-system.css');
@import url('./map/013-map.css');
@import url('./ui/014-segmented-button.css');
@import url('./system/015-innerstatus.css');
@import url('./ui/016-clear-button.css');
@import url('./auth/017-auth.css');
@import url('./ui/018-status-text.css');
@import url('./portals/019-portals.css');
@import url('./styles/020-team.css');
@import url('./portals/021-portals.css');
@import url('./side-panels/022-side-panels.css');
@import url('./portals/023-portals.css');
@import url('./ui/024-summary-layout.css');
@import url('./ui/025-chip-button.css');
@import url('./ui/026-summary-cell.css');
@import url('./portals/027-portals.css');
@import url('./ui/028-summary.css');
@import url('./ui/029-summary-cell-text.css');
@import url('./portals/030-portals.css');
@import url('./portal-analysis/031-portal-analysis.css');
@import url('./portal-analysis/032-table-first-column.css');
@import url('./portal-analysis/033-portal-analysis.css');
@import url('./styles/034-team.css');
@import url('./portals/035-portals.css');
@import url('./portal-analysis/036-portal-analysis.css');
@import url('./portal-analysis/037-table-actions.css');
@import url('./portal-analysis/038-portal-analysis.css');
@import url('./portals/039-portals.css');
@import url('./missions/040-missions.css');
@import url('./portals/041-portals.css');
@import url('./system/042-system.css');
@import url('./portals/043-portals.css');
@import url('./ui/044-summary.css');
@import url('./portals/045-portals.css');
@import url('./ui/046-ui.css');
@import url('./portals/047-portals.css');
@import url('./ui/048-panel.css');
@import url('./map/049-map.css');
@import url('./ui/050-panel.css');
@import url('./map/051-map.css');
@import url('./ui/052-panel.css');
@import url('./map/053-map.css');
@import url('./ui/054-ui.css');
@import url('./side-panels/055-side-panels.css');
@import url('./comm/056-comm.css');
@import url('./side-panels/057-side-panels.css');
@import url('./map/058-map.css');
@import url('./ui/059-diagnostics-chip.css');
@import url('./missions/060-missions.css');
@import url('./comm/061-comm.css');
@import url('./system/062-system.css');
@import url('./portals/063-portals.css');
@import url('./system/064-system.css');
@import url('./ui/065-empty-state.css');
@import url('./side-panels/066-side-panels.css');
@import url('./styles/067-team.css');
@import url('./styles/068-temporary.css');
@import url('./ui/069-ui.css');
@import url('./system/070-system.css');
@import url('./shell/071-shell.css');
@import url('./shell/072-sheet-panel-placement.css');
@import url('./shell/073-shell.css');
@import url('./portals/074-portals.css');
@import url('./styles/075-temporary.css');
@import url('./system/076-system.css');
@import url('./map/077-map.css');
@import url('./system/078-system.css');
@import url('./auth/079-auth.css');
@import url('./system/080-divider.css');
@import url('./layers/081-layers.css');
@import url('./layers/082-toggle-width.css');
@import url('./map/083-map.css');
@import url('./layers/084-layers.css');
@import url('./portals/085-portals.css');
@import url('./layers/086-layers.css');
@import url('./missions/087-missions.css');
@import url('./map/088-player-tracker.css');
@import url('./draw-tools/089-draw-tools.css');
@import url('./map/090-player-tracker.css');
```

---

## 3. Current CSS Chunk File Count by Directory

| Directory | Chunk count | Purpose / Area |
|-----------|-------------|----------------|
| `apps/iitc-iris/src/auth/` | 2 | Authentication UI chunks |
| `apps/iitc-iris/src/comm/` | 2 | Comm message stream UI chunks |
| `apps/iitc-iris/src/draw-tools/` | 1 | Draw-tools layer & panel UI chunk |
| `apps/iitc-iris/src/layers/` | 4 | Layer & highlighter controls UI chunks |
| `apps/iitc-iris/src/map/` | 11 | Map controls, camera & player-tracker UI chunks |
| `apps/iitc-iris/src/missions/` | 3 | Missions panel & metrics UI chunks |
| `apps/iitc-iris/src/portal-analysis/` | 6 | Portal analysis, counts & scoreboard tables |
| `apps/iitc-iris/src/portals/` | 14 | Portal list, details & resonator cards |
| `apps/iitc-iris/src/search/` | 3 | Search input, results & dropdown UI chunks |
| `apps/iitc-iris/src/shell/` | 4 | App shell, bottom sheet & panel placement |
| `apps/iitc-iris/src/side-panels/` | 4 | Collapsible side-panel container chunks |
| `apps/iitc-iris/src/styles/` | 6 | Global CSS variables, team styles & mobile media queries |
| `apps/iitc-iris/src/system/` | 9 | Diagnostics panel, innerstatus & status divider |
| `apps/iitc-iris/src/ui/` | 21 | UI shared primitives, panels, summaries & buttons |
| **Total** | **90** | **Imported CSS chunk files** |

---

## 4. Current Remaining Temporary Chunks

Two temporary chunks remain in the project, both located under `apps/iitc-iris/src/styles/`:

1. `apps/iitc-iris/src/styles/068-temporary.css` (93 lines, 2189 bytes):
   - Broad mobile responsive `@media (width <= 760px)` block.
   - Spans selectors across dock, innerstatus, map-controls, portal-side-panel, resonator-grid, summary-grid, mission-metrics, and comm-row.
2. `apps/iitc-iris/src/styles/075-temporary.css` (84 lines, 1649 bytes):
   - Broad mobile responsive `@media (width <= 760px)` block.
   - Spans selectors across sheet-tabbar, map-controls, portal-side-panel, request-side-panel, search, map-search-badge, portal-analysis, counts-visuals, portals-list-filters, and scoreboard-table.

Both chunks are intentionally kept intact to avoid responsive cascade drift and are slated for consolidation in Phase 5.

---

## 5. Current Package CSS Output Size (`npm run package:iitc-iris`)

- **Built CSS artifact path:** `apps/iitc-iris/dist/iitc-iris.css`
- **Output size:** `61.13 kB` (`61,134` bytes)
- **Gzip size:** `10.35 kB`

---

## 6. Verification Results

| Check | Command | Result | Evidence / Notes | Status |
|---|---|---|---|---|
| CSS Lint | `npm run lint:css` | Passed | `stylelint '**/*.css'` exited with code 0. Clean; no lint violations. | PASS |
| Package Build | `npm run package:iitc-iris` | Passed | Vite production build created `dist/iitc-iris.css` (61.13 kB) and built Chrome ZIP & Firefox XPI packages. | PASS |
| Diff Hygiene | `git diff --check` | Passed | Exited with code 0. No whitespace errors or conflict markers in tree. | PASS |

---

## 7. Classification Table

### Classification Values & Rules

- **`SINGLE_CHUNK_OWNER`**: A single proposed target stylesheet/component owner that has exactly one chunk in the entire manifest, rather than necessarily an entire directory owner. Safe candidate for immediate rename in Phase 2 without changing cascade order.
- **`ADJACENT_SAME_OWNER`**: Same-owner chunks that are adjacent/contiguous in manifest import order. Safe candidate for contiguous merging in Phase 3 without interleaving foreign imports.
- **`INTERLEAVED_OWNER`**: Same-owner chunks separated by other imports in the manifest. Merging across foreign imports would alter effective cascade order; requires Phase 4 cascade analysis before any merge.
- **`RESPONSIVE_MIXED`**: Broad mobile `@media (width <= 760px)` blocks spanning multiple feature domains. Preserved intact for Phase 5 responsive consolidation.
- **`TEMPORARY_REVIEW`**: Selectors targeting page-runtime/external DOM or lacking source evidence (marked `KEEP_TEMPORARILY` in ownership map). Must be reviewed before merge.

| Current chunk | Owner | Proposed file | Merge safety | Reason |
|---------------|-------|---------------|--------------|--------|
| `apps/iitc-iris/src/styles/001-globals.css` | `styles (globals)` | `apps/iitc-iris/src/styles/globals.css` | `SINGLE_CHUNK_OWNER` | Target `globals.css` has exactly one chunk in manifest; no other globals chunks exist. Safe for immediate rename in Phase 2. |
| `apps/iitc-iris/src/ui/002-ui.css` | `ui` | `apps/iitc-iris/src/ui/ui.css` | `INTERLEAVED_OWNER` | Followed by `003-shell.css` and `004-map.css`; separated from subsequent `ui` chunks (`005`, `007`). |
| `apps/iitc-iris/src/shell/003-shell.css` | `shell` | `apps/iitc-iris/src/shell/shell.css` | `INTERLEAVED_OWNER` | Separated from subsequent `shell` chunks (`071`–`073`) by intervening imports 004–070; requires Phase 4 cascade analysis. |
| `apps/iitc-iris/src/map/004-map.css` | `map` | `apps/iitc-iris/src/map/map.css` | `INTERLEAVED_OWNER` | Separated from subsequent `map` chunks (`011`, `013`, etc.) by ui, search, and system imports. |
| `apps/iitc-iris/src/ui/005-badge.css` | `ui (badge)` | `apps/iitc-iris/src/ui/badge.css` | `SINGLE_CHUNK_OWNER` | Dedicated UI primitive; has exactly one chunk in manifest. Safe for immediate rename in Phase 2. (If merged into `ui/ui.css`, would be `INTERLEAVED_OWNER` across `shell` and `map`). |
| `apps/iitc-iris/src/search/006-search.css` | `search` | `apps/iitc-iris/src/search/search.css` | `INTERLEAVED_OWNER` | Separated from subsequent `search` chunks (`008`, `010`) by intervening `ui` chunks (`007`, `009`). |
| `apps/iitc-iris/src/ui/007-ui.css` | `ui` | `apps/iitc-iris/src/ui/ui.css` | `INTERLEAVED_OWNER` | Interleaved between `006-search.css` and `008-search.css`. |
| `apps/iitc-iris/src/search/008-search.css` | `search` | `apps/iitc-iris/src/search/search.css` | `INTERLEAVED_OWNER` | Interleaved between `007-ui.css` and `009-ui.css`. |
| `apps/iitc-iris/src/ui/009-ui.css` | `ui` | `apps/iitc-iris/src/ui/ui.css` | `INTERLEAVED_OWNER` | Interleaved between `008-search.css` and `010-search.css`. |
| `apps/iitc-iris/src/search/010-search.css` | `search` | `apps/iitc-iris/src/search/search.css` | `INTERLEAVED_OWNER` | Separated from preceding `search` chunks by `ui` chunks; followed by `011-map.css`. |
| `apps/iitc-iris/src/map/011-map.css` | `map` | `apps/iitc-iris/src/map/map.css` | `INTERLEAVED_OWNER` | Separated from `013-map.css` by `012-system.css`. |
| `apps/iitc-iris/src/system/012-system.css` | `system` | `apps/iitc-iris/src/system/system.css` | `INTERLEAVED_OWNER` | Interleaved between `011-map.css` and `013-map.css`; separated from subsequent system chunks. |
| `apps/iitc-iris/src/map/013-map.css` | `map` | `apps/iitc-iris/src/map/map.css` | `INTERLEAVED_OWNER` | Followed by `014-segmented-button.css`; separated from subsequent map chunks. |
| `apps/iitc-iris/src/ui/014-segmented-button.css` | `ui (segmented-button)` | `apps/iitc-iris/src/ui/segmented-button.css` | `SINGLE_CHUNK_OWNER` | Dedicated UI primitive; has exactly one chunk in manifest. Safe for immediate rename in Phase 2. |
| `apps/iitc-iris/src/system/015-innerstatus.css` | `system (innerstatus)` | `apps/iitc-iris/src/system/system.css` | `TEMPORARY_REVIEW` | Targets IITC/page-runtime DOM (`.iitc-iris-title`, `.iitc-iris-innerstatus`); ownership is unclear and marked `KEEP_TEMPORARILY`. Requires review before merge. |
| `apps/iitc-iris/src/ui/016-clear-button.css` | `ui (clear-button)` | `apps/iitc-iris/src/ui/clear-button.css` | `SINGLE_CHUNK_OWNER` | Dedicated UI primitive; has exactly one chunk in manifest. Safe for immediate rename in Phase 2. |
| `apps/iitc-iris/src/auth/017-auth.css` | `auth` | `apps/iitc-iris/src/auth/auth.css` | `INTERLEAVED_OWNER` | Separated from `079-auth.css` by imports 018–078; requires Phase 4 cascade analysis. |
| `apps/iitc-iris/src/ui/018-status-text.css` | `ui (status-text)` | `apps/iitc-iris/src/ui/status-text.css` | `SINGLE_CHUNK_OWNER` | Dedicated UI primitive; has exactly one chunk in manifest. Safe for immediate rename in Phase 2. |
| `apps/iitc-iris/src/portals/019-portals.css` | `portals` | `apps/iitc-iris/src/portals/portals.css` | `INTERLEAVED_OWNER` | Separated from `021-portals.css` by `020-team.css`. |
| `apps/iitc-iris/src/styles/020-team.css` | `styles (team)` | `apps/iitc-iris/src/styles/team.css` | `INTERLEAVED_OWNER` | Separated from subsequent team chunks (`034`, `067`) by portals, side-panels, ui, etc. |
| `apps/iitc-iris/src/portals/021-portals.css` | `portals` | `apps/iitc-iris/src/portals/portals.css` | `INTERLEAVED_OWNER` | Separated from `019-portals.css` by `020-team.css` and from `023-portals.css` by `022-side-panels.css`. |
| `apps/iitc-iris/src/side-panels/022-side-panels.css` | `side-panels` | `apps/iitc-iris/src/side-panels/side-panels.css` | `INTERLEAVED_OWNER` | Separated from subsequent side-panels chunks (`055`, `057`, `066`) by portals, ui, map, etc. |
| `apps/iitc-iris/src/portals/023-portals.css` | `portals` | `apps/iitc-iris/src/portals/portals.css` | `INTERLEAVED_OWNER` | Followed by ui chunks (`024`–`026`); separated from `027-portals.css`. |
| `apps/iitc-iris/src/ui/024-summary-layout.css` | `ui (summary)` | `apps/iitc-iris/src/ui/summary.css` | `INTERLEAVED_OWNER` | Separated from `026-summary-cell.css` by `025-chip-button.css`. |
| `apps/iitc-iris/src/ui/025-chip-button.css` | `ui (chip-button)` | `apps/iitc-iris/src/ui/chip-button.css` | `SINGLE_CHUNK_OWNER` | Dedicated UI primitive; has exactly one chunk in manifest. Safe for immediate rename in Phase 2. |
| `apps/iitc-iris/src/ui/026-summary-cell.css` | `ui (summary)` | `apps/iitc-iris/src/ui/summary.css` | `INTERLEAVED_OWNER` | Separated from `024-summary-layout.css` by `025-chip-button.css` and from `028-summary.css` by `027-portals.css`. |
| `apps/iitc-iris/src/portals/027-portals.css` | `portals` | `apps/iitc-iris/src/portals/portals.css` | `INTERLEAVED_OWNER` | Interleaved between summary chunks `026` and `028`. |
| `apps/iitc-iris/src/ui/028-summary.css` | `ui (summary)` | `apps/iitc-iris/src/ui/summary.css` | `ADJACENT_SAME_OWNER` | Directly followed by `029-summary-cell-text.css` (both target `ui/summary.css`); safe candidate for contiguous merge in Phase 3. |
| `apps/iitc-iris/src/ui/029-summary-cell-text.css` | `ui (summary)` | `apps/iitc-iris/src/ui/summary.css` | `ADJACENT_SAME_OWNER` | Directly preceded by `028-summary.css` (both target `ui/summary.css`); safe candidate for contiguous merge in Phase 3. |
| `apps/iitc-iris/src/portals/030-portals.css` | `portals` | `apps/iitc-iris/src/portals/portals.css` | `INTERLEAVED_OWNER` | Followed by portal-analysis chunks (`031`–`033`); separated from `035-portals.css`. |
| `apps/iitc-iris/src/portal-analysis/031-portal-analysis.css` | `portal-analysis` | `apps/iitc-iris/src/portal-analysis/portal-analysis.css` | `ADJACENT_SAME_OWNER` | Adjacent to `032-table-first-column.css` and `033-portal-analysis.css`; safe candidate for contiguous merge in Phase 3. |
| `apps/iitc-iris/src/portal-analysis/032-table-first-column.css` | `portal-analysis` | `apps/iitc-iris/src/portal-analysis/portal-analysis.css` | `ADJACENT_SAME_OWNER` | Adjacent to `031` and `033` in portal-analysis cluster; safe candidate for contiguous merge in Phase 3. |
| `apps/iitc-iris/src/portal-analysis/033-portal-analysis.css` | `portal-analysis` | `apps/iitc-iris/src/portal-analysis/portal-analysis.css` | `ADJACENT_SAME_OWNER` | Adjacent to `031` and `032` in portal-analysis cluster; safe candidate for contiguous merge in Phase 3. |
| `apps/iitc-iris/src/styles/034-team.css` | `styles (team)` | `apps/iitc-iris/src/styles/team.css` | `INTERLEAVED_OWNER` | Separated from `020-team.css` and `067-team.css` by portal-analysis, portals, missions, etc. |
| `apps/iitc-iris/src/portals/035-portals.css` | `portals` | `apps/iitc-iris/src/portals/portals.css` | `INTERLEAVED_OWNER` | Interleaved between `034-team.css` and `036-portal-analysis.css`. |
| `apps/iitc-iris/src/portal-analysis/036-portal-analysis.css` | `portal-analysis` | `apps/iitc-iris/src/portal-analysis/portal-analysis.css` | `ADJACENT_SAME_OWNER` | Adjacent to `037-table-actions.css` and `038-portal-analysis.css`; safe candidate for contiguous merge in Phase 3. |
| `apps/iitc-iris/src/portal-analysis/037-table-actions.css` | `portal-analysis` | `apps/iitc-iris/src/portal-analysis/portal-analysis.css` | `ADJACENT_SAME_OWNER` | Adjacent to `036` and `038` in portal-analysis cluster; safe candidate for contiguous merge in Phase 3. |
| `apps/iitc-iris/src/portal-analysis/038-portal-analysis.css` | `portal-analysis` | `apps/iitc-iris/src/portal-analysis/portal-analysis.css` | `ADJACENT_SAME_OWNER` | Adjacent to `036` and `037` in portal-analysis cluster; safe candidate for contiguous merge in Phase 3. |
| `apps/iitc-iris/src/portals/039-portals.css` | `portals` | `apps/iitc-iris/src/portals/portals.css` | `INTERLEAVED_OWNER` | Separated from `041-portals.css` by `040-missions.css`. |
| `apps/iitc-iris/src/missions/040-missions.css` | `missions` | `apps/iitc-iris/src/missions/missions.css` | `INTERLEAVED_OWNER` | Interleaved between `039-portals.css` and `041-portals.css`. |
| `apps/iitc-iris/src/portals/041-portals.css` | `portals` | `apps/iitc-iris/src/portals/portals.css` | `INTERLEAVED_OWNER` | Separated from `043-portals.css` by `042-system.css`. |
| `apps/iitc-iris/src/system/042-system.css` | `system` | `apps/iitc-iris/src/system/system.css` | `INTERLEAVED_OWNER` | Interleaved between `041-portals.css` and `043-portals.css`. |
| `apps/iitc-iris/src/portals/043-portals.css` | `portals` | `apps/iitc-iris/src/portals/portals.css` | `INTERLEAVED_OWNER` | Separated from `045-portals.css` by `044-summary.css`. |
| `apps/iitc-iris/src/ui/044-summary.css` | `ui (summary)` | `apps/iitc-iris/src/ui/summary.css` | `INTERLEAVED_OWNER` | Interleaved between `043-portals.css` and `045-portals.css`. |
| `apps/iitc-iris/src/portals/045-portals.css` | `portals` | `apps/iitc-iris/src/portals/portals.css` | `INTERLEAVED_OWNER` | Separated from `047-portals.css` by `046-ui.css`. |
| `apps/iitc-iris/src/ui/046-ui.css` | `ui` | `apps/iitc-iris/src/ui/ui.css` | `INTERLEAVED_OWNER` | Interleaved between `045-portals.css` and `047-portals.css`. |
| `apps/iitc-iris/src/portals/047-portals.css` | `portals` | `apps/iitc-iris/src/portals/portals.css` | `INTERLEAVED_OWNER` | Followed by `048-panel.css`; separated from `063-portals.css`. |
| `apps/iitc-iris/src/ui/048-panel.css` | `ui (panel)` | `apps/iitc-iris/src/ui/panel.css` | `INTERLEAVED_OWNER` | Separated from `050-panel.css` by `049-map.css`. |
| `apps/iitc-iris/src/map/049-map.css` | `map` | `apps/iitc-iris/src/map/map.css` | `INTERLEAVED_OWNER` | Interleaved between `048-panel.css` and `050-panel.css`. |
| `apps/iitc-iris/src/ui/050-panel.css` | `ui (panel)` | `apps/iitc-iris/src/ui/panel.css` | `INTERLEAVED_OWNER` | Separated from `048-panel.css` by `049-map.css` and from `052-panel.css` by `051-map.css`. |
| `apps/iitc-iris/src/map/051-map.css` | `map` | `apps/iitc-iris/src/map/map.css` | `INTERLEAVED_OWNER` | Interleaved between `050-panel.css` and `052-panel.css`. |
| `apps/iitc-iris/src/ui/052-panel.css` | `ui (panel)` | `apps/iitc-iris/src/ui/panel.css` | `INTERLEAVED_OWNER` | Separated from `050-panel.css` by `051-map.css` and followed by `053-map.css`. |
| `apps/iitc-iris/src/map/053-map.css` | `map` | `apps/iitc-iris/src/map/map.css` | `INTERLEAVED_OWNER` | Interleaved between `052-panel.css` and `054-ui.css`. |
| `apps/iitc-iris/src/ui/054-ui.css` | `ui` | `apps/iitc-iris/src/ui/ui.css` | `INTERLEAVED_OWNER` | Interleaved between `053-map.css` and `055-side-panels.css`. |
| `apps/iitc-iris/src/side-panels/055-side-panels.css` | `side-panels` | `apps/iitc-iris/src/side-panels/side-panels.css` | `INTERLEAVED_OWNER` | Separated from `057-side-panels.css` by `056-comm.css`. |
| `apps/iitc-iris/src/comm/056-comm.css` | `comm` | `apps/iitc-iris/src/comm/comm.css` | `INTERLEAVED_OWNER` | Interleaved between `055-side-panels.css` and `057-side-panels.css`. |
| `apps/iitc-iris/src/side-panels/057-side-panels.css` | `side-panels` | `apps/iitc-iris/src/side-panels/side-panels.css` | `INTERLEAVED_OWNER` | Separated from `055-side-panels.css` by `056-comm.css` and followed by `058-map.css`. |
| `apps/iitc-iris/src/map/058-map.css` | `map` | `apps/iitc-iris/src/map/map.css` | `INTERLEAVED_OWNER` | Interleaved between `057-side-panels.css` and `059-diagnostics-chip.css`. |
| `apps/iitc-iris/src/ui/059-diagnostics-chip.css` | `ui (diagnostics-chip)` | `apps/iitc-iris/src/ui/diagnostics-chip.css` | `SINGLE_CHUNK_OWNER` | Dedicated UI primitive; has exactly one chunk in manifest. Safe for immediate rename in Phase 2. |
| `apps/iitc-iris/src/missions/060-missions.css` | `missions` | `apps/iitc-iris/src/missions/missions.css` | `INTERLEAVED_OWNER` | Interleaved between `059-diagnostics-chip.css` and `061-comm.css`. |
| `apps/iitc-iris/src/comm/061-comm.css` | `comm` | `apps/iitc-iris/src/comm/comm.css` | `INTERLEAVED_OWNER` | Separated from `056-comm.css` by side-panels, map, ui, missions. |
| `apps/iitc-iris/src/system/062-system.css` | `system` | `apps/iitc-iris/src/system/system.css` | `INTERLEAVED_OWNER` | Separated from `064-system.css` by `063-portals.css`. |
| `apps/iitc-iris/src/portals/063-portals.css` | `portals` | `apps/iitc-iris/src/portals/portals.css` | `INTERLEAVED_OWNER` | Interleaved between `062-system.css` and `064-system.css`. |
| `apps/iitc-iris/src/system/064-system.css` | `system` | `apps/iitc-iris/src/system/system.css` | `INTERLEAVED_OWNER` | Followed by `065-empty-state.css`; separated from other system chunks. |
| `apps/iitc-iris/src/ui/065-empty-state.css` | `ui (empty-state)` | `apps/iitc-iris/src/ui/empty-state.css` | `SINGLE_CHUNK_OWNER` | Dedicated UI primitive; has exactly one chunk in manifest. Safe for immediate rename in Phase 2. |
| `apps/iitc-iris/src/side-panels/066-side-panels.css` | `side-panels` | `apps/iitc-iris/src/side-panels/side-panels.css` | `INTERLEAVED_OWNER` | Interleaved between `065-empty-state.css` and `067-team.css`. |
| `apps/iitc-iris/src/styles/067-team.css` | `styles (team)` | `apps/iitc-iris/src/styles/team.css` | `INTERLEAVED_OWNER` | Separated from preceding team chunks `020` and `034`; adjacent to `068-temporary.css` which is responsive mixed. |
| `apps/iitc-iris/src/styles/068-temporary.css` | `styles (mobile)` | `apps/iitc-iris/src/styles/mobile.css` | `RESPONSIVE_MIXED` | Broad mobile responsive `@media (width <= 760px)` block spanning multiple feature domains; keep intact for mobile cascade review. |
| `apps/iitc-iris/src/ui/069-ui.css` | `ui` | `apps/iitc-iris/src/ui/ui.css` | `INTERLEAVED_OWNER` | Interleaved between `068-temporary.css` and `070-system.css`. |
| `apps/iitc-iris/src/system/070-system.css` | `system` | `apps/iitc-iris/src/system/system.css` | `INTERLEAVED_OWNER` | Interleaved between `069-ui.css` and `071-shell.css`. |
| `apps/iitc-iris/src/shell/071-shell.css` | `shell` | `apps/iitc-iris/src/shell/shell.css` | `ADJACENT_SAME_OWNER` | Adjacent to `072-sheet-panel-placement.css` and `073-shell.css`; safe candidate for contiguous merge in Phase 3. |
| `apps/iitc-iris/src/shell/072-sheet-panel-placement.css` | `shell` | `apps/iitc-iris/src/shell/shell.css` | `ADJACENT_SAME_OWNER` | Adjacent to `071` and `073` in shell cluster; safe candidate for contiguous merge in Phase 3. |
| `apps/iitc-iris/src/shell/073-shell.css` | `shell` | `apps/iitc-iris/src/shell/shell.css` | `ADJACENT_SAME_OWNER` | Adjacent to `071` and `072` in shell cluster; safe candidate for contiguous merge in Phase 3. |
| `apps/iitc-iris/src/portals/074-portals.css` | `portals` | `apps/iitc-iris/src/portals/portals.css` | `INTERLEAVED_OWNER` | Interleaved between `073-shell.css` and `075-temporary.css`. |
| `apps/iitc-iris/src/styles/075-temporary.css` | `styles (mobile)` | `apps/iitc-iris/src/styles/mobile.css` | `RESPONSIVE_MIXED` | Broad mobile responsive `@media (width <= 760px)` block spanning multiple feature domains; keep intact for mobile cascade review. |
| `apps/iitc-iris/src/system/076-system.css` | `system` | `apps/iitc-iris/src/system/system.css` | `INTERLEAVED_OWNER` | Separated from `078-system.css` by `077-map.css`. |
| `apps/iitc-iris/src/map/077-map.css` | `map` | `apps/iitc-iris/src/map/map.css` | `INTERLEAVED_OWNER` | Interleaved between `076-system.css` and `078-system.css`. |
| `apps/iitc-iris/src/system/078-system.css` | `system` | `apps/iitc-iris/src/system/system.css` | `INTERLEAVED_OWNER` | Followed by `079-auth.css`; separated from other system chunks. |
| `apps/iitc-iris/src/auth/079-auth.css` | `auth` | `apps/iitc-iris/src/auth/auth.css` | `INTERLEAVED_OWNER` | Separated from `017-auth.css` by imports 018–078; requires Phase 4 cascade analysis. |
| `apps/iitc-iris/src/system/080-divider.css` | `system (divider)` | `apps/iitc-iris/src/system/system.css` | `TEMPORARY_REVIEW` | Ownership is unclear (`.iitc-iris-divider` has no current source evidence; classified `KEEP_TEMPORARILY`). Requires review before merge. |
| `apps/iitc-iris/src/layers/081-layers.css` | `layers` | `apps/iitc-iris/src/layers/layers.css` | `ADJACENT_SAME_OWNER` | Directly followed by `082-toggle-width.css` (both target `layers/layers.css`); safe candidate for contiguous merge in Phase 3. |
| `apps/iitc-iris/src/layers/082-toggle-width.css` | `layers` | `apps/iitc-iris/src/layers/layers.css` | `ADJACENT_SAME_OWNER` | Directly preceded by `081-layers.css` (both target `layers/layers.css`); safe candidate for contiguous merge in Phase 3. |
| `apps/iitc-iris/src/map/083-map.css` | `map` | `apps/iitc-iris/src/map/map.css` | `INTERLEAVED_OWNER` | Interleaved between `082-toggle-width.css` and `084-layers.css`. |
| `apps/iitc-iris/src/layers/084-layers.css` | `layers` | `apps/iitc-iris/src/layers/layers.css` | `INTERLEAVED_OWNER` | Separated from `081-082` by `083-map.css` and from `086-layers.css` by `085-portals.css`. |
| `apps/iitc-iris/src/portals/085-portals.css` | `portals` | `apps/iitc-iris/src/portals/portals.css` | `INTERLEAVED_OWNER` | Interleaved between `084-layers.css` and `086-layers.css`. |
| `apps/iitc-iris/src/layers/086-layers.css` | `layers` | `apps/iitc-iris/src/layers/layers.css` | `INTERLEAVED_OWNER` | Separated from `084-layers.css` by `085-portals.css`; followed by `087-missions.css`. |
| `apps/iitc-iris/src/missions/087-missions.css` | `missions` | `apps/iitc-iris/src/missions/missions.css` | `INTERLEAVED_OWNER` | Separated from preceding missions chunks `040` and `060` by portals, system, ui, etc. |
| `apps/iitc-iris/src/map/088-player-tracker.css` | `map (player-tracker)` | `apps/iitc-iris/src/map/player-tracker.css` | `INTERLEAVED_OWNER` | Separated from `090-player-tracker.css` by `089-draw-tools.css`; merging would reorder across draw-tools. |
| `apps/iitc-iris/src/draw-tools/089-draw-tools.css` | `draw-tools` | `apps/iitc-iris/src/draw-tools/draw-tools.css` | `SINGLE_CHUNK_OWNER` | Owner `draw-tools` has exactly one chunk in the entire manifest; safe candidate for immediate rename without merging. |
| `apps/iitc-iris/src/map/090-player-tracker.css` | `map (player-tracker)` | `apps/iitc-iris/src/map/player-tracker.css` | `INTERLEAVED_OWNER` | Separated from `088-player-tracker.css` by `089-draw-tools.css`; merging would reorder across draw-tools. |

---

## 8. Summary of Classification Findings

- **`SINGLE_CHUNK_OWNER` (9 chunks):**
  - Defines a single proposed target stylesheet or component owner with exactly one chunk in the stylesheet manifest, rather than necessarily an entire directory owner.
  - `draw-tools` (`089-draw-tools.css`): Sole directory-level single chunk in the repository. Safe candidate for Phase 2 immediate rename.
  - `styles (globals)` (`001-globals.css`): Sole globals chunk targeting `styles/globals.css`. Safe for Phase 2 immediate rename.
  - UI primitives (`005-badge.css`, `014-segmented-button.css`, `016-clear-button.css`, `018-status-text.css`, `025-chip-button.css`, `059-diagnostics-chip.css`, `065-empty-state.css`): Individual component chunks with exactly one chunk each. Safe for Phase 2 rename as dedicated primitive stylesheets. (Note: If any of these are later targeted for folding into `ui/ui.css`, their safety would revert to `INTERLEAVED_OWNER` due to foreign imports separating them from `002-ui.css`).
- **`ADJACENT_SAME_OWNER` (13 chunks):**
  - `portal-analysis`: `031`, `032`, `033` (contiguous 3-chunk block) and `036`, `037`, `038` (contiguous 3-chunk block).
  - `shell`: `071`, `072`, `073` (contiguous 3-chunk block).
  - `layers`: `081`, `082` (contiguous 2-chunk block).
  - `ui (summary)`: `028`, `029` (contiguous 2-chunk block).
  All 13 are safe candidates for contiguous Phase 3 merging without altering stylesheet cascade order.
- **`INTERLEAVED_OWNER` (64 chunks):**
  - Chunks belonging to features whose styles are distributed across the manifest (`auth`, `comm`, `layers`, `map`, `missions`, `portals`, `search`, `shell`, `side-panels`, `styles/team`, `system`, and core `ui`).
  - Merging these chunks would cross foreign import boundaries and alter cascade order. They must remain numbered chunks or undergo rigorous Phase 4 cascade analysis before any consolidation.
- **`RESPONSIVE_MIXED` (2 chunks):**
  - `068-temporary.css` and `075-temporary.css`: Broad mobile responsive `@media (width <= 760px)` blocks spanning multiple feature boundaries. Intentionally preserved intact for Phase 5 mobile cascade consolidation.
- **`TEMPORARY_REVIEW` (2 chunks):**
  - `015-innerstatus.css` (targets page-runtime/IITC DOM; marked `KEEP_TEMPORARILY`).
  - `080-divider.css` (no current source usage evidence; marked `KEEP_TEMPORARILY`).
  Both require human/ownership audit before any relocation or merge.

---

## Hard Stop

Phase 0 and Phase 1 are complete. In accordance with the execution mandates:
- No application CSS files were modified, moved, renamed, merged, or deleted.
- No TypeScript/TSX files were modified.
- Execution stops here. Do not proceed to Phase 2.
