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
- [x] **Data Safety:** Implemented strict numeric parsing (parseInt/parseFloat) for coordinates, level, and health to prevent MapLibre renderer crashes.

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

### Phase 6: Architecture Analysis (100% Complete)
- [x] **Comparative Study:** Exhaustive analysis of original Ingress Intel (`gen_dashboard_*.js`) vs. IRIS, documented in `REF-DESKTOP.MD`.

### Phase 7: Code Quality & Maintenance (100% Complete)
- [x] **Strict Typing:** Removed `any` usage across the codebase, ensuring robust TypeScript coverage for Core, Extension, and Plugins.
- [x] **Linting Infrastructure:** Implemented a modern ESLint configuration (Flat Config) with TypeScript and React/Preact rules.
- [x] **API Consistency:** Refactored `PluginManager` and `store` with explicit return types and interfaces.

## Next Strategic Priority
1. **Search Functionality**: Implement a unified search bar for coordinates, addresses (OSM), and portals (`/r/getPortalSearch`).
2. **Inventory Viewer**: Build a UI for viewing player items via `/r/getInventory` (requires C.O.R.E. subscription check).
3. **Robust Login Detection**: Monitor for `401/403` status codes in `interceptor.ts` to detect session expiry.
4. **Chat Integration**: Add an input field to `CommPopup` for sending messages via `/r/sendPlext`.

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
