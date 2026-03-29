# Plan: IRIS Architecture (Updated)

## Objective
Create a modern, lightweight, and high-performance IITC alternative. Current focus is a **Desktop Proof of Concept (POC)** as a Browser Extension (Manifest V3) that acts as a "Master Map" overlaying the original Ingress Intel map.

## Technical Stack
- **Framework:** Preact (UI) + Zustand (State).
- **Build Tool:** Vite + `vite-plugin-web-extension`.
- **Mapping Engine:** MapLibre GL JS (WebGL-accelerated).
- **Basemap:** CartoDB Positron / OSM (Dynamic Switching).
- **Sync Method:** Bi-directional event bridging between MapLibre and Google Maps (Intel).

## Implementation Status

### Phase 1: Core & Data Capture (100% Complete)
- [x] Monorepo & Extension Skeleton.
- [x] "Main World" Interceptor for `/r/getEntities`, `/r/getPortalDetails`, and `/r/getPlexts`.
- [x] Support for Portals, Links, Fields, and Machina (Red) faction.
- [x] Zero-log performance optimization for high-density areas.
- [x] Automated `getPlexts` triggering on init/move/open with 5s cooldown.
- [x] **Entity Deletion:** Correctly handle `deletedGameEntityGuids` to remove destroyed links/fields.

### Phase 2: Map Rendering (100% Complete)
- [x] MapLibre GL Overlay with OSM Basemap.
- [x] **Bi-directional Sync:** Panning IRIS moves Intel; Intel fetches data -> IRIS renders.
- [x] **Persistent View:** Map stays alive and synced when toggled hidden.
- [x] **Modern Aesthetic:** Dark-Mode by default with faction-themed WebGL layers.
- [x] **Stable Interactions:** Manual pixel-distance clicking to bypass Firefox extension security restrictions (Permission Denied error).
- [x] **Visual Polish:** Portal opacity based on health (0-100%) and faction-colored borders.
- [x] **Data Safety (Optimized):** Initially implemented as redundant renderer checks; now moved to source-side validation in the content script for maximum performance.

### Phase 3: Plugin System (95% Complete)
- [x] SDK Definition: Types for Portals, Links, Fields.
- [x] UI Hooks: `api.ui.addStatsItem` for dynamic overlay content.
- [x] `player-tracker` plugin with movement paths, faction-colored pins, and time-based fading (1h expiration).
- [x] `export-data` plugin for JSON, KML, and GeoJSON exports.
- [x] **Plugin API Expansion:** Exposed `api.utils.normalizeTeam` and `api.ui.getThemeColors` for consistent coloring across plugins.
- [ ] **Next:** Support for custom map layers from plugins.
- [ ] **Next:** Dynamic plugin loading (loading external JS files).
- [ ] **Next:** Migrate **State Debug** to a plugin.
- [ ] **Next:** Migrate **Map Theme** (Theme Picker) to a plugin.

### Phase 4: Refinement & Mobile (100% Complete)
- [x] **UI Polish:** Portal detail popups (clickable portals).
- [x] **Player Name Coloring:** Unified team colors across all UI components (Portals, Comm, Stats).
- [x] **Tabbed COMM:** Dedicated tabs for ALL, FACTION, and ALERTS messages using categories (1, 2, 4).
- [x] **Interactivity in COMM:** Clickable portal names and link events for instant map navigation.
- [x] **Network Monitoring:** Integrated Status Bar with real-time logs for OK/FAILED/JS errors.
- [x] **Faction Consistency:** Unified team normalization (MACHINA/MAC/ALIENS) across entire UI.
- [x] **Fix scrollbar issue:** Resolved redundant scrollbars in `PortalInfoPopup` and other popups.
- [x] **Map Theme Picker:** Added a popup to choose map theme (Light, Dark, Voyager, OSM).
- [x] **Health Filter Evolution:** Replaced the 0-100% range slider with a 4-bucket checkbox system (25%, 50%, 75%, 100%) for faster tactical filtering.
- [x] **CSS Centralization:** Migrated inline styles for core UI components (Popup, Topbar, Search, Menus) to a unified `iris.css` to improve maintainability and decouple layout from logic.
- [x] **Enhanced Player Stats:** Switched from DOM-based extraction to `window.PLAYER` interception; added XM capacity, level progress bars, and invite counts.
- [x] **Session Persistence:** Implemented Zustand `persist` middleware to save settings (plugins, themes, etc.) in `localStorage`.
- [x] **COMM Improvements:** Implemented Tab Switching fetch and Periodic Refresh (120s) to match original Intel triggers.
- [x] **Robust COMM Fetching:** Resolved 400 errors by ensuring mandatory map boundaries (`minLatE6`, etc.) are included in all `getPlexts` requests.
- [x] **Modernized Interceptor:** Switched to a unified `fetch`-based request system for IRIS internal calls with proactive version sniffing and background subscription/inventory checks.
- [ ] **Next:** Performance: GeoJSON source throttling for extremely dense areas.
- [ ] **Next:** Mobile Strategy: Decision between Capacitor App vs. Mobile Browser Extension.

