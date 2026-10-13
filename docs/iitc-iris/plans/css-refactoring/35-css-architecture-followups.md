# IITC IRIS CSS Architecture Follow-Ups

Status: Gate 0 and A–E accepted on 2026-10-14 after automated checks and a user-reported successful smoke test. Follow-Up F accepted on 2026-10-19 after automated checks and the user-reported successful smoke test. G accepted on 2026-10-19 after automated checks and the user-reported successful smoke test. H accepted on 2026-10-19 after automated checks and the user-reported successful smoke test. Gate 0 and A–H are closed with their documented ordering exceptions.

## Current Baseline

Track C produced a stable, safe architecture:

- UI components live in component folders with `index.ts` barrels.
- Safe component-local CSS is imported from owning components.
- Cascade-sensitive CSS may live beside a component but remains loaded by `apps/iitc-iris/src/iitc-iris.css`.
- Numbered CSS filenames have been eliminated from `apps/iitc-iris/src/`.
- `apps/iitc-iris/src/iitc-iris.css` remains the ordered central manifest.

Gate 0 repaired the first panel/search compression: restored the portal shell import, placed shared control/list
styles before search overrides, placed the panel bundle before scroll-region, removed obsolete search fragments and
the source backup, and normalized the manifest. Gate 0 restored a 67-import checkpoint; the accepted A–E manifest had 52 active imports (75 at Track C). Follow-Up F reduced the manifest to 43, G to 38, and H to 37. Subsequent accepted component ownership work under [plan 36](36-component-css-ownership-plan.md) reached 10 central infrastructure imports.

This is acceptable and maintainable, but the desired finish line is now clearer: keep central loading for global and
cascade-sensitive layers, while reducing one-file-per-selector-area imports that make `iitc-iris.css` feel like a dump.

## Execution Record — 2026-10-14

Scope of the 2026-10-14 assignment: Gate 0 and A–E only. F–H were deferred at that checkpoint. Execution order was Gate 0 / A, D, E, B (one domain per pass), C. The subsequent F, G, and H passes are recorded separately below.

| Pass | Imports before → after | CSS changes | Validation |
|---|---|---|---|
| Gate 0 / A | 66 → 67 (75 → 67 versus Track C) | Restore portal shell; retain `search.css` and `ui/panel/panel.css` with their original internal rules; restore shared-base ordering; delete obsolete search fragments and `.bak` | CSS lint, typecheck, 60 test files / 346 tests, package, and diff check passed; CSS bundle restored to 61.22 kB |
| D | 67 → 57 | Load `portals/portal-side-panel.css`, `portal-details.css`, and `portal-content.css`; delete their copied fragments; keep stacked, map-icons, image-preview, title-reset, and local mini-track styles separate | CSS lint, all 346 tests, package, diff check, and emitted CSS comparison passed |
| E | 57 → 53 | Load `map/map.css`, `map/player-tracker.css`, and `layers/layers.css`; delete their copied fragments; keep navigation, source-toggle, and layer-toggle separate | CSS lint, all 346 tests, package, diff check, and emitted CSS comparison passed |
| B: search | 53 → 53 | Move `search.css` to `search/search-panel/` alongside TSX and a barrel | Typecheck, app lint, all 346 tests, package, and diff check passed |
| B: missions | 53 → 53 | Move `missions-panel.css` and `mission-create-link.css` beside `missions-panel.tsx`; keep map waypoint labels at their map-owned seam | Typecheck, app lint, all 346 tests, package, and diff check passed |
| B: COMM | 53 → 53 | Move send-form CSS to `comm-panel-body/` and message-list CSS to `comm-message-list/`; colocate all four COMM components | Typecheck, app lint, all 346 tests, package, and diff check passed |
| B: side panels | 53 → 53 | Move form/input CSS to `passcode-panel/`; colocate agent, scores, passcode, and inventory components; retain shared CSS in the domain | Typecheck, app lint, all 346 tests, package, and diff check passed |
| B: portal analysis | 53 → 53 | Colocate counts, list, scoreboard, and shared table; move the table test with its component; retain shared domain CSS | Typecheck, app lint, all 346 tests, package, and diff check passed |
| C | 53 → 52 | Import isolated `mission-create-link.css` from its owning missions component; remove its manifest import | Typecheck, app lint, CSS lint, all 346 tests, package, diff check, and emitted CSS comparison passed |

All B moves preserve the previous public import paths with `index.ts` barrels. The 14 relocated components changed only
relative imports; C additionally adds one CSS import. No persisted identifiers, messages, behavior, selectors, or CSS
values changed. The compiled production `content.js` is byte-for-byte identical to the pre-follow-up baseline.

### Cascade decisions and intentional exceptions

