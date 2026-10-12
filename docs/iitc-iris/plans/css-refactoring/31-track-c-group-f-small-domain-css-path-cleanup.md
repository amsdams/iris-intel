# IITC IRIS CSS Pretty Architecture — Track C Group F: Small Domain CSS Path Cleanup

Status: Group F Complete. All 28 legacy numbered CSS chunk files across the 8 smaller domains have been renamed to descriptive semantic filenames. The central manifest load order in `apps/iitc-iris/src/iitc-iris.css` was strictly preserved.

Reference plans:
- [`docs/iitc-iris/plans/css-refactoring/25-track-c-component-colocation-plan.md`](file:///Users/jula/ittca/docs/iitc-iris/plans/css-refactoring/25-track-c-component-colocation-plan.md)
- [`docs/iitc-iris/plans/css-refactoring/29-track-c-group-d-remaining-ui-components.md`](file:///Users/jula/ittca/docs/iitc-iris/plans/css-refactoring/29-track-c-group-d-remaining-ui-components.md)
- [`docs/iitc-iris/plans/css-refactoring/30-track-c-group-e-ui-css-path-cleanup.md`](file:///Users/jula/ittca/docs/iitc-iris/plans/css-refactoring/30-track-c-group-e-ui-css-path-cleanup.md)

---

## 1. Overview & Strategy

Track C Group F eliminated numbered CSS files across 8 smaller feature and support domains:
- `search/`
- `auth/`
- `comm/`
- `missions/`
- `side-panels/`
- `styles/`
- `system/`
- `layers/`

Rules observed:
- Pure file rename and import path update.
- Zero CSS declarations or selectors modified.
- Zero CSS files merged.
- Zero component TSX files edited or added imports.
- Exact `@import` order preserved line-for-line in `apps/iitc-iris/src/iitc-iris.css`.

---

## 2. Path Mapping Table

All 28 numbered CSS files across the 8 domains were renamed:

| Domain | Old Path | New Path | Description |
|---|---|---|---|
| **search** | `apps/iitc-iris/src/search/006-search.css` | [`apps/iitc-iris/src/search/search-shell.css`](file:///Users/jula/ittca/apps/iitc-iris/src/search/search-shell.css) | Search input and shell container |
| **search** | `apps/iitc-iris/src/search/008-search.css` | [`apps/iitc-iris/src/search/search-panel.css`](file:///Users/jula/ittca/apps/iitc-iris/src/search/search-panel.css) | Search panel body and section |
| **search** | `apps/iitc-iris/src/search/010-search.css` | [`apps/iitc-iris/src/search/search-results.css`](file:///Users/jula/ittca/apps/iitc-iris/src/search/search-results.css) | Search result item list and highlights |
| **auth** | `apps/iitc-iris/src/auth/017-auth.css` | [`apps/iitc-iris/src/auth/auth-recovery.css`](file:///Users/jula/ittca/apps/iitc-iris/src/auth/auth-recovery.css) | Auth recovery notice and guidance |
| **auth** | `apps/iitc-iris/src/auth/079-auth.css` | [`apps/iitc-iris/src/auth/login-button.css`](file:///Users/jula/ittca/apps/iitc-iris/src/auth/login-button.css) | Auth login action button |
| **comm** | `apps/iitc-iris/src/comm/056-comm.css` | [`apps/iitc-iris/src/comm/comm-send-form.css`](file:///Users/jula/ittca/apps/iitc-iris/src/comm/comm-send-form.css) | Comm channel send form and input |
| **comm** | `apps/iitc-iris/src/comm/061-comm.css` | [`apps/iitc-iris/src/comm/comm-message-list.css`](file:///Users/jula/ittca/apps/iitc-iris/src/comm/comm-message-list.css) | Comm message list stream and entries |
| **missions** | `apps/iitc-iris/src/missions/040-missions.css` | [`apps/iitc-iris/src/missions/mission-create-link.css`](file:///Users/jula/ittca/apps/iitc-iris/src/missions/mission-create-link.css) | Mission create link button styling |
| **missions** | `apps/iitc-iris/src/missions/060-missions.css` | [`apps/iitc-iris/src/missions/missions-panel.css`](file:///Users/jula/ittca/apps/iitc-iris/src/missions/missions-panel.css) | Mission panel list and item view |
| **missions** | `apps/iitc-iris/src/missions/087-missions.css` | [`apps/iitc-iris/src/missions/mission-waypoint-label.css`](file:///Users/jula/ittca/apps/iitc-iris/src/missions/mission-waypoint-label.css) | Mission waypoint marker labels |
| **side-panels** | `apps/iitc-iris/src/side-panels/022-side-panels.css` | [`apps/iitc-iris/src/side-panels/agent-name.css`](file:///Users/jula/ittca/apps/iitc-iris/src/side-panels/agent-name.css) | Agent panel profile name header |
| **side-panels** | `apps/iitc-iris/src/side-panels/055-side-panels.css` | [`apps/iitc-iris/src/side-panels/passcode-form.css`](file:///Users/jula/ittca/apps/iitc-iris/src/side-panels/passcode-form.css) | Passcode submission form |
| **side-panels** | `apps/iitc-iris/src/side-panels/057-side-panels.css` | [`apps/iitc-iris/src/side-panels/passcode-input.css`](file:///Users/jula/ittca/apps/iitc-iris/src/side-panels/passcode-input.css) | Passcode text input modifier |
| **side-panels** | `apps/iitc-iris/src/side-panels/066-side-panels.css` | [`apps/iitc-iris/src/side-panels/scores-agent-panel.css`](file:///Users/jula/ittca/apps/iitc-iris/src/side-panels/scores-agent-panel.css) | Scores and inventory layout |
| **styles** | `apps/iitc-iris/src/styles/020-team.css` | [`apps/iitc-iris/src/styles/team-colors.css`](file:///Users/jula/ittca/apps/iitc-iris/src/styles/team-colors.css) | Team color CSS custom properties |
| **styles** | `apps/iitc-iris/src/styles/034-team.css` | [`apps/iitc-iris/src/styles/team-pill.css`](file:///Users/jula/ittca/apps/iitc-iris/src/styles/team-pill.css) | Team indicator badge pill styling |
| **styles** | `apps/iitc-iris/src/styles/067-team.css` | [`apps/iitc-iris/src/styles/team-text-colors.css`](file:///Users/jula/ittca/apps/iitc-iris/src/styles/team-text-colors.css) | Team-colored text highlights |
| **system** | `apps/iitc-iris/src/system/012-system.css` | [`apps/iitc-iris/src/system/dock.css`](file:///Users/jula/ittca/apps/iitc-iris/src/system/dock.css) | System dock geometry and placement |
| **system** | `apps/iitc-iris/src/system/015-innerstatus.css` | [`apps/iitc-iris/src/system/inner-status.css`](file:///Users/jula/ittca/apps/iitc-iris/src/system/inner-status.css) | Inner status indicator text |
| **system** | `apps/iitc-iris/src/system/042-system.css` | [`apps/iitc-iris/src/system/diagnostics-grid.css`](file:///Users/jula/ittca/apps/iitc-iris/src/system/diagnostics-grid.css) | System diagnostics summary grid |
| **system** | `apps/iitc-iris/src/system/062-system.css` | [`apps/iitc-iris/src/system/scenario-progress.css`](file:///Users/jula/ittca/apps/iitc-iris/src/system/scenario-progress.css) | Scenario replay progress bar |
| **system** | `apps/iitc-iris/src/system/064-system.css` | [`apps/iitc-iris/src/system/shortcut-grid.css`](file:///Users/jula/ittca/apps/iitc-iris/src/system/shortcut-grid.css) | Keyboard shortcuts legend grid |
| **system** | `apps/iitc-iris/src/system/070-system.css` | [`apps/iitc-iris/src/system/system-actions.css`](file:///Users/jula/ittca/apps/iitc-iris/src/system/system-actions.css) | Diagnostic action buttons and rows |
| **system** | `apps/iitc-iris/src/system/076-system.css` | [`apps/iitc-iris/src/system/preset-button.css`](file:///Users/jula/ittca/apps/iitc-iris/src/system/preset-button.css) | Diagnostic preset selection buttons |
| **system** | `apps/iitc-iris/src/system/078-system.css` | [`apps/iitc-iris/src/system/jump-controls.css`](file:///Users/jula/ittca/apps/iitc-iris/src/system/jump-controls.css) | Quick jump location buttons |
| **system** | `apps/iitc-iris/src/system/080-divider.css` | [`apps/iitc-iris/src/system/divider.css`](file:///Users/jula/ittca/apps/iitc-iris/src/system/divider.css) | Section dividing border rules |
| **layers** | `apps/iitc-iris/src/layers/084-layers.css` | [`apps/iitc-iris/src/layers/layer-controls.css`](file:///Users/jula/ittca/apps/iitc-iris/src/layers/layer-controls.css) | Layer toggle controls styling |
| **layers** | `apps/iitc-iris/src/layers/086-layers.css` | [`apps/iitc-iris/src/layers/key-count-label.css`](file:///Users/jula/ittca/apps/iitc-iris/src/layers/key-count-label.css) | Layer key count badges |

---

## 3. Central Manifest Load Order Confirmation

The updated [`apps/iitc-iris/src/iitc-iris.css`](file:///Users/jula/ittca/apps/iitc-iris/src/iitc-iris.css) maintains the exact 75-import cascade order without shifting any rule positions.

Total imports in `iitc-iris.css`: **75** (50 named files, 25 remaining numbered files).

---

## 4. Domains Intentionally Skipped

As instructed, the larger/specialized domains were untouched during Group F:
- **`map/`:** Retains numbered chunk files (`004-map.css`, `011-map.css`, `013-map.css`, `049-map.css`, `051-map.css`, `053-map.css`, `058-map.css`, `077-map.css`, `083-map.css`, `088-player-tracker.css`, `090-player-tracker.css`).
- **`portals/`:** Retains numbered chunk files (`019-portals.css`, `021-portals.css`, `023-portals.css`, `027-portals.css`, `030-portals.css`, `035-portals.css`, `039-portals.css`, `041-portals.css`, `043-portals.css`, `045-portals.css`, `047-portals.css`, `063-portals.css`, `074-portals.css`, `085-portals.css`).
- **`portal-analysis/`:** Retains its current stylesheets.
- **`ui/`:** Fully clean (zero numbered files left after Group E).
- **`shell/`:** Retains its current shell stylesheets.
- **`draw-tools/`:** Retains its component-local stylesheet.

---

## 5. Verification: Clean Domains

Running the domain check:
```bash
find apps/iitc-iris/src/search apps/iitc-iris/src/auth apps/iitc-iris/src/comm apps/iitc-iris/src/missions apps/iitc-iris/src/side-panels apps/iitc-iris/src/styles apps/iitc-iris/src/system apps/iitc-iris/src/layers -name '*[0-9]*.css' -print
```
Produced **zero output**. All 8 domains have been fully purged of numbered CSS files.

---

## 6. Validation Results

All checks passed cleanly:

| Command | Status | Details |
|---|---|---|
| Domain Find Check | `find ... -name '*[0-9]*.css' -print` | **PASS** (zero numbered CSS files in the 8 domains) |
| TypeScript Typecheck | `npm run typecheck:iitc-iris` | **PASS** (0 errors) |
| ESLint Style Checks | `npm run lint:iitc-iris` | **PASS** (0 warnings/errors) |
| Vitest Unit Tests | `npm run test:iitc-iris` | **PASS** (60 test files, 346 tests passed) |
| Package Build | `npm run package:iitc-iris` | **PASS** (Built Chrome ZIP + Firefox XPI; CSS bundle size stable at 61.22 kB) |
| Git Whitespace Check | `git diff --check` | **PASS** (0 whitespace issues) |

---

## 7. Issues or Surprises

None. Renaming all 28 stylesheets preserved bundle size and output bit-for-bit without cascade regressions.