### Phase 5: Advanced Features (100% Complete)
- [x] **Player Tracker:** Track player movement based on COMM (plexts) activity. Draw lines between portals for recent activity.
- [x] **Data Export:** Export captured portal/link/field data to standard formats (Plugin).
- [x] **Game Score:** Render GameScore Popup using intercepting `getGameScore` (Standard).
- [x] **Region Score:** Render RegionScoreDetails Popup using intercepting `getRegionScoreDetails` (Standard).
- [x] **Portal History:** Added visual rings for Visited (Purple), Captured (Red), and Scanned (Yellow dashed) status integrated into the map rendering.
- [x] **Inventory Viewer:** High-performance grid view for resonators, weapons, and mods with level-based coloring and C.O.R.E. subscription enforcement.

### Phase 6: Architecture Analysis (100% Complete)
- [x] **Comparative Study:** Exhaustive analysis of original Ingress Intel (`gen_dashboard_*.js`) vs. IRIS, documented in `docs/REF-DESKTOP.MD`.

### Phase 7: Code Quality & Maintenance (100% Complete)
- [x] **Strict Typing:** Removed `any` usage across the codebase, ensuring robust TypeScript coverage for Core, Extension, and Plugins.
- [x] **Linting Infrastructure:** Implemented a modern ESLint configuration (Flat Config) with TypeScript and React/Preact rules.
- [x] **API Consistency:** Refactored `PluginManager` and `store` with explicit return types and interfaces.
- [x] **Typecheck Workflow:** Added a root `npm run typecheck` command (`tsc --noEmit`) and verified it passes.
- [x] **IDE Warning Cleanup:** Resolved current IntelliJ/TypeScript warnings around `unknown` API payloads, optional markup fields, XHR overload typing, redundant boolean coercions, and redundant `typeof` checks.

### Phase 8: Optimization & Architecture (In Progress)
- [x] **Source-side Validation:** Moved all strict numeric parsing and coordinate validation to `parseEntities` to ensure the Zustand store only contains "clean" data.
- [x] **Renderer De-cluttering:** Removed redundant `isNaN` and safety checks from `MapOverlay.tsx`, significantly improving FPS in portal-dense areas.
- [x] **Content/Interceptor Cleanup:** Split content parsing and interception into domain and runtime modules while keeping one shared low-level interception path.
- [x] **Domain-Oriented Content Layout:** Added per-domain `types`, `parser`, and `handler` modules for entities, portal details, plexts, inventory, player, game score, and region score.
- [x] **Domain-Oriented UI Layout:** Grouped UI components by gameplay domain under `ui/domains/` and moved shared primitives to `ui/shared/`.
- [x] **UI Style Cleanup:** Broke the old monolithic stylesheet into a shared base/topbar split plus domain CSS entrypoints, while keeping `iris.css` as the aggregation entry.

#### Identified Performance Bottlenecks
- **GeoJSON Regeneration:** `MapOverlay.tsx` currently iterates over all entities on every state change. 
    - *Strategy:* Implement `source.setData()` throttled updates or offload to a Web Worker.
- **Marker Rebuild Churn:** Plugin player markers are fully removed and recreated on every plugin feature update.
    - *Strategy:* Maintain a keyed marker registry and diff by feature id instead of full teardown/rebuild.
- **Zustand Selector Overhead:** Multiple complex selectors in `MapOverlay` may trigger redundant Preact re-renders.
    - *Strategy:* Consolidate selectors using shallow equality checks.
- **Map Interaction Overhead:** Click/Hover handlers use $O(n)$ projection loops.
    - *Strategy:* Migrate to MapLibre's native `queryRenderedFeatures`.
- **Update Burstiness:** Camera/data sync paths still perform eager updates on several state transitions.
    - *Strategy:* Batch map/source updates behind `requestAnimationFrame` or explicit throttling.

#### Architectural Debt & Improvements
- **Zustand Store Bloat:** Central store mixes core entity state with transient UI toggles.
    - *Strategy:* Split into logical "slices" (Entities, UI, Player).
- **Transient State Persistence Scope:** Runtime-only diagnostics and ephemeral UI/network state are still colocated with durable settings.
    - *Strategy:* Narrow persisted state to settings/plugin preferences only, and keep logs/request counters strictly runtime.