- Gate 0 / A: the old search fragments were interleaved with `control.css` and `list-item.css`, so blindly merging at
  the earliest import was unsafe. The accepted repair places the full search bundle after both shared bases. The moved
  shell selectors target search descendants, not the shared input/row elements. The panel bundle stays at the original
  panel-shell anchor, before scroll-region. This is the necessary exception to A's adjacent-only rule when repairing
  the existing failed merge; system compression remains assigned to excluded Follow-Up F.
- D: the side-panel base/header bundle stays before team-color overrides. The stacked height override stays after
  shell-panels at its original anchor. `portal-details.css` holds early action/level rules before the title reset and
  mission-authoring link override. `portal-content.css` holds title-button/panel/section/fact/slot rules after the title
  reset. The intervening diagnostic-grid selector does not compose with those portal elements. The level-cell and
  team-pill classes are applied to different cells/badges; portal-analysis table overrides remain more specific.
  `portal-summary-mini-track.css` retains its existing component-local import rather than being duplicated in a bundle.
- E: `map.css` contains map root, location-pin, and control-shell rules at the original control-shell anchor, before
  shell/mobile overrides. Navigation stays separate because its map-status class composes with `StatusText` and must
  follow the shared status base. Source-toggle stays after layer-toggle because both declare `min-width` for the same
  source-toggle class. Layer-toggle stays central for its existing cascade-sensitive reason. Tracker and layer-control
  bundles preserve their original internal order; key-label and portal-icon selectors target separate marker elements.
- B: shared agent-name CSS is also used by portal details, and `scores-agent-panel.css` covers scores, agents, and
  inventory. These stay shared rather than being assigned to one component. Portal-analysis foundations and shared
  table actions likewise keep their existing ownership/loading model. Mission waypoint labels are generated by the map
  runtime, so that CSS remains centrally loaded in `missions/` rather than becoming a panel dependency.
- C: mission-authoring-link CSS is isolated to the missions component and retains its precedence over portal-action
  defaults when emitted locally. Search and COMM remain central because their badge/row styles have mobile overrides;
  broad local migration would require a separate order proof. No H UI-primitive migration was performed.

### Final verification

- Active central imports: **52** (all at column 1, consistent single quotes, all targets exist).
- No numbered CSS, backup/scratch files under `src`, or stray top-level `ui/` directory.
- CSS output: **61,215 bytes / 61.22 kB**, equal to the Track C baseline size. Rule order changes are intentional;
  the output is not byte-for-byte identical, but its selector/declaration multiset is identical.
- Temporary verification assets live outside source under `/private/tmp/iitc-iris-css-baseline`,
  `/private/tmp/iitc-iris-central-baseline.css`, and `/private/tmp/iitc-iris-css-verify.cjs`. The baseline build expands
  the `HEAD` central imports while retaining the existing local imports. PostCSS and selector-specificity parsing compare
  emitted selector/declaration records, then compare matching declaration winners on representative DOM fixtures.
- **2,460 element declaration-cascade comparisons** passed across portal/search/COMM/view/map sheet contexts, 380px and
  1200px widths, and normal/hover/focus states. These are focused structural checks, not a browser layout/paint test;
  they do not simulate inheritance or shorthand expansion.
- Production JavaScript remained byte-for-byte identical, and static checks, all 346 tests, packaging, and diff check pass.
- Packaging still reports the existing three missing map-fixture fallbacks; this assignment does not repair fixtures.
- **User smoke-test result — 2026-10-14:** “smoke test looks fine.” The A–E checkpoint is accepted. Browser/device
  details and individual scenarios were not recorded; this is user-reported validation, not an additional agent-run
  desktop/mobile test. The broader F–H plan remains deferred.

## Follow-Up F Execution Record — 2026-10-19

Scope at this checkpoint: F only, resumed at the user's request. G–H were deferred until separately requested; G is recorded below.

| Pass | Imports before → after | CSS changes | Validation |
|---|---|---|---|
| F | 52 → 43 | Load early `system/system.css`, late `system/system-actions.css`, combined `auth/auth.css`, and combined `shell/shell.css`; remove copied fragments; retain both mobile stylesheets unchanged | CSS lint, typecheck, 60 test files / 346 tests, packaging, diff check, emitted CSS comparison, and focused declaration-cascade checks passed; user smoke accepted |

Bundle ownership and cascade decisions:

- `system/system.css` combines dock, inner-status, diagnostics-grid, scenario-progress, and shortcut-grid at the former
  dock anchor. Dock/inner-status defaults stay before their mobile overrides. The other selectors target system/help
  descendants without competing with intervening feature selectors on the inspected elements.
