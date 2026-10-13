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
| `rg -c "^@import url" apps/iitc-iris/src/iitc-iris.css` | PASS, 75 at Track C; 52 after A–E; 43 after F; 38 after G; 37 after H                            |
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

## Follow-Up F Checkpoint — 2026-10-19

Follow-Up F is accepted after automated checks and the user-reported successful smoke test. Early system layout and late system actions stay in separate
bundles, auth styles are combined, and shell-panel overrides remain at their former late anchor inside the combined
shell stylesheet. Both mobile stylesheets remain separate and unchanged. G was requested afterward and is recorded below.

- Central imports: **52 → 43**.
- Packaged CSS: **61,215 bytes / 61.22 kB**, with an identical pre/post-F emitted selector/declaration multiset.
- Production `content.js`: byte-for-byte identical to pre-F.
- Focused declaration-cascade checks: **5,256** element comparisons across six sheet contexts, four widths, and three states.
- CSS lint, typecheck, 60 test files / 346 tests, packaging, and diff check: pass.
- User F smoke test on 2026-10-19: “looks good.” Browser/device details and individual scenarios were not recorded.
- Existing three missing-fixture packaging warnings remain.

Details and ordering exceptions are recorded in `35-css-architecture-followups.md`.

## Follow-Up G Checkpoint — 2026-10-19

Follow-Up G is accepted after automated checks and the user-reported successful smoke test. Eleven fragments are combined into centrally loaded bundles
for side panels, COMM, missions, and portal analysis. Mission-create-link and analysis table-action styles join their
feature bundles; three former local CSS imports are removed. Mobile overrides and the separate title-reset anchor stay
in place. H was requested afterward and is recorded below; component/API redesign remains deferred.

- Central imports: **43 → 38**.
- Packaged CSS: **61,215 bytes / 61.22 kB**, with an identical pre/post-G emitted selector/declaration multiset.
- Production `content.js`: byte-for-byte identical to pre-G.
- **37,716 element declaration-cascade comparisons** passed across seven sheet contexts, widths 380/760/761/1200px,
  and normal/hover/focus states.
- CSS/app lint, typecheck, 60 test files / 346 tests, packaging, and diff check: pass.
- User G smoke test on 2026-10-19: “looks good.” Browser/device details and individual scenarios were not recorded.
- Existing three missing-fixture packaging warnings remain.

These declaration-cascade checks do not simulate browser layout, inheritance, shorthand expansion, or paint.
See `35-css-architecture-followups.md` for bundle anchors, ordering decisions, and temporary verification artifacts.

## Follow-Up H Checkpoint — 2026-10-19

Follow-Up H is accepted after automated checks and the user-reported successful smoke test. ActionButton now imports its own base CSS. Five other named
candidates already load locally and require no migration. SummaryCell stays centrally loaded because its one-class
base declarations must precede the composed portal-list summary and mobile overrides. Shared bases and other explicit
central-order exceptions retain their loading.

- Central imports: **38 → 37**.
- Packaged CSS: **61,215 bytes / 61.22 kB**, with an identical pre/post-H emitted selector/declaration multiset.
- All emitted rules except the two moved ActionButton rules retain their relative order.
- Production `content.js`: byte-for-byte identical to pre-H.
- Focused declaration-cascade checks: **43,092** element comparisons across seven sheet contexts, four widths, and
  normal/hover/focus states, including enabled/disabled, submit, and danger actions.
- CSS/app lint, typecheck, 60 test files / 346 tests (including ActionButton/SubmitActionButton), packaging, and diff check: pass.
- User H smoke test on 2026-10-19: “looks good still.” Browser/device details and individual scenarios were not recorded.
- Existing three missing-fixture packaging warnings remain.

The structural checks do not simulate browser layout, inheritance, shorthand expansion, or paint.
See `35-css-architecture-followups.md` for candidate decisions, ordering dependencies, and temporary verification artifacts.

## Recommended Next Session

Gate 0 and A–H are closed within their documented scope. Component CSS ownership is complete with passing automated
checks and user smoke acceptance under [36-component-css-ownership-plan.md](36-component-css-ownership-plan.md):
component/feature appearance loads through its owners, with 10 documented central infrastructure imports.
Next, review primitives and actual callers for component simplification and fewer visual variants before changing APIs.
