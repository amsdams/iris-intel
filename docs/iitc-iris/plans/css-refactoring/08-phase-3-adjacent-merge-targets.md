# IITC IRIS CSS Pretty Architecture Phase 3A — Adjacent Merge Target Plan

Status: Planning only. No files renamed, merged, or modified.

Reference plans:
- `docs/iitc-iris/plans/css-pretty-architecture-plan.md` (Phase 3)
- `docs/iitc-iris/plans/css-refactoring/06-pretty-architecture-baseline.md`
- `docs/iitc-iris/plans/css-refactoring/07-phase-2-renames.md`

---

## 1. Current Git Commit

`b0e81d2c6532c463d25f754908e99bb9d99dc925`

---

## 2. Working Tree Status (`git status --short`)

```text
 M docs/iitc-iris/plans/css-refactoring/08-phase-3-adjacent-merge-targets.md
```

---

## 3. Current Import List (`apps/iitc-iris/src/iitc-iris.css`)

90 imports total. All 90 resolve to existing files on disk.

```css
/* IITC IRIS CSS entry point. Ordered imports preserve the original monolithic cascade. */
@import url('./styles/globals.css');           /* line  2 */
@import url('./ui/002-ui.css');               /* line  3 */
@import url('./shell/003-shell.css');          /* line  4 */
@import url('./map/004-map.css');             /* line  5 */
@import url('./ui/badge.css');                /* line  6 */
@import url('./search/006-search.css');        /* line  7 */
@import url('./ui/007-ui.css');               /* line  8 */
@import url('./search/008-search.css');        /* line  9 */
@import url('./ui/009-ui.css');               /* line 10 */
@import url('./search/010-search.css');        /* line 11 */
@import url('./map/011-map.css');             /* line 12 */
@import url('./system/012-system.css');        /* line 13 */
@import url('./map/013-map.css');             /* line 14 */
@import url('./ui/segmented-button.css');      /* line 15 */
@import url('./system/015-innerstatus.css');   /* line 16 */
@import url('./ui/clear-button.css');          /* line 17 */
@import url('./auth/017-auth.css');            /* line 18 */
@import url('./ui/status-text.css');           /* line 19 */
@import url('./portals/019-portals.css');      /* line 20 */
@import url('./styles/020-team.css');          /* line 21 */
@import url('./portals/021-portals.css');      /* line 22 */
@import url('./side-panels/022-side-panels.css'); /* line 23 */
@import url('./portals/023-portals.css');      /* line 24 */
@import url('./ui/024-summary-layout.css');    /* line 25 */
@import url('./ui/chip-button.css');           /* line 26 */
@import url('./ui/026-summary-cell.css');      /* line 27 */
@import url('./portals/027-portals.css');      /* line 28 */
@import url('./ui/028-summary.css');           /* line 29 */  ← cluster A start
@import url('./ui/029-summary-cell-text.css'); /* line 30 */  ← cluster A end
@import url('./portals/030-portals.css');      /* line 31 */
@import url('./portal-analysis/031-portal-analysis.css');  /* line 32 */  ← cluster B start
@import url('./portal-analysis/032-table-first-column.css'); /* line 33 */
@import url('./portal-analysis/033-portal-analysis.css');  /* line 34 */  ← cluster B end
@import url('./styles/034-team.css');          /* line 35 */
@import url('./portals/035-portals.css');      /* line 36 */
@import url('./portal-analysis/036-portal-analysis.css');  /* line 37 */  ← cluster C start
@import url('./portal-analysis/037-table-actions.css');    /* line 38 */
@import url('./portal-analysis/038-portal-analysis.css');  /* line 39 */  ← cluster C end
@import url('./portals/039-portals.css');      /* line 40 */
@import url('./missions/040-missions.css');    /* line 41 */
@import url('./portals/041-portals.css');      /* line 42 */
@import url('./system/042-system.css');        /* line 43 */
@import url('./portals/043-portals.css');      /* line 44 */
@import url('./ui/044-summary.css');           /* line 45 */
@import url('./portals/045-portals.css');      /* line 46 */
@import url('./ui/046-ui.css');               /* line 47 */
@import url('./portals/047-portals.css');      /* line 48 */
@import url('./ui/048-panel.css');             /* line 49 */
@import url('./map/049-map.css');             /* line 50 */
@import url('./ui/050-panel.css');             /* line 51 */
@import url('./map/051-map.css');             /* line 52 */
@import url('./ui/052-panel.css');             /* line 53 */
@import url('./map/053-map.css');             /* line 54 */
@import url('./ui/054-ui.css');               /* line 55 */
@import url('./side-panels/055-side-panels.css'); /* line 56 */
@import url('./comm/056-comm.css');            /* line 57 */
@import url('./side-panels/057-side-panels.css'); /* line 58 */
@import url('./map/058-map.css');             /* line 59 */
@import url('./ui/diagnostics-chip.css');      /* line 60 */
@import url('./missions/060-missions.css');    /* line 61 */
@import url('./comm/061-comm.css');            /* line 62 */
@import url('./system/062-system.css');        /* line 63 */
@import url('./portals/063-portals.css');      /* line 64 */
@import url('./system/064-system.css');        /* line 65 */
@import url('./ui/empty-state.css');           /* line 66 */
@import url('./side-panels/066-side-panels.css'); /* line 67 */
@import url('./styles/067-team.css');          /* line 68 */
@import url('./styles/068-temporary.css');     /* line 69 */
@import url('./ui/069-ui.css');               /* line 70 */
@import url('./system/070-system.css');        /* line 71 */
@import url('./shell/071-shell.css');          /* line 72 */  ← cluster D start
@import url('./shell/072-sheet-panel-placement.css'); /* line 73 */
@import url('./shell/073-shell.css');          /* line 74 */  ← cluster D end
@import url('./portals/074-portals.css');      /* line 75 */
@import url('./styles/075-temporary.css');     /* line 76 */
@import url('./system/076-system.css');        /* line 77 */
@import url('./map/077-map.css');             /* line 78 */
@import url('./system/078-system.css');        /* line 79 */
@import url('./auth/079-auth.css');            /* line 80 */
@import url('./system/080-divider.css');       /* line 81 */
@import url('./layers/081-layers.css');        /* line 82 */  ← cluster E start
@import url('./layers/082-toggle-width.css');  /* line 83 */  ← cluster E end
@import url('./map/083-map.css');             /* line 84 */
@import url('./layers/084-layers.css');        /* line 85 */
@import url('./portals/085-portals.css');      /* line 86 */
@import url('./layers/086-layers.css');        /* line 87 */
@import url('./missions/087-missions.css');    /* line 88 */
@import url('./map/088-player-tracker.css');   /* line 89 */
@import url('./draw-tools/draw-tools.css');    /* line 90 */
@import url('./map/090-player-tracker.css');   /* line 91 */
```