- `system/system-actions.css` combines existing actions, preset-button, jump-controls, and divider at the existing late
  actions anchor. Keep two system bundles: moving `.iitc-iris-compare` before the shared status base would change the
  color of `StatusText` elements that also carry the compare class. Jump-input styles continue to follow shared controls,
  and the more-specific mobile dock rules still hide the applicable preset/jump controls.
- `auth/auth.css` combines auth-recovery and login-button at the former recovery anchor. Actual login controls are plain
  buttons, not portal-action components. The recovery/inline-auth selectors remain more specific than shared button
  classes. The inner-status login adjustment still precedes the login button rule, preserving the existing padding.
- `shell/shell.css` now includes shell-panels and loads at the former shell-panels anchor. Only the independent shell
  root rule moves later; its selector does not compete with rules targeting sheet descendants. Panel visibility and
  geometry overrides stay in their original late position. Moving those overrides up to the old shell-root position
  would be unsafe.
- `styles/mobile-dock-panels.css` and `styles/mobile-sheet-analysis.css` were neither merged nor edited. No TSX, class
  names, declaration values, behavior, or component-local CSS imports changed.

Verification:

- **43 active central imports**, all valid targets, consistent quotes, no source backups or numbered CSS.
- Emitted selector/declaration multiset is identical to the pre-F baseline; production `content.js` is byte-for-byte
  identical. CSS remains **61,215 bytes / 61.22 kB**; CSS bytes differ because of the documented rule-order changes.
- **5,256 element declaration-cascade comparisons** passed across system/help/portal/search/map/COMM sheet contexts,
  widths 380/760/761/1200px, and normal/hover/focus states. Fixtures cover dock visibility, diagnostic status/compare,
  preset/jump controls, auth recovery/inline/login controls, shell panels and tabs, and representative existing features.
  These structural checks do not simulate browser layout, inheritance, shorthand expansion, or paint.
- A fresh pre-F Vite build and temporary verification script are stored outside source in a task-specific
  `/private/tmp/iitc-iris-followup-f-*` directory and `/private/tmp/iitc-iris-followup-f-verify.cjs`; they are temporary
  working artifacts, not permanent repository resources.
- `npm run lint:css`, `npm run typecheck:iitc-iris`, `npm run test:iitc-iris`, `npm run package:iitc-iris`, and
  `git diff --check` pass. Packaging still reports the existing three missing map-fixture fallbacks.
- **User F smoke-test result — 2026-10-19:** “looks good.” F is accepted. Browser/device details and individual
  scenarios were not recorded; this is user-reported validation, not an additional agent-run browser test.

## Follow-Up G Execution Record — 2026-10-19

Scope at this checkpoint: G only, including the optional portal-analysis bundle. H was deferred until separately requested;
component/API redesign remains deferred.

| Pass | Imports before → after | CSS changes | Validation |
|---|---|---|---|
| G | 43 → 38 | Combine 11 fragments into `side-panels/side-panels.css`, `comm/comm.css`, `missions/missions.css`, and `portal-analysis/portal-analysis.css`; remove copied fragments and three former local CSS imports | CSS/app lint, typecheck, 60 test files / 346 tests, packaging, emitted CSS comparison, focused declaration-cascade checks, and diff check passed; user smoke accepted |

Bundle ownership and cascade decisions:

- `side-panels/side-panels.css` combines agent-name, passcode form/input, and scores/agent/inventory styles at the former
  scores-agent anchor. Shared control/list/badge/status bases remain earlier. Agent-name still serves portal details as
  well as the feature area; its new position remains before faction text-color overrides. This shared ownership is
  intentional. Passcode and inventory overrides do not compete with intervening mission/COMM elements.
- `comm/comm.css` combines send-form and message-list styles at the former message-list anchor. It remains after shared
  list/scroll bases, before faction text colors, and before the mobile row-column override. Form and message rules retain
  their original relative order; the intervening passcode/mission selectors target different elements.
- `missions/missions.css` combines panel rules, map-generated waypoint labels, and the authoring-link override at the
  former panel anchor. It follows shared list/scroll and portal-action defaults and precedes mobile metrics overrides.
  Marker labels remain centrally loaded independently of panel mounting. Their selectors do not overlap intervening
  portal-icon styles. The create-link CSS was moved locally in C; G deliberately returns it to the feature bundle, with
  its precedence over portal-action defaults preserved. This supersedes C's loading decision for this stylesheet.
- `portal-analysis/portal-analysis.css` combines foundations with level-cell/table-action styles at the former base
  anchor. Both fragments are used. The two panel-local action imports are removed, so the feature loads once centrally.
  Table controls use their own classes, and level overrides retain their more-specific analysis ancestor. Shared bases
  stay earlier and mobile analysis rules stay later. The cascade-sensitive title reset remains a separate import before
  `portals/portal-content.css`; it is neither merged nor moved.
