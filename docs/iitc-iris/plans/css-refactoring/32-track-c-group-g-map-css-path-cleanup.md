# IITC IRIS CSS Pretty Architecture - Track C Group G: Map CSS Path Cleanup

Status: Group G Complete. All numbered CSS files in `apps/iitc-iris/src/map/` were moved to descriptive named paths. Shared panel selectors that had lived in `map/` numbered chunks were moved under `apps/iitc-iris/src/ui/panel/` while remaining centrally loaded from `apps/iitc-iris/src/iitc-iris.css`.

Reference plans:
- `docs/iitc-iris/plans/css-refactoring/25-track-c-component-colocation-plan.md`
- `docs/iitc-iris/plans/css-refactoring/31-track-c-group-f-small-domain-css-path-cleanup.md`

## Scope

This was a rename-only pass:
- no CSS selectors changed;
- no CSS declarations changed;
- no files were merged;
- no TSX component-local CSS imports were added;
- the central manifest import order was preserved.

## Path Mapping

| Old path | New path | Responsibility |
|---|---|---|
| `apps/iitc-iris/src/map/004-map.css` | `apps/iitc-iris/src/map/map-root.css` | Map root container |
| `apps/iitc-iris/src/map/011-map.css` | `apps/iitc-iris/src/map/user-location-pin.css` | User location marker |
| `apps/iitc-iris/src/map/013-map.css` | `apps/iitc-iris/src/map/map-controls.css` | Map controls and context panel |
| `apps/iitc-iris/src/map/049-map.css` | `apps/iitc-iris/src/ui/panel/panel-topbar.css` | Shared panel topbar |
| `apps/iitc-iris/src/map/051-map.css` | `apps/iitc-iris/src/ui/panel/panel-header-actions.css` | Shared panel header actions |
| `apps/iitc-iris/src/map/053-map.css` | `apps/iitc-iris/src/ui/panel/panel-state.css` | Shared panel status pill |
| `apps/iitc-iris/src/map/058-map.css` | `apps/iitc-iris/src/ui/panel/panel-footer.css` | Shared panel footer |
| `apps/iitc-iris/src/map/077-map.css` | `apps/iitc-iris/src/map/map-navigation-controls.css` | Map pan/zoom controls |
| `apps/iitc-iris/src/map/083-map.css` | `apps/iitc-iris/src/map/source-toggle.css` | Source toggle modifier |
| `apps/iitc-iris/src/map/088-player-tracker.css` | `apps/iitc-iris/src/map/player-tracker-marker-base.css` | Player tracker marker base |
| `apps/iitc-iris/src/map/090-player-tracker.css` | `apps/iitc-iris/src/map/player-tracker-overlay.css` | Player tracker marker, popup, and overlay styling |

## Manifest Order

The relevant import positions in `apps/iitc-iris/src/iitc-iris.css` were updated in place. The file still contains 75 imports, and the old cascade positions are preserved.

## Verification

These checks passed after Groups G and H were both complete:

| Command | Result |
|---|---|
| `find apps/iitc-iris/src/map -maxdepth 1 -name '*[0-9]*.css' -print` | PASS, no output |
| `find apps/iitc-iris/src -name '*[0-9]*.css' -print` | PASS, no output |
| `npm run typecheck:iitc-iris` | PASS |
| `npm run lint:iitc-iris` | PASS |
| `npm run test:iitc-iris` | PASS |
| `npm run lint:css` | PASS |
| `npm run package:iitc-iris` | PASS |
| `git diff --check` | PASS |

## Issues Or Surprises

None. The shared panel chunks were already semantically panel primitives despite their previous `map/` path, so moving them under `ui/panel/` made ownership clearer without changing loading behavior.
