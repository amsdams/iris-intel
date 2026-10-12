# IITC IRIS CSS Pretty Architecture Phase 4A — Interleaved Owner Decision Plan

Status: Planning only. No application files modified.

Reference plans:
- `docs/iitc-iris/plans/css-pretty-architecture-plan.md` (Phase 4)
- `docs/iitc-iris/plans/css-refactoring/06-pretty-architecture-baseline.md`
- `docs/iitc-iris/plans/css-refactoring/08-phase-3-adjacent-merge-targets.md`
- `docs/iitc-iris/plans/css-refactoring/10-phase-3c-ui-summary-merge.md`
- `docs/iitc-iris/plans/css-refactoring/11-phase-3d-portal-analysis-merge.md`

---

## 1. Current Commit Hash

`fc9e18b891c07ac469e5b19166d00b53dcc66742`

---

## 2. `git status --short`

```text
A  docs/iitc-iris/plans/css-refactoring/12-phase-4a-interleaved-owner-plan.md
```

---

## 3. Current Import Count and Full Import List

**82 imports total. All 82 resolve to existing files on disk.**

```css
/* IITC IRIS CSS entry point. Ordered imports preserve the original monolithic cascade. */
@import url('./styles/globals.css');                                    /* line  2 */
@import url('./ui/002-ui.css');                                         /* line  3 */
@import url('./shell/003-shell.css');                                   /* line  4 */
@import url('./map/004-map.css');                                       /* line  5 */
@import url('./ui/badge.css');                                          /* line  6 */
@import url('./search/006-search.css');                                 /* line  7 */
@import url('./ui/007-ui.css');                                         /* line  8 */
@import url('./search/008-search.css');                                 /* line  9 */
@import url('./ui/009-ui.css');                                         /* line 10 */
@import url('./search/010-search.css');                                 /* line 11 */
@import url('./map/011-map.css');                                       /* line 12 */
@import url('./system/012-system.css');                                 /* line 13 */
@import url('./map/013-map.css');                                       /* line 14 */
@import url('./ui/segmented-button.css');                               /* line 15 */
@import url('./system/015-innerstatus.css');                            /* line 16 */
@import url('./ui/clear-button.css');                                   /* line 17 */
@import url('./auth/017-auth.css');                                     /* line 18 */
@import url('./ui/status-text.css');                                    /* line 19 */
@import url('./portals/019-portals.css');                               /* line 20 */
@import url('./styles/020-team.css');                                   /* line 21 */
@import url('./portals/021-portals.css');                               /* line 22 */
@import url('./side-panels/022-side-panels.css');                       /* line 23 */
@import url('./portals/023-portals.css');                               /* line 24 */
@import url('./ui/024-summary-layout.css');                             /* line 25 */
@import url('./ui/chip-button.css');                                    /* line 26 */
@import url('./ui/026-summary-cell.css');                               /* line 27 */
@import url('./portals/027-portals.css');                               /* line 28 */
@import url('./ui/summary-mini.css');                                   /* line 29 */
@import url('./portals/030-portals.css');                               /* line 30 */
@import url('./portal-analysis/portal-analysis-base.css');             /* line 31 */
@import url('./styles/034-team.css');                                   /* line 32 */
@import url('./portals/035-portals.css');                               /* line 33 */
@import url('./portal-analysis/portal-analysis-table-actions.css');    /* line 34 */
@import url('./portals/039-portals.css');                               /* line 35 */
@import url('./missions/040-missions.css');                             /* line 36 */
@import url('./portals/041-portals.css');                               /* line 37 */
@import url('./system/042-system.css');                                 /* line 38 */
@import url('./portals/043-portals.css');                               /* line 39 */
@import url('./ui/044-summary.css');                                    /* line 40 */
@import url('./portals/045-portals.css');                               /* line 41 */
@import url('./ui/046-ui.css');                                         /* line 42 */
@import url('./portals/047-portals.css');                               /* line 43 */
@import url('./ui/048-panel.css');                                      /* line 44 */
@import url('./map/049-map.css');                                       /* line 45 */
@import url('./ui/050-panel.css');                                      /* line 46 */
@import url('./map/051-map.css');                                       /* line 47 */
@import url('./ui/052-panel.css');                                      /* line 48 */
@import url('./map/053-map.css');                                       /* line 49 */
@import url('./ui/054-ui.css');                                         /* line 50 */
@import url('./side-panels/055-side-panels.css');                       /* line 51 */
@import url('./comm/056-comm.css');                                     /* line 52 */
@import url('./side-panels/057-side-panels.css');                       /* line 53 */
@import url('./map/058-map.css');                                       /* line 54 */
@import url('./ui/diagnostics-chip.css');                               /* line 55 */
@import url('./missions/060-missions.css');                             /* line 56 */
@import url('./comm/061-comm.css');                                     /* line 57 */
@import url('./system/062-system.css');                                 /* line 58 */
@import url('./portals/063-portals.css');                               /* line 59 */
@import url('./system/064-system.css');                                 /* line 60 */
@import url('./ui/empty-state.css');                                    /* line 61 */
@import url('./side-panels/066-side-panels.css');                       /* line 62 */
@import url('./styles/067-team.css');                                   /* line 63 */
@import url('./styles/068-temporary.css');                              /* line 64 */
@import url('./ui/069-ui.css');                                         /* line 65 */
@import url('./system/070-system.css');                                 /* line 66 */
@import url('./shell/shell-panels.css');                                /* line 67 */
@import url('./portals/074-portals.css');                               /* line 68 */
@import url('./styles/075-temporary.css');                              /* line 69 */
@import url('./system/076-system.css');                                 /* line 70 */
@import url('./map/077-map.css');                                       /* line 71 */
@import url('./system/078-system.css');                                 /* line 72 */
@import url('./auth/079-auth.css');                                     /* line 73 */
@import url('./system/080-divider.css');                                /* line 74 */
@import url('./layers/layer-toggle.css');                               /* line 75 */
@import url('./map/083-map.css');                                       /* line 76 */
@import url('./layers/084-layers.css');                                 /* line 77 */
@import url('./portals/085-portals.css');                               /* line 78 */
@import url('./layers/086-layers.css');                                 /* line 79 */
@import url('./missions/087-missions.css');                             /* line 80 */
@import url('./map/088-player-tracker.css');                            /* line 81 */
@import url('./draw-tools/draw-tools.css');                             /* line 82 */
@import url('./map/090-player-tracker.css');                            /* line 83 */
```