- Each fragment's internal rule order, selector names, and declaration values are preserved. Both mobile stylesheets
  and component rendering/behavior are unchanged; the only TSX changes remove three CSS imports.

Verification:

- **38 active central imports**, all valid targets, consistent quotes, no source backups or numbered CSS.
- Emitted selector/declaration multiset is identical to the fresh pre-G baseline; production `content.js` is byte-for-byte
  identical. Packaged CSS remains **61,215 bytes / 61.22 kB**; rule order changes as described above.
- **37,716 element declaration-cascade comparisons** passed across seven sheet contexts, widths 380/760/761/1200px,
  and normal/hover/focus states.
  Fixtures cover shared status/agent names, badges, passcode controls/rewards, inventory rows, scores, COMM faction
  colors and alerts, mission rows/details/create link/markers, and analysis summaries, filters, tables, levels and actions.
  These structural checks do not simulate browser layout, inheritance, shorthand expansion, or paint.
- A fresh pre-G Vite build and temporary verification script live outside source under
  `/private/tmp/iitc-iris-followup-g-*` and `/private/tmp/iitc-iris-followup-g-verify.cjs`; these are temporary working
  artifacts, not permanent repository resources.
- `npm run lint:css`, `npm run lint:iitc-iris`, `npm run typecheck:iitc-iris`, `npm run test:iitc-iris`,
  `npm run package:iitc-iris`, and `git diff --check` pass. Existing three missing map-fixture fallbacks remain.
- **User G smoke-test result — 2026-10-19:** “looks good.” G is accepted. Browser/device details and individual
  scenarios were not recorded; this is user-reported validation, not an additional agent-run browser test.

## Follow-Up H Execution Record — 2026-10-19

Scope: H's named UI primitive candidates only. Component/API redesign remains deferred.

| Pass | Imports before → after | Change | Validation |
|---|---|---|---|
| H | 38 → 37 | Import `action-button.css` from `action-button.tsx`; remove its central manifest entry; retain the SummaryCell base at its existing central position | CSS/app lint, typecheck, 60 test files / 346 tests (including ActionButton/SubmitActionButton tests), packaging, emitted CSS/order comparisons, focused declaration-cascade checks, and diff check passed; user smoke accepted |

Candidate decisions:

| Candidate | Result | Reason |
|---|---|---|
| `ui/action-button/action-button.css` | Moved to its owning component | Contains only appearance, radius, and pointer/disabled cursor defaults for ActionButton and SubmitActionButton. Inspected callers compose the existing portal-action class; feature colors, borders, padding, and disabled appearance remain in their current stylesheets. |
| `ui/chip-button/chip-button.css` | Already component-local; unchanged | ChipButton imports its own CSS plus shared diagnostics-chip CSS. |
| `ui/clear-button/clear-button.css` | Already component-local; unchanged | ClearButton already imports its stylesheet. |
| `ui/diagnostics-chip/diagnostics-chip.css` | Already component-local; unchanged | DiagnosticsChip/PlainDiagnosticsChip and ChipButton already import the shared stylesheet. |
| `ui/empty-state/empty-state.css` | Already component-local; unchanged | EmptyState already imports its stylesheet. |
| `ui/segmented-button/segmented-button.css` | Already component-local; unchanged | SegmentedButton already imports its stylesheet. |
| `ui/summary-cell/summary-cell.css` | Retained centrally; ordering-sensitive | Portal-list summary cells compose `iitc-iris-summary-cell` with `iitc-iris-portals-list-summary-item`. Both selectors have one-class specificity and declare padding/background. Loading the base later would replace the feature's spacing and team-tinted background; its padding would also follow the mobile item override. The file additionally styles raw portal-summary cells outside SummaryCell. |

No CSS selectors, declaration values, rendered markup, or behavior changed. The shared control/list/scroll/warning
styles and badge/status/panel/layout/mobile styles retain their current loading. SummaryCell's existing local label
stylesheet also remains unchanged. Splitting or rewriting its shared base to enable migration would be a separate task;
H does not require moving a candidate with a demonstrated ordering dependency.

Verification:

- **37 active central imports**, all valid targets, consistent quotes, no source backups or numbered CSS.
- Emitted selector/declaration multiset is identical to the fresh pre-H baseline; all emitted rules except the two moved
  ActionButton selectors retain their relative order. Production `content.js` is byte-for-byte identical.