---

## 4. Phase 3 Adjacent Merge Cluster Analysis

### Key Terminology

- **Adjacent block**: Two or more consecutive imports in the manifest with no intervening imports from a different owner.
- **Block-local name**: A merge target name that is safe and unambiguous *only for this specific adjacent block*, not for all chunks of the same owner directory. Should use a descriptive infix.
- **Final-pretty name**: A merge target name intended to be the permanent, human-readable name for all same-owner content — only valid if no other same-owner chunks exist elsewhere in the manifest.
- **Filename collision**: The proposed merged name already exists or would duplicate the final name of a different block of the same owner.

---

### Cluster A — `ui/028-summary.css` + `ui/029-summary-cell-text.css`

| Property | Detail |
|---|---|
| **Source files** | `apps/iitc-iris/src/ui/028-summary.css` (15 lines) <br> `apps/iitc-iris/src/ui/029-summary-cell-text.css` (9 lines) |
| **Manifest positions** | Lines 29–30 (consecutive, no gap) |
| **Separator between them** | None — directly adjacent |
| **Proposed merged filename** | `ui/summary-mini.css` (block-local) — see collision note |
| **Filename collision?** | **YES — collision risk.** `summary.css` would collide: `044-summary.css` (line 45) also targets `ui/summary.css` per the Phase 1 ownership map. Additionally `024-summary-layout.css` and `026-summary-cell.css` are interleaved non-adjacent chunks targeting the same area. Using the plain name `summary.css` would imply this file is the complete summary owner, which it is not. |
| **Block-local or final-pretty?** | Block-local only. A final `ui/summary.css` cannot exist until `024`, `026`, and `044` are also consolidated, which requires Phase 4 cascade analysis (all are interleaved). |
| **Exact replacement import line** | `@import url('./ui/summary-mini.css');` at manifest line 29 (removing line 30) |
| **Content of merged file** | `028-summary.css`: `.iitc-iris-summary-mini-track` and related. `029-summary-cell-text.css`: `.iitc-iris-summary-cell small`. 24 combined lines. |
| **Risk level** | Low — two directly adjacent small files, no foreign imports between them, no cascade dependency across the gap. |
| **Recommendation** | **Merge now** — but use block-local name `summary-mini.css`, not `summary.css`. The content of these two files (mini track and cell text) is distinct enough from `024-summary-layout.css`, `026-summary-cell.css`, and `044-summary.css` to warrant its own descriptive name. Phase 4 will decide whether all summary chunks eventually consolidate. |