---

## 4. Remaining Numbered CSS Imports Grouped by Owner

The following 68 numbered (not yet pretty-named) imports remain in the manifest. Already-pretty named files (`globals.css`, `badge.css`, `segmented-button.css`, `clear-button.css`, `status-text.css`, `chip-button.css`, `diagnostics-chip.css`, `empty-state.css`, `draw-tools.css`, `summary-mini.css`, `shell-panels.css`, `layer-toggle.css`, `portal-analysis-base.css`, `portal-analysis-table-actions.css`) are excluded — they are done.

### auth — 2 numbered imports
| Manifest line | File | Lines |
|---|---|---|
| 18 | `auth/017-auth.css` | 72 |
| 73 | `auth/079-auth.css` | 13 |

### comm — 2 numbered imports
| Manifest line | File | Lines |
|---|---|---|
| 52 | `comm/056-comm.css` | 6 |
| 57 | `comm/061-comm.css` | 157 |

### layers — 2 numbered imports (non-adjacent)
| Manifest line | File | Lines |
|---|---|---|
| 77 | `layers/084-layers.css` | 54 |
| 79 | `layers/086-layers.css` | 12 |

### map — 9 numbered imports (all interleaved)
| Manifest line | File | Lines |
|---|---|---|
|  5 | `map/004-map.css` | 5 |
| 12 | `map/011-map.css` | 30 |
| 14 | `map/013-map.css` | 86 |
| 45 | `map/049-map.css` | 6 |
| 47 | `map/051-map.css` | 10 |
| 49 | `map/053-map.css` | 33 |
| 54 | `map/058-map.css` | 10 |
| 71 | `map/077-map.css` | 58 |
| 76 | `map/083-map.css` | 3 |