- Packaged CSS remains **61,215 bytes / 61.22 kB**; CSS bytes differ because the two base rules move later.
- **43,092 element declaration-cascade comparisons** passed across seven sheet contexts, widths 380/760/761/1200px,
  and normal/hover/focus states. Fixtures retain the G feature coverage and add enabled/disabled button and submit
  controls, danger actions, portal/map/mission/Draw Tools action groups, existing local primitives, and portal-summary cells.
  All non-pseudo-element selectors were supported by the fixture matcher. These structural checks do not simulate browser
  layout, inheritance, shorthand expansion, or paint.
- A fresh pre-H Vite build and temporary verification script live outside source under
  `/private/tmp/iitc-iris-followup-h-*` and `/private/tmp/iitc-iris-followup-h-verify.cjs`; these are temporary working
  artifacts, not permanent repository resources.
- `npm run lint:css`, `npm run lint:iitc-iris`, `npm run typecheck:iitc-iris`, `npm run test:iitc-iris`,
  `npm run package:iitc-iris`, and `git diff --check` pass. Existing three missing map-fixture fallbacks remain.
- **User H smoke-test result — 2026-10-19:** “looks good still.” H is accepted. Browser/device details and individual
  scenarios were not recorded; this is user-reported validation, not an additional agent-run browser test.
- Gate 0 and A–H are closed with their documented ordering exceptions. Component/API redesign remains a separate task.

## Target Direction

The desired long-term shape is closer to:

```text
apps/iitc-iris/src/
├── styles/
│   ├── globals.css
│   ├── mobile-dock-panels.css
│   └── mobile-sheet-analysis.css
├── ui/
│   ├── shared/
│   │   ├── control.css
│   │   ├── list-item.css
│   │   └── scroll-region.css
│   ├── action-button/
│   │   ├── action-button.tsx
│   │   ├── action-button.css
│   │   ├── action-button.test.tsx
│   │   └── index.ts
│   └── empty-state/
│       ├── empty-state.tsx
│       ├── empty-state.css
│       ├── empty-state.test.tsx
│       └── index.ts
├── side-panels/
│   └── agent-panel/
│       ├── agent-panel.tsx
│       └── agent-panel.css
└── portal-analysis/
    └── portals-list-panel/
        ├── portals-list-panel.tsx
        └── portals-list-panel.css
```

This target should be approached incrementally. Do not move everything at once.

## Gate 0 - Accept Or Repair Current Follow-Up A Work

Status: repaired; automated checks pass and the user reports a successful smoke test.

Goal: make the existing panel/search compression clean enough to build on.

Required checks:

1. Inspect `git status --short`.
2. Remove accidental backup artifacts from source control scope:
   - `apps/iitc-iris/src/iitc-iris.css.backup*`;
   - any stray top-level `ui/` directory created outside `apps/iitc-iris/src`.
3. Normalize `apps/iitc-iris/src/iitc-iris.css` formatting:
   - all imports start at column 1;
   - use the same quote style as the file already used before the follow-up: `@import url('./path.css');`.
4. Verify the merged files actually contain the old rules in the same internal order:
   - `apps/iitc-iris/src/search/search.css`;
   - `apps/iitc-iris/src/ui/panel/panel.css`.
5. Verify the old source files were intentionally removed only after their rules were copied:
   - `search/search-shell.css`;
   - `search/search-panel.css`;
   - `search/search-results.css`;
   - `ui/panel/panel-shell.css`;
   - `ui/panel/panel-topbar.css`;
   - `ui/panel/panel-header.css`;
   - `ui/panel/panel-header-actions.css`;
   - `ui/panel/panel-body.css`;
   - `ui/panel/panel-state.css`;
   - `ui/panel/panel-footer.css`.
6. Update the final audit if the import count has changed.

If a visual regression appears, fix only that regression before continuing.

Validation:

- `npm run lint:css`
- `npm run typecheck:iitc-iris`
- `npm run test:iitc-iris`
- `npm run package:iitc-iris`
- `git diff --check`

Hard stop: do not start the next follow-up until this cleanup is done. Do not create backup files inside `apps/iitc-iris/src`.

## Driver Rules For Remaining Follow-Ups

These are implementation assignments, not research assignments.

- Do not create another plan-only document instead of changing code.
- Do not create `.backup`, `.bak`, `.old`, or scratch files inside `apps/iitc-iris/src`.
- Do not create files outside `apps/iitc-iris/src` unless the assignment explicitly says to.
- Preserve selector names and declaration values.
- Preserve internal CSS rule order when merging files.
- Keep `apps/iitc-iris/src/iitc-iris.css` as the central ordered manifest unless the assignment explicitly says to move a
  file to a component-local import.
- After every pass, record:
  - old import count;
  - new import count;
  - changed CSS files;
  - validation commands and results.

## Follow-Up A - Manifest Compression

Status: panel/search repaired; map/portal compression completed through D/E. System compression subsequently completed under F.

