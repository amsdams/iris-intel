# IITC IRIS CSS Pretty Architecture - Track C Final Audit

Status: Track C complete. The component folder layout and numbered CSS path cleanup are finished.

## Final Shape

The current architecture is:

- component TSX, tests, and safe component-local CSS are co-located in component folders;
- unsafe cascade-sensitive component CSS may live beside the component but remains loaded from `apps/iitc-iris/src/iitc-iris.css`;
- `apps/iitc-iris/src/iitc-iris.css` remains the single ordered central manifest for global, shared, responsive, and cascade-sensitive CSS;
- numbered CSS filenames have been eliminated from `apps/iitc-iris/src/`.

## Completed Track C Groups

| Group | Result |
|---|---|
| Group A | Co-located first UI primitives: clear button, empty state, diagnostics chip, chip button |
| Group B | Co-located segmented controls |
| Group C | Co-located flat UI helpers: action button, text input, summary grid, summary cell, control row, section |
| Group D | Co-located remaining UI components: badge, status text, panel, layer choice |
| Group E | Removed numbered CSS filenames from `ui/` |
| Group F | Removed numbered CSS filenames from smaller domains |
| Group G | Removed numbered CSS filenames from `map/` |
| Group H | Removed numbered CSS filenames from `portals/` |

## Final Checks

| Check | Result |
|---|---|
| `find apps/iitc-iris/src -name '*[0-9]*.css' -print` | PASS, no output |
| `rg -c "^@import url" apps/iitc-iris/src/iitc-iris.css` | PASS, 75 imports |
| `npm run typecheck:iitc-iris` | PASS |
| `npm run lint:iitc-iris` | PASS |
| `npm run test:iitc-iris` | PASS, 60 files / 346 tests |
| `npm run lint:css` | PASS |
| `npm run package:iitc-iris` | PASS, `dist/iitc-iris.css` remains 61.22 kB |
| `git diff --check` | PASS |

## Known Intentional Central CSS

The following categories intentionally remain in the central manifest:

- app foundations: `styles/globals.css`;
- shell and mobile layout layers: `shell/shell.css`, `shell/shell-panels.css`, `styles/mobile-dock-panels.css`, `styles/mobile-sheet-analysis.css`;
- cascade-sensitive component or utility CSS, including `badge/badge.css`, `status-text/status-text.css`, `portal-analysis/portal-list-title-reset.css`, `layers/layer-toggle.css`;
- shared UI primitives and panel primitives whose order matters relative to feature CSS;
- named feature CSS that is still central-loaded by design.

## What Is Not Done

No behavior or visual redesign was attempted. No CSS selectors were renamed. No declaration values were intentionally changed. No merge pass was performed after Track C; many named files remain separate to preserve the original cascade positions.

## Recommended Next Session

Start with a manual smoke test, not another broad refactor:

1. Open the app in Firefox desktop and verify map controls, portal details, search, side panels, layers, missions, COMM, and draw tools.
2. Do one narrow mobile or small-width sheet smoke test.
3. If the UI looks correct, commit the CSS architecture branch.
4. Only after that, decide whether to use `docs/iitc-iris/plans/css-refactoring/35-css-architecture-followups.md` for optional manifest compression or feature component folder work.

Track C should be treated as complete unless smoke testing reveals a concrete regression.