### map — 2 player-tracker imports (separated by draw-tools)
| Manifest line | File | Lines |
|---|---|---|
| 81 | `map/088-player-tracker.css` | 5 |
| 83 | `map/090-player-tracker.css` | 130 |

### missions — 3 numbered imports (all interleaved)
| Manifest line | File | Lines |
|---|---|---|
| 36 | `missions/040-missions.css` | 4 |
| 56 | `missions/060-missions.css` | 206 |
| 80 | `missions/087-missions.css` | 15 |

### portals — 14 numbered imports (all interleaved)
| Manifest line | File | Lines |
|---|---|---|
| 20 | `portals/019-portals.css` | 81 |
| 22 | `portals/021-portals.css` | 82 |
| 24 | `portals/023-portals.css` | 5 |
| 28 | `portals/027-portals.css` | 4 |
| 30 | `portals/030-portals.css` | 79 |
| 33 | `portals/035-portals.css` | 4 |
| 35 | `portals/039-portals.css` | 9 |
| 37 | `portals/041-portals.css` | 28 |
| 39 | `portals/043-portals.css` | 8 |
| 41 | `portals/045-portals.css` | 20 |
| 43 | `portals/047-portals.css` | 83 |
| 59 | `portals/063-portals.css` | 53 |
| 68 | `portals/074-portals.css` | 3 |
| 78 | `portals/085-portals.css` | 15 |

### search — 3 numbered imports (interleaved with ui)
| Manifest line | File | Lines |
|---|---|---|
|  7 | `search/006-search.css` | 17 |
|  9 | `search/008-search.css` | 107 |
| 11 | `search/010-search.css` | 96 |

### shell — 1 numbered import
| Manifest line | File | Lines |
|---|---|---|
|  4 | `shell/003-shell.css` | 6 |

### side-panels — 4 numbered imports (all interleaved)
| Manifest line | File | Lines |
|---|---|---|
| 23 | `side-panels/022-side-panels.css` | 4 |
| 51 | `side-panels/055-side-panels.css` | 5 |
| 53 | `side-panels/057-side-panels.css` | 4 |
| 62 | `side-panels/066-side-panels.css` | 267 |

### styles/team — 3 numbered imports (interleaved)
| Manifest line | File | Lines |
|---|---|---|
| 21 | `styles/020-team.css` | 19 |
| 32 | `styles/034-team.css` | 7 |
| 63 | `styles/067-team.css` | 11 |

### styles/temporary — 2 imports (responsive blocks)
| Manifest line | File | Lines |
|---|---|---|
| 64 | `styles/068-temporary.css` | 92 |
| 69 | `styles/075-temporary.css` | 83 |

### system — 9 numbered imports (all interleaved)
| Manifest line | File | Lines |
|---|---|---|
| 13 | `system/012-system.css` | 27 |
| 16 | `system/015-innerstatus.css` | 36 |
| 38 | `system/042-system.css` | 4 |
| 58 | `system/062-system.css` | 27 |
| 60 | `system/064-system.css` | 25 |
| 66 | `system/070-system.css` | 30 |
| 70 | `system/076-system.css` | 4 |
| 72 | `system/078-system.css` | 13 |
| 74 | `system/080-divider.css` | 5 |

### ui — 12 numbered imports (all interleaved)
| Manifest line | File | Lines |
|---|---|---|
|  3 | `ui/002-ui.css` | 9 |
|  8 | `ui/007-ui.css` | 14 |
| 10 | `ui/009-ui.css` | 9 |
| 25 | `ui/024-summary-layout.css` | 13 |
| 27 | `ui/026-summary-cell.css` | 22 |
| 40 | `ui/044-summary.css` | 28 |
| 42 | `ui/046-ui.css` | 15 |
| 44 | `ui/048-panel.css` | 28 |
| 46 | `ui/050-panel.css` | 10 |
| 48 | `ui/052-panel.css` | 10 |
| 50 | `ui/054-ui.css` | 6 |
| 65 | `ui/069-ui.css` | 4 |

---

## 5. Per-Owner Group Decisions