- **Map Overlay Monolith:** `ui/domains/map/MapOverlay.tsx` still owns too much rendering, event, and GeoJSON assembly logic.
    - *Strategy:* Extract feature builders, source update helpers, and interaction helpers into map-specific modules.
- **UI Styling Coverage Gap:** The UI folder is now domain-grouped, but only part of the styling has been moved into domain-specific CSS files.
    - *Strategy:* Continue moving remaining popup/domain styles into colocated CSS files without changing class names or behavior.
- **Plugin API Isolation:** Plugins have direct access to core internals.
    - *Strategy:* Implement a restrictive proxy/bridge for the Plugin SDK.
- **Lint Debt Baseline:** ~200 pre-existing errors hindering CI/CD.
    - *Status:* Cleared for current tracked code paths; `npm run lint` now passes.
- **Weak Intel Payload Typing:** Intel endpoint payload parsing still depends on local casts and partial structural assumptions.
    - *Strategy:* Introduce explicit transport/result types for each intercepted endpoint and centralize parse validation.

#### Proposed Next Steps
1. **Map Performance Sprint:** Refactor `MapOverlay.tsx` to use `queryRenderedFeatures` and optimize GeoJSON generation.
2. **Marker Diffing:** Replace full plugin marker rebuilds with keyed incremental updates.
3. **Store Modularization:** Decompose the Zustand store into maintainable slices.
4. **Persist Scope Cleanup:** Limit Zustand persistence to durable settings and plugin preferences.
5. **Payload Typing Pass:** Replace cast-heavy endpoint parsing with explicit validated response types.
6. **UI CSS Colocation:** Finish moving remaining domain-specific popup styling into `ui/domains/*`.

#### Proposed Domain-Oriented Directory Plan
```text
packages/extension/src/content/
├── domains/
│   ├── entities/
│   │   ├── types.ts
│   │   ├── parser.ts
│   │   ├── handler.ts
│   ├── portal-details/
│   │   ├── types.ts
│   │   ├── parser.ts
│   │   ├── handler.ts
│   ├── plexts/
│   │   ├── types.ts
│   │   ├── parser.ts
│   │   ├── handler.ts
│   ├── game-score/
│   │   ├── types.ts
│   │   ├── parser.ts
│   │   ├── handler.ts
│   ├── region-score/
│   │   ├── types.ts
│   │   ├── parser.ts
│   │   ├── handler.ts
│   ├── inventory/
│   │   ├── types.ts
│   │   ├── parser.ts
│   │   ├── handler.ts
│   └── player/
│       ├── types.ts
│       └── handler.ts
├── runtime/
│   ├── message-types.ts
│   └── interceptor-runtime.ts
├── index.ts
├── injector.ts
└── interceptor.ts
```

#### Domain Refactor Status
- **Done:** Content/interceptor logic is now split across `domains/` and `runtime/`, with separate game-score and region-score modules for consistency.
- **Done:** UI components are grouped by domain under `ui/domains/`, with shared primitives in `ui/shared/`.
- **Done:** Root workflow checks now include `npm run typecheck`, `npm run lint`, and `npm run build`.
- **Done:** Current IntelliJ/TypeScript warnings that were blocking day-to-day work have been cleaned up.
- **Todo:** Split the Zustand store into slices and narrow what gets persisted.
- **Todo:** Finish map-specific helper extraction from `MapOverlay.tsx`.
- **Todo:** Convert remaining popup/domain styling into colocated CSS files where it improves ownership.
- **Todo:** Tighten Intel payload/result typing to reduce residual cast-heavy parsing.

#### Domain Split Rules
- Keep one shared low-level XHR/fetch interception runtime. Do not create a separate patcher per domain.
- Route requests/responses to domain handlers based on endpoint name.
- Keep each domain self-contained: transport types, parser, state write logic, and request helpers live together.
- Keep cross-domain concerns in `runtime/` only: window messaging, interception hooks, version sniffing, and shared request plumbing.

#### Proposed Domain-Oriented UI Directory Plan
```text
packages/extension/src/ui/
├── domains/
│   ├── comm/
│   │   ├── CommPopup.tsx
│   ├── debug/
│   │   └── StateDebugPopup.tsx
│   ├── filters/
│   │   └── FiltersPopup.tsx
│   ├── inventory/
│   │   ├── InventoryPopup.tsx
│   ├── map/
│   │   ├── MapOverlay.tsx
│   │   ├── MapThemePopup.tsx
│   ├── player/
│   │   └── PlayerStatsPopup.tsx
│   ├── plugins/
│   │   ├── PluginFeaturePopup.tsx
│   │   └── PluginsPopup.tsx
│   ├── portal/
│   │   ├── PortalInfoPopup.tsx
│   │   └── portal.css
│   ├── scores/
│   │   ├── GameScorePopup.tsx
│   │   └── RegionScorePopup.tsx
│   └── status/
│       └── StatusBar.tsx
├── shared/
│   ├── Popup.tsx
│   ├── Topbar.tsx
│   ├── base.css
│   └── topbar.css
├── Overlay.tsx
├── iris.css
└── theme.ts
```