---

### Cluster B — `portal-analysis/031` + `032` + `033`

| Property | Detail |
|---|---|
| **Source files** | `apps/iitc-iris/src/portal-analysis/031-portal-analysis.css` (229 lines) <br> `apps/iitc-iris/src/portal-analysis/032-table-first-column.css` (6 lines) <br> `apps/iitc-iris/src/portal-analysis/033-portal-analysis.css` (52 lines) |
| **Manifest positions** | Lines 32–34 (consecutive, no gap) |
| **Separator between them** | None — all three directly adjacent |
| **Proposed merged filename** | `portal-analysis/portal-analysis-base.css` (block-local) — see collision note |
| **Filename collision?** | **YES — collision risk.** The plain name `portal-analysis.css` is the Phase 1 proposed final target for *all* portal-analysis content. Cluster C (`036`–`038`) is a separate adjacent block at manifest lines 37–39, separated from this block by `034-team.css` (line 35) and `035-portals.css` (line 36). Both clusters must retain distinct names until cascade analysis confirms they can be united. |
| **Block-local or final-pretty?** | Block-local. A final `portal-analysis/portal-analysis.css` cannot exist until Clusters B and C are proven safe to unite, which requires Phase 4 cascade analysis of the two intervening foreign imports. |
| **Exact replacement import line** | `@import url('./portal-analysis/portal-analysis-base.css');` at manifest line 32 (removing lines 33–34) |
| **Content of merged file** | Core portal-analysis panel, table, portals list, and counts layout (287 combined lines). Includes level colour variables (`.iitc-iris-portal-analysis .iitc-iris-level-N`) and all portal list/scoreboard table rules up through line 34 of the original manifest. |
| **Risk level** | Low within the block — the three files are directly adjacent with no foreign imports between them. Moderate at the naming level because the name must not pre-empt Cluster C. |
| **Recommendation** | **Merge now** — using block-local name `portal-analysis-base.css`. If naming feels premature, this can be deferred until Cluster C naming is also decided. The safe merge itself (files only) has no cascade risk. |

---

### Cluster C — `portal-analysis/036` + `037` + `038`

