# IITC IRIS Component CSS Ownership

Status: complete; implemented and automatically validated, 2026-10-19, with subsequent user smoke acceptance.
Follows the accepted Gate 0 / A–H cleanup in
[35-css-architecture-followups.md](35-css-architecture-followups.md).

## Goal

Finish the component CSS refactor before simplifying components: components and features load their own styles,
including their responsive rules, while preserving the current appearance and behavior. The application stylesheet
loads global foundations and application/runtime infrastructure with explicit reasons to remain there.

The previous work made the existing cascade readable and reduced central imports to 37. It preserved ordering
dependencies rather than removing them. This phase resolves those dependencies so ownership determines loading.

## Scope And Boundaries

- Keep component APIs, rendered structure, interactions, and visual variants unchanged.
- Defer List/ListItem abstractions, component merges, renamed public props, visual redesign, and deduplication that
  changes component responsibilities until this phase is accepted.
- CSS selectors, modifier rules, and custom properties may be narrowly adjusted to preserve the same effective styles
  without relying on incidental import order. Record why each adjustment is necessary.
- TSX changes may add/remove stylesheet imports. Broader markup or behavior changes require a separate task.
- This phase extends the older plans' import/selector restrictions specifically for CSS ownership work.

## Loading Contract

| Responsibility                                                                        | Owner and loading                                                                            |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Tokens, reset/root defaults, shared theme utilities                                   | Application global stylesheet; also available to the workbench                               |
| UI primitive appearance and states                                                    | Imported by the owning component; explicit shared primitive dependencies are allowed         |
| Feature appearance and responsive rules                                               | Imported by the owning feature/component entry; shared within that feature where appropriate |
| Shell placement, sheet visibility, application-wide responsive coordination           | Shell/application owner; central loading is allowed with documented dependencies             |
| Map runtime, Leaflet-generated elements, styles needed without a mounted UI component | Runtime/application owner; do not make them depend on mounting a panel                       |

A component import does not scope CSS. Selector ownership and override relationships must support the loading contract.
Keep feature-specific mobile rules with their feature; retain cross-panel responsive coordination with the shell.
Do not force shared feature CSS into one arbitrary leaf component or duplicate declarations between owners.

## Execution

1. **Record ownership and a baseline.** Review all 37 central imports, current local imports, selectors, and callers.
   Keep one compact table in this document: stylesheet, actual owner/consumers, dependencies, intended loading, and
   migration status. Identify global/runtime infrastructure separately from component styles retained only for order.
   Capture a fresh production build and representative desktop/narrow feature states before each migration slice.
2. **Prove primitive ownership first.** Start with SummaryCell/SummaryGrid, then review Badge, StatusText, Panel,
   controls, and shared row/scroll/warning styles. Include the primitives already imported locally: for example,
   ActionButton still obtains its portal-action appearance from central `portals/portal-details.css`. An import alone
   does not establish complete ownership. Account for raw class consumers as well as component consumers.
3. **Move feature styles one domain at a time.** Review search, side panels, COMM, missions, portal analysis, portals,
   system/auth, and map UI. Resolve each base/feature override relationship, move the owning CSS and relevant responsive
   rules together, and remove the corresponding manifest entries. Shared shells and map-generated marker rules may
   need to be separated from panel appearance. Preserve runtime loading for styles needed without a mounted panel.
4. **Audit the resulting entry point.** Every remaining central import needs a concrete global, shell, or runtime
   responsibility. An unresolved historical ordering dependency is remaining work, not a permanent ownership decision.
   Record completed moves and deliberate infrastructure exceptions in the table, then obtain a final live smoke result.

For each slice, inspect component callers and composed classes before changing loading. Make base defaults and
feature/modifier overrides explicit; avoid specificity escalation or `!important` as a general workaround. Choose the
smallest change that preserves current effective styles. Do not introduce a new CSS framework or styling system.

## Validation

- Compare emitted CSS before/after: intended loading/order changes, no missing or duplicated rules, and unchanged
  declaration values unless an equivalent expression is necessary and documented. If selectors change, explain the
  affected consumers and compare their effective styles; selector/declaration multiset equality alone is insufficient.
- Check relevant composed classes and enabled/disabled, active, hover, focus, loading, and team states as applicable.
  Test both sides of the current 760px breakpoint, plus representative desktop/narrow layouts.
- Check affected primitives in the workbench with global foundations and their explicit dependencies. Remove reliance
  on the full application manifest for primitive previews as part of the final ownership audit; retain feature context
  where a feature preview actually requires it.
- Run CSS lint, app lint/typecheck, relevant existing tests and the app suite, then `npm run package:iitc-iris` and
  `git diff --check`. Record results and the relevant real-app smoke checks. Structural cascade checks supplement
  browser validation; they do not establish layout/paint equivalence.
- Keep temporary baselines and verification scripts outside `src`; no source backup or scratch files.

## Done When

