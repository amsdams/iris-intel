# IITC IRIS CSS Pretty Architecture - Track C Group H: Portals CSS Path Cleanup

Status: Group H Complete. All numbered CSS files in `apps/iitc-iris/src/portals/` were moved to descriptive named paths. The central manifest import order was preserved exactly.

Reference plans:
- `docs/iitc-iris/plans/css-refactoring/25-track-c-component-colocation-plan.md`
- `docs/iitc-iris/plans/css-refactoring/32-track-c-group-g-map-css-path-cleanup.md`

## Scope

This was a rename-only pass:
- no CSS selectors changed;
- no CSS declarations changed;
- no files were merged;
- no TSX component-local CSS imports were added;
- all moved files remain loaded through `apps/iitc-iris/src/iitc-iris.css`.

## Path Mapping

| Old path | New path | Responsibility |
|---|---|---|
| `apps/iitc-iris/src/portals/019-portals.css` | `apps/iitc-iris/src/portals/portal-side-panel-shell.css` | Portal side panel shell, selected title, image, and selected details |
| `apps/iitc-iris/src/portals/021-portals.css` | `apps/iitc-iris/src/portals/portal-side-panel-header.css` | Portal side panel header and owner summary |
| `apps/iitc-iris/src/portals/023-portals.css` | `apps/iitc-iris/src/portals/portal-actions-layout.css` | Portal action button grid |
| `apps/iitc-iris/src/portals/027-portals.css` | `apps/iitc-iris/src/portals/portal-level-summary.css` | Portal level value summary styling |
| `apps/iitc-iris/src/portals/030-portals.css` | `apps/iitc-iris/src/portals/portal-details-actions.css` | Health track, mission enrichment, and portal action buttons |
| `apps/iitc-iris/src/portals/035-portals.css` | `apps/iitc-iris/src/portals/portal-level-cell.css` | Level cell emphasis |
| `apps/iitc-iris/src/portals/039-portals.css` | `apps/iitc-iris/src/portals/portal-list-title-button.css` | Portal list title button text |
| `apps/iitc-iris/src/portals/041-portals.css` | `apps/iitc-iris/src/portals/portal-panel.css` | Portal details panel sections and grids |
| `apps/iitc-iris/src/portals/043-portals.css` | `apps/iitc-iris/src/portals/portal-section.css` | Portal collapsible section layout |
| `apps/iitc-iris/src/portals/045-portals.css` | `apps/iitc-iris/src/portals/portal-facts-grids.css` | Portal facts, resonator grid, and mod grid layout |
| `apps/iitc-iris/src/portals/047-portals.css` | `apps/iitc-iris/src/portals/portal-slots.css` | Resonator and mod slot styling |
| `apps/iitc-iris/src/portals/063-portals.css` | `apps/iitc-iris/src/portals/portal-image-preview.css` | Portal image preview modal |
| `apps/iitc-iris/src/portals/074-portals.css` | `apps/iitc-iris/src/portals/portal-side-panel-stacked.css` | Stacked portal side panel height |
| `apps/iitc-iris/src/portals/085-portals.css` | `apps/iitc-iris/src/portals/portal-map-icons.css` | Portal ornament, artifact, and level map icon labels |

## Manifest Order

The old numbered imports in `apps/iitc-iris/src/iitc-iris.css` were replaced in place with the new named paths. No import moved relative to another import.

## Verification

These checks passed:

| Command | Result |
|---|---|
| `find apps/iitc-iris/src/portals -maxdepth 1 -name '*[0-9]*.css' -print` | PASS, no output |
| `find apps/iitc-iris/src -name '*[0-9]*.css' -print` | PASS, no output |
| `npm run typecheck:iitc-iris` | PASS |
| `npm run lint:iitc-iris` | PASS |
| `npm run test:iitc-iris` | PASS |
| `npm run lint:css` | PASS |
| `npm run package:iitc-iris` | PASS |
| `git diff --check` | PASS |

## Issues Or Surprises

None. The portal chunks had clear selector ownership and could be renamed without changing cascade behavior.