| Property | Detail |
|---|---|
| **Source files** | `apps/iitc-iris/src/portal-analysis/036-portal-analysis.css` (10 lines) <br> `apps/iitc-iris/src/portal-analysis/037-table-actions.css` (11 lines) <br> `apps/iitc-iris/src/portal-analysis/038-portal-analysis.css` (15 lines) |
| **Manifest positions** | Lines 37–39 (consecutive, no gap) |
| **Separator between them** | None — all three directly adjacent |
| **Separator from Cluster B** | Two foreign imports intervene: `034-team.css` (line 35) and `035-portals.css` (line 36). This means merging Cluster B and Cluster C into one file would insert `portal-analysis` CSS *before* `034-team.css` and `035-portals.css` for the Cluster B content, and Cluster C's content is currently after both. The inter-cluster gap is what makes a single `portal-analysis.css` unsafe without cascade analysis. |
| **Proposed merged filename** | `portal-analysis/portal-analysis-table-actions.css` (block-local) |
| **Filename collision?** | **YES — collision risk** with plain `portal-analysis.css` for same reason as Cluster B. If Cluster B is merged to `portal-analysis-base.css`, the distinct name here avoids conflict. |
| **Block-local or final-pretty?** | Block-local. |
| **Exact replacement import line** | `@import url('./portal-analysis/portal-analysis-table-actions.css');` at manifest line 37 (removing lines 38–39) |
| **Content of merged file** | Level-colour overrides (36), table sort/action button resets (37), and table sort icon rules (38). 36 combined lines. Content is thematically cohesive: all relate to table interaction styles. |
| **Risk level** | Low within the block — three directly adjacent small files. The risk is only naming and the inability to merge with Cluster B at this phase. |
| **Recommendation** | **Merge now** — using block-local name `portal-analysis-table-actions.css`. This name is descriptive and distinct from Cluster B. The two clusters together remain as two imports in the manifest, preserving the cascade gap from `034-team.css` and `035-portals.css`. |

> **Note on Clusters B + C together:** If a reviewer decides to merge Clusters B and C into one file, they must also absorb the cascade effect of removing `034-team.css` and `035-portals.css` from their currently interleaved position between the two clusters. That is not a rename/merge operation — it is a cascade reorder, which belongs in Phase 4 or requires a dedicated cascade equivalence proof before proceeding.

---

### Cluster D — `shell/071` + `072` + `073`

| Property | Detail |
|---|---|
| **Source files** | `apps/iitc-iris/src/shell/071-shell.css` (103 lines) <br> `apps/iitc-iris/src/shell/072-sheet-panel-placement.css` (16 lines) <br> `apps/iitc-iris/src/shell/073-shell.css` (29 lines) |
| **Manifest positions** | Lines 72–74 (consecutive, no gap) |
| **Separator between them** | None — all three directly adjacent |
| **Other shell chunks** | `003-shell.css` (line 4, manifest position 3) — contains `.iitc-iris-shell` root layout rule. It is far removed from this cluster (68 manifest positions earlier). Merging Cluster D into `shell.css` and renaming it would create a name collision with the natural target of `003-shell.css`. |
| **Proposed merged filename** | `shell/shell-panels.css` (block-local) — see collision note |
| **Filename collision?** | **YES — collision risk.** The plain name `shell.css` is the natural final target for `003-shell.css` (the isolated root shell chunk at line 4). Cluster D's content (tab-bar, sheet-layer panel placement, and sheet-layer overrides) is distinct from the root `.iitc-iris-shell` rule, but using `shell.css` as the merge target would occupy the name that `003-shell.css` should eventually claim. |
| **Block-local or final-pretty?** | Block-local. A final `shell/shell.css` cannot exist until the cascade relationship between `003-shell.css` (at line 4) and this cluster (at lines 72–74) is resolved. |
| **Exact replacement import line** | `@import url('./shell/shell-panels.css');` at manifest line 72 (removing lines 73–74) |
| **Content of merged file** | `071`: tab-bar, dock-row, map-context, sheet-tabbar, panel visibility system (103 lines). `072`: shared panel placement rule for map-controls, portal-side-panel, request-side-panel, system-panel at `bottom: 104px` (16 lines). `073`: sheet-layers overrides for those same panels (29 lines). The three files form a cohesive panel-placement and tab-bar system. 148 combined lines. |
| **Risk level** | Low within the block — three directly adjacent files, the largest cluster by line count, but no foreign imports between them. Content is thematically tight (all sheet/tab-bar panel placement). |
| **Recommendation** | **Merge now** — using block-local name `shell-panels.css`. Reserve the name `shell.css` for when `003-shell.css` is eventually renamed in a future Phase 2–style rename or Phase 4 consolidation. |