- Component and feature appearance is loaded through its actual owner, with explicit shared dependencies.
- Primitive styles no longer depend on unrelated feature stylesheets for their normal appearance.
- Base/variant and responsive overrides preserve the accepted appearance without incidental cross-owner import order.
- `iitc-iris.css` contains only documented global/application/runtime infrastructure imports. There is no numeric target;
  each remaining entry must satisfy that responsibility rather than simply inherit an old exception.
- The ownership table has no unresolved component-loading exceptions, automated validation passes, and the user accepts
  the final live smoke test.

Only then begin the component simplification review toward fewer components and visual variants.

## Progress

- Baseline: 37 central imports; Gate 0 and A–H accepted. A fresh production CSS/JS baseline was captured outside source.
- Implemented primitive ownership, feature ownership, responsive-rule distribution, and the final entry-point audit.
  Central imports are now **10**: globals, two team utility sheets, shell coordination, map root/user location,
  portal map icons, player tracking, mission waypoints, search markers, and key-count labels.
- Component APIs, rendered markup, interactions, and declaration values are unchanged. Production `content.js` is
  byte-for-byte identical to the baseline. User smoke acceptance closes this phase; component simplification is next.

## Ownership Inventory

Paths below are relative to `apps/iitc-iris/src`. Each row accounts for one original central import.
“Local” means imported by the listed component/feature, including explicit shared dependencies; “central” means retained
in `iitc-iris.css`. All loading migrations are implemented and the phase has user smoke acceptance.

| Original stylesheet | Actual owner/consumers and dependencies | Final loading |
| --- | --- | --- |
| `styles/globals.css` | App root defaults; imports extracted `styles/tokens.css`, also used by workbench | Central foundations |
| `ui/badge/badge.css` | Badge; low-specificity base allows feature skins | Local |
| `ui/shared/control.css` | TextInput and raw textarea/select consumers in portal analysis and Draw Tools | Explicit local dependency |
| `ui/shared/list-item.css` | Search, missions, COMM messages, inventory, passcodes, and Draw Tools | Explicit local dependency |
| `search/search-panel/search.css` | SearchPanel; inline badge split to `search/map-search-badge.css` owned by Content; marker split below | Local; marker runtime central |
| `system/system.css` | Help, controls, diagnostics; includes system responsive rules | Local shared feature |
| `map/map.css` | Map root/user-location pin; panel defaults split to `map-controls.css`; context rows to `ui/shared/map-context.css` for map controls and Draw Tools | Runtime central; panel/helper local |
| `auth/auth.css` | AuthRecoveryBanner, diagnostics, and Content's inline auth widget | Local shared feature |
| `ui/status-text/status-text.css` | StatusText, with explicit warning dependency | Local |
| `portals/portal-side-panel.css` | PortalDetailsPanel; title appearance moved to Panel CSS | Local |
| `styles/team-colors.css` | App-wide faction variables and skins, also workbench | Central theme utility |
| `portals/portal-details.css` | PortalDetailsPanel; action skin moved to ActionButton, level-cell skin to analysis; action grid stays portal-owned | Local |
| `ui/summary-grid/summary-layout.css` | SummaryGrid and raw portal summaries; includes narrow layout | Local plus explicit raw-consumer dependency |
| `ui/summary-cell/summary-cell.css` | SummaryCell and raw portal summary cells; existing label CSS stays explicit | Local plus explicit raw-consumer dependency |
| `portal-analysis/portal-analysis.css` | Counts, scoreboard, portals list, and analysis table; includes feature responsive rules | Local shared feature |
| `styles/team-pill.css` | Analysis list faction Badge; moved to `portal-analysis/team-pill.css` | Local dependency of analysis CSS |
| `portal-analysis/portal-list-title-reset.css` | Portals list; new `portal-list-title.css` imports reset before final appearance moved from portal content | Explicit local dependency |
| `portals/portal-content.css` | PortalDetailsPanel; includes resonator/mod responsive rules | Local |
| `ui/panel/panel.css` | Panel/PanelTitle; raw system/map containers, controls, and image modal import it explicitly | Local plus explicit raw-consumer dependencies |
| `ui/shared/scroll-region.css` | COMM messages, missions, and inventory | Explicit local dependency |
| `missions/missions.css` | MissionsPanel; metric responsive rules local; generated waypoint styles split to `map/mission-waypoints.css` | Local; waypoint runtime central |
| `comm/comm.css` | All four COMM entries; includes narrow message columns | Local shared feature |
| `portals/portal-image-preview.css` | PortalImageModal | Local |
| `side-panels/side-panels.css` | Agent, inventory, passcodes, and scores panels; agent-name, compact-input, selection-summary extracted to shared helpers | Local shared feature; helpers explicit |
| `styles/team-text-colors.css` | App-wide faction text utility, also workbench | Central theme utility |
| `styles/mobile-dock-panels.css` | Rules distributed to summary layout, system, COMM, search badge, and shell | Deleted; owners load rules |
| `ui/shared/warning.css` | StatusText and raw passcode warning | Explicit local dependency |
| `system/system-actions.css` | System controls and diagnostics | Local shared feature |
| `shell/shell.css` | Cross-panel placement, visibility, and responsive coordination | Central shell infrastructure |
| `portals/portal-side-panel-stacked.css` | PortalDetailsPanel; defaults yield to shell geometry | Local |
| `styles/mobile-sheet-analysis.css` | Rules distributed to analysis, missions, portal content, summary layout, and shell | Deleted; owners load rules |
| `map/map-navigation-controls.css` | Map controls and Draw Tools | Local shared feature |
| `layers/layer-toggle.css` | Layers and system controls/diagnostics; moved to `ui/shared/layer-toggle.css`, including active/invert states | Explicit local dependency |
| `map/source-toggle.css` | System controls | Local |
| `layers/layers.css` | LayersPanel grid; LayerChoice appearance extracted to its component; labels split to `map/key-count-label.css` | Local; key-label runtime central |
| `portals/portal-map-icons.css` | Map-generated portal icons independent of panel mounting | Central runtime |
| `map/player-tracker.css` | Map-generated player tracker independent of panel mounting | Central runtime |