Goal: reduce the 75-import manifest without changing behavior.

Rules:

- Merge only adjacent files that are already adjacent in `apps/iitc-iris/src/iitc-iris.css`.
- Preserve internal rule order exactly.
- Do not move CSS from central manifest to component imports in this pass.
- Do not rename selectors or declarations.

Likely candidates:

| Area        | Candidate merge                                                                                                                                                                   |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ui/panel/` | merge panel shell/header/body/topbar/actions/state/footer into `ui/panel/panel.css` if order can be preserved                                                                     |
| `map/`      | merge map root, controls, navigation, source toggle into `map/map.css`; keep player tracker separate if clearer                                                                   |
| `portals/`  | merge side panel/header/stacked into `portal-side-panel.css`; merge portal panel/section/facts/slots/actions into `portal-details.css`; keep map icons and image preview separate |
| `search/`   | merge search shell/panel/results into `search/search.css`                                                                                                                         |
| `system/`   | merge small diagnostics/action/preset/jump files into one or two system files only if readability improves                                                                        |

Validation:

- `npm run typecheck:iitc-iris`
- `npm run lint:iitc-iris`
- `npm run test:iitc-iris`
- `npm run lint:css`
- `npm run package:iitc-iris`
- `git diff --check`
- record import-count change and CSS bundle size

Stop condition:

- Stop after one area if there is any cascade uncertainty.
- Stop when the manifest is readable enough; do not optimize solely for the smallest import count.

Status note: `ui/panel` and `search` are accepted after Gate 0 repair. D/E compression is implemented with the
intentional exceptions recorded above. A does not authorize the excluded F–H work in this assignment.

## Follow-Up B - Feature Component Folders

Status: implemented for all five candidate domains, plus colocated COMM helpers, inventory, and the shared analysis table.

Goal: move feature panel TSX/tests/CSS into feature component folders where it improves ownership.

Rules:

- One domain per pass.
- Preserve public imports with `index.ts` barrels where needed.
- Do not combine with CSS merge work.
- Do not move persisted ids, message types, storage keys, or behavior.

Good first candidates:

| Domain             | Candidate                                                                            |
| ------------------ | ------------------------------------------------------------------------------------ |
| `search/`          | `search-panel/` with `search-panel.tsx` and `search.css` after manifest compression  |
| `missions/`        | `missions-panel/` and mission waypoint label CSS                                     |
| `comm/`            | `comm-panel/` and `comm-message-list/`                                               |
| `side-panels/`     | individual request panels such as `agent-panel/`, `scores-panel/`, `passcode-panel/` |
| `portal-analysis/` | `portals-list-panel/`, `portal-counts-panel/`, `scoreboard-panel/`                   |

Validation:

- focused tests for moved modules where they exist;
- `npm run typecheck:iitc-iris`;
- `npm run lint:iitc-iris`;
- `npm run test:iitc-iris`;
- `npm run package:iitc-iris`;
- `git diff --check`.

## Follow-Up C - Component-Local CSS Expansion

Status: one safe feature stylesheet migrated at the C checkpoint; G subsequently returned it to the central missions
bundle with its precedence preserved. Responsive/shared candidates were intentionally retained centrally.

Goal: move more CSS from the central manifest to component-local imports only when cascade safety is proven.

Rules:

- Only attempt this after Follow-Up A or concrete pain shows central loading is in the way.
- Compare emitted CSS order before/after.
- Preserve known central cascade-sensitive files unless selectors are refactored intentionally.

Do not start with:

- `badge/badge.css`;
- `status-text/status-text.css`;
- `layers/layer-toggle.css`;
- `portal-analysis/portal-list-title-reset.css`;
- global/mobile/shell layout CSS.

## Follow-Up D - Portals CSS Compression

Status: implemented using ordered early/content bundles and a separate stacked override.

Goal: make the biggest remaining feature area readable without changing selectors or behavior.

Recommended target files:

- `apps/iitc-iris/src/portals/portal-side-panel.css`
- `apps/iitc-iris/src/portals/portal-details.css`
- keep `portal-map-icons.css` separate;
- keep `portal-image-preview.css` separate unless there is a clear component ownership reason to merge it.

Merge candidates:

| New file                | Old files                                                                                                                                                                                                                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `portal-side-panel.css` | `portal-side-panel-shell.css`, `portal-side-panel-header.css`, `portal-side-panel-stacked.css`                                                                                                                                                                                                                                             |
| `portal-details.css`    | `portal-panel.css`, `portal-actions-layout.css`, `portal-level-summary.css`, `portal-details-actions.css`, `portal-level-cell.css`, `portal-list-title-button.css`, `portal-section.css`, `portal-section-summary.css`, `portal-facts-grids.css`, `portal-slot.css`, `portal-slots.css`, `portal-summary-mini-track.css` if currently used |

Rules:

- Prefer preserving each old file's internal rule order exactly.
- When old files are not adjacent in `iitc-iris.css`, check for selectors that overlap with intervening files before
  changing order.
- If the order is uncertain, use two or three portal bundles at the original cascade positions instead of one large bundle.
- Do not merge `portal-analysis/portal-list-title-reset.css`; it is intentionally cascade-sensitive.

Validation:

- `npm run lint:css`
- `npm run test:iitc-iris`
- `npm run package:iitc-iris`
- smoke test portal details, portal side panel, portal image preview, and portal map icons.

Expected result: fewer portal imports and a manifest where portal CSS reads as feature bundles, not fragments.

## Follow-Up E - Map And Layer CSS Compression

Status: implemented; navigation/source-toggle/layer-toggle remain separate to preserve effective order.

Goal: compress map chrome and layer control CSS while keeping player tracker and map icons readable.

Recommended target files:

- `apps/iitc-iris/src/map/map.css`
- `apps/iitc-iris/src/map/player-tracker.css`
- `apps/iitc-iris/src/layers/layers.css`

Merge candidates:

| New file             | Old files                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `map.css`            | `map-root.css`, `map-controls.css`, `map-navigation-controls.css`, `source-toggle.css`, `user-location-pin.css` if safe         |
| `player-tracker.css` | `player-tracker-marker-base.css`, `player-tracker-overlay.css`                                                                  |
| `layers.css`         | `layer-controls.css`, `key-count-label.css`; include `layer-toggle.css` only if its cascade-sensitive status has been rechecked |

Rules:

- Do not move Leaflet or map icon styling into component-local imports in this pass.
- Keep map CSS central-loaded.
- If `layer-toggle.css` still depends on central order, leave it as a separate manifest import and document why.

Validation:

- `npm run lint:css`
- `npm run test:iitc-iris`
- `npm run package:iitc-iris`
- smoke test map controls, source toggle, player tracker marker/overlay, layer controls, and key count labels.

## Follow-Up F - System, Auth, Shell, And Small Feature Compression

Status: accepted on 2026-10-19 after automated checks and the user-reported successful smoke test; see the F execution record.

Goal: remove small one-purpose manifest entries once the larger feature bundles are stable.

Recommended target files:

- `apps/iitc-iris/src/system/system.css`
- `apps/iitc-iris/src/auth/auth.css`
- `apps/iitc-iris/src/shell/shell.css` may absorb `shell-panels.css` only if responsive order stays correct;
- keep `styles/mobile-dock-panels.css` and `styles/mobile-sheet-analysis.css` separate unless a mobile audit proves they
  can move.

Merge candidates:

| New file     | Old files                                                                                                                                                                           |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `system.css` | `dock.css`, `inner-status.css`, `diagnostics-grid.css`, `scenario-progress.css`, `shortcut-grid.css`, `system-actions.css`, `preset-button.css`, `jump-controls.css`, `divider.css` |
| `auth.css`   | `auth-recovery.css`, `login-button.css`                                                                                                                                             |
| `shell.css`  | existing `shell.css`, `shell-panels.css` only if safe                                                                                                                               |

Rules:

- This pass may merge non-adjacent files only when selectors are domain-local and do not override intervening selectors.
- Do not merge mobile CSS unless desktop and narrow viewport smoke tests both pass.

Validation:

- `npm run lint:css`
- `npm run typecheck:iitc-iris`
- `npm run test:iitc-iris`
- `npm run package:iitc-iris`
- smoke test system panel, diagnostics, auth recovery/login, dock, panel shell, and narrow/mobile sheet behavior.

## Follow-Up G - Feature Panel Bundles

Status: accepted on 2026-10-19 after automated checks and the user-reported successful smoke test; see the G execution record.

Goal: make feature-owned panel CSS match feature directories.

Recommended target files:

- `apps/iitc-iris/src/side-panels/side-panels.css`
- `apps/iitc-iris/src/comm/comm.css`
- `apps/iitc-iris/src/missions/missions.css`
- optionally `apps/iitc-iris/src/portal-analysis/portal-analysis.css`

Merge candidates:

| New file              | Old files                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------ |
| `side-panels.css`     | `agent-name.css`, `passcode-form.css`, `passcode-input.css`, `scores-agent-panel.css`      |
| `comm.css`            | `comm-send-form.css`, `comm-message-list.css`                                              |
| `missions.css`        | `missions-panel.css`, `mission-create-link.css`, `mission-waypoint-label.css`              |
| `portal-analysis.css` | `portal-analysis-base.css`, `portal-analysis-table-actions.css` if both are currently used |

Rules:

- Keep each feature central-loaded in `iitc-iris.css` for now.
- Do not move panel CSS to component-local imports in the same pass.
- If a file is unused, remove it only after proving no class names remain in TSX/tests.

Validation:

- `npm run lint:css`
- `npm run test:iitc-iris`
- `npm run package:iitc-iris`
- smoke test side request panels, passcode form, scores, COMM, missions, and portal analysis.

## Follow-Up H - Safe Component-Local Imports

Status: accepted on 2026-10-19 after automated checks and the user-reported successful smoke test. ActionButton migrated;
five candidates already load locally; SummaryCell retained centrally for its concrete ordering dependency. See the H execution record.

Goal: reduce central imports by moving genuinely self-contained UI primitive CSS to their owning component imports.

Only consider these candidates first:

- `ui/action-button/action-button.css`
- `ui/chip-button/chip-button.css`
- `ui/clear-button/clear-button.css`
- `ui/diagnostics-chip/diagnostics-chip.css`
- `ui/empty-state/empty-state.css`
- `ui/segmented-button/segmented-button.css`
- `ui/summary-cell/summary-cell.css` only if no global ordering dependency is found.

Rules:

- Add `import './name.css';` to the owning component file.
- Remove the matching central manifest import only after the component import exists.
- Do not move shared primitives in this pass:
  - `ui/shared/control.css`;
  - `ui/shared/list-item.css`;
  - `ui/shared/scroll-region.css`;
  - `ui/shared/warning.css`.
- Do not move `badge.css`, `status-text.css`, `panel.css`, or layout/mobile CSS in this pass.
- Compare the built CSS before and after. If order changes create any uncertainty, revert that candidate and document it.

Validation:

- focused tests for touched UI components;
- `npm run lint:css`
- `npm run typecheck:iitc-iris`
- `npm run test:iitc-iris`
- `npm run package:iitc-iris`
- smoke test views that use the moved primitives.

## Finish Line

The refactor is done when:

- `iitc-iris.css` is a readable manifest of global layers and feature bundles, not dozens of tiny fragments;
- component-local imports are used for isolated component-owned or explicitly shared styles with proven cascade safety;
- global, shell, map, mobile, and cascade-sensitive CSS remains central-loaded;
- no backup/scratch files exist under `apps/iitc-iris/src`;
- `find apps/iitc-iris/src -name '*[0-9]*.css' -print` has no output;
- validation passes.

Roughly 30–45 central imports was an estimate for the broader plan, not an acceptance requirement. The accepted A–E
checkpoint had 52 imports; accepted F had 43, accepted G had 38, and accepted H has 37.
Clear ownership, readable bundles, and documented override relationships determine whether further consolidation is useful; import count alone does not. Global map, shell, plugin, and responsive layers still
have reasons to remain central.

## Suggestions For A Later Architecture Review

The completed plan is a sound approach to safe CSS cleanup. It does not establish that the full component API or UI
composition architecture is ideal: only the code needed for these changes was reviewed, not the entire UI.

When work resumes, use concrete maintenance problems to choose a bounded review:

- Separate three kinds of work: CSS bundling, component folder organization, and CSS loading changes. Each has different
  risks and validation needs. A/D/E overlap as consolidation work, while C/H overlap as loading work; do not execute
  overlapping assignments twice or treat every proposed candidate as mandatory.
- Classify remaining styles by responsibility: global foundations, shared primitives, feature-owned styles, and explicit
  overrides. Record both the owner and why each stylesheet loads centrally or locally.
- Keep component ownership distinct from CSS ownership. Shared portal actions, multi-panel styles, and map-generated
  mission labels should not be forced into a component folder solely for visual directory consistency.
- Document the important order dependencies already found: search after shared control/list bases; portal defaults before
  team colors; navigation status after the shared status base; source-toggle after layer-toggle; responsive rules after
  their relevant bases. These relationships are more useful than an arbitrary import-count target.
- Review component props, shared primitive contracts, and UI composition only after reading the relevant code. Avoid
  conclusions about the whole UI architecture based only on folder layout or stylesheet organization.

## Recommended Next Session

Gate 0 and A–H are accepted within their cascade-preserving scope. Their historical loading/order exceptions are
resolved by the completed and user-accepted [plan 36](36-component-css-ownership-plan.md), which records the
full ownership inventory and 37 → 10 central import change.

The CSS ownership phase is closed. Next, review primitives and their actual callers for fewer components and visual
variants. Evaluate overlapping buttons, status/badge treatments, and repeated list rows; recommend consolidations with
concrete caller evidence before changing APIs or introducing List/ListItem abstractions.