---

### Cluster E — `layers/081` + `082`

| Property | Detail |
|---|---|
| **Source files** | `apps/iitc-iris/src/layers/081-layers.css` (10 lines) <br> `apps/iitc-iris/src/layers/082-toggle-width.css` (7 lines) |
| **Manifest positions** | Lines 82–83 (consecutive, no gap) |
| **Separator between them** | None — directly adjacent |
| **Other layers chunks** | `084-layers.css` (line 85) and `086-layers.css` (line 87) are non-adjacent, separated by `083-map.css` (line 84) and `085-portals.css` (line 86) respectively. All four layers chunks target the final `layers/layers.css`. |
| **Proposed merged filename** | `layers/layer-toggle.css` (block-local) — see collision note |
| **Filename collision?** | **YES — collision risk.** The plain name `layers.css` is the Phase 1 proposed final target for all four layers chunks (`081`, `082`, `084`, `086`). `084-layers.css` and `086-layers.css` are interleaved and cannot be merged without Phase 4 cascade analysis. Using `layers.css` here would imply this is the complete layers owner, which it is not. |
| **Block-local or final-pretty?** | Block-local. A final `layers/layers.css` cannot exist until all four layers chunks are consolidated, which requires Phase 4 for `084` and `086`. |
| **Exact replacement import line** | `@import url('./layers/layer-toggle.css');` at manifest line 82 (removing line 83) |
| **Content of merged file** | `081`: `.iitc-iris-layer-toggle` base rule (10 lines). `082`: `.iitc-iris-base-toggle` and `.iitc-iris-source-toggle` min-width rules (7 lines). Both files define toggle/button width primitives for the layers panel. 17 combined lines. |
| **Risk level** | Low — two directly adjacent small files with thematically identical content (layer toggle button dimensions). |
| **Recommendation** | **Merge now** — using block-local name `layer-toggle.css`. This name is descriptive and clearly distinct from the full `layers.css` name. |

---

## 5. Cluster Summary Table

| Cluster | Source files | Manifest positions | Proposed merged filename | Filename collision? | Name type | Recommendation |
|---|---|---|---|---|---|---|
| **A** | `028-summary.css`, `029-summary-cell-text.css` | lines 29–30 | `ui/summary-mini.css` | YES — `summary.css` taken by 024/026/044 | Block-local | Merge now |
| **B** | `031-portal-analysis.css`, `032-table-first-column.css`, `033-portal-analysis.css` | lines 32–34 | `portal-analysis/portal-analysis-base.css` | YES — plain `portal-analysis.css` conflicts with Cluster C | Block-local | Merge now |
| **C** | `036-portal-analysis.css`, `037-table-actions.css`, `038-portal-analysis.css` | lines 37–39 | `portal-analysis/portal-analysis-table-actions.css` | YES — plain `portal-analysis.css` conflicts with Cluster B | Block-local | Merge now |
| **D** | `071-shell.css`, `072-sheet-panel-placement.css`, `073-shell.css` | lines 72–74 | `shell/shell-panels.css` | YES — `shell.css` reserved for `003-shell.css` | Block-local | Merge now |
| **E** | `081-layers.css`, `082-toggle-width.css` | lines 82–83 | `layers/layer-toggle.css` | YES — `layers.css` taken by 084/086 | Block-local | Merge now |