Existing local primitives were reviewed too. ActionButton now owns its complete portal-action skin and states, rather
than relying on portal details. Section and ControlRow own appearance formerly in `map.css`; LayerChoice owns its former
layers rules. ChipButton, DiagnosticsChip, ClearButton, EmptyState, and SegmentedButton retain their explicit local CSS
dependencies. No new component abstraction was introduced.

## Cascade And Shared Dependencies

- Base defaults use `:where(...)` where feature/variant rules must win regardless of component import order: summaries,
  badge/status, shared control/list/scroll/context rows, panel placement, and selected portal/layer/auth defaults.
  State selectors retain their intended precedence. No `!important` or general specificity escalation was introduced.
- SummaryCell labels retain their accepted muted color: the analysis summary `small` selector was weakened so the
  existing label reset wins without depending on order. Shell geometry likewise wins over local panel defaults.
- Agent-name color applies the portal default only when no faction class is present; faction utilities keep their
  precedence. COMM's actor/player defaults also yield to faction text utilities.
- Shared helpers now declare actual cross-feature consumers: compact input (COMM/passcodes), selection summary
  (missions/inventory), context rows (map/Draw Tools), layer toggles (layers/system), and agent name (portal details).
  Raw class consumers explicitly import shared control/list/scroll/warning/panel/summary CSS.
- Feature responsive rules moved with their owners; shell-wide positioning remains in `shell.css`. Identical duplicate
  portal-summary narrow declarations were consolidated into the summary layout owner.
- Workbench loads tokens and theme utilities instead of the full application manifest. Primitive appearance arrives
  through the components. Preview typography/color are explicit, without importing app-root positioning.

## Validation Record — 2026-10-19

- CSS lint, app lint, typecheck, **60 test files / 346 tests**, packaging, and `git diff --check`: pass.
- Standalone workbench production build: pass (44 modules).
- Normalized emitted selector/declaration sets preserve all declaration values, accounting for documented selector
  changes, token scope moving from app root to `:root`, and identical responsive-rule deduplication.
- **172,560 element declaration-cascade comparisons per bundle** passed for production and two opposite component-module
  import orders: **517,680 total** across 20 sheet contexts, widths 380/760/761/1200px, and normal/hover/focus states.
  Coverage includes primitive/feature overrides, summary cells, faction states, action states, analysis, search, Draw Tools,
  layer/source controls, and panel shells. Explicit component CSS dependencies are retained in both import-order builds.
- Static styled-class dependency audit found no missing reachable CSS among non-test TSX consumers (apart from Content,
  whose inline widgets were inspected separately). This checks dependency reachability, not complete browser rendering.
- Production `content.js` is unchanged; emitted CSS is **61,853 bytes / 61.85 kB** versus 61,215 bytes before migration,
  reflecting selector wrappers. Existing three missing-map-fixture packaging fallbacks remain unrelated.
- Temporary baselines, build variants, and verification scripts are outside source under
  `/private/tmp/iitc-iris-ownership-*`. These are working artifacts, not permanent repository resources.

Structural checks do not simulate browser layout/paint, inheritance, or shorthand expansion. They supplement the live
smoke test; they do not establish visual equivalence or final acceptance.

## Live Acceptance And Next Step

The user accepted the implementation with “ok, looks good.” Browser/device details and individual scenarios were not
reported; this records user acceptance rather than asserting each scenario below was independently verified.

Retain this checklist for future regression checks at desktop and narrow widths (including both sides of 760px):

- Workbench primitives, summary grids/cells, and normal/disabled/danger actions.
- Portal details, counts/scoreboard/list summaries, and analysis table labels/team colors.
- Search, COMM, passcodes, inventory, missions, and Draw Tools controls/rows.
- System/auth panels, layer/source toggles, and shell positioning/visibility.
- Portal/player/search/mission/key map markers while their related panels are closed.

This phase is closed. Continue with [plan 37](37-component-simplification-review.md), the current architecture contract
and component simplification review: inspect primitives and their real callers, then recommend a small set of
consolidation candidates before changing APIs.
