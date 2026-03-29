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
- [x] **Comparative Study:** Exhaustive analysis of original Ingress Intel (`gen_dashboard_*.js`) vs. IRIS, documented in `REF-DESKTOP.MD`.

### Phase 7: Code Quality & Maintenance (100% Complete)
- [x] **Strict Typing:** Removed `any` usage across the codebase, ensuring robust TypeScript coverage for Core, Extension, and Plugins.
- [x] **Linting Infrastructure:** Implemented a modern ESLint configuration (Flat Config) with TypeScript and React/Preact rules.
- [x] **API Consistency:** Refactored `PluginManager` and `store` with explicit return types and interfaces.
- [x] **Typecheck Workflow:** Added a root `npm run typecheck` command (`tsc --noEmit`) and verified it passes.
- [x] **IDE Warning Cleanup:** Resolved current IntelliJ/TypeScript warnings around `unknown` API payloads, optional markup fields, XHR overload typing, redundant boolean coercions, and redundant `typeof` checks.

### Phase 8: Optimization & Architecture (In Progress)
- [x] **Source-side Validation:** Moved all strict numeric parsing and coordinate validation to `parseEntities` to ensure the Zustand store only contains "clean" data.
- [x] **Renderer De-cluttering:** Removed redundant `isNaN` and safety checks from `MapOverlay.tsx`, significantly improving FPS in portal-dense areas.

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
- **Interceptor Complexity:** `interceptor.ts` is over-extended with sniffing, patching, and syncing logic.
    - *Strategy:* Modularize into `VersionSniffer`, `NetworkInterceptor`, and `IntelSync` utilities.
- **Content Script Monolith:** `content/index.ts` contains endpoint parsing, message routing, and store writes in one large switch.
    - *Strategy:* Extract endpoint-specific handlers such as `handleEntities`, `handlePlexts`, `handleScores`, and `handleInventory`.
- **Zustand Store Bloat:** Central store mixes core entity state with transient UI toggles.
    - *Strategy:* Split into logical "slices" (Entities, UI, Player).
- **Transient State Persistence Scope:** Runtime-only diagnostics and ephemeral UI/network state are still colocated with durable settings.
    - *Strategy:* Narrow persisted state to settings/plugin preferences only, and keep logs/request counters strictly runtime.
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
4. **Content/Interceptor Cleanup:** Decouple `content/index.ts` and `interceptor.ts` into specialized modules.
5. **Payload Typing Pass:** Replace cast-heavy endpoint parsing with explicit validated response types.

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


### Best quick wins from the current codebase:

1. Content/Interceptor Cleanup
   packages/extension/src/content/index.ts
   packages/extension/src/content/interceptor.ts
   This is mostly file/module extraction, so risk is low if behavior stays identical.
2. Extract Intel Payload Parsers
   packages/extension/src/content/index.ts
   Move parseEntities, parsePortalDetails, parsePlexts, and parseInventory into separate parser files. Low risk because it is mostly relocation plus imports.
3. Extract Message Type Definitions
   packages/extension/src/content/index.ts
   packages/extension/src/content/interceptor.ts
   Shared message/event types can move to one types.ts. This reduces duplicate inline shapes and is low risk.
4. Centralize GeoJSON Feature Builders
   packages/extension/src/ui/components/MapOverlay.tsx
   Pull portal/link/field feature mapping into pure helper functions. That improves readability with minimal runtime risk.
5. Replace Remaining Inline Store Reads in Event Logic
   packages/extension/src/ui/components/MapOverlay.tsx
   packages/extension/src/ui/components/Overlay.tsx
   Small cleanup: isolate useStore.getState() calls behind helper functions for readability and testability.
6. Narrow Plugin Feature Types
   packages/extension/src/ui/components/PluginFeaturePopup.tsx
   packages/plugins/src/player-tracker/index.ts
   Still low risk if done as typing-only cleanup.
7. Persist Partialization
   packages/core/src/store.ts
   If persistence currently stores more than necessary, restricting it to settings/plugin prefs is usually low risk and reduces stale-state weirdness. Slightly higher risk than the refactors above, but still
   manageable.

If you want the safest shortlist, I’d do this order:

1. content/index.ts extraction
2. interceptor.ts extraction
3. parser extraction
4. shared message types
5. GeoJSON builder helpers

Those are the highest signal-to-risk ratio.