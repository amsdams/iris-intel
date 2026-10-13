# IITC IRIS CSS Pretty Architecture - Track C Final Audit

Status: Track C complete. The component folder layout and numbered CSS path cleanup are finished.

## Final Shape

The current architecture is:

- component TSX, tests, and safe component-local CSS are co-located in component folders;
- unsafe cascade-sensitive component CSS may live beside the component but remains loaded from
  `apps/iitc-iris/src/iitc-iris.css`;
- `apps/iitc-iris/src/iitc-iris.css` remains the single ordered central manifest for global, shared, responsive, and
  cascade-sensitive CSS;
- numbered CSS filenames have been eliminated from `apps/iitc-iris/src/`.

## Completed Track C Groups

| Group   | Result                                                                                                  |
| ------- | ------------------------------------------------------------------------------------------------------- |
| Group A | Co-located first UI primitives: clear button, empty state, diagnostics chip, chip button                |
| Group B | Co-located segmented controls                                                                           |
| Group C | Co-located flat UI helpers: action button, text input, summary grid, summary cell, control row, section |
| Group D | Co-located remaining UI components: badge, status text, panel, layer choice                             |
| Group E | Removed numbered CSS filenames from `ui/`                                                               |
| Group F | Removed numbered CSS filenames from smaller domains                                                     |
| Group G | Removed numbered CSS filenames from `map/`                                                              |
| Group H | Removed numbered CSS filenames from `portals/`                                                          |

## Final Checks

| Check                                                   | Result                                      |
| ------------------------------------------------------- | ------------------------------------------- |
| `find apps/iitc-iris/src -name '*[0-9]*.css' -print`    | PASS, no output                             |
| `rg -c "^@import url" apps/iitc-iris/src/iitc-iris.css` | PASS, 75 at Track C; 52 after A–E                            |
| `npm run typecheck:iitc-iris`                           | PASS                                        |
| `npm run lint:iitc-iris`                                | PASS                                        |
| `npm run test:iitc-iris`                                | PASS, 60 files / 346 tests                  |
| `npm run lint:css`                                      | PASS                                        |
| `npm run package:iitc-iris`                             | PASS, `dist/iitc-iris.css` remains 61.22 kB |
| `git diff --check`                                      | PASS                                        |

## Known Intentional Central CSS

The following categories intentionally remain in the central manifest:

- app foundations: `styles/globals.css`;
- shell and mobile layout layers: `shell/shell.css`, `shell/shell-panels.css`, `styles/mobile-dock-panels.css`,
  `styles/mobile-sheet-analysis.css`;
- cascade-sensitive component or utility CSS, including `badge/badge.css`, `status-text/status-text.css`,
  `portal-analysis/portal-list-title-reset.css`, `layers/layer-toggle.css`;
- shared UI primitives and panel primitives whose order matters relative to feature CSS;
- named feature CSS that is still central-loaded by design.

## What Is Not Done

No behavior or visual redesign was attempted. No CSS selectors were renamed. No declaration values were intentionally
changed. At Track C closeout no merge pass had been performed; the A–E follow-up checkpoint below records the later
consolidation and intentional separate cascade positions.

## Follow-Up Checkpoint — 2026-10-14

Gate 0 and A–E are implemented and automatically validated. The missing portal-shell styles are restored, and search
follows its shared control/list bases. Panel styles precede scroll-region. Portal, map, tracker, and layer bundles are
loaded, copied fragments and backups are removed, and 14 feature components are colocated behind compatible barrels.
One isolated mission-authoring stylesheet now loads locally; F–H remain excluded.

- Central imports: **75 → 52**.
- Packaged CSS: **61,215 bytes / 61.22 kB**, with an identical emitted selector/declaration multiset.
- Focused declaration-cascade comparison: 2,460 element checks across five sheet contexts, two widths, and three states.
- Production `content.js`: byte-for-byte identical to the baseline.
- Typecheck, app lint, CSS lint, 60 test files / 346 tests, packaging, and diff check: pass.
- User-reported smoke test on 2026-10-14: “smoke test looks fine.” The A–E checkpoint is accepted; browser/device
  details and individual scenarios were not recorded. Packaging retains three existing missing-fixture fallback warnings.

Full per-pass counts, ownership decisions, and cascade exceptions are recorded in
`35-css-architecture-followups.md`. Structural declaration checks do not replace browser layout/paint validation.

## Recommended Next Session

Gate 0 / A–E are accepted after automated checks and the user-reported smoke test. No further implementation is requested.
Read the follow-up plan's suggestions before any later, targeted UI architecture review. Keep F–H deferred unless
separately requested; do not repeat completed work or consolidate solely to lower the current 52 imports.