---

### `auth` — 2 chunks at lines 18 and 73

**Decision: `KEEP_NUMBERED_FOR_NOW`**

The two auth chunks are separated by 55 imports (lines 18–73). `017-auth.css` (72 lines) contains the main auth-screen layout, input styling, and PIN overlay rules. `079-auth.css` (13 lines) appears late, likely adding a narrow override or secondary auth state. Merging them would move the `079` content from after `system/078` to after `ui/status-text`, skipping 55 cascade positions. No cascade equivalence proof exists.

**Safe future rename:** `017-auth.css` → `auth/auth-screen.css` and `079-auth.css` → `auth/auth-overlay.css`, if each is confirmed as a distinct UI context with no cascade dependency on the intervening imports. This is Phase 4 cascade analysis work.

---

### `comm` — 2 chunks at lines 52 and 57

**Decision: `KEEP_NUMBERED_FOR_NOW`**

`056-comm.css` (6 lines) and `061-comm.css` (157 lines) are separated by `side-panels/057` and `map/058`, and `missions/060`. `056` likely defines a thin structural rule that the `057-side-panels` / `058-map` / `060-missions` rules may rely on positioning. `061` contains the bulk of comm UI. Merging would move the 6-line structural rule 5 positions earlier in the cascade (or pull `061`'s 157 lines back), which is not proven safe.

**Safe future rename:** `056-comm.css` → `comm/comm-layout.css` and `061-comm.css` → `comm/comm.css` as distinct files with documented anchor comments. Merge into one `comm/comm.css` only after proving the 4 intervening imports do not depend on `056`'s rules being declared before them.

---

### `layers` — 2 non-adjacent chunks at lines 77 and 79

**Decision: `KEEP_NUMBERED_FOR_NOW`**

`084-layers.css` (54 lines) and `086-layers.css` (12 lines) are separated by `portals/085-portals.css`. Merging them would remove `085-portals` from the cascade position between them. The Phase 3A plan explicitly flagged this as requiring Phase 4.

**Blocked name:** `layers/layers.css` is reserved as the final target for all four layers chunks (`layer-toggle.css` + `084` + `086`). Do not claim `layers.css` until all three imports can be merged with cascade proof.

**Safe future implementation:** If `085-portals.css` (15 lines) can be proven not to depend on any rule in `084-layers.css`, then `084` and `086` could be merged first, with `085-portals` staying in place. This is still a cascade proof requirement; do not skip it.

---

### `map` — 9 core + 2 player-tracker chunks across lines 5–83

**Decision: `KEEP_NUMBERED_FOR_NOW`**

The map chunks are the most widely interleaved in the manifest. They appear at lines 5, 12, 14, 45, 47, 49, 54, 71, 76 — interspersed throughout the entire manifest with ui, system, portals, side-panels, shell, and layers content. Each map chunk occupies a specific cascade slot earned by the original monolithic ordering. No safe consolidation is possible without a full cascade equivalence proof for each chunk gap.

The two player-tracker chunks (`088`, `090`) are separated only by `draw-tools/draw-tools.css` (1 import). This is the closest thing to an adjacent pair in the map group, but merging them would move `090`'s rules before `draw-tools`, which may have visual implications for player-tracker overlays rendered on the draw-tools layer.

**Safe future rename targets:**
- `map/004-map.css` → `map/map-base.css` (standalone if no other map chunk depends on it being in early position)
- `map/077-map.css` → `map/map-camera.css` or similar (subject to content review)
- `map/088-player-tracker.css` + `map/090-player-tracker.css` → `map/player-tracker.css` **only after** proving `draw-tools/draw-tools.css` has no cascade dependency on `088`'s rules being before it. This is the most realistic Phase 4B target for map.

**Blocked name:** `map/map.css` is reserved as the eventual full-consolidation target. Do not claim it for any single chunk rename.

---

### `missions` — 3 chunks at lines 36, 56, 80

**Decision: `KEEP_NUMBERED_FOR_NOW`**

Three missions chunks span 44 manifest positions (36–80). `040-missions.css` (4 lines) is tiny — likely a stub or base rule. `060-missions.css` (206 lines) is the largest missions file by far — the full missions panel. `087-missions.css` (15 lines) comes very late after map and layers content. The three positions are too far apart and too surrounded by portals/system/map content to merge without cascade analysis.

**Safe future rename:** Each could be renamed descriptively (`missions-base.css`, `missions-panel.css`, `missions-footer.css` or similar) using `KEEP_NUMBERED_FOR_NOW` anchor positions, as a Phase 4B naming-only step that doesn't change import order.

---

### `portals` — 14 chunks distributed across lines 20–85

**Decision: `KEEP_NUMBERED_FOR_NOW`**

Portals is the most fragmented owner in the manifest with 14 chunks. Every portals chunk is surrounded by non-portals imports on at least one side. Several are single-digit line counts (e.g. `023` = 5 lines, `027` = 4 lines, `074` = 3 lines) suggesting they are narrow rule additions that were placed precisely for cascade reasons. Moving any of them risks overriding or being overridden by adjacent foreign rules.

**Note on tiny chunks:** `027-portals.css` (4 lines), `023-portals.css` (5 lines), `035-portals.css` (4 lines), `074-portals.css` (3 lines) are all very small. Their content may be single-selector tweaks that exist in their exact manifest position for a reason. These are candidates for careful annotation rather than movement.

**Blocked name:** `portals/portals.css` is reserved as the eventual consolidation target. No single numbered chunk should be renamed to it.

---

### `search` — 3 chunks at lines 7, 9, 11

**Decision: `MERGE_WITH_ANCHOR_PROOF_REQUIRED`**

The three search chunks are tightly clustered near the top of the manifest (lines 7, 9, 11) but each is separated from the next by a `ui` chunk (`007-ui.css` at line 8, `009-ui.css` at line 10). The pattern is:

```
search/006  →  ui/007  →  search/008  →  ui/009  →  search/010
```

This is a strict ui/search interleave. `007-ui.css` (14 lines) and `009-ui.css` (9 lines) are small. The question is whether the `ui` rules at those positions override or are overridden by `search` rules in a cascade-order-dependent way.

**Safe future slice:** If `007-ui.css` and `009-ui.css` can be proven to contain no selectors that depend on cascade order relative to `search` (e.g. they target completely disjoint selectors), then all five files could be collapsed into two: `search/search.css` and `ui/ui-early.css` with proper anchor order. This is the most promising Phase 4B target in the upper manifest region.

**Blocked name:** `search/search.css` is reserved as the full target. Do not claim it for a single-chunk rename of `006`.

---

### `shell` — 1 chunk at line 4

**Decision: `RENAME_SINGLE_REMAINING_SLOT`**

`003-shell.css` (6 lines) is the only remaining numbered shell chunk. `shell-panels.css` (Phase 3B) covers the lower shell block. `003-shell.css` is at manifest line 4, very early, and its content is a small root-level shell rule (`.iitc-iris-shell` or equivalent). It is separated from `shell-panels.css` by 63 positions, so no merge is possible yet.

**However**, as the sole remaining numbered shell import, it is a **Phase 2–style rename candidate**. It can safely be renamed to `shell/shell.css` — the name that was reserved for it since Phase 3B — without changing any import order. This is the lowest-risk remaining numbered file in the entire manifest.

**Recommended next action:** Rename `shell/003-shell.css` → `shell/shell.css` and update the import in `iitc-iris.css`. This is a Phase 2–style single-rename with no cascade effect, suitable for a small Phase 4B implementation slice.

---

### `side-panels` — 4 chunks at lines 23, 51, 53, 62

**Decision: `KEEP_NUMBERED_FOR_NOW`**

`022-side-panels.css` (4 lines) is early and isolated. `055-side-panels.css` (5 lines) and `057-side-panels.css` (4 lines) are adjacent in position (separated only by `comm/056-comm.css`), making them a secondary adjacent cluster — but since `056-comm.css` sits between them, they are still interleaved by one foreign import. `066-side-panels.css` (267 lines) is the largest chunk and comes much later.

**Closest to safe:** `055` and `057` are separated by only `056-comm.css`. If `056-comm.css` is proven not to interleave with side-panels CSS rules at the selector level, `055` and `057` could be merged into `side-panels/side-panels-mid.css` (block-local name). This is a Phase 4B cascade analysis candidate.

**Blocked name:** `side-panels/side-panels.css` is reserved as the full target.

---

### `styles/team` — 3 chunks at lines 21, 32, 63

**Decision: `KEEP_NUMBERED_FOR_NOW`**

The three team chunks (`020-team.css`, `034-team.css`, `067-team.css`) are spread across 42 manifest positions. Team styles define `--portal-team-color` and related custom properties used by portals, portal-analysis, and UI summary components. The cascade position of each team chunk affects whether downstream portals/portal-analysis/ui imports can override team colour variables. Moving them requires proving that no foreign import between them depends on reading team variables at a specific cascade point.

**Safe future rename:** Each could be renamed with descriptive suffixes (`team-base.css`, `team-overrides.css`, `team-late.css`) without changing import order. The renaming alone is Phase 2–style safe; the merge is not.

---

### `styles/temporary` — 2 responsive blocks at lines 64 and 69

**Decision: `DEFER_TO_RESPONSIVE_PHASE`**

`068-temporary.css` (92 lines) and `075-temporary.css` (83 lines) are broad `@media (width <= 760px)` blocks established in Phase 0 as `RESPONSIVE_MIXED`. They span selectors from multiple feature domains and were intentionally left intact to avoid responsive cascade drift. These are the primary target of Phase 5.

**Blocked name:** `styles/mobile.css` is reserved as the Phase 5 consolidation target.

---

### `system` — 9 chunks across lines 13–74 (including `080-divider.css`)

**Decision: `KEEP_NUMBERED_FOR_NOW`** (with `TEMPORARY_REVIEW` sub-flag for `015` and `080`)

System chunks are densely interleaved throughout the manifest. The seven main system chunks (`012`, `042`, `062`, `064`, `070`, `076`, `078`) contain diagnostics, innerstatus, and layout rules; several are tiny (4–5 lines), suggesting narrow cascade-position additions.

**Sub-decisions by file:**

| File | Lines | Sub-decision | Reason |
|---|---|---|---|
| `012-system.css` | 27 | `KEEP_NUMBERED_FOR_NOW` | Interleaved between two map chunks; move risks map cascade |
| `015-innerstatus.css` | 36 | `TEMPORARY_REVIEW` | Targets page-runtime/IITC DOM; classified `KEEP_TEMPORARILY` in Phase 1 |
| `042-system.css` | 4 | `KEEP_NUMBERED_FOR_NOW` | Tiny; interleaved between portals chunks `041` and `043` |
| `062-system.css` | 27 | `KEEP_NUMBERED_FOR_NOW` | Separated from `064` by `portals/063`; portals rule may depend on this position |
| `064-system.css` | 25 | `KEEP_NUMBERED_FOR_NOW` | Between portals and empty-state; safe rename candidate later |
| `070-system.css` | 30 | `KEEP_NUMBERED_FOR_NOW` | Between `ui/069` and `shell-panels`; cascade anchor |
| `076-system.css` | 4 | `KEEP_NUMBERED_FOR_NOW` | Tiny; separated from `078` by `map/077`; move risks map cascade |
| `078-system.css` | 13 | `KEEP_NUMBERED_FOR_NOW` | Between `map/077` and `auth/079`; cascade anchor |
| `080-divider.css` | 5 | `TEMPORARY_REVIEW` | `.iitc-iris-divider` selector has no confirmed TSX source usage; marked `KEEP_TEMPORARILY` |

**Adjacent near-pair:** `062-system.css` and `064-system.css` are separated only by `portals/063-portals.css` (53 lines). This is the best system consolidation candidate for Phase 4B cascade analysis.

---

### `ui` — 12 numbered chunks across lines 3–65

**Decision: `KEEP_NUMBERED_FOR_NOW`** (with `MERGE_WITH_ANCHOR_PROOF_REQUIRED` for the panel sub-group)

The UI chunks are the most diverse in the manifest — they include root utility rules (`002`, `007`, `009`), summary variants (`024`, `026`, `044`), panel rules (`048`, `050`, `052`), and miscellaneous overrides (`046`, `054`, `069`).

**Sub-decisions by sub-group:**

| Sub-group | Files | Sub-decision | Reason |
|---|---|---|---|
| ui-root | `002-ui.css` (9L), `007-ui.css` (14L), `009-ui.css` (9L), `046-ui.css` (15L), `054-ui.css` (6L), `069-ui.css` (4L) | `KEEP_NUMBERED_FOR_NOW` | Distributed across the entire manifest; each interleaved with search, portals, side-panels, system, or shell content |
| ui-summary | `024-summary-layout.css` (13L), `026-summary-cell.css` (22L), `044-summary.css` (28L) | `MERGE_WITH_ANCHOR_PROOF_REQUIRED` | `024` and `026` are separated only by `chip-button.css` (already pretty-named). `044` is far away at line 40 (interleaved). `024`+`026` merge is the best summary Phase 4B candidate if `chip-button.css` is proven non-interleaving. |
| ui-panel | `048-panel.css` (28L), `050-panel.css` (10L), `052-panel.css` (10L) | `MERGE_WITH_ANCHOR_PROOF_REQUIRED` | The three panel chunks are separated by `map/049` and `map/051` respectively. If the two map separators (`049` = 6L, `051` = 10L) can be proven selector-disjoint from the panel rules, the three panel chunks could merge into `ui/panel.css`. This is the most promising Phase 4B target in the UI group. |

**Blocked names:**
- `ui/ui.css` — reserved for eventual full ui-root consolidation.
- `ui/summary.css` — reserved for eventual full summary consolidation (`024` + `026` + `summary-mini.css` + `044`).
- `ui/panel.css` — reserved for eventual full panel consolidation (`048` + `050` + `052`).

---

## 6. Safety Analysis Summary Table

| Owner | Decision | Imports remaining | Reason |
|---|---|---|---|
| `auth` | `KEEP_NUMBERED_FOR_NOW` | 2 | 55-position gap; no cascade proof |
| `comm` | `KEEP_NUMBERED_FOR_NOW` | 2 | 5-position gap; structural/bulk split unclear |
| `layers` | `KEEP_NUMBERED_FOR_NOW` | 2 | `085-portals` separates `084` and `086` |
| `map` (core) | `KEEP_NUMBERED_FOR_NOW` | 9 | Spread entire manifest; no safe merge |
| `map` (player-tracker) | `KEEP_NUMBERED_FOR_NOW` | 2 | `draw-tools` separator; merge requires proof |
| `missions` | `KEEP_NUMBERED_FOR_NOW` | 3 | 44-position spread; no adjacent pairs |
| `portals` | `KEEP_NUMBERED_FOR_NOW` | 14 | Most fragmented owner; all interleaved |
| `search` | `MERGE_WITH_ANCHOR_PROOF_REQUIRED` | 3 | ui/search interleave; small separators |
| `shell` | `RENAME_SINGLE_REMAINING_SLOT` | 1 | Only chunk; safe rename to `shell.css` |
| `side-panels` | `KEEP_NUMBERED_FOR_NOW` | 4 | `055`/`057` near-pair; need comm proof |
| `styles/team` | `KEEP_NUMBERED_FOR_NOW` | 3 | Team vars cascade at specific positions |
| `styles/temporary` | `DEFER_TO_RESPONSIVE_PHASE` | 2 | Phase 5 targets; responsive blocks |
| `system` | `KEEP_NUMBERED_FOR_NOW` | 9 | Dense interleave; `062`+`064` near-pair |
| `ui` (root) | `KEEP_NUMBERED_FOR_NOW` | 6 | Spread across manifest |
| `ui` (summary) | `MERGE_WITH_ANCHOR_PROOF_REQUIRED` | 3 | `024`+`026` near-pair; `044` distant |
| `ui` (panel) | `MERGE_WITH_ANCHOR_PROOF_REQUIRED` | 3 | Map separators may be selector-disjoint |

---

## 7. Candidates for a Future Small Safe Implementation Slice (Phase 4B)

These are the highest-confidence candidates for the next implementation step, ordered by risk:

1. **`RENAME_SINGLE_REMAINING_SLOT` — `shell/003-shell.css` → `shell/shell.css`**
   Risk: None. Single file rename + single import line update. No cascade effect. Completes the shell owner cleanup.

2. **`ui/panel` merge — `048-panel.css` + `050-panel.css` + `052-panel.css` → `ui/panel.css`**
   Pre-condition: Inspect `map/049-map.css` (6L) and `map/051-map.css` (10L) for selector overlap with panel rules. If no selectors in those map files target panel elements, and no panel rules target map elements, merge is cascade-equivalent.

3. **`map/player-tracker` merge — `088-player-tracker.css` + `090-player-tracker.css` → `map/player-tracker.css`**
   Pre-condition: Inspect `draw-tools/draw-tools.css` for any rule that overrides player-tracker styles, or that player-tracker `090` styles override from draw-tools. `draw-tools.css` is a single-purpose layer; this is likely selector-disjoint.

4. **`system/062` + `system/064` near-pair merge — `062-system.css` + `064-system.css` → `system/system-diag.css`**
   Pre-condition: Inspect `portals/063-portals.css` (53L) for selector overlap with system rules at those lines. Block-local name to avoid claiming `system.css`.

5. **`search` consolidation — `006-search.css` + `008-search.css` + `010-search.css` → `search/search.css`**
   Pre-condition: Prove `ui/007-ui.css` (14L) and `ui/009-ui.css` (9L) are selector-disjoint from all search rules. If confirmed, the 5 files can collapse to `search/search.css` + small adjustments to `ui/002-ui.css` region. Complex but high value.

---

## 8. Reserved Filenames (Do Not Claim Early)

The following filenames must remain available for their intended full-owner consolidation and must not be claimed prematurely by partial merges or unrelated renames. Note that `shell/shell.css` is reserved specifically for the remaining `003-shell.css` root chunk and is clearly allowed for the Phase 4B single rename:

| Reserved filename | Waiting for / Usage |
|---|---|
| `shell/shell.css` | Reserved for the `003-shell.css` single rename (clearly allowed for Phase 4B — see §7 item 1) |
| `layers/layers.css` | Full consolidation of `layer-toggle.css` + `084` + `086` |
| `map/map.css` | Full consolidation of all 9 map core chunks |
| `map/player-tracker.css` | Consolidation of `088` + `090` (after draw-tools proof) |
| `search/search.css` | Full consolidation of `006` + `008` + `010` |
| `portals/portals.css` | Full consolidation of all 14 portals chunks |
| `auth/auth.css` | Full consolidation of `017` + `079` |
| `comm/comm.css` | Full consolidation of `056` + `061` |
| `missions/missions.css` | Full consolidation of `040` + `060` + `087` |
| `side-panels/side-panels.css` | Full consolidation of all 4 side-panels chunks |
| `system/system.css` | Full consolidation of all 9 system chunks |
| `styles/team.css` | Full consolidation of `020` + `034` + `067` team chunks |
| `styles/mobile.css` | Phase 5 responsive consolidation of `068` + `075` |
| `ui/ui.css` | Full consolidation of all ui-root chunks |
| `ui/summary.css` | Full consolidation of `summary-mini.css` + `024` + `026` + `044` |
| `ui/panel.css` | Full consolidation of `048` + `050` + `052` |

---

## 9. No Phase 4 Implementation Was Performed

This document is a planning artefact only.

- No CSS files were renamed, merged, created, or deleted.
- `apps/iitc-iris/src/iitc-iris.css` was not modified.
- No CSS contents were edited.
- No TS/TSX files were touched.
- `git status --short` reflects only this new planning document.

---

## Validation

```
git status --short  →  A  docs/iitc-iris/plans/css-refactoring/12-phase-4a-interleaved-owner-plan.md
imports 82
missing 0
```

---

## Hard Stop

Phase 4A planning is complete. Do not proceed to Phase 4B implementation without a new assignment.