#### UI Split Rules
- Group domain-specific UI and domain-specific styling together.
- Keep reusable primitives like `Popup` and `Topbar` in `shared/`.
- Keep `theme.ts` and design tokens centralized.
- Use `iris.css` as the aggregation entry point that imports shared and domain stylesheets.

## Next Strategic Priority
1. **Search Functionality**: Implement a unified search bar for coordinates, addresses (OSM), and portals (`/r/getPortalSearch`).
2. **Robust Login Detection**: Monitor for `401/403` status codes in `interceptor.ts` to detect session expiry.
3. **Chat Integration**: Add an input field to `CommPopup` for sending messages via `/r/sendPlext`.

## Known Issues & Mobile Challenges

| Environment | Issue | Status |
|---|---|---|
| **Mobile Firefox** | **Player Tracker Missing:** Markers/Lines are not appearing on mobile builds despite working on desktop. | *Investigating* |
| **Mobile Firefox** | **Stale COMM Messages:** Initial COMM fetch on messages often returns very old messages compared to desktop chrome/firefox. | *Note: Likely due to Intel initial response definition* |
| **All Firefox** | **Security Restrictions:** Accessing `.constructor` on MapLibre objects is blocked. | *Mitigated via manual interaction layer* |
| **All Browsers** | **Login Detection:** Silent failure when session expires. | *Strategy: Monitor 401/403 in interceptor* |
| **All Browsers** | **Subscription Check:** Missing C.O.R.E detection for Inventory. | *Strategy: Extract from window.PLAYER* |

## Current Working Logic
1. **Intercept:** Catch raw JSON from Niantic (XHR/Fetch). Monitor for session-loss status codes.
2. **Strict Parsing:** All incoming entity data is normalized and explicitly cast to numbers to ensure WebGL stability.
3. **Store:** Normalize into Zustand (`@iris/core`). Handles adds, updates, and deletions.
4. **Master Sync:** MapLibre (top layer) captures user input, sends `move` commands to the Google Maps instance.
5. **Subscription Logic:** Guard C.O.R.E.-only features (Inventory, History) behind subscription checks extracted from `window.PLAYER`.
6. **Proactive Trigger:** IRIS triggers its own API calls (e.g., `getPlexts`) on map movement with 5s cooldown.
7. **Monitoring:** All network and JS errors are surfaced in the Status Bar.

## Verification & Testing
- **Network:** Cooldown logic prevents request spam. Dual-tab polling (all/faction) for COMM.
- **Accuracy:** Native MapLibre layer events avoided in favor of manual projection for maximum cross-browser stability.
- **Types:** Strict TypeScript validation across all plugins and core logic.
- **Workflow:** `npm run typecheck`, `npm run lint`, and `npm run build` are part of the expected post-change verification flow.

### Best quick wins from the current codebase:

1. Centralize map feature builders
   `packages/extension/src/ui/domains/map/MapOverlay.tsx`
   Pull portal/link/field GeoJSON mapping into pure helpers. This is mostly internal reorganization and should be low risk if layer ids and feature shapes stay unchanged.
2. Replace manual hit-testing with `queryRenderedFeatures`
   `packages/extension/src/ui/domains/map/MapOverlay.tsx`
   This removes the current O(n) click/hover scans and is a focused performance win with limited surface area.
3. Diff plugin markers instead of rebuilding all of them
   `packages/extension/src/ui/domains/map/MapOverlay.tsx`
   Keep a keyed marker registry by feature id so plugin updates do not tear down and recreate every marker.
4. Narrow persisted Zustand state
   `packages/core/src/store.ts`
   Restrict persistence to settings and plugin preferences so logs, diagnostics, and other runtime-only state do not survive reloads.
5. Start store slice extraction
   `packages/core/src/store.ts`
   Begin with a low-risk split between entity data, UI state, and durable settings without changing external selectors all at once.
6. Finish UI CSS colocation
   `packages/extension/src/ui/domains/*`
   More of the popup and domain styling can move next to the owning components now that the filesystem is domain-grouped.
7. Tighten remaining payload typing
   `packages/extension/src/content/domains/*`
   Replace the remaining cast-heavy endpoint assumptions with explicit transport/result types per domain.

If you want the safest shortlist, I’d do this order:

1. map feature builder extraction
2. plugin marker diffing
3. persisted state narrowing
4. initial store slice split
5. `queryRenderedFeatures` migration

Those are the highest signal-to-risk ratio.