---

## 6. Post-Merge Import Manifest (After All 5 Clusters Merged)

If all 5 clusters are merged, the manifest would shrink from **90 imports to 82 imports**. The clusters contain 13 source imports and would be replaced by 5 merged-file imports, removing 8 import lines total (cluster A removes 1, clusters B and C each remove 2, cluster D removes 2, cluster E removes 1).

The new import lines replacing clusters would be:

```diff
- @import url('./ui/028-summary.css');           /* line 29 */
- @import url('./ui/029-summary-cell-text.css'); /* line 30 */
+ @import url('./ui/summary-mini.css');

- @import url('./portal-analysis/031-portal-analysis.css'); /* line 32 */
- @import url('./portal-analysis/032-table-first-column.css'); /* line 33 */
- @import url('./portal-analysis/033-portal-analysis.css'); /* line 34 */
+ @import url('./portal-analysis/portal-analysis-base.css');

- @import url('./portal-analysis/036-portal-analysis.css'); /* line 37 */
- @import url('./portal-analysis/037-table-actions.css');   /* line 38 */
- @import url('./portal-analysis/038-portal-analysis.css'); /* line 39 */
+ @import url('./portal-analysis/portal-analysis-table-actions.css');

- @import url('./shell/071-shell.css');                      /* line 72 */
- @import url('./shell/072-sheet-panel-placement.css');      /* line 73 */
- @import url('./shell/073-shell.css');                      /* line 74 */
+ @import url('./shell/shell-panels.css');

- @import url('./layers/081-layers.css');                    /* line 82 */
- @import url('./layers/082-toggle-width.css');              /* line 83 */
+ @import url('./layers/layer-toggle.css');
```

All other 77 import lines remain unchanged.

---

## 7. Cascade Safety Analysis

All five clusters are safe to merge individually because:

1. **No foreign imports lie between the files in any cluster.** Merging them is equivalent to concatenating their CSS in the order they currently appear.
2. **The merged file takes the position of the first file in the cluster.** Cascade position in the manifest is unchanged.
3. **Block-local names are used.** No filename pre-empts the final target name needed for interleaved chunks.

The one cross-cluster risk worth documenting explicitly: **Clusters B and C must not be merged into a single file at this phase.** The intervening `034-team.css` (line 35) and `035-portals.css` (line 36) currently sit between them. Merging B and C would move all of B's CSS to *before* those two imports, altering their effective cascade order relative to styles currently declared after them. This requires Phase 4 analysis.

---

## 8. Deferred Items (Phase 4 or Later)

These items are not candidates for this phase and must not be merged here:

| Item | Reason deferred |
|---|---|
| Merging Clusters B + C into one file | Two foreign imports (`034-team`, `035-portals`) separate them; merging would alter cascade order |
| Renaming `003-shell.css` → `shell.css` | Blocked by interleaved position (line 4 vs lines 72–74); requires Phase 4 |
| Consolidating `layers/084` + `layers/086` | Interleaved by `083-map.css` and `085-portals.css`; requires Phase 4 |
| Consolidating all `ui/summary*` chunks | `024`, `026`, and `044` are all interleaved; requires Phase 4 |
| Final merge of all portal-analysis into one file | Requires resolving the B/C cascade gap; requires Phase 4 |

---

## 9. Validation

- `git status --short`: ` M docs/iitc-iris/plans/css-refactoring/08-phase-3-adjacent-merge-targets.md`
- Import count in `apps/iitc-iris/src/iitc-iris.css`: **90** (verified by script)
- Missing imports: **0** (all 90 resolve to existing files on disk)
- No application CSS files were modified.
- No TS/TSX files were modified.
- No imports were changed.

---

## Hard Stop

This document is a planning artefact only. No application files were renamed, created, merged, or edited.
Do not proceed to Phase 3 implementation without human review of the proposed merged filenames.
