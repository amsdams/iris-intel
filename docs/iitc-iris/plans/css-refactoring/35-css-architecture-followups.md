# IITC IRIS CSS Architecture Follow-Ups

Status: Proposed follow-up plan for a future session. Do not start until Track C has been smoke-tested and committed.

## Current Baseline

Track C produced a stable, safe architecture:

- UI components live in component folders with `index.ts` barrels.
- Safe component-local CSS is imported from owning components.
- Cascade-sensitive CSS may live beside a component but remains loaded by `apps/iitc-iris/src/iitc-iris.css`.
- Numbered CSS filenames have been eliminated from `apps/iitc-iris/src/`.
- `apps/iitc-iris/src/iitc-iris.css` remains the ordered central manifest with 75 imports.

This is acceptable and maintainable. The remaining follow-ups are optional polish, not required rescue work.

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

## Gate 0 - Smoke Test And Commit

Required before any follow-up work:

1. Smoke test Firefox desktop:
    - map shell and controls;
    - portal details panel;
    - search;
    - side request panels;
    - layers;
    - missions;
    - COMM;
    - draw tools;
    - portal analysis views.
2. Smoke test one narrow/mobile viewport.
3. If clean, commit the Track C branch.

If a visual regression appears, fix only that regression before continuing.

## Follow-Up A - Manifest Compression

Goal: reduce the 75-import manifest without changing behavior.

Rules:

- Merge only adjacent files that are already adjacent in `apps/iitc-iris/src/iitc-iris.css`.
- Preserve internal rule order exactly.
- Do not move CSS from central manifest to component imports in this pass.
- Do not rename selectors or declarations.

Likely candidates:

| Area        | Candidate merge                                                                                                                                                                   |
|-------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
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

## Follow-Up B - Feature Component Folders

Goal: move feature panel TSX/tests/CSS into feature component folders where it improves ownership.

Rules:

- One domain per pass.
- Preserve public imports with `index.ts` barrels where needed.
- Do not combine with CSS merge work.
- Do not move persisted ids, message types, storage keys, or behavior.

Good first candidates:

| Domain             | Candidate                                                                            |
|--------------------|--------------------------------------------------------------------------------------|
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

## Recommended Next Session

Do only this:

1. Read `docs/iitc-iris/plans/css-refactoring/34-track-c-final-audit.md`.
2. Smoke test desktop and narrow/mobile.
3. Commit Track C if clean.
4. Decide whether the next real work is product/UI polish, Android readiness, or Follow-Up A manifest compression.

The default recommendation is to stop broad CSS refactoring after Track C unless the smoke test exposes a concrete
problem or the 75-import manifest creates real maintenance friction.
